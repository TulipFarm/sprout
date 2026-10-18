import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/direction/";

async function openDirection(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#direction-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

test("lists Direction in the docs navigation", async ({ page }) => {
  await page.goto("/components/sidebar/");
  const link = page
    .getByRole("navigation")
    .getByRole("link", { name: "Direction", exact: true })
    .first();
  await expect(link).toHaveAttribute("href", "/components/direction/");
  await link.click();
  await expect(page).toHaveURL(/\/components\/direction\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Direction" }),
  ).toBeVisible();
});

test("lays out the playground's left-to-right and right-to-left paths", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openDirection(page);
  for (const [name, direction, first, current] of [
    ["Left to right", "ltr", "Projects", "Garden"],
    ["Right to left", "rtl", "المشاريع", "الحديقة"],
  ] as const) {
    const card = example(page, name);
    const frame = card.locator(`[dir="${direction}"]`);
    await expect(frame).toHaveCount(1);
    const link = frame.getByRole("link", { name: first });
    const page_ = frame.locator('[aria-current="page"]');
    await expect(page_).toHaveText(current);
    const a = (await link.boundingBox())!;
    const b = (await page_.boundingBox())!;
    if (direction === "ltr") expect(a.x).toBeLessThan(b.x);
    else expect(a.x).toBeGreaterThan(b.x);
    const box = (await frame.boundingBox())!;
    if (direction === "rtl")
      expect(box.x + box.width - (a.x + a.width)).toBeLessThan(4);
    else expect(a.x - box.x).toBeLessThan(4);
    await link.click();
    await expect(page).toHaveURL(/\/components\/direction\/$/);
  }
});

test("arrow keys and useDirection follow the provider", async ({ page }) => {
  await openDirection(page);
  const card = example(page, "Keyboard and useDirection");
  const frame = card.getByTestId("direction-demo-switch");
  await expect(frame).toHaveAttribute("dir", "rtl");
  await expect(card.locator(".direction-demo-readout")).toHaveAttribute(
    "data-direction",
    "rtl",
  );
  const rtlView = frame.getByRole("group", { name: "العرض" });
  await rtlView.getByRole("button", { name: "قائمة" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(rtlView.getByRole("button", { name: "لوحة" })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(rtlView.getByRole("button", { name: "لوحة" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.keyboard.press("ArrowRight");
  await expect(rtlView.getByRole("button", { name: "قائمة" })).toBeFocused();

  const switcher = card.getByRole("group", { name: "Direction" });
  await switcher.getByRole("button", { name: "Left to right" }).click();
  await expect(frame).toHaveAttribute("dir", "ltr");
  await expect(card.locator(".direction-demo-readout")).toHaveAttribute(
    "data-direction",
    "ltr",
  );
  await expect(card.locator(".direction-demo-readout")).toContainText('"ltr"');
  const ltrView = frame.getByRole("group", { name: "View" });
  await ltrView.getByRole("button", { name: "List" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(ltrView.getByRole("button", { name: "Board" })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(ltrView.getByRole("button", { name: "List" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(frame.getByRole("link", { name: "Projects" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    switcher.getByRole("button", { name: "Left to right" }),
  ).toBeFocused();
});

test("flips the breadcrumb chevron in right-to-left text", async ({ page }) => {
  await openDirection(page);
  const transform = (name: string) =>
    example(page, name)
      .locator('[data-slot="breadcrumb-separator"] svg')
      .first()
      .evaluate((node) => getComputedStyle(node).transform);
  expect(await transform("Left to right")).toBe("none");
  expect(await transform("Right to left")).not.toBe("none");
});

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`direction ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openDirection(page);
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
        for (const body of await demo
          .locator(".direction-demo-card-body")
          .all())
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        const results = await new AxeBuilder({ page })
          .include("#direction-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(
          `direction-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`direction-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}
