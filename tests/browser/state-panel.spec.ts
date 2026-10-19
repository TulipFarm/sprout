import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

// The loading spinner runs forever; reduced motion stops it so shared helpers
// that await every animation can settle.
test.use({ reducedMotion: "reduce" });

async function openStatePanel(page: Page) {
  await page.goto("/components/state-panel/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    );
  });
}

const playground = (page: Page) =>
  page.getByRole("region", { name: "State panel playground" });

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`state panel ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openStatePanel(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        await chooseOption(
          page,
          "Color mode",
          mode === "light" ? "Light" : "Dark",
        );
        await page.getByRole("button", { name: "Sample preview" }).click();
        await expect(
          page.locator("main section[data-layout=sample]"),
        ).toHaveCount(1 + 3 + 1);
        await settle(page);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`state-panel-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
        const panel = await playground(page).screenshot();
        await testInfo.attach(
          `state-panel-playground-${theme}-${mode}-${width}`,
          {
            body: panel,
            contentType: "image/png",
          },
        );
      });
    }
  }
}

test("every kind has its media, live role, and tile", async ({ page }) => {
  await openStatePanel(page);
  const roles = {
    empty: null,
    loading: "status",
    success: "status",
    unavailable: null,
    error: "alert",
  } as const;
  for (const [kind, role] of Object.entries(roles)) {
    const panel = page.locator(
      `[data-kind-sample="${kind}"] [data-slot="state-panel"]`,
    );
    await expect(panel).toHaveAttribute("data-kind", kind);
    await expect(panel).toHaveAttribute("data-layout", "centered");
    const media = panel.locator('[data-slot="state-panel-media"]');
    await expect(media).toHaveAttribute("aria-hidden", "true");
    expect(await media.boundingBox()).toMatchObject({ width: 40, height: 40 });
    await expect(panel.getByRole("heading", { level: 3 })).toBeVisible();
    const text = panel.locator(".sprout-state-panel-text");
    if (role) await expect(text).toHaveAttribute("role", role);
    else await expect(text).not.toHaveAttribute("role");
  }
  const danger = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue(
      "--sprout-danger",
    ),
  );
  const warning = page.locator(
    '[data-kind-sample="error"] .sprout-state-panel-danger',
  );
  const [r, g, b] = danger
    .trim()
    .slice(1)
    .match(/../g)!
    .map((h) => parseInt(h, 16));
  await expect(warning).toHaveCSS("color", `rgb(${r}, ${g}, ${b})`);
  await expect(
    page
      .locator('[data-kind-sample="error"]')
      .getByRole("button", { name: "Try again" }),
  ).toBeVisible();
});

test("playground is fully keyboard operable", async ({ page }) => {
  await openStatePanel(page);
  const stage = playground(page).locator(".state-demo-stage");
  const kind = page.getByRole("combobox", { name: "Kind", exact: true });
  await kind.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(kind).toBeFocused();
  await expect(stage.locator('[data-slot="state-panel"]')).toHaveAttribute(
    "data-kind",
    "error",
  );
  await expect(stage.getByRole("alert")).toContainText(
    "Could not open this file",
  );
  await expect(
    page.getByRole("button", { name: "Sample preview" }),
  ).toBeDisabled();

  await chooseOption(page, "Heading", "h1");
  await expect(stage.getByRole("heading", { level: 1 })).toHaveText(
    "Could not open this file",
  );
  await chooseOption(page, "Heading", "h2 (default)");
  await expect(stage.getByRole("heading", { level: 2 })).toBeVisible();
  await chooseOption(page, "Heading", "h4");
  await expect(stage.getByRole("heading", { level: 4 })).toBeVisible();

  await chooseOption(page, "Actions", "None");
  await expect(
    stage.locator('[data-slot="state-panel-actions"]'),
  ).toContainText("Ask again in the chat.");
  await chooseOption(page, "Kind", "unavailable");
  await expect(stage.locator('[data-slot="state-panel-actions"]')).toHaveCount(
    0,
  );
  await chooseOption(page, "Icon", "Custom glyph");
  await expect(
    stage.locator('[data-slot="state-panel-media"] svg path'),
  ).toHaveCount(3);
  await chooseOption(page, "Actions", "Link");
  await expect(
    stage.getByRole("link", { name: "Read about actions" }),
  ).toHaveAttribute("href", "#state-panel-actions");

  await chooseOption(page, "Kind", "loading");
  await expect(stage.getByRole("status")).toContainText("Opening file");
  await expect(
    stage.locator('[data-slot="state-panel-media"] svg line'),
  ).toHaveCount(8);

  await chooseOption(page, "Kind", "empty");
  await chooseOption(page, "Actions", "Buttons");
  const toggle = page.getByRole("button", { name: "Sample preview" });
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  const sample = stage.locator('[data-layout="sample"]');
  await expect(sample).toBeVisible();
  await expect(
    sample.locator('[data-slot="state-panel-sample"]'),
  ).toHaveAttribute("inert", "");
  await page.keyboard.press("Tab");
  await expect(
    stage.getByRole("button", { name: "Upload files" }),
  ).toBeFocused();
  await expect(stage.getByRole("button", { name: "Upload files" })).toHaveCSS(
    "outline-style",
    "solid",
  );
  await page.keyboard.press("Tab");
  await expect(stage.getByRole("button", { name: "Try again" })).toBeFocused();
});

