import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/questionnaire/";

async function openQuestionnaire(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#questionnaire-demo");
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

function activeItem(form: Locator) {
  return form.locator('[data-slot="questionnaire-item"][data-active]');
}

function action(form: Locator, name: string) {
  return form
    .locator(`[data-slot="questionnaire-actions"]`)
    .getByRole("button", { name, exact: true });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`questionnaire ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openQuestionnaire(page);
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

        const letters = page.getByTestId("shortcuts-letters");
        const checked = letters.locator(
          '[data-slot="questionnaire-choice"][data-checked]',
        );
        await expect(checked).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-primary-subtle)"),
        );
        await expect(
          checked.locator('[data-slot="questionnaire-choice-indicator"]'),
        ).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-primary)"),
        );
        await expect(
          page
            .getByTestId("state-invalid")
            .locator('[data-slot="questionnaire-error"]'),
        ).toHaveCSS("color", await cssColor(page, "var(--sprout-danger)"));

        const overflowing = await demo
          .locator(
            ".questionnaire-demo-stage, .questionnaire-demo-panel, .sprout-questionnaire, .sprout-questionnaire-choice, .sprout-questionnaire-actions",
          )
          .evaluateAll((nodes) =>
            nodes
              .filter(
                (node) =>
                  (node as HTMLElement).offsetParent !== null &&
                  node.scrollWidth > node.clientWidth + 1,
              )
              .map(
                (node) =>
                  `${node.className}: ${node.scrollWidth}/${node.clientWidth}`,
              ),
          );
        expect(overflowing).toEqual([]);

        for (const row of await demo
          .locator(
            '[data-slot="questionnaire-item"][data-active] [data-slot="questionnaire-choice"]',
          )
          .all()) {
          const rect = (await row.boundingBox())!;
          expect(rect.height).toBeGreaterThanOrEqual(44);
          expect(rect.x + rect.width).toBeLessThanOrEqual(width);
        }
        if (width === 390) {
          for (const button of await demo
            .locator(".sprout-questionnaire-action:visible")
            .all()) {
            expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(
              44,
            );
          }
        }

        const results = await new AxeBuilder({ page })
          .include("#questionnaire-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(results.violations).toEqual([]);

        for (const id of [
          "questionnaire-playground",
          "questionnaire-shortcuts",
          "questionnaire-states",
          "questionnaire-sizes",
          "questionnaire-controlled",
        ]) {
          const path = testInfo.outputPath(
            `${id}-${theme}-${mode}-${width}.png`,
          );
          await page.getByTestId(id).screenshot({ path });
          await testInfo.attach(`${id}-${theme}-${mode}-${width}`, {
            path,
            contentType: "image/png",
          });
        }
      });
    }
  }
}

test("playground walks through, validates, skips, submits, and resets", async ({
  page,
}, testInfo) => {
  await openQuestionnaire(page);
  const frame = page.getByTestId("questionnaire-playground");
  const form = frame.locator("form");
  const progress = form.getByRole("progressbar");
  await expect(progress).toHaveText("Question 1 of 3");
  await expect(progress).toHaveAttribute("aria-valuenow", "1");
  await expect(action(form, "Previous")).toBeHidden();
  await expect(action(form, "Skip")).toBeHidden();
  await expect(action(form, "Submit")).toBeHidden();

  await action(form, "Next").click();
  const error = activeItem(form).locator('[data-slot="questionnaire-error"]');
  await expect(error).toHaveText("Choose a reply style.");
  await expect(error).toHaveAttribute("role", "alert");
  await expect(activeItem(form)).toHaveAttribute("data-invalid", "");
  await expect(
    form.getByRole("radio", { name: /Short answers/ }),
  ).toBeFocused();
  await expect(progress).toHaveText("Question 1 of 3");
  const errorPath = testInfo.outputPath("questionnaire-required-error.png");
  await frame.screenshot({ path: errorPath });
  await testInfo.attach("questionnaire-required-error", {
    path: errorPath,
    contentType: "image/png",
  });

  await form.getByRole("radio", { name: /Detailed answers/ }).click();
  await expect(error).toBeHidden();
  await expect(activeItem(form)).toHaveAttribute("data-status", "answered");
  await action(form, "Next").click();
  await expect(progress).toHaveText("Question 2 of 3");
  await expect(activeItem(form)).toBeFocused();
  await expect(action(form, "Skip")).toBeVisible();
  await expect(action(form, "Previous")).toBeVisible();

  await action(form, "Previous").click();
  await expect(progress).toHaveText("Question 1 of 3");
  await expect(
    form.getByRole("radio", { name: /Detailed answers/ }),
  ).toBeChecked();
  await action(form, "Next").click();

  await form.getByRole("checkbox", { name: "Tulips" }).check();
  await form.getByRole("checkbox", { name: "Daisies" }).check();
  await action(form, "Next").click();
  await expect(progress).toHaveText("Question 3 of 3");
  await expect(action(form, "Next")).toBeHidden();
  await expect(action(form, "Submit")).toBeVisible();
  await expect(action(form, "Submit")).toHaveAttribute("type", "submit");

  await form
    .getByRole("textbox", { name: "Additional note" })
    .fill("Plant near the fence");
  await action(form, "Submit").click();
  await expect(form.getByRole("status")).toHaveText(
    "Answers received locally.",
  );
  const answers = frame.getByTestId("answers");
  await expect(answers).toContainText("style");
  await expect(answers).toContainText("detailed");
  await expect(answers).toContainText("tulips, daisies");
  await expect(answers).toContainText("Plant near the fence");
  const donePath = testInfo.outputPath("questionnaire-submitted.png");
  await frame.screenshot({ path: donePath });
  await testInfo.attach("questionnaire-submitted", {
    path: donePath,
    contentType: "image/png",
  });

  await form.getByRole("button", { name: "Restart sample" }).click();
  await expect(progress).toHaveText("Question 1 of 3");
  await expect(form.getByRole("status")).toHaveText(
    "Complete the sample questions.",
  );
  await expect(answers).toHaveCount(0);
  await expect(
    form.getByRole("radio", { name: /Detailed answers/ }),
  ).not.toBeChecked();

  await form.getByRole("radio", { name: /Short answers/ }).click();
  await action(form, "Next").click();
  await action(form, "Skip").click();
  await expect(progress).toHaveText("Question 3 of 3");
  await action(form, "Previous").click();
  await expect(activeItem(form)).toHaveAttribute("data-status", "skipped");
  await action(form, "Next").click();
  await action(form, "Skip").click();
  await expect(answers).toContainText("short");
  await expect(answers).not.toContainText("tulips");
  await expect(answers).not.toContainText("note");
});

test("keyboard moves between answers and steps", async ({ page }) => {
  await openQuestionnaire(page);
  const form = page.getByTestId("questionnaire-playground").locator("form");
  const progress = form.getByRole("progressbar");
  const short = form.getByRole("radio", { name: /Short answers/ });
  await short.focus();
  await page.keyboard.press("Enter");
  await expect(progress).toHaveText("Question 1 of 3");
  await page.keyboard.press("Space");
  await expect(short).toBeChecked();
  await page.keyboard.press("ArrowDown");
  await expect(
    form.getByRole("radio", { name: /Detailed answers/ }),
  ).toBeChecked();
  await expect(
    form.getByRole("radio", { name: /Detailed answers/ }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(progress).toHaveText("Question 2 of 3");

  await page.keyboard.press("ArrowLeft");
  await expect(progress).toHaveText("Question 1 of 3");
  await activeItem(form).focus();
  await page.keyboard.press("ArrowRight");
  await expect(progress).toHaveText("Question 2 of 3");

  const tulips = form.getByRole("checkbox", { name: "Tulips" });
  await tulips.focus();
  await expect(
    form
      .locator('[data-slot="questionnaire-choice"]')
      .filter({ hasText: "Tulips" }),
  ).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("ArrowDown");
  await expect(form.getByRole("checkbox", { name: "Daisies" })).toBeFocused();
  await expect(
    form.getByRole("checkbox", { name: "Daisies" }),
  ).not.toBeChecked();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowUp");
  await expect(tulips).toBeFocused();
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(progress).toHaveText("Question 3 of 3");

  const note = form.getByRole("textbox", { name: "Additional note" });
  await note.focus();
  await page.keyboard.type("Shade");
  await page.keyboard.press("ArrowLeft");
  await expect(progress).toHaveText("Question 3 of 3");
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(
    page.getByTestId("questionnaire-playground").getByTestId("answers"),
  ).toContainText("Shade");
});

test("letter and number shortcuts pick choices in order", async ({ page }) => {
  await openQuestionnaire(page);
  const letters = page.getByTestId("shortcuts-letters");
  const badges = letters.locator(
    '[data-active] [data-slot="questionnaire-choice-shortcut"]',
  );
  await expect(badges).toHaveText(["A", "B", "C"]);
  const deep = letters.getByRole("radio", { name: /Deep research/ });
  await expect(deep).toBeDisabled();
  await expect(letters.getByRole("radio", { name: /Balanced/ })).toBeChecked();
  await expect(
    letters.getByRole("radio", { name: /Custom model/ }),
  ).toHaveAttribute("aria-keyshortcuts", /C/);

  await letters.getByRole("radio", { name: /Fast/ }).focus();
  await page.keyboard.press("c");
  await expect(
    letters.getByRole("radio", { name: /Custom model/ }),
  ).toBeChecked();
  await expect(
    letters.getByRole("radio", { name: /Custom model/ }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(letters.getByRole("progressbar")).toHaveText("Question 2 of 2");
  await page.keyboard.press("a");
  await page.keyboard.press("c");
  await expect(
    letters.getByRole("checkbox", { name: "Shared drive" }),
  ).toBeChecked();
  await expect(
    letters.getByRole("checkbox", { name: "The web" }),
  ).toBeChecked();
  await expect(action(letters, "Save setup")).toBeVisible();
  await page.keyboard.press("Enter");
  const lettersAnswers = page
    .getByTestId("questionnaire-shortcuts")
    .getByTestId("answers")
    .first();
  await expect(lettersAnswers).toContainText("custom");
  await expect(lettersAnswers).toContainText("drive, web");

  const numbers = page.getByTestId("shortcuts-numbers");
  await expect(
    numbers.locator('[data-slot="questionnaire-choice-shortcut"]'),
  ).toHaveText(["1", "2", "3"]);
  await expect(numbers.getByRole("progressbar")).toHaveText("Question 1 of 1");
  await expect(action(numbers, "Skip")).toBeHidden();
  await numbers.getByRole("radio", { name: "Spring" }).focus();
  await page.keyboard.press("3");
  await expect(numbers.getByRole("radio", { name: "Autumn" })).toBeChecked();
  await page.keyboard.press("Enter");
  await expect(
    page.getByTestId("questionnaire-shortcuts").getByTestId("answers").last(),
  ).toContainText("autumn");
});

test("states cover invalid, disabled items, typed email, and one optional question", async ({
  page,
}, testInfo) => {
  await openQuestionnaire(page);
  const invalid = page.getByTestId("state-invalid");
  const invalidItem = invalid.locator('[data-slot="questionnaire-item"]');
  await expect(invalidItem).toHaveAttribute("data-invalid", "");
  await expect(invalid.getByRole("alert")).toHaveText(
    "Pick a supplier that is still open.",
  );
  await expect(
    invalid.getByRole("group", { name: "Who supplies the bulbs?" }),
  ).toHaveAccessibleDescription(/closed supplier.*Pick a supplier/);
  await expect(
    invalid.locator('[data-slot="questionnaire-progress"]'),
  ).toHaveCount(0);
  await invalid.getByRole("radio", { name: "Field & Stem" }).click();
  await expect(invalidItem).not.toHaveAttribute("data-invalid", "");
  await expect(invalid.getByRole("alert")).toHaveCount(0);

  const disabled = page.getByTestId("state-disabled");
  const progress = disabled.getByRole("progressbar");
  await expect(progress).toHaveText("Question 1 of 2");
  await expect(disabled.getByTestId("bed-status")).toHaveText(
    "First item: unanswered",
  );
  await disabled.getByRole("radio", { name: "Several beds" }).click();
  await expect(disabled.getByTestId("bed-status")).toHaveText(
    "First item: answered",
  );
  await action(disabled, "Next").click();
  await expect(progress).toHaveText("Question 2 of 2");
  await expect(
    disabled.getByRole("group", { name: "Greenhouse size" }),
  ).toBeHidden();
  await expect(action(disabled, "Skip")).toBeHidden();
  await action(disabled, "Submit").click();
  await expect(disabled.getByRole("alert")).toHaveText(
    "Enter an email to continue.",
  );
  await expect(disabled.getByRole("textbox", { name: "Email" })).toBeFocused();
  await disabled
    .getByRole("textbox", { name: "Email" })
    .fill("grower@example.com");
  await expect(disabled.getByRole("alert")).toHaveCount(0);
  await action(disabled, "Previous").click();
  await action(disabled, "Skip").click();
  await expect(disabled.getByTestId("bed-status")).toHaveText(
    "First item: skipped",
  );

  const single = page.getByTestId("state-single");
  await expect(single.getByRole("progressbar")).toHaveText("Question 1 of 1");
  await expect(action(single, "No reminders")).toBeVisible();
  await expect(action(single, "Set reminder")).toBeVisible();
  await expect(action(single, "Previous")).toHaveCount(0);

  const path = testInfo.outputPath("questionnaire-states-interacted.png");
  await page.getByTestId("questionnaire-states").screenshot({ path });
  await testInfo.attach("questionnaire-states-interacted", {
    path,
    contentType: "image/png",
  });
});

test("action sizes and controlled step", async ({ page }) => {
  await openQuestionnaire(page);
  const regular = page.getByTestId("size-default");
  const small = page.getByTestId("size-sm");
  const fontSize = (locator: Locator) =>
    locator.evaluate((node) =>
      Number.parseFloat(getComputedStyle(node).fontSize),
    );
  expect(await fontSize(action(small, "Next"))).toBeLessThan(
    await fontSize(action(regular, "Next")),
  );
  await expect(action(regular, "Next")).toHaveClass(
    /sprout-button-size-default/,
  );
  await expect(action(small, "Next")).toHaveClass(/sprout-button-size-sm/);
  await action(small, "Skip").click();
  await expect(action(small, "Previous")).toHaveClass(
    /sprout-button-variant-ghost/,
  );
  await expect(action(small, "Submit")).toHaveClass(/sprout-button-size-sm/);
  await action(regular, "Skip").click();
  await expect(action(regular, "Previous")).toHaveClass(
    /sprout-button-variant-outline/,
  );

  const controlled = page.getByTestId("questionnaire-controlled");
  const step = controlled.getByTestId("current-step");
  await expect(step).toHaveText("Current step: goal");
  await controlled.getByRole("button", { name: "Jump to space" }).click();
  await expect(step).toHaveText("Current step: space");
  await expect(
    controlled.getByRole("group", { name: "How much space is there?" }),
  ).toBeVisible();
  await action(controlled, "Previous").click();
  await expect(step).toHaveText("Current step: goal");
  await action(controlled, "Next").click();
  await expect(step).toHaveText("Current step: goal");
  await controlled.getByRole("radio", { name: "Cut flowers" }).click();
  await action(controlled, "Next").click();
  await expect(step).toHaveText("Current step: space");
  await controlled.getByRole("button", { name: "Back to goal" }).click();
  await expect(
    controlled.getByRole("group", { name: "What is the garden for?" }),
  ).toBeVisible();
});

test("motion is subtle and turns off for reduced motion", async ({ page }) => {
  await openQuestionnaire(page);
  const choice = page
    .getByTestId("questionnaire-playground")
    .locator('[data-slot="questionnaire-choice"]')
    .first();
  const duration = await choice.evaluate(
    (node) => getComputedStyle(node).transitionDuration,
  );
  const seconds = duration.split(",").map((value) => Number.parseFloat(value));
  expect(Math.max(...seconds)).toBeGreaterThanOrEqual(0.12);
  expect(Math.max(...seconds)).toBeLessThanOrEqual(0.18);

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await choice.evaluate(
    (node) => getComputedStyle(node).transitionDuration,
  );
  expect(
    reduced.split(",").every((value) => Number.parseFloat(value) === 0),
  ).toBe(true);
});
