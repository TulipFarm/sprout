import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import {
  AreaTrendChart,
  CategoryChart,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  ComboChart,
  DonutChart,
  GaugeChart,
  HeatmapChart,
  RadarScoreChart,
  SankeyChart,
  ScatterPlotChart,
  Sparkline,
  StepFunnelChart,
  TimelineChart,
  TreemapChart,
  TrendChart,
  UsageChart,
  WaterfallChart,
  chartColor,
  chartIndicatorNames,
  chartShade,
  type ChartConfig,
  type UsageSeries,
} from '../packages/sprout/src/components/chart.js';
import { dayLabel, foldParts } from '../packages/sprout/src/internal/chart-kit.js';
import * as sprout from '../packages/sprout/src/index.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../packages/sprout/src/styles/chart.css');

const series: UsageSeries[] = [
  { key: 'tasks', label: 'Tasks', color: 'var(--sprout-chart-1)' },
  { key: 'notes', label: 'Notes', color: 'var(--sprout-chart-2)' },
];
const config: ChartConfig = {
  tasks: { label: 'Tasks', color: 'var(--sprout-chart-1)' },
  notes: { label: 'Notes', color: 'var(--sprout-chart-2)' },
};
const payload = [
  {
    graphicalItemId: 'tasks',
    name: 'tasks',
    dataKey: 'tasks',
    value: 1200,
    color: 'var(--sprout-chart-1)',
  },
  {
    graphicalItemId: 'notes',
    name: 'notes',
    dataKey: 'notes',
    value: 3,
    color: 'var(--sprout-chart-2)',
  },
];
const one = [payload[0]!];

const inChart = (node: React.ReactNode, chartConfig = config) =>
  renderToString(
    <ChartContainer config={chartConfig}>
      <div>{node}</div>
    </ChartContainer>,
  );

