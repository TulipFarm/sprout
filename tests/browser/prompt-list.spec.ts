import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption, setColorMode } from "./choose-option";

const route = "/components/prompt-list/";

async function openPage(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const recipe = (page: Page, id: string) =>
  page.locator(`[data-recipe="${id}"]`);
const list = (scope: Page | Locator, name: string) =>
  scope
    .locator('[data-slot="prompt-list"]')
    .and(scope.getByRole("region", { name, exact: true }));
const result = (page: Page) => page.getByTestId("starting-tasks-result");

async function cssColor(page: Page, value: string) {
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
  name: string,
  testInfo: import("@playwright/test").TestInfo,
) {
  const path = testInfo.outputPath(`${name}.png`);
  const shot = await locator.screenshot({ animations: "disabled", path });
  await testInfo.attach(name, { path, contentType: "image/png" });
  return shot;
}

test.describe("visual matrix", () => {
  test.use({ reducedMotion: "reduce" });
  for (const theme of ["neutral", "tulipfarm"]) {
    for (const mode of ["light", "dark"] as const) {
      for (const width of [390, 1440]) {
        test(`prompt list ${theme} ${mode} at ${width}px`, async ({
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
          const start = recipe(page, "starting-tasks");
          await start.getByRole("button", { name: "More tasks (2)" }).click();
          await start
            .getByRole("button", { name: "More setup options (7)" })
            .click();
          await expect(
            list(start, "More setup options").getByRole("button"),
          ).toHaveCount(7);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          const overflowing = await page
            .locator(
              '[data-slot="prompt-list"], [data-slot="prompt-list-item"], .prompt-demo-stage',
            )
            .evaluateAll((nodes) =>
              nodes
                .filter((node) => node.scrollWidth > node.clientWidth + 1)
                .map((node) => node.className),
            );
          expect(overflowing).toEqual([]);
          for (const row of await page
            .locator('[data-slot="prompt-list-item"]')
            .all()) {
            const box = (await row.boundingBox())!;
            expect(box.height).toBeGreaterThanOrEqual(32);
            expect(box.x + box.width).toBeLessThanOrEqual(width);
          }
          await expect(
            start.locator(".sprout-prompt-list-title").first(),
          ).toHaveCSS("color", await cssColor(page, "var(--sprout-muted)"));
          const axe = await new AxeBuilder({ page })
            .include("[data-recipe]")
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze();
          expect(axe.violations).toEqual([]);
          await page.mouse.move(0, 0);
          for (const id of [
            "starting-tasks",
            "titles",
            "brands",
            "disabled",
            "long",
            "fictional",
          ]) {
            const shot = await shoot(
              recipe(page, id),
              `prompt-list-${id}-${theme}-${mode}-${width}`,
              testInfo,
            );
            expect(shot.byteLength).toBeGreaterThan(5_000);
          }
        });
      }
    }
  }
});

test("keyboard moves through rows, shows focus, and chooses with Enter or Space", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const start = list(recipe(page, "starting-tasks"), "Start with a task");
  const first = start.getByRole("button", {
    name: "Prepare me for tomorrow's meetings",
  });
  await first.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  const row = start.locator('[data-slot="prompt-list-item"]').first();
  await expect(row).toHaveCSS("outline-style", "solid");
  await expect(row).toHaveCSS(
    "background-color",
    await cssColor(page, "var(--sprout-hover)"),
  );
  await shoot(
    recipe(page, "starting-tasks").locator(".prompt-demo-chat"),
    "prompt-list-focus",
    testInfo,
  );
  await page.keyboard.press("Enter");
  await expect(result(page)).toContainText(
    "Sent to chat: “Read tomorrow's meetings from Google Calendar",
  );
  await page.keyboard.press("Tab");
  const second = start.getByRole("button", {
    name: "Draft replies to recent customer emails",
  });
  await expect(second).toBeFocused();
  await page.keyboard.press("Space");
  await expect(result(page)).toContainText(
    "Find recent customer emails in Gmail",
  );
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    recipe(page, "starting-tasks").getByRole("button", {
      name: "More tasks (2)",
    }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    list(recipe(page, "starting-tasks"), "More tasks").getByRole("button"),
  ).toHaveCount(2);
});

test("clicking anywhere on a row chooses it and opens pages for setup steps", async ({
  page,
}) => {
  await openPage(page);
  const start = recipe(page, "starting-tasks");
  const row = list(start, "Start with a task")
    .locator('[data-slot="prompt-list-item"]')
    .nth(2);
  const box = (await row.boundingBox())!;
  await page.mouse.click(box.x + box.width - 6, box.y + box.height / 2);
  await expect(result(page)).toContainText(
    "Review the rows in the Supplier deliveries table",
  );
  await start.getByRole("button", { name: "More setup options (7)" }).click();
  const more = list(start, "More setup options");
  await more
    .getByRole("button", { name: "Connect Slack, Google, or GitHub" })
    .click();
  await expect(result(page)).toHaveText("Opened Integrations.");
  await more
    .getByRole("button", { name: "Choose Slack channels for knowledge" })
    .click();
  await expect(result(page)).toHaveText("Opened Integrations › Slack sources.");
  await more
    .getByRole("button", { name: "Choose Google sources for knowledge" })
    .click();
  await expect(result(page)).toHaveText(
    "Opened Integrations › Google sources.",
  );
  await expect(more.getByRole("img", { name: "Google" })).toBeVisible();
  await more.getByRole("button", { name: "Invite a teammate" }).click();
  await expect(result(page)).toHaveText("Opened Members.");
  await start.getByRole("button", { name: "Fewer setup options" }).click();
  await expect(list(start, "More setup options")).toHaveCount(0);
});

test("more tasks collapse under a hidden title", async ({ page }) => {
  await openPage(page);
  const start = recipe(page, "starting-tasks");
  await expect(
    list(start, "Start with a task").getByRole("button"),
  ).toHaveCount(3);
  await expect(
    list(start, "Start with a task").getByRole("heading", {
      name: "Start with a task",
    }),
  ).toBeVisible();
  const trigger = start.getByRole("button", { name: "More tasks (2)" });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  const more = list(start, "More tasks");
  await expect(more.getByRole("heading")).toHaveCount(0);
  await expect(
    more.getByRole("button", { name: "Draft a Slack update for my team" }),
  ).toBeVisible();
  await expect(
    start.getByRole("button", { name: "Fewer tasks" }),
  ).toHaveAttribute("aria-expanded", "true");
  const titles = recipe(page, "titles");
  await expect(list(titles, "More tasks").locator("h3")).toHaveCount(0);
  await expect(list(titles, "Start with a task").locator("h3")).toHaveText(
    "Start with a task",
  );
});

test("load, update, and error states sit below the lists", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const start = recipe(page, "starting-tasks");
  await chooseOption(page, "Recommendations", "Loading");
  await expect(start.getByRole("status")).toHaveText(
    "Loading saved recommendations.",
  );
  await expect(list(start, "Start with a task").getByRole("button")).toHaveText(
    ["Plan customer follow-ups", "Draft a support reply", "Plan my week"],
  );
  await expect(start.getByRole("button", { name: /More tasks/ })).toHaveCount(
    0,
  );
  await chooseOption(page, "Recommendations", "Updating in background");
  await expect(start.getByRole("status")).toHaveText(
    "Recommendations are updating in the background.",
  );
  await expect(
    start.getByRole("button", { name: "More tasks (2)" }),
  ).toBeVisible();
  await chooseOption(page, "Recommendations", "Live updates unavailable");
  await expect(start.getByRole("alert")).toHaveText(
    "Live updates are not available. Reload the saved list to reconnect.",
  );
  await chooseOption(page, "Recommendations", "Could not load");
  await expect(start.getByRole("alert")).toHaveText(
    "Saved recommendations could not be loaded.",
  );
  await shoot(start, "prompt-list-error", testInfo);
  const reload = start.getByRole("button", { name: "Reload saved list" });
  await reload.click();
  const busy = start.getByRole("button", { name: "Loading saved list..." });
  await expect(busy).toBeDisabled();
  await expect(busy).toHaveAttribute("aria-busy", "true");
  await expect(start.getByRole("alert")).toHaveCount(0);
  await expect(
    start.getByRole("button", { name: "More tasks (2)" }),
  ).toBeVisible();
});

