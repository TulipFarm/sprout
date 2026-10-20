'use client';

import { useMemo, type CSSProperties } from 'react';
import {
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  Sankey,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
  type SankeyLinkProps,
  type SankeyNodeProps,
} from 'recharts';
import { cn } from '../classes.js';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  chartColor,
  chartShade,
  configLegend,
  formatNumber,
  partColor,
  quietAxis,
  seriesConfig,
  type ChartRow,
  type ChartSeries,
  type ReadyChartProps,
  type ValueFormatter,
} from '../chart-kit.js';

const HEAT_STEPS = 5;

export interface HeatmapChartProps extends ReadyChartProps {
  /** One row per cell, keyed by `x`, `y`, and `value`. */
  rows: ChartRow[];
  /** The row key naming each column, such as the hour. */
  x: string;
  /** The row key naming each row, such as the weekday. */
  y: string;
  /** The row key holding each cell's number. */
  value: string;
  /** Any CSS color for the darkest cells. Defaults to `--sprout-chart-1`. */
  color?: string;
  /** Words at each end of the scale. */
  scaleLabels?: [low: string, high: string];
}

/**
 * A grid of cells in five shades of one color, like activity by weekday and
 * hour. Columns and rows keep the order they first appear in `rows`. It is a
 * real table, so screen readers read every value.
 */
