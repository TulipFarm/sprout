import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

async function openPageHeader(page: Page) {
  await page.goto("/components/page-header/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const example = (page: Page, name: string) =>
  page.locator(`[data-example="${name}"]`);
const shell = (page: Page) =>
  page.getByRole("region", { name: "App header example" });
const shellHeader = (page: Page) =>
  shell(page).locator('header[aria-label="Workspace header"]');

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`page header ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openPageHeader(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
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
        for (const frame of await page.locator("[data-example]").all()) {
          expect(
            await frame.evaluate(
              (node) => node.scrollWidth <= node.clientWidth,
            ),
          ).toBe(true);
        }
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`page-header-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
        await testInfo.attach(`page-header-chrome-${theme}-${mode}-${width}`, {
          body: await shell(page).screenshot(),
          contentType: "image/png",
        });
      });
    }
  }
}

test("in-page headers render every Cloud composition", async ({ page }) => {
  await openPageHeader(page);
  const usage = example(page, "description");
  await expect(
    usage.getByRole("heading", { level: 1, name: "Usage" }),
  ).toHaveCSS("font-size", "24px");
  await expect(usage.locator('[data-slot="page-actions"]')).toHaveCount(0);
  await expect(
    example(page, "primary").getByRole("button", { name: "New workflow" }),
  ).toBeVisible();
  const disabled = example(page, "disabled").getByRole("link", {
    name: "New chat",
  });
  await expect(disabled).toHaveAttribute("aria-disabled", "true");
  await expect(
    example(page, "links").getByRole("link", { name: "Configure manually" }),
  ).toHaveAttribute("data-variant", "outline");
  await expect(
    example(page, "small-link").getByRole("link", { name: "Open in chat" }),
  ).toHaveAttribute("data-size", "sm");
  await expect(
    example(page, "calendar").getByRole("button", { name: "Create" }),
  ).toHaveAttribute("data-size", "calendar");
  await expect(
    example(page, "back-badge").locator('[data-slot="badge"]'),
  ).toHaveText("Active");
  await expect(
    example(page, "back-ghost").getByRole("button", { name: "Edit project" }),
  ).toHaveAttribute("data-variant", "ghost");

  const parent = example(page, "parent");
  const trail = parent.getByRole("navigation", { name: "Breadcrumb" });
  await expect(trail.getByRole("link", { name: "Tables" })).toHaveAttribute(
    "href",
    "#tables",
  );
  await expect(trail.locator('[aria-current="page"] h1')).toHaveText(
    "Customer accounts",
  );
  await expect(
    parent.getByRole("button", { name: "More table options" }),
  ).toHaveAttribute("data-size", "icon-sm");

  const both = example(page, "back-parent");
  await expect(
    both.getByRole("link", { name: "Back to examples" }),
  ).toBeVisible();
  await expect(
    both.getByRole("navigation", { name: "Breadcrumb" }),
  ).toBeVisible();
  const inline = both.locator(
    '[data-slot="page-actions"][data-placement="inline"]',
  );
  await expect(inline).toHaveCSS("justify-content", "flex-end");
  await expect(
    inline.getByRole("button", { name: "Local page action" }),
  ).toBeVisible();
});

test("busy file action announces progress", async ({ page }) => {
  await openPageHeader(page);
  const file = example(page, "file");
  const download = file.getByRole("button", { name: "Download" });
  await download.click();
  const busy = file.getByRole("button", { name: "Downloading…" });
  await expect(busy).toHaveAttribute("aria-busy", "true");
  await expect(busy).toBeDisabled();
  await expect(file.getByRole("button", { name: "Download" })).toBeEnabled({
    timeout: 4000,
  });
});

test("long titles wrap and actions wrap below on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPageHeader(page);
  const file = example(page, "file");
  const title = file.getByRole("heading", { level: 1 });
  expect((await title.boundingBox())!.height).toBeGreaterThan(40);
  const titleBox = (await title.boundingBox())!;
  const actions = (await file
    .locator('[data-slot="page-actions"]')
    .boundingBox())!;
  expect(actions.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height);
  await expect(
    example(page, "calendar").getByRole("button", {
      name: "Calendar commands",
    }),
  ).toBeHidden();
});

test("back label hides below 640px but stays the accessible name", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPageHeader(page);
  const back = example(page, "back").getByRole("link", {
    name: "Back to skills",
  });
  await expect(back).toBeVisible();
  expect((await back.boundingBox())!.width).toBe(28);
  await page.setViewportSize({ width: 1024, height: 900 });
  expect((await back.boundingBox())!.width).toBeGreaterThan(80);
  await expect(back.locator(".sprout-page-header-back-label")).toBeVisible();
});

