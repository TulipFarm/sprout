# Plan: business charts

## Context

`@tulipfarm/sprout/chart` ships two ready charts (`UsageChart`, `CategoryChart`) and the
shared parts (`ChartContainer`, `ChartTooltip*`, `ChartLegend*`, `chartColor`). Goal: add
ready charts that cover common business dashboards, all on Recharts 3.8 and the same
tokens, tooltip, and legend.

## Decisions (from grilling)

| #       | Decision                                                                          |
| ------- | --------------------------------------------------------------------------------- |
| Scope   | All 15 charts in one change                                                       |
| Colors  | Five `--sprout-chart-*` colors. Parts past five fold into one muted “N more” part |
| Heatmap | Shades of one chart color, mixed with `--sprout-surface`. No new tokens           |
| Import  | One path, `@tulipfarm/sprout/chart`. Code split into internal files               |
| Names   | Never the same as a Recharts export, so apps can import both without aliasing     |

## Charts

| Chart              | Recharts base           | Data                                                                 |
| ------------------ | ----------------------- | -------------------------------------------------------------------- |
| `TrendChart`       | `LineChart`             | `rows`, `category`, `series`; `curve`, `dots`                        |
| `AreaTrendChart`   | `AreaChart`             | `rows`, `category`, `series`; `stack: none/stacked/percent`          |
| `CategoryChart`    | `BarChart` (extended)   | adds `layout: vertical/horizontal`, `stack`, zero line for negatives |
| `ComboChart`       | `ComposedChart`         | `series[].kind: bar/line`, `series[].axis: left/right`               |
| `DonutChart`       | `PieChart`              | `rows`, `category`, `value`; `variant: donut/pie`, center total      |
| `Sparkline`        | `LineChart`/`AreaChart` | `values: number[]`; no axes                                          |
| `GaugeChart`       | `RadialBarChart`        | `value`, `max`, `label`                                              |
| `StepFunnelChart`  | `FunnelChart`           | `rows`, `category`, `value`; step share of first step                |
| `WaterfallChart`   | `BarChart` range bars   | `rows`, `category`, `value`, `total` flag                            |
| `HeatmapChart`     | `ScatterChart` squares  | `rows`, `x`, `y`, `value`; `color`                                   |
| `TimelineChart`    | `BarChart` range bars   | `rows`, `category`, `start`, `end`                                   |
| `ScatterPlotChart` | `ScatterChart`          | `series[]` each with `rows`; `x`, `y`, optional `size`               |
| `TreemapChart`     | `Treemap`               | `rows`, `category`, `value`                                          |
| `SankeyChart`      | `Sankey`                | `nodes`, `links`                                                     |
| `RadarScoreChart`  | `RadarChart`            | `rows`, `category`, `series`                                         |

All charts take `title` (screen-reader name), `className`, and `valueFormatter`
(axis ticks and tooltip values, e.g. currency). `ChartTooltipContent` gains
`valueFormatter`.

## Files

```
packages/sprout/src/components/chart.tsx      re-exports only (public path unchanged)
packages/sprout/src/internal/chart-kit.tsx    container, style, tooltip, legend, shared helpers
packages/sprout/src/internal/charts/bars.tsx  Usage, Category, Waterfall, Timeline
packages/sprout/src/internal/charts/lines.tsx Trend, AreaTrend, Combo, Sparkline
packages/sprout/src/internal/charts/parts.tsx Donut, StepFunnel, Treemap, Gauge
packages/sprout/src/internal/charts/more.tsx  Heatmap, ScatterPlot, Sankey, RadarScore
packages/sprout/src/styles/chart.css          sizes per chart
apps/docs/…ChartDemo.tsx, chart.astro          one example per chart
tests/chart.test.tsx, tests/browser/chart*.tsx  unit, render, and visual checks
skills/sprout/references/components.md, README  list the charts
```

## Checks

`pnpm typecheck`, `pnpm format:check`, `pnpm vitest run tests/chart.test.tsx`,
`pnpm vitest run tests/browser/chart.browser.test.tsx`, visual test, docs screenshots.
