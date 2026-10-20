import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { AddCircle } from 'reicon-react/icons/AddCircle';
import { ArrowUpRight } from 'reicon-react/icons/ArrowUpRight';
import { BranchDown } from 'reicon-react/icons/BranchDown';
import { Calendar } from 'reicon-react/icons/Calendar';
import { ChartBar } from 'reicon-react/icons/ChartBar';
import { Code } from 'reicon-react/icons/Code';
import { Database } from 'reicon-react/icons/Database';
import { Edit2 } from 'reicon-react/icons/Edit2';
import { File } from 'reicon-react/icons/File';
import { FileText } from 'reicon-react/icons/FileText';
import { Globe } from 'reicon-react/icons/Globe';
import { Inbox } from 'reicon-react/icons/Inbox';
import { Refresh } from 'reicon-react/icons/Refresh';
import { Tasks } from 'reicon-react/icons/Tasks';
import { Badge } from '@tulipfarm/sprout/badge';
import { Button } from '@tulipfarm/sprout/button';
import {
  CanvasFrame,
  CanvasPanel,
  CanvasSection,
  CanvasToggle,
  ChatSplit,
  canvasSplitMinWidth,
  type CanvasTab,
} from '@tulipfarm/sprout/canvas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tulipfarm/sprout/card';
import { ResultAppActions, ResultCard, type ResultApp, type ResultCardKind } from '@tulipfarm/sprout/result-card';
import { Skeleton } from '@tulipfarm/sprout/skeleton';
import { StatePanel } from '@tulipfarm/sprout/state-panel';
import { Switch } from '@tulipfarm/sprout/switch';
import DocsSelect from './DocsSelect';
import '../styles/canvas-demo.css';

type Icon = ComponentType<{ size?: number }>;

function Frame({
  title,
  note,
  controls,
  children,
  id,
}: {
  title: string;
  note?: string;
  controls?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="canvas-demo-frame" aria-label={title} data-recipe={id}>
      <div className="canvas-demo-bar">
        <div className="canvas-demo-bar-text">
          <span className="canvas-demo-bar-title">{title}</span>
          {note && <span className="canvas-demo-note">{note}</span>}
        </div>
        {controls && <div className="canvas-demo-controls">{controls}</div>}
      </div>
      {children}
    </section>
  );
}

/** Opens a demo's canvas on load only where it fits beside the chat. */
function useOpenWhenWide() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!window.matchMedia('(max-width: 767px)').matches) setOpen(true);
  }, []);
  return [open, setOpen] as const;
}

function AppHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="canvas-demo-app-header">
      <h3 className="canvas-demo-app-title">{title}</h3>
      {children}
    </div>
  );
}

function UserMessage({ children }: { children: ReactNode }) {
  return <p className="canvas-demo-bubble">{children}</p>;
}

function Conversation({ label = 'Conversation', children }: { label?: string; children: ReactNode }) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className="canvas-demo-conversation">
      <div className="canvas-demo-thread">{children}</div>
    </div>
  );
}

/* ---------- Sample results, shaped like TulipFarm canvas items ---------- */

const customers = [
  {
    change: 'added',
    name: 'Ada Park',
    email: 'ada@northwind.co',
    company: 'Northwind',
    status: 'Prospect',
  },
  {
    change: 'added',
    name: 'Rui Costa',
    email: 'rui@lumen.studio',
    company: 'Lumen Studio',
    status: 'Active',
  },
  {
    change: 'updated',
    name: 'Mia Chen',
    email: 'mia@harbor.io',
    company: 'Harbor',
    status: 'Inactive',
  },
] as const;

