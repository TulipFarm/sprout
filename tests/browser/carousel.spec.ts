import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/carousel/";

async function openCarousel(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#carousel-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

const scrollOf = (viewport: Locator, axis: "x" | "y" = "x") =>
  viewport.evaluate(
    (node, axis) => (axis === "x" ? node.scrollLeft : node.scrollTop),
    axis,
  );

async function shot(
  locator: Locator,
  name: string,
  testInfo: import("@playwright/test").TestInfo,
) {
  const path = testInfo.outputPath(`${name}.png`);
  const image = await locator.screenshot({ animations: "disabled", path });
  expect(image.byteLength).toBeGreaterThan(2_000);
  await testInfo.attach(name, { path, contentType: "image/png" });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`carousel ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openCarousel(page);
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
        // Arrows sit outside each carousel but inside its card.
        for (const card of await demo.locator(".carousel-demo-card").all()) {
          const frame = (await card.boundingBox())!;
          for (const control of await card
            .locator(".sprout-carousel-control")
            .all()) {
            const box = (await control.boundingBox())!;
            expect(box.x).toBeGreaterThanOrEqual(frame.x);
            expect(box.x + box.width).toBeLessThanOrEqual(
              frame.x + frame.width,
            );
            expect(box.y).toBeGreaterThanOrEqual(frame.y);
          }
        }
        const results = await new AxeBuilder({ page })
          .include("#carousel-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await shot(demo, `carousel-${theme}-${mode}-${width}`, testInfo);
      });
    }
  }
}

test("horizontal arrows step one slide and turn off at each end", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openCarousel(page);
  const carousel = page.getByTestId("steps-horizontal");
  await expect(carousel).toHaveAttribute("aria-roledescription", "carousel");
  await expect(carousel).toHaveAccessibleName("Growing steps, horizontal");
  const viewport = carousel.locator('[data-slot="carousel-content"]');
  const slides = carousel.locator('[aria-roledescription="slide"]');
  await expect(slides).toHaveCount(3);
  await expect(slides.nth(0)).toHaveText("1. Plant");
  await expect(slides.nth(1)).toHaveText("2. Water");
  await expect(slides.nth(2)).toHaveText("3. Grow");
  const status = carousel.locator(".carousel-demo-position");
  const previous = carousel.getByRole("button", { name: "Previous slide" });
  const next = carousel.getByRole("button", { name: "Next slide" });
  await expect(status).toHaveText("Slide 1 of 3");
  await expect(previous).toHaveAttribute("aria-disabled", "true");
  await expect(next).not.toHaveAttribute("aria-disabled", "true");
  await expect(next).toHaveCSS("border-radius", "999px");
  await expect(next).toHaveAttribute("data-variant", "secondary");
  await expect(next).toHaveAttribute("data-size", "icon");

  // Each slide fills the viewport and slides sit 16px apart.
  const view = (await viewport.boundingBox())!;
  const first = (await slides.nth(0).boundingBox())!;
  const second = (await slides.nth(1).boundingBox())!;
  expect(Math.abs(first.width - view.width)).toBeLessThan(1);
  expect(Math.round(second.x - (first.x + first.width))).toBe(16);

  await next.click();
  await expect(status).toHaveText("Slide 2 of 3");
  await expect
    .poll(() => scrollOf(viewport))
    .toBeCloseTo(view.width + 16, -0.5);
  await expect(previous).not.toHaveAttribute("aria-disabled", "true");
  await next.click();
  await expect(status).toHaveText("Slide 3 of 3");
  await expect(next).toHaveAttribute("aria-disabled", "true");
  // Focus stays on the turned-off arrow so the arrow keys keep working.
  await expect(next).toBeFocused();
  await shot(carousel, "carousel-horizontal-last", testInfo);

  await page.keyboard.press("ArrowLeft");
  await expect(status).toHaveText("Slide 2 of 3");
  await page.keyboard.press("ArrowLeft");
  await expect(status).toHaveText("Slide 1 of 3");
  await page.keyboard.press("ArrowLeft");
  await expect(status).toHaveText("Slide 1 of 3");
  await page.keyboard.press("ArrowRight");
  await expect(status).toHaveText("Slide 2 of 3");
  await previous.click();
  await expect(status).toHaveText("Slide 1 of 3");
  await expect.poll(() => scrollOf(viewport)).toBe(0);
});

test("vertical carousel scrolls up and down with turned arrows", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openCarousel(page);
  const carousel = page.getByTestId("steps-vertical");
  await expect(carousel).toHaveAttribute("data-orientation", "vertical");
  const viewport = carousel.locator('[data-slot="carousel-content"]');
  const status = carousel.locator(".carousel-demo-position");
  const previous = carousel.getByRole("button", { name: "Previous slide" });
  const next = carousel.getByRole("button", { name: "Next slide" });
  await expect(viewport).toHaveCSS("scroll-snap-type", "y mandatory");
  await expect(carousel.locator(".sprout-carousel-track")).toHaveCSS(
    "flex-direction",
    "column",
  );
  await expect(next).toHaveCSS("rotate", "90deg");
  await expect(previous).toHaveCSS("rotate", "90deg");
  const view = (await viewport.boundingBox())!;
  expect(Math.round(view.height)).toBe(160);
  const up = (await previous.boundingBox())!;
  const down = (await next.boundingBox())!;
  expect(up.y + up.height).toBeLessThanOrEqual(view.y);
  expect(down.y).toBeGreaterThanOrEqual(view.y + view.height);
  expect(
    Math.abs(up.x + up.width / 2 - (view.x + view.width / 2)),
  ).toBeLessThan(1);

  await next.click();
  await expect(status).toHaveText("Slide 2 of 3");
  await expect.poll(() => scrollOf(viewport, "y")).toBe(176);
  expect(await scrollOf(viewport, "x")).toBe(0);
  await page.keyboard.press("ArrowDown");
  await expect(status).toHaveText("Slide 3 of 3");
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await shot(carousel, "carousel-vertical-last", testInfo);
  await page.keyboard.press("ArrowUp");
  await expect(status).toHaveText("Slide 2 of 3");
  await page.keyboard.press("ArrowLeft");
  await expect(status).toHaveText("Slide 1 of 3");
  await page.keyboard.press("ArrowRight");
  await expect(status).toHaveText("Slide 2 of 3");
});

test("a viewport without focusable slides takes focus and answers Home and End", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openCarousel(page);
  const carousel = page.getByTestId("steps-horizontal");
  const viewport = carousel.locator('[data-slot="carousel-content"]');
  const status = carousel.locator(".carousel-demo-position");
  await expect(viewport).toHaveAttribute("tabindex", "0");
  await carousel.getByRole("button", { name: "Previous slide" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(viewport).toBeFocused();
  await expect(viewport).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("End");
  await expect(status).toHaveText("Slide 3 of 3");
  await shot(carousel, "carousel-viewport-focus", testInfo);
  await page.keyboard.press("Home");
  await expect(status).toHaveText("Slide 1 of 3");
  await page.keyboard.press("Tab");
  await expect(
    carousel.getByRole("button", { name: "Previous slide" }),
  ).toBeFocused();
  // Chips are focusable, so the attachment row adds no extra stop.
  await expect(
    example(page, "Attachment row").locator('[data-slot="carousel-content"]'),
  ).not.toHaveAttribute("tabindex");
});

test("dragging with a mouse moves one slide and snaps", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openCarousel(page);
  const carousel = page.getByTestId("steps-horizontal");
  const viewport = carousel.locator('[data-slot="carousel-content"]');
  const status = carousel.locator(".carousel-demo-position");
  const box = (await viewport.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.7, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, y, { steps: 6 });
  await expect(viewport).toHaveAttribute("data-dragging", "");
  await expect(viewport).toHaveCSS("scroll-snap-type", "none");
  await page.mouse.move(box.x + box.width * 0.4, y, { steps: 4 });
  await page.mouse.up();
  await expect(viewport).not.toHaveAttribute("data-dragging");
  await expect(status).toHaveText("Slide 2 of 3");
  await expect.poll(() => scrollOf(viewport)).toBeCloseTo(box.width + 16, -0.5);

  // A small nudge settles back on the same slide.
  await page.mouse.move(box.x + box.width * 0.5, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5 + 12, y, { steps: 3 });
  await page.mouse.up();
  await expect(status).toHaveText("Slide 2 of 3");
  await expect.poll(() => scrollOf(viewport)).toBeCloseTo(box.width + 16, -0.5);
});

test("attachment row scrolls freely with edge arrows from useCarousel", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openCarousel(page);
  const card = example(page, "Attachment row");
  const row = card.getByRole("region", { name: "Attached files" });
  await expect(row).toHaveAttribute("data-slot", "attachment-group");
  await expect(row).toHaveAttribute("aria-roledescription", "carousel");
  const viewport = row.locator('[data-slot="carousel-content"]');
  const track = row.locator('[data-slot="carousel-track"]');
  await expect(viewport).toHaveAttribute("data-align", "start");
  await expect(viewport).toHaveAttribute("data-drag-free", "");
  await expect(viewport).toHaveCSS("scroll-snap-type", "none");
  await expect(track).toHaveCSS("column-gap", "8px");
  await expect(track).toHaveCSS("padding-top", "4px");
  await expect(track).toHaveCSS("padding-bottom", "4px");
  const items = row.locator('[aria-roledescription="slide"]');
  await expect(items).toHaveCount(7);
  await expect(items.first()).toHaveCSS("flex-basis", "auto");
  const widths = await items.evaluateAll((nodes) =>
    nodes.map((node) => Math.round(node.getBoundingClientRect().width)),
  );
  expect(new Set(widths).size).toBeGreaterThan(1);
  // Upload, processing, and error chips all sit in the row.
  for (const name of [
    "Returns policy.pdf",
    "Spring planting plan.md",
    "garden-notes.txt",
  ])
    await expect(row.getByText(name, { exact: true }).first()).toBeAttached();

  await expect(
    row.getByRole("button", { name: "Previous attachments" }),
  ).toHaveCount(0);
  const next = row.getByRole("button", { name: "Next attachments" });
  await expect(next).toHaveCSS("opacity", "0");
  await row.hover();
  await expect(next).toHaveCSS("opacity", "1");
  await shot(card, "carousel-attachments-hover", testInfo);
  await next.click();
  await expect.poll(() => scrollOf(viewport)).toBeGreaterThan(0);
  const previous = row.getByRole("button", { name: "Previous attachments" });
  await expect(previous).toBeVisible();
  await previous.click();
  await expect.poll(() => scrollOf(viewport)).toBe(0);
  await expect(previous).toHaveCount(0);

  // Arrow keys scroll while a chip button has focus.
  await row
    .getByRole("button", { name: /Remove Price list 2026\.xlsx/ })
    .focus();
  await expect(next).toHaveCSS("opacity", "1");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => scrollOf(viewport)).toBeGreaterThan(0);
  await page.keyboard.press("Home");
  await expect.poll(() => scrollOf(viewport)).toBe(0);

  // Scrolling to the end hides the next arrow.
  await viewport.evaluate((node) => node.scrollTo({ left: node.scrollWidth }));
  await expect(next).toHaveCount(0);
  await expect(previous).toBeVisible();

  // The error chip retries in place.
  const retry = row.getByRole("button", { name: "Retry garden-notes.txt" });
  await retry.click();
  await expect(retry).toHaveCount(0);
});

test("attachment row empties, refills, and re-measures as chips change", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openCarousel(page);
  const card = example(page, "Attachment row");
  await card.getByRole("button", { name: "Remove all" }).click();
  await expect(
    card.getByRole("region", { name: "Attached files" }),
  ).toHaveCount(0);
  await expect(
    card.getByText("No files attached. Add one to start the row."),
  ).toBeVisible();
  await expect(card.getByText("0 files", { exact: true })).toBeVisible();
  await expect(card.getByRole("button", { name: "Remove all" })).toBeDisabled();
  await shot(card, "carousel-attachments-empty", testInfo);

  await card.getByRole("button", { name: "Add file" }).click();
  const row = card.getByRole("region", { name: "Attached files" });
  await expect(row.locator('[aria-roledescription="slide"]')).toHaveCount(1);
  await expect(card.getByText("1 file", { exact: true })).toBeVisible();
  await expect(
    row.getByText("Seed suppliers.csv", { exact: true }),
  ).toBeAttached();
  // One chip fits, so neither arrow shows.
  await expect(row.getByRole("button", { name: /attachments$/ })).toHaveCount(
    0,
  );
  for (let index = 0; index < 5; index += 1)
    await card.getByRole("button", { name: "Add file" }).click();
  await expect(row.locator('[aria-roledescription="slide"]')).toHaveCount(6);
  await expect(
    row.getByRole("button", { name: "Next attachments" }),
  ).toBeAttached();
  for (let index = 0; index < 4; index += 1)
    await row
      .getByRole("button", { name: /^Remove / })
      .first()
      .click();
  await expect(row.locator('[aria-roledescription="slide"]')).toHaveCount(2);
  await expect(
    row.getByRole("button", { name: "Next attachments" }),
  ).toHaveCount(0);
});

test("several per view loop and follow the API dots", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openCarousel(page);
  const card = example(page, "Several per view, with the API");
  const carousel = card.getByRole("region", { name: "Planting guides" });
  const status = card.getByTestId("guides-status");
  const dots = card.getByRole("button", { name: /^Go to position/ });
  const viewport = carousel.locator('[data-slot="carousel-content"]');
  await expect(dots).toHaveCount(4);
  await expect(status).toHaveText("Position 1 of 4");
  await expect(dots.first()).toHaveAttribute("aria-current", "true");
  const slides = carousel.locator('[aria-roledescription="slide"]');
  const view = (await viewport.boundingBox())!;
  const first = (await slides.nth(0).boundingBox())!;
  expect(Math.abs(first.width - (view.width - 16) / 2)).toBeLessThan(1);

  const previous = carousel.getByRole("button", { name: "Previous slide" });
  const next = carousel.getByRole("button", { name: "Next slide" });
  await expect(previous).not.toHaveAttribute("aria-disabled", "true");
  await previous.click();
  await expect(status).toHaveText("Position 4 of 4");
  await expect(dots.nth(3)).toHaveAttribute("aria-current", "true");
  await expect(next).not.toHaveAttribute("aria-disabled", "true");
  await next.click();
  await expect(status).toHaveText("Position 1 of 4");
  await dots.nth(2).click();
  await expect(status).toHaveText("Position 3 of 4");
  await expect(dots.nth(2)).toHaveAttribute("aria-current", "true");
  await expect(slides.nth(2)).toBeInViewport();
  await shot(card, "carousel-guides-position-3", testInfo);

  await page.setViewportSize({ width: 390, height: 1000 });
  await expect(dots).toHaveCount(5);
  const narrow = (await viewport.boundingBox())!;
  const slide = (await slides.nth(0).boundingBox())!;
  expect(Math.abs(slide.width - narrow.width)).toBeLessThan(1);
});

test("scrolling animates only when motion is allowed", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openCarousel(page);
  const viewport = page
    .getByTestId("steps-horizontal")
    .locator('[data-slot="carousel-content"]');
  await expect(viewport).toHaveCSS("scroll-behavior", "auto");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(viewport).toHaveCSS("scroll-behavior", "smooth");
  const carousel = page.getByTestId("steps-horizontal");
  await carousel.getByRole("button", { name: "Next slide" }).click();
  await expect(carousel.locator(".carousel-demo-position")).toHaveText(
    "Slide 2 of 3",
  );
});

test.describe("touch screens", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("arrows grow to 44px and attachment arrows stay visible", async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const demo = await openCarousel(page);
    const next = page
      .getByTestId("steps-horizontal")
      .getByRole("button", { name: "Next slide" });
    const box = (await next.boundingBox())!;
    expect(Math.round(box.width)).toBe(44);
    expect(Math.round(box.height)).toBe(44);
    await expect(
      example(page, "Attachment row").getByRole("button", {
        name: "Next attachments",
      }),
    ).toHaveCSS("opacity", "1");
    await next.tap();
    await expect(
      page.getByTestId("steps-horizontal").locator(".carousel-demo-position"),
    ).toHaveText("Slide 2 of 3");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await shot(demo, "carousel-touch-390", testInfo);
  });
});
