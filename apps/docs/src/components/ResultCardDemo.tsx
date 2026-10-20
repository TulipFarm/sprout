import { useState, type ReactNode } from 'react';
import { BranchDown } from 'reicon-react/icons/BranchDown';
import { Command } from 'reicon-react/icons/Command';
import { Database } from 'reicon-react/icons/Database';
import { FileText } from 'reicon-react/icons/FileText';
import { Sparkle } from 'reicon-react/icons/Sparkle';
import { Tasks } from 'reicon-react/icons/Tasks';
import { User } from 'reicon-react/icons/User';
import { Button } from '@tulipfarm/sprout/button';
import {
  ResultAppActions,
  ResultCard,
  resultAppActionStateNames,
  resultCardKindNames,
  resultCardStateNames,
  type ResultApp,
  type ResultAppActionState,
  type ResultCardKind,
  type ResultCardState,
} from '@tulipfarm/sprout/result-card';
import { Switch } from '@tulipfarm/sprout/switch';
import DocsSelect from './DocsSelect';
import '../styles/result-card-demo.css';

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
    <section className="result-demo-frame" aria-label={title} data-recipe={id}>
      <div className="result-demo-bar">
        <div className="result-demo-bar-text">
          <span className="result-demo-bar-title">{title}</span>
          {note && <span className="result-demo-note">{note}</span>}
        </div>
        {controls && <div className="result-demo-controls">{controls}</div>}
      </div>
      <div className="result-demo-body">{children}</div>
    </section>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="result-demo-labeled">
      <p className="result-demo-label">{label}</p>
      {children}
    </div>
  );
}

function useNotice(initial = 'Local sample. Nothing is opened or sent.') {
  const [notice, setNotice] = useState(initial);
  return [notice, (text: string) => () => setNotice(`${text} (sample, nothing changed).`)] as const;
}

function Notice({ children }: { children: string }) {
  return (
    <p role="status" className="result-demo-notice">
      {children}
    </p>
  );
}

/* Playground ---------------------------------------------------------------- */

type KindSample = {
  title: string;
  apps: (state: ResultAppActionState) => ResultApp[];
  icon?: ReactNode;
  action: string;
  status: Record<ResultCardState, string>;
};

const weeklyApps = (state: ResultAppActionState): ResultApp[] => [
  {
    brand: 'slack',
    name: 'Slack',
    actions: [{ label: 'Posted the weekly update', state }],
  },
  {
    brand: 'google-sheets',
    name: 'Google Sheets',
    actions: [{ label: 'Read this week’s figures', state: 'completed' }],
  },
  {
    brand: 'github',
    name: 'GitHub',
    actions: [
      {
        label: 'Read merged changes for the weekly update',
        state: 'completed',
      },
    ],
  },
  {
    brand: 'google-docs',
    name: 'Google Docs',
    actions: [{ label: 'Saved the weekly update document', state }],
  },
  {
    brand: 'gmail',
    name: 'Gmail',
    actions: [{ label: 'Emailed the weekly summary', state }],
  },
];

const kindSamples: Record<ResultCardKind, KindSample> = {
  File: {
    title: 'Investor pitch',
    apps: state => [
      {
        brand: 'google-slides',
        name: 'Google Slides',
        actions: [
          { label: 'Created the investor pitch presentation', state },
          { label: 'Added the two pitch slides', state },
        ],
      },
    ],
    action: 'View slides',
    status: {
      default: 'Ready for review',
      loading: 'Checking save status',
      running: 'Saving to Google Slides',
      disabled: 'Access unavailable',
      error: 'Save not confirmed',
      success: 'Saved in Google Slides',
    },
  },
  Plan: {
    title: 'Prepare the investor update',
    apps: state => [
      {
        brand: 'google-slides',
        name: 'Google Slides',
        actions: [
          {
            label: 'Created the investor pitch presentation',
            state: 'completed',
          },
        ],
      },
      {
        brand: 'gmail',
        name: 'Gmail',
        actions: [{ label: 'Sent the investor update email', state }],
      },
    ],
    icon: <Tasks size={18} />,
    action: 'Open plan',
    status: {
      default: 'Waiting to start',
      loading: 'Checking plan status',
      running: 'Working on task 2 of 4',
      disabled: 'Plan unavailable',
      error: 'Stopped · A task failed',
      success: 'Presentation saved and email sent',
    },
  },
  Workflow: {
    title: 'Weekly team update',
    apps: weeklyApps,
    icon: <BranchDown size={18} />,
    action: 'View run',
    status: {
      default: 'Saved definition · Not a completed run',
      loading: 'Loading run details',
      running: 'Run in progress',
      disabled: 'Access unavailable',
      error: 'Run failed at Post to Slack',
      success: 'Update posted and emailed',
    },
  },
  Action: {
    title: 'Slack reply',
    apps: state => [
      {
        brand: 'slack',
        name: 'Slack',
        actions: [{ label: 'Reply to a thread', state }],
      },
    ],
    action: 'View Slack action',
    status: {
      default: 'Waiting for review',
      loading: 'Checking Slack action',
      running: 'Saving your decision',
      disabled: 'Access unavailable',
      error: 'Action not confirmed',
      success: 'Confirmed in Slack',
    },
  },
  Calendar: {
    title: 'Calendar read · 3 events',
    apps: state => [
      {
        brand: 'google-calendar',
        name: 'Google Calendar',
        actions: [{ label: 'Read 3 events', state }],
      },
    ],
    action: 'Open calendar',
    status: {
      default: 'Saved read · Not a pending action',
      loading: 'Checking calendar',
      running: 'Reading events',
      disabled: 'Access unavailable',
      error: 'Result unavailable',
      success: 'Saved read · Not a pending action',
    },
  },
  Table: {
    title: 'Q4 forecast',
    apps: () => [],
    icon: <Database size={18} />,
    action: 'Open Q4 forecast',
    status: {
      default: 'Table results ready.',
      loading: 'Checking table',
      running: 'Reading rows',
      disabled: 'Access unavailable',
      error: 'These fields have changed',
      success: '12 rows returned.',
    },
  },
  Activity: {
    title: 'Recorded activity',
    apps: state => [
      {
        brand: 'gmail',
        name: 'Gmail',
        actions: [
          { label: 'Searched the supplier inbox', state: 'completed' },
          { label: 'Drafted a reply to Northwind', state },
        ],
      },
      {
        brand: null,
        name: 'Connected apps',
        actions: [{ label: 'Looked up the supplier record', state }],
      },
    ],
    icon: <Command size={18} />,
    action: 'View activity',
    status: {
      default: '2 of 3 actions completed',
      loading: 'Checking activity',
      running: 'Actions in progress',
      disabled: 'Access unavailable',
      error: 'Some outcomes are unconfirmed',
      success: '3 of 3 actions completed',
    },
  },
  Agent: {
    title: 'Supplier follow-up',
    apps: state => [
      {
        brand: 'gmail',
        name: 'Gmail',
        actions: [{ label: 'Send follow-up emails to late suppliers', state }],
      },
    ],
    icon: <User size={18} />,
    action: 'Open agent',
    status: {
      default: 'Saved · Not running',
      loading: 'Checking agent',
      running: 'Working on 4 suppliers',
      disabled: 'Access unavailable',
      error: 'Agent stopped · Needs attention',
      success: 'Finished · 4 emails sent',
    },
  },
  Skill: {
    title: 'Summarize meeting notes',
    apps: () => [],
    icon: <Sparkle size={18} />,
    action: 'Open skill',
    status: {
      default: 'Draft · Not saved yet',
      loading: 'Checking skill',
      running: 'Saving skill',
      disabled: 'Access unavailable',
      error: 'Skill not saved',
      success: 'Saved to your skills',
    },
  },
};

