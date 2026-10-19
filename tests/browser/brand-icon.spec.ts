import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

async function openBrandIcon(page: Page) {
  await page.goto("/components/brand-icon/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished),
    );
  });
}

async function size(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  return (
    box && { width: Math.round(box.width), height: Math.round(box.height) }
  );
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`brand icon ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openBrandIcon(page);
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
        await expect(
          page.getByRole("region", { name: "Brand icon playground" }),
        ).toBeVisible();
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`brand-icon-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
      });
    }
  }
}

test("every size matches the Cloud scale", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openBrandIcon(page);
  const expected = {
    inline: 16,
    glyph: 20,
    sm: 24,
    md: 36,
    lg: 48,
    xl: 56,
  } as const;
  for (const [name, px] of Object.entries(expected)) {
    expect(
      await size(page, `[data-size-sample="${name}"] [data-brand]`),
    ).toEqual({ width: px, height: px });
  }
  const action = '[data-size-sample="fill"] [data-slot="brand-tile"]';
  expect(await size(page, action)).toEqual({ width: 36, height: 36 });
  expect(await size(page, `${action} svg`)).toEqual({ width: 18, height: 18 });
  await expect(page.locator(action)).toHaveCSS("border-radius", "8px");
  // Inline logos inside a Sprout Button keep 16px despite its icon sizing.
  expect(
    await size(page, '[data-size-sample="inline"] button [data-brand] svg'),
  ).toEqual({ width: 16, height: 16 });
  await expect(
    page.locator('[data-size-sample="xl"] [data-slot="brand-tile"]'),
  ).toHaveCSS("border-radius", "16px");
  await expect(
    page.locator('[data-size-sample="sm"] [data-slot="brand-tile"]'),
  ).toHaveCSS("padding", "4px");
  await expect(page.locator("[data-catalog-brand]")).toHaveCount(33);
  await expect(
    page.locator("[data-catalog-brand] svg path").first(),
  ).toBeVisible();
  const sizes = page.getByRole("region", { name: "Sizes" });
  await testInfo.attach("brand-icon-sizes", {
    body: await sizes.screenshot(),
    contentType: "image/png",
  });
});

test("the playground switches brand and size", async ({ page }) => {
  await openBrandIcon(page);
  const stage = page.getByTestId("playground-stage");
  await expect(stage.locator('[data-brand="google-calendar"]')).toHaveAttribute(
    "data-size",
    "md",
  );
  await chooseOption(page, "Brand", "Notion");
  await chooseOption(page, "Brand icon size", "xl");
  expect(
    await size(page, '[data-testid="playground-stage"] [data-brand="notion"]'),
  ).toEqual({
    width: 56,
    height: 56,
  });
  await chooseOption(page, "Brand icon size", "fill");
  expect(
    await size(page, '[data-testid="playground-stage"] [data-brand="notion"]'),
  ).toEqual({ width: 22, height: 22 });
});

test("near-black logos follow the text color in dark mode", async ({
  page,
}) => {
  await openBrandIcon(page);
  const github = page.locator('[data-catalog-brand="github"] svg path').first();
  const jira = page.locator('[data-catalog-brand="jira"] svg path').first();
  const lightFill = await github.evaluate(
    (node) => getComputedStyle(node).fill,
  );
  await chooseOption(page, "Color mode", "Dark");
  const darkFill = await github.evaluate((node) => getComputedStyle(node).fill);
  expect(lightFill).not.toBe(darkFill);
  expect(darkFill).toBe(
    await page
      .locator('[data-catalog-brand="github"] [data-slot="brand-tile"]')
      .evaluate((node) => getComputedStyle(node).color),
  );
  await expect(jira).toHaveAttribute("fill", "#0052CC");
});

