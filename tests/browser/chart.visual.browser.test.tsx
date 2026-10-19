import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
  CategoryChart,
  UsageChart,
  type UsageDay,
  type UsageSeries,
} from "../../packages/sprout/src/components/chart.js";
import { setTheme, settle, themes } from "./support.js";

const series: UsageSeries[] = [
  { key: "tasks", label: "Tasks", color: "var(--sprout-chart-1)" },
  { key: "notes", label: "Notes", color: "var(--sprout-chart-2)" },
  { key: "rest", label: "2 more", color: "var(--sprout-muted)" },
];

const days: UsageDay[] = Array.from({ length: 14 }, (_, index) => ({
  date: `2025-10-${String(index + 1).padStart(2, "0")}`,
  tasks: 4 + (index % 5),
  notes: 2 + (index % 3),
  rest: 1 + (index % 2),
}));

it.each(themes)("chart %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{ display: "grid", gap: 16, padding: 16, width: 640 }}
    >
      <UsageChart
        days={days}
        series={series}
        title="Credits by series"
        locale="en-US"
      />
      <CategoryChart
        rows={[
          { project: "Garden", tasks: 12, notes: 7 },
          { project: "Meadow", tasks: 8, notes: 4 },
          { project: "Orchard", tasks: 5, notes: 9 },
        ]}
        category="project"
        series={series.slice(0, 2)}
      />
    </div>,
  );
  await expect
    .poll(() => document.querySelectorAll(".recharts-bar-rectangle").length)
    .toBeGreaterThan(0);
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`chart-${theme}-${mode}`);
});
