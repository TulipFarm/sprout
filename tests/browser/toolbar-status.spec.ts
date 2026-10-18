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
  await page.goto("/components/toolbar-status/");
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

const region = (page: Page, name: string) =>
  page.getByRole("region", { name, exact: true });
const row = (scope: Page | Locator, name: string) =>
  scope.getByRole("group", { name, exact: true }).first();
const popups = (page: Page) =>
  page.locator('[data-slot="toolbar-status-content"][data-open]');

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
        inViewport: box.left >= 0 && box.right <= innerWidth + 0.5,
        inside,
        noScroll: element.scrollWidth <= element.clientWidth + 1,
      };
    }),
  ).toEqual({ inViewport: true, inside: true, noScroll: true });
}

async function expectLabelFits(trigger: Locator) {
  expect(
    await trigger.evaluate((button) => {
      const label = button.querySelector(".sprout-toolbar-status-label")!;
      const slot = button.parentElement!.getBoundingClientRect();
      const box = button.getBoundingClientRect();
      return {
        noClip: label.scrollWidth <= label.clientWidth + 1,
        inSlot: box.right <= slot.right + 0.5 && box.left >= slot.left - 0.5,
      };
    }),
  ).toEqual({ noClip: true, inSlot: true });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`toolbar status ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
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
        const full = await page.screenshot({ fullPage: true });
        expect(full.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`toolbar-status-${theme}-${mode}-${width}`, {
          body: full,
          contentType: "image/png",
        });

        const outcomes = page.getByRole("region", { name: "Outcomes" });
        const failedRow = row(outcomes, "Export failed");
        await failedRow.scrollIntoViewIfNeeded();
        const failed = failedRow.getByRole("button", { name: "Export failed" });
        await failed.click();
        await expect(popups(page)).toHaveCount(1);
        await settle(page);
        await expectContained(popups(page));
        expect(
          await popups(page).evaluate((popup) => {
            const color = (slot: string) =>
              getComputedStyle(popup.querySelector(`[data-slot="${slot}"]`)!)
                .color;
            return color("popover-title") !== color("popover-description");
          }),
        ).toBe(true);
        await axe(page);
        await shot(
          page,
          testInfo,
          `toolbar-status-open-${theme}-${mode}-${width}`,
        );
        await page.keyboard.press("Escape");
        await expect(popups(page)).toHaveCount(0);

        await region(page, "Selected rows toolbar").scrollIntoViewIfNeeded();
        await shot(
          region(page, "Selected rows toolbar"),
          testInfo,
          `toolbar-status-selection-${theme}-${mode}-${width}`,
        );
      });
    }
  }
}

test("every outcome uses the right trigger, live role, and action", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const outcomes = page.getByRole("region", { name: "Outcomes" });
  const cases = [
    [
      "Exported",
      "Exported",
      "outline",
      "status",
      "Exported 3 selected rows.",
      "Export again",
    ],
    [
      "Export failed",
      "Export failed",
      "destructive",
      "alert",
      "You no longer have access",
      "Retry export",
    ],
    [
      "Export result",
      "Export result",
      "outline",
      "status",
      "Exported the first 10,000 rows",
      "Export again",
    ],
    [
      "Export cancelled",
      "Export result",
      "outline",
      "status",
      "Export cancelled.",
      "Export again",
    ],
    [
      "Action disabled",
      "Export failed",
      "destructive",
      "alert",
      "Check your connection",
      "Retry export",
    ],
    ["Saved", "Saved", "outline", "status", "The local draft is ready.", null],
  ] as const;
  for (const [name, label, variant, role, message, action] of cases) {
    const scope = row(outcomes, name);
    await expect(scope.getByRole(role)).toContainText(message);
    const trigger = scope.getByRole("button", { name: label, exact: true });
    await expect(trigger).toHaveClass(
      new RegExp(`sprout-button-variant-${variant}`),
    );
    await expect(trigger).toHaveClass(/sprout-button-size-sm/);
    await trigger.click();
    const popup = popups(page);
    await expect(popup).toHaveAttribute("data-align", "end");
    await expect(popup.getByRole("heading", { name: label })).toBeVisible();
    await expect(popup).toContainText(message);
    if (action) {
      const button = popup.getByRole("button", { name: action });
      await expect(button).toHaveClass(/sprout-button-size-sm/);
      if (name === "Action disabled") await expect(button).toBeDisabled();
      else await expect(button).toBeEnabled();
      const [box, host] = [
        (await button.boundingBox())!,
        (await popup.boundingBox())!,
      ];
      expect(box.width).toBeLessThan(host.width / 2);
    } else {
      await expect(
        popup.locator('[data-slot="toolbar-status-actions"]'),
      ).toHaveCount(0);
    }
    if (name === "Export result") {
      await expectContained(popup);
      await shot(popup, testInfo, "toolbar-status-long-message");
    }
    await page.keyboard.press("Escape");
    await expect(popups(page)).toHaveCount(0);
  }
});

test("defaultOpen shows a failed save, and retrying turns it into a saved status", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const scope = row(
    page.getByRole("region", { name: "Outcomes" }),
    "Open on mount",
  );
  await scope.getByRole("button", { name: "Show failed save" }).click();
  const popup = popups(page);
  await expect(popup).toContainText(
    "This fictional save failed. No data was sent.",
  );
  await expect(scope.getByRole("alert")).toContainText(
    "This fictional save failed.",
  );
  const retry = popup.getByRole("button", { name: "Retry sample" });
  await expect(retry).toHaveClass(/sprout-button-size-default/);
  await settle(page);
  await shot(page, testInfo, "toolbar-status-default-open");
  await retry.click();
  const saved = scope.getByRole("button", { name: "Saved", exact: true });
  await expect(saved).toHaveClass(/sprout-button-variant-outline/);
  await expect(scope.getByRole("status")).toHaveText(
    "The local sample was saved.",
  );
  await page.keyboard.press("Escape");
  await expect(popups(page)).toHaveCount(0);
  await saved.click();
  await expect(
    popups(page).locator('[data-slot="toolbar-status-actions"]'),
  ).toHaveCount(0);
});

test("keyboard opens the details, reaches the action, and Escape returns focus", async ({
  page,
}) => {
  await openPage(page);
  const trigger = row(
    page.getByRole("region", { name: "Outcomes" }),
    "Exported",
  ).getByRole("button", {
    name: "Exported",
    exact: true,
  });
  await trigger.focus();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const action = popups(page).getByRole("button", { name: "Export again" });
  for (
    let i = 0;
    i < 3 && !(await action.evaluate((el) => el === document.activeElement));
    i++
  ) {
    await page.keyboard.press("Tab");
  }
  await expect(action).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(popups(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Space");
  await expect(popups(page)).toHaveCount(1);
  await page.keyboard.press("Escape");
});

test("query bar export: cancel, success, capped, failure, retry, and busy table", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const playground = region(page, "Toolbar status playground");
  const bar = playground.getByRole("toolbar", { name: "Candidates table" });

  await bar.getByRole("button", { name: "Export", exact: true }).click();
  await bar
    .getByRole("button", { name: /^Exporting \d+ rows\. Cancel export$/ })
    .click();
  const result = bar.getByRole("button", { name: "Export result" });
  await expect(result).toHaveClass(/sprout-button-variant-outline/);
  await expect(bar.getByRole("status")).toHaveText("Export cancelled.");
  await expectLabelFits(result);

  await result.click();
  await popups(page).getByRole("button", { name: "Export again" }).click();
  await expect(
    bar.getByRole("button", { name: /Cancel export/ }),
  ).toBeVisible();
  await expect(bar.getByRole("status")).toHaveText("Exported 1,284 rows.");
  await expectLabelFits(result);

  await playground
    .getByRole("group", { name: "Next export" })
    .getByRole("button", { name: "Hits row cap" })
    .click();
  await result.click();
  await popups(page).getByRole("button", { name: "Export again" }).click();
  await expect(bar.getByRole("status")).toContainText(
    "Exported the first 10,000 rows. Narrow the search",
  );

  await playground
    .getByRole("group", { name: "Next export" })
    .getByRole("button", { name: "Fails" })
    .click();
  await result.click();
  await popups(page).getByRole("button", { name: "Export again" }).click();
  const failed = bar.getByRole("button", { name: "Export failed" });
  await expect(failed).toHaveClass(/sprout-button-variant-destructive/);
  await expect(bar.getByRole("alert")).toHaveText(
    "Export failed. The table changed while exporting. Try again.",
  );
  await expectLabelFits(failed);

  await playground
    .getByRole("group", { name: "Table" })
    .getByRole("button", { name: "Saving a row" })
    .click();
  await failed.click();
  await expect(
    popups(page).getByRole("button", { name: "Retry export" }),
  ).toBeDisabled();
  await settle(page);
  await shot(page, testInfo, "toolbar-status-query-bar-failed");
  await page.keyboard.press("Escape");

  await playground
    .getByRole("group", { name: "Table" })
    .getByRole("button", { name: "Ready" })
    .click();
  await playground
    .getByRole("group", { name: "Next export" })
    .getByRole("button", { name: "Succeeds" })
    .click();
  await failed.click();
  await popups(page).getByRole("button", { name: "Retry export" }).click();
  await expect(bar.getByRole("status")).toHaveText("Exported 1,284 rows.");
});

test("selected rows: wide and narrow bars swap the export action for the status", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openPage(page);
  const selection = region(page, "Selected rows toolbar");
  const [wide, narrow, readOnly] = [0, 1, 2].map((i) =>
    selection.getByRole("group", { name: "Selected row actions" }).nth(i),
  );

  await expect(
    wide.getByRole("button", { name: "Delete selected" }),
  ).toHaveClass(/sprout-button-variant-destructive/);
  await wide.getByRole("button", { name: "Export selected" }).click();
  await expect(
    wide.getByRole("button", { name: "Exporting..." }),
  ).toHaveAttribute("aria-busy", "true");
  await expect(
    wide.getByRole("button", { name: "Clear selection" }),
  ).toBeDisabled();
  const exported = wide.getByRole("button", { name: "Exported", exact: true });
  await expect(exported).toHaveClass(/sprout-button-variant-outline/);
  await expect(
    wide.getByRole("status").filter({ hasText: "Exported" }),
  ).toHaveText("Exported 3 selected rows.");
  await expect(
    wide.getByRole("button", { name: "Delete selected" }),
  ).toBeVisible();

  await narrow.getByRole("button", { name: "Selected actions" }).click();
  await page.getByRole("menuitem", { name: "Export selected" }).click();
  await expect(
    narrow.getByRole("status").filter({ hasText: "Exported" }),
  ).toHaveText("Exported 1 selected row.");
  await expect(narrow.getByRole("button", { name: "Actions" })).toBeVisible();
  await narrow.getByRole("button", { name: "Actions" }).click();
  await expect(
    page.getByRole("menuitem", { name: "Delete selected" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await readOnly.getByRole("button", { name: "Selected actions" }).click();
  await expect(
    page.getByRole("menuitem", { name: "Delete selected" }),
  ).toHaveCount(0);
  await page.getByRole("menuitem", { name: "Export selected" }).click();
  await expect(
    readOnly.getByRole("button", { name: "Exported", exact: true }),
  ).toBeVisible();
  await expect(readOnly.getByRole("button", { name: "Actions" })).toHaveCount(
    0,
  );
  await shot(selection, testInfo, "toolbar-status-selection-success");

  await selection
    .getByRole("group", { name: "Next export" })
    .getByRole("button", { name: "Fails" })
    .click();
  await wide.getByRole("button", { name: "Export selected" }).click();
  const failed = wide.getByRole("button", { name: "Export failed" });
  await expect(failed).toHaveClass(/sprout-button-variant-destructive/);
  await expect(wide.getByRole("alert")).toHaveText("Export failed. Try again.");
  await failed.click();
  await popups(page).getByRole("button", { name: "Retry export" }).click();
  await expect(
    wide.getByRole("button", { name: "Exporting..." }),
  ).toBeVisible();
  await expect(failed).toBeVisible();
  await shot(selection, testInfo, "toolbar-status-selection-failed");
});

test("mobile keeps the popover on screen", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page);
  const bar = region(page, "Toolbar status playground").getByRole("toolbar", {
    name: "Candidates table",
  });
  await bar.getByRole("button", { name: "Export", exact: true }).click();
  const result = bar.getByRole("button", { name: "Export result" });
  await result.click();
  await settle(page);
  await expectContained(popups(page));
  await expectLabelFits(result);
  await shot(page, testInfo, "toolbar-status-mobile-open");
});

test.describe("motion", () => {
  test.use({ reducedMotion: "no-preference" });
  test("the popover fades in over 120ms", async ({ page }) => {
    await openPage(page);
    await row(page.getByRole("region", { name: "Outcomes" }), "Saved")
      .getByRole("button", { name: "Saved", exact: true })
      .click();
    await expect(popups(page)).toHaveCSS("transition-duration", /0\.12s/);
  });
});

test("reduced motion turns the transition off", async ({ page }) => {
  await openPage(page);
  await row(page.getByRole("region", { name: "Outcomes" }), "Saved")
    .getByRole("button", { name: "Saved", exact: true })
    .click();
  await expect(popups(page)).toHaveCSS("transition-duration", "0s");
});
