import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

// Spinners in the showcase run forever; reduced motion stops them so helpers
// that await every animation can settle. It also starts the showcase paused.
test.use({ reducedMotion: "reduce" });

async function openBanner(page: Page) {
  await page.goto("/components/gradient-banner/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished),
    );
  });
}

const playground = (page: Page) =>
  page.getByRole("region", { name: "Gradient banner playground" });
const stageBanner = (page: Page) =>
  playground(page).locator('[data-slot="gradient-banner"]');

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`gradient banner ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openBanner(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        await chooseOption(
          page,
          "Color mode",
          mode === "light" ? "Light" : "Dark",
        );
        await settle(page);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        // No banner content spills past its own box.
        expect(
          await page.evaluate(() =>
            [
              ...document.querySelectorAll<HTMLElement>(
                '[data-slot="gradient-banner"]',
              ),
            ]
              .filter((el) => !el.closest(".gradient-demo-prompt-list"))
              .every((el) => el.scrollWidth <= el.clientWidth + 1),
          ),
        ).toBe(true);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`gradient-banner-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
        for (const demo of ["variants", "sizes", "panels", "progress"]) {
          const part = await page.locator(`[data-demo="${demo}"]`).screenshot();
          await testInfo.attach(
            `gradient-banner-${demo}-${theme}-${mode}-${width}`,
            { body: part, contentType: "image/png" },
          );
        }
        const showcase = await page
          .getByRole("region", { name: "Sign-in page" })
          .screenshot();
        await testInfo.attach(
          `gradient-banner-showcase-${theme}-${mode}-${width}`,
          { body: showcase, contentType: "image/png" },
        );
      });
    }
  }
}

test("every variant and size renders its art and box", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openBanner(page);
  const variants = page.locator(
    '[data-demo="variants"] [data-slot="gradient-banner"]',
  );
  await expect(variants).toHaveCount(6);
  const bases: string[] = [];
  for (const variant of [
    "aurora",
    "citrus",
    "lagoon",
    "iris",
    "cobalt",
    "mint",
  ]) {
    const banner = page.locator(
      `[data-demo="variants"] [data-variant="${variant}"]`,
    );
    await expect(banner).toHaveAttribute("data-size", "md");
    await expect(banner).toHaveText(variant);
    await expect(
      banner.locator('[data-slot="gradient-banner-art"]'),
    ).toHaveAttribute("aria-hidden", "true");
    await expect(
      banner.locator('[data-slot="gradient-banner-texture"]'),
    ).toHaveCount(1);
    bases.push(
      await banner.evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--sprout-gradient-banner-base"),
      ),
    );
  }
  expect(new Set(bases).size).toBe(6);
  await expect(
    page.locator('[data-demo="variants"] [data-variant="cobalt"] p'),
  ).toHaveCSS("color", "rgb(255, 253, 247)");
  await expect(
    page.locator('[data-demo="variants"] [data-variant="aurora"] p'),
  ).toHaveCSS("color", "rgb(37, 40, 45)");

  const sizes = {
    sm: { height: 96, padding: "16px", radius: "8px" },
    md: { height: 160, padding: "20px", radius: "12px" },
    lg: { height: 240, padding: "24px", radius: "12px" },
    xl: { height: 360, padding: "32px", radius: "16px" },
  };
  for (const [size, box] of Object.entries(sizes)) {
    const banner = page.locator(
      `[data-demo="sizes"] [data-slot="gradient-banner"][data-size="${size}"]`,
    );
    await expect(banner).toHaveText(`${size} · no texture`);
    await expect(banner).toHaveAttribute("data-variant", "aurora");
    await expect(
      banner.locator('[data-slot="gradient-banner-texture"]'),
    ).toHaveCount(0);
    await expect(banner).toHaveCSS("padding-top", box.padding);
    await expect(banner).toHaveCSS("border-top-left-radius", box.radius);
    expect((await banner.boundingBox())!.height).toBeGreaterThanOrEqual(
      box.height,
    );
    const context = page.locator(
      `[data-demo="sizes-in-context"] [data-slot="gradient-banner"][data-size="${size}"]`,
    );
    await expect(context).toHaveCount(1);
    await expect(
      context.locator('[data-slot="gradient-banner-panel"]'),
    ).toBeVisible();
  }
  const artOnly = page.locator(
    '[data-demo="art-only"] [data-slot="gradient-banner"]',
  );
  await expect(artOnly).toHaveCount(2);
  await expect(
    artOnly.locator('[data-slot="gradient-banner-content"]'),
  ).toHaveCount(0);
});

