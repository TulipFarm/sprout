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
  await page.goto("/components/dropdown-menu/");
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
  page.getByRole("region", { name });
const row = (page: Page, name: string) =>
  page.getByRole("group", { name, exact: true });
const menus = (page: Page) => page.getByRole("menu");
const item = (page: Page, name: string) =>
  page.getByRole("menuitem", { name, exact: true });

async function axe(page: Page) {
  // Base UI adds hidden 1px focus guards beside an open menu so Tab leaves the portal in order.
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

async function closeMenus(page: Page) {
  for (let i = 0; i < 3 && (await menus(page).count()) > 0; i++) {
    await page.keyboard.press("Escape");
    await settle(page);
  }
  await expect(menus(page)).toHaveCount(0);
}

/** The menu stays in the viewport, and nothing inside it spills sideways. */
async function expectContained(menu: Locator) {
  expect(
    await menu.evaluate((element) => {
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

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`dropdown menu sizes ${theme} ${mode} at ${width}px`, async ({
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

        const playground = page.getByRole("region", {
          name: "Dropdown menu playground",
        });
        for (const [size, label] of [
          ["anchor", "Trigger-width menu"],
          ["menu", "Fixed-width menu"],
        ] as const) {
          const trigger = playground.getByRole("button", {
            name: label,
            exact: true,
          });
          await trigger.click();
          const menu = menus(page);
          await expect(menu).toBeVisible();
          await expect(menu).toHaveAttribute("data-size", size);
          await settle(page);
          const menuBox = (await menu.boundingBox())!;
          if (size === "menu") expect(menuBox.width).toBeCloseTo(256, 0);
          else
            expect(menuBox.width).toBeCloseTo(
              (await trigger.boundingBox())!.width,
              0,
            );
          await expectContained(menu);
          await item(page, "More").hover();
          const sub = page.locator('[data-slot="dropdown-menu-sub-content"]');
          await expect(sub).toBeVisible();
          await settle(page);
          await expectContained(sub);
          await axe(page);
          await shot(
            page,
            testInfo,
            `dropdown-${size}-${theme}-${mode}-${width}`,
          );
          await closeMenus(page);
        }

        const files = row(page, "Files row");
        await files.scrollIntoViewIfNeeded();
        await files
          .getByRole("button", { name: "More actions for Field notes.pdf" })
          .click();
        const fileMenu = menus(page);
        await expect(fileMenu).toHaveAttribute("data-size", "menu");
        await expect(fileMenu.getByRole("separator")).toHaveCount(2);
        await expect(item(page, "Move to trash")).toHaveAttribute(
          "data-variant",
          "destructive",
        );
        await settle(page);
        await expectContained(fileMenu);
        await shot(
          page,
          testInfo,
          `dropdown-files-row-${theme}-${mode}-${width}`,
        );
        await page.keyboard.press("Escape");

        const sidebar = section(page, "Sidebar menus");
        await sidebar.scrollIntoViewIfNeeded();
        await sidebar.getByRole("button", { name: "Account menu" }).click();
        const account = menus(page);
        await expect(account).toHaveAttribute("data-side", "top");
        await settle(page);
        await expectContained(account);
        await shot(
          page,
          testInfo,
          `dropdown-account-${theme}-${mode}-${width}`,
        );
        await page.keyboard.press("Escape");
      });
    }
  }
}

test("keyboard opens, moves, enters a submenu, and returns focus", async ({
  page,
}) => {
  await openPage(page);
  const trigger = page
    .getByRole("region", { name: "Dropdown menu playground" })
    .getByRole("button", { name: "Fixed-width menu" });
  await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(menus(page)).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(item(page, "New task ⌘ N")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(item(page, "Unavailable action")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(menus(page)).toBeVisible();
  await page.keyboard.press("ArrowDown");
  const completed = page.getByRole("menuitemcheckbox", {
    name: "Show completed",
  });
  await expect(completed).toBeFocused();
  await page.keyboard.press("Space");
  await expect(completed).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("Completed tasks: hidden")).toBeVisible();
  await page.keyboard.press("End");
  await expect(item(page, "Delete sample")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(item(page, "New task ⌘ N")).toBeFocused();
  await page.keyboard.press("m");
  await expect(item(page, "More")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(item(page, "Archive sample")).toBeFocused();
  await expect(menus(page)).toHaveCount(2);
  await page.keyboard.press("ArrowLeft");
  await expect(menus(page)).toHaveCount(1);
  await expect(item(page, "More")).toBeFocused();
  await page.keyboard.press("ArrowUp");
  const grid = page.getByRole("menuitemradio", { name: "Grid" });
  await expect(grid).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(grid).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("View: Grid").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menus(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(item(page, "New task ⌘ N")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(menus(page)).toHaveCount(0);
  await expect(page.getByText("New task selected locally.")).toBeVisible();
  await expect(trigger).toBeFocused();
});

test("disabled items can be focused but not chosen, and disabled triggers do not open", async ({
  page,
}) => {
  await openPage(page);
  const trigger = page
    .getByRole("region", { name: "Dropdown menu playground" })
    .getByRole("button", { name: "Trigger-width menu" });
  await trigger.click();
  const unavailable = item(page, "Unavailable action");
  await expect(unavailable).toHaveAttribute("aria-disabled", "true");
  await expect(unavailable).toHaveCSS("opacity", "0.5");
  await unavailable.click({ force: true });
  await expect(menus(page)).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Dropdown menu playground" })
      .getByRole("status"),
  ).toHaveText("No action selected.");
  await page.keyboard.press("Escape");

  const contracts = row(page, "Files row").getByRole("button", {
    name: "More actions for Contracts",
  });
  await expect(contracts).toBeDisabled();
  await contracts.click({ force: true });
  await expect(menus(page)).toHaveCount(0);
});

test("row actions report choices and destructive items use danger color", async ({
  page,
}) => {
  await openPage(page);
  const actions = section(page, "Row and page actions");
  await row(page, "Table row")
    .getByRole("button", { name: "Actions for row 1042" })
    .click();
  const menu = menus(page);
  await expect(menu).toHaveAttribute("data-size", "anchor");
  await expect(menu).toHaveAttribute("data-align", "end");
  const remove = item(page, "Delete row");
  const danger = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--sprout-danger")
      .trim(),
  );
  expect(danger).not.toBe("");
  await expect(remove).not.toHaveCSS(
    "color",
    await item(page, "History").evaluate((el) => getComputedStyle(el).color),
  );
  await remove.click();
  await expect(actions.getByRole("status")).toHaveText(
    "Delete row 1042 confirmation would open.",
  );

  const project = row(page, "Project files");
  await project
    .getByRole("button", { name: "Actions for Planting calendar" })
    .click();
  await expect(item(page, "View text")).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await item(page, "Pin to top").click();
  await project
    .getByRole("button", { name: "Actions for Planting calendar" })
    .click();
  await expect(item(page, "Unpin")).toBeVisible();
  await page.keyboard.press("Escape");

  await row(page, "Calendar")
    .getByRole("button", { name: "More calendar actions" })
    .click();
  await item(page, "Refresh calendar").click();
  await expect(actions.getByRole("status")).toHaveText("Calendar refreshed.");
});

test("a dialog opened from an item returns focus to the trigger ref", async ({
  page,
}) => {
  await openPage(page);
  const drive = row(page, "Google Drive");
  const trigger = drive.getByRole("button", {
    name: "More actions for Harvest plan",
  });
  await trigger.click();
  await item(page, "Save a copy to TulipFarm").click();
  const dialog = page.getByRole("dialog", {
    name: "Save a copy to TulipFarm?",
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await drive.getByRole("button", { name: "Google file actions" }).click();
  const link = item(page, "Open in Google");
  await expect(link).toHaveAttribute("href", "https://drive.google.com/");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(item(page, "Refreshing…")).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.keyboard.press("Escape");
});

test("chat menus open upward with two-line items and lock while sending", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page);
  const chat = section(page, "Chat");
  await chat.scrollIntoViewIfNeeded();
  const files = chat.getByRole("button", { name: "Add a file" });
  await files.click();
  const menu = menus(page);
  await expect(menu).toHaveAttribute("data-side", "top");
  expect(
    (await menu.boundingBox())!.y + (await menu.boundingBox())!.height,
  ).toBeLessThanOrEqual((await files.boundingBox())!.y);
  await expect(menu.getByRole("group")).toHaveAccessibleName(
    "What should happen to the file?",
  );
  await settle(page);
  await expectContained(menu);
  await shot(page, testInfo, "dropdown-chat-composer-mobile");
  await item(
    page,
    "Store a private file Saved for download. This chat doesn’t read it. Up to 5 files, 10 MiB each.",
  ).click();
  await expect(chat.getByRole("status")).toHaveText("Store a private file.");

  await chat.getByRole("button", { name: "Reply sending" }).click();
  await chat.getByRole("button", { name: "Chat actions" }).click();
  for (const name of ["Edit title", "Archive chat", "Move to project"]) {
    await expect(item(page, name)).toHaveAttribute("aria-disabled", "true");
  }
  await page.keyboard.press("Escape");
  await chat.getByRole("button", { name: "Reply sending" }).click();
  await chat.getByRole("button", { name: "Chat actions" }).click();
  await item(page, "Archive chat").click();
  await chat.getByRole("button", { name: "Chat actions" }).click();
  await expect(item(page, "Restore chat")).toBeVisible();
  await page.keyboard.press("Escape");
});

test("selection actions show loading, then an outcome, and disable items while moving", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const rows = row(page, "3 rows selected");
  await rows.getByRole("button", { name: "Selected actions" }).click();
  await item(page, "Export selected").click();
  const busy = rows.getByRole("button", { name: "Exporting..." });
  await expect(busy).toBeDisabled();
  await expect(busy).toHaveAttribute("aria-busy", "true");
  await shot(
    section(page, "Selection actions"),
    testInfo,
    "dropdown-selection-loading",
  );
  await expect(rows.getByText("Exported 3 rows.")).toBeVisible();
  await rows.getByRole("button", { name: "Actions", exact: true }).click();
  await expect(menus(page).getByRole("menuitem")).toHaveText([
    "Delete selected",
  ]);
  await page.keyboard.press("Escape");
  await rows.getByRole("button", { name: "Clear" }).click();
  await expect(
    rows.getByRole("button", { name: "Selected actions" }),
  ).toBeEnabled();

  const files = row(page, "2 files selected");
  await files.getByRole("button", { name: "Selected actions" }).click();
  await item(page, "Move to trash").click();
  await expect(files.getByRole("button", { name: "Moving…" })).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(
    section(page, "Selection actions").getByRole("status"),
  ).toHaveText("2 items moved to trash.");
});

test("checkbox menus stay open and flag an empty filter", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const filter = row(page, "Status filter");
  await filter.getByRole("button", { name: "To do, In progress" }).click();
  for (const name of ["To do", "In progress"]) {
    await page.getByRole("menuitemcheckbox", { name }).click();
    await expect(menus(page)).toBeVisible();
  }
  await expect(
    page.getByRole("menuitemcheckbox", { name: "To do" }),
  ).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("Escape");
  const empty = filter.getByRole("button", { name: "Choose options" });
  await expect(empty).toHaveAttribute("aria-invalid", "true");

  const columns = row(page, "Columns");
  await columns.getByRole("button", { name: /Columns/ }).click();
  await expect(menus(page).getByRole("group")).toHaveAccessibleName(
    "Show columns",
  );
  for (const name of ["Status", "Owner"])
    await page.getByRole("menuitemcheckbox", { name }).click();
  const last = page.getByRole("menuitemcheckbox", { name: "Name" });
  await expect(last).toHaveAttribute("aria-disabled", "true");
  await expect(last).toHaveAttribute("aria-checked", "true");
  await settle(page);
  await shot(page, testInfo, "dropdown-columns");
  await page.keyboard.press("Escape");
  await expect(
    columns.getByRole("button", { name: "Columns 1/5" }),
  ).toBeVisible();
});

test("sidebar menus switch workspace, truncate long names, and pick a theme", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page);
  const sidebar = section(page, "Sidebar menus");
  await sidebar.scrollIntoViewIfNeeded();
  await sidebar
    .getByRole("button", { name: "Workspace menu, Meadow Farm Cooperative" })
    .click();
  const settings = item(page, "Settings G then S");
  await expect(settings).toHaveAttribute("href", "#sidebar-menus");
  await item(page, "Switch workspace").click();
  const sub = page.locator('[data-slot="dropdown-menu-sub-content"]');
  await expect(sub).toBeVisible();
  await settle(page);
  await expectContained(sub);
  const longName = sub.locator(".dropdown-demo-workspace-name", {
    hasText: "Orchard Lane",
  });
  await expect(longName).toHaveCSS("text-overflow", "ellipsis");
  await expect(longName).toHaveCSS("white-space", "nowrap");
  await expect(sub.getByLabel("Current workspace")).toHaveCount(1);
  await shot(page, testInfo, "dropdown-workspace-switcher-mobile");
  await sub.getByRole("menuitem", { name: /Orchard Lane/ }).click();
  await expect(sidebar.getByRole("status")).toHaveText(
    "Switched to Orchard Lane Growers and Distribution Network.",
  );
  expect(page.url()).toContain("/components/dropdown-menu/");

  await sidebar.getByRole("button", { name: "Account menu" }).click();
  const email = menus(page).getByText(
    "ama.owusu@meadow-farm-cooperative.example",
  );
  expect(await email.evaluate((el) => el.scrollWidth >= el.clientWidth)).toBe(
    true,
  );
  await item(page, "Theme").click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(sidebar.getByRole("status")).toHaveText(
    "Theme preference: dark. The docs page is not changed.",
  );
});

test("a controlled menu opens from a shortcut and returns focus to the card", async ({
  page,
}) => {
  await openPage(page);
  const card = page.getByRole("group", { name: "Sample card" });
  await card.focus();
  await page.keyboard.press("Shift+F10");
  await expect(menus(page)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open sample actions" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menus(page)).toHaveCount(0);
  await expect(card).toBeFocused();

  const trigger = page.getByRole("button", { name: "Open sample actions" });
  await trigger.click();
  await item(page, "Open Enter").click();
  await expect(section(page, "Controlled").getByRole("status")).toHaveText(
    "Open selected locally.",
  );
  await expect(trigger).toBeFocused();
});

test("menus compose inside a menubar", async ({ page }, testInfo) => {
  await openPage(page);
  const bar = page.getByRole("menubar", { name: "Sample editor" });
  const file = bar.getByRole("menuitem", { name: "File" });
  await file.click();
  await expect(menus(page)).toBeVisible();
  await expect(item(page, "Duplicate ⌘ D")).toHaveAttribute(
    "data-inset",
    "true",
  );
  await settle(page);
  expect((await menus(page).boundingBox())!.width).toBeGreaterThanOrEqual(192);
  for (const name of ["New task ⌘ N", "Duplicate ⌘ D"]) {
    expect((await item(page, name).boundingBox())!.height).toBeLessThanOrEqual(
      30,
    );
  }
  await expectContained(menus(page));
  await shot(page, testInfo, "dropdown-menubar");
  await page.keyboard.press("Escape");
  await expect(file).toBeFocused();
  await page.keyboard.press("ArrowRight");
  const view = bar.getByRole("menuitem", { name: "View" });
  await expect(view).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitemradio", { name: "Table" }).click();
  await expect(
    section(page, "Menubar").getByText("Layout: Table"),
  ).toBeVisible();
});

test.describe("motion", () => {
  test.use({ reducedMotion: "no-preference" });
  test("menus fade in over the fast motion token", async ({ page }) => {
    await openPage(page);
    await page
      .getByRole("region", { name: "Dropdown menu playground" })
      .getByRole("button", { name: "Fixed-width menu" })
      .click();
    await expect(menus(page)).toHaveCSS("transition-duration", "0.12s, 0.12s");
  });
});

test("reduced motion removes the menu transition", async ({ page }) => {
  await openPage(page);
  await page
    .getByRole("region", { name: "Dropdown menu playground" })
    .getByRole("button", { name: "Fixed-width menu" })
    .click();
  await expect(menus(page)).toHaveCSS("transition-duration", "0s");
});
