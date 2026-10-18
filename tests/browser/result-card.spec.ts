import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

test.use({ reducedMotion: "reduce" });

async function openResultCard(page: Page) {
  await page.goto("/components/result-card/");
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

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

const playground = (page: Page) =>
  page.getByRole("region", { name: "Result card playground" });
const recipe = (page: Page, id: string) =>
  page.locator(`[data-recipe="${id}"]`);

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`result card ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openResultCard(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        await chooseOption(
          page,
          "Color mode",
          mode === "light" ? "Light" : "Dark",
        );
        await page.getByRole("switch", { name: "Details" }).click();
        // Render every lazy island before checking the whole page.
        for (const id of [
          "slack-action",
          "atlassian",
          "activity",
          "calendar",
          "file",
          "github",
          "plan",
          "records",
          "mock",
          "workflow-canvas",
          "google",
          "workflow-viewer",
        ]) {
          await recipe(page, id).scrollIntoViewIfNeeded();
          await expect(
            recipe(page, id).locator('[data-slot="result-card"]').first(),
          ).toBeVisible();
        }
        await settle(page);
        await noOverflow(page);
        const cards = page.locator('[data-slot="result-card"]');
        for (const card of await cards.all()) {
          expect(
            await card.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          ).toBe(true);
        }
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`result-card-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
        await testInfo.attach(
          `result-card-playground-${theme}-${mode}-${width}`,
          {
            body: await playground(page).screenshot(),
            contentType: "image/png",
          },
        );
        const states = page
          .locator("[data-state-sample]")
          .first()
          .locator("xpath=ancestor::section[1]");
        await testInfo.attach(`result-card-states-${theme}-${mode}-${width}`, {
          body: await states.screenshot(),
          contentType: "image/png",
        });
      });
    }
  }
}

test("action sits beside the text when wide and below it when narrow", async ({
  page,
}) => {
  for (const [width, row] of [
    [1440, true],
    [390, false],
  ] as const) {
    await page.setViewportSize({ width, height: 1000 });
    await openResultCard(page);
    const card = playground(page).locator('[data-slot="result-card"]');
    const title = await card.getByRole("heading", { level: 3 }).boundingBox();
    const action = await card
      .getByRole("button", { name: "View slides" })
      .boundingBox();
    expect(title && action).toBeTruthy();
    if (row) expect(action!.y).toBeLessThan(title!.y + title!.height);
    else expect(action!.y).toBeGreaterThanOrEqual(title!.y + title!.height);
  }
});

test("every state sets its tone, busy flag, and action availability", async ({
  page,
}) => {
  await openResultCard(page);
  const expected = {
    default: { tone: null, busy: "false", disabled: false, spinner: 0 },
    loading: { tone: null, busy: "true", disabled: true, spinner: 1 },
    running: { tone: null, busy: "true", disabled: false, spinner: 1 },
    disabled: { tone: null, busy: "false", disabled: true, spinner: 0 },
    error: { tone: "error", busy: "false", disabled: false, spinner: 0 },
    success: { tone: "success", busy: "false", disabled: false, spinner: 0 },
  } as const;
  for (const [state, want] of Object.entries(expected)) {
    const card = page.locator(
      `[data-state-sample="${state}"] [data-slot="result-card"]`,
    );
    await expect(card).toHaveAttribute("data-state", state);
    await expect(card).toHaveAttribute("aria-busy", want.busy);
    const status = card.getByRole("status");
    if (want.tone) await expect(status).toHaveAttribute("data-tone", want.tone);
    else await expect(status).not.toHaveAttribute("data-tone");
    await expect(status.locator('[data-slot="spinner"]')).toHaveCount(
      want.spinner,
    );
    const action = card.locator(".sprout-result-card-action button");
    if (want.disabled) await expect(action).toBeDisabled();
    else await expect(action).toBeEnabled();
  }
  await expect(
    page.locator('[data-state-sample="disabled"] [data-result-app] button'),
  ).toBeDisabled();
});

test("app tiles open their actions by keyboard and return focus on Escape", async ({
  page,
}) => {
  await openResultCard(page);
  const card = page
    .getByRole("region", { name: "Workflow: Weekly team update" })
    .first();
  await card.scrollIntoViewIfNeeded();
  const group = card.getByRole("group", { name: "Apps used" });
  await expect(group.getByRole("button")).toHaveCount(3);
  await expect(card.locator("[data-result-overflow]")).toHaveText("+3");

  const slack = group.getByRole("button", { name: "Slack actions" });
  await slack.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Slack actions" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Posted the weekly update");
  await expect
    .poll(() => dialog.evaluate((el) => el.contains(document.activeElement)))
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(slack).toBeFocused();

  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const more = group.getByRole("button", { name: "3 more apps" });
  await expect(more).toBeFocused();
  await page.keyboard.press("Space");
  const overflow = page.getByRole("dialog", { name: "3 more apps" });
  await expect(overflow).toBeVisible();
  await expect(overflow.getByRole("heading", { level: 4 })).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(more).toBeFocused();
});

