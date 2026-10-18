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
  await page.goto("/components/menubar/");
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

const menus = (page: Page) => page.getByRole("menu");
const loose = (name: string) =>
  new RegExp(
    `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s*")}$`,
  );
const item = (page: Page, name: string) =>
  page.getByRole("menuitem", { name: loose(name) });
// The modal menubar hides the rest of the page from the accessibility tree while a menu is open.
const sectionOf = (page: Page, label: string) =>
  page.locator(`section[aria-label="${label}"]`);
const statusOf = (page: Page, label: string) =>
  sectionOf(page, label).locator('[role="status"]');
const bar = (page: Page, name: string) => page.getByRole("menubar", { name });
const trigger = (page: Page, barName: string, name: string) =>
  bar(page, barName).getByRole("menuitem", { name, exact: true });

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
      test(`menubar ${theme} ${mode} at ${width}px`, async ({
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

        const app = bar(page, "Application menu");
        await expect(app).toHaveCSS("height", "32px");
        await app.scrollIntoViewIfNeeded();
        const file = trigger(page, "Application menu", "File");
        const fileBox = (await file.boundingBox())!;
        await file.click();
        const menu = page.locator('[data-slot="menubar-content"]');
        await expect(menu).toBeVisible();
        await settle(page);
        const box = (await menu.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(144);
        expect(Math.abs(box.x - (fileBox.x - 4))).toBeLessThanOrEqual(1);
        expect(
          Math.abs(box.y - (fileBox.y + fileBox.height + 8)),
        ).toBeLessThanOrEqual(1);
        await expectContained(menu);
        await item(page, "New draft ⌘ N").hover();
        await axe(page);
        await shot(page, testInfo, `menubar-file-${theme}-${mode}-${width}`);

        await trigger(page, "Application menu", "View").hover();
        await expect(
          page.getByRole("menuitemcheckbox", { name: "Show sidebar" }),
        ).toBeVisible();
        await item(page, "More").hover();
        const sub = page.locator('[data-slot="menubar-sub-content"]');
        await expect(sub).toBeVisible();
        await settle(page);
        await expectContained(sub);
        await shot(page, testInfo, `menubar-view-${theme}-${mode}-${width}`);
        await closeMenus(page);

        const editor = sectionOf(page, "Document editor");
        await editor.scrollIntoViewIfNeeded();
        await trigger(page, "Editor menu", "File").click();
        await item(page, "Open recent").hover();
        const recent = page.locator('[data-slot="menubar-sub-content"]');
        await expect(recent).toBeVisible();
        await settle(page);
        await expectContained(
          page.locator('[data-slot="menubar-content"]').first(),
        );
        await expectContained(recent);
        const longName = recent.locator(".menubar-demo-truncate", {
          hasText: "irrigation",
        });
        expect(
          await longName.evaluate((el) => el.scrollWidth > el.clientWidth),
        ).toBe(true);
        await expect(longName).toHaveCSS("text-overflow", "ellipsis");
        await shot(
          page,
          testInfo,
          `menubar-editor-file-${theme}-${mode}-${width}`,
        );
        await closeMenus(page);

        await trigger(page, "Editor menu", "View").click();
        const view = page.locator('[data-slot="menubar-content"]');
        await settle(page);
        await expectContained(view);
        await shot(
          page,
          testInfo,
          `menubar-editor-view-${theme}-${mode}-${width}`,
        );
        await closeMenus(page);

        await trigger(page, "Editor menu", "Help").click();
        await settle(page);
        await expectContained(page.locator('[data-slot="menubar-content"]'));
        await closeMenus(page);
      });
    }
  }
}

test("choices update state, and disabled items can't be chosen", async ({
  page,
}) => {
  await openPage(page);
  const status = statusOf(page, "Menubar playground");
  const summary = sectionOf(page, "Menubar playground");
  await trigger(page, "Application menu", "File").click();
  await expect(trigger(page, "Application menu", "File")).toHaveAttribute(
    "data-popup-open",
    "",
  );
  const print = item(page, "Print");
  await expect(print).toHaveAttribute("aria-disabled", "true");
  await expect(print).toHaveCSS("opacity", "0.5");
  await print.click({ force: true });
  await expect(menus(page)).toBeVisible();
  await expect(status).toHaveText("No action selected.");
  await expect(page.locator('[data-slot="menubar-separator"]')).toHaveCount(1);
  const discard = item(page, "Discard draft");
  await expect(discard).toHaveAttribute("data-variant", "destructive");
  const newDraft = item(page, "New draft ⌘ N");
  await expect(discard).not.toHaveCSS(
    "color",
    await newDraft.evaluate((el) => getComputedStyle(el).color),
  );
  await expect(newDraft.locator('[data-slot="menubar-shortcut"]')).toHaveText(
    "⌘ N",
  );
  await newDraft.click();
  await expect(menus(page)).toHaveCount(0);
  await expect(status).toHaveText("New draft selected locally.");

  await trigger(page, "Application menu", "File").click();
  await item(page, "Discard draft").click();
  await expect(status).toHaveText(
    "Discard draft selected locally. No data was deleted.",
  );

  await trigger(page, "Application menu", "View").click();
  const sidebar = page.getByRole("menuitemcheckbox", { name: "Show sidebar" });
  await expect(sidebar).toHaveAttribute("aria-checked", "true");
  await sidebar.click();
  await expect(sidebar).toHaveAttribute("aria-checked", "false");
  await expect(menus(page)).toBeVisible();
  const compact = page.getByRole("menuitemradio", { name: "Compact" });
  await compact.click();
  await expect(compact).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByRole("menuitemradio", { name: "Comfortable" }),
  ).toHaveAttribute("aria-checked", "false");
  await expect(summary).toContainText(
    "Sample sidebar: hidden · Density: Compact",
  );
  await item(page, "More").hover();
  await item(page, "Zoom in").click();
  await expect(menus(page)).toHaveCount(0);
  await expect(status).toHaveText(
    "Zoom in selected locally. Page zoom was not changed.",
  );
});

