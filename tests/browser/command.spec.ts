import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { setColorMode } from "./choose-option";

test.use({ reducedMotion: "reduce" });

async function openPage(page: Page) {
  await page.goto("/components/command/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    );
  });
}

const section = (page: Page, name: string) =>
  page.getByRole("region", { name, exact: true });
const popups = (page: Page) =>
  page.locator('[data-slot="popover-content"][data-open]');
const options = (scope: Page | Locator) => scope.getByRole("option");

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

async function setMode(page: Page, mode: "Light" | "Dark") {
  await setColorMode(page, mode);
  await settle(page);
}

async function activeName(input: Locator) {
  const id = await input.getAttribute("aria-activedescendant");
  if (!id) return null;
  return input
    .page()
    .evaluate(
      (value) => document.getElementById(value)?.textContent?.trim() ?? null,
      id,
    );
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

async function openPicker(page: Page, name: string) {
  const trigger = page.getByRole("button", { name, exact: true });
  await trigger.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await trigger.click();
  await settle(page);
  const popup = popups(page);
  await expect(popup).toHaveCount(1);
  return { trigger, popup, input: popup.getByRole("combobox") };
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["Light", "Dark"] as const) {
    test(`renders accessibly in ${theme} ${mode.toLowerCase()} mode`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await openPage(page);
      await page.evaluate(
        (value) => (document.documentElement.dataset.sproutTheme = value),
        theme,
      );
      await setMode(page, mode);
      await axe(page);
      const name = `${theme}-${mode.toLowerCase()}`;
      await shot(
        section(page, "Command playground"),
        testInfo,
        `command-playground-${name}`,
      );
      await shot(
        section(page, "Project scope"),
        testInfo,
        `command-project-triggers-${name}`,
      );

      const persona = await openPicker(page, "Mode or agent: Mode");
      await expect(persona.input).toBeFocused();
      await axe(page);
      await shot(persona.popup, testInfo, `command-persona-${name}`);
      await page.keyboard.press("Escape");
      await settle(page);

      const model = await openPicker(
        page,
        "Model: Claude Sonnet 4.5, Medium effort",
      );
      await shot(model.popup, testInfo, `command-model-${name}`);
      await page.keyboard.press("Escape");
      await settle(page);

      await page.getByRole("button", { name: /^Search commands/ }).click();
      await settle(page);
      const dialog = page.getByRole("dialog", { name: "Command Palette" });
      await expect(dialog).toBeVisible();
      await axe(page);
      await shot(page, testInfo, `command-dialog-${name}`);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    });
  }
}

