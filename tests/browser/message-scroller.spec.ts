import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { setColorMode } from "./choose-option";

const route = "/components/message-scroller/";
const axeTags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const recipeIds = [
  "conversation",
  "streaming",
  "navigation",
  "opening",
  "buttons",
  "history",
  "states",
] as const;

async function openPage(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await expect(recipe(page, "states")).toBeVisible();
  await expect(page.locator("[data-pending-scroll]")).toHaveCount(0);
}

const recipe = (page: Page, id: string) =>
  page.locator(`[data-recipe="${id}"]`);
const viewportOf = (scope: Locator) =>
  scope.locator('[data-slot="message-scroller-viewport"]');
const endButton = (scope: Locator) =>
  scope.locator('[data-slot="message-scroller-button"][data-direction="end"]');
const startButton = (scope: Locator) =>
  scope.locator(
    '[data-slot="message-scroller-button"][data-direction="start"]',
  );

async function attach(
  testInfo: TestInfo,
  name: string,
  target: Page | Locator,
) {
  const path = testInfo.outputPath(`${name}.png`);
  const shot =
    "goto" in target
      ? await target.screenshot({
          animations: "disabled",
          fullPage: true,
          path,
        })
      : await target.screenshot({ animations: "disabled", path });
  expect(shot.byteLength).toBeGreaterThan(3_000);
  await testInfo.attach(name, { path, contentType: "image/png" });
}

/** Distance from the viewport's bottom edge; 0 means scrolled to the end. */
const fromEnd = (viewport: Locator) =>
  viewport.evaluate((el) =>
    Math.round(el.scrollHeight - el.clientHeight - el.scrollTop),
  );
const scrollTop = (viewport: Locator) =>
  viewport.evaluate((el) => Math.round(el.scrollTop));
