import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/card/";

async function openCard(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#card-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

async function cssColor(page: Page, value: string) {
  return page.evaluate((color) => {
    const probe = document.createElement("span");
    probe.style.color = color;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  }, value);
}

async function box(locator: Locator) {
  const result = await locator.boundingBox();
  expect(result).not.toBeNull();
  return result!;
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`card ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openCard(page);
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
        await expect(demo.locator('[data-slot="card"]').first()).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-surface)"),
        );
        for (const body of await demo.locator(".card-demo-body").all()) {
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        }
        for (const card of await demo.locator('[data-slot="card"]').all()) {
          expect(
            await card.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        }
        const results = await new AxeBuilder({ page })
          .include("#card-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(`card-${theme}-${mode}-${width}.png`);
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`card-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("is listed in the docs navigation", async ({ page }) => {
  await openCard(page);
  const link = page
    .getByRole("navigation", { name: "Documentation" })
    .getByRole("link", { name: "Card", exact: true });
  await expect(link).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Card");
});

test("sizes set spacing, title size, action position, and a flush footer", async ({
  page,
}) => {
  await openCard(page);
  const sizes = example(page, "Sizes");
  for (const [size, spacing, titleSize] of [
    ["default", 16, "16px"],
    ["sm", 12, "14px"],
  ] as const) {
    const card = sizes.getByTestId(`size-${size}`);
    await expect(card).toHaveAttribute("data-size", size);
    await expect(card).toHaveCSS("padding-top", `${spacing}px`);
    await expect(card).toHaveCSS("padding-bottom", "0px");
    await expect(card).toHaveCSS("row-gap", `${spacing}px`);
    await expect(card).toHaveCSS("border-radius", "12px");
    const title = card.locator('[data-slot="card-title"]');
    await expect(title).toHaveJSProperty("tagName", "H4");
    await expect(title).toHaveCSS("font-size", titleSize);
    await expect(title).toHaveCSS("font-weight", "500");
    const header = await box(card.locator('[data-slot="card-header"]'));
    const action = await box(card.locator('[data-slot="card-action"]'));
    const cardBox = await box(card);
    expect(Math.round(action.y)).toBe(Math.round(header.y));
    expect(
      Math.round(cardBox.x + cardBox.width - (action.x + action.width)),
    ).toBe(spacing + 1);
    const content = await box(card.locator('[data-slot="card-content"]'));
    const text = await box(card.locator('[data-slot="card-content"] p'));
    expect(Math.round(text.x - content.x)).toBe(spacing);
    const footer = card.locator('[data-slot="card-footer"]');
    await expect(footer).toHaveCSS("padding-top", `${spacing}px`);
    await expect(footer).toHaveCSS("border-top-width", "1px");
    const footerBox = await box(footer);
    expect(Math.round(footerBox.y + footerBox.height)).toBe(
      Math.round(cardBox.y + cardBox.height - 1),
    );
  }
});

test("raised surface tints the panel in light and dark", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openCard(page);
  const surfaces = example(page, "Surfaces");
  const flat = surfaces.getByTestId("surface-default");
  const raised = surfaces.getByTestId("surface-raised");
  await expect(raised).toHaveAttribute("data-surface", "raised");
  for (const mode of ["Light", "Dark"]) {
    await chooseOption(page, "Color mode", mode);
    const flatColor = await flat.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    const raisedColor = await raised.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    expect(raisedColor).not.toBe(flatColor);
    expect(raisedColor).toBe(await cssColor(page, "var(--sprout-card-raised)"));
    const shadow = await raised.evaluate(
      (node) => getComputedStyle(node).boxShadow,
    );
    if (mode === "Light") expect(shadow).not.toBe("none");
    else expect(shadow).toBe("none");
    await expect(flat).toHaveCSS("box-shadow", "none");
  }
});

test("playground switches size, surface, and parts", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openCard(page);
  const playground = example(page, "Playground");
  const card = playground.getByTestId("playground-card");
  await chooseOption(page, "Size", "Small");
  await chooseOption(page, "Surface", "Raised surface");
  await expect(card).toHaveAttribute("data-size", "sm");
  await expect(card).toHaveAttribute("data-surface", "raised");
  await expect(card).toHaveCSS("padding-top", "12px");
  await expect(
    card.getByRole("button", { name: "Review tasks" }),
  ).toHaveAttribute("data-size", "sm");
  await card.getByRole("button", { name: "Review tasks" }).click();
  await expect(card.getByText("Reviewed", { exact: true })).toBeVisible();
  await chooseOption(page, "Parts", "Header and content");
  await expect(card.locator('[data-slot="card-footer"]')).toHaveCount(0);
  await expect(card).toHaveCSS("padding-bottom", "12px");
  await chooseOption(page, "Parts", "Content only");
  await expect(card.locator('[data-slot="card-header"]')).toHaveCount(0);
  await expect(card.locator('[data-slot="card-content"]')).toBeVisible();
});

