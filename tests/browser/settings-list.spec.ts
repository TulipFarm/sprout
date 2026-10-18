import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

async function openSettingsList(page: Page) {
  await page.goto("/components/settings-list/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const example = (page: Page, name: string) =>
  page.locator(`[data-example="${name}"]`);
const playground = (page: Page) => example(page, "playground");

async function pick(page: Page, label: string, option: string) {
  await chooseOption(page, label, option);
}

const box = async (locator: Locator) => {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error("element is not visible");
  return rect;
};

const rowNamed = (scope: Locator, label: string) =>
  scope
    .locator('[data-slot="settings-row"]')
    .filter({
      has: scope
        .page()
        .locator(".sprout-settings-row-label", { hasText: label }),
    })
    .first();

const pages = [
  "Account",
  "Workspace – admin",
  "Workspace – member",
  "Members",
  "Table grants",
  "Local preferences",
] as const;

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const node of await page.locator('[data-slot="settings-group"]').all()) {
    expect(
      await node.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
  }
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`settings list ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openSettingsList(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        await pick(page, "Color mode", mode === "light" ? "Light" : "Dark");
        await noOverflow(page);
        await axe(page);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`settings-list-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
      });
    }
  }
}

for (const width of [390, 1440]) {
  test(`every Cloud page composition renders at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await openSettingsList(page);
    for (const mode of ["Light", "Dark"]) {
      await pick(page, "Color mode", mode);
      for (const name of pages) {
        await pick(page, "Page", name);
        await expect(
          playground(page).locator('[data-slot="settings-group"]').first(),
        ).toBeVisible();
        await noOverflow(page);
        if (mode === "Light") await axe(page);
        await testInfo.attach(`settings-list-${name}-${mode}-${width}`, {
          body: await playground(page).screenshot(),
          contentType: "image/png",
        });
      }
    }
  });
}

test("matches Cloud spacing and puts controls beside text on wide groups", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openSettingsList(page);
  const group = playground(page).getByRole("region", { name: "Profile" });
  await expect(group).toHaveAttribute(
    "aria-labelledby",
    "sample-profile-heading",
  );
  const title = group.getByRole("heading", { level: 2, name: "Profile" });
  await expect(title).toHaveCSS("font-size", "14px");
  await expect(title).toHaveCSS("font-weight", "500");
  const content = group.locator('[data-slot="settings-group-content"]');
  await expect(content).toHaveCSS("border-top-width", "1px");
  expect(
    (await box(content)).y - ((await box(title)).y + (await box(title)).height),
  ).toBeCloseTo(8, 0);

  const email = rowNamed(group, "Email");
  await expect(email).toHaveCSS("padding-top", "12px");
  await expect(email).toHaveCSS("padding-left", "16px");
  await expect(email).toHaveCSS("flex-direction", "row");
  await expect(email).toHaveCSS("border-top-width", "1px");
  await expect(rowNamed(group, "Picture")).toHaveCSS("border-top-width", "0px");
  const control = email.locator('[data-slot="settings-row-control"]');
  const rowBox = await box(email);
  const controlBox = await box(control);
  expect(
    rowBox.x + rowBox.width - (controlBox.x + controlBox.width),
  ).toBeCloseTo(16, 0);
  expect(controlBox.width).toBeLessThanOrEqual(rowBox.width * 0.6 + 1);
  const label = await box(email.locator(".sprout-settings-row-label"));
  const description = email.locator(".sprout-settings-row-description");
  await expect(description).toHaveCSS("font-size", "12px");
  expect(label.x).toBeCloseTo(rowBox.x + 16, 0);

  const input = page.locator("#sample-account-name");
  const inputWidth = (await box(input)).width;
  expect(inputWidth).toBeCloseTo(256, 0);
});

test("stacks rows and stretches fields on narrow groups", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openSettingsList(page);
  const group = playground(page).getByRole("region", { name: "Profile" });
  const row = rowNamed(group, "Name");
  await expect(row).toHaveCSS("flex-direction", "column");
  const text = await box(row.locator(".sprout-settings-row-text"));
  const control = await box(row.locator('[data-slot="settings-row-control"]'));
  expect(control.y).toBeGreaterThanOrEqual(text.y + text.height + 11);
  const rowBox = await box(row);
  expect((await box(page.locator("#sample-account-name"))).width).toBeCloseTo(
    rowBox.width - 32,
    0,
  );
  // Long emails and URLs break instead of widening the group.
  const email = rowNamed(group, "Email");
  expect(await email.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  const rows = example(page, "rows");
  const url = rowNamed(rows, "Workspace URL");
  expect(await url.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await testInfo.attach("settings-list-rows-390", {
    body: await rows.screenshot(),
    contentType: "image/png",
  });
});

test("rows without children have no control area", async ({ page }) => {
  await openSettingsList(page);
  await pick(page, "Page", "Members");
  const mine = playground(page).getByRole("region", { name: "My membership" });
  await expect(
    rowNamed(mine, "Role").locator('[data-slot="settings-row-control"]'),
  ).toHaveCount(0);
  await expect(rowNamed(mine, "Role")).toContainText(
    "Your role is team manager.",
  );
  const leave = rowNamed(mine, "Leave workspace");
  await expect(leave.getByRole("status")).toContainText(
    "Hand off your last team manager",
  );
  await expect(
    leave.getByRole("button", { name: "Leave workspace" }),
  ).toBeDisabled();
  await playground(page)
    .getByRole("button", { name: "Hand off my team manager role" })
    .click();
  await expect(leave.getByRole("status")).toHaveCount(0);
  await expect(
    leave.getByRole("button", { name: "Leave workspace" }),
  ).toBeEnabled();

  const directory = playground(page)
    .locator('[data-slot="settings-group"]')
    .filter({ hasText: "Workspace directory" });
  await expect(directory).not.toHaveAttribute("aria-labelledby");
  await expect(directory.locator('[data-slot="settings-row"]')).toHaveCount(4);
  await expect(
    directory.locator('[data-slot="settings-row-control"]'),
  ).toHaveCount(0);
});

test("labels focus controls and forms save from the keyboard", async ({
  page,
}) => {
  await openSettingsList(page);
  const group = playground(page).getByRole("region", { name: "Profile" });
  await group.locator('label[for="sample-account-name"]').click();
  const input = page.locator("#sample-account-name");
  await expect(input).toBeFocused();
  await expect(input).toHaveAccessibleDescription(
    "Shown to people in your workspaces. Up to 80 characters.",
  );
  await input.fill("");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAccessibleDescription(
    "Enter a name of 1 to 80 characters.",
  );
  await expect(group.getByRole("button", { name: "Save name" })).toBeDisabled();
  await input.fill("Maya Chen-Okafor");
  await expect(group.getByText("Current saved name: Maya Chen")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(
    group.getByRole("status").filter({ hasText: "Name saved." }),
  ).toBeVisible();
  await expect(group.getByRole("button", { name: "Save name" })).toHaveCount(0);

  // The theme toggle group is reachable and moves with arrow keys.
  const theme = playground(page).getByRole("group", { name: "Theme" });
  const system = theme.getByRole("button", { name: "System" });
  await system.focus();
  await page.keyboard.press("ArrowRight");
  const light = theme.getByRole("button", { name: "Light" });
  await expect(light).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(light).toHaveAttribute("aria-pressed", "true");
  await expect(system).toHaveAttribute("aria-pressed", "false");
  await expect(light).toHaveCSS("outline-style", "solid");
});

test("rows show loading, ready, and error states", async ({
  page,
}, testInfo) => {
  await openSettingsList(page);
  const row = rowNamed(playground(page), "Sign-in methods");
  await expect(row).toContainText("Google · Email link");
  await pick(page, "Sign-in methods state", "Loading");
  await expect(row.getByRole("status")).toHaveText("Loading sign-in methods…");
  await testInfo.attach("settings-list-loading", {
    body: await row.screenshot(),
    contentType: "image/png",
  });
  await pick(page, "Sign-in methods state", "Error");
  await expect(row.getByRole("alert")).toHaveText(
    "Could not check your sign-in methods.",
  );
  await testInfo.attach("settings-list-error", {
    body: await row.screenshot(),
    contentType: "image/png",
  });
  const retry = row.getByRole("button", { name: "Retry sign-in methods" });
  await retry.focus();
  await page.keyboard.press("Enter");
  await expect(row.getByRole("status")).toBeVisible();
  await expect(row).toContainText("Google · Email link");
});

test("image pickers upload, replace, remove, and reject files", async ({
  page,
}) => {
  await openSettingsList(page);
  const row = rowNamed(playground(page), "Picture");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  await page
    .getByTestId("user-maya-file")
    .setInputFiles({ name: "me.png", mimeType: "image/png", buffer: png });
  await expect(row.getByRole("button", { name: "Change image" })).toBeVisible();
  await expect(row.getByRole("status")).toHaveText("Profile picture saved.");
  await page
    .getByTestId("user-maya-file")
    .setInputFiles({ name: "me.gif", mimeType: "image/gif", buffer: png });
  await expect(row.getByRole("alert")).toHaveText(
    "Choose a PNG, JPEG, or WebP image.",
  );
  await row.getByRole("button", { name: "Remove" }).click();
  await expect(row.getByRole("button", { name: "Upload image" })).toBeVisible();
  await expect(row.getByRole("alert")).toHaveCount(0);
});

test("workspace pages cover admin, member, conflict, and dialog rows", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openSettingsList(page);
  await pick(page, "Page", "Workspace – admin");
  const scope = playground(page);
  await expect(
    rowNamed(scope, "Role").getByText("admin", { exact: true }),
  ).toBeVisible();
  await expect(
    rowNamed(scope, "Leave workspace").getByRole("button"),
  ).toBeDisabled();
  await expect(
    scope.getByRole("link", { name: "Manage members" }),
  ).toHaveAttribute("data-variant", "outline");
  await expect(scope.getByRole("link", { name: "Open Soul" })).toBeVisible();
  const close = scope.getByRole("button", { name: "Close workspace" });
  await expect(close).toHaveAttribute("data-variant", "destructive");
  await expect(rowNamed(scope, "Workspace ID").locator("code")).toHaveCSS(
    "user-select",
    "all",
  );
  await scope
    .getByRole("button", { name: "Simulate a conflicting edit" })
    .click();
  await expect(scope.getByRole("alert")).toContainText(
    "Workspace settings changed.",
  );
  await expect(close).toBeDisabled();
  await testInfo.attach("settings-list-conflict", {
    body: await scope.screenshot(),
    contentType: "image/png",
  });
  await scope.getByRole("button", { name: "Reload latest settings" }).click();
  await expect(close).toBeEnabled();

  await pick(page, "Page", "Workspace – member");
  await expect(
    scope.getByText(
      "Only workspace admins can rename or close this workspace.",
    ),
  ).toBeVisible();
  await expect(
    rowNamed(scope, "Workspace icon").locator('[data-slot="entity-avatar"]'),
  ).toHaveAttribute("data-shape", "square");
  await expect(
    rowNamed(scope, "Workspace icon").locator(
      ".sprout-settings-row-description",
    ),
  ).toHaveCount(0);
  const leave = rowNamed(scope, "Leave workspace").getByRole("button", {
    name: "Leave workspace",
  });
  await leave.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Leave this workspace?" });
  await expect(dialog).toBeVisible();
  await testInfo.attach("settings-list-dialog", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(leave).toBeFocused();
});

test("table grants use nested headings, label elements, and locked checkboxes", async ({
  page,
}) => {
  await openSettingsList(page);
  await pick(page, "Page", "Table grants");
  const scope = playground(page);
  await expect(scope.getByRole("heading", { level: 3 })).toHaveText([
    "Create tables for a team",
    "Supplier contracts",
    "October invoices",
  ]);
  const read = page.locator("#sample-person-tbl-invoices\\:table\\.read");
  const box = scope.getByRole("checkbox", { name: "Read rows" }).nth(1);
  await expect(box).toHaveAttribute("aria-checked", "false");
  await scope
    .locator('label[for="sample-person-tbl-invoices:table.read"]')
    .click();
  await expect(box).toHaveAttribute("aria-disabled", "true");
  await expect(scope.getByRole("status").last()).toHaveText(
    "Individual grant saved.",
  );
  await expect(box).toHaveAttribute("aria-checked", "true");
  await expect(read).toBeChecked();
  const schema = rowNamed(
    scope.locator('[data-slot="settings-group"]').nth(1),
    "Manage schema",
  );
  await expect(schema).toContainText(
    "Schema authority does not grant row reads or data changes.",
  );
  const operations = scope.getByRole("checkbox", { name: "Operations" });
  await operations.focus();
  await page.keyboard.press("Space");
  await expect(scope.getByRole("status").last()).toHaveText(
    "Individual grant saved.",
  );
  await expect(operations).toHaveAttribute("aria-checked", "false");
});

test("switch rows toggle from their labels", async ({ page }) => {
  await openSettingsList(page);
  await pick(page, "Page", "Local preferences");
  const scope = playground(page);
  const quiet = scope.getByRole("switch", { name: "Quiet hours" });
  await expect(
    scope.getByRole("switch", { name: "Email summaries" }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(quiet).toHaveAttribute("aria-checked", "false");
  await scope.locator('label[for="sample-quiet"]').click();
  await expect(quiet).toHaveAttribute("aria-checked", "true");
  await quiet.focus();
  await page.keyboard.press("Space");
  await expect(quiet).toHaveAttribute("aria-checked", "false");
  await expect(rowNamed(scope, "Project name")).toContainText("Meadow");
});

test("has no motion of its own", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openSettingsList(page);
  const row = page.locator('[data-slot="settings-row"]').first();
  await expect(row).toHaveCSS("transition-duration", "0s");
  await expect(page.locator(".settings-list-demo-toggle").first()).toHaveCSS(
    "transition-duration",
    "0s",
  );
});
