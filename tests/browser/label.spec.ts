import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/label/";

async function openLabel(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#label-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

function color(page: Page, value: string) {
  return page.evaluate((input) => {
    const probe = document.createElement("span");
    probe.style.color = input;
    document.body.append(probe);
    const result = getComputedStyle(probe).color;
    probe.remove();
    return result;
  }, value);
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["Light", "Dark"]) {
    for (const width of [390, 1440]) {
      test(`label ${theme} ${mode.toLowerCase()} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openLabel(page);
        await page.evaluate(
          (value) =>
            document.documentElement.setAttribute("data-sprout-theme", value),
          theme,
        );
        await chooseOption(page, "Color mode", mode);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const text = await color(page, "var(--sprout-text)");
        const muted = await color(page, "var(--sprout-muted)");
        const states = page.getByTestId("checkbox-states");
        await expect(
          states.locator("label", { hasText: /^Checked$/ }),
        ).toHaveCSS("color", text);
        await expect(
          states.locator("label", { hasText: /^Disabled$/ }),
        ).toHaveCSS("color", muted);
        for (const body of await demo.locator(".label-demo-card-body").all())
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        for (const label of await demo
          .locator('[data-slot="label"]:visible')
          .all())
          expect(
            await label.evaluate(
              (node) => node.scrollWidth <= node.clientWidth + 1,
            ),
          ).toBe(true);
        const results = await new AxeBuilder({ page })
          .include("#label-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const name = `label-${theme}-${mode.toLowerCase()}-${width}`;
        const path = testInfo.outputPath(`${name}.png`);
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(name, { path, contentType: "image/png" });
      });
    }
  }
}

test("labels keep compact type and spacing", async ({ page }) => {
  await openLabel(page);
  const label = example(page, "Above a control").getByText("Access", {
    exact: true,
  });
  await expect(label).toHaveCSS("font-size", "14px");
  await expect(label).toHaveCSS("font-weight", "500");
  await expect(label).toHaveCSS("line-height", "16px");
  await expect(label).toHaveCSS("user-select", "none");
  await expect(label).toHaveCSS("cursor", "default");
  const row = page
    .getByTestId("checkbox-grants")
    .locator("label", { hasText: "Run workflow" });
  await expect(row).toHaveCSS("display", "flex");
  await expect(row).toHaveCSS("column-gap", "8px");
  await expect(row).toHaveCSS("line-height", "20px");
  await expect(row).toHaveCSS("cursor", "pointer");
  const box = await row.locator('[role="checkbox"]').boundingBox();
  const textStart = await row.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node.lastChild!);
    return range.getBoundingClientRect().left;
  });
  expect(Math.round(textStart - (box!.x + box!.width))).toBe(8);
  for (const size of ["default", "sm"]) {
    const labels = page.getByTestId(`switch-${size}`).locator("label");
    await expect(labels).toHaveText(["Off", "On", "Disabled", "Disabled on"]);
    for (const item of await labels.all()) {
      await expect(item).toHaveCSS("font-size", "14px");
      await expect(item).toHaveCSS("column-gap", "8px");
    }
  }
  const stacked = example(page, "Wrapping a text control")
    .locator("label")
    .first();
  await expect(stacked).toHaveCSS("flex-direction", "column");
  await expect(stacked).toHaveCSS("row-gap", "6px");
  const area = await stacked.locator("textarea").boundingBox();
  const outer = await stacked.boundingBox();
  expect(Math.round(area!.width)).toBe(Math.round(outer!.width));
  await expect(stacked.locator("textarea")).toHaveCSS("font-weight", "400");
});

test("htmlFor moves focus to inputs, textareas, and select triggers", async ({
  page,
}) => {
  await openLabel(page);
  const card = example(page, "Above a control");
  await card.getByText("Workspace name", { exact: true }).click();
  await expect(card.getByLabel("Workspace name")).toBeFocused();
  await card.getByText("Instructions", { exact: true }).click();
  await expect(card.getByLabel("Instructions")).toBeFocused();
  await expect(card.getByRole("combobox", { name: "Access" })).toBeVisible();
  await chooseOption(page, "Access", "Owner");
  await expect(card.getByRole("combobox", { name: "Access" })).toHaveText(
    /Owner/,
  );
  const url = card.getByLabel("Workspace URL");
  await expect(url).toHaveAttribute("aria-invalid", "true");
  await expect(card.getByText("This URL is taken. Try another.")).toBeVisible();
  await url.fill("tulipfarm-ops");
  await expect(card.getByText("app.tulipfarm.ai/tulipfarm-ops")).toBeVisible();
  const filters = example(page, "Compact filters");
  for (const name of ["Type", "Owner", "Modified", "Sort"]) {
    const trigger = filters.getByRole("combobox", { name, exact: true });
    await expect(trigger).toHaveAttribute("data-size", "sm");
  }
  await chooseOption(page, "Modified", "Last 7 days");
  await expect(
    filters.getByRole("combobox", { name: "Modified", exact: true }),
  ).toHaveText(/Last 7 days/);
});

test("wrapping labels toggle checkboxes, switches, and radios", async ({
  page,
}) => {
  await openLabel(page);
  const grants = page.getByTestId("checkbox-grants");
  const manage = grants.getByRole("checkbox", {
    name: "Manage and share",
    exact: true,
  });
  await expect(manage).not.toBeChecked();
  await grants.getByText("Manage and share", { exact: true }).click();
  await expect(manage).toBeChecked();
  await expect(grants.getByRole("status")).toHaveText(
    "3 of 3 permissions granted",
  );
  await page.keyboard.press("Space");
  await expect(manage).not.toBeChecked();
  const mixed = page
    .getByTestId("checkbox-states")
    .getByRole("checkbox", { name: "Mixed" });
  await expect(mixed).toHaveAttribute("aria-checked", "mixed");
  const pause = example(page, "Wrapping a switch").getByRole("switch", {
    name: "Pause motion",
  });
  await page.getByText("Pause motion", { exact: true }).click();
  await expect(pause).toBeChecked();
  const radios = example(page, "Wrapping a radio");
  await radios.getByText("Daily", { exact: true }).click();
  await expect(radios.getByRole("radio", { name: "Daily" })).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(radios.getByRole("radio", { name: "Weekly" })).toBeChecked();
  await expect(
    radios.getByRole("radio", { name: "Unavailable" }),
  ).toBeDisabled();
});

test("keyboard reaches each control in order and labels stay out of the tab order", async ({
  page,
}) => {
  await openLabel(page);
  const grants = page.getByTestId("checkbox-grants");
  await grants.getByRole("checkbox", { name: "Run workflow" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    grants.getByRole("checkbox", { name: "Read definition" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    grants.getByRole("checkbox", { name: "Manage and share", exact: true }),
  ).toBeFocused();
  const focused = await page.evaluate(() =>
    document.activeElement?.getAttribute("role"),
  );
  expect(focused).toBe("checkbox");
  for (const label of await page.locator('[data-slot="label"]').all())
    expect(await label.evaluate((node) => node.tabIndex)).toBe(-1);
});

test("a confirmation beside its checkbox unlocks the action", async ({
  page,
}) => {
  await openLabel(page);
  const card = page.getByTestId("confirmations");
  const action = card.getByRole("button", { name: "Close workspace" });
  await expect(action).toBeDisabled();
  await card
    .getByText("I understand that workspace data is retained, not erased.")
    .click();
  await expect(
    card.getByRole("checkbox", {
      name: "I understand that workspace data is retained, not erased.",
    }),
  ).toBeChecked();
  await expect(action).toBeEnabled();
  const long = card.locator("label", { hasText: "full history" });
  await expect(long).toHaveCSS("line-height", "20px");
  expect((await long.boundingBox())!.height).toBeGreaterThanOrEqual(20);
  const locked = card.locator("label", { hasText: "Delete this integration" });
  await expect(locked).toHaveCSS("opacity", "0.5");
  await expect(locked).toHaveCSS("cursor", "not-allowed");
  const checkbox = card.getByRole("checkbox", {
    name: "Delete this integration and stop future use. This cannot be undone.",
  });
  await locked.click({ force: true });
  await expect(checkbox).not.toBeChecked();
});

test("disabled states follow the control", async ({ page }) => {
  await openLabel(page);
  const muted = await color(page, "var(--sprout-muted)");
  const states = page.getByTestId("checkbox-states");
  for (const name of ["Disabled", "Disabled checked"]) {
    const label = states.locator("label", { hasText: new RegExp(`^${name}$`) });
    await expect(label).toHaveCSS("color", muted);
    await expect(label).toHaveCSS("cursor", "not-allowed");
    await expect(label).toHaveCSS("opacity", "1");
  }
  const disabled = states.getByRole("checkbox", {
    name: "Disabled",
    exact: true,
  });
  await states.getByText("Disabled", { exact: true }).click({ force: true });
  await expect(disabled).not.toBeChecked();
  const team = example(page, "Above a control").getByText("Team name", {
    exact: true,
  });
  await expect(team).toHaveCSS("opacity", "0.5");
  await expect(page.getByTestId("closed-response").locator("label")).toHaveCSS(
    "color",
    muted,
  );
  const off = page
    .getByTestId("switch-sm")
    .locator("label", { hasText: /^Disabled on$/ });
  await expect(off).toHaveCSS("color", muted);
});

test("a locked field dims its labels and ignores clicks", async ({ page }) => {
  await openLabel(page);
  const fields = page.getByTestId("locked-fields");
  const cadence = fields.getByText("Check every, in minutes");
  await expect(cadence).toHaveCSS("opacity", "0.5");
  await expect(cadence).toHaveCSS("pointer-events", "none");
  await page.getByText("Saving heartbeat settings", { exact: true }).click();
  await expect(cadence).toHaveCSS("opacity", "1");
  await expect(cadence).toHaveCSS("pointer-events", "auto");
  await cadence.click();
  await expect(fields.getByLabel("Check every, in minutes")).toBeFocused();
  await expect(fields.getByLabel("Gmail query")).toBeEnabled();
});

test("hidden text and aria-labelledby name controls without visible text", async ({
  page,
}) => {
  await openLabel(page);
  const grid = example(page, "Visually hidden text");
  await expect(
    grid.getByRole("checkbox", { name: "Use Maya Chen" }),
  ).toBeChecked();
  const manage = grid.getByRole("checkbox", {
    name: "Manage Priya Raman-Lindqvist",
  });
  await expect(manage).toBeDisabled();
  const use = grid.getByRole("checkbox", { name: "Use Jordan Okafor" });
  await use.locator("..").click();
  await expect(use).not.toBeChecked();
  const custom = example(page, "Naming a custom control");
  const editor = custom.getByRole("textbox", { name: "Message text" });
  await custom.getByText("Message text", { exact: true }).click();
  await expect(editor).toBeFocused();
});

test("long names wrap inside narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openLabel(page);
  const grants = page.getByTestId("checkbox-grants");
  for (const text of [
    "Allow Platform Reliability and Incident Response to manage and share",
    "ops-automation-bot@tulipfarm-production-integrations.example",
  ]) {
    const label = grants.locator("label", { hasText: text });
    const card = await grants.boundingBox();
    const box = await label.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(card!.x + card!.width + 1);
    expect(box!.height).toBeGreaterThan(20);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("color and opacity changes respect reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openLabel(page);
  const label = page.locator('[data-slot="label"]').first();
  await expect(label).toHaveCSS("transition-duration", "0.12s, 0.12s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(label).toHaveCSS("transition-duration", "0s");
});
