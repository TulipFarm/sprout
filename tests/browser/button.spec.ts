import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

async function openDemo(page: Page) {
  await page.goto("/components/button/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const demo = (page: Page) => page.locator("#button-demo");
const section = (page: Page, name: string) =>
  page.getByRole("region", { name, exact: true });

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`${theme} ${mode} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await openDemo(page);
        await chooseOption(
          page,
          "Theme",
          theme === "neutral" ? "Neutral" : "TulipFarm",
        );
        await chooseOption(
          page,
          "Color mode",
          mode === "light" ? "Light" : "Dark",
        );
        await expect(page.locator("html")).toHaveAttribute(
          "data-sprout-theme",
          theme,
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const primary = section(page, "Variants").getByRole("button", {
          name: "default",
          exact: true,
        });
        const background = await primary.evaluate(
          (node) => getComputedStyle(node).backgroundColor,
        );
        expect(background).not.toBe("rgba(0, 0, 0, 0)");
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await test.info().attach(`button-${theme}-${mode}-${width}`, {
          body: await demo(page).screenshot({ animations: "disabled" }),
          contentType: "image/png",
        });
      });
    }
  }
}

test("every variant and size renders with its documented geometry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openDemo(page);
  const variants = section(page, "Variants").locator("[data-slot=button]");
  await expect(variants).toHaveCount(7);
  await expect(variants).toHaveText([
    "default",
    "outline",
    "secondary",
    "ghost",
    "destructive",
    "link",
    "scope",
  ]);
  const sizes = section(page, "Sizes");
  const expected: Record<string, [number | null, number | null]> = {
    default: [null, 28],
    xs: [null, 24],
    sm: [null, 28],
    lg: [null, 36],
    icon: [32, 32],
    "icon-xs": [24, 24],
    "icon-sm": [28, 28],
    "icon-lg": [36, 36],
    onboarding: [null, 44],
    bud: [64, 64],
    "bud-labeled": [null, 48],
    "chat-row": [null, 44],
    "card-title": [null, 40],
    "result-card": [null, 32],
    "calendar-title": [null, 32],
    calendar: [null, 32],
    "calendar-icon": [32, 32],
    nav: [null, 32],
    badge: [null, 28],
  };
  await expect(sizes.locator("[data-slot=button]")).toHaveCount(24);
  for (const [size, [width, height]] of Object.entries(expected)) {
    const box = await sizes.locator(`[data-size="${size}"]`).boundingBox();
    if (width !== null) expect(box?.width, size).toBe(width);
    if (height !== null) expect(box?.height, size).toBe(height);
  }
  await expect(sizes.locator('[data-size="calendar-title"]')).toHaveCSS(
    "font-size",
    "18px",
  );
  await expect(sizes.locator('[data-size="task-link"]')).toHaveCSS(
    "white-space",
    "normal",
  );
  await expect(sizes.locator('[data-size="column-header-end"]')).toHaveCSS(
    "flex-direction",
    "row-reverse",
  );
  await expect(sizes.locator('[data-size="bud"]')).toHaveCSS(
    "touch-action",
    "none",
  );
  await expect(
    sizes.locator('[data-size="xs"] svg, [data-size="icon-xs"] svg'),
  ).toHaveCSS("width", "12px");
  await test.info().attach("button-sizes", {
    body: await sizes.screenshot({ animations: "disabled" }),
    contentType: "image/png",
  });
});

test("keyboard activates buttons, shows focus, and respects disabled", async ({
  page,
}) => {
  await openDemo(page);
  const stage = page.getByRole("region", { name: "Button playground" });
  const button = stage.getByRole("button", { name: "Add item" });
  await expect(button).toHaveAttribute("type", "button");
  await button.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  await expect(stage.getByRole("status")).toHaveText("Clicked 2 times");
  await expect(button).toHaveCSS("outline-style", "solid");
  await expect(button).toHaveCSS("outline-width", "1px");

  await chooseOption(page, "State", "Disabled");
  await expect(button).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await chooseOption(page, "State", "Busy");
  const busy = stage.getByRole("button", { name: "Saving…" });
  await expect(busy).toHaveAttribute("aria-busy", "true");
  await expect(busy).toBeDisabled();
  await expect(busy).toHaveCSS("opacity", "0.5");
  await expect(busy.locator("svg")).toHaveCSS("animation-name", "none");
  await chooseOption(page, "State", "Invalid");
  await expect(button).toHaveAttribute("aria-invalid", "true");
  await expect(button).toHaveAccessibleDescription(
    "Choose an owner before saving.",
  );
  await chooseOption(page, "State", "Expanded");
  await expect(button).toHaveAttribute("aria-expanded", "true");

  await chooseOption(page, "Variant", "destructive");
  await chooseOption(page, "Size", "icon-sm");
  await expect(button).toHaveAttribute("data-variant", "destructive");
  await expect(button).toHaveAttribute("data-size", "icon-sm");
  await expect(button).toHaveAccessibleName("Add item");
  await test.info().attach("button-playground", {
    body: await stage.screenshot({ animations: "disabled" }),
    contentType: "image/png",
  });
});

test("links keep link semantics and disabled links are inert", async ({
  page,
}) => {
  await openDemo(page);
  const links = section(page, "Links");
  const open = links.getByRole("link", { name: "Open table" });
  await expect(open).toHaveAttribute("href", "#variants-title");
  await expect(open).not.toHaveAttribute("role");
  await open.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#variants-title$/);
  await expect(
    links.getByRole("link", { name: "Open on GitHub" }),
  ).toHaveAttribute("target", "_blank");
  await expect(links.getByRole("link", { name: "Download" })).toHaveAttribute(
    "download",
    "sample.txt",
  );
  const disabled = links.getByRole("link", { name: "Unavailable link" });
  await expect(disabled).toHaveAttribute("aria-disabled", "true");
  await expect(disabled).toHaveAttribute("tabindex", "-1");
  await expect(disabled).toHaveCSS("pointer-events", "none");
  await disabled.dispatchEvent("click");
  await expect(page).toHaveURL(/#variants-title$/);
  const classOnly = section(page, "Class-only styling");
  await expect(
    classOnly.getByRole("link", { name: "Open in calendar" }),
  ).toHaveClass(/sprout-button-variant-ghost/);
  await expect(
    classOnly.getByRole("button", { name: "Previous sample month" }),
  ).toHaveCSS("width", "32px");
});

test("Base UI triggers render Button and restore focus", async ({ page }) => {
  await openDemo(page);
  const triggers = section(page, "Base UI triggers");
  const sort = triggers.getByRole("button", { name: "Sort" });
  await expect(sort).toHaveAttribute("data-slot", "button");
  await sort.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await expect(sort).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(sort).toBeFocused();
  await sort.click();
  await page.getByRole("menuitem", { name: "Name" }).click();
  await expect(triggers.getByRole("status")).toContainText("Sort: Name.");

  const details = triggers.getByRole("button", { name: "Details" });
  await details.click();
  await expect(
    page.getByRole("dialog", { name: "Sample details" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(details).toBeFocused();

  await triggers.getByRole("button", { name: "Download sample" }).hover();
  await expect(page.locator(".button-demo-tooltip")).toHaveText(
    "Download sample",
  );

  const remove = triggers.getByRole("button", { name: "Delete draft" });
  await remove.click();
  const dialog = page.getByRole("dialog", { name: "Delete sample draft?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Delete" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(remove).toBeFocused();
  await remove.click();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(remove).toBeDisabled();

  const advanced = triggers.getByRole("button", { name: "Advanced options" });
  await advanced.press("Enter");
  await expect(advanced).toHaveAttribute("aria-expanded", "true");
  await expect(triggers.getByText("Sample advanced options.")).toBeVisible();
});

test("loading, error, retry, empty, and focus return", async ({ page }) => {
  await openDemo(page);
  const flow = page.getByTestId("save-flow");
  await flow.getByRole("button", { name: "Save changes" }).click();
  await expect(flow.getByRole("button", { name: "Saving…" })).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(flow.getByRole("alert")).toContainText("failed");
  await flow.getByRole("button", { name: "Retry" }).click();
  await expect(flow.getByRole("status")).toHaveText("Saved locally.");

  const files = page.getByTestId("file-list");
  await expect(files.getByText("No sample files yet.")).toBeVisible();
  const add = files.getByRole("button", { name: "Add sample file" });
  await add.click();
  const remove = files.getByRole("button", { name: "Delete Brief 1.pdf" });
  await remove.focus();
  await page.keyboard.press("Enter");
  await expect(files.getByText("No sample files yet.")).toBeVisible();
  await expect(add).toBeFocused();
});

test("toggles, tree items, forms, and sorting", async ({ page }) => {
  await openDemo(page);
  const toggles = section(page, "Toggles and toolbars");
  const board = toggles.getByRole("button", { name: "Board" });
  await board.click();
  await expect(board).toHaveAttribute("aria-pressed", "true");
  await expect(board).toHaveAttribute("data-variant", "secondary");
  const bold = toggles.getByRole("button", { name: "Bold" });
  await bold.press("Space");
  await expect(bold).toHaveAttribute("aria-pressed", "true");
  await expect(toggles.getByRole("status")).toHaveText("Board view, bold");
  const scope = toggles.getByRole("button", { name: /Project:/ });
  await expect(scope).toHaveAttribute("data-variant", "scope");
  await scope.click();
  await expect(
    toggles.getByRole("button", { name: "All projects" }),
  ).toHaveAttribute("aria-pressed", "false");

  const tree = page.getByRole("tree", { name: "Sample files" });
  const notes = tree.getByRole("treeitem", { name: "notes" });
  await expect(notes).toHaveAttribute("aria-level", "1");
  await expect(notes).toHaveAttribute("aria-expanded", "true");
  await notes.focus();
  await page.keyboard.press("ArrowDown");
  const today = tree.getByRole("treeitem", { name: "today.md" });
  await expect(today).toBeFocused();
  await expect(today).toHaveAttribute("aria-level", "2");
  await expect(today).toHaveAttribute("data-path", "notes/today.md");
  await page.keyboard.press("Enter");
  await expect(today).toHaveAttribute("aria-selected", "true");
  await notes.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(notes).toHaveAttribute("aria-expanded", "false");

  const forms = section(page, "Forms");
  await forms.getByRole("button", { name: "Save from outside" }).click();
  await expect(forms.getByRole("status")).toHaveText("Submitted Weekly notes.");
  await forms.getByRole("button", { name: "Reset" }).click();
  await expect(forms.getByRole("status")).toHaveText("Form reset.");

  const patterns = section(page, "Application patterns");
  const header = patterns.getByRole("button", { name: "Size" });
  await header.click();
  await expect(header).toHaveAttribute("data-size", "column-header-end");
  await expect(patterns.locator("th").nth(1)).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
  await expect(
    patterns.getByRole("link", { name: "Customer notes" }),
  ).toHaveAttribute("data-size", "table-link");
  await patterns.getByRole("button", { name: "Next month" }).click();
  await expect(
    patterns.getByRole("button", { name: "November 2026" }),
  ).toBeVisible();
});

test("the draggable launcher moves with pointer capture and still clicks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openDemo(page);
  const dock = page.getByTestId("assistant-dock");
  const launcher = dock.getByRole("button", { name: "Open assistant" });
  await launcher.scrollIntoViewIfNeeded();
  await launcher.click();
  await expect(dock.getByRole("status")).toHaveText(
    "Assistant open, bottom right",
  );
  const area = await dock.boundingBox();
  const box = await dock.locator("[data-size=bud-labeled]").boundingBox();
  if (!area || !box) throw new Error("Launcher not visible");
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(area.x + 30, area.y + 20, { steps: 8 });
  await page.mouse.up();
  await expect(dock.getByRole("status")).toHaveText("Assistant open, top left");
  await dock.getByRole("button", { name: "Minimize assistant" }).press("Enter");
  await expect(dock.getByRole("status")).toHaveText(
    "Assistant closed, top left",
  );
});

test("mobile collapses the back label, and motion respects preferences", async ({
  page,
}) => {
  await openDemo(page);
  const back = section(page, "Links").getByRole("link", { name: "All files" });
  await expect(back).toHaveCSS("transition-duration", /0\.12s/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(back).toHaveAccessibleName("All files");
  const box = await back.boundingBox();
  expect(box?.width).toBe(28);
  expect(box?.height).toBe(28);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(back).toHaveCSS("transition-duration", "0s");
  await test.info().attach("button-mobile-links", {
    body: await section(page, "Links").screenshot({ animations: "disabled" }),
    contentType: "image/png",
  });
});

async function describedBy(button: Locator) {
  const id = await button.getAttribute("aria-describedby");
  expect(id).toBeTruthy();
  return button.page().locator(`[id="${id}"]`).innerText();
}

test("state changes keep the same focused button through blocked, ready, and busy", async ({
  page,
}) => {
  await openDemo(page);
  const flow = page.getByTestId("state-flow");
  const wrapper = flow.locator('[data-slot="button-action"]');
  const save = flow.getByRole("button", { name: "Save draft" });
  await expect(wrapper).toHaveAttribute("data-state", "blocked");
  await save.focus();
  await save.evaluate(
    (node) => ((window as unknown as { saveNode: Element }).saveNode = node),
  );
  await expect(save).toHaveAttribute("aria-disabled", "true");
  expect(await describedBy(save)).toBe("Choose an owner first.");
  await page.keyboard.press("Enter");
  await expect(flow.getByRole("status")).toHaveText("Not saved yet.");

  await page.keyboard.press("Tab");
  await expect(
    flow.getByRole("button", { name: "Choose owner" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(wrapper).toHaveAttribute("data-state", "ready");
  await expect(flow.locator('[data-slot="action-reason"]')).toHaveCount(0);

  await save.focus();
  await page.keyboard.press("Enter");
  const saving = flow.getByRole("button", { name: "Saving…" });
  await expect(wrapper).toHaveAttribute("data-state", "busy");
  await expect(saving).toHaveAttribute("aria-busy", "true");
  await expect(saving).toBeFocused();
  await expect(saving.locator('[data-slot="spinner"]')).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(flow.getByRole("status")).toHaveText(
    "Saved in this example only.",
  );
  await expect(wrapper).toHaveAttribute("data-state", "ready");
  expect(
    await save.evaluate(
      (node) =>
        node === (window as unknown as { saveNode: Element }).saveNode &&
        document.activeElement === node,
    ),
  ).toBe(true);
});

test("jump and link fixes, pending labels, and the reason sits under the button", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openDemo(page);
  const states = section(page, "Action states");
  const inspect = states.getByRole("button", {
    name: "Activate saved revision for inspection",
  });
  const reason = inspect
    .locator("xpath=..")
    .locator('[data-slot="action-reason"]');
  const buttonBox = (await inspect.boundingBox())!;
  const reasonBox = (await reason.boundingBox())!;
  expect(reasonBox.y).toBeGreaterThanOrEqual(buttonBox.y + buttonBox.height);
  expect(reasonBox.y - (buttonBox.y + buttonBox.height)).toBeLessThanOrEqual(8);
  for (const node of await states.locator('[data-slot="button-action"]').all())
    expect(
      await node.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await test.info().attach("button-action-states-mobile", {
    body: await states.screenshot({ animations: "disabled" }),
    contentType: "image/png",
  });

  await states.getByRole("button", { name: "Name a table" }).click();
  const table = states.getByRole("textbox", { name: "Table" });
  await expect(table).toBeFocused();
  await table.fill("Invoices");
  await expect(inspect).toBeEnabled();

  await expect(
    states.getByRole("link", { name: "See setup steps" }),
  ).toHaveAttribute("href", "#links-title");
  expect(
    await describedBy(states.getByRole("button", { name: "Start task" })),
  ).toBe("An agent manager must activate this agent first.");

  await states.getByRole("button", { name: "Delete agent" }).click();
  const deleting = states.getByRole("button", { name: "Deleting agent…" });
  await expect(deleting).toHaveAttribute("aria-busy", "true");
  await expect(deleting).toHaveAttribute("data-size", "lg");
  await expect(
    states.getByRole("button", { name: "Delete agent" }),
  ).toBeEnabled();
});

test("action groups share one state and one reason", async ({ page }) => {
  await openDemo(page);
  const group = section(page, "Action groups");
  const keep = group.getByRole("button", {
    name: "Keep my draft against this version",
  });
  const adopt = group.getByRole("button", {
    name: "Use current administration",
  });
  for (const button of [keep, adopt])
    await expect(button).toHaveAttribute("aria-disabled", "true");
  expect(await keep.getAttribute("aria-describedby")).toBe(
    await adopt.getAttribute("aria-describedby"),
  );
  await expect(group.locator('[data-slot="action-reason"]')).toHaveCount(1);
  await group.getByRole("button", { name: "Refresh administration" }).click();
  await expect(keep).toHaveAttribute("aria-busy", "true");
  await expect(adopt).toHaveAttribute("aria-busy", "true");
  await expect(keep).toBeEnabled();
  await adopt.click();
  await expect(group.getByRole("status")).toHaveText(
    "Loaded current settings in this example only.",
  );
});

test("reduced motion stops the pending spinner", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDemo(page);
  const flow = page.getByTestId("state-flow");
  await flow.getByRole("button", { name: "Choose owner" }).click();
  await flow.getByRole("button", { name: "Save draft" }).click();
  const spinner = flow.locator('[data-slot="spinner"]');
  await expect(spinner).toHaveCount(1);
  expect(
    await spinner.evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(
    await spinner.evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("sprout-spinner-spin");
});

test.describe("touch", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("coarse pointers get 44px targets", async ({ page }) => {
    await openDemo(page);
    expect(
      await page.evaluate(() => matchMedia("(pointer: coarse)").matches),
    ).toBe(true);
    const icon = section(page, "Toggles and toolbars").getByRole("button", {
      name: "Bold",
    });
    const box = await icon.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    const save = page
      .getByTestId("state-flow")
      .getByRole("button", { name: "Save draft" });
    expect((await save.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
});
