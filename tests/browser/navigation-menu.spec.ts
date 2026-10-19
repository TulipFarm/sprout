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
  await page.goto("/components/navigation-menu/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    );
  });
}

const popup = (page: Page) =>
  page.locator('[data-slot="navigation-menu-popup"]');
const panel = (page: Page) =>
  page.locator('[data-slot="navigation-menu-content"][data-open]');
const playground = (page: Page) =>
  page.getByRole("region", { name: "Navigation menu playground", exact: true });
const header = (page: Page) =>
  page.getByRole("region", { name: "Site header", exact: true });

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

async function close(page: Page) {
  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);
  await expect(popup(page)).toHaveCount(0);
}

/** The popup stays in the viewport, and nothing inside it spills sideways. */
async function expectContained(target: Locator) {
  expect(
    await target.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const inside = [
        ...element.querySelectorAll("*:not([data-base-ui-focus-guard])"),
      ].every((child) => {
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

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`navigation menu ${theme} ${mode} at ${width}px`, async ({
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

        // Cloud composition: one trigger item and one plain link item.
        const projects = playground(page).getByRole("button", {
          name: "Projects",
          exact: true,
        });
        const help = playground(page).getByRole("link", {
          name: "Help",
          exact: true,
        });
        await center(projects);
        await expect(projects).toHaveCSS("height", "32px");
        await expect(help).toHaveCSS("height", "32px");
        await shot(
          page,
          testInfo,
          `navigation-menu-closed-${theme}-${mode}-${width}`,
        );
        await projects.click();
        await expect(panel(page)).toBeVisible();
        await expect(projects).toHaveAttribute("aria-expanded", "true");
        await expect(panel(page).getByRole("link")).toHaveText([
          "Meadow project",
          "Garden notes",
        ]);
        await settle(page);
        await expectContained(popup(page));
        await axe(page);
        await shot(
          page,
          testInfo,
          `navigation-menu-cloud-${theme}-${mode}-${width}`,
        );
        await close(page);

        // Site header: rich list, grid panel, indicator, active and disabled items.
        const siteProjects = header(page).getByRole("button", {
          name: "Projects",
          exact: true,
        });
        await center(siteProjects);
        await shot(
          page,
          testInfo,
          `navigation-menu-header-${theme}-${mode}-${width}`,
        );
        expect(
          await header(page)
            .locator('[data-slot="navigation-menu-list"] > li > *')
            .evaluateAll((items) =>
              items.every((item) => item.scrollWidth <= item.clientWidth),
            ),
        ).toBe(true);
        await siteProjects.click();
        await expect(panel(page)).toContainText(
          "Greenhouse irrigation retrofit — north wing",
        );
        await settle(page);
        await expectContained(popup(page));
        await expect(
          header(page).locator(
            '[data-slot="navigation-menu-indicator"][data-popup-open]',
          ),
        ).toHaveCount(1);
        await axe(page);
        await shot(
          page,
          testInfo,
          `navigation-menu-projects-${theme}-${mode}-${width}`,
        );

        const resources = header(page).getByRole("button", {
          name: "Resources",
          exact: true,
        });
        // Hovering across from the open panel's trigger swaps panels; a click would toggle it shut.
        await resources.hover();
        await expect(panel(page)).toContainText("Yield reports");
        await expect(panel(page)).toHaveCount(1);
        await settle(page);
        await expectContained(popup(page));
        const links = await panel(page)
          .getByRole("link")
          .evaluateAll((items) =>
            items.map((item) => Math.round(item.getBoundingClientRect().left)),
          );
        // Two columns on wide screens, one on phones.
        expect(new Set(links).size).toBe(width >= 640 ? 2 : 1);
        await shot(
          page,
          testInfo,
          `navigation-menu-resources-${theme}-${mode}-${width}`,
        );
        await close(page);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      });
    }
  }
}

test("keyboard opens panels, moves through links, and Escape returns focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page);
  const projects = playground(page).getByRole("button", {
    name: "Projects",
    exact: true,
  });
  const help = playground(page).getByRole("link", {
    name: "Help",
    exact: true,
  });
  await center(projects);
  await projects.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(projects).toBeFocused();
  await expect(projects).toHaveCSS("outline-style", "solid");
  await expect(panel(page)).toHaveCount(0);

  await page.keyboard.press("Enter");
  await expect(panel(page)).toBeVisible();
  await expect(projects).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  const meadow = panel(page).getByRole("link", { name: "Meadow project" });
  await expect(meadow).toBeFocused();
  await expect(meadow).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("ArrowDown");
  await expect(
    panel(page).getByRole("link", { name: "Garden notes" }),
  ).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(meadow).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(playground(page).getByRole("status")).toHaveText(
    "Selected locally: Meadow project.",
  );

  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);
  await expect(projects).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await expect(help).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(projects).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(help).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(playground(page).getByRole("status")).toHaveText(
    "Selected locally: Help.",
  );
});

