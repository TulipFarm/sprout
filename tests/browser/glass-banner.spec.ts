import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

// Chips float forever; reduced motion stops that so helpers that await every
// animation can settle. Tests that need full motion opt back in.
test.use({ reducedMotion: "reduce" });

async function openBanner(page: Page) {
  await page.goto("/components/glass-banner/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const playground = (page: Page) =>
  page.getByRole("region", { name: "Glass banner playground" });
const stageBanner = (page: Page) =>
  playground(page).locator('[data-slot="glass-banner"]');

async function inside(inner: Locator, outer: Locator) {
  const a = (await inner.boundingBox())!;
  const b = (await outer.boundingBox())!;
  return (
    a.x >= b.x - 1 &&
    a.y >= b.y - 1 &&
    a.x + a.width <= b.x + b.width + 1 &&
    a.y + a.height <= b.y + b.height + 1
  );
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`glass banner ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openBanner(page);
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
        // Every chip stays inside its banner and nothing spills sideways.
        const banners = page.locator('[data-slot="glass-banner"]');
        const count = await banners.count();
        expect(count).toBeGreaterThanOrEqual(5);
        for (let i = 0; i < count; i++) {
          const banner = banners.nth(i);
          expect(
            await banner.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          ).toBe(true);
          const chips = banner.locator('[data-slot="glass-chip"]');
          for (let c = 0; c < (await chips.count()); c++)
            expect(await inside(chips.nth(c), banner)).toBe(true);
        }
        // Glass ink follows the color mode.
        const ink = await stageBanner(page).evaluate(
          (el) => getComputedStyle(el).color,
        );
        expect(ink).toBe(
          mode === "light" ? "rgb(29, 39, 66)" : "rgb(227, 232, 245)",
        );
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`glass-banner-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
        for (const demo of ["starters", "layouts", "integrations"]) {
          const part = await page.locator(`[data-demo="${demo}"]`).screenshot();
          await testInfo.attach(
            `glass-banner-${demo}-${theme}-${mode}-${width}`,
            { body: part, contentType: "image/png" },
          );
        }
        const stage = await playground(page).screenshot();
        await testInfo.attach(
          `glass-banner-playground-${theme}-${mode}-${width}`,
          { body: stage, contentType: "image/png" },
        );
      });
    }
  }
}

test("renders the Cloud compositions with named chip lists", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openBanner(page);
  const starters = page.locator('[data-demo="starters"]');
  await expect(starters.getByText("Grow your next idea")).toBeVisible();
  const starterList = starters.getByRole("list", {
    name: "Fictional project starters",
  });
  await expect(starterList.getByRole("listitem")).toHaveText([
    "Garden notes",
    "Plan a project",
    "Try a new workflow",
  ]);
  await expect(
    starterList.locator('[data-slot="glass-chip-icon"]'),
  ).toHaveCount(2);
  await expect(
    starters.locator('[data-slot="glass-banner-art"]'),
  ).toHaveAttribute("aria-hidden", "true");
  await expect(starters.locator('[data-slot="glass-bubble"]')).toHaveCount(5);

  const activity = playground(page).getByRole("list", {
    name: "Example activity",
  });
  await expect(activity.getByRole("listitem")).toHaveText([
    "Drafted 3 follow-ups",
    "Answered in #support",
    "Triaged 5 new issues",
  ]);
  for (const brand of ["gmail", "slack", "jira"])
    await expect(
      activity.locator(
        `[data-slot="glass-chip-icon"] [data-slot="brand-icon"][data-brand="${brand}"][data-size="glyph"]`,
      ),
    ).toHaveCount(1);

  // Without a caption the title names the list.
  await expect(
    page.getByRole("list", { name: "Grow your next idea" }),
  ).toHaveCount(1);
});