test("navigates with the keyboard and keeps focus in the search", async ({
  page,
}) => {
  await openPage(page);
  const demo = section(page, "Command playground");
  const input = demo.getByRole("combobox", { name: "Search sample commands" });
  await input.focus();
  await expect(input).toHaveAttribute(
    "aria-controls",
    (await demo.getByRole("listbox").getAttribute("id"))!,
  );
  expect(await activeName(input)).toBe("New draft⌘ N");
  await expect(demo.getByRole("option", { name: /New draft/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.keyboard.press("ArrowDown");
  expect(await activeName(input)).toBe("Open folder");
  await page.keyboard.press("ArrowDown");
  expect(await activeName(input)).toBe("Preferences");
  await page.keyboard.press("ArrowDown");
  expect(await activeName(input)).toBe("Preferences");
  await page.keyboard.press("Home");
  expect(await activeName(input)).toBe("New draft⌘ N");
  await page.keyboard.press("End");
  expect(await activeName(input)).toBe("Preferences");
  await page.keyboard.press("Control+p");
  expect(await activeName(input)).toBe("Open folder");
  await page.keyboard.press("Control+n");
  expect(await activeName(input)).toBe("Preferences");
  await page.keyboard.press("Alt+ArrowUp");
  expect(await activeName(input)).toBe("New draft⌘ N");
  await page.keyboard.press("Alt+ArrowDown");
  expect(await activeName(input)).toBe("Preferences");
  await page.keyboard.press("Meta+ArrowUp");
  expect(await activeName(input)).toBe("New draft⌘ N");
  await page.keyboard.press("Meta+ArrowDown");
  expect(await activeName(input)).toBe("Preferences");

  await expect(
    demo.getByRole("option", { name: "Unavailable action" }),
  ).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Enter");
  await expect(demo.getByRole("status")).toHaveText("Chosen: Preferences");
  await expect(input).toBeFocused();
});

test("filters, ranks, and recovers from an empty search", async ({ page }) => {
  await openPage(page);
  const demo = section(page, "Command playground");
  const input = demo.getByRole("combobox", { name: "Search sample commands" });
  await expect(demo.locator('[data-slot="command-separator"]')).toHaveCount(1);
  await input.fill("PREF");
  await expect(options(demo)).toHaveText(["Preferences"]);
  await expect(demo.getByText("Suggestions", { exact: true })).toBeHidden();
  await expect(demo.getByText("Settings", { exact: true })).toBeVisible();
  await expect(demo.locator('[data-slot="command-separator"]')).toHaveCount(0);
  expect(await activeName(input)).toBe("Preferences");

  await input.fill("fold");
  await expect(options(demo)).toHaveText(["Open folder"]);
  await page.keyboard.press("Enter");
  await expect(demo.getByRole("status")).toHaveText("Chosen: Open folder");

  await input.fill("zzz");
  await expect(options(demo)).toHaveCount(0);
  await expect(demo.getByText("No matching commands.")).toBeVisible();
  expect(await input.getAttribute("aria-activedescendant")).toBeNull();
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(demo.getByRole("listbox")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(demo.getByRole("status")).toHaveText("Chosen: Open folder");

  await input.fill("");
  await expect(options(demo)).toHaveCount(4);
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await expect(demo.getByText("No matching commands.")).toHaveCount(0);
  await expect(demo.locator('[data-slot="command-separator"]')).toHaveCount(1);
  expect(await activeName(input)).toBe("New draft⌘ N");
});

test("highlights on hover and selects on click without moving focus", async ({
  page,
}) => {
  await openPage(page);
  const demo = section(page, "Command playground");
  const input = demo.getByRole("combobox", { name: "Search sample commands" });
  await input.focus();
  const folder = demo.getByRole("option", { name: "Open folder" });
  await folder.hover();
  await expect(folder).toHaveAttribute("data-selected", "true");
  await demo
    .getByRole("option", { name: "Unavailable action" })
    .hover({ force: true });
  await expect(folder).toHaveAttribute("data-selected", "true");
  await folder.click();
  await expect(demo.getByRole("status")).toHaveText("Chosen: Open folder");
  await expect(input).toBeFocused();
});

test("opens the command palette from a button or shortcut and returns focus", async ({
  page,
}) => {
  await openPage(page);
  const demo = section(page, "Command palette");
  const trigger = demo.getByRole("button", { name: /^Search commands/ });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Command Palette" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription(
    "Search for a command to run...",
  );
  await expect(dialog.getByRole("button", { name: "Close" })).toHaveCount(0);
  const input = dialog.getByRole("combobox", { name: "Search commands" });
  await expect(input).toBeFocused();
  expect(await activeName(input)).toBe("HomeG H");

  await input.fill("schedule");
  await expect(options(dialog)).toHaveText(["Calendar"]);
  await input.fill("ch");
  expect(await activeName(input)).toBe("ChatsG C");
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(demo.getByRole("status")).toHaveText(
    "Last command: Opened Chats",
  );
  await expect(trigger).toBeFocused();

  await page.keyboard.press("ControlOrMeta+k");
  await expect(dialog).toBeVisible();
  const dark = dialog.getByRole("option", { name: "Dark theme" });
  await expect(dark).toHaveAttribute("data-checked", "false");
  await dark.click();
  await expect(dark).toHaveAttribute("data-checked", "true");
  await expect(
    dialog.getByRole("option", { name: "Match system" }),
  ).toHaveAttribute("data-checked", "false");
  await expect(
    dialog.getByRole("option", { name: /Invite teammate/ }),
  ).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  const closeTrigger = demo.getByRole("button", {
    name: "Open workspace commands",
  });
  await closeTrigger.click();
  const named = page.getByRole("dialog", { name: "Workspace commands" });
  await expect(named).toHaveAccessibleDescription(
    "Jump to a page or run an action.",
  );
  await named.getByRole("button", { name: "Close" }).click();
  await expect(named).toHaveCount(0);
  await expect(closeTrigger).toBeFocused();
});

test("persona picker searches descriptions and toggles the choice", async ({
  page,
}) => {
  await openPage(page);
  const { popup, input, trigger } = await openPicker(
    page,
    "Mode or agent: Mode",
  );
  await expect(popup).toHaveAttribute("data-side", "top");
  await expect(input).toHaveAttribute(
    "placeholder",
    "Search modes and agents…",
  );
  await expect(popup.getByText("Modes", { exact: true })).toBeVisible();
  await expect(popup.getByText("Agents", { exact: true })).toBeVisible();
  await expect(popup.locator('[data-slot="command-separator"]')).toHaveCount(1);
  await expect(options(popup)).toHaveCount(5);
  await input.fill("receipts");
  await expect(options(popup)).toHaveCount(1);
  await expect(options(popup).first()).toContainText("Expense reviewer");
  await page.keyboard.press("Enter");
  await expect(popups(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Mode or agent: Expense reviewer" }),
  ).toBeFocused();

  const again = await openPicker(page, "Mode or agent: Expense reviewer");
  await expect(again.input).toHaveValue("");
  const checked = again.popup.locator('[data-checked="true"]');
  await expect(checked).toHaveCount(1);
  await expect(checked).toContainText("Expense reviewer");
  await again.input.fill("xyzzy");
  await expect(again.popup.getByText("No matches.")).toBeVisible();
  await again.input.fill("");
  await checked.click();
  await expect(trigger).toHaveAccessibleName("Mode or agent: Mode");
});

test("model picker shows logos, unavailable models, and the effort footer", async ({
  page,
}) => {
  await openPage(page);
  const trigger = page.getByRole("button", {
    name: "Model: Claude Sonnet 4.5, Medium effort",
  });
  await trigger.hover();
  await expect(page.getByRole("tooltip")).toHaveText(
    "AI model that writes replies",
  );
  const { popup, input } = await openPicker(
    page,
    "Model: Claude Sonnet 4.5, Medium effort",
  );
  await expect(popup).toHaveAttribute("data-side", "top");
  await expect(popup.getByText("Model", { exact: true })).toBeVisible();
  const current = popup.getByRole("option", { name: /Claude Sonnet 4\.5/ });
  await expect(current).toHaveAttribute("data-checked", "true");
  await expect(current).toContainText("Current model");
  const grok = popup.getByRole("option", { name: /Grok 4/ });
  await expect(grok).toHaveAttribute("aria-disabled", "true");
  await expect(grok).toContainText("Grok 4 (needs an admin to enable)");
  await expect(
    popup.locator('[data-slot="command-item"] [data-slot="brand-icon"]'),
  ).toHaveCount(4);
  await expect(popup.getByText("Effort", { exact: true })).toBeVisible();

  await input.fill("deep");
  await page.keyboard.press("Enter");
  await expect(popups(page)).toHaveCount(1);
  await expect(
    popup
      .getByRole("group", { name: "DeepSeek R2 reasoning effort" })
      .getByRole("button"),
  ).toHaveText(["Low", "High"]);
  await popup.getByRole("button", { name: "Low", exact: true }).click();
  await expect(popup.getByText("Low", { exact: true }).first()).toBeVisible();

  await input.fill("xyz");
  await expect(popup.getByText("No models found.")).toBeVisible();
  await input.fill("mini");
  await page.keyboard.press("Enter");
  await expect(popups(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Model: GPT-5 mini" }),
  ).toBeVisible();
});

test("project scope matches keywords, clears its search, and picks a project", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPage(page);
  const { popup, input } = await openPicker(page, "Project: Personal chats");
  await expect(popup).toHaveAttribute("data-side", "bottom");
  await expect(
    popup.getByRole("listbox", { name: "Chat projects" }),
  ).toBeVisible();
  await expect(
    popup.getByRole("option", { name: "Personal chats" }),
  ).toHaveAttribute("data-checked", "true");
  await expect(popup.getByRole("option", { name: /\(archived\)/ })).toHaveCount(
    1,
  );
  await expect(
    popup.getByRole("option", { name: "Personal chats" }),
  ).toHaveAttribute("data-value", "private");

  await input.fill("lisbon");
  await expect(options(popup)).toHaveText(["Lisbon office launch"]);
  await expect(options(popup).first()).toHaveAttribute(
    "data-value",
    "prj_lisbon",
  );
  await input.fill("personal");
  await expect(options(popup)).toHaveText(["Personal chats"]);

  await input.fill("zzz");
  await expect(popup.getByText("No matching projects.")).toBeVisible();
  await axe(page);
  await popup.getByRole("button", { name: "Clear search" }).click();
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await expect(options(popup)).toHaveCount(5);

  await input.fill("q4");
  await page.keyboard.press("Escape");
  await settle(page);
  const reopened = await openPicker(page, "Project: Personal chats");
  await expect(reopened.input).toHaveValue("");
  await reopened.popup.getByRole("option", { name: "Q4 hiring plan" }).click();
  await expect(
    page.getByRole("button", { name: "Project: Q4 hiring plan", exact: true }),
  ).toBeVisible();

  const badge = await openPicker(page, "Chat project: Q4 hiring plan");
  await expect(badge.popup).toHaveAttribute("data-side", "top");
  await expect(
    badge.popup.getByRole("option", { name: /\(archived\)/ }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await settle(page);

  const personal = page.getByRole("button", {
    name: "Chat project: Personal chats",
  });
  await expect(personal).toHaveText("Personal chat");
  await expect(personal).toHaveAttribute(
    "title",
    "Personal chat. Choose a project to share it.",
  );
  await expect(
    page.getByRole("button", { name: "Locked project: Personal chats" }),
  ).toBeDisabled();

  const field = await openPicker(page, "Project: Q4 hiring plan");
  await field.popup.getByRole("button", { name: "New project" }).click();
  await expect(popups(page)).toHaveCount(0);
  await expect(section(page, "Project scope").getByRole("status")).toHaveText(
    "New project: the create dialog would open here.",
  );
});

test("project scope shows loading, failed, stale, and empty-workspace states", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPage(page);
  const states = section(page, "Project scope").getByRole("group", {
    name: "Project list state",
  });

  await states.getByRole("button", { name: "Loading", exact: true }).click();
  let picker = await openPicker(page, "Project: Personal chats");
  await expect(picker.popup.getByRole("status")).toHaveText(
    "Loading projects…",
  );
  await expect(options(picker.popup)).toHaveText(["Personal chats"]);
  await shot(picker.popup, testInfo, "command-project-loading");
  await page.keyboard.press("Escape");
  await settle(page);

  await states.getByRole("button", { name: "Failed", exact: true }).click();
  picker = await openPicker(page, "Project: Personal chats");
  await expect(picker.popup.getByRole("alert")).toHaveText(
    "Could not load projects.",
  );
  await picker.input.fill("zzz");
  await expect(picker.popup.getByText("No matching projects.")).toHaveCount(0);
  await picker.input.fill("");
  await shot(picker.popup, testInfo, "command-project-failed");
  await page.keyboard.press("Escape");
  await settle(page);

  await states
    .getByRole("button", { name: "Refresh failed", exact: true })
    .click();
  picker = await openPicker(page, "Project: Personal chats");
  await expect(picker.popup.getByRole("alert")).toHaveText(
    "Could not load projects. Showing the last loaded projects.",
  );
  await expect(options(picker.popup)).toHaveCount(5);
  await axe(page);
  await picker.popup
    .getByRole("button", { name: "Retry loading projects" })
    .click();
  await expect(picker.popup.getByRole("alert")).toHaveCount(0);
  await expect(
    states.getByRole("button", { name: "Ready", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await settle(page);

  await states
    .getByRole("button", { name: "No projects", exact: true })
    .click();
  picker = await openPicker(page, "Project: Personal chats");
  await expect(
    picker.popup.getByText(
      "No active projects yet. Create one for shared chats.",
    ),
  ).toBeVisible();
  await expect(options(picker.popup)).toHaveText(["Personal chats"]);
  await shot(picker.popup, testInfo, "command-project-none");
  await picker.input.fill("x");
  await expect(
    picker.popup.getByText(
      "No active projects yet. Create one for shared chats.",
    ),
  ).toHaveCount(0);
  await expect(picker.popup.getByText("No matching projects.")).toBeVisible();
});

test("fits a phone without overflow and wraps long project names", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page);
  const demo = section(page, "Command playground");
  expect(
    await demo.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);
  await shot(demo, testInfo, "command-playground-mobile");

  for (const name of [
    "Mode or agent: Mode",
    "Model: Claude Sonnet 4.5, Medium effort",
    "Project: Personal chats",
  ]) {
    const { popup } = await openPicker(page, name);
    await expectContained(popup);
    if (name.startsWith("Project")) {
      const archived = popup.getByRole("option", { name: /\(archived\)/ });
      const [long, short] = [
        (await archived.boundingBox())!,
        (await popup
          .getByRole("option", { name: "Q4 hiring plan" })
          .boundingBox())!,
      ];
      expect(long.height).toBeGreaterThan(short.height + 10);
    }
    await shot(
      popup,
      testInfo,
      `command-${name.split(":")[0]!.toLowerCase().replaceAll(" ", "-")}-mobile`,
    );
    await page.keyboard.press("Escape");
    await settle(page);
  }

  await section(page, "Command palette")
    .getByRole("button", { name: /^Search commands/ })
    .click();
  const dialog = page.getByRole("dialog", { name: "Command Palette" });
  await settle(page);
  await expectContained(dialog);
  await shot(page, testInfo, "command-dialog-mobile");
});

test("animates highlights only when motion is allowed", async ({ page }) => {
  await openPage(page);
  const item = section(page, "Command playground").getByRole("option", {
    name: "Open folder",
  });
  expect(
    await item.evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    ),
  ).toBe("0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(
    await item.evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    ),
  ).toBe("0.12s");
});
