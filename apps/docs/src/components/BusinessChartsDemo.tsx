import type { ReactNode } from 'react';
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
  Sparkline,
  StepFunnelChart,
  TimelineChart,
  TreemapChart,
  TrendChart,
  WaterfallChart,
  type ChartSeries,
} from '@tulipfarm/sprout/chart';
import '../styles/chart-demo.css';

const usd = (value: number) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: Math.abs(value) >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(value) >= 10_000 ? 1 : 0,
  });
const percent = (value: number) => `${value}%`;

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const revenue = months.map((month, index) => ({
  month,
  subscriptions: [42, 46, 51, 55, 61, 68][index]! * 1000,
  services: [18, 17, 21, 19, 24, 23][index]! * 1000,
  growth: [4.1, 6.8, 9.2, 7.4, 10.6, 9.8][index]!,
}));

const revenueSeries: ChartSeries[] = [
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    color: 'var(--sprout-chart-1)',
  },
  { key: 'services', label: 'Services', color: 'var(--sprout-chart-2)' },
];

const regions = [
  { region: 'North America', profit: 42_000 },
  { region: 'EMEA', profit: 18_500 },
  { region: 'APAC', profit: -6_200 },
  { region: 'LATAM', profit: 3_100 },
];

const traffic = [
  { source: 'Organic search', visitors: 18_400 },
  { source: 'Direct', visitors: 9_200 },
  { source: 'Referral', visitors: 5_600 },
  { source: 'Paid search', visitors: 4_100 },
  { source: 'Email', visitors: 2_300 },
  { source: 'Social', visitors: 1_200 },
  { source: 'Partners', visitors: 600 },
];

const funnel = [
  { step: 'Visited site', people: 24_000 },
  { step: 'Started trial', people: 6_100 },
  { step: 'Activated', people: 3_400 },
  { step: 'Paid', people: 1_150 },
];

