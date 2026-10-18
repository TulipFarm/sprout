import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/badge/";

async function openBadge(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#badge-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`badge ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openBadge(page);
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
        const variants = example(page, "Variants and sizes");
        await expect(variants.locator('[data-slot="badge"]')).toHaveCount(18);
        const primary = await page.evaluate(() =>
          getComputedStyle(document.documentElement)
            .getPropertyValue("--sprout-primary")
            .trim(),
        );
        const rgb = await page.evaluate((color) => {
          const probe = document.createElement("span");
          probe.style.color = color;
          document.body.append(probe);
          const value = getComputedStyle(probe).color;
          probe.remove();
          return value;
        }, primary);
        await expect(
          variants.locator('[data-variant="default"][data-size="default"]'),
        ).toHaveCSS("color", rgb);
        const results = await new AxeBuilder({ page })
          .include("#badge-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(`badge-${theme}-${mode}-${width}.png`);
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`badge-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("tones differ between light and dark and from each other", async ({
  page,
}) => {
  await openBadge(page);
  const variants = example(page, "Variants and sizes");
  const read = () =>
    variants
      .locator('[data-size="default"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node).backgroundColor),
      );
  await chooseOption(page, "Color mode", "Light");
  const light = await read();
  await chooseOption(page, "Color mode", "Dark");
  const dark = await read();
  for (const index of [0, 1, 2, 3, 4, 5]) {
    expect(dark[index]).not.toBe(light[index]);
  }
  expect(new Set(light.slice(0, 6)).size).toBe(6);
  await expect(
    variants.locator('[data-variant="outline"][data-size="default"]'),
  ).not.toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
});

test("default and chip sizes keep their geometry", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openBadge(page);
  const pill = example(page, "Variants and sizes").locator(
    '[data-variant="success"][data-size="default"]',
  );
  await expect(pill).toHaveCSS("height", "20px");
  await expect(pill).toHaveCSS("white-space", "nowrap");
  await expect(pill.locator("svg")).toHaveCSS("width", "12px");
  const chips = example(page, "Chips");
  const calendar = chips.locator('[data-size="chip"]').filter({
    hasText: "group.calendar.example.com",
  });
  const box = await calendar.boundingBox();
  const parent = await calendar.locator("..").boundingBox();
  expect(box && parent).toBeTruthy();
  expect(box!.height).toBeGreaterThan(24);
  expect(box!.width).toBeLessThanOrEqual(parent!.width + 0.5);
  const card = await chips.boundingBox();
  for (const remove of await chips
    .getByRole("button", { name: /^Remove skill/ })
    .all()) {
    const button = await remove.boundingBox();
    expect(button!.x + button!.width).toBeLessThanOrEqual(
      card!.x + card!.width - 16,
    );
  }
  const removed = chips.locator('[data-variant="destructive"]');
  await expect(removed).toContainText("Removes Priya Nair");
  await expect(removed.locator(".badge-demo-strike")).toHaveCSS(
    "text-decoration-line",
    "line-through",
  );
  await expect(
    chips.getByRole("img", {
      name: "Skill Handle a refund request, version 9f8e7d6c",
    }),
  ).toBeVisible();
});

test("long values truncate inside the badge without overflowing", async ({
  page,
}) => {
  await openBadge(page);
  const overflow = example(page, "Overflow");
  const long = overflow.locator(".badge-demo-truncate").filter({
    hasText: "Billing and invoicing enquiries from enterprise",
  });
  expect(
    await long.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  const cell = overflow.locator(".badge-demo-cell");
  expect(
    await cell.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await expect(overflow.getByText("+2", { exact: true })).toHaveAttribute(
    "data-variant",
    "outline",
  );
  await expect(
    overflow.locator('[data-variant="ghost"]', { hasText: "No status" }),
  ).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});

test("app-owned loading, empty, error and ready states", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openBadge(page);
  const region = example(page, "Status in lists");
  const list = region.getByRole("list", { name: "Integrations" });
  await expect(list.getByText("Connected")).toBeVisible();
  await expect(list.locator('[data-variant="outline"]')).toHaveCount(3);

  await chooseOption(page, "Integration state", "Loading");
  await expect(list).toHaveAttribute("aria-busy", "true");
  await expect(list.getByText("Checking")).toHaveCount(6);
  const spinner = list.locator(".badge-demo-spin").first();
  await expect(spinner).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(spinner).toHaveCSS("animation-name", "badge-demo-spin");
  await page.emulateMedia({ reducedMotion: "reduce" });

  await chooseOption(page, "Integration state", "Empty");
  await expect(region.getByText("No integrations yet.")).toBeVisible();
  await expect(list).toHaveCount(0);

  await chooseOption(page, "Integration state", "Error");
  await expect(list.locator('[data-variant="destructive"]')).toHaveCount(6);
  await expect(list.getByText("Couldn’t check").first()).toBeVisible();

  await chooseOption(page, "Integration state", "Ready");
  await expect(list.locator('[data-variant="success"]')).toHaveText(
    "Connected",
  );
  const table = region.getByRole("table", { name: "Agent tasks" });
  for (const variant of [
    "warning",
    "success",
    "secondary",
    "destructive",
    "info",
  ])
    await expect(table.locator(`[data-variant="${variant}"]`)).toHaveCount(1);
});

test("keyboard reaches rendered links and buttons with a visible focus ring", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openBadge(page);
  const region = example(page, "Rendered as links and buttons");
  const link = region.getByRole("link", { name: "View workflow" });
  await expect(link).toHaveAttribute("data-slot", "badge");
  await example(page, "In headings and status regions")
    .getByRole("button", { name: "Next status" })
    .focus();
  await page.keyboard.press("Tab");
  await expect(link).toBeFocused();
  await expect(link).toHaveCSS("outline-style", "solid");
  await expect(link).toHaveCSS("outline-width", "2px");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#badge-api$/);
  await link.focus();
  await page.keyboard.press("Tab");
  await expect(
    region.getByRole("link", { name: "Outline link" }),
  ).toBeFocused();
  const button = region.getByRole("button", { name: "Ghost button" });
  await button.focus();
  await expect(button).toHaveAttribute("data-variant", "ghost");
  await expect(button).toHaveCSS("cursor", "pointer");
  await expect(
    region.getByRole("link", { name: "badgeVariants()" }),
  ).toHaveClass("sprout-badge sprout-badge-info");
  const staticBadge = example(page, "Variants and sizes")
    .locator('[data-slot="badge"]')
    .first();
  expect(await staticBadge.evaluate((node) => node.tabIndex)).toBe(-1);
  const invalid = region.getByText("Invalid value");
  const danger = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--sprout-danger)";
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  });
  await expect(invalid).toHaveCSS("border-top-color", danger);
});

test("hover tones apply to interactive badges only", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openBadge(page);
  const region = example(page, "Rendered as links and buttons");
  const outline = region.getByRole("link", { name: "Outline link" });
  const before = await outline.evaluate(
    (node) => getComputedStyle(node).backgroundColor,
  );
  await outline.hover();
  await expect(outline).not.toHaveCSS("background-color", before);
  const linkBadge = region.getByRole("link", { name: "View workflow" });
  await linkBadge.hover();
  await expect(linkBadge).toHaveCSS("text-decoration-line", "underline");
  const staticOutline = example(page, "Overflow").getByText("+2", {
    exact: true,
  });
  await staticOutline.hover();
  await expect(staticOutline).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});

test("counts, chips and status regions update with the keyboard", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openBadge(page);
  const counts = example(page, "Icons and counts");
  const filters = counts.getByRole("button", { name: /^Filters/ });
  await expect(filters.locator('[data-slot="badge"]')).toHaveText("2");
  await filters.focus();
  await page.keyboard.press("Enter");
  await expect(filters.locator('[data-slot="badge"]')).toHaveText("3");
  await page.keyboard.press("Space");
  await expect(filters.locator('[data-slot="badge"]')).toHaveCount(0);
  await expect(filters).toHaveText("Filters");
  await expect(
    counts.locator('[data-slot="badge"] [data-icon="inline-end"]'),
  ).toHaveCount(1);
  await expect(counts.getByText("Open", { exact: true })).toHaveCSS(
    "padding-right",
    "6px",
  );

  const chips = example(page, "Chips");
  const skills = chips.getByRole("list", { name: "Selected skills" });
  for (const name of [
    "Qualify an inbound lead",
    "Prepare a quarterly review with revenue, churn, and open risks",
  ]) {
    await skills.getByRole("button", { name: `Remove skill ${name}` }).focus();
    await page.keyboard.press("Enter");
    await expect(skills.getByTitle(name)).toHaveCount(0);
  }
  await expect(skills.getByText("No skills selected.")).toBeVisible();

  const status = example(page, "In headings and status regions");
  const live = status.getByRole("status", { name: "Proposal status" });
  await expect(live).toHaveText("Not yet applied");
  const next = status.getByRole("button", { name: "Next status" });
  for (const [label, variant] of [
    ["In progress", "info"],
    ["Created", "success"],
    ["Failed", "destructive"],
    ["Rejected", "secondary"],
  ]) {
    await next.press("Enter");
    await expect(live).toHaveText(label);
    await expect(live.locator('[data-slot="badge"]')).toHaveAttribute(
      "data-variant",
      variant,
    );
  }
});

test("micro transitions respect reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openBadge(page);
  const badge = example(page, "Variants and sizes")
    .locator('[data-slot="badge"]')
    .first();
  await expect(badge).toHaveCSS(
    "transition-duration",
    "0.12s, 0.12s, 0.12s, 0.18s",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(badge).toHaveCSS("transition-duration", "0s");
});