const appStateFor: Record<ResultCardState, ResultAppActionState> = {
  default: 'pending',
  loading: 'unknown',
  running: 'running',
  disabled: 'pending',
  error: 'unknown',
  success: 'completed',
};

export function ResultCardPlayground() {
  const [kind, setKind] = useState<ResultCardKind>('File');
  const [state, setState] = useState<ResultCardState>('success');
  const [action, setAction] = useState(true);
  const [details, setDetails] = useState(false);
  const [notice, say] = useNotice();
  const sample = kindSamples[kind];
  const apps =
    state === 'disabled'
      ? sample.apps('pending').map(app => ({ ...app, actions: [] }))
      : sample.apps(appStateFor[state]);
  return (
    <section className="result-demo-frame" aria-label="Result card playground">
      <div className="result-demo-toolbar">
        <span>
          Kind
          <DocsSelect<ResultCardKind>
            label="Kind"
            value={kind}
            onValueChange={setKind}
            items={resultCardKindNames.map(value => ({
              value,
              label: value,
            }))}
          />
        </span>
        <span>
          State
          <DocsSelect<ResultCardState>
            label="State"
            value={state}
            onValueChange={setState}
            items={resultCardStateNames.map(value => ({
              value,
              label: value,
            }))}
          />
        </span>
        <label>
          <Switch size="sm" aria-label="Action" checked={action} onCheckedChange={setAction} />
          Action
        </label>
        <label>
          <Switch size="sm" aria-label="Details" checked={details} onCheckedChange={setDetails} />
          Details
        </label>
      </div>
      <div className="result-demo-stage" data-testid="playground-stage">
        <ResultCard
          title={sample.title}
          kind={kind}
          apps={apps}
          icon={sample.icon}
          status={sample.status[state]}
          state={state}
          action={
            action
              ? {
                  label: sample.action,
                  onClick: say(`${sample.action} pressed`),
                }
              : undefined
          }
        >
          {details && (
            <>
              <p className="result-demo-meta">2 of 4 tasks done · 38 tool calls left</p>
              <div className="result-demo-row">
                <Button size="sm" variant="outline" onClick={say('Pause plan')}>
                  Pause
                </Button>
                <Button size="sm" variant="ghost" onClick={say('Stop plan')}>
                  Stop
                </Button>
              </div>
            </>
          )}
        </ResultCard>
        <Notice>{notice}</Notice>
      </div>
    </section>
  );
}

/* States -------------------------------------------------------------------- */

const pitchApps: ResultApp[] = kindSamples.File.apps('completed');

const stateExamples = [
  { state: 'default', label: 'Default', status: 'Ready for review' },
  { state: 'loading', label: 'Loading', status: 'Checking save status' },
  { state: 'running', label: 'Running', status: 'Saving to Google Slides' },
  { state: 'disabled', label: 'Unavailable', status: 'Access unavailable' },
  { state: 'error', label: 'Error', status: 'Save not confirmed' },
  { state: 'success', label: 'Success', status: 'Saved in Google Slides' },
] satisfies { state: ResultCardState; label: string; status: string }[];

