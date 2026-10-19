import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption, setColorMode } from "./choose-option";

test.use({ reducedMotion: "reduce" });

async function openPage(page: Page) {
  await page.goto("/components/chat-confirmation/");
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
  page.getByRole("region", { name: "Chat confirmation playground" });
const recipe = (page: Page, id: string) =>
  page.locator(`[data-recipe="${id}"]`);
const recipes = ["states", "table-approval", "reminder"];
const stateKinds = [
  "pending",
  "submitting",
  "submitting",
  "error",
  "approved",
  "rejected",
  "expired",
  "cancelled",
];

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`chat confirmation ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openPage(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        await page.emulateMedia({ colorScheme: mode });
        if (mode === "dark") await setColorMode(page, "Dark");
        else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
        await expect(
          recipe(page, "states").locator('[data-slot="chat-confirmation"]'),
        ).toHaveCount(stateKinds.length);
        const states = await recipe(page, "states")
          .locator('[data-slot="chat-confirmation"]')
          .evaluateAll((els) => els.map((el) => el.getAttribute("data-state")));
        expect(states).toEqual(stateKinds);
        await settle(page);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        for (const card of await page
          .locator('[data-slot="chat-confirmation"]')
          .all()) {
          await card.scrollIntoViewIfNeeded();
          expect(
            await card.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          ).toBe(true);
          const header = card.locator(".sprout-review-card-header");
          expect(
            await header.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          ).toBe(true);
          const badge = card.locator(".sprout-review-card-badge");
          expect(
            await badge.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          ).toBe(true);
          for (const row of await card
            .locator('[data-slot="review-row"]')
            .all()) {
            if (await row.isVisible())
              expect(
                await row.evaluate(
                  (el) => el.scrollWidth <= el.clientWidth + 1,
                ),
              ).toBe(true);
          }
          // Buttons stay inside the card footer.
          for (const button of await card
            .locator(".sprout-review-card-actions button")
            .all()) {
            const inside = await button.evaluate((el) => {
              const footer = el
                .closest(".sprout-review-card-footer")!
                .getBoundingClientRect();
              const box = el.getBoundingClientRect();
              return box.left >= footer.left && box.right <= footer.right;
            });
            expect(inside).toBe(true);
          }
        }
        const results = await new AxeBuilder({ page })
          .exclude(".docs-search-trigger")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`chat-confirmation-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
        await testInfo.attach(
          `chat-confirmation-playground-${theme}-${mode}-${width}`,
          {
            body: await playground(page).screenshot(),
            contentType: "image/png",
          },
        );
        for (const id of recipes) {
          await testInfo.attach(
            `chat-confirmation-${id}-${theme}-${mode}-${width}`,
            {
              body: await recipe(page, id).screenshot(),
              contentType: "image/png",
            },
          );
        }
      });
    }
  }
}

test("keyboard approval submits, settles, and moves focus to the outcome", async ({
  page,
}) => {
  await openPage(page);
  const card = playground(page).locator('[data-slot="chat-confirmation"]');
  const approve = card.getByRole("button", { name: "Approve action" });
  await approve.focus();
  await page.keyboard.press("Enter");
  await expect(card).toHaveAttribute("data-state", "submitting");
  await expect(approve).toHaveAttribute("aria-busy", "true");
  await expect(approve).toBeDisabled();
  await expect(card.getByRole("button", { name: "Decline" })).toBeDisabled();
  await expect(approve.locator('[data-slot="spinner"]')).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  const outcome = card.getByRole("status");
  await expect(outcome).toHaveText(
    "Approval recorded. This does not confirm the action has completed.",
  );
  await expect(outcome).toBeFocused();
  await expect(card.locator('[data-slot="review-card"]')).toHaveAttribute(
    "data-settled",
    "true",
  );
  await expect(card.getByText("Approved", { exact: true })).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Approve action" }),
  ).toHaveCount(0);
  // The folded card still opens from its header with the keyboard.
  const trigger = card.getByRole("button", {
    name: "Remove the Notes field from Supplier deliveries",
  });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(card.getByText("Affected rows")).toBeVisible();
});

test("declining shows a busy Decline, then the declined outcome", async ({
  page,
}) => {
  await openPage(page);
  const card = playground(page).locator('[data-slot="chat-confirmation"]');
  const decline = card.getByRole("button", { name: "Decline" });
  await decline.click();
  await expect(decline).toHaveAttribute("aria-busy", "true");
  await expect(
    card.getByRole("button", { name: "Approve action" }),
  ).toHaveAttribute("aria-busy", "false");
  await expect(card.getByRole("status")).toHaveText(
    "The proposed action was declined.",
  );
  await expect(card.getByRole("status")).toBeFocused();
  await expect(card.getByText("Declined", { exact: true })).toBeVisible();
});

