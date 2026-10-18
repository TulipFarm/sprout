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
  await page.goto("/components/calendar/");
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
const playground = (page: Page) => page.locator("#calendar-demo");
const status = (scope: Locator) => scope.locator(".calendar-demo-status");
const popups = (page: Page) =>
  page.locator('[data-slot="popover-content"][data-open]');

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

/** Every calendar fits its own box: no cell or caption spills sideways. */
async function expectCalendarsContained(page: Page) {
  const report = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-slot="calendar"]')]
      .filter((calendar) => calendar.getBoundingClientRect().width > 0)
      .map((calendar) => {
        const box = calendar.getBoundingClientRect();
        const spill = [...calendar.querySelectorAll("*")]
          .filter((child) => {
            const rect = child.getBoundingClientRect();
            // Base UI keeps a 1px visually hidden input beside each select trigger.
            if (rect.width <= 1 || child.matches('input[aria-hidden="true"]'))
              return false;
            return rect.left < box.left - 1 || rect.right > box.right + 1;
          })
          .map((child) => `${child.tagName}.${child.className}`);
        return {
          spill,
          scroll: calendar.scrollWidth - calendar.clientWidth,
          inViewport: box.right <= innerWidth + 0.5,
        };
      }),
  );
  expect(report.length).toBeGreaterThan(0);
  for (const entry of report)
    expect(entry).toEqual({ spill: [], scroll: 0, inViewport: true });
}

test("renders every Cloud calendar without native selects and passes axe", async ({
  page,
}) => {
  await openPage(page);
  await expect(page.locator('[data-slot="calendar"]')).toHaveCount(8);
  await expect(page.locator("select")).toHaveCount(0);
  const selection = section(page, "Selection modes");
  await expect(
    row(selection, "Single date").getByRole("grid", { name: "October 2026" }),
  ).toBeVisible();
  await expect(status(row(selection, "Single date"))).toHaveText(
    "Monday, October 12, 2026",
  );
  await axe(page);
});

