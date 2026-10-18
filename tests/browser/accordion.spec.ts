import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/accordion/";
const savedProposal = "6f1c2a9e-4b7d-4e2a-9c51-0d3e8f7a1b24";

async function open(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const example = (page: Page, name: string) =>
  page.locator("section.accordion-demo-card").filter({
    has: page.locator(`h3:text-is("${name}")`),
  });

const trigger = (scope: Locator, name: string) =>
  scope.getByRole("button", { name, exact: true });

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation instanceof CSSTransition)
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

async function rotation(locator: Locator) {
  return locator.evaluate((node) => {
    const value = getComputedStyle(node).transform;
    if (value === "none") return 0;
    const [a, b] = value.slice(7, -1).split(",").map(Number);
    return Math.round((Math.atan2(b, a) * 180) / Math.PI);
  });
}

const sections = [
  "Single and multiple",
  "Trigger variants",
  "Calendar filters",
  "GitHub import settings",
  "Proposal recovery",
  "Integration details",
];

async function openEverything(page: Page) {
  const calendar = example(page, "Calendar filters");
  await trigger(calendar, "Google calendars").click();
  await trigger(calendar, "Time zones").click();
  await trigger(example(page, "Trigger variants"), "Google calendars").click();
  await trigger(
    example(page, "Trigger variants"),
    "About this integration",
  ).click();
  await trigger(
    example(page, "GitHub import settings"),
    "Import settings",
  ).click();
  await trigger(
    example(page, "Proposal recovery"),
    "Recover a saved proposal",
  ).click();
  await trigger(
    example(page, "Integration details"),
    "About this integration",
  ).click();
  await settle(page);
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`accordion ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        await open(page);
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
        for (const state of ["closed", "open"]) {
          if (state === "open") await openEverything(page);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          const overflowing = await page
            .locator(
              'main [data-slot="accordion-trigger"], main [data-slot="accordion-content"], main .accordion-demo-card-body',
            )
            .evaluateAll((nodes) =>
              nodes
                .filter((node) => node.scrollWidth > node.clientWidth + 1)
                .map((node) => node.textContent?.slice(0, 40)),
            );
          expect(overflowing).toEqual([]);
          const results = await new AxeBuilder({ page })
            .include("main")
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze();
          expect(results.violations).toEqual([]);
          for (const name of sections) {
            const slug = name.toLowerCase().replaceAll(" ", "-");
            const file = `accordion-${slug}-${state}-${theme}-${mode}-${width}`;
            const path = testInfo.outputPath(`${file}.png`);
            const shot = await example(page, name).screenshot({
              animations: "disabled",
              path,
            });
            expect(shot.byteLength).toBeGreaterThan(5_000);
            await testInfo.attach(file, { path, contentType: "image/png" });
          }
        }
      });
    }
  }
}

test("single mode keeps one section open, multiple keeps several, disabled stays shut", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const hero = example(page, "Single and multiple");
  for (const [group, multiple] of [
    ["Single open", false],
    ["Multiple open", true],
  ] as const) {
    const scope = hero.getByRole("group", { name: group });
    const first = trigger(scope, "What is this example?");
    const second = trigger(scope, "Can I open more than one?");
    const disabled = trigger(scope, "Disabled item");
    await expect(first).toHaveAttribute("aria-expanded", "true");
    await expect(scope.getByText("Real shared components")).toBeVisible();
    await second.click();
    await expect(second).toHaveAttribute("aria-expanded", "true");
    await expect(first).toHaveAttribute("aria-expanded", String(multiple));
    await expect(disabled).toBeDisabled();
    await disabled.click({ force: true });
    await expect(disabled).toHaveAttribute("aria-expanded", "false");
    await expect(scope.getByText("Unavailable")).toHaveCount(0);
  }
});

test("keyboard tabs between triggers, skips disabled, and toggles", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const scope = example(page, "Single and multiple").getByRole("group", {
    name: "Single open",
  });
  const first = trigger(scope, "What is this example?");
  const second = trigger(scope, "Can I open more than one?");
  await first.focus();
  await expect(first).toBeFocused();
  const outline = await first.evaluate(
    (node) => getComputedStyle(node).outlineStyle,
  );
  expect(outline).toBe("solid");
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Tab");
  await expect(second).toBeFocused();
  await page.keyboard.press("Space");
  await expect(second).toHaveAttribute("aria-expanded", "true");
  const panel = scope.getByRole("region", {
    name: "Can I open more than one?",
  });
  await expect(panel).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(trigger(scope, "Disabled item")).not.toBeFocused();
  await expect(scope.locator(":focus")).toHaveCount(0);
  await page.keyboard.press("Shift+Tab");
  await expect(second).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await expect(second).toHaveAttribute("aria-expanded", "false");
});

test("default underlines on hover, quiet does not, and the chevron turns", async ({
  page,
}) => {
  await open(page);
  const variants = example(page, "Trigger variants");
  const plain = trigger(variants, "About this integration");
  const quiet = trigger(variants, "Google calendars");
  await expect(plain).toHaveAttribute("data-variant", "default");
  await expect(quiet).toHaveAttribute("data-variant", "quiet");
  await expect(quiet).toHaveAttribute(
    "aria-describedby",
    "variant-source-summary",
  );
  await expect(quiet).toHaveAccessibleDescription("2 of 3 shown");
  await plain.hover();
  expect(
    await plain.evaluate((node) => getComputedStyle(node).textDecorationLine),
  ).toBe("underline");
  await quiet.hover();
  expect(
    await quiet.evaluate((node) => getComputedStyle(node).textDecorationLine),
  ).toBe("none");
  const icon = plain.locator('[data-slot="accordion-trigger-icon"]');
  expect(await rotation(icon)).toBe(0);
  const duration = await icon.evaluate(
    (node) => getComputedStyle(node).transitionDuration,
  );
  expect(duration).toBe("0.12s");
  await plain.click();
  await settle(page);
  expect(Math.abs(await rotation(icon))).toBe(180);
  const content = variants.locator('[data-slot="accordion-content"]').first();
  expect(
    await content.evaluate((node) => getComputedStyle(node).transitionDuration),
  ).toBe("0.18s");
});

test("reduced motion removes transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const icon = example(page, "Trigger variants")
    .locator('[data-slot="accordion-trigger-icon"]')
    .first();
  expect(
    await icon.evaluate((node) => getComputedStyle(node).transitionDuration),
  ).toBe("0s");
});

test("calendar filter summaries follow the choices inside", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const calendar = example(page, "Calendar filters");
  const sources = trigger(calendar, "Google calendars");
  const zones = trigger(calendar, "Time zones");
  await expect(sources).toHaveAccessibleDescription("2 of 3 shown");
  await expect(zones).toHaveAccessibleDescription("London · New York");
  await sources.click();
  await zones.click();
  await expect(sources).toHaveAttribute("aria-expanded", "true");
  await expect(zones).toHaveAttribute("aria-expanded", "true");
  await calendar
    .getByRole("checkbox", { name: "Holidays in United Kingdom" })
    .check();
  await expect(sources).toHaveAccessibleDescription("3 of 3 shown");
  await expect(
    calendar.getByRole("link", { name: "Manage integrations" }),
  ).toBeVisible();
  await chooseOption(page, "Calendar time zone", "Kolkata");
  await expect(zones).toHaveAccessibleDescription("Kolkata · New York");
  await chooseOption(page, "Second time zone", "None");
  await expect(zones).toHaveAccessibleDescription("Kolkata");
});

test("controlled import settings swap with their summary", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const settings = example(page, "GitHub import settings");
  const summary = settings.getByTestId("import-summary");
  await expect(summary).toHaveText(
    "Documentation, Issues · since Apr 1, 2026 · only you",
  );
  await trigger(settings, "Import settings").click();
  await expect(summary).toHaveCount(0);
  await settings.getByRole("checkbox", { name: "Documentation" }).uncheck();
  await settings.getByRole("checkbox", { name: "Issues" }).uncheck();
  await expect(settings.getByRole("alert")).toHaveText(
    "Choose at least one kind of content.",
  );
  await settings
    .getByRole("checkbox", { name: "Share with selected workspace members" })
    .check();
  await trigger(settings, "Import settings").click();
  await expect(summary).toHaveText(
    "Choose content · since Apr 1, 2026 · 3 readers + you",
  );
});

test("proposal recovery shows idle, loading, error, and loaded states", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const recovery = example(page, "Proposal recovery");
  const head = trigger(recovery, "Recover a saved proposal");
  await expect(head).toHaveAttribute("aria-expanded", "false");
  await head.click();
  const input = recovery.getByLabel("Proposal reference");
  const load = recovery.getByRole("button", {
    name: /^Load(ing)? saved proposal/,
  });
  await expect(load).toBeDisabled();
  await input.fill("00000000-0000-4000-8000-000000000000");
  await expect(load).toBeEnabled();
  await load.click();
  await expect(load).toHaveAttribute("aria-busy", "true");
  await expect(load).toHaveText("Loading saved proposal…");
  await expect(recovery.getByRole("alert")).toHaveText(
    "No saved proposal matches this reference.",
  );
  await input.fill(savedProposal);
  await expect(recovery.getByRole("alert")).toHaveCount(0);
  await load.click();
  await expect(recovery.getByRole("status")).toContainText("Proposal loaded.");
});

test("integration details space paragraphs and underline links", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const details = example(page, "Integration details");
  await details
    .getByRole("checkbox", { name: "Automatic Knowledge is on" })
    .check();
  await trigger(details, "About this integration").click();
  const link = details.getByRole("link", { name: "Automatic Knowledge" });
  await expect(link).toBeVisible();
  expect(
    await link.evaluate((node) => getComputedStyle(node).textDecorationLine),
  ).toBe("underline");
  const first = details.locator('[data-slot="accordion-content"] p').first();
  expect(
    await first.evaluate((node) => getComputedStyle(node).marginBottom),
  ).not.toBe("0px");
});
