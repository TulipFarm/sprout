import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

// Skeletons and spinners loop forever; reduced motion stops them so settle() can finish.
test.use({ reducedMotion: "reduce" });

async function openDialogPage(page: Page) {
  await page.goto("/components/dialog/");
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
  page.getByRole("region", { name });
const row = (page: Page, name: string) =>
  page.getByRole("group", { name, exact: true });
const dialogs = (page: Page) => page.getByRole("dialog");

async function expectNoOverflow(dialog: Locator) {
  expect(
    await dialog.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const inside = [...element.querySelectorAll("*")].every((child) => {
        const rect = child.getBoundingClientRect();
        if (!rect.width || getComputedStyle(child).position === "fixed")
          return true;
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

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

const sizeTriggers = [
  { size: "default", trigger: "New team", title: "New team" },
  { size: "form", trigger: "Rename file", title: "Rename file" },
  { size: "split", trigger: "Invite members", title: "Invite members" },
  {
    size: "fullscreen",
    trigger: "View Google document",
    title: "Field operations weekly plan",
  },
] as const;

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`dialog sizes ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await openDialogPage(page);
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
        const sizes = section(page, "Sizes");
        for (const { size, trigger, title } of sizeTriggers) {
          await sizes
            .getByRole("button", { name: trigger, exact: true })
            .click();
          const dialog = page.getByRole("dialog", { name: title });
          await expect(dialog).toBeVisible();
          await expect(dialog).toHaveAttribute("data-size", size);
          await settle(page);
          await expectNoOverflow(dialog);
          if (size === "fullscreen") {
            const box = (await dialog.boundingBox())!;
            expect(box.width).toBe(width);
            expect(box.height).toBe(900);
          } else {
            const box = (await dialog.boundingBox())!;
            expect(box.width).toBeLessThanOrEqual(width - 32 + 0.5);
          }
          await axe(page);
          await testInfo.attach(`dialog-${size}-${theme}-${mode}-${width}`, {
            body: await page.screenshot(),
            contentType: "image/png",
          });
          await page.keyboard.press("Escape");
          await expect(dialogs(page)).toHaveCount(0);
        }
      });
    }
  }
}

test("dialog widths follow size above 640px", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDialogPage(page);
  const playground = section(page, "Dialog playground");
  for (const [size, width] of [
    ["default", 384],
    ["form", 576],
    ["split", 1024],
  ] as const) {
    await chooseOption(page, "Size", size);
    await playground
      .getByRole("button", { name: `Open ${size} dialog` })
      .click();
    const dialog = page.getByRole("dialog", { name: `Example ${size} dialog` });
    await expect(dialog).toHaveCSS("width", `${width}px`);
    await page.keyboard.press("Escape");
    await expect(dialogs(page)).toHaveCount(0);
  }
});

test("playground toggles placement, close buttons, and defaultOpen", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openDialogPage(page);
  const playground = section(page, "Dialog playground");
  await chooseOption(page, "Placement", "top");
  await playground.getByRole("button", { name: "Open form dialog" }).click();
  let dialog = page.getByRole("dialog", { name: "Example form dialog" });
  await expect(dialog).toHaveAttribute("data-placement", "top");
  const top = (await dialog.boundingBox())!.y;
  expect(Math.abs(top - 900 * 0.12)).toBeLessThan(2);
  await expect(
    dialog.getByRole("button", { name: "Close", exact: true }),
  ).toHaveCount(2);
  await testInfo.attach("dialog-playground-top", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialogs(page)).toHaveCount(0);
  await expect(
    playground.getByRole("button", { name: "Open form dialog" }),
  ).toBeFocused();

  await playground.getByRole("button", { name: "Corner close" }).click();
  await playground.getByRole("button", { name: "Footer close" }).click();
  await expect(
    playground.getByRole("button", { name: "Corner close" }),
  ).toHaveAttribute("aria-pressed", "false");
  await playground.getByRole("button", { name: "Open form dialog" }).click();
  dialog = page.getByRole("dialog", { name: "Example form dialog" });
  await expect(
    dialog.getByRole("button", { name: "Close", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");

  await playground
    .getByRole("button", { name: "Mount with defaultOpen" })
    .click();
  dialog = page.getByRole("dialog", { name: "Opened on mount" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("data-size", "default");
  await dialog.getByRole("button", { name: "Close" }).last().click();
  await expect(dialogs(page)).toHaveCount(0);
});

test("keyboard opens, traps focus, closes, and restores focus", async ({
  page,
}) => {
  await openDialogPage(page);
  const opener = section(page, "Sizes").getByRole("button", {
    name: "Rename file",
  });
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Rename file" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Dialog" }),
  ).toHaveCount(0);
  await expect(dialog.getByLabel("Name")).toBeFocused();
  await expect(dialog).toHaveAccessibleDescription(
    "Links and sharing stay the same after renaming.",
  );
  const focusInside = () =>
    dialog.evaluate((element) =>
      element.contains(document.activeElement)
        ? "inside"
        : document.activeElement?.outerHTML.slice(0, 120),
    );
  for (const key of ["Tab", "Shift+Tab"]) {
    for (let index = 0; index < 6; index += 1) {
      await page.keyboard.press(key);
      await expect.poll(focusInside).toBe("inside");
    }
  }
  await page.keyboard.press("Escape");
  await expect(dialogs(page)).toHaveCount(0);
  await expect(opener).toBeFocused();

  await opener.click();
  await page
    .getByRole("dialog", { name: "Rename file" })
    .getByRole("button", { name: "Close" })
    .click();
  await expect(opener).toBeFocused();
});

test("busy dialogs ignore Escape and outside clicks", async ({ page }) => {
  await openDialogPage(page);
  const sizes = section(page, "Sizes");
  await sizes.getByRole("button", { name: "New team" }).click();
  const dialog = page.getByRole("dialog", { name: "New team" });
  await dialog.getByLabel("Name").fill("Field operations");
  await dialog.getByRole("button", { name: "Create team" }).click();
  await expect(
    dialog.getByRole("button", { name: "Creating team…" }),
  ).toHaveAttribute("aria-busy", "true");
  await page.keyboard.press("Escape");
  await page.mouse.click(5, 5);
  await expect(dialog).toBeVisible();
  await expect(dialogs(page)).toHaveCount(0);
  await expect(sizes.getByText("Field operations created.")).toBeVisible();
});

test("confirmations keep errors inside and fall back to the heading", async ({
  page,
}) => {
  await openDialogPage(page);
  const confirmations = section(page, "Confirmations");
  await expect(
    confirmations.getByRole("button", { name: "Remove member" }).first(),
  ).toBeDisabled();

  await confirmations.getByRole("button", { name: "Delete team" }).click();
  let dialog = page.getByRole("dialog", { name: "Delete Field operations?" });
  await dialog.getByRole("button", { name: "Confirm delete team" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "This team owns tables and cannot be deleted.",
  );
  await dialog.getByRole("button", { name: "Confirm delete team" }).click();
  await expect(dialogs(page)).toHaveCount(0);
  await expect(
    confirmations.getByRole("button", { name: "Delete team" }),
  ).toBeFocused();

  await confirmations.getByRole("button", { name: "Make admin" }).click();
  dialog = page.getByRole("dialog", { name: "Make admin?" });
  await expect(dialog.getByRole("button", { name: "Close" })).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(
    confirmations.getByRole("button", { name: "Make admin" }),
  ).toBeFocused();

  await confirmations
    .getByRole("button", { name: "Remove member" })
    .last()
    .click();
  dialog = page.getByRole("dialog", { name: "Remove member?" });
  await dialog.getByRole("button", { name: "Confirm removal" }).click();
  await expect(
    dialog.getByRole("button", { name: "Saving change…" }),
  ).toBeDisabled();
  await expect(dialogs(page)).toHaveCount(0);
  await expect(confirmations.getByText("Kofi Mensah")).toBeHidden();
  await expect(
    confirmations.getByRole("heading", { name: "Members and teams" }),
  ).toBeFocused();
});

test("states cover loading, empty, error, blocked, and conditional mount", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await openDialogPage(page);
  const deleting = row(page, "Delete forever");
  for (const [state, check] of [
    ["Checking", "status"],
    ["Couldn’t check", "Check again"],
    ["Blocked", "Items owned by other people"],
    [
      "Delete failed",
      "Couldn’t delete forever. Nothing was removed. Try again.",
    ],
  ] as const) {
    await chooseOption(page, "Delete forever state", state);
    await deleting.getByRole("button", { name: "Delete forever" }).click();
    const dialog = page.getByRole("dialog");
    if (check === "status")
      await expect(dialog.getByRole("status")).toBeVisible();
    else
      await expect(
        dialog
          .getByText(check)
          .or(dialog.getByRole("button", { name: check }))
          .or(dialog.getByRole("list", { name: check }))
          .first(),
      ).toBeVisible();
    await settle(page);
    await expectNoOverflow(dialog);
    await testInfo.attach(`dialog-delete-${state}`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await page.keyboard.press("Escape");
    await expect(dialogs(page)).toHaveCount(0);
    await expect(
      deleting.getByRole("button", { name: "Delete forever" }),
    ).toBeFocused();
  }

  const skill = row(page, "Delete skill");
  await skill.getByRole("button", { name: "Delete skill" }).click();
  let dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Checking where this skill is used…"),
  ).toBeVisible();
  await expect(dialog.locator("[data-slot=dialog-description]")).toHaveCount(0);
  await expect(dialog.locator("[data-slot=dialog-description]")).toHaveCount(1);
  await expect(
    dialog.getByRole("button", { name: "Delete skill" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await chooseOption(page, "Delete skill state", "Unavailable");
  await skill.getByRole("button", { name: "Delete skill" }).click();
  await expect(
    page.getByRole("dialog").getByText("This skill was deleted"),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  const compaction = row(page, "Compaction");
  await expect(dialogs(page)).toHaveCount(0);
  await chooseOption(page, "Compaction state", "Handoff failed");
  await compaction.getByRole("button", { name: "View compaction" }).click();
  dialog = page.getByRole("dialog", { name: "Conversation handoff" });
  await dialog.getByRole("button", { name: "Retry handoff" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Writing handoff…");
  await expect(
    dialog.getByText("We are onboarding three new suppliers"),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialogs(page)).toHaveCount(0);
  await expect(
    compaction.getByRole("button", { name: "View compaction" }),
  ).toBeFocused();

  const move = row(page, "Move chat");
  await chooseOption(page, "Projects state", "No projects");
  await move.getByRole("button", { name: "Move to project" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "No projects to move into" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await chooseOption(page, "Projects state", "Ready");
  await move.getByRole("button", { name: "Move to project" }).click();
  dialog = page.getByRole("dialog", { name: "Move chat to a project" });
  await expect(
    dialog.getByRole("button", { name: "Move chat" }),
  ).toBeDisabled();
  await dialog.getByRole("combobox", { name: "Project" }).click();
  await page.getByRole("option", { name: "Spring launch" }).click();
  await expect(dialogs(page)).toHaveCount(1);
  await dialog.getByRole("checkbox").check();
  await testInfo.attach("dialog-move-chat-ready", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await dialog.getByRole("button", { name: "Move chat" }).click();
  await expect(dialogs(page)).toHaveCount(0);
  await expect(page.getByText("Chat moved to Spring launch.")).toBeVisible();
});

test("form flows submit from the footer and hand focus between stacked dialogs", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  await openDialogPage(page);

  await row(page, "Save a copy")
    .getByRole("button", { name: "Save a copy" })
    .click();
  let dialog = page.getByRole("dialog", { name: /Save a copy/ });
  await expect(
    dialog.getByRole("button", { name: "Save copy" }),
  ).toBeDisabled();
  await dialog.getByRole("radio", { name: "Field operations" }).check();
  await dialog.getByRole("button", { name: "Save copy" }).click();
  await expect(
    dialog.getByRole("button", { name: "Retry copy" }),
  ).toBeVisible();
  await expect(dialog.getByRole("alert")).toContainText(
    "Google Drive didn’t answer in time.",
  );
  await dialog.getByRole("button", { name: "Retry copy" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Copy saved to TulipFarm" }),
  ).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Open copy" })).toBeFocused();
  await testInfo.attach("dialog-save-copy-success", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await dialog.getByRole("button", { name: "Done" }).click();

  await row(page, "Move").getByRole("button", { name: "Move 2 items" }).click();
  dialog = page.getByRole("dialog", { name: "Move 2 items" });
  const hint = dialog.locator("[data-slot=dialog-footer] > p");
  await expect(hint).toHaveText("These items are already here.");
  await testInfo.attach("dialog-move-hint", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await dialog.getByRole("radio", { name: "Field operations" }).check();
  await expect(hint).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Review move to Field operations" })
    .click();
  await dialog.getByRole("button", { name: "Choose another folder" }).click();
  await expect(
    dialog.getByRole("radiogroup", { name: "Folders" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await row(page, "Use in chat")
    .getByRole("button", { name: "Use in chat" })
    .click();
  const review = page.getByRole("dialog", {
    name: "Use “Q3 forecast.xlsx” in chat",
  });
  await review.getByRole("button", { name: "Share file" }).click();
  const sharing = page.getByRole("dialog", {
    name: "Share “Q3 forecast.xlsx”",
  });
  await expect(page.locator("[role=dialog]")).toHaveCount(2);
  await expect(dialogs(page)).toHaveCount(1);
  await testInfo.attach("dialog-stacked", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.keyboard.press("Escape");
  await expect(page.locator("[role=dialog]")).toHaveCount(1);
  await expect(
    review.getByRole("button", { name: "Share file" }),
  ).toBeFocused();
  await review.getByRole("button", { name: "Share file" }).click();
  await sharing.getByRole("button", { name: "Give view access" }).click();
  await sharing.getByRole("button", { name: "Done" }).click();
  await expect(dialogs(page)).toHaveCount(1);
  await expect(
    review.getByRole("button", { name: "Add to draft" }),
  ).toBeFocused();
  await review.getByRole("button", { name: "Add to draft" }).click();
  await expect(
    row(page, "Use in chat").getByRole("button", { name: "Use in chat" }),
  ).toBeFocused();

  await row(page, "Add to Knowledge")
    .getByRole("button", { name: "Add to Knowledge" })
    .click();
  dialog = page.getByRole("dialog", { name: "Add 2 files to Knowledge" });
  await dialog.getByRole("button", { name: "Add to Knowledge" }).click();
  await dialog.getByRole("button", { name: "Check status" }).click();
  await expect(dialog.getByText("Added")).toHaveCount(2);
  await dialog.getByRole("button", { name: "Done" }).click();

  await row(page, "Paste text")
    .getByRole("button", { name: "Paste text" })
    .click();
  dialog = page.getByRole("dialog", { name: "Paste text" });
  await expect(dialog.locator("form[data-slot=dialog-body]")).toHaveCount(1);
  await dialog.getByLabel("Title").fill("Launch brief");
  await dialog.getByLabel("Text").fill("Confirm delivery windows.");
  await dialog.getByRole("button", { name: "Save text" }).click();
  await expect(dialogs(page)).toHaveCount(0);

  await row(page, "File text")
    .getByRole("button", { name: "Launch brief" })
    .click();
  dialog = page.getByRole("dialog", { name: "Launch brief" });
  const body = dialog.locator("[data-slot=dialog-body]");
  expect(
    await body.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  expect((await dialog.boundingBox())!.height).toBeLessThanOrEqual(
    860 - 32 + 0.5,
  );
  await page.keyboard.press("Escape");

  await row(page, "Close workspace")
    .getByRole("button", { name: "Close workspace" })
    .click();
  dialog = page.getByRole("dialog", {
    name: "Close this workspace for everyone?",
  });
  const submit = dialog.getByRole("button", {
    name: "Close workspace for everyone",
  });
  await dialog
    .getByLabel("Type the exact workspace name")
    .fill("Meadow Logistics");
  await expect(submit).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await submit.click();
  await expect(dialogs(page)).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Danger zone" }),
  ).toBeFocused();
});

test("details swaps to sharing with a long wrapping name", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await openDialogPage(page);
  const opener = row(page, "Details").getByRole("button", { name: "Details" });
  await opener.click();
  const details = page.getByRole("dialog", { name: "Details" });
  await expectNoOverflow(details);
  await details.getByRole("button", { name: "Manage access" }).click();
  const sharing = page.getByRole("dialog", { name: /^Share “Spring launch/ });
  await expect(sharing).toBeVisible();
  await expectNoOverflow(sharing);
  await expect(page.locator("[role=dialog]")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator("[role=dialog]")).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("search and command palettes pin to the top with keyboard results", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openDialogPage(page);
  const search = section(page, "Search and command palettes");
  await search.getByRole("button", { name: "Search", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Search Meadow" });
  await expect(dialog).toHaveAttribute("data-slot", "search-dialog");
  await expect(dialog).toHaveAttribute("data-placement", "top");
  expect(Math.abs((await dialog.boundingBox())!.y - 108)).toBeLessThan(2);
  await expect(dialog).toHaveCSS("width", "672px");
  const input = dialog.getByRole("combobox", { name: "Search Meadow" });
  await expect(input).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(dialog.getByRole("option", { selected: true })).toContainText(
    "Spring launch",
  );
  await page.keyboard.press("End");
  await expect(dialog.getByRole("option", { selected: true })).toContainText(
    "Field operations weekly plan",
  );
  await testInfo.attach("dialog-search", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await input.fill("zzz");
  await expect(dialog.getByRole("status")).toContainText("No matches");
  await testInfo.attach("dialog-search-empty", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await dialog.getByRole("button", { name: "Clear filters" }).click();
  await expect(dialog.getByRole("option")).toHaveCount(5);
  await dialog.getByRole("button", { name: "Documents only" }).click();
  await expect(dialog.getByRole("option")).toHaveCount(3);
  await input.focus();
  await page.keyboard.press("Enter");
  await expect(dialogs(page)).toHaveCount(0);
  await expect(
    search.getByText("Opened Supplier onboarding checklist."),
  ).toBeVisible();

  await search.getByRole("button", { name: "Search", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Search Meadow" });
  await dialog.getByRole("button", { name: "Close search" }).click();
  await expect(dialogs(page)).toHaveCount(0);

  await search.getByRole("button", { name: "Command palette" }).click();
  dialog = page.getByRole("dialog", { name: "Command Palette" });
  await expect(dialog.getByRole("button", { name: "Close" })).toHaveCount(0);
  expect(Math.abs((await dialog.boundingBox())!.y - 300)).toBeLessThan(2);
  await expect(dialog).toHaveCSS("padding-top", "0px");
  await testInfo.attach("dialog-command", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(search.getByText("Ran Workspace settings.")).toBeVisible();
});

test("fullscreen file viewer has its own header and close button", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await openDialogPage(page);
  await section(page, "Sizes")
    .getByRole("button", { name: "View local file" })
    .click();
  const dialog = page.getByRole("dialog", {
    name: /Spring launch – supplier onboarding/,
  });
  await expect(
    dialog.getByRole("link", { name: "Open in Google" }),
  ).toHaveCount(0);
  await expectNoOverflow(dialog);
  await testInfo.attach("dialog-fullscreen-local-390", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await dialog.getByRole("button", { name: "Close file viewer" }).click();
  await expect(dialogs(page)).toHaveCount(0);
  await section(page, "Sizes")
    .getByRole("button", { name: "View Google document" })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("link", { name: "Open in Google" }),
  ).toHaveAttribute("target", "_blank");
});

test("motion stays within 180ms and stops for reduced motion", async ({
  page,
}) => {
  await openDialogPage(page);
  const trigger = section(page, "Sizes").getByRole("button", {
    name: "New team",
  });
  await trigger.click();
  let dialog = page.getByRole("dialog", { name: "New team" });
  await expect(dialog).toHaveCSS("transition-duration", "0s");
  await page.keyboard.press("Escape");
  await expect(dialogs(page)).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await trigger.click();
  dialog = page.getByRole("dialog", { name: "New team" });
  await expect(dialog).toHaveCSS("transition-duration", "0.18s, 0.18s");
  await expect(page.locator("[data-slot=dialog-overlay]")).toHaveCSS(
    "transition-duration",
    "0.18s",
  );
  await page.keyboard.press("Escape");
  await expect(dialogs(page)).toHaveCount(0);
});