test("playground picks every state, locks, and blocks unverifiable effects", async ({
  page,
}) => {
  await openPage(page);
  const card = playground(page).locator('[data-slot="chat-confirmation"]');
  const outcomes: [string, string, string][] = [
    [
      "Approved",
      "approved",
      "Approval recorded. This does not confirm the action has completed.",
    ],
    ["Declined", "rejected", "The proposed action was declined."],
    ["Expired", "expired", "This approval expired. No approval was granted."],
    [
      "Cancelled",
      "cancelled",
      "This approval was cancelled. No approval was granted.",
    ],
  ];
  for (const [option, kind, text] of outcomes) {
    await chooseOption(page, "State", option);
    await expect(card).toHaveAttribute("data-state", kind);
    await expect(card.getByRole("status")).toHaveText(text);
    // Picking a state from the menu does not steal focus.
    await expect(card.getByRole("status")).not.toBeFocused();
  }
  await chooseOption(page, "State", "Error");
  await expect(card.getByRole("alert")).toHaveText(
    "Your decision could not be recorded. Try again.",
  );
  await expect(
    card.getByRole("button", { name: "Approve action" }),
  ).toBeEnabled();
  await chooseOption(page, "State", "Submitting decline");
  await expect(card.getByRole("button", { name: "Decline" })).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await chooseOption(page, "State", "Pending");
  await chooseOption(page, "Locked", "Yes");
  await expect(
    card.getByRole("button", { name: "Approve action" }),
  ).toBeDisabled();
  await expect(card.getByRole("button", { name: "Decline" })).toBeDisabled();
  await chooseOption(page, "Locked", "No");
  await expect(
    card.getByRole("button", { name: "Approve action" }),
  ).toBeEnabled();
  await chooseOption(page, "Change", "Effect unknown");
  await expect(
    card.getByText(
      "Effect details unavailable. Do not approve an action you cannot verify.",
    ),
  ).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Approve action" }),
  ).toBeDisabled();
  for (const [option, effect] of [
    ["Remove a field", "Remove field values"],
    ["Convert a field", "Convert field values"],
    ["Remove rows", "Remove table rows"],
  ]) {
    await chooseOption(page, "Change", option);
    await expect(card.getByText(effect, { exact: true })).toBeVisible();
    await expect(
      card.getByRole("button", { name: "Approve action" }),
    ).toBeEnabled();
  }
});

test("table approval locks after a failed refresh until status is checked", async ({
  page,
}) => {
  await openPage(page);
  const group = page.getByRole("group", { name: "Table approval" });
  const card = group.locator('[data-slot="chat-confirmation"]');
  await group.getByRole("button", { name: "Details" }).click();
  await expect(
    group.getByText("Only this card records your approval.", { exact: false }),
  ).toBeVisible();
  await chooseOption(page, "Request", "Refresh failed");
  await expect(
    group.getByText("Could not refresh this request.", { exact: false }),
  ).toBeVisible();
  await expect(group.getByText("Request status needs a check")).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Approve action" }),
  ).toBeDisabled();
  await group
    .getByRole("button", { name: "Check request status" })
    .last()
    .click();
  await expect(
    card.getByRole("button", { name: "Approve action" }),
  ).toBeEnabled();
  await card.getByRole("button", { name: "Approve action" }).click();
  await expect(card).toHaveAttribute("data-state", "approved");
  await expect(group.getByRole("button", { name: "Details" })).toHaveCount(0);
  await expect(
    group.getByRole("button", { name: "Check request status" }),
  ).toBeVisible();
});

test("reminder settles at once and keeps tab order", async ({ page }) => {
  await openPage(page);
  const card = recipe(page, "reminder").locator(
    '[data-slot="chat-confirmation"]',
  );
  await expect(card.getByText("alex@example.com")).toBeVisible();
  const approve = card.getByRole("button", { name: "Approve action" });
  await approve.focus();
  await page.keyboard.press("Tab");
  await expect(card.getByRole("button", { name: "Decline" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(approve).toBeFocused();
  await page.keyboard.press("Space");
  await expect(card).toHaveAttribute("data-state", "approved");
  await chooseOption(page, "Reminder state", "Error");
  await expect(card.getByRole("alert")).toHaveText(
    "This fictional approval could not be saved. Try again.",
  );
});
