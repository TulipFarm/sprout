import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

test.use({ reducedMotion: "reduce" });

async function openPage(page: Page) {
  await page.goto("/components/alert-dialog/");
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
const alertDialogs = (page: Page) => page.getByRole("alertdialog");
const status = (region: Locator) => region.getByRole("status").last();

async function expectNoOverflow(dialog: Locator) {
  expect(
    await dialog.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const inside = [...element.querySelectorAll("*")].every((child) => {
        const rect = child.getBoundingClientRect();
        if (!rect.width) return true;
        return rect.left >= box.left - 1 && rect.right <= box.right + 1;
      });
      const buttons = [...element.querySelectorAll("button")].every(
        (button) => button.scrollWidth <= button.clientWidth + 1,
      );
      return {
        inViewport:
          box.left >= 0 &&
          box.right <= innerWidth + 0.5 &&
          box.bottom <= innerHeight + 0.5,
        inside,
        buttons,
        noScroll: element.scrollWidth <= element.clientWidth + 1,
      };
    }),
  ).toEqual({ inViewport: true, inside: true, buttons: true, noScroll: true });
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

const sizes = [
  {
    size: "default",
    trigger: "Delete Q3 supplier contracts.pdf",
    title: "Delete Q3 supplier contracts.pdf?",
  },
  {
    size: "sm",
    trigger: "Delete Spring launch folder",
    title: "Delete Spring launch?",
  },
] as const;

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`alert dialog sizes ${theme} ${mode} at ${width}px`, async ({
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
        for (const { size, trigger, title } of sizes) {
          await section(page, "Sizes")
            .getByRole("button", { name: trigger })
            .click();
          const dialog = page.getByRole("alertdialog", { name: title });
          await expect(dialog).toBeVisible();
          await expect(dialog).toHaveAttribute("data-size", size);
          await settle(page);
          await expectNoOverflow(dialog);
          const box = (await dialog.boundingBox())!;
          expect(box.width).toBe(
            size === "default" && width >= 640 ? 384 : 320,
          );
          const media = (await dialog
            .locator('[data-slot="alert-dialog-media"]')
            .boundingBox())!;
          const heading = (await dialog.getByText(title).boundingBox())!;
          if (size === "default" && width >= 640) {
            expect(media.x + media.width).toBeLessThan(heading.x);
            expect(Math.abs(media.y - heading.y)).toBeLessThan(4);
          } else {
            expect(media.y + media.height).toBeLessThan(heading.y);
            expect(
              Math.abs(media.x + media.width / 2 - (box.x + box.width / 2)),
            ).toBeLessThan(1);
          }
          const buttons = dialog.locator(
            '[data-slot="alert-dialog-footer"] button',
          );
          const [cancel, action] = [
            (await buttons.nth(0).boundingBox())!,
            (await buttons.nth(1).boundingBox())!,
          ];
          if (size === "sm") {
            expect(Math.abs(cancel.width - action.width)).toBeLessThan(1);
            expect(cancel.y).toBe(action.y);
            expect(cancel.x).toBeLessThan(action.x);
          } else if (width >= 640) {
            expect(cancel.y).toBe(action.y);
            expect(
              Math.abs(action.x + action.width - (box.x + box.width - 17)),
            ).toBeLessThan(1.5);
          } else {
            expect(action.y).toBeLessThan(cancel.y);
          }
          await axe(page);
          await testInfo.attach(
            `alert-dialog-${size}-${theme}-${mode}-${width}`,
            {
              body: await page.screenshot(),
              contentType: "image/png",
            },
          );
          await page.keyboard.press("Escape");
          await expect(alertDialogs(page)).toHaveCount(0);
        }
      });
    }
  }
}