test("wide banners scatter chips; narrow banners wrap them", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openBanner(page);
  const layouts = page.locator('[data-demo="layouts"]');
  const wide = layouts
    .getByRole("region", { name: "Wide · chips float over the art" })
    .locator('[data-slot="glass-banner"]');
  const narrow = layouts
    .getByRole("region", { name: "Narrow · chips wrap below the title" })
    .locator('[data-slot="glass-banner"]');
  expect((await wide.boundingBox())!.width).toBeGreaterThanOrEqual(704);
  expect((await narrow.boundingBox())!.width).toBeLessThan(704);
  const position = (banner: Locator) =>
    banner
      .locator('[data-slot="glass-chip"]')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).position));
  expect(await position(wide)).toEqual(["absolute", "absolute", "absolute"]);
  expect(await position(narrow)).toEqual(["static", "static", "static"]);
  const tilt = await wide
    .locator('[data-slot="glass-chip-surface"]')
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).rotate));
  expect(tilt).toEqual(["3deg", "-4deg", "1.5deg"]);
  // Scattered chips do not cover the title or caption text.
  const textBoxes = await wide
    .locator('[data-slot="glass-banner-copy"] p')
    .evaluateAll((els) =>
      els.map((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
    );
  expect(textBoxes).toHaveLength(2);
  for (const chip of await wide.locator('[data-slot="glass-chip"]').all()) {
    const box = (await chip.boundingBox())!;
    for (const title of textBoxes) {
      const overlaps =
        box.x < title.x + title.width &&
        box.x + box.width > title.x &&
        box.y < title.y + title.height &&
        box.y + box.height > title.y;
      expect(overlaps).toBe(false);
    }
  }
  // Long chip text wraps inside the narrow banner.
  const long = layouts.getByText(/Summarize the quarterly/);
  expect((await long.boundingBox())!.height).toBeGreaterThan(20);
  // Text-only chips have even padding; icon chips tuck around the bubble.
  const pad = (chip: Locator) =>
    chip
      .locator('[data-slot="glass-chip-surface"]')
      .evaluate((el) => getComputedStyle(el).paddingLeft);
  const chips = layouts
    .getByRole("list", { name: "Grow your next idea" })
    .locator('[data-slot="glass-chip"]');
  expect(await pad(chips.nth(0))).toBe("14px");
  expect(await pad(chips.nth(1))).toBe("4px");

  // Four or more chips always wrap, even on a wide banner.
  await wide.evaluate((el) => {
    const list = el.querySelector('[data-slot="glass-banner-chips"]')!;
    list.append(list.firstElementChild!.cloneNode(true));
  });
  expect(await position(wide)).toEqual([
    "static",
    "static",
    "static",
    "static",
  ]);
});

