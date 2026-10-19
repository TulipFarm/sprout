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
  await page.goto("/components/context-menu/");
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
const menus = (page: Page) => page.getByRole("menu");
// Shortcuts sit flush against the label, so the accessible name may omit the space before them.
const loose = (name: string) =>
  new RegExp(
    `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s*")}$`,
  );
const item = (page: Page, name: string) =>
  page.getByRole("menuitem", { name: loose(name) });
// Content outside an open modal menu is aria-hidden, so status lines are found by selector.
const statusOf = (page: Page, label: string) =>
  page.locator(`section[aria-label="${label}"] [role="status"]`);
const card = (page: Page) =>
  page.getByRole("group", { name: "Sample card actions" });
const playground = (page: Page) => section(page, "Context menu playground");

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

/** Right-clicks a target at an offset and returns the pointer position. */
async function rightClick(target: Locator, x = 40, y = 40) {
  await target.scrollIntoViewIfNeeded();
  // An open menu makes the rest of the page inert, so measure the target first.
  const box = (await target.boundingBox())!;
  await target.click({ button: "right", position: { x, y } });
  return { x: box.x + x, y: box.y + y };
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`context menu ${theme} ${mode} at ${width}px`, async ({
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

        const point = await rightClick(card(page));
        const menu = menus(page);
        await expect(menu).toBeVisible();
        await expect(menu).toHaveAttribute("data-slot", "context-menu-content");
        await settle(page);
        const box = (await menu.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(144);
        expect(Math.abs(box.x - point.x)).toBeLessThanOrEqual(2);
        expect(box.y).toBeGreaterThanOrEqual(point.y);
        expect(box.y - point.y).toBeLessThanOrEqual(8);
        await expectContained(menu);
        await item(page, "Share").hover();
        const sub = page.locator('[data-slot="context-menu-sub-content"]');
        await expect(sub).toBeVisible();
        await settle(page);
        await expectContained(sub);
        await axe(page);
        await shot(
          page,
          testInfo,
          `context-playground-${theme}-${mode}-${width}`,
        );
        await closeMenus(page);

        const files = section(page, "File rows");
        await rightClick(
          files.getByRole("group", {
            name: "Field notes from the north greenhouse, week 14.pdf",
          }),
          24,
          16,
        );
        const fileMenu = page.locator('[data-slot="context-menu-content"]');
        await expect(
          fileMenu.locator('[data-slot="context-menu-separator"]'),
        ).toHaveCount(2);
        await expect(item(page, "Move to trash ⌫")).toHaveAttribute(
          "data-variant",
          "destructive",
        );
        await item(page, "Move to").hover();
        const move = page.locator('[data-slot="context-menu-sub-content"]');
        await expect(move).toBeVisible();
        await settle(page);
        await expectContained(fileMenu);
        await expectContained(move);
        const longName = move.locator(".context-demo-truncate", {
          hasText: "Orchard Lane",
        });
        expect(
          await longName.evaluate((el) => el.scrollWidth > el.clientWidth),
        ).toBe(true);
        await expect(longName).toHaveCSS("text-overflow", "ellipsis");
        await shot(page, testInfo, `context-files-${theme}-${mode}-${width}`);
        await closeMenus(page);

        const columns = section(page, "Table header");
        await rightClick(
          columns.getByRole("group", { name: "Task table header" }),
          20,
          12,
        );
        await settle(page);
        await expectContained(menus(page));
        await shot(page, testInfo, `context-columns-${theme}-${mode}-${width}`);
        await closeMenus(page);
      });
    }
  }
}