function stateApps(state: ResultCardState): ResultApp[] {
  if (state === 'success') return pitchApps;
  return [
    {
      brand: 'google-slides',
      name: 'Google Slides',
      actions:
        state === 'disabled'
          ? []
          : [
              {
                label: 'Create the investor pitch presentation',
                state:
                  state === 'error' || state === 'loading' ? 'unknown' : state === 'running' ? 'running' : 'pending',
              },
            ],
    },
  ];
}

export function ResultCardStates() {
  const [notice, say] = useNotice();
  return (
    <Frame title="States" note="The same file result through each state">
      <div className="result-demo-grid">
        {stateExamples.map(example => (
          <div key={example.state} data-state-sample={example.state}>
            <Labeled label={example.label}>
              <ResultCard
                title="Investor pitch"
                kind="File"
                apps={stateApps(example.state)}
                state={example.state}
                status={example.status}
                action={{
                  label: example.state === 'error' ? 'Check status' : 'Open in Canvas',
                  onClick: say(
                    example.state === 'error' ? 'Save still not confirmed, no write repeated' : 'Open in Canvas',
                  ),
                }}
              />
            </Labeled>
          </div>
        ))}
      </div>
      <Notice>{notice}</Notice>
    </Frame>
  );
}

/* Apps ---------------------------------------------------------------------- */

const investorUpdateApps: ResultApp[] = [
  {
    brand: 'google-slides',
    name: 'Google Slides',
    actions: [
      { label: 'Created the investor pitch presentation', state: 'completed' },
      { label: 'Added the two pitch slides', state: 'completed' },
    ],
  },
  {
    brand: 'gmail',
    name: 'Gmail',
    actions: [{ label: 'Sent the investor update email', state: 'completed' }],
  },
];

export function ResultCardApps() {
  const [notice, say] = useNotice();
  return (
    <Frame title="Apps used" note="Hover or focus a tile, then press Enter, to list its actions">
      <div className="result-demo-grid">
        <Labeled label="One app">
          <ResultCard
            title="Investor pitch"
            kind="File"
            apps={pitchApps}
            status="Saved in Google Slides"
            state="success"
            action={{ label: 'View slides', onClick: say('View slides') }}
          />
        </Labeled>
        <Labeled label="Two apps">
          <ResultCard
            title="Prepare the investor update"
            kind="Plan"
            apps={investorUpdateApps}
            status="Presentation saved and email sent"
            state="success"
            action={{ label: 'View plan', onClick: say('View plan') }}
          />
        </Labeled>
        <Labeled label="Five apps fold into +3">
          <ResultCard
            title="Weekly team update"
            kind="Workflow"
            apps={weeklyApps('completed')}
            status="Update posted and emailed"
            state="success"
            action={{ label: 'View result', onClick: say('View result') }}
          />
        </Labeled>
        <Labeled label="Repeated app merges into one tile">
          <ResultCard
            title="Supplier follow-up"
            kind="Activity"
            icon={<Command size={18} />}
            apps={[
              {
                brand: 'gmail',
                name: 'Gmail',
                actions: [{ label: 'Searched the supplier inbox', state: 'completed' }],
              },
              {
                brand: 'gmail',
                name: 'Gmail',
                actions: [{ label: 'Sent a reminder to Northwind', state: 'completed' }],
              },
            ]}
            status="2 of 2 actions completed"
            action={{ label: 'View activity', onClick: say('View activity') }}
          />
        </Labeled>
        <Labeled label="Apps without a brand">
          <ResultCard
            title="Ticket triage"
            kind="Activity"
            icon={<Command size={18} />}
            apps={[
              {
                brand: null,
                name: 'Atlassian',
                actions: [{ label: 'Searched Jira for open bugs', state: 'completed' }],
              },
              {
                brand: null,
                name: 'Connected apps',
                actions: [{ label: 'Read the on-call schedule', state: 'unknown' }],
              },
            ]}
            status="Some outcomes are unconfirmed"
            state="error"
            action={{ label: 'View activity', onClick: say('View activity') }}
          />
        </Labeled>
        <Labeled label="App with its own icon">
          <ResultCard
            title="Pipeline review"
            kind="Table"
            apps={[
              {
                brand: null,
                name: 'Pipeline',
                icon: <Database />,
                actions: [{ label: 'Read 24 open deals', state: 'completed' }],
              },
            ]}
            status="24 rows returned."
            action={{ label: 'Open Pipeline', onClick: say('Open Pipeline') }}
          />
        </Labeled>
        <Labeled label="No recorded actions">
          <ResultCard
            title="GitHub changes"
            kind="Action"
            apps={[{ brand: 'github', name: 'GitHub', actions: [] }]}
            status="Private details unavailable"
            action={{
              label: 'View GitHub changes',
              onClick: say('View GitHub changes'),
            }}
          />
        </Labeled>
        <Labeled label="No apps, icon tile">
          <ResultCard
            title="Supplier price sheet.xlsx"
            kind="File"
            apps={[]}
            icon={<FileText size={18} />}
            status="Saved in Files"
            state="success"
            action={{ label: 'View file', onClick: say('View file') }}
          />
        </Labeled>
        <Labeled label="No apps, no icon, no action">
          <ResultCard
            title="Quarterly planning notes with a long title that wraps onto a second line in narrow chats"
            kind="File"
            apps={[]}
            status="Saved in Files"
            state="success"
          />
        </Labeled>
      </div>
      <Notice>{notice}</Notice>
    </Frame>
  );
}

