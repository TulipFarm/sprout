import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

// Skeletons and spinners loop forever; reduced motion stops them so settle() can finish.
test.use({ reducedMotion: "reduce" });

async function openSheetPage(page: Page) {
  await page.goto("/components/sheet/");
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
const sheets = (page: Page) => page.getByRole("dialog");

async function expectNoOverflow(sheet: Locator) {
  expect(
    await sheet.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const inside = [...element.querySelectorAll("*")].every((child) => {
        const rect = child.getBoundingClientRect();
        if (!rect.width || getComputedStyle(child).position === "fixed")
          return true;
        if (child.closest(".sr-only")) return true;
        return rect.left >= box.left - 1 && rect.right <= box.right + 1;
      });
      return {
        inViewport: box.left >= -0.5 && box.right <= innerWidth + 0.5,
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

async function theme(page: Page, name: string, mode: "light" | "dark") {
  await page.evaluate(
    (value) => (document.documentElement.dataset.sproutTheme = value),
    name,
  );
  await chooseOption(page, "Color mode", mode === "light" ? "Light" : "Dark");
  await settle(page);
}

const sizeTriggers = [
  {
    size: "default",
    trigger: "Follow workflows",
    title: "Follow workflows",
    wide: 384,
  },
  { size: "lg", trigger: "View agent", title: "Agent view", wide: 512 },
  { size: "xl", trigger: "Slack integration", title: "Slack", wide: 672 },
  { size: "full", trigger: "Open canvas", title: "Canvas", wide: 1440 },
] as const;

for (const name of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`sheet sizes ${name} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await openSheetPage(page);
        await theme(page, name, mode);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await axe(page);
        const sizes = section(page, "Sizes");
        for (const { size, trigger, title, wide } of sizeTriggers) {
          await sizes
            .getByRole("button", { name: trigger, exact: true })
            .click();
          const sheet = page.getByRole("dialog", { name: title });
          await expect(sheet).toBeVisible();
          await expect(sheet).toHaveAttribute("data-size", size);
          await expect(sheet).toHaveAttribute("data-side", "right");
          await settle(page);
          await expectNoOverflow(sheet);
          const box = (await sheet.boundingBox())!;
          const expected =
            size === "full"
              ? width
              : width === 1440
                ? wide
                : size === "default"
                  ? width * 0.75
                  : width;
          expect(Math.abs(box.width - expected)).toBeLessThan(1);
          expect(box.height).toBe(900);
          expect(Math.round(box.x + box.width)).toBe(width);
          await axe(page);
          await testInfo.attach(`sheet-${size}-${name}-${mode}-${width}`, {
            body: await page.screenshot(),
            contentType: "image/png",
          });
          if (size === "full")
            await sheet.getByRole("button", { name: "Back to chat" }).click();
          else await page.keyboard.press("Escape");
          await expect(sheets(page)).toHaveCount(0);
        }
      });
    }
  }
}

const sideTriggers = [
  {
    side: "top",
    trigger: "Maintenance notice",
    title: "Scheduled maintenance",
  },
  { side: "right", trigger: "Pending work", title: "Pending work" },
  { side: "bottom", trigger: "Filter and sort", title: "Filter and sort" },
  { side: "left", trigger: "Calendar filters", title: "Calendar filters" },
] as const;

for (const mode of ["light", "dark"] as const) {
  for (const width of [390, 1280]) {
    test(`sheet sides ${mode} at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 800 });
      await openSheetPage(page);
      await theme(page, "neutral", mode);
      const sides = section(page, "Sides");
      for (const { side, trigger, title } of sideTriggers) {
        await sides
          .getByRole("button", { name: trigger, exact: true })
          .first()
          .click();
        const sheet = page.getByRole("dialog", { name: title });
        await expect(sheet).toBeVisible();
        await expect(sheet).toHaveAttribute("data-side", side);
        await settle(page);
        await expectNoOverflow(sheet);
        const box = (await sheet.boundingBox())!;
        if (side === "top") expect(box.y).toBe(0);
        if (side === "bottom") expect(Math.round(box.y + box.height)).toBe(800);
        if (side === "left") expect(box.x).toBe(0);
        if (side === "right") expect(Math.round(box.x + box.width)).toBe(width);
        if (side === "top" || side === "bottom") {
          expect(box.width).toBe(width);
          expect(box.height).toBeLessThan(800 * 0.85 + 1);
        }
        await axe(page);
        await testInfo.attach(`sheet-side-${side}-${mode}-${width}`, {
          body: await page.screenshot(),
          contentType: "image/png",
        });
        await page.keyboard.press("Escape");
        await expect(sheets(page)).toHaveCount(0);
      }
    });
  }
}

