import { useState } from 'react';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  TimelineChart,
  TimelineWindowBar,
  timelineRange,
  type TimelineChartProps,
  type TimelineZoom,
} from '../../packages/sprout/src/components/timeline.js';

export const timelineRows = [
  { id: 'plan', name: 'Plan the launch', start: '2026-09-24', end: '2026-10-02', team: 'design' },
  { id: 'build', name: 'Build pricing page', start: '2026-10-05', end: '2026-10-16', team: 'build' },
  { id: 'review', name: 'Legal review', start: '2026-10-14', end: '2026-10-12', team: 'design' },
  { id: 'launch', name: 'Launch day', start: '2026-10-20', end: '', team: 'build' },
  { id: 'support', name: 'Support rota', start: '2026-10-26', end: '2026-11-20', team: 'build' },
];

export function TimelineFixture(props: Partial<TimelineChartProps>) {
  const [view, setView] = useState<{ zoom: TimelineZoom; from: string }>({ zoom: 'month', from: '2026-10-01' });
  return (
    <div data-testid="timeline" style={{ display: 'grid', gap: 16, padding: 16 }}>
      <TimelineWindowBar {...view} today="2026-10-14" locale="en-GB" onChange={setView} />
      <TimelineChart
        rows={timelineRows}
        category="name"
        start="start"
        end="end"
        rowKey="id"
        seriesKey="team"
        series={[
          { key: 'design', label: 'Design' },
          { key: 'build', label: 'Build' },
        ]}
        title="Launch tasks"
        locale="en-GB"
        window={timelineRange(view.zoom, view.from)}
        today="2026-10-14"
        onRowOpen={() => {}}
        renderActions={row => (
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${String(row.name)}`}>
            ✎
          </Button>
        )}
        undated={{ count: 2, field: 'Start date' }}
        {...props}
      />
    </div>
  );
}