/* ResultAppActions ---------------------------------------------------------- */

const stateLabels: Record<ResultAppActionState, string> = {
  completed: 'Created the investor pitch presentation',
  pending: 'Send the investor update email',
  running: 'Saving the weekly update document',
  failed: 'Post to #investors',
  unknown: 'Append rows to Q4 forecast',
  blocked: 'Reply in the supplier thread',
  cancelled: 'Delete the draft event',
  skipped: 'Notify the on-call channel',
};

export function ResultAppActionsDemo() {
  const apps: ResultApp[] = [
    {
      brand: 'google-slides',
      name: 'Google Slides',
      actions: resultAppActionStateNames.slice(0, 4).map(state => ({ state, label: stateLabels[state] })),
    },
    {
      brand: 'google-sheets',
      name: 'Google Sheets',
      actions: resultAppActionStateNames.slice(4).map(state => ({ state, label: stateLabels[state] })),
    },
    { brand: null, name: 'Connected apps', actions: [] },
  ];
  return (
    <Frame title="Actions by app" note="ResultAppActions in a canvas panel, and without app names">
      <div className="result-demo-split">
        <div className="result-demo-panel" data-testid="app-actions-named">
          <h3 className="result-demo-panel-title">Actions by app</h3>
          <ResultAppActions apps={apps} />
        </div>
        <div className="result-demo-panel" data-testid="app-actions-plain">
          <h3 className="result-demo-panel-title">Slack actions</h3>
          <ResultAppActions
            apps={[
              {
                brand: 'slack',
                name: 'Slack',
                actions: [
                  { label: 'Posted the weekly update', state: 'completed' },
                  { label: 'Reply to a thread', state: 'pending' },
                ],
              },
            ]}
            showAppNames={false}
          />
        </div>
      </div>
    </Frame>
  );
}

/* Cloud recipes --------------------------------------------------------------- */

function Pick<Value extends string>({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: Value;
  onChange: (value: Value) => void;
  items: readonly (readonly [Value, string])[];
}) {
  return (
    <DocsSelect<Value>
      label={label}
      value={value}
      onValueChange={onChange}
      items={items.map(([v, l]) => ({ value: v, label: l }))}
    />
  );
}

type SlackOutcome = 'pending' | 'deciding' | 'sending' | 'sent' | 'unknown' | 'reauthorization-required' | 'expired';
function SlackActionRecipe() {
  const [outcome, setOutcome] = useState<SlackOutcome>('pending');
  const [notice, say] = useNotice();
  const status = {
    sent: 'Confirmed in Slack',
    unknown: 'Action not confirmed',
    pending: 'Waiting for review',
    deciding: 'Saving your decision',
    sending: 'Sending',
    'reauthorization-required': 'Action reauthorization-required',
    expired: 'Action expired',
  }[outcome];
  const state: ResultCardState =
    outcome === 'sent'
      ? 'success'
      : outcome === 'unknown' || outcome === 'reauthorization-required'
        ? 'error'
        : outcome === 'sending' || outcome === 'deciding'
          ? 'running'
          : 'default';
  const actionState: ResultAppActionState =
    outcome === 'sent'
      ? 'completed'
      : outcome === 'unknown'
        ? 'unknown'
        : outcome === 'sending'
          ? 'running'
          : outcome === 'reauthorization-required'
            ? 'blocked'
            : outcome === 'expired'
              ? 'cancelled'
              : 'pending';
  const apps: ResultApp[] = [
    {
      brand: 'slack',
      name: 'Slack',
      actions: [{ label: 'Reply to a thread', state: actionState }],
    },
  ];
  return (
    <Frame
      id="slack-action"
      title="Slack action"
      note="agents/slack-action · chat card and review canvas"
      controls={
        <Pick
          label="Slack outcome"
          value={outcome}
          onChange={setOutcome}
          items={[
            ['pending', 'Pending'],
            ['deciding', 'Deciding'],
            ['sending', 'Sending'],
            ['sent', 'Sent'],
            ['unknown', 'Unknown'],
            ['reauthorization-required', 'Reauthorize'],
            ['expired', 'Expired'],
          ]}
        />
      }
    >
      <Labeled label="Chat card">
        <ResultCard
          title="Slack reply"
          kind="Action"
          status={status}
          state={state}
          apps={apps}
          action={{
            label: 'View Slack action',
            onClick: say('View Slack action'),
          }}
        />
      </Labeled>
      <Labeled label="Review canvas, no action">
        <ResultCard title="Slack reply" kind="Action" status={status} state={state} apps={apps} />
        <p className="result-demo-meta">
          Destination #ops-weekly, thread 1718035200.000100 · Posts as your Slack account.
        </p>
        {outcome === 'pending' && (
          <div className="result-demo-row">
            <Button size="sm" onClick={say('Approve action')}>
              Approve action
            </Button>
            <Button size="sm" variant="outline" onClick={say('Reject action')}>
              Reject action
            </Button>
          </div>
        )}
      </Labeled>
      <Notice>{notice}</Notice>
    </Frame>
  );
}