test("keyboard reaches links and focus moves to the title", async ({
  page,
}) => {
  await openPageHeader(page);
  const both = example(page, "back-parent");
  await both.getByRole("link", { name: "Back to examples" }).focus();
  await page.keyboard.press("Tab");
  const crumb = both.getByRole("link", { name: "Projects" });
  await expect(crumb).toBeFocused();
  await expect(crumb).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Tab");
  await expect(
    both.getByRole("button", { name: "Local page action" }),
  ).toBeFocused();

  const focus = example(page, "focus");
  await focus.getByRole("button", { name: "Import skill" }).focus();
  await page.keyboard.press("Enter");
  const heading = focus.getByRole("heading", { level: 1, name: "Skills" });
  await expect(heading).toBeFocused();
  await expect(heading).toHaveAttribute("id", "skills-heading");
  await expect(focus.getByRole("status")).toHaveText(
    "Skill imported. Focus moved to the Skills heading.",
  );
});

test("playground is keyboard operable and switches placement", async ({
  page,
}) => {
  await openPageHeader(page);
  const playground = page.getByRole("region", {
    name: "Page header playground",
  });
  const navigation = page.getByRole("combobox", {
    name: "Navigation",
    exact: true,
  });
  await navigation.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(navigation).toBeFocused();
  await expect(
    playground.getByRole("navigation", { name: "Breadcrumb" }),
  ).toBeVisible();
  await expect(
    playground.getByRole("link", { name: "Back to projects" }),
  ).toBeVisible();

  const description = playground.getByRole("button", { name: "Description" });
  await description.focus();
  await page.keyboard.press("Space");
  await expect(description).toHaveAttribute("aria-pressed", "false");
  await expect(
    playground.locator('[data-slot="page-description"]'),
  ).toHaveCount(0);

  await chooseOption(page, "Actions", "Status badge");
  await expect(playground.locator('[data-slot="badge"]')).toHaveText("Active");
  await chooseOption(page, "Placement", "App header");
  const header = playground.locator('header[aria-label="Workspace header"]');
  await expect(header.getByRole("heading", { level: 1 })).toHaveAttribute(
    "data-placement",
    "chrome",
  );
  await expect(header.locator('[data-slot="badge"]')).toBeVisible();
  await expect(
    playground.locator('header[data-slot="page-header"]'),
  ).toHaveCount(0);
});

test("app header receives title, breadcrumb, and actions", async ({ page }) => {
  await openPageHeader(page);
  const header = shellHeader(page);
  const title = header.getByRole("heading", {
    level: 1,
    name: "Customer accounts",
  });
  await expect(title).toHaveCSS("font-size", "14px");
  await expect(title).toHaveCSS("white-space", "nowrap");
  await expect(title).toHaveCSS("text-overflow", "ellipsis");
  await expect(
    header.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", {
      name: "Tables",
    }),
  ).toBeVisible();
  await expect(
    header.locator('[data-slot="page-actions"][data-placement="chrome"]'),
  ).toContainText("Change fields in chat");
  await expect(
    shell(page).locator('header[data-slot="page-header"]'),
  ).toHaveCount(0);

  await chooseOption(page, "Page", "Teams");
  await expect(header.getByRole("heading", { level: 1 })).toHaveText("Teams");
  await expect(header.getByRole("button", { name: "New team" })).toBeVisible();
  await expect(header.getByText("Change fields in chat")).toHaveCount(0);
  await expect(
    shell(page).locator('[data-slot="page-description"]'),
  ).toHaveText("Group members so you can grant access once per team.");
  expect(
    await shell(page)
      .locator('[data-slot="page-description"]')
      .evaluate((node) => !!node.closest('[aria-label="Workspace header"]')),
  ).toBe(false);

  await chooseOption(page, "Page", "Project settings");
  await expect(
    header.getByRole("link", { name: "Spring launch" }),
  ).toBeVisible();
  await expect(header.getByRole("heading", { level: 1 })).toHaveText(
    "Edit project",
  );
  await expect(header.locator('[data-slot="page-actions"]')).toHaveCount(0);
});

test("long titles truncate in the app header on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPageHeader(page);
  const title = shellHeader(page).getByRole("heading", { level: 1 });
  expect(
    await title.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  expect((await title.boundingBox())!.width).toBeGreaterThanOrEqual(40);
  const headerBox = (await shellHeader(page).boundingBox())!;
  expect(headerBox.height).toBe(44);
  expect(
    await shell(page).evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
});

test("document title follows the page only when a formatter is set", async ({
  page,
}) => {
  await openPageHeader(page);
  const original = await page.title();
  expect(original).toBe("Page Header | Sprõut");
  await shell(page).getByRole("button", { name: "Update tab title" }).click();
  await expect(page).toHaveTitle("Customer accounts · Northwind");
  await chooseOption(page, "Page", "Chats");
  await expect(page).toHaveTitle("Chats · Northwind");
  await shell(page).getByRole("button", { name: "Update tab title" }).click();
  await expect(page).toHaveTitle(original);
});

test("link color transition respects reduced motion", async ({ browser }) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const context = await browser.newContext({ reducedMotion });
    const page = await context.newPage();
    await openPageHeader(page);
    await expect(
      example(page, "parent").getByRole("link", { name: "Tables" }),
    ).toHaveCSS(
      "transition-duration",
      reducedMotion === "reduce" ? "0s" : "0.12s",
    );
    await context.close();
  }
});
