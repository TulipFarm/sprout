"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Label,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  Treemap,
  XAxis,
  YAxis,
  type TreemapNode,
} from "recharts";
import { cn } from "../classes.js";
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
  chartShade,
  configLegend,
  foldParts,
  formatNumber,
  partConfig,
  quietAxis,
  rowFillShape,
  tooltipCursor,
  type ChartRow,
  type ReadyChartProps,
} from "../chart-kit.js";

interface PartChartProps extends ReadyChartProps {
  /** One row per part, keyed by `category` and `value`. */
  rows: ChartRow[];
  /** The row key whose value names each part. */
  category: string;
  /** The row key holding each part's number. */
  value: string;
}

const centerText = (
  viewBox: unknown,
  main: string,
  sub: string | undefined,
  lift = 0,
) => {
  // A Pie hands its Label the plot box; a polar axis hands it the circle.
  const box = viewBox as
    | {
        cx?: number;
        cy?: number;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
      }
    | undefined;
  const cx = box?.cx ?? (box?.x ?? 0) + (box?.width ?? NaN) / 2;
  const cy = box?.cy ?? (box?.y ?? 0) + (box?.height ?? NaN) / 2;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  const y = cy - lift;
  return (
    <text
      x={cx}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      className="sprout-chart-center"
    >
      <tspan x={cx} y={sub ? y - 8 : y} className="sprout-chart-center-value">
        {main}
      </tspan>
      {sub ? (
        <tspan x={cx} y={y + 14} className="sprout-chart-center-label">
          {sub}
        </tspan>
      ) : null}
    </text>
  );
};

export interface DonutChartProps extends PartChartProps {
  /** `donut` leaves a hole with the total in it; `pie` fills the circle. */
  variant?: "donut" | "pie";
  /** Words under the total in the hole, such as "Visitors". */
  totalLabel?: string;
}

/**
 * Shares of a whole as slices, largest first, 288px tall with a legend. The
 * top five parts get chart colors; the rest fold into one muted "N more".
 */
