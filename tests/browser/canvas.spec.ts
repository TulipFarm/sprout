import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

test.use({ reducedMotion: "reduce" });

async function openCanvasPage(page: Page) {
  await page.goto("/components/canvas/");
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

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

// A CSS locator keeps working while a modal sheet hides the page from the accessibility tree.
const playground = (page: Page) => page.locator('[data-recipe="playground"]');
const recipe = (page: Page, id: string) =>
  page.locator(`[data-recipe="${id}"]`);
const tab = (page: Page, name: string) =>
  playground(page).getByRole("tab", { name, exact: true });

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`canvas ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openCanvasPage(page);
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
        for (const section of await page
          .locator('[data-slot="canvas-section"]')
          .all()) {
          if (!(await section.isVisible())) continue;
          expect(
            await section.evaluate(
              (el) => el.scrollWidth <= el.clientWidth + 1,
            ),
          ).toBe(true);
        }
        await axe(page);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`canvas-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
        await testInfo.attach(`canvas-playground-${theme}-${mode}-${width}`, {
          body: await page
            .getByRole("region", { name: "Canvas playground" })
            .screenshot(),
          contentType: "image/png",
        });
        await testInfo.attach(`canvas-toggle-${theme}-${mode}-${width}`, {
          body: await page
            .getByRole("region", { name: "Canvas toggle" })
            .screenshot(),
          contentType: "image/png",
        });
        const sections = page.locator(".canvas-demo-sections");
        await testInfo.attach(`canvas-sections-${theme}-${mode}-${width}`, {
          body: await sections.screenshot(),
          contentType: "image/png",
        });
        for (const id of ["approval", "workflow", "result-cards", "cards"]) {
          await testInfo.attach(
            `canvas-recipe-${id}-${theme}-${mode}-${width}`,
            {
              body: await recipe(page, id).screenshot(),
              contentType: "image/png",
            },
          );
        }

        if (width === 390) {
          // Phones always get the sheet, never the side-by-side split.
          await expect(
            playground(page).locator('[data-slot="chat-split"]'),
          ).toHaveAttribute("data-layout", "sheet");
          await playground(page)
            .getByRole("button", { name: "Show canvas, 7 open" })
            .click();
          const sheet = page.getByRole("dialog", { name: "Canvas" });
          await expect(sheet).toBeVisible();
          await expect(
            sheet.getByRole("button", { name: "Back to chat" }),
          ).toBeVisible();
          await expect(
            sheet.getByRole("button", { name: "Close canvas" }),
          ).toHaveCount(0);
          await settle(page);
          expect(
            await sheet.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          ).toBe(true);
          await axe(page);
          await testInfo.attach(`canvas-sheet-${theme}-${mode}-${width}`, {
            body: await page.screenshot(),
            contentType: "image/png",
          });
          await sheet.getByRole("button", { name: "Back to chat" }).click();
          await expect(sheet).toBeHidden();
        }
      });
    }
  }
}

