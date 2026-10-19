import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption, setColorMode } from "./choose-option";

test.use({ reducedMotion: "reduce" });

async function openReviewCard(page: Page) {
  await page.goto("/components/review-card/");
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

async function setMode(page: Page, mode: "light" | "dark") {
  await page.emulateMedia({ colorScheme: mode });
  if (mode === "dark") await setColorMode(page, "Dark");
  else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

const playground = (page: Page) =>
  page.getByRole("region", { name: "Review card playground" });
const recipe = (page: Page, id: string) =>
  page.locator(`[data-recipe="${id}"]`);
const recipes = [
  "badges",
  "confirmation",
  "authoring",
  "agent-setup",
  "workflow",
  "table-proposal",
  "composition",
];

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`review card ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openReviewCard(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        await setMode(page, mode as "light" | "dark");
        for (const id of recipes) {
          await recipe(page, id).scrollIntoViewIfNeeded();
          await expect(
            recipe(page, id).locator('[data-slot="review-card"]').first(),
          ).toBeVisible();
        }
        await settle(page);
        await noOverflow(page);
        for (const card of await page
          .locator('[data-slot="review-card"]')
          .all()) {
          expect(
            await card.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          ).toBe(true);
          // Cards stay inside their demo frame, which clips overflow.
          expect(
            await card.evaluate((el) => {
              const frame = el
                .closest(".review-demo-frame")!
                .getBoundingClientRect();
              const box = el.getBoundingClientRect();
              return box.left >= frame.left - 1 && box.right <= frame.right + 1;
            }),
          ).toBe(true);
          const header = card.locator(".sprout-review-card-header");
          expect(
            await header.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          ).toBe(true);
          const badge = card.locator(".sprout-review-card-badge");
          expect(
            await badge.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          ).toBe(true);
        }
        // The docs header search button is shared site chrome, outside this component.
        const results = await new AxeBuilder({ page })
          .exclude(".docs-search-trigger")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`review-card-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
        await testInfo.attach(
          `review-card-playground-${theme}-${mode}-${width}`,
          {
            body: await playground(page).screenshot(),
            contentType: "image/png",
          },
        );
        for (const id of recipes) {
          await testInfo.attach(`review-card-${id}-${theme}-${mode}-${width}`, {
            body: await recipe(page, id).screenshot(),
            contentType: "image/png",
          });
        }
      });
    }
  }
}

test("header toggles with keyboard and pointer, hiding actions when folded", async ({
  page,
}) => {
  await openReviewCard(page);
  const card = playground(page).locator('[data-slot="review-card"]');
  const trigger = card.getByRole("button", {
    name: "Update a row in Supplier deliveries",
  });
  await expect(card).toHaveAccessibleName("Review row change");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(
    card.getByRole("button", { name: "Approve change" }),
  ).toBeVisible();
  await trigger.focus();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  const outline = await card
    .locator(".sprout-review-card-header")
    .evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(card).not.toHaveAttribute("data-open");
  await expect(
    card.getByRole("button", { name: "Approve change" }),
  ).toHaveCount(0);
  await expect(
    card.getByText("Supplier deliveries", { exact: true }),
  ).toBeHidden();
  await page.keyboard.press("Space");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(
    card.getByRole("button", { name: "Approve change" }),
  ).toBeVisible();
  // The whole header is the click target, including the badge.
  // The trigger's overlay sits above the badge, so a click there lands on the trigger.
  await card.locator(".sprout-review-card-badge").click({ force: true });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await card.locator(".sprout-review-card-badge").click({ force: true });
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
});

