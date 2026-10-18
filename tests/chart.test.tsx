import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import {
  CategoryChart,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  UsageChart,
  chartColor,
  chartIndicatorNames,
  type ChartConfig,
  type UsageSeries,
} from "../packages/sprout/src/components/chart.js";
import * as sprout from "../packages/sprout/src/index.js";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("../packages/sprout/src/styles/chart.css");

const series: UsageSeries[] = [
  { key: "tasks", label: "Tasks", color: "var(--sprout-chart-1)" },
  { key: "notes", label: "Notes", color: "var(--sprout-chart-2)" },
];
const config: ChartConfig = {
  tasks: { label: "Tasks", color: "var(--sprout-chart-1)" },
  notes: { label: "Notes", color: "var(--sprout-chart-2)" },
};
const payload = [
  {
    graphicalItemId: "tasks",
    name: "tasks",
    dataKey: "tasks",
    value: 1200,
    color: "var(--sprout-chart-1)",
  },
  {
    graphicalItemId: "notes",
    name: "notes",
    dataKey: "notes",
    value: 3,
    color: "var(--sprout-chart-2)",
  },
];
const one = [payload[0]!];

const inChart = (node: React.ReactNode, chartConfig = config) =>
  renderToString(
    <ChartContainer config={chartConfig}>
      <div>{node}</div>
    </ChartContainer>,
  );