test("editor shows labels, inset rows, icons, and resets its view", async ({
  page,
}) => {
  await openPage(page);
  const status = statusOf(page, "Document editor");
  const editor = sectionOf(page, "Document editor");
  await trigger(page, "Editor menu", "View").click();
  await expect(page.getByRole("group", { name: "Panels" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Page width" })).toBeVisible();
  const label = page.locator('[data-slot="menubar-label"]').first();
  const outline = page.getByRole("menuitemcheckbox", { name: "Outline" });
  const reset = item(page, "Reset view");
  await expect(reset).toHaveAttribute("data-inset", "true");
  // Labels, inset items, and checkable rows share one text column.
  const textStart = async (locator: Locator) =>
    locator.evaluate(
      (el) =>
        el.getBoundingClientRect().left +
        parseFloat(getComputedStyle(el).paddingLeft),
    );
  expect(await textStart(label)).toBe(await textStart(outline));
  expect(await textStart(reset)).toBe(await textStart(outline));
  await expect(
    page.getByRole("menuitemradio", { name: "Print layout" }),
  ).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("menuitemcheckbox", { name: "Ruler" }).click();
  await page.getByRole("menuitemradio", { name: "Full width" }).click();
  await expect(editor).toContainText(
    "Outline: on · Ruler: on · Width: Full width",
  );
  await reset.click();
  await expect(editor).toContainText(
    "Outline: on · Ruler: off · Width: Readable",
  );
  await expect(status).toHaveText("View reset.");

  await trigger(page, "Editor menu", "File").click();
  const trash = item(page, "Move to trash ⌘ ⌫");
  await expect(trash).toHaveAttribute("data-variant", "destructive");
  await expect(trash.locator("svg")).toHaveCSS("width", "16px");
  await expect(item(page, "Print ⌘ P")).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await trash.click();
  await expect(status).toHaveText(
    "Move to trash selected. Nothing was deleted.",
  );
});

test("keyboard moves between menus, opens them, and returns focus", async ({
  page,
}) => {
  await openPage(page);
  const file = trigger(page, "Application menu", "File");
  const view = trigger(page, "Application menu", "View");
  await file.focus();
  await expect(file).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("ArrowRight");
  await expect(view).toBeFocused();
  await expect(view).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("ArrowLeft");
  await expect(file).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(menus(page)).toBeVisible();
  await expect(item(page, "New draft ⌘ N")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(item(page, "Print")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(item(page, "Discard draft")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("menuitemcheckbox", { name: "Show sidebar" }),
  ).toBeVisible();
  await expect(view).toHaveAttribute("data-popup-open", "");

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("menuitemcheckbox", { name: "Show sidebar" }),
  ).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("m");
  await expect(item(page, "More")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(item(page, "Zoom in")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(item(page, "More")).toBeFocused();
  await expect(page.locator('[data-slot="menubar-sub-content"]')).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");
  await expect(menus(page)).toHaveCount(0);
  await expect(view).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(menus(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  await expect(file).not.toBeFocused();
  await expect(view).not.toBeFocused();
});

test.describe("motion", () => {
  test.use({ reducedMotion: "no-preference" });
  test("menus fade in over the fast motion token", async ({ page }) => {
    await openPage(page);
    await trigger(page, "Application menu", "File").click();
    await expect(page.locator('[data-slot="menubar-content"]')).toHaveCSS(
      "transition-duration",
      "0.12s, 0.12s",
    );
  });
});

test("reduced motion removes the menu transition", async ({ page }) => {
  await openPage(page);
  await trigger(page, "Application menu", "File").click();
  await expect(page.locator('[data-slot="menubar-content"]')).toHaveCSS(
    "transition-duration",
    "0s",
  );
});
