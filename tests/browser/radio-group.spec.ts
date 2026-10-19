import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/radio-group/";

async function openRadioGroup(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#radio-group-demo");
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

test("the docs nav links to Radio Group", async ({ page }) => {
  await openRadioGroup(page);
  const link = page
    .getByRole("link", { name: "Radio Group", exact: true })
    .first();
  await expect(link).toHaveAttribute("href", route);
  await expect(
    page.getByRole("heading", { level: 1, name: "Radio Group" }),
  ).toBeVisible();
});

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`radio group ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openRadioGroup(page);
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
        const checked = page.getByTestId("sample-checked").getByRole("radio");
        await expect(checked).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-primary)"),
        );
        await expect(
          checked.locator('[data-slot="radio-group-indicator"]'),
        ).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-on-primary)"),
        );
        const overflowing = await demo
          .locator(
            ".radio-group-demo-card-body, .radio-group-demo-panel, .sprout-choice-option",
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
        for (const radio of await demo.getByRole("radio").all()) {
          const rect = await radio.boundingBox();
          expect(rect!.width).toBeCloseTo(16, 0);
          expect(rect!.height).toBeCloseTo(16, 0);
          expect(rect!.x).toBeGreaterThanOrEqual(0);
          expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
        }
        const results = await new AxeBuilder({ page })
          .include("#radio-group-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await page.mouse.move(0, 0);
        const path = testInfo.outputPath(
          `radio-group-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`radio-group-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("states render Cloud's look", async ({ page }, testInfo) => {
  await openRadioGroup(page);
  const radio = (state: string) =>
    page.getByTestId(`sample-${state}`).getByRole("radio");
  const off = radio("unchecked");
  await expect(off).toHaveAttribute("aria-checked", "false");
  await expect(off).toHaveCSS("border-radius", "999px");
  await expect(off).toHaveCSS(
    "border-top-color",
    await cssColor(page, "var(--sprout-border)"),
  );
  await expect(off).toHaveCSS(
    "background-color",
    await cssColor(page, "var(--sprout-surface)"),
  );
  const on = radio("checked");
  await expect(on).toHaveAttribute("aria-checked", "true");
  const dot = on.locator('[data-slot="radio-group-indicator"]');
  await expect(dot).toHaveCSS("width", "8px");
  await expect(dot).toHaveCSS("height", "8px");
  for (const state of ["disabled", "disabled-checked"]) {
    await expect(radio(state)).toHaveAttribute("aria-disabled", "true");
    await expect(radio(state)).toHaveCSS("opacity", "0.5");
    await expect(radio(state)).toHaveCSS("cursor", "not-allowed");
  }
  await expect(radio("disabled-checked")).toHaveAttribute(
    "aria-checked",
    "true",
  );
  const disabled = radio("disabled");
  await disabled.click({ force: true });
  await expect(disabled).toHaveAttribute("aria-checked", "false");
  const invalid = radio("invalid");
  await expect(invalid).toHaveAttribute("aria-invalid", "true");
  await expect(invalid).toHaveCSS(
    "border-top-color",
    await cssColor(page, "var(--sprout-danger)"),
  );
  await expect(invalid).not.toHaveCSS("box-shadow", "none");
  const invalidChecked = radio("invalid-checked");
  await expect(invalidChecked).toHaveCSS(
    "border-top-color",
    await cssColor(page, "var(--sprout-primary)"),
  );
  await expect(invalidChecked).not.toHaveCSS("box-shadow", "none");
  const shot = await example(page, "States").screenshot({
    animations: "disabled",
  });
  await testInfo.attach("radio-group-states", {
    body: shot,
    contentType: "image/png",
  });
});

test("labels select their radio and the hit area extends past the dot", async ({
  page,
}) => {
  await openRadioGroup(page);
  const group = example(page, "Labeled radios").getByRole("radiogroup", {
    name: "Digest frequency",
  });
  const daily = group.getByRole("radio", { name: "Daily" });
  const weekly = group.getByRole("radio", { name: "Weekly" });
  await expect(weekly).toHaveAttribute("aria-checked", "true");
  await group.getByText("Daily", { exact: true }).click();
  await expect(daily).toHaveAttribute("aria-checked", "true");
  await expect(weekly).toHaveAttribute("aria-checked", "false");
  const rect = await weekly.boundingBox();
  await page.mouse.click(rect!.x - 8, rect!.y + rect!.height / 2);
  await expect(weekly).toHaveAttribute("aria-checked", "true");
  await group.getByText("Unavailable").click({ force: true });
  await expect(
    group.getByRole("radio", { name: "Unavailable" }),
  ).toHaveAttribute("aria-checked", "false");
});

test("keyboard roves, selects, skips disabled, and shows a focus ring", async ({
  page,
}) => {
  await openRadioGroup(page);
  const group = example(page, "Labeled radios").getByRole("radiogroup", {
    name: "Digest frequency",
  });
  const daily = group.getByRole("radio", { name: "Daily" });
  const weekly = group.getByRole("radio", { name: "Weekly" });
  await weekly.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(weekly).toBeFocused();
  await expect(weekly).toHaveCSS("outline-style", "solid");
  await expect(weekly).toHaveCSS("outline-width", "1px");
  await expect(weekly).toHaveCSS(
    "outline-color",
    await cssColor(page, "var(--sprout-focus-ring)"),
  );
  // The disabled radio is skipped, so ArrowDown wraps to Daily.
  await page.keyboard.press("ArrowDown");
  await expect(daily).toBeFocused();
  await expect(daily).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowUp");
  await expect(weekly).toBeFocused();
  await expect(weekly).toHaveAttribute("aria-checked", "true");
  // Tab leaves the group in one step.
  await page.keyboard.press("Tab");
  expect(
    await group.evaluate((node) => node.contains(document.activeElement)),
  ).toBe(false);
});

test("a controlled group with legend, helper, descriptions, and error", async ({
  page,
}) => {
  await openRadioGroup(page);
  const card = example(page, "Legend, helper, and descriptions");
  const group = card.getByRole("radiogroup", { name: "When should it reply?" });
  await expect(group).toHaveAttribute("data-slot", "choice-group");
  await expect(group).toHaveAttribute("aria-required", "true");
  await expect(group).toHaveAccessibleDescription(
    "Slack starts this agent from its attached channels.",
  );
  const every = group.getByRole("radio", { name: "Every channel message" });
  await expect(every).toHaveAccessibleDescription(
    "Starts a reply for each new message. Applies to all attached channels.",
  );
  await every.click();
  await expect(card.getByTestId("reply-rule-value")).toHaveText(
    "Value: every-message",
  );
  await card.getByRole("button", { name: "Show error" }).click();
  await expect(group).toHaveAttribute("aria-invalid", "true");
  await expect(group).toHaveAccessibleDescription(
    "Slack starts this agent from its attached channels. Choose when this agent replies.",
  );
  await expect(every).not.toHaveCSS("box-shadow", "none");
  await group.getByRole("radio", { name: "When mentioned" }).press("Space");
  await expect(card.getByTestId("reply-rule-value")).toHaveText("Value: tag");
  await expect(group).not.toHaveAttribute("aria-invalid", "true");
  // The dot sits on the first 20px line of its label.
  const mention = group.getByRole("radio", { name: "When mentioned" });
  const dot = await mention.boundingBox();
  const text = await group.getByText("When mentioned").boundingBox();
  expect(Math.abs(dot!.y + 8 - (text!.y + 10))).toBeLessThanOrEqual(1.5);
});

test("Field choice rows use RadioGroup in list, columns, disabled, and error states", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openRadioGroup(page);
  const card = example(page, "Choice rows");
  const list = card.getByRole("radiogroup", { name: "List layout frequency" });
  await expect(list).toHaveClass(/sprout-radio-group/);
  await expect(list).toHaveAttribute("aria-required", "true");
  await expect(
    list.getByRole("radio", { name: "Daily" }),
  ).toHaveAccessibleDescription("Each morning");
  await expect(list.getByRole("radio", { name: "Monthly" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await list.getByText("Daily").click();
  await expect(list.getByRole("radio", { name: "Daily" })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  const workspace = card.getByRole("radiogroup", { name: "Workspace type" });
  const rows = workspace.locator('[data-slot="choice-option"]');
  const [first, second] = [
    await rows.nth(0).boundingBox(),
    await rows.nth(1).boundingBox(),
  ];
  expect(Math.abs(first!.y - second!.y)).toBeLessThanOrEqual(1);
  await workspace.getByRole("radio", { name: "Business" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(
    workspace.getByRole("radio", { name: "Personal" }),
  ).toHaveAttribute("aria-checked", "true");

  const locked = card
    .getByTestId("locked-group")
    .getByRole("radiogroup", { name: "Outgoing Slack identity" });
  await expect(locked).toHaveAttribute("aria-disabled", "true");
  const app = locked.getByRole("radio", { name: "Workspace app" });
  await app.click({ force: true });
  await expect(app).toHaveAttribute("aria-checked", "false");

  const errorGroup = card
    .getByTestId("error-group")
    .getByRole("radiogroup", { name: "Choose a published package link" });
  await expect(errorGroup).toHaveAttribute("aria-invalid", "true");
  await expect(
    card.getByText("Choose a package link to import."),
  ).toBeVisible();
  await errorGroup.getByText(/support-triage/).click();
  await expect(errorGroup).not.toHaveAttribute("aria-invalid", "true");
  const shot = await card.screenshot({ animations: "disabled" });
  await testInfo.attach("radio-group-choice-rows", {
    body: shot,
    contentType: "image/png",
  });
});

test("columns stack on mobile without overflow", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openRadioGroup(page);
  const workspace = example(page, "Choice rows").getByRole("radiogroup", {
    name: "Workspace type",
  });
  const rows = workspace.locator('[data-slot="choice-option"]');
  const [first, second] = [
    await rows.nth(0).boundingBox(),
    await rows.nth(1).boundingBox(),
  ];
  expect(second!.y).toBeGreaterThan(first!.y + first!.height - 1);
  const long = example(page, "Choice rows").getByText(
    /people-ops-weekly-update/,
  );
  const box = await long.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  const shot = await example(page, "Choice rows").screenshot({
    animations: "disabled",
  });
  await testInfo.attach("radio-group-choice-rows-mobile", {
    body: shot,
    contentType: "image/png",
  });
});

test("the dot animates in and stops for reduced motion", async ({ page }) => {
  await openRadioGroup(page);
  const radio = page.getByTestId("sample-unchecked").getByRole("radio");
  await expect(radio).toHaveCSS("transition-duration", /0\.12s/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(radio).toHaveCSS("transition-duration", "0s");
});