type AtlassianProduct = 'jira' | 'confluence' | 'trello';
type Receipt = 'waiting' | 'approved' | 'succeeded' | 'failed' | 'uncertain' | 'rejected' | 'expired';
function AtlassianRecipe() {
  const [product, setProduct] = useState<AtlassianProduct>('jira');
  const [receipt, setReceipt] = useState<Receipt>('waiting');
  const label = {
    jira: 'Create issue',
    confluence: 'Update page',
    trello: 'Move card',
  }[product];
  const source = {
    jira: 'Acme Jira',
    confluence: 'Acme Wiki',
    trello: 'Launch board',
  }[product];
  const name = { jira: 'Jira', confluence: 'Confluence', trello: 'Trello' }[product];
  const status = {
    succeeded: 'Confirmed by provider',
    uncertain: 'Outcome not confirmed',
    failed: 'Action failed',
    rejected: 'Action rejected',
    expired: 'Review expired',
    approved: 'Approved · Not executed yet',
    waiting: 'Waiting for review',
  }[receipt];
  const state: ResultCardState =
    receipt === 'succeeded' ? 'success' : receipt === 'uncertain' || receipt === 'failed' ? 'error' : 'default';
  const actionState: ResultAppActionState =
    receipt === 'succeeded'
      ? 'completed'
      : receipt === 'uncertain'
        ? 'unknown'
        : receipt === 'failed'
          ? 'failed'
          : receipt === 'expired' || receipt === 'rejected'
            ? 'cancelled'
            : 'pending';
  return (
    <Frame
      id="atlassian"
      title="Atlassian write review"
      note="atlassian/operations · no action button"
      controls={
        <>
          <Pick
            label="Atlassian product"
            value={product}
            onChange={setProduct}
            items={[
              ['jira', 'Jira'],
              ['confluence', 'Confluence'],
              ['trello', 'Trello'],
            ]}
          />
          <Pick
            label="Atlassian receipt"
            value={receipt}
            onChange={setReceipt}
            items={[
              ['waiting', 'Waiting'],
              ['approved', 'Approved'],
              ['succeeded', 'Succeeded'],
              ['failed', 'Failed'],
              ['uncertain', 'Uncertain'],
              ['rejected', 'Rejected'],
              ['expired', 'Expired'],
            ]}
          />
        </>
      }
    >
      <ResultCard
        title={`${label} on ${source}`}
        kind="Action"
        status={status}
        state={state}
        apps={[{ brand: product, name, actions: [{ label, state: actionState }] }]}
      />
      <p className="result-demo-meta">
        These saved fields cannot be edited. Approval authorizes only this exact action.
      </p>
    </Frame>
  );
}

function ActivityRecipe() {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<'done' | 'running' | 'failed' | 'unknown'>('failed');
  const s = (done: ResultAppActionState) => (mode === 'done' ? 'completed' : done);
  const apps: ResultApp[] = [
    {
      brand: 'google-drive',
      name: 'Google Drive',
      actions: [
        {
          label: 'Searched Drive for “supplier contracts”',
          state: 'completed',
        },
      ],
    },
    {
      brand: 'gmail',
      name: 'Gmail',
      actions: [
        {
          label: 'Drafted a reply to Northwind',
          state: s(mode === 'running' ? 'running' : 'completed'),
        },
      ],
    },
    {
      brand: null,
      name: 'Atlassian',
      actions: [
        {
          label: 'Created issue OPS-412',
          state: s(mode === 'failed' ? 'failed' : mode === 'unknown' ? 'unknown' : 'completed'),
        },
      ],
    },
  ];
  const completed = apps.flatMap(app => app.actions).filter(a => a.state === 'completed').length;
  const status =
    mode === 'unknown'
      ? 'Some outcomes are unconfirmed'
      : mode === 'failed'
        ? `${completed} of 3 actions completed · Needs attention`
        : mode === 'running'
          ? 'Actions in progress'
          : `${completed} of 3 actions completed`;
  return (
    <Frame
      id="activity"
      title="Recorded activity"
      note="chat/activity-result-card · inline details without a canvas"
      controls={
        <Pick
          label="Activity outcome"
          value={mode}
          onChange={setMode}
          items={[
            ['done', 'Completed'],
            ['running', 'Running'],
            ['failed', 'Failed'],
            ['unknown', 'Unknown'],
          ]}
        />
      }
    >
      <ResultCard
        kind="Activity"
        title="Recorded activity"
        apps={apps}
        icon={<Command size={18} />}
        status={status}
        state={mode === 'unknown' || mode === 'failed' ? 'error' : mode === 'running' ? 'running' : 'default'}
        action={{
          label: expanded ? 'Hide activity' : 'View activity',
          onClick: () => setExpanded(v => !v),
        }}
      />
      {expanded && (
        <div className="result-demo-panel">
          <h3 className="result-demo-panel-title">Recorded activity</h3>
          <p className="result-demo-meta">
            These are recorded tool outcomes, not independent proof of a file save or delivery.
          </p>
          <ResultAppActions apps={apps} />
        </div>
      )}
    </Frame>
  );
}

function CalendarRecipe() {
  const [notice, say] = useNotice();
  return (
    <Frame id="calendar" title="Calendar read" note="chat/calendar-canvas">
      <ResultCard
        title="Calendar read · 3 events"
        kind="Calendar"
        status="Saved read · Not a pending action"
        state="success"
        apps={[
          {
            brand: 'google-calendar',
            name: 'Google Calendar',
            actions: [{ label: 'Read 3 events', state: 'completed' }],
          },
        ]}
        action={{ label: 'Open calendar', onClick: say('Open calendar') }}
      />
      <ResultCard
        title="Calendar result unavailable"
        kind="Calendar"
        status="Result unavailable"
        state="error"
        apps={[
          {
            brand: 'google-calendar',
            name: 'Google Calendar',
            actions: [{ label: 'Read calendar events', state: 'unknown' }],
          },
        ]}
        action={{ label: 'Open calendar', onClick: say('Open calendar') }}
      />
      <Notice>{notice}</Notice>
    </Frame>
  );
}

