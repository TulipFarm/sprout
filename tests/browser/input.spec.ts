import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/input/";

async function openInput(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#input-demo");
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

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`input ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openInput(page);
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
          .getByTestId("states-default")
          .getByLabel("Event title");
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
        for (const body of await demo.locator(".input-demo-card-body").all()) {
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        }
        // Every visible input stays inside the viewport.
        for (const input of await demo.locator("input:visible").all()) {
          const box = await input.boundingBox();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        }
        const results = await new AxeBuilder({ page })
          .include("#input-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await page.mouse.move(0, 0);
        const path = testInfo.outputPath(`input-${theme}-${mode}-${width}.png`);
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`input-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("scales render at Cloud dimensions", async ({ page }) => {
  await openInput(page);
  const specs = {
    default: {
      height: "32px",
      font: "14px",
      padding: "10px",
      labels: ["Agent name", "Slack channel"],
    },
    lg: {
      height: "44px",
      font: "16px",
      padding: "12px",
      labels: ["Full name", "Work email"],
    },
  };
  for (const [scale, spec] of Object.entries(specs)) {
    const sample = page.getByTestId(`sample-${scale}`);
    for (const label of spec.labels) {
      const input = sample.getByLabel(label);
      await expect(input).toHaveAttribute("data-slot", "input");
      await expect(input).toHaveAttribute("data-scale", scale);
      await expect(input).toHaveCSS("height", spec.height);
      await expect(input).toHaveCSS("font-size", spec.font);
      await expect(input).toHaveCSS("padding-left", spec.padding);
      await expect(input).toHaveCSS("border-top-width", "1px");
    }
    for (const input of await page
      .getByTestId(`states-${scale}`)
      .locator("input")
      .all()) {
      await expect(input).toHaveCSS("height", spec.height);
    }
  }
  const agent = page.getByTestId("sample-default").getByLabel("Agent name");
  await expect(agent).toHaveAttribute("required", "");
  await expect(agent).toHaveAccessibleDescription(/17\/120/);
  await agent.fill("Invoice follow-up v2");
  await expect(page.getByTestId("sample-default")).toContainText("20/120");
  const email = page.getByTestId("sample-lg").getByLabel("Work email");
  await expect(email).toHaveAttribute("type", "email");
  await expect(email).toHaveAttribute("autocomplete", "email");
  await expect(email).toHaveAttribute("placeholder", "you@company.com");
  await expect(email).toHaveCSS(
    "color",
    await cssColor(page, "var(--sprout-text)"),
  );
});

test("states: read-only, disabled, and invalid", async ({ page }, testInfo) => {
  await openInput(page);
  for (const scale of ["default", "lg"]) {
    const states = page.getByTestId(`states-${scale}`);
    const lg = scale === "lg";
    const empty = states.getByLabel(lg ? "Workspace name" : "Project name");
    await expect(empty).toHaveValue("");
    await expect(empty).toHaveAttribute(
      "placeholder",
      lg ? "Acme, Inc." : "For example, Spring launch",
    );
    const readOnly = states.getByLabel(lg ? "Invitation link" : "Webhook key");
    await expect(readOnly).not.toBeEditable();
    await expect(readOnly).toBeEnabled();
    await expect(readOnly).toHaveAccessibleDescription(/Read-only/);
    await readOnly.focus();
    expect(
      await readOnly.evaluate(
        (node: HTMLInputElement) => node.selectionEnd! - node.selectionStart!,
      ),
    ).toBe(
      await readOnly.evaluate((node: HTMLInputElement) => node.value.length),
    );
    const disabled = states.getByLabel(lg ? "Display name" : "Team name");
    await expect(disabled).toBeDisabled();
    await expect(disabled).toHaveCSS("opacity", "0.5");
    await expect(disabled).toHaveCSS("cursor", "not-allowed");
    await expect(disabled).toHaveCSS(
      "background-color",
      await cssColor(page, "var(--sprout-hover)"),
    );
    const invalid = states.getByLabel(lg ? "Profile email" : "Guest email");
    await expect(invalid).toHaveAttribute("aria-invalid", "true");
    await expect(invalid).toHaveAccessibleDescription(
      /Enter a full email address\./,
    );
    await expect(invalid).toHaveCSS(
      "border-top-color",
      await cssColor(page, "var(--sprout-danger)"),
    );
    await invalid.focus();
    await expect(invalid).toHaveCSS(
      "outline-color",
      await cssColor(page, "var(--sprout-danger)"),
    );
  }
  const path = testInfo.outputPath("input-states.png");
  await page.mouse.move(0, 0);
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  await example(page, "States").screenshot({ animations: "disabled", path });
  await testInfo.attach("input-states", { path, contentType: "image/png" });
});

test("keyboard moves focus with a visible ring", async ({ page }) => {
  await openInput(page);
  const sample = page.getByTestId("sample-default");
  const agent = sample.getByLabel("Agent name");
  const channel = sample.getByLabel("Slack channel");
  await agent.focus();
  await expect(agent).toHaveCSS("outline-style", "solid");
  await expect(agent).toHaveCSS("outline-width", "1px");
  await expect(agent).toHaveCSS("outline-offset", "0px");
  await expect(agent).toHaveCSS("outline-color", "rgba(0, 0, 0, 0)");
  await expect(agent).toHaveCSS(
    "border-top-color",
    await cssColor(page, "var(--sprout-border)"),
  );
  await page.keyboard.press("Tab");
  await expect(channel).toBeFocused();
  await page.keyboard.type("C0123456789");
  await expect(channel).toHaveValue("C0123456789");
  await page.keyboard.press("Shift+Tab");
  await expect(agent).toBeFocused();
  // Disabled inputs leave the tab order; read-only ones stay.
  const states = page.getByTestId("states-default");
  await states.getByLabel("Webhook key").focus();
  await page.keyboard.press("Tab");
  await expect(states.getByLabel("Guest email")).toBeFocused();
});

test("types keep native behavior", async ({ page }) => {
  await openInput(page);
  const types = example(page, "Types");
  const expected: [string, string][] = [
    ["Invite by email", "email"],
    ["Integration token", "password"],
    ["Check every", "number"],
    ["MCP endpoint", "url"],
    ["Modified from", "date"],
    ["Starts at", "time"],
    ["Run once at", "datetime-local"],
    ["Attachment", "file"],
  ];
  for (const [label, type] of expected) {
    await expect(types.getByLabel(label, { exact: true })).toHaveAttribute(
      "type",
      type,
    );
  }
  const every = types.getByLabel("Check every");
  await expect(every).toHaveAttribute("min", "1");
  await expect(every).toHaveAttribute("max", "1440");
  await every.focus();
  await page.keyboard.press("ArrowUp");
  await expect(every).toHaveValue("16");
  await expect(types.getByLabel("Compact at")).toHaveAttribute(
    "inputmode",
    "numeric",
  );
  const from = types.getByLabel("Modified from");
  const to = types.getByLabel("Modified to");
  await expect(from).toHaveAttribute("max", "2026-09-30");
  await to.fill("2026-09-20");
  await expect(from).toHaveAttribute("max", "2026-09-20");
  await expect(types.getByLabel("Repository owner")).toHaveAttribute(
    "pattern",
    "[A-Za-z0-9][A-Za-z0-9-]*",
  );
  const invite = types.getByLabel("Invite by email");
  await invite.focus();
  await invite.evaluate((node) => {
    const data = new DataTransfer();
    data.setData("text", "ana@example.com, li@example.com");
    node.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(invite).toHaveAccessibleDescription(
    /2 addresses pasted: ana@example.com, li@example.com/,
  );
  const file = types.getByLabel("Attachment");
  await expect(file).toHaveCSS("height", "32px");
  await file.setInputFiles({
    name: "contract.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4"),
  });
  expect(
    await file.evaluate((node: HTMLInputElement) => node.files?.[0]?.name),
  ).toBe("contract.pdf");
});

test("labels without a field and inline search empty state", async ({
  page,
}) => {
  await openInput(page);
  const card = example(page, "Labels without a field");
  const site = card.getByLabel("Site ID");
  await expect(site).toHaveAttribute("aria-invalid", "false");
  await expect(site).toHaveAccessibleDescription(
    "The part before .atlassian.net.",
  );
  await site.fill("Acme Cloud");
  await expect(site).toHaveAttribute("aria-invalid", "true");
  await expect(site).toHaveAccessibleDescription(
    "The part before .atlassian.net. Use lowercase letters, numbers, and dashes.",
  );
  const search = card.getByRole("textbox", { name: "Search tables" });
  await search.fill("inv");
  await expect(
    card.getByRole("list", { name: "Tables" }).getByRole("listitem"),
  ).toHaveText(["Invoices"]);
  await search.press("Enter");
  await search.fill("payroll");
  await expect(card.getByRole("status")).toHaveText(
    "No tables match “payroll”.",
  );
});

test("form shows field errors, a saving state, and a server error", async ({
  page,
}, testInfo) => {
  await openInput(page);
  const form = example(page, "Create workspace");
  const name = form.getByLabel("Workspace name");
  const slug = form.getByLabel("Workspace URL");
  const submit = form.getByRole("button", { name: "Create workspace" });
  await expect(name).toHaveCSS("height", "44px");
  await submit.click();
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription(/Enter a workspace name\./);
  await page.keyboard.type("Acme, Inc.");
  await expect(name).not.toHaveAttribute("aria-invalid", "true");
  await submit.click();
  await expect(name).toBeDisabled();
  await expect(slug).toBeDisabled();
  await expect(form.getByRole("status")).toHaveText("Creating workspace…");
  await expect(slug).toBeFocused();
  await expect(slug).toHaveAttribute("aria-invalid", "true");
  await expect(slug).toHaveAccessibleDescription(/That URL is taken\./);
  const path = testInfo.outputPath("input-form-error.png");
  await form.screenshot({ animations: "disabled", path });
  await testInfo.attach("input-form-error", { path, contentType: "image/png" });
  await slug.fill("Acme-HQ");
  await expect(slug).toHaveValue("acme-hq");
  await expect(form).toContainText("7/48");
  await form.getByRole("button", { name: "Create workspace" }).click();
  await expect(form.getByRole("status")).toHaveText(
    "Created tulip.farm/acme-hq.",
  );
});

test("inline rename saves with Enter and cancels with Escape", async ({
  page,
}) => {
  await openInput(page);
  const card = example(page, "Inline rename");
  await card.getByRole("button", { name: "Rename" }).click();
  const title = card.getByRole("textbox", { name: "Chat title" });
  await expect(title).toBeFocused();
  await expect(title).toHaveValue("Q3 supplier review");
  await page.keyboard.press("Escape");
  await expect(title).toHaveCount(0);
  await expect(card).toContainText("Q3 supplier review");
  await card.getByRole("button", { name: "Rename" }).click();
  await title.fill("  ");
  await expect(title).toHaveAttribute("aria-invalid", "true");
  await expect(title).toHaveAccessibleDescription("Enter a title.");
  await title.fill("Q4 supplier review");
  await page.keyboard.press("Enter");
  await expect(title).toHaveAttribute("readonly", "");
  await expect(title).toBeFocused();
  await expect(card.getByRole("status")).toHaveText("Saving…");
  await expect(card).toContainText("Q4 supplier review");
  await expect(card.getByRole("button", { name: "Rename" })).toBeVisible();
});

test("hidden file chooser opens from a button", async ({ page }) => {
  await openInput(page);
  const card = example(page, "Hidden file chooser");
  const chooser = card.getByTestId("avatar-chooser");
  await expect(chooser).toBeHidden();
  await expect(chooser).toHaveAttribute("tabindex", "-1");
  await expect(chooser).toHaveAttribute("aria-hidden", "true");
  await expect(chooser).toHaveAttribute(
    "accept",
    "image/png,image/jpeg,image/webp",
  );
  const opened = page.waitForEvent("filechooser");
  await card.getByRole("button", { name: "Upload image" }).click();
  const fileChooser = await opened;
  await fileChooser.setFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from([137, 80, 78, 71]),
  });
  await expect(card.getByRole("status")).toHaveText("Chosen: avatar.png");
  await expect(chooser).toHaveValue("");
});