const bridge = [
  { step: 'Q2 ARR', change: 1_200_000 },
  { step: 'New', change: 310_000 },
  { step: 'Expansion', change: 140_000 },
  { step: 'Contraction', change: -60_000 },
  { step: 'Churn', change: -95_000 },
  { step: 'Q3 ARR' },
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = Array.from({ length: 12 }, (_, index) => `${index * 2}h`);
const activity = days.flatMap((day, row) =>
  hours.map((hour, column) => ({
    day,
    hour,
    orders:
      row > 4
        ? ((column * 3 + row) % 7) + 1
        : Math.round(Math.max(0, 14 - Math.abs(column - 6) * 2.4) + ((row + column) % 4)),
  })),
);

const plan = [
  { task: 'Research', start: '2026-09-01', end: '2026-09-12', team: 'product' },
  { task: 'Design', start: '2026-09-08', end: '2026-09-26', team: 'design' },
  { task: 'Build API', start: '2026-09-21', end: '2026-10-17', team: 'eng' },
  { task: 'Build UI', start: '2026-09-28', end: '2026-10-24', team: 'eng' },
  { task: 'Beta', start: '2026-10-19', end: '2026-11-06', team: 'product' },
  { task: 'Launch', start: '2026-11-06', end: '2026-11-10', team: 'design' },
];
const teams: ChartSeries[] = [
  { key: 'product', label: 'Product', color: 'var(--sprout-chart-2)' },
  { key: 'design', label: 'Design', color: 'var(--sprout-chart-4)' },
  { key: 'eng', label: 'Engineering', color: 'var(--sprout-chart-1)' },
];

const deals = (offset: number) =>
  Array.from({ length: 14 }, (_, index) => ({
    days: 8 + ((index * 17 + offset) % 70),
    size: 4_000 + ((index * 37 + offset * 11) % 46) * 1_000,
    seats: 5 + ((index * 13 + offset) % 40),
  }));

const spend = [
  { team: 'Engineering', spend: 412_000 },
  { team: 'Sales', spend: 268_000 },
  { team: 'Marketing', spend: 190_000 },
  { team: 'Support', spend: 96_000 },
  { team: 'Design', spend: 74_000 },
  { team: 'Legal', spend: 31_000 },
  { team: 'Finance', spend: 28_000 },
];

const leads = {
  nodes: [
    { name: 'Website' },
    { name: 'Events' },
    { name: 'Outbound' },
    { name: 'Qualified' },
    { name: 'Lost' },
    { name: 'Won' },
  ],
  links: [
    { source: 0, target: 3, value: 420 },
    { source: 0, target: 4, value: 610 },
    { source: 1, target: 3, value: 180 },
    { source: 1, target: 4, value: 90 },
    { source: 2, target: 3, value: 150 },
    { source: 2, target: 4, value: 260 },
    { source: 3, target: 5, value: 310 },
    { source: 3, target: 4, value: 440 },
  ],
};

const scores = [
  { area: 'Speed', ours: 86, rival: 70 },
  { area: 'Price', ours: 64, rival: 82 },
  { area: 'Support', ours: 91, rival: 60 },
  { area: 'Features', ours: 78, rival: 85 },
  { area: 'Ease of use', ours: 88, rival: 66 },
];

function Tile({ title, wide = false, children }: { title: string; wide?: boolean; children: ReactNode }) {
  return (
    <section className="chart-demo-tile" data-wide={wide || undefined} aria-label={title}>
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function Stat({ label, value, change, values }: { label: string; value: string; change: string; values: number[] }) {
  return (
    <div className="chart-demo-stat">
      <p className="chart-demo-eyebrow">{label}</p>
      <p className="chart-demo-stat-value">
        {value} <span>{change}</span>
      </p>
      <Sparkline values={values} title={`${label}, last 12 weeks`} area />
    </div>
  );
}

export function BusinessCharts() {
  return (
    <div className="chart-demo-gallery" data-testid="chart-gallery">
      <Tile title="Sparkline" wide>
        <div className="chart-demo-stats">
          <Stat label="MRR" value="$91.2k" change="+9.8%" values={[60, 62, 61, 66, 70, 69, 74, 78, 80, 84, 88, 91]} />
          <Stat
            label="Active users"
            value="12,480"
            change="+3.1%"
            values={[11, 11.4, 11.2, 11.6, 11.5, 11.9, 12, 11.8, 12.1, 12.3, 12.2, 12.5]}
          />
          <Stat
            label="Churn"
            value="1.9%"
            change="−0.4 pt"
            values={[2.6, 2.5, 2.6, 2.4, 2.3, 2.3, 2.2, 2.1, 2.1, 2, 1.9, 1.9]}
          />
        </div>
      </Tile>
      <Tile title="TrendChart">
        <TrendChart
          rows={revenue}
          category="month"
          series={revenueSeries}
          valueFormatter={usd}
          title="Revenue by month"
        />
      </Tile>
      <Tile title="AreaTrendChart · stacked">
        <AreaTrendChart
          rows={revenue}
          category="month"
          series={revenueSeries}
          stack="stacked"
          valueFormatter={usd}
          title="Revenue by month, stacked"
        />
      </Tile>
      <Tile title="ComboChart">
        <ComboChart
          rows={revenue}
          category="month"
          series={[
            ...revenueSeries,
            {
              key: 'growth',
              label: 'Growth',
              color: 'var(--sprout-chart-4)',
              kind: 'line',
              axis: 'right',
            },
          ]}
          stacked
          valueFormatter={usd}
          rightValueFormatter={percent}
          title="Revenue and growth by month"
        />
      </Tile>
      <Tile title="CategoryChart · horizontal, negative">
        <CategoryChart
          rows={regions}
          category="region"
          series={[{ key: 'profit', label: 'Profit', color: 'var(--sprout-chart-2)' }]}
          horizontal
          valueFormatter={usd}
          title="Profit by region"
        />
      </Tile>
      <Tile title="CategoryChart · percent">
        <CategoryChart
          rows={revenue}
          category="month"
          series={revenueSeries}
          stack="percent"
          valueFormatter={usd}
          title="Revenue mix by month"
        />
      </Tile>
      <Tile title="DonutChart">
        <DonutChart
          rows={traffic}
          category="source"
          value="visitors"
          totalLabel="Visitors"
          title="Visitors by source"
        />
      </Tile>
      <Tile title="DonutChart · pie">
        <DonutChart
          rows={spend}
          category="team"
          value="spend"
          variant="pie"
          valueFormatter={usd}
          title="Spend by team"
        />
      </Tile>
      <Tile title="GaugeChart">
        <div className="chart-demo-gauges">
          <GaugeChart value={72} label="of Q3 quota" title="Q3 quota attainment" />
          <GaugeChart
            value={418}
            max={500}
            label="NPS responses"
            title="NPS responses"
            color="var(--sprout-chart-2)"
            valueFormatter={value => value.toLocaleString('en-US')}
          />
        </div>
      </Tile>
      <Tile title="StepFunnelChart">
        <StepFunnelChart rows={funnel} category="step" value="people" title="Trial conversion" />
      </Tile>
      <Tile title="WaterfallChart" wide>
        <WaterfallChart
          rows={bridge}
          category="step"
          value="change"
          totals={['Q2 ARR', 'Q3 ARR']}
          valueFormatter={usd}
          title="ARR bridge, Q2 to Q3"
        />
      </Tile>
      <Tile title="HeatmapChart" wide>
        <HeatmapChart rows={activity} x="hour" y="day" value="orders" title="Orders by weekday and hour" />
      </Tile>
      <Tile title="TimelineChart" wide>
        <TimelineChart
          rows={plan}
          category="task"
          start="start"
          end="end"
          seriesKey="team"
          series={teams}
          locale="en-US"
          title="Launch plan"
        />
      </Tile>
      <Tile title="ScatterPlotChart · bubbles">
        <ScatterPlotChart
          series={[
            {
              key: 'inbound',
              label: 'Inbound',
              color: 'var(--sprout-chart-1)',
              rows: deals(0),
            },
            {
              key: 'outbound',
              label: 'Outbound',
              color: 'var(--sprout-chart-2)',
              rows: deals(5),
            },
          ]}
          x="days"
          y="size"
          size="seats"
          labels={{ x: 'Days to close', y: 'Deal size', size: 'Seats' }}
          valueFormatter={usd}
          title="Deal size by days to close"
        />
      </Tile>
      <Tile title="TreemapChart">
        <TreemapChart rows={spend} category="team" value="spend" valueFormatter={usd} title="Spend by team" />
      </Tile>
      <Tile title="SankeyChart">
        <SankeyChart nodes={leads.nodes} links={leads.links} title="Where leads go" />
      </Tile>
      <Tile title="RadarScoreChart">
        <RadarScoreChart
          rows={scores}
          category="area"
          series={[
            { key: 'ours', label: 'Sprout', color: 'var(--sprout-chart-1)' },
            { key: 'rival', label: 'Rival', color: 'var(--sprout-chart-5)' },
          ]}
          title="Scores against a rival"
        />
      </Tile>
    </div>
  );
}