test("keyboard opens, traps focus, ignores outside clicks, and returns focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPage(page);
  const trigger = page.getByRole("button", { name: "Delete sample · default" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("alertdialog", {
    name: "Delete the sample folder?",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription(
    "No real folder will be deleted.",
  );
  const cancel = dialog.getByRole("button", { name: "Cancel" });
  const confirm = dialog.getByRole("button", { name: "Confirm deletion" });
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(confirm).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(confirm).toBeFocused();
  await page.mouse.click(10, 10);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(alertDialogs(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Space");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(alertDialogs(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(confirm).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(alertDialogs(page)).toHaveCount(0);
  await expect(
    section(page, "Alert dialog playground").getByRole("status"),
  ).toHaveText("Sample deletion confirmed locally (default).");
});

test("playground switches size, media, and action variant", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPage(page);
  const playground = section(page, "Alert dialog playground");
  await chooseOption(page, "Size", "sm");
  await chooseOption(page, "Action variant", "default");
  await playground.getByRole("button", { name: "Media" }).click();
  await expect(
    playground.getByRole("button", { name: "Media" }),
  ).toHaveAttribute("aria-pressed", "false");
  await playground.getByRole("button", { name: "Delete sample · sm" }).click();
  const dialog = page.getByRole("alertdialog", {
    name: "Delete the sample folder?",
  });
  await expect(dialog).toHaveAttribute("data-size", "sm");
  await expect(dialog.locator('[data-slot="alert-dialog-media"]')).toHaveCount(
    0,
  );
  await expect(
    dialog.getByRole("button", { name: "Confirm deletion" }),
  ).toHaveAttribute("data-variant", "default");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toHaveAttribute(
    "data-variant",
    "outline",
  );
  await testInfo.attach("alert-dialog-playground-sm", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(alertDialogs(page)).toHaveCount(0);
});

test("every confirmation opens, cancels back to its trigger, and confirms", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page);
  const examples = section(page, "Confirmations");
  const cases = [
    [
      "Weekly supplier digest",
      "Delete agent",
      "Delete this saved agent?",
      "Keep agent",
      "Delete saved agent",
    ],
    [
      "ana@meadow.example",
      "Disconnect",
      "Disconnect Google?",
      "Keep connected",
      "Disconnect Google",
    ],
    [
      "Previous webhook key",
      "Revoke previous key",
      "Revoke the previous webhook key?",
      "Keep accepting it",
      "Revoke previous key",
    ],
    [
      "Spring launch",
      "Leave",
      "Leave Spring launch?",
      "Stay in project",
      "Leave project",
    ],
    [
      "Invoice intake",
      "Archive",
      "Archive Invoice intake?",
      "Keep workflow",
      "Archive workflow",
    ],
    [
      "Supplier pricing questions",
      "Delete chat",
      "Delete this chat?",
      "Keep chat",
      "Delete chat",
    ],
  ] as const;
  for (const [label, trigger, title, cancel, action] of cases) {
    const button = row(page, label).getByRole("button", { name: trigger });
    await button.click();
    let dialog = page.getByRole("alertdialog", { name: title });
    await expect(dialog).toBeVisible();
    await settle(page);
    await expectNoOverflow(dialog);
    await testInfo.attach(`alert-dialog-confirm-${label}`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await dialog.getByRole("button", { name: cancel }).click();
    await expect(alertDialogs(page)).toHaveCount(0);
    await expect(button).toBeFocused();
    await button.click();
    dialog = page.getByRole("alertdialog", { name: title });
    const confirm = dialog.getByRole("button", { name: action });
    await expect(confirm).toHaveAttribute("data-variant", "destructive");
    await confirm.click();
    await expect(alertDialogs(page)).toHaveCount(0);
    await expect(status(examples)).toContainText("(sample only)");
  }

  await chooseOption(page, "Owning team", "Finance");
  const discard = page.getByRole("alertdialog", {
    name: "Discard permission edits?",
  });
  await discard.getByRole("button", { name: "Keep editing" }).click();
  await expect(alertDialogs(page)).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Owning team" })).toHaveText(
    "Field operations",
  );
  await chooseOption(page, "Owning team", "Finance");
  await discard.getByRole("button", { name: "Discard edits" }).click();
  await expect(page.getByRole("combobox", { name: "Owning team" })).toHaveText(
    "Finance",
  );
  await expect(status(examples)).toHaveText("Owning team changed to Finance.");
});

test("pending work blocks closing and keeps errors inside the dialog", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPage(page);
  const examples = section(page, "Pending and errors");
  await examples.getByRole("button", { name: "Fail next request" }).click();

  await row(page, "Supplier onboarding plan")
    .getByRole("button", { name: "Stop plan" })
    .click();
  let dialog = page.getByRole("alertdialog", { name: "Stop this plan?" });
  await dialog.getByRole("button", { name: "Stop plan" }).click();
  const stopping = dialog.getByRole("button", { name: "Stopping…" });
  await expect(stopping).toBeDisabled();
  await expect(stopping).toHaveAttribute("aria-busy", "true");
  await expect(
    dialog.getByRole("button", { name: "Keep running" }),
  ).toBeDisabled();
  await testInfo.attach("alert-dialog-pending", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toHaveText(/did not stop/);
  await testInfo.attach("alert-dialog-error", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.keyboard.press("Escape");
  await expect(alertDialogs(page)).toHaveCount(0);
  await examples.getByRole("button", { name: "Fail next request" }).click();
  await expect(
    examples.getByRole("button", { name: "Fail next request" }),
  ).toHaveAttribute("aria-pressed", "false");
  await row(page, "Supplier onboarding plan")
    .getByRole("button", { name: "Stop plan" })
    .click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Stop plan" }).click();
  await expect(alertDialogs(page)).toHaveCount(0);
  await expect(status(examples)).toHaveText(
    "Plan stopped. Finished work is kept.",
  );

  await examples.getByRole("button", { name: "Fail next request" }).click();
  await row(page, "Row event queue")
    .getByRole("button", { name: "Cancel waiting events" })
    .click();
  dialog = page.getByRole("alertdialog", {
    name: "Cancel all waiting row events?",
  });
  const action = dialog.getByRole("button", { name: "Cancel waiting events" });
  await expect(action).toHaveAttribute("data-variant", "default");
  await action.click();
  await expect(
    dialog.getByRole("button", { name: "Cancelling…" }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Keep events" }),
  ).toBeDisabled();
  await expect(dialog.getByRole("alert")).toHaveText(/queue changed/);
  await expectNoOverflow(dialog);
  await dialog.getByRole("button", { name: "Keep events" }).click();
  await expect(alertDialogs(page)).toHaveCount(0);
});

test("row delete shows each server result and hides the action once known", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page);
  const examples = section(page, "Pending and errors");
  const trigger = row(page, "Row 4f2a9c1e").getByRole("button", {
    name: "Delete row",
  });
  const dialog = page.getByRole("alertdialog", {
    name: "Delete row 4f2a9c1e?",
  });

  await trigger.click();
  await dialog.getByRole("button", { name: "Delete row" }).click();
  await expect(
    dialog.getByRole("button", { name: "Deleting row…" }),
  ).toHaveAttribute("aria-busy", "true");
  await expect(dialog.getByRole("button", { name: "Keep row" })).toBeDisabled();
  await expect(dialog.getByRole("alert")).toContainText(
    "Linked deletion is blocked.",
  );
  await expect(
    dialog.getByRole("link", { name: "View incoming linked rows" }),
  ).toBeVisible();
  await expect(dialog.locator('[data-slot="alert-dialog-action"]')).toHaveCount(
    0,
  );
  await settle(page);
  await expectNoOverflow(dialog);
  await testInfo.attach("alert-dialog-row-rejected", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(alertDialogs(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await chooseOption(page, "Row delete result", "No response");
  await trigger.click();
  await dialog.getByRole("button", { name: "Delete row" }).click();
  await expect(
    dialog.getByRole("button", { name: "Close and inspect current rows" }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(alertDialogs(page)).toHaveCount(0);

  await chooseOption(page, "Row delete result", "Server accepts");
  await trigger.click();
  await dialog.getByRole("button", { name: "Delete row" }).click();
  await expect(alertDialogs(page)).toHaveCount(0);
  await expect(status(examples)).toContainText("Row 4f2a9c1e deleted.");
});

test("bulk delete reports progress inside the dialog", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPage(page);
  const examples = section(page, "Progress");
  const trigger = examples.getByRole("button", { name: "Delete selected" });
  await trigger.click();
  let dialog = page.getByRole("alertdialog", {
    name: "Delete 3 selected rows?",
  });
  await expect(dialog.getByRole("button", { name: "Keep rows" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Delete 3 rows" }).click();
  await expect(
    dialog.getByRole("button", { name: "Close and review rows" }),
  ).toBeDisabled();
  await testInfo.attach("alert-dialog-progress", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  dialog = page.getByRole("alertdialog", { name: "Rows deleted" });
  await expect(dialog.getByRole("status")).toHaveText("3 of 3 rows deleted.");
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(alertDialogs(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(status(examples)).toHaveText("3 of 3 rows deleted.");

  await examples.getByRole("button", { name: "Pause after first row" }).click();
  await trigger.click();
  dialog = page.getByRole("alertdialog", { name: "Delete 3 selected rows?" });
  await dialog.getByRole("button", { name: "Delete 3 rows" }).click();
  await expect(dialog.getByRole("status")).toHaveText("1 of 3 rows deleted.");
  await expect(dialog.getByText("Deletion is paused")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Close and review rows" }),
  ).toBeEnabled();
  await expectNoOverflow(dialog);
  await testInfo.attach("alert-dialog-progress-paused", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await dialog.getByRole("button", { name: "Close and review rows" }).click();
  await expect(alertDialogs(page)).toHaveCount(0);
});

test("review picks the action variant and disables stale reviews", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPage(page);
  const examples = section(page, "Review changes");
  const open = () =>
    examples.getByRole("button", { name: "Review field changes" }).click();
  const dialog = page.getByRole("alertdialog", {
    name: "Use the current fields?",
  });

  await open();
  await expect(
    dialog.getByText(/will be cleared only if you continue/),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Clear listed input" }),
  ).toHaveAttribute("data-variant", "destructive");
  await dialog.getByRole("button", { name: "Keep old input" }).click();

  await chooseOption(page, "Field change", "Input still fits");
  await open();
  const use = dialog.getByRole("button", { name: "Use current fields" });
  await expect(use).toHaveAttribute("data-variant", "default");
  await use.click();
  await expect(alertDialogs(page)).toHaveCount(0);
  await expect(status(examples)).toHaveText("Draft uses the current fields.");

  await chooseOption(page, "Field change", "Fields changed again");
  await open();
  await expect(dialog.getByRole("alert")).toHaveText(
    "The fields changed again. Cancel and review the latest change.",
  );
  await expect(
    dialog.getByRole("button", { name: "Use current fields" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");

  await examples.getByRole("button", { name: "Save not confirmed" }).click();
  await examples.getByRole("button", { name: "Close editor" }).click();
  const leave = page.getByRole("alertdialog", { name: "Leave these edits?" });
  await expect(leave).toHaveAccessibleDescription(
    /save result is not confirmed/,
  );
  await leave.getByRole("button", { name: "Leave editor" }).click();
  await expect(status(examples)).toHaveText("Editor closed.");
});

test("unsaved team edits use finalFocus and block navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPage(page);
  const examples = section(page, "Unsaved changes");
  const teams = examples.getByRole("navigation", { name: "Teams" });
  const name = examples.getByLabel("Team name");
  await name.fill("Field ops");
  await teams.getByRole("button", { name: "Finance" }).click();
  const discard = page.getByRole("alertdialog", {
    name: "Discard team edits?",
  });
  await discard.getByRole("button", { name: "Keep editing" }).click();
  await expect(alertDialogs(page)).toHaveCount(0);
  await expect(
    teams.getByRole("button", { name: "Field operations" }),
  ).toBeFocused();
  await expect(name).toHaveValue("Field ops");

  await teams.getByRole("button", { name: "Finance" }).click();
  await discard.getByRole("button", { name: "Discard edits" }).click();
  await expect(alertDialogs(page)).toHaveCount(0);
  await expect(teams.getByRole("button", { name: "Finance" })).toBeFocused();
  await expect(teams.getByRole("button", { name: "Finance" })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await name.fill("Finance and billing");
  await examples.getByRole("button", { name: "Go to Tables" }).click();
  const blocker = page.getByRole("alertdialog", { name: "Leave these edits?" });
  await blocker.getByRole("button", { name: "Keep editing" }).click();
  await expect(name).toHaveValue("Finance and billing");
  await examples.getByRole("button", { name: "Go to Tables" }).click();
  await blocker.getByRole("button", { name: "Leave editor" }).click();
  await expect(name).toHaveValue("Finance");
  await expect(status(examples)).toHaveText(
    "Opened Tables. Your edits were discarded.",
  );
});

test("motion uses 180ms in and stops with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openPage(page);
  await page.getByRole("button", { name: "Delete sample · default" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toHaveCSS("transition-duration", "0.18s, 0.18s");
  await page.keyboard.press("Escape");
  await expect(alertDialogs(page)).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Delete sample · default" }).click();
  await expect(dialog).toHaveCSS("transition-duration", "0s");
  await expect(page.locator('[data-slot="alert-dialog-overlay"]')).toHaveCSS(
    "transition-duration",
    "0s",
  );
});