function ChangedRowsResult() {
  const [busy, setBusy] = useState(false);
  return (
    <CanvasSection
      title="Customers"
      actions={
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Refresh rows"
            aria-label="Refresh rows"
            disabled={busy}
            aria-busy={busy}
            onClick={() => {
              setBusy(true);
              window.setTimeout(() => setBusy(false), 700);
            }}
          >
            <Refresh size={16} aria-hidden="true" />
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<a href="#records" />}>
            <ArrowUpRight size={14} aria-hidden="true" />
            Open current table
          </Button>
        </>
      }
    >
      <ul aria-label="Changes" className="canvas-demo-badges">
        <li>
          <Badge variant="success">
            <AddCircle size={12} aria-hidden="true" />2 added
          </Badge>
        </li>
        <li>
          <Badge variant="info">
            <Edit2 size={12} aria-hidden="true" />1 updated
          </Badge>
        </li>
      </ul>
      <div className="canvas-demo-table-wrap" role="region" aria-label="Customers rows" tabIndex={0}>
        <table className="canvas-demo-table">
          <thead>
            <tr>
              <th>
                <span className="canvas-demo-sr-only">Change</span>
              </th>
              <th>Name</th>
              <th>Email</th>
              <th>Company</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(row => (
              <tr key={row.email}>
                <td>
                  <Badge variant={row.change === 'added' ? 'success' : 'info'}>
                    {row.change === 'added' ? 'Added' : 'Updated'}
                  </Badge>
                </td>
                <td>{row.name}</td>
                <td>{row.email}</td>
                <td>{row.company}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CanvasSection>
  );
}

const events = [
  { time: 'Mon 9:30 AM', title: 'Launch stand-up', where: 'Google Meet' },
  {
    time: 'Tue 2:00 PM',
    title: 'Pricing review with finance',
    where: 'Room 4B',
  },
  {
    time: 'Thu 11:00 AM',
    title: 'Press briefing dry run',
    where: 'Google Meet',
  },
];

function CalendarResult({ empty = false }: { empty?: boolean }) {
  return (
    <CanvasSection
      title="Google Calendar"
      meta="Read Oct 18, 10:04 AM · Saved snapshot, not a live calendar"
      actions={
        <Button variant="outline" size="sm" nativeButton={false} render={<a href="#calendar" />}>
          Open live calendar
        </Button>
      }
    >
      {empty ? (
        <StatePanel
          kind="empty"
          heading="h3"
          title="No events in this read"
          description="This completed read returned no events. Ask in chat to read a different date range."
        />
      ) : (
        <ul className="canvas-demo-events">
          {events.map(event => (
            <li key={event.title}>
              <span className="canvas-demo-event-time">{event.time}</span>
              <span className="canvas-demo-event-title">{event.title}</span>
              <span className="canvas-demo-muted">{event.where}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="canvas-demo-muted">
        Events may have changed since this read. Ask in chat to read the calendar again.
      </p>
    </CanvasSection>
  );
}

function LoadingResult({ title }: { title: string }) {
  return (
    <CanvasSection title={title} meta="Preparing…">
      <div role="status" aria-label={`Loading ${title}`} className="canvas-demo-skeletons">
        <Skeleton shape="title" />
        <Skeleton />
        <Skeleton />
        <Skeleton shape="panel" />
      </div>
    </CanvasSection>
  );
}

function ErrorResult({ title, onRetry }: { title: string; onRetry?: () => void }) {
  return (
    <StatePanel
      kind="error"
      heading="h3"
      title={`Couldn’t load ${title}`}
      description="The result didn’t arrive. Your chat is unchanged."
    >
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : (
        <p className="canvas-demo-muted">Ask again in the chat.</p>
      )}
    </StatePanel>
  );
}

const pipeline = [
  { week: 'Week 1', deals: 12 },
  { week: 'Week 2', deals: 18 },
  { week: 'Week 3', deals: 9 },
  { week: 'Week 4', deals: 21 },
];

function ChartResult({ title }: { title: string }) {
  const max = Math.max(...pipeline.map(row => row.deals));
  return (
    <CanvasSection title={title}>
      <ul aria-label={`${title} by week`} className="canvas-demo-chart">
        {pipeline.map(row => (
          <li key={row.week}>
            <span className="canvas-demo-chart-label">{row.week}</span>
            <span className="canvas-demo-chart-track">
              <span className="canvas-demo-chart-bar" style={{ width: `${(row.deals / max) * 100}%` }} />
            </span>
            <span className="canvas-demo-chart-value">{row.deals} deals</span>
          </li>
        ))}
      </ul>
    </CanvasSection>
  );
}

const frameSrc = '/canvas-frame-sample.html';

function BrowserResult() {
  return (
    <CanvasSection
      title="Pricing page"
      meta="https://meadow.example/pricing"
      actions={
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href={frameSrc} target="_blank" rel="noopener noreferrer" />}
        >
          <ArrowUpRight size={14} aria-hidden="true" />
          Open in new tab
        </Button>
      }
    >
      <CanvasFrame src={frameSrc} title="Pricing page" />
    </CanvasSection>
  );
}

const seed = `import { db } from "./db";

export async function seedCustomers() {
  await db.customers.insertMany([
    { name: "Ada Park", status: "Prospect" },
    { name: "Rui Costa", status: "Active" },
  ]);
}`;

function CodeResult() {
  return (
    <CanvasSection>
      <figure className="canvas-demo-code">
        <figcaption>seed.ts</figcaption>
        <pre tabIndex={0}>
          <code>{seed}</code>
        </pre>
      </figure>
    </CanvasSection>
  );
}

function PlanResult({ title = 'Launch checklist' }: { title?: string }) {
  const steps = [
    { label: 'Draft the announcement post', done: true },
    { label: 'Book the press briefing', done: true },
    { label: 'Update the pricing page', done: false },
    { label: 'Email the beta customers', done: false },
  ];
  return (
    <CanvasSection>
      <div className="canvas-demo-plan">
        <div className="canvas-demo-plan-head">
          <h3>{title}</h3>
          <Badge variant="info">2 of 4 done</Badge>
        </div>
        <ol>
          {steps.map(step => (
            <li key={step.label} data-done={step.done ? '' : undefined}>
              <span aria-hidden="true" className="canvas-demo-plan-dot" />
              {step.label}
              <span className="canvas-demo-sr-only">{step.done ? ', done' : ', to do'}</span>
            </li>
          ))}
        </ol>
      </div>
    </CanvasSection>
  );
}

function SchemaResult() {
  return (
    <CanvasSection title="Customer storage" meta="3 tables in this proposal · 2 links">
      <div role="status">
        <Badge variant="info">Not yet applied</Badge>
      </div>
      <div className="canvas-demo-schema" aria-label="Schema diagram for Customer storage" role="img">
        {['Customers', 'Orders', 'Invoices'].map(name => (
          <span key={name} className="canvas-demo-schema-table">
            <Database size={14} aria-hidden="true" />
            {name}
          </span>
        ))}
      </div>
      <p className="canvas-demo-footer-note">
        Review these changes, then use the approval area at the bottom of the chat.
      </p>
    </CanvasSection>
  );
}

const activityApps: ResultApp[] = [
  {
    brand: 'google-drive',
    name: 'Google Drive',
    actions: [{ label: 'Searched Drive for “Q3 launch”', state: 'completed' }],
  },
  {
    brand: 'slack',
    name: 'Slack',
    actions: [
      { label: 'Posted the launch summary to #marketing', state: 'completed' },
      { label: 'Reply in the press thread', state: 'unknown' },
    ],
  },
];

function ActivityResult() {
  return (
    <CanvasSection
      title="Recorded activity"
      meta="These are recorded tool outcomes, not independent proof of a file save or delivery. Review the action receipt for that confirmation."
    >
      <ResultAppActions apps={activityApps} />
    </CanvasSection>
  );
}

function TableChangedResult() {
  return (
    <CanvasSection title="Table changed">
      <StatePanel
        kind="unavailable"
        title="These fields have changed"
        description="This saved query uses an older table definition. Open the current table, or ask for these rows again."
      >
        <Button variant="outline" nativeButton={false} render={<a href="#records" />}>
          Open current table
        </Button>
        <Button variant="ghost">Check again</Button>
      </StatePanel>
    </CanvasSection>
  );
}

function GoogleFileErrorResult() {
  return (
    <CanvasSection>
      <StatePanel kind="error" title="Couldn’t load Google file" description="Check the file again.">
        <Button variant="outline">Retry file</Button>
        <Button variant="outline" size="sm" nativeButton={false} render={<a href="#google" />}>
          Open Google file page
        </Button>
      </StatePanel>
    </CanvasSection>
  );
}

/* ---------- Playground: the chat-with-canvas screen ---------- */

type Kind = 'records' | 'calendar' | 'chart' | 'browser' | 'code' | 'plan' | 'report';
type Item = {
  id: string;
  title: string;
  kind: Kind;
  status: 'ready' | 'loading' | 'error';
};

const kindIcon: Record<Kind, Icon> = {
  records: Database,
  calendar: Calendar,
  chart: ChartBar,
  browser: Globe,
  code: Code,
  plan: Tasks,
  report: FileText,
};

const kindLabel: Record<Kind, ResultCardKind> = {
  records: 'Table',
  calendar: 'Calendar',
  chart: 'File',
  browser: 'File',
  code: 'File',
  plan: 'Plan',
  report: 'File',
};

const starterItems: Item[] = [
  { id: 'customers', title: 'Customers', kind: 'records', status: 'ready' },
  {
    id: 'calendar',
    title: 'Calendar events',
    kind: 'calendar',
    status: 'ready',
  },
  {
    id: 'pipeline',
    title: 'Weekly pipeline',
    kind: 'chart',
    status: 'loading',
  },
  { id: 'report', title: 'Q3 revenue report', kind: 'report', status: 'error' },
  { id: 'pricing', title: 'Pricing page', kind: 'browser', status: 'ready' },
  { id: 'seed', title: 'seed.ts', kind: 'code', status: 'ready' },
  { id: 'plan', title: 'Launch checklist', kind: 'plan', status: 'ready' },
];

function ItemView({ item, onRetry }: { item: Item; onRetry: (item: Item) => void }) {
  if (item.status === 'loading') return <LoadingResult title={item.title} />;
  if (item.status === 'error') return <ErrorResult title={item.title} onRetry={() => onRetry(item)} />;
  switch (item.kind) {
    case 'records':
      return <ChangedRowsResult />;
    case 'calendar':
      return <CalendarResult />;
    case 'chart':
    case 'report':
      return <ChartResult title={item.title} />;
    case 'browser':
      return <BrowserResult />;
    case 'code':
      return <CodeResult />;
    case 'plan':
      return <PlanResult title={item.title} />;
  }
}

const widths = [
  { value: 'full', label: 'Full width' },
  { value: 'narrow', label: 'Narrow (600px)' },
] as const;

export function CanvasPlayground() {
  const [open, setOpen] = useOpenWhenWide();
  const [items, setItems] = useState<Item[]>(starterItems);
  const [activeId, setActiveId] = useState<string | null>('customers');
  const [width, setWidth] = useState<'full' | 'narrow'>('full');
  const [attention, setAttention] = useState(false);
  const [splitWidth, setSplitWidth] = useState<number | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  // TulipFarm reads the split width the same way to decide sheet vs. side by side.
  useEffect(() => {
    const split = stage.current?.querySelector<HTMLElement>('[data-slot="chat-split"]');
    if (!split) return;
    const observer = new ResizeObserver(() => setSplitWidth(split.clientWidth));
    observer.observe(split);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const loading = items.find(item => item.status === 'loading');
    if (!loading) return;
    const timer = window.setTimeout(
      () => setItems(current => current.map(item => (item.id === loading.id ? { ...item, status: 'ready' } : item))),
      4000,
    );
    return () => window.clearTimeout(timer);
  }, [items]);

  const show = (item: Item) => {
    setItems(current => (current.some(entry => entry.id === item.id) ? current : [...current, item]));
    setActiveId(item.id);
    setOpen(true);
  };
  const close = (id: string) => {
    setItems(current => {
      const index = current.findIndex(item => item.id === id);
      const next = current.filter(item => item.id !== id);
      if (id === activeId) setActiveId(next[Math.min(index, next.length - 1)]?.id ?? null);
      if (next.length === 0) setOpen(false);
      return next;
    });
  };
  const retry = (target: Item) =>
    setItems(current => current.map(item => (item.id === target.id ? { ...item, status: 'loading' } : item)));
  const reset = () => {
    setItems(starterItems);
    setActiveId('customers');
    setOpen(true);
  };
  const narrow = splitWidth !== null && splitWidth < canvasSplitMinWidth;

  return (
    <Frame
      id="playground"
      title="Canvas playground"
      note={
        splitWidth === null
          ? 'Chat with results open beside it.'
          : narrow
            ? `Split is ${splitWidth}px, under ${canvasSplitMinWidth}px: the canvas opens as a sheet.`
            : `Split is ${splitWidth}px: the canvas opens beside the chat.`
      }
      controls={
        <>
          <DocsSelect label="Split width" value={width} items={widths} onValueChange={setWidth} />
          <label className="canvas-demo-switch">
            <Switch size="sm" checked={attention} onCheckedChange={setAttention} />
            Needs attention
          </label>
          <Button variant="outline" size="sm" onClick={reset}>
            Reset tabs
          </Button>
        </>
      }
    >
      <div ref={stage} className="canvas-demo-stage" data-width={width}>
        <div className="canvas-demo-app">
          <AppHeader title="Launch week planning">
            {items.length > 0 && (
              <CanvasToggle open={open} count={items.length} onToggle={() => setOpen(value => !value)} />
            )}
          </AppHeader>
          <ChatSplit
            open={open}
            onOpenChange={setOpen}
            layoutId="sprout-docs:canvas-playground"
            chat={
              <Conversation>
                <UserMessage>
                  Pull this week’s new customers, my calendar, and the pipeline for launch week.
                </UserMessage>
                <p>Here is what I found. Open a result to see the details.</p>
                {starterItems.slice(0, 3).map(item => (
                  <ResultCard
                    key={item.id}
                    title={item.title}
                    kind={kindLabel[item.kind]}
                    apps={[]}
                    icon={(() => {
                      const ItemIcon = kindIcon[item.kind];
                      return <ItemIcon size={18} />;
                    })()}
                    status={
                      item.kind === 'records'
                        ? '2 added and 1 updated'
                        : item.kind === 'calendar'
                          ? 'Saved read · Not a pending action'
                          : 'Preparing'
                    }
                    state={item.kind === 'chart' ? 'running' : 'success'}
                    action={{
                      label: 'Open in Canvas',
                      onClick: () => show(item),
                    }}
                  />
                ))}
              </Conversation>
            }
            canvas={
              <CanvasPanel
                tabs={items.map((item): CanvasTab => ({
                  id: item.id,
                  title: item.title,
                  icon: kindIcon[item.kind],
                  busy: item.status === 'loading',
                }))}
                activeId={activeId}
                onSelect={setActiveId}
                onCloseTab={close}
                onClose={() => setOpen(false)}
                activity={
                  attention ? (
                    <div className="canvas-demo-attention">
                      <Button variant="link" size="sm" onClick={() => setOpen(false)}>
                        A Google action needs your review. Back to chat
                      </Button>
                    </div>
                  ) : undefined
                }
              >
                {items.map(item => (
                  <div key={item.id} hidden={item.id !== activeId} className="canvas-demo-item">
                    <ItemView item={item} onRetry={retry} />
                  </div>
                ))}
              </CanvasPanel>
            }
          />
        </div>
      </div>
    </Frame>
  );
}

/* ---------- Toggle ---------- */

export function CanvasToggleStates() {
  const [open, setOpen] = useState(false);
  const rows = [
    { title: 'New chat', note: 'Closed, nothing open', open: false, count: 0 },
    {
      title: 'Launch week planning',
      note: 'Closed, 3 results',
      open: false,
      count: 3,
    },
    {
      title: 'Add customer storage',
      note: 'Open, 1 result',
      open: true,
      count: 1,
    },
  ];
  return (
    <Frame title="Canvas toggle" note="Below 640px only the icon and count show.">
      <div className="canvas-demo-toggles">
        {rows.map(row => (
          <div key={row.title} className="canvas-demo-toggle-row">
            <span className="canvas-demo-toggle-note">{row.note}</span>
            <AppHeader title={row.title}>
              <CanvasToggle open={row.open} count={row.count} onToggle={() => {}} />
            </AppHeader>
          </div>
        ))}
        <div className="canvas-demo-toggle-row">
          <span className="canvas-demo-toggle-note">Interactive</span>
          <AppHeader title="Review a workflow">
            <CanvasToggle open={open} count={1} onToggle={() => setOpen(value => !value)} />
          </AppHeader>
        </div>
      </div>
    </Frame>
  );
}

/* ---------- Sections ---------- */

function SectionSample({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="canvas-demo-section-sample">
      <figcaption>{label}</figcaption>
      <div className="canvas-demo-section-surface">{children}</div>
    </figure>
  );
}

export function CanvasSections() {
  return (
    <div className="canvas-demo-sections">
      <SectionSample label="Title, meta, and one action · calendar read">
        <CalendarResult />
      </SectionSample>
      <SectionSample label="Title and two actions · changed rows">
        <ChangedRowsResult />
      </SectionSample>
      <SectionSample label="Title and meta · schema proposal">
        <SchemaResult />
      </SectionSample>
      <SectionSample label="Long meta that wraps · recorded activity">
        <ActivityResult />
      </SectionSample>
      <SectionSample label="Title only · table changed">
        <TableChangedResult />
      </SectionSample>
      <SectionSample label="Loading · preparing a result">
        <LoadingResult title="Weekly pipeline" />
      </SectionSample>
      <SectionSample label="No title · plan or code wrapper">
        <PlanResult />
      </SectionSample>
      <SectionSample label="No title · state panel">
        <GoogleFileErrorResult />
      </SectionSample>
      <SectionSample label="Empty read">
        <CalendarResult empty />
      </SectionSample>
      <SectionSample label="Bare error, without a section">
        <ErrorResult title="Weekly pipeline" />
      </SectionSample>
    </div>
  );
}

export function CanvasFrameDemo() {
  return (
    <Frame title="Browser preview" note="A sandboxed frame inside a section with the URL as meta.">
      <div className="canvas-demo-section-surface canvas-demo-frame-surface">
        <BrowserResult />
      </div>
    </Frame>
  );
}

/* ---------- Recipes from TulipFarm screens ---------- */

const outcomes = [
  { value: 'review', label: 'Not yet applied' },
  { value: 'created', label: 'Created' },
  { value: 'failed', label: 'Failed' },
  { value: 'rejected', label: 'Rejected' },
] as const;
type Outcome = (typeof outcomes)[number]['value'];

const customerFields = ['Name', 'Email', 'Company', 'Phone', 'Status'];

function ApprovalRecipe() {
  const [open, setOpen] = useOpenWhenWide();
  const [outcome, setOutcome] = useState<Outcome>('review');
  const created = outcome === 'created';
  const badge = {
    review: { variant: 'info', label: 'Not yet applied' },
    created: { variant: 'success', label: 'Created' },
    failed: { variant: 'destructive', label: 'Failed' },
    rejected: { variant: 'secondary', label: 'Rejected' },
  } as const;
  return (
    <Frame
      id="approval"
      title="Approval review"
      note="One fixed tab whose title follows the outcome. A custom body, without a section."
      controls={<DocsSelect label="Outcome" value={outcome} items={outcomes} onValueChange={setOutcome} />}
    >
      <div className="canvas-demo-app">
        <AppHeader title="Add customer storage">
          <CanvasToggle open={open} count={1} onToggle={() => setOpen(value => !value)} />
        </AppHeader>
        <ChatSplit
          open={open}
          onOpenChange={setOpen}
          layoutId="sprout-docs:canvas-approval"
          chat={
            <Conversation>
              <UserMessage>Create a Customers table with Name, Email, Company, Phone, and Status.</UserMessage>
              <p>Here are the changes for your review.</p>
              <div>
                <Button variant="outline" onClick={() => setOpen(true)}>
                  {created ? 'View created tables' : 'Review changes'}
                </Button>
              </div>
            </Conversation>
          }
          canvas={
            <CanvasPanel
              tabs={[
                {
                  id: 'approval',
                  title: created ? 'Created tables' : 'Proposed changes',
                  icon: Database,
                },
              ]}
              activeId="approval"
              onSelect={() => {}}
              onCloseTab={() => setOpen(false)}
              onClose={() => setOpen(false)}
            >
              <div className="canvas-demo-approval">
                <div className="canvas-demo-approval-head">
                  <div>
                    <h2>{created ? 'Your new tables' : 'Changes to review'}</h2>
                    <p className="canvas-demo-muted">1 table · 5 fields · No rows added</p>
                  </div>
                  <Badge variant={badge[outcome].variant}>{badge[outcome].label}</Badge>
                </div>
                <div className="canvas-demo-approval-body">
                  <section aria-label="Customers schema" className="canvas-demo-approval-table">
                    <header>
                      <Database size={18} aria-hidden="true" />
                      <h3>Customers</h3>
                      <span className="canvas-demo-muted">5 fields</span>
                    </header>
                    <ul>
                      {customerFields.map((field, index) => (
                        <li key={field}>
                          <span className="canvas-demo-field">{field}</span>
                          {index === 0 && <span className="canvas-demo-muted">Required</span>}
                          <span className="canvas-demo-muted canvas-demo-field-type">
                            {field === 'Status' ? 'Select' : 'Text'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
                <p className="canvas-demo-approval-foot">
                  {created
                    ? 'Creation complete. The result stays in your chat.'
                    : 'Use the approval area at the bottom of the chat.'}
                </p>
              </div>
            </CanvasPanel>
          }
        />
      </div>
    </Frame>
  );
}

const workflowSteps = [
  { title: 'When a pull request is opened', app: 'GitHub' },
  { title: 'Summarize the title, author, and link', app: 'TulipFarm' },
  { title: 'Post to #engineering', app: 'Slack' },
];

function WorkflowRecipe() {
  const [open, setOpen] = useOpenWhenWide();
  const [tabOpen, setTabOpen] = useState(true);
  const showWorkflow = () => {
    setTabOpen(true);
    setOpen(true);
  };
  return (
    <Frame
      id="workflow"
      title="Workflow review"
      note="Close the tab: the canvas stays open with no tabs and an empty state."
    >
      <div className="canvas-demo-app">
        <AppHeader title="Review a workflow">
          <CanvasToggle open={open} count={tabOpen ? 1 : 0} onToggle={() => setOpen(value => !value)} />
        </AppHeader>
        <ChatSplit
          open={open}
          onOpenChange={setOpen}
          layoutId="sprout-docs:canvas-workflow"
          chat={
            <Conversation>
              <UserMessage>
                Notify #engineering whenever a pull request is opened. Include its title, author, and link.
              </UserMessage>
              <p>The workflow is ready to review. Select a step in Canvas to see what it does.</p>
              <div className="canvas-demo-workflow-card">
                <BranchDown size={20} aria-hidden="true" />
                <div>
                  <p className="canvas-demo-field">New pull request alert</p>
                  <p className="canvas-demo-muted">3 steps / view only</p>
                  <Button variant="link" size="sm" onClick={showWorkflow}>
                    View workflow
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </Conversation>
          }
          canvas={
            <CanvasPanel
              tabs={tabOpen ? [{ id: 'workflow', title: 'Workflow', icon: BranchDown }] : []}
              activeId={tabOpen ? 'workflow' : null}
              onSelect={showWorkflow}
              onCloseTab={() => setTabOpen(false)}
              onClose={() => setOpen(false)}
            >
              {tabOpen ? (
                <CanvasSection title="New pull request alert" meta="3 steps · Draft">
                  <ol className="canvas-demo-steps">
                    {workflowSteps.map((step, index) => (
                      <li key={step.title}>
                        <span className="canvas-demo-step-index">{index + 1}</span>
                        <span>
                          <span className="canvas-demo-field">{step.title}</span>
                          <span className="canvas-demo-muted"> · {step.app}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </CanvasSection>
              ) : (
                <StatePanel
                  kind="empty"
                  title="No workflow open"
                  description="Your review and message draft are kept in chat."
                >
                  <Button variant="outline" onClick={showWorkflow}>
                    Open workflow
                  </Button>
                </StatePanel>
              )}
            </CanvasPanel>
          }
        />
      </div>
    </Frame>
  );
}

type Example = {
  id: string;
  title: string;
  kind: ResultCardKind;
  status: string;
  description: string;
  actionLabel: string;
  apps: ResultApp[];
};

const examples: Example[] = [
  {
    id: 'pitch',
    title: 'Investor pitch',
    kind: 'File',
    status: 'Saved in Google Slides',
    description: 'A two-slide pitch with the Q3 numbers and the launch timeline.',
    actionLabel: 'View slides',
    apps: [
      {
        brand: 'google-slides',
        name: 'Google Slides',
        actions: [
          {
            label: 'Created the investor pitch presentation',
            state: 'completed',
          },
          { label: 'Added the two pitch slides', state: 'completed' },
        ],
      },
    ],
  },
  {
    id: 'update',
    title: 'Investor update',
    kind: 'Action',
    status: 'Sent from Gmail',
    description: 'The monthly update went to 14 investors with the pitch attached.',
    actionLabel: 'View email',
    apps: [
      {
        brand: 'gmail',
        name: 'Gmail',
        actions: [{ label: 'Sent the investor update email', state: 'completed' }],
      },
    ],
  },
];

function ResultCardsRecipe() {
  const [selected, setSelected] = useState<Example | null>(null);
  const open = selected !== null;
  return (
    <Frame
      id="result-cards"
      title="Result cards"
      note="The canvas exists only while a result is selected. Closing clears it."
    >
      <div className="canvas-demo-app">
        <AppHeader title="App result cards">
          <CanvasToggle open={open} count={selected ? 1 : 0} onToggle={() => setSelected(open ? null : examples[0]!)} />
        </AppHeader>
        <ChatSplit
          open={open}
          onOpenChange={value => {
            if (!value) setSelected(null);
          }}
          layoutId="sprout-docs:canvas-result-cards"
          chat={
            <Conversation>
              <UserMessage>Show me the results for the pitch and the investor update.</UserMessage>
              <p>Your work is ready. Open a result to see the details.</p>
              {examples.map(example => (
                <ResultCard
                  key={example.id}
                  title={example.title}
                  kind={example.kind}
                  apps={example.apps}
                  status={example.status}
                  state="success"
                  action={{
                    label: example.actionLabel,
                    onClick: () => setSelected(example),
                  }}
                />
              ))}
            </Conversation>
          }
          canvas={
            selected && (
              <CanvasPanel
                tabs={[{ id: selected.id, title: selected.title, icon: File }]}
                activeId={selected.id}
                onSelect={() => {}}
                onCloseTab={() => setSelected(null)}
                onClose={() => setSelected(null)}
              >
                <div className="canvas-demo-receipt">
                  <header>
                    <p className="canvas-demo-success">{selected.status}</p>
                    <h2>{selected.title}</h2>
                    <p>{selected.description}</p>
                  </header>
                  <section aria-label="Apps used">
                    <h3>Actions by app</h3>
                    <ResultAppActions apps={selected.apps} />
                  </section>
                  <p className="canvas-demo-muted">Seeded example, not a live execution receipt.</p>
                </div>
              </CanvasPanel>
            )
          }
        />
      </div>
    </Frame>
  );
}

const gardenTabs: CanvasTab[] = [
  { id: 'record', title: 'Garden plan', icon: FileText },
  { id: 'notes', title: 'Notes', icon: Inbox },
];

function CardRecipe() {
  const [open, setOpen] = useOpenWhenWide();
  const [tabs, setTabs] = useState(gardenTabs);
  const [active, setActive] = useState('record');
  return (
    <Frame
      id="cards"
      title="Cards in a section"
      note="Two closable tabs. Reset brings them back."
      controls={
        <>
          <CanvasToggle open={open} count={tabs.length} onToggle={() => setOpen(!open)} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTabs(gardenTabs);
              setActive('record');
              setOpen(true);
            }}
          >
            Reset tabs
          </Button>
        </>
      }
    >
      <div className="canvas-demo-app canvas-demo-app-short">
        <ChatSplit
          open={open}
          onOpenChange={setOpen}
          layoutId="sprout-docs:canvas-cards"
          chat={
            <Conversation>
              <p>A fictional conversation. The canvas shows a visual result, not another transcript.</p>
            </Conversation>
          }
          canvas={
            <CanvasPanel
              tabs={tabs}
              activeId={tabs.some(tab => tab.id === active) ? active : (tabs[0]?.id ?? null)}
              onSelect={setActive}
              onCloseTab={id => setTabs(current => current.filter(tab => tab.id !== id))}
              onClose={() => setOpen(false)}
            >
              {tabs.length ? (
                <CanvasSection title={active === 'record' ? 'Garden plan' : 'Notes'} meta="Local example">
                  <Card>
                    <CardHeader>
                      <CardTitle>Plant spring bulbs</CardTitle>
                      <CardDescription>Owner: Alex Meadow</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="success">Ready</Badge>
                    </CardContent>
                  </Card>
                </CanvasSection>
              ) : (
                <StatePanel
                  kind="empty"
                  title="Nothing open"
                  description="Reset the tabs to bring the examples back."
                />
              )}
            </CanvasPanel>
          }
        />
      </div>
    </Frame>
  );
}

export function CanvasRecipes() {
  return (
    <div className="canvas-demo-recipes">
      <ApprovalRecipe />
      <WorkflowRecipe />
      <ResultCardsRecipe />
      <CardRecipe />
    </div>
  );
}
