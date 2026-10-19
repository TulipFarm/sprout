import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption, setColorMode } from "./choose-option";

test.use({ reducedMotion: "reduce" });

async function openPage(page: Page) {
  await page.goto("/components/plan-outline/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const playground = (page: Page) =>
  page.getByRole("region", { name: "Plan outline playground" });
const recipe = (page: Page, id: string) =>
  page.locator(`[data-recipe="${id}"]`);
const recipes = ["marks", "nested", "notices", "viewer", "states", "long"];
const marks = (scope: Locator) =>
  scope
    .locator('[data-slot="plan-outline-task"][data-kind="task"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-mark")));
const row = (scope: Locator, name: string | RegExp) =>
  scope.getByRole("button", { name });

async function expand(trigger: Locator) {
  if ((await trigger.getAttribute("aria-expanded")) !== "true")
    await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const outline of await page
    .locator('[data-slot="plan-outline"]')
    .all()) {
    // Rows bleed 8px past the outline for their hover fill; the bleed must stay inside the card's padding.
    expect(
      await outline.evaluate((el) => el.scrollWidth <= el.clientWidth + 8 + 1),
    ).toBe(true);
    expect(
      await outline.evaluate((el) => {
        const card = el.parentElement!.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        return rect.left - card.left >= 8 && card.right - rect.right >= 8;
      }),
    ).toBe(true);
    const outer = (await outline.boundingBox())!;
    for (const label of await outline
      .locator(".sprout-plan-outline-label:visible")
      .all()) {
      const box = (await label.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(outer.x + outer.width + 1);
    }
  }
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`plan outline ${theme} ${mode} at ${width}px`, async ({
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
        expect(await marks(recipe(page, "marks"))).toEqual([
          "pending",
          "running",
          "attention",
          "blocked",
          "done",
          "failed",
          "cancelled",
        ]);
        // Open every task in the long recipe so wrapped details are checked too.
        for (const trigger of await recipe(page, "long")
          .locator('button[aria-expanded="false"]')
          .all())
          await trigger.click();
        await settle(page);
        await expectNoOverflow(page);
        const colors = await recipe(page, "marks").evaluate((el) => {
          const icon = (mark: string) =>
            getComputedStyle(
              el.querySelector(
                `[data-mark="${mark}"] .sprout-plan-outline-mark`,
              )!,
            ).color;
          const segment = (mark: string) =>
            getComputedStyle(
              el.querySelector(
                `.sprout-plan-outline-segment[data-mark="${mark}"]`,
              )!,
            ).backgroundColor;
          const token = (name: string) => {
            const probe = document.createElement("span");
            probe.style.color = `var(${name})`;
            el.appendChild(probe);
            const value = getComputedStyle(probe).color;
            probe.remove();
            return value;
          };
          return {
            running:
              icon("running") === token("--sprout-info") &&
              segment("running") === token("--sprout-info"),
            attention:
              icon("attention") === token("--sprout-warning") &&
              segment("attention") === token("--sprout-warning"),
            done:
              icon("done") === token("--sprout-success") &&
              segment("done") === token("--sprout-success"),
            failed:
              icon("failed") === token("--sprout-danger") &&
              segment("failed") === token("--sprout-danger"),
            pending: icon("pending") === token("--sprout-muted"),
          };
        });
        expect(colors).toEqual({
          running: true,
          attention: true,
          done: true,
          failed: true,
          pending: true,
        });
        const results = await new AxeBuilder({ page })
          .exclude(".docs-search-trigger")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`plan-outline-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
        await testInfo.attach(
          `plan-outline-playground-${theme}-${mode}-${width}`,
          {
            body: await playground(page).screenshot(),
            contentType: "image/png",
          },
        );
        for (const id of recipes) {
          await testInfo.attach(
            `plan-outline-${id}-${theme}-${mode}-${width}`,
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

test("every plan state renders its status, tone, notice, and task labels", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1100 });
  await openPage(page);
  const plan = playground(page).locator('[data-slot="plan-outline"]');
  const cases = [
    ["Draft", "Ready to review", "neutral", "Plan only", "0 of 5 done"],
    ["Running", "Running", "active", null, "1 of 5 done · 1 working"],
    [
      "Waiting on you",
      "Waiting",
      "attention",
      "2 tasks need your input",
      "2 of 5 done · 2 waiting for input",
    ],
    [
      "Paused at budget",
      "Paused",
      "attention",
      "Paused at its budget",
      "2 of 5 done · 1 working · 1 need verification",
    ],
    ["Stopped", "Stopped", "neutral", "Stopped", "2 of 5 done"],
    ["Complete", "Plan complete", "done", null, "5 of 5 done"],
    ["Verified", "Plan verified", "done", null, "5 of 5 done"],
    [
      "Failed",
      "Failed",
      "failed",
      "Some tasks failed",
      "2 of 5 done · 1 failed",
    ],
  ] as const;
  for (const [choice, status, tone, notice, progress] of cases) {
    await chooseOption(page, "Plan state", choice);
    const badge = plan.locator('[data-slot="badge"]').first();
    await expect(badge).toHaveText(status);
    await expect(badge).toHaveAttribute("data-tone", tone);
    await expect(plan.getByText(progress, { exact: true })).toBeVisible();
    if (notice)
      await expect(
        plan.getByRole("alert").getByText(notice, { exact: true }),
      ).toBeVisible();
    else await expect(plan.getByRole("alert")).toHaveCount(0);
    await testInfo.attach(
      `plan-outline-state-${choice.toLowerCase().replaceAll(" ", "-")}`,
      {
        body: await playground(page).screenshot(),
        contentType: "image/png",
      },
    );
  }
  // Stopped: cancelled tasks are crossed out and left out of the bar.
  await chooseOption(page, "Plan state", "Stopped");
  expect(await plan.locator(".sprout-plan-outline-segment").count()).toBe(2);
  const cancelled = plan
    .locator('[data-mark="cancelled"] .sprout-plan-outline-task-title')
    .first();
  expect(
    await cancelled.evaluate((el) => getComputedStyle(el).textDecorationLine),
  ).toBe("line-through");
  // Failed: the failed reason is red, the blocked reason is not.
  await chooseOption(page, "Plan state", "Failed");
  await expand(row(plan, /Confirm supplier stock/));
  await expand(row(plan, /Set prices/));
  const failedReason = plan.getByText("Two suppliers did not reply", {
    exact: false,
  });
  const blockedReason = plan.getByText("Supplier stock was not confirmed", {
    exact: false,
  });
  const danger = await plan.evaluate((el) => {
    const probe = document.createElement("span");
    probe.style.color = "var(--sprout-danger)";
    el.appendChild(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  });
  expect(await failedReason.evaluate((el) => getComputedStyle(el).color)).toBe(
    danger,
  );
  expect(
    await blockedReason.evaluate((el) => getComputedStyle(el).color),
  ).not.toBe(danger);
  // Waiting: actions render as links to the task.
  await chooseOption(page, "Plan state", "Waiting on you");
  await expand(row(plan, /Set prices/));
  await expect(
    plan.getByRole("link", { name: "Review in task" }),
  ).toBeVisible();
  await expand(row(plan, /Write product descriptions/));
  await expect(
    plan.getByRole("link", { name: "Answer in task" }),
  ).toBeVisible();
  // Verified: the verification report opens inside the task's action.
  await chooseOption(page, "Plan state", "Verified");
  const audit = row(plan, /Audit last spring/);
  await expand(audit);
  const auditPanel = plan.locator(
    `#${await audit.getAttribute("aria-controls")}`,
  );
  await auditPanel
    .getByRole("button", { name: "Verification details" })
    .click();
  await expect(
    auditPanel.getByText("Every variety has a sell-through rate.: passed"),
  ).toBeVisible();
  await expect(auditPanel.getByText("call_audit_1")).toBeVisible();
  await testInfo.attach("plan-outline-verified-report", {
    body: await playground(page).screenshot(),
    contentType: "image/png",
  });
});

test("keyboard opens rows, follows dependencies, and reaches actions", async ({
  page,
}) => {
  await openPage(page);
  const plan = recipe(page, "marks").locator('[data-slot="plan-outline"]');
  await expect(plan.getByRole("list", { name: "Tasks" })).toBeVisible();
  const running = row(plan, /Prepare the soil/);
  await running.focus();
  await expect(running).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Enter");
  await expect(running).toHaveAttribute("aria-expanded", "true");
  const panel = plan.locator(`#${await running.getAttribute("aria-controls")}`);
  await expect(panel.getByText("Done when")).toBeVisible();
  await expect(panel.getByText("Soil is loose to 20 cm.")).toBeVisible();
  await expect(panel.getByText("Starts after")).toBeVisible();
  // Tab reaches the dependency link; Enter moves focus to its row.
  await page.keyboard.press("Tab");
  const link = panel.getByRole("link", { name: "Choose a sunny patch" });
  await expect(link).toBeFocused();
  await page.keyboard.press("Enter");
  const target = plan
    .locator('[data-slot="plan-outline-task"][data-mark="pending"]')
    .first();
  await expect(target).toBeFocused();
  await expect(target).toBeInViewport();
  // Space closes and reopens a row.
  await running.focus();
  await page.keyboard.press("Space");
  await expect(running).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toHaveCount(0);
  // Attention task exposes its action button to the keyboard.
  const attention = row(plan, /Pick bulb colors/);
  await attention.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(
    plan.getByRole("button", { name: "Answer in task" }),
  ).toBeFocused();
  // Plain rows with no details are not buttons.
  await expect(
    plan.getByRole("button", { name: /Measure the bed/ }),
  ).toHaveCount(0);
  await expect(plan.getByText("Measure the bed")).toBeVisible();
});

test("nested groups collapse, and a link into a closed group opens it", async ({
  page,
}) => {
  await openPage(page);
  const plan = recipe(page, "nested").locator('[data-slot="plan-outline"]');
  await expect(
    plan.getByRole("list", { name: "Fix the order tasks" }),
  ).toBeVisible();
  await expect(
    plan.getByRole("list", { name: "Send replacements tasks" }),
  ).toBeVisible();
  await expect(plan.getByText("This group has no tasks yet.")).toBeVisible();
  await expect(
    plan.getByText("Collect what the customer asked for."),
  ).toBeVisible();
  const replace = row(plan, /^Send replacements/);
  await expect(replace).toHaveAttribute("aria-expanded", "true");
  await replace.click();
  await expect(replace).toHaveAttribute("aria-expanded", "false");
  await expect(
    plan.getByRole("list", { name: "Send replacements tasks" }),
  ).toBeHidden();
  // "Book next-day shipping" sits inside the closed group; open "Email the customer" and follow its link.
  await row(plan, /Email the customer/).click();
  await plan.getByRole("link", { name: "Send replacements" }).click();
  const target = plan.locator(
    '[data-slot="plan-outline-task"][id$="-task-nest-replace"]',
  );
  await expect(target).toBeFocused();
  // Following a link to a task hidden in a closed group opens the group.
  await replace.click();
  await expect(replace).toHaveAttribute("aria-expanded", "true");
  await row(plan, /Book next-day shipping/).click();
  await replace.click();
  await expect(replace).toHaveAttribute("aria-expanded", "false");
  const shipping = plan
    .locator('[data-slot="plan-outline-task"]')
    .filter({ hasText: "Book next-day shipping" })
    .last();
  const id = await shipping.getAttribute("id");
  await page.evaluate((hash) => (location.hash = hash), id);
  await expect(replace).toHaveAttribute("aria-expanded", "true");
  await expect(plan.getByText("Book next-day shipping")).toBeVisible();
});

test("notice, stale, viewer, empty, loading, and error states", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const notices = recipe(page, "notices");
  await expect(notices.getByText("Paused at its budget")).toBeVisible();
  await expect(
    notices.getByRole("region", { name: "Original requirements" }),
  ).toBeVisible();
  await expect(
    notices
      .getByRole("region", { name: "Prerequisite checks" })
      .locator('[data-slot="badge"]'),
  ).toHaveText(["Checked", "Not checked", "Blocked"]);
  await expect(notices.getByText("Showing the last loaded plan")).toBeVisible();
  const again = notices.getByRole("button", { name: "Check again" });
  await again.click();
  await expect(
    notices.getByRole("button", { name: "Checking…" }),
  ).toBeDisabled();
  await expect(again).toBeEnabled({ timeout: 5000 });

  const viewer = recipe(page, "viewer");
  await expect(viewer.getByText("Waiting for a review")).toBeVisible();
  await expect(viewer.getByText("Waiting for an answer")).toBeVisible();
  await expect(viewer.getByText("Needs your answer")).toHaveCount(0);
  await row(viewer, /Set prices/).click();
  await expect(
    viewer.getByRole("link", { name: "Review in task" }),
  ).toBeVisible();

  const states = recipe(page, "states");
  await expect(
    states.getByRole("status", { name: "Loading New plan" }),
  ).toBeVisible();
  await testInfo.attach("plan-outline-loading", {
    body: await states.screenshot(),
    contentType: "image/png",
  });
  await chooseOption(page, "Load state", "Couldn’t load");
  await expect(states.getByRole("alert")).toContainText(
    "Couldn’t load this plan",
  );
  await testInfo.attach("plan-outline-error", {
    body: await states.screenshot(),
    contentType: "image/png",
  });
  await chooseOption(page, "Load state", "Unavailable");
  await expect(
    states.getByRole("heading", { level: 3, name: "Plan unavailable" }),
  ).toBeVisible();
  await testInfo.attach("plan-outline-unavailable", {
    body: await states.screenshot(),
    contentType: "image/png",
  });
  await chooseOption(page, "Load state", "No tasks yet");
  const empty = states.getByRole("region", { name: "New plan" });
  await expect(empty.getByText("No tasks have been added yet.")).toBeVisible();
  await expect(empty.getByText("No tasks yet", { exact: true })).toBeVisible();
  await expect(empty.locator('[data-slot="plan-outline-rail"]')).toHaveCount(0);
  await expect(empty.getByRole("list")).toHaveCount(0);
  await testInfo.attach("plan-outline-empty", {
    body: await states.screenshot(),
    contentType: "image/png",
  });
  await chooseOption(page, "Load state", "Couldn’t load");
  await states.getByRole("button", { name: "Load plan again" }).click();
  await expect(
    states.getByRole("status", { name: "Loading New plan" }),
  ).toBeVisible();
});

test("tone picker drives the status badge", async ({ page }) => {
  await openPage(page);
  const marksRecipe = recipe(page, "marks");
  const badge = marksRecipe
    .locator('[data-slot="plan-outline"] [data-slot="badge"]')
    .first();
  const expected = [
    ["Attention · Waiting", "Waiting", "sprout-badge-warning"],
    ["Done · Plan complete", "Plan complete", "sprout-badge-success"],
    ["Failed · Failed", "Failed", "sprout-badge-destructive"],
    ["Neutral · Ready to review", "Ready to review", "sprout-badge-secondary"],
    ["Active · Running", "Running", "sprout-badge-info"],
  ] as const;
  for (const [option, text, className] of expected) {
    await chooseOption(page, "Plan tone", option);
    await expect(badge).toHaveText(text);
    await expect(badge).toHaveClass(new RegExp(className));
  }
});

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });
  test("rows open with a short height transition and turning chevron", async ({
    page,
  }) => {
    await openPage(page);
    const plan = recipe(page, "marks");
    const trigger = row(plan, /Prepare the soil/);
    const chevron = trigger.locator(".sprout-plan-outline-chevron");
    expect(
      await chevron.evaluate((el) => getComputedStyle(el).transitionDuration),
    ).toBe("0.12s");
    await trigger.click();
    const panel = plan.locator(
      `#${await trigger.getAttribute("aria-controls")}`,
    );
    expect(
      await panel.evaluate((el) => getComputedStyle(el).transitionDuration),
    ).toBe("0.18s, 0.12s");
    expect(
      await plan
        .locator(".sprout-plan-outline-mark .sprout-spinner")
        .evaluate((el) => getComputedStyle(el).animationName),
    ).not.toBe("none");
  });
});

test("reduced motion skips row and spinner animation", async ({ page }) => {
  await openPage(page);
  const plan = recipe(page, "marks");
  const trigger = row(plan, /Prepare the soil/);
  expect(
    await trigger
      .locator(".sprout-plan-outline-chevron")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  await trigger.click();
  const panel = plan.locator(`#${await trigger.getAttribute("aria-controls")}`);
  expect(
    await panel.evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  expect(
    await plan
      .locator(".sprout-plan-outline-mark .sprout-spinner")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});
