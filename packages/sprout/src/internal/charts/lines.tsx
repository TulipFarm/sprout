'use client';

import { useId, useMemo } from 'react';
import { Area, Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { cn } from '../classes.js';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  chartColor,
  formatNumber,
  formatPercent,
  quietAxis,
  valueDomain,
  valueTicks,
  seriesConfig,
  stackOffset,
  tooltipCursor,
  type ChartRow,
  type ChartSeries,
  type ChartStack,
  type ReadyChartProps,
  type ValueFormatter,
} from '../chart-kit.js';

export type TrendCurve = 'smooth' | 'linear' | 'step';

const curveType = {
  smooth: 'monotone',
  linear: 'linear',
  step: 'step',
} as const;

type Mark = 'line' | 'area' | 'bar';

/** A series for `ComboChart`: drawn as bars or a line, on the left or right axis. */
export type ComboSeries = ChartSeries & {
  kind?: 'bar' | 'line';
  axis?: 'left' | 'right';
};

interface SeriesPlotProps extends ReadyChartProps {
  variant: string;
  rows: ChartRow[];
  category: string;
  series: (ChartSeries & { axis?: 'left' | 'right' })[];
  mark: (item: ComboSeries) => Mark;
  curve: TrendCurve;
  dots: boolean;
  stack: ChartStack;
  categoryFormatter?: (value: unknown) => string;
  rightValueFormatter?: ValueFormatter;
  max?: number;
}

function SeriesPlot({
  variant,
  rows,
  category,
  series,
  mark,
  curve,
  dots,
  stack,
  title,
  valueFormatter = formatNumber,
  rightValueFormatter = valueFormatter,
  categoryFormatter,
  max,
  className,
}: SeriesPlotProps) {
  const config = useMemo(() => seriesConfig(series), [series]);
  const gradient = `sprout-area-${useId().replace(/:/g, '')}`;
  const stacked = stack !== 'none';
  const right = series.some(item => item.axis === 'right');
  const anyBar = series.some(item => mark(item) === 'bar');
  const tick = stack === 'percent' ? formatPercent : valueFormatter;
  const format = (key: string) =>
    series.find(item => item.key === key)?.axis === 'right' ? rightValueFormatter : valueFormatter;
  const name = title ?? `${series.map(item => item.label).join(', ')} by ${category}`;
  const type = curveType[curve];
  return (
    <ChartContainer data-variant={variant} className={cn(`sprout-chart-${variant}`, className)} config={config}>
      <ComposedChart
        data={rows}
        accessibilityLayer
        title={name}
        stackOffset={stackOffset(stack)}
        barCategoryGap="24%"
        margin={{ top: 4, right: right ? 0 : 12, bottom: 0, left: 0 }}
      >
        <defs>
          {series.map(item => (
            <linearGradient key={item.key} id={`${gradient}-${item.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor(item.key)} stopOpacity={0.4} />
              <stop offset="95%" stopColor={chartColor(item.key)} stopOpacity={0.04} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={category} tickFormatter={categoryFormatter} {...quietAxis} minTickGap={16} />
        <YAxis
          yAxisId="left"
          width="auto"
          tickFormatter={tick}
          domain={stack === 'percent' ? undefined : valueDomain(max)}
          ticks={stack === 'percent' ? undefined : valueTicks(max)}
          {...quietAxis}
        />
        {right ? (
          <YAxis yAxisId="right" orientation="right" width="auto" tickFormatter={rightValueFormatter} {...quietAxis} />
        ) : null}
        <ChartTooltip
          cursor={anyBar ? tooltipCursor : true}
          content={props => (
            <ChartTooltipContent
              active={props.active}
              label={props.label}
              indicator={anyBar ? 'dot' : 'line'}
              labelFormatter={
                categoryFormatter
                  ? (_, payload) => categoryFormatter((payload[0]?.payload as ChartRow | undefined)?.[category])
                  : undefined
              }
              payload={props.payload?.map(item => ({
                ...item,
                value: typeof item.value === 'number' ? format(String(item.dataKey))(item.value) : item.value,
              }))}
            />
          )}
        />
        {series.length > 1 ? (
          <ChartLegend verticalAlign="top" itemSorter={null} content={<ChartLegendContent />} />
        ) : null}
        {series.map((item, index) => {
          const color = chartColor(item.key);
          const shared = {
            dataKey: item.key,
            yAxisId: item.axis ?? 'left',
            stackId: stacked ? 'series' : undefined,
            isAnimationActive: false,
          };
          const kind = mark(item);
          if (kind === 'bar')
            return (
              <Bar
                key={item.key}
                {...shared}
                fill={color}
                radius={!stacked || index === series.length - 1 ? [3, 3, 0, 0] : 0}
              />
            );
          if (kind === 'area')
            return (
              <Area
                key={item.key}
                {...shared}
                type={type}
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradient}-${item.key})`}
                dot={dots ? { r: 3, fill: color } : false}
                activeDot={{ r: 4 }}
              />
            );
          return (
            <Line
              key={item.key}
              {...shared}
              type={type}
              stroke={color}
              strokeWidth={2}
              dot={dots ? { r: 3, fill: color } : false}
              activeDot={{ r: 4 }}
            />
          );
        })}
      </ComposedChart>
    </ChartContainer>
  );
}

