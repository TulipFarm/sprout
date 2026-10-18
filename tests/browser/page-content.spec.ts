import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption, setColorMode } from "./choose-option";

async function openPageContent(page: Page) {
  await page.goto("/components/page-content/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const example = (page: Page, name: string) =>
  page.locator(`[data-example="${name}"]`);
const content = (page: Page, name: string) =>
  example(page, name).locator('[data-slot="page-content"]').first();

// The loading sample spins forever, so do not wait for animations to end.
async function pick(page: Page, label: string, option: string) {
  if (label === "Color mode") return setColorMode(page, option);
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
}

const box = async (locator: ReturnType<Page["locator"]>) => {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error("element is not visible");
  return rect;
};

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`page content ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openPageContent(page);
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
        for (const node of await page
          .locator('[data-slot="page-content"]')
          .all()) {
          expect(
            await node.evaluate((el) => el.scrollWidth <= el.clientWidth),
          ).toBe(true);
        }
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`page-content-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
      });
    }
  }
}

for (const width of [390, 1440]) {
  test(`padding and stack spacing match Cloud at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await openPageContent(page);
    const files = content(page, "playground");
    const [block, inline] = width < 640 ? ["16px", "16px"] : ["20px", "24px"];
    await expect(files).toHaveCSS("padding-top", block);
    await expect(files).toHaveCSS("padding-bottom", block);
    await expect(files).toHaveCSS("padding-left", inline);
    await expect(files).toHaveCSS("padding-right", inline);
    await expect(files).toHaveCSS("min-width", "0px");
    const outer = await box(files);
    const scroller = await box(
      example(page, "playground").getByRole("region", { name: "Files page" }),
    );
    expect(outer.width).toBeCloseTo(scroller.width, 0);

    // The hidden file input comes first and adds no space.
    const header = await box(files.locator('[data-slot="page-header"]'));
    expect(header.y - outer.y).toBeCloseTo(parseFloat(block), 0);
    const alert = await box(files.getByRole("alert"));
    const list = await box(files.getByRole("list", { name: "My files" }));
    expect(alert.y - (header.y + header.height)).toBeCloseTo(16, 0);
    expect(list.y - (alert.y + alert.height)).toBeCloseTo(16, 0);
    await expect(files.getByRole("list", { name: "My files" })).toHaveCSS(
      "margin-bottom",
      "0px",
    );
  });
}

test("playground renders each Cloud page and state", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPageContent(page);
  const playground = example(page, "playground");
  await expect(
    playground.getByRole("heading", { level: 1, name: "Files" }),
  ).toBeVisible();
  await expect(
    playground.getByRole("button", { name: "Upload" }),
  ).toBeVisible();

  await pick(page, "Page", "Help and support");
  await expect(
    playground.getByRole("heading", {
      level: 2,
      name: "Files and integrations",
    }),
  ).toBeAttached();

  await pick(page, "Page", "Agent task");
  const task = content(page, "playground");
  await expect(
    task.getByRole("link", { name: "Back to my tasks" }),
  ).toBeVisible();
  await expect(task.getByText("Running", { exact: true })).toBeVisible();
  await expect(task.getByRole("status")).toContainText("Automatic refresh");

  for (const [option, role, title] of [
    ["Workflows – loading", "status", "Loading workflows"],
    ["Workflows – empty", null, "No workflows yet"],
    ["Workflows – error", "alert", "Could not load workflows"],
  ] as const) {
    for (const mode of ["Light", "Dark"]) {
      await pick(page, "Color mode", mode);
      await pick(page, "Page", option);
      const panel = playground.locator('[data-slot="state-panel"]');
      await expect(panel).toContainText(title);
      if (role)
        await expect(
          panel.getByRole(role).filter({ hasText: title }),
        ).toBeVisible();
      await expect(
        content(page, "playground").getByRole("heading", {
          level: 1,
          name: "Workflows",
        }),
      ).toBeVisible();
      await testInfo.attach(`page-content-${option}-${mode}`, {
        body: await playground.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
    }
  }
});

test("scroll regions are keyboard reachable and scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPageContent(page);
  const region = example(page, "playground").getByRole("region", {
    name: "Files page",
  });
  await page.getByRole("combobox", { name: "Page", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(region).toBeFocused();
  await expect(region).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("PageDown");
  await expect
    .poll(() => region.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);

  const chats = example(page, "scroll-room").getByRole("region", {
    name: "Chat list",
  });
  await expect(chats).toHaveCSS("padding-bottom", "96px");
  await chats.evaluate((el) => (el.scrollTop = el.scrollHeight));
  const more = await box(
    chats.getByRole("button", { name: "Load more chats" }),
  );
  const composer = await box(
    example(page, "scroll-room").getByText("Ask Northwind anything…"),
  );
  expect(more.y + more.height).toBeLessThanOrEqual(composer.y);
});

test("a ref on the scroller restores the list position", async ({ page }) => {
  await openPageContent(page);
  const frame = example(page, "restoration");
  const library = frame.getByRole("region", { name: "Files library" });
  await expect(library).toHaveAttribute(
    "data-scroll-restoration-id",
    "files-library",
  );
  const saved = await library.evaluate((el) => {
    el.scrollTop = 80;
    return Math.round(el.scrollTop);
  });
  expect(saved).toBeGreaterThan(40);
  await frame.getByRole("button", { name: "Open Q3 board deck.pdf" }).click();
  await expect(frame.getByRole("status")).toHaveText(`Saved ${saved}px.`);
  await expect(
    frame.getByRole("heading", { level: 1, name: "Q3 board deck.pdf" }),
  ).toBeVisible();
  const back = frame.getByRole("link", { name: "Back to files" });
  await back.focus();
  await page.keyboard.press("Enter");
  await expect(frame.getByRole("status")).toHaveText(`Restored ${saved}px.`);
  expect(
    await frame
      .getByRole("region", { name: "Files library" })
      .evaluate((el) => Math.round(el.scrollTop)),
  ).toBe(saved);
});

test("works without a scroll region and in a clipped preview", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPageContent(page);
  const surface = content(page, "surface");
  const frame = await box(example(page, "surface"));
  expect((await box(surface)).width).toBeCloseTo(frame.width - 2, 0);
  await expect(
    surface.getByRole("link", { name: "Open in chat" }),
  ).toHaveAttribute("data-variant", "outline");

  const preview = content(page, "preview");
  await expect(preview.getByText("Garden notes")).toBeVisible();
  const clip = await box(
    example(page, "preview").locator(".page-content-demo-clip"),
  );
  expect(clip.height).toBeCloseTo(256, 0);
});

for (const width of [390, 1440]) {
  test(`children can bleed to the page edge at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await openPageContent(page);
    const pageContent = content(page, "bleed");
    const rail = pageContent.getByRole("navigation", { name: "Filter apps" });
    const outer = await box(pageContent);
    const edge = await box(rail);
    if (width < 768) {
      expect(edge.x).toBeCloseTo(outer.x, 0);
      expect(edge.width).toBeCloseTo(outer.width, 0);
    } else {
      expect(edge.x - outer.x).toBeCloseTo(24, 0);
    }
    const connected = rail.getByRole("button", { name: "Connected" });
    await connected.focus();
    await page.keyboard.press("Enter");
    await expect(connected).toHaveAttribute("aria-pressed", "true");
    await testInfo.attach(`page-content-bleed-${width}`, {
      body: await example(page, "bleed").screenshot(),
      contentType: "image/png",
    });
  });
}

test("has no motion of its own", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPageContent(page);
  const node = content(page, "surface");
  await expect(node).toHaveCSS("transition-duration", "0s");
  await expect(node).toHaveCSS("animation-name", "none");
});
