import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/skeleton/";

async function openSkeleton(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#skeleton-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
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

async function box(page: Page, selector: string) {
  const rect = await page.locator(selector).first().boundingBox();
  expect(rect).not.toBeNull();
  return rect!;
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`skeleton ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        // Reduced motion stops the infinite pulse so animations can settle.
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openSkeleton(page);
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
        const fill = await color(page, "var(--sprout-secondary)");
        await expect(
          page.getByTestId("shape-line").locator('[data-slot="skeleton"]'),
        ).toHaveCSS("background-color", fill);
        for (const body of await demo
          .locator(".skeleton-demo-card-body, .skeleton-demo-pane")
          .all())
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        const results = await new AxeBuilder({ page })
          .include("#skeleton-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(
          `skeleton-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`skeleton-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("every shape keeps the Cloud footprint", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openSkeleton(page);
  const preview = async (shape: string) => {
    const container = await box(
      page,
      `[data-testid="shape-${shape}"] .skeleton-demo-shape-preview`,
    );
    const item = await box(
      page,
      `[data-testid="shape-${shape}"] [data-slot="skeleton"]`,
    );
    return { container, item };
  };
  const line = await preview("line");
  expect(Math.round(line.item.height)).toBe(16);
  expect(Math.round(line.item.width)).toBe(Math.round(line.container.width));
  const title = await preview("title");
  expect(Math.round(title.item.height)).toBe(24);
  expect(title.item.width / title.container.width).toBeCloseTo(2 / 3, 2);
  const panel = await preview("panel");
  expect(Math.round(panel.item.height)).toBe(128);
  expect(Math.round(panel.item.width)).toBe(Math.round(panel.container.width));
  for (const [shape, size] of [
    ["avatar", 32],
    ["checkbox", 16],
    ["action", 28],
  ] as const) {
    const { item } = await preview(shape);
    expect(Math.round(item.width)).toBe(size);
    expect(Math.round(item.height)).toBe(size);
  }
  const avatar = page
    .getByTestId("shape-avatar")
    .locator('[data-slot="skeleton"]');
  await expect(avatar).toHaveCSS("border-radius", "9999px");
  await expect(
    page.getByTestId("shape-checkbox").locator('[data-slot="skeleton"]'),
  ).toHaveCSS("border-radius", "4px");
  await expect(avatar).toHaveCSS("pointer-events", "none");
});

test("groups space placeholders by gap and name the loading region", async ({
  page,
}) => {
  await openSkeleton(page);
  for (const [gap, px] of [
    ["sm", 8],
    ["md", 12],
    ["lg", 16],
  ] as const) {
    const items = page
      .getByTestId(`gap-${gap}`)
      .locator('[data-slot="skeleton"]');
    const first = await items.nth(0).boundingBox();
    const second = await items.nth(1).boundingBox();
    expect(Math.round(second!.y - (first!.y + first!.height))).toBe(px);
  }
  const lists = example(page, "Loading lists");
  for (const name of [
    "Checking what will be deleted",
    "Loading access",
    "Loading Google Drive files",
  ]) {
    const status = lists.getByRole("status", { name });
    await expect(status).toBeVisible();
    await expect(status).toContainText(`${name}…`);
  }
  const hidden = lists.locator(".sprout-skeleton-group-label").first();
  expect(
    await hidden.evaluate((node) => node.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(1);
  for (const skeleton of await lists.locator('[data-slot="skeleton"]').all())
    await expect(skeleton).toHaveAttribute("aria-hidden", "true");
  const visible = example(page, "With visible status text");
  await expect(visible.getByRole("status")).toHaveCount(3);
  await expect(
    visible.getByRole("status").filter({ hasText: "Loading GitHub accounts…" }),
  ).toBeVisible();
  await expect(
    visible.getByRole("status").filter({ hasText: "Loading deliveries…" }),
  ).toBeVisible();
});

test("the pulse runs and stops for reduced motion", async ({ page }) => {
  await openSkeleton(page);
  const skeleton = page.locator('[data-slot="skeleton"]').first();
  await expect(skeleton).toHaveCSS("animation-name", "sprout-skeleton-pulse");
  await expect(skeleton).toHaveCSS("animation-duration", "1.6s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(skeleton).toHaveCSS("animation-name", "none");
});

test("table action skeletons follow the edit permission by keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openSkeleton(page);
  const card = example(page, "Table rows");
  const rows = card.getByTestId("table-skeleton-row");
  await expect(rows).toHaveCount(3);
  const actions = rows.first().locator('[data-shape="action"]');
  await expect(actions).toHaveCount(2);
  await expect(rows.first().locator('[data-shape="checkbox"]')).toHaveCount(1);
  const cell = await rows
    .first()
    .locator('[data-shape="line"]')
    .first()
    .boundingBox();
  expect(cell!.width).toBeGreaterThanOrEqual(96);
  const toggle = card.getByRole("switch", { name: "Can edit rows" });
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).not.toBeChecked();
  await expect(actions).toHaveCount(1);
  await page.keyboard.press("Space");
  await expect(actions).toHaveCount(2);
});

test("menu rows pass class, style, and data attributes through", async ({
  page,
}) => {
  await openSkeleton(page);
  const card = example(page, "Sidebar menu rows");
  const icons = card.locator('[data-sidebar="menu-skeleton-icon"]');
  const texts = card.locator('[data-sidebar="menu-skeleton-text"]');
  await expect(icons).toHaveCount(4);
  await expect(texts).toHaveCount(4);
  const icon = await icons.first().boundingBox();
  expect(Math.round(icon!.width)).toBe(16);
  expect(Math.round(icon!.height)).toBe(16);
  const row = await card
    .locator(".skeleton-demo-menu-row")
    .first()
    .boundingBox();
  const text = await texts.first().boundingBox();
  expect(text!.width).toBeLessThanOrEqual(row!.width * 0.72 + 1);
  const toggle = card.getByRole("switch", { name: "Show icon" });
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(icons).toHaveCount(0);
  await expect(texts).toHaveCount(4);
});

test("load states move between skeleton, rows, empty, and error", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 900 });
  await openSkeleton(page);
  const card = example(page, "Load states");
  const load = card.locator(".skeleton-demo-load");
  await expect(
    card.getByRole("status", { name: "Loading projects" }),
  ).toBeVisible();
  const loadingHeight = (await load.boundingBox())!.height;
  const capture = async (name: string) => {
    const path = testInfo.outputPath(`skeleton-load-${name}.png`);
    await card.screenshot({ animations: "disabled", path });
    await testInfo.attach(`skeleton-load-${name}`, {
      path,
      contentType: "image/png",
    });
  };
  await capture("loading");
  const loading = card.getByRole("button", { name: "Loading", exact: true });
  await loading.focus();
  await expect(loading).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(card.getByRole("list", { name: "Projects" })).toBeVisible();
  await expect(card.getByRole("listitem")).toHaveCount(3);
  expect((await load.boundingBox())!.height).toBeGreaterThanOrEqual(
    loadingHeight - 1,
  );
  await capture("loaded");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(card.getByText("No projects yet")).toBeVisible();
  await capture("empty");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(card.getByRole("alert")).toContainText(
    "Could not load projects",
  );
  await capture("error");
  await card.getByRole("button", { name: "Retry" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    card.getByRole("status", { name: "Loading projects" }),
  ).toBeVisible();
  await expect(loading).toHaveAttribute("aria-pressed", "true");
});

test("the docs navigation links to Skeleton", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSkeleton(page);
  const link = page.getByRole("link", { name: "Skeleton", exact: true });
  await expect(link.first()).toHaveAttribute("href", "/components/skeleton/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Skeleton");
});