test("hovering a tile opens its actions without moving focus", async ({
  page,
}) => {
  await openResultCard(page);
  const card = page
    .getByRole("region", { name: "File: Investor pitch" })
    .first();
  await card.scrollIntoViewIfNeeded();
  await card.getByRole("button", { name: "Google Slides actions" }).hover();
  const dialog = page.getByRole("dialog", { name: "Google Slides actions" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-state="completed"]')).toHaveCount(2);
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(false);
  await page.mouse.move(0, 0);
  await expect(dialog).toHaveCount(0);
});

test("merged and unbranded apps, empty actions, and icon fallbacks", async ({
  page,
}) => {
  await openResultCard(page);
  const merged = page
    .getByText("Repeated app merges into one tile", { exact: true })
    .locator("xpath=..");
  await expect(merged.locator('[data-result-app="gmail"]')).toHaveCount(1);
  await expect(
    page.locator('[data-result-app="connected-app"]').first(),
  ).toBeVisible();
  const iconOnly = page
    .getByText("No apps, icon tile", { exact: true })
    .locator("xpath=..");
  await expect(iconOnly.locator(".sprout-result-card-icon")).toHaveCount(1);
  await expect(iconOnly.getByRole("group", { name: "Apps used" })).toHaveCount(
    0,
  );
  const bare = page
    .getByText("No apps, no icon, no action", { exact: true })
    .locator("xpath=..");
  await expect(bare.locator(".sprout-result-card-icon")).toHaveCount(0);
  await expect(bare.getByRole("button")).toHaveCount(0);
});

test("app actions list every state with a readable prefix", async ({
  page,
}) => {
  await openResultCard(page);
  const named = page.getByTestId("app-actions-named");
  for (const prefix of [
    "Failed:",
    "Unconfirmed:",
    "Pending:",
    "In progress:",
    "Blocked:",
    "Cancelled:",
    "Skipped:",
  ])
    await expect(named).toContainText(prefix);
  await expect(named.locator('[data-state="completed"]').first()).toContainText(
    "Completed:",
  );
  await expect(named).toContainText("No action details were recorded.");
  await expect(page.getByTestId("app-actions-plain").locator("h4")).toHaveCount(
    0,
  );
});

test("playground switches kind, state, action, and details", async ({
  page,
}) => {
  await openResultCard(page);
  const stage = page.getByTestId("playground-stage");
  await chooseOption(page, "Kind", "Table");
  await chooseOption(page, "State", "loading");
  const card = stage.locator('[data-slot="result-card"]');
  await expect(card).toHaveAttribute("data-kind", "Table");
  await expect(card).toHaveAttribute("aria-busy", "true");
  await page.getByRole("switch", { name: "Action" }).click();
  await expect(card.locator(".sprout-result-card-action")).toHaveCount(0);
  await page.getByRole("switch", { name: "Details" }).click();
  await expect(card.locator(".sprout-result-card-body")).toBeVisible();
});

test("Cloud recipes respond to their actions", async ({ page }) => {
  await openResultCard(page);
  const activity = recipe(page, "activity");
  await activity.scrollIntoViewIfNeeded();
  await activity.getByRole("button", { name: "View activity" }).click();
  await expect(
    activity.getByRole("button", { name: "Hide activity" }),
  ).toBeVisible();
  await activity.getByRole("button", { name: "Hide activity" }).click();
  await expect(
    activity.getByRole("button", { name: "View activity" }),
  ).toBeVisible();

  const records = recipe(page, "records");
  await records.getByRole("button", { name: "View changed rows" }).click();
  await expect(records.locator(".result-demo-notice")).toContainText(
    "View changed rows",
  );

  const mock = recipe(page, "mock");
  const details = mock.getByRole("region", { name: "Result details" });
  await expect(details).toContainText("Open a result");
  await mock.getByRole("button", { name: "View result" }).click();
  await expect(
    details.getByRole("heading", { name: "Weekly team update" }),
  ).toBeVisible();
  await expect(details.locator("h4").filter({ hasText: "Slack" })).toHaveCount(
    1,
  );
});

test("Cloud outcome selects map to card states", async ({ page }) => {
  await openResultCard(page);
  const slack = recipe(page, "slack-action");
  await slack.scrollIntoViewIfNeeded();
  for (const [option, state] of [
    ["Sending", "running"],
    ["Sent", "success"],
    ["Unknown", "error"],
    ["Pending", "default"],
  ] as const) {
    await chooseOption(page, "Slack outcome", option);
    await expect(
      slack.locator('[data-slot="result-card"]').first(),
    ).toHaveAttribute("data-state", state);
  }
  const google = recipe(page, "google");
  await chooseOption(page, "Google status", "Failed");
  await expect(
    google.locator('[data-slot="result-card"]').first(),
  ).toHaveAttribute("data-state", "error");
  const viewer = recipe(page, "workflow-viewer");
  await chooseOption(page, "Workflow run", "Running");
  await expect(
    viewer.locator('[data-slot="result-card"]').first(),
  ).toHaveAttribute("data-state", "running");
});
