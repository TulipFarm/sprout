import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRotate } from 'reicon-react/icons/ArrowRotate';
import { BookOpen } from 'reicon-react/icons/BookOpen';
import { Command } from 'reicon-react/icons/Command';
import { Database } from 'reicon-react/icons/Database';
import { Document } from 'reicon-react/icons/Document';
import { Globe } from 'reicon-react/icons/Globe';
import { Plug } from 'reicon-react/icons/Plug';
import { Sparkle } from 'reicon-react/icons/Sparkle';
import { Users } from 'reicon-react/icons/Users';
import { BrandIcon, type Brand } from '@tulipfarm/sprout/brand-icon';
import { Button } from '@tulipfarm/sprout/button';
import { CanvasSection } from '@tulipfarm/sprout/canvas';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@tulipfarm/sprout/collapsible';
import { ResultAppActions, ResultCard, type ResultApp } from '@tulipfarm/sprout/result-card';
import { Switch } from '@tulipfarm/sprout/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@tulipfarm/sprout/tooltip';
import {
  ActivityPanel,
  ToolActivity,
  toolActivityStatusNames,
  toolActivityVariantNames,
  type ToolActivityItem,
  type ToolActivitySourceIcon,
  type ToolActivityStatus,
  type ToolActivityVariant,
} from '@tulipfarm/sprout/tool-activity';
import DocsSelect from './DocsSelect';
import '../styles/tool-activity-demo.css';

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
  id: string;
}) {
  return (
    <section className="tool-demo-frame" aria-label={title} data-demo={id}>
      <div className="tool-demo-bar">
        <div className="tool-demo-bar-text">
          <span className="tool-demo-bar-title">{title}</span>
          {note && <span className="tool-demo-note">{note}</span>}
        </div>
        {controls && <div className="tool-demo-controls">{controls}</div>}
      </div>
      <div className="tool-demo-body">{children}</div>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label>
      <Switch size="sm" aria-label={label} checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}

const brand = (name: Brand) => <BrandIcon brand={name} size="inline" />;
const icons = {
  table: <Database size={14} />,
  knowledge: <BookOpen size={14} />,
  page: <BookOpen size={14} />,
  web: <Globe size={14} />,
  fetch: <Document size={14} />,
  agent: <Users size={14} />,
  mcp: <Plug size={14} />,
  skill: <Sparkle size={14} />,
};

// Local letter tiles stand in for page icons, so the docs never call an icon service.
function tile(letter: string, fill: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect width="20" height="20" rx="4" fill="${fill}"/><text x="10" y="14.5" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="#fff" text-anchor="middle">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
const pageIcons: Record<string, string> = {
  'www.ons.gov.uk': tile('O', '#206095'),
  'www.bls.gov': tile('B', '#112e51'),
  'en.wikipedia.org': tile('W', '#3a3a3a'),
};
const sourceIcon: ToolActivitySourceIcon = url => pageIcons[new URL(url).hostname];

const webSearch: ToolActivityItem = {
  id: 'web-search',
  label: 'Searched the web',
  status: 'completed',
  visual: icons.web,
  query: 'UK services inflation September 2026',
  urls: [
    'https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/consumerpriceinflation/september2026',
    'https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/2026/september-2026',
    'https://www.bls.gov/news.release/cpi.nr0.htm',
    'https://en.wikipedia.org/wiki/Inflation_in_the_United_Kingdom',
    'https://www.ft.com/content/services-inflation-september',
    'https://www.reuters.com/markets/europe/uk-inflation-holds-steady-2026-10-15/',
  ],
  failedUrls: ['https://www.ft.com/content/services-inflation-september'],
  sources: [
    {
      url: 'https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/consumerpriceinflation/september2026',
      title: 'Consumer price inflation, UK: September 2026',
    },
    {
      url: 'https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/2026/september-2026',
      title: 'Monetary Policy Summary, September 2026',
    },
    {
      url: 'https://www.bls.gov/news.release/cpi.nr0.htm',
      title: 'Consumer Price Index Summary',
    },
    {
      url: 'https://en.wikipedia.org/wiki/Inflation_in_the_United_Kingdom',
      title: 'Inflation in the United Kingdom',
    },
    {
      url: 'https://www.reuters.com/markets/europe/uk-inflation-holds-steady-2026-10-15/',
      title: '  ',
    },
  ],
};

function KnowledgeDetails() {
  return (
    <Collapsible>
      <CollapsibleTrigger render={<Button variant="link" size="sm" />}>Details</CollapsibleTrigger>
      <CollapsibleContent>
        <ol aria-label="Knowledge branches" className="tool-demo-branches">
          <li>
            <p>Branch 1: Found</p>
            <p>Supplier terms 2026: 3 passages. Full document returned.</p>
          </li>
          <li>
            <p>Branch 2: Timed out</p>
            <p>Northwind contract: 1 passage. Some sections were not returned.</p>
          </li>
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* Model receipt: one tool, every status ------------------------------------ */

export function ToolActivityReceipt() {
  const [status, setStatus] = useState<ToolActivityStatus>('running');
  return (
    <Frame
      id="receipt"
      title="Agent request receipt"
      note="One Slack tool call with its live status"
      controls={
        <DocsSelect<ToolActivityStatus>
          label="Tool status"
          value={status}
          onValueChange={setStatus}
          items={toolActivityStatusNames.map(value => ({
            value,
            label: value,
          }))}
        />
      }
    >
      <div className="tool-demo-receipt">
        <p className="tool-demo-muted">
          Request{' '}
          {status === 'failed' || status === 'blocked' ? 'failed' : status === 'completed' ? 'completed' : 'running'}.
          Tool {status}.
        </p>
        <ToolActivity
          items={[
            {
              id: 'turn-41',
              label: 'Post to #launch-updates',
              visual: brand('slack'),
              status,
            },
          ]}
        />
      </div>
    </Frame>
  );
}

/* Collapsible: every status, as in the internal playground -------------------- */

export function ToolActivityStatuses() {
  const [active, setActive] = useState(true);
  const [retried, setRetried] = useState(false);
  const items: ToolActivityItem[] = [
    {
      id: 'gmail',
      label: 'Searched the supplier inbox',
      status: 'completed',
      visual: brand('gmail'),
    },
    {
      id: 'search',
      label: 'Searched the web',
      status: 'completed',
      visual: icons.web,
      query: 'UK inflation September 2026',
      urls: [
        'https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/consumerpriceinflation/september2026',
        'https://www.bls.gov/news.release/cpi.nr0.htm',
        'https://en.wikipedia.org/wiki/Inflation_in_the_United_Kingdom',
      ],
      sources: [
        {
          url: 'https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/consumerpriceinflation/september2026',
          title: 'Consumer price inflation, UK: September 2026',
        },
        { url: 'https://www.bls.gov/news.release/cpi.nr0.htm', title: 'Consumer Price Index Summary' },
        {
          url: 'https://en.wikipedia.org/wiki/Inflation_in_the_United_Kingdom',
          title: 'Inflation in the United Kingdom',
        },
      ],
    },
    {
      id: 'fetch',
      label: 'Read the inflation bulletin',
      status: 'completed',
      visual: icons.fetch,
      urls: ['https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/consumerpriceinflation/september2026'],
      sources: [
        {
          url: 'https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/consumerpriceinflation/september2026',
          title: 'Consumer price inflation, UK: September 2026',
        },
      ],
    },
    {
      id: 'forecast',
      label: 'Reading the Q4 forecast table',
      status: 'running',
      visual: icons.table,
    },
    {
      id: 'send',
      label: 'Send the follow-up to Northwind',
      status: 'waiting',
      visual: brand('gmail'),
      detail: 'Waiting for your approval before it sends.',
    },
    {
      id: 'slides',
      label: 'Update the investor pitch',
      status: 'queued',
      visual: brand('google-slides'),
    },
    {
      id: 'finance',
      label: 'Read #finance',
      status: 'blocked',
      visual: brand('slack'),
      detail: 'Access denied. Ask an administrator to review your permissions.',
    },
    {
      id: 'crm',
      label: 'Update the Northwind record',
      status: retried ? 'completed' : 'failed',
      visual: brand('hubspot'),
      detail: retried ? 'Retried locally. Nothing was sent.' : 'The action failed. Retry, or check the app connection.',
      action: retried ? undefined : (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon-xs" aria-label="Retry update" onClick={() => setRetried(true)}>
                <ArrowRotate aria-hidden="true" />
              </Button>
            }
          />
          <TooltipContent>Retry update</TooltipContent>
        </Tooltip>
      ),
    },
    {
      id: 'standup',
      label: 'Post the weekly update',
      status: 'cancelled',
      visual: brand('slack'),
    },
    {
      id: 'email',
      label: 'Send follow-up emails to late suppliers',
      status: 'unknown',
      visual: brand('gmail'),
      detail: 'The outcome is unconfirmed. Check the action status before requesting it again.',
    },
  ];
  return (
    <Frame
      id="statuses"
      title="Every status"
      note="Retry is local; nothing is sent"
      controls={
        <>
          <Toggle label="Reply working" checked={active} onChange={setActive} />
          <Button variant="ghost" size="sm" disabled={!retried} onClick={() => setRetried(false)}>
            Reset retry
          </Button>
        </>
      }
    >
      <ToolActivity
        items={
          active
            ? items
            : items.map(item =>
                item.status === 'running'
                  ? {
                      ...item,
                      status: 'completed',
                      label: 'Read the Q4 forecast table',
                    }
                  : item,
              )
        }
        active={active}
        sourceIcon={sourceIcon}
      />
    </Frame>
  );
}

/* Transcript: a chat reply ---------------------------------------------------- */

type ReplyStage = 'thinking' | 'searching' | 'reading' | 'settled' | 'attention';
const replyStages: { value: ReplyStage; label: string }[] = [
  { value: 'thinking', label: 'Thinking, no tools yet' },
  { value: 'searching', label: 'Searching the web' },
  { value: 'reading', label: 'Reading knowledge' },
  { value: 'settled', label: 'Settled' },
  { value: 'attention', label: 'Needs attention' },
];

function replyItems(stage: ReplyStage): ToolActivityItem[] {
  if (stage === 'thinking') return [];
  if (stage === 'searching')
    return [
      {
        ...webSearch,
        label: 'Searching the web',
        status: 'running',
        urls: webSearch.urls?.slice(0, 2),
        failedUrls: [],
      },
    ];
  const knowledge: ToolActivityItem = {
    id: 'knowledge',
    label: stage === 'reading' ? 'Reading supplier knowledge' : 'Read supplier knowledge',
    status: stage === 'reading' ? 'running' : 'completed',
    visual: icons.knowledge,
    detail: stage === 'reading' ? undefined : 'Found 4 passages in 2 documents.',
    details: stage === 'reading' ? undefined : <KnowledgeDetails />,
  };
  if (stage === 'attention')
    return [
      {
        ...webSearch,
        label: 'Web search failed',
        status: 'failed',
        detail: 'Some retrieval failed. Available sources are shown; retry for missing coverage.',
      },
      knowledge,
      {
        id: 'page',
        label: 'Page read',
        status: 'unknown',
        visual: icons.page,
        detail: 'The outcome is unconfirmed. Check the action status before requesting it again.',
      },
    ];
  return [webSearch, knowledge];
}

export function ToolActivityTranscript() {
  const [stage, setStage] = useState<ReplyStage>('settled');
  const [toggles, setToggles] = useState(0);
  const working = stage === 'thinking' || stage === 'searching' || stage === 'reading';
  const activityLabel =
    stage === 'thinking'
      ? null
      : stage === 'searching'
        ? 'Searching the web'
        : stage === 'reading'
          ? 'Reading supplier knowledge'
          : undefined;
  return (
    <Frame
      id="transcript"
      title="Chat reply"
      note="Starts closed under the reply; opening it pauses follow-latest"
      controls={
        <DocsSelect<ReplyStage> label="Reply stage" value={stage} onValueChange={setStage} items={replyStages} />
      }
    >
      <div className="tool-demo-chat">
        <p className="tool-demo-prompt">Is UK services inflation still above 5%? Check our supplier terms too.</p>
        <ToolActivity
          key={stage === 'thinking' ? 'thinking' : 'turn'}
          variant="transcript"
          items={replyItems(stage)}
          active={working}
          activityLabel={activityLabel}
          sourceIcon={sourceIcon}
          onToggle={() => setToggles(value => value + 1)}
        />
        {!working && (
          <p className="tool-demo-answer">
            Services inflation was 5.1% in September, down from 5.3%. Northwind’s terms allow a price review above 5%.
          </p>
        )}
        <p role="status" className="tool-demo-notice">
          {toggles
            ? `Following latest paused · toggled ${toggles} ${toggles === 1 ? 'time' : 'times'}`
            : 'Following the latest message'}
        </p>
      </div>
    </Frame>
  );
}

/* Stepper in an activity panel ------------------------------------------------ */

const liveSteps: Omit<ToolActivityItem, 'status'>[] = [
  { id: 's1', label: 'Read the Q4 forecast table', visual: icons.table },
  { id: 's2', label: 'Searched the supplier inbox', visual: brand('gmail') },
  { id: 's3', label: 'Looked up the Northwind record', visual: icons.mcp },
  {
    id: 's4',
    label: 'Asked the finance agent for margins',
    visual: icons.agent,
  },
  {
    id: 's5',
    label: 'Drafted the supplier update',
    visual: brand('google-docs'),
  },
  {
    id: 's6',
    label: 'Shared the draft in #procurement',
    visual: brand('slack'),
  },
];
const olderSteps: ToolActivityItem[] = [
  {
    id: 'o1',
    label: 'Loaded the procurement skill',
    status: 'completed',
    visual: icons.skill,
  },
  {
    id: 'o2',
    label: 'Read last quarter’s supplier review',
    status: 'completed',
    visual: brand('google-docs'),
  },
  {
    id: 'o3',
    label: 'Listed open purchase orders',
    status: 'completed',
    visual: icons.table,
  },
];

export function ToolActivityStepper() {
  const [count, setCount] = useState(3);
  const [working, setWorking] = useState(true);
  const [collapseWhenDone, setCollapseWhenDone] = useState(true);
  const [older, setOlder] = useState<ToolActivityItem[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const [olderError, setOlderError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const loadOlder = useCallback(() => {
    setLoadingOlder(true);
    setOlderError(false);
    timer.current = setTimeout(() => {
      setLoadingOlder(false);
      if (failNext) {
        setOlderError(true);
        setFailNext(false);
      } else setOlder(olderSteps);
    }, 700);
  }, [failNext]);
  const current = liveSteps.slice(0, count).map((step, index) => ({
    ...step,
    status: (working && index === count - 1 ? 'running' : 'completed') as ToolActivityStatus,
  }));
  // Newest first, as the stream delivers them; the stepper shows them oldest first.
  const items = [...current.reverse(), ...older.slice().reverse()];
  const activityLabel = working ? current[0]?.label : null;
  return (
    <Frame
      id="stepper"
      title="Agent run"
      note="Scroll to the top of the timeline to load earlier steps"
      controls={
        <>
          <Toggle label="Working" checked={working} onChange={setWorking} />
          <Toggle label="Collapse when done" checked={collapseWhenDone} onChange={setCollapseWhenDone} />
          <Toggle label="Fail next load" checked={failNext} onChange={setFailNext} />
          <Button
            variant="outline"
            size="sm"
            disabled={count >= liveSteps.length}
            onClick={() => {
              setWorking(true);
              setCount(value => value + 1);
            }}
          >
            Add step
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearTimeout(timer.current);
              setCount(3);
              setWorking(true);
              setOlder([]);
              setLoadingOlder(false);
              setOlderError(false);
            }}
          >
            Reset
          </Button>
        </>
      }
    >
      <div className="tool-demo-pane">
        <ActivityPanel working={working} activityLabel={activityLabel} hasResult collapseWhenDone={collapseWhenDone}>
          <ToolActivity
            items={items}
            variant="stepper"
            label="Agent steps"
            hasOlder={!older.length}
            loadingOlder={loadingOlder}
            olderError={olderError}
            onLoadOlder={loadOlder}
            onRetryOlder={loadOlder}
          />
        </ActivityPanel>
        <div className="tool-demo-result">
          <p className="tool-demo-result-title">Supplier update</p>
          <p>
            {working
              ? 'The draft appears here when the run finishes.'
              : 'Northwind and Fieldline are late on 4 orders. The draft asks both for revised dates by Friday.'}
          </p>
        </div>
      </div>
    </Frame>
  );
}

/* Recorded activity behind a result card -------------------------------------- */

const recorded: (ToolActivityItem & { app: Brand | null })[] = [
  {
    id: 'r1',
    app: 'gmail',
    label: 'Searched the supplier inbox',
    status: 'completed',
    visual: brand('gmail'),
  },
  {
    id: 'r2',
    app: 'gmail',
    label: 'Drafted a reply to Northwind',
    status: 'completed',
    visual: brand('gmail'),
  },
  {
    id: 'r3',
    app: null,
    label: 'Looked up the supplier record',
    status: 'unknown',
    visual: icons.mcp,
    detail: 'The outcome is unconfirmed. Check the action status before requesting it again.',
  },
  {
    id: 'r4',
    app: 'slack',
    label: 'Posted to #procurement',
    status: 'failed',
    visual: brand('slack'),
    detail: 'The action failed. Retry, or check the app connection.',
  },
];

function recordedApps(): ResultApp[] {
  const state = (status: ToolActivityStatus) => (status === 'queued' || status === 'waiting' ? 'pending' : status);
  return [
    {
      brand: 'gmail',
      name: 'Gmail',
      actions: recorded
        .filter(item => item.app === 'gmail')
        .map(item => ({ label: item.label, state: state(item.status) })),
    },
    {
      brand: null,
      name: 'Connected apps',
      actions: recorded
        .filter(item => item.app === null)
        .map(item => ({ label: item.label, state: state(item.status) })),
    },
    {
      brand: 'slack',
      name: 'Slack',
      actions: recorded
        .filter(item => item.app === 'slack')
        .map(item => ({ label: item.label, state: state(item.status) })),
    },
  ];
}

export function ToolActivityRecorded() {
  const [expanded, setExpanded] = useState(false);
  const completed = recorded.filter(item => item.status === 'completed').length;
  return (
    <Frame id="recorded" title="Recorded activity" note="A result card opens the stepper timeline">
      <div className="tool-demo-stack">
        <ResultCard
          kind="Activity"
          title="Recorded activity"
          apps={recordedApps()}
          icon={<Command size={18} />}
          status="Some outcomes are unconfirmed"
          state="error"
          action={{
            label: expanded ? 'Hide activity' : 'View activity',
            onClick: () => setExpanded(value => !value),
          }}
        />
        {expanded && (
          <CanvasSection
            title="Recorded activity"
            meta={`${completed} of ${recorded.length} actions completed. These are recorded tool outcomes, not independent proof of a file save or delivery.`}
          >
            <ResultAppActions apps={recordedApps()} />
            <Collapsible className="tool-demo-disclosure">
              <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>Activity details</CollapsibleTrigger>
              <CollapsibleContent>
                {/* Records arrive oldest first; the stepper takes newest first. */}
                <ToolActivity items={recorded.slice().reverse()} variant="stepper" />
              </CollapsibleContent>
            </Collapsible>
          </CanvasSection>
        )}
      </div>
    </Frame>
  );
}

/* Variants and empty states --------------------------------------------------- */

export function ToolActivityVariants() {
  const [variant, setVariant] = useState<ToolActivityVariant>('collapsible');
  const items: ToolActivityItem[] = [
    {
      id: 'v1',
      label: 'Read the Q4 forecast table',
      status: 'completed',
      visual: icons.table,
    },
    {
      id: 'v2',
      label: 'Searched the supplier inbox',
      status: 'completed',
      visual: brand('gmail'),
    },
    {
      id: 'v3',
      label: 'Read #finance',
      status: 'blocked',
      visual: brand('slack'),
      detail: 'Access denied. Ask an administrator to review your permissions.',
    },
  ];
  return (
    <Frame
      id="variants"
      title="Variants"
      note="The same settled run in each variant"
      controls={
        <DocsSelect<ToolActivityVariant>
          label="Variant"
          value={variant}
          onValueChange={setVariant}
          items={toolActivityVariantNames.map(value => ({
            value,
            label: value,
          }))}
        />
      }
    >
      <ToolActivity key={variant} items={items} variant={variant} />
    </Frame>
  );
}

export function ToolActivityEmpty() {
  return (
    <Frame id="empty" title="Before any tool runs" note="With no items, only an active transcript shows progress">
      <div className="tool-demo-empty">
        <div>
          <p className="tool-demo-label">Transcript, active</p>
          <ToolActivity variant="transcript" items={[]} active />
        </div>
        <div>
          <p className="tool-demo-label">Transcript, active, with a label</p>
          <ToolActivity variant="transcript" items={[]} active activityLabel="Planning the supplier follow-up" />
        </div>
        <div data-empty="collapsible">
          <p className="tool-demo-label">Collapsible or stepper, no items</p>
          <ToolActivity items={[]} active />
          <p className="tool-demo-muted">Nothing renders.</p>
        </div>
      </div>
    </Frame>
  );
}