test("settings panel covers ready, loading, empty, error, and unavailable states", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openCard(page);
  const panel = example(page, "Settings panel");
  const card = panel.getByTestId("accounts-card");
  await expect(card).toHaveAttribute("data-surface", "raised");
  await expect(card.locator(":scope > *")).toHaveCount(1);
  const accounts = card.getByRole("list", { name: "GitHub accounts" });
  await expect(accounts.getByRole("listitem")).toHaveCount(3);
  await expect(
    accounts.getByText("Reconnect required", { exact: true }),
  ).toBeVisible();

  const manage = card.getByRole("button", { name: "Manage accounts" });
  await expect(manage).toHaveAttribute("aria-expanded", "false");
  await manage.focus();
  await page.keyboard.press("Enter");
  const settings = card.getByRole("region", { name: "Account settings" });
  await expect(settings).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Hide account settings" }),
  ).toHaveAttribute("aria-expanded", "true");
  await settings
    .getByRole("button", { name: "Disconnect @meadow-labs" })
    .click();
  await expect(card.getByRole("status")).toHaveText(
    "@meadow-labs was disconnected.",
  );
  await expect(
    accounts.getByText("Disconnected", { exact: true }),
  ).toBeVisible();
  await expect(
    settings.getByRole("button", { name: "Disconnect @meadow-labs" }),
  ).toBeDisabled();
  await accounts
    .getByRole("button", { name: "Reconnect @meadow-labs" })
    .click();
  await expect(accounts.getByText("Connected", { exact: true })).toHaveCount(2);
  await accounts.getByRole("button", { name: "Dismiss attempt" }).click();
  await expect(accounts.getByRole("listitem")).toHaveCount(2);

  await chooseOption(page, "Account state", "Loading");
  await expect(card.getByRole("status")).toContainText(
    "Loading GitHub accounts…",
  );
  await expect(card.locator(".card-demo-skeleton")).toHaveCount(2);

  await chooseOption(page, "Account state", "Empty");
  await expect(
    card.getByRole("heading", { name: "No personal GitHub accounts" }),
  ).toBeVisible();
  await card.getByRole("button", { name: "Connect GitHub account" }).click();
  await expect(card.getByRole("status").last()).toContainText("GitHub sign-in");

  await chooseOption(page, "Account state", "Unavailable");
  await expect(
    card.getByRole("heading", { name: "GitHub account access unavailable" }),
  ).toBeVisible();

  await chooseOption(page, "Account state", "Error");
  await expect(card.getByRole("alert")).toContainText(
    "Could not load GitHub accounts",
  );
  await card.getByRole("button", { name: "Check GitHub accounts" }).click();
  await expect(
    card.getByRole("list", { name: "GitHub accounts" }),
  ).toBeVisible();
});

test("content list adds sources, shows stale and empty states, and moves focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openCard(page);
  const card = example(page, "Content list").getByTestId("knowledge-card");
  const sources = card.getByRole("list", { name: "Existing imports" });
  await expect(sources.getByRole("listitem")).toHaveCount(2);
  await card.getByRole("button", { name: "Add repositories" }).click();
  await expect(sources.getByRole("listitem")).toHaveCount(3);
  await expect(
    card.getByRole("heading", { name: "Repositories in Knowledge" }),
  ).toBeFocused();
  await expect(card.getByRole("status")).toContainText(
    "alex-meadow/volunteer-rota was saved.",
  );

  await chooseOption(page, "Source state", "Stale");
  await expect(card.getByRole("alert")).toContainText(
    "Could not update source status.",
  );
  await card
    .getByRole("button", { name: "Retry loading GitHub sources" })
    .click();
  await expect(card.getByRole("alert")).toHaveCount(0);

  await chooseOption(page, "Source state", "Empty");
  await expect(card.getByText("No repositories imported yet")).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Add repositories" }),
  ).toHaveCount(1);
  await card.getByRole("button", { name: "Add repositories" }).click();
  await expect(
    card.getByRole("list", { name: "Existing imports" }),
  ).toBeVisible();
});

