import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption, setColorMode } from "./choose-option";

test.use({ reducedMotion: "reduce" });

async function openPage(page: Page) {
  await page.goto("/components/chat-plan/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const playground = (page: Page) =>
  page.getByRole("region", { name: "Chat plan playground" });
const recipe = (page: Page, id: string) =>
  page.locator(`[data-recipe="${id}"]`);
const recipes = ["states", "empty", "canvas", "long"];
const stepStates = (plan: ReturnType<Page["locator"]>) =>
  plan
    .locator('[data-slot="chat-plan-step"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-state")));

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`chat plan ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openPage(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        await page.emulateMedia({ colorScheme: mode });
        if (mode === "dark") await setColorMode(page, "Dark");
        else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
        expect(
          await stepStates(
            recipe(page, "states").locator('[data-slot="chat-plan"]'),
          ),
        ).toEqual(["complete", "running", "error", "pending"]);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        for (const plan of await page
          .locator('[data-slot="chat-plan"]')
          .all()) {
          await plan.scrollIntoViewIfNeeded();
          expect(
            await plan.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          ).toBe(true);
          for (const step of await plan
            .locator('[data-slot="chat-plan-step"]')
            .all()) {
            expect(
              await step.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
            ).toBe(true);
            const box = await step.boundingBox();
            const outer = await plan.boundingBox();
            expect(box!.x + box!.width).toBeLessThanOrEqual(
              outer!.x + outer!.width - 15,
            );
          }
        }
        // Complete and failed icons take the success and danger colors.
        const colors = await recipe(page, "states").evaluate((el) => {
          const icon = (state: string) =>
            getComputedStyle(
              el.querySelector(
                `[data-state="${state}"] .sprout-chat-plan-icon`,
              )!,
            ).color;
          const token = (name: string) => {
            const probe = document.createElement("span");
            probe.style.color = `var(${name})`;
            el.appendChild(probe);
            const value = getComputedStyle(probe).color;
            probe.remove();
            return value;
          };
          return {
            complete: icon("complete") === token("--sprout-success"),
            error: icon("error") === token("--sprout-danger"),
            pending: icon("pending") === token("--sprout-muted"),
          };
        });
        expect(colors).toEqual({ complete: true, error: true, pending: true });
        const results = await new AxeBuilder({ page })
          .exclude(".docs-search-trigger")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`chat-plan-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
        await testInfo.attach(
          `chat-plan-playground-${theme}-${mode}-${width}`,
          {
            body: await playground(page).screenshot(),
            contentType: "image/png",
          },
        );
        for (const id of recipes) {
          await testInfo.attach(`chat-plan-${id}-${theme}-${mode}-${width}`, {
            body: await recipe(page, id).screenshot(),
            contentType: "image/png",
          });
        }
      });
    }
  }
}

test("plans are named sections with readable step states", async ({ page }) => {
  await openPage(page);
  const plan = page.getByRole("region", { name: "Fictional garden plan" });
  await expect(
    plan.getByRole("heading", { level: 4, name: "Fictional garden plan" }),
  ).toBeVisible();
  await expect(plan.getByText("1 of 4 complete")).toBeVisible();
  const items = plan.getByRole("listitem");
  await expect(items).toHaveCount(4);
  await expect(items.nth(0)).toContainText("Choose a patch · Complete");
  await expect(items.nth(1)).toContainText("Prepare the soil · In progress");
  await expect(items.nth(2)).toContainText("Order bulbs · Failed");
  await expect(items.nth(2)).toContainText(
    "The sample supplier is unavailable.",
  );
  await expect(items.nth(3)).toContainText("Plant the bulbs · Not started");
  await expect(plan.getByRole("status")).toHaveCount(0);
  const empty = page.getByRole("region", { name: "New plan" });
  await expect(empty.getByText("0 of 0 complete")).toBeVisible();
  await expect(
    empty.getByText("No steps have been proposed yet."),
  ).toBeVisible();
  await expect(empty.getByRole("list")).toHaveCount(0);
  const canvas = page.getByRole("group", { name: "Canvas" });
  await expect(
    canvas.locator('[data-slot="canvas-section"] [data-slot="chat-plan"]'),
  ).toHaveCount(1);
  await expect(canvas.getByText("2 of 5 complete")).toBeVisible();
});

test("keyboard drives the playground through every progress", async ({
  page,
}) => {
  await openPage(page);
  const plan = playground(page).locator('[data-slot="chat-plan"]');
  const next = playground(page).getByRole("button", { name: "Next step" });
  await chooseOption(page, "Progress", "Proposed");
  expect(await stepStates(plan)).toEqual([
    "pending",
    "pending",
    "pending",
    "pending",
  ]);
  await expect(plan.getByText("0 of 4 complete")).toBeVisible();
  await next.focus();
  await expect(next).toBeFocused();
  await page.keyboard.press("Enter");
  expect(await stepStates(plan)).toEqual([
    "running",
    "pending",
    "pending",
    "pending",
  ]);
  await page.keyboard.press("Space");
  expect(await stepStates(plan)).toEqual([
    "complete",
    "complete",
    "running",
    "pending",
  ]);
  await expect(plan.getByText("2 of 4 complete")).toBeVisible();
  await page.keyboard.press("Enter");
  expect(await stepStates(plan)).toEqual([
    "complete",
    "complete",
    "complete",
    "complete",
  ]);
  await expect(plan.getByText("4 of 4 complete")).toBeVisible();
  await expect(next).toBeDisabled();
  await chooseOption(page, "Progress", "Step failed");
  expect(await stepStates(plan)).toEqual([
    "complete",
    "error",
    "pending",
    "pending",
  ]);
  await expect(
    plan.getByText("Twelve invoice numbers match more than one supplier.", {
      exact: false,
    }),
  ).toBeVisible();
  await chooseOption(page, "Progress", "No steps yet");
  await expect(
    plan.getByText("No steps have been proposed yet."),
  ).toBeVisible();
  // The progress picker opens and picks with the keyboard.
  const picker = page.getByRole("combobox", { name: "Progress", exact: true });
  await picker.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(picker).toBeFocused();
});

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });
  test("step icons fade in on state change", async ({ page }) => {
    await openPage(page);
    const icon = recipe(page, "states").locator(
      '[data-state="complete"] .sprout-chat-plan-icon',
    );
    expect(
      await icon.evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("sprout-chat-plan-icon-in");
    expect(
      await icon.evaluate((el) => getComputedStyle(el).animationDuration),
    ).toBe("0.18s");
  });
});

test("reduced motion skips the icon animation", async ({ page }) => {
  await openPage(page);
  const icon = recipe(page, "states").locator(
    '[data-state="complete"] .sprout-chat-plan-icon',
  );
  expect(await icon.evaluate((el) => getComputedStyle(el).animationName)).toBe(
    "none",
  );
});
