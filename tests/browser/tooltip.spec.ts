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
  await page.goto("/components/tooltip/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const section = (page: Page, name: string) =>
  page.getByRole("region", { name, exact: true });
// A closing tooltip stays mounted for a frame while its exit style applies.
const tooltip = (page: Page) =>
  page.getByRole("tooltip").and(page.locator("[data-open]"));

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

async function shot(target: Page | Locator, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await target.screenshot({ path });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function center(target: Locator) {
  await target.evaluate((element) =>
    element.scrollIntoView({ block: "center", inline: "center" }),
  );
}

async function expectInViewport(page: Page, target: Locator) {
  const box = (await target.boundingBox())!;
  const width = await page.evaluate(() => innerWidth);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
}

async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Moves the pointer away so the open tooltip closes. */
async function leave(page: Page) {
  await page.mouse.move(1, 1);
  await expect(tooltip(page)).toHaveCount(0);
}

/** A hover box around trigger and tooltip so the screenshot shows both. */
async function shotAround(
  page: Page,
  trigger: Locator,
  testInfo: TestInfo,
  name: string,
) {
  const [a, b] = [
    (await trigger.boundingBox())!,
    (await tooltip(page).boundingBox())!,
  ];
  const width = await page.evaluate(() => innerWidth);
  const x = Math.max(0, Math.min(a.x, b.x) - 24);
  const y = Math.max(0, Math.min(a.y, b.y) - 24);
  const right = Math.min(width, Math.max(a.x + a.width, b.x + b.width) + 24);
  const bottom = Math.max(a.y + a.height, b.y + b.height) + 24;
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({
    path,
    clip: { x, y, width: right - x, height: bottom - y },
  });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

for (const theme of ["neutral", "tulipfarm"] as const) {
  for (const mode of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`renders every example in ${theme} ${mode} at ${width}px`, async ({
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

        const playground = section(page, "Tooltip playground");
        for (const side of ["top", "right", "bottom", "left"]) {
          const trigger = playground.getByRole("button", {
            name: side,
            exact: true,
          });
          await center(trigger);
          await trigger.hover();
          await expect(tooltip(page)).toHaveText(
            `Helpful information on the ${side}.`,
          );
          await expectInViewport(page, tooltip(page));
          if (width > 600)
            await expect(tooltip(page)).toHaveAttribute("data-side", side);
          await expect(
            tooltip(page).locator('[data-slot="tooltip-arrow"]'),
          ).toBeVisible();
          await shotAround(
            page,
            trigger,
            testInfo,
            `${theme}-${mode}-${width}-side-${side}`,
          );
        }
        await axe(page);
        await leave(page);

        const composer = section(page, "Composer toolbar");
        const mode_ = composer.getByRole("combobox", { name: "Chat mode" });
        await center(mode_);
        await mode_.hover();
        await expect(tooltip(page)).toHaveText(
          "Normal acts on your request. Plan only proposes steps first.",
        );
        await expectInViewport(page, tooltip(page));
        await shot(composer, testInfo, `${theme}-${mode}-${width}-composer`);
        await leave(page);

        const hints = section(page, "Column hints");
        const about = hints.getByRole("button", { name: "About Fallback" });
        await center(about);
        await about.hover();
        await expect(tooltip(page)).toHaveText(
          "If a model is unavailable, chats switch to its fallback.",
        );
        await expectInViewport(page, tooltip(page));
        await shot(hints, testInfo, `${theme}-${mode}-${width}-column-hints`);
        await leave(page);

        await shot(
          section(page, "App tiles"),
          testInfo,
          `${theme}-${mode}-${width}-app-tiles`,
        );
        await shot(
          section(page, "Collapsed sidebar"),
          testInfo,
          `${theme}-${mode}-${width}-sidebar`,
        );
        await expectNoOverflow(page);
      });
    }
  }
}

test("opens on keyboard focus, describes the trigger, and closes on Escape", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const playground = section(page, "Tooltip playground");
  await playground.getByRole("button", { name: "End" }).focus();
  await page.keyboard.press("Tab");
  const top = playground.getByRole("button", { name: "top", exact: true });
  await expect(top).toBeFocused();
  await expect(tooltip(page)).toHaveText("Helpful information on the top.");
  await expect(tooltip(page)).toHaveAttribute("data-side", "top");
  const id = await tooltip(page).getAttribute("id");
  expect(id).toBeTruthy();
  await expect(top).toHaveAttribute("aria-describedby", id!);
  await expect(top).toHaveAccessibleDescription(
    "Helpful information on the top.",
  );
  await shotAround(page, top, testInfo, "keyboard-focus");

  await page.keyboard.press("Tab");
  const right = playground.getByRole("button", { name: "right", exact: true });
  await expect(right).toBeFocused();
  await expect(tooltip(page)).toHaveText("Helpful information on the right.");
  await expect(top).not.toHaveAttribute("aria-describedby", /.+/);

  await page.keyboard.press("Escape");
  await expect(tooltip(page)).toHaveCount(0);
  await expect(right).toBeFocused();
  await expect(right).not.toHaveAttribute("aria-describedby", /.+/);
});

test("aligns start, center, and end", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page);
  const playground = section(page, "Tooltip playground");
  const bottom = playground.getByRole("button", {
    name: "bottom",
    exact: true,
  });
  for (const align of ["Start", "Center", "End"]) {
    const toggle = playground.getByRole("button", { name: align });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await bottom.hover();
    await expect(tooltip(page)).toHaveAttribute(
      "data-align",
      align.toLowerCase(),
    );
    const [box, anchor] = [
      (await tooltip(page).boundingBox())!,
      (await bottom.boundingBox())!,
    ];
    if (align === "Start") expect(Math.abs(box.x - anchor.x)).toBeLessThan(2);
    if (align === "End")
      expect(
        Math.abs(box.x + box.width - anchor.x - anchor.width),
      ).toBeLessThan(2);
    if (align === "Center") {
      expect(
        Math.abs(box.x + box.width / 2 - anchor.x - anchor.width / 2),
      ).toBeLessThan(2);
    }
    expect(box.y).toBeGreaterThan(anchor.y + anchor.height);
    await shotAround(page, bottom, testInfo, `align-${align.toLowerCase()}`);
    await leave(page);
  }
});

