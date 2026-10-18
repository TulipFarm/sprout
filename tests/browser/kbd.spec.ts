import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { setColorMode } from "./choose-option";

const route = "/components/kbd/";

async function openKbd(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#kbd-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

async function setMode(page: Page, mode: "Light" | "Dark") {
  await setColorMode(page, mode);
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished),
    );
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

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`kbd ${theme} ${mode} at ${width}px`, async ({ page }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openKbd(page);
        await page.evaluate(
          (value) =>
            document.documentElement.setAttribute("data-sprout-theme", value),
          theme,
        );
        await setMode(page, mode === "light" ? "Light" : "Dark");
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const fill = await color(page, "var(--sprout-secondary)");
        const surface = await color(page, "var(--sprout-surface)");
        const line = await color(page, "var(--sprout-line)");
        const plain = page
          .getByTestId("variant-default")
          .locator("kbd")
          .first();
        const outline = page
          .getByTestId("variant-outline")
          .locator("kbd")
          .first();
        await expect(plain).toHaveCSS("background-color", fill);
        await expect(outline).toHaveCSS("background-color", surface);
        await expect(outline).toHaveCSS("border-top-color", line);
        for (const body of await demo.locator(".kbd-demo-card-body").all())
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        for (const key of await demo.locator('[data-slot="kbd"]:visible').all())
          expect(
            await key.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        const results = await new AxeBuilder({ page })
          .include("#kbd-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(`kbd-${theme}-${mode}-${width}.png`);
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`kbd-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("keys keep compact geometry for symbols, words, and icons", async ({
  page,
}) => {
  await openKbd(page);
  const variants = example(page, "Variants");
  const symbol = variants.locator("kbd", { hasText: "⌘" });
  const box = await symbol.boundingBox();
  expect(Math.round(box!.height)).toBe(20);
  expect(box!.width).toBeGreaterThanOrEqual(20);
  expect(box!.width).toBeLessThanOrEqual(22);
  const slash = await variants.locator("kbd", { hasText: "/" }).boundingBox();
  expect(Math.round(slash!.width)).toBe(20);
  expect(Math.round(slash!.height)).toBe(20);
  const word = await variants
    .locator("kbd", { hasText: "Enter" })
    .boundingBox();
  expect(Math.round(word!.height)).toBe(20);
  expect(word!.width).toBeGreaterThan(20);
  await expect(symbol).toHaveCSS("pointer-events", "none");
  await expect(symbol).toHaveCSS("user-select", "none");
  await expect(symbol).toHaveCSS("font-size", "12px");
  const groups = example(page, "Keys and key groups");
  const icon = groups.locator('[data-slot="kbd"] svg').first();
  await expect(icon).toHaveCSS("width", "12px");
  await expect(icon).toHaveCSS("height", "12px");
  const group = groups.locator('[data-slot="kbd-group"]').first();
  const keys = group.locator('[data-slot="kbd"]');
  await expect(keys).toHaveCount(2);
  const first = await keys.nth(0).boundingBox();
  const second = await keys.nth(1).boundingBox();
  expect(Math.round(second!.x - (first!.x + first!.width))).toBe(4);
  const inline = groups.locator("p", { hasText: "to close." }).locator("kbd");
  await expect(inline).toHaveText("Esc");
  await expect(inline).toHaveCSS("display", "inline-flex");
});

test("footer hints pair outline keys with their actions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openKbd(page);
  const card = example(page, "Footer hints");
  for (const [label, hints] of [
    ["Search palette keys", ["↑↓Select", "↵Open", "EscClose"]],
    [
      "Calendar commands keys",
      ["/Open commands", "[ ]Previous / next", "EscClose"],
    ],
    ["Search examples keys", ["↑ ↓Navigate", "↵Choose"]],
  ] as const) {
    const footer = card.getByRole("group", { name: label });
    await expect(footer.locator(".kbd-demo-hint")).toHaveText([...hints]);
    for (const key of await footer.locator("kbd").all())
      await expect(key).toHaveAttribute("data-variant", "outline");
    expect(
      await footer.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
  }
});

test("the enter key follows the highlighted row by keyboard", async ({
  page,
}) => {
  await openKbd(page);
  const card = example(page, "Selected row");
  const input = card.getByRole("combobox");
  await input.focus();
  await expect(input).toBeFocused();
  const options = card.getByRole("option");
  const enter = (index: number) =>
    options.nth(index).locator('[data-slot="kbd"]');
  await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");
  await expect(enter(0)).toBeVisible();
  await expect(enter(0)).toHaveAttribute("aria-hidden", "true");
  await expect(
    options.nth(0).locator(".kbd-demo-result-trailing"),
  ).toBeHidden();
  await expect(enter(1)).toBeHidden();
  await expect(
    options.nth(1).locator(".kbd-demo-result-trailing"),
  ).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(enter(0)).toBeHidden();
  await expect(enter(1)).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(enter(2)).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(card.getByRole("status")).toHaveText(
    "Chose Spring planting review.",
  );
  await input.fill("zzzz");
  await expect(
    card.getByText("No matches. Try another title or command."),
  ).toBeVisible();
  await expect(card.locator('[data-slot="kbd"]')).toHaveCount(0);
});

test("pointer hover moves the enter key and clicks pass through", async ({
  page,
}) => {
  await openKbd(page);
  const card = example(page, "Selected row");
  const row = card.getByRole("option", { name: /Greenhouse notes/ });
  await row.hover();
  const enter = row.locator('[data-slot="kbd"]');
  await expect(enter).toBeVisible();
  await enter.click({ force: true });
  await expect(card.getByRole("status")).toHaveText("Chose Greenhouse notes.");
});

test("keys appear in tooltips on keyboard focus", async ({
  page,
}, testInfo) => {
  await openKbd(page);
  const card = example(page, "In a tooltip");
  const search = card.getByRole("button", { name: "Search" });
  await search.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(search).toBeFocused();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip.locator('[data-slot="kbd-group"] kbd')).toHaveText([
    "⌘",
    "K",
  ]);
  const fill = await color(page, "var(--sprout-secondary)");
  await expect(tooltip.locator("kbd kbd").first()).toHaveCSS(
    "background-color",
    fill,
  );
  const path = testInfo.outputPath("kbd-tooltip.png");
  await page.screenshot({
    animations: "disabled",
    path,
    clip: await card.boundingBox().then((box) => ({
      x: Math.max(0, box!.x - 60),
      y: box!.y - 60,
      width: box!.width + 60,
      height: box!.height + 60,
    })),
  });
  await testInfo.attach("kbd-tooltip", { path, contentType: "image/png" });
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
  await page.keyboard.press("Tab");
  const close = card.getByRole("button", { name: "Close panel" });
  await expect(close).toBeFocused();
  await expect(page.getByRole("tooltip")).toContainText("Esc");
});

test("reduced motion removes the color transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openKbd(page);
  const key = page.getByTestId("variant-default").locator("kbd").first();
  await expect(key).toHaveCSS("transition-duration", "0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(key).toHaveCSS("transition-duration", /^0\.12s/);
});

test("docs navigation links to the kbd page", async ({ page }) => {
  await page.goto("/components/label/");
  const link = page
    .getByRole("navigation", { name: "Documentation" })
    .getByRole("link", { name: "Kbd", exact: true });
  await expect(link).toHaveAttribute("href", route);
  await link.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kbd");
  await expect(link).toHaveAttribute("aria-current", "page");
});