test("playground is keyboard operable and chips take no focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openBanner(page);
  const foot = playground(page).locator(".glass-demo-foot");
  await expect(foot).toHaveText("App activity · wide · caption · icons");

  const content = playground(page).getByRole("combobox", { name: "Content" });
  await content.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(
    page.getByRole("option", { name: "App activity" }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(content).toBeFocused();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(foot).toHaveText("Project starters · wide · caption · icons");
  await expect(stageBanner(page)).toContainText("Grow your next idea");

  await page.keyboard.press("Tab");
  await expect(
    playground(page).getByRole("combobox", { name: "Width" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(
    page.getByRole("option", { name: "Wide (scattered chips)" }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(foot).toContainText("narrow");
  expect((await stageBanner(page).boundingBox())!.width).toBeLessThanOrEqual(
    352 + 1,
  );

  await page.keyboard.press("Tab");
  const caption = playground(page).getByRole("button", { name: "Caption" });
  await expect(caption).toBeFocused();
  await page.keyboard.press("Space");
  await expect(caption).toHaveAttribute("aria-pressed", "false");
  await expect(
    stageBanner(page).locator('[data-slot="glass-banner-caption"]'),
  ).toHaveCount(0);
  await expect(
    playground(page).getByRole("list", { name: "Grow your next idea" }),
  ).toBeVisible();

  await page.keyboard.press("Tab");
  const icons = playground(page).getByRole("button", { name: "Icons" });
  await expect(icons).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    stageBanner(page).locator('[data-slot="glass-chip-icon"]'),
  ).toHaveCount(0);
  await expect(foot).toHaveText(
    "Project starters · narrow · no caption · no icons",
  );

  // The next tab stop skips past the chips entirely.
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => !!document.activeElement?.closest('[data-slot="glass-banner"]'),
    ),
  ).toBe(false);
  await expect(
    page.locator(
      '[data-slot="glass-chip"][tabindex], [data-slot="glass-chip"] [tabindex]',
    ),
  ).toHaveCount(0);
});

async function drag(page: Page, chip: Locator, dx: number, dy: number) {
  await chip.scrollIntoViewIfNeeded();
  const box = (await chip.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 8; step++)
    await page.mouse.move(x + (dx * step) / 8, y + (dy * step) / 8);
}

test("chips stretch while dragged and spring home", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openBanner(page);
  const chip = page
    .locator('[data-demo="starters"] [data-slot="glass-chip"]')
    .first();
  await expect(chip).toHaveCSS("cursor", "grab");
  const surface = chip.locator('[data-slot="glass-chip-surface"]');
  expect(
    await surface.evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("sprout-glass-float");

  await chip.scrollIntoViewIfNeeded();
  const before = (await chip.boundingBox())!;
  await drag(page, chip, 80, 40);
  await expect(chip).toHaveAttribute("data-dragging", "");
  await expect(chip).toHaveCSS("cursor", "grabbing");
  await expect
    .poll(async () => (await chip.boundingBox())!.x - before.x)
    .toBeGreaterThan(40);
  expect(await chip.evaluate((el) => el.style.transform)).toContain(
    "translate(",
  );
  await page.mouse.up();
  // It springs, then rests with no transform at its starting spot.
  await expect(chip).not.toHaveAttribute("data-dragging", "", {
    timeout: 4000,
  });
  expect(await chip.evaluate((el) => el.style.transform)).toBe("");
  const after = (await chip.boundingBox())!;
  expect(Math.abs(after.x - before.x)).toBeLessThan(2);

  // Only the primary button drags.
  const box = (await chip.boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(box.x + 90, box.y + 50);
  await expect(chip).not.toHaveAttribute("data-dragging", "");
  await page.mouse.up({ button: "right" });
});

test("reduced motion stops the float and snaps chips home", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openBanner(page);
  const chip = page
    .locator('[data-demo="starters"] [data-slot="glass-chip"]')
    .nth(1);
  expect(
    await chip
      .locator('[data-slot="glass-chip-surface"]')
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await chip.scrollIntoViewIfNeeded();
  const before = (await chip.boundingBox())!;
  await drag(page, chip, -60, 30);
  await expect(chip).toHaveAttribute("data-dragging", "");
  await page.mouse.up();
  // Snaps back in the same task, without a spring.
  expect(
    await chip.evaluate((el) => [
      el.style.transform,
      el.hasAttribute("data-dragging"),
    ]),
  ).toEqual(["", false]);
  const after = (await chip.boundingBox())!;
  expect(Math.abs(after.x - before.x)).toBeLessThan(1);
});

test("integrations page shows the banner only on All with no search", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openBanner(page);
  const demo = page.locator('[data-demo="integrations"]');
  const banner = demo.locator('[data-slot="glass-banner"]');
  const rail = demo.getByRole("navigation", { name: "Filter apps" });
  await expect(banner).toHaveCount(1);
  await expect(rail.getByRole("button", { name: "All" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await rail.getByRole("button", { name: "Connected" }).click();
  await expect(banner).toHaveCount(0);
  await expect(
    demo.getByRole("list", { name: "Apps" }).getByRole("listitem"),
  ).toHaveCount(2);

  await rail.getByRole("button", { name: "All" }).click();
  await expect(banner).toHaveCount(1);

  const search = demo
    .getByRole("searchbox", { name: "Search apps" })
    .or(demo.getByRole("textbox", { name: "Search apps" }));
  await search.fill("zzz");
  await expect(banner).toHaveCount(0);
  await expect(demo.getByText("No apps match “zzz”")).toBeVisible();
  await search.press("Escape");
  await expect(search).toHaveValue("");
  await expect(banner).toHaveCount(1);
});