test("a provider opens neighbouring tooltips without delay", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page);
  const playground = section(page, "Tooltip playground");
  await playground.getByRole("button", { name: "top", exact: true }).hover();
  await expect(tooltip(page)).toHaveText("Helpful information on the top.");
  await playground.getByRole("button", { name: "right", exact: true }).hover();
  await expect(tooltip(page)).toHaveText("Helpful information on the right.");
  await expect(tooltip(page)).toHaveAttribute("data-instant", /.*/);
  await expect(tooltip(page)).toHaveCount(1);
});

test("composer triggers keep their own behaviour", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page);
  const composer = section(page, "Composer toolbar");
  await center(composer);
  const status = composer.getByRole("status");
  await expect(status).toHaveText("Type a message to enable Send.");

  const attach = composer.getByRole("button", { name: "Attach files" });
  await attach.hover();
  await expect(tooltip(page)).toHaveText("Attach files from your device");
  await attach.click();
  await expect(status).toHaveText("1 file attached.");

  const skills = composer.getByRole("button", { name: "Use a skill" });
  await expect(skills).toContainText("Skills");
  await skills.hover();
  await expect(tooltip(page)).toHaveText(
    "Skills are saved procedures the agent follows · /",
  );

  const chatMode = composer.getByRole("combobox", { name: "Chat mode" });
  await chatMode.hover();
  await expect(tooltip(page)).toHaveText(/Plan only proposes steps first/);
  const modeBox = (await tooltip(page).boundingBox())!;
  expect(modeBox.width).toBeLessThanOrEqual(320.5);
  await shotAround(page, chatMode, testInfo, "composer-mode-tooltip");
  await chatMode.click();
  await expect(tooltip(page)).toHaveCount(0);
  await page.getByRole("option", { name: "Plan only" }).click();
  await expect(chatMode).toHaveText("Plan");
  await expect(status).toContainText("Plan only.");

  const model = composer.getByRole("button", { name: "Model: Claude Sonnet" });
  await model.hover();
  await expect(tooltip(page)).toHaveText("AI model that writes replies");
  await shotAround(page, model, testInfo, "composer-model-tooltip");
  await model.click();
  await expect(model).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("group", { name: "Models" })
    .getByRole("button", { name: "GPT-5 mini" })
    .click();
  await expect(
    composer.getByRole("button", { name: "Model: GPT-5 mini" }),
  ).toBeVisible();

  const send = composer.getByRole("button", { name: "Send message" });
  await expect(send).toBeDisabled();
  await send.hover({ force: true });
  await page.waitForTimeout(250);
  await expect(tooltip(page)).toHaveCount(0);

  await composer
    .getByRole("textbox", { name: "Message" })
    .fill("Summarize the launch notes");
  await expect(send).toBeEnabled();
  await send.hover();
  await expect(tooltip(page)).toHaveText("Send · Enter");
  await shotAround(page, send, testInfo, "composer-send-tooltip");
  await composer.getByRole("textbox", { name: "Message" }).press("Enter");
  await expect(status).toContainText("Sending…");
  const stop = composer.getByRole("button", { name: "Stop reply" });
  await stop.hover();
  await expect(tooltip(page)).toHaveText("Stop reply");
  await stop.click();
  await expect(status).toContainText("Reply stopped.");
});

