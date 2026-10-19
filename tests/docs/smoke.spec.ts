import { readdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const components = readdirSync("apps/docs/src/pages/components")
  .filter((file) => file.endsWith(".astro"))
  .map((file) => `/components/${file.replace(".astro", "")}/`);
const guides = ["/", "/installation/", "/theming/", "/changelog/"];

async function open(page: Page, route: string) {
  await page.goto(route);
  await expect(
    page.locator('astro-island[ssr]:not([client="visible"])'),
  ).toHaveCount(0);
}

async function expectAxeClean(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .exclude("[data-base-ui-focus-guard]")
    .analyze();
  expect(results.violations).toEqual([]);
}

test("every route loads without errors or native selects", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`${page.url()}: ${error}`));
  page.on("console", (message) => {
    if (message.type() === "error")
      errors.push(`${page.url()}: ${message.text()}`);
  });
  for (const route of [...guides, ...components]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("h1").first(), route).toBeVisible();
    await expect(page.locator("select"), route).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("search opens from the button, ⌘K and /, and navigates", async ({
  page,
}) => {
  await open(page, "/installation/");
  const dialog = page.getByRole("dialog", { name: "Search documentation" });
  await page.getByRole("button", { name: "Search components" }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+k");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.keyboard.press("/");
  await expect(dialog).toBeVisible();
  await page.keyboard.type("button group");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/components\/button-group\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /^Button group$/i }),
  ).toBeVisible();
});

test("the docs nav marks the current page and the phone drawer opens", async ({
  page,
}) => {
  await open(page, "/components/badge/");
  const nav = page.getByRole("navigation", { name: "Documentation" });
  await expect(
    nav.getByRole("link", { name: "Badge", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Card", exact: true }).click();
  await expect(page).toHaveURL(/\/components\/card\/$/);
  await expect(
    nav.getByRole("link", { name: "Card", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = page.locator(".nav-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(nav).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("site theme and dark mode apply to the page and persist", async ({
  page,
}) => {
  await open(page, "/theming/");
  await page.getByRole("button", { name: /^Site theme/ }).click();
  await page.getByRole("option", { name: "TulipFarm" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-sprout-theme",
    "tulipfarm",
  );
  await page.getByRole("button", { name: "Dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-sprout-theme",
    "tulipfarm",
  );
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
});

test("code blocks copy their exact source", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page, "/components/sidebar/");
  const block = page.getByRole("group", { name: "Sidebar usage", exact: true });
  const button = block.getByRole("button", { name: "Copy Sidebar usage code" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveText("Copied");
  await expect(block.getByRole("status")).toHaveText(
    "Code copied to clipboard.",
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    await block.getAttribute("data-code"),
  );
});

for (const width of [390, 1440])
  for (const mode of ["light", "dark"] as const)
    test(`key pages pass axe at ${width}px in ${mode} mode`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: mode });
      for (const route of [
        "/installation/",
        "/theming/",
        "/components/button/",
      ]) {
        await open(page, route);
        await expectAxeClean(page);
      }
    });
