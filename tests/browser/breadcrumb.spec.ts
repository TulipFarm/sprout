import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/breadcrumb/";

async function openBreadcrumb(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#breadcrumb-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

function folderPath(page: Page) {
  return example(page, "Folder path").getByRole("navigation", {
    name: "Folder path",
  });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`breadcrumb ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openBreadcrumb(page);
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
        await expect(demo.locator('[data-slot="breadcrumb"]')).toHaveCount(7);
        const current = example(
          page,
          "Path with current page and overflow",
        ).locator('[data-slot="breadcrumb-page"]');
        const link = example(
          page,
          "Path with current page and overflow",
        ).locator('[data-slot="breadcrumb-list"]');
        const [text, muted] = await page.evaluate(() => {
          const style = getComputedStyle(document.documentElement);
          const resolve = (name: string) => {
            const probe = document.createElement("span");
            probe.style.color = style.getPropertyValue(name).trim();
            document.body.append(probe);
            const value = getComputedStyle(probe).color;
            probe.remove();
            return value;
          };
          return [resolve("--sprout-text"), resolve("--sprout-muted")];
        });
        await expect(current).toHaveCSS("color", text!);
        await expect(link).toHaveCSS("color", muted!);
        const results = await new AxeBuilder({ page })
          .include("#breadcrumb-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(
          `breadcrumb-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`breadcrumb-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("anatomy exposes links, a hidden ellipsis, and the current page", async ({
  page,
}) => {
  await openBreadcrumb(page);
  const card = example(page, "Path with current page and overflow");
  const nav = card.getByRole("navigation", { name: "Breadcrumb" });
  await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute(
    "href",
    "#home",
  );
  await expect(
    nav.getByRole("link", { name: "Home" }).locator("svg"),
  ).toHaveCSS("width", "14px");
  await expect(nav.getByRole("link", { name: "Meadow" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    nav.locator('[data-slot="breadcrumb-ellipsis"]'),
  ).toHaveAttribute("aria-hidden", "true");
  await expect(nav.locator('[data-slot="breadcrumb-ellipsis"]')).toHaveCSS(
    "width",
    "20px",
  );
  await expect(nav.getByText("Higher folders not shown")).toHaveClass(
    /sr-only/,
  );
  await expect(nav.locator('[data-slot="breadcrumb-separator"]')).toHaveCount(
    3,
  );
  await expect(nav.locator('[data-slot="breadcrumb-list"]')).toHaveCSS(
    "flex-wrap",
    "wrap",
  );
});

test("keyboard moves through links and skips the current page", async ({
  page,
}) => {
  await openBreadcrumb(page);
  const nav = example(page, "Path with current page and overflow");
  const home = nav.getByRole("link", { name: "Home" });
  await home.focus();
  await expect(home).toBeFocused();
  await expect(home).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Tab");
  await expect(nav.getByRole("link", { name: "Projects" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(nav.locator('[data-slot="breadcrumb-page"]')).not.toBeFocused();
  await expect(
    example(page, "Page header trail")
      .getByRole("link", {
        name: "Automations",
      })
      .first(),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(nav.getByRole("link", { name: "Projects" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${route}$`));
});

test("page header trail stays on one line and shrinks only the title", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openBreadcrumb(page);
  const chrome = example(page, "Page header trail").getByRole("group", {
    name: "App header",
  });
  const list = chrome.locator('[data-slot="breadcrumb-list"]');
  await expect(list).toHaveAttribute("data-wrap", "false");
  await expect(list).toHaveCSS("flex-wrap", "nowrap");
  const parent = chrome.getByRole("link", { name: "Automations" });
  const title = chrome.getByRole("heading");
  const item = chrome.locator('[aria-current="page"]');
  await expect(item).toHaveCSS("flex-shrink", "1");
  await expect(parent.locator("..")).toHaveCSS("flex-shrink", "0");
  const truncated = await title.evaluate(
    (node) => node.scrollWidth > node.clientWidth,
  );
  expect(truncated).toBe(true);
  const box = await list.boundingBox();
  const frame = await chrome.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(24);
  expect(box!.x + box!.width).toBeLessThanOrEqual(frame!.x + frame!.width);
  expect(
    await parent.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
});

