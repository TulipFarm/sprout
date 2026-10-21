import { useState, type ReactNode } from 'react';
import { Tasks } from 'reicon-react/icons/Tasks';
import { Alert, AlertDescription, AlertTitle } from '@tulipfarm/sprout/alert';
import { Badge } from '@tulipfarm/sprout/badge';
import { Button } from '@tulipfarm/sprout/button';
import { CanvasSection } from '@tulipfarm/sprout/canvas';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@tulipfarm/sprout/collapsible';
import {
  PlanOutline,
  planOutlineMarkNames,
  planOutlineToneNames,
  type PlanOutlineMark,
  type PlanOutlineTask,
  type PlanOutlineTone,
} from '@tulipfarm/sprout/plan-outline';
import { Skeleton } from '@tulipfarm/sprout/skeleton';
import { StatePanel } from '@tulipfarm/sprout/state-panel';
import DocsSelect from './DocsSelect';
import '../styles/plan-outline-demo.css';

function Frame({
  id,
  title,
  note,
  controls,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="outline-demo-frame" aria-label={title} data-recipe={id}>
      <div className="outline-demo-bar">
        <div className="outline-demo-bar-text">
          <span className="outline-demo-bar-title">{title}</span>
          {note && <span className="outline-demo-note">{note}</span>}
        </div>
        {controls && <div className="outline-demo-controls">{controls}</div>}
      </div>
      <div className="outline-demo-stage">{children}</div>
    </section>
  );
}

function Canvas({ tab, children, narrow }: { tab: string; children: ReactNode; narrow?: boolean }) {
  return (
    <div
      className={narrow ? 'outline-demo-canvas outline-demo-canvas-narrow' : 'outline-demo-canvas'}
      role="group"
      aria-label={`${tab} canvas`}
    >
      <div className="outline-demo-canvas-tab">{tab}</div>
      <CanvasSection>{children}</CanvasSection>
    </div>
  );
}

/* A sample adapter: a saved plan as Cloud's server returns it, flattened ---- */

type Lifecycle = 'draft' | 'active' | 'waiting' | 'paused' | 'stopped' | 'completed' | 'verified' | 'failed';

const lifecycleChoices: { value: Lifecycle; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Running' },
  { value: 'waiting', label: 'Waiting on you' },
  { value: 'paused', label: 'Paused at budget' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'completed', label: 'Complete' },
  { value: 'verified', label: 'Verified' },
  { value: 'failed', label: 'Failed' },
];

const statusFor: Record<Lifecycle, { status: string; tone: PlanOutlineTone }> = {
  draft: { status: 'Ready to review', tone: 'neutral' },
  active: { status: 'Running', tone: 'active' },
  waiting: { status: 'Waiting', tone: 'attention' },
  paused: { status: 'Paused', tone: 'attention' },
  stopped: { status: 'Stopped', tone: 'neutral' },
  completed: { status: 'Plan complete', tone: 'done' },
  verified: { status: 'Plan verified', tone: 'done' },
  failed: { status: 'Failed', tone: 'failed' },
};

type Step = {
  id: string;
  title: string;
  assignee: string;
  brief: string;
  criteria: string[];
  after?: string[];
};

const research: Step[] = [
  {
    id: 'audit',
    title: "Audit last spring's catalog performance",
    assignee: 'Main agent',
    brief: 'Compare sell-through for each bulb variety in the 2025 spring catalog.',
    criteria: ['Every variety has a sell-through rate.', 'The bottom ten varieties are listed with reasons.'],
  },
  {
    id: 'suppliers',
    title: 'Confirm supplier stock for 48 varieties',
    assignee: 'Supplier liaison',
    brief: 'Ask each supplier for counts they can ship by 12 February.',
    criteria: ['Each variety has a confirmed count or is marked unavailable.'],
  },
];
const setup: Step[] = [
  {
    id: 'pricing',
    title: 'Set prices for the spring catalog',
    assignee: 'Pricing analyst · created for this plan',
    brief: "Use last year's margins and current supplier quotes.",
    criteria: ['No variety sells below a 35% margin.'],
    after: ['audit', 'suppliers'],
  },
  {
    id: 'copy',
    title: 'Write product descriptions',
    assignee: 'Catalog writer',
    brief: 'One short description and care note per variety.',
    criteria: ['Descriptions are under 60 words.', 'Care notes name sun, soil, and depth.'],
    after: ['suppliers'],
  },
  {
    id: 'publish',
    title: 'Publish the catalog to the storefront',
    assignee: 'Main agent',
    brief: 'Create the products in a draft collection, then publish after review.',
    criteria: ['All products are live in the Spring 2026 collection.'],
    after: ['pricing', 'copy'],
  },
];
const steps = [...research, ...setup];

