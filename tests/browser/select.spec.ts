import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

for (const route of [
  "/",
  "/components/badge/",
  "/components/button/",
  "/components/sidebar/",
  "/installation/",
  "/theming/",
]) {
  test(`no native dropdowns on ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
    await expect(page.locator("select")).toHaveCount(0);
    const theme = page.getByRole("button", { name: /^Site theme/ });
    await expect(theme).toHaveJSProperty("tagName", "BUTTON");
    await chooseOption(page, "Color mode", "Dark");
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  });
}

test("workspace supports keyboard selection, typeahead, Escape and focus restoration", async ({
  page,
}) => {
  await page.goto("/components/sidebar/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  const workspace = page.getByRole("button", {
    name: "Switch workspace",
    exact: true,
  });
  await workspace.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menu", { name: "Workspaces" })).toBeVisible();
  await expect(
    page.getByRole("menuitemradio", { name: "Studio workspace" }),
  ).toBeFocused();
  await page.keyboard.press("p");
  await expect(
    page.getByRole("menuitemradio", { name: "Personal workspace" }),
  ).toHaveAttribute("data-highlighted", "");
  await page.keyboard.press("Enter");
  await expect(workspace).toContainText("Personal workspace");
  await expect(workspace).toBeFocused();
  await workspace.press("Enter");
  await expect(page.getByRole("menu", { name: "Workspaces" })).toBeVisible();
  await page.keyboard.press("Home");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu", { name: "Workspaces" })).toHaveCount(0);
  await expect(workspace).toContainText("Personal workspace");
  await expect(workspace).toBeFocused();
});

for (const mode of ["Light", "Dark"]) {
  test(`dropdown popup uses ${mode.toLowerCase()} colors and accessible states`, async ({
    page,
  }) => {
    await page.goto("/components/sidebar/");
    await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
    await chooseOption(page, "Color mode", mode);
    await page
      .getByRole("button", { name: "Switch workspace", exact: true })
      .click();
    const popup = page.locator(".workspace-menu[data-open]");
    await expect(popup).toHaveCSS(
      "background-color",
      mode === "Dark" ? "rgb(29, 29, 29)" : "rgb(253, 253, 253)",
    );
    await expect(popup).toHaveCSS("opacity", "1");
    await popup.evaluate(async (element) => {
      await Promise.all(
        element
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished),
      );
    });
    await expect(
      page.getByRole("menuitemradio", { name: "Studio workspace" }),
    ).toHaveAttribute("aria-checked", "true");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(popup).toHaveCSS("transition-duration", "0s");
  });
}

test("workspace popup works inside the mobile drawer without closing it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/components/sidebar/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  const drawer = page.getByRole("dialog", { name: "Workspace navigation" });
  const workspace = drawer.getByRole("button", {
    name: "Switch workspace",
    exact: true,
  });
  await workspace.click();
  const popup = page.locator(".workspace-menu[data-open]");
  await expect(popup).toBeVisible();
  const bounds = await popup.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await expect(page.getByRole("menuitemradio").first()).toHaveCSS(
    "min-height",
    "44px",
  );
  await page.getByRole("menuitemradio", { name: "Personal workspace" }).click();
  await expect(popup).toHaveCount(0);
  await expect(workspace).toContainText("Personal workspace");
  await expect(drawer).toBeVisible();
  await workspace.click();
  await expect(workspace).toHaveAttribute("aria-expanded", "true");
  await expect(popup).toHaveCSS("opacity", "1");
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);
  await expect(drawer).toBeVisible();
  await expect(workspace).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
});

test("temporary workspaces validate, switch, survive layout changes and reset on reload", async ({
  page,
}) => {
  await page.goto("/components/sidebar/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  const trigger = page.getByRole("button", {
    name: "Switch workspace",
    exact: true,
  });
  await trigger.click();
  await page.getByRole("menuitem", { name: "Add workspace" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Add workspace",
    exact: true,
  });
  const input = dialog.getByRole("textbox", { name: "Workspace name" });
  await expect(input).toBeFocused();
  await dialog.getByRole("button", { name: "Create workspace" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Enter a workspace name.");
  await input.fill("Studio workspace");
  await dialog.getByRole("button", { name: "Create workspace" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "A workspace with this name already exists.",
  );
  await input.fill("Orbit workspace");
  await dialog.getByRole("button", { name: "Create workspace" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toContainText("Orbit workspace");
  await expect(trigger).toBeFocused();
  await chooseOption(page, "Sidebar side", "Right");
  await trigger.click();
  await expect(page.getByRole("menu", { name: "Workspaces" })).toHaveAttribute(
    "data-side",
    "left",
  );
  await expect(page.getByRole("menuitemradio")).toHaveCount(3);
  await expect(
    page.getByRole("menuitemradio", { name: "Orbit workspace" }),
  ).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(trigger).toContainText("Orbit workspace");
  await trigger.click();
  await expect(
    page.getByRole("menuitemradio", { name: "Orbit workspace" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await expect(trigger).toContainText("Studio workspace");
  await trigger.click();
  await expect(page.getByRole("menuitemradio")).toHaveCount(2);
});

test("workspace shortcuts and the collapsed switcher remain usable", async ({
  page,
}) => {
  await page.goto("/components/sidebar/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  const trigger = page.getByRole("button", {
    name: "Switch workspace",
    exact: true,
  });
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByRole("menu", { name: "Workspaces" })).toHaveAttribute(
    "data-side",
    "right",
  );
  await expect(page.getByRole("menu", { name: "Workspaces" })).toBeFocused();
  await page.keyboard.press("Control+2");
  await expect(page.getByRole("menu", { name: "Workspaces" })).toHaveCount(0);
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(trigger).toContainText("Personal workspace");
  await trigger.click();
  await expect(page.getByRole("menu", { name: "Workspaces" })).toBeFocused();
  await page.keyboard.press("Meta+1");
  await expect(trigger).toContainText("Studio workspace");
});

test("Add workspace dialog is accessible inside the drawer and can be cancelled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/components/sidebar/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  const trigger = page.getByRole("button", {
    name: "Switch workspace",
    exact: true,
  });
  await trigger.click();
  await page.getByRole("menuitem", { name: "Add workspace" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Add workspace",
    exact: true,
  });
  await expect(dialog).toHaveCSS("opacity", "1");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await dialog.getByRole("textbox").fill("Not created");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "Workspace navigation" }),
  ).toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger).toContainText("Studio workspace");
});

const selectRoute = "/components/select/";

async function openSelectPage(page: Page) {
  await page.goto(selectRoute);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

async function settleSelect(page: Page) {
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

async function selectShot(
  target: Page | Locator,
  testInfo: TestInfo,
  name: string,
) {
  const path = testInfo.outputPath(`${name}.png`);
  await target.screenshot({ path });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function selectAxe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .exclude("[data-base-ui-focus-guard]")
    .analyze();
  expect(results.violations).toEqual([]);
}

const demo = (page: Page, name: string) =>
  page.locator(`[data-demo="${name}"]`);
const listbox = (page: Page) => page.getByRole("listbox");
const openContent = (page: Page) =>
  page.locator('[data-slot="select-content"][data-open]');

async function expectInside(element: Locator, width: number, height: number) {
  const box = (await element.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(height + 0.5);
}

/** No text or child spills out of its trigger or list sideways. */
async function expectNoOverflow(element: Locator) {
  expect(
    await element.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return [...node.querySelectorAll("*")].every((child) => {
        const rect = child.getBoundingClientRect();
        if (!rect.width) return true;
        return rect.left >= box.left - 1 && rect.right <= box.right + 1;
      });
    }),
  ).toBe(true);
}

test.describe("Select component", () => {
  test("has docs navigation and no native select", async ({ page }) => {
    await openSelectPage(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Select" }),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/components/select/"]').first(),
    ).toBeVisible();
    await expect(page.locator("select")).toHaveCount(0);
    const triggers = page.locator('[data-slot="select-trigger"]');
    expect(await triggers.count()).toBeGreaterThan(20);
    for (const trigger of await triggers.all()) {
      await expect(trigger).toHaveJSProperty("tagName", "BUTTON");
      await expect(trigger).toHaveAttribute("role", "combobox");
    }
  });

  test("supports keyboard open, arrows, typeahead, Enter, Escape and focus return", async ({
    page,
  }) => {
    await openSelectPage(page);
    const duration = page.getByRole("combobox", {
      name: "Duration",
      exact: true,
    });
    await expect(duration).toHaveText("30 minutes");
    await duration.focus();
    await page.keyboard.press("ArrowDown");
    await expect(listbox(page)).toBeVisible();
    await expect(
      page.getByRole("option", { name: "30 minutes" }),
    ).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option", { name: "1 hour" })).toHaveAttribute(
      "data-highlighted",
      "",
    );
    await page.keyboard.press("Enter");
    await expect(listbox(page)).toHaveCount(0);
    await expect(duration).toHaveText("1 hour");
    await expect(duration).toBeFocused();
    await expect(demo(page, "select-playground")).toContainText("1 hour");

    const repeat = page.getByRole("combobox", { name: "Repeat", exact: true });
    await repeat.focus();
    await page.keyboard.press("Enter");
    await expect(listbox(page)).toBeVisible();
    await page.keyboard.press("w");
    await expect(
      page.getByRole("option", { name: "Weekdays" }),
    ).toHaveAttribute("data-highlighted", "");
    await page.keyboard.press("End");
    await expect(
      page.getByRole("option", { name: "Every week" }),
    ).toHaveAttribute("data-highlighted", "");
    await page.keyboard.press("Escape");
    await expect(listbox(page)).toHaveCount(0);
    await expect(repeat).toHaveText("Does not repeat");
    await expect(repeat).toBeFocused();
    await page.keyboard.press("Space");
    await expect(listbox(page)).toBeVisible();
    await page.getByRole("option", { name: "Every day" }).click();
    await expect(repeat).toHaveText("Every day");
  });

  test("renders each size and width at Cloud dimensions", async ({
    page,
  }, testInfo) => {
    await openSelectPage(page);
    const sizes = demo(page, "select-sizes");
    const team = sizes.getByRole("combobox", { name: "Owning team" });
    const role = sizes.getByRole("combobox", {
      name: "Access for Priya Raman",
    });
    const rows = sizes.getByRole("combobox", { name: "Rows per page" });
    const proposal = sizes.getByRole("combobox", { name: "Choose proposal" });
    const view = sizes.getByRole("combobox", { name: "Calendar view" });
    await expect(team).toHaveCSS("height", "32px");
    await expect(team).toHaveText("Select a team");
    await expect(team).toHaveAttribute("aria-required", "true");
    await expect(role).toHaveCSS("height", "32px");
    await expect(role).toHaveText("Can view");
    await expect(rows).toHaveCSS("height", "28px");
    await expect(rows).toHaveCSS("font-size", "12px");
    await expect(proposal).toHaveCSS("height", "28px");
    await expect(view).toHaveCSS("height", "32px");
    await expect(view).toHaveCSS("font-size", "12px");
    await expect(view).toHaveText("Week");
    const parentWidth = await team.evaluate(
      (node) => node.parentElement!.getBoundingClientRect().width,
    );
    expect((await team.boundingBox())!.width).toBeCloseTo(parentWidth, 0);
    expect((await role.boundingBox())!.width).toBeLessThan(160);
    for (const trigger of [team, role, rows, proposal, view])
      await expectNoOverflow(trigger);

    await rows.click();
    await page.getByRole("option", { name: "100", exact: true }).click();
    await expect(rows).toHaveText("100");
    await expect(sizes).toContainText("1–100 of 214");
    await team.click();
    await page.getByRole("option", { name: "Platform engineering" }).click();
    await expect(team).toHaveText("Platform engineering");
    await proposal.click();
    await page
      .getByRole("option", { name: "Post the launch summary in #launches" })
      .click();
    await expect(proposal).toContainText("Post the launch summary");
    await expectNoOverflow(proposal);
    await selectShot(sizes, testInfo, "select-sizes");
  });

  test("handles placeholders, empty-string values and children labels", async ({
    page,
  }) => {
    await openSelectPage(page);
    const values = demo(page, "select-values");
    const type = values.getByRole("combobox", { name: "Type" });
    await expect(type).toHaveText("Any type");
    await type.click();
    await page.getByRole("option", { name: "PDFs" }).click();
    await expect(type).toHaveText("PDFs");
    await type.click();
    await page.getByRole("option", { name: "Any type" }).click();
    await expect(type).toHaveText("Any type");

    const member = values.getByRole("combobox", { name: /Assignee/ });
    await expect(member).toHaveText("Select a member");
    await expect(member).toHaveAttribute("data-placeholder", "");
    await member.click();
    await page.getByRole("option", { name: "Marcus Lee" }).click();
    await expect(member).toHaveText("Marcus Lee");

    const channel = values.getByRole("combobox", { name: "Slack channel" });
    await expect(channel).toHaveText("Checking channel…");
    await expect(channel).toBeDisabled();
    await expect(channel).toHaveAttribute("aria-busy", "true");
    await values.getByRole("button", { name: "Finish loading" }).click();
    await expect(channel).toHaveText("Choose a Slack channel");
    await expect(channel).toBeEnabled();
    await channel.click();
    await page.getByRole("option", { name: "#revenue-ops" }).click();
    await expect(channel).toHaveText("#revenue-ops");
  });

  test("shows groups, labels, separators and disabled items", async ({
    page,
  }, testInfo) => {
    await openSelectPage(page);
    const groups = demo(page, "select-groups");
    await groups.getByRole("combobox", { name: "Share with" }).click();
    const list = listbox(page);
    await expect(list.getByRole("group", { name: "People" })).toBeVisible();
    await expect(list.getByRole("group", { name: "Teams" })).toBeVisible();
    await settleSelect(page);
    await selectShot(openContent(page), testInfo, "select-groups-open");
    await page.getByRole("option", { name: "Finance" }).click();
    await expect(listbox(page)).toHaveCount(0);
    await expect(
      groups.getByRole("combobox", { name: "Share with" }),
    ).toHaveText("Finance");

    const frequency = groups.getByRole("combobox", {
      name: "Digest frequency",
    });
    await expect(frequency).toHaveText("Weekly");
    await frequency.click();
    await expect(page.locator('[data-slot="select-separator"]')).toHaveCount(1);
    const monthly = page.getByRole("option", { name: "Monthly (unavailable)" });
    await expect(monthly).toHaveAttribute("aria-disabled", "true");
    await expect(monthly).toHaveCSS("opacity", "0.5");
    await monthly.click({ force: true });
    await expect(listbox(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(frequency).toHaveText("Weekly");
  });

  test("renders icon and two-line rich items without overflow", async ({
    page,
  }, testInfo) => {
    await openSelectPage(page);
    const rich = demo(page, "select-rich");
    await rich.getByRole("combobox", { name: "Add a channel" }).click();
    await expect(
      page.getByRole("option", { name: "launches (already added)" }),
    ).toHaveAttribute("aria-disabled", "true");
    await expect(
      page.locator('[data-slot="select-item"] svg').first(),
    ).toBeVisible();
    await page.getByRole("option", { name: "support-escalations" }).click();
    await expect(listbox(page)).toHaveCount(0);
    await expect(
      rich.getByRole("combobox", { name: "Add a channel" }),
    ).toHaveText("support-escalations");

    const model = rich.getByRole("combobox", {
      name: /Preferred model family/,
    });
    await expect(model).toHaveText("Workspace default");
    await model.click();
    const content = openContent(page);
    await expect(content).toContainText(
      "300 input / 1,500 output Credits per 1M tokens",
    );
    await expect(
      page.getByRole("option", { name: /DeepSeek R1 \(unavailable\)/ }),
    ).toHaveAttribute("aria-disabled", "true");
    await settleSelect(page);
    await expectNoOverflow(content);
    await selectShot(content, testInfo, "select-model-picker-open");
    await page.getByRole("option", { name: /GPT-5/ }).click();
    await expect(model).toContainText("GPT-5");
    await expect(model).not.toContainText("Credits");
    await expectNoOverflow(model);
  });

  test("covers disabled, loading, empty, invalid and required form states", async ({
    page,
  }, testInfo) => {
    await openSelectPage(page);
    const states = demo(page, "select-states");
    const sender = states.getByRole("combobox", { name: "Sender" });
    await expect(sender).toBeDisabled();
    await expect(sender).toHaveText("TulipFarm app");
    await expect(sender).toHaveCSS("opacity", "0.5");
    const loading = states.getByRole("combobox", {
      name: "Table",
      exact: true,
    });
    await expect(loading).toHaveAttribute("aria-busy", "true");
    await expect(loading).toHaveText("Loading tables…");
    await expect(loading).toBeDisabled();
    const empty = states.getByRole("combobox", { name: "Destination table" });
    await expect(empty).toBeDisabled();
    await expect(empty).toHaveAccessibleDescription(
      "No tables yet. Create one in Tables first.",
    );

    const fallback = states.getByRole("combobox", {
      name: "Fallback for Claude Sonnet",
    });
    await expect(fallback).toBeDisabled();
    await expect(fallback).toHaveAttribute("aria-busy", "true");
    await expect(fallback).toHaveText("No fallback");
    await expect(fallback).toHaveAccessibleDescription("Saving fallback…");
    await expect(states.getByText("Fallback for Claude Sonnet")).toHaveCSS(
      "position",
      "absolute",
    );
    const source = states.getByRole("combobox", { name: /Source/ });
    await expect(source).toHaveAttribute("aria-invalid", "true");
    await expect(source).toHaveAccessibleDescription(
      "Choose a source to continue.",
    );
    await expect(source).toHaveCSS(
      "border-top-color",
      await page.evaluate(() => {
        const probe = document.createElement("div");
        probe.style.color = "var(--sprout-danger)";
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      }),
    );
    await source.click();
    await page.getByRole("option", { name: "Engineering (ENG)" }).click();
    await expect(source).not.toHaveAttribute("aria-invalid", "true");
    await expect(states).not.toContainText("Choose a source to continue.");

    const access = states.getByRole("combobox", { name: /Access/ });
    const save = states.getByRole("button", { name: "Save access" });
    const form = states.getByRole("form", { name: "Integration access" });
    expect(
      await form.evaluate((node) => (node as HTMLFormElement).checkValidity()),
    ).toBe(false);
    await save.click();
    await expect(states.locator(".select-demo-status")).toHaveText("");
    await access.click();
    await page.getByRole("option", { name: "Read and write" }).click();
    await save.click();
    await expect(states.getByRole("status")).toHaveText(
      "Saved with access “write”.",
    );
    await states.getByRole("checkbox", { name: /Lock the form/ }).check();
    await expect(access).toBeDisabled();
    await selectShot(states, testInfo, "select-states");
  });

  test("works in toolbars, popovers, sheets and tooltip triggers", async ({
    page,
  }, testInfo) => {
    await openSelectPage(page);
    const compositions = demo(page, "select-compositions");
    const toolbar = compositions.getByRole("region", { name: "File filters" });
    for (const [label, text] of [
      ["Type", "Any type"],
      ["Modified", "Last 7 days"],
      ["Sort", "Modified, newest first"],
      ["Status", "All runs"],
    ]) {
      const trigger = toolbar.getByRole("combobox", {
        name: label,
        exact: true,
      });
      await expect(trigger).toHaveText(text);
      await expect(trigger).toHaveCSS("height", "28px");
    }
    await toolbar.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: "Waiting to continue" }).click();
    await expect(toolbar.getByRole("combobox", { name: "Status" })).toHaveText(
      "Waiting to continue",
    );
    await selectShot(toolbar, testInfo, "select-toolbar");

    await compositions.getByRole("button", { name: "Filter" }).click();
    const popover = page.getByRole("dialog", { name: "Filter rows" });
    await expect(popover).toBeVisible();
    const match = popover.getByRole("combobox", { name: "Condition match" });
    await expect(match).toHaveText("all conditions");
    const comparison = popover.getByRole("combobox", {
      name: "Comparison for Amount",
    });
    await expect(comparison).toHaveAttribute("aria-invalid", "true");
    await match.click();
    await page.getByRole("option", { name: "any condition" }).click();
    await expect(popover).toBeVisible();
    await expect(match).toHaveText("any condition");
    await comparison.click();
    await page.getByRole("option", { name: "is at least" }).click();
    await expect(comparison).toHaveText("is at least");
    await expect(comparison).not.toHaveAttribute("aria-invalid", "true");
    await settleSelect(page);
    await selectShot(popover, testInfo, "select-in-popover");
    await page.keyboard.press("Escape");
    await expect(popover).toHaveCount(0);

    const mode = compositions.getByRole("combobox", { name: "Chat mode" });
    await mode.focus();
    await expect(page.getByRole("tooltip")).toHaveText(
      "Normal acts on your request. Plan only proposes steps first.",
    );
    await expect(mode).toHaveAccessibleDescription(
      "Normal acts on your request. Plan only proposes steps first.",
    );
    await page.keyboard.press("ArrowDown");
    await page.getByRole("option", { name: "Plan only" }).click();
    await expect(mode).toHaveText("Plan");

    await compositions.getByRole("button", { name: "Event details" }).click();
    const sheet = page.getByRole("dialog", { name: "Product review" });
    await expect(sheet).toBeVisible();
    const zone = sheet.getByRole("combobox", { name: "Shown in" });
    await expect(zone).toHaveCSS("height", "28px");
    await zone.click();
    await page.getByRole("option", { name: "Asia/Tokyo" }).click();
    await expect(sheet).toBeVisible();
    await expect(zone).toHaveText("Asia/Tokyo");
  });

  test("scrolls a long list and keeps it inside the viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 520 });
    await openSelectPage(page);
    const zone = page.getByRole("combobox", { name: "Time zone", exact: true });
    await zone.scrollIntoViewIfNeeded();
    await zone.click();
    const content = openContent(page);
    await expect(content).toBeVisible();
    await settleSelect(page);
    await expectInside(content, 1280, 520);
    expect(
      await content.evaluate((node) => node.scrollHeight > node.clientHeight),
    ).toBe(true);
    await page.keyboard.press("End");
    await expect(
      page.getByRole("option", { name: "Pacific/Auckland" }),
    ).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(zone).toHaveText("Pacific/Auckland");
  });

  for (const mode of ["Light", "Dark"] as const) {
    test(`uses ${mode.toLowerCase()} theme colors, passes axe and respects reduced motion`, async ({
      page,
    }, testInfo) => {
      await openSelectPage(page);
      await chooseOption(page, "Color mode", mode);
      const duration = page.getByRole("combobox", {
        name: "Duration",
        exact: true,
      });
      const surface =
        mode === "Dark" ? "rgb(29, 29, 29)" : "rgb(253, 253, 253)";
      await expect(duration).toHaveCSS("background-color", surface);
      await duration.focus();
      await page.keyboard.press("ArrowDown");
      const content = openContent(page);
      await expect(content).toHaveCSS("background-color", surface);
      await settleSelect(page);
      await expect(content).toHaveCSS("opacity", "1");
      await expect(content).toHaveCSS("transition-duration", "0.12s, 0.12s");
      await selectAxe(page);
      await selectShot(
        demo(page, "select-playground"),
        testInfo,
        `select-open-${mode.toLowerCase()}`,
      );
      await page.keyboard.press("Escape");
      await expect(listbox(page)).toHaveCount(0);
      await settleSelect(page);
      await selectShot(
        demo(page, "select-sizes"),
        testInfo,
        `select-sizes-${mode.toLowerCase()}`,
      );
      await selectShot(
        demo(page, "select-states"),
        testInfo,
        `select-states-${mode.toLowerCase()}`,
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      await duration.click();
      await expect(content).toHaveCSS("transition-duration", "0s");
      await page.keyboard.press("Escape");
    });
  }

  test("shows a visible focus ring on keyboard focus", async ({ page }) => {
    await openSelectPage(page);
    const calendar = page.getByRole("combobox", {
      name: "Calendar",
      exact: true,
    });
    await calendar.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(calendar).toBeFocused();
    await expect(calendar).toHaveCSS("outline-style", "solid");
    await expect(calendar).toHaveCSS("outline-width", "1px");
  });
});

test.describe("Select on touch screens", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("fits a phone and uses 44px targets", async ({ page }, testInfo) => {
    await openSelectPage(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    const view = page.getByRole("combobox", { name: "Calendar view" });
    await expect(view).toHaveCSS("min-height", "44px");
    await expect(view).toHaveCSS("min-width", "44px");
    const proposal = page.getByRole("combobox", { name: "Choose proposal" });
    await expect(proposal).toHaveCSS("min-height", "44px");
    await expectNoOverflow(proposal);
    await proposal.tap();
    const content = openContent(page);
    await expect(content).toBeVisible();
    await settleSelect(page);
    await expectInside(content, 390, 844);
    await expect(page.getByRole("option").first()).toHaveCSS(
      "min-height",
      "44px",
    );
    await selectShot(page, testInfo, "select-mobile-open");
    await page
      .getByRole("option", { name: "Update the Q3 forecast sheet" })
      .tap();
    await expect(proposal).toHaveText("Update the Q3 forecast sheet");
    await selectShot(
      demo(page, "select-sizes"),
      testInfo,
      "select-sizes-mobile",
    );
  });
});
