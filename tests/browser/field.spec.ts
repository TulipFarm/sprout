import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/field/";

async function openField(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#field-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`field ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openField(page);
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
        for (const card of await demo.locator(".field-demo-card-body").all()) {
          expect(
            await card.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        }
        // Option rows and checkbox labels never spill past their container.
        for (const row of await demo
          .locator(".sprout-choice-option, .sprout-checkbox-field")
          .all()) {
          expect(
            await row.evaluate(
              (node) => node.scrollWidth <= node.clientWidth + 1,
            ),
          ).toBe(true);
        }
        const columns = example(page, "Choice groups")
          .locator('[data-layout="columns"]')
          .first();
        const template = await columns.evaluate(
          (node) =>
            getComputedStyle(node).gridTemplateColumns.split(" ").length,
        );
        expect(template).toBe(width >= 640 ? 2 : 1);
        const results = await new AxeBuilder({ page })
          .include("#field-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(`field-${theme}-${mode}-${width}.png`);
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`field-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("field labels, describes, and validates controls", async ({ page }) => {
  await openField(page);
  const form = example(page, "Agent details");
  const name = form.getByRole("textbox", { name: "Name", exact: true });
  await expect(name).toHaveAttribute("aria-required", "true");
  await expect(name).not.toHaveAttribute("aria-invalid", "true");

  await form.getByText("Name", { exact: true }).click();
  await expect(name).toBeFocused();

  const model = form.getByRole("combobox", { name: "Model" });
  await expect(model).toHaveAccessibleDescription(
    "Agents use the workspace default unless you pick one. Optional",
  );
  const instructions = form.getByRole("textbox", { name: "Instructions" });
  await expect(instructions).toHaveAccessibleDescription(
    /Tell the agent what to do and when to ask for help\. \d+ \/ 8,000/,
  );
  await instructions.fill("Draft replies.");
  await expect(form.getByText("14 / 8,000")).toBeVisible();

  await form
    .getByRole("spinbutton", { name: "Max tool calls per run" })
    .fill("99");
  await form.getByRole("button", { name: "Save agent" }).click();
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription(
    "Enter a name for this agent.",
  );
  await expect(form.getByText("Use a number from 1 to 50.")).toBeVisible();

  await name.fill("Support triage");
  await expect(name).not.toHaveAttribute("aria-invalid", "true");
  await form.getByRole("button", { name: "Save agent" }).click();
  await expect(
    form.getByRole("spinbutton", { name: "Max tool calls per run" }),
  ).toBeFocused();

  await model.click();
  await page.getByRole("option", { name: "Claude Sonnet" }).click();
  await expect(model).toHaveText("Claude Sonnet");
});

test("choice groups support keyboard, descriptions, and disabled options", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openField(page);
  const section = example(page, "Choice groups");

  const reply = section.getByRole("radiogroup", { name: "Reply mode" });
  await expect(reply).toHaveAttribute("aria-required", "true");
  const thread = reply.getByRole("radio", { name: "Reply in thread" });
  await expect(thread).toBeChecked();
  await expect(thread).toHaveAccessibleDescription(
    "Keeps the channel tidy. Best for busy channels.",
  );
  await thread.focus();
  await page.keyboard.press("ArrowDown");
  const channel = reply.getByRole("radio", { name: "Reply in channel" });
  await expect(channel).toBeChecked();
  await expect(channel).toBeFocused();
  await expect(
    reply.getByRole("radio", { name: "Direct message" }),
  ).toBeDisabled();
  await section.getByText("Every month", { exact: true }).click();
  await expect(
    section.getByRole("radio", { name: "Every month" }),
  ).toBeChecked();

  const tools = section.getByRole("group", { name: "Tools" });
  await expect(tools).toHaveAccessibleDescription(
    "The agent can only use the tools you turn on. Optional",
  );
  await expect(tools.getByText("Changes data")).toBeVisible();
  const search = tools.getByRole("checkbox", { name: "Search tickets" });
  await expect(search).toBeChecked();
  await search.focus();
  await page.keyboard.press("Space");
  await expect(search).not.toBeChecked();
  await expect(search).toHaveCSS("outline-style", "solid");
  await tools.getByRole("checkbox", { name: "Update tickets" }).click();
  await expect(tools.getByText("Changes data")).toHaveCount(0);
  await expect(tools.getByText("Turn on at least one tool.")).toBeVisible();
  await expect(
    tools.getByRole("checkbox", { name: "Delete tickets" }),
  ).toBeDisabled();
  // The whole row is the hit area, including the description.
  await tools
    .getByText("Sends from support@meadow.dev.")
    .click({ force: true });
  await expect(
    tools.getByRole("checkbox", { name: "Send email replies" }),
  ).toBeChecked();
  await expect(tools.getByText("Changes data")).toBeVisible();

  const skills = section.getByRole("group", { name: "Skills to import" });
  await expect(skills.getByText("Pick at least one skill.")).toBeVisible();
  await skills.getByRole("checkbox", { name: "Ticket triage" }).click();
  await expect(skills.getByText("Pick at least one skill.")).toHaveCount(0);
});

test("checkbox fields toggle by label and show both variants", async ({
  page,
}) => {
  await openField(page);
  const section = example(page, "Checkbox fields");
  const allDay = section.getByRole("checkbox", { name: "All day" });
  await section.getByText("All day", { exact: true }).click();
  await expect(allDay).toBeChecked();
  await allDay.press("Space");
  await expect(allDay).not.toBeChecked();

  const notify = section.getByRole("checkbox", {
    name: "Notify me when it runs",
  });
  await expect(notify).toHaveAccessibleDescription(
    "Sends a Slack message to you after each run.",
  );
  const consent = section.getByRole("checkbox", {
    name: /I authorize TulipFarm/,
  });
  await expect(consent).toHaveAttribute("aria-invalid", "true");
  await consent.click();
  await expect(consent).not.toHaveAttribute("aria-invalid", "true");
  await expect(
    section.getByRole("checkbox", { name: "Share with the whole workspace" }),
  ).toBeDisabled();

  const neutral = section
    .getByTestId("checkbox-neutral")
    .getByRole("checkbox", { name: "Team calendar" });
  await expect(neutral).toHaveAttribute("data-variant", "neutral");
  const fill = await neutral.evaluate(
    (node) => getComputedStyle(node).backgroundColor,
  );
  const text = await neutral.evaluate(
    (node) => getComputedStyle(node.closest(".sprout-checkbox-field")!).color,
  );
  expect(fill).toBe(text);
  await expect(
    section.getByRole("checkbox", { name: "Archived calendar" }),
  ).toBeDisabled();
});

test("FieldsDisabled locks a form until saving stops", async ({ page }) => {
  await openField(page);
  const section = example(page, "Disabled and locked");
  const provider = section.getByRole("combobox", { name: "Provider" });
  const notes = section.getByRole("textbox", { name: "Notes" });
  const pin = section.getByRole("checkbox", { name: "Pin to the model list" });
  const onlyMe = section.getByRole("radio", { name: "Only me" });
  await expect(provider).toBeDisabled();
  await expect(notes).toBeDisabled();
  await expect(pin).toBeDisabled();
  await expect(onlyMe).toBeDisabled();

  await section.getByRole("button", { name: "Stop saving" }).click();
  await expect(provider).toBeEnabled();
  await expect(notes).toBeEnabled();
  await expect(pin).toBeEnabled();
  await expect(onlyMe).toBeEnabled();
  const model = section.getByRole("textbox", { name: "Model" });
  await expect(model).toBeDisabled();
  await expect(model).toHaveAccessibleDescription(
    "Pick a provider first. Optional",
  );

  await chooseOption(page, "Provider", "Anthropic");
  await expect(model).toBeEnabled();
  await expect(model).toHaveAccessibleDescription(
    "Leave empty to use the provider default. Optional",
  );
});

test("screen reader labels and custom controls join their field", async ({
  page,
}) => {
  await openField(page);
  const hidden = example(page, "Screen reader labels");
  const second = hidden.getByRole("textbox", { name: "Email 2" });
  await expect(second).toHaveAttribute("aria-invalid", "true");
  await expect(second).toHaveAccessibleDescription(
    "Email 2 needs a full domain.",
  );
  await expect(
    hidden.getByText("Email 1", { exact: true }),
  ).not.toBeInViewport();
  await expect(
    hidden.getByRole("combobox", { name: "Repository owner" }),
  ).toBeVisible();
  await expect(
    hidden.getByRole("group", { name: "Repositories" }).getByRole("checkbox"),
  ).toHaveCount(3);

  const custom = example(page, "Custom and wrapped controls");
  const credential = custom.getByRole("button", { name: "Credential" });
  await expect(credential).toHaveAttribute("aria-invalid", "true");
  await credential.click();
  await expect(credential).not.toHaveAttribute("aria-invalid", "true");
  await expect(credential).toHaveAccessibleDescription(
    "Sent as a bearer token on every request.",
  );
  const filter = custom.getByRole("textbox", { name: "Filter" });
  await expect(filter).toHaveAccessibleDescription(
    /Use AND and OR\. Strings need double quotes\. Optional \d+ \/ 2,000/,
  );
  await expect(
    custom.getByRole("combobox", { name: "Condition" }),
  ).toBeVisible();
  await expect(custom.getByLabel("Starts on")).toHaveAttribute("type", "date");
  await expect(custom.getByLabel("Run at")).toHaveAttribute("type", "time");
  await expect(custom.getByLabel("Run once on")).toHaveAttribute(
    "type",
    "datetime-local",
  );
  await expect(custom.getByLabel("Attachment")).toHaveAttribute("type", "file");
  await expect(
    custom.getByRole("textbox", { name: "What Bud remembers" }),
  ).toHaveAttribute("readonly", "");
  await expect(custom.locator('[data-slot="field-separator"]')).toHaveCount(2);

  const signIn = example(page, "Sign in");
  const email = signIn.getByRole("textbox", { name: "Work email" });
  await expect(email).toHaveAttribute("data-scale", "lg");
  await expect(email).toHaveCSS("height", "44px");
  await expect(signIn.getByText("or", { exact: true })).toBeVisible();
});

test("field motion follows reduced motion", async ({ page }) => {
  await openField(page);
  const box = example(page, "Checkbox fields").getByRole("checkbox", {
    name: "All day",
  });
  await expect(box).toHaveCSS("transition-duration", /0\.12s/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(box).toHaveCSS("transition-duration", "0s");
});

test("field options grow to 44px on touch screens", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 900 },
  });
  const page = await context.newPage();
  try {
    await openField(page);
    const row = example(page, "Choice groups")
      .locator(".sprout-choice-option")
      .first();
    const height = await row.evaluate(
      (node) => node.getBoundingClientRect().height,
    );
    expect(height).toBeGreaterThanOrEqual(44);
  } finally {
    await context.close();
  }
});
