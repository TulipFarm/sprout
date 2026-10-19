import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption, setColorMode } from "./choose-option";

test.use({ reducedMotion: "reduce" });

async function openPage(page: Page) {
  await page.goto("/components/chat-sources/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const playground = (page: Page) =>
  page.getByRole("region", { name: "Chat sources playground" });
const recipe = (page: Page, id: string) =>
  page.locator(`[data-recipe="${id}"]`);
const recipes = ["sources", "single", "empty", "states", "long"];
const popup = (page: Page) => page.locator('[data-slot="popover-content"]');

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

async function popupShot(page: Page) {
  await settle(page);
  const box = (await popup(page).boundingBox())!;
  return page.screenshot({
    clip: {
      x: Math.max(0, box.x - 8),
      y: Math.max(0, box.y - 8),
      width: box.width + 16,
      height: box.height + 16,
    },
  });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`chat sources ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openPage(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        await page.emulateMedia({ colorScheme: mode });
        if (mode === "dark") await setColorMode(page, "Dark");
        else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        for (const list of await page
          .locator('[data-slot="chat-sources"]')
          .all()) {
          await list.scrollIntoViewIfNeeded();
          expect(
            await list.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          ).toBe(true);
          for (const item of await list.locator("li").all()) {
            expect(
              await item.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
            ).toBe(true);
            const box = (await item.boundingBox())!;
            const outer = (await list.boundingBox())!;
            expect(box.x + box.width).toBeLessThanOrEqual(
              outer.x + outer.width + 0.5,
            );
            // Card padding stays 12px on every side.
            expect(
              await item.evaluate((el) => getComputedStyle(el).padding),
            ).toBe("12px");
          }
        }
        // Inline citations stay inside their reply line box at every width.
        for (const citation of await page
          .locator('[data-slot="inline-citation"]')
          .all()) {
          const box = (await citation.boundingBox())!;
          expect(box.width).toBe(24);
          expect(box.height).toBe(24);
        }
        const results = await new AxeBuilder({ page })
          .exclude(".docs-search-trigger")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`chat-sources-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
        await testInfo.attach(
          `chat-sources-playground-${theme}-${mode}-${width}`,
          {
            body: await playground(page).screenshot(),
            contentType: "image/png",
          },
        );
        for (const id of recipes) {
          await testInfo.attach(
            `chat-sources-${id}-${theme}-${mode}-${width}`,
            {
              body: await recipe(page, id).screenshot(),
              contentType: "image/png",
            },
          );
        }
        // Popovers: an inline citation passage, then every checked state.
        await recipe(page, "sources")
          .getByRole("button", { name: "Source 2: Q3 vendor review.pdf" })
          .click();
        await expect(popup(page)).toContainText("Net 30 remains the default.");
        const pop = (await popup(page).boundingBox())!;
        expect(pop.x).toBeGreaterThanOrEqual(0);
        expect(pop.x + pop.width).toBeLessThanOrEqual(width);
        expect(
          await popup(page).evaluate(
            (el) => el.scrollWidth <= el.clientWidth + 1,
          ),
        ).toBe(true);
        await testInfo.attach(
          `chat-sources-popover-inline-${theme}-${mode}-${width}`,
          { body: await popupShot(page), contentType: "image/png" },
        );
        await page.keyboard.press("Escape");
        await expect(popup(page)).toHaveCount(0);
        for (const [value, label] of [
          ["loading", "Loading"],
          ["ready", "Ready"],
          ["unavailable", "Unavailable"],
          ["error", "Error"],
        ]) {
          await chooseOption(page, "Citation state", label);
          await recipe(page, "states")
            .getByRole("button", { name: "Source: Garden notes" })
            .click();
          await expect(popup(page)).toHaveAttribute(
            "data-citation-state",
            value,
          );
          await testInfo.attach(
            `chat-sources-popover-${value}-${theme}-${mode}-${width}`,
            { body: await popupShot(page), contentType: "image/png" },
          );
          await page.keyboard.press("Escape");
          await expect(popup(page)).toHaveCount(0);
        }
      });
    }
  }
}

test("hovering a citation previews the passage and its source", async ({
  page,
}) => {
  await openPage(page);
  const citation = recipe(page, "sources").getByRole("button", {
    name: "Source 2: Q3 vendor review.pdf",
  });
  const before = await citation.evaluate(
    (node) => getComputedStyle(node).backgroundColor,
  );
  await citation.hover();
  await expect(popup(page)).toBeVisible();
  await expect(citation).not.toHaveCSS("background-color", before);
  await expect(
    popup(page).locator(".sprout-chat-sources-preview-head"),
  ).toHaveText("2drive.example.com");
  await expect(popup(page)).toContainText("Q3 vendor review.pdf");
  await expect(popup(page)).toContainText("File · Payment terms");
  await expect(popup(page)).toContainText(
    "Suppliers with three late deliveries in a quarter move to Net 15.",
  );

  const link = popup(page).getByRole("link", {
    name: "Open source in a new tab",
  });
  await link.hover();
  await expect(popup(page)).toBeVisible();

  await page.mouse.move(0, 0);
  await expect(popup(page)).toHaveCount(0);

  const checked = recipe(page, "states").getByRole("button", {
    name: "Source: Garden notes",
  });
  await checked.hover();
  await expect(popup(page)).toContainText("Fictional garden notes");
  await page.mouse.move(0, 0);
  await expect(popup(page)).toHaveCount(0);
});