test("single calendar supports the full keyboard flow", async ({ page }) => {
  await openPage(page);
  const single = row(section(page, "Selection modes"), "Single date");
  const selected = single.getByRole("button", {
    name: /October 12th, 2026, selected/,
  });
  await expect(selected).toHaveAttribute("data-selected-single", "true");
  await expect(selected).toHaveAttribute("tabindex", "0");

  await single.getByRole("button", { name: "Go to the Next Month" }).focus();
  await page.keyboard.press("Tab");
  await expect(selected).toBeFocused();
  await expect(selected).toHaveCSS("outline-style", "solid");

  await page.keyboard.press("ArrowRight");
  await expect(
    single.getByRole("button", { name: /October 13th, 2026/ }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    single.getByRole("button", { name: /October 20th, 2026/ }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(status(single)).toHaveText("Tuesday, October 20, 2026");
  await expect(
    single.getByRole("button", { name: /October 20th, 2026, selected/ }),
  ).toHaveAttribute("data-selected-single", "true");

  await page.keyboard.press("PageDown");
  await expect(
    single.getByRole("grid", { name: "November 2026" }),
  ).toBeVisible();
  await expect(
    single.getByRole("button", { name: /November 20th, 2026/ }),
  ).toBeFocused();
  await page.keyboard.press("PageUp");
  await expect(
    single.getByRole("grid", { name: "October 2026" }),
  ).toBeVisible();

  // Clicking the selected date again clears it, as in Cloud's playground.
  await single
    .getByRole("button", { name: /October 20th, 2026, selected/ })
    .click();
  await expect(status(single)).toHaveText("No date selected.");

  await single
    .getByRole("button", { name: "Go to the Previous Month" })
    .click();
  await expect(
    single.getByRole("grid", { name: "September 2026" }),
  ).toBeVisible();
});

test("range calendar marks start, middle, and end days", async ({ page }) => {
  await openPage(page);
  const range = row(section(page, "Selection modes"), "Date range");
  await expect(status(range)).toHaveText("Oct 12 – Oct 16");
  await expect(
    range.getByRole("button", { name: /October 12th/ }),
  ).toHaveAttribute("data-range-start", "true");
  for (const n of [13, 14, 15])
    await expect(
      range.getByRole("button", { name: new RegExp(`October ${n}th`) }),
    ).toHaveAttribute("data-range-middle", "true");
  await expect(
    range.getByRole("button", { name: /October 16th/ }),
  ).toHaveAttribute("data-range-end", "true");

  const middle = range.getByRole("button", { name: /October 14th/ });
  const start = range.getByRole("button", { name: /October 12th/ });
  const [middleBg, startBg] = await Promise.all([
    middle.evaluate((el) => getComputedStyle(el).backgroundColor),
    start.evaluate((el) => getComputedStyle(el).backgroundColor),
  ]);
  expect(middleBg).not.toBe("rgba(0, 0, 0, 0)");
  expect(startBg).not.toBe(middleBg);

  await range.getByRole("button", { name: /October 20th/ }).click();
  await expect(status(range)).toHaveText("Oct 12 – Oct 20");
  await expect(
    range.getByRole("button", { name: /October 20th/ }),
  ).toHaveAttribute("data-range-end", "true");
});

test("multiple calendar toggles dates and blocks weekends", async ({
  page,
}) => {
  await openPage(page);
  const multiple = row(section(page, "Selection modes"), "Multiple dates");
  await expect(status(multiple)).toHaveText("Oct 13, Oct 15");
  const saturday = multiple.getByRole("button", {
    name: /Saturday, October 17th/,
  });
  await expect(saturday).toBeDisabled();
  await expect(
    multiple.getByRole("button", { name: /Sunday, October 18th/ }),
  ).toBeDisabled();
  expect(
    Number(await saturday.evaluate((el) => getComputedStyle(el).opacity)),
  ).toBeLessThan(1);

  await multiple.getByRole("button", { name: /October 21st/ }).click();
  await expect(status(multiple)).toHaveText("Oct 13, Oct 15, Oct 21");
  await multiple.getByRole("button", { name: /October 13th/ }).click();
  await expect(status(multiple)).toHaveText("Oct 15, Oct 21");
});

test("dropdown captions use Sprout selects with outline navigation", async ({
  page,
}) => {
  await openPage(page);
  const captions = section(page, "Captions and navigation");
  const label = row(captions, "Month label");
  await expect(label.locator(".sprout-calendar-caption-label")).toHaveText(
    "October 2026",
  );
  await expect(
    label.getByRole("button", { name: "Go to the Previous Month" }),
  ).toHaveClass(/sprout-button-variant-ghost/);

  const dropdown = row(captions, "Dropdown captions");
  await expect(
    dropdown.getByRole("button", { name: "Go to the Next Month" }),
  ).toHaveClass(/sprout-button-variant-outline/);
  const month = dropdown.getByRole("combobox", { name: "Choose the Month" });
  const year = dropdown.getByRole("combobox", { name: "Choose the Year" });
  await expect(month).toHaveText("Oct");
  await expect(year).toHaveText("2026");

  await month.focus();
  await page.keyboard.press("Enter");
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  await expect(listbox.getByRole("option")).toHaveCount(12);
  await page.getByRole("option", { name: "Mar", exact: true }).click();
  await expect(listbox).toHaveCount(0);
  await expect(
    dropdown.getByRole("grid", { name: "March 2026" }),
  ).toBeVisible();
  await expect(month).toBeFocused();

  await year.click();
  await expect(
    page.getByRole("option", { name: "2026", exact: true }),
  ).toBeInViewport();
  await expect(page.getByRole("option")).toHaveCount(101);
  await page.getByRole("option", { name: "2024", exact: true }).click();
  await expect(
    dropdown.getByRole("grid", { name: "March 2024" }),
  ).toBeVisible();

  await dropdown.getByRole("button", { name: "Go to the Next Month" }).click();
  await expect(month).toHaveText("Apr");
});

test("date picker popover selects a Monday-first date and closes", async ({
  page,
}) => {
  await openPage(page);
  const picker = row(section(page, "Date picker"), "Toolbar title");
  const trigger = picker.getByRole("button", { name: "Choose date" });
  await expect(
    picker.getByRole("heading", { name: "October 2026" }),
  ).toBeVisible();
  await expect(status(picker)).toHaveText(
    "Showing the week of Monday, October 19, 2026.",
  );

  await trigger.focus();
  await page.keyboard.press("Enter");
  const popup = page.getByRole("dialog", { name: "Choose a calendar date" });
  await expect(popup).toBeVisible();
  await settle(page);
  const headers = await popup
    .locator("th.sprout-calendar-weekday")
    .evaluateAll((cells) =>
      cells.map((cell) => cell.getAttribute("aria-label")),
    );
  expect(headers[0]).toBe("Monday");
  expect(headers[6]).toBe("Sunday");
  const selected = popup.getByRole("button", {
    name: /October 19th, 2026, selected/,
  });
  for (
    let i = 0;
    i < 4 && !(await selected.evaluate((el) => el === document.activeElement));
    i++
  )
    await page.keyboard.press("Tab");
  await expect(selected).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(popups(page)).toHaveCount(0);
  await expect(status(picker)).toHaveText(
    "Showing the week of Monday, November 2, 2026.",
  );
  await expect(
    picker.getByRole("heading", { name: "November 2026" }),
  ).toBeVisible();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(popup).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(popups(page)).toHaveCount(0);
  await expect(status(picker)).toHaveText(
    "Showing the week of Monday, November 2, 2026.",
  );

  await picker.getByRole("button", { name: "Previous range" }).click();
  await expect(status(picker)).toHaveText(
    "Showing the week of Monday, October 26, 2026.",
  );
  await picker.getByRole("button", { name: "Next range" }).click();
  await expect(status(picker)).toHaveText(
    "Showing the week of Monday, November 2, 2026.",
  );
});

test("two-month range shows week numbers and custom event days", async ({
  page,
}) => {
  await openPage(page);
  const layouts = section(page, "Layout and custom days");
  const leave = row(layouts, "Out of office");
  await expect(leave.getByRole("grid")).toHaveCount(2);
  await expect(
    leave.getByRole("grid", { name: "November 2026" }),
  ).toBeVisible();
  await expect(
    leave.locator(".sprout-calendar-week-number-cell").first(),
  ).toHaveText("40");
  await expect(
    leave
      .getByRole("grid", { name: "October 2026" })
      .getByRole("button", { name: /October 26th/ }),
  ).toHaveAttribute("data-range-start", "true");
  await expect(
    leave
      .getByRole("grid", { name: "November 2026" })
      .getByRole("button", { name: /November 6th/ }),
  ).toHaveAttribute("data-range-end", "true");
  await expect(status(leave)).toHaveText("Oct 26 – Nov 6");

  const events = row(layouts, "Event counts");
  const nineteenth = events.getByRole("button", { name: /October 19th/ });
  await expect(nineteenth.locator("span")).toHaveText("4");
  expect((await nineteenth.boundingBox())!.width).toBeGreaterThanOrEqual(35);
  await nineteenth.click();
  await expect(status(events)).toHaveText(
    "Monday, October 19, 2026 · 4 events",
  );
});

test("playground switches modes, captions, and options", async ({ page }) => {
  await openPage(page);
  const demo = playground(page);
  const calendar = demo.locator('[data-slot="calendar"]');
  await expect(calendar).toHaveAttribute("data-mode", "single");

  await chooseOption(page, "Mode", "Date range");
  await expect(calendar).toHaveAttribute("data-mode", "range");
  await expect(status(demo)).toHaveText("Oct 12 – Oct 16");

  await chooseOption(page, "Caption", "Month and year menus");
  await expect(
    demo.getByRole("combobox", { name: "Choose the Month" }),
  ).toBeVisible();
  await chooseOption(page, "Navigation buttons", "Outline buttons");
  await expect(calendar).toHaveAttribute("data-button-variant", "outline");
  await chooseOption(page, "Week starts on", "Monday first");
  await expect(
    calendar.locator("th.sprout-calendar-weekday").first(),
  ).toHaveAttribute("aria-label", "Monday");

  await demo.getByRole("button", { name: "Week numbers" }).click();
  await expect(
    calendar.locator(".sprout-calendar-week-number-cell").first(),
  ).toBeVisible();
  await demo.getByRole("button", { name: "Outside days" }).click();
  await expect(calendar.getByRole("button", { name: /September/ })).toHaveCount(
    0,
  );
  await demo.getByRole("button", { name: "No weekends" }).click();
  await expect(
    calendar.getByRole("button", { name: /Saturday, October 17th/ }),
  ).toBeDisabled();

  await chooseOption(page, "Mode", "Multiple dates");
  await expect(status(demo)).toHaveText("Oct 13, Oct 15");
  await axe(page);
});

test("reduced motion removes day transitions", async ({ page }) => {
  await openPage(page);
  const button = page.locator('[data-slot="calendar-day-button"]').first();
  const duration = await button.evaluate(
    (el) => getComputedStyle(el).transitionDuration,
  );
  expect(duration.split(",").every((value) => parseFloat(value) === 0)).toBe(
    true,
  );
});

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });
  test("day buttons ease within 120–180ms", async ({ page }) => {
    await openPage(page);
    const button = page.locator('[data-slot="calendar-day-button"]').first();
    const durations = (
      await button.evaluate((el) => getComputedStyle(el).transitionDuration)
    )
      .split(",")
      .map((value) => parseFloat(value) * 1000);
    expect(durations.some((ms) => ms > 0)).toBe(true);
    for (const ms of durations)
      expect(ms === 0 || (ms >= 120 && ms <= 180)).toBe(true);
  });
});

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`calendar ${theme} ${mode} at ${width}px`, async ({
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
        await expectCalendarsContained(page);

        const selected = row(
          section(page, "Selection modes"),
          "Single date",
        ).getByRole("button", {
          name: /October 12th, 2026, selected/,
        });
        const [bg, fg] = await selected.evaluate((el) => {
          const style = getComputedStyle(el);
          return [style.backgroundColor, style.color];
        });
        expect(bg).not.toBe(fg);
        expect(bg).not.toBe("rgba(0, 0, 0, 0)");

        await playground(page).scrollIntoViewIfNeeded();
        await shot(
          playground(page),
          testInfo,
          `calendar-playground-${theme}-${mode}-${width}`,
        );
        for (const [name, id] of [
          ["Selection modes", "selection"],
          ["Captions and navigation", "captions"],
          ["Layout and custom days", "layouts"],
        ]) {
          const target = section(page, name);
          await target.scrollIntoViewIfNeeded();
          await shot(
            target,
            testInfo,
            `calendar-${id}-${theme}-${mode}-${width}`,
          );
        }

        const dropdown = row(
          section(page, "Captions and navigation"),
          "Dropdown captions",
        );
        await dropdown
          .getByRole("combobox", { name: "Choose the Year" })
          .click();
        await settle(page);
        const list = page.getByRole("listbox");
        await expect(list).toBeVisible();
        const box = (await list.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
        await shot(
          page,
          testInfo,
          `calendar-year-menu-${theme}-${mode}-${width}`,
        );
        await page.keyboard.press("Escape");
        await expect(list).toHaveCount(0);

        const picker = row(section(page, "Date picker"), "Toolbar title");
        await picker.scrollIntoViewIfNeeded();
        await picker.getByRole("button", { name: "Choose date" }).click();
        const popup = page.getByRole("dialog", {
          name: "Choose a calendar date",
        });
        await expect(popup).toBeVisible();
        await settle(page);
        const popupBox = (await popup.boundingBox())!;
        expect(popupBox.x).toBeGreaterThanOrEqual(0);
        expect(popupBox.x + popupBox.width).toBeLessThanOrEqual(width + 0.5);
        await expectCalendarsContained(page);
        await shot(
          page,
          testInfo,
          `calendar-date-picker-${theme}-${mode}-${width}`,
        );
        await page.keyboard.press("Escape");
        await expect(popups(page)).toHaveCount(0);
      });
    }
  }
}