test("panels, badges, and progress follow the tone", async ({ page }) => {
  await openBanner(page);
  const light = page.locator(
    '[data-demo="panels"] [data-slot="gradient-banner-panel"][data-tone="light"]',
  );
  const dark = page.locator(
    '[data-demo="panels"] [data-slot="gradient-banner-panel"][data-tone="dark"]',
  );
  await expect(light.first()).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(light.first()).toHaveCSS("color", "rgb(37, 40, 45)");
  await expect(dark).toHaveCSS("background-color", "rgb(25, 29, 32)");
  await expect(dark).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(
    light.first().locator('[data-slot="gradient-banner-badge"]'),
  ).toHaveCSS("background-color", "rgb(241, 242, 244)");
  await expect(dark.locator('[data-slot="gradient-banner-badge"]')).toHaveCSS(
    "background-color",
    "rgb(48, 55, 59)",
  );

  const bars = page.locator('[data-demo="progress"] [role="progressbar"]');
  await expect(bars).toHaveCount(4);
  const expected = [
    ["0", 0],
    ["38", 0.375],
    ["100", 1],
    ["100", 1],
  ] as const;
  for (const [index, [now, scale]] of expected.entries()) {
    const bar = bars.nth(index);
    await expect(bar).toHaveAttribute("aria-valuenow", now);
    await expect(bar).toHaveAccessibleName(/Spring launch email/);
    const box = (await bar.boundingBox())!;
    expect(box.height).toBe(4);
    const fill = (await bar
      .locator(".sprout-gradient-banner-progress-fill")
      .boundingBox())!;
    expect(Math.abs(fill.width - box.width * scale)).toBeLessThan(1.5);
  }
  await expect(
    bars.nth(0).locator(".sprout-gradient-banner-progress-fill"),
  ).toHaveCSS("transition-duration", "0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(
    bars.nth(0).locator(".sprout-gradient-banner-progress-fill"),
  ).toHaveCSS("transition-duration", "0.18s");
});