function FileRecipe() {
  const [notice, say] = useNotice();
  return (
    <Frame id="file" title="Created file" note="chat/file-mentions">
      <ResultCard
        title="Price comparison.xlsx"
        kind="File"
        apps={[]}
        icon={<FileText size={18} />}
        status="Saved in Files"
        state="success"
        action={{ label: 'View file', onClick: say('View file') }}
      />
      <Notice>{notice}</Notice>
    </Frame>
  );
}

type Batch = 'waiting' | 'request' | 'partial' | 'confirmed' | 'uncertain' | 'rejected' | 'private';
function GitHubRecipe() {
  const [batch, setBatch] = useState<Batch>('partial');
  const [notice, say] = useNotice();
  const ops = ['Create branch', 'Commit file changes', 'Open pull request'];
  const states: ResultAppActionState[] =
    batch === 'confirmed'
      ? ['completed', 'completed', 'completed']
      : batch === 'partial'
        ? ['completed', 'pending', 'pending']
        : batch === 'uncertain'
          ? ['completed', 'unknown', 'pending']
          : batch === 'rejected'
            ? ['failed', 'failed', 'failed']
            : ['pending', 'pending', 'pending'];
  const status = {
    request: 'Request in progress',
    uncertain: 'Some outcomes are unconfirmed',
    private: 'Private details unavailable',
    rejected: 'Action rejected',
    confirmed: '3 actions confirmed in GitHub',
    partial: '1 of 3 actions confirmed',
    waiting: 'Waiting for review',
  }[batch];
  const state: ResultCardState =
    batch === 'request'
      ? 'running'
      : batch === 'uncertain' || batch === 'rejected'
        ? 'error'
        : batch === 'confirmed'
          ? 'success'
          : 'default';
  return (
    <Frame
      id="github"
      title="GitHub changes"
      note="chat/github-batches"
      controls={
        <Pick
          label="GitHub batch"
          value={batch}
          onChange={setBatch}
          items={[
            ['waiting', 'Waiting'],
            ['request', 'Request pending'],
            ['partial', 'Partly confirmed'],
            ['confirmed', 'Confirmed'],
            ['uncertain', 'Unconfirmed'],
            ['rejected', 'Rejected'],
            ['private', 'Private'],
          ]}
        />
      }
    >
      <ResultCard
        id="github-batch:demo"
        title="GitHub changes"
        kind="Action"
        status={status}
        state={state}
        apps={[
          {
            brand: 'github',
            name: 'GitHub',
            actions: batch === 'private' ? [] : ops.map((label, i) => ({ label, state: states[i]! })),
          },
        ]}
        action={{
          label: 'View GitHub changes',
          onClick: say('View GitHub changes'),
        }}
      />
      <Notice>{notice}</Notice>
    </Frame>
  );
}

type Tone = 'draft' | 'active' | 'attention' | 'done' | 'failed';
function PlanRecipe() {
  const [tone, setTone] = useState<Tone>('active');
  const [notice, say] = useNotice();
  const status = {
    draft: 'Ready to start',
    active: 'Working',
    attention: 'Paused · Budget reached',
    done: 'Done',
    failed: 'Stopped · A task failed',
  }[tone];
  const progress = {
    draft: '0 of 4 tasks done',
    active: '2 of 4 tasks done',
    attention: '2 of 4 tasks done',
    done: '4 of 4 tasks done',
    failed: '3 of 4 tasks done · 1 failed',
  }[tone];
  const apps: ResultApp[] =
    tone === 'draft'
      ? []
      : [
          {
            brand: 'google-sheets',
            name: 'Google Sheets',
            actions: [{ label: 'Read Q4 pipeline', state: 'completed' }],
          },
          {
            brand: 'google-docs',
            name: 'Google Docs',
            actions: [
              {
                label: 'Wrote the board summary',
                state: tone === 'done' ? 'completed' : tone === 'failed' ? 'failed' : 'running',
              },
            ],
          },
        ];
  return (
    <Frame
      id="plan"
      title="Plan reference"
      note="chat/plans · children for progress and controls"
      controls={
        <Pick
          label="Plan tone"
          value={tone}
          onChange={setTone}
          items={[
            ['draft', 'Draft'],
            ['active', 'Active'],
            ['attention', 'Attention'],
            ['done', 'Done'],
            ['failed', 'Failed'],
          ]}
        />
      }
    >
      <ResultCard
        title="Prepare the board summary"
        kind="Plan"
        apps={apps}
        icon={<Tasks size={18} />}
        status={status}
        state={tone === 'done' ? 'success' : tone === 'failed' ? 'error' : tone === 'active' ? 'running' : 'default'}
        action={{ label: 'Open plan', onClick: say('Open plan') }}
      >
        <p className="result-demo-meta result-demo-tabular">{progress}</p>
        {(tone === 'active' || tone === 'attention' || tone === 'draft') && (
          <div className="result-demo-row">
            {tone === 'draft' && (
              <Button size="sm" onClick={say('Start plan')}>
                Start
              </Button>
            )}
            {tone === 'active' && (
              <Button size="sm" variant="outline" onClick={say('Pause plan')}>
                Pause
              </Button>
            )}
            {tone === 'attention' && (
              <Button size="sm" onClick={say('Raise budget and resume')}>
                Raise budget and resume
              </Button>
            )}
            {tone !== 'draft' && (
              <Button size="sm" variant="ghost" onClick={say('Stop plan')}>
                Stop
              </Button>
            )}
          </div>
        )}
      </ResultCard>
      <Notice>{notice}</Notice>
    </Frame>
  );
}

