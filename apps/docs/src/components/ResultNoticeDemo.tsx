import { useState, type ReactNode } from 'react';
import { Button } from '@tulipfarm/sprout/button';
import { CategoryChart, type ChartSeries } from '@tulipfarm/sprout/chart';
import { TimelineChart } from '@tulipfarm/sprout/timeline';
import { ResultNotice } from '@tulipfarm/sprout/result-notice';
import '../styles/result-notice-demo.css';

function Example({
  title,
  description,
  testId,
  children,
}: {
  title: string;
  description: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <section className="result-notice-demo-card" aria-label={title} data-testid={testId}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="result-notice-demo-card-body">{children}</div>
    </section>
  );
}

function OpenInTable({ onOpen }: { onOpen: () => void }) {
  return (
    <Button size="sm" variant="ghost" onClick={onOpen}>
      Open in Table
    </Button>
  );
}

const plantings = [
  { row: 'Tomatoes, bed 4', start: '2026-10-01', end: '2026-10-09', crew: 'north' },
  { row: 'Basil, bed 2', start: '2026-10-03', end: '2026-10-12', crew: 'south' },
  { row: 'Kale, bed 7', start: '2026-10-06', end: '2026-10-16', crew: 'north' },
  { row: 'Garlic, bed 1', start: '2026-10-10', end: '2026-10-20', crew: 'south' },
];
const crews: ChartSeries[] = [
  { key: 'north', label: 'North crew', color: 'var(--sprout-chart-1)' },
  { key: 'south', label: 'South crew', color: 'var(--sprout-chart-2)' },
];

const varieties = [
  { variety: 'Cherry', rows: 412 },
  { variety: 'Roma', rows: 388 },
  { variety: 'Beefsteak', rows: 301 },
  { variety: 'Heirloom', rows: 264 },
  { variety: 'Plum', rows: 198 },
];
const varietySeries: ChartSeries[] = [{ key: 'rows', label: 'Rows', color: 'var(--sprout-chart-1)' }];

export default function ResultNoticeDemo() {
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <div className="result-notice-demo">
      <Example
        title="Timeline rows"
        description="The timeline reads one page of 100 rows. The notice sits inside the view, above the bars."
        testId="result-notice-timeline"
      >
        <div className="result-notice-demo-view">
          <ResultNotice
            shown={100}
            total={2431}
            noun="rows"
            action={<OpenInTable onOpen={() => setOpened('rows')} />}
          />
          <TimelineChart
            rows={plantings}
            category="row"
            start="start"
            end="end"
            seriesKey="crew"
            series={crews}
            locale="en-US"
            title="Planting schedule"
          />
        </div>
      </Example>
      <Example
        title="Chart groups, capped count"
        description="The chart reads 100 groups. The reported count is capped at 10000+, so the notice says 10,000+."
        testId="result-notice-chart"
      >
        <div className="result-notice-demo-view">
          <ResultNotice
            shown={100}
            total="10000+"
            noun="groups"
            action={<OpenInTable onOpen={() => setOpened('groups')} />}
          />
          <CategoryChart rows={varieties} category="variety" series={varietySeries} title="Rows by variety" />
        </div>
      </Example>
      <Example
        title="Without an action, and narrow"
        description="Leave out the action when there is nowhere to go. In a narrow view the action wraps under the message."
        testId="result-notice-narrow"
      >
        <ResultNotice shown={100} total={318} noun="groups" />
        <div className="result-notice-demo-narrow">
          <ResultNotice
            shown={100}
            total={84210}
            noun="rows"
            action={<OpenInTable onOpen={() => setOpened('rows')} />}
          />
        </div>
      </Example>
      <p className="result-notice-demo-log" aria-live="polite">
        {opened ? `Table would open with all ${opened}.` : 'Choose Open in Table to see the action fire.'}
      </p>
    </div>
  );
}
