import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/collapsible/";

async function open(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const example = (page: Page, name: string) =>
  page.getByRole("region", { name, exact: true });

const pair = (page: Page, section: string, name: string) =>
  example(page, section).getByRole("group", { name, exact: true });

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation instanceof CSSTransition)
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

async function rotation(locator: Locator) {
  return locator.evaluate((node) => {
    const value = getComputedStyle(node).transform;
    if (value === "none") return 0;
    const [a, b] = value.slice(7, -1).split(",").map(Number);
    return Math.round((Math.atan2(b, a) * 180) / Math.PI);
  });
}

const sections = [
  "Open by default",
  "Trigger pairings",
  "Content variants",
  "Reasoning and sources",
  "Activity",
  "Tool calls",
  "Review card",
  "Sidebar recent items",
  "Content above the trigger",
  "Always open",
];

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`collapsible ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        await open(page);
        await page.evaluate(
          (value) =>
            document.documentElement.setAttribute("data-sprout-theme", value),
          theme,
        );
        await chooseOption(
          page,
          "Color mode",
          mode === "light" ? "Light" : "Dark",
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const overflowing = await page
          .locator(
            'main [data-slot="collapsible-trigger"], main .collapsible-demo-card-body',
          )
          .evaluateAll((nodes) =>
            nodes
              .filter(
                (node) =>
                  node.scrollWidth > node.clientWidth + 1 &&
                  getComputedStyle(node).overflowX !== "auto" &&
                  !node.classList.contains("collapsible-demo-review-trigger"),
              )
              .map((node) => node.textContent?.slice(0, 40)),
          );
        expect(overflowing).toEqual([]);
        const results = await new AxeBuilder({ page })
          .include("main")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        for (const name of sections) {
          const slug = name.toLowerCase().replaceAll(" ", "-");
          const path = testInfo.outputPath(
            `collapsible-${slug}-${theme}-${mode}-${width}.png`,
          );
          const shot = await example(page, name).screenshot({
            animations: "disabled",
            path,
          });
          expect(shot.byteLength).toBeGreaterThan(6_000);
          await testInfo.attach(
            `collapsible-${slug}-${theme}-${mode}-${width}`,
            {
              path,
              contentType: "image/png",
            },
          );
        }
      });
    }
  }
}

test("triggers pair every Cloud button variant and size", async ({ page }) => {
  await open(page);
  const expected: Record<string, [string, string]> = {
    "outline · default": ["outline", "default"],
    "ghost · default": ["ghost", "default"],
    "ghost · sm": ["ghost", "sm"],
    "ghost · xs": ["ghost", "xs"],
    "link · sm": ["link", "sm"],
    "ghost · chat-row": ["ghost", "chat-row"],
  };
  for (const [label, [variant, size]] of Object.entries(expected)) {
    const triggers = pair(page, "Trigger pairings", label).locator(
      '[data-slot="collapsible-trigger"]',
    );
    expect(await triggers.count()).toBeGreaterThan(0);
    for (const trigger of await triggers.all()) {
      await expect(trigger).toHaveClass(
        new RegExp(`sprout-button-variant-${variant}\\b`),
      );
      await expect(trigger).toHaveClass(
        new RegExp(`sprout-button-size-${size}\\b`),
      );
    }
  }
  const labels = await example(page, "Trigger pairings")
    .locator('[data-slot="collapsible-trigger"]')
    .allTextContents();
  expect(new Set(labels).size).toBeGreaterThan(6);
});

test("keyboard toggles with Enter and Space and keeps focus", async ({
  page,
}) => {
  await open(page);
  const trigger = example(page, "Open by default").getByRole("button", {
    name: "Hide project details",
  });
  await trigger.focus();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const controls = await trigger.getAttribute("aria-controls");
  expect(controls).toBeTruthy();
  await expect(page.locator(`[id="${controls}"]`)).toContainText("Meadow");
  await page.keyboard.press("Enter");
  const reopened = example(page, "Open by default").getByRole("button", {
    name: "Show project details",
  });
  await expect(reopened).toHaveAttribute("aria-expanded", "false");
  await expect(reopened).toBeFocused();
  await expect(
    example(page, "Open by default").getByText(/Meadow/),
  ).toHaveCount(0);
  await page.keyboard.press("Space");
  await expect(
    example(page, "Open by default").getByRole("button", {
      name: "Hide project details",
    }),
  ).toBeFocused();
  await expect(
    example(page, "Open by default").getByText(/Meadow/),
  ).toBeVisible();
});

test("plain triggers show a focus ring and indicators turn", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const thinking = pair(page, "Reasoning and sources", "Thinking").getByRole(
    "button",
  );
  await thinking.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(thinking).toBeFocused();
  await expect(thinking).toHaveCSS("outline-style", "solid");
  const chevron = thinking.locator('[data-slot="collapsible-indicator"]');
  expect(await rotation(chevron)).toBe(0);
  await page.keyboard.press("Enter");
  await expect(thinking).toHaveAttribute("aria-expanded", "true");
  expect(Math.abs(await rotation(chevron))).toBe(180);

  const review = example(page, "Review card");
  const outside = review.locator(
    '.collapsible-demo-review-header > [data-slot="collapsible-indicator"]',
  );
  expect(Math.abs(await rotation(outside))).toBe(180);
  await review
    .getByRole("button", { name: "Create Invoices and Vendors tables" })
    .click();
  await settle(page);
  expect(await rotation(outside)).toBe(0);
});

test("content variants animate within 120–180ms and respect reduced motion", async ({
  page,
}) => {
  await open(page);
  const variants = example(page, "Content variants");
  for (const variant of ["sidebar", "card"]) {
    const content = variants.locator(
      `[data-slot="collapsible-content"][data-variant="${variant}"]`,
    );
    const durations = await content.evaluate((node) =>
      getComputedStyle(node)
        .transitionDuration.split(",")
        .map((v) => parseFloat(v)),
    );
    expect(Math.max(...durations)).toBeLessThanOrEqual(0.18);
    expect(Math.min(...durations)).toBeGreaterThanOrEqual(0.12);
    await expect(content).toHaveCSS("overflow", "hidden");
  }
  await expect(
    variants.locator(
      '[data-slot="collapsible-content"][data-variant="default"]',
    ),
  ).toHaveCSS("transition-duration", "0s");
  const sidebar = variants.locator(
    '[data-variant="sidebar"] [data-slot="collapsible-trigger"]',
  );
  await sidebar.click();
  await settle(page);
  await expect(sidebar).toHaveAttribute("aria-expanded", "false");
  await expect(
    variants.locator(
      '[data-slot="collapsible-content"][data-variant="sidebar"]',
    ),
  ).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await expect(
    example(page, "Content variants").locator(
      '[data-slot="collapsible-content"][data-variant="card"]',
    ),
  ).toHaveCSS("transition-duration", "0s");
  await expect(
    example(page, "Reasoning and sources")
      .locator('[data-slot="collapsible-indicator"]')
      .first(),
  ).toHaveCSS("transition-duration", "0s");
});

test("keepMounted preserves form state and supports lazy children", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const drive = page.getByRole("region", { name: "Google Drive actions" });
  const trigger = drive.getByRole("button", { name: /Google Drive/ });
  await expect(trigger).toContainText("1 of 3 selected");
  await drive.getByRole("checkbox", { name: "Create documents" }).check();
  await expect(trigger).toContainText("2 of 3 selected, 1 change data");
  await trigger.click();
  await expect(
    drive.getByRole("checkbox", { name: "Create documents" }),
  ).toBeHidden();
  await expect(
    drive.locator('[data-slot="collapsible-content"]'),
  ).toHaveAttribute("hidden", "");
  await trigger.press("Enter");
  await expect(
    drive.getByRole("checkbox", { name: "Create documents" }),
  ).toBeChecked();

  const lazy = example(page, "Mount on first open");
  await expect(lazy.getByTestId("lazy-knowledge")).toHaveCount(0);
  const knowledge = lazy.getByRole("button", { name: "Knowledge" });
  await knowledge.click();
  await expect(lazy.getByTestId("lazy-knowledge")).toBeVisible();
  await knowledge.click();
  await expect(lazy.getByTestId("lazy-knowledge")).toBeAttached();
  await expect(lazy.getByTestId("lazy-knowledge")).toBeHidden();
});

test("activity panel keeps its scroll position and labels", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const panel = page.getByRole("region", { name: "Chat activity, finished" });
  const trigger = panel.getByRole("button", { name: "Worked" });
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const viewport = panel.locator('[aria-label="Activity timeline"]');
  await expect(viewport).toBeVisible();
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(viewport).toBeAttached();
  await expect(viewport).toBeHidden();
  await trigger.press("Space");
  await expect(viewport).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Chat activity, working" })
      .getByRole("button", {
        name: "Working… Reading Vendor contract — Northwind",
      }),
  ).toBeVisible();
});

test("disabled and content-before-trigger states", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const disabled = example(page, "Disabled").getByRole("button", {
    name: "Show unavailable details",
  });
  await expect(disabled).toBeDisabled();
  await expect(disabled).toHaveAccessibleDescription(
    "The details cannot be opened in this disabled sample.",
  );
  await disabled.click({ force: true });
  await expect(disabled).toHaveAttribute("aria-expanded", "false");

  const prompts = example(page, "Content above the trigger");
  const more = prompts.getByRole("button", { name: "More tasks (3)" });
  await more.click();
  const fewer = prompts.getByRole("button", { name: "Fewer tasks" });
  await expect(fewer).toBeFocused();
  const item = (await prompts
    .getByText("Clean up duplicate contacts")
    .boundingBox())!;
  const button = (await fewer.boundingBox())!;
  expect(item.y).toBeLessThan(button.y);
});

test("chat compositions cover every status and the empty sources state", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const chat = example(page, "Reasoning and sources");
  await expect(pair(page, "Reasoning and sources", "Thinking")).toContainText(
    "Thinking",
  );
  await expect(pair(page, "Reasoning and sources", "Complete")).toContainText(
    "Thought for 12s",
  );
  await expect(
    pair(page, "Reasoning and sources", "Interrupted"),
  ).toContainText("Thinking interrupted");
  await chat.getByRole("button", { name: "3 sources" }).click();
  await expect(chat.locator(".collapsible-demo-sources li")).toHaveCount(3);
  await chooseOption(page, "Source count", "1 source");
  await expect(chat.getByRole("button", { name: "1 source" })).toBeVisible();
  await chooseOption(page, "Source count", "No sources");
  await expect(
    chat.getByText("No sources were used for this response."),
  ).toBeVisible();

  const tools = example(page, "Tool calls");
  for (const [label, badge] of [
    ["Queued", "secondary"],
    ["Running", "secondary"],
    ["Needs approval", "warning"],
    ["Complete", "success"],
    ["Failed", "destructive"],
  ]) {
    await expect(
      pair(page, "Tool calls", label).locator(`.sprout-badge-${badge}`),
    ).toHaveText(label);
  }
  await pair(page, "Tool calls", "Needs approval")
    .getByRole("button", { name: "Approve sample" })
    .click();
  await expect(
    tools.getByText("Approved. The sample runs next."),
  ).toBeVisible();
  await expect(
    pair(page, "Tool calls", "Failed").getByRole("alert"),
  ).toBeVisible();
});

test("review card closes when settled and hides actions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const card = example(page, "Review card");
  const trigger = card.getByRole("button", {
    name: "Create Invoices and Vendors tables",
  });
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await card.getByRole("button", { name: "Approve" }).click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(card.getByText("Approved", { exact: true })).toBeVisible();
  await expect(card.getByRole("button", { name: "Reset sample" })).toHaveCount(
    0,
  );
  const header = (await card
    .locator(".collapsible-demo-review-header")
    .boundingBox())!;
  await page.mouse.click(
    header.x + header.width - 8,
    header.y + header.height / 2,
  );
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await card.getByRole("button", { name: "Reset sample" }).click();
  await expect(card.getByText("Needs review")).toBeVisible();
});

test("sidebar recent items handle states and the icon rail", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page);
  const section = example(page, "Sidebar recent items");
  const collapse = section.getByRole("button", { name: "Collapse Chats" });
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  const chevron = collapse.locator('[data-slot="collapsible-indicator"]');
  await settle(page);
  expect(await rotation(chevron)).toBe(90);
  const list = section.getByRole("list", { name: "Recent chats" });
  await expect(list.getByRole("link")).toHaveCount(3);
  await list.getByRole("link", { name: "Invoice follow-ups" }).click();
  await expect(
    list.getByRole("link", { name: "Invoice follow-ups" }),
  ).toHaveAttribute("aria-current", "page");

  await chooseOption(page, "Recent chats state", "Loading");
  await expect(
    section.getByRole("status", { name: "Loading recent chats" }),
  ).toBeVisible();
  await chooseOption(page, "Recent chats state", "Empty");
  await expect(section.getByText("No chats yet.")).toBeVisible();
  await chooseOption(page, "Recent chats state", "Unavailable");
  await expect(
    section.getByText(/unavailable in this workspace/),
  ).toBeVisible();
  await chooseOption(page, "Recent chats state", "Error");
  await section
    .getByRole("alert")
    .getByRole("button", { name: "Try again" })
    .click();
  await expect(list.getByRole("link")).toHaveCount(3);

  await collapse.click();
  await settle(page);
  await expect(
    section.getByRole("button", { name: "Expand Chats" }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(list).toHaveCount(0);
  await section.getByRole("button", { name: "Expand Chats" }).click();
  await settle(page);
  await expect(list).toBeVisible();
  await section.getByRole("button", { name: "Toggle sidebar" }).click();
  await settle(page);
  await expect(list).toHaveCount(0);
  await section.getByRole("button", { name: "Toggle sidebar" }).click();
  await settle(page);
  await expect(list).toBeVisible();
});

test("sidebar recent items stay inline on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await open(page);
  const section = example(page, "Sidebar recent items");
  await expect(
    section.getByRole("list", { name: "Recent chats" }),
  ).toBeVisible();
  await expect(
    section.getByRole("button", { name: "Toggle sidebar" }),
  ).toHaveCount(0);
});

test("always-open list shows loading and error rows", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const fixed = example(page, "Always open");
  await expect(fixed.locator('[data-slot="tool-activity"]')).toHaveAttribute(
    "data-open",
    "",
  );
  await expect(fixed.locator('[data-slot="collapsible-trigger"]')).toHaveCount(
    0,
  );
  await expect(fixed.getByRole("status")).toContainText(
    "Loading earlier activity…",
  );
  await chooseOption(page, "Earlier activity", "Error");
  await fixed
    .getByRole("alert")
    .getByRole("button", { name: "Retry loading" })
    .click();
  await expect(fixed.getByRole("status")).toBeVisible();
});