test("hover opens a panel, moving across triggers swaps it, and sample links stay on the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page);
  const siteProjects = header(page).getByRole("button", {
    name: "Projects",
    exact: true,
  });
  const resources = header(page).getByRole("button", {
    name: "Resources",
    exact: true,
  });
  await center(siteProjects);
  await siteProjects.hover();
  await expect(panel(page)).toContainText("Meadow project");
  await resources.hover();
  await expect(panel(page)).toContainText("Planting guides");
  await expect(resources).toHaveAttribute("aria-expanded", "true");
  await expect(siteProjects).toHaveAttribute("aria-expanded", "false");

  const url = page.url();
  // Rich links pass closeOnClick, so choosing one closes the menu and marks it active.
  await panel(page)
    .getByRole("link", { name: /Harvest calendar/ })
    .click();
  expect(page.url()).toBe(url);
  await expect(header(page).getByRole("status")).toHaveText(
    "Selected locally: Harvest calendar.",
  );
  await expect(panel(page)).toHaveCount(0);
  await resources.click();
  await expect(
    panel(page).getByRole("link", { name: /Harvest calendar/ }),
  ).toHaveAttribute("aria-current", "page");
  await close(page);

  // The Cloud panel keeps Base UI's default and stays open after a click.
  const projects = playground(page).getByRole("button", {
    name: "Projects",
    exact: true,
  });
  await center(projects);
  await projects.click();
  await panel(page).getByRole("link", { name: "Garden notes" }).click();
  expect(page.url()).toBe(url);
  await expect(playground(page).getByRole("status")).toHaveText(
    "Selected locally: Garden notes.",
  );
  await expect(panel(page)).toBeVisible();
  await close(page);
});

test("active, trigger-styled, and disabled items", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page);
  const overview = header(page).getByRole("link", {
    name: "Overview",
    exact: true,
  });
  const help = header(page).getByRole("link", { name: "Help", exact: true });
  const billing = header(page).getByRole("button", {
    name: "Billing",
    exact: true,
  });
  await expect(overview).toHaveAttribute("aria-current", "page");
  await expect(overview).toHaveCSS("height", "32px");
  await expect(help).not.toHaveAttribute("aria-current", "page");
  await help.click();
  await expect(help).toHaveAttribute("aria-current", "page");
  await expect(overview).not.toHaveAttribute("aria-current", "page");
  await expect(billing).toBeDisabled();
  await expect(billing).toHaveCSS("opacity", "0.5");
  await billing.hover({ force: true });
  await page.waitForTimeout(300);
  await expect(panel(page)).toHaveCount(0);
});

test("align places the panel at the start, center, or end of its trigger", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page);
  const projects = playground(page).getByRole("button", {
    name: "Projects",
    exact: true,
  });
  for (const align of ["start", "center", "end"] as const) {
    await playground(page)
      .getByRole("button", { name: align, exact: true })
      .click();
    await center(projects);
    await projects.click();
    const positioner = page.locator('[data-slot="navigation-menu-positioner"]');
    await expect(positioner).toHaveAttribute("data-align", align);
    await settle(page);
    const [box, anchor] = [
      (await popup(page).boundingBox())!,
      (await projects.boundingBox())!,
    ];
    const edge = {
      start: [box.x, anchor.x],
      center: [box.x + box.width / 2, anchor.x + anchor.width / 2],
      end: [box.x + box.width, anchor.x + anchor.width],
    }[align];
    expect(Math.abs(edge[0] - edge[1])).toBeLessThan(2);
    expect(box.y).toBeGreaterThanOrEqual(anchor.y + anchor.height + 7);
    await close(page);
  }
});

test("motion uses 120–180ms transitions and turns off for reduced motion", async ({
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
      const projects = playground(page).getByRole("button", {
        name: "Projects",
        exact: true,
      });
      await center(projects);
      await projects.click();
      await expect(panel(page)).toBeVisible();
      const durations =
        reducedMotion === "reduce" ? "0s" : "0.12s, 0.12s, 0.18s, 0.18s";
      await expect(popup(page)).toHaveCSS("transition-duration", durations);
      await expect(
        projects.locator('[data-slot="navigation-menu-chevron"]'),
      ).toHaveCSS(
        "transition-duration",
        reducedMotion === "reduce" ? "0s" : "0.18s",
      );
    } finally {
      await context.close();
    }
  }
});
