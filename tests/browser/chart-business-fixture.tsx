import {
  ComboChart,
  DonutChart,
  GaugeChart,
  HeatmapChart,
  RadarScoreChart,
  SankeyChart,
  ScatterPlotChart,
  Sparkline,
  StepFunnelChart,
  TreemapChart,
  TrendChart,
  WaterfallChart,
  type ChartSeries,
} from '../../packages/sprout/src/components/chart.js';
import { TimelineChart } from '../../packages/sprout/src/components/timeline.js';

const series: ChartSeries[] = [
  { key: 'new', label: 'New', color: 'var(--sprout-chart-1)' },
  { key: 'renewals', label: 'Renewals', color: 'var(--sprout-chart-2)' },
];
const months = ['Jan', 'Feb', 'Mar', 'Apr'].map((month, index) => ({
  month,
  new: 10 + index * 3,
  renewals: 6 + (index % 2) * 4,
  growth: 2 + index,
}));
const traffic = ['Search', 'Direct', 'Email', 'Social', 'Ads', 'Events', 'Other'].map((source, index) => ({
  source,
  visitors: 700 - index * 90,
}));

export function BusinessFixture() {
  return (
    <div data-testid="business" style={{ display: 'grid', gap: 24, padding: 16, maxWidth: 720 }}>
      <TrendChart rows={months} category="month" series={series} title="Bookings" />
      <ComboChart
        rows={months}
        category="month"
        series={[
          ...series,
          {
            key: 'growth',
            label: 'Growth',
            color: 'var(--sprout-chart-4)',
            kind: 'line',
            axis: 'right',
          },
        ]}
        stacked
        title="Bookings and growth"
      />
      <DonutChart rows={traffic} category="source" value="visitors" totalLabel="Visitors" title="Visitors by source" />
      <div style={{ display: 'flex', gap: 16 }}>
        <GaugeChart value={72} label="of quota" title="Quota" />
        <Sparkline values={[3, 5, 4, 7, 8]} title="MRR" area />
      </div>
      <StepFunnelChart
        rows={[
          { step: 'Visited', people: 1000 },
          { step: 'Signed up', people: 300 },
          { step: 'Paid', people: 60 },
        ]}
        category="step"
        value="people"
      />
      <WaterfallChart
        rows={[
          { step: 'Start', change: 100 },
          { step: 'Won', change: 40 },
          { step: 'Lost', change: -25 },
          { step: 'End' },
        ]}
        category="step"
        value="change"
        totals={['Start', 'End']}
      />
      <HeatmapChart
        rows={['Mon', 'Tue'].flatMap((day, row) =>
          ['9h', '12h', '15h'].map((hour, column) => ({
            day,
            hour,
            orders: row * 3 + column,
          })),
        )}
        x="hour"
        y="day"
        value="orders"
      />
      <TimelineChart
        rows={[
          {
            task: 'Design',
            start: '2026-09-01',
            end: '2026-09-20',
            team: 'new',
          },
          {
            task: 'Build',
            start: '2026-09-15',
            end: '2026-10-30',
            team: 'renewals',
          },
        ]}
        category="task"
        start="start"
        end="end"
        seriesKey="team"
        series={series}
        locale="en-US"
        title="Plan"
      />
      <ScatterPlotChart
        series={[
          {
            ...series[0]!,
            rows: [
              { x: 1, y: 4 },
              { x: 3, y: 9 },
            ],
          },
          { ...series[1]!, rows: [{ x: 2, y: 6 }] },
        ]}
        x="x"
        y="y"
      />
      <TreemapChart rows={traffic} category="source" value="visitors" />
      <SankeyChart
        nodes={[{ name: 'Leads' }, { name: 'Won' }, { name: 'Lost' }]}
        links={[
          { source: 0, target: 1, value: 30 },
          { source: 0, target: 2, value: 70 },
        ]}
        title="Lead outcomes"
      />
      <RadarScoreChart
        rows={['Speed', 'Price', 'Support'].map((area, index) => ({
          area,
          new: 60 + index * 10,
          renewals: 80 - index * 10,
        }))}
        category="area"
        series={series}
      />
    </div>
  );
}
