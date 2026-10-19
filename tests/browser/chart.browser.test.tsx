import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  CategoryChart,
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
  UsageChart,
  chartColor,
  type UsageDay,
  type UsageSeries,
} from "../../packages/sprout/src/components/chart.js";
import {
  axeViolations,
  emulate,
  parkPointer,
  setTheme,
  settle,
  themes,
} from "./support.js";

const series: UsageSeries[] = [
  { key: "tasks", label: "Tasks", color: "var(--sprout-chart-1)" },
  { key: "notes", label: "Notes", color: "var(--sprout-chart-2)" },
  { key: "rest", label: "2 more", color: "var(--sprout-muted)" },
];

const days: UsageDay[] = Array.from({ length: 14 }, (_, index) => ({
  date: `2025-10-${String(index + 1).padStart(2, "0")}`,
  tasks: 4 + (index % 5),
  // Oct 5 has no notes, so its tooltip lists only the other series.
  notes: index === 4 ? null : 2 + (index % 3),
  rest: 1 + (index % 2),
}));

const rows = [
  { project: "Garden", tasks: 12, notes: 7 },
  { project: "Meadow", tasks: 8, notes: 4 },
  { project: "Orchard", tasks: 5, notes: 9 },
];

function Charts() {
  return (
    <div
      style={{ display: "grid", gap: 24, padding: 16, maxWidth: 720 }}
      data-testid="charts"
    >
      <div data-testid="usage">
        <UsageChart
          days={days}
          series={series}
          title="Credits by series, last 14 days"
          locale="en-US"
        />
      </div>
      <div data-testid="category">
        <CategoryChart
          rows={rows}
          category="project"
          series={series.slice(0, 2)}
        />
      </div>
    </div>
  );
}

function colorOf(value: string) {
  const probe = document.createElement("span");
  probe.style.color = value;
  document.body.append(probe);
  const result = getComputedStyle(probe).color;
  probe.remove();
  return result;
}

const surface = (id: string) =>
  page
    .getByTestId(id)
    .element()
    .querySelector<SVGSVGElement>("svg.recharts-surface")!;
const bars = (id: string) =>
  page.getByTestId(id).element().querySelectorAll(".recharts-bar");
const tooltip = (id: string) =>
  page
    .getByTestId(id)
    .element()
    .querySelector<HTMLElement>('[data-slot="chart-tooltip"]');
const tooltipLabel = (id: string) =>
  tooltip(id)?.querySelector(".sprout-chart-tooltip-label")?.textContent;

/** Waits for Recharts to measure its box and draw the bars. */
async function drawn() {
  await expect
    .poll(() => document.querySelectorAll(".recharts-bar-rectangle").length)
    .toBeGreaterThan(0);
  await settle();
}

