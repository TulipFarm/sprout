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
  await page.goto("/components/tabs/");
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

const example = (page: Page, name: string) =>
  page.getByRole("region", { name, exact: true });
const tablist = (scope: Page | Locator, name: string) =>
  scope.getByRole("tablist", { name, exact: true });

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .exclude("[data-base-ui-focus-guard]")
    .analyze();
  expect(results.violations).toEqual([]);
}

async function shot(target: Page | Locator, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await target.screenshot({ path });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

/** Nothing inside spills past the example card sideways. */
async function expectContained(card: Locator) {
  expect(
    await card.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return [...element.querySelectorAll("*")]
        .filter(
          (child) =>
            !child.closest(".tabs-demo-scroll") ||
            child.classList.contains("tabs-demo-scroll"),
        )
        .filter((child) => {
          const rect = child.getBoundingClientRect();
          return (
            rect.width > 1 &&
            rect.height > 1 &&
            (rect.left < box.left - 1 || rect.right > box.right + 1)
          );
        })
        .map((child) => `${child.tagName.toLowerCase()}.${child.className}`);
    }),
  ).toEqual([]);
}

const sections = [
  "Tabs playground",
  "Variants",
  "Members settings",
  "Model settings",
  "Agent page",
  "Agent setup",
  "Table search",
];

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`tabs ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
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
        await settle(page);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await axe(page);

        for (const name of sections) {
          const region =
            name === "Variants"
              ? page.getByRole("group", { name: "Variants", exact: true })
              : example(page, name);
          await region.scrollIntoViewIfNeeded();
          await expect(region).toBeVisible();
          await expectContained(region);
          await shot(
            region,
            testInfo,
            `tabs-${name.toLowerCase().replaceAll(" ", "-")}-${theme}-${mode}-${width}`,
          );
        }

        // The steps list gives way to a select on small screens, like Cloud's builder.
        const builder = example(page, "Agent setup");
        if (width < 640) {
          await expect(tablist(builder, "Agent setup sections")).toBeHidden();
          await chooseOption(page, "Setup section", "3. Access");
          await expect(
            builder.getByRole("tabpanel").filter({ hasText: "Read tables" }),
          ).toBeVisible();
        } else {
          await expect(tablist(builder, "Agent setup sections")).toBeVisible();
          await expect(
            page.getByRole("combobox", { name: "Setup section" }),
          ).toBeHidden();
        }

        // Each list keeps its height; trigger labels never clip.
        for (const list of await page
          .locator('[data-slot="tabs-list"]:visible')
          .all()) {
          expect(
            await list.evaluate((element) =>
              [
                ...element.querySelectorAll<HTMLElement>(
                  '[data-slot="tabs-trigger"]',
                ),
              ].every(
                (trigger) => trigger.scrollWidth <= trigger.clientWidth + 1,
              ),
            ),
          ).toBe(true);
        }

        // Brand theme tints the steps underline and active label; neutral stays gray.
        const activeStep = page
          .getByRole("group", { name: "Steps variant" })
          .getByRole("tab", { selected: true });
        const color = await activeStep.evaluate(
          (element) => getComputedStyle(element).color,
        );
        const primary = await page.evaluate(() =>
          getComputedStyle(document.documentElement)
            .getPropertyValue("--sprout-primary")
            .trim(),
        );
        expect(primary).toBe(
          theme === "tulipfarm"
            ? mode === "light"
              ? "#188038"
              : "#75ce8e"
            : mode === "light"
              ? "#262626"
              : "#ededed",
        );
        expect(color).toBe(
          theme === "tulipfarm"
            ? mode === "light"
              ? "rgb(24, 128, 56)"
              : "rgb(117, 206, 142)"
            : mode === "light"
              ? "rgb(38, 38, 38)"
              : "rgb(237, 237, 237)",
        );
        expect(errors).toEqual([]);
      });
    }
  }
}

test("playground shows every variant and orientation with a disabled tab", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const hero = example(page, "Tabs playground");
  const list = tablist(hero, "Project");
  for (const [label, variant] of [
    ["Default", "default"],
    ["Line", "line"],
    ["Steps", "steps"],
  ] as const) {
    for (const orientation of ["Horizontal", "Vertical"]) {
      await chooseOption(page, "Variant", label);
      await chooseOption(page, "Orientation", orientation);
      await expect(list).toHaveAttribute("data-variant", variant);
      await expect(list).toHaveAttribute(
        "data-orientation",
        orientation.toLowerCase(),
      );
      if (orientation === "Vertical")
        await expect(list).toHaveAttribute("aria-orientation", "vertical");
      else await expect(list).not.toHaveAttribute("aria-orientation", /./);
      const active = list.getByRole("tab", { name: "Overview" });
      await expect(active).toHaveAttribute("aria-selected", "true");
      const after = await active.evaluate(
        (element) => getComputedStyle(element, "::after").opacity,
      );
      expect(after).toBe(variant === "default" ? "0" : "1");
      if (variant === "default") {
        expect(
          await active.evaluate(
            (element) => getComputedStyle(element).backgroundColor,
          ),
        ).not.toBe("rgba(0, 0, 0, 0)");
      }
      const disabled = list.getByRole("tab", { name: "Disabled" });
      await expect(disabled).toHaveAttribute("data-disabled", "");
      await disabled.click({ force: true });
      await expect(active).toHaveAttribute("aria-selected", "true");
      await shot(
        hero,
        testInfo,
        `tabs-playground-${variant}-${orientation.toLowerCase()}`,
      );
    }
  }
});

test("keyboard moves between tabs, skips disabled tabs, and reaches the panel", async ({
  page,
}) => {
  await openPage(page);
  const hero = example(page, "Tabs playground");
  const list = tablist(hero, "Project");
  const overview = list.getByRole("tab", { name: "Overview" });
  const tasks = list.getByRole("tab", { name: "Tasks" });
  await overview.focus();
  await page.keyboard.press("ArrowRight");
  await expect(tasks).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(tasks).toHaveAttribute("aria-selected", "true");
  await expect(hero.getByRole("tabpanel", { name: "Tasks" })).toHaveText(
    "Three sample tasks.",
  );
  // Disabled tabs stay focusable for discovery but cannot be selected; focus loops.
  const disabled = list.getByRole("tab", { name: "Disabled" });
  await page.keyboard.press("ArrowRight");
  await expect(disabled).toBeFocused();
  await expect(disabled).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Enter");
  await expect(tasks).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(overview).toBeFocused();
  await page.keyboard.press("End");
  await expect(disabled).toBeFocused();
  await page.keyboard.press("Home");
  await expect(overview).toBeFocused();
  await page.keyboard.press("Space");
  await expect(overview).toHaveAttribute("aria-selected", "true");
  const outline = await overview.evaluate(
    (element) => getComputedStyle(element).outlineStyle,
  );
  expect(outline).toBe("solid");
  await page.keyboard.press("Tab");
  await expect(hero.getByRole("tabpanel", { name: "Overview" })).toBeFocused();

  await chooseOption(page, "Orientation", "Vertical");
  await overview.focus();
  await page.keyboard.press("ArrowDown");
  await expect(tasks).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(overview).toBeFocused();
});

test("members tabs keep both panels mounted", async ({ page }) => {
  await openPage(page);
  const card = example(page, "Members settings");
  const list = tablist(card, "Members settings");
  await expect(list).toHaveAttribute("data-variant", "default");
  await expect(list.getByRole("tab", { name: "Members (3)" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await list.getByRole("tab", { name: "Invitations" }).click();
  await expect(card.getByText("No pending invitations.")).toBeVisible();
  await card.getByRole("button", { name: "Invite members" }).click();
  await card.getByRole("button", { name: "Invite members" }).click();
  await expect(
    card
      .getByRole("list", { name: "Pending invitations" })
      .getByRole("listitem"),
  ).toHaveCount(2);
  await list.getByRole("tab", { name: "Members (3)" }).click();
  await expect(card.locator('[data-slot="tabs-content"]')).toHaveCount(2);
  await expect(
    card.getByRole("list", {
      name: "Pending invitations",
      includeHidden: true,
    }),
  ).toBeHidden();
  await list.getByRole("tab", { name: "Invitations" }).click();
  await expect(
    card
      .getByRole("list", { name: "Pending invitations" })
      .getByRole("listitem"),
  ).toHaveCount(2);
});

test("model settings follow the address and show loading, empty, and error panels", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const card = example(page, "Model settings");
  const list = tablist(card, "Model settings");
  const address = card.getByLabel("Address");
  await expect(list).toHaveAttribute("data-variant", "line");
  await expect(address).toHaveText("/meadow/models");
  await list.getByRole("tab", { name: "Compaction" }).click();
  await expect(address).toHaveText("/meadow/models?tab=compaction");
  await expect(card.getByText("Summarize long conversations")).toBeVisible();
  await list.getByRole("tab", { name: "Access" }).click();
  await expect(address).toHaveText("/meadow/models");

  await chooseOption(page, "Access state", "Loading");
  await expect(card.getByRole("status")).toContainText("Loading model access");
  await shot(card, testInfo, "tabs-models-loading");
  await chooseOption(page, "Access state", "Empty");
  await expect(card.getByText("No models configured yet")).toBeVisible();
  await shot(card, testInfo, "tabs-models-empty");
  // Compaction renders nothing until access is ready.
  await list.getByRole("tab", { name: "Compaction" }).click();
  await expect(card.getByRole("tabpanel", { name: "Compaction" })).toBeEmpty();
  await list.getByRole("tab", { name: "Access" }).click();
  await chooseOption(page, "Access state", "Error");
  await expect(card.getByRole("alert")).toContainText(
    "Model access did not load",
  );
  await shot(card, testInfo, "tabs-models-error");
  await card.getByRole("button", { name: "Try again" }).click();
  await expect(
    card.getByRole("list", { name: "Model families" }),
  ).toBeVisible();
  await axe(page);
});

test("agent page filters tabs by capability and focuses the opened tab", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPage(page);
  const card = example(page, "Agent page");
  const list = tablist(card, "Agent sections");
  await expect(list.getByRole("tab")).toHaveText([
    "Overview",
    "Instructions",
    "Access",
    "Execution",
    "Slack",
    "Triggers",
    "Settings",
  ]);
  // Seven tabs scroll inside their wrapper instead of widening the page.
  const scroller = card.locator(".tabs-demo-scroll");
  expect(
    await scroller.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  await card.getByRole("button", { name: "Turn on execution" }).click();
  const execution = list.getByRole("tab", { name: "Execution" });
  await expect(execution).toHaveAttribute("aria-selected", "true");
  await expect(execution).toBeFocused();
  await expect(execution).toBeInViewport();
  await expect(card.getByRole("tabpanel", { name: "Execution" })).toContainText(
    "Turn execution on",
  );

  await chooseOption(page, "Viewing as", "Viewer");
  await expect(list.getByRole("tab")).toHaveText([
    "Overview",
    "Slack",
    "Settings",
  ]);
  await expect(list.getByRole("tab", { name: "Overview" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await chooseOption(page, "Viewing as", "Editor");
  await expect(list.getByRole("tab")).toHaveText([
    "Overview",
    "Instructions",
    "Slack",
    "Settings",
  ]);
  await expect(
    card.getByRole("button", { name: "Turn on execution" }),
  ).toHaveCount(0);
});

test("agent builder marks steps, keeps drafts, and edits from the preview", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openPage(page);
  const card = example(page, "Agent setup");
  const steps = tablist(card, "Agent setup sections");
  await expect(steps).toHaveAttribute("data-variant", "steps");
  await expect(steps.getByRole("tab")).toHaveText([
    "1Basics",
    "2Skills",
    "3Access",
    "4Triggers",
    "5Review",
  ]);

  // A draft survives a trip through other steps.
  await card.getByLabel("Instructions").fill("Summarize closed tasks.");
  await steps.getByRole("tab", { name: "Skills" }).click();
  await card.getByLabel("Weekly report", { exact: true }).check();
  await expect(
    steps.getByRole("tab", { name: "Skills" }).locator("svg"),
  ).toHaveCount(1);
  await steps.getByRole("tab", { name: "Basics" }).click();
  await expect(card.getByLabel("Instructions")).toHaveValue(
    "Summarize closed tasks.",
  );

  // Saving without a name flags Basics and returns to it.
  await steps.getByRole("tab", { name: "Review" }).click();
  const save = card.getByRole("button", { name: "Save agent" });
  await expect(save).toBeVisible();
  await save.click();
  const basics = steps.getByRole("tab", {
    name: /^Basics\s*, needs attention$/,
  });
  await expect(basics).toHaveAttribute("aria-selected", "true");
  await expect(basics.locator("svg")).toHaveCount(1);
  await expect(
    card.getByText("Name the agent before you continue."),
  ).toBeVisible();
  await shot(card, testInfo, "tabs-builder-error");
  await card.getByLabel("Agent name").fill("Weekly report writer");
  await expect(
    steps.getByRole("tab", { name: "Basics", exact: true }),
  ).toBeVisible();

  // Preview line tabs, and Edit moves the setup.
  const views = tablist(card, "Agent views");
  await expect(views).toHaveAttribute("data-variant", "line");
  await card.getByRole("button", { name: "Edit actions" }).click();
  await expect(steps.getByRole("tab", { name: "Access" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await views.getByRole("tab", { name: "Test chat" }).click();
  await card.getByLabel("Test message").fill("What closed last week?");
  await views.getByRole("tab", { name: "Summary" }).click();
  await views.getByRole("tab", { name: "Test chat" }).click();
  await expect(card.getByLabel("Test message")).toHaveValue(
    "What closed last week?",
  );
  await shot(card, testInfo, "tabs-builder-filled");
  await axe(page);
});

test("search popover hides the Text tab and unmounts inactive panels", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const card = example(page, "Table search");
  const trigger = card.getByRole("button", { name: "Search", exact: true });
  await trigger.click();
  const popup = page.locator('[data-slot="popover-content"]');
  await expect(popup).toBeVisible();
  await settle(page);
  const list = popup.getByRole("tablist");
  await expect(list).toHaveAttribute("data-variant", "line");
  await expect(list.getByRole("tab")).toHaveText(["Text", "Ask AI", "RSQL"]);
  await expect(list.getByRole("tab", { name: "Text" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(popup.locator('[data-slot="tabs-content"]')).toHaveCount(1);
  await shot(page, testInfo, "tabs-search-popover-text");
  await axe(page);

  await list.getByRole("tab", { name: "Ask AI" }).click();
  await popup
    .getByLabel("Describe the rows you want")
    .fill("Open enterprise tickets");
  await popup.getByRole("button", { name: "Translate to RSQL" }).click();
  await expect(list.getByRole("tab", { name: "RSQL" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(popup.getByLabel("RSQL filter")).toHaveValue(
    "status==open;plan==enterprise",
  );
  await list.getByRole("tab", { name: "Text" }).click();
  await popup.getByLabel("Search rows").fill("refund");
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
  await expect(card.getByRole("button", { name: "“refund”" })).toBeFocused();

  await card.getByLabel("Table has text fields").uncheck();
  await card.getByRole("button", { name: "“refund”" }).click();
  await expect(popup.getByRole("tablist").getByRole("tab")).toHaveText([
    "Ask AI",
    "RSQL",
  ]);
  await expect(popup.getByRole("tab", { name: "RSQL" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await shot(page, testInfo, "tabs-search-popover-rsql");
  await page.keyboard.press("Escape");
});

test.describe("motion", () => {
  test.use({ reducedMotion: "no-preference" });
  test("animates colors and underline briefly when motion is allowed", async ({
    page,
  }) => {
    await openPage(page);
    const tab = tablist(example(page, "Members settings"), "Members settings")
      .getByRole("tab")
      .first();
    expect(
      await tab.evaluate(
        (element) => getComputedStyle(element).transitionDuration,
      ),
    ).toMatch(/^0\.12s/);
    expect(
      await tab.evaluate(
        (element) => getComputedStyle(element, "::after").transitionDuration,
      ),
    ).toBe("0.18s");
  });
});

test("reduced motion removes tab transitions", async ({ page }) => {
  await openPage(page);
  const tab = tablist(example(page, "Members settings"), "Members settings")
    .getByRole("tab")
    .first();
  expect(
    await tab.evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    ),
  ).toBe("0s");
  expect(
    await tab.evaluate(
      (element) => getComputedStyle(element, "::after").transitionDuration,
    ),
  ).toBe("0s");
});