test("setup steps show one, several, or none", async ({ page }) => {
  await openPage(page);
  const start = recipe(page, "starting-tasks");
  await expect(
    start.getByText("Optional. You can start a task now."),
  ).toBeVisible();
  await chooseOption(page, "Setup", "One step left");
  await expect(
    list(start, "Set up your workspace").getByRole("button"),
  ).toHaveText(["Set how Bud replies to you"]);
  await expect(
    start.getByRole("button", { name: /More setup options/ }),
  ).toHaveCount(0);
  await chooseOption(page, "Setup", "All done");
  await expect(list(start, "Set up your workspace")).toHaveCount(0);
  await expect(
    start.getByText("Optional. You can start a task now."),
  ).toHaveCount(0);
});

test("disabled rows ignore hover and clicks", async ({ page }, testInfo) => {
  await openPage(page);
  const start = recipe(page, "starting-tasks");
  await chooseOption(page, "Chat", "Sending a message");
  for (const button of await start.locator(".sprout-prompt-list-button").all())
    await expect(button).toBeDisabled();
  const row = list(start, "Start with a task")
    .locator('[data-slot="prompt-list-item"]')
    .first();
  await expect(row).toHaveCSS("opacity", "0.5");
  await row.hover();
  await expect(row).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await row.locator("button").click({ force: true });
  await expect(result(page)).toHaveText("Nothing chosen yet.");
  await shoot(start, "prompt-list-sending", testInfo);
  const disabled = list(
    recipe(page, "disabled").locator(".prompt-demo-panel").nth(1),
    "Set up your workspace",
  );
  await expect(disabled).toHaveAttribute("data-disabled", "true");
  const fictional = recipe(page, "fictional");
  await expect(
    list(fictional, "Unavailable prompts").getByRole("button"),
  ).toHaveCount(2);
  for (const button of await list(fictional, "Unavailable prompts")
    .getByRole("button")
    .all())
    await expect(button).toBeDisabled();
});

