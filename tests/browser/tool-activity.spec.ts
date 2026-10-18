import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

test.use({ reducedMotion: "reduce" });

async function openToolActivity(page: Page) {
  await page.goto("/components/tool-activity/");
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

const demo = (page: Page, id: string) => page.locator(`[data-demo="${id}"]`);
const demoIds = [
  "statuses",
  "variants",
  "receipt",
  "transcript",
  "stepper",
  "recorded",
  "empty",
];

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`tool activity ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openToolActivity(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        await chooseOption(
          page,
          "Color mode",
          mode === "light" ? "Light" : "Dark",
        );
        const transcript = demo(page, "transcript");
        await transcript
          .getByRole("button", { name: /^Tool activity · 2 tools/ })
          .click();
        await transcript
          .getByRole("button", { name: "Details", exact: true })
          .click();
        await demo(page, "recorded")
          .getByRole("button", { name: "View activity" })
          .click();
        await demo(page, "recorded")
          .getByRole("button", { name: "Activity details" })
          .click();
        await settle(page);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        for (const id of demoIds) {
          const frame = demo(page, id);
          expect(
            await frame.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
            id,
          ).toBe(true);
        }
        for (const row of await page.locator(".sprout-tool-activity-row").all())
          expect(
            await row.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          ).toBe(true);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .exclude(".docs-search-trigger")
          .analyze();
        expect(results.violations).toEqual([]);
        const pagePath = testInfo.outputPath(
          `tool-activity-${theme}-${mode}-${width}.png`,
        );
        const shot = await page.screenshot({ fullPage: true, path: pagePath });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`tool-activity-${theme}-${mode}-${width}`, {
          path: pagePath,
          contentType: "image/png",
        });
        for (const id of demoIds) {
          const path = testInfo.outputPath(
            `tool-activity-${id}-${theme}-${mode}-${width}.png`,
          );
          await demo(page, id).screenshot({ path });
          await testInfo.attach(
            `tool-activity-${id}-${theme}-${mode}-${width}`,
            { path, contentType: "image/png" },
          );
        }
      });
    }
  }
}

test("the collapsible summary opens while pending and toggles by keyboard", async ({
  page,
}) => {
  await openToolActivity(page);
  const statuses = demo(page, "statuses");
  const trigger = statuses.getByRole("button", {
    name: "Using 8 tools · 3 need attention",
  });
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const rows = statuses.locator(".sprout-tool-activity-row");
  await expect(rows).toHaveCount(8);
  for (const status of [
    "completed",
    "running",
    "waiting",
    "queued",
    "blocked",
    "failed",
    "cancelled",
    "unknown",
  ])
    await expect(statuses.locator(`[data-status="${status}"]`)).toHaveCount(1);
  await expect(
    statuses.locator('[data-status="failed"] [data-slot="tool-detail"]'),
  ).toHaveAttribute("data-tone", "danger");
  await expect(
    statuses.locator('[data-status="blocked"] [data-slot="tool-detail"]'),
  ).toHaveAttribute("data-tone", "danger");
  await expect(
    statuses.locator('[data-status="waiting"] [data-slot="tool-detail"]'),
  ).not.toHaveAttribute("data-tone");
  await expect(
    statuses.locator('[data-status="running"]').getByRole("status"),
  ).toHaveText("In progress");

  await trigger.focus();
  await expect(trigger).toBeFocused();
  const outline = await trigger.evaluate(
    (el) => getComputedStyle(el).outlineStyle,
  );
  expect(outline).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(
    statuses.getByRole("list", { name: "Tool activity" }),
  ).toBeHidden();
  await page.keyboard.press("Space");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  await statuses.getByRole("button", { name: "Retry update" }).click();
  await expect(statuses.locator('[data-status="failed"]')).toHaveCount(0);
  await expect(
    statuses.getByRole("button", { name: /^Using 8 tools · 2 need attention/ }),
  ).toBeVisible();
  await statuses.getByRole("button", { name: "Reset retry" }).click();
  await expect(
    statuses.getByRole("button", { name: "Retry update" }),
  ).toBeVisible();

  await statuses.getByRole("switch", { name: "Reply working" }).click();
  const settled = statuses.getByRole("button", {
    name: "8 tools waiting · 3 need attention",
  });
  await expect(settled).toBeVisible();
  await expect(settled.locator('[data-slot="spinner"]')).toHaveCount(0);
});

test("receipt reflects every status with one tool", async ({ page }) => {
  await openToolActivity(page);
  const receipt = demo(page, "receipt");
  const expected = {
    queued: ["1 tool waiting", true],
    running: ["Using 1 tool", true],
    waiting: ["1 tool waiting", true],
    completed: ["Used 1 tool", false],
    blocked: ["Used 1 tool · 1 needs attention", false],
    failed: ["Used 1 tool · 1 needs attention", false],
    cancelled: ["Used 1 tool", false],
    unknown: ["1 tool waiting · 1 needs attention", true],
  } as const;
  for (const [status, [title, open]] of Object.entries(expected)) {
    await chooseOption(page, "Tool status", status);
    const trigger = receipt.getByRole("button", { name: title, exact: true });
    // Pending work opens the list; once settled it keeps whatever the reader chose.
    if (open) await expect(trigger).toHaveAttribute("aria-expanded", "true");
    else if ((await trigger.getAttribute("aria-expanded")) === "false")
      await trigger.click();
    await expect(
      receipt.locator(
        `[data-status="${status}"] [data-slot="tool-status-mark"]`,
      ),
    ).toBeVisible();
  }
  await chooseOption(page, "Tool status", "running");
  await chooseOption(page, "Tool status", "completed");
  await expect(
    receipt.getByRole("button", { name: "Used 1 tool", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
});

test("variants switch between collapsible, transcript, and stepper", async ({
  page,
}) => {
  await openToolActivity(page);
  const variants = demo(page, "variants");
  await expect(
    variants.getByRole("button", { name: "Used 3 tools · 1 needs attention" }),
  ).toHaveAttribute("aria-expanded", "false");
  await chooseOption(page, "Variant", "transcript");
  await expect(
    variants.getByRole("button", {
      name: "Tool activity · 3 tools · Access denied",
    }),
  ).toBeVisible();
  await chooseOption(page, "Variant", "stepper");
  await expect(variants.locator(".sprout-tool-activity-trigger")).toHaveCount(
    0,
  );
  await expect(
    variants.getByRole("list", { name: "Tool activity" }),
  ).toBeVisible();
  await expect(
    variants.locator('[data-slot="timeline-connector"]'),
  ).toHaveCount(2);
});

test("transcript stages, sources, details, and toggle callback", async ({
  page,
}) => {
  await openToolActivity(page);
  const transcript = demo(page, "transcript");
  const notice = transcript.locator(".tool-demo-notice");
  await expect(notice).toHaveText("Following the latest message");
  const trigger = transcript.getByRole("button", {
    name: "Tool activity · 2 tools",
  });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(notice).toHaveText("Following latest paused · toggled 1 time");

  await expect(transcript.locator('[data-slot="web-search-query"]')).toHaveText(
    "UK services inflation September 2026",
  );
  const sources = transcript.getByRole("list", { name: "Web sources" });
  await expect(sources.getByRole("link")).toHaveCount(4);
  await expect(sources.getByRole("link").first()).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(
    sources.locator('[data-slot="source-favicon"][data-status="loaded"]'),
  ).toHaveCount(3);
  const more = transcript.getByRole("button", { name: "2 more" });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await more.click();
  await expect(sources.getByRole("link")).toHaveCount(6);
  await expect(sources.locator('[data-failed="true"]')).toContainText(
    "Page unavailable",
  );
  await expect(
    sources.getByRole("link", { name: /reuters\.com\/markets/ }),
  ).toBeVisible();
  await transcript.getByRole("button", { name: "Show fewer sources" }).click();
  await expect(sources.getByRole("link")).toHaveCount(4);

  const details = transcript.getByRole("button", {
    name: "Details",
    exact: true,
  });
  await details.click();
  await expect(
    transcript.getByRole("list", { name: "Knowledge branches" }),
  ).toContainText("Branch 2: Timed out");

  await chooseOption(page, "Reply stage", "Searching the web");
  await expect(
    transcript.getByRole("button", { name: "Working… Searching the web" }),
  ).toBeVisible();
  await chooseOption(page, "Reply stage", "Reading knowledge");
  await expect(
    transcript.getByRole("button", {
      name: "Working… Reading supplier knowledge",
    }),
  ).toBeVisible();
  await chooseOption(page, "Reply stage", "Needs attention");
  await expect(
    transcript.getByRole("button", {
      name: "Work pending · Outcome unconfirmed",
    }),
  ).toBeVisible();
  await chooseOption(page, "Reply stage", "Thinking, no tools yet");
  await expect(transcript.locator('[data-slot="reply-progress"]')).toHaveText(
    "Thinking…",
  );
});

test("activity panel follows new steps, loads older ones, and collapses when done", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openToolActivity(page);
  const stepper = demo(page, "stepper");
  await stepper.scrollIntoViewIfNeeded();
  const panel = stepper.getByRole("region", { name: "Chat activity" });
  await expect(panel).toHaveAttribute("data-has-result", "true");
  const viewport = panel.getByRole("region", { name: "Activity timeline" });
  const list = viewport.getByRole("list", { name: "Agent steps" });
  await viewport.evaluate((el) => (el.scrollTop = 0));
  await expect(list.locator('[data-tool-id="o1"]')).toBeVisible();
  const ids = await list
    .locator("[data-tool-id]")
    .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-tool-id")));
  expect(ids).toEqual(["o1", "o2", "o3", "s1", "s2", "s3"]);

  for (let i = 0; i < 3; i++)
    await stepper.getByRole("button", { name: "Add step" }).click();
  await expect(list.locator('[data-tool-id="s6"]')).toHaveAttribute(
    "data-status",
    "running",
  );
  await expect(
    panel.getByRole("button", {
      name: "Working… Shared the draft in #procurement",
    }),
  ).toBeVisible();
  await expect
    .poll(() =>
      viewport.evaluate(
        (el) => el.scrollHeight - el.clientHeight - el.scrollTop,
      ),
    )
    .toBeLessThan(2);
  expect(
    await viewport.evaluate((el) => el.scrollHeight > el.clientHeight),
  ).toBe(true);
  await viewport.evaluate((el) => (el.scrollTop = 0));
  await expect(panel.locator('[data-scrolled="true"]')).toHaveCount(0);
  await viewport.evaluate((el) => (el.scrollTop = 10));
  await expect(panel.locator('[data-scrolled="true"]')).toHaveCount(1);
  await viewport.focus();
  await expect(viewport).toBeFocused();

  await stepper.getByRole("switch", { name: "Working" }).click();
  const worked = panel.getByRole("button", { name: "Worked" });
  await expect(worked).toHaveAttribute("aria-expanded", "false");
  await worked.click();
  await expect(worked).toHaveAttribute("aria-expanded", "true");
  await stepper.getByRole("switch", { name: "Working" }).click();
  await stepper.getByRole("switch", { name: "Collapse when done" }).click();
  await stepper.getByRole("switch", { name: "Working" }).click();
  await expect(worked).toHaveAttribute("aria-expanded", "true");

  await stepper.getByRole("switch", { name: "Fail next load" }).click();
  await stepper.getByRole("button", { name: "Reset" }).click();
  await viewport.evaluate((el) => (el.scrollTop = 0));
  await expect(stepper.getByText("Loading earlier activity…")).toBeVisible();
  const alert = stepper.getByRole("alert");
  await expect(alert).toContainText("Earlier activity didn’t load.");
  await alert.getByRole("button", { name: "Retry loading" }).click();
  await expect(alert).toHaveCount(0);
  await expect(list.locator('[data-tool-id="o1"]')).toBeVisible();
});

test("recorded activity opens a stepper behind a result card", async ({
  page,
}) => {
  await openToolActivity(page);
  const recorded = demo(page, "recorded");
  await recorded.getByRole("button", { name: "View activity" }).click();
  await expect(
    recorded.getByText("2 of 4 actions completed", { exact: false }),
  ).toBeVisible();
  await recorded.getByRole("button", { name: "Activity details" }).click();
  const list = recorded.getByRole("list", { name: "Tool activity" });
  await expect(list.locator("[data-tool-id]")).toHaveCount(4);
  const ids = await list
    .locator("[data-tool-id]")
    .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-tool-id")));
  expect(ids).toEqual(["r1", "r2", "r3", "r4"]);
  await recorded.getByRole("button", { name: "Hide activity" }).click();
  await expect(list).toHaveCount(0);
});

test("empty activity shows progress only for an active transcript", async ({
  page,
}) => {
  await openToolActivity(page);
  const empty = demo(page, "empty");
  const progress = empty.locator('[data-slot="reply-progress"]');
  await expect(progress).toHaveCount(2);
  await expect(progress.first()).toHaveText("Thinking…");
  await expect(progress.nth(1)).toHaveText("Planning the supplier follow-up");
  await expect(progress.first()).toHaveAttribute("role", "status");
  await expect(
    empty.locator('[data-empty="collapsible"] [data-slot="tool-activity"]'),
  ).toHaveCount(0);
});

test("touch screens get 44px targets", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  try {
    await openToolActivity(page);
    const trigger = demo(page, "statuses").locator(
      ".sprout-tool-activity-trigger",
    );
    expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  } finally {
    await context.close();
  }
});
