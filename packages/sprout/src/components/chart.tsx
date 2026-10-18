"use client";

import {
  createContext,
  useContext,
  useId,
  useMemo,
  type ComponentProps,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type DefaultLegendContentProps,
  type DefaultTooltipContentProps,
  type TooltipValueType,
} from "recharts";
import { cn } from "../internal/classes.js";

/** Theme names a `ChartConfig` entry can color, and the selector each one uses. */
const THEMES = { light: "", dark: ".dark" } as const;

const INITIAL_DIMENSION = { width: 320, height: 200 } as const;

export const chartIndicatorNames = ["dot", "line", "dashed"] as const;
export type ChartIndicator = (typeof chartIndicatorNames)[number];

export type ChartConfig = Record<
  string,
  {
    label?: ReactNode;
    icon?: ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>;

const cssKey = (key: string) => key.replace(/[^\w-]/g, "_");

/**
 * The CSS variable a `ChartContainer` sets for one config key. Pass it as a
 * series `fill` or `stroke`, for example `fill={chartColor("tasks")}`.
 */
export function chartColor(key: string) {
  return `var(--sprout-chart-color-${cssKey(key)})`;
}

const ChartContext = createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = useContext(ChartContext);
  if (!context)
    throw new Error("useChart must be used within a <ChartContainer />");
  return context;
}

export type ChartContainerProps = ComponentProps<"div"> & {
  config: ChartConfig;
  children: ComponentProps<typeof ResponsiveContainer>["children"];
  /** Size used before the container is measured, and on the server. */
  initialDimension?: { width: number; height: number };
};

/**
 * Sizes a Recharts chart to its box and turns `config` into series colors
 * and labels for the tooltip and legend. The box is 16:9 unless `className`
 * or `style` gives it a height.
 */
export function ChartContainer({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: ChartContainerProps) {
  const uniqueId = useId();
  const chartId = `chart-${cssKey(id ?? uniqueId)}`;
  const value = useMemo(() => ({ config }), [config]);
  return (
    <ChartContext.Provider value={value}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn("sprout-chart", className)}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <ResponsiveContainer initialDimension={initialDimension}>
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

/**
 * Writes `--sprout-chart-color-<key>` for every colored config entry, with a
 * dark value for entries that pass `theme`. `ChartContainer` renders it.
 */
export function ChartStyle({
  id,
  config,
}: {
  id: string;
  config: ChartConfig;
}) {
  const colorConfig = Object.entries(config).filter(
    ([, item]) => item.theme ?? item.color,
  );
  if (!colorConfig.length) return null;
  const rules = (theme: keyof typeof THEMES) =>
    colorConfig
      .map(([key, item]) => {
        const color = item.theme?.[theme] ?? item.color;
        return color
          ? `  --sprout-chart-color-${cssKey(key)}: ${color};`
          : null;
      })
      .filter(Boolean)
      .join("\n");
  const scope = `[data-chart="${cssKey(id)}"]`;
  const themed = colorConfig.some(([, item]) => item.theme);
  const css = [
    `${scope} {\n${rules("light")}\n}`,
    themed ? `${THEMES.dark} ${scope} {\n${rules("dark")}\n}` : "",
    themed
      ? `@media (prefers-color-scheme: dark) {\n:root:not(.light):not(.dark) ${scope} {\n${rules("dark")}\n}\n}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

export type ChartTooltipProps = ComponentProps<typeof Tooltip>;

/**
 * Recharts' `Tooltip`, moving in 160ms. Pass `content={<ChartTooltipContent />}`.
 * It stays still when reduced motion is on.
 */
export function ChartTooltip(props: ChartTooltipProps) {
  return <Tooltip animationDuration={160} {...props} />;
}

type TooltipNameType = number | string;

export type ChartTooltipContentProps = ComponentProps<typeof Tooltip> &
  ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: ChartIndicator;
    nameKey?: string;
    labelKey?: string;
  } & Omit<
    DefaultTooltipContentProps<TooltipValueType, TooltipNameType>,
    "accessibilityLayer"
  >;

/**
 * The tooltip card: a label, then one row per series with its indicator,
 * config label, and value. Recharts passes `active`, `payload`, and `label`.
 */
export function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: ChartTooltipContentProps) {
  const { config } = useChart();

  const tooltipLabel = useMemo(() => {
    if (hideLabel || !payload?.length) return null;
    const [item] = payload;
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === "string"
        ? (config[label]?.label ?? label)
        : itemConfig?.label;
    if (labelFormatter)
      return (
        <div className={cn("sprout-chart-tooltip-label", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      );
    if (!value) return null;
    return (
      <div className={cn("sprout-chart-tooltip-label", labelClassName)}>
        {value}
      </div>
    );
  }, [
    label,
    labelFormatter,
    payload,
    hideLabel,
    labelClassName,
    config,
    labelKey,
  ]);

  if (!active || !payload?.length) return null;

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      data-slot="chart-tooltip"
      data-indicator={indicator}
      className={cn("sprout-chart-tooltip", className)}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="sprout-chart-tooltip-items">
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor =
              color ??
              (item.payload as { fill?: string } | undefined)?.fill ??
              item.color;
            return (
              <div
                key={index}
                data-slot="chart-tooltip-item"
                className="sprout-chart-tooltip-item"
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <span
                          aria-hidden="true"
                          data-slot="chart-tooltip-indicator"
                          className="sprout-chart-tooltip-indicator"
                          style={
                            {
                              "--sprout-chart-indicator": indicatorColor,
                            } as CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className="sprout-chart-tooltip-row"
                      data-nested={nestLabel || undefined}
                    >
                      <div className="sprout-chart-tooltip-name">
                        {nestLabel ? tooltipLabel : null}
                        <span>{itemConfig?.label ?? item.name}</span>
                      </div>
                      {item.value != null && (
                        <span className="sprout-chart-tooltip-value">
                          {typeof item.value === "number"
                            ? item.value.toLocaleString()
                            : String(item.value)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

/** Recharts' `Legend`. Pass `content={<ChartLegendContent />}`. */
export const ChartLegend = Legend;

export type ChartLegendContentProps = ComponentProps<"div"> & {
  hideIcon?: boolean;
  nameKey?: string;
} & DefaultLegendContentProps;

/** A centered row of swatches and config labels, one per series. */
export function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: ChartLegendContentProps) {
  const { config } = useChart();
  if (!payload?.length) return null;
  return (
    <div
      data-slot="chart-legend"
      data-align={verticalAlign === "top" ? "top" : "bottom"}
      className={cn("sprout-chart-legend", className)}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item, index) => {
          const key = `${nameKey ?? item.dataKey ?? "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          return (
            <div
              key={index}
              data-slot="chart-legend-item"
              className="sprout-chart-legend-item"
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <span
                  aria-hidden="true"
                  className="sprout-chart-legend-swatch"
                  style={{ backgroundColor: item.color }}
                />
              )}
              {itemConfig?.label}
            </div>
          );
        })}
    </div>
  );
}

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
) {
  if (typeof payload !== "object" || payload === null) return undefined;
  const inner =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? (payload.payload as Record<string, unknown>)
      : undefined;
  const outer = payload as Record<string, unknown>;
  let configLabelKey = key;
  if (typeof outer[key] === "string") configLabelKey = outer[key];
  else if (inner && typeof inner[key] === "string") configLabelKey = inner[key];
  return configLabelKey in config ? config[configLabelKey] : config[key];
}