function RecordsRecipe() {
  const [notice, say] = useNotice();
  return (
    <Frame id="records" title="Table results" note="chat/records-canvas">
      <ResultCard
        title="Supplier contacts"
        kind="Table"
        apps={[]}
        icon={<Database size={18} />}
        state="success"
        status="12 rows returned."
        action={{
          label: 'Open Supplier contacts',
          onClick: say('Open Supplier contacts'),
        }}
      />
      <ResultCard
        title="Supplier contacts"
        kind="Table"
        apps={[]}
        icon={<Database size={18} />}
        state="success"
        status="1 row added and 3 rows updated in Supplier contacts."
        action={{
          label: 'View changed rows',
          onClick: say('View changed rows'),
        }}
      />
      <Notice>{notice}</Notice>
    </Frame>
  );
}

const mockExamples = [
  {
    id: 'file',
    title: 'Investor pitch',
    kind: 'File',
    status: 'Saved in Google Slides',
    apps: pitchApps,
    actionLabel: 'View slides',
    description: 'The presentation is saved. Open the result to review it.',
  },
  {
    id: 'plan',
    title: 'Prepare the investor update',
    kind: 'Plan',
    status: 'Presentation saved and email sent',
    apps: investorUpdateApps,
    actionLabel: 'View plan',
    description: 'The presentation is ready and the investor email has been sent.',
  },
  {
    id: 'workflow',
    title: 'Weekly team update',
    kind: 'Workflow',
    status: 'Update posted and emailed',
    apps: weeklyApps('completed'),
    actionLabel: 'View result',
    description: 'The weekly update is saved, shared with the team, and emailed.',
  },
] satisfies {
  id: string;
  title: string;
  kind: ResultCardKind;
  status: string;
  apps: ResultApp[];
  actionLabel: string;
  description: string;
}[];

function MockRecipe() {
  const [selected, setSelected] = useState<(typeof mockExamples)[number] | null>(null);
  return (
    <Frame id="mock" title="Results in chat with a detail panel" note="chat/result-cards-mock">
      <div className="result-demo-split">
        <div className="result-demo-stack">
          {mockExamples.map(example => (
            <Labeled key={example.id} label={`${example.apps.length} ${example.apps.length === 1 ? 'app' : 'apps'}`}>
              <ResultCard
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
            </Labeled>
          ))}
        </div>
        <div className="result-demo-panel" aria-label="Result details" role="region">
          {selected ? (
            <>
              <p className="result-demo-success">{selected.status}</p>
              <h3 className="result-demo-panel-heading">{selected.title}</h3>
              <p>{selected.description}</p>
              <h4 className="result-demo-panel-title">Actions by app</h4>
              <ResultAppActions apps={selected.apps} />
              <p className="result-demo-meta">Seeded example, not a live execution receipt.</p>
            </>
          ) : (
            <p className="result-demo-meta">Open a result to see its actions by app.</p>
          )}
        </div>
      </div>
    </Frame>
  );
}

type WorkflowRef = 'definition' | 'draft' | 'run';
function WorkflowCanvasRecipe() {
  const [notice, say] = useNotice();
  const refs: [WorkflowRef, string, string][] = [
    ['definition', 'Saved definition · Not a completed run', 'View workflow'],
    ['draft', 'Draft · Not saved yet', 'View workflow'],
    ['run', 'Run details available', 'View run'],
  ];
  return (
    <Frame id="workflow-canvas" title="Workflow references" note="chat/workflow-canvas">
      {refs.map(([kind, status, label]) => (
        <ResultCard
          key={kind}
          title="Weekly team update"
          kind="Workflow"
          apps={[]}
          icon={<BranchDown size={18} />}
          status={status}
          action={{ label, onClick: say(label) }}
        />
      ))}
      <Notice>{notice}</Notice>
    </Frame>
  );
}

