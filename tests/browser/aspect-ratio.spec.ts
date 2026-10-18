import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/aspect-ratio/";

async function openAspectRatio(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#aspect-ratio-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

async function shape(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }),
  );
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`aspect ratio ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openAspectRatio(page);
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
          .locator(".aspect-ratio-demo-card-body")
          .all())
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        for (const image of await demo.locator("img").all())
          expect(
            await image.evaluate(
              (node) => (node as HTMLImageElement).naturalWidth,
            ),
          ).toBeGreaterThan(0);
        const results = await new AxeBuilder({ page })
          .include("#aspect-ratio-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(
          `aspect-ratio-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`aspect-ratio-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("image ratios match 16:9, 4:3, and square with covering images", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openAspectRatio(page);
  const card = example(page, "Image ratios");
  const frames = card.locator('[data-slot="aspect-ratio"]');
  await expect(frames).toHaveCount(3);
  const boxes = await shape(
    page,
    'section[aria-label="Image ratios"] [data-slot="aspect-ratio"]',
  );
  const expected = [16 / 9, 4 / 3, 1];
  boxes.forEach((box, index) => {
    expect(box.width).toBeLessThanOrEqual(288);
    expect(Math.abs(box.width / box.height - expected[index]!)).toBeLessThan(
      0.02,
    );
  });
  await expect(frames.first()).toHaveCSS("position", "relative");
  const images = card.getByRole("img", { name: "Fictional green landscape" });
  await expect(images).toHaveCount(3);
  await expect(images.first()).toHaveCSS("object-fit", "cover");
  const fills = await card.locator("img").evaluateAll((nodes) =>
    nodes.map((node) => {
      const image = node.getBoundingClientRect();
      const frame = node.parentElement!.getBoundingClientRect();
      return (
        Math.abs(image.width - frame.width) < 1 &&
        Math.abs(image.height - frame.height) < 1
      );
    }),
  );
  expect(fills).toEqual([true, true, true]);
  for (const caption of ["Ratio 1.78", "Ratio 1.33", "Ratio 1.00"])
    await expect(card.getByText(caption, { exact: true })).toBeVisible();
  // The rounded wrapper clips the image corners.
  await expect(card.locator(".aspect-ratio-demo-frame").first()).toHaveCSS(
    "overflow",
    "hidden",
  );
  await expect(card.locator(".aspect-ratio-demo-frame").first()).toHaveCSS(
    "border-radius",
    "12px",
  );
});

test("frames shrink with their column on mobile and keep the ratio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openAspectRatio(page);
  const boxes = await shape(
    page,
    'section[aria-label="Image ratios"] [data-slot="aspect-ratio"]',
  );
  const expected = [16 / 9, 4 / 3, 1];
  boxes.forEach((box, index) => {
    expect(box.width).toBeGreaterThan(150);
    expect(Math.abs(box.width / box.height - expected[index]!)).toBeLessThan(
      0.02,
    );
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("ratio changes by keyboard and the frame height follows", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openAspectRatio(page);
  const card = example(page, "Change the ratio");
  const frame = card.getByTestId("live-ratio");
  const status = card.getByRole("status");
  const ratioOf = async () => {
    const box = (await frame.boundingBox())!;
    return box.width / box.height;
  };
  const width = (await frame.boundingBox())!.width;
  expect(Math.abs((await ratioOf()) - 16 / 9)).toBeLessThan(0.02);
  await expect(status).toHaveText("16:9 · Ratio 1.78 · Video and cover images");

  const wide = card.getByRole("button", { name: "16:9" });
  await wide.focus();
  await expect(wide).toBeFocused();
  await page.keyboard.press("ArrowRight");
  const photo = card.getByRole("button", { name: "4:3" });
  await expect(photo).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(photo).toHaveAttribute("aria-pressed", "true");
  await expect(status).toHaveText("4:3 · Ratio 1.33 · Photos and screenshots");
  expect(Math.abs((await ratioOf()) - 4 / 3)).toBeLessThan(0.02);

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(status).toHaveText(
    "Square · Ratio 1.00 · Thumbnails and avatars",
  );
  expect(Math.abs((await ratioOf()) - 1)).toBeLessThan(0.02);
  expect(Math.abs((await frame.boundingBox())!.width - width)).toBeLessThan(1);

  const path = testInfo.outputPath("aspect-ratio-keyboard-square.png");
  await card.screenshot({ animations: "disabled", path });
  await testInfo.attach("aspect-ratio-keyboard-square", {
    path,
    contentType: "image/png",
  });
});

test("the frame adds no focus stop", async ({ page }) => {
  await openAspectRatio(page);
  const frames = page.locator('#aspect-ratio-demo [data-slot="aspect-ratio"]');
  for (const frame of await frames.all()) {
    await expect(frame).not.toHaveAttribute("tabindex");
    await expect(frame).not.toHaveAttribute("role");
  }
});

test("reserved space keeps loading, error, and empty frames at their ratio", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 1000 });
  await openAspectRatio(page);
  const card = example(page, "Reserved space");
  const loading = card.getByRole("status");
  await expect(loading).toHaveText("Loading preview…");
  await expect(
    card.locator('[data-slot="aspect-ratio"][aria-busy="true"]'),
  ).toHaveCount(1);
  await expect(loading).toHaveCSS("animation-name", "none");
  await expect(card.getByText("Preview unavailable")).toBeVisible();
  const boxes = await shape(
    page,
    'section[aria-label="Reserved space"] [data-slot="aspect-ratio"]',
  );
  const expected = [16 / 9, 4 / 3, 1];
  boxes.forEach((box, index) =>
    expect(Math.abs(box.width / box.height - expected[index]!)).toBeLessThan(
      0.02,
    ),
  );
  // Long placeholder text stays inside the square frame.
  const fits = await card
    .locator('[data-state="empty"]')
    .evaluate((node) => node.scrollHeight <= node.clientHeight);
  expect(fits).toBe(true);
  const path = testInfo.outputPath("aspect-ratio-reserved-space.png");
  await card.screenshot({ animations: "disabled", path });
  await testInfo.attach("aspect-ratio-reserved-space", {
    path,
    contentType: "image/png",
  });
});

test("loading placeholder pulses only when motion is allowed", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openAspectRatio(page);
  await expect(example(page, "Reserved space").getByRole("status")).toHaveCSS(
    "animation-name",
    "aspect-ratio-demo-pulse",
  );
});
