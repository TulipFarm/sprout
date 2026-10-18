import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

test.use({ reducedMotion: "reduce" });

async function openPage(page: Page) {
  await page.goto("/components/toast/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const section = (page: Page, name: string) =>
  page.getByRole("region", { name, exact: true });
const toasts = (page: Page) =>
  page.locator(
    '[data-slot="toast"]:not([data-ending-style]):not([data-limited])',
  );
const toastNamed = (page: Page, title: string) =>
  toasts(page).filter({
    has: page.locator('[data-slot="toast-title"]', { hasText: title }),
  });

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .exclude(".docs-search-trigger")
    .analyze();
  expect(results.violations).toEqual([]);
}

async function shot(target: Page | Locator, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await target.screenshot({ path });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const finite = document
      .getAnimations()
      .filter(
        (animation) =>
          animation.effect?.getComputedTiming().iterations !== Infinity,
      );
    await Promise.all(
      finite.map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

/** Screenshots a box around every open toast. */
async function shotToasts(page: Page, testInfo: TestInfo, name: string) {
  await settle(page);
  const boxes = await toasts(page).evaluateAll((elements) =>
    elements.map((element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
  const width = await page.evaluate(() => innerWidth);
  const height = await page.evaluate(() => innerHeight);
  const x = Math.max(0, Math.min(...boxes.map((box) => box.x)) - 16);
  const y = Math.max(0, Math.min(...boxes.map((box) => box.y)) - 16);
  const right = Math.min(
    width,
    Math.max(...boxes.map((box) => box.x + box.width)) + 16,
  );
  const bottom = Math.min(
    height,
    Math.max(...boxes.map((box) => box.y + box.height)) + 16,
  );
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({
    path,
    clip: { x, y, width: right - x, height: bottom - y },
  });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function closeAll(page: Page) {
  await page.mouse.move(1, 1);
  while ((await toasts(page).count()) > 0) {
    await toasts(page).first().hover();
    await toasts(page)
      .first()
      .getByRole("button", { name: "Close toast" })
      .click();
    await settle(page);
  }
  await expect(page.locator('[data-slot="toast"]')).toHaveCount(0);
}

const samples = [
  {
    label: "Default",
    title: "Draft saved",
    description: "Changes are stored on this device.",
    type: null,
  },
  {
    label: "Success",
    title: "Invite sent",
    description: "Ana Ruiz can now join the Meadow workspace.",
    type: "success",
  },
  {
    label: "Error",
    title: "Couldn’t publish",
    description: "Harvest log is locked by another editor.",
    type: "error",
  },
  {
    label: "Warning",
    title: "Storage almost full",
    description: "9.2 of 10 GB used. Older uploads may be archived.",
    type: "warning",
  },
  {
    label: "Info",
    title: "New version available",
    description: "Reload to get the latest editor.",
    type: "info",
  },
  {
    label: "Loading",
    title: "Importing contacts",
    description: "1,240 rows from contacts.csv…",
    type: "loading",
  },
] as const;

for (const theme of ["neutral", "tulipfarm"] as const) {
  for (const mode of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`shows every type in ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await openPage(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        await chooseOption(
          page,
          "Color mode",
          mode === "light" ? "Light" : "Dark",
        );
        await expectNoOverflow(page);
        await axe(page);
        await shot(
          section(page, "Toast playground"),
          testInfo,
          `playground-${theme}-${mode}-${width}`,
        );

        const playground = section(page, "Toast playground");
        for (const [batch, group] of [
          samples.slice(0, 3),
          samples.slice(3),
        ].entries()) {
          for (const sample of group) {
            await playground
              .getByRole("button", { name: sample.label, exact: true })
              .click();
          }
          await expect(playground.getByRole("status")).toHaveText("3 open");
          const front = toastNamed(page, group[2]!.title);
          await front.hover();
          for (const sample of group) {
            const item = toastNamed(page, sample.title);
            await expect(item).toBeVisible();
            await expect(item).toHaveAttribute("data-expanded", "");
            await expect(
              item.locator('[data-slot="toast-description"]'),
            ).toHaveText(sample.description);
            const icon = item.locator('[data-slot="toast-icon"]');
            if (sample.type) {
              await expect(item).toHaveAttribute("data-type", sample.type);
              await expect(icon).toHaveAttribute("data-type", sample.type);
              await expect(icon.locator("svg")).toHaveCount(1);
            } else {
              await expect(icon).toHaveCount(0);
            }
            const box = (await item.boundingBox())!;
            expect(box.x).toBeGreaterThanOrEqual(15);
            expect(box.x + box.width).toBeLessThanOrEqual(width - 15);
            expect(box.width).toBeLessThanOrEqual(384.5);
            expect(box.height).toBeLessThanOrEqual(100);
          }
          await settle(page);
          await expectNoOverflow(page);
          await axe(page);
          await shotToasts(
            page,
            testInfo,
            `types-${batch}-${theme}-${mode}-${width}`,
          );
          await closeAll(page);
        }
        await expect(playground.getByRole("status")).toHaveText(
          "No notifications open",
        );
      });
    }
  }
}

test("collapses into a stack and colors only the error icon", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openPage(page);
  const playground = section(page, "Toast playground");
  for (const label of ["Success", "Error", "Warning"]) {
    await playground.getByRole("button", { name: label, exact: true }).click();
  }
  await playground.hover();
  await settle(page);
  const front = toastNamed(page, "Storage almost full");
  const behind = toastNamed(page, "Invite sent");
  await expect(front).not.toHaveAttribute("data-expanded");
  const [frontBox, behindBox] = [
    (await front.boundingBox())!,
    (await behind.boundingBox())!,
  ];
  expect(behindBox.width).toBeLessThan(frontBox.width);
  expect(behindBox.y).toBeLessThan(frontBox.y);
  await expect(behind.locator('[data-slot="toast-content"]')).toHaveCSS(
    "opacity",
    "0",
  );
  await shotToasts(page, testInfo, "collapsed-stack");

  const color = (title: string) =>
    toastNamed(page, title)
      .locator('[data-slot="toast-icon"]')
      .evaluate((element) => getComputedStyle(element).color);
  const danger = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--sprout-danger)";
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  });
  await front.hover();
  expect(await color("Couldn’t publish")).toBe(danger);
  expect(await color("Invite sent")).not.toBe(danger);
  expect(await color("Storage almost full")).not.toBe(danger);
  await closeAll(page);
});

test("never steals focus and is reachable with F6, Tab, and Enter", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openPage(page);
  const trigger = section(page, "Toast playground").getByRole("button", {
    name: "Success",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const item = toastNamed(page, "Invite sent");
  await expect(item).toBeVisible();
  await expect(trigger).toBeFocused();

  await page.keyboard.press("F6");
  const viewport = page
    .locator('[data-slot="toast-viewport"]')
    .filter({ has: item });
  await expect(viewport).toBeFocused();
  await expect(viewport).toHaveAttribute("aria-live", "polite");
  await page.keyboard.press("Tab");
  await expect(item).toBeFocused();
  await expect(item).toHaveCSS("outline-style", "solid");
  await shotToasts(page, testInfo, "keyboard-focus");
  await page.keyboard.press("Tab");
  const close = item.getByRole("button", { name: "Close toast" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-slot="toast"]')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("runs an action and shows a title-only follow-up", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openPage(page);
  await section(page, "With action")
    .getByRole("button", { name: "Save sample" })
    .click();
  const saved = toastNamed(page, "Sample saved");
  await expect(saved).toBeVisible();
  await expect(saved.locator('[data-slot="toast-icon"]')).toHaveCount(0);
  const undo = saved.getByRole("button", { name: "Undo" });
  await expect(undo).toHaveAttribute("data-variant", "outline");
  await expect(undo).toHaveAttribute("data-size", "sm");
  await saved.hover();
  await shotToasts(page, testInfo, "with-action");
  await undo.click();
  const undone = toastNamed(page, "Sample undone");
  await expect(undone).toBeVisible();
  await expect(toastNamed(page, "Sample saved")).toHaveCount(0);
  await expect(undone).toHaveAttribute("data-type", "info");
  await expect(undone.locator('[data-slot="toast-description"]')).toHaveCount(
    0,
  );
  await expect(undone.locator('[data-slot="toast-action"]')).toHaveCount(0);
  await undone.hover();
  await shotToasts(page, testInfo, "title-only");
  await closeAll(page);
});

test("keeps an isolated manager in its own viewport", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openPage(page);
  const isolated = section(page, "Isolated manager");
  for (const type of ["success", "error", "warning", "info", "loading"]) {
    await expect(
      isolated.getByRole("button", { name: type, exact: true }),
    ).toBeVisible();
  }
  await isolated.getByRole("button", { name: "error", exact: true }).click();
  await isolated.getByRole("button", { name: "loading", exact: true }).click();
  const error = toastNamed(page, "Error example");
  await expect(error).toHaveAttribute("data-type", "error");
  await expect(error.locator('[data-slot="toast-description"]')).toHaveText(
    "A local notification. No action was sent.",
  );
  await expect(toastNamed(page, "Loading example")).toHaveAttribute(
    "data-type",
    "loading",
  );
  await expect(
    section(page, "Toast playground").getByText("No notifications open"),
  ).toBeVisible();
  const viewports = page
    .locator('[data-slot="toast-viewport"]')
    .filter({ has: page.locator('[data-slot="toast"]') });
  await expect(viewports).toHaveCount(1);
  await expect(
    viewports.filter({ has: error }).locator('[data-slot="toast"]'),
  ).toHaveCount(2);
  await toastNamed(page, "Loading example").hover();
  await settle(page);
  await expect(error).toBeInViewport();
  await shotToasts(page, testInfo, "isolated");
  await closeAll(page);
});

test("swaps a loading toast for its result in place", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await openPage(page);
  const promise = section(page, "Loading, then a result");
  await promise.getByRole("button", { name: "Upload file" }).click();
  const uploading = toastNamed(page, "Uploading report-q3.pdf");
  await expect(uploading).toHaveAttribute("data-type", "loading");
  await expect(uploading.locator('[data-slot="toast-icon"] svg')).toHaveCount(
    1,
  );
  await shotToasts(page, testInfo, "promise-loading");
  const done = toastNamed(page, "Upload complete");
  await expect(done).toHaveAttribute("data-type", "success");
  await expect(done.locator('[data-slot="toast-description"]')).toHaveText(
    "report-q3.pdf is ready to share.",
  );
  await expect(toasts(page)).toHaveCount(1);
  await closeAll(page);

  await promise.getByRole("button", { name: "Upload that fails" }).click();
  const failed = toastNamed(page, "Upload failed");
  await expect(failed).toHaveAttribute("data-type", "error");
  await expect(failed.locator('[data-slot="toast-description"]')).toHaveText(
    "Connection lost. Try again when you’re back online.",
  );
  await failed.hover();
  await shotToasts(page, testInfo, "promise-error");
  await closeAll(page);
});

test("composes a custom layout with an empty state, retry, and swipe", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPage(page);
  const card = section(page, "Custom layout");
  const frame = card.getByTestId("toast-queue-frame");
  await frame.scrollIntoViewIfNeeded();
  await expect(frame.getByText("Upload queue is empty")).toBeVisible();
  await shot(frame, testInfo, "custom-empty");

  await frame.getByRole("button", { name: "Add uploads" }).click();
  const queue = frame.getByRole("region", { name: "Upload queue" });
  await expect(queue.locator('[data-slot="toast"]')).toHaveCount(3);
  await expect(frame.getByText("Upload queue is empty")).toHaveCount(0);
  await queue.locator('[data-slot="toast"]').last().hover();
  await settle(page);
  await expect(queue.getByRole("button", { name: "Retry" })).toHaveCount(1);
  await expect(queue.getByRole("button", { name: "Close toast" })).toHaveCount(
    3,
  );
  for (const item of await queue.locator('[data-slot="toast"]').all()) {
    const [box, bounds] = [
      (await item.boundingBox())!,
      (await frame.boundingBox())!,
    ];
    expect(box.y).toBeGreaterThanOrEqual(bounds.y);
    expect(box.y + box.height).toBeLessThanOrEqual(bounds.y + bounds.height);
  }
  await shot(frame, testInfo, "custom-expanded");

  const failed = queue
    .locator('[data-slot="toast"]')
    .filter({ hasText: "Failed · file is over 50 MB" });
  await failed.getByRole("button", { name: "Retry" }).click();
  await expect(failed).toHaveCount(0);
  await expect(queue.getByText("Retrying with a smaller batch…")).toBeVisible();
  await expect(queue.getByText("Uploaded · 48 MB")).toBeVisible();

  const first = queue
    .locator('[data-slot="toast"]')
    .filter({ hasText: "garden-plan.pdf" });
  await queue.locator('[data-slot="toast"]').last().hover();
  await settle(page);
  const box = (await first.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + box.height / 2);
  await page.mouse.down();
  for (let step = 1; step <= 10; step += 1) {
    await page.mouse.move(box.x + 40 + step * 20, box.y + box.height / 2);
  }
  await page.mouse.up();
  await expect(
    queue.locator('[data-slot="toast"]').filter({ hasText: "garden-plan.pdf" }),
  ).toHaveCount(0);

  const live = queue.locator('[data-slot="toast"]:not([data-ending-style])');
  while ((await live.count()) > 0) {
    await live.first().hover();
    await live.first().getByRole("button", { name: "Close toast" }).click();
    await settle(page);
  }
  await expect(frame.getByText("Upload queue is empty")).toBeVisible();
});

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("slides over 180ms and reflows within 120–180ms", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openPage(page);
    await section(page, "Toast playground")
      .getByRole("button", { name: "Info", exact: true })
      .click();
    const item = toastNamed(page, "New version available");
    await expect(item).toBeVisible();
    const timing = await item.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        property: style.transitionProperty,
        duration: style.transitionDuration,
      };
    });
    expect(timing.property).toBe("transform, opacity, height");
    expect(timing.duration).toBe("0.18s, 0.18s, 0.12s");
    await closeAll(page);
  });
});

test("only fades with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openPage(page);
  await section(page, "Toast playground")
    .getByRole("button", { name: "Info", exact: true })
    .click();
  const item = toastNamed(page, "New version available");
  await expect(item).toBeVisible();
  await expect(item).toHaveCSS("transition-property", "opacity");
  await closeAll(page);
});