export function HeatmapChart({
  rows,
  x,
  y,
  value,
  color = 'var(--sprout-chart-1)',
  scaleLabels = ['Less', 'More'],
  title = `${value} by ${y} and ${x}`,
  valueFormatter = formatNumber,
  className,
}: HeatmapChartProps) {
  const grid = useMemo(() => {
    const columns = [...new Set(rows.map(row => String(row[x])))];
    const lines = [...new Set(rows.map(row => String(row[y])))];
    const cells = new Map(rows.map(row => [`${String(row[y])}\u0000${String(row[x])}`, Number(row[value]) || 0]));
    const max = Math.max(0, ...cells.values());
    return { columns, lines, cells, max };
  }, [rows, x, y, value]);
  const shade = (step: number) => (step === 0 ? 'var(--sprout-secondary)' : chartShade(color, step));
  const step = (amount: number) => (grid.max > 0 && amount > 0 ? Math.ceil((amount / grid.max) * HEAT_STEPS) : 0);
  return (
    <div data-slot="chart" data-variant="heatmap" className={cn('sprout-chart-heatmap', className)}>
      <div className="sprout-chart-heatmap-scroll">
        <table
          className="sprout-chart-heatmap-table"
          style={{ '--sprout-heat-columns': grid.columns.length } as CSSProperties}
        >
          <caption className="sprout-chart-sr-only">{title}</caption>
          <thead>
            <tr>
              <td />
              {grid.columns.map(column => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.lines.map(line => (
              <tr key={line}>
                <th scope="row">{line}</th>
                {grid.columns.map(column => {
                  const amount = grid.cells.get(`${line}\u0000${column}`) ?? 0;
                  const text = valueFormatter(amount);
                  return (
                    <td
                      key={column}
                      data-tip={`${line} · ${column}: ${text}`}
                      style={{ backgroundColor: shade(step(amount)) }}
                    >
                      <span className="sprout-chart-sr-only">{text}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sprout-chart-heatmap-scale" aria-hidden="true">
        <span>{scaleLabels[0]}</span>
        {Array.from({ length: HEAT_STEPS + 1 }, (_, index) => (
          <i key={index} style={{ backgroundColor: shade(index) }} />
        ))}
        <span>{scaleLabels[1]}</span>
      </div>
    </div>
  );
}

/** A series for `ScatterPlotChart`, with its own rows. */
export type ScatterSeries = ChartSeries & { rows: ChartRow[] };

export interface ScatterPlotChartProps extends ReadyChartProps {
  series: ScatterSeries[];
  /** The row key for the x axis. */
  x: string;
  /** The row key for the y axis. */
  y: string;
  /** A row key that sizes each dot, for a bubble chart. */
  size?: string;
  /** Axis names for the tooltip. Default to the keys. */
  labels?: { x?: string; y?: string; size?: string };
  /** Formats x axis ticks. `valueFormatter` formats the y axis. */
  xValueFormatter?: ValueFormatter;
}

/**
 * One dot per row on two number axes, 288px tall, to show how two numbers
 * move together. Pass `size` for bubbles.
 */
export function ScatterPlotChart({
  series,
  x,
  y,
  size,
  labels,
  title,
  valueFormatter = formatNumber,
  xValueFormatter = formatNumber,
  className,
}: ScatterPlotChartProps) {
  const config = useMemo(() => seriesConfig(series), [series]);
  return (
    <ChartContainer data-variant="scatter" className={cn('sprout-chart-scatter', className)} config={config}>
      <ScatterChart
        accessibilityLayer
        title={title ?? `${labels?.y ?? y} by ${labels?.x ?? x}`}
        margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
      >
        <CartesianGrid />
        <XAxis type="number" dataKey={x} name={labels?.x ?? x} tickFormatter={xValueFormatter} {...quietAxis} />
        <YAxis
          type="number"
          dataKey={y}
          name={labels?.y ?? y}
          width="auto"
          tickFormatter={valueFormatter}
          {...quietAxis}
        />
        {size ? (
          <ZAxis type="number" dataKey={size} name={labels?.size ?? size} range={[40, 480]} />
        ) : (
          <ZAxis range={[48, 48]} />
        )}
        <ChartTooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={props => (
            <ChartTooltipContent
              active={props.active}
              hideLabel
              payload={props.payload?.map(item => ({
                ...item,
                value:
                  typeof item.value === 'number'
                    ? (item.dataKey === x ? xValueFormatter : valueFormatter)(item.value)
                    : item.value,
              }))}
            />
          )}
        />
        {series.length > 1 ? <ChartLegend content={configLegend(config)} /> : null}
        {series.map(item => (
          <Scatter
            key={item.key}
            name={item.label}
            data={item.rows}
            fill={chartColor(item.key)}
            fillOpacity={0.8}
            isAnimationActive={false}
          />
        ))}
      </ScatterChart>
    </ChartContainer>
  );
}

export interface SankeyChartProps extends ReadyChartProps {
  /** Every stage, in any order. Links point at them by index. */
  nodes: { name: string }[];
  /** Flows between nodes, by index into `nodes`. */
  links: { source: number; target: number; value: number }[];
}

/**
 * Flows between stages, with band width by value, 320px tall. The first five
 * nodes get chart colors and the rest are muted; each band takes its
 * source's color.
 */
export function SankeyChart({
  nodes,
  links,
  title = 'Flow between stages',
  valueFormatter = formatNumber,
  className,
}: SankeyChartProps) {
  const data = useMemo(() => ({ nodes, links }), [nodes, links]);
  const config = useMemo(
    () => Object.fromEntries(nodes.map((node, index) => [node.name, { label: node.name, color: partColor(index) }])),
    [nodes],
  );
  const node = ({ x, y, width, height, index, payload }: SankeyNodeProps) => {
    // Recharts names a node's outgoing links `targetLinks`.
    const last = !(payload as { targetLinks?: unknown[] }).targetLinks?.length;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} rx={2} fill={partColor(index)} />
        <text
          x={last ? x - 8 : x + width + 8}
          y={y + height / 2}
          textAnchor={last ? 'end' : 'start'}
          dominantBaseline="middle"
          className="sprout-chart-sankey-label"
        >
          {payload.name}
          <tspan className="sprout-chart-sankey-value" dx={6}>
            {valueFormatter(payload.value)}
          </tspan>
        </text>
      </g>
    );
  };
  const link = ({
    sourceX,
    targetX,
    sourceY,
    targetY,
    sourceControlX,
    targetControlX,
    linkWidth,
    payload,
  }: SankeyLinkProps) => {
    const source = nodes.findIndex(item => item.name === (payload.source as { name?: string }).name);
    return (
      <path
        d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        fill="none"
        stroke={partColor(source)}
        strokeOpacity={0.28}
        strokeWidth={linkWidth}
        className="sprout-chart-sankey-link"
      />
    );
  };
  return (
    <ChartContainer
      data-variant="sankey"
      className={cn('sprout-chart-sankey', className)}
      config={config}
      role="img"
      aria-label={title}
    >
      <Sankey
        data={data}
        nodePadding={24}
        nodeWidth={10}
        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        node={node}
        link={link}
      >
        <ChartTooltip content={<ChartTooltipContent hideLabel valueFormatter={valueFormatter} />} />
      </Sankey>
    </ChartContainer>
  );
}

export interface RadarScoreChartProps extends ReadyChartProps {
  /** One row per axis, keyed by `category` and each series. */
  rows: ChartRow[];
  /** The row key naming each axis, such as "Speed" or "Price". */
  category: string;
  series: ChartSeries[];
}

/**
 * Scores on many axes at once, one filled shape per series, 320px tall.
 * Good for comparing two or three options.
 */
export function RadarScoreChart({
  rows,
  category,
  series,
  title,
  valueFormatter = formatNumber,
  className,
}: RadarScoreChartProps) {
  const config = useMemo(() => seriesConfig(series), [series]);
  return (
    <ChartContainer data-variant="radar" className={cn('sprout-chart-radar', className)} config={config}>
      <RadarChart
        data={rows}
        accessibilityLayer
        title={title ?? `${series.map(item => item.label).join(', ')} by ${category}`}
        outerRadius="72%"
      >
        <PolarGrid />
        <PolarAngleAxis dataKey={category} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" valueFormatter={valueFormatter} />} />
        {series.length > 1 ? <ChartLegend itemSorter={null} content={<ChartLegendContent />} /> : null}
        {series.map(item => (
          <Radar
            key={item.key}
            dataKey={item.key}
            stroke={chartColor(item.key)}
            strokeWidth={2}
            fill={chartColor(item.key)}
            fillOpacity={0.18}
            dot={{ r: 3, fillOpacity: 1 }}
            isAnimationActive={false}
          />
        ))}
      </RadarChart>
    </ChartContainer>
  );
}