test("column hints and brand tiles describe themselves", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page);
  const hints = section(page, "Column hints");
  for (const [label, hint] of [
    ["Rates", "Credits per 1M input / output tokens."],
    ["Fallback", "If a model is unavailable, chats switch to its fallback."],
    ["Access", "Turned-off models can't be picked or used as a fallback."],
  ]) {
    const button = hints.getByRole("button", { name: `About ${label}` });
    await center(button);
    await button.hover();
    await expect(tooltip(page)).toHaveText(hint);
    await expect(tooltip(page)).toHaveAttribute("data-side", "top");
  }
  await shotAround(
    page,
    hints.getByRole("button", { name: "About Access" }),
    testInfo,
    "column-hint",
  );
  await leave(page);

  const tiles = section(page, "App tiles");
  await center(tiles);
  const stack = tiles.getByRole("img", { name: /Slack/ });
  await stack.locator('[data-slot="tooltip-trigger"]').nth(1).hover();
  await expect(tooltip(page)).toHaveText("Notion");
  await expect(page.locator(".sprout-brand-tooltip")).toBeVisible();
  await shotAround(page, stack, testInfo, "brand-stack");
  await leave(page);

  const linear = tiles.getByRole("button", { name: "Linear" });
  const openNow = () =>
    page.evaluate(
      () => document.querySelectorAll('[role="tooltip"][data-open]').length,
    );
  await linear.focus();
  await expect(tooltip(page)).toHaveText("Linear · Synced 2 minutes ago");
  // Moving focus to another trigger swaps tooltips without ever showing two.
  await page.keyboard.press("Shift+Tab");
  expect(await openNow()).toBe(1);
  await expect(tooltip(page)).toHaveText(
    "Turned-off models can't be picked or used as a fallback.",
  );
  await page.keyboard.press("Tab");
  expect(await openNow()).toBe(1);
  await expect(linear).toBeFocused();
  await expect(tooltip(page)).toHaveText("Linear · Synced 2 minutes ago");
  await shotAround(page, linear, testInfo, "brand-tile");
});