test("sample layout responds to its container, not the viewport", async ({
  page,
}, testInfo) => {
  // The 48rem two-column breakpoint needs the wider docs column at 1440px.
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStatePanel(page);
  const region = page.getByRole("region", { name: "Sample layout" });
  const panel = region.locator('[data-slot="state-panel"]');
  const preview = panel.locator('[data-slot="state-panel-sample"]');
  const actions = panel.locator('[data-slot="state-panel-actions"]');
  const card = panel.locator(".sprout-state-panel-card");
  await expect(preview).toHaveAttribute("aria-hidden", "true");
  await expect(panel.getByRole("heading", { level: 3 })).toHaveText(
    "No files yet",
  );

  await region.getByRole("button", { name: "Narrow" }).click();
  await settle(page);
  await expect(preview).toBeHidden();
  await expect(actions).toHaveCSS("flex-direction", "column");
  await testInfo.attach("state-panel-sample-narrow", {
    body: await region.screenshot(),
    contentType: "image/png",
  });

  await region.getByRole("button", { name: "Medium" }).click();
  await settle(page);
  await expect(preview).toBeVisible();
  await expect(actions).toHaveCSS("flex-direction", "row");
  expect(
    (await card.evaluate((n) => getComputedStyle(n).gridTemplateColumns)).split(
      " ",
    ),
  ).toHaveLength(1);
  await expect(preview).toHaveCSS("border-top-width", "1px");

  await region.getByRole("button", { name: "Wide" }).click();
  await settle(page);
  expect(
    (await card.evaluate((n) => getComputedStyle(n).gridTemplateColumns)).split(
      " ",
    ),
  ).toHaveLength(2);
  await expect(preview).toHaveCSS("border-left-width", "1px");
  await expect(preview).toHaveCSS("border-top-width", "0px");
  await testInfo.attach("state-panel-sample-wide", {
    body: await region.screenshot(),
    contentType: "image/png",
  });

  await page.setViewportSize({ width: 390, height: 900 });
  await settle(page);
  await expect(actions).toHaveCSS("flex-direction", "column");
  await expect(preview).toBeHidden();

  const optional = page.getByRole("region", { name: "Optional sample" });
  await expect(optional.locator('[data-layout="sample"]')).toHaveCount(1);
  await optional.getByRole("button", { name: "Archived", exact: true }).click();
  await expect(optional.locator('[data-layout="centered"]')).toHaveCount(1);
  await expect(optional.getByRole("heading")).toHaveText(
    "No archived workflows",
  );
  await optional
    .getByRole("button", { name: "Show current workflows" })
    .click();
  await expect(optional.locator('[data-layout="sample"]')).toHaveCount(1);

  const noActions = page.getByRole("region", {
    name: "Sample without actions",
  });
  await expect(
    noActions.locator('[data-slot="state-panel-actions"]'),
  ).toHaveCount(0);
});