test("right-click choices update state, and disabled items can't be chosen", async ({
  page,
}) => {
  await openPage(page);
  const status = statusOf(page, "Context menu playground");
  await rightClick(card(page));
  await expect(
    page.locator('[aria-label="Sample card actions"]'),
  ).toHaveAttribute("data-popup-open", "");
  await expect(
    page.getByRole("group", { name: "Example actions" }),
  ).toBeVisible();
  const unavailable = item(page, "Unavailable");
  await expect(unavailable).toHaveAttribute("aria-disabled", "true");
  await expect(unavailable).toHaveCSS("opacity", "0.5");
  await unavailable.click({ force: true });
  await expect(menus(page)).toBeVisible();
  await expect(status).toHaveText("No action selected.");

  const favorite = page.getByRole("menuitemcheckbox", { name: "Favorite" });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-checked", "true");
  await expect(menus(page)).toBeVisible();
  const grid = page.getByRole("menuitemradio", { name: "Grid" });
  await grid.click();
  await expect(grid).toHaveAttribute("aria-checked", "true");
  await expect(
    page.locator('section[aria-label="Context menu playground"]'),
  ).toContainText("Favorite: on · View: Grid · Local sample only");

  const remove = item(page, "Delete sample");
  await expect(remove).toHaveAttribute("data-variant", "destructive");
  await expect(remove).not.toHaveCSS(
    "color",
    await favorite.evaluate((el) => getComputedStyle(el).color),
  );
  await item(page, "Share").hover();
  await item(page, "Copy sample title").click();
  await expect(menus(page)).toHaveCount(0);
  await expect(status).toHaveText(
    "Copy sample title selected locally. The clipboard was not changed.",
  );

  await rightClick(card(page), 120, 80);
  await item(page, "Open Enter").click();
  await expect(status).toHaveText("Open selected locally.");
  await rightClick(card(page));
  await remove.click();
  await expect(status).toHaveText(
    "Delete sample selected locally. No data was deleted.",
  );
});