test("approving settles the card and moves focus to the outcome", async ({
  page,
}) => {
  await openReviewCard(page);
  const card = playground(page).locator('[data-slot="review-card"]');
  await card.getByRole("button", { name: "Approve change" }).click();
  await expect(
    card.getByText("Your approval is recorded. The row is being changed."),
  ).toBeVisible();
  await expect(card.getByText("Row updated.")).toBeVisible();
  await expect(card).toHaveAttribute("data-settled", "true");
  await expect(
    card.getByRole("button", { name: /Supplier deliveries/ }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(card.locator(".review-demo-result")).toBeFocused();
  await expect(card.locator(".sprout-review-card-badge")).toHaveText("Applied");
});

test("row playground covers delete, empty values, and stale drafts", async ({
  page,
}) => {
  await openReviewCard(page);
  const card = playground(page).locator('[data-slot="review-card"]');
  await chooseOption(page, "Change", "Delete a row");
  await expect(
    card.getByRole("button", { name: "Approve deletion" }),
  ).toBeVisible();
  await chooseOption(page, "Values", "Empty");
  await expect(
    card.getByText(
      "Current row values are unavailable. See technical details.",
    ),
  ).toBeVisible();
  await chooseOption(page, "Draft status", "Stale");
  await expect(
    card.getByRole("button", { name: "Dismiss draft" }),
  ).toBeVisible();
});

test("settled badge samples start folded and open on demand", async ({
  page,
}) => {
  await openReviewCard(page);
  const samples = recipe(page, "badges").locator("[data-badge-variant]");
  await expect(samples).toHaveCount(7);
  for (const variant of [
    "default",
    "success",
    "warning",
    "info",
    "secondary",
    "destructive",
    "outline",
  ]) {
    await expect(
      recipe(page, "badges").locator(
        `[data-badge-variant="${variant}"] .sprout-badge-${variant}`,
      ),
    ).toBeVisible();
  }
  const first = samples.first().getByRole("button");
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await first.click();
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await expect(samples.first().getByText(/Sample details/)).toBeVisible();
});

test("approval cycles through submitting to its result and supports locked and error states", async ({
  page,
}) => {
  await openReviewCard(page);
  const frame = recipe(page, "confirmation");
  const approve = frame.getByRole("button", { name: "Approve action" });
  await approve.click();
  await expect(frame.getByRole("button", { name: "Decline" })).toBeDisabled();
  await expect(
    frame.getByText(
      "Approval recorded. This does not confirm the action has completed.",
    ),
  ).toBeFocused();
  await expect(frame.locator(".sprout-review-card-badge")).toHaveText(
    "Approved",
  );
  await chooseOption(page, "Approval state", "Pending");
  await chooseOption(page, "Locked", "Yes");
  await expect(
    frame.getByRole("button", { name: "Approve action" }),
  ).toBeDisabled();
  await chooseOption(page, "Locked", "No");
  await chooseOption(page, "Approval state", "Error");
  await expect(frame.getByRole("alert")).toHaveText(
    "Your decision could not be recorded. Try again.",
  );
  await expect(
    frame.getByRole("button", { name: "Approve action" }),
  ).toBeEnabled();
  await chooseOption(page, "Approval state", "Submitting");
  await expect(
    frame.getByRole("button", { name: "Approve action" }),
  ).toHaveAttribute("aria-busy", "true");
});

test("authoring drafts switch kind and feedback", async ({ page }) => {
  await openReviewCard(page);
  const frame = recipe(page, "authoring");
  for (const draft of ["Workflow", "New agent", "Agent update", "Skill"]) {
    await chooseOption(page, "Draft", draft);
    await expect(frame.locator('[data-slot="review-card"]')).toBeVisible();
  }
  await chooseOption(page, "Draft", "Agent update");
  await expect(frame.getByText("Changed fields")).toBeVisible();
  await chooseOption(page, "Feedback", "Uncertain");
  await expect(
    frame.getByRole("button", { name: "Retry same decision" }),
  ).toBeVisible();
  await chooseOption(page, "Authoring status", "Failed");
  await expect(frame.locator('[data-slot="review-card"]')).toHaveAttribute(
    "data-settled",
    "true",
  );
});

test("agent setup activation waits for both consent boxes", async ({
  page,
}) => {
  await openReviewCard(page);
  const frame = recipe(page, "agent-setup");
  const activate = frame.getByRole("button", { name: "Save and activate" });
  await expect(activate).toBeDisabled();
  await frame.getByRole("checkbox", { name: /I sponsor schedule 1/ }).click();
  await expect(activate).toBeDisabled();
  await frame
    .getByRole("checkbox", { name: /Replace the existing agent/ })
    .click();
  await expect(activate).toBeEnabled();
  await activate.click();
  await expect(frame.locator('[data-slot="review-card"]')).toHaveAttribute(
    "data-settled",
    "true",
  );
  await expect(frame.locator(".review-demo-result")).toBeFocused();
});

test("workflow steps are numbered with exact values", async ({ page }) => {
  await openReviewCard(page);
  const frame = recipe(page, "workflow");
  const steps = frame.locator(".sprout-review-step");
  expect(await steps.count()).toBeGreaterThanOrEqual(12);
  await expect(steps.first().locator(".sprout-review-step-number")).toHaveText(
    "1",
  );
  await expect(
    frame.locator('[data-slot="review-values"]').first(),
  ).toBeVisible();
  await chooseOption(page, "Trigger", "Webhook");
  await expect(frame.locator('[data-slot="review-card"]')).toBeVisible();
});

test("table proposal scrolls inside its bounded area on mobile", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openReviewCard(page);
  const box = recipe(page, "table-proposal").locator(".review-demo-bounded");
  await box.scrollIntoViewIfNeeded();
  const size = await box.evaluate((el) => ({
    client: el.clientHeight,
    scroll: el.scrollHeight,
  }));
  expect(size.client).toBeLessThanOrEqual(256);
  expect(size.scroll).toBeGreaterThan(size.client);
  const refresh = box.getByRole("button", { name: "Check proposal status" });
  await refresh.scrollIntoViewIfNeeded();
  await refresh.click();
  await expect(box.getByText("Checking proposal status…")).toBeVisible();
  await noOverflow(page);
  await testInfo.attach("review-card-table-proposal-mobile", {
    body: await recipe(page, "table-proposal").screenshot(),
    contentType: "image/png",
  });
});
