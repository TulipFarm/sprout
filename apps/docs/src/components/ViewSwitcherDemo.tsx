import { useState, type ReactNode } from 'react';
import { ChartBar } from 'reicon-react/icons/ChartBar';
import { Grid } from 'reicon-react/icons/Grid';
import { Kanban } from 'reicon-react/icons/Kanban';
import { List } from 'reicon-react/icons/List';
import { Settings } from 'reicon-react/icons/Settings';
import { Button } from '@tulipfarm/sprout/button';
import {
  ViewSwitcher,
  viewSwitcherTabId,
  type ViewSwitcherOption,
  type ViewSwitcherView,
} from '@tulipfarm/sprout/view-switcher';
import '../styles/view-switcher-demo.css';

type ViewId = 'table' | 'list' | 'board' | 'chart' | 'timeline';

// reicon has no gantt glyph, so this one is drawn on its 24px grid with its 1.5 stroke.
function Timeline({ size = 24 }: { size?: number }) {
  const bar = { stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round' } as const;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2.75" width="8" height="4" rx="2" {...bar} />
      <rect x="8" y="10" width="9" height="4" rx="2" {...bar} />
      <rect x="15" y="17.25" width="7" height="4" rx="2" {...bar} />
    </svg>
  );
}

const catalog: Record<ViewId, Omit<ViewSwitcherOption, 'unavailable'>> = {
  table: { id: 'table', label: 'Table', icon: Grid, description: 'Rows and columns. Edit, group and sum.' },
  list: { id: 'list', label: 'List', icon: List, description: 'One item per row for quick reading.' },
  board: { id: 'board', label: 'Board', icon: Kanban, description: 'Cards in lanes, one lane per stage.' },
  chart: { id: 'chart', label: 'Chart', icon: ChartBar, description: 'Totals and counts for each group.' },
  timeline: { id: 'timeline', label: 'Timeline', icon: Timeline, description: 'Rows placed on their dates.' },
};

const order: ViewId[] = ['table', 'list', 'board', 'chart', 'timeline'];

interface Order {
  id: string;
  name: string;
  stage: 'Ordered' | 'Planting' | 'Growing' | 'Ready';
  bulbs: number;
  start: number;
  end: number;
}

const orders: Order[] = [
  { id: 'o1', name: 'Queen of Night tulips', stage: 'Growing', bulbs: 1200, start: 2, end: 9 },
  { id: 'o2', name: 'Apeldoorn tulips', stage: 'Planting', bulbs: 800, start: 5, end: 12 },
  { id: 'o3', name: 'Tête-à-tête daffodils', stage: 'Ordered', bulbs: 450, start: 9, end: 14 },
  { id: 'o4', name: 'Pink Impression tulips', stage: 'Ready', bulbs: 600, start: 0, end: 4 },
  { id: 'o5', name: 'Blue Spike muscari', stage: 'Growing', bulbs: 950, start: 6, end: 11 },
];

const stages: Order['stage'][] = ['Ordered', 'Planting', 'Growing', 'Ready'];

function useViews(initial: ViewId[], closable: (id: ViewId) => boolean) {
  const [ids, setIds] = useState<ViewId[]>(initial);
  const [value, setValue] = useState<ViewId>(initial[0]!);
  const views: ViewSwitcherView[] = ids.map(id => ({ ...catalog[id], closable: closable(id) }));
  return {
    ids,
    value,
    views,
    onValueChange: (id: string) => setValue(id as ViewId),
    onAdd: (id: string) => {
      const view = id as ViewId;
      if (!ids.includes(view)) setIds([...ids, view]);
      setValue(view);
    },
    onClose: (id: string) => {
      const index = ids.indexOf(id as ViewId);
      const next = ids.filter(other => other !== id);
      setIds(next);
      if (id === value) setValue(next[index] ?? next[index - 1] ?? 'table');
    },
  };
}

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="view-switcher-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="view-switcher-demo-card-body">{children}</div>
    </section>
  );
}

function Panel({ id, value }: { id: string; value: ViewId }) {
  return (
    <div
      role="tabpanel"
      id={id}
      aria-labelledby={viewSwitcherTabId(id, value)}
      tabIndex={0}
      className="view-switcher-demo-panel"
    >
      {value === 'table' && <TablePanel />}
      {value === 'list' && <ListPanel />}
      {value === 'board' && <BoardPanel />}
      {value === 'chart' && <ChartPanel />}
      {value === 'timeline' && <TimelinePanel />}
    </div>
  );
}