export function DonutChart({
  rows,
  category,
  value,
  variant = "donut",
  totalLabel,
  title,
  valueFormatter = formatNumber,
  className,
}: DonutChartProps) {
  const parts = useMemo(
    () => foldParts(rows, category, value),
    [rows, category, value],
  );
  const config = useMemo(() => partConfig(parts), [parts]);
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  const donut = variant === "donut";
  return (
    <ChartContainer
      data-variant={variant}
      className={cn("sprout-chart-donut", className)}
      config={config}
    >
      <PieChart accessibilityLayer title={title ?? `${value} by ${category}`}>
        <ChartTooltip
          content={
            <ChartTooltipContent hideLabel valueFormatter={valueFormatter} />
          }
        />
        <ChartLegend content={configLegend(config)} />
        <Pie
          data={parts}
          dataKey="value"
          nameKey="name"
          innerRadius={donut ? "62%" : 0}
          outerRadius="92%"
          paddingAngle={donut && parts.length > 1 ? 2 : 0}
          cornerRadius={donut ? 3 : 0}
          stroke="var(--sprout-surface)"
          strokeWidth={donut ? 0 : 1}
          isAnimationActive={false}
        >
          {donut ? (
            <Label
              position="center"
              content={({ viewBox }) =>
                centerText(viewBox, valueFormatter(total), totalLabel)
              }
            />
          ) : null}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

export interface StepFunnelChartProps extends PartChartProps {
  /** Any CSS color for the first step. Later steps get lighter shades. */
  color?: string;
}

/**
 * Drop-off from step to step, as centered bars that narrow like a funnel.
 * Step names sit on the left; each step's count and share of the first sit
 * on the right. One 40px row per step.
 */
export function StepFunnelChart({
  rows,
  category,
  value,
  color = "var(--sprout-chart-1)",
  title = "Conversion by step",
  valueFormatter = formatNumber,
  className,
}: StepFunnelChartProps) {
  const steps = useMemo(() => {
    const values = rows.map((row) => Math.max(0, Number(row[value]) || 0));
    const top = Math.max(0, ...values);
    const first = values[0] || 1;
    return rows.map((row, index) => {
      const count = values[index] ?? 0;
      const share = Math.round((count / first) * 100);
      return {
        name: String(row[category] ?? ""),
        detail: `${valueFormatter(count)} · ${share}%`,
        count,
        range: [(top - count) / 2, (top + count) / 2],
        // Fades only to about half, so the last, smallest step stays visible.
        fill: chartShade(color, rows.length * 2 - index, rows.length * 2),
      };
    });
  }, [rows, category, value, color, valueFormatter]);
  const config = useMemo(
    () => ({ count: { label: value, color } }),
    [value, color],
  );
  return (
    <ChartContainer
      data-variant="funnel"
      className={cn("sprout-chart-funnel", className)}
      style={{ height: `${steps.length * 2.5 + 1}rem` }}
      config={config}
    >
      <BarChart
        data={steps}
        accessibilityLayer
        title={title}
        layout="vertical"
        barCategoryGap="12%"
        margin={{ top: 8, right: 0, bottom: 8, left: 0 }}
      >
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis
          yAxisId="name"
          type="category"
          dataKey="name"
          width="auto"
          {...quietAxis}
          interval={0}
        />
        <YAxis
          yAxisId="detail"
          type="category"
          dataKey="detail"
          orientation="right"
          width="auto"
          {...quietAxis}
          interval={0}
        />
        <ChartTooltip
          cursor={tooltipCursor}
          content={(props) => (
            <ChartTooltipContent
              active={props.active}
              label={props.label}
              valueFormatter={valueFormatter}
              payload={props.payload?.map((item) => ({
                ...item,
                name: "count",
                value: (item.payload as { count: number }).count,
                color,
              }))}
            />
          )}
        />
        <Bar
          yAxisId="name"
          dataKey="range"
          radius={4}
          shape={rowFillShape}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}

const treemapBox = (node: TreemapNode, format: (value: number) => string) => {
  const { x, y, width, height, depth } = node;
  if (depth !== 1) return <g />;
  const fill = (node as TreemapNode & { fill?: string }).fill;
  const roomy = width > 64 && height > 36;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill={fill}
        stroke="var(--sprout-surface)"
        strokeWidth={2}
      />
      {roomy ? (
        <text x={x + 8} y={y + 18} className="sprout-chart-treemap-label">
          <tspan x={x + 8}>{node.name}</tspan>
          <tspan x={x + 8} dy={16} className="sprout-chart-treemap-value">
            {format(node.value)}
          </tspan>
        </text>
      ) : null}
    </g>
  );
};

export type TreemapChartProps = PartChartProps;

/**
 * Boxes sized by value, largest top left, 288px tall. The top five get chart
 * colors; the rest fold into one muted "N more" box.
 */
export function TreemapChart({
  rows,
  category,
  value,
  title,
  valueFormatter = formatNumber,
  className,
}: TreemapChartProps) {
  const parts = useMemo(
    () => foldParts(rows, category, value),
    [rows, category, value],
  );
  const config = useMemo(() => partConfig(parts), [parts]);
  return (
    <ChartContainer
      data-variant="treemap"
      className={cn("sprout-chart-treemap", className)}
      config={config}
      role="img"
      aria-label={title ?? `${value} by ${category}`}
    >
      <Treemap
        data={parts}
        dataKey="value"
        nameKey="name"
        aspectRatio={4 / 3}
        isAnimationActive={false}
        content={(node: TreemapNode) => treemapBox(node, valueFormatter)}
      >
        <ChartTooltip
          content={
            <ChartTooltipContent hideLabel valueFormatter={valueFormatter} />
          }
        />
      </Treemap>
    </ChartContainer>
  );
}

export interface GaugeChartProps {
  /** How far along, in the same unit as `max`. */
  value: number;
  /** The goal. Defaults to 100. */
  max?: number;
  /** Words under the number, such as "of quota". */
  label?: string;
  /** Names the gauge for screen readers, such as "Q3 quota attainment". */
  title: string;
  /** Any CSS color. Defaults to `--sprout-chart-1`. */
  color?: string;
  /** Formats the number in the middle. Defaults to percent of `max`. */
  valueFormatter?: (value: number, max: number) => string;
  className?: string;
}

const percentOfMax = (value: number, max: number) =>
  `${Math.round((value / (max || 1)) * 100)}%`;

/** Progress toward a goal as a half ring with the number in the middle. */
export function GaugeChart({
  value,
  max = 100,
  label,
  title,
  color = "var(--sprout-chart-1)",
  valueFormatter = percentOfMax,
  className,
}: GaugeChartProps) {
  const data = useMemo(
    () => [
      { name: "value", value: Math.min(Math.max(value, 0), max), fill: color },
    ],
    [value, max, color],
  );
  const config = useMemo(
    () => ({ value: { label: title, color } }),
    [title, color],
  );
  return (
    <ChartContainer
      data-variant="gauge"
      className={cn("sprout-chart-gauge", className)}
      config={config}
      role="meter"
      aria-label={title}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={data[0]!.value}
      aria-valuetext={valueFormatter(value, max)}
    >
      <RadialBarChart
        data={data}
        startAngle={180}
        endAngle={0}
        cy="78%"
        innerRadius="118%"
        outerRadius="158%"
      >
        <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
        <RadialBar
          dataKey="value"
          background
          cornerRadius={6}
          isAnimationActive={false}
        />
        <PolarRadiusAxis tick={false} axisLine={false}>
          <Label
            content={({ viewBox }) =>
              centerText(viewBox, valueFormatter(value, max), label, 12)
            }
          />
        </PolarRadiusAxis>
      </RadialBarChart>
    </ChartContainer>
  );
}
