import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/textarea/";

async function openTextarea(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#textarea-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
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

async function height(locator: ReturnType<Page["locator"]>) {
  return (await locator.boundingBox())!.height;
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`textarea ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openTextarea(page);
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
        const filled = page
          .getByTestId("variant-default")
          .getByLabel("Instructions", { exact: true });
        await expect(filled).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-surface)"),
        );
        await expect(filled).toHaveCSS(
          "border-top-color",
          await cssColor(page, "var(--sprout-input)"),
        );
        await expect(filled).toHaveCSS(
          "color",
          await cssColor(page, "var(--sprout-text)"),
        );
        for (const body of await demo
          .locator(".textarea-demo-card-body")
          .all()) {
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        }
        for (const area of await demo.locator("textarea:visible").all()) {
          const box = await area.boundingBox();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(width);
          // Text never overflows sideways; long words wrap.
          expect(
            await area.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        }
        const results = await new AxeBuilder({ page })
          .include("#textarea-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await page.mouse.move(0, 0);
        const path = testInfo.outputPath(
          `textarea-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`textarea-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("variants render at Cloud dimensions", async ({ page }, testInfo) => {
  await openTextarea(page);
  const area = page
    .getByTestId("variant-default")
    .getByLabel("Instructions", { exact: true });
  await expect(area).toHaveAttribute("data-slot", "textarea");
  await expect(area).toHaveAttribute("data-variant", "default");
  await expect(area).toHaveCSS("font-size", "14px");
  await expect(area).toHaveCSS("line-height", "20px");
  await expect(area).toHaveCSS("padding-top", "8px");
  await expect(area).toHaveCSS("padding-left", "10px");
  await expect(area).toHaveCSS("border-top-width", "1px");
  await expect(area).toHaveCSS("resize", "vertical");
  await expect(area).toHaveAttribute("aria-required", "true");
  await expect(area).toHaveAttribute("maxlength", "32000");
  await expect(area).toHaveAccessibleDescription(/Describe its role/);
  await area.fill("Answer HR policy questions.");
  await expect(page.getByTestId("variant-default")).toContainText(
    "27 / 32,000",
  );

  const composer = page.getByTestId("composer");
  const draft = composer.getByLabel("Draft message");
  await expect(draft).toHaveAttribute("data-variant", "embedded");
  await expect(draft).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
  await expect(draft).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(draft).toHaveCSS("resize", "none");
  await expect(draft).toHaveCSS("padding-left", "10px");
  const send = composer.getByRole("button", { name: "Send" });
  await expect(send).toBeDisabled();
  await composer.locator(".textarea-demo-composer-title").click();
  await expect(draft).toBeFocused();
  await page.keyboard.type("Can you share the travel policy?");
  await expect(draft).toHaveCSS("outline-style", "none");
  await expect(composer).toHaveCSS("outline-width", "1px");
  await expect(composer).toHaveCSS(
    "border-top-color",
    await cssColor(page, "var(--sprout-border)"),
  );
  await send.click();
  await expect(draft).toHaveValue("");
  await expect(page.getByTestId("variant-embedded")).toContainText(
    "Draft example sent locally.",
  );
  const shot = await example(page, "Variants").screenshot({
    animations: "disabled",
  });
  await testInfo.attach("textarea-variants", {
    body: shot,
    contentType: "image/png",
  });
});

test("rows set the starting height and content grows it", async ({ page }) => {
  await openTextarea(page);
  const expected: Record<string, number> = {
    auto: 96,
    "3": 96,
    "5": 118,
    "9": 198,
    "10": 218,
    "12": 258,
  };
  for (const [rows, px] of Object.entries(expected)) {
    const area = page.getByTestId(`rows-${rows}`).locator("textarea");
    if (rows !== "auto") await expect(area).toHaveAttribute("rows", rows);
    await area.fill("");
    expect(Math.round(await height(area))).toBe(px);
  }
  const notes = page.getByTestId("rows-auto").locator("textarea");
  await notes.fill(
    Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`).join("\n"),
  );
  // Ten 20px lines plus 16px padding and 2px border.
  expect(Math.round(await height(notes))).toBe(218);
  await notes.fill("Short");
  expect(Math.round(await height(notes))).toBe(96);
  await notes.fill("x".repeat(400));
  expect(
    await notes.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
});

test("states: placeholder, read-only, saving, disabled, invalid", async ({
  page,
}) => {
  await openTextarea(page);
  const states = page.getByTestId("states");
  const answer = states.getByLabel("Your answer");
  await expect(answer).toHaveAttribute("placeholder", "Type your answer…");
  await expect(answer).toHaveCSS(
    "color",
    await cssColor(page, "var(--sprout-text)"),
  );

  const readOnly = states.getByLabel("Instructions to send your administrator");
  await expect(readOnly).toHaveAttribute("readonly", "");
  await readOnly.focus();
  await expect(readOnly).toBeFocused();
  expect(
    await readOnly.evaluate(
      (node: HTMLTextAreaElement) => node.selectionEnd - node.selectionStart,
    ),
  ).toBeGreaterThan(20);
  await page.keyboard.type("x");
  await expect(readOnly).not.toHaveValue(/x$/);

  const description = states.getByLabel("Description (optional)");
  await expect(description).toHaveAccessibleDescription(
    "Up to 1,000 characters.",
  );
  await states.getByRole("button", { name: "Simulate saving" }).click();
  await expect(description).toHaveAttribute("readonly", "");
  await expect(description).toHaveAttribute("aria-busy", "true");
  await description.focus();
  await expect(description).toBeFocused();
  await states.getByRole("button", { name: "Finish saving" }).click();
  await expect(description).not.toHaveAttribute("readonly", "");

  const disabled = states.getByLabel("Processing instructions");
  await expect(disabled).toBeDisabled();
  await expect(disabled).toHaveCSS("opacity", "0.5");
  await expect(disabled).toHaveCSS("cursor", "not-allowed");
  await expect(disabled).toHaveCSS(
    "background-color",
    await cssColor(page, "var(--sprout-hover)"),
  );

  const invalid = states.getByLabel("Request", { exact: true });
  await expect(invalid).toHaveAttribute("aria-invalid", "true");
  await expect(invalid).toHaveAccessibleDescription("Enter a request.");
  await expect(invalid).toHaveCSS(
    "border-top-color",
    await cssColor(page, "var(--sprout-danger)"),
  );
  await invalid.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(invalid).toHaveCSS(
    "outline-color",
    await cssColor(page, "var(--sprout-danger)"),
  );
});

