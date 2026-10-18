import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/toggle-group/";

async function openToggleGroup(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#toggle-group-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

async function cssColor(page: Page, value: string) {
  return page.evaluate((color) => {
    const probe = document.createElement("span");
    probe.style.color = color;
    document.body.append(probe);
    const result = getComputedStyle(probe).color;
    probe.remove();
    return result;
  }, value);
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`toggle group ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openToggleGroup(page);
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
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const pressed = example(page, "Segmented controls").getByRole(
          "button",
          { name: "Model", exact: true },
        );
        await expect(pressed).toHaveAttribute("aria-pressed", "true");
        await expect(pressed).toHaveCSS(
          "color",
          await cssColor(page, "var(--sprout-primary)"),
        );
        await expect(pressed).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-primary-subtle)"),
        );
        for (const card of await demo
          .locator(".toggle-group-demo-card-body")
          .all()) {
          expect(
            await card.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        }
        // Every group stays inside its card.
        for (const group of await demo.getByRole("group").all()) {
          const box = await group.boundingBox();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        }
        const results = await new AxeBuilder({ page })
          .include("#toggle-group-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await page.mouse.move(0, 0);
        const path = testInfo.outputPath(
          `toggle-group-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`toggle-group-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("sizes, variants, and spacing render at Cloud dimensions", async ({
  page,
}) => {
  await openToggleGroup(page);
  const heights = { sm: "28px", default: "32px", lg: "36px" };
  for (const variant of ["default", "outline"]) {
    for (const [size, height] of Object.entries(heights)) {
      const sample = page.getByTestId(`sample-${variant}-${size}`);
      const group = sample.getByRole("group");
      await expect(group).toHaveAttribute("data-variant", variant);
      await expect(group).toHaveAttribute("data-size", size);
      await expect(group).toHaveCSS("column-gap", "8px");
      const items = group.getByRole("button");
      await expect(items).toHaveCount(3);
      await expect(items.first()).toHaveCSS("height", height);
      await expect(items.first()).toHaveCSS(
        "border-top-color",
        variant === "outline"
          ? await cssColor(page, "var(--sprout-input)")
          : "rgba(0, 0, 0, 0)",
      );
      await expect(items.first()).toHaveCSS(
        "font-size",
        size === "sm" ? "12px" : "14px",
      );
    }
  }
  const icon = page
    .getByTestId("sample-outline-default")
    .getByRole("button", { name: "Bold" });
  await expect(icon).toHaveCSS("min-width", "32px");
  // Cloud pads icon-only items 10px on each side of the 16px icon.
  await expect(icon).toHaveCSS("padding-left", "10px");
  await expect(icon.locator("svg")).toHaveCSS("width", "16px");
  const disabled = page
    .getByTestId("sample-outline-default")
    .getByRole("button", { name: "Underline" });
  await expect(disabled).toBeDisabled();
  await expect(disabled).toHaveCSS("opacity", "0.5");

  const segmented = example(page, "Segmented controls").getByRole("group", {
    name: "Time range",
  });
  await expect(segmented).toHaveCSS("column-gap", "0px");
  const [first, last] = await segmented.getByRole("button").all();
  await expect(first).toHaveCSS("border-top-right-radius", "0px");
  await expect(first).toHaveCSS("border-left-width", "1px");
  await expect(last).toHaveCSS("border-left-width", "0px");
  await expect(last).toHaveCSS("border-top-left-radius", "0px");
  expect(
    await last.evaluate((node) => getComputedStyle(node).borderTopRightRadius),
  ).not.toBe("0px");
  const a = await first.boundingBox();
  const b = await last.boundingBox();
  expect(Math.round(b!.x)).toBe(Math.round(a!.x + a!.width));
});

test("single selection is controlled and never clears", async ({ page }) => {
  await openToggleGroup(page);
  const card = example(page, "Segmented controls");
  const split = card.getByRole("group", { name: "Split usage by" });
  const agent = split.getByRole("button", { name: "Agent" });
  await agent.click();
  await expect(agent).toHaveAttribute("aria-pressed", "true");
  await expect(split.getByRole("button", { name: "Model" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(card.locator("caption")).toHaveText(
    "Usage by agent · Last 30 days",
  );
  await agent.click();
  await expect(agent).toHaveAttribute("aria-pressed", "true");
  await card.getByRole("button", { name: "7d" }).click();
  await expect(card.getByRole("status")).toContainText(
    "No usage in the last 7 days",
  );
  await card.getByRole("button", { name: "30d" }).click();
  await expect(card.locator("tbody tr")).toHaveCount(3);
});

test("keyboard moves with arrows, Home, and End, and presses with Space and Enter", async ({
  page,
}, testInfo) => {
  await openToggleGroup(page);
  const settings = example(page, "Settings row");
  const group = settings.getByRole("group", { name: "Theme" });
  const system = group.getByRole("button", { name: "System" });
  const light = group.getByRole("button", { name: "Light" });
  const dark = group.getByRole("button", { name: "Dark" });
  await system.focus();
  await expect(system).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("ArrowRight");
  await expect(light).toBeFocused();
  await page.keyboard.press("Space");
  await expect(light).toHaveAttribute("aria-pressed", "true");
  await expect(settings.getByRole("status")).toHaveText("Sample theme: Light");
  await page.keyboard.press("End");
  await expect(dark).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(system).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(dark).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dark).toHaveAttribute("aria-pressed", "true");
  const focusPath = testInfo.outputPath("toggle-group-focus.png");
  await settings.screenshot({ animations: "disabled", path: focusPath });
  await testInfo.attach("toggle-group-focus", {
    path: focusPath,
    contentType: "image/png",
  });
  await page.keyboard.press("Home");
  await expect(system).toBeFocused();
  // Tab leaves the group in one step.
  await page.keyboard.press("Tab");
  await expect(group.locator(":focus")).toHaveCount(0);

  const vertical = example(page, "Vertical and multiple").getByRole("group", {
    name: "Text style",
  });
  const bold = vertical.getByRole("button", { name: "Bold" });
  const italic = vertical.getByRole("button", { name: "Italic" });
  const underline = vertical.getByRole("button", { name: "Underline" });
  await expect(vertical).toHaveAttribute("data-orientation", "vertical");
  await bold.focus();
  await page.keyboard.press("ArrowDown");
  await expect(italic).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(underline).toBeFocused();
  await page.keyboard.press("Space");
  await expect(bold).toHaveAttribute("aria-pressed", "true");
  await expect(italic).toHaveAttribute("aria-pressed", "true");
  await expect(underline).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Space");
  await expect(italic).toHaveAttribute("aria-pressed", "false");
  await expect(
    example(page, "Vertical and multiple").getByRole("status"),
  ).toHaveText("Applied: bold, underline");
  const boldBox = await bold.boundingBox();
  const italicBox = await italic.boundingBox();
  expect(italicBox!.y).toBeGreaterThan(boldBox!.y);
  expect(Math.round(italicBox!.x)).toBe(Math.round(boldBox!.x));

  const columns = example(page, "Vertical and multiple").getByRole("group", {
    name: "Visible columns",
  });
  const due = columns.getByRole("button", { name: "Due date" });
  await expect(due).toBeDisabled();
  await columns.getByRole("button", { name: "Owner" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(columns.getByRole("button", { name: "Name" })).toBeFocused();
  await expect(columns.getByRole("button", { name: "Status" })).toHaveCSS(
    "border-top-width",
    "0px",
  );
});

test("toolbar states disable the group and stack on narrow widths", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openToggleGroup(page);
  const card = example(page, "Table toolbar");
  const layout = card.getByRole("group", { name: "Layout" });
  const board = layout.getByRole("button", { name: "Board" });
  await expect(board.locator("svg")).toHaveCSS("width", "14px");
  await board.click();
  await expect(
    card.getByRole("region", { name: "Tasks as board" }),
  ).toBeVisible();
  const toggleBox = await layout.boundingBox();
  const toolsBox = await card
    .getByRole("group", { name: "Table tools" })
    .boundingBox();
  expect(toolsBox!.y).toBeGreaterThan(toggleBox!.y + toggleBox!.height - 1);

  await chooseOption(page, "Rows state", "Loading");
  await expect(layout).toHaveAttribute("data-disabled", "");
  for (const item of await layout.getByRole("button").all())
    await expect(item).toBeDisabled();
  await expect(card.locator('[aria-busy="true"]')).toBeVisible();
  const path = testInfo.outputPath("toggle-group-toolbar-loading.png");
  await card.screenshot({ animations: "disabled", path });
  await testInfo.attach("toggle-group-toolbar-loading", {
    path,
    contentType: "image/png",
  });

  await chooseOption(page, "Rows state", "Empty");
  await expect(layout.getByRole("button").first()).toBeEnabled();
  await expect(card.getByRole("status")).toContainText("No rows yet");
  await chooseOption(page, "Rows state", "Error");
  await expect(card.getByRole("alert")).toContainText("Rows could not load");
  await chooseOption(page, "Rows state", "Ready");
  await layout.getByRole("button", { name: "List" }).click();
  await expect(
    card.getByRole("region", { name: "Tasks as list" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  const wideToggle = await layout.boundingBox();
  const wideTools = await card
    .getByRole("group", { name: "Table tools" })
    .boundingBox();
  expect(Math.abs(wideTools!.y - wideToggle!.y)).toBeLessThan(4);
});

test("docs navigation links to the toggle group page", async ({ page }) => {
  await page.goto("/components/tabs/");
  const link = page
    .getByRole("navigation", { name: "Documentation" })
    .getByRole("link", { name: "Toggle Group" });
  await expect(link).toHaveAttribute("href", route);
  await link.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Toggle Group",
  );
});

test("reduced motion removes the color transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openToggleGroup(page);
  const item = page
    .getByTestId("sample-default-sm")
    .getByRole("button", { name: "Agent" });
  await expect(item).toHaveCSS("transition-duration", "0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(item).toHaveCSS("transition-duration", /^0\.12s/);
});