describe('Chart', () => {
  it('is exported from the package root and its subpath', () => {
    for (const name of [
      'CategoryChart',
      'ChartContainer',
      'ChartLegend',
      'ChartLegendContent',
      'ChartStyle',
      'ChartTooltip',
      'ChartTooltipContent',
      'UsageChart',
      'chartColor',
      'chartIndicatorNames',
      'chartShade',
      'TrendChart',
      'AreaTrendChart',
      'ComboChart',
      'DonutChart',
      'Sparkline',
      'GaugeChart',
      'StepFunnelChart',
      'WaterfallChart',
      'HeatmapChart',
      'TimelineChart',
      'ScatterPlotChart',
      'TreemapChart',
      'SankeyChart',
      'RadarScoreChart',
    ])
      expect(sprout).toHaveProperty(name);
    const manifest = JSON.parse(read('../packages/sprout/package.json'));
    expect(manifest.exports['./chart']).toEqual({
      types: './dist/components/chart.d.ts',
      import: './dist/components/chart.js',
    });
    expect(manifest.dependencies.recharts).toBe('3.8.0');
    const index = read('../packages/sprout/src/styles/index.css');
    expect(index).toContain('@import "./chart.css";');
    for (let step = 1; step <= 10; step++)
      expect(index).toContain(`--color-sprout-chart-${step}: var(--sprout-chart-${step});`);
    expect(chartIndicatorNames).toEqual(['dot', 'line', 'dashed']);
    expect(ChartLegend).toBeTruthy();
    expect(ChartTooltip).toBeTypeOf('function');
  });

  it('defines a light and dark palette and honors reduced motion data', () => {
    expect(css).toMatch(/:root,\s*\.light \{\s*--sprout-red: #e11d48;/);
    expect(css).toMatch(/\.dark \{\s*--sprout-red: #f0506e;/);
    expect(css).toContain('--sprout-chart-10: var(--sprout-tan);');
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).toContain('.recharts-surface:focus-visible');
    expect(css).toContain('forced-colors: active');
  });

  it('writes namespaced color variables, with dark values for themes', () => {
    expect(renderToString(<ChartStyle id="chart-a" config={{ x: { label: 'X' } }} />)).toBe('');
    const plain = renderToString(<ChartStyle id="chart-a" config={config} />);
    expect(plain).toContain('[data-chart="chart-a"]');
    expect(plain).toContain('--sprout-chart-color-tasks: var(--sprout-chart-1);');
    expect(plain).not.toContain('.dark');
    const themed = renderToString(
      <ChartStyle
        id="chart-b"
        config={{
          'agent runs': {
            label: 'Agent runs',
            theme: { light: '#111', dark: '#eee' },
          },
        }}
      />,
    );
    expect(themed).toContain('--sprout-chart-color-agent_runs: #111;');
    expect(themed).toContain('.dark [data-chart="chart-b"]');
    expect(themed).toContain('--sprout-chart-color-agent_runs: #eee;');
    expect(themed).toContain(':root:not(.light):not(.dark)');
    expect(chartColor('agent runs')).toBe('var(--sprout-chart-color-agent_runs)');
  });

  it('renders a container slot with its style and a 16:9 default', () => {
    const html = renderToString(
      <ChartContainer id="usage" config={config} className="extra">
        <div>child</div>
      </ChartContainer>,
    );
    expect(html).toContain('data-slot="chart"');
    expect(html).toContain('data-chart="chart-usage"');
    expect(html).toContain('class="sprout-chart extra"');
    expect(html).toContain('--sprout-chart-color-notes');
    expect(css).toMatch(/\.sprout-chart \{[^}]*aspect-ratio: 16 \/ 9;/);
  });

  it('requires a ChartContainer for tooltip and legend content', () => {
    expect(() => renderToString(<ChartTooltipContent active payload={one} />)).toThrow(
      'useChart must be used within a <ChartContainer />',
    );
  });

  it('renders tooltip rows with config labels and localized values', () => {
    const html = inChart(<ChartTooltipContent active label="Meadow" payload={payload} />);
    expect(html).toContain('data-slot="chart-tooltip"');
    expect(html).toContain('data-indicator="dot"');
    expect(html).toContain('class="sprout-chart-tooltip-label">Meadow</div>');
    expect(html.match(/data-slot="chart-tooltip-item"/g)).toHaveLength(2);
    expect(html).toContain('<span>Tasks</span>');
    expect(html).toContain('<span>Notes</span>');
    expect(html).toContain('>1,200</span>');
    expect(html).toContain('--sprout-chart-indicator:var(--sprout-chart-1)');
    expect(inChart(<ChartTooltipContent payload={payload} />)).not.toContain('chart-tooltip');
    expect(inChart(<ChartTooltipContent active payload={[]} />)).not.toContain('chart-tooltip');
  });

  it('nests the label for one line or dashed row, not for dots', () => {
    for (const indicator of chartIndicatorNames) {
      const html = inChart(<ChartTooltipContent active label="Meadow" indicator={indicator} payload={one} />);
      expect(html).toContain(`data-indicator="${indicator}"`);
      const nested = html.includes('data-nested');
      expect(nested).toBe(indicator !== 'dot');
      expect(html.match(/Meadow/g)).toHaveLength(1);
    }
  });

  it('supports hideLabel, hideIndicator, formatters, keys, color, and icons', () => {
    expect(inChart(<ChartTooltipContent active hideLabel label="Meadow" payload={payload} />)).not.toContain('Meadow');
    expect(inChart(<ChartTooltipContent active hideIndicator payload={payload} />)).not.toContain(
      'chart-tooltip-indicator',
    );
    expect(
      inChart(
        <ChartTooltipContent
          active
          label="2026-10-13"
          labelClassName="day"
          labelFormatter={() => 'Oct 13'}
          payload={payload}
        />,
      ),
    ).toContain('class="sprout-chart-tooltip-label day">Oct 13</div>');
    expect(
      inChart(
        <ChartTooltipContent active payload={payload} formatter={(value, name) => <b>{`${name}=${value}`}</b>} />,
      ),
    ).toContain('<b>tasks=1200</b>');
    expect(inChart(<ChartTooltipContent active color="red" payload={one} />)).toContain('--sprout-chart-indicator:red');
    const keyed = inChart(
      <ChartTooltipContent
        active
        labelKey="tasks"
        nameKey="kind"
        payload={[{ ...payload[0]!, payload: { kind: 'notes' } }]}
      />,
    );
    expect(keyed).toContain('class="sprout-chart-tooltip-label">Tasks</div>');
    expect(keyed).toContain('<span>Notes</span>');
    const Icon = () => <svg data-icon="tasks" />;
    const withIcon = inChart(<ChartTooltipContent active payload={one} />, {
      tasks: { label: 'Tasks', color: 'red', icon: Icon },
    });
    expect(withIcon).toContain('data-icon="tasks"');
    expect(withIcon).not.toContain('chart-tooltip-indicator');
  });

  it('omits null values and none-type rows', () => {
    const html = inChart(
      <ChartTooltipContent
        active
        payload={[
          { ...payload[0]!, value: null as unknown as number },
          { ...payload[1]!, type: 'none' as const },
        ]}
      />,
    );
    expect(html).toContain('<span>Tasks</span>');
    expect(html).not.toContain('sprout-chart-tooltip-value');
    expect(html).not.toContain('Notes');
  });

  it('renders legend swatches, icons, and top alignment', () => {
    const items = [
      { value: 'Tasks', dataKey: 'tasks', color: 'var(--sprout-chart-1)' },
      { value: 'Notes', dataKey: 'notes', color: 'var(--sprout-chart-2)' },
    ];
    const html = inChart(<ChartLegendContent payload={items} />);
    expect(html).toContain('data-slot="chart-legend"');
    expect(html).toContain('data-align="bottom"');
    expect(html.match(/data-slot="chart-legend-item"/g)).toHaveLength(2);
    expect(html).toContain('background-color:var(--sprout-chart-2)');
    expect(inChart(<ChartLegendContent verticalAlign="top" payload={items} />)).toContain('data-align="top"');
    expect(inChart(<ChartLegendContent payload={[]} />)).not.toContain('chart-legend');
    const Icon = () => <svg data-icon="tasks" />;
    const iconConfig = { ...config, tasks: { label: 'Tasks', icon: Icon } };
    expect(inChart(<ChartLegendContent payload={items} />, iconConfig)).toContain('data-icon="tasks"');
    expect(inChart(<ChartLegendContent hideIcon payload={items} />, iconConfig)).not.toContain('data-icon');
  });

  it('renders UsageChart and CategoryChart with their sizes and names', () => {
    const usage = renderToString(
      <UsageChart
        locale="en-US"
        days={[
          { date: '2026-10-10', tasks: 4, notes: 3 },
          { date: '2026-10-13', tasks: 8, notes: null },
        ]}
        series={series}
      />,
    );
    expect(usage).toContain('data-variant="usage"');
    expect(usage).toContain('sprout-chart sprout-chart-usage');
    expect(usage).toContain('--sprout-chart-color-tasks: var(--sprout-chart-1);');
    expect(css).toMatch(/\.sprout-chart-usage \{\s*height: 16rem;/);
    const category = renderToString(
      <CategoryChart
        rows={[{ project: 'Meadow', tasks: 12, notes: 4 }]}
        category="project"
        series={series}
        className="tall"
      />,
    );
    expect(category).toContain('data-variant="category"');
    expect(category).toContain('sprout-chart sprout-chart-category tall');
    expect(css).toMatch(/\.sprout-chart-category,[^{]*\{\s*height: 18rem;/);
  });

  it('folds parts past five into one muted rest', () => {
    const rows = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((name, index) => ({
      name,
      count: index + 1,
    }));
    const parts = foldParts([...rows, { name: 'zero', count: 0 }], 'name', 'count');
    expect(parts.map(part => part.name)).toEqual(['g', 'f', 'e', 'd', 'c', '2 more']);
    expect(parts[5]).toEqual({
      name: '2 more',
      value: 3,
      fill: 'var(--sprout-muted)',
    });
    expect(parts[0]!.fill).toBe('var(--sprout-chart-1)');
    expect(foldParts(rows.slice(0, 2), 'name', 'count')).toHaveLength(2);
    expect(chartShade('red', 2)).toBe('color-mix(in oklab, red 40%, var(--sprout-surface))');
  });

  it('labels days from strings, times, and the Date ticks of a time axis', () => {
    const time = Date.UTC(2026, 9, 3);
    for (const value of ['2026-10-03', time, new Date(time)]) expect(dayLabel(value, 'en-US')).toBe('Oct 3');
  });

  it('renders every ready chart with its variant and name', () => {
    const rows = [
      { month: 'Jan', tasks: 4, notes: 2 },
      { month: 'Feb', tasks: 6, notes: -1 },
    ];
    const charts: [string, React.ReactElement][] = [
      ['trend', <TrendChart rows={rows} category="month" series={series} />],
      ['area', <AreaTrendChart rows={rows} category="month" series={series} stack="percent" />],
      ['combo', <ComboChart rows={rows} category="month" series={series} />],
      ['donut', <DonutChart rows={rows} category="month" value="tasks" />],
      ['pie', <DonutChart rows={rows} category="month" value="tasks" variant="pie" />],
      ['sparkline', <Sparkline values={[1, 3, 2]} title="Tasks" />],
      ['funnel', <StepFunnelChart rows={rows} category="month" value="tasks" />],
      ['waterfall', <WaterfallChart rows={rows} category="month" value="tasks" />],
      [
        'timeline',
        <TimelineChart
          rows={[{ task: 'Build', from: '2026-10-01', to: '2026-10-09' }]}
          category="task"
          start="from"
          end="to"
        />,
      ],
      ['scatter', <ScatterPlotChart series={[{ ...series[0]!, rows: [{ x: 1, y: 2 }] }]} x="x" y="y" />],
      ['treemap', <TreemapChart rows={rows} category="month" value="tasks" />],
      [
        'sankey',
        <SankeyChart
          nodes={[{ name: 'In' }, { name: 'Out' }]}
          links={[{ source: 0, target: 1, value: 3 }]}
          title="Leads"
        />,
      ],
      ['radar', <RadarScoreChart rows={rows} category="month" series={series} />],
    ];
    for (const [variant, chart] of charts) expect(renderToString(chart)).toContain(`data-variant="${variant}"`);
    expect(renderToString(<TreemapChart rows={rows} category="month" value="tasks" />)).toContain(
      'role="img" aria-label="tasks by month"',
    );
    const gauge = renderToString(<GaugeChart value={130} max={200} title="Quota" />);
    expect(gauge).toContain('role="meter"');
    expect(gauge).toContain('aria-valuenow="130"');
    expect(gauge).toContain('aria-valuetext="65%"');
    expect(renderToString(<GaugeChart value={300} max={200} title="Quota" />)).toContain('aria-valuenow="200"');
  });

  it('renders the heatmap as a real table with five shades', () => {
    const html = renderToString(
      <HeatmapChart
        rows={[
          { day: 'Mon', hour: '9h', orders: 0 },
          { day: 'Mon', hour: '10h', orders: 10 },
          { day: 'Tue', hour: '9h', orders: 4 },
        ]}
        x="hour"
        y="day"
        value="orders"
      />,
    );
    expect(html).toContain('data-variant="heatmap"');
    expect(html).toContain('<caption');
    expect(html).toContain('orders by day and hour');
    expect(html.match(/scope="col"/g)).toHaveLength(2);
    expect(html.match(/scope="row"/g)).toHaveLength(2);
    expect(html).toContain('data-tip="Mon · 10h: 10"');
    // A missing cell counts as zero.
    expect(html).toContain('data-tip="Tue · 10h: 0"');
    expect(html).toContain('background-color:var(--sprout-secondary)');
    expect(html).toContain('var(--sprout-chart-1) 100%');
    expect(html).toContain('var(--sprout-chart-1) 40%');
  });
});
