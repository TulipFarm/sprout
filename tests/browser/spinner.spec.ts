import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/spinner/";

async function openSpinner(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#spinner-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

async function size(page: Page, selector: string) {
  const rect = await page.locator(selector).first().boundingBox();
  expect(rect).not.toBeNull();
  return { width: Math.round(rect!.width), height: Math.round(rect!.height) };
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`spinner ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        // Reduced motion stops the infinite spin so animations can settle.
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openSpinner(page);
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
          .locator(".spinner-demo-card-body, .spinner-demo-pane")
          .all())
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        for (const spinner of await demo
          .locator('[data-slot="spinner"]')
          .all()) {
          const color = await spinner.evaluate((node) => {
            const own = getComputedStyle(node).color;
            const parent = getComputedStyle(node.parentElement!).color;
            return { own, parent };
          });
          expect(color.own).toBe(color.parent);
        }
        const results = await new AxeBuilder({ page })
          .include("#spinner-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(
          `spinner-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`spinner-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("every size keeps the Cloud footprint in its context", async ({
  page,
}) => {
  // A rotating square has a larger bounding box, so measure it at rest.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openSpinner(page);
  expect(
    await size(page, '[data-testid="size-sm"] [data-slot="spinner"]'),
  ).toEqual({
    width: 12,
    height: 12,
  });
  expect(
    await size(page, '[data-testid="size-default"] [data-slot="spinner"]'),
  ).toEqual({ width: 16, height: 16 });
  expect(
    await size(page, '[data-testid="size-lg"] [data-slot="spinner"]'),
  ).toEqual({
    width: 20,
    height: 20,
  });
  const buttons = example(page, "Buttons");
  for (const name of [
    "Opening sign-in…",
    "Checking…",
    "Refresh integrations",
    "Continue",
  ]) {
    const spinner = buttons
      .getByRole("button", { name, exact: true })
      .locator('[data-slot="spinner"]');
    const rect = await spinner.boundingBox();
    expect(Math.round(rect!.width)).toBe(16);
    expect(Math.round(rect!.height)).toBe(16);
  }
  const step = page.getByTestId("icon-plan").locator('[data-slot="spinner"]');
  await expect(step).toHaveCSS(
    "color",
    await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "var(--sprout-info)";
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    }),
  );
  await expect(step).toHaveCSS("pointer-events", "none");
});

test("spinners are named or hidden", async ({ page }) => {
  await openSpinner(page);
  await expect(
    page.getByTestId("name-default").getByRole("status", { name: "Loading" }),
  ).toBeVisible();
  await expect(
    page
      .getByTestId("name-custom")
      .getByRole("status", { name: "Opening workspace" }),
  ).toBeVisible();
  await expect(
    page.getByTestId("name-chip").getByRole("status", { name: "Uploading" }),
  ).toBeVisible();
  const hidden = page.getByTestId("name-hidden");
  await expect(hidden.getByRole("status")).toHaveText("Saving access change…");
  await expect(hidden.locator('[data-slot="spinner"]')).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(hidden.locator('[data-slot="spinner"]')).not.toHaveAttribute(
    "role",
    /.*/,
  );
  const refresh = page.getByTestId("refresh");
  await expect(
    refresh.getByRole("status").filter({ hasText: "Refreshing Calendar…" }),
  ).toHaveCount(1);
  expect(
    await refresh
      .getByRole("status")
      .evaluate((node) => node.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(1);
  await expect(refresh.getByRole("list", { name: "Calendar" })).toBeVisible();
});

test("the spin runs and stops for reduced motion", async ({ page }) => {
  await openSpinner(page);
  const spinner = page.locator('[data-slot="spinner"]').first();
  await expect(spinner).toHaveCSS("animation-name", "sprout-spinner-spin");
  await expect(spinner).toHaveCSS("animation-duration", "1s");
  await expect(spinner).toHaveCSS("animation-timing-function", "linear");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(spinner).toHaveCSS("animation-name", "none");
});

async function ink(page: Page, selector: string) {
  return page.locator(selector).evaluate(async (canvas: HTMLCanvasElement) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const { data } = canvas
      .getContext("2d")!
      .getImageData(0, 0, canvas.width, canvas.height);
    let painted = 0;
    let light = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] === 0) continue;
      painted += 1;
      if (data[index] > 128) light += 1;
    }
    return { painted, lightShare: painted ? light / painted : 0 };
  });
}

test("thinking orbs draw every activity at both sizes and follow the theme", async ({
  page,
}) => {
  // Reduced motion lets the theme menu settle; the orb then paints a still frame.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openSpinner(page);
  const orbs = page
    .getByTestId("thinking-activities")
    .locator('[data-variant="thinking"]');
  await expect(orbs).toHaveCount(9);
  for (const activity of [
    "working",
    "searching",
    "solving",
    "listening",
    "connecting",
    "weaving",
    "composing",
    "breathing",
    "shaping",
  ]) {
    const orb = page.getByRole("status", {
      name: `${activity} orb`,
      exact: true,
    });
    await expect(orb).toHaveAttribute("data-activity", activity);
    await expect(orb.locator("canvas")).toHaveAttribute("aria-hidden", "true");
    expect(
      await size(page, `[data-activity="${activity}"][data-size="xl"]`),
    ).toEqual({ width: 64, height: 64 });
  }
  await expect(orbs.first()).toHaveCSS("animation-name", "none");
  const inline = page
    .getByTestId("thinking-inline")
    .locator('[data-variant="thinking"]')
    .first();
  expect(
    await size(
      page,
      '[data-testid="thinking-inline"] [data-variant="thinking"] canvas',
    ),
  ).toEqual({ width: 20, height: 20 });
  await expect(inline).toHaveAttribute("aria-hidden", "true");
  await expect(
    page
      .getByTestId("thinking-name")
      .getByRole("status", { name: "Thinking", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByTestId("thinking-name")
      .getByRole("status", { name: "Connecting tools", exact: true }),
  ).toBeVisible();

  const searching = '[data-activity="searching"][data-size="xl"] canvas';
  await chooseOption(page, "Color mode", "Light");
  const onLight = await ink(page, searching);
  expect(onLight.painted).toBeGreaterThan(50);
  expect(onLight.lightShare).toBeLessThan(0.2);
  await chooseOption(page, "Color mode", "Dark");
  await expect
    .poll(async () => (await ink(page, searching)).lightShare)
    .toBeGreaterThan(0.6);
});

test("busy buttons follow the switch by keyboard", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 900 });
  await openSpinner(page);
  const card = example(page, "Buttons");
  const busy = card.getByRole("button", { name: "Opening sign-in…" });
  await expect(busy).toBeDisabled();
  await expect(busy).toHaveAttribute("aria-busy", "true");
  await expect(card.locator('[data-slot="spinner"]')).toHaveCount(8);
  const path = testInfo.outputPath("spinner-buttons-busy.png");
  await card.screenshot({ animations: "disabled", path });
  await testInfo.attach("spinner-buttons-busy", {
    path,
    contentType: "image/png",
  });
  const toggle = card.getByRole("switch", { name: "Show busy state" });
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).not.toBeChecked();
  await expect(card.locator('[data-slot="spinner"]')).toHaveCount(0);
  await expect(
    card.getByRole("button", { name: "Connect account" }),
  ).toBeEnabled();
  await expect(
    card.getByRole("button", { name: "Create workspace" }),
  ).toBeVisible();
  await expect(card.getByRole("button", { name: "Apply RSQL" })).toBeVisible();
  const exportButton = card.getByRole("button", { name: "Export CSV" });
  await exportButton.focus();
  await page.keyboard.press("Enter");
  const cancel = card.getByRole("button", {
    name: "Exporting 1,240 rows. Cancel export",
  });
  await expect(cancel).toBeVisible();
  await expect(toggle).toBeChecked();
  await cancel.focus();
  await page.keyboard.press("Enter");
  await expect(card.getByRole("button", { name: "Export CSV" })).toBeVisible();
});

test("status icons swap by keyboard and keep their slot", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 900 });
  await openSpinner(page);
  const card = example(page, "Status icons");
  await expect(card.locator('[data-slot="spinner"]')).toHaveCount(4);
  const slot = page.getByTestId("icon-proposal").locator(".spinner-demo-slot");
  const before = await slot.boundingBox();
  const running = card.getByRole("button", { name: "Running", exact: true });
  await running.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(card.locator('[data-slot="spinner"]')).toHaveCount(0);
  await expect(card.getByText("Saved to Notion")).toBeVisible();
  const after = await slot.boundingBox();
  expect(after!.width).toBe(before!.width);
  expect(after!.height).toBe(before!.height);
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Space");
  await expect(card.locator('[data-slot="spinner"]')).toHaveCount(4);
  const trigger = page.getByTestId("icon-tool").getByRole("button", {
    name: /search_tables/,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("icon-tool").locator("pre")).toBeVisible();
  const path = testInfo.outputPath("spinner-status-icons.png");
  await card.screenshot({ animations: "disabled", path });
  await testInfo.attach("spinner-status-icons", {
    path,
    contentType: "image/png",
  });
});

test("page loading centers the spinner", async ({ page }) => {
  await openSpinner(page);
  const card = example(page, "Page loading");
  const pane = card
    .getByRole("status")
    .filter({ hasText: "Opening TulipFarm…" });
  const box = await pane.boundingBox();
  const spinner = await pane.locator('[data-slot="spinner"]').boundingBox();
  expect(
    Math.abs(spinner!.y + spinner!.height / 2 - (box!.y + box!.height / 2)),
  ).toBeLessThanOrEqual(2);
  await expect(
    card.getByRole("status", { name: "Opening workspace" }),
  ).toBeVisible();
});

test("load states move between spinner, rows, empty, and error", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 900 });
  await openSpinner(page);
  const card = example(page, "Load states");
  const capture = async (name: string) => {
    const path = testInfo.outputPath(`spinner-load-${name}.png`);
    await card.screenshot({ animations: "disabled", path });
    await testInfo.attach(`spinner-load-${name}`, {
      path,
      contentType: "image/png",
    });
  };
  await expect(
    card.getByRole("status").filter({ hasText: "Loading integrations…" }),
  ).toBeVisible();
  await capture("loading");
  const loading = card.getByRole("button", { name: "Loading", exact: true });
  await loading.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(card.getByRole("list", { name: "Integrations" })).toBeVisible();
  await expect(card.getByRole("listitem")).toHaveCount(3);
  await capture("loaded");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(card.getByText("No integrations yet")).toBeVisible();
  await capture("empty");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(card.getByRole("alert")).toContainText(
    "Could not load integrations",
  );
  await capture("error");
  await card.getByRole("button", { name: "Retry" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    card.getByRole("status").filter({ hasText: "Loading integrations…" }),
  ).toBeVisible();
  await expect(loading).toHaveAttribute("aria-pressed", "true");
});

test("the docs navigation links to Spinner", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSpinner(page);
  const link = page.getByRole("link", { name: "Spinner", exact: true });
  await expect(link.first()).toHaveAttribute("href", "/components/spinner/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Spinner");
});