test("keyboard opens the shared items with Shift + F10, moves, and returns focus", async ({
  page,
}) => {
  await openPage(page);
  const target = card(page);
  await target.focus();
  await expect(target).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Shift+F10");
  await expect(menus(page)).toBeVisible();
  const button = page.getByRole("button", { name: "Open sample actions" });
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(
    menus(page).locator('[data-slot="context-menu-item"]').first(),
  ).toBeVisible();

  await page.keyboard.press("f");
  const favorite = page.getByRole("menuitemcheckbox", { name: "Favorite" });
  await expect(favorite).toBeFocused();
  // Space right after typing would extend the typeahead, so toggle with Enter.
  await page.keyboard.press("Enter");
  await expect(favorite).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("End");
  await expect(item(page, "Delete sample")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(item(page, "Open Enter")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(item(page, "Unavailable")).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowUp");
  await expect(item(page, "Share")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(item(page, "Copy sample title")).toBeFocused();
  await expect(menus(page)).toHaveCount(2);
  await page.keyboard.press("ArrowLeft");
  await expect(menus(page)).toHaveCount(1);
  await expect(item(page, "Share")).toHaveAttribute("data-highlighted", "");
  await page.keyboard.press("Escape");
  await expect(menus(page)).toHaveCount(0);
  await expect(target).toBeFocused();
  await expect(playground(page).getByText("Favorite: on")).toBeVisible();

  await page.keyboard.press("ContextMenu");
  await expect(menus(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(target).toBeFocused();

  await button.click();
  await item(page, "Open Enter").click();
  await expect(statusOf(page, "Context menu playground")).toHaveText(
    "Open selected locally.",
  );
  await expect(button).toBeFocused();

  await rightClick(target);
  await expect(menus(page)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.locator('[role^="menuitem"][data-highlighted]'),
  ).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(menus(page)).toHaveCount(0);
});

test("file rows disable edits while syncing and share items with the More button", async ({
  page,
}) => {
  await openPage(page);
  const files = section(page, "File rows");
  const status = statusOf(page, "File rows");
  const contracts = files.getByRole("group", { name: "Contracts" });
  await expect(contracts).toHaveAttribute("aria-busy", "true");
  await rightClick(contracts, 24, 16);
  for (const name of [
    "Download ⌘ D",
    "Rename F2",
    "Make a copy",
    "Move to",
    "Move to trash ⌫",
  ]) {
    await expect(item(page, name)).toHaveAttribute("aria-disabled", "true");
  }
  const label = menus(page).getByText("Contracts", { exact: true });
  await expect(label).toHaveAttribute("data-inset", "true");
  const textStart = (locator: Locator, index: number) =>
    locator.evaluate((el, i) => {
      const range = document.createRange();
      range.selectNodeContents(el.childNodes[i]!);
      return range.getBoundingClientRect().x;
    }, index);
  expect(
    Math.abs(
      (await textStart(label, 0)) -
        (await textStart(item(page, "Copy link ⌘ L"), 1)),
    ),
  ).toBeLessThanOrEqual(1);
  await item(page, "Copy link ⌘ L").click();
  await expect(status).toHaveText("Link to Contracts copied.");

  const budget = files.getByRole("group", { name: "Q3 budget.xlsx" });
  await rightClick(budget, 24, 16);
  await item(page, "Pin to top").click();
  await expect(budget).toContainText("Pinned · Spreadsheet");
  await rightClick(budget, 24, 16);
  await expect(item(page, "Unpin")).toBeVisible();
  await page.keyboard.press("Escape");

  const more = files.getByRole("button", {
    name: "More actions for Q3 budget.xlsx",
  });
  await more.click();
  await expect(menus(page)).toHaveAttribute("data-size", "menu");
  await item(page, "Move to").click();
  await page.getByRole("menuitem", { name: "Market stall" }).click();
  await expect(status).toHaveText("Q3 budget.xlsx moved to Market stall.");
  await expect(more).toBeFocused();

  await budget.focus();
  await page.keyboard.press("Shift+F10");
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(budget).toBeFocused();
});

test("table header checkboxes stay open, guard the last column, and radios close", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const table = section(page, "Table header");
  const header = table.getByRole("group", { name: "Task table header" });
  await rightClick(header, 20, 12);
  await expect(menus(page).getByRole("group").first()).toHaveAccessibleName(
    "Show columns",
  );
  for (const name of ["Status", "Owner", "Due date"]) {
    await page.getByRole("menuitemcheckbox", { name }).click();
    await expect(menus(page)).toBeVisible();
  }
  const last = page.getByRole("menuitemcheckbox", { name: "Name" });
  await expect(last).toHaveAttribute("aria-disabled", "true");
  await expect(last).toHaveAttribute("aria-checked", "true");
  await settle(page);
  await shot(page, testInfo, "context-columns-last");
  await page.getByRole("menuitemradio", { name: "Compact" }).click();
  await expect(menus(page)).toHaveCount(0);
  await expect(header).toHaveText("Name");
  await expect(
    table.getByRole("button", { name: "Columns 1/5" }),
  ).toBeVisible();
  await expect(table.getByText("Row height: Compact")).toBeVisible();

  await rightClick(header, 20, 12);
  await item(page, "Sort by").hover();
  await page.getByRole("menuitemradio", { name: "Priority" }).click();
  await closeMenus(page);
  await expect(table.getByText("Sort: Priority")).toBeVisible();
  await rightClick(header, 20, 12);
  await item(page, "Reset columns").click();
  await expect(
    table.getByRole("button", { name: "Columns 5/5" }),
  ).toBeVisible();
});

test.describe("touch", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("a long press opens the menu at the finger", async ({
    page,
  }, testInfo) => {
    await openPage(page);
    const target = card(page);
    await target.scrollIntoViewIfNeeded();
    const box = (await target.boundingBox())!;
    const point = { x: Math.round(box.x + 60), y: Math.round(box.y + 50) };
    await expect(target).toHaveCSS("user-select", "none");
    const cdp = await page.context().newCDPSession(page);
    try {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [point],
      });
      await page.waitForTimeout(700);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } finally {
      await cdp.detach();
    }
    const menu = menus(page);
    await expect(menu).toBeVisible();
    await settle(page);
    await expectContained(menu);
    await shot(page, testInfo, "context-long-press-mobile");
    await item(page, "Open Enter").click();
    await expect(statusOf(page, "Context menu playground")).toHaveText(
      "Open selected locally.",
    );
  });
});

test.describe("motion", () => {
  test.use({ reducedMotion: "no-preference" });
  test("menus fade in over the fast motion token", async ({ page }) => {
    await openPage(page);
    await rightClick(card(page));
    await expect(menus(page)).toHaveCSS("transition-duration", "0.12s, 0.12s");
  });
});

test("reduced motion removes the menu transition", async ({ page }) => {
  await openPage(page);
  await rightClick(card(page));
  await expect(menus(page)).toHaveCSS("transition-duration", "0s");
});