test("tabs move with arrows, Home, End, and close with Delete", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openCanvasPage(page);
  const customers = tab(page, "Customers");
  await expect(customers).toHaveAttribute("aria-selected", "true");
  await expect(customers).toHaveAttribute("tabindex", "0");
  await expect(tab(page, "Calendar events")).toHaveAttribute("tabindex", "-1");
  await customers.focus();
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Calendar events")).toBeFocused();
  await expect(tab(page, "Calendar events")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    playground(page)
      .getByRole("tabpanel")
      .getByRole("heading", { name: "Google Calendar" }),
  ).toBeVisible();
  await page.keyboard.press("End");
  await expect(tab(page, "Launch checklist")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(customers).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(tab(page, "Launch checklist")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(customers).toBeFocused();

  // The selected tab's close button is the only one in the tab order.
  await page.keyboard.press("Tab");
  await expect(
    playground(page).getByRole("button", { name: "Close Customers" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Delete");
  await expect(tab(page, "Customers")).toHaveCount(0);
  await expect(tab(page, "Calendar events")).toBeFocused();
  await expect(tab(page, "Calendar events")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    playground(page).getByRole("button", { name: "Show canvas, 6 open" }),
  ).toHaveCount(0);
  await expect(
    playground(page).getByRole("button", { name: "Hide canvas" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("Escape");
  await expect(
    playground(page).getByRole("region", { name: "Canvas" }),
  ).toHaveCount(0);
  const toggle = playground(page).getByRole("button", {
    name: "Show canvas, 6 open",
  });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(tab(page, "Calendar events")).toBeVisible();
  await playground(page).getByRole("button", { name: "Reset tabs" }).click();
  await expect(playground(page).getByRole("tab")).toHaveCount(7);
});

test("split desktop canvas resizes and opens results from chat", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openCanvasPage(page);
  const split = playground(page).locator('[data-slot="chat-split"]');
  await expect(split).toHaveAttribute("data-layout", "split");
  const handle = playground(page).getByRole("separator", {
    name: "Resize canvas",
  });
  await expect(handle).toBeVisible();
  const canvas = playground(page).getByRole("region", { name: "Canvas" });
  const before = (await canvas.boundingBox())!.width;
  await handle.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect
    .poll(async () => (await canvas.boundingBox())!.width)
    .toBeGreaterThan(before);
  await expect(
    playground(page).getByText(
      /Split is \d+px: the canvas opens beside the chat/,
    ),
  ).toBeVisible();

  await playground(page).getByRole("button", { name: "Close canvas" }).click();
  await expect(canvas).toHaveCount(0);
  await playground(page)
    .getByRole("region", { name: "Conversation" })
    .getByRole("button", { name: /Open in Canvas/ })
    .nth(1)
    .click();
  await expect(tab(page, "Calendar events")).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("loading, error, and attention states", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openCanvasPage(page);
  const busy = playground(page).getByRole("tab", {
    name: "Weekly pipeline, loading",
    exact: true,
  });
  await expect(busy).toBeVisible();
  await busy.click();
  const panel = playground(page).getByRole("tabpanel");
  await expect(panel.getByText("Preparing…")).toBeVisible();
  await expect(
    panel.getByRole("status", { name: "Loading Weekly pipeline" }),
  ).toBeVisible();
  await expect(tab(page, "Weekly pipeline")).toBeVisible({ timeout: 8000 });
  await expect(
    panel.getByRole("list", { name: "Weekly pipeline by week" }),
  ).toBeVisible();

  await tab(page, "Q3 revenue report").click();
  await expect(panel.getByRole("alert")).toContainText(
    "Couldn’t load Q3 revenue report",
  );
  await panel.getByRole("button", { name: "Try again" }).click();
  await expect(
    playground(page).getByRole("tab", {
      name: "Q3 revenue report, loading",
      exact: true,
    }),
  ).toBeVisible();

  await tab(page, "Pricing page").click();
  const frame = panel.locator("iframe");
  await expect(frame).toHaveAttribute("sandbox", "allow-scripts allow-popups");
  await expect(frame).toHaveAttribute("title", "Pricing page");
  await expect(
    panel.getByRole("link", { name: "Open in new tab" }),
  ).toHaveAttribute("target", "_blank");

  await playground(page)
    .getByRole("switch", { name: "Needs attention" })
    .click();
  const back = playground(page).getByRole("button", {
    name: "A Google action needs your review. Back to chat",
  });
  await expect(back).toBeVisible();
  await back.click();
  await expect(
    playground(page).getByRole("region", { name: "Canvas" }),
  ).toHaveCount(0);
});

test("a narrow split opens the canvas as a sheet", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openCanvasPage(page);
  await chooseOption(page, "Split width", "Narrow (600px)");
  await expect(
    playground(page).locator('[data-slot="chat-split"]'),
  ).toHaveAttribute("data-layout", "sheet");
  const sheet = page.getByRole("dialog", { name: "Canvas" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("tab", { name: "Customers" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await settle(page);
  await testInfo.attach("canvas-narrow-sheet", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await chooseOption(page, "Split width", "Full width");
  await playground(page)
    .getByRole("button", { name: "Show canvas, 7 open" })
    .click();
  await expect(
    playground(page).locator('[data-slot="chat-split"]'),
  ).toHaveAttribute("data-layout", "split");
  await expect(page.getByRole("dialog", { name: "Canvas" })).toHaveCount(0);
  await expect(tab(page, "Customers")).toBeVisible();
});

test("recipes cover approval, workflow empty, result cards, and closable cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openCanvasPage(page);

  const approval = recipe(page, "approval");
  await expect(
    approval.getByRole("tab", { name: "Proposed changes" }),
  ).toBeVisible();
  await expect(
    approval
      .getByRole("region", { name: "Canvas" })
      .getByText("Not yet applied", { exact: true }),
  ).toBeVisible();
  await chooseOption(page, "Outcome", "Created");
  await expect(
    approval.getByRole("tab", { name: "Created tables" }),
  ).toBeVisible();
  await approval.getByRole("button", { name: "Close Created tables" }).click();
  await expect(approval.getByRole("region", { name: "Canvas" })).toHaveCount(0);

  const workflow = recipe(page, "workflow");
  await workflow.getByRole("button", { name: "Close Workflow" }).click();
  await expect(
    workflow.getByRole("heading", { name: "Canvas", level: 2 }),
  ).toBeVisible();
  await expect(
    workflow.getByRole("heading", { name: "No workflow open" }),
  ).toBeVisible();
  await expect(workflow.getByRole("tablist")).toHaveCount(0);
  await expect(
    workflow.getByRole("button", { name: "Show canvas" }),
  ).toHaveCount(0);
  await expect(
    workflow.getByRole("button", { name: "Hide canvas" }),
  ).toBeVisible();
  await workflow.getByRole("button", { name: "Open workflow" }).click();
  await expect(workflow.getByRole("tab", { name: "Workflow" })).toBeVisible();

  const cards = recipe(page, "result-cards");
  await expect(cards.getByRole("region", { name: "Canvas" })).toHaveCount(0);
  await expect(
    cards.getByRole("button", { name: "Show canvas", exact: true }),
  ).toBeVisible();
  await cards.getByRole("button", { name: /View email/ }).click();
  await expect(
    cards.getByRole("tab", { name: "Investor update" }),
  ).toBeVisible();
  await expect(
    cards.getByRole("button", { name: "Hide canvas" }),
  ).toBeVisible();
  await cards.getByRole("button", { name: "Hide canvas" }).click();
  await expect(cards.getByRole("region", { name: "Canvas" })).toHaveCount(0);
  await cards.getByRole("button", { name: "Show canvas", exact: true }).click();
  await expect(
    cards.getByRole("tab", { name: "Investor pitch" }),
  ).toBeVisible();

  const garden = recipe(page, "cards");
  await expect(garden.getByRole("tab")).toHaveCount(2);
  await garden.getByRole("tab", { name: "Notes" }).click();
  await expect(garden.getByRole("heading", { name: "Notes" })).toBeVisible();
  await expect(garden.getByText("Local example")).toBeVisible();
  await garden.getByRole("button", { name: "Close Notes" }).click();
  await garden.getByRole("button", { name: "Close Garden plan" }).click();
  await expect(
    garden.getByRole("heading", { name: "Canvas", level: 2 }),
  ).toBeVisible();
  await garden.getByRole("button", { name: "Reset tabs" }).click();
  await expect(garden.getByRole("tab")).toHaveCount(2);
});

test("the sidebar page still renders beside the canvas page", async ({
  page,
}) => {
  await page.goto("/components/sidebar/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Canvas", exact: true }),
  ).toHaveAttribute("href", "/components/canvas/");
  await page.getByRole("link", { name: "Canvas", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Canvas", level: 1 }),
  ).toBeVisible();
});