test("playground is fully keyboard operable", async ({ page }) => {
  await openBanner(page);
  const variant = page.getByRole("combobox", { name: "Variant", exact: true });
  await variant.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(
    page.getByRole("option", { name: "aurora (default)" }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(variant).toBeFocused();
  await expect(stageBanner(page)).toHaveAttribute("data-variant", "mint");

  await page.keyboard.press("Tab");
  const size = page.getByRole("combobox", { name: "Size", exact: true });
  await expect(size).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(
    page.getByRole("option", { name: "lg (default)" }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(stageBanner(page)).toHaveAttribute("data-size", "xl");

  await chooseOption(page, "Panel tone", "dark");
  await expect(
    stageBanner(page).locator('[data-slot="gradient-banner-panel"]'),
  ).toHaveAttribute("data-tone", "dark");
  await chooseOption(page, "Content", "Prompt panel");
  await expect(stageBanner(page)).toContainText(
    "Post the weekly update in #team",
  );
  await chooseOption(page, "Content", "Text on art");
  await expect(stageBanner(page)).toHaveText("mint");
  await chooseOption(page, "Content", "Art only");
  await expect(
    stageBanner(page).locator('[data-slot="gradient-banner-content"]'),
  ).toHaveCount(0);

  const texture = page.getByRole("button", { name: "Texture" });
  await page.getByRole("combobox", { name: "Panel tone" }).focus();
  await page.keyboard.press("Tab");
  await expect(texture).toBeFocused();
  await expect(texture).toHaveCSS("outline-style", "solid");
  await expect(texture).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Space");
  await expect(texture).toHaveAttribute("aria-pressed", "false");
  await expect(
    stageBanner(page).locator('[data-slot="gradient-banner-texture"]'),
  ).toHaveCount(0);
  await expect(playground(page).locator(".gradient-demo-foot")).toHaveText(
    "mint · xl · no texture",
  );
});

test("prompt carousel rotates tones per app and scrolls by keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openBanner(page);
  const region = page.getByRole("region", {
    name: "Things to ask with Slack",
  });
  const cards = region.locator('[data-slot="gradient-banner"]');
  await expect(cards).toHaveCount(3);
  const tonesOf = async () =>
    cards.evaluateAll((els) => els.map((el) => el.dataset.variant));
  expect(await tonesOf()).toEqual(["mint", "cobalt", "aurora"]);
  for (const card of await cards.all()) {
    await expect(card).toHaveAttribute("data-size", "md");
    await expect(card.locator('[data-slot="brand-icon"]')).toHaveCount(1);
    expect((await card.boundingBox())!.width).toBe(256);
  }

  const list = region.getByRole("list");
  expect(await list.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true,
  );
  await list.focus();
  await expect(list).toBeFocused();
  await expect(list).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => list.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);

  await chooseOption(page, "App", "Gmail");
  const gmail = page.getByRole("region", { name: "Things to ask with Gmail" });
  await expect(gmail).toContainText("Label every invoice email");
  expect(
    await gmail
      .locator('[data-slot="gradient-banner"]')
      .evaluateAll((els) => els.map((el) => el.dataset.variant)),
  ).toEqual(["aurora", "citrus", "lagoon"]);
});

test("showcase starts paused for reduced motion and steps on demand", async ({
  page,
}) => {
  await openBanner(page);
  const showcase = page.getByRole("region", { name: "Sign-in page" });
  const banner = showcase.locator('[data-demo="agent-activity"]');
  await expect(banner).toHaveAttribute("data-variant", "iris");
  await expect(banner).toHaveAttribute("data-size", "xl");
  await expect(
    banner.locator('[data-slot="gradient-banner-panel"][data-tone="dark"]'),
  ).toContainText("How agents work in TulipFarm");
  const play = showcase.getByRole("button", { name: "Play" });
  await expect(play).toHaveAttribute("aria-pressed", "true");
  const bar = banner.getByRole("progressbar", {
    name: "Marketing agent progress",
  });
  await expect(bar).toHaveAttribute("aria-valuenow", "0");
  await page.waitForTimeout(800);
  await expect(bar).toHaveAttribute("aria-valuenow", "0");

  const step = showcase.getByRole("button", { name: "Step" });
  await step.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("Enter");
  await expect(bar).toHaveAttribute("aria-valuenow", "25");
  await expect(banner.locator("li[data-shown]")).toHaveCount(2);
  for (let i = 0; i < 12; i++) await page.keyboard.press("Enter");
  await expect(bar).toHaveAttribute("aria-valuenow", "100");
  await expect(banner).toContainText("Done");
  await expect(
    banner.locator(".gradient-demo-result[data-shown]"),
  ).toContainText("Email ready for your approval");
  for (let i = 0; i < 6; i++) await page.keyboard.press("Enter");
  await expect(
    banner.getByRole("progressbar", { name: "Leads agent progress" }),
  ).toHaveAttribute("aria-valuenow", "0");

  await play.click();
  const pause = showcase.getByRole("button", { name: "Pause" });
  await expect(pause).toHaveAttribute("aria-pressed", "false");
  await expect(
    banner.getByRole("progressbar", { name: "Leads agent progress" }),
  ).not.toHaveAttribute("aria-valuenow", "0", { timeout: 3000 });
  await pause.click();
  await expect(showcase.getByRole("button", { name: "Play" })).toBeVisible();
});

test("gradient banner is listed in docs navigation", async ({ page }) => {
  await openBanner(page);
  await expect(
    page
      .getByRole("navigation", { name: "Documentation" })
      .getByRole("link", { name: "Gradient Banner" }),
  ).toHaveAttribute("aria-current", "page");
});