interface TrendBaseProps extends ReadyChartProps {
  /** One row per point on the x axis, keyed by `category` and each series. */
  rows: ChartRow[];
  /** The row key for the x axis, such as a date or month. */
  category: string;
  series: ChartSeries[];
  /** `smooth` curves, `linear` straight segments, or `step` stairs. */
  curve?: TrendCurve;
  /** Draws a dot at every point. */
  dots?: boolean;
  /** Formats x axis ticks and the tooltip label, for example dates. */
  categoryFormatter?: (value: unknown) => string;
  /** Ends the value axis here, such as 100 for percentages. */
  max?: number;
}

export type TrendChartProps = TrendBaseProps;

/** Lines over time, one per series, 288px tall. A legend shows past one series. */
export function TrendChart({ curve = 'smooth', dots = false, ...props }: TrendChartProps) {
  return <SeriesPlot variant="trend" mark={() => 'line'} curve={curve} dots={dots} stack="none" {...props} />;
}

export interface AreaTrendChartProps extends TrendBaseProps {
  /** `stacked` piles series; `percent` stacks them to 100%. */
  stack?: ChartStack;
}

/**
 * Filled areas over time with a soft gradient, 288px tall. Stack them to show
 * a total, or to 100% to show shares.
 */
export function AreaTrendChart({ curve = 'smooth', dots = false, stack = 'none', ...props }: AreaTrendChartProps) {
  return <SeriesPlot variant="area" mark={() => 'area'} curve={curve} dots={dots} stack={stack} {...props} />;
}

export interface ComboChartProps extends ReadyChartProps {
  /** One row per category, keyed by `category` and each series. */
  rows: ChartRow[];
  category: string;
  /** Bars by default. Set `kind: "line"` and `axis: "right"` for a rate. */
  series: ComboSeries[];
  /** Formats the right axis and its series in the tooltip, such as percent. */
  rightValueFormatter?: ValueFormatter;
  categoryFormatter?: (value: unknown) => string;
  /** Stacks the bar series. */
  stacked?: boolean;
}

/**
 * Bars and lines on one chart, like revenue with its growth rate, 288px tall.
 * Series on `axis: "right"` get their own scale.
 */
export function ComboChart({ stacked = false, ...props }: ComboChartProps) {
  return (
    <SeriesPlot
      variant="combo"
      mark={item => item.kind ?? 'bar'}
      curve="smooth"
      dots
      stack={stacked ? 'stacked' : 'none'}
      {...props}
    />
  );
}

export interface SparklineProps {
  /** The points, oldest first. */
  values: number[];
  /** Names the trend for screen readers, such as "MRR, last 12 weeks". */
  title: string;
  /** Any CSS color. Defaults to `--sprout-chart-1`. */
  color?: string;
  /** Fills under the line. */
  area?: boolean;
  valueFormatter?: ValueFormatter;
  className?: string;
}

/**
 * A tiny trend line for a stat tile, 40px tall and as wide as its box. No
 * axes; hover shows the value.
 */
export function Sparkline({
  values,
  title,
  color = 'var(--sprout-chart-1)',
  area = false,
  valueFormatter = formatNumber,
  className,
}: SparklineProps) {
  const rows = useMemo(() => values.map((value, index) => ({ index, value })), [values]);
  const config = useMemo(() => ({ value: { label: title, color } }), [title, color]);
  const gradient = `sprout-spark-${useId().replace(/:/g, '')}`;
  return (
    <ChartContainer
      data-variant="sparkline"
      className={cn('sprout-chart-sparkline', className)}
      config={config}
      initialDimension={{ width: 120, height: 40 }}
    >
      <ComposedChart data={rows} accessibilityLayer title={title} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColor('value')} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColor('value')} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel indicator="line" valueFormatter={valueFormatter} />}
        />
        <Area
          dataKey="value"
          type="monotone"
          stroke={chartColor('value')}
          strokeWidth={1.5}
          fill={area ? `url(#${gradient})` : 'none'}
          dot={false}
          activeDot={{ r: 3 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