test("SidebarInput and a custom group compose Input", async ({
  page,
}, testInfo) => {
  await openInput(page);
  const card = example(page, "Compositions");
  const sidebar = card.getByRole("textbox", { name: "Search sample sidebar" });
  await expect(sidebar).toHaveAttribute("data-slot", "sidebar-input");
  await expect(sidebar).toHaveAttribute("data-sidebar", "input");
  await expect(sidebar).toHaveCSS("height", "32px");
  await expect(sidebar).toHaveCSS(
    "background-color",
    await cssColor(page, "var(--sprout-canvas)"),
  );
  await sidebar.fill("wor");
  await expect(
    card.getByRole("list", { name: "Sample pages" }).getByRole("listitem"),
  ).toHaveText(["Workflows"]);
  await sidebar.fill("zzz");
  await expect(card.getByText("No pages found.")).toBeVisible();
  const group = card.getByTestId("group-sample");
  const bare = group.getByRole("textbox", { name: "Search paths" });
  await expect(bare).toHaveAttribute("data-slot", "input-group-control");
  await expect(bare).toHaveCSS("border-top-width", "0px");
  await group.click({ position: { x: 6, y: 8 } });
  await expect(bare).toBeFocused();
  await expect(group).toHaveCSS("outline-width", "1px");
  const path = testInfo.outputPath("input-compositions.png");
  await card.screenshot({ animations: "disabled", path });
  await testInfo.attach("input-compositions", {
    path,
    contentType: "image/png",
  });
});

test("reduced motion removes the color transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openInput(page);
  const input = page.getByTestId("sample-default").getByLabel("Agent name");
  await expect(input).toHaveCSS("transition-duration", "0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(input).toHaveCSS("transition-duration", /^0\.12s/);
});
