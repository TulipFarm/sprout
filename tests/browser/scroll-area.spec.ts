import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/scroll-area/";

async function openScrollArea(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#scroll-area-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

function bars(root: ReturnType<Page["locator"]>, orientation: string) {
  return root.locator(
    `> [data-slot="scroll-area-scrollbar"][data-orientation="${orientation}"]`,
  );
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`scroll area ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openScrollArea(page);
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
        for (const card of await demo
          .locator(".scroll-area-demo-card-body")
          .all()) {
          expect(
            await card.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        }
        const input = await page.evaluate(() => {
          const probe = document.createElement("span");
          probe.style.color = "var(--sprout-input)";
          document.body.append(probe);
          const value = getComputedStyle(probe).color;
          probe.remove();
          return value;
        });
        await expect(
          example(page, "Data grid").locator('[data-slot="table-container"]'),
        ).toHaveCSS("border-top-color", input);
        const results = await new AxeBuilder({ page })
          .include("#scroll-area-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(
          `scroll-area-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`scroll-area-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("sizes pair with their variant and draw only overflowing bars", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openScrollArea(page);
  const sm = page.getByTestId("size-sm");
  const md = page.getByTestId("size-md");
  const auto = page.getByTestId("size-auto");
  expect(Math.round((await sm.boundingBox())!.height)).toBe(160);
  expect(Math.round((await md.boundingBox())!.height)).toBe(256);
  await expect(sm).toHaveAttribute("data-variant", "plain");
  await expect(md).toHaveAttribute("data-variant", "plain");
  await expect(auto).toHaveAttribute("data-variant", "table");

  await expect(bars(sm, "vertical")).toHaveCount(1);
  await expect(bars(sm, "horizontal")).toHaveCount(0);
  await expect(bars(md, "vertical")).toHaveCount(1);
  await expect(bars(md, "horizontal")).toHaveCount(1);
  await expect(md.locator('> [data-slot="scroll-area-corner"]')).toHaveCount(1);
  // Eight records fit under the 60dvh cap, so the table frame draws no bar.
  await expect(bars(auto, "vertical")).toHaveCount(0);
  await expect(
    auto.locator('[data-slot="scroll-area-viewport"]'),
  ).toHaveAttribute("role", "region");
  await expect(
    auto.getByRole("region", { name: "auto sample records" }),
  ).toBeVisible();

  const bar = bars(sm, "vertical");
  await expect(bar).toHaveCSS("width", "10px");
  const barBox = (await bar.boundingBox())!;
  const smBox = (await sm.boundingBox())!;
  expect(Math.round(barBox.x + barBox.width)).toBe(
    Math.round(smBox.x + smBox.width - 1),
  );
});

test("data grid caps at 60dvh, scrolls both ways, and keeps the header pinned", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 800 });
  await openScrollArea(page);
  const card = example(page, "Data grid");
  const root = card.locator('[data-slot="table-container"]');
  const viewport = card.getByRole("region", { name: "Bulb plantings" });
  await expect(viewport).toHaveCSS("max-height", "480px");
  await expect(bars(root, "vertical")).toHaveCount(1);
  await expect(bars(root, "horizontal")).toHaveCount(1);

  const header = card.getByRole("columnheader", { name: "Project" });
  const before = (await header.boundingBox())!.y;
  await viewport.evaluate((node) => node.scrollTo({ top: 200 }));
  await expect
    .poll(async () => Math.round((await header.boundingBox())!.y))
    .toBe(Math.round(before));
  await expect(root).toHaveAttribute("data-overflow-y-start", "");
});

test("keyboard focuses overflowing viewports and scrolls them", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openScrollArea(page);
  const viewport = page
    .getByTestId("size-sm")
    .locator('[data-slot="scroll-area-viewport"]');
  await expect(viewport).toHaveAttribute("tabindex", "0");
  await viewport.focus();
  await expect(viewport).toBeFocused();
  await expect(viewport).toHaveCSS("outline-style", "solid");
  await expect(viewport).toHaveCSS("outline-width", "2px");
  await page.keyboard.press("End");
  await expect
    .poll(() => viewport.evaluate((node) => node.scrollTop))
    .toBeGreaterThan(100);
  await page.keyboard.press("Home");
  await expect.poll(() => viewport.evaluate((node) => node.scrollTop)).toBe(0);

  const row = page
    .getByTestId("horizontal")
    .locator('[data-slot="scroll-area-viewport"]');
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect(bars(page.getByTestId("horizontal"), "horizontal")).toHaveCount(
    1,
  );
  await expect(bars(page.getByTestId("horizontal"), "vertical")).toHaveCount(0);
  await row.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => row.evaluate((node) => node.scrollLeft))
    .toBeGreaterThan(0);
});

test("loading, empty, and error states keep the table frame", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openScrollArea(page);
  const loading = page.getByTestId("state-loading");
  const empty = page.getByTestId("state-empty");
  const error = page.getByTestId("state-error");
  await expect(loading).toHaveAttribute("aria-busy", "true");
  await expect(loading.getByRole("status")).toContainText("Loading plantings");
  await expect(bars(loading, "vertical")).toHaveCount(1);
  for (const state of [loading, empty, error]) {
    expect(Math.round((await state.boundingBox())!.height)).toBe(160);
  }
  await expect(bars(empty, "vertical")).toHaveCount(0);
  await expect(
    empty.locator('[data-slot="scroll-area-viewport"]'),
  ).toHaveAttribute("tabindex", "-1");
  await expect(empty.getByText("No plantings yet")).toBeVisible();
  await expect(error.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("thumb color transitions respect reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openScrollArea(page);
  const thumb = page
    .getByTestId("size-sm")
    .locator('[data-slot="scroll-area-thumb"]');
  await expect(thumb).toHaveCSS("transition-duration", "0.12s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(thumb).toHaveCSS("transition-duration", "0s");
});
