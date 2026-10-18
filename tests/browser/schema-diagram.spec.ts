import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

test.use({ reducedMotion: "reduce" });

async function openPage(page: Page) {
  await page.goto("/components/schema-diagram/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await expect(page.locator(".react-flow__node").first()).toBeVisible();
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished),
    );
  });
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

async function axe(page: Page) {
  // The docs header's phone-width search icon is site chrome, not this component.
  const results = await new AxeBuilder({ page })
    .exclude(".docs-search-trigger")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

const demo = (page: Page, id: string) => page.locator(`[data-demo="${id}"]`);
const viewport = (scope: Locator) =>
  scope.locator('[data-slot="schema-diagram-viewport"]');
const transform = (scope: Locator) =>
  scope
    .locator(".react-flow__viewport")
    .evaluate((el) => (el as HTMLElement).style.transform);
const zoomOf = async (scope: Locator) =>
  Number(/scale\(([\d.]+)\)/.exec(await transform(scope))?.[1]);

/** Every table card must sit inside its own diagram after the first fit. */
async function cardsInView(scope: Locator) {
  const box = await scope.locator('[data-slot="schema-diagram"]').boundingBox();
  expect(box).not.toBeNull();
  for (const card of await scope.locator('[data-slot="schema-table"]').all()) {
    const rect = await card.boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.x).toBeGreaterThanOrEqual(box!.x - 1);
    expect(rect!.y).toBeGreaterThanOrEqual(box!.y - 1);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(box!.x + box!.width + 1);
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(
      box!.y + box!.height + 1,
    );
  }
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`schema diagram ${theme} ${mode} at ${width}px`, async ({
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
        await noOverflow(page);

        const playground = demo(page, "playground");
        await expect(
          playground.locator('[data-slot="schema-diagram"]'),
        ).toHaveAttribute(
          "data-layout",
          width < 768 ? "vertical" : "horizontal",
        );
        const controls = playground.locator(
          '[data-slot="schema-diagram-controls"]',
        );
        await expect(controls).toHaveClass(
          width < 768 ? /\btop\b/ : /\bbottom\b/,
        );

        // xyflow tags its root with .light; the diagram must keep the page's tokens.
        const colors = await page.evaluate(() => {
          const probe = document.createElement("div");
          probe.style.background = "var(--sprout-surface)";
          document.body.append(probe);
          const surface = getComputedStyle(probe).backgroundColor;
          probe.remove();
          const card = document.querySelector('[data-slot="schema-table"]')!;
          return { surface, card: getComputedStyle(card).backgroundColor };
        });
        expect(colors.card).toBe(colors.surface);

        for (const id of [
          "playground",
          "states",
          "layout-horizontal",
          "layout-vertical",
          "edge-cases",
        ]) {
          const frame = demo(page, id);
          await frame.scrollIntoViewIfNeeded();
          await settle(page);
          if (id !== "edge-cases") await cardsInView(frame);
          for (const header of await frame
            .locator(".sprout-schema-table-header")
            .all())
            expect(
              await header.evaluate(
                (el) => el.scrollWidth <= el.clientWidth + 1,
              ),
            ).toBe(true);
          await testInfo.attach(`schema-${id}-${theme}-${mode}-${width}`, {
            body: await frame.screenshot(),
            contentType: "image/png",
          });
        }
        await axe(page);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`schema-diagram-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
      });
    }
  }
}

test("marks table states, field changes, keys, required fields, and details", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPage(page);
  const states = demo(page, "states");
  const table = (name: string) =>
    states
      .getByRole("group", { name: `${name} table` })
      .locator('[data-slot="schema-table"]');

  await expect(table("Projects")).toHaveAttribute("data-state", "new");
  await expect(table("Projects").locator(".sprout-badge")).toHaveText("New");
  await expect(table("Tasks")).toHaveAttribute("data-state", "changed");
  await expect(table("Tasks").locator(".sprout-badge")).toHaveText("Changed");
  await expect(table("Team members")).toHaveAttribute("data-state", "linked");
  await expect(table("Team members").locator(".sprout-badge")).toHaveText(
    "Existing",
  );
  await expect(table("Time entries")).toHaveAttribute(
    "data-state",
    "unchanged",
  );
  await expect(table("Time entries").locator(".sprout-badge")).toHaveCount(0);

  const field = (name: string) =>
    states.locator('[data-slot="schema-field"]').filter({ hasText: name });
  await expect(field("Due")).toHaveAttribute("data-change", "added");
  await expect(field("Due")).toContainText(", added");
  await expect(field("Title")).toHaveAttribute("data-change", "changed");
  await expect(field("Old note")).toHaveAttribute("data-change", "removed");
  await expect(
    field("Name").getByRole("img", { name: "Unique" }),
  ).toBeVisible();
  await expect(field("Name")).toContainText(", required");
  await expect(field("Lead")).not.toContainText("required");
  await expect(
    field("Status").locator(".sprout-schema-field-detail"),
  ).toHaveText("Planned · In progress · Done");
  for (const change of ["added", "changed", "removed"]) {
    const background = await states
      .locator(`[data-slot="schema-field"][data-change="${change}"]`)
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).not.toBe("rgba(0, 0, 0, 0)");
  }

  const legend = states.getByRole("list", { name: "Legend" });
  await expect(legend.getByRole("listitem")).toHaveText([
    "Added",
    "Changed",
    "Removed",
    "Unique",
    "* Required",
  ]);

  await expect(
    states.getByRole("img", { name: "Tasks Project links to Projects: N:1" }),
  ).toBeAttached();
  await expect(states.locator(".sprout-schema-link-label").first()).toHaveText(
    "N:1",
  );
});

test("shows empty tables, self links, and truncated long names", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPage(page);
  const edge = demo(page, "edge-cases");
  await expect(
    edge
      .getByRole("group", { name: "Linked table table" })
      .locator(".sprout-schema-table-empty"),
  ).toHaveText("Fields not shown");
  await expect(
    edge
      .getByRole("group", { name: "Onboarding checklist table" })
      .locator(".sprout-schema-table-empty"),
  ).toHaveText("No fields");
  await expect(
    edge.getByRole("img", {
      name: "Employees Manager links to Employees: N:1",
    }),
  ).toBeAttached();
  await expect(
    edge.getByRole("img", {
      name: "Quarterly enterprise renewal opportunities and follow-ups Owner links to Employees: N:N",
    }),
  ).toBeAttached();
  const title = edge.locator(".sprout-schema-table-title", {
    hasText: "Quarterly enterprise renewal",
  });
  await expect(title).toHaveAttribute(
    "title",
    "Quarterly enterprise renewal opportunities and follow-ups",
  );
  expect(await title.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true,
  );
  for (const selector of [
    ".sprout-schema-field-name",
    ".sprout-schema-field-detail",
  ]) {
    for (const el of await edge.locator(selector).all()) {
      const fits = await el.evaluate((node) => {
        const card = node
          .closest('[data-slot="schema-table"]')!
          .getBoundingClientRect();
        const rect = node.getBoundingClientRect();
        return rect.right <= card.right + 0.5;
      });
      expect(fits).toBe(true);
    }
  }
});

test("pans, zooms, and fits from the keyboard and the zoom controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPage(page);
  const states = demo(page, "states");
  await states.scrollIntoViewIfNeeded();
  const flow = viewport(states);
  await expect(flow).toHaveAttribute("tabindex", "0");
  await expect(flow).toHaveAccessibleName("Project tracker schema");
  await expect(flow).toHaveAccessibleDescription(/Arrow keys pan/);

  await flow.focus();
  await expect(flow).toBeFocused();
  const fitted = await transform(states);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => transform(states)).not.toBe(fitted);
  const panned = await transform(states);
  await page.keyboard.press("Shift+ArrowUp");
  await expect.poll(() => transform(states)).not.toBe(panned);

  const before = await zoomOf(states);
  await page.keyboard.press("+");
  await expect.poll(() => zoomOf(states)).toBeGreaterThan(before);
  await page.keyboard.press("-");
  await page.keyboard.press("-");
  await expect.poll(() => zoomOf(states)).toBeLessThan(before);
  await page.keyboard.press("0");
  await expect.poll(() => transform(states)).toBe(fitted);

  // Tab walks the table cards, and arrow keys still pan while a card has focus.
  await page.keyboard.press("Tab");
  const card = states.locator(".react-flow__node").first();
  await expect(card).toBeFocused();
  await expect(card).toHaveAttribute("aria-roledescription", "table card");
  await expect(card).toHaveAccessibleDescription(/Arrow keys pan/);
  await expect(card).toHaveCSS("outline-style", "solid");
  const atCard = await transform(states);
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => transform(states)).not.toBe(atCard);

  const toolbar = states.getByRole("toolbar", { name: "Diagram view" });
  const zoomIn = toolbar.getByRole("button", { name: "Zoom in" });
  const zoomOut = toolbar.getByRole("button", { name: "Zoom out" });
  for (let i = 0; i < 12 && (await zoomIn.isEnabled()); i++)
    await zoomIn.click();
  await expect(zoomIn).toBeDisabled();
  await expect.poll(() => zoomOf(states)).toBeCloseTo(1.5, 2);
  for (let i = 0; i < 20 && (await zoomOut.isEnabled()); i++)
    await zoomOut.click();
  await expect(zoomOut).toBeDisabled();
  await expect.poll(() => zoomOf(states)).toBeCloseTo(0.2, 2);
  await toolbar.getByRole("button", { name: "Fit to view" }).focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => transform(states)).toBe(fitted);
  await expect(zoomIn).toBeEnabled();
  await expect(zoomOut).toBeEnabled();
});

test("covers every proposal status, count, and read state in the canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPage(page);
  const playground = demo(page, "playground");
  const section = playground.locator('[data-slot="canvas-section"]');
  await expect(section).toContainText("Sales pipeline");
  await expect(section).toContainText("2 tables in this proposal · 2 links");
  await expect(
    playground.getByRole("figure", {
      name: "Schema diagram for Sales pipeline",
    }),
  ).toBeVisible();

  const statuses = [
    [
      "Not yet applied",
      "info",
      "Review these changes, then use the approval area at the bottom of the chat.",
    ],
    [
      "Approval recorded",
      "info",
      "Follow progress in the approval area at the bottom of the chat.",
    ],
    [
      "Applying changes",
      "info",
      "Follow progress in the approval area at the bottom of the chat.",
    ],
    [
      "Changes applied",
      "success",
      "Changes applied. Open the result from the approval area at the bottom of the chat.",
    ],
    [
      "Partially completed",
      "warning",
      "Check the outcome and available actions in the approval area at the bottom of the chat.",
    ],
    [
      "Execution failed",
      "destructive",
      "Check the outcome and available actions in the approval area at the bottom of the chat.",
    ],
    [
      "Cancelled",
      "warning",
      "Check the outcome and available actions in the approval area at the bottom of the chat.",
    ],
    [
      "Rejected",
      "destructive",
      "Check the outcome and available actions in the approval area at the bottom of the chat.",
    ],
    [
      "Expired",
      "warning",
      "Check the outcome and available actions in the approval area at the bottom of the chat.",
    ],
  ] as const;
  for (const [label, variant, footer] of statuses) {
    await chooseOption(page, "Status", label);
    const badge = section.getByRole("status").locator(".sprout-badge");
    await expect(badge).toHaveText(label);
    await expect(badge).toHaveClass(
      new RegExp(`\\bsprout-badge-${variant}\\b`),
    );
    await expect(section.locator(".schema-demo-footer")).toHaveText(footer);
  }

  await chooseOption(page, "Proposal", "1 table, 1 link");
  await expect(section).toContainText("Support desk");
  await expect(section).toContainText("1 table in this proposal · 1 link");
  await expect(section.getByText("Fields not shown")).toBeVisible();

  await chooseOption(page, "Layout", "Stacked");
  await expect(section.locator('[data-slot="schema-diagram"]')).toHaveAttribute(
    "data-layout",
    "vertical",
  );
  await chooseOption(page, "Layout", "Columns");
  await expect(section.locator('[data-slot="schema-diagram"]')).toHaveAttribute(
    "data-layout",
    "horizontal",
  );

  await chooseOption(page, "Proposal", "Loading");
  await expect(
    playground.getByRole("status", { name: "Loading tables" }),
  ).toBeVisible();
  await expect(playground.locator('[data-slot="skeleton"]')).toHaveCount(3);

  await chooseOption(page, "Proposal", "Values removed");
  await expect(
    playground.getByRole("heading", {
      level: 3,
      name: "Schema no longer available",
    }),
  ).toBeVisible();
  await expect(playground).toContainText(
    "Proposal values were removed after the review period. Ask the assistant for a new proposal to see its schema.",
  );
  await expect(playground.locator('[data-slot="schema-diagram"]')).toHaveCount(
    0,
  );

  await chooseOption(page, "Proposal", "Load error");
  const alert = playground.getByRole("alert");
  await expect(alert).toContainText("Could not load tables");
  await playground.getByRole("button", { name: "Try again" }).click();
  await expect(section).toContainText("Sales pipeline");
  await axe(page);
});

test("stacks tables with controls at the top on phones", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPage(page);
  const playground = demo(page, "playground");
  const diagram = playground.locator('[data-slot="schema-diagram"]');
  await expect(diagram).toHaveAttribute("data-layout", "vertical");
  const xs = await playground
    .locator(".react-flow__node")
    .evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLElement).style.transform),
    );
  expect(
    new Set(xs.map((value) => /translate\(([-\d.]+)px/.exec(value)?.[1])).size,
  ).toBe(1);
  const controls = await playground
    .getByRole("toolbar", { name: "Diagram view" })
    .boundingBox();
  const box = await diagram.boundingBox();
  expect(controls!.y - box!.y).toBeLessThan(box!.height / 2);
  await noOverflow(page);
  await testInfo.attach("schema-playground-mobile-stacked", {
    body: await playground.screenshot(),
    contentType: "image/png",
  });
});
