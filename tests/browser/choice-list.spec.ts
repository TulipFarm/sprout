import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/choice-list/";

async function openChoiceList(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#choice-list-demo");
}

async function cssColor(page: Page, value: string) {
  return page.evaluate((color) => {
    const probe = document.createElement("span");
    probe.style.color = color;
    document.body.append(probe);
    const result = getComputedStyle(probe).color;
    probe.remove();
    return result;
  }, value);
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`choice list ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openChoiceList(page);
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
        const checked = page
          .getByTestId("layout-stacked-single")
          .locator('[data-slot="choice-list-option"][data-checked]');
        await expect(checked).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-primary-subtle)"),
        );
        await expect(checked.locator(".sprout-choice-list-mark")).toHaveCSS(
          "color",
          await cssColor(page, "var(--sprout-primary)"),
        );
        const overflowing = await demo
          .locator(
            ".choice-list-demo-card-body, .sprout-choice-list-option, .sprout-choice-list-text, .sprout-choice-summary",
          )
          .evaluateAll((nodes) =>
            nodes
              .filter((node) => node.scrollWidth > node.clientWidth + 1)
              .map(
                (node) =>
                  `${node.className}: ${node.scrollWidth}/${node.clientWidth}`,
              ),
          );
        expect(overflowing).toEqual([]);
        // Rows stay inside the viewport and keep their layout heights.
        for (const row of await demo
          .locator('[data-layout="stacked"] .sprout-choice-list-option')
          .all()) {
          const rect = (await row.boundingBox())!;
          expect(rect.height).toBeGreaterThanOrEqual(44);
          expect(rect.x + rect.width).toBeLessThanOrEqual(width);
        }
        for (const row of await demo
          .locator('[data-layout="compact"] .sprout-choice-list-option')
          .all()) {
          const rect = (await row.boundingBox())!;
          expect(rect.height).toBeGreaterThanOrEqual(36);
        }
        const results = await new AxeBuilder({ page })
          .include("#choice-list-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await page.mouse.move(0, 0);
        const path = testInfo.outputPath(
          `choice-list-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`choice-list-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("layouts render radio, checkbox, numbered, and recommended rows", async ({
  page,
}) => {
  await openChoiceList(page);
  const stacked = page.getByTestId("layout-stacked-single");
  await expect(
    stacked.getByRole("group", { name: "Reply style" }),
  ).toBeVisible();
  await expect(stacked.getByRole("radio")).toHaveCount(3);
  const multiple = page.getByTestId("layout-stacked-multiple");
  await expect(multiple.getByRole("checkbox")).toHaveCount(5);
  await expect(
    multiple.getByRole("checkbox", { name: "Cherry" }),
  ).toBeChecked();
  await expect(multiple.locator(".sprout-choice-list-mark").first()).toHaveCSS(
    "border-radius",
    "4px",
  );
  const compact = page.getByTestId("layout-compact-single");
  await expect(compact.locator("legend")).toHaveClass(
    "sprout-choice-list-sr-only",
  );
  await expect(compact.locator(".sprout-choice-list-mark")).toHaveText([
    "1",
    "2",
    "3",
  ]);
  const recommended = compact.getByRole("radio", { name: /tulipfarm\/web/ });
  await expect(recommended).toHaveAccessibleName(
    /^tulipfarm\/web\s?Recommended$/,
  );
  await expect(compact.locator(".sprout-badge-info")).toHaveText("Recommended");
  const scrolling = page
    .getByTestId("layout-compact-multiple")
    .locator(".sprout-choice-list-options");
  await expect(
    page.getByTestId("layout-compact-multiple").locator("legend"),
  ).toHaveClass("sprout-choice-list-legend");
  expect(
    await scrolling.evaluate((node) => node.scrollHeight > node.clientHeight),
  ).toBe(true);
});

test("keyboard moves through radios and toggles checkboxes", async ({
  page,
}) => {
  await openChoiceList(page);
  const stacked = page.getByTestId("layout-stacked-single");
  const short = stacked.getByRole("radio", { name: "Short answers" });
  await short.focus();
  await page.keyboard.press("ArrowDown");
  const detailed = stacked.getByRole("radio", { name: "Detailed answers" });
  await expect(detailed).toBeFocused();
  await expect(detailed).toBeChecked();
  await expect(
    stacked.locator('[data-slot="choice-list-option"]').nth(1),
  ).toHaveCSS("outline-style", "solid");
  await expect(
    stacked.locator('[data-slot="choice-list-option"]').nth(1),
  ).toHaveAttribute("data-checked", "true");
  const multiple = page.getByTestId("layout-compact-multiple");
  const product = multiple.getByRole("checkbox", { name: "#product" });
  await product.focus();
  await page.keyboard.press("Space");
  await expect(product).toBeChecked();
  await page.keyboard.press("Tab");
  await expect(
    multiple.getByRole("checkbox", { name: "#support-escalations" }),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await expect(
    multiple.getByRole("checkbox", { name: "#support-escalations" }),
  ).not.toBeChecked();
});

test("agent question validates, opens a typed answer, and summarizes", async ({
  page,
}, testInfo) => {
  await openChoiceList(page);
  const card = page.getByTestId("question-single");
  await card.getByRole("button", { name: "Continue" }).click();
  await expect(
    card.getByText("Choose an answer.", { exact: true }),
  ).toBeVisible();
  await expect(card.getByRole("radio").first()).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  const other = card.getByRole("button", { name: "Other answer" });
  await expect(other).toHaveAttribute("aria-expanded", "false");
  await other.click();
  const answer = card.getByRole("textbox", { name: "Your answer" });
  await expect(answer).toBeFocused();
  await expect(answer).toHaveCSS("outline-style", "none");
  await expect(card.locator('[data-slot="choice-list-text"]')).toHaveCSS(
    "outline-style",
    "solid",
  );
  await expect(
    card.getByRole("button", { name: "Use a listed answer" }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    card.getByRole("alert").filter({ hasText: "Enter your answer." }),
  ).toBeVisible();
  await expect(card.getByRole("radio", { checked: true })).toHaveCount(0);
  await answer.fill("tulipfarm/infra, please");
  const path = testInfo.outputPath("choice-list-question-typed.png");
  await card.screenshot({ animations: "disabled", path });
  await testInfo.attach("choice-list-question-typed", {
    path,
    contentType: "image/png",
  });
  await card.getByRole("button", { name: "Continue" }).click();
  const done = page.getByTestId("question-single");
  await expect(done.locator('[data-slot="choice-summary"]')).toContainText(
    "tulipfarm/infra, please",
  );
  await expect(done.getByRole("status")).toHaveText(
    "Your answer was recorded.",
  );
  await done.getByRole("button", { name: "Ask again" }).click();
  await page
    .getByTestId("question-single")
    .getByRole("radio", { name: /tulipfarm\/api/ })
    .check();
  await page
    .getByTestId("question-single")
    .getByRole("button", { name: "Continue" })
    .click();
  await expect(
    page
      .getByTestId("question-single")
      .locator(".sprout-choice-summary-answer"),
  ).toHaveText("tulipfarm/api");
});

test("multiple question joins labels and skip cancels", async ({ page }) => {
  await openChoiceList(page);
  const card = page.getByTestId("question-multiple");
  await expect(
    card.getByRole("group", { name: "Choose one or more answers" }),
  ).toBeVisible();
  await card.getByRole("checkbox", { name: "#product" }).check();
  await card.getByRole("checkbox", { name: "#incidents" }).check();
  await card.getByRole("button", { name: "Continue" }).click();
  await expect(
    page
      .getByTestId("question-multiple")
      .locator(".sprout-choice-summary-answer"),
  ).toHaveText("#product, #incidents");
  await page
    .getByTestId("question-multiple")
    .getByRole("button", { name: "Ask again" })
    .click();
  await page
    .getByTestId("question-multiple")
    .getByRole("button", { name: "Skip" })
    .click();
  await expect(
    page.getByTestId("question-multiple").getByRole("status"),
  ).toHaveText("This request was cancelled without an answer.");
  await expect(
    page
      .getByTestId("question-multiple")
      .locator(".sprout-choice-summary-answer"),
  ).toHaveCount(0);
});

test("locked question and disabled states block changes", async ({ page }) => {
  await openChoiceList(page);
  const locked = page.getByTestId("question-locked");
  await expect(locked.getByRole("group")).toHaveAttribute("disabled", "");
  for (const radio of await locked.getByRole("radio").all())
    await expect(radio).toBeDisabled();
  const disabled = page.getByTestId("state-disabled");
  const preselected = disabled
    .getByRole("group", { name: "Preselected and disabled" })
    .getByRole("radio", { name: "Short answers" });
  await expect(preselected).toBeChecked();
  await expect(preselected).toBeDisabled();
  const row = disabled.locator('[data-slot="choice-list-option"]').first();
  await expect(row).toHaveCSS("opacity", "0.5");
  await expect(row).toHaveCSS(
    "background-color",
    await cssColor(page, "var(--sprout-secondary)"),
  );
});

test("errors are described and clear when answered", async ({ page }) => {
  await openChoiceList(page);
  const stacked = page.getByTestId("state-stacked-error");
  const radio = stacked.getByRole("radio", { name: "Short answers" });
  await expect(radio).toHaveAccessibleDescription("Choose a reply style.");
  await radio.check();
  await expect(stacked.getByText("Choose a reply style.")).toHaveCount(0);
  await expect(radio).not.toHaveAttribute("aria-invalid", "true");
  const compact = page.getByTestId("state-compact-error");
  await expect(compact.getByRole("radio").first()).toHaveAccessibleDescription(
    "Choose an answer.",
  );
  const text = page.getByTestId("state-text-error");
  const box = text.getByRole("textbox", { name: "Your answer" });
  await expect(box).toHaveAttribute("aria-invalid", "true");
  await expect(text.locator('[data-slot="choice-list-text"]')).toHaveCSS(
    "border-color",
    await cssColor(page, "var(--sprout-danger)"),
  );
  await box.fill("Bullet points, then a one-line summary.");
  await expect(box).not.toHaveAttribute("aria-invalid", "true");
});

test("bud preference reveals custom text, saves while busy, and undoes", async ({
  page,
}) => {
  await openChoiceList(page);
  const card = page.getByTestId("bud-preference");
  await expect(
    card.getByRole("button", { name: "Save answer" }),
  ).toBeDisabled();
  await card.getByRole("radio", { name: "Custom" }).check();
  const field = card.getByRole("textbox", { name: /Your preference/ });
  await expect(field).toBeVisible();
  await card.getByRole("radio", { name: "Short answers" }).check();
  await expect(field).toHaveCount(0);
  await card.getByRole("button", { name: "Save answer" }).click();
  await expect(
    card.getByRole("group", { name: "Reply style" }),
  ).toHaveAttribute("disabled", "");
  await expect(
    card.getByRole("radio", { name: "Short answers" }),
  ).toBeDisabled();
  await expect(card.getByRole("status")).toHaveText(
    "Remembered for this workspace",
  );
  await expect(card).toContainText("Keep replies short and direct.");
  await card.getByRole("button", { name: "Undo" }).click();
  await expect(
    card.getByRole("radio", { name: "Short answers" }),
  ).toBeEnabled();
});

test("recommended custom answer drives the summary", async ({ page }) => {
  await openChoiceList(page);
  const example = page.getByTestId("recommended-custom");
  await expect(example.locator(".sprout-choice-summary-answer")).toHaveText(
    "Short answers",
  );
  const box = example.getByRole("textbox", { name: "Your answer" });
  await box.fill("Short, with links to sources");
  await expect(
    example.locator('[data-slot="choice-list-text"]'),
  ).toHaveAttribute("data-checked", "true");
  await expect(example.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(example.locator(".sprout-choice-summary-answer")).toHaveText(
    "Short, with links to sources",
  );
  await example.getByRole("radio", { name: "Detailed answers" }).check();
  await expect(
    example.locator('[data-slot="choice-list-text"]'),
  ).not.toHaveAttribute("data-checked");
});

test("summaries wrap long answers and omit missing ones", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openChoiceList(page);
  const summaries = page.getByTestId("summaries");
  await expect(summaries.locator('[data-slot="choice-summary"]')).toHaveCount(
    6,
  );
  await expect(summaries.locator(".sprout-choice-summary-answer")).toHaveCount(
    4,
  );
  await expect(
    summaries.getByText("This request expired without an answer."),
  ).toBeVisible();
  await expect(summaries.locator(".sprout-badge")).toHaveText("Saved");
  const path = testInfo.outputPath("choice-list-summaries-390.png");
  await summaries.screenshot({ animations: "disabled", path });
  await testInfo.attach("choice-list-summaries-390", {
    path,
    contentType: "image/png",
  });
});
