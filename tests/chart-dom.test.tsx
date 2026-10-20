// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AreaTrendChart,
  CategoryChart,
  ComboChart,
  DonutChart,
  GaugeChart,
  HeatmapChart,
  RadarScoreChart,
  SankeyChart,
  ScatterPlotChart,
  StepFunnelChart,
  TreemapChart,
  TrendChart,
  WaterfallChart,
  type ChartSeries,
} from '../packages/sprout/src/components/chart.js';
import { TimelineChart } from '../packages/sprout/src/components/timeline.js';
import { BusinessFixture } from './browser/chart-business-fixture.js';

// Recharts draws nothing until its box is measured, and jsdom measures 0.
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [
            {
              target,
              contentRect: { width: 640, height: 320 },
            } as unknown as ResizeObserverEntry,
          ],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(640);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(320);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const series: ChartSeries[] = [
  { key: 'tasks', label: 'Tasks', color: 'var(--sprout-chart-1)' },
  { key: 'notes', label: 'Notes', color: 'var(--sprout-chart-2)' },
];
const draw = (chart: React.ReactElement) => {
  cleanup();
  return render(chart).container;
};

const rows = [
  { month: 'Jan', tasks: 4, notes: 2 },
  { month: 'Feb', tasks: 6, notes: -1 },
  { month: 'Mar', tasks: 0, notes: 3 },
];

describe('drawn charts', () => {
  it('draws every business chart in the fixture', () => {
    const { container } = render(<BusinessFixture />);
    const text = container.textContent ?? '';
    expect(text).toContain('72%');
    expect(text).toContain('2 more');
    expect(container.querySelectorAll('[data-variant="donut"] .recharts-sector').length).toBe(6);
    const anchors = [...container.querySelectorAll('.sprout-chart-sankey-label')].map(label =>
      label.getAttribute('text-anchor'),
    );
    expect(anchors).toEqual(['start', 'end', 'end']);
    expect(container.querySelectorAll('.sprout-chart-treemap-label').length).toBeGreaterThan(0);
  });

  it('puts the total in the donut hole and none in a pie', () => {
    const donut = render(<DonutChart rows={rows} category="month" value="tasks" totalLabel="Tasks" />);
    expect(donut.container.querySelector('.sprout-chart-center')?.textContent).toBe('10Tasks');
    cleanup();
    const pie = render(<DonutChart rows={rows} category="month" value="tasks" variant="pie" />);
    expect(pie.container.querySelector('.sprout-chart-center')).toBeNull();
  });

  it('draws a single part and no parts without failing', () => {
    const one = render(<DonutChart rows={rows.slice(0, 1)} category="month" value="tasks" />);
    expect(one.container.querySelectorAll('.recharts-sector').length).toBe(1);
    cleanup();
    const none = render(<TreemapChart rows={[]} category="month" value="tasks" />);
    expect(none.container.querySelector('[role="img"]')).not.toBeNull();
  });

  it('formats the gauge with a custom formatter and clamps it', () => {
    const { container } = render(
      <GaugeChart value={640} max={500} title="Responses" valueFormatter={value => `${value} answers`} />,
    );
    const meter = container.querySelector('[role="meter"]')!;
    expect(meter.getAttribute('aria-valuenow')).toBe('500');
    expect(container.textContent).toContain('640 answers');
  });

  it('draws lines, steps, dots, and stacked percent areas', () => {
    const trend = draw(<TrendChart rows={rows} category="month" series={series.slice(0, 1)} curve="step" dots />);
    expect(trend.querySelectorAll('.recharts-line-dot').length).toBe(3);
    const area = draw(
      <AreaTrendChart rows={rows} category="month" series={series} stack="percent" curve="linear" dots />,
    );
    expect(area.querySelectorAll('.recharts-area').length).toBe(2);
    const combo = draw(
      <ComboChart
        rows={rows}
        category="month"
        series={[series[0]!, { ...series[1]!, kind: 'line', axis: 'right' }]}
        categoryFormatter={value => `M:${String(value)}`}
        rightValueFormatter={value => `${value}%`}
      />,
    );
    expect(combo.querySelectorAll('.recharts-line').length).toBe(1);
    expect(combo.textContent).toContain('M:Jan');
  });

  it('draws horizontal, stacked, and percent categories', () => {
    for (const props of [{ horizontal: true }, { stack: 'stacked' as const }, { stack: 'percent' as const }]) {
      const chart = draw(<CategoryChart rows={rows} category="month" series={series} {...props} />);
      expect(chart.querySelectorAll('.recharts-bar-rectangle').length).toBeGreaterThan(0);
    }
  });

  it('draws a waterfall with no totals and a timeline with one series', () => {
    const { container } = render(
      <>
        <WaterfallChart
          rows={rows}
          category="month"
          value="tasks"
          labels={{ increase: 'Up', decrease: 'Down', total: 'Sum' }}
        />
        <TimelineChart
          rows={[
            { task: 'Plan', from: '2026-10-01', to: '2026-10-09' },
            { task: 'Ship', from: '2026-10-09', to: null },
          ]}
          category="task"
          start="from"
          end="to"
        />
      </>,
    );
    expect(container.textContent).toContain('Up');
    expect(container.textContent).toContain('Plan');
  });

  it('shades a heatmap with no data and keeps a zero funnel visible', () => {
    const { container } = render(
      <>
        <HeatmapChart
          rows={[{ day: 'Mon', hour: '9h', orders: 0 }]}
          x="hour"
          y="day"
          value="orders"
          scaleLabels={['Few', 'Many']}
        />
        <StepFunnelChart
          rows={[
            { step: 'Seen', people: 0 },
            { step: 'Paid', people: 0 },
          ]}
          category="step"
          value="people"
        />
      </>,
    );
    expect(container.textContent).toContain('Few');
    expect(container.textContent).toContain('0 · 0%');
  });

  it('sizes bubbles and draws one radar series without a legend', () => {
    const { container } = render(
      <>
        <ScatterPlotChart
          series={[{ ...series[0]!, rows: [{ x: 1, y: 2, seats: 4 }] }]}
          x="x"
          y="y"
          size="seats"
          labels={{ x: 'Days', y: 'Size', size: 'Seats' }}
          xValueFormatter={value => `${value}d`}
        />
        <RadarScoreChart rows={rows} category="month" series={series.slice(0, 1)} />
        <SankeyChart
          nodes={[{ name: 'A' }, { name: 'B' }, { name: 'C' }]}
          links={[
            { source: 0, target: 1, value: 2 },
            { source: 1, target: 2, value: 2 },
          ]}
        />
      </>,
    );
    expect(container.querySelectorAll('.recharts-radar').length).toBe(1);
    expect(container.querySelectorAll('.recharts-legend-wrapper').length).toBe(0);
    expect(container.querySelectorAll('.sprout-chart-sankey-link').length).toBe(2);
  });
});
