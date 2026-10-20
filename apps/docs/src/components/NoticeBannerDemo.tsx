import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { Button } from '@tulipfarm/sprout/button';
import { NoticeBanner } from '@tulipfarm/sprout/notice-banner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tulipfarm/sprout/select';
import DocsSelect from './DocsSelect';
import '../styles/notice-banner-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="notice-banner-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="notice-banner-demo-card-body">{children}</div>
    </section>
  );
}

/** A fake page so the banner sits at the top of an app surface, as in Cloud. */
function Frame({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return (
    <figure className="notice-banner-demo-figure" data-testid={testId}>
      <figcaption>{label}</figcaption>
      <div className="notice-banner-demo-frame">
        {children}
        <div className="notice-banner-demo-page" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </figure>
  );
}

type Kind = 'google' | 'slack' | 'slack-user' | 'github' | 'atlassian' | 'mcp';

interface Attention {
  id: string;
  name: string;
  reason: 'permissions' | 'reauthorize';
  kind: Kind;
}

const sample: Record<string, Attention> = {
  calendar: {
    id: 'google:calendar',
    name: 'Google Calendar (robin@greenhouse.example)',
    reason: 'permissions',
    kind: 'google',
  },
  github: {
    id: 'github:1',
    name: 'GitHub (@garden-bot)',
    reason: 'reauthorize',
    kind: 'github',
  },
  slack: {
    id: 'slack',
    name: 'Slack workspace',
    reason: 'reauthorize',
    kind: 'slack',
  },
  slackUser: {
    id: 'slack-user',
    name: 'Your Slack account',
    reason: 'reauthorize',
    kind: 'slack-user',
  },
  atlassian: {
    id: 'atlassian:2',
    name: 'Atlassian (Greenhouse Jira)',
    reason: 'reauthorize',
    kind: 'atlassian',
  },
  mcp: {
    id: 'mcp:3',
    name: 'Seed catalog MCP',
    reason: 'reauthorize',
    kind: 'mcp',
  },
};

const several = [sample.calendar!, sample.github!, sample.atlassian!];

type Phase = 'idle' | 'busy' | 'checking' | 'failed' | 'stale';

function detail(item: Attention) {
  if (item.reason === 'permissions') return 'Approve the updated permissions to continue.';
  if (item.kind === 'github') return 'GitHub reads and actions with this account need renewed access.';
  return `Tasks using ${item.name} need renewed access.`;
}

/**
 * The Cloud reauthorization banner's presentation, with the data and auth
 * calls replaced by props. It renders nothing when no item needs attention.
 */
function ReauthorizationNotice({
  items,
  chosen,
  onChoose,
  phase,
  onAction,
  actionRef,
}: {
  items: Attention[];
  chosen?: string | null;
  onChoose?: (id: string) => void;
  phase: Phase;
  onAction?: () => void;
  actionRef?: Ref<HTMLButtonElement>;
}) {
  const selected = items.find(item => item.id === chosen) ?? items[0];
  if (!selected) return null;
  const busy = phase === 'busy';
  const waiting = busy || phase === 'checking';
  const recover = phase === 'failed' || phase === 'stale';
  return (
    <NoticeBanner
      aria-label="Integration authorization"
      actions={
        <>
          {items.length > 1 && (
            <div className="notice-banner-demo-picker">
              <Select value={selected.id} onValueChange={value => value && onChoose?.(value)} disabled={busy}>
                <SelectTrigger width="full" aria-label="Integration to reauthorize">
                  <SelectValue>{selected.name}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {items.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            ref={actionRef}
            variant="outline"
            disabled={waiting}
            focusableWhenDisabled
            aria-busy={waiting}
            onClick={onAction}
          >
            {waiting ? 'Please wait...' : recover ? 'Check integration status' : 'Update permissions'}
          </Button>
        </>
      }
    >
      {recover ? (
        <p role="alert">
          {phase === 'failed' ? 'Authorization could not be opened.' : 'Integration status could not refresh.'} Check
          integration status before trying again.
        </p>
      ) : (
        <p role="status">
          <span className="notice-banner-demo-lead">
            {items.length > 1
              ? `${items.length} integrations need authorization.`
              : `${selected.name} needs authorization.`}
          </span>{' '}
          {detail(selected)}
        </p>
      )}
    </NoticeBanner>
  );
}

const gallery: { label: string; items: Attention[]; phase: Phase }[] = [
  {
    label: 'One integration · updated permissions',
    items: [sample.calendar!],
    phase: 'idle',
  },
  {
    label: 'One GitHub account · renewed access',
    items: [sample.github!],
    phase: 'idle',
  },
  {
    label: 'One integration · renewed access',
    items: [sample.slackUser!],
    phase: 'idle',
  },
  {
    label: 'Several integrations · choose one',
    items: several,
    phase: 'idle',
  },
  {
    label: 'Opening consent · busy',
    items: several,
    phase: 'busy',
  },
  {
    label: 'Status refreshing · checking',
    items: [sample.mcp!],
    phase: 'checking',
  },
  {
    label: 'Consent could not open · error',
    items: [sample.slack!],
    phase: 'failed',
  },
  {
    label: 'Status could not refresh · stale',
    items: [sample.atlassian!],
    phase: 'stale',
  },
];

function States() {
  return (
    <Example
      title="Integration authorization states"
      description="Every message, select, and button state the Cloud reauthorization banner shows. Names are fictional and nothing connects."
    >
      <div className="notice-banner-demo-gallery">
        {gallery.map(entry => (
          <Frame key={entry.label} label={entry.label} testId="state-frame">
            <ReauthorizationNotice items={entry.items} phase={entry.phase} />
          </Frame>
        ))}
        <Frame label="Nothing needs authorization · no banner" testId="empty-frame">
          <ReauthorizationNotice items={[]} phase="idle" />
        </Frame>
      </div>
    </Example>
  );
}

type Outcome = 'opens' | 'fails';
type Refresh = 'succeeds' | 'fails';
const counts = [
  { value: '3', label: 'Three integrations' },
  { value: '1', label: 'One integration' },
] as const;
const outcomes = [
  { value: 'opens', label: 'Consent opens' },
  { value: 'fails', label: 'Consent fails' },
] as const;
const refreshes = [
  { value: 'succeeds', label: 'Status refreshes' },
  { value: 'fails', label: 'Status fails' },
] as const;
const all = [sample.calendar!, sample.github!, sample.slack!];

function Flow() {
  const [count, setCount] = useState<'3' | '1'>('3');
  const [outcome, setOutcome] = useState<Outcome>('opens');
  const [refresh, setRefresh] = useState<Refresh>('succeeds');
  const [items, setItems] = useState<Attention[]>(all);
  const [chosen, setChosen] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [log, setLog] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const action = useRef<HTMLButtonElement>(null);
  const reset = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!restoreFocus.current) return;
    restoreFocus.current = false;
    (items.length ? action.current : reset.current)?.focus();
  }, [items]);

  function start(nextCount = count) {
    window.clearTimeout(timer.current);
    setItems(all.slice(0, Number(nextCount)));
    setChosen(null);
    setPhase('idle');
    setLog('');
  }

  function act() {
    if (phase === 'busy' || phase === 'checking') return;
    const selected = items.find(item => item.id === chosen) ?? items[0];
    if (!selected) return;
    const checking = phase === 'failed' || phase === 'stale';
    setPhase(checking ? 'checking' : 'busy');
    timer.current = window.setTimeout(() => {
      if (checking) {
        setPhase(refresh === 'succeeds' ? 'idle' : 'stale');
        setLog(refresh === 'succeeds' ? 'Sample status refreshed.' : 'Sample status refresh failed.');
        return;
      }
      if (outcome === 'fails') {
        setPhase('failed');
        setLog(`Sample consent for ${selected.name} could not open.`);
        return;
      }
      setPhase('idle');
      setChosen(null);
      restoreFocus.current = document.activeElement === action.current;
      setItems(current => current.filter(item => item.id !== selected.id));
      setLog(`Sample consent for ${selected.name} completed. Nothing was sent.`);
    }, 700);
  }

  return (
    <Example
      title="Reauthorization flow"
      description="A sample adapter replaces Cloud’s queries and consent redirects. Choose outcomes, then use the banner with the keyboard or pointer."
    >
      <div className="notice-banner-demo-controls">
        <DocsSelect
          label="Integrations needing authorization"
          value={count}
          items={counts}
          onValueChange={value => {
            setCount(value);
            start(value);
          }}
        />
        <DocsSelect label="Consent outcome" value={outcome} items={outcomes} onValueChange={setOutcome} />
        <DocsSelect label="Status refresh outcome" value={refresh} items={refreshes} onValueChange={setRefresh} />
        <Button ref={reset} variant="ghost" size="sm" onClick={() => start()}>
          Reset sample
        </Button>
      </div>
      <Frame label="Workspace page" testId="flow-frame">
        <ReauthorizationNotice
          items={items}
          chosen={chosen}
          onChoose={id => {
            setChosen(id);
            if (phase === 'failed') setPhase('idle');
          }}
          phase={phase}
          onAction={act}
          actionRef={action}
        />
      </Frame>
      <p className="notice-banner-demo-log" role="log" aria-label="Sample events">
        {log || 'No sample events yet.'}
      </p>
    </Example>
  );
}

function Playground() {
  const [shown, setShown] = useState(true);
  const dismiss = useRef<HTMLButtonElement>(null);
  const again = useRef<HTMLButtonElement>(null);
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    (shown ? dismiss.current : again.current)?.focus();
  }, [shown]);
  return (
    <Example
      title="Notice with actions"
      description="The internal playground notice: plain text and one small outline button. Dismissing it moves focus to the button that brings it back."
    >
      <div className="notice-banner-demo-playground">
        {shown ? (
          <NoticeBanner
            aria-label="Example notice"
            actions={
              <Button
                ref={dismiss}
                variant="outline"
                size="sm"
                onClick={() => {
                  moved.current = true;
                  setShown(false);
                }}
              >
                Dismiss
              </Button>
            }
          >
            This is an example notice. No integration is being monitored.
          </NoticeBanner>
        ) : (
          <Button
            ref={again}
            variant="outline"
            onClick={() => {
              moved.current = true;
              setShown(true);
            }}
          >
            Show notice again
          </Button>
        )}
      </div>
    </Example>
  );
}

export default function NoticeBannerDemo() {
  return (
    <div id="notice-banner-demo" className="notice-banner-demo">
      <Flow />
      <States />
      <Playground />
    </div>
  );
}
