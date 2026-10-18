import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/pagination/";

async function openPagination(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#pagination-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`pagination ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openPagination(page);
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
        await expect(demo.locator('[data-slot="pagination"]')).toHaveCount(8);
        for (const list of await demo
          .locator('[data-slot="pagination-content"]')
          .all()) {
          const [box, parent] = await list.evaluate((node) => [
            node.getBoundingClientRect().right,
            node.closest(".pagination-demo-card-body")!.getBoundingClientRect()
              .right,
          ]);
          expect(box).toBeLessThanOrEqual(parent!);
        }
        const labels = demo.locator(".sprout-pagination-label").first();
        await expect(labels).toHaveCSS(
          "display",
          width < 640 ? "none" : "block",
        );
        const results = await new AxeBuilder({ page })
          .include("#pagination-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(
          `pagination-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`pagination-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("cloud page navigation: previous, pages, ellipsis, next, and status", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPagination(page);
  const card = example(page, "Page navigation");
  const nav = card.getByRole("navigation", { name: "pagination" });
  const status = card.getByRole("status");
  await expect(status).toHaveText("Page 1");
  const one = nav.getByRole("link", { name: "1", exact: true });
  await expect(one).toHaveAttribute("aria-current", "page");
  await expect(one).toHaveClass(/sprout-button-variant-outline/);
  await expect(one).toHaveCSS("width", "32px");
  await expect(one).toHaveCSS("height", "32px");
  const two = nav.getByRole("link", { name: "2", exact: true });
  await expect(two).toHaveClass(/sprout-button-variant-ghost/);
  await expect(two).not.toHaveAttribute("aria-current", /.*/);
  const previous = nav.getByRole("link", { name: "Go to previous page" });
  const next = nav.getByRole("link", { name: "Go to next page" });
  await expect(previous).toHaveText("Previous");
  await expect(next).toHaveText("Next");
  await expect(previous).toHaveCSS("height", "28px");
  await expect(previous).toHaveCSS("padding-left", "6px");
  await expect(next).toHaveCSS("padding-right", "6px");
  const ellipsis = nav.locator('[data-slot="pagination-ellipsis"]');
  await expect(ellipsis).toHaveAttribute("aria-hidden", "true");
  await expect(ellipsis).toHaveCSS("width", "32px");

  await two.click();
  await expect(status).toHaveText("Page 2");
  await expect(two).toHaveAttribute("aria-current", "page");
  await expect(one).not.toHaveAttribute("aria-current", /.*/);
  await next.click();
  await expect(status).toHaveText("Page 3");
  await next.click();
  await expect(status).toHaveText("Page 3");
  await previous.click();
  await previous.click();
  await previous.click();
  await expect(status).toHaveText("Page 1");
  await expect(page).toHaveURL(new RegExp(`${route}$`));
});

test("keyboard moves through links with a focus ring and activates with Enter", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPagination(page);
  const card = example(page, "Page navigation");
  const nav = card.getByRole("navigation", { name: "pagination" });
  const previous = nav.getByRole("link", { name: "Go to previous page" });
  await previous.focus();
  await expect(previous).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Tab");
  await expect(nav.getByRole("link", { name: "1", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  const two = nav.getByRole("link", { name: "2", exact: true });
  await expect(two).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(card.getByRole("status")).toHaveText("Page 2");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const next = nav.getByRole("link", { name: "Go to next page" });
  await expect(next).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(card.getByRole("status")).toHaveText("Page 3");
  await page.keyboard.press("Shift+Tab");
  await expect(nav.getByRole("link", { name: "3", exact: true })).toBeFocused();
});

test("run history windows pages and covers edge, single, loading, and empty states", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPagination(page);
  const card = example(page, "Run history");
  const nav = card.getByRole("navigation", { name: "Run history pages" });
  const status = card.getByRole("status");
  await expect(status).toHaveText("Runs 151–175 · page 7 of 24");
  await expect(nav.locator('[data-slot="pagination-ellipsis"]')).toHaveCount(2);
  await expect(nav.getByRole("link", { name: "Newer runs" })).toHaveText(
    "Newer",
  );
  await expect(nav.getByRole("link", { name: "Older runs" })).toHaveText(
    "Older",
  );

  await nav.getByRole("link", { name: "Page 1", exact: true }).click();
  await expect(status).toHaveText("Runs 1–25 · page 1 of 24");
  const newer = nav.getByRole("link", { name: "Newer runs" });
  await expect(newer).toHaveAttribute("aria-disabled", "true");
  await expect(newer).toHaveAttribute("tabindex", "-1");
  await expect(newer).toHaveCSS("opacity", "0.5");
  await expect(nav.locator('[data-slot="pagination-ellipsis"]')).toHaveCount(1);
  await nav.getByRole("link", { name: "Page 24", exact: true }).click();
  await expect(nav.getByRole("link", { name: "Older runs" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await nav.getByRole("link", { name: "Newer runs" }).click();
  await expect(status).toHaveText("Runs 551–575 · page 23 of 24");

  await chooseOption(page, "Results", "One page");
  await expect(nav.getByRole("link", { name: /^Page / })).toHaveCount(1);
  await expect(nav.getByRole("link", { name: "Page 1" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.getByRole("link", { name: "Newer runs" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(nav.getByRole("link", { name: "Older runs" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );

  await chooseOption(page, "Results", "Loading");
  await expect(nav).toHaveAttribute("aria-busy", "true");
  await expect(status).toHaveText("Loading runs…");
  for (const link of await nav.getByRole("link").all()) {
    await expect(link).toHaveAttribute("aria-disabled", "true");
  }
  const path = testInfo.outputPath("pagination-run-history-loading.png");
  await card.screenshot({ animations: "disabled", path });
  await testInfo.attach("pagination-run-history-loading", {
    path,
    contentType: "image/png",
  });

  await chooseOption(page, "Results", "No runs");
  await expect(card.getByRole("navigation")).toHaveCount(0);
  await expect(card.getByText("No runs yet.", { exact: false })).toBeVisible();
});

test("sizes pair icon sizes with matching previous and next sizes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPagination(page);
  const card = example(page, "Sizes");
  for (const [name, link, edge] of [
    ["Comment pages", 28, 28],
    ["Search results pages", 32, 28],
    ["Template gallery pages", 36, 36],
  ] as const) {
    const nav = card.getByRole("navigation", { name });
    const active = nav.locator('[aria-current="page"]');
    await expect(active).toHaveCSS("width", `${link}px`);
    await expect(active).toHaveCSS("height", `${link}px`);
    await expect(nav.getByRole("link", { name: "Go to next page" })).toHaveCSS(
      "height",
      `${edge}px`,
    );
  }
  const compact = card.getByRole("navigation", { name: "Comment pages" });
  await expect(compact.locator('[aria-current="page"]')).toHaveText("2");
  await expect(
    compact.locator('[data-slot="pagination-ellipsis"]'),
  ).toHaveCount(0);
  const gallery = card.getByRole("navigation", {
    name: "Template gallery pages",
  });
  await expect(
    gallery.getByRole("link", { name: "Go to previous page" }),
  ).toHaveAttribute("aria-disabled", "true");
});

test("router links render through the render prop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPagination(page);
  const card = example(page, "Router links");
  const nav = card.getByRole("navigation", { name: "Inbox pages" });
  await expect(
    nav.getByRole("link", { name: "3", exact: true }),
  ).toHaveAttribute("href", "/inbox?page=3");
  await nav.getByRole("link", { name: "3", exact: true }).click();
  await expect(card.getByRole("status")).toHaveText("Route /inbox?page=3");
  await expect(
    nav.getByRole("link", { name: "3", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Go to next page" }).click();
  await expect(card.getByRole("status")).toHaveText("Route /inbox?page=4");
  await expect(
    nav.getByRole("link", { name: "Go to next page" }),
  ).toHaveAttribute("aria-disabled", "true");
  await expect(page).toHaveURL(new RegExp(`${route}$`));
});

test("mobile hides text labels and keeps previous and next square", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPagination(page);
  const nav = example(page, "Page navigation").getByRole("navigation");
  const previous = nav.getByRole("link", { name: "Go to previous page" });
  await expect(previous.locator(".sprout-pagination-label")).toBeHidden();
  const box = await previous.boundingBox();
  expect(Math.round(box!.width)).toBe(Math.round(box!.height));
});

test("chevrons flip in right-to-left text", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPagination(page);
  const card = example(page, "Direction");
  const ltr = card.locator('[dir="ltr"] .sprout-pagination-previous svg');
  const rtl = card.locator('[dir="rtl"] .sprout-pagination-previous svg');
  await expect(ltr).toHaveCSS("transform", "none");
  await expect(rtl).toHaveCSS("transform", "matrix(-1, 0, 0, 1, 0, 0)");
  await expect(
    card.locator('[dir="rtl"]').getByRole("link", { name: "الصفحة السابقة" }),
  ).toHaveText("السابق");
});

test("link color transitions respect reduced motion", async ({ page }) => {
  await openPagination(page);
  const link = example(page, "Page navigation").getByRole("link", {
    name: "2",
    exact: true,
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(link).toHaveCSS("transition-duration", /0\.12s/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(link).toHaveCSS("transition-duration", "0s");
});
