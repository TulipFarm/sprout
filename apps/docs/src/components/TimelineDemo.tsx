import { useState } from 'react';
import { Button } from '@tulipfarm/sprout/button';
import { TimelineChart, TimelineWindowBar, timelineRange, type TimelineZoom } from '@tulipfarm/sprout/timeline';
import type { ChartSeries } from '@tulipfarm/sprout/chart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tulipfarm/sprout/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@tulipfarm/sprout/toggle-group';
import { Edit } from 'reicon-react/icons/Edit';
import { MoreH } from 'reicon-react/icons/MoreH';
import '../styles/chart-demo.css';

type Task = { id: string; title: string; team: string; start: string; end: string };
type Preview = 'rows' | 'loading' | 'empty' | 'error';

const today = '2026-10-14';
const series: ChartSeries[] = [
  { key: 'design', label: 'Design', color: 'var(--sprout-chart-1)' },
  { key: 'build', label: 'Build', color: 'var(--sprout-chart-2)' },
  { key: 'launch', label: 'Launch', color: 'var(--sprout-chart-3)' },
];
const firstTasks: Task[] = [
  { id: 't1', title: 'Research interviews', team: 'design', start: '2026-09-21', end: '2026-10-06' },
  { id: 't2', title: 'Pricing page', team: 'build', start: '2026-10-05', end: '2026-10-16' },
  { id: 't3', title: 'Legal review', team: 'design', start: '2026-10-15', end: '2026-10-12' },
  { id: 't4', title: 'Design QA', team: 'design', start: '2026-10-12', end: '2026-10-14' },
  { id: 't5', title: 'Launch day', team: 'launch', start: '2026-10-21', end: '' },
  { id: 't6', title: 'Support rota', team: 'launch', start: '2026-10-26', end: '2026-11-20' },
  { id: 't7', title: 'Brand refresh', team: 'design', start: '2026-09-14', end: '2026-12-04' },
  { id: 't8', title: 'Partner emails', team: 'launch', start: '', end: '' },
  { id: 't9', title: 'Press kit', team: 'launch', start: '', end: '2026-10-30' },
];

const shift = (day: string, days: number) => {
  if (!day) return day;
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export function RecordTimelineDemo() {
  const [view, setView] = useState<{ zoom: TimelineZoom; from: string }>({ zoom: 'month', from: today });
  const [tasks, setTasks] = useState(firstTasks);
  const [preview, setPreview] = useState<Preview>('rows');
  const [said, setSaid] = useState('Open a row, or use its actions.');

  const undated = tasks.filter(task => !task.start).length;
  const rows = preview === 'rows' ? tasks : [];
  const status = preview === 'loading' ? 'loading' : preview === 'error' ? 'error' : 'ready';

  const moveLater = (task: Task) => {
    setTasks(all =>
      all.map(item => (item.id === task.id ? { ...item, start: shift(item.start, 7), end: shift(item.end, 7) } : item)),
    );
    setSaid(`Moved “${task.title}” a week later.`);
  };

  return (
    <section className="chart-demo-card" aria-label="Record timeline" data-testid="record-timeline">
      <header>
        <h3>Launch plan</h3>
        <p>
          Tasks from a table, drawn in a one-month window. Today is pinned to 14 Oct 2026 so the demo stays the same.
          Tab to the list, then use the arrow keys and Enter.
        </p>
      </header>
      <div className="chart-demo-card-body">
        <div className="chart-demo-toolbar">
          <span className="chart-demo-eyebrow">Preview</span>
          <ToggleGroup
            aria-label="Preview state"
            variant="outline"
            size="sm"
            spacing={0}
            value={[preview]}
            onValueChange={value => {
              if (value[0]) setPreview(value[0] as Preview);
            }}
          >
            <ToggleGroupItem value="rows">Rows</ToggleGroupItem>
            <ToggleGroupItem value="loading">Loading</ToggleGroupItem>
            <ToggleGroupItem value="empty">Empty</ToggleGroupItem>
            <ToggleGroupItem value="error">Error</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <TimelineWindowBar {...view} today={today} locale="en-US" onChange={setView} />
        <TimelineChart
          rows={rows}
          rowKey="id"
          category="title"
          start="start"
          end="end"
          seriesKey="team"
          series={series}
          title="Launch plan tasks"
          locale="en-US"
          window={timelineRange(view.zoom, view.from)}
          today={today}
          status={status}
          onRetry={() => setPreview('rows')}
          notice={
            preview === 'rows' ? (
              <p className="chart-demo-timeline-notice">
                Showing tasks for all teams, by <strong>Start date</strong> to <strong>Due date</strong>.
              </p>
            ) : null
          }
          undated={
            preview === 'rows' && undated
              ? {
                  count: undated,
                  field: 'Start date',
                  action: (
                    <Button variant="link" size="sm" onClick={() => setSaid('Showing tasks without a start date.')}>
                      Show them
                    </Button>
                  ),
                }
              : undefined
          }
          onRowOpen={task => setSaid(`Opened “${task.title}”.`)}
          renderActions={task => (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${task.title}`}
                onClick={() => setSaid(`Editing “${task.title}”.`)}
              >
                <Edit aria-hidden="true" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon-sm" aria-label={`More actions for ${task.title}`} />}
                >
                  <MoreH aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSaid(`Opened “${task.title}”.`)}>Open</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => moveLater(task)}>Move a week later</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setTasks(all => all.filter(item => item.id !== task.id));
                      setSaid(`Deleted “${task.title}”.`);
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        />
        <p className="chart-demo-muted chart-demo-timeline-said" role="status">
          {said}
        </p>
      </div>
    </section>
  );
}