test("keyboard opens, traps focus, closes with Escape, and returns focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openSheetPage(page);
  const trigger = section(page, "Sides").getByRole("button", {
    name: "Pending work",
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: "Pending work" });
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAccessibleDescription(
    "Tasks and approvals that need your attention.",
  );
  const focusInside = () =>
    sheet.evaluate((element) =>
      element.contains(document.activeElement)
        ? "inside"
        : document.activeElement?.outerHTML.slice(0, 120),
    );
  await expect.poll(focusInside).toBe("inside");
  for (const key of ["Tab", "Shift+Tab"]) {
    for (let step = 0; step < 4; step++) {
      await page.keyboard.press(key);
      await expect.poll(focusInside).toBe("inside");
    }
  }
  await page.keyboard.press("Escape");
  await expect(sheets(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(sheet).toBeVisible();
  await page.mouse.click(10, 450);
  await expect(sheets(page)).toHaveCount(0);
});

test("playground combines every side, size, title size, and corner close", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openSheetPage(page);
  const playground = section(page, "Sheet playground");
  for (const [side, size, titleSize] of [
    ["left", "xl", "lg"],
    ["bottom", "default", "default"],
    ["top", "lg", "lg"],
    ["right", "full", "default"],
  ] as const) {
    await chooseOption(page, "Side", side);
    await chooseOption(page, "Size", size);
    await chooseOption(page, "Title size", `title ${titleSize}`);
    await playground
      .getByRole("button", { name: `Open ${side} ${size} sheet` })
      .click();
    const sheet = page.getByRole("dialog", { name: "Pending work" });
    await expect(sheet).toHaveAttribute("data-side", side);
    await expect(sheet).toHaveAttribute("data-size", size);
    await expect(sheet.locator('[data-slot="sheet-title"]')).toHaveAttribute(
      "data-size",
      titleSize,
    );
    await expect(sheet.locator('[data-slot="sheet-title"]')).toHaveCSS(
      "font-size",
      titleSize === "lg" ? "20px" : "16px",
    );
    await settle(page);
    await expectNoOverflow(sheet);
    await testInfo.attach(`sheet-playground-${side}-${size}`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await sheet.getByRole("button", { name: "Done" }).click();
    await expect(sheets(page)).toHaveCount(0);
  }
  await playground.getByRole("button", { name: "Corner close" }).click();
  await playground.getByRole("button", { name: /^Open / }).click();
  const sheet = page.getByRole("dialog", { name: "Pending work" });
  await expect(
    sheet.getByRole("button", { name: "Close", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(sheets(page)).toHaveCount(0);
});

test("files filters: labelled and compact triggers, footer actions", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSheetPage(page);
  const filters = row(page, "Bottom");
  const labelled = filters.getByRole("group", {
    name: "Filter and sort",
    exact: true,
  });
  await expect(
    labelled.getByRole("button", { name: "Filters (2)" }),
  ).toBeVisible();
  await expect(
    labelled.getByRole("button", { name: "Clear filters" }),
  ).toBeVisible();
  const compact = filters.getByRole("group", {
    name: "Selection filter and sort",
  });
  await expect(
    compact.getByRole("button", { name: "Filter and sort" }),
  ).toHaveCSS("width", "28px");

  await labelled.getByRole("button", { name: "Filters (2)" }).click();
  const sheet = page.getByRole("dialog", { name: "Filter and sort" });
  await expect(sheet).toHaveAttribute("data-side", "bottom");
  await chooseOption(page, "Type", "Images");
  await expect(sheet).toBeVisible();
  await settle(page);
  await testInfo.attach("sheet-filters-mobile", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await sheet.getByRole("button", { name: "Clear filters" }).click();
  await expect(
    sheet.getByRole("button", { name: "Clear filters" }),
  ).toHaveCount(0);
  await sheet.getByRole("button", { name: "Show results" }).click();
  await expect(sheets(page)).toHaveCount(0);
  await expect(
    labelled.getByRole("button", { name: "Filter and sort" }),
  ).toBeFocused();
  await expect(
    labelled.getByRole("button", { name: "Clear filters" }),
  ).toHaveCount(0);

  await page.setViewportSize({ width: 1280, height: 800 });
  await compact.getByRole("button", { name: "Filter and sort" }).click();
  const footer = page
    .getByRole("dialog", { name: "Filter and sort" })
    .locator('[data-slot="sheet-footer"]');
  await expect(footer).toHaveCSS("flex-direction", "row");
  await expect(footer).toHaveCSS("justify-content", "flex-end");
  await page.keyboard.press("Escape");
});

test("navigation drawer takes a custom width, an sr-only header, and returns focus", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSheetPage(page);
  for (const side of ["left", "right"]) {
    const trigger = page.getByRole("button", {
      name: `Open navigation on the ${side}`,
    });
    await trigger.click();
    const sheet = page.getByRole("dialog", { name: "Workspace navigation" });
    await expect(sheet).toHaveAttribute("data-side", side);
    await expect(sheet).toHaveAttribute("data-mobile", "true");
    await expect(sheet).toHaveAccessibleDescription(
      "Switch workspaces or open a workspace page.",
    );
    await expect(sheet).toHaveCSS("width", "288px");
    await expect(sheet.locator('[data-slot="sheet-header"]')).toHaveClass(
      /sr-only/,
    );
    await settle(page);
    await axe(page);
    await testInfo.attach(`sheet-navigation-${side}`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await sheet.getByRole("link", { name: "Tables" }).click();
    await expect(sheets(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

test("menu items, initialFocus, and side switching", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openSheetPage(page);
  await page.getByRole("button", { name: "More table options" }).click();
  await page.getByRole("menuitem", { name: "Schema history" }).click();
  const schema = page.getByRole("dialog", { name: "Schema history" });
  await expect(schema).toHaveAttribute("data-size", "xl");
  await expect(schema).toHaveCSS("width", "672px");
  await page.keyboard.press("Escape");
  await expect(sheets(page)).toHaveCount(0);

  await row(page, "GitHub")
    .getByRole("button", { name: /GitHub/ })
    .click();
  const github = page.getByRole("dialog", { name: "GitHub" });
  await expect(github.getByRole("heading", { name: "GitHub" })).toBeFocused();
  await expect(github).toHaveAccessibleDescription(
    /Connect your GitHub account/,
  );
  await page.keyboard.press("Escape");

  const panels = row(page, "Calendar panels");
  await panels.getByRole("button", { name: "Calendar filters" }).click();
  const filters = page.getByRole("dialog", { name: "Calendar filters" });
  await expect(filters).toHaveAttribute("data-side", "left");
  expect((await filters.boundingBox())!.x).toBe(0);
  await page.keyboard.press("Escape");
  await expect(sheets(page)).toHaveCount(0);
  await panels.getByRole("button", { name: "Find free time" }).click();
  const find = page.getByRole("dialog", { name: "Find free time" });
  await expect(find).toHaveAttribute("data-side", "right");
  await expect(find).toHaveAccessibleDescription(/does not check guests/);
  await page.keyboard.press("Escape");

  await row(page, "Calendar event")
    .getByRole("button", { name: "Supplier sync" })
    .click();
  const event = page.getByRole("dialog", {
    name: "Supplier sync with Harbor Foods",
  });
  await expect(event.getByText("Join meeting")).toBeVisible();
  await expect(event.locator('a[href="#join-meeting"]')).toHaveClass(
    /sprout-button/,
  );
  await expectNoOverflow(event);
  await page.keyboard.press("Escape");
});

test("keepMounted keeps drafts in create event and the canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openSheetPage(page);
  const create = row(page, "Create event").getByRole("button", {
    name: "Create event",
  });
  await create.click();
  let sheet = page.getByRole("dialog", { name: "Create event" });
  await sheet.getByLabel("Title").fill("Crew planning");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await create.click();
  sheet = page.getByRole("dialog", { name: "Create event" });
  await expect(sheet.getByLabel("Title")).toHaveValue("Crew planning");
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open canvas" }).click();
  const canvas = page.getByRole("dialog", { name: "Canvas" });
  await expect(
    canvas.getByRole("button", { name: "Close", exact: true }),
  ).toHaveCount(0);
  await canvas.getByLabel("Proposal draft").fill("Revised proposal");
  await canvas.getByRole("button", { name: "Back to chat" }).click();
  await expect(canvas).toBeHidden();
  await page.getByRole("button", { name: "Open canvas" }).click();
  await expect(
    page.getByRole("dialog", { name: "Canvas" }).getByLabel("Proposal draft"),
  ).toHaveValue("Revised proposal");
});

test("member profile locks while saving and the row editor confirms before leaving", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openSheetPage(page);
  await page.getByRole("button", { name: "Profile and photo" }).click();
  const profile = page.getByRole("dialog", { name: "Member profile" });
  await profile.getByRole("button", { name: "Replace photo" }).click();
  await expect(
    profile.getByRole("button", { name: "Close", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(profile).toBeVisible();
  await expect(profile.locator(".sheet-demo-status")).toHaveText(
    "Member photo saved.",
  );
  await expect(
    profile.getByRole("button", { name: "Close", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheets(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Edit row" }).click();
  const editor = page.getByRole("dialog", { name: "Edit row" });
  await editor.getByLabel("Customer").fill("Harbor Foods Ltd");
  await page.keyboard.press("Escape");
  const confirm = page.getByRole("dialog", { name: "Leave these edits?" });
  await expect(confirm).toBeVisible();
  await settle(page);
  await testInfo.attach("sheet-editor-confirm", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await confirm.getByRole("button", { name: "Keep editing" }).click();
  await expect(confirm).toHaveCount(0);
  await expect(editor).toBeVisible();
  const sticky = editor.locator(".sheet-demo-sticky");
  await expect(sticky).toHaveCSS("position", "sticky");
  await editor.getByRole("button", { name: "Save row" }).click();
  await expect(
    editor.getByRole("button", { name: "Close", exact: true }),
  ).toHaveCount(0);
  await expect(sheets(page)).toHaveCount(0);
});

test("states: loading, error, empty, and a nested editor sheet", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSheetPage(page);
  const states = row(page, "Member profile status");
  for (const [option, expectation] of [
    [
      "Loading",
      (sheet: Locator) =>
        expect(
          sheet.getByRole("status", { name: "Loading member profiles" }),
        ).toBeVisible(),
    ],
    [
      "Error",
      (sheet: Locator) =>
        expect(sheet.getByText("Could not load member profiles")).toBeVisible(),
    ],
    [
      "Empty",
      (sheet: Locator) =>
        expect(
          sheet.getByText("No member profiles need attention right now."),
        ).toBeVisible(),
    ],
  ] as const) {
    await chooseOption(page, "Result", option);
    await states.getByRole("button", { name: "Check status" }).click();
    const sheet = page.getByRole("dialog", { name: "Member profile status" });
    await expectation(sheet);
    await settle(page);
    await axe(page);
    await testInfo.attach(`sheet-state-${option.toLowerCase()}`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await page.keyboard.press("Escape");
    await expect(sheets(page)).toHaveCount(0);
  }

  await chooseOption(page, "Result", "Needs attention");
  await states.getByRole("button", { name: "Check status" }).click();
  const status = page.getByRole("dialog", { name: "Member profile status" });
  await status.getByRole("button", { name: "Complete member" }).click();
  const editor = page.getByRole("dialog", { name: "Complete member" });
  await expect(editor).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(editor).toHaveCount(0);
  await expect(status).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheets(page)).toHaveCount(0);
});

test.describe("motion", () => {
  test.use({ reducedMotion: "no-preference" });
  test("slides over 180ms and turns off with reduced motion", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openSheetPage(page);
    await section(page, "Sides")
      .getByRole("button", { name: "Pending work" })
      .click();
    const sheet = page.getByRole("dialog", { name: "Pending work" });
    await expect(sheet).toHaveCSS("transition-duration", "0.18s, 0.18s, 0.18s");
    await page.keyboard.press("Escape");
    await expect(sheets(page)).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await section(page, "Sides")
      .getByRole("button", { name: "Pending work" })
      .click();
    await expect(page.getByRole("dialog", { name: "Pending work" })).toHaveCSS(
      "transition-duration",
      "0s",
    );
  });
});

async function touchDrag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 12,
) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [from],
  });
  for (let step = 1; step <= steps; step++) {
    await page.waitForTimeout(16);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * step) / steps,
          y: from.y + ((to.y - from.y) * step) / steps,
        },
      ],
    });
  }
  // Hold still so the release is not a flick.
  await page.waitForTimeout(120);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [to],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
}

async function mouseDrag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}

const centre = (box: {
  x: number;
  y: number;
  width: number;
  height: number;
}) => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

test.describe("swipe to close", () => {
  test.use({ hasTouch: true });

  test("a bottom sheet springs back from a short swipe and closes from a long one", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openSheetPage(page);
    const trigger = row(page, "Bottom with handle").getByRole("button", {
      name: "Stock filters",
    });
    await trigger.click();
    const sheet = page.getByRole("dialog", { name: "Stock filters" });
    await expect(sheet).toHaveAttribute("data-swipe-direction", "down");
    const handle = sheet.locator('[data-slot="sheet-swipe-handle"]');
    await expect(handle).toHaveAttribute("aria-hidden", "true");
    await expect(handle).toHaveCSS("cursor", "grab");
    await settle(page);
    const resting = (await sheet.boundingBox())!;
    const handleBox = (await handle.boundingBox())!;
    expect(handleBox.y - resting.y).toBeLessThan(12);
    expect(Math.round(handleBox.width)).toBe(Math.round(resting.width));

    const start = centre(
      (await sheet
        .getByRole("heading", { name: "Stock filters" })
        .boundingBox())!,
    );
    await touchDrag(page, start, { x: start.x, y: start.y + 40 });
    await expect(sheet).toBeVisible();
    await settle(page);
    expect((await sheet.boundingBox())!.y).toBeCloseTo(resting.y, 0);

    await touchDrag(
      page,
      start,
      { x: start.x, y: start.y + resting.height * 0.7 },
      20,
    );
    await expect(sheets(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("the panel follows the finger while it moves", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openSheetPage(page);
    await row(page, "Bottom with handle")
      .getByRole("button", { name: "Stock filters" })
      .click();
    const sheet = page.getByRole("dialog", { name: "Stock filters" });
    await settle(page);
    const resting = (await sheet.boundingBox())!;
    const start = centre(
      (await sheet
        .getByRole("heading", { name: "Stock filters" })
        .boundingBox())!,
    );
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [start],
    });
    for (let step = 1; step <= 8; step++) {
      await page.waitForTimeout(16);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: start.x, y: start.y + step * 10 }],
      });
    }
    await expect(sheet).toHaveAttribute("data-swiping", "");
    const moved = (await sheet.boundingBox())!.y - resting.y;
    expect(moved).toBeGreaterThan(40);
    expect(moved).toBeLessThanOrEqual(81);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
    await expect(sheet).not.toHaveAttribute("data-swiping", "");
    await page.keyboard.press("Escape");
    await expect(sheets(page)).toHaveCount(0);
  });

  test("a right sheet closes from a right swipe and ignores a vertical scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 420 });
    await openSheetPage(page);
    const trigger = section(page, "Sides").getByRole("button", {
      name: "Pending work",
    });
    await trigger.click();
    const sheet = page.getByRole("dialog", { name: "Pending work" });
    await expect(sheet).toHaveAttribute("data-swipe-direction", "right");
    await settle(page);
    const resting = (await sheet.boundingBox())!;
    const body = sheet.locator('[data-slot="sheet-body"]');
    expect(
      await body.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    ).toBe(true);
    const bodyBox = (await body.boundingBox())!;
    const point = {
      x: bodyBox.x + bodyBox.width / 2,
      y: bodyBox.y + bodyBox.height - 20,
    };
    await touchDrag(page, point, { x: point.x, y: point.y - 150 });
    await expect
      .poll(() => body.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    await expect(sheet).toBeVisible();
    await settle(page);
    expect((await sheet.boundingBox())!.x).toBeCloseTo(resting.x, 0);

    await touchDrag(
      page,
      point,
      { x: point.x + resting.width * 0.7, y: point.y },
      20,
    );
    await expect(sheets(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("one sheet swipes toward whichever side it opens from", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openSheetPage(page);
    const panels = row(page, "Calendar panels");

    await panels.getByRole("button", { name: "Calendar filters" }).click();
    let sheet = page.getByRole("dialog", { name: "Calendar filters" });
    await expect(sheet).toHaveAttribute("data-swipe-direction", "left");
    await settle(page);
    let box = (await sheet.boundingBox())!;
    let start = centre((await sheet.getByRole("heading").boundingBox())!);
    await touchDrag(page, start, { x: start.x + 200, y: start.y }, 20);
    await expect(sheet).toBeVisible();
    await settle(page);
    expect((await sheet.boundingBox())!.x).toBe(0);
    await touchDrag(
      page,
      start,
      { x: start.x - box.width * 0.7, y: start.y },
      20,
    );
    await expect(sheets(page)).toHaveCount(0);

    await panels.getByRole("button", { name: "Find free time" }).click();
    sheet = page.getByRole("dialog", { name: "Find free time" });
    await expect(sheet).toHaveAttribute("data-swipe-direction", "right");
    await settle(page);
    box = (await sheet.boundingBox())!;
    start = centre((await sheet.getByRole("heading").boundingBox())!);
    await touchDrag(page, start, { x: start.x - 200, y: start.y }, 20);
    await expect(sheet).toBeVisible();
    await settle(page);
    expect(Math.round((await sheet.boundingBox())!.x)).toBe(Math.round(box.x));
    await touchDrag(
      page,
      start,
      { x: start.x + box.width * 0.7, y: start.y },
      20,
    );
    await expect(sheets(page)).toHaveCount(0);
  });

  test("mouse drags select text in fields and body copy without moving the sheet", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openSheetPage(page);
    const trigger = row(page, "Right with handle").getByRole("button", {
      name: "Record notes",
    });
    await trigger.click();
    const sheet = page.getByRole("dialog", { name: "Record notes" });
    await expect(sheet).toHaveAttribute("data-swipe-direction", "right");
    await settle(page);
    const resting = (await sheet.boundingBox())!;
    const stillOpen = async () => {
      await expect(sheet).toBeVisible();
      await expect(sheet).not.toHaveAttribute("data-swiping", "");
      await settle(page);
      expect((await sheet.boundingBox())!.x).toBeCloseTo(resting.x, 0);
    };

    const note = sheet.getByLabel("Note");
    const noteBox = (await note.boundingBox())!;
    await mouseDrag(
      page,
      { x: noteBox.x + 4, y: noteBox.y + 12 },
      { x: noteBox.x + noteBox.width - 4, y: noteBox.y + 12 },
    );
    await stillOpen();
    expect(
      await note.evaluate(
        (element: HTMLTextAreaElement) =>
          element.selectionEnd - element.selectionStart,
      ),
    ).toBeGreaterThan(10);

    const copy = (await sheet.getByText(/Harbor Foods asked/).boundingBox())!;
    await mouseDrag(
      page,
      { x: copy.x + 2, y: copy.y + 8 },
      { x: copy.x + copy.width - 2, y: copy.y + 8 },
    );
    await stillOpen();
    expect(await page.evaluate(() => String(getSelection()))).toContain(
      "Harbor Foods",
    );

    // Dragging right with the mouse anywhere over content never dismisses.
    const header = (await sheet
      .locator('[data-slot="sheet-header"]')
      .boundingBox())!;
    await mouseDrag(page, centre(header), {
      x: centre(header).x + resting.width,
      y: centre(header).y,
    });
    await stillOpen();

    // The handle is the mouse grab point.
    const handle = (await sheet
      .locator('[data-slot="sheet-swipe-handle"]')
      .boundingBox())!;
    expect(Math.abs(handle.x - resting.x)).toBeLessThanOrEqual(1);
    await mouseDrag(page, centre(handle), {
      x: centre(handle).x + 40,
      y: centre(handle).y,
    });
    await stillOpen();
    await mouseDrag(page, centre(handle), {
      x: centre(handle).x + resting.width * 0.7,
      y: centre(handle).y,
    });
    await expect(sheets(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("Escape and an outside click still close a swipeable sheet", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openSheetPage(page);
    const trigger = row(page, "Bottom with handle").getByRole("button", {
      name: "Stock filters",
    });
    await trigger.click();
    const sheet = page.getByRole("dialog", { name: "Stock filters" });
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheets(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(sheet).toBeVisible();
    await page.mouse.click(195, 40);
    await expect(sheets(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});
