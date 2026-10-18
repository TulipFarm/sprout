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
  await page.goto("/components/popover/");
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

const section = (page: Page, name: string) =>
  page.getByRole("region", { name, exact: true });
const row = (scope: Page | Locator, name: string) =>
  scope.getByRole("group", { name, exact: true }).first();
async function center(target: Locator) {
  await target.evaluate((element) =>
    element.scrollIntoView({ block: "center", inline: "center" }),
  );
}

/** Start alignment holds when the panel fits; otherwise Base UI flips it to end. */
async function expectStartAligned(popup: Locator, trigger: Locator) {
  const [box, anchor] = [
    (await popup.boundingBox())!,
    (await trigger.boundingBox())!,
  ];
  const fits =
    anchor.x + box.width <= (await popup.evaluate(() => innerWidth)) - 8;
  await expect(popup).toHaveAttribute("data-align", fits ? "start" : "end");
  if (fits) expect(Math.abs(box.x - anchor.x)).toBeLessThan(2);
  else
    expect(
      Math.abs(box.x + box.width - (anchor.x + anchor.width)),
    ).toBeLessThan(2);
}

const popups = (page: Page) =>
  page.locator('[data-slot="popover-content"][data-open]');
const statusPopups = (page: Page) =>
  page.locator('[data-slot="toolbar-status-content"][data-open]');

async function axe(page: Page) {
  // Base UI adds hidden 1px focus guards beside an open popup so Tab leaves the portal in order.
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

async function closeAll(page: Page) {
  for (let i = 0; i < 3 && (await popups(page).count()) > 0; i++) {
    await page.keyboard.press("Escape");
    await settle(page);
  }
  await expect(popups(page)).toHaveCount(0);
}

/** The panel stays in the viewport, and nothing inside it spills sideways. */
async function expectContained(popup: Locator) {
  expect(
    await popup.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const inside = [...element.querySelectorAll("*")].every((child) => {
        const rect = child.getBoundingClientRect();
        if (!rect.width) return true;
        return rect.left >= box.left - 1 && rect.right <= box.right + 1;
      });
      return {
        inViewport:
          box.left >= 0 &&
          box.right <= innerWidth + 0.5 &&
          box.top >= 0 &&
          box.bottom <= innerHeight + 0.5,
        inside,
        noScroll: element.scrollWidth <= element.clientWidth + 1,
      };
    }),
  ).toEqual({ inViewport: true, inside: true, noScroll: true });
}

const playgroundSizes = [
  ["default", "Saved", 288],
  ["menu", "Customize", 384],
  ["picker", "Priya Raman", 288],
  ["panel", "Search", 512],
  ["work-list", "Pending work", 512],
  ["app-actions", "Send to Slack", 320],
  ["bud", "Open Bud quick chat", 384],
] as const;

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`popover sizes ${theme} ${mode} at ${width}px`, async ({
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
        await settle(page);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await axe(page);

        const playground = section(page, "Popover playground");
        for (const [size, label, expected] of playgroundSizes) {
          const trigger = playground.getByRole("button", {
            name: label,
            exact: true,
          });
          await trigger.scrollIntoViewIfNeeded();
          await trigger.click();
          const popup = popups(page);
          await expect(popup).toBeVisible();
          await expect(popup).toHaveAttribute("data-size", size);
          await settle(page);
          const box = (await popup.boundingBox())!;
          const fits = Math.min(expected, width - 32);
          expect(box.width).toBeLessThanOrEqual(expected + 1);
          expect(box.width).toBeGreaterThanOrEqual(fits - 16);
          await expectContained(popup);
          await axe(page);
          await shot(
            page,
            testInfo,
            `popover-${size}-${theme}-${mode}-${width}`,
          );
          await closeAll(page);
          await expect(trigger).toBeFocused();
        }

        const sources = section(page, "Sources and help");
        await sources.scrollIntoViewIfNeeded();
        await sources
          .getByRole("button", {
            name: "Project sharing details: Customer research archive 2024",
          })
          .click();
        const sharing = popups(page);
        await expect(sharing).toHaveAttribute("data-side", "top");
        await expect(sharing).toContainText("archived");
        await settle(page);
        await expectContained(sharing);
        await shot(page, testInfo, `popover-sharing-${theme}-${mode}-${width}`);
        await closeAll(page);

        const panels = section(page, "Table query bar");
        await panels.scrollIntoViewIfNeeded();
        await row(panels, "Filters")
          .getByRole("button", { name: /^Edit filter:/ })
          .click();
        const filter = popups(page);
        await expect(filter).toHaveAttribute("data-size", "panel");
        await settle(page);
        await expectContained(filter);
        await shot(page, testInfo, `popover-filter-${theme}-${mode}-${width}`);
        await closeAll(page);

        const hover = section(page, "App actions");
        await hover.scrollIntoViewIfNeeded();
        await hover.getByRole("button", { name: "Send to 4 apps" }).click();
        const apps = popups(page);
        await expect(
          apps.getByRole("heading", { name: "Linear" }),
        ).toBeVisible();
        await settle(page);
        await expectContained(apps);
        await shot(page, testInfo, `popover-apps-${theme}-${mode}-${width}`);
        await closeAll(page);
      });
    }
  }
}