type State = {
  mark: PlanOutlineMark;
  label: string;
  reason?: string;
  ask?: 'input' | 'approval';
  verified?: boolean;
};

function statesFor(lifecycle: Lifecycle): Record<string, State> {
  const pending = (id: string): State => ({
    mark: 'pending',
    label: steps.find(step => step.id === id)!.after ? 'Waiting on earlier tasks' : 'Not started',
  });
  const done: State = { mark: 'done', label: 'Done' };
  const verified: State = { mark: 'done', label: 'Verified', verified: true };
  const all = (state: (id: string) => State) => Object.fromEntries(steps.map(step => [step.id, state(step.id)]));
  switch (lifecycle) {
    case 'draft':
      return all(pending);
    case 'active':
      return {
        ...all(pending),
        audit: done,
        suppliers: { mark: 'running', label: 'Working' },
        copy: { mark: 'pending', label: 'Up next' },
      };
    case 'waiting':
      return {
        ...all(pending),
        audit: done,
        suppliers: done,
        pricing: {
          mark: 'attention',
          label: 'Needs your review',
          ask: 'approval',
        },
        copy: { mark: 'attention', label: 'Needs your answer', ask: 'input' },
      };
    case 'paused':
      return {
        ...all(pending),
        audit: done,
        suppliers: done,
        copy: { mark: 'running', label: 'Working' },
        pricing: { mark: 'attention', label: 'Needs verification' },
      };
    case 'stopped':
      return {
        audit: done,
        suppliers: done,
        pricing: { mark: 'cancelled', label: 'Cancelled' },
        copy: { mark: 'cancelled', label: 'Cancelled' },
        publish: { mark: 'cancelled', label: 'Cancelled' },
      };
    case 'completed':
      return all(() => done);
    case 'verified':
      return all(() => verified);
    case 'failed':
      return {
        audit: done,
        suppliers: {
          mark: 'failed',
          label: 'Failed',
          reason: 'Two suppliers did not reply before the 12 February cut-off.',
        },
        copy: done,
        pricing: {
          mark: 'blocked',
          label: 'Blocked',
          reason: "Supplier stock was not confirmed, so prices can't be set.",
        },
        publish: {
          mark: 'blocked',
          label: 'Blocked',
          reason: 'Waiting for prices.',
        },
      };
  }
}

