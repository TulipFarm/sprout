import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

test.use({ reducedMotion: "reduce" });

async function openPage(page: Page) {
  await page.goto("/components/hover-card/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished),
    );
  });
}

const cards = (page: Page) =>
  page.locator('[data-slot="hover-card-content"][data-open]');
const playground = (page: Page) =>
  page.getByRole("region", { name: "Hover card playground", exact: true });
const mentions = (page: Page) =>
  page.getByRole("region", { name: "Mentions in text", exact: true });

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .exclude("[data-base-ui-focus-guard]")
    .analyze();
  expect(results.violations).toEqual([]);
}

async function shot(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function center(target: Locator) {
  await target.evaluate((element) =>
    element.scrollIntoView({ block: "center", inline: "center" }),
  );
}

async function leave(page: Page) {
  await page.mouse.move(1, 1);
  await expect(cards(page)).toHaveCount(0);
}

/** The card stays in the viewport, and nothing inside it spills sideways. */
async function expectContained(card: Locator) {
  expect(
    await card.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const inside = [...element.querySelectorAll("*")].every((child) => {
        const rect = child.getBoundingClientRect();
        if (!rect.width) return true;
        return rect.left >= box.left - 1 && rect.right <= box.right + 1;
      });
      return {
        inViewport:
          box.left >= 0 &&
          box.right <= innerWidth + 0.5 &&
          box.top >= 0 &&
          box.bottom <= innerHeight + 0.5,
        inside,
        noScroll: element.scrollWidth <= element.clientWidth + 1,
      };
    }),
  ).toEqual({ inViewport: true, inside: true, noScroll: true });
}

const sides = [
  ["top", "Alex Meadow", "Fictional garden project coordinator."],
  ["right", "Priya Raman", "seed-catalog review"],
  ["bottom", "Jonas Becker", "shared inbox"],
  ["left", "Mei Tanaka", "plot maps"],
] as const;

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`hover card sides ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await openPage(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        await chooseOption(
          page,
          "Color mode",
          mode === "light" ? "Light" : "Dark",
        );
        await settle(page);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await axe(page);

        for (const [side, name, about] of sides) {
          const group = playground(page).getByRole("group", {
            name: side,
            exact: true,
          });
          const trigger = group.getByRole("link", { name, exact: true });
          await center(trigger);
          await trigger.hover();
          const card = cards(page);
          await expect(card).toBeVisible({ timeout: 3000 });
          await expect(card).toContainText(name);
          await expect(card).toContainText(about);
          await expect(trigger).toHaveAttribute("data-popup-open", "");
          await settle(page);
          // Wide screens keep the preferred side; narrow ones may flip a side card to fit.
          if (width === 1440)
            await expect(card).toHaveAttribute("data-side", side);
          const box = (await card.boundingBox())!;
          expect(box.width).toBeLessThanOrEqual(257);
          expect(box.width).toBeGreaterThanOrEqual(
            Math.min(256, width - 16) - 1,
          );
          await expect(card).toHaveCSS("padding-top", "10px");
          await expectContained(card);
          await axe(page);
          await shot(
            page,
            testInfo,
            `hover-card-${side}-${theme}-${mode}-${width}`,
          );
          await leave(page);
        }

        const text = mentions(page);
        const priya = text.getByRole("link", {
          name: "Priya Raman",
          exact: true,
        });
        await center(priya);
        await priya.hover();
        const profile = cards(page);
        await expect(profile).toBeVisible({ timeout: 3000 });
        await expect(profile).toContainText("Growth lead");
        await settle(page);
        await expectContained(profile);
        await shot(
          page,
          testInfo,
          `hover-card-profile-${theme}-${mode}-${width}`,
        );
        await leave(page);

        const long = text.getByRole("link", { name: /greenhouse-irrigation/ });
        await center(long);
        await long.hover();
        const wrapped = cards(page);
        await expect(wrapped).toBeVisible({ timeout: 3000 });
        await settle(page);
        await expectContained(wrapped);
        await shot(page, testInfo, `hover-card-long-${theme}-${mode}-${width}`);
        await leave(page);
      });
    }
  }
}

test("keyboard focus opens the card, Escape closes it, and Tab moves to the next link", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page);
  const alex = playground(page).getByRole("link", {
    name: "Alex Meadow",
    exact: true,
  });
  const priya = playground(page).getByRole("link", {
    name: "Priya Raman",
    exact: true,
  });
  await center(alex);
  await alex.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(alex).toBeFocused();
  await expect(alex).toHaveCSS("outline-style", "solid");
  const card = cards(page);
  await expect(card).toBeVisible({ timeout: 3000 });
  await expect(card).toHaveAttribute("data-side", "top");
  await expect(card).toContainText("Alex Meadow");
  expect(await card.evaluate((el) => el.contains(document.activeElement))).toBe(
    false,
  );

  await page.keyboard.press("Escape");
  await expect(cards(page)).toHaveCount(0);
  await expect(alex).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(priya).toBeFocused();
  await expect(cards(page)).toHaveCount(1, { timeout: 3000 });
  await expect(cards(page)).toContainText("Priya Raman");
  await expect(cards(page)).toHaveAttribute("data-side", "right");
});

test("waits before opening, closes on pointer leave, and sample links stay on the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page);
  const jonas = playground(page).getByRole("link", {
    name: "Jonas Becker",
    exact: true,
  });
  await center(jonas);
  await jonas.hover();
  await page.waitForTimeout(250);
  await expect(cards(page)).toHaveCount(0);
  await expect(cards(page)).toBeVisible({ timeout: 3000 });
  await expect(cards(page)).toHaveAttribute("data-side", "bottom");

  // Moving from the link into the card keeps it open so its text can be read.
  const box = (await cards(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: 4,
  });
  await page.waitForTimeout(500);
  await expect(cards(page)).toBeVisible();
  await leave(page);

  const url = page.url();
  await jonas.click();
  expect(page.url()).toBe(url);
});

test("mentions align the card to the start of the name", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page);
  const priya = mentions(page).getByRole("link", {
    name: "Priya Raman",
    exact: true,
  });
  await center(priya);
  await priya.hover();
  const card = cards(page);
  await expect(card).toBeVisible({ timeout: 3000 });
  await expect(card).toHaveAttribute("data-align", "start");
  await expect(card).toHaveAttribute("data-side", "bottom");
  await settle(page);
  const [cardBox, anchor] = [
    (await card.boundingBox())!,
    (await priya.boundingBox())!,
  ];
  // The default 4px align offset nudges the card inward from the link's start.
  expect(Math.abs(cardBox.x - (anchor.x + 4))).toBeLessThan(2);
  expect(cardBox.y).toBeGreaterThan(anchor.y + anchor.height);
});

test("motion uses 120ms transitions and turns off for reduced motion", async ({
  browser,
}) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const context = await browser.newContext({
      reducedMotion,
      viewport: { width: 1440, height: 900 },
    });
    try {
      const page = await context.newPage();
      await openPage(page);
      const alex = playground(page).getByRole("link", {
        name: "Alex Meadow",
        exact: true,
      });
      await center(alex);
      await alex.hover();
      const card = cards(page);
      await expect(card).toBeVisible({ timeout: 3000 });
      await expect(card).toHaveCSS(
        "transition-duration",
        reducedMotion === "reduce" ? "0s" : "0.12s, 0.12s, 0.12s",
      );
    } finally {
      await context.close();
    }
  }
});