test("keyboard opens, moves focus inside, and Escape returns focus", async ({
  page,
}) => {
  await openPage(page);
  const trigger = section(page, "Popover playground").getByRole("button", {
    name: "Customize",
    exact: true,
  });
  await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.focus();
  await page.keyboard.press("Enter");
  const popup = popups(page);
  await expect(popup).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(popup).toHaveAttribute("role", "dialog");
  await expect(popup).toHaveAccessibleName("Group and calculate");
  expect(
    await popup.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Tab");
  expect(
    await popup.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(popups(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await page.keyboard.press("Space");
  await expect(popups(page)).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(popups(page)).toHaveCount(0);
});

test("app tiles open on hover without stealing focus, and on keyboard with focus inside", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPage(page);
  const cards = section(page, "App actions");
  const tile = row(cards, "One app").getByRole("button", {
    name: "Send to Slack",
  });
  await center(tile);
  await tile.hover();
  await page.waitForTimeout(300);
  await expect(popups(page)).toHaveCount(0);
  const popup = popups(page);
  await expect(popup).toBeVisible({ timeout: 3000 });
  await expect(popup).toHaveAttribute("data-size", "app-actions");
  await settle(page);
  await expectStartAligned(popup, tile);
  expect(
    await popup.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(false);
  await page.mouse.move(0, 0);
  await expect(popups(page)).toHaveCount(0, { timeout: 3000 });

  await tile.focus();
  await page.keyboard.press("Enter");
  await expect(popup).toBeVisible();
  await expect(
    popup.getByRole("button", { name: "Post summary to #ops-weekly" }),
  ).toBeFocused();
  await popup
    .getByRole("button", { name: "Post summary to #ops-weekly" })
    .click();
  await expect(cards.getByRole("status")).toContainText(
    "Slack: Post summary to #ops-weekly",
  );
  await closeAll(page);

  const disabled = row(cards, "Disabled").getByRole("button", {
    name: "Send to Slack",
  });
  await expect(disabled).toBeDisabled();
});

test("citations load on open, show unavailable and error states, and retry", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const sources = section(page, "Sources and help");
  await sources.scrollIntoViewIfNeeded();

  await sources
    .getByRole("button", { name: "Source 1: Q4 hiring plan.docx" })
    .click();
  await expect(popups(page)).toContainText("drive.google.com");
  await closeAll(page);

  await sources
    .getByRole("button", { name: "Source: Q4 hiring plan.docx" })
    .click();
  await expect(popups(page).getByRole("status")).toContainText(
    "Checking access",
  );
  await expect(popups(page)).toContainText("Google Drive › Planning › 2026");
  await closeAll(page);

  await sources
    .getByRole("button", { name: "Source: Board deck — October" })
    .click();
  await expect(popups(page).getByRole("alert")).toContainText(
    "no longer have access",
  );
  await closeAll(page);

  await sources
    .getByRole("button", { name: "Source: Vendor pricing sheet" })
    .click();
  const popup = popups(page);
  await expect(popup.getByRole("alert")).toContainText("didn’t respond");
  await settle(page);
  await shot(page, testInfo, "popover-citation-error");
  await popup.getByRole("button", { name: "Load source again" }).click();
  await expect(popup).toContainText("Hiring stays flat in Q4");

  await closeAll(page);
  await sources.getByRole("button", { name: "Missing a repository?" }).click();
  await expect(popups(page)).toHaveAttribute("data-align", "end");
  await expect(
    popups(page).getByRole("link", { name: /Authorized OAuth Apps/ }),
  ).toHaveAttribute("target", "_blank");
});

test("toolbar status announces, uses the destructive trigger, and opens with defaultOpen", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const status = section(page, "Toolbar status");
  await status.scrollIntoViewIfNeeded();
  await expect(status.getByRole("alert")).toContainText(
    "didn’t accept 3 changes",
  );
  const failed = status.getByRole("button", { name: "Sync failed" });
  await expect(failed).toHaveClass(/sprout-button-variant-destructive/);
  await failed.click();
  await expect(statusPopups(page)).toHaveAttribute("data-align", "end");
  await statusPopups(page)
    .getByRole("button", { name: "Try sync again" })
    .click();
  await expect(status.getByRole("button", { name: "Syncing…" })).toHaveClass(
    /sprout-button-variant-outline/,
  );
  await closeAll(page);

  await status.getByRole("button", { name: "Mount with defaultOpen" }).click();
  await expect(statusPopups(page)).toContainText("You’re offline");
  await settle(page);
  await shot(page, testInfo, "popover-status-default-open");
});

test("pickers: composer persona and model, project states, and clearing search on close", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPage(page);
  const pickers = section(page, "Pickers");
  await pickers.scrollIntoViewIfNeeded();

  await center(pickers.getByRole("group", { name: "Sample message composer" }));
  await pickers.getByRole("button", { name: /^Mode or agent:/ }).click();
  let popup = popups(page);
  await expect(popup).toHaveAttribute("data-size", "menu");
  await expect(popup).toHaveAttribute("data-side", "top");
  await popup
    .getByRole("textbox", { name: "Search modes and agents" })
    .fill("expense");
  await expect(
    popup.getByRole("button", { name: /Expense reviewer/ }),
  ).toBeVisible();
  await expect(popup.getByRole("button", { name: /Research/ })).toHaveCount(0);
  await settle(page);
  await expectContained(popup);
  await shot(page, testInfo, "popover-persona-picker-390");
  await closeAll(page);
  await pickers.getByRole("button", { name: /^Mode or agent:/ }).click();
  await expect(
    popups(page).getByRole("button", { name: /Research/ }),
  ).toBeVisible();
  await closeAll(page);

  const model = pickers.getByRole("button", { name: /^Model:/ });
  await model.hover();
  await expect(page.getByText("AI model that writes replies")).toBeVisible();
  await model.click();
  popup = popups(page);
  await expect(popup).toHaveAttribute("data-size", "picker");
  await expect(popup).toHaveAttribute("data-align", "end");
  await settle(page);
  await expectContained(popup);
  await shot(page, testInfo, "popover-model-picker-390");
  await closeAll(page);

  const states = row(pickers, "Project list state");
  for (const [state, text] of [
    ["Loading", "Loading projects"],
    ["Failed", "Retry loading projects"],
    ["No projects", "No active projects yet"],
  ] as const) {
    await states.getByRole("button", { name: state, exact: true }).click();
    await pickers
      .getByRole("button", { name: /^Project:/ })
      .first()
      .click();
    await expect(popups(page)).toContainText(text);
    await settle(page);
    await shot(
      page,
      testInfo,
      `popover-project-${state.toLowerCase().replace(" ", "-")}`,
    );
    if (state === "Failed") {
      await popups(page)
        .getByRole("button", { name: "Retry loading projects" })
        .click();
      await expect(popups(page)).toContainText("Lisbon office launch");
    }
    await closeAll(page);
  }
  await states.getByRole("button", { name: "Ready", exact: true }).click();
  await pickers
    .getByRole("button", { name: /^Project:/ })
    .first()
    .click();
  const projectSearch = popups(page).getByRole("textbox", {
    name: "Search projects",
  });
  await projectSearch.fill("zzz");
  await popups(page).getByRole("button", { name: "Clear search" }).click();
  await expect(projectSearch).toHaveValue("");
  await expect(projectSearch).toBeFocused();
  await projectSearch.fill("lisbon");
  await closeAll(page);
  await pickers
    .getByRole("button", { name: /^Project:/ })
    .first()
    .click();
  await expect(
    popups(page).getByRole("textbox", { name: "Search projects" }),
  ).toHaveValue("");
  await closeAll(page);

  const badges = row(pickers, "Chat project").getByRole("button", {
    name: /^Project:/,
  });
  await badges.last().click();
  await expect(popups(page)).toHaveAttribute("data-side", "top");
  await closeAll(page);

  const linked = row(pickers, "Linked rows");
  await linked.getByRole("button", { name: /Priya Raman/ }).click();
  await expect(
    popups(page).getByRole("button", { name: "Priya Raman" }),
  ).toHaveAttribute("aria-pressed", "true");
  await closeAll(page);
});

test("filter panel stays open on invalid input and closes after a valid rule", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPage(page);
  const panels = section(page, "Table query bar");
  await center(row(panels, "Filters"));
  const add = row(panels, "Filters").getByRole("button", {
    name: "Add filter",
  });
  await add.click();
  const popup = popups(page);
  await settle(page);
  await expectStartAligned(popup, add);
  await popup.getByRole("button", { name: "Add filter" }).click();
  await expect(popup.getByRole("alert")).toBeVisible();
  await expect(popup.getByLabel("Filter value")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await settle(page);
  await shot(page, testInfo, "popover-filter-invalid");
  await popup.getByLabel("Filter value").fill("Priya Raman");
  await popup.getByRole("button", { name: "Add filter" }).click();
  await expect(popups(page)).toHaveCount(0);
  await expect(
    row(panels, "Filters").getByRole("button", {
      name: /^Edit filter:.*Priya Raman/,
    }),
  ).toBeVisible();

  await row(panels, "Search")
    .getByRole("button", { name: "Search", exact: true })
    .click();
  const search = popups(page);
  await expect(search).toHaveAttribute("data-align", "end");
  await expect(search.getByRole("tab")).not.toHaveCount(0);
  await closeAll(page);
  expect(await page.locator("select").count()).toBe(0);
});

test("calendar: date picker, pending work states, and overlapping events", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await openPage(page);
  const calendar = section(page, "Calendar");
  await calendar.scrollIntoViewIfNeeded();

  await calendar.getByRole("button", { name: "Choose date" }).click();
  let popup = popups(page);
  await expect(popup).toHaveAccessibleName("Choose a calendar date");
  await popup.getByRole("button", { name: /October 22, 2026/ }).click();
  await expect(popups(page)).toHaveCount(0);
  await expect(
    calendar.getByRole("heading", { name: /Week of October 22, 2026/ }),
  ).toBeVisible();

  const pending = row(calendar, "Pending work");
  for (const state of ["Ready", "Loading", "Failed", "Empty"]) {
    await pending.getByRole("button", { name: state, exact: true }).click();
    await pending
      .getByRole("button", { name: "Pending work", exact: true })
      .click();
    popup = popups(page);
    await expect(popup).toHaveAttribute("data-size", "work-list");
    await expect(popup).toHaveAccessibleName("Pending work");
    await settle(page);
    await expectContained(popup);
    await shot(page, testInfo, `popover-pending-${state.toLowerCase()}-390`);
    if (state === "Failed") {
      await popup
        .getByRole("button", { name: "Retry loading pending work" })
        .click();
      await expect(
        pending.getByRole("button", { name: "Ready", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
    }
    if (state === "Ready") {
      const region = popup.getByRole("region", {
        name: "Unscheduled tasks and approvals",
      });
      await region.focus();
      await expect(region).toBeFocused();
    }
    await closeAll(page);
  }

  await row(calendar, "Overlapping events")
    .getByRole("button", { name: /^View all 3 events/ })
    .click();
  popup = popups(page);
  await expect(popup).toHaveAccessibleName("Events at this time");
  await expectContained(popup);
  await shot(page, testInfo, "popover-overlap-390");
  await popup.getByRole("button", { name: /Standup: Platform/ }).click();
  await expect(popups(page)).toHaveCount(0);
});

test("anchored quick chat keeps its draft, toggles from the launcher, and follows the corner", async ({
  page,
}, testInfo) => {
  await openPage(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  const chat = section(page, "Anchored quick chat");
  await center(chat.locator(".popover-demo-bud-stage"));
  const content = page.locator(
    '[data-slot="popover-content"][data-size="bud"]',
  );

  await chat.getByRole("button", { name: "Open Bud quick chat" }).click();
  await expect(content.last()).toBeVisible();
  const bud = content.last();
  await expect(bud).toHaveAttribute("data-side", "top");
  await expect(bud).toHaveAttribute("data-align", "end");
  await bud.getByLabel("Message Bud").fill("Remind me about Northwind");
  await settle(page);
  await shot(page, testInfo, "popover-bud-open");

  // The launcher press is cancelled as an outside press, so it toggles once instead of close-then-reopen.
  await chat.getByRole("button", { name: "Hide Bud quick chat" }).click();
  await expect(bud).toBeHidden();
  await expect(
    page.locator(".sprout-popover-positioner", { has: bud }),
  ).toHaveAttribute("hidden", "");
  await chat.getByRole("button", { name: "Open Bud quick chat" }).click();
  await expect(bud.getByLabel("Message Bud")).toHaveValue(
    "Remind me about Northwind",
  );

  await chat
    .getByRole("heading", { name: "Anchored quick chat" })
    .click({ position: { x: 4, y: 4 } });
  await expect(bud).toBeHidden();
  await chat.getByRole("button", { name: "Open Bud quick chat" }).click();
  await expect(bud).toBeVisible();

  await bud.getByRole("button", { name: "Minimize chat" }).click();
  await expect(bud).toBeHidden();
  await expect(
    chat.getByRole("button", { name: "Open Bud quick chat" }),
  ).toBeFocused();

  await row(chat, "Launcher corner")
    .getByRole("button", { name: "Top left" })
    .click();
  await center(chat.locator(".popover-demo-bud-stage"));
  await chat.getByRole("button", { name: "Open Bud quick chat" }).click();
  await expect(bud).toHaveAttribute("data-side", "bottom");
  await expect(bud).toHaveAttribute("data-align", "start");

  await row(chat, "Errors")
    .getByRole("button", { name: "Chat failed to load" })
    .click();
  await row(chat, "Errors")
    .getByRole("button", { name: "Position not saved" })
    .click();
  await chat.getByRole("button", { name: "Open Bud quick chat" }).click();
  await expect(bud.getByRole("button", { name: "Reload Bud" })).toBeVisible();
  await expect(
    bud.getByRole("button", { name: "Save position again" }),
  ).toBeVisible();
  await settle(page);
  await expectContained(bud);
  await axe(page);
  await shot(page, testInfo, "popover-bud-errors");
});

test("placement follows side and alignment", async ({ page }, testInfo) => {
  await openPage(page);
  const placement = section(page, "Placement");
  await placement.scrollIntoViewIfNeeded();
  await row(placement, "Alignment")
    .getByRole("button", { name: "Start" })
    .click();
  for (const side of ["Top", "Right", "Bottom", "Left"]) {
    await placement.getByRole("button", { name: side, exact: true }).click();
    const popup = popups(page);
    await expect(popup).toHaveAttribute("data-align", "start");
    await expect(popup).toHaveAttribute("data-side", /top|right|bottom|left/);
    await expectContained(popup);
    await shot(page, testInfo, `popover-placement-${side.toLowerCase()}`);
    await closeAll(page);
  }
});