test("hover fills the row and brand tiles show their names", async ({
  page,
}) => {
  await openPage(page);
  const brands = recipe(page, "brands");
  const rows = brands.locator('[data-slot="prompt-list-item"]');
  await expect(rows.nth(0).locator('[data-slot="brand-stack"]')).toHaveCount(0);
  await expect(
    rows.nth(1).getByRole("img", { name: "Google Calendar" }),
  ).toBeVisible();
  const stack = rows
    .nth(2)
    .getByRole("img", { name: "GitHub, Slack, Google Calendar" });
  await expect(stack.locator(".sprout-brand-tile")).toHaveCount(3);
  await rows.nth(0).hover();
  await expect(rows.nth(0)).toHaveCSS(
    "background-color",
    await cssColor(page, "var(--sprout-hover)"),
  );
  await stack.locator(".sprout-brand-tile").nth(1).hover();
  await expect(page.getByText("Slack", { exact: true }).last()).toBeVisible();
  await rows.nth(2).locator(".sprout-prompt-list-button").click();
  await expect(brands.locator(".prompt-demo-result")).toHaveText(
    "Chose standup.",
  );
  const fictional = recipe(page, "fictional");
  await list(fictional, "Try a fictional task")
    .getByRole("button", { name: "Plan a garden project" })
    .click();
  await expect(fictional.getByRole("status")).toHaveText("plan");
});

test("long labels truncate on one line and keep the full label", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPage(page);
  const long = recipe(page, "long");
  const button = long.getByRole("button", {
    name: /Draft replies to recent customer emails/,
  });
  await expect(button).toHaveAttribute(
    "title",
    "Draft replies to recent customer emails about delayed spring bulb orders",
  );
  expect(await button.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true,
  );
  for (const row of await long
    .locator('[data-slot="prompt-list-item"]')
    .all()) {
    const box = (await row.boundingBox())!;
    expect(box.height).toBeLessThan(40);
    expect(
      await row.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    await expect(row.locator(".sprout-prompt-list-arrow")).toBeVisible();
  }
  await shoot(long, "prompt-list-long-390", testInfo);
});

test("rows rise in with motion and stay still with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openPage(page);
  const rows = list(
    recipe(page, "starting-tasks"),
    "Start with a task",
  ).locator('[data-slot="prompt-list-item"]');
  await expect(rows.first()).toHaveCSS("animation-name", "sprout-prompt-rise");
  await expect(rows.nth(1)).toHaveCSS("animation-delay", "0.04s");
  await expect(rows.first()).toHaveCSS("animation-duration", "0.18s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(rows.first()).toHaveCSS("animation-name", "none");
  await rows.first().hover();
  await expect(rows.first().locator(".sprout-prompt-list-icon")).toHaveCSS(
    "transform",
    "none",
  );
});

test.describe("touch", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("rows grow to 44px for coarse pointers", async ({ page }, testInfo) => {
    await openPage(page);
    expect(
      await page.evaluate(() => matchMedia("(pointer: coarse)").matches),
    ).toBe(true);
    for (const row of await recipe(page, "starting-tasks")
      .locator('[data-slot="prompt-list-item"]')
      .all()) {
      const box = (await row.boundingBox())!;
      expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
    }
    await recipe(page, "starting-tasks")
      .getByRole("button", { name: "Prepare me for tomorrow's meetings" })
      .tap();
    await expect(result(page)).toContainText("Sent to chat");
    await shoot(
      recipe(page, "starting-tasks"),
      "prompt-list-touch-390",
      testInfo,
    );
  });
});
