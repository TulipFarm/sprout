import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/selection-slot/";

async function open(page: Page, width = 1440) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#selection-slot-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(document.getAnimations().map((a) => a.finished));
  });
}

async function noOverflow(page: Page, demo: Locator) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const slot of await demo.locator('[data-slot="selection-slot"]').all())
    expect(
      await slot.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
    ).toBe(true);
}

async function activateAll(page: Page) {
  const table = example(page, "Table query bar");
  await table.getByRole("checkbox", { name: "Select Amara Osei" }).click();
  await table.getByRole("checkbox", { name: "Select Priya Natarajan" }).click();
  const files = example(page, "Files toolbar");
  await files
    .getByRole("checkbox", { name: "Select Supplier contract 2026.pdf" })
    .click();
  await files.getByRole("checkbox", { name: "Select Q3 planning" }).click();
  await settle(page);
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`selection slot ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        const demo = await open(page, width);
        await page.evaluate(
          (value) =>
            document.documentElement.setAttribute("data-sprout-theme", value),
          theme,
        );
        await chooseOption(
          page,
          "Color mode",
          mode === "light" ? "Light" : "Dark",
        );
        for (const state of ["idle", "selected"]) {
          if (state === "selected") await activateAll(page);
          await noOverflow(page, demo);
          const results = await new AxeBuilder({ page })
            .include("#selection-slot-demo")
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze();
          expect(results.violations).toEqual([]);
          const name = `selection-slot-${theme}-${mode}-${width}-${state}`;
          const path = testInfo.outputPath(`${name}.png`);
          const shot = await demo.screenshot({ animations: "disabled", path });
          expect(shot.byteLength).toBeGreaterThan(10_000);
          await testInfo.attach(name, { path, contentType: "image/png" });
        }
      });
    }
  }
}

test("playground swap hides the tools, moves focus in, and returns it", async ({
  page,
}) => {
  await open(page);
  const card = example(page, "Selection toolbar swap");
  const slot = card.locator('[data-slot="selection-slot"]');
  // Starts active, as in the Cloud playground.
  await expect(slot).toHaveAttribute("data-active", "true");
  await expect(card.getByRole("status")).toHaveText("2 selected");
  await expect(
    card.getByRole("button", { name: "Select example records" }),
  ).toHaveCount(0);
  const tools = slot.locator('[data-slot="selection-slot-default"]');
  await expect(tools).toHaveAttribute("inert", "");
  await expect(tools).toHaveAttribute("aria-hidden", "true");
  await expect(tools).toHaveCSS("visibility", "hidden");

  // Clear with the keyboard. With nothing remembered, focus goes to the first tool.
  await card.getByRole("button", { name: "Clear selection" }).focus();
  await page.keyboard.press("Enter");
  const select = card.getByRole("button", { name: "Select example records" });
  await expect(select).toBeVisible();
  await expect(select).toBeFocused();
  await expect(slot).not.toHaveAttribute("data-active");

  // Opening from the tools moves focus to the first selection control.
  await page.keyboard.press("Enter");
  const clear = card.getByRole("button", { name: "Clear selection" });
  await expect(clear).toBeFocused();
  await page.keyboard.press("Space");
  await expect(select).toBeFocused();
});

test("table selection swaps tools without moving the table and keeps focus on the row", async ({
  page,
}) => {
  await open(page);
  const card = example(page, "Table query bar");
  const tools = card.getByRole("group", { name: "Table tools" });
  await expect(tools).toBeVisible();
  await expect(card.getByRole("button", { name: "Columns" })).toBeVisible();
  const table = card.locator("table");
  const before = (await table.boundingBox())!.y;

  const row = card.getByRole("checkbox", { name: "Select Lukas Brandt" });
  await row.focus();
  await page.keyboard.press("Space");
  const actions = card.getByRole("group", { name: "Selected row actions" });
  await expect(actions).toBeVisible();
  await expect(actions.getByRole("status").first()).toHaveText(
    "1 selected on this page",
  );
  await expect(row).toBeFocused();
  await expect(card.getByRole("group", { name: "Table tools" })).toHaveCount(0);
  expect(Math.abs((await table.boundingBox())!.y - before)).toBeLessThan(1);

  // Wide slot: buttons, not the menu.
  await expect(
    actions.getByRole("button", { name: "Export selected" }),
  ).toBeVisible();
  await expect(
    actions.getByRole("button", { name: "Delete selected" }),
  ).toBeVisible();
  await expect(
    actions.getByRole("button", { name: "Selected actions" }),
  ).toBeHidden();

  // Loading, then success.
  await actions.getByRole("button", { name: "Export selected" }).click();
  const busy = actions.getByRole("button", { name: "Exporting..." }).first();
  await expect(busy).toHaveAttribute("aria-busy", "true");
  await expect(
    actions.getByText("Exported 1 selected row.").filter({ visible: true }),
  ).toBeVisible();
  await expect(
    actions.getByRole("button", { name: "Export again" }),
  ).toBeVisible();

  // Error, then retry.
  await card.getByRole("switch", { name: "Export fails" }).click();
  await actions.getByRole("button", { name: "Export again" }).click();
  await expect(
    actions
      .locator(".selection-slot-demo-outcome-text[data-error]")
      .filter({ visible: true }),
  ).toHaveText("Export failed. The connection timed out.");
  await expect(
    actions.getByRole("button", { name: "Retry export" }),
  ).toBeVisible();

  // Clear returns focus to the row checkbox that opened the selection.
  await actions.getByRole("button", { name: "Clear selection" }).focus();
  await page.keyboard.press("Enter");
  await expect(row).toBeFocused();
  await expect(card.getByRole("group", { name: "Table tools" })).toBeVisible();
});

test("table selection respects delete permission, disabled tools, and layouts", async ({
  page,
}) => {
  await open(page);
  const card = example(page, "Table query bar");
  await card.getByRole("switch", { name: "Can delete" }).click();
  await card.getByRole("checkbox", { name: "Select all rows" }).click();
  const actions = card.getByRole("group", { name: "Selected row actions" });
  await expect(actions.getByRole("status").first()).toHaveText(
    "4 selected on this page",
  );
  await expect(
    actions.getByRole("button", { name: "Delete selected" }),
  ).toHaveCount(0);
  await card.getByRole("switch", { name: "Can delete" }).click();

  await card.getByRole("switch", { name: "Editing a row" }).click();
  await expect(
    actions.getByRole("button", { name: "Export selected" }),
  ).toBeDisabled();
  await expect(
    actions.getByRole("button", { name: "Clear selection" }),
  ).toBeDisabled();
  await card.getByRole("switch", { name: "Editing a row" }).click();

  await actions.getByRole("button", { name: "Delete selected" }).click();
  await expect(card.getByText("No rows left.")).toBeVisible();
  await expect(card.getByRole("group", { name: "Table tools" })).toBeVisible();
  await card.getByRole("button", { name: "Restore sample rows" }).click();

  await card.getByRole("checkbox", { name: "Select Mateo Alvarez" }).click();
  await expect(actions).toBeVisible();
  await card.getByRole("button", { name: "Board" }).click();
  await expect(
    card.getByRole("group", { name: "Selected row actions" }),
  ).toHaveCount(0);
  const tools = card.getByRole("group", { name: "Table tools" });
  await expect(tools.getByRole("button", { name: "Summary" })).toHaveCount(0);

  await card.getByRole("switch", { name: "Editing a row" }).click();
  await expect(tools).toHaveAttribute("disabled", "");
  await expect(tools.getByRole("button", { name: "Search" })).toBeDisabled();
});

test("narrow table selection folds actions into a keyboard menu", async ({
  page,
}) => {
  await open(page, 390);
  const card = example(page, "Table query bar");
  await card.getByRole("checkbox", { name: "Select Amara Osei" }).click();
  const actions = card.getByRole("group", { name: "Selected row actions" });
  await expect(
    actions.getByRole("button", { name: "Export selected" }),
  ).toBeHidden();
  const menu = actions.getByRole("button", { name: "Selected actions" });
  await expect(menu).toBeVisible();
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("menuitem", { name: "Export selected" }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Delete selected" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
});

test("files toolbar shows file actions, a compact filter, and pending trash", async ({
  page,
}) => {
  await open(page);
  const card = example(page, "Files toolbar");
  const filters = card.getByRole("group", { name: "Filter and sort" });
  await expect(filters.getByRole("combobox", { name: "Type" })).toBeVisible();

  await card.getByRole("checkbox", { name: "Select Q3 planning" }).click();
  const bar = card.getByRole("toolbar", { name: "Selected items" });
  await expect(bar.getByRole("status")).toHaveText("1 item selected");
  await expect(bar.getByRole("button", { name: "Use in chat" })).toHaveCount(0);
  await expect(
    bar.getByRole("button", { name: "Move", exact: true }),
  ).toBeVisible();

  await card
    .getByRole("checkbox", {
      name: "Select Harvest yield forecast — greenhouse north and south wings.xlsx",
    })
    .click();
  await expect(bar.getByRole("status")).toHaveText("2 items selected");
  for (const name of ["Use in chat", "Add to Knowledge", "Add to project"])
    await expect(bar.getByRole("button", { name })).toBeVisible();

  // Compact filter: an icon button that opens the bottom sheet.
  const compact = bar.getByRole("button", { name: "Filter and sort" });
  await expect(compact).toBeVisible();
  await compact.click();
  const sheet = page.getByRole("dialog", { name: "Filter and sort" });
  await expect(sheet).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);

  const trash = bar.getByRole("button", { name: "Move to trash" });
  await trash.click();
  const pending = bar.getByRole("button", { name: "Moving to Trash…" });
  await expect(pending).toHaveAttribute("aria-busy", "true");
  await expect(
    bar.getByRole("button", { name: "Move", exact: true }),
  ).toBeDisabled();
  await expect(card.getByText("Moved 2 items to Trash.")).toBeVisible();
  await expect(
    card.getByRole("toolbar", { name: "Selected items" }),
  ).toHaveCount(0);
  await expect(filters.getByRole("combobox", { name: "Type" })).toBeVisible();
  await expect(card.getByText("Q3 planning")).toHaveCount(0);
});

test("files trash keeps the filters while items are selected", async ({
  page,
}) => {
  await open(page);
  const card = example(page, "Files toolbar");
  await card.getByRole("button", { name: "Trash" }).click();
  await card
    .getByRole("checkbox", { name: "Select Old price list.xlsx" })
    .click();
  await expect(
    card.getByRole("checkbox", { name: "Select Old price list.xlsx" }),
  ).toBeChecked();
  await expect(
    card.getByRole("toolbar", { name: "Selected items" }),
  ).toHaveCount(0);
  await expect(
    card.locator('[data-slot="selection-slot"]'),
  ).not.toHaveAttribute("data-active");
  await expect(card.getByRole("combobox", { name: "Owner" })).toBeVisible();
});

test("narrow files toolbar uses the selected actions menu and filter sheet", async ({
  page,
}) => {
  await open(page, 390);
  const card = example(page, "Files toolbar");
  await expect(
    card.getByRole("button", { name: "Filter and sort" }),
  ).toBeVisible();
  await expect(card.getByRole("combobox", { name: "Type" })).toBeHidden();
  await card
    .getByRole("checkbox", { name: "Select Supplier contract 2026.pdf" })
    .click();
  const bar = card.getByRole("toolbar", { name: "Selected items" });
  await expect(bar.getByRole("button", { name: "Use in chat" })).toBeHidden();
  const menu = bar.getByRole("button", { name: "Selected actions" });
  await menu.click();
  for (const name of [
    "Use in chat",
    "Add to Knowledge",
    "Add to project",
    "Move",
    "Move to trash",
  ])
    await expect(
      page.getByRole("menuitem", { name, exact: true }),
    ).toBeVisible();
  await page.getByRole("menuitem", { name: "Use in chat" }).click();
  await expect(card.getByText("Use in chat: 1 item.")).toBeVisible();
  // The long name is cut with an ellipsis rather than widening the row.
  const name = card.locator(".selection-slot-demo-file-name").nth(2);
  expect(
    await name.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  await expect(name).toHaveCSS("text-overflow", "ellipsis");
});

test("selection fades in briefly and not at all with reduced motion", async ({
  page,
}) => {
  await open(page);
  const card = example(page, "Table query bar");
  await card.getByRole("checkbox", { name: "Select Amara Osei" }).click();
  const layer = card.locator('[data-slot="selection-slot-selection"]');
  await expect(layer).toHaveCSS("animation-name", "sprout-selection-slot-in");
  await expect(layer).toHaveCSS("animation-duration", "0.18s");
  await card.getByRole("button", { name: "Clear selection" }).click();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await card.getByRole("checkbox", { name: "Select Amara Osei" }).click();
  await expect(layer).toHaveCSS("animation-name", "none");
});
