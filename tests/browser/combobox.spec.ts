import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/combobox/";

async function open(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const demo = (page: Page, name: string) =>
  page.locator(`[data-demo="combobox-${name}"]`);

const popup = (page: Page) =>
  page.locator('[data-slot="combobox-content"][data-open]');

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation instanceof CSSTransition)
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const overflowing = await page
    .locator(
      'main [data-slot="combobox-chips"], main [data-slot="input-group"], main .combobox-demo-row, main .combobox-demo-field',
    )
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => node.scrollWidth > node.clientWidth + 1)
        .map((node) => node.textContent?.slice(0, 40)),
    );
  expect(overflowing).toEqual([]);
}

// An open list hides the rest of the page from assistive tech, so open-state
// checks only scan the list.
async function axe(page: Page, include?: string) {
  const builder = new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21aa",
    "wcag22aa",
  ]);
  const results = await (
    include ? builder.include(include) : builder
  ).analyze();
  expect(results.violations).toEqual([]);
}

const panels = [
  "playground",
  "basics",
  "input-options",
  "multiple",
  "trigger",
  "groups",
  "states",
];

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["Light", "Dark"]) {
    for (const width of [390, 1440]) {
      test(`combobox ${theme} ${mode.toLowerCase()} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        await open(page);
        await page.evaluate(
          (value) =>
            document.documentElement.setAttribute("data-sprout-theme", value),
          theme,
        );
        await chooseOption(page, "Color mode", mode);
        await noOverflow(page);
        await axe(page);
        for (const name of panels) {
          const file = `combobox-${name}-${theme}-${mode.toLowerCase()}-${width}`;
          const path = testInfo.outputPath(`${file}.png`);
          const shot = await demo(page, name).screenshot({
            animations: "disabled",
            path,
          });
          expect(shot.byteLength).toBeGreaterThan(3_000);
          await testInfo.attach(file, { path, contentType: "image/png" });
        }

        const owner = page.getByRole("combobox", { name: "Owner" });
        await owner.click();
        await expect(popup(page)).toBeVisible();
        await settle(page);
        const bounds = await popup(page).boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
        await axe(page, '[data-slot="combobox-content"]');
        const file = `combobox-open-${theme}-${mode.toLowerCase()}-${width}`;
        const path = testInfo.outputPath(`${file}.png`);
        await page.screenshot({ animations: "disabled", path });
        await testInfo.attach(file, { path, contentType: "image/png" });
        await page.keyboard.press("Escape");
        await expect(popup(page)).toHaveCount(0);
      });
    }
  }
}

test("single choice filters, picks with the keyboard, shows empty, and clears", async ({
  page,
}) => {
  await open(page);
  const scope = demo(page, "basics");
  const input = scope.getByRole("combobox", { name: "Choose a fruit" });
  const chevron = scope.locator(".sprout-combobox-input-trigger").first();
  await expect(chevron).toBeVisible();
  await input.focus();
  await page.keyboard.type("ap");
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("option")).toHaveText(["Apple", "Apricot"]);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Apricot" })).toHaveAttribute(
    "data-highlighted",
    "",
  );
  await page.keyboard.press("Enter");
  await expect(popup(page)).toHaveCount(0);
  await expect(input).toHaveValue("Apricot");
  await expect(input).toBeFocused();

  const clear = scope.getByRole("button", { name: "Clear selection" });
  await expect(clear).toBeVisible();
  await expect(
    scope
      .locator('[data-slot="input-group"]')
      .first()
      .locator(".sprout-combobox-input-trigger"),
  ).toBeHidden();

  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Apricot" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page
      .getByRole("option", { name: "Apricot" })
      .locator(".sprout-combobox-item-indicator"),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await clear.click();
  await expect(input).toHaveValue("");
  await expect(
    scope.getByRole("button", { name: "Clear selection" }),
  ).toHaveCount(0);

  await input.fill("zzz");
  await expect(popup(page).getByRole("status")).toHaveText("No fruit found.");
  await expect(page.getByRole("option")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(popup(page)).toHaveCount(0);
  await expect(input).toBeFocused();
  await input.fill("");
  await page.keyboard.press("Escape");
  await chevron.click();
  await expect(page.getByRole("option")).toHaveCount(5);
});

test("multiple choice adds, removes, and keeps chips with the keyboard", async ({
  page,
}) => {
  await open(page);
  const scope = demo(page, "basics");
  const input = scope.getByRole("combobox", { name: "Add fruit" });
  const chips = scope.locator('[data-slot="combobox-chip"]');
  await expect(chips).toHaveText(["Apple"]);
  await input.click();
  await page.keyboard.type("che");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(chips).toHaveText(["Apple", "Cherry"]);
  await page.keyboard.press("Escape");
  await input.fill("");
  await page.keyboard.press("Backspace");
  await expect(chips).toHaveText(["Apple"]);
  await scope.getByRole("button", { name: "Remove Apple" }).click();
  await expect(chips).toHaveCount(0);

  const locked = demo(page, "multiple");
  await expect(
    locked.getByRole("button", { name: "Remove general" }),
  ).toHaveCount(0);
  await expect(
    locked.getByRole("button", { name: "Remove design-reviews" }),
  ).toBeVisible();

  const anchored = locked.locator('[data-slot="combobox-chips"]').first();
  await locked.getByRole("combobox", { name: "Alert channels" }).click();
  await expect(popup(page)).toHaveAttribute("data-chips", "true");
  await settle(page);
  const field = await anchored.boundingBox();
  const list = await popup(page).boundingBox();
  expect(Math.abs(list!.x - field!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(list!.width - field!.width)).toBeLessThanOrEqual(1);
  await expect(page.getByRole("option", { name: "launches" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("disabled comboboxes can't be focused or opened", async ({ page }) => {
  await open(page);
  await expect(
    page.getByRole("combobox", { name: "Disabled fruit choice" }),
  ).toBeDisabled();
  await expect(
    demo(page, "basics").locator(".sprout-combobox-input-trigger").last(),
  ).toBeDisabled();
  const states = demo(page, "states");
  await expect(states.locator(".sprout-combobox-chips-input")).toBeDisabled();
  await expect(
    states.locator('[data-slot="combobox-chip-remove"]'),
  ).toBeDisabled();
});

test("input options hide the trigger, add icons, and the trigger button opens a search list", async ({
  page,
}) => {
  await open(page);
  const options = demo(page, "input-options");
  const typed = options.getByRole("combobox", { name: "Meeting time zone" });
  await expect(typed.locator("xpath=..").getByRole("button")).toHaveCount(0);
  await typed.focus();
  await page.keyboard.press("ArrowDown");
  await expect(popup(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    options
      .locator('[data-slot="input-group"]')
      .nth(3)
      .locator('[data-align="inline-start"] svg'),
  ).toBeVisible();

  const scope = demo(page, "trigger");
  const trigger = scope.getByRole("combobox", { name: "Digest time zone" });
  await expect(trigger).toContainText("Asia/Kolkata");
  await trigger.click();
  const search = popup(page).getByRole("combobox", {
    name: "Search time zones",
  });
  await expect(search).toBeVisible();
  await search.fill("tok");
  await expect(page.getByRole("option")).toHaveText(["Asia/Tokyo"]);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(popup(page)).toHaveCount(0);
  await expect(trigger).toContainText("Asia/Tokyo");

  const icon = scope.getByRole("combobox", { name: "Assign to" });
  await icon.click();
  await popup(page)
    .getByRole("combobox", { name: "Search teammates" })
    .fill("pri");
  await page.getByRole("option", { name: /Priya Raman/ }).click();
  await expect(scope).toContainText("Priya Raman");
});

test("groups show labels and separators and filter inside each group", async ({
  page,
}) => {
  await open(page);
  const input = demo(page, "groups").getByRole("combobox", {
    name: "Office time zone",
  });
  await input.click();
  await expect(popup(page).locator('[data-slot="combobox-label"]')).toHaveText([
    "Americas",
    "Europe and Africa",
    "Asia and Pacific",
  ]);
  await expect(
    popup(page).locator('[data-slot="combobox-separator"]'),
  ).toHaveCount(2);
  await expect(popup(page).getByRole("group")).toHaveCount(3);
  await input.fill("berlin");
  await expect(page.getByRole("option")).toHaveText(["Europe/Berlin"]);
  await expect(popup(page).locator('[data-slot="combobox-label"]')).toHaveText([
    "Europe and Africa",
  ]);
  await input.fill("nowhere");
  await expect(popup(page).getByRole("status")).toHaveText(
    "No time zone found.",
  );
});

test("loading, empty, invalid, and disabled item states", async ({ page }) => {
  await open(page);
  const states = demo(page, "states");
  const loading = states.getByRole("combobox", { name: "Source table" });
  await expect(loading).toHaveAttribute("aria-busy", "true");
  await loading.click();
  await expect(popup(page).getByRole("status")).toHaveText("Loading tables…");
  await page.keyboard.press("Escape");

  const empty = states.getByRole("combobox", { name: "Destination table" });
  await empty.click();
  await expect(popup(page).getByRole("status")).toHaveText("No tables yet.");
  await page.keyboard.press("Escape");

  const sync = states.getByRole("combobox", { name: "Sync into" });
  await states.getByRole("button", { name: "Start sync" }).click();
  await expect(sync).toHaveAttribute("aria-invalid", "true");
  await expect(sync).toHaveAccessibleDescription(
    "Choose a table to sync into.",
  );

  await sync.click();
  const renewals = page.getByRole("option", { name: /Renewals/ });
  await expect(renewals).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("option", { name: "Invoices" }).click();
  await expect(sync).toHaveValue("Invoices");
  await expect(sync).not.toHaveAttribute("aria-invalid", "true");
});

for (const mode of ["Light", "Dark"]) {
  test(`popup uses ${mode.toLowerCase()} colors, animates, and respects reduced motion`, async ({
    page,
  }) => {
    await open(page);
    await chooseOption(page, "Color mode", mode);
    await page.getByRole("combobox", { name: "Choose a fruit" }).click();
    const surface = popup(page);
    await expect(surface).toBeVisible();
    await expect(surface).toHaveCSS(
      "background-color",
      mode === "Dark" ? "rgb(29, 29, 29)" : "rgb(253, 253, 253)",
    );
    await expect(surface).toHaveCSS("transition-duration", /0\.12s/);
    await settle(page);
    await expect(surface).toHaveCSS("opacity", "1");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(surface).toHaveCSS("transition-duration", "0s");
  });
}

test("focus rings follow keyboard focus on inputs and chips", async ({
  page,
}) => {
  await open(page);
  const input = demo(page, "basics").getByRole("combobox", {
    name: "Choose a fruit",
  });
  await input.focus();
  const group = demo(page, "basics")
    .locator('[data-slot="input-group"]')
    .first();
  await expect(group).toHaveCSS("outline-style", "solid");
  await expect(group).toHaveCSS("outline-width", "2px");
  const chips = demo(page, "basics").locator('[data-slot="combobox-chips"]');
  await demo(page, "basics")
    .getByRole("combobox", { name: "Add fruit" })
    .focus();
  await expect(chips).toHaveCSS("outline-style", "solid");
});

test("touch screens get 44px items and lists stay on screen", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    baseURL: "http://127.0.0.1:4322",
  });
  const page = await context.newPage();
  try {
    await open(page);
    const input = page.getByRole("combobox", { name: "Choose a fruit" });
    await input.tap();
    await expect(popup(page)).toBeVisible();
    await expect(page.getByRole("option").first()).toHaveCSS(
      "min-height",
      "44px",
    );
    const bounds = await popup(page).boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    await page.getByRole("option", { name: "Pear" }).tap();
    await expect(input).toHaveValue("Pear");
    await noOverflow(page);
  } finally {
    await context.close();
  }
});