test("brand stacks name their apps and show tooltips on hover", async ({
  page,
}, testInfo) => {
  await openBrandIcon(page);
  const draft = page.getByRole("img", {
    name: "Google Workspace, Slack, GitHub, Atlassian",
  });
  await expect(draft).toBeVisible();
  await expect(draft.locator(".sprout-brand-tile")).toHaveCount(4);
  await expect(
    page.getByRole("img", { name: "Example integrations" }),
  ).toBeVisible();
  await expect(page.getByTestId("empty-stack")).toHaveText(
    "No actions selected.",
  );
  await expect(
    page.getByTestId("empty-stack").locator('[data-slot="brand-stack"]'),
  ).toHaveCount(0);
  const tiles = draft.locator(".sprout-brand-tile");
  const first = await tiles.nth(0).boundingBox();
  const second = await tiles.nth(1).boundingBox();
  expect(Math.round(second!.x - first!.x)).toBe(18);
  await tiles.nth(1).hover();
  const tooltip = page.locator(".sprout-brand-tooltip");
  await expect(tooltip).toHaveText("Slack");
  await settle(page);
  await testInfo.attach("brand-stack-tooltip", {
    body: await page.getByRole("region", { name: "Agent draft" }).screenshot(),
    contentType: "image/png",
  });
  await page.mouse.move(0, 0);
  await expect(tooltip).toHaveCount(0);
  const prompts = page.getByRole("list", { name: "Suggested prompts" });
  await expect(
    prompts.getByRole("img", { name: "Slack, Jira, GitHub" }),
  ).toBeVisible();
  await expect(prompts.getByRole("img")).toHaveCount(2);
});

test("action tiles work from the keyboard and stay disabled", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openBrandIcon(page);
  const card = page.getByRole("region", {
    name: "Workflow: Chase unpaid invoices",
  });
  const gmail = card.getByRole("button", { name: "Gmail actions" });
  await gmail.focus();
  await expect(gmail).toBeFocused();
  await expect(gmail).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Tab");
  await expect(
    card.getByRole("button", { name: "Google Sheets actions" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  const more = card.getByRole("button", { name: "2 more apps" });
  await expect(more).toBeFocused();
  await expect(more).toHaveText("+2");
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "2 more apps" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Slack" })).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Connected apps" }),
  ).toBeVisible();
  await expect(dialog.locator('[data-brand="slack"]')).toHaveAttribute(
    "data-size",
    "glyph",
  );
  await settle(page);
  await testInfo.attach("brand-action-popover", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(more).toBeFocused();

  const plug = page
    .getByRole("region", { name: "Action: Webhook sync" })
    .getByRole("button", { name: "Connected apps actions" });
  await expect(plug.locator("svg")).toBeVisible();
  await expect(plug.locator("[data-brand]")).toHaveCount(0);

  const disabled = page
    .getByRole("region", { name: "Activity: Weekly pipeline report" })
    .getByRole("button", { name: "Gmail actions" });
  await expect(disabled).toBeDisabled();
  await expect(disabled).toHaveCSS("opacity", "0.5");

  const fallback = page.getByRole("region", {
    name: "Calendar: Team offsite agenda",
  });
  expect(
    await size(
      page,
      '[aria-label="Calendar: Team offsite agenda"] [data-slot="brand-tile"]',
    ),
  ).toEqual({ width: 36, height: 36 });
  await expect(fallback.getByRole("button")).toHaveCount(0);
});

test("action tiles grow to 44px on touch screens", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  try {
    await openBrandIcon(page);
    expect(
      await size(page, '[data-size-sample="fill"] [data-slot="brand-tile"]'),
    ).toEqual({ width: 44, height: 44 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});

test("tooltips respect reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await openBrandIcon(page);
    await page
      .getByRole("img", { name: "Example integrations" })
      .locator(".sprout-brand-tile")
      .first()
      .hover();
    const tooltip = page.locator(".sprout-brand-tooltip");
    await expect(tooltip).toHaveText("Slack");
    await expect(tooltip).toHaveCSS("transition-duration", "0s");
  } finally {
    await context.close();
  }
});
