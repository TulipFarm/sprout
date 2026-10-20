'use client';

import {
  createContext,
  useContext,
  useId,
  useMemo,
  type ComponentProps,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  Legend,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  type BarShapeProps,
  type DefaultLegendContentProps,
  type DefaultTooltipContentProps,
  type TooltipValueType,
} from 'recharts';
import { cn } from './classes.js';

/** Theme names a `ChartConfig` entry can color, and the selector each one uses. */
const THEMES = { light: '', dark: '.dark' } as const;

const INITIAL_DIMENSION = { width: 320, height: 200 } as const;

export const chartIndicatorNames = ['dot', 'line', 'dashed'] as const;
export type ChartIndicator = (typeof chartIndicatorNames)[number];

export type ChartConfig = Record<
  string,
  {
    label?: ReactNode;
    icon?: ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> })
>;

const cssKey = (key: string) => key.replace(/[^\w-]/g, '_');

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
  if (!context) throw new Error('useChart must be used within a <ChartContainer />');
  return context;
}

export type ChartContainerProps = ComponentProps<'div'> & {
  config: ChartConfig;
  children: ComponentProps<typeof ResponsiveContainer>['children'];
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
      <div data-slot="chart" data-chart={chartId} className={cn('sprout-chart', className)} {...props}>
        <ChartStyle id={chartId} config={config} />
        <ResponsiveContainer initialDimension={initialDimension}>{children}</ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

/**
 * Writes `--sprout-chart-color-<key>` for every colored config entry, with a
 * dark value for entries that pass `theme`. `ChartContainer` renders it.
 */
export function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, item]) => item.theme ?? item.color);
  if (!colorConfig.length) return null;
  const rules = (theme: keyof typeof THEMES) =>
    colorConfig
      .map(([key, item]) => {
        const color = item.theme?.[theme] ?? item.color;
        return color ? `  --sprout-chart-color-${cssKey(key)}: ${color};` : null;
      })
      .filter(Boolean)
      .join('\n');
  const scope = `[data-chart="${cssKey(id)}"]`;
  const themed = colorConfig.some(([, item]) => item.theme);
  const css = [
    `${scope} {\n${rules('light')}\n}`,
    themed ? `${THEMES.dark} ${scope} {\n${rules('dark')}\n}` : '',
    themed
      ? `@media (prefers-color-scheme: dark) {\n:root:not(.light):not(.dark) ${scope} {\n${rules('dark')}\n}\n}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
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
  ComponentProps<'div'> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: ChartIndicator;
    nameKey?: string;
    labelKey?: string;
    /** Formats each row's number, for example as currency. */
    valueFormatter?: ValueFormatter;
  } & Omit<DefaultTooltipContentProps<TooltipValueType, TooltipNameType>, 'accessibilityLayer'>;

/**
 * The tooltip card: a label, then one row per series with its indicator,
 * config label, and value. Recharts passes `active`, `payload`, and `label`.
 */
export function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
  valueFormatter = formatNumber,
}: ChartTooltipContentProps) {
  const { config } = useChart();

  const tooltipLabel = useMemo(() => {
    if (hideLabel || !payload?.length) return null;
    const [item] = payload;
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? 'value'}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value = !labelKey && typeof label === 'string' ? (config[label]?.label ?? label) : itemConfig?.label;
    if (labelFormatter)
      return <div className={cn('sprout-chart-tooltip-label', labelClassName)}>{labelFormatter(value, payload)}</div>;
    if (!value) return null;
    return <div className={cn('sprout-chart-tooltip-label', labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

  if (!active || !payload?.length) return null;

  const nestLabel = payload.length === 1 && indicator !== 'dot';

  return (
    <div data-slot="chart-tooltip" data-indicator={indicator} className={cn('sprout-chart-tooltip', className)}>
      {!nestLabel ? tooltipLabel : null}
      <div className="sprout-chart-tooltip-items">
        {payload
          .filter(item => item.type !== 'none')
          .map((item, index) => {
            const key = `${nameKey ?? item.name ?? item.dataKey ?? 'value'}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color ?? (item.payload as { fill?: string } | undefined)?.fill ?? item.color;
            return (
              <div key={index} data-slot="chart-tooltip-item" className="sprout-chart-tooltip-item">
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
                              '--sprout-chart-indicator': indicatorColor,
                            } as CSSProperties
                          }
                        />
                      )
                    )}
                    <div className="sprout-chart-tooltip-row" data-nested={nestLabel || undefined}>
                      <div className="sprout-chart-tooltip-name">
                        {nestLabel ? tooltipLabel : null}
                        <span>{itemConfig?.label ?? item.name}</span>
                      </div>
                      {item.value != null && (
                        <span className="sprout-chart-tooltip-value">
                          {typeof item.value === 'number' ? valueFormatter(item.value) : String(item.value)}
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

export type ChartLegendContentProps = ComponentProps<'div'> & {
  hideIcon?: boolean;
  nameKey?: string;
} & DefaultLegendContentProps;

/** A centered row of swatches and config labels, one per series. */
export function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = 'bottom',
  nameKey,
}: ChartLegendContentProps) {
  const { config } = useChart();
  if (!payload?.length) return null;
  return (
    <div
      data-slot="chart-legend"
      data-align={verticalAlign === 'top' ? 'top' : 'bottom'}
      className={cn('sprout-chart-legend', className)}
    >
      {payload
        .filter(item => item.type !== 'none')
        .map((item, index) => {
          const key = `${nameKey ?? item.dataKey ?? 'value'}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          return (
            <div key={index} data-slot="chart-legend-item" className="sprout-chart-legend-item">
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

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const inner =
    'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null
      ? (payload.payload as Record<string, unknown>)
      : undefined;
  const outer = payload as Record<string, unknown>;
  let configLabelKey = key;
  if (typeof outer[key] === 'string') configLabelKey = outer[key];
  else if (inner && typeof inner[key] === 'string') configLabelKey = inner[key];
  return configLabelKey in config ? config[configLabelKey] : config[key];
}

/** One series: its data key, legend and tooltip label, and color. */
export type ChartSeries = { key: string; label: string; color: string };
export type UsageSeries = ChartSeries;

/** One data row: a category or label key plus a number per series key. */
export type ChartRow = Record<string, number | string | null | undefined>;

/** Turns a number into the text an axis tick or tooltip shows. */
export type ValueFormatter = (value: number) => string;

export const formatNumber: ValueFormatter = value => value.toLocaleString();

/** The five chart colors, in order. */
export const chartPalette = [1, 2, 3, 4, 5].map(step => `var(--sprout-chart-${step})`);

/** The color for parts past the fifth, folded into one "N more" part. */
export const chartOtherColor = 'var(--sprout-muted)';

/** The palette color for a part, or the muted color past the fifth. */
export const partColor = (index: number) => chartPalette[index] ?? chartOtherColor;

/**
 * One of `steps` shades of `color`, mixed with the surface so it reads in
 * light and dark. Step 1 is lightest; the last step is `color` itself.
 */
export const chartShade = (color: string, step: number, steps = 5) =>
  `color-mix(in oklab, ${color} ${Math.round((step / steps) * 100)}%, var(--sprout-surface))`;

export type ChartPart = { name: string; value: number; fill: string };

/**
 * Sorts rows by `value`, keeps the top `limit` as colored parts, and folds the
 * rest into one muted "N more" part.
 */
export function foldParts(rows: ChartRow[], category: string, value: string, limit = chartPalette.length): ChartPart[] {
  const parts = rows
    .map(row => ({
      name: String(row[category] ?? ''),
      value: Number(row[value]) || 0,
    }))
    .filter(part => part.value > 0)
    .sort((a, b) => b.value - a.value);
  const kept = parts.slice(0, limit);
  const rest = parts.slice(kept.length);
  const colored = kept.map((part, index) => ({
    ...part,
    fill: partColor(index),
  }));
  if (!rest.length) return colored;
  return [
    ...colored,
    {
      name: `${rest.length} more`,
      value: rest.reduce((sum, part) => sum + part.value, 0),
      fill: chartOtherColor,
    },
  ];
}

/** A config entry per part, so the tooltip and legend show part names. */
export const partConfig = (parts: ChartPart[]): ChartConfig =>
  Object.fromEntries(parts.map(part => [part.name, { label: part.name, color: part.fill }]));

/** Shared props for every ready chart. */
export interface ReadyChartProps {
  /** Names the chart for screen readers. */
  title?: string;
  /** Formats axis ticks and tooltip values, for example as currency. */
  valueFormatter?: ValueFormatter;
  className?: string;
}

export const seriesConfig = (series: ChartSeries[]): ChartConfig =>
  Object.fromEntries(series.map(item => [item.key, { label: item.label, color: item.color }]));

export const tooltipCursor = { fill: 'var(--sprout-hover)' };

/** Axis props every ready chart shares: no tick marks, no axis line. */
export const quietAxis = { tickLine: false, axisLine: false } as const;

/** How series pile up: side by side, stacked, or stacked to 100%. */
export type ChartStack = 'none' | 'stacked' | 'percent';

export const stackOffset = (stack: ChartStack) => (stack === 'percent' ? ('expand' as const) : undefined);

export const formatPercent: ValueFormatter = value => `${Math.round(value * 100)}%`;

/** A short day label, like "Oct 17", for a `YYYY-MM-DD` string or a time. */
export const dayLabel = (value: unknown, locale?: string) =>
  new Date(
    typeof value === 'number' || value instanceof Date ? value : `${String(value)}T00:00:00Z`,
  ).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

/**
 * Legend content listing every config entry, for charts whose marks are not
 * one series each. Pass it as `<ChartLegend content={configLegend(config)} />`.
 */
export const configLegend = (config: ChartConfig) =>
  function ConfigLegend() {
    return (
      <ChartLegendContent
        payload={Object.keys(config).map(key => ({
          value: key,
          dataKey: key,
          color: chartColor(key),
        }))}
      />
    );
  };

/** A bar shape that takes its color from the row's `fill`. */
export const rowFillShape = (props: BarShapeProps) => (
  <Rectangle {...props} fill={(props.payload as { fill: string }).fill} />
);