/** Moves the pointer off the fixture; earlier files can leave it hovering here. */
describe("Chart in a real browser", () => {
  it.each(themes)(
    "%s %s passes axe and paints theme colors",
    async (theme, mode) => {
      setTheme(theme, mode);
      const screen = await render(<Charts />);
      await drawn();
      expect(await axeViolations(screen.container)).toEqual([]);
      const first = bars("usage")[0]!.querySelector("path")!;
      expect(getComputedStyle(first).fill).toBe(
        colorOf("var(--sprout-chart-1)"),
      );
      const muted = bars("usage")[2]!.querySelector("path")!;
      expect(getComputedStyle(muted).fill).toBe(colorOf("var(--sprout-muted)"));
      const tick = screen.container.querySelector(
        ".recharts-cartesian-axis-tick-value",
      )!;
      expect(getComputedStyle(tick).fill).toBe(colorOf("var(--sprout-muted)"));
    },
  );

  it("usage and category charts keep their heights, stacks and legend", async () => {
    await render(<Charts />);
    await drawn();
    const usage = page.getByTestId("usage").element().firstElementChild!;
    expect(usage.getBoundingClientRect().height).toBeCloseTo(256, 0);
    const category = page.getByTestId("category").element().firstElementChild!;
    expect(category.getBoundingClientRect().height).toBeCloseTo(288, 0);
    expect(bars("usage")).toHaveLength(3);
    // Only the top series is rounded.
    expect(
      bars("usage")[2]!.querySelector("path")!.getAttribute("d"),
    ).toContain("A");
    expect(
      bars("usage")[0]!.querySelector("path")!.getAttribute("d"),
    ).not.toContain("A");
    const legend = [
      ...category.querySelectorAll('[data-slot="chart-legend-item"]'),
    ].map((item) => item.textContent);
    expect(legend).toEqual(["Tasks", "Notes"]);
    const ticks = page
      .getByTestId("usage")
      .element()
      .querySelector(
        ".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value",
      )!;
    expect(ticks.textContent).toMatch(/^Oct \d+$/);
  });

  it("keyboard focus shows a ring and arrows walk the tooltip", async () => {
    await render(<Charts />);
    await parkPointer();
    await drawn();
    const chart = surface("usage");
    chart.focus();
    await expect.element(page.elementLocator(chart)).toHaveFocus();
    // Recharts focuses with focus-visible only from the keyboard.
    await userEvent.keyboard("{ArrowRight}");
    expect(getComputedStyle(chart).outlineStyle).toBe("solid");
    await expect.poll(() => tooltipLabel("usage")).toBe("Oct 2");
    for (let step = 0; step < 3; step++)
      await userEvent.keyboard("{ArrowRight}");
    await expect.poll(() => tooltipLabel("usage")).toBe("Oct 5");
    expect(
      tooltip("usage")!.querySelectorAll('[data-slot="chart-tooltip-item"]'),
    ).toHaveLength(2);
    expect(tooltip("usage")!.textContent).not.toContain("Notes");
    await userEvent.keyboard("{ArrowLeft}");
    await expect.poll(() => tooltipLabel("usage")).toBe("Oct 4");
    expect(
      tooltip("usage")!.querySelectorAll('[data-slot="chart-tooltip-item"]'),
    ).toHaveLength(3);
  });

  it("hovering a category shows its grouped values", async () => {
    await render(<Charts />);
    await drawn();
    const chart = surface("category");
    const box = chart.getBoundingClientRect();
    await userEvent.hover(page.elementLocator(chart), {
      position: { x: box.width / 2, y: box.height / 2 },
    });
    await expect.poll(() => tooltipLabel("category")).toBe("Meadow");
    expect(
      tooltip("category")!.querySelectorAll('[data-slot="chart-tooltip-item"]'),
    ).toHaveLength(2);
  });

  it("tooltip indicators draw a dot, a line, and a dashed line", async () => {
    const screen = await render(
      <div style={{ display: "flex", gap: 16, padding: 16 }}>
        {(["dot", "line", "dashed"] as const).map((indicator) => (
          <div key={indicator} data-testid={indicator} style={{ width: 200 }}>
            <ChartContainer
              config={{
                tasks: { label: "Tasks", color: "var(--sprout-chart-1)" },
              }}
            >
              <div>
                <ChartTooltipContent
                  active
                  label="Meadow"
                  indicator={indicator}
                  payload={[
                    {
                      graphicalItemId: "tasks",
                      name: "tasks",
                      dataKey: "tasks",
                      value: 12,
                      color: "var(--sprout-chart-1)",
                    },
                  ]}
                />
                <ChartLegendContent
                  payload={[
                    {
                      value: "Tasks",
                      dataKey: "tasks",
                      color: "var(--sprout-chart-1)",
                    },
                  ]}
                />
              </div>
            </ChartContainer>
          </div>
        ))}
      </div>,
    );
    for (const indicator of ["dot", "line", "dashed"]) {
      const mark = screen
        .getByTestId(indicator)
        .element()
        .querySelector('[data-slot="chart-tooltip-indicator"]')!;
      const box = mark.getBoundingClientRect();
      if (indicator === "dot") expect(box.width).toBeCloseTo(box.height, 0);
      else expect(box.height).toBeGreaterThan(box.width);
      if (indicator === "dashed")
        expect(getComputedStyle(mark).borderTopStyle).toBe("dashed");
      else
        expect(getComputedStyle(mark).backgroundColor).toBe(
          colorOf("var(--sprout-chart-1)"),
        );
    }
  });

  it("themed config colors follow light and dark mode", async () => {
    const screen = await render(
      <ChartContainer
        config={{
          chats: {
            label: "Chats",
            theme: { light: "rgb(36, 92, 186)", dark: "rgb(156, 189, 255)" },
          },
        }}
      >
        <div>
          <span data-testid="swatch" style={{ color: chartColor("chats") }}>
            Chats
          </span>
        </div>
      </ChartContainer>,
    );
    const swatch = screen.getByTestId("swatch").element();
    expect(getComputedStyle(swatch).color).toBe("rgb(36, 92, 186)");
    setTheme("neutral", "dark");
    expect(getComputedStyle(swatch).color).toBe("rgb(156, 189, 255)");
  });

  it("fits a 390px phone without spilling", async () => {
    await page.viewport(390, 900);
    const screen = await render(<Charts />);
    await drawn();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const node of screen.container.querySelectorAll(
      "[data-slot='chart'], [data-slot='chart-legend']",
    ))
      expect(node.scrollWidth).toBeLessThanOrEqual(node.clientWidth + 1);
    for (const chart of screen.container.querySelectorAll(
      ".recharts-wrapper",
    )) {
      const box = chart.getBoundingClientRect();
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(390.5);
    }
  });

  it("reduced motion keeps the tooltip still", async () => {
    await emulate({ reducedMotion: true });
    await render(<Charts />);
    await drawn();
    surface("usage").focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect.poll(() => tooltip("usage")).not.toBeNull();
    const wrapper = page
      .getByTestId("usage")
      .element()
      .querySelector(".recharts-tooltip-wrapper")!;
    const transition = getComputedStyle(wrapper).transitionDuration;
    expect(transition.split(",").every((part) => parseFloat(part) === 0)).toBe(
      true,
    );
  });
});