test("folder path covers files and Google Drive states", async ({ page }) => {
  await openBreadcrumb(page);
  const nav = folderPath(page);
  const long = nav.getByRole("link", { name: /^Q3 board meeting/ });
  await expect(long.locator('[data-slot="breadcrumb-label"]')).toHaveAttribute(
    "title",
    "Q3 board meeting — statements and supporting schedules",
  );
  await expect(long.locator('[data-slot="breadcrumb-label"]')).toHaveCSS(
    "max-width",
    "192px",
  );
  await expect(long.locator('[data-slot="breadcrumb-label"]')).toHaveCSS(
    "text-overflow",
    "ellipsis",
  );
  await expect(nav.getByRole("link", { name: "Drafts" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await long.click();
  await expect(
    nav.getByRole("link", { name: /^Q3 board meeting/ }),
  ).toHaveAttribute("aria-current", "page");
  await expect(nav.getByText("Drafts")).toHaveCount(0);
  await nav.getByRole("link", { name: "All files" }).click();
  await expect(nav.locator('[data-slot="breadcrumb-page"]')).toHaveText(
    "All files",
  );
  await expect(nav.locator('[data-slot="breadcrumb-separator"]')).toHaveCount(
    0,
  );

  await chooseOption(page, "Path state", "Folders you can’t open");
  await expect(nav.getByText("Folders you cannot open")).toHaveCount(1);
  await expect(nav.locator('[data-slot="breadcrumb-ellipsis"]')).toHaveCount(1);
  await expect(nav.getByText("Finance")).toHaveCount(0);

  await chooseOption(page, "Path state", "Search results");
  await expect(nav.getByRole("link", { name: "All files" })).toHaveAttribute(
    "href",
    "#files-root",
  );
  await expect(nav.locator('[data-slot="breadcrumb-page"]')).toHaveText(
    "Search results",
  );

  await chooseOption(page, "Source", "Google Drive");
  await expect(nav.getByText("Higher folders not shown")).toHaveCount(1);
  await expect(nav.getByRole("link", { name: "Google Drive" })).toBeVisible();
  for (const [state, hidden] of [
    ["Loading", "Loading folder path"],
    ["Error", "Folder path unavailable"],
    ["Folders you can’t open", "Folders you can’t open"],
  ] as const) {
    await chooseOption(page, "Path state", state);
    await expect(nav.getByText(hidden, { exact: true })).toHaveCount(1);
    await expect(nav.locator('[data-slot="breadcrumb-ellipsis"]')).toHaveCount(
      1,
    );
  }
  await expect(example(page, "Folder path").getByRole("alert")).toHaveCount(0);
  await chooseOption(page, "Path state", "Error");
  await expect(example(page, "Folder path").getByRole("alert")).toBeVisible();
  await chooseOption(page, "Path state", "Shared with me");
  await expect(nav.locator('[data-slot="breadcrumb-page"]')).toHaveText(
    "Shared with me",
  );
  await chooseOption(page, "Path state", "Root");
  await expect(nav.locator('[data-slot="breadcrumb-page"]')).toHaveText(
    "Google Drive",
  );
});

test("destination picker crumbs are ghost buttons that lock while moving", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openBreadcrumb(page);
  const card = example(page, "Destination picker");
  const nav = card.getByRole("navigation", { name: "Destination path" });
  const clients = nav.getByRole("button", { name: "Clients" });
  await expect(clients).toHaveClass(/sprout-button-variant-ghost/);
  await expect(clients).toHaveClass(/sprout-button-size-xs/);
  await expect(clients).toHaveCSS("height", "24px");
  const current = nav.locator('[data-slot="breadcrumb-page"]');
  await expect(current.locator('[data-slot="breadcrumb-label"]')).toHaveCSS(
    "max-width",
    "160px",
  );

  await clients.focus();
  await page.keyboard.press("Enter");
  await expect(current).toHaveText("Clients");
  await card.getByRole("button", { name: /^Northwind/ }).click();
  await expect(current).toHaveText("Northwind Traders — renewal 2027");

  await card.getByRole("button", { name: "Move here" }).click();
  await expect(nav.getByRole("button", { name: "My files" })).toBeDisabled();
  await expect(nav.getByRole("button", { name: "Clients" })).toBeDisabled();
  await expect(card.getByRole("status")).toBeVisible();
  const path = testInfo.outputPath("breadcrumb-picker-moving.png");
  await card.screenshot({ animations: "disabled", path });
  await testInfo.attach("breadcrumb-picker-moving", {
    path,
    contentType: "image/png",
  });
  await card.getByRole("button", { name: "Stop moving" }).click();
  await nav.getByRole("button", { name: "My files" }).click();
  await expect(current).toHaveText("My files");
  await card.getByRole("button", { name: "Shared with me" }).click();
  await expect(current).toHaveText("Shared with me");
});

test("separators flip in right-to-left text", async ({ page }) => {
  await openBreadcrumb(page);
  const card = example(page, "Direction");
  const ltr = card
    .locator('[dir="ltr"] [data-slot="breadcrumb-separator"] svg')
    .first();
  const rtl = card
    .locator('[dir="rtl"] [data-slot="breadcrumb-separator"] svg')
    .first();
  await expect(ltr).toHaveCSS("transform", "none");
  await expect(rtl).toHaveCSS("transform", "matrix(-1, 0, 0, 1, 0, 0)");
  const rtlLink = card.locator('[dir="rtl"]').getByRole("link").first();
  const rtlPage = card.locator('[dir="rtl"] [data-slot="breadcrumb-page"]');
  expect((await rtlLink.boundingBox())!.x).toBeGreaterThan(
    (await rtlPage.boundingBox())!.x,
  );
});

test("link color transitions respect reduced motion", async ({ page }) => {
  await openBreadcrumb(page);
  const link = example(page, "Path with current page and overflow").getByRole(
    "link",
    { name: "Projects" },
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(link).toHaveCSS("transition-duration", "0.12s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(link).toHaveCSS("transition-duration", "0s");
});