test("small pending cards align footers, clamp titles, and are keyboard reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openCard(page);
  const section = example(page, "Pending items");
  const articles = section.locator("article");
  await expect(articles).toHaveCount(3);
  const cards = section.locator('[data-slot="card"]');
  const rows = new Map<
    number,
    { heights: Set<number>; bottoms: Set<number> }
  >();
  for (const card of await cards.all()) {
    await expect(card).toHaveAttribute("data-size", "sm");
    await expect(card).toHaveCSS("padding-bottom", "0px");
    const cardBox = await box(card);
    const footer = await box(card.locator('[data-slot="card-footer"]'));
    const row = rows.get(Math.round(cardBox.y)) ?? {
      heights: new Set<number>(),
      bottoms: new Set<number>(),
    };
    row.heights.add(Math.round(cardBox.height));
    row.bottoms.add(Math.round(footer.y + footer.height));
    rows.set(Math.round(cardBox.y), row);
    expect(Math.round(footer.y + footer.height)).toBe(
      Math.round(cardBox.y + cardBox.height - 1),
    );
  }
  expect(rows.size).toBeLessThan(3);
  for (const row of rows.values()) {
    expect(row.heights.size).toBe(1);
    expect(row.bottoms.size).toBe(1);
  }

  const longTitle = section.getByRole("link", {
    name: /Confirm the greenhouse irrigation quote/,
  });
  const clamp = longTitle.locator(".card-demo-clamp");
  const lineHeight = await clamp.evaluate((node) =>
    parseFloat(getComputedStyle(node).lineHeight),
  );
  expect((await box(clamp)).height).toBeLessThanOrEqual(lineHeight * 2 + 1);
  expect(
    await clamp.evaluate((node) => node.scrollHeight > node.clientHeight),
  ).toBe(true);
  await expect(longTitle).toHaveAttribute("title", /Friday afternoon$/);

  await longTitle.focus();
  await page.keyboard.press("Tab");
  await expect(
    articles.first().getByRole("button", { name: "Reserve time" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  const rota = section.getByRole("link", { name: "Draft volunteer rota" });
  await expect(rota).toBeFocused();
  const outline = await rota.evaluate(
    (node) => getComputedStyle(node).outlineStyle,
  );
  const ring = await rota.evaluate((node) => getComputedStyle(node).boxShadow);
  expect(outline !== "none" || ring !== "none").toBe(true);
  await page.keyboard.press("Tab");
  const reserve = articles
    .filter({ has: page.getByRole("link", { name: "Draft volunteer rota" }) })
    .getByRole("button", { name: "Reserve time" });
  await expect(reserve).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(section.getByRole("status")).toHaveText(
    "Reserved 09:00 tomorrow for Draft volunteer rota.",
  );
  await page.keyboard.press("Tab");
  await expect(
    section.getByRole("link", {
      name: "Approve spring seed order",
      exact: true,
    }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  const review = section.getByRole("link", {
    name: "Review Approve spring seed order",
  });
  await expect(review).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(section.getByRole("status")).toHaveText(
    "Opened Approve spring seed order.",
  );
});

test("cards nest in page content and side panels", async ({ page }) => {
  await openCard(page);
  const regions = example(page, "Inside page regions");
  const pageContent = regions.getByRole("group", { name: "Page content" });
  await expect(
    pageContent.locator('[data-slot="page-content"] > [data-slot="card"]'),
  ).toHaveCount(1);
  const panel = regions.getByRole("group", { name: "Side panel" });
  const card = panel.locator('[data-slot="card"]');
  await expect(card.locator('[data-slot="card-footer"]')).toHaveCount(0);
  await expect(card).toHaveCSS("padding-bottom", "16px");
  await expect(card.locator('[data-slot="badge"]')).toHaveText("Ready");
});

test("transitions are subtle and stop for reduced motion", async ({ page }) => {
  await openCard(page);
  const card = example(page, "Sizes").getByTestId("size-default");
  const durations = await card.evaluate(
    (node) => getComputedStyle(node).transitionDuration,
  );
  for (const value of durations.split(",")) {
    const ms = parseFloat(value) * 1000;
    expect(ms).toBeGreaterThanOrEqual(120);
    expect(ms).toBeLessThanOrEqual(180);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(card).toHaveCSS("transition-duration", "0s");
});