type GoogleOp = 'slides' | 'docs' | 'sheets' | 'drive' | 'gmail' | 'calendar';
type GoogleStatus = 'review' | 'approved' | 'executing' | 'succeeded' | 'failed' | 'unknown' | 'rejected' | 'expired';
function GoogleRecipe() {
  const [op, setOp] = useState<GoogleOp>('slides');
  const [status, setStatus] = useState<GoogleStatus>('review');
  const [notice, say] = useNotice();
  const ops = {
    slides: {
      brand: 'google-slides',
      name: 'Google Slides',
      title: 'Investor pitch',
      label: 'Create a presentation',
    },
    docs: {
      brand: 'google-docs',
      name: 'Google Docs',
      title: 'Board summary',
      label: 'Create a document',
    },
    sheets: {
      brand: 'google-sheets',
      name: 'Google Sheets',
      title: 'Append rows to Q4 forecast',
      label: 'Append rows to a sheet',
    },
    drive: {
      brand: 'google-drive',
      name: 'Google Drive',
      title: 'Move Supplier contracts',
      label: 'Move a file',
    },
    gmail: {
      brand: 'gmail',
      name: 'Gmail',
      title: 'Send email to Northwind',
      label: 'Send an email',
    },
    calendar: {
      brand: 'google-calendar',
      name: 'Google Calendar',
      title: 'Create event · Supplier review',
      label: 'Create an event',
    },
  } as const;
  const o = ops[op];
  const text = {
    succeeded: 'Confirmed by Google',
    unknown: 'Outcome not confirmed',
    failed: 'Action failed',
    executing: 'Action in progress',
    rejected: 'Rejected',
    expired: 'Review expired',
    approved: 'Approved · Not executed yet',
    review: 'Waiting for review',
  }[status];
  const state: ResultCardState =
    status === 'succeeded'
      ? 'success'
      : status === 'failed' || status === 'unknown'
        ? 'error'
        : status === 'executing'
          ? 'running'
          : 'default';
  const actionState: ResultAppActionState =
    status === 'succeeded'
      ? 'completed'
      : status === 'failed'
        ? 'failed'
        : status === 'unknown'
          ? 'unknown'
          : status === 'executing'
            ? 'running'
            : status === 'expired' || status === 'rejected'
              ? 'cancelled'
              : 'pending';
  const action =
    op === 'calendar' ? 'Open calendar action' : status === 'review' ? 'Review in Canvas' : 'Open in Canvas';
  return (
    <Frame
      id="google"
      title="Google action"
      note="google/result-card · Action and Calendar kinds"
      controls={
        <>
          <Pick
            label="Google app"
            value={op}
            onChange={setOp}
            items={[
              ['slides', 'Slides'],
              ['docs', 'Docs'],
              ['sheets', 'Sheets'],
              ['drive', 'Drive'],
              ['gmail', 'Gmail'],
              ['calendar', 'Calendar'],
            ]}
          />
          <Pick
            label="Google status"
            value={status}
            onChange={setStatus}
            items={[
              ['review', 'Review'],
              ['approved', 'Approved'],
              ['executing', 'Executing'],
              ['succeeded', 'Succeeded'],
              ['failed', 'Failed'],
              ['unknown', 'Unknown'],
              ['rejected', 'Rejected'],
              ['expired', 'Expired'],
            ]}
          />
        </>
      }
    >
      <ResultCard
        id={`google-proposal:${op}`}
        title={o.title}
        kind={op === 'calendar' ? 'Calendar' : 'Action'}
        status={text}
        state={state}
        apps={[
          {
            brand: o.brand,
            name: o.name,
            actions: [{ label: o.label, state: actionState }],
          },
        ]}
        action={{ label: action, onClick: say(action) }}
      />
      <Notice>{notice}</Notice>
    </Frame>
  );
}

type Run = 'none' | 'running' | 'completed' | 'failed' | 'blocked';
function WorkflowViewerRecipe() {
  const [run, setRun] = useState<Run>('running');
  const step = (i: number): ResultAppActionState =>
    run === 'none'
      ? 'pending'
      : run === 'completed'
        ? i === 3
          ? 'skipped'
          : 'completed'
        : i < 2
          ? 'completed'
          : i === 2
            ? run === 'running'
              ? 'running'
              : run === 'failed'
                ? 'failed'
                : 'unknown'
            : 'pending';
  const nodes: ResultApp[] = [
    {
      brand: 'google-sheets',
      name: 'Google Sheets',
      actions: [{ label: 'Read this week’s figures', state: step(0) }],
    },
    {
      brand: 'github',
      name: 'GitHub',
      actions: [{ label: 'List merged pull requests', state: step(1) }],
    },
    {
      brand: 'slack',
      name: 'Slack',
      actions: [{ label: 'Post the weekly update', state: step(2) }],
    },
    {
      brand: 'gmail',
      name: 'Gmail',
      actions: [{ label: 'Email the summary to leads', state: step(3) }],
    },
  ];
  const status = {
    none: 'Active · Revision 4',
    running: 'Run in progress',
    completed: 'Run completed',
    failed: 'Run failed',
    blocked: 'Run blocked',
  }[run];
  return (
    <Frame
      id="workflow-viewer"
      title="Workflow viewer header"
      note="workflows/workflow-viewer · no action, step states"
      controls={
        <Pick
          label="Workflow run"
          value={run}
          onChange={setRun}
          items={[
            ['none', 'Definition'],
            ['running', 'Running'],
            ['completed', 'Completed'],
            ['failed', 'Failed'],
            ['blocked', 'Blocked'],
          ]}
        />
      }
    >
      <ResultCard
        title="Weekly team update"
        kind="Workflow"
        status={status}
        state={
          run === 'completed'
            ? 'success'
            : run === 'failed' || run === 'blocked'
              ? 'error'
              : run === 'running'
                ? 'running'
                : 'default'
        }
        icon={<BranchDown size={18} />}
        apps={nodes}
      />
      <p className="result-demo-meta">
        {run === 'none' ? '4 steps' : 'Revision 4'} · Definition only. A saved workflow does not confirm a run or
        delivery.
      </p>
    </Frame>
  );
}

export function ResultCardRecipes() {
  return (
    <div className="result-demo-recipes">
      <SlackActionRecipe />
      <AtlassianRecipe />
      <ActivityRecipe />
      <CalendarRecipe />
      <FileRecipe />
      <GitHubRecipe />
      <PlanRecipe />
      <RecordsRecipe />
      <MockRecipe />
      <WorkflowCanvasRecipe />
      <GoogleRecipe />
      <WorkflowViewerRecipe />
    </div>
  );
}