test("labels, descriptions, and disabled fieldsets", async ({ page }) => {
  await openTextarea(page);
  const described = page.getByTestId("described");
  const issue = described.getByLabel("Issue description", { exact: true });
  await expect(issue).toHaveAttribute("aria-invalid", "true");
  await expect(issue).toHaveAccessibleDescription(
    /Plain text\. Jira converts line breaks\. Enter a summary\./,
  );
  await issue.fill("Printer on floor 3 is offline.");
  await expect(issue).toHaveAttribute("aria-invalid", "false");
  await described
    .getByRole("checkbox", { name: "Include issue description" })
    .click();
  await expect(issue).toBeDisabled();

  const wrapped = page.getByTestId("wrapped").getByLabel("Decision or comment");
  await wrapped.fill("Approved for Q4.");
  await expect(wrapped).toHaveValue("Approved for Q4.");

  const fieldset = page.getByTestId("fieldset");
  const run = fieldset.getByLabel("Request to review");
  await expect(run).toBeDisabled();
  await expect(run).toHaveCSS("opacity", "0.5");
  await page.getByRole("button", { name: "Grant run permission" }).click();
  await expect(run).toBeEnabled();
  await run.fill("Renew the Figma contract for 45 seats.");
  await expect(run).toHaveValue("Renew the Figma contract for 45 seats.");
});

test("keyboard: Tab focus ring, Enter adds lines, mod+Enter submits", async ({
  page,
}) => {
  await openTextarea(page);
  const rsql = page.getByTestId("rsql");
  const query = rsql.getByLabel("RSQL query");
  await expect(query).toHaveAttribute("spellcheck", "false");
  await expect(query).toHaveCSS("font-family", /monospace/);
  await query.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(query).toBeFocused();
  await expect(query).toHaveCSS("outline-width", "1px");
  await expect(query).toHaveCSS("outline-offset", "0px");
  await expect(query).toHaveCSS("outline-color", "rgba(0, 0, 0, 0)");
  await query.evaluate((node: HTMLTextAreaElement) =>
    node.setSelectionRange(node.value.length, node.value.length),
  );
  await page.keyboard.press("Enter");
  await page.keyboard.type("and team==Ops");
  await expect(rsql).toContainText("No filter applied.");
  await expect(query).toHaveValue(/\nand team==Ops$/);
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(rsql.getByRole("status")).toContainText("Applied: status==Open");
  await expect(query).toHaveValue(/\nand team==Ops$/);

  const search = page.getByTestId("ai-search");
  const prompt = search.getByLabel("Describe the rows you want");
  await expect(
    search.getByRole("button", { name: "Build search" }),
  ).toBeDisabled();
  await prompt.fill("open urgent tickets from last week");
  await expect(search).toContainText("34/2000");
  await prompt.press("ControlOrMeta+Enter");
  await expect(prompt).toBeDisabled();
  await expect(
    search.getByRole("button", { name: "Building search…" }),
  ).toHaveAttribute("aria-busy", "true");
  await search.getByRole("button", { name: "Cancel" }).click();
  await expect(prompt).toBeEnabled();
  await expect(search.getByRole("status")).toHaveText("No search built.");
  await prompt.press("ControlOrMeta+Enter");
  await expect(search.getByRole("status")).toHaveText(
    "Applied: open urgent tickets from last week",
  );
  await expect(prompt).toBeEnabled();
});

test("required textarea joins form validation and locks while saving", async ({
  page,
}) => {
  await openTextarea(page);
  const form = page.getByTestId("knowledge-form");
  const text = form.getByLabel("Text", { exact: true });
  await expect(text).toHaveAttribute("rows", "10");
  expect(Math.round(await height(text))).toBe(218);
  await form.getByRole("button", { name: "Add text" }).click();
  expect(
    await text.evaluate(
      (node: HTMLTextAreaElement) => node.validity.valueMissing,
    ),
  ).toBe(true);
  await text.fill("Launch is October 30. Press embargo lifts at 9am PT.");
  await form.getByRole("button", { name: "Add text" }).click();
  await expect(text).toBeDisabled();
  await expect(form.getByRole("button", { name: "Adding…" })).toBeDisabled();
  await expect(form.getByRole("status")).toHaveText(
    "Added to project knowledge.",
  );
  await expect(text).toBeEnabled();
  await expect(text).toHaveValue("");
});

test("reduced motion removes the color transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openTextarea(page);
  const area = page.getByTestId("states").getByLabel("Your answer");
  await expect(area).toHaveCSS("transition-duration", "0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(area).toHaveCSS("transition-duration", /^0\.12s/);
});

test("docs navigation links Textarea", async ({ page }) => {
  await openTextarea(page);
  const link = page
    .getByRole("navigation", { name: "Documentation" })
    .getByRole("link", { name: "Textarea", exact: true });
  await expect(link).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#textarea-demo select")).toHaveCount(0);
});