/** Resolves once the viewport has held still for a few frames, after keyboard or smooth scrolls. */
const settle = (viewport: Locator) =>
  viewport.evaluate(
    (el) =>
      new Promise<void>((resolve) => {
        let last = el.scrollTop;
        let still = 0;
        const tick = () => {
          still = el.scrollTop === last ? still + 1 : 0;
          last = el.scrollTop;
          if (still >= 5) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
/** Item top relative to the viewport's top edge. */
const offsetIn = (viewport: Locator, id: string) =>
  viewport.evaluate(
    (el, messageId) =>
      Math.round(
        el
          .querySelector(`[data-message-id="${messageId}"]`)!
          .getBoundingClientRect().top - el.getBoundingClientRect().top,
      ),
    id,
  );

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`message scroller ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openPage(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        if (mode === "dark") await setColorMode(page, "Dark");
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        for (const id of recipeIds) {
          const frame = recipe(page, id);
          expect(
            await frame.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          ).toBe(true);
          for (const viewport of await viewportOf(frame).all())
            expect(
              await viewport.evaluate(
                (el) => el.scrollWidth <= el.clientWidth + 1,
              ),
            ).toBe(true);
        }
        // Bubbles keep inside their item, with the item's 16px padding.
        for (const bubble of await recipe(page, "conversation")
          .locator('[data-slot="message-bubble"]')
          .all()) {
          const gap = await bubble.evaluate((el) => {
            const item = el
              .closest('[data-slot="message-scroller-item"]')!
              .getBoundingClientRect();
            const own = el.getBoundingClientRect();
            return Math.min(own.left - item.left, item.right - own.right);
          });
          expect(gap).toBeGreaterThanOrEqual(15);
        }
        const results = await new AxeBuilder({ page })
          .include("main")
          .withTags(axeTags)
          .analyze();
        expect(results.violations).toEqual([]);
        for (const id of recipeIds)
          await attach(
            testInfo,
            `message-scroller-${id}-${theme}-${mode}-${width}`,
            recipe(page, id),
          );
        // Chromium's full-page capture resets scrollers whose items use content-visibility, so it goes last.
        await attach(
          testInfo,
          `message-scroller-${theme}-${mode}-${width}`,
          page,
        );
      });
    }
  }
}

test("the conversation opens at the newest message and pins each added one", async ({
  page,
}) => {
  await openPage(page);
  const frame = recipe(page, "conversation");
  const viewport = viewportOf(frame);
  await expect(viewport).toHaveAttribute("role", "region");
  await expect(viewport).toHaveAccessibleName("Conversation history");
  await expect(frame.getByRole("log")).toBeVisible();
  await expect.poll(() => fromEnd(viewport)).toBeLessThanOrEqual(1);
  await expect(endButton(frame)).toHaveAttribute("data-active", "false");
  await expect(viewport).toHaveAttribute("data-scrollable", "start");

  await frame.getByRole("button", { name: "Add message" }).click();
  const added = frame.locator('[data-message-id="m13"]');
  await expect(added).toHaveAttribute("data-scroll-anchor", "true");
  await expect(frame.locator('[data-scroll-anchor="true"]')).toHaveCount(1);
  // Pinned under the top edge with a 64px peek of the previous message.
  await expect.poll(() => offsetIn(viewport, "m13")).toBe(64);
  await expect(added).toContainText("Remind me on Monday");

  await frame.getByRole("button", { name: "Add message" }).click();
  await expect.poll(() => offsetIn(viewport, "m14")).toBe(64);
});

test("the jump button appears when scrolled up and returns to the end by pointer and keyboard", async ({
  page,
}) => {
  await openPage(page);
  const frame = recipe(page, "conversation");
  const viewport = viewportOf(frame);
  const button = endButton(frame);
  await expect.poll(() => fromEnd(viewport)).toBeLessThanOrEqual(1);
  await expect(button).toHaveAttribute("inert", "");
  expect(await button.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");

  await viewport.focus();
  await expect(viewport).toBeFocused();
  await page.keyboard.press("Home");
  await expect.poll(() => scrollTop(viewport)).toBe(0);
  await settle(viewport);
  await expect(button).toHaveAttribute("data-active", "true");
  await expect(button).not.toHaveAttribute("inert", "");
  await expect(viewport).toHaveAttribute("data-scrollable", "end");
  await expect(button).toHaveAccessibleName("Scroll to newest message");
  const box = (await button.boundingBox())!;
  const frameBox = (await viewport.boundingBox())!;
  expect(box.width).toBe(28);
  expect(
    Math.abs(box.x + box.width / 2 - (frameBox.x + frameBox.width / 2)),
  ).toBeLessThanOrEqual(1);
  expect(Math.round(frameBox.y + frameBox.height - (box.y + box.height))).toBe(
    16,
  );
  await expect
    .poll(() => button.evaluate((el) => getComputedStyle(el).opacity))
    .toBe("1");

  await button.click();
  await expect.poll(() => fromEnd(viewport)).toBeLessThanOrEqual(1);
  await expect(button).toHaveAttribute("data-active", "false");
  await expect(button).not.toBeFocused();

  // Keyboard: Page Up from the region, Tab to the button, Enter.
  await viewport.focus();
  await page.keyboard.press("PageUp");
  await settle(viewport);
  await expect(button).toHaveAttribute("data-active", "true");
  await page.keyboard.press("Tab");
  await expect(button).toBeFocused();
  await expect(button).not.toHaveAttribute("tabindex", "-1");
  await page.keyboard.press("Enter");
  await expect.poll(() => fromEnd(viewport)).toBeLessThanOrEqual(1);
  await expect(button).toHaveAttribute("data-active", "false");
});

test("autoScroll follows a streaming reply only while the reader stays at the end", async ({
  page,
}) => {
  await openPage(page);
  const frame = recipe(page, "streaming");
  const viewport = viewportOf(frame);
  await frame.getByRole("button", { name: "Send" }).click();
  await expect(frame.locator('[data-message-id="s7"]')).toHaveAttribute(
    "data-scroll-anchor",
    "true",
  );
  await expect(frame.locator('[data-message-id="s8"]')).toContainText(
    "Jordan can approve it.",
    { timeout: 10_000 },
  );
  await expect(frame.getByRole("button", { name: "Send" })).toBeDisabled();
  await expect.poll(() => fromEnd(viewport)).toBeLessThanOrEqual(1);

  // Without following, the sent turn stays pinned while the reply grows below.
  await frame.getByRole("switch", { name: "Follow replies" }).click();
  await frame
    .getByRole("textbox", { name: "Message" })
    .fill("Can we add a second run?");
  await frame.getByRole("button", { name: "Send" }).click();
  await expect(frame.locator('[data-message-id="s10"]')).toContainText(
    "Jordan can approve it.",
    { timeout: 10_000 },
  );
  await expect.poll(() => offsetIn(viewport, "s9")).toBe(64);
});

test("hooks jump to messages and report edges and visible items", async ({
  page,
}) => {
  await openPage(page);
  const frame = recipe(page, "navigation");
  const viewport = viewportOf(frame);
  await expect(frame.getByTestId("edge-start")).toHaveText("Yes");
  await expect(frame.getByTestId("edge-end")).toHaveText("No");
  await expect(frame.getByTestId("visible-ids")).toContainText("m12");

  await frame
    .getByRole("button", { name: "First message", exact: true })
    .click();
  await expect.poll(() => scrollTop(viewport)).toBe(0);
  await expect(frame.getByTestId("edge-start")).toHaveText("No");
  await expect(frame.getByTestId("edge-end")).toHaveText("Yes");
  await expect(frame.getByTestId("visible-ids")).toContainText("m1");
  await expect(startButton(frame)).toHaveAttribute("data-active", "false");
  await expect(endButton(frame)).toHaveAttribute("data-active", "true");

  await frame
    .getByRole("button", { name: "Draft to Robin", exact: true })
    .click();
  await expect.poll(() => offsetIn(viewport, "m7")).toBe(0);
  await expect(frame.getByTestId("visible-ids")).toContainText("m7");
  await expect(startButton(frame)).toHaveAttribute("data-active", "true");

  await frame
    .getByRole("group", { name: "Align" })
    .getByRole("button", { name: "Center" })
    .click();
  await frame
    .getByRole("button", { name: "Draft to Robin", exact: true })
    .click();
  await expect
    .poll(() =>
      viewport.evaluate((el) => {
        const item = el
          .querySelector('[data-message-id="m7"]')!
          .getBoundingClientRect();
        const box = el.getBoundingClientRect();
        return Math.abs(
          item.top + item.height / 2 - (box.top + box.height / 2),
        );
      }),
    )
    .toBeLessThanOrEqual(2);

  await frame
    .getByRole("group", { name: "Align" })
    .getByRole("button", { name: "End" })
    .click();
  await frame
    .getByRole("button", { name: "Draft to Robin", exact: true })
    .click();
  await expect
    .poll(() =>
      viewport.evaluate((el) =>
        Math.round(
          el.getBoundingClientRect().bottom -
            el.querySelector('[data-message-id="m7"]')!.getBoundingClientRect()
              .bottom,
        ),
      ),
    )
    .toBe(0);

  // The start button sits at the top and points up.
  await startButton(frame).click();
  await expect.poll(() => scrollTop(viewport)).toBe(0);
  await frame
    .getByRole("button", { name: "Latest reply", exact: true })
    .click();
  await expect.poll(() => fromEnd(viewport)).toBeLessThanOrEqual(1);
  await expect(frame.getByTestId("anchor-id")).not.toHaveText("");
});

test("the opening position is the last anchor, the end, or the start", async ({
  page,
}) => {
  await openPage(page);
  const frame = recipe(page, "opening");
  const viewport = () => viewportOf(frame);
  const positions = frame.getByRole("group", { name: "Opens at" });
  // The long reply doesn't fit below the question, so the question is pinned with a 64px peek.
  await expect.poll(() => offsetIn(viewport(), "m5")).toBe(64);
  await expect(endButton(frame)).toHaveAttribute("data-active", "true");
  await expect(startButton(frame)).toHaveAttribute("data-active", "true");

  await positions.getByRole("button", { name: "End" }).click();
  await expect.poll(() => fromEnd(viewport())).toBeLessThanOrEqual(1);
  await expect(endButton(frame)).toHaveAttribute("data-active", "false");

  await positions.getByRole("button", { name: "Start" }).click();
  await expect.poll(() => scrollTop(viewport())).toBe(0);
  await expect(startButton(frame)).toHaveAttribute("data-active", "false");
  await expect(endButton(frame)).toHaveAttribute("data-active", "true");
});

test("each jump button pairing keeps its variant, size, and place", async ({
  page,
}) => {
  await openPage(page);
  const expected = {
    "secondary-icon-sm": {
      variant: "secondary",
      size: "icon-sm",
      name: "Scroll to newest message",
      width: 28,
    },
    "outline-sm": {
      variant: "outline",
      size: "sm",
      name: "New replies",
      width: 0,
    },
    "default-icon": {
      variant: "default",
      size: "icon",
      name: "Scroll to newest message",
      width: 32,
    },
  } as const;
  for (const [id, want] of Object.entries(expected)) {
    const pairing = page.locator(`[data-pairing="${id}"]`);
    const button = endButton(pairing);
    await expect(button).toHaveAttribute("data-variant", want.variant);
    await expect(button).toHaveAttribute("data-size", want.size);
    await expect(button).toHaveAttribute("data-active", "true");
    await expect(button).toHaveAccessibleName(want.name);
    const box = (await button.boundingBox())!;
    const frame = (await viewportOf(pairing).boundingBox())!;
    if (want.width) expect(box.width).toBe(want.width);
    else expect(box.width).toBeGreaterThan(80);
    expect(box.x).toBeGreaterThanOrEqual(frame.x);
    expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width);
    await button.click();
    await expect
      .poll(() => fromEnd(viewportOf(pairing)))
      .toBeLessThanOrEqual(1);
    await expect(button).toHaveAttribute("data-active", "false");
  }
});

test("loading earlier messages keeps the reader's place unless turned off", async ({
  page,
}) => {
  await openPage(page);
  const frame = recipe(page, "history");
  const viewport = viewportOf(frame);
  await expect.poll(() => fromEnd(viewport)).toBeLessThanOrEqual(1);
  const before = await offsetIn(viewport, "m9");
  await frame.getByRole("button", { name: "Load earlier messages" }).click();
  await expect(frame.locator('[data-message-id="e1"]')).toBeAttached();
  await expect.poll(() => offsetIn(viewport, "m9")).toBe(before);

  await frame.getByRole("button", { name: "Reset" }).click();
  await frame.getByRole("switch", { name: "Keep place" }).click();
  await viewport.focus();
  await page.keyboard.press("Home");
  await expect.poll(() => scrollTop(viewport)).toBe(0);
  const top = await offsetIn(viewport, "m5");
  await frame.getByRole("button", { name: "Load earlier messages" }).click();
  await expect(frame.locator('[data-message-id="e1"]')).toBeAttached();
  await expect.poll(() => scrollTop(viewport)).toBe(0);
  expect(await offsetIn(viewport, "m5")).toBeGreaterThan(top);
});

test("empty, loading, and error states fill the scroller", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const frame = recipe(page, "states");
  const window = frame.getByTestId("states");
  const states = frame.getByRole("group", { name: "State" });
  await expect(
    window.getByRole("status", { name: "Loading conversation" }),
  ).toBeVisible();
  await expect(viewportOf(frame)).toHaveAttribute("aria-busy", "true");
  await attach(testInfo, "message-scroller-state-loading", frame);

  await states.getByRole("button", { name: "Empty" }).click();
  await expect(window.getByText("No messages yet")).toBeVisible();
  await expect(viewportOf(frame)).not.toHaveAttribute("aria-busy");
  await expect(endButton(frame)).toHaveAttribute("data-active", "false");
  await attach(testInfo, "message-scroller-state-empty", frame);

  await states.getByRole("button", { name: "Error" }).click();
  await expect(
    window.getByText("Couldn’t load this conversation"),
  ).toBeVisible();
  await attach(testInfo, "message-scroller-state-error", frame);
  await window.getByRole("button", { name: "Try again" }).click();
  await expect(
    window.locator('[data-slot="message-scroller-item"]'),
  ).toHaveCount(8);
  await expect(window).toHaveAttribute("data-state", "ready");
});

test("motion is 180ms with slide, and opacity-only under reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  const button = endButton(recipe(page, "conversation"));
  const motion = () =>
    button.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        property: style.transitionProperty,
        duration: style.transitionDuration,
        translate: style.translate,
      };
    });
  const full = await motion();
  expect(full.property).toContain("translate");
  expect(full.property).toContain("opacity");
  expect(full.duration).toContain("0.18s");
  expect(full.translate).not.toBe("-50%");

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await motion();
  expect(reduced.property).toBe("opacity");
  expect(reduced.duration).toBe("0.12s");
});
