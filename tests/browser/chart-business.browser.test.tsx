import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { BusinessFixture } from "./chart-business-fixture.js";
import { axeViolations, setTheme, settle, themes } from "./support.js";

const fixture = () => page.getByTestId("business").element();
const variant = (name: string) =>
  fixture().querySelector<HTMLElement>(`[data-variant="${name}"]`)!;

/** Waits until every Recharts chart has drawn its marks. */
async function drawn() {
  await expect
    .poll(() =>
      [
        ".recharts-line-curve",
        ".recharts-pie-sector",
        ".recharts-radial-bar-sector",
        ".recharts-sankey-nodes rect",
        ".recharts-treemap-depth-1 rect, .sprout-chart-treemap rect",
        ".recharts-scatter-symbol",
        ".recharts-radar-polygon",
      ].every((selector) => fixture().querySelector(selector)),
    )
    .toBe(true);
  await settle();
}

describe("Business charts in a real browser", () => {
  it.each(themes)("%s %s pass axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<BusinessFixture />);
    await drawn();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it("donut and gauge put their number in the middle", async () => {
    await render(<BusinessFixture />);
    await drawn();
    expect(
      variant("donut").querySelector(".sprout-chart-center-value")?.textContent,
    ).toBe("3,010");
    const legend = [
      ...variant("donut").querySelectorAll('[data-slot="chart-legend-item"]'),
    ].map((item) => item.textContent);
    expect(legend).toEqual([
      "Search",
      "Direct",
      "Email",
      "Social",
      "Ads",
      "2 more",
    ]);
    expect(
      variant("gauge").querySelector(".sprout-chart-center-value")?.textContent,
    ).toBe("72%");
  });

  it("sankey labels sit inside the chart, toward the middle", async () => {
    await render(<BusinessFixture />);
    await drawn();
    const chart = variant("sankey").getBoundingClientRect();
    const labels = [
      ...variant("sankey").querySelectorAll<SVGTextElement>(
        ".sprout-chart-sankey-label",
      ),
    ];
    expect(labels.map((label) => label.getAttribute("text-anchor"))).toEqual([
      "start",
      "end",
      "end",
    ]);
    for (const label of labels) {
      const box = label.getBoundingClientRect();
      expect(box.left).toBeGreaterThanOrEqual(chart.left);
      expect(box.right).toBeLessThanOrEqual(chart.right);
    }
  });

  it("timeline ticks read as dates and rows set the heights", async () => {
    await render(<BusinessFixture />);
    await drawn();
    const ticks = [
      ...variant("timeline").querySelectorAll(
        ".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value",
      ),
    ].map((tick) => tick.textContent);
    expect(ticks.length).toBeGreaterThan(1);
    for (const tick of ticks) expect(tick).toMatch(/^[A-Z][a-z]{2} \d+$/);
    // 2 tasks × 2rem + 5rem for axis and legend.
    expect(variant("timeline").getBoundingClientRect().height).toBeCloseTo(
      144,
      0,
    );
    // 3 steps × 2.5rem + 1rem.
    expect(variant("funnel").getBoundingClientRect().height).toBeCloseTo(
      136,
      0,
    );
  });

  it("fits a 390px phone without spilling", async () => {
    await page.viewport(390, 900);
    const screen = await render(<BusinessFixture />);
    await drawn();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const chart of screen.container.querySelectorAll(
      ".recharts-wrapper",
    )) {
      const box = chart.getBoundingClientRect();
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(390.5);
    }
  });
});