/** One bar series: its data key, legend and tooltip label, and color. */
export type UsageSeries = { key: string; label: string; color: string };

const seriesConfig = (series: UsageSeries[]): ChartConfig =>
  Object.fromEntries(
    series.map((item) => [item.key, { label: item.label, color: item.color }]),
  );

const tooltipCursor = { fill: "var(--sprout-hover)" };

export type UsageDay = { date: string } & Record<
  string,
  number | string | null
>;

export interface UsageChartProps {
  /** One row per UTC day (`YYYY-MM-DD`), keyed by series. */
  days: UsageDay[];
  series: UsageSeries[];
  /** Names the chart for screen readers. */
  title?: string;
  /** Locale for day labels. Defaults to the reader's. */
  locale?: string;
  className?: string;
}

/**
 * Stacked daily bars, 256px tall. Days are rows keyed by series; a missing or
 * null value keeps that series out of the day's tooltip. The top series gets
 * rounded corners.
 */
export function UsageChart({
  days,
  series,
  title = "Usage by day",
  locale,
  className,
}: UsageChartProps) {
  const config = useMemo(() => seriesConfig(series), [series]);
  const usageDay = (date: unknown) =>
    new Date(`${String(date)}T00:00:00Z`).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return (
    <ChartContainer
      data-variant="usage"
      className={cn("sprout-chart-usage", className)}
      config={config}
    >
      <BarChart
        data={days}
        accessibilityLayer
        title={title}
        barCategoryGap="20%"
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={usageDay}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          width={40}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={tooltipCursor}
          content={<ChartTooltipContent labelFormatter={usageDay} />}
        />
        {series.map((item, index) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            stackId="usage"
            fill={chartColor(item.key)}
            radius={index === series.length - 1 ? [3, 3, 0, 0] : 0}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

export interface CategoryChartProps {
  /** One row per category, keyed by `category` and by each series key. */
  rows: Record<string, number | string>[];
  /** The row key whose value names each group of bars. */
  category: string;
  series: UsageSeries[];
  /** Names the chart for screen readers. */
  title?: string;
  className?: string;
}

/** Side-by-side bars per category with a legend in series order, 288px tall. */
export function CategoryChart({
  rows,
  category,
  series,
  title,
  className,
}: CategoryChartProps) {
  const config = useMemo(() => seriesConfig(series), [series]);
  const name =
    title ?? `${series.map((item) => item.label).join(", ")} by ${category}`;
  return (
    <ChartContainer
      data-variant="category"
      className={cn("sprout-chart-category", className)}
      config={config}
    >
      <BarChart
        data={rows}
        accessibilityLayer
        title={name}
        barCategoryGap="24%"
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={category}
          tickLine={false}
          axisLine={false}
          minTickGap={16}
        />
        <YAxis
          width={40}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={tooltipCursor}
          content={<ChartTooltipContent />}
        />
        <ChartLegend itemSorter={null} content={<ChartLegendContent />} />
        {series.map((item) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            fill={chartColor(item.key)}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