describe("Chart", () => {
  it("is exported from the package root and its subpath", () => {
    for (const name of [
      "CategoryChart",
      "ChartContainer",
      "ChartLegend",
      "ChartLegendContent",
      "ChartStyle",
      "ChartTooltip",
      "ChartTooltipContent",
      "UsageChart",
      "chartColor",
      "chartIndicatorNames",
    ])
      expect(sprout).toHaveProperty(name);
    const manifest = JSON.parse(read("../packages/sprout/package.json"));
    expect(manifest.exports["./chart"]).toEqual({
      types: "./dist/components/chart.d.ts",
      import: "./dist/components/chart.js",
    });
    expect(manifest.dependencies.recharts).toBe("3.8.0");
    const index = read("../packages/sprout/src/styles/index.css");
    expect(index).toContain('@import "./chart.css";');
    for (let step = 1; step <= 5; step++)
      expect(index).toContain(
        `--color-sprout-chart-${step}: var(--sprout-chart-${step});`,
      );
    expect(chartIndicatorNames).toEqual(["dot", "line", "dashed"]);
    expect(ChartLegend).toBeTruthy();
    expect(ChartTooltip).toBeTypeOf("function");
  });

  it("defines a light and dark palette and honors reduced motion data", () => {
    expect(css).toMatch(/:root,\s*\.light \{\s*--sprout-chart-1: #188038;/);
    expect(css).toMatch(/\.dark \{\s*--sprout-chart-1: #75ce8e;/);
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).toContain(".recharts-surface:focus-visible");
    expect(css).toContain("forced-colors: active");
  });

  it("writes namespaced color variables, with dark values for themes", () => {
    expect(
      renderToString(
        <ChartStyle id="chart-a" config={{ x: { label: "X" } }} />,
      ),
    ).toBe("");
    const plain = renderToString(<ChartStyle id="chart-a" config={config} />);
    expect(plain).toContain('[data-chart="chart-a"]');
    expect(plain).toContain(
      "--sprout-chart-color-tasks: var(--sprout-chart-1);",
    );
    expect(plain).not.toContain(".dark");
    const themed = renderToString(
      <ChartStyle
        id="chart-b"
        config={{
          "agent runs": {
            label: "Agent runs",
            theme: { light: "#111", dark: "#eee" },
          },
        }}
      />,
    );
    expect(themed).toContain("--sprout-chart-color-agent_runs: #111;");
    expect(themed).toContain('.dark [data-chart="chart-b"]');
    expect(themed).toContain("--sprout-chart-color-agent_runs: #eee;");
    expect(themed).toContain(":root:not(.light):not(.dark)");
    expect(chartColor("agent runs")).toBe(
      "var(--sprout-chart-color-agent_runs)",
    );
  });

  it("renders a container slot with its style and a 16:9 default", () => {
    const html = renderToString(
      <ChartContainer id="usage" config={config} className="extra">
        <div>child</div>
      </ChartContainer>,
    );
    expect(html).toContain('data-slot="chart"');
    expect(html).toContain('data-chart="chart-usage"');
    expect(html).toContain('class="sprout-chart extra"');
    expect(html).toContain("--sprout-chart-color-notes");
    expect(css).toMatch(/\.sprout-chart \{[^}]*aspect-ratio: 16 \/ 9;/);
  });

  it("requires a ChartContainer for tooltip and legend content", () => {
    expect(() =>
      renderToString(<ChartTooltipContent active payload={one} />),
    ).toThrow("useChart must be used within a <ChartContainer />");
  });

  it("renders tooltip rows with config labels and localized values", () => {
    const html = inChart(
      <ChartTooltipContent active label="Meadow" payload={payload} />,
    );
    expect(html).toContain('data-slot="chart-tooltip"');
    expect(html).toContain('data-indicator="dot"');
    expect(html).toContain('class="sprout-chart-tooltip-label">Meadow</div>');
    expect(html.match(/data-slot="chart-tooltip-item"/g)).toHaveLength(2);
    expect(html).toContain("<span>Tasks</span>");
    expect(html).toContain("<span>Notes</span>");
    expect(html).toContain(">1,200</span>");
    expect(html).toContain("--sprout-chart-indicator:var(--sprout-chart-1)");
    expect(inChart(<ChartTooltipContent payload={payload} />)).not.toContain(
      "chart-tooltip",
    );
    expect(inChart(<ChartTooltipContent active payload={[]} />)).not.toContain(
      "chart-tooltip",
    );
  });

  it("nests the label for one line or dashed row, not for dots", () => {
    for (const indicator of chartIndicatorNames) {
      const html = inChart(
        <ChartTooltipContent
          active
          label="Meadow"
          indicator={indicator}
          payload={one}
        />,
      );
      expect(html).toContain(`data-indicator="${indicator}"`);
      const nested = html.includes("data-nested");
      expect(nested).toBe(indicator !== "dot");
      expect(html.match(/Meadow/g)).toHaveLength(1);
    }
  });

  it("supports hideLabel, hideIndicator, formatters, keys, color, and icons", () => {
    expect(
      inChart(
        <ChartTooltipContent
          active
          hideLabel
          label="Meadow"
          payload={payload}
        />,
      ),
    ).not.toContain("Meadow");
    expect(
      inChart(<ChartTooltipContent active hideIndicator payload={payload} />),
    ).not.toContain("chart-tooltip-indicator");
    expect(
      inChart(
        <ChartTooltipContent
          active
          label="2026-10-13"
          labelClassName="day"
          labelFormatter={() => "Oct 13"}
          payload={payload}
        />,
      ),
    ).toContain('class="sprout-chart-tooltip-label day">Oct 13</div>');
    expect(
      inChart(
        <ChartTooltipContent
          active
          payload={payload}
          formatter={(value, name) => <b>{`${name}=${value}`}</b>}
        />,
      ),
    ).toContain("<b>tasks=1200</b>");
    expect(
      inChart(<ChartTooltipContent active color="red" payload={one} />),
    ).toContain("--sprout-chart-indicator:red");
    const keyed = inChart(
      <ChartTooltipContent
        active
        labelKey="tasks"
        nameKey="kind"
        payload={[{ ...payload[0]!, payload: { kind: "notes" } }]}
      />,
    );
    expect(keyed).toContain('class="sprout-chart-tooltip-label">Tasks</div>');
    expect(keyed).toContain("<span>Notes</span>");
    const Icon = () => <svg data-icon="tasks" />;
    const withIcon = inChart(<ChartTooltipContent active payload={one} />, {
      tasks: { label: "Tasks", color: "red", icon: Icon },
    });
    expect(withIcon).toContain('data-icon="tasks"');
    expect(withIcon).not.toContain("chart-tooltip-indicator");
  });

  it("omits null values and none-type rows", () => {
    const html = inChart(
      <ChartTooltipContent
        active
        payload={[
          { ...payload[0]!, value: null as unknown as number },
          { ...payload[1]!, type: "none" as const },
        ]}
      />,
    );
    expect(html).toContain("<span>Tasks</span>");
    expect(html).not.toContain("sprout-chart-tooltip-value");
    expect(html).not.toContain("Notes");
  });

  it("renders legend swatches, icons, and top alignment", () => {
    const items = [
      { value: "Tasks", dataKey: "tasks", color: "var(--sprout-chart-1)" },
      { value: "Notes", dataKey: "notes", color: "var(--sprout-chart-2)" },
    ];
    const html = inChart(<ChartLegendContent payload={items} />);
    expect(html).toContain('data-slot="chart-legend"');
    expect(html).toContain('data-align="bottom"');
    expect(html.match(/data-slot="chart-legend-item"/g)).toHaveLength(2);
    expect(html).toContain("background-color:var(--sprout-chart-2)");
    expect(
      inChart(<ChartLegendContent verticalAlign="top" payload={items} />),
    ).toContain('data-align="top"');
    expect(inChart(<ChartLegendContent payload={[]} />)).not.toContain(
      "chart-legend",
    );
    const Icon = () => <svg data-icon="tasks" />;
    const iconConfig = { ...config, tasks: { label: "Tasks", icon: Icon } };
    expect(
      inChart(<ChartLegendContent payload={items} />, iconConfig),
    ).toContain('data-icon="tasks"');
    expect(
      inChart(<ChartLegendContent hideIcon payload={items} />, iconConfig),
    ).not.toContain("data-icon");
  });

  it("renders UsageChart and CategoryChart with their sizes and names", () => {
    const usage = renderToString(
      <UsageChart
        locale="en-US"
        days={[
          { date: "2026-10-10", tasks: 4, notes: 3 },
          { date: "2026-10-13", tasks: 8, notes: null },
        ]}
        series={series}
      />,
    );
    expect(usage).toContain('data-variant="usage"');
    expect(usage).toContain("sprout-chart sprout-chart-usage");
    expect(usage).toContain(
      "--sprout-chart-color-tasks: var(--sprout-chart-1);",
    );
    expect(css).toMatch(/\.sprout-chart-usage \{\s*height: 16rem;/);
    const category = renderToString(
      <CategoryChart
        rows={[{ project: "Meadow", tasks: 12, notes: 4 }]}
        category="project"
        series={series}
        className="tall"
      />,
    );
    expect(category).toContain('data-variant="category"');
    expect(category).toContain("sprout-chart sprout-chart-category tall");
    expect(css).toMatch(/\.sprout-chart-category \{\s*height: 18rem;/);
  });
});
