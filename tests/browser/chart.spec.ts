import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/chart/";
// The sticky site header would cover tall demos in element screenshots.
const chrome = ".site-header, .skip-link { visibility: hidden !important; }";
const demos = [
  "chart-credits",
  "chart-canvas",
  "chart-playground",
  "chart-options",
  "chart-composition",
];

async function openChart(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await expect(
    page
      .getByTestId("chart-credits")
      .locator(".recharts-bar-rectangle")
      .first(),
  ).toBeVisible();
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

function surface(page: Page, testId: string) {
  return page.getByTestId(testId).locator("svg.recharts-surface").first();
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`chart ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openChart(page);
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
        const overflowing = await page
          .locator(
            ".chart-demo-card-body, .chart-demo-credits-head, .chart-demo-toolbar, [data-slot='chart'], [data-slot='chart-tooltip'], [data-slot='chart-legend']",
          )
          .evaluateAll((nodes) =>
            nodes
              .filter((node) => node.scrollWidth > node.clientWidth + 1)
              .map(
                (node) =>
                  `${node.className} ${node.scrollWidth}/${node.clientWidth} ${node.parentElement?.getAttribute("style")}`,
              ),
          );
        expect(overflowing).toEqual([]);
        for (const chart of await page.locator(".recharts-wrapper").all()) {
          const box = await chart.boundingBox();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(width + 0.5);
        }
        await expect(
          page
            .getByTestId("chart-credits")
            .locator(".recharts-bar-rectangle path")
            .first(),
        ).toHaveCSS("fill", await cssColor(page, "var(--sprout-chart-1)"));
        await expect(
          page.locator(".recharts-cartesian-axis-tick-value").first(),
        ).toHaveCSS("fill", await cssColor(page, "var(--sprout-muted)"));
        const results = await new AxeBuilder({ page })
          .include(".chart-demo-card")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await page.mouse.move(0, 0);
        for (const id of demos) {
          const name = `${id}-${theme}-${mode}-${width}`;
          const path = testInfo.outputPath(`${name}.png`);
          const shot = await page
            .getByTestId(id)
            .screenshot({ animations: "disabled", path, style: chrome });
          expect(shot.byteLength).toBeGreaterThan(5_000);
          await testInfo.attach(name, { path, contentType: "image/png" });
        }
      });
    }
  }
}

test("credits usage splits, ranges, and folds the rest into a muted series", async ({
  page,
}) => {
  await openChart(page);
  const credits = page.getByTestId("chart-credits");
  const chart = credits.locator('[data-slot="chart"]');
  await expect(chart).toHaveAttribute("data-variant", "usage");
  expect((await chart.boundingBox())!.height).toBeCloseTo(256, 0);
  await expect(credits.getByRole("application")).toHaveAccessibleName(
    "Workspace credits by model, last 30 days",
  );
  const rows = credits.locator("tbody tr");
  await expect(rows).toHaveCount(7);
  await expect(credits.locator(".chart-demo-swatch").nth(6)).toHaveCSS(
    "background-color",
    await cssColor(page, "var(--sprout-muted)"),
  );
  // Six series stack per day: five colors and "2 more".
  await expect(chart.locator(".recharts-bar")).toHaveCount(6);
  await expect(
    chart.locator(".recharts-bar").nth(5).locator("path").first(),
  ).toHaveCSS("fill", await cssColor(page, "var(--sprout-muted)"));
  // Only the top series is rounded.
  const top = await chart
    .locator(".recharts-bar")
    .nth(5)
    .locator("path")
    .first()
    .getAttribute("d");
  const bottom = await chart
    .locator(".recharts-bar")
    .first()
    .locator("path")
    .first()
    .getAttribute("d");
  expect(top).toContain("A");
  expect(bottom).not.toContain("A");

  const ticks = chart.locator(
    ".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value",
  );
  await expect(ticks.first()).toHaveText(/^Sep \d+$/);
  await credits.getByRole("button", { name: "7d", exact: true }).click();
  await expect(credits).toContainText("credits in the last 7 days");
  await expect(credits.getByRole("application")).toHaveAccessibleName(
    "Workspace credits by model, last 7 days",
  );
  await expect(ticks.first()).toHaveText(/^Oct \d+$/);
  await credits.getByRole("button", { name: "Activity", exact: true }).click();
  await expect(credits.locator("tbody tr")).toHaveCount(4);
  await expect(credits.locator("thead th").first()).toHaveText("Activity");
  await expect(chart.locator(".recharts-bar")).toHaveCount(4);
  await credits.getByRole("button", { name: "Agent", exact: true }).click();
  await expect(credits.locator("tbody")).toContainText("Inbox triage");
});

test("credits empty, loading, and error states", async ({ page }, testInfo) => {
  await openChart(page);
  const credits = page.getByTestId("chart-credits");
  const preview = credits.getByRole("group", { name: "Preview state" });
  await preview.getByRole("button", { name: "Empty", exact: true }).click();
  await expect(credits.locator('[data-slot="chart"]')).toHaveCount(0);
  await expect(credits).toContainText("No usage in the last 30 days");
  await expect(credits.getByRole("button", { name: "New chat" })).toBeVisible();
  for (const [state, text] of [
    ["Loading", "Loading usage"],
    ["Error", "Couldn’t load usage"],
  ] as const) {
    await preview.getByRole("button", { name: state, exact: true }).click();
    await expect(credits).toContainText(text);
    await expect(credits.locator('[data-slot="chart"]')).toHaveCount(0);
    const path = testInfo.outputPath(
      `chart-credits-${state.toLowerCase()}.png`,
    );
    await credits.screenshot({ animations: "disabled", path });
    await testInfo.attach(`chart-credits-${state.toLowerCase()}`, {
      path,
      contentType: "image/png",
    });
  }
  await credits.getByRole("button", { name: "Try again" }).click();
  await expect(credits.locator('[data-slot="chart"]')).toBeVisible();
});

test("keyboard focus shows a ring and arrows walk the tooltip", async ({
  page,
}, testInfo) => {
  await openChart(page);
  const chart = surface(page, "chart-daily");
  await chart.focus();
  await expect(chart).toBeFocused();
  await expect(chart).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("ArrowRight");
  const tooltip = page
    .getByTestId("chart-daily")
    .locator('[data-slot="chart-tooltip"]');
  await expect(tooltip).toBeVisible();
  await expect(tooltip.locator(".sprout-chart-tooltip-label")).toHaveText(
    /^Oct 1\d$/,
  );
  await expect(tooltip).toContainText("Tasks");
  for (let step = 0; step < 4; step++) await page.keyboard.press("ArrowRight");
  // Oct 13 has no notes, so its tooltip only lists tasks.
  await expect(tooltip.locator(".sprout-chart-tooltip-label")).toHaveText(
    "Oct 13",
  );
  await expect(tooltip).toContainText("Tasks");
  await expect(tooltip).not.toContainText("Notes");
  await expect(tooltip.locator('[data-slot="chart-tooltip-item"]')).toHaveCount(
    1,
  );
  await page.keyboard.press("ArrowLeft");
  await expect(tooltip.locator(".sprout-chart-tooltip-label")).toHaveText(
    "Oct 12",
  );
  await expect(tooltip.locator('[data-slot="chart-tooltip-item"]')).toHaveCount(
    2,
  );
  const path = testInfo.outputPath("chart-keyboard-tooltip.png");
  await page.getByTestId("chart-daily").screenshot({ path });
  await testInfo.attach("chart-keyboard-tooltip", {
    path,
    contentType: "image/png",
  });
});

test("canvas and playground category charts show a legend and grouped bars", async ({
  page,
}) => {
  await openChart(page);
  const canvas = page.getByTestId("chart-canvas");
  const charts = canvas.locator('[data-slot="chart"]');
  await expect(charts).toHaveCount(2);
  await expect(charts.first()).toHaveAttribute("data-variant", "category");
  expect((await charts.first().boundingBox())!.height).toBeCloseTo(288, 0);
  await expect(canvas.getByRole("application").first()).toHaveAccessibleName(
    "Open tasks by project",
  );
  await expect(
    charts.first().locator('[data-slot="chart-legend-item"]'),
  ).toHaveText(["Open", "Blocked", "In review"]);
  await expect(charts.first().locator(".recharts-bar")).toHaveCount(3);
  await expect(
    charts.nth(1).locator('[data-slot="chart-legend-item"]'),
  ).toHaveText(["Won"]);
  const categories = page.getByTestId("chart-categories");
  await expect(categories.getByRole("application")).toHaveAccessibleName(
    "Tasks, Notes by project",
  );
  await expect(
    categories.locator('[data-slot="chart-legend-item"]'),
  ).toHaveText(["Tasks", "Notes"]);
  await surface(page, "chart-categories").hover();
  const box = await surface(page, "chart-categories").boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  const tooltip = categories.locator('[data-slot="chart-tooltip"]');
  await expect(tooltip).toBeVisible();
  await expect(tooltip.locator(".sprout-chart-tooltip-label")).toHaveText(
    "Garden",
  );
  await expect(tooltip.locator('[data-slot="chart-tooltip-item"]')).toHaveCount(
    2,
  );
});

test("static tooltip indicators, options, and legends", async ({ page }) => {
  await openChart(page);
  for (const indicator of ["dot", "line", "dashed"]) {
    const box = page.getByTestId(`chart-indicator-${indicator}`);
    const tooltip = box.locator('[data-slot="chart-tooltip"]');
    await expect(tooltip).toHaveAttribute("data-indicator", indicator);
    await expect(tooltip).toContainText("Meadow");
    await expect(tooltip).toContainText("12");
    await expect(box.locator('[data-slot="chart-legend-item"]')).toHaveText(
      "Tasks",
    );
    const mark = await tooltip
      .locator('[data-slot="chart-tooltip-indicator"]')
      .boundingBox();
    if (indicator === "dot") expect(mark!.width).toBeCloseTo(mark!.height, 0);
    else expect(mark!.height).toBeGreaterThan(mark!.width);
    await expect(
      tooltip.locator('[data-slot="chart-tooltip-indicator"]'),
    ).toHaveCSS(
      indicator === "dashed" ? "border-top-style" : "background-color",
      indicator === "dashed"
        ? "dashed"
        : await cssColor(page, "var(--sprout-chart-1)"),
    );
  }
  const tips = page
    .getByTestId("chart-option-tips")
    .locator('[data-slot="chart-tooltip"]');
  await expect(tips).toHaveCount(5);
  await expect(tips.nth(0)).toContainText("Oct 14");
  await expect(
    tips.nth(0).locator('[data-slot="chart-tooltip-item"]'),
  ).toHaveCount(2);
  await expect(tips.nth(1)).not.toContainText("Oct 14");
  await expect(
    tips.nth(2).locator('[data-slot="chart-tooltip-indicator"]'),
  ).toHaveCount(0);
  await expect(
    tips.nth(3).locator('[data-slot="chart-tooltip-item"] svg'),
  ).toHaveCount(2);
  await expect(tips.nth(4)).toContainText("128.5 credits");
  await expect(
    page
      .getByTestId("chart-option-tips")
      .locator('[data-slot="chart-legend-item"] svg'),
  ).toHaveCount(2);
});

test("custom chart follows theme colors and keeps a top legend", async ({
  page,
}) => {
  await openChart(page);
  const composition = page.getByTestId("chart-composition");
  const legend = composition.locator('[data-slot="chart-legend"]');
  await expect(legend).toHaveAttribute("data-align", "top");
  await expect(legend.locator('[data-slot="chart-legend-item"]')).toHaveText([
    "Chats",
    "Agent runs",
  ]);
  await expect(legend.locator("svg")).toHaveCount(2);
  const line = composition.locator(".recharts-line-curve").first();
  await chooseOption(page, "Color mode", "Light");
  await expect(line).toHaveCSS("stroke", "rgb(36, 92, 186)");
  await chooseOption(page, "Color mode", "Dark");
  await expect(line).toHaveCSS("stroke", "rgb(156, 189, 255)");
});

test("reduced motion keeps the tooltip still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openChart(page);
  const chart = surface(page, "chart-daily");
  await chart.focus();
  await page.keyboard.press("ArrowRight");
  const wrapper = page
    .getByTestId("chart-daily")
    .locator(".recharts-tooltip-wrapper");
  await expect(wrapper.locator('[data-slot="chart-tooltip"]')).toBeVisible();
  const transition = await wrapper.evaluate(
    (node) => getComputedStyle(node).transitionDuration,
  );
  expect(transition.split(",").every((part) => parseFloat(part) === 0)).toBe(
    true,
  );
});
