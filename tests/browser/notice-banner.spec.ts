import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/notice-banner/";

async function openDemo(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#notice-banner-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

async function resolveColor(page: Page, value: string) {
  return page.evaluate((color) => {
    const probe = document.createElement("span");
    probe.style.color = color;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  }, value);
}

async function shoot(
  locator: Locator,
  testInfo: import("@playwright/test").TestInfo,
  name: string,
) {
  const path = testInfo.outputPath(`${name}.png`);
  const shot = await locator.screenshot({ animations: "disabled", path });
  await testInfo.attach(name, { path, contentType: "image/png" });
  return shot;
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`notice banner ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openDemo(page);
        await page.evaluate(
          (value) =>
            document.documentElement.setAttribute("data-sprout-theme", value),
          theme,
        );
        await chooseOption(
          page,
          "Color mode",
          mode === "light" ? "Light" : "Dark",
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);

        const banner = page
          .getByTestId("flow-frame")
          .getByRole("region", { name: "Integration authorization" });
        await expect(banner).toHaveCSS(
          "background-color",
          await resolveColor(page, "var(--sprout-surface)"),
        );
        await expect(banner).toHaveCSS(
          "color",
          await resolveColor(page, "var(--sprout-muted)"),
        );
        await expect(banner).toHaveCSS(
          "border-bottom-color",
          await resolveColor(page, "var(--sprout-line)"),
        );

        for (const node of await demo
          .locator(
            '.notice-banner-demo-card-body, [data-slot="notice-banner"], [data-slot="notice-banner-actions"]',
          )
          .all())
          expect(
            await node.evaluate((n) => n.scrollWidth <= n.clientWidth + 0.5),
          ).toBe(true);

        const results = await new AxeBuilder({ page })
          .include("#notice-banner-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const shot = await shoot(
          demo,
          testInfo,
          `notice-banner-${theme}-${mode}-${width}`,
        );
        expect(shot.byteLength).toBeGreaterThan(10_000);
      });
    }
  }
}

test("stacks on small screens and sits on one row from 640px", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 900 });
  await openDemo(page);
  const banner = page
    .getByTestId("flow-frame")
    .locator('[data-slot="notice-banner"]');
  const actions = banner.locator('[data-slot="notice-banner-actions"]');
  await expect(banner).toHaveCSS("flex-direction", "column");
  await expect(banner).toHaveCSS("row-gap", "8px");
  await expect(banner).toHaveCSS("padding", "8px 16px");
  await expect(banner).toHaveCSS("font-size", "14px");
  await expect(banner).toHaveCSS("border-bottom-width", "1px");
  const content = await banner
    .locator('[data-slot="notice-banner-content"]')
    .boundingBox();
  const row = await actions.boundingBox();
  expect(Math.abs(row!.width - content!.width)).toBeLessThan(1);
  const trigger = await actions.getByRole("combobox").boundingBox();
  expect(Math.abs(trigger!.width - row!.width)).toBeLessThan(1);
  expect(row!.y).toBeGreaterThan(content!.y + content!.height - 1);

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(banner).toHaveCSS("flex-direction", "row");
  await expect(banner).toHaveCSS("align-items", "center");
  await expect(banner).toHaveCSS("column-gap", "16px");
  await expect(banner).toHaveCSS("padding", "8px 24px");
  const wide = await actions.getByRole("combobox").boundingBox();
  expect(Math.round(wide!.width)).toBe(256);
  const action = actions.getByRole("button");
  await expect(action).toHaveAttribute("data-size", "default");
  await expect(action).toHaveCSS("height", "28px");
  await expect(action).toHaveCSS("font-size", "14px");
  await expect(actions.getByRole("combobox")).toHaveCSS("height", "32px");
});

test("shows every Cloud reauthorization state", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openDemo(page);
  const card = example(page, "Integration authorization states");
  const frames = card.getByTestId("state-frame");
  await expect(frames).toHaveCount(8);
  const expected = [
    {
      role: "status",
      text: "Google Calendar (robin@greenhouse.example) needs authorization. Approve the updated permissions to continue.",
      button: "Update permissions",
      select: false,
      busy: false,
    },
    {
      role: "status",
      text: "GitHub (@garden-bot) needs authorization. GitHub reads and actions with this account need renewed access.",
      button: "Update permissions",
      select: false,
      busy: false,
    },
    {
      role: "status",
      text: "Your Slack account needs authorization. Tasks using Your Slack account need renewed access.",
      button: "Update permissions",
      select: false,
      busy: false,
    },
    {
      role: "status",
      text: "3 integrations need authorization. Approve the updated permissions to continue.",
      button: "Update permissions",
      select: true,
      busy: false,
    },
    {
      role: "status",
      text: "3 integrations need authorization. Approve the updated permissions to continue.",
      button: "Please wait...",
      select: true,
      busy: true,
    },
    {
      role: "status",
      text: "Seed catalog MCP needs authorization. Tasks using Seed catalog MCP need renewed access.",
      button: "Please wait...",
      select: false,
      busy: true,
    },
    {
      role: "alert",
      text: "Authorization could not be opened. Check integration status before trying again.",
      button: "Check integration status",
      select: false,
      busy: false,
    },
    {
      role: "alert",
      text: "Integration status could not refresh. Check integration status before trying again.",
      button: "Check integration status",
      select: false,
      busy: false,
    },
  ];
  const warning = await resolveColor(page, "var(--sprout-warning)");
  for (const [index, state] of expected.entries()) {
    const banner = frames
      .nth(index)
      .getByRole("region", { name: "Integration authorization" });
    await expect(banner.getByRole(state.role as "status")).toHaveText(
      state.text,
    );
    const button = banner.getByRole("button", { name: state.button });
    await expect(button).toHaveAttribute("aria-busy", String(state.busy));
    if (state.busy)
      await expect(button).toHaveAttribute("aria-disabled", "true");
    else await expect(button).toBeEnabled();
    await expect(button).toHaveAttribute("data-variant", "outline");
    const select = banner.getByRole("combobox", {
      name: "Integration to reauthorize",
    });
    await expect(select).toHaveCount(state.select ? 1 : 0);
    if (state.select && state.busy) await expect(select).toBeDisabled();
    if (state.role === "status")
      await expect(banner.locator(".notice-banner-demo-lead")).toHaveCSS(
        "color",
        warning,
      );
  }
  await expect(
    card.getByTestId("empty-frame").locator('[data-slot="notice-banner"]'),
  ).toHaveCount(0);
  await shoot(card, testInfo, "notice-banner-states");
});

test("keyboard drives the reauthorization flow", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openDemo(page);
  const frame = page.getByTestId("flow-frame");
  const banner = frame.getByRole("region", {
    name: "Integration authorization",
  });
  const picker = banner.getByRole("combobox", {
    name: "Integration to reauthorize",
  });
  const log = page.getByRole("log", { name: "Sample events" });

  await picker.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.getByRole("option", { name: "GitHub (@garden-bot)" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(picker).toHaveText("GitHub (@garden-bot)");
  await expect(banner.getByRole("status")).toHaveText(
    "3 integrations need authorization. GitHub reads and actions with this account need renewed access.",
  );

  await page.keyboard.press("Tab");
  const action = banner.getByRole("button");
  await expect(action).toBeFocused();
  await expect(action).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(action).toHaveText("Please wait...");
  await expect(action).toHaveAttribute("aria-busy", "true");
  await expect(action).toBeFocused();
  await expect(picker).toBeDisabled();
  await shoot(frame, testInfo, "notice-banner-busy");
  await expect(banner.getByRole("status")).toHaveText(
    "2 integrations need authorization. Approve the updated permissions to continue.",
  );
  await expect(log).toHaveText(
    "Sample consent for GitHub (@garden-bot) completed. Nothing was sent.",
  );
  await expect(action).toBeFocused();

  await chooseOption(page, "Consent outcome", "Consent fails");
  await chooseOption(page, "Status refresh outcome", "Status fails");
  await action.focus();
  await page.keyboard.press("Enter");
  await expect(banner.getByRole("alert")).toHaveText(
    "Authorization could not be opened. Check integration status before trying again.",
  );
  await expect(action).toHaveText("Check integration status");
  await expect(action).toBeFocused();
  await shoot(frame, testInfo, "notice-banner-failed");
  await page.keyboard.press("Enter");
  await expect(action).toHaveText("Please wait...");
  await expect(banner.getByRole("alert")).toHaveText(
    "Integration status could not refresh. Check integration status before trying again.",
  );
  await chooseOption(page, "Status refresh outcome", "Status refreshes");
  await action.focus();
  await page.keyboard.press("Enter");
  await expect(action).toHaveText("Update permissions");
  await expect(banner.getByRole("status")).toBeVisible();

  await chooseOption(page, "Consent outcome", "Consent opens");
  await chooseOption(
    page,
    "Integrations needing authorization",
    "One integration",
  );
  await expect(picker).toHaveCount(0);
  await expect(banner.getByRole("status")).toHaveText(
    "Google Calendar (robin@greenhouse.example) needs authorization. Approve the updated permissions to continue.",
  );
  await action.focus();
  await page.keyboard.press("Space");
  await expect(frame.locator('[data-slot="notice-banner"]')).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Reset sample" }),
  ).toBeFocused();
  await shoot(frame, testInfo, "notice-banner-resolved");
  await page.keyboard.press("Enter");
  await expect(banner.getByRole("status")).toBeVisible();
});

test("playground notice dismisses and returns focus", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDemo(page);
  const card = example(page, "Notice with actions");
  const banner = card.getByRole("region", { name: "Example notice" });
  await expect(banner).toContainText(
    "This is an example notice. No integration is being monitored.",
  );
  const dismiss = banner.getByRole("button", { name: "Dismiss" });
  await expect(dismiss).toHaveAttribute("data-size", "sm");
  await expect(dismiss).toHaveCSS("height", "28px");
  await expect(dismiss).toHaveCSS("font-size", "12px");
  await shoot(card, testInfo, "notice-banner-playground");
  await dismiss.focus();
  await page.keyboard.press("Enter");
  await expect(banner).toHaveCount(0);
  const again = card.getByRole("button", { name: "Show notice again" });
  await expect(again).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(card.getByRole("button", { name: "Dismiss" })).toBeFocused();
});

test("enters with motion only when motion is allowed", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDemo(page);
  const banner = example(page, "Notice with actions").locator(
    '[data-slot="notice-banner"]',
  );
  await expect(banner).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(banner).toHaveCSS("animation-name", "sprout-notice-banner-in");
  await expect(banner).toHaveCSS("animation-duration", "0.18s");
});

test("long names wrap without overflow on mobile", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 900 });
  await openDemo(page);
  for (const frame of await page.getByTestId("state-frame").all()) {
    const banner = frame.locator('[data-slot="notice-banner"]');
    expect(
      await banner.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    for (const control of await banner
      .locator('[data-slot="notice-banner-actions"] > *')
      .all()) {
      const box = await control.boundingBox();
      const outer = await banner.boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(
        outer!.x + outer!.width + 0.5,
      );
    }
  }
});