test("inline citations and the sources list work by keyboard", async ({
  page,
}) => {
  await openPage(page);
  const sources = recipe(page, "single");
  const citation = sources.getByRole("button", {
    name: "Source 1: Fictional garden notes",
  });
  await citation.focus();
  await page.keyboard.press("Enter");
  await expect(popup(page)).toBeVisible();
  await expect(popup(page)).toContainText("Fictional garden notes");
  await expect(popup(page)).toContainText("Example collection");
  const link = popup(page).getByRole("link", {
    name: "Open source in a new tab",
  });
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute(
    "href",
    "https://garden.example.com/notes",
  );
  await page.keyboard.press("Escape");
  await expect(popup(page)).toHaveCount(0);
  await expect(citation).toBeFocused();

  const toggle = sources.getByRole("button", { name: "1 source" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(sources.getByRole("list")).toHaveCount(0);
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const items = sources.getByRole("listitem");
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText("1Fictional garden notes");
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  const many = recipe(page, "sources");
  await expect(many.getByRole("button", { name: "3 sources" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(many.getByRole("listitem")).toHaveCount(3);
  await expect(many.getByRole("listitem").nth(2)).toContainText(
    "Slack · 14 replies",
  );
  await expect(recipe(page, "empty")).toContainText(
    "No sources were used for this response.",
  );
  await expect(recipe(page, "empty").getByRole("button")).toHaveCount(0);
});

test("checked citation shows each state Cloud passes", async ({ page }) => {
  await openPage(page);
  const trigger = recipe(page, "states").getByRole("button", {
    name: "Source: Garden notes",
  });
  for (const label of ["Idle", "Loading"]) {
    await chooseOption(page, "Citation state", label);
    await trigger.click();
    await expect(popup(page).getByRole("status")).toHaveText(
      "Checking access to this source…",
    );
    await expect(popup(page).locator('[data-slot="spinner"]')).toHaveCount(1);
    await page.keyboard.press("Escape");
  }
  await chooseOption(page, "Citation state", "Unavailable");
  await trigger.click();
  await expect(popup(page)).toContainText("Source unavailable");
  await expect(popup(page).getByRole("alert")).toHaveText(
    "This sample source is not available.",
  );
  await expect(popup(page).getByRole("button")).toHaveCount(0);
  await expect(popup(page)).not.toContainText("Water newly planted bulbs");
  await page.keyboard.press("Escape");
  await chooseOption(page, "Citation state", "Error");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(popup(page)).toContainText("Couldn’t load this source");
  const retry = popup(page).getByRole("button", { name: "Load source again" });
  await expect(retry).toHaveClass(/sprout-button-variant-outline/);
  await expect(retry).toHaveClass(/sprout-button-size-sm/);
  await retry.focus();
  await page.keyboard.press("Enter");
  await expect(popup(page)).toContainText("Water newly planted bulbs once");
  await expect(popup(page)).toBeVisible();
  // Focus stays inside the passage once the retry button leaves.
  expect(
    await popup(page).evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("playground rechecks access on every open inside a reply", async ({
  page,
}) => {
  await openPage(page);
  const reply = playground(page)
    .locator('[data-slot="message-response"], .sprout-message-response')
    .first();
  const checklist = playground(page).getByRole("button", {
    name: "Source: onboarding checklist",
  });
  await expect(
    playground(page).getByRole("button", { name: "Source: Q3 vendor review" }),
  ).toBeVisible();
  await expect(reply).toBeVisible();
  await checklist.click();
  await expect(popup(page).getByRole("status")).toBeVisible();
  await expect(popup(page)).toContainText("Supplier onboarding checklist");
  await expect(popup(page)).toContainText("Note · Before the first order");
  // Multi-line passages keep their line breaks.
  expect(
    await popup(page)
      .locator("[data-preserve-lines]")
      .evaluate((el) => getComputedStyle(el).whiteSpace),
  ).toBe("pre-wrap");
  await page.keyboard.press("Escape");

  await chooseOption(page, "Next access check", "Source removed");
  await checklist.click();
  await expect(popup(page).getByRole("status")).toBeVisible();
  await expect(popup(page)).toContainText("Source unavailable");
  await expect(popup(page)).not.toContainText("Collect the W-9");
  await page.keyboard.press("Escape");

  await chooseOption(page, "Next access check", "Check fails");
  await checklist.click();
  await expect(popup(page).getByRole("alert")).toHaveText(
    "We couldn’t check access to this source. Your answer is unchanged.",
  );
  await popup(page).getByRole("button", { name: "Load source again" }).click();
  await expect(popup(page).getByRole("status")).toBeVisible();
  await expect(popup(page)).toContainText("Collect the W-9");
  await page.keyboard.press("Escape");
  await expect(checklist).toBeFocused();
});

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });
  test("trigger color and list height animate within 180ms", async ({
    page,
  }) => {
    await openPage(page);
    const trigger = recipe(page, "single").locator(
      ".sprout-chat-sources-trigger",
    );
    expect(
      await trigger.evaluate((el) => getComputedStyle(el).transitionDuration),
    ).toBe("0.12s");
    const content = recipe(page, "sources").locator(
      '[data-slot="collapsible-content"]',
    );
    expect(
      await content.evaluate((el) => getComputedStyle(el).transitionDuration),
    ).toBe("0.18s, 0.12s");
  });
});

test("reduced motion removes transitions", async ({ page }) => {
  await openPage(page);
  const trigger = recipe(page, "single").locator(
    ".sprout-chat-sources-trigger",
  );
  expect(
    await trigger.evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
});