test("collapsed sidebar shows labels beside the rail only while collapsed", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page);
  const example = section(page, "Collapsed sidebar");
  await center(example);

  const home = example.getByRole("link", { name: "Home", exact: true });
  await home.hover();
  await expect(tooltip(page)).toHaveText("Home");
  await expect(tooltip(page)).toHaveAttribute("data-side", "right");
  await expect(page.locator(".sprout-sidebar-tooltip")).toBeVisible();
  await shotAround(page, home, testInfo, "sidebar-home");

  const jump = example.getByRole("button", { name: "Jump to…" });
  await expect(jump).toHaveAttribute("aria-keyshortcuts", "Meta+K Control+K");
  await jump.hover();
  await expect(tooltip(page)).toHaveText("Jump to… ⌘K");
  await expect(tooltip(page)).toHaveClass(/tooltip-demo-jump/);
  await jump.click();
  await expect(example).toContainText("Jump to opened 1×");

  const account = example.getByRole("button", { name: "Account menu" });
  await account.hover();
  await expect(tooltip(page)).toHaveText("Account");
  await account.click();
  await expect(page.getByRole("menu")).toBeVisible();
  await expect(tooltip(page)).toHaveCount(0);
  await shot(example, testInfo, "sidebar-account-menu");
  await page.getByRole("menuitem", { name: "Settings" }).click();

  const back = example.getByRole("link", { name: "Back to app" });
  await back.hover();
  await expect(tooltip(page)).toHaveText("Back to app");
  await back.click();
  await expect(
    example.getByRole("link", { name: "Home", exact: true }),
  ).toBeVisible();

  await example.getByRole("button", { name: "Show labels" }).click();
  await expect(
    example.getByRole("button", { name: "Hide labels" }),
  ).toBeVisible();
  await example.getByRole("link", { name: "Chats", exact: true }).hover();
  await page.waitForTimeout(400);
  await expect(tooltip(page)).toHaveCount(0);
  await shot(example, testInfo, "sidebar-expanded");
});

test("mobile sidebar is a drawer without tooltips", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page);
  const example = section(page, "Collapsed sidebar");
  await center(example);
  await example.getByRole("button", { name: "Show labels" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await drawer.getByRole("link", { name: "Chats", exact: true }).hover();
  await page.waitForTimeout(400);
  await expect(tooltip(page)).toHaveCount(0);
  await shot(page, testInfo, "mobile-drawer");
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
});

test("mobile composer hides the skills label and keeps tooltips on screen", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page);
  const composer = section(page, "Composer toolbar");
  await center(composer);
  const skills = composer.getByRole("button", { name: "Use a skill" });
  await expect(skills.getByText("Skills")).toBeHidden();
  await skills.hover();
  await expect(tooltip(page)).toHaveText(
    "Skills are saved procedures the agent follows · /",
  );
  await expectInViewport(page, tooltip(page));
  await shotAround(page, skills, testInfo, "mobile-skills");
  const model = composer.getByRole("button", { name: /^Model:/ });
  await model.hover();
  await expectInViewport(page, tooltip(page));
  await expectNoOverflow(page);
});

test("reduced motion turns the transition off", async ({ page }) => {
  await openPage(page);
  const top = section(page, "Tooltip playground").getByRole("button", {
    name: "top",
    exact: true,
  });
  await top.hover();
  await expect(tooltip(page)).toHaveCSS("transition-duration", "0s");
});

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("fades in over the fast motion token", async ({ page }) => {
    await openPage(page);
    const top = section(page, "Tooltip playground").getByRole("button", {
      name: "top",
      exact: true,
    });
    await top.hover();
    await expect(tooltip(page)).toBeVisible();
    const duration = await tooltip(page).evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    );
    expect(duration.split(",")[0].trim()).toBe("0.12s");
    await expect(tooltip(page)).toHaveCSS("opacity", "1");
  });
});
