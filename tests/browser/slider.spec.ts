import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/slider/";

async function openSlider(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#slider-demo");
}

function row(page: Page, id: string) {
  return page.getByTestId(id);
}

function thumb(page: Page, name: string) {
  return page.getByRole("slider", { name, exact: true });
}

function thumbBox(page: Page, name: string) {
  return page
    .locator('[data-slot="slider-thumb"]')
    .filter({ has: thumb(page, name) });
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
      test(`slider ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openSlider(page);
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
        const single = row(page, "slider-single");
        await expect(single.locator('[data-slot="slider-range"]')).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-primary)"),
        );
        await expect(single.locator('[data-slot="slider-track"]')).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-input)"),
        );
        await expect(single.locator('[data-slot="slider-thumb"]')).toHaveCSS(
          "background-color",
          "rgb(255, 255, 255)",
        );
        await expect(single.locator('[data-slot="slider-thumb"]')).toHaveCSS(
          "border-top-color",
          await cssColor(page, "var(--sprout-focus)"),
        );
        const overflowing = await demo
          .locator(
            ".slider-demo-card-body, .slider-demo-row, .slider-demo-label",
          )
          .evaluateAll((nodes) =>
            nodes
              .filter((node) => node.scrollWidth > node.clientWidth)
              .map((node) => node.className),
          );
        expect(overflowing).toEqual([]);
        for (const control of await demo
          .locator('[data-slot="slider-thumb"]')
          .all()) {
          const rect = await control.boundingBox();
          expect(rect!.width).toBeCloseTo(12, 0);
          expect(rect!.height).toBeCloseTo(12, 0);
          expect(rect!.x).toBeGreaterThanOrEqual(0);
          expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
        }
        const results = await new AxeBuilder({ page })
          .include("#slider-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await page.mouse.move(0, 0);
        const path = testInfo.outputPath(
          `slider-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(5_000);
        await testInfo.attach(`slider-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("single, range, and disabled render Cloud's playground", async ({
  page,
}) => {
  await openSlider(page);
  await expect(row(page, "slider-single")).toContainText("Volume: 40");
  await expect(thumb(page, "Volume")).toHaveAttribute("aria-valuenow", "40");
  await expect(row(page, "slider-range")).toContainText("Range: 20–75");
  await expect(thumb(page, "Range minimum")).toHaveAttribute(
    "aria-valuenow",
    "20",
  );
  await expect(thumb(page, "Range maximum")).toHaveAttribute(
    "aria-valuenow",
    "75",
  );
  for (const id of ["slider-single", "slider-range", "slider-disabled"]) {
    const track = await row(page, id)
      .locator('[data-slot="slider-track"]')
      .boundingBox();
    expect(track!.height).toBeCloseTo(4, 0);
  }
  // Edge alignment keeps the thumb inside the track at both ends.
  const range = row(page, "slider-range");
  await thumb(page, "Range minimum").focus();
  await page.keyboard.press("Home");
  await thumb(page, "Range maximum").focus();
  await page.keyboard.press("End");
  await expect(range).toContainText("Range: 0–100");
  const track = await range.locator('[data-slot="slider-track"]').boundingBox();
  const low = await thumbBox(page, "Range minimum").boundingBox();
  const high = await thumbBox(page, "Range maximum").boundingBox();
  expect(low!.x).toBeCloseTo(track!.x, 0);
  expect(high!.x + high!.width).toBeCloseTo(track!.x + track!.width, 0);
  const fill = await range.locator('[data-slot="slider-range"]').boundingBox();
  // The fill runs from the first thumb's center to the last thumb's center.
  expect(fill!.width).toBeCloseTo(track!.width - 12, 0);

  const disabled = row(page, "slider-disabled");
  await expect(disabled).toContainText("Disabled value: 65");
  await expect(thumb(page, "Disabled")).toBeDisabled();
  await expect(thumb(page, "Disabled")).toHaveAttribute("aria-valuenow", "65");
  await expect(disabled.locator('[data-slot="slider-control"]')).toHaveCSS(
    "opacity",
    "0.5",
  );
  await expect(disabled.locator('[data-slot="slider-control"]')).toHaveCSS(
    "cursor",
    "not-allowed",
  );
  await disabled
    .locator('[data-slot="slider-track"]')
    .click({ position: { x: 10, y: 2 }, force: true });
  await expect(thumb(page, "Disabled")).toHaveAttribute("aria-valuenow", "65");
});

test("keyboard moves thumbs, skips disabled, and shows a focus ring", async ({
  page,
}) => {
  await openSlider(page);
  const volume = thumb(page, "Volume");
  await volume.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(volume).toBeFocused();
  await expect(thumbBox(page, "Volume")).toHaveCSS(
    "box-shadow",
    /0px 0px 0px 3px/,
  );
  await page.keyboard.press("ArrowRight");
  await expect(row(page, "slider-single")).toContainText("Volume: 41");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(row(page, "slider-single")).toContainText("Volume: 39");
  await page.keyboard.press("PageUp");
  await expect(row(page, "slider-single")).toContainText("Volume: 49");
  await page.keyboard.press("End");
  await expect(row(page, "slider-single")).toContainText("Volume: 100");
  await page.keyboard.press("Home");
  await expect(row(page, "slider-single")).toContainText("Volume: 0");

  await page.keyboard.press("Tab");
  await expect(thumb(page, "Range minimum")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(row(page, "slider-range")).toContainText("Range: 21–75");
  await page.keyboard.press("Tab");
  await expect(thumb(page, "Range maximum")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(row(page, "slider-range")).toContainText("Range: 21–74");
  // The disabled slider is not a tab stop.
  await page.keyboard.press("Tab");
  await expect(thumb(page, "Vertical volume")).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(row(page, "slider-vertical")).toContainText(
    "Vertical volume: 61",
  );
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(row(page, "slider-vertical")).toContainText(
    "Vertical volume: 59",
  );
});

test("pointer clicks and drags set the value", async ({ page }) => {
  await openSlider(page);
  const track = await row(page, "slider-single")
    .locator('[data-slot="slider-track"]')
    .boundingBox();
  await page.mouse.click(track!.x + track!.width * 0.8, track!.y + 2);
  const clicked = Number(
    await thumb(page, "Volume").getAttribute("aria-valuenow"),
  );
  expect(clicked).toBeGreaterThanOrEqual(78);
  expect(clicked).toBeLessThanOrEqual(82);
  const box = await thumbBox(page, "Volume").boundingBox();
  await page.mouse.move(box!.x + 6, box!.y + 6);
  await page.mouse.down();
  await page.mouse.move(track!.x + track!.width * 0.25, box!.y + 6, {
    steps: 5,
  });
  await expect(thumbBox(page, "Volume")).toHaveAttribute("data-dragging", "");
  await page.mouse.up();
  const dragged = Number(
    await thumb(page, "Volume").getAttribute("aria-valuenow"),
  );
  expect(dragged).toBeGreaterThanOrEqual(22);
  expect(dragged).toBeLessThanOrEqual(28);
  await expect(row(page, "slider-single")).toContainText(`Volume: ${dragged}`);
});

test("vertical slider fills its parent and grows upward", async ({
  page,
}, testInfo) => {
  await openSlider(page);
  const vertical = row(page, "slider-vertical");
  await expect(vertical.locator('[data-slot="slider"]')).toHaveAttribute(
    "data-orientation",
    "vertical",
  );
  const track = await vertical
    .locator('[data-slot="slider-track"]')
    .boundingBox();
  expect(track!.width).toBeCloseTo(4, 0);
  expect(track!.height).toBeGreaterThanOrEqual(160);
  const fill = await vertical
    .locator('[data-slot="slider-range"]')
    .boundingBox();
  expect(fill!.y + fill!.height).toBeCloseTo(track!.y + track!.height, 0);
  expect(fill!.height / track!.height).toBeCloseTo(0.6, 1);
  const thumbRect = await thumbBox(page, "Vertical volume").boundingBox();
  expect(thumbRect!.y).toBeGreaterThanOrEqual(track!.y);
  expect(thumbRect!.y + thumbRect!.height).toBeLessThanOrEqual(
    track!.y + track!.height + 0.5,
  );
  const shot = await page
    .getByRole("region", { name: "Vertical", exact: true })
    .screenshot({ animations: "disabled" });
  await testInfo.attach("slider-vertical", {
    body: shot,
    contentType: "image/png",
  });
});

test("ring fades in 120ms and stops for reduced motion", async ({
  browser,
}) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const context = await browser.newContext({ reducedMotion });
    const page = await context.newPage();
    await openSlider(page);
    await expect(thumbBox(page, "Volume")).toHaveCSS(
      "transition-duration",
      reducedMotion === "reduce" ? "0s" : "0.12s, 0.12s",
    );
    await context.close();
  }
});
