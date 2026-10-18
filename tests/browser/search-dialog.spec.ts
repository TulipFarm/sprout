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
  await page.goto("/components/search-dialog/");
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

async function setMode(
  page: Page,
  mode: "Light" | "Dark",
  theme: "neutral" | "tulipfarm" = "neutral",
) {
  await page.evaluate(
    (value) => (document.documentElement.dataset.sproutTheme = value),
    theme,
  );
  await chooseOption(page, "Color mode", mode);
  await settle(page);
}

const dialog = (page: Page) => page.locator('[data-slot="search-dialog"]');
const section = (page: Page, name: string) =>
  page.getByRole("region", { name, exact: true });

async function activeName(input: Locator) {
  const id = await input.getAttribute("aria-activedescendant");
  if (!id) return null;
  return input
    .page()
    .evaluate(
      (value) =>
        document
          .getElementById(value)
          ?.querySelector('[data-slot="search-item-title"]')?.textContent ??
        null,
      id,
    );
}

/** The dialog stays in the viewport, and nothing inside it spills sideways. */
async function expectContained(popup: Locator) {
  expect(
    await popup.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const inside = [...element.querySelectorAll("*")]
        .filter(
          (child) =>
            !child.closest('[data-slot="search-filters"]') ||
            child.matches('[data-slot="search-filters"]'),
        )
        .every((child) => {
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

async function open(page: Page, region: string, trigger: string | RegExp) {
  const button = section(page, region).getByRole("button", {
    name: trigger,
    exact: typeof trigger === "string",
  });
  await button.click();
  await settle(page);
  await expect(dialog(page)).toBeVisible();
  return button;
}

test("workspace palette groups, wraps, opens, remembers recents, and recovers from no results", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const trigger = await open(page, "Jump to a page or action", /^Search\s*⌘K$/);
  const popup = dialog(page);
  const input = page.getByRole("combobox", {
    name: "Find a page or action",
    exact: true,
  });
  await expect(input).toBeFocused();
  await expect(
    popup.getByRole("listbox", { name: "Pages and actions" }),
  ).toBeVisible();
  await expect(popup.getByRole("group")).toHaveCount(2);
  await expect(popup.getByRole("group", { name: "Pages 10" })).toBeVisible();
  await expect(
    popup.getByRole("group", { name: "Quick actions 3" }),
  ).toBeVisible();
  await expect(popup.locator('[data-slot="search-footer"]')).toBeVisible();
  await expect(popup.locator('[data-slot="search-hint"]')).toHaveText([
    "↑↓Select",
    "↵Open",
    "EscClose",
  ]);
  expect(await activeName(input)).toBe("Home");
  await expect(
    popup.locator("[data-selected] .sprout-search-item-enter"),
  ).toBeVisible();
  await page.keyboard.press("ArrowUp");
  expect(await activeName(input)).toBe("Create table");
  await page.keyboard.press("ArrowDown");
  expect(await activeName(input)).toBe("Home");
  await page.keyboard.press("ArrowDown");
  expect(await activeName(input)).toBe("Chats");
  await page.keyboard.press("Alt+ArrowDown");
  expect(await activeName(input)).toBe("New chat");
  await axe(page);
  await expectContained(popup);
  await shot(page, testInfo, "workspace-light");

  await page.keyboard.press("Enter");
  await expect(popup).toHaveCount(0);
  await expect(
    section(page, "Jump to a page or action").getByRole("status"),
  ).toHaveText("Opened New chat");
  await expect(trigger).toBeFocused();

  await page.keyboard.press("ControlOrMeta+k");
  await settle(page);
  await expect(popup.getByRole("group", { name: "Recent 1" })).toBeVisible();
  await expect(input).toHaveValue("");
  await input.fill("tab");
  await expect(popup.getByRole("group", { name: "Recent 1" })).toHaveCount(0);
  await expect(popup.getByRole("option")).toHaveText([
    "Tables↵",
    "Create table↵",
  ]);
  await input.fill("work set");
  await expect(popup.getByRole("option")).toHaveText(["Workspace settings↵"]);

  await input.fill("calendar invites");
  const empty = popup.locator('[data-slot="search-empty"]');
  await expect(empty).toHaveRole("status");
  await expect(empty).toContainText("No pages or actions found");
  await expect(popup.getByRole("option")).toHaveCount(0);
  await shot(popup, testInfo, "workspace-empty-light");
  await popup
    .getByRole("button", { name: "Clear search", exact: true })
    .click();
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await expect(popup.getByRole("option").first()).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("calendar commands show trailing keys, events with detail, and an empty state with media", async ({
  page,
}, testInfo) => {
  await openPage(page);
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur(),
  );
  await page.keyboard.press("/");
  await settle(page);
  const popup = dialog(page);
  await expect(popup).toBeVisible();
  const input = page.getByRole("combobox", {
    name: "Search calendar",
    exact: true,
  });
  await expect(input).toBeFocused();
  await expect(popup.getByRole("group", { name: "Commands 9" })).toBeVisible();
  await expect(
    popup.getByRole("group", { name: "Events in this view 5" }),
  ).toBeVisible();

  const today = popup.getByRole("option", { name: /Go to today/ });
  const create = popup.getByRole("option", { name: /Create event/ });
  await expect(today).toHaveAttribute("aria-selected", "true");
  await expect(
    today.locator('[data-slot="search-item-trailing"]'),
  ).toBeHidden();
  await expect(create.locator('[data-slot="search-item-trailing"]')).toHaveText(
    "C",
  );
  await expect(
    create.locator('[data-slot="search-item-trailing"]'),
  ).toBeVisible();
  await expect(
    popup
      .getByRole("option", { name: /Find free time/ })
      .locator('[data-slot="search-item-trailing"]'),
  ).toHaveCount(0);
  await expect(popup.locator('[data-slot="search-hint"]')).toHaveText([
    "/Open commands",
    "[ ]Previous / next",
    "EscClose",
  ]);

  await input.fill("review");
  await expect(popup.getByRole("group")).toHaveCount(1);
  const review = popup.getByRole("option");
  await expect(review.locator('[data-slot="search-item-detail"]')).toHaveText(
    "2:00 PM – 3:30 PM",
  );
  await expectContained(popup);
  await axe(page);
  await shot(popup, testInfo, "calendar-truncated-light");

  await input.fill("");
  await input.fill("dentist");
  const empty = popup.locator('[data-slot="search-empty"]');
  await expect(empty).toContainText("No matches");
  await expect(empty.locator('[data-slot="search-empty-tile"]')).toHaveCount(1);
  await expect(popup.getByRole("group")).toHaveCount(0);

  await input.fill("week");
  await page.keyboard.press("Enter");
  await expect(popup).toHaveCount(0);
  await expect(
    section(page, "Calendar commands").getByRole("status"),
  ).toHaveText("Switched to week view");

  await section(page, "Calendar commands")
    .getByRole("button", { name: "Calendar commands" })
    .click();
  await settle(page);
  await popup
    .getByRole("button", { name: "Close search", exact: true })
    .click();
  await expect(popup).toHaveCount(0);
});

test("record filters toggle, meta and detail render, and fanned empty media clears filters", async ({
  page,
}, testInfo) => {
  await openPage(page);
  await open(page, "Filters, meta, and detail", "Open search");
  const popup = dialog(page);
  const filters = popup.getByRole("group", {
    name: "Record type",
    exact: true,
  });
  const docs = filters.getByRole("button", { name: "Documents only" });
  const shared = filters.getByRole("button", { name: "Shared with me" });
  await expect(docs).toHaveAttribute("aria-pressed", "false");
  await expect(popup.getByRole("group", { name: "Records 5" })).toBeVisible();
  const first = popup.getByRole("option").first();
  await expect(first.locator('[data-slot="search-item-meta"]')).toHaveText(
    "Document",
  );
  await expect(first.locator('[data-slot="search-item-detail"]')).toHaveText(
    "Edited 2 hours ago · Notes",
  );

  await docs.focus();
  await page.keyboard.press("Space");
  await expect(docs).toHaveAttribute("aria-pressed", "true");
  await expect(popup.getByRole("group", { name: "Records 3" })).toBeVisible();
  await shared.click();
  await expect(popup.getByRole("group", { name: "Records 2" })).toBeVisible();
  await expectContained(popup);
  await axe(page);
  await shot(popup, testInfo, "records-filtered-light");

  const input = page.getByRole("combobox", {
    name: "Search records",
    exact: true,
  });
  await input.fill("meadow");
  const empty = popup.locator('[data-slot="search-empty"]');
  await expect(empty.locator('[data-slot="search-empty-tile"]')).toHaveCount(3);
  const rotations = await empty
    .locator('[data-slot="search-empty-tile"]')
    .evaluateAll((tiles) => tiles.map((tile) => getComputedStyle(tile).rotate));
  expect(rotations).toEqual(["-8deg", "none", "8deg"]);
  await axe(page);
  await shot(popup, testInfo, "records-empty-light");
  await empty.getByRole("button", { name: "Clear filters" }).click();
  await expect(docs).toHaveAttribute("aria-pressed", "false");
  await expect(shared).toHaveAttribute("aria-pressed", "false");
  await expect(input).toHaveValue("");
  await expect(popup.getByRole("group", { name: "Records 5" })).toBeVisible();

  await input.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(popup).toHaveCount(0);
  await expect(
    section(page, "Filters, meta, and detail").getByRole("status"),
  ).toHaveText("Selected Meadow project");
});

test("dark mode keeps contrast and layout", async ({ page }, testInfo) => {
  await openPage(page);
  await setMode(page, "Dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await open(page, "Filters, meta, and detail", "Open search");
  const popup = dialog(page);
  await popup.getByRole("button", { name: "Documents only" }).click();
  await axe(page);
  await expectContained(popup);
  await shot(page, testInfo, "records-dark");
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);

  await open(page, "Jump to a page or action", /^Search\s*⌘K$/);
  await page
    .getByRole("combobox", { name: "Find a page or action" })
    .fill("nothing here");
  await axe(page);
  await shot(popup, testInfo, "workspace-empty-dark");
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);

  await setMode(page, "Light", "tulipfarm");
  await open(page, "Calendar commands", "Calendar commands");
  await axe(page);
  await shot(popup, testInfo, "calendar-tulipfarm-light");
});

test("mobile fits the viewport, hides the footer, and scrolls filters sideways", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 360, height: 720 });
  await openPage(page);
  await open(page, "Filters, meta, and detail", "Open search");
  const popup = dialog(page);
  await expect(popup.locator('[data-slot="search-footer"]')).toBeHidden();
  await expectContained(popup);
  const box = (await popup.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(360 - 32 + 1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await axe(page);
  await shot(page, testInfo, "records-mobile");
  await page.keyboard.press("Escape");

  await open(page, "Calendar commands", "Calendar commands");
  await shot(page, testInfo, "calendar-mobile");
  await expectContained(popup);
  await page.getByRole("combobox", { name: "Search calendar" }).fill("review");
  const title = popup
    .getByRole("option")
    .locator('[data-slot="search-item-title"]');
  expect(
    await title.evaluate(
      (el) =>
        el.scrollWidth > el.clientWidth && getComputedStyle(el).textOverflow,
    ),
  ).toBe("ellipsis");
  await expectContained(popup);
  await shot(popup, testInfo, "calendar-truncated-mobile");
});

test("desktop width, placement, and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openPage(page);
  await open(page, "Jump to a page or action", /^Search\s*⌘K$/);
  const popup = dialog(page);
  const box = (await popup.boundingBox())!;
  expect(Math.round(box.width)).toBe(672);
  expect(Math.round(box.y)).toBe(Math.round(800 * 0.12));
  await expect(popup).toHaveCSS("transition-duration", "0s");
  await expect(popup.locator(".sprout-search-list")).toHaveCSS(
    "height",
    "448px",
  );
});