function TablePanel() {
  return (
    <table className="view-switcher-demo-table">
      <thead>
        <tr>
          <th scope="col">Order</th>
          <th scope="col">Stage</th>
          <th scope="col">Bulbs</th>
        </tr>
      </thead>
      <tbody>
        {orders.map(order => (
          <tr key={order.id}>
            <td>{order.name}</td>
            <td>{order.stage}</td>
            <td>{order.bulbs.toLocaleString('en-US')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ListPanel() {
  return (
    <ul className="view-switcher-demo-list">
      {orders.map(order => (
        <li key={order.id}>
          <strong>{order.name}</strong>
          <span>
            {order.stage} · {order.bulbs.toLocaleString('en-US')} bulbs
          </span>
        </li>
      ))}
    </ul>
  );
}

function BoardPanel() {
  return (
    <div className="view-switcher-demo-board">
      {stages.map(stage => (
        <section key={stage} aria-label={stage}>
          <h4>{stage}</h4>
          <ul>
            {orders
              .filter(order => order.stage === stage)
              .map(order => (
                <li key={order.id}>{order.name}</li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ChartPanel() {
  const most = Math.max(...stages.map(stage => count(stage)));
  return (
    <ul className="view-switcher-demo-chart" aria-label="Bulbs by stage">
      {stages.map((stage, index) => (
        <li key={stage}>
          <span>{stage}</span>
          <span className="view-switcher-demo-chart-track">
            <span
              className="view-switcher-demo-chart-bar"
              style={{
                width: `${(count(stage) / most) * 100}%`,
                background: `var(--sprout-chart-${index + 1})`,
              }}
            />
          </span>
          <span>{count(stage).toLocaleString('en-US')}</span>
        </li>
      ))}
    </ul>
  );
}

function count(stage: Order['stage']) {
  return orders.filter(order => order.stage === stage).reduce((sum, order) => sum + order.bulbs, 0);
}

function TimelinePanel() {
  return (
    <ul className="view-switcher-demo-timeline" aria-label="Orders by week">
      {orders.map(order => (
        <li key={order.id}>
          <span>{order.name}</span>
          <span className="view-switcher-demo-timeline-track">
            <span
              className="view-switcher-demo-timeline-bar"
              style={{
                insetInlineStart: `${(order.start / 14) * 100}%`,
                width: `${((order.end - order.start) / 14) * 100}%`,
              }}
            />
          </span>
          <span>
            Weeks {order.start + 1}–{order.end}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ViewSwitcherPlayground() {
  const state = useViews(['table', 'list', 'board'], id => id !== 'table');
  const options = order.map(id => catalog[id]);
  return (
    <div className="view-switcher-demo">
      <Example
        title="Seed orders"
        description="Choose a tab or use the arrow keys. Add a view from the menu. Hover a tab, or focus it and press Delete, to close it. Table stays."
      >
        <div className="view-switcher-demo-frame">
          <ViewSwitcher
            views={state.views}
            value={state.value}
            onValueChange={state.onValueChange}
            options={options}
            onAdd={state.onAdd}
            onClose={state.onClose}
            panelId="seed-orders"
          />
          <Panel id="seed-orders" value={state.value} />
        </div>
      </Example>
    </div>
  );
}

export function ViewSwitcherUnavailable() {
  const state = useViews(['table', 'list'], id => id !== 'table');
  const options: ViewSwitcherOption[] = order.map(id =>
    id === 'board' ? { ...catalog.board, unavailable: 'Needs a single-select field.' } : catalog[id],
  );
  return (
    <div className="view-switcher-demo">
      <Example
        title="Greenhouse log"
        description="This table has no single-select field, so Board says what it needs and cannot be chosen."
      >
        <div className="view-switcher-demo-frame">
          <ViewSwitcher
            views={state.views}
            value={state.value}
            onValueChange={state.onValueChange}
            options={options}
            onAdd={state.onAdd}
            onClose={state.onClose}
            panelId="greenhouse-log"
            actions={
              <Button variant="ghost" size="icon-sm" aria-label="View settings">
                <Settings size={16} aria-hidden="true" />
              </Button>
            }
          />
          <Panel id="greenhouse-log" value={state.value} />
        </div>
      </Example>
    </div>
  );
}

export function ViewSwitcherNarrow() {
  const state = useViews(order, id => id !== 'table');
  return (
    <div className="view-switcher-demo">
      <Example
        title="Many views in a narrow space"
        description="The tabs scroll sideways with faded edges. The active tab stays in view and Add view stays put."
      >
        <div className="view-switcher-demo-frame view-switcher-demo-narrow">
          <ViewSwitcher
            views={state.views}
            value={state.value}
            onValueChange={state.onValueChange}
            options={order.map(id => catalog[id])}
            onAdd={state.onAdd}
            onClose={state.onClose}
            label="Narrow views"
            panelId="narrow-orders"
          />
          <Panel id="narrow-orders" value={state.value} />
        </div>
      </Example>
    </div>
  );
}