test("recovery flow moves through loading, error, and success with focus kept", async ({
  page,
}, testInfo) => {
  await openStatePanel(page);
  const region = page.getByRole("region", { name: "Recovery flow" });
  const result = region.locator('[aria-label="Request result"]');
  await expect(result.getByRole("alert")).toContainText(
    "Could not load Google Drive",
  );
  const retry = result.getByRole("button", {
    name: "Retry loading Google Drive",
  });
  await retry.focus();
  await page.keyboard.press("Enter");
  await expect(result).toBeFocused();
  await expect(result.getByRole("status")).toContainText(
    "Loading Google Drive",
  );
  await expect(result.getByRole("button")).toHaveCount(0);
  await expect(result.getByRole("status")).toContainText(
    "Google Drive is ready",
  );
  await testInfo.attach("state-panel-flow-success", {
    body: await region.screenshot(),
    contentType: "image/png",
  });

  for (const [label, kind, text] of [
    ["Empty", "empty", "This folder is empty"],
    ["Unavailable", "unavailable", "Allow Google Drive access"],
    ["Error", "error", "Could not load Google Drive"],
  ] as const) {
    await chooseOption(page, "Next result", label);
    await region.getByRole("button", { name: "Reload" }).click();
    await expect(result).toHaveAttribute("data-state", "loading");
    await expect(result).toHaveAttribute("data-state", kind);
    await expect(result.getByRole("heading", { level: 3 })).toHaveText(text);
  }
});

test("action compositions keep their behavior", async ({ page }) => {
  await openStatePanel(page);
  const busy = page.getByRole("region", { name: "Busy action" });
  const use = busy.getByRole("button", { name: "Use as default" });
  await use.click();
  const pending = busy.getByRole("button", { name: "Turning on" });
  await expect(pending).toBeDisabled();
  await expect(pending).toHaveAttribute("aria-busy", "true");
  await expect(busy.getByRole("status")).toContainText(
    "Default knowledge is on",
  );
  await busy.getByRole("button", { name: "Reset example" }).click();
  await expect(use).toBeVisible();

  const links = page.getByRole("region", { name: "Primary and link" });
  await expect(
    links.getByRole("link", { name: "Back to overview" }),
  ).toHaveAttribute("href", "#main");
  const row = page.getByRole("region", { name: "Action row" });
  await expect(row.getByRole("link")).toHaveCount(2);
  await expect(row.locator(".state-demo-row")).toHaveCSS("flex-wrap", "wrap");

  const inline = page.getByRole("region", { name: "Inline alert" });
  await expect(inline.getByRole("alert")).toHaveText(
    "Slack status could not refresh.",
  );
  const guidance = page.getByRole("region", { name: "Guidance text" });
  await expect(guidance.getByRole("alert")).toContainText(
    "Calendar did not load",
  );
  await expect(
    guidance.locator('[data-slot="state-panel-actions"]'),
  ).toHaveText("Ask again in the chat.");

  const conditional = page.getByRole("region", { name: "Conditional action" });
  const actions = conditional.locator('[data-slot="state-panel-actions"]');
  await expect(actions).toHaveCount(0);
  await conditional.getByRole("button", { name: "Sync finished" }).click();
  await expect(
    actions.getByRole("button", { name: "Retry channel list" }),
  ).toBeVisible();

  await expect(
    page
      .getByRole("region", { name: "Loading with action" })
      .getByRole("status"),
  ).toContainText("Waiting for Slack");
  await expect(
    page
      .getByRole("region", { name: "Success with action" })
      .getByRole("link", {
        name: "Open copy",
      }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Back and retry" })
      .getByRole("heading", { level: 4 }),
  ).toBeVisible();
});

test("motion runs normally and stops with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openStatePanel(page);
  const loading = page.locator('[data-kind-sample="loading"]');
  await expect(loading.locator('[data-slot="spinner"]')).toHaveCSS(
    "animation-name",
    "sprout-spinner-spin",
  );
  await expect(loading.locator('[data-slot="state-panel"]')).toHaveCSS(
    "animation-duration",
    "0.18s",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(loading.locator('[data-slot="spinner"]')).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(loading.locator('[data-slot="state-panel"]')).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("docs navigation links State Panel without native dropdowns", async ({
  page,
}) => {
  await openStatePanel(page);
  const nav = page.getByRole("navigation", { name: "Documentation" });
  await expect(nav.getByRole("link", { name: "State Panel" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.getByRole("link", { name: "State Panel" })).toHaveAttribute(
    "href",
    "/components/state-panel/",
  );
  await expect(nav.getByRole("link", { name: "Sidebar" })).toHaveAttribute(
    "href",
    "/components/sidebar/",
  );
  await expect(page.locator("select")).toHaveCount(0);
  await expect(page.locator("sprout-code-block")).toHaveCount(4);
});
