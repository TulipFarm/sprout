import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/button-group/";

async function openButtonGroup(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#button-group-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

function radius(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.borderRadius = "var(--sprout-radius-control)";
    document.body.append(probe);
    const value = getComputedStyle(probe).borderTopLeftRadius;
    probe.remove();
    return value;
  });
}

function color(page: Page, value: string) {
  return page.evaluate((input) => {
    const probe = document.createElement("span");
    probe.style.color = input;
    document.body.append(probe);
    const result = getComputedStyle(probe).color;
    probe.remove();
    return result;
  }, value);
}

async function corners(locator: Locator) {
  return locator.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      tl: style.borderTopLeftRadius,
      tr: style.borderTopRightRadius,
      br: style.borderBottomRightRadius,
      bl: style.borderBottomLeftRadius,
      top: style.borderTopWidth,
      left: style.borderLeftWidth,
    };
  });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`button group ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openButtonGroup(page);
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
        const text = demo.locator('[data-slot="button-group-text"]').first();
        await expect(text).toHaveCSS(
          "background-color",
          await color(page, "var(--sprout-secondary)"),
        );
        await expect(text).toHaveCSS(
          "border-top-color",
          await color(page, "var(--sprout-input)"),
        );
        await expect(
          demo.locator('[data-slot="button-group-separator"]').first(),
        ).toHaveCSS(
          "background-color",
          await color(page, "var(--sprout-input)"),
        );
        for (const body of await demo
          .locator(".button-group-demo-card-body")
          .all())
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        for (const group of await demo
          .locator('[data-slot="button-group"]')
          .all()) {
          const fits = await group.evaluate((node) => {
            const parent = node.parentElement!.getBoundingClientRect();
            const box = node.getBoundingClientRect();
            return (
              box.left >= parent.left - 0.5 && box.right <= parent.right + 0.5
            );
          });
          expect(fits).toBe(true);
        }
        for (const cell of await demo
          .locator('[data-slot="button-group-text"], [data-slot="button"]')
          .all())
          expect(
            await cell.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        const results = await new AxeBuilder({ page })
          .include("#button-group-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(
          `button-group-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`button-group-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("horizontal groups join buttons and separators", async ({ page }) => {
  await openButtonGroup(page);
  const r = await radius(page);
  const panel = page.getByTestId("orientation-horizontal");
  const pager = panel.getByRole("group", { name: "horizontal pages" });
  await expect(pager).toHaveCSS("flex-direction", "row");
  const previous = pager.getByRole("button", { name: "Previous" });
  const next = pager.getByRole("button", { name: "Next" });
  const separator = pager.locator('[data-slot="button-group-separator"]');
  await expect(separator).toHaveAttribute("data-orientation", "vertical");
  expect(await corners(previous)).toMatchObject({
    tl: r,
    bl: r,
    tr: "0px",
    br: "0px",
    left: "1px",
  });
  expect(await corners(next)).toMatchObject({
    tl: "0px",
    bl: "0px",
    tr: r,
    br: r,
    left: "0px",
  });
  const p = (await previous.boundingBox())!;
  const s = (await separator.boundingBox())!;
  const n = (await next.boundingBox())!;
  expect(Math.round(s.width)).toBe(1);
  expect(Math.round(s.height)).toBe(Math.round(p.height) - 2);
  expect(Math.round(s.x - (p.x + p.width))).toBe(0);
  expect(Math.round(n.x - (s.x + s.width))).toBe(0);
  expect(Math.round(p.height)).toBe(28);
  const quantity = panel.getByRole("group", { name: "horizontal quantity" });
  const text = quantity.locator('[data-slot="button-group-text"]');
  const add = quantity.getByRole("button", { name: "Add one" });
  expect(await corners(text)).toMatchObject({ tr: "0px", tl: r });
  expect(await corners(add)).toMatchObject({ tl: "0px", tr: r, left: "0px" });
  const t = (await text.boundingBox())!;
  const a = (await add.boundingBox())!;
  expect(Math.round(t.height)).toBe(Math.round(a.height));
  await expect(add.locator("svg")).toHaveCSS("width", "16px");
});

test("vertical groups stack and join top to bottom", async ({ page }) => {
  await openButtonGroup(page);
  const r = await radius(page);
  const panel = page.getByTestId("orientation-vertical");
  const pager = panel.getByRole("group", { name: "vertical pages" });
  await expect(pager).toHaveAttribute("data-orientation", "vertical");
  await expect(pager).toHaveCSS("flex-direction", "column");
  const previous = pager.getByRole("button", { name: "Previous" });
  const next = pager.getByRole("button", { name: "Next" });
  const separator = pager.locator('[data-slot="button-group-separator"]');
  await expect(separator).toHaveAttribute("data-orientation", "horizontal");
  expect(await corners(previous)).toMatchObject({
    tl: r,
    tr: r,
    bl: "0px",
    br: "0px",
  });
  expect(await corners(next)).toMatchObject({
    tl: "0px",
    tr: "0px",
    bl: r,
    br: r,
    top: "0px",
  });
  const p = (await previous.boundingBox())!;
  const s = (await separator.boundingBox())!;
  const n = (await next.boundingBox())!;
  const g = (await pager.boundingBox())!;
  expect(Math.round(s.height)).toBe(1);
  expect(Math.round(s.width)).toBe(Math.round(g.width) - 2);
  expect(Math.round(p.width)).toBe(Math.round(g.width));
  expect(Math.round(n.y - (s.y + s.height))).toBe(0);
  const quantity = panel.getByRole("group", { name: "vertical quantity" });
  const text = quantity.locator('[data-slot="button-group-text"]');
  expect(await corners(text)).toMatchObject({ bl: "0px", tl: r });
  expect(
    await corners(quantity.getByRole("button", { name: "Add one" })),
  ).toMatchObject({ tl: "0px", top: "0px", bl: r });
});

test("pager and quantity work by keyboard in both orientations", async ({
  page,
}) => {
  await openButtonGroup(page);
  for (const orientation of ["horizontal", "vertical"]) {
    const panel = page.getByTestId(`orientation-${orientation}`);
    const pager = panel.getByRole("group", { name: `${orientation} pages` });
    const previous = pager.getByRole("button", { name: "Previous" });
    const next = pager.getByRole("button", { name: "Next" });
    const status = panel.getByRole("status").first();
    await expect(previous).toBeDisabled();
    await expect(status).toHaveText("Page 1 of 3");
    await next.focus();
    await expect(next).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(status).toHaveText("Page 2 of 3");
    await page.keyboard.press("Space");
    await expect(status).toHaveText("Page 3 of 3");
    await expect(next).toBeDisabled();
    await expect(previous).toBeEnabled();
    await previous.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(previous).toBeFocused();
    await expect(previous).toHaveCSS("z-index", "1");
    await expect(previous).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    await expect(status).toHaveText("Page 2 of 3");
    await page.keyboard.press("Tab");
    await expect(next).toBeFocused();
    await page.keyboard.press("Tab");
    const add = panel.getByRole("button", { name: "Add one" });
    await expect(add).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    await expect(
      panel.getByRole("group", { name: `${orientation} quantity` }),
    ).toContainText("Quantity: 2");
    await expect(panel.getByRole("status").nth(1)).toHaveText(
      "2 items selected locally.",
    );
  }
});

test("every button size keeps its height and control-radius corners", async ({
  page,
}) => {
  await openButtonGroup(page);
  const r = await radius(page);
  const card = example(page, "Button sizes");
  for (const [size, height, label, square] of [
    ["xs", 24, "Copy link", "More share options"],
    ["sm", 28, "Today", "Previous week"],
    ["default", 28, "Rows per page", null],
    ["icon", 32, "Next month", "Previous month"],
    ["lg", 36, "Export CSV", "More export formats"],
  ] as const) {
    const row = card.getByTestId(`size-${size}`);
    const group = row.locator('[data-slot="button-group"]');
    await expect(
      group
        .getByRole("button", { name: label, exact: true })
        .or(group.getByText(label, { exact: true }))
        .first(),
    ).toBeVisible();
    const cells = group.locator(":scope > [data-slot]");
    expect(await corners(cells.first())).toMatchObject({
      tl: r,
      bl: r,
      tr: "0px",
    });
    expect(await corners(cells.last())).toMatchObject({
      tr: r,
      br: r,
      tl: "0px",
    });
    for (const cell of await cells.all())
      expect(Math.round((await cell.boundingBox())!.height)).toBe(height);
    if (square) {
      const box = (await group
        .getByRole("button", { name: square, exact: true })
        .boundingBox())!;
      expect(Math.round(box.width)).toBe(height);
    }
  }
  await card.getByRole("button", { name: "Next week" }).click();
  await expect(card.getByRole("status")).toHaveText("Showing 20–26 Apr.");
  await card.getByRole("button", { name: "Copy link" }).click();
  await expect(card.getByRole("status")).toHaveText(
    "Copied link to Greenhouse notes.",
  );
});

test("filled variants use a separator and outline variants join borders", async ({
  page,
}) => {
  await openButtonGroup(page);
  const card = example(page, "Button variants");
  const outline = card.getByTestId("variant-outline");
  await expect(
    outline.locator('[data-slot="button-group-separator"]'),
  ).toHaveCount(0);
  const save = outline.getByRole("button", { name: "Save draft" });
  expect(await corners(save)).toMatchObject({ left: "0px", tl: "0px" });
  for (const variant of ["secondary", "default"]) {
    const row = card.getByTestId(`variant-${variant}`);
    await expect(
      row.locator('[data-slot="button-group-separator"]'),
    ).toHaveCount(1);
    await expect(row.locator('[data-slot="button"]').first()).toHaveAttribute(
      "data-variant",
      variant,
    );
  }
  await card
    .getByRole("button", { name: "Publish", exact: true })
    .press("Enter");
  await expect(card.getByRole("status")).toHaveText("Published to Meadow.");
});

test("text cells render outputs and nested groups are spaced", async ({
  page,
}, testInfo) => {
  await openButtonGroup(page);
  const card = example(page, "Text cells and nested groups");
  const seats = card.getByRole("group", { name: "Seats" });
  const output = seats.locator("output");
  await expect(output).toHaveAttribute("data-slot", "button-group-text");
  await expect(output).toHaveText("3 seats");
  const add = seats.getByRole("button", { name: "Add a seat" });
  const remove = seats.getByRole("button", { name: "Remove a seat" });
  await remove.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(output).toHaveText("1 seat");
  await expect(remove).toBeDisabled();
  await add.click();
  await expect(output).toHaveText("2 seats");
  const icon = card
    .getByTestId("text-icon")
    .locator('[data-slot="button-group-text"] svg');
  await expect(icon).toHaveCSS("width", "16px");
  await expect(icon).toHaveCSS("height", "16px");
  const toolbar = card.getByRole("group", { name: "Calendar toolbar" });
  await expect(toolbar).toHaveCSS("column-gap", "8px");
  const week = toolbar.getByRole("group", { name: "Week navigation" });
  const jump = toolbar.getByRole("group", { name: "Jump to date" });
  const w = (await week.boundingBox())!;
  const j = (await jump.boundingBox())!;
  expect(Math.round(j.x - (w.x + w.width))).toBe(8);
  await week.getByRole("button", { name: "Next week" }).click();
  await expect(week.locator("output")).toHaveText("Week 16");
  await jump.getByRole("button", { name: "Today" }).click();
  await expect(week.locator("output")).toHaveText("Week 15");
  const path = testInfo.outputPath("button-group-text-nested.png");
  await card.screenshot({ animations: "disabled", path });
  await testInfo.attach("button-group-text-nested", {
    path,
    contentType: "image/png",
  });
});

test("mobile groups fit and stay usable", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const demo = await openButtonGroup(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const vertical = page.getByTestId("orientation-vertical");
  await vertical.getByRole("button", { name: "Next" }).click();
  await expect(vertical.getByRole("status").first()).toHaveText("Page 2 of 3");
  const path = testInfo.outputPath("button-group-mobile-320.png");
  await demo.screenshot({ animations: "disabled", path });
  await testInfo.attach("button-group-mobile-320", {
    path,
    contentType: "image/png",
  });
});

test("reduced motion removes the text cell transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openButtonGroup(page);
  const text = page.locator('[data-slot="button-group-text"]').first();
  await expect(text).toHaveCSS("transition-duration", "0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(text).toHaveCSS("transition-duration", /^0\.12s/);
});

test("docs navigation links to the button group page", async ({ page }) => {
  await page.goto("/components/button/");
  const link = page
    .getByRole("navigation", { name: "Documentation" })
    .getByRole("link", { name: "Button Group", exact: true });
  await expect(link).toHaveAttribute("href", route);
  await link.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Button Group",
  );
  await expect(link).toHaveAttribute("aria-current", "page");
});
