'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts';
import { cn } from '../classes.js';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  chartColor,
  configLegend,
  dayLabel,
  formatNumber,
  formatPercent,
  quietAxis,
  rowFillShape,
  seriesConfig,
  stackOffset,
  tooltipCursor,
  type ChartConfig,
  type ChartRow,
  type ChartSeries,
  type ChartStack,
  type ReadyChartProps,
  type UsageSeries,
} from '../chart-kit.js';

export type UsageDay = { date: string } & Record<string, number | string | null>;

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
export function UsageChart({ days, series, title = 'Usage by day', locale, className }: UsageChartProps) {
  const config = useMemo(() => seriesConfig(series), [series]);
  const usageDay = (date: unknown) => dayLabel(date, locale);
  return (
    <ChartContainer data-variant="usage" className={cn('sprout-chart-usage', className)} config={config}>
      <BarChart data={days} accessibilityLayer title={title} barCategoryGap="20%">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickFormatter={usageDay} {...quietAxis} minTickGap={24} />
        <YAxis width={40} {...quietAxis} allowDecimals={false} />
        <ChartTooltip cursor={tooltipCursor} content={<ChartTooltipContent labelFormatter={usageDay} />} />
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

export interface CategoryChartProps extends ReadyChartProps {
  /** One row per category, keyed by `category` and by each series key. */
  rows: ChartRow[];
  /** The row key whose value names each group of bars. */
  category: string;
  series: ChartSeries[];
  /** Bars grow sideways, one row per category. Good for long names. */
  horizontal?: boolean;
  /** `stacked` piles series in one bar; `percent` stacks them to 100%. */
  stack?: ChartStack;
}

const hasNegative = (rows: ChartRow[], series: ChartSeries[]) =>
  rows.some(row => series.some(item => Number(row[item.key]) < 0));

/**
 * Bars per category with a legend in series order, 288px tall. Negative
 * values hang below a zero line, for profit and loss.
 */
export function CategoryChart({
  rows,
  category,
  series,
  horizontal = false,
  stack = 'none',
  title,
  valueFormatter = formatNumber,
  className,
}: CategoryChartProps) {
  const config = useMemo(() => seriesConfig(series), [series]);
  const name = title ?? `${series.map(item => item.label).join(', ')} by ${category}`;
  const stacked = stack !== 'none';
  const end = horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0];
  const tick = stack === 'percent' ? formatPercent : valueFormatter;
  const categoryAxis = { dataKey: category, ...quietAxis };
  const valueAxis = { ...quietAxis, tickFormatter: tick };
  return (
    <ChartContainer data-variant="category" className={cn('sprout-chart-category', className)} config={config}>
      <BarChart
        data={rows}
        accessibilityLayer
        title={name}
        layout={horizontal ? 'vertical' : 'horizontal'}
        stackOffset={stackOffset(stack)}
        barCategoryGap="24%"
      >
        <CartesianGrid vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" {...valueAxis} />
            <YAxis type="category" width="auto" {...categoryAxis} interval={0} />
          </>
        ) : (
          <>
            <XAxis {...categoryAxis} minTickGap={16} />
            <YAxis width="auto" {...valueAxis} allowDecimals={stack === 'percent'} />
          </>
        )}
        {hasNegative(rows, series) ? (
          <ReferenceLine {...(horizontal ? { x: 0 } : { y: 0 })} stroke="var(--sprout-border-strong)" />
        ) : null}
        <ChartTooltip cursor={tooltipCursor} content={<ChartTooltipContent valueFormatter={valueFormatter} />} />
        <ChartLegend itemSorter={null} content={<ChartLegendContent />} />
        {series.map((item, index) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            stackId={stacked ? 'category' : undefined}
            fill={chartColor(item.key)}
            radius={!stacked || index === series.length - 1 ? (end as [number, number, number, number]) : 0}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

export interface WaterfallChartProps extends ReadyChartProps {
  /** One row per step. `value` is the change that step adds or takes away. */
  rows: ChartRow[];
  /** The row key whose value names each step. */
  category: string;
  /** The row key holding each step's change. */
  value: string;
  /**
   * Steps drawn as a full bar from zero, like a start or end balance. A total
   * with a value starts the running total there; one without shows the
   * running total so far.
   */
  totals?: string[];
  /** Legend labels for rises, falls, and totals. */
  labels?: { increase?: string; decrease?: string; total?: string };
}

type WaterfallKind = 'increase' | 'decrease' | 'total';

const waterfallColors: Record<WaterfallKind, string> = {
  increase: 'var(--sprout-green)',
  decrease: 'var(--sprout-red)',
  total: 'var(--sprout-blue)',
};

/**
 * A running total, step by step: green bars rise, red bars fall, and blue
 * totals stand on zero. 288px tall.
 */
export function WaterfallChart({
  rows,
  category,
  value,
  totals = [],
  labels,
  title = 'Running total by step',
  valueFormatter = formatNumber,
  className,
}: WaterfallChartProps) {
  const steps = useMemo(() => {
    let running = 0;
    return rows.map(row => {
      const name = String(row[category] ?? '');
      const raw = row[value];
      const change = Number(raw) || 0;
      if (totals.includes(name)) {
        if (raw != null && raw !== '') running = change;
        return {
          name,
          kind: 'total' as const,
          range: [0, running],
          amount: running,
          fill: waterfallColors.total,
        };
      }
      const from = running;
      running += change;
      const kind: WaterfallKind = change < 0 ? 'decrease' : 'increase';
      return {
        name,
        kind,
        range: [from, running],
        amount: change,
        fill: waterfallColors[kind],
      };
    });
  }, [rows, category, value, totals]);
  const config = useMemo<ChartConfig>(
    () => ({
      increase: {
        label: labels?.increase ?? 'Increase',
        color: waterfallColors.increase,
      },
      decrease: {
        label: labels?.decrease ?? 'Decrease',
        color: waterfallColors.decrease,
      },
      total: { label: labels?.total ?? 'Total', color: waterfallColors.total },
    }),
    [labels],
  );
  return (
    <ChartContainer data-variant="waterfall" className={cn('sprout-chart-waterfall', className)} config={config}>
      <BarChart data={steps} accessibilityLayer title={title} barCategoryGap="16%">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="name" {...quietAxis} minTickGap={8} />
        <YAxis width="auto" {...quietAxis} tickFormatter={valueFormatter} />
        <ReferenceLine y={0} stroke="var(--sprout-border-strong)" />
        <ChartLegend content={configLegend(config)} />
        <ChartTooltip
          cursor={tooltipCursor}
          content={props => (
            <ChartTooltipContent
              active={props.active}
              label={props.label}
              nameKey="kind"
              valueFormatter={valueFormatter}
              payload={props.payload?.map(item => ({
                ...item,
                value: (item.payload as { amount: number }).amount,
              }))}
            />
          )}
        />
        <Bar dataKey="range" radius={3} shape={rowFillShape} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}
