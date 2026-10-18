import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/reasoning-effort/";

async function openDemo(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#reasoning-effort-demo");
}

async function cssColor(page: Page, value: string) {
  return page.evaluate((color) => {
    const probe = document.createElement("span");
    probe.style.color = color;
    document.body.append(probe);
    const result = getComputedStyle(probe).color;
    probe.remove();
    return result;
  }, value);
}

function playground(page: Page) {
  return page.getByTestId("effort-playground");
}

async function opacity(locator: Locator) {
  return Number(
    await locator.evaluate((node) => getComputedStyle(node).opacity),
  );
}

async function shot(
  target: Locator,
  testInfo: import("@playwright/test").TestInfo,
  name: string,
) {
  const path = testInfo.outputPath(`${name}.png`);
  const image = await target.screenshot({ animations: "disabled", path });
  expect(image.byteLength).toBeGreaterThan(3_000);
  await testInfo.attach(name, { path, contentType: "image/png" });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`reasoning effort ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openDemo(page);
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
        const fill = playground(page).locator(
          '[data-slot="reasoning-effort-fill"]',
        );
        await expect(fill).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-primary)"),
        );
        await expect(
          playground(page).locator('[data-slot="reasoning-effort-thumb"]'),
        ).toHaveCSS("background-color", "rgb(255, 255, 255)");
        await expect(
          playground(page).locator('[data-slot="reasoning-effort-shell"]'),
        ).toHaveCSS("stroke", await cssColor(page, "var(--sprout-line)"));
        for (const control of await demo
          .locator('[data-slot="reasoning-effort"]')
          .all()) {
          const rect = (await control.boundingBox())!;
          expect(rect.width).toBeCloseTo(256, 0);
          expect(rect.height).toBeCloseTo(52, 0);
          expect(rect.x).toBeGreaterThanOrEqual(0);
          expect(rect.x + rect.width).toBeLessThanOrEqual(width);
        }
        const overflowing = await demo
          .locator(
            ".reasoning-effort-demo-card-body, .reasoning-effort-demo-row, .reasoning-effort-demo-effort-head, .reasoning-effort-demo-composer-bar",
          )
          .evaluateAll((nodes) =>
            nodes
              .filter((node) => node.scrollWidth > node.clientWidth + 1)
              .map((node) => node.className),
          );
        expect(overflowing).toEqual([]);
        const results = await new AxeBuilder({ page })
          .include("#reasoning-effort-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await page.mouse.move(0, 0);
        await shot(
          demo,
          testInfo,
          `reasoning-effort-${theme}-${mode}-${width}`,
        );
      });
    }
  }
}

test("keyboard moves one level, jumps to the ends, and shows a focus outline", async ({
  page,
}) => {
  await openDemo(page);
  const slider = playground(page).getByRole("slider", {
    name: "Reasoning effort",
  });
  const status = playground(page).getByRole("status");
  await expect(status).toHaveText("Selected level: Balanced");
  await expect(slider).toHaveAttribute("aria-valuetext", "Balanced");
  await slider.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(slider).toBeFocused();
  await expect(slider).toHaveCSS("outline-style", "solid");
  await expect(slider).toHaveCSS("outline-width", "2px");
  await expect(slider).toHaveCSS(
    "outline-color",
    await cssColor(page, "var(--sprout-focus)"),
  );
  await page.keyboard.press("ArrowRight");
  await expect(status).toHaveText("Selected level: Thorough");
  await expect(slider).toHaveAttribute("aria-valuenow", "2");
  await page.keyboard.press("ArrowUp");
  await expect(status).toHaveText("Selected level: Maximum");
  await page.keyboard.press("ArrowRight");
  await expect(status).toHaveText("Selected level: Maximum");
  await page.keyboard.press("Home");
  await expect(status).toHaveText("Selected level: Quick");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowDown");
  await expect(slider).toHaveAttribute("aria-valuenow", "0");
  await page.keyboard.press("End");
  await expect(slider).toHaveAttribute("aria-valuetext", "Maximum");
  await page.keyboard.press("ArrowDown");
  await expect(status).toHaveText("Selected level: Thorough");
  // The slider is one tab stop; the bubble and ticks are not focusable.
  await page.keyboard.press("Tab");
  await expect(slider).not.toBeFocused();
});

test("dragging opens the bubble, updates live, and snaps on release", async ({
  page,
}, testInfo) => {
  await openDemo(page);
  const root = playground(page).locator('[data-slot="reasoning-effort"]');
  const slider = playground(page).getByRole("slider");
  const bubble = playground(page).locator(
    '[data-slot="reasoning-effort-bubble"]',
  );
  const status = playground(page).getByRole("status");
  const track = (await slider.boundingBox())!;
  expect(await opacity(bubble)).toBe(0);

  const thumb = (await playground(page)
    .locator('[data-slot="reasoning-effort-thumb"]')
    .boundingBox())!;
  await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
  await page.mouse.down();
  await expect(root).toHaveAttribute("data-dragging", "true");
  await page.mouse.move(track.x + track.width * 0.62, track.y + 16, {
    steps: 6,
  });
  await expect(status).toHaveText("Selected level: Thorough");
  await expect.poll(() => opacity(bubble)).toBeGreaterThan(0.98);
  await expect(bubble).toHaveText("Thorough");
  // The shell grows a bump above the track for the bubble.
  const path = await playground(page)
    .locator('[data-slot="reasoning-effort-shell"]')
    .getAttribute("d");
  expect(path).toContain("C");
  await shot(playground(page), testInfo, "reasoning-effort-dragging-middle");

  // Past the last tick the bubble tilts onto the end cap and stays inside.
  await page.mouse.move(track.x + track.width + 40, track.y + 16, { steps: 6 });
  await expect(status).toHaveText("Selected level: Maximum");
  await expect(bubble).toHaveText("Maximum");
  const box = (await bubble.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(track.x + track.width);
  await shot(playground(page), testInfo, "reasoning-effort-dragging-end");

  await page.mouse.move(track.x + track.width * 0.4, track.y + 16, {
    steps: 6,
  });
  await page.mouse.up();
  await expect(root).toHaveAttribute("data-dragging", "false");
  await expect(status).toHaveText("Selected level: Balanced");
  await expect.poll(() => opacity(bubble)).toBe(0);
  // The thumb settles centered on the Balanced tick.
  await expect
    .poll(async () => {
      const t = (await playground(page)
        .locator('[data-slot="reasoning-effort-thumb"]')
        .boundingBox())!;
      return Math.round(t.x + t.width / 2 - track.x);
    })
    .toBe(Math.round(16 + (224 / 3) * 1));

  // A single click on the track picks the nearest level.
  await page.mouse.click(track.x + 18, track.y + 16);
  await expect(status).toHaveText("Selected level: Quick");
});

test("composer model picker: effort footer, model label, and live trigger name", async ({
  page,
}, testInfo) => {
  await openDemo(page);
  const composer = page.getByTestId("effort-composer");
  const trigger = composer.getByRole("button", {
    name: "Model: Claude Opus, High effort",
  });
  await trigger.click();
  const footer = page.getByTestId("effort-footer");
  await expect(footer).toBeVisible();
  await expect(footer).toContainText("Effort");
  await expect(footer).toContainText("High");
  const slider = footer.getByRole("slider", { name: "Reasoning effort" });
  await expect(slider).toHaveAttribute("aria-valuemax", "3");
  await expect(slider).toHaveAttribute("aria-valuetext", "High");
  await expect(
    footer.locator(".sprout-reasoning-effort-bubble-label"),
  ).toHaveText("Claude Opus");

  // The 256px slider fits the 18rem picker with 16px on each side.
  const inset = async () => {
    const panel = (await page
      .locator('[data-slot="popover-content"]')
      .boundingBox())!;
    const control = (await footer
      .locator('[data-slot="reasoning-effort"]')
      .boundingBox())!;
    return [
      Math.round(control.x - panel.x),
      Math.round(panel.x + panel.width - (control.x + control.width)),
    ];
  };
  await expect.poll(inset).toEqual([16, 16]);

  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(footer).toContainText("Max");
  await expect(slider).toHaveAttribute("aria-valuetext", "Max");
  await page.keyboard.press("Home");
  await expect(
    footer.locator(".reasoning-effort-demo-effort-head"),
  ).toContainText("Low");

  // Picking another model keeps the panel open and relabels the bubble.
  await page.getByRole("option", { name: "Kimi" }).click();
  await expect(footer).toBeVisible();
  await expect(
    footer.locator(".sprout-reasoning-effort-bubble-label"),
  ).toHaveText("Kimi");
  await expect(slider).toHaveAttribute("aria-valuetext", "Low");

  const track = (await slider.boundingBox())!;
  await page.mouse.move(track.x + 16, track.y + 16);
  await page.mouse.down();
  await page.mouse.move(track.x + 6, track.y + 16, { steps: 3 });
  await expect
    .poll(() =>
      opacity(footer.locator('[data-slot="reasoning-effort-bubble"]')),
    )
    .toBeGreaterThan(0.98);
  const bubble = (await footer
    .locator('[data-slot="reasoning-effort-bubble"]')
    .boundingBox())!;
  expect(bubble.x).toBeGreaterThanOrEqual(track.x);
  await shot(
    page.locator('[data-slot="popover-content"]'),
    testInfo,
    "reasoning-effort-composer-dragging-start",
  );
  await page.mouse.up();

  await page.keyboard.press("Escape");
  await expect(footer).toBeHidden();
  await expect(
    composer.getByRole("button", { name: "Model: Kimi, Low effort" }),
  ).toBeFocused();
});

test("level counts spread ticks evenly", async ({ page }) => {
  await openDemo(page);
  for (const [id, n, text] of [
    ["effort-levels-4", 4, "Max"],
    ["effort-levels-3", 3, "Medium"],
    ["effort-levels-2", 2, "Low"],
    ["effort-levels-1", 1, "High"],
  ] as const) {
    const row = page.getByTestId(id);
    await expect(
      row.locator('[data-slot="reasoning-effort-tick"]'),
    ).toHaveCount(n);
    await expect(row.getByRole("slider")).toHaveAttribute(
      "aria-valuetext",
      text,
    );
    await expect(row.getByRole("slider")).toHaveAttribute(
      "aria-valuemax",
      String(n - 1),
    );
  }
  const two = page.getByTestId("effort-levels-2").getByRole("slider");
  await two.focus();
  await page.keyboard.press("End");
  await expect(page.getByTestId("effort-levels-2")).toContainText("High");
  const one = page.getByTestId("effort-levels-1").getByRole("slider");
  await one.focus();
  await page.keyboard.press("End");
  await expect(one).toHaveAttribute("aria-valuenow", "0");
});

test("reduced motion jumps instead of tweening", async ({ browser }) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const context = await browser.newContext({ reducedMotion });
    const page = await context.newPage();
    await openDemo(page);
    const text = playground(page).locator(
      ".sprout-reasoning-effort-bubble-text",
    );
    await expect(text).toHaveCSS(
      "animation-name",
      reducedMotion === "reduce" ? "none" : "sprout-reasoning-effort-level-in",
    );
    if (reducedMotion === "reduce") {
      const thumb = playground(page).locator(
        '[data-slot="reasoning-effort-thumb"]',
      );
      const slider = playground(page).getByRole("slider");
      await slider.focus();
      await expect(slider).toBeFocused();
      await page.keyboard.press("End");
      await expect(slider).toHaveAttribute("aria-valuenow", "3");
      // With no tween the thumb is already at the end; a tween takes 220ms.
      const left = await thumb.evaluate(
        (node) => (node as HTMLElement).style.left,
      );
      expect(parseFloat(left)).toBeCloseTo(256 - 2.4 - 27.2, 1);
    }
    await context.close();
  }
});
