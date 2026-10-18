import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ reducedMotion: "reduce" });

async function openPage(page: Page) {
  await page.goto("/components/mention-list/");
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

async function setMode(page: Page, dark: boolean) {
  const toggle = page.getByRole("button", { name: "Dark mode", exact: true });
  if ((await toggle.getAttribute("aria-pressed")) !== String(dark))
    await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", String(dark));
  if (dark) await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
}

// The shared site header is out of scope; this page's content and demos are checked.
async function axe(page: Page, scope = "main") {
  const results = await new AxeBuilder({ page })
    .include(scope)
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

const section = (page: Page, id: string) => page.locator(`#${id}`);
const filesBox = (page: Page) =>
  page.getByRole("textbox", { name: "Message with file mentions" });
const skillsBox = (page: Page) =>
  page.getByRole("textbox", { name: "Message with skills" });
const filesList = (page: Page) =>
  page.getByRole("listbox", { name: "Files you can add" }).first();
const segment = (scope: Locator, group: string, name: string) =>
  scope
    .getByRole("group", { name: group, exact: true })
    .getByRole("button", { name, exact: true });

async function typeAtEnd(box: Locator, text: string) {
  await box.click();
  await box.press("End");
  await box.pressSequentially(text);
}

async function expectContained(panel: Locator) {
  expect(
    await panel.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        inViewport: box.left >= 0 && box.right <= innerWidth + 0.5,
        noScroll: element.scrollWidth <= element.clientWidth + 1,
        inside: [...element.querySelectorAll("*")].every((child) => {
          const rect = child.getBoundingClientRect();
          return (
            !rect.width ||
            (rect.left >= box.left - 1 && rect.right <= box.right + 1)
          );
        }),
      };
    }),
  ).toEqual({ inViewport: true, noScroll: true, inside: true });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`mention list ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openPage(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        await setMode(page, mode === "dark");
        await page.evaluate(() => scrollTo(0, 0));
        await settle(page);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await axe(page);
        const full = await page.screenshot({ fullPage: true });
        expect(full.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`mention-list-${theme}-${mode}-${width}`, {
          body: full,
          contentType: "image/png",
        });

        await typeAtEnd(filesBox(page), "@re");
        const panel = page.locator(
          '#mention-list-files [data-slot="mention-list"]',
        );
        await expect(panel).toBeVisible();
        await expect(panel.getByRole("option")).toHaveCount(5);
        await settle(page);
        await expectContained(panel);
        await panel.evaluate((node) =>
          node.scrollIntoView({ block: "center" }),
        );
        await axe(page, "#mention-list-files [data-demo-composer]");
        await shot(
          section(page, "mention-list-files"),
          testInfo,
          `mention-list-files-${theme}-${mode}-${width}`,
        );

        const states = section(page, "mention-list-states");
        await states.scrollIntoViewIfNeeded();
        for (const list of await states
          .locator('[data-slot="mention-list"]')
          .all())
          await expectContained(list);
        await shot(
          states,
          testInfo,
          `mention-list-states-${theme}-${mode}-${width}`,
        );

        await section(page, "mention-list-people").scrollIntoViewIfNeeded();
        await shot(
          section(page, "mention-list-people"),
          testInfo,
          `mention-list-people-${theme}-${mode}-${width}`,
        );

        const error = page
          .locator(
            '#mention-list-states [data-tone="error"] .sprout-mention-status-text',
          )
          .first();
        const empty = page
          .locator(
            '#mention-list-states [data-tone="empty"] .sprout-mention-status-text',
          )
          .first();
        expect(
          await error.evaluate((node) => getComputedStyle(node).color),
        ).not.toBe(
          await empty.evaluate((node) => getComputedStyle(node).color),
        );
      });
    }
  }
}

test("file mentions move with the keyboard across groups, wrap, add, and dismiss", async ({
  page,
}) => {
  await openPage(page);
  const box = filesBox(page);
  await typeAtEnd(box, "@re");
  const list = filesList(page);
  await expect(box).toHaveAttribute(
    "aria-controls",
    (await list.getAttribute("id"))!,
  );
  await expect(
    list.getByRole("group", { name: "Files" }).getByRole("option"),
  ).toHaveText([
    /Q3 revenue forecast\.xlsx\s*48 KB/,
    /Storefront hero\.png\s*2\.9 MB/,
    /^Retro notes$/,
  ]);
  await expect(
    list.getByRole("group", { name: "Google Drive" }).getByRole("option"),
  ).toHaveText([
    /Board deck — Q3 review\s*Google Slides/,
    /Revenue model\.pdf\s*PDF/,
  ]);
  const options = list.getByRole("option");
  const activeId = async () =>
    (await box.getAttribute("aria-activedescendant"))!;
  expect(await activeId()).toBe(await options.nth(0).getAttribute("id"));
  await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");

  for (let step = 0; step < 3; step++) await box.press("ArrowDown");
  expect(await activeId()).toBe(await options.nth(3).getAttribute("id"));
  await expect(options.nth(3)).toHaveAttribute("aria-selected", "true");
  await expect(options.nth(0)).toHaveAttribute("aria-selected", "false");
  await box.press("ArrowDown");
  await box.press("ArrowDown");
  expect(await activeId()).toBe(await options.nth(0).getAttribute("id"));
  await box.press("ArrowUp");
  expect(await activeId()).toBe(await options.nth(4).getAttribute("id"));
  await expect(
    page.locator(
      '#mention-list-files p[role="status"].sprout-mention-list-announcement',
    ),
  ).toHaveText(
    "5 files you can add. Use Up and Down to choose, Enter to add, Escape to close.",
  );

  await box.press("Enter");
  await expect(page.getByRole("group", { name: "Added files" })).toContainText(
    "Revenue model.pdf",
  );
  await expect(box).not.toHaveAttribute("aria-controls");
  await expect(box).toBeFocused();
  await expect(box).toHaveValue("Compare the forecast with ");

  await box.pressSequentially("@re");
  await expect(filesList(page).getByRole("option")).toHaveCount(4);
  await box.press("Tab");
  await expect(page.getByRole("group", { name: "Added files" })).toContainText(
    "Q3 revenue forecast.xlsx",
  );
  await expect(box).toBeFocused();

  await box.pressSequentially("@");
  await expect(filesList(page)).toBeVisible();
  await expect(
    page
      .locator("#mention-list-files")
      .getByRole("status")
      .filter({ hasText: "Type a name to search your Google Drive." }),
  ).toBeVisible();
  await box.press("Escape");
  await expect(
    page.locator('#mention-list-files [data-slot="mention-list"]'),
  ).toHaveCount(0);
  await expect(box).not.toHaveAttribute("aria-controls");
  await expect(box).toBeFocused();
});

test("clicking an option keeps focus in the message and adds the file", async ({
  page,
}) => {
  await openPage(page);
  const box = filesBox(page);
  await typeAtEnd(box, "@launch");
  await filesList(page)
    .getByRole("option", { name: /Launch brief\.pdf/ })
    .click();
  await expect(box).toBeFocused();
  await expect(page.getByRole("group", { name: "Added files" })).toContainText(
    "Launch brief.pdf",
  );
  await box.pressSequentially("@launch");
  await expect(
    page
      .locator("#mention-list-files")
      .getByRole("status")
      .filter({ hasText: "Every matching file is already added." }),
  ).toBeVisible();
  await expect(
    page.locator("#mention-list-files").getByRole("status").filter({
      hasText: "No Google Drive files you can read match “launch”.",
    }),
  ).toBeVisible();
});

test("file sources report loading, empty, failed, and reconnect states", async ({
  page,
}) => {
  await openPage(page);
  const files = section(page, "mention-list-files");
  const box = filesBox(page);

  await typeAtEnd(box, "@zzz");
  await expect(
    files
      .getByRole("status")
      .filter({ hasText: "No files you can open match “zzz”." }),
  ).toBeVisible();
  await expect(
    files
      .getByRole("status")
      .filter({ hasText: "No Google Drive files you can read match “zzz”." }),
  ).toBeVisible();

  await segment(files, "Files search", "Loading").click();
  await segment(files, "Drive search", "Loading").click();
  await typeAtEnd(box, "");
  await expect(
    files
      .getByRole("status")
      .filter({ hasText: "Searching your files…" })
      .locator('[data-slot="spinner"]'),
  ).toBeVisible();
  await expect(
    files.getByRole("status").filter({ hasText: "Searching Google Drive…" }),
  ).toBeVisible();

  await segment(files, "Drive search", "Needs reconnect").click();
  await segment(files, "Files search", "Fails").click();
  await typeAtEnd(box, "");
  const filesError = files
    .getByRole("alert")
    .filter({ hasText: "Couldn’t search Files." });
  await expect(
    filesError.getByRole("button", { name: "Retry search" }),
  ).toBeVisible();
  const reconnect = files
    .getByRole("alert")
    .filter({ hasText: "Google Drive needs reconnecting." });
  await expect(reconnect).toBeVisible();
  await expect(reconnect.getByRole("button")).toHaveCount(0);

  await segment(files, "Drive search", "Fails").click();
  await typeAtEnd(box, "");
  await expect(
    files
      .getByRole("alert")
      .filter({ hasText: "Couldn’t search Google Drive." })
      .getByRole("button"),
  ).toHaveCount(0);
  await box.press("Enter");
  await expect(filesError).toHaveCount(0);
  const driveError = files
    .getByRole("alert")
    .filter({ hasText: "Couldn’t search Google Drive." });
  await driveError.getByRole("button", { name: "Retry Drive search" }).click();
  await expect(box).toBeFocused();
  await expect(
    files
      .getByRole("status")
      .filter({ hasText: "No Google Drive files you can read match “zzz”." }),
  ).toBeVisible();

  await segment(files, "Drive", "Not connected").click();
  await box.fill("");
  await box.pressSequentially("@");
  await expect(filesList(page).getByRole("group")).toHaveCount(0);
  await expect(filesList(page).getByRole("option")).toHaveCount(5);
  await expect(
    files.getByText("Type a name to search your Google Drive."),
  ).toHaveCount(0);
});

test("skills list states, the compact command, and staging", async ({
  page,
}) => {
  await openPage(page);
  const skills = section(page, "mention-list-skills");
  const box = skillsBox(page);
  await skills.getByRole("button", { name: "Use skill" }).click();
  await expect(box).toBeFocused();
  const list = skills.getByRole("listbox", { name: "Skills you can use" });
  await expect(list.getByRole("option")).toHaveCount(4);
  await expect(list.getByRole("option").first()).toContainText(
    "Workspace skill · Version 3f9a1c2e",
  );
  await expect(
    list.locator('[data-slot="mention-option-media"] svg'),
  ).toHaveCount(4);

  await box.pressSequentially("c");
  await expect(list.getByRole("option").first()).toContainText("/compact");
  await box.press("Enter");
  await expect(box).toHaveValue("/compact ");
  await expect(list).toHaveCount(0);
  await expect(box).not.toHaveAttribute("aria-controls");

  await box.fill("");
  await box.pressSequentially("/zzz");
  await expect(
    skills.getByRole("status").filter({ hasText: "No skills match “zzz”." }),
  ).toBeVisible();
  await box.fill("");
  await box.pressSequentially("/release");
  await box.press("Enter");
  await expect(
    skills.getByText("Release notes writer · Version 0c88e2f1"),
  ).toBeVisible();
  await expect(
    skills.getByText("The assistant follows this skill for this message only."),
  ).toBeVisible();

  await segment(skills, "Skills", "Loading").click();
  await typeAtEnd(box, " /");
  await expect(
    skills.getByRole("status").filter({ hasText: "Loading skills…" }),
  ).toBeVisible();
  await segment(skills, "Skills", "None reviewed").click();
  await typeAtEnd(box, "");
  await expect(
    skills.getByRole("status").filter({
      hasText: "No reviewed skills yet. An admin reviews skills in Skills.",
    }),
  ).toBeVisible();
  await segment(skills, "Skills", "Fails").click();
  await typeAtEnd(box, "");
  const failure = skills
    .getByRole("alert")
    .filter({ hasText: "Couldn’t load skills." });
  await failure.getByRole("button", { name: "Retry skills" }).click();
  await expect(box).toBeFocused();
  await expect(list.getByRole("option")).toHaveCount(4);
});

test("rich editor panel prefers error, then loading, then empty", async ({
  page,
}) => {
  await openPage(page);
  const editor = section(page, "mention-list-editor");
  const list = editor.getByRole("listbox", { name: "Files you can add" });
  await expect(list.getByRole("option")).toHaveCount(4);
  const bare = list.getByRole("option", {
    name: "Imported row without an icon",
  });
  await expect(bare.locator('[data-slot="mention-option-media"]')).toHaveCount(
    0,
  );
  await expect(bare.locator(".sprout-mention-option-description")).toHaveCount(
    0,
  );
  await list.getByRole("option", { name: /Roadmap 2026/ }).click();
  await expect(editor.getByText("Added Roadmap 2026.")).toBeVisible();
  await expect(
    list.getByRole("option", { name: /Roadmap 2026/ }),
  ).toHaveAttribute("aria-selected", "true");

  await segment(editor, "Editor search", "Searching").click();
  await expect(
    editor.getByRole("status").filter({ hasText: "Searching…" }),
  ).toBeVisible();
  await segment(editor, "Editor search", "No match").click();
  await expect(
    editor
      .getByRole("status")
      .filter({ hasText: "No files you can open match." }),
  ).toBeVisible();
  await segment(editor, "Editor search", "Fails").click();
  await editor.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(list.getByRole("option")).toHaveCount(4);
});

test("long titles truncate, rows meet target sizes, and motion respects preferences", async ({
  page,
}) => {
  await openPage(page);
  const states = section(page, "mention-list-states");
  const longTitle = states.locator(".sprout-mention-option-title", {
    hasText: "Customer interviews",
  });
  expect(
    await longTitle.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  await expect(longTitle).toHaveAttribute("title", /follow-up notes\.docx$/);
  expect(
    await longTitle.evaluate((node) => getComputedStyle(node).textOverflow),
  ).toBe("ellipsis");

  const option = states.locator('[data-slot="mention-option"]').first();
  const fine = await page.evaluate(() => matchMedia("(pointer: fine)").matches);
  expect((await option.boundingBox())!.height).toBeGreaterThanOrEqual(
    fine ? 36 : 44,
  );
  const status = states.locator('[data-slot="mention-status"]').first();
  expect((await status.boundingBox())!.height).toBeGreaterThanOrEqual(44);

  const panel = states.locator('[data-slot="mention-list"]').first();
  expect(
    await panel.evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("none");
  expect(
    await option.evaluate((node) => getComputedStyle(node).transitionDuration),
  ).toBe("0s");

  const people = section(page, "mention-list-people");
  await people.getByRole("option", { name: /Robin Field/ }).click();
  await expect(
    people.getByRole("option", { name: /Robin Field/ }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    people.getByRole("group", { name: "People" }).getByRole("option"),
  ).toHaveCount(3);
  await expect(
    people.getByRole("group", { name: "Agents" }).getByRole("option"),
  ).toHaveCount(1);
});

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });
  test("the panel rises in over 120ms", async ({ page }) => {
    await openPage(page);
    const panel = section(page, "mention-list-states")
      .locator('[data-slot="mention-list"]')
      .first();
    expect(
      await panel.evaluate((node) => getComputedStyle(node).animationName),
    ).toBe("sprout-mention-list-in");
    expect(
      await panel.evaluate((node) => getComputedStyle(node).animationDuration),
    ).toBe("0.12s");
    const option = section(page, "mention-list-states")
      .locator('[data-slot="mention-option"]')
      .first();
    expect(
      await option.evaluate(
        (node) => getComputedStyle(node).transitionDuration,
      ),
    ).toBe("0.12s");
  });
});

test.describe("on a touch phone", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  test("rows are 44px touch targets and tapping keeps the message focused", async ({
    page,
  }, testInfo) => {
    await openPage(page);
    const box = filesBox(page);
    await typeAtEnd(box, "@re");
    const option = filesList(page).getByRole("option").first();
    const coarse = await page.evaluate(
      () => !matchMedia("(pointer: fine)").matches,
    );
    expect((await option.boundingBox())!.height).toBeGreaterThanOrEqual(
      coarse ? 44 : 36,
    );
    await shot(
      page.locator("#mention-list-files [data-demo-composer]"),
      testInfo,
      "mention-list-files-touch",
    );
    await option.tap();
    await expect(
      page.getByRole("group", { name: "Added files" }),
    ).toContainText("Q3 revenue forecast.xlsx");
  });
});