function report(step: Step) {
  return (
    <div className="outline-demo-report">
      <p>
        The verifier checked {step.criteria.length === 1 ? 'the criterion' : `all ${step.criteria.length} criteria`}{' '}
        against the saved results.
      </p>
      <Collapsible>
        <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>Verification details</CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="outline-demo-report-list">
            {step.criteria.map((criterion, index) => (
              <li key={criterion}>
                <p>{criterion}: passed</p>
                <p>
                  Read the saved results{' '}
                  <code>
                    call_{step.id}_{index + 1}
                  </code>
                </p>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function sampleTasks(lifecycle: Lifecycle, canControl = true): PlanOutlineTask[] {
  const states = statesFor(lifecycle);
  const byId = new Map(steps.map(step => [step.id, step]));
  const row = (step: Step): PlanOutlineTask => {
    const state = states[step.id]!;
    const ask = state.ask && (state.ask === 'approval' ? 'Review in task' : 'Answer in task');
    const label =
      state.ask && !canControl
        ? state.ask === 'approval'
          ? 'Waiting for a review'
          : 'Waiting for an answer'
        : state.label;
    return {
      id: step.id,
      title: step.title,
      mark: state.mark,
      label,
      assignee: step.assignee,
      brief: step.brief,
      criteria: step.criteria,
      reason: state.reason,
      dependencies: (step.after ?? []).map(id => ({
        id,
        title: byId.get(id)!.title,
        label: states[id]!.label,
      })),
      action:
        ask || state.verified ? (
          <>
            {ask && (
              <Button variant="outline" size="sm" nativeButton={false} render={<a href="#details" />}>
                {ask}
              </Button>
            )}
            {state.verified && report(step)}
          </>
        ) : undefined,
    };
  };
  const group = (id: string, title: string, brief: string, list: Step[]): PlanOutlineTask => {
    const children = list.map(row);
    const completed = children.filter(task => task.mark === 'done').length;
    const marks = children.map(task => task.mark);
    const mark: PlanOutlineMark = marks.includes('failed')
      ? 'failed'
      : marks.includes('attention')
        ? 'attention'
        : marks.includes('running')
          ? 'running'
          : completed === children.length
            ? 'done'
            : 'pending';
    return {
      id,
      title,
      mark,
      label: `${completed} of ${children.length} done`,
      brief,
      children,
    };
  };
  return [
    group('research', 'Research', 'Find what sold and what suppliers can ship.', research),
    group('setup', 'Catalog setup', 'Price, describe, and publish the new varieties.', setup),
  ];
}

function progressFor(tasks: PlanOutlineTask[]) {
  const leaves = tasks.flatMap(task => task.children ?? [task]);
  const count = (mark: PlanOutlineMark) => leaves.filter(task => task.mark === mark).length;
  const parts = [`${count('done')} of ${leaves.length} done`];
  if (count('running')) parts.push(`${count('running')} working`);
  const verify = leaves.filter(task => task.label === 'Needs verification').length;
  if (verify) parts.push(`${verify} need verification`);
  const waiting = leaves.filter(task => /answer|review/i.test(task.label)).length;
  if (waiting) parts.push(`${waiting} waiting for input`);
  if (count('failed')) parts.push(`${count('failed')} failed`);
  return parts.join(' · ');
}

const notices: Partial<Record<Lifecycle, { title: string; body: string; destructive?: boolean }>> = {
  draft: {
    title: 'Plan only',
    body: 'Research and the plan are saved. No setup work has started. Start this plan when you want to act; each business action still needs its own permission or review.',
  },
  waiting: {
    title: '2 tasks need your input',
    body: 'Open the task from the list to answer or review it. Other tasks keep running.',
  },
  paused: {
    title: 'Paused at its budget',
    body: 'The plan used its budget of 2,000 credits. Nothing new starts until you add budget and resume it.',
  },
  stopped: {
    title: 'Stopped',
    body: 'Unfinished tasks were cancelled. Finished work is kept.',
  },
  failed: {
    title: 'Some tasks failed',
    body: 'Tasks that depended on them did not run. Other tasks continued.',
    destructive: true,
  },
};

function Notice({ lifecycle }: { lifecycle: Lifecycle }) {
  const notice = notices[lifecycle];
  if (!notice) return null;
  return (
    <Alert variant={notice.destructive ? 'destructive' : 'default'}>
      <AlertTitle>{notice.title}</AlertTitle>
      <AlertDescription>{notice.body}</AlertDescription>
    </Alert>
  );
}

function CatalogPlan({ lifecycle, canControl = true }: { lifecycle: Lifecycle; canControl?: boolean }) {
  const tasks = sampleTasks(lifecycle, canControl);
  const { status, tone } = statusFor[lifecycle];
  return (
    <PlanOutline
      title="Launch the spring bulb catalog"
      brief="Research what sold last spring, confirm supplier stock, then price, describe, and publish 48 varieties."
      status={status}
      tone={tone}
      progress={progressFor(tasks)}
      notice={<Notice lifecycle={lifecycle} />}
      tasks={tasks}
    />
  );
}

export function PlanOutlinePlayground() {
  const [lifecycle, setLifecycle] = useState<Lifecycle>('active');
  return (
    <section className="outline-demo-frame" aria-label="Plan outline playground">
      <div className="outline-demo-toolbar">
        <span className="outline-demo-picker">
          Plan state
          <DocsSelect<Lifecycle>
            label="Plan state"
            value={lifecycle}
            onValueChange={setLifecycle}
            items={lifecycleChoices}
          />
        </span>
      </div>
      <div className="outline-demo-stage">
        <Canvas tab="Spring catalog plan">
          <CatalogPlan lifecycle={lifecycle} />
        </Canvas>
      </div>
    </section>
  );
}

/* Every mark and tone, as Cloud's internal playground shows them ------------- */

const markTasks: PlanOutlineTask[] = [
  {
    id: 'mark-pending',
    title: 'Choose a sunny patch',
    mark: 'pending',
    label: 'Not started',
    assignee: 'Alex Meadow',
    brief: 'Find a bed with six hours of sun.',
  },
  {
    id: 'mark-running',
    title: 'Prepare the soil',
    mark: 'running',
    label: 'Working',
    assignee: 'Main agent',
    criteria: ['Soil is loose to 20 cm.'],
    dependencies: [
      {
        id: 'mark-pending',
        title: 'Choose a sunny patch',
        label: 'Not started',
      },
    ],
  },
  {
    id: 'mark-attention',
    title: 'Pick bulb colors',
    mark: 'attention',
    label: 'Needs your answer',
    assignee: 'Garden designer',
    action: (
      <Button variant="outline" size="sm">
        Answer in task
      </Button>
    ),
  },
  {
    id: 'mark-blocked',
    title: 'Order bulbs',
    mark: 'blocked',
    label: 'Blocked',
    reason: 'Waiting for sample approval.',
  },
  {
    id: 'mark-done',
    title: 'Measure the bed',
    mark: 'done',
    label: 'Verified',
  },
  {
    id: 'mark-failed',
    title: 'Book a delivery slot',
    mark: 'failed',
    label: 'Failed',
    reason: 'The courier has no slots before 1 March.',
  },
  {
    id: 'mark-cancelled',
    title: 'Rent a tiller',
    mark: 'cancelled',
    label: 'Cancelled',
  },
];

const toneStatus: Record<PlanOutlineTone, string> = {
  active: 'Running',
  attention: 'Waiting',
  done: 'Plan complete',
  failed: 'Failed',
  neutral: 'Ready to review',
};

export function PlanOutlineMarks() {
  const [tone, setTone] = useState<PlanOutlineTone>('active');
  return (
    <Frame
      id="marks"
      title="Marks and tones"
      note={`${planOutlineMarkNames.length} task marks, ${planOutlineToneNames.length} plan tones`}
      controls={
        <span className="outline-demo-picker">
          Plan tone
          <DocsSelect<PlanOutlineTone>
            label="Plan tone"
            value={tone}
            onValueChange={setTone}
            items={planOutlineToneNames.map(value => ({
              value,
              label: `${value[0]!.toUpperCase()}${value.slice(1)} · ${toneStatus[value]}`,
            }))}
          />
        </span>
      }
    >
      <Canvas tab="Meadow garden plan">
        <PlanOutline
          title="Meadow garden plan"
          brief="A fictional example of a saved plan."
          status={toneStatus[tone]}
          tone={tone}
          progress="1 of 6 done · 1 working · 1 waiting for input · 1 failed"
          notice={<p className="outline-demo-small">Actions affect this example only.</p>}
          tasks={markTasks}
        />
      </Canvas>
    </Frame>
  );
}

/* Nested groups --------------------------------------------------------------- */

const nested: PlanOutlineTask[] = [
  {
    id: 'nest-intake',
    title: 'Customer intake',
    mark: 'done',
    label: '2 of 2 done',
    brief: 'Collect what the customer asked for.',
    children: [
      {
        id: 'nest-read',
        title: 'Read the support thread',
        mark: 'done',
        label: 'Done',
        assignee: 'Main agent',
      },
      {
        id: 'nest-account',
        title: 'Look up the account',
        mark: 'done',
        label: 'Done',
        assignee: 'Main agent',
      },
    ],
  },
  {
    id: 'nest-fix',
    title: 'Fix the order',
    mark: 'running',
    label: '1 of 3 done',
    children: [
      {
        id: 'nest-refund',
        title: 'Refund the damaged tulips',
        mark: 'done',
        label: 'Done',
        assignee: 'Billing agent',
      },
      {
        id: 'nest-replace',
        title: 'Send replacements',
        mark: 'running',
        label: '1 of 2 done',
        brief: 'Ship from the nearest warehouse.',
        children: [
          {
            id: 'nest-pick',
            title: 'Pick stock in Leiden',
            mark: 'done',
            label: 'Done',
            assignee: 'Warehouse agent',
          },
          {
            id: 'nest-ship',
            title: 'Book next-day shipping',
            mark: 'running',
            label: 'Working',
            assignee: 'Warehouse agent',
            dependencies: [{ id: 'nest-pick', title: 'Pick stock in Leiden', label: 'Done' }],
          },
        ],
      },
      {
        id: 'nest-email',
        title: 'Email the customer',
        mark: 'pending',
        label: 'Waiting on earlier tasks',
        dependencies: [{ id: 'nest-replace', title: 'Send replacements', label: 'Group' }],
      },
    ],
  },
  {
    id: 'nest-follow',
    title: 'Follow up',
    mark: 'pending',
    label: 'No tasks yet',
    children: [],
  },
];

export function PlanOutlineNested() {
  return (
    <Frame id="nested" title="Nested groups" note="Groups start open; an empty group says so">
      <Canvas tab="Damaged order">
        <PlanOutline
          title="Resolve damaged order #4821"
          status="Running"
          tone="active"
          progress="4 of 7 done · 1 working"
          tasks={nested}
        />
      </Canvas>
    </Frame>
  );
}

/* Notice, requirement checks, and a stale plan -------------------------------- */

const prerequisites = [
  {
    key: 'shop',
    title: 'Storefront connection can create products',
    status: 'verified' as const,
  },
  {
    key: 'stock',
    title: 'Supplier sheet is shared with the workspace',
    status: 'unknown' as const,
    reason: 'The sheet owner has not answered yet.',
  },
  {
    key: 'tax',
    title: 'Tax rates exist for the Netherlands',
    status: 'blocked' as const,
    reason: 'No tax rate is set for NL.',
  },
];

function Checks() {
  return (
    <div className="outline-demo-checks">
      <section aria-label="Original requirements">
        <h3 className="outline-demo-checks-title">What this plan must achieve</h3>
        <ul className="outline-demo-requirements">
          <li>
            48 varieties are live in the Spring 2026 collection
            <span className="outline-demo-small">Verified</span>
          </li>
          <li>Every variety keeps a margin of at least 35%</li>
        </ul>
      </section>
      <section aria-label="Prerequisite checks">
        <h3 className="outline-demo-checks-title">Before work starts</h3>
        <ul className="outline-demo-prerequisites">
          {prerequisites.map(check => (
            <li key={check.key}>
              <div className="outline-demo-check-row">
                <span>{check.title}</span>
                <Badge variant={check.status === 'verified' ? 'success' : 'warning'}>
                  {check.status === 'verified' ? 'Checked' : check.status === 'unknown' ? 'Not checked' : 'Blocked'}
                </Badge>
              </div>
              {check.reason && <p className="outline-demo-muted">{check.reason}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function PlanOutlineNotices() {
  const [refreshing, setRefreshing] = useState(false);
  const tasks = sampleTasks('paused');
  return (
    <Frame
      id="notices"
      title="Notice and stale data"
      note="A paused plan with its requirement checks, shown from the last load"
    >
      <Canvas tab="Spring catalog plan">
        <PlanOutline
          title="Launch the spring bulb catalog"
          status="Paused"
          tone="attention"
          progress={progressFor(tasks)}
          notice={
            <>
              <Notice lifecycle="paused" />
              <Checks />
            </>
          }
          stale={
            <Alert>
              <AlertTitle>Showing the last loaded plan</AlertTitle>
              <AlertDescription>Newer progress couldn’t be loaded.</AlertDescription>
              <div className="outline-demo-alert-action">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                  onClick={() => {
                    setRefreshing(true);
                    setTimeout(() => setRefreshing(false), 1200);
                  }}
                >
                  {refreshing ? 'Checking…' : 'Check again'}
                </Button>
              </div>
            </Alert>
          }
          tasks={tasks}
        />
      </Canvas>
    </Frame>
  );
}

/* Viewer without control: waiting labels for someone else ---------------------- */

export function PlanOutlineViewer() {
  return (
    <Frame
      id="viewer"
      title="Someone else's plan"
      note="Waiting tasks name who they wait for; only the starter can answer"
    >
      <Canvas tab="Spring catalog plan">
        <CatalogPlan lifecycle="waiting" canControl={false} />
      </Canvas>
    </Frame>
  );
}

/* Loading, error, unavailable, and empty ---------------------------------------- */

type Load = 'loading' | 'error' | 'unavailable' | 'empty';

const loadChoices: { value: Load; label: string }[] = [
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: 'Couldn’t load' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'empty', label: 'No tasks yet' },
];

export function PlanOutlineStates() {
  const [load, setLoad] = useState<Load>('loading');
  return (
    <Frame
      id="states"
      title="Loading, error, and empty"
      note="The canvas around the outline, before and without a plan"
      controls={
        <span className="outline-demo-picker">
          State
          <DocsSelect<Load> label="Load state" value={load} onValueChange={setLoad} items={loadChoices} />
        </span>
      }
    >
      <Canvas tab="New plan">
        {load === 'loading' ? (
          <div role="status" aria-label="Loading New plan" className="outline-demo-loading">
            <Skeleton shape="title" />
            <Skeleton />
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        ) : load === 'unavailable' ? (
          <StatePanel
            kind="unavailable"
            heading="h3"
            icon={Tasks}
            title="Plan unavailable"
            description="This plan was removed or your access to its chat changed. Nothing from it is shown here."
          />
        ) : load === 'error' ? (
          <StatePanel
            kind="error"
            heading="h3"
            title="Couldn’t load this plan"
            description="The plan keeps running on the server. Your chat is unchanged."
          >
            <Button variant="outline" onClick={() => setLoad('loading')}>
              Load plan again
            </Button>
          </StatePanel>
        ) : (
          <PlanOutline title="New plan" status="Ready to review" tone="neutral" progress="No tasks yet" tasks={[]} />
        )}
      </Canvas>
    </Frame>
  );
}

/* Long content wraps ------------------------------------------------------------- */

const longTasks: PlanOutlineTask[] = [
  {
    id: 'long-export',
    title: 'Export https://files.example.com/workspaces/tulipfarm/exports/supplier-deliveries-2026-q3-final-v2.csv',
    mark: 'done',
    label: 'Verified',
    assignee: 'Data import specialist for the legacy accounting migration · created for this plan',
  },
  {
    id: 'long-map',
    title: 'Map InvoiceReferenceNumberFromLegacyAccountingSystem to a Supplier deliveries field',
    mark: 'attention',
    label: 'Needs your answer',
    assignee: 'Main agent',
    reason: 'The column has no matching field. Pick a field or skip the column.',
    criteria: ['Every legacy column maps to a field or is skipped on purpose with a note explaining why.'],
    dependencies: [
      {
        id: 'long-export',
        title: 'Export https://files.example.com/workspaces/tulipfarm/exports/supplier-deliveries-2026-q3-final-v2.csv',
        label: 'Verified',
      },
    ],
    action: (
      <Button variant="outline" size="sm">
        Answer in task
      </Button>
    ),
  },
];

export function PlanOutlineLongContent() {
  return (
    <Frame id="long" title="Long content" note="Long titles, names, and links wrap inside a narrow canvas">
      <Canvas tab="Legacy import" narrow>
        <PlanOutline
          title="Move supplier deliveries from the legacy accounting export into Supplier deliveries"
          brief="Every row from the 2026 Q3 export lands in the new table with its supplier, invoice, and delivery date."
          status="Waiting"
          tone="attention"
          progress="1 of 2 done · 1 waiting for input"
          tasks={longTasks}
        />
      </Canvas>
    </Frame>
  );
}
