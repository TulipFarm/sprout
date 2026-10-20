import { useState, type ReactNode } from 'react';
import { ArrowRight } from 'reicon-react/icons/ArrowRight';
import { Calendar } from 'reicon-react/icons/Calendar';
import { Check } from 'reicon-react/icons/Check';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { Clock } from 'reicon-react/icons/Clock';
import { Code } from 'reicon-react/icons/Code';
import { Danger } from 'reicon-react/icons/Danger';
import { Database } from 'reicon-react/icons/Database';
import { Warning } from 'reicon-react/icons/Warning';
import { Badge } from '@tulipfarm/sprout/badge';
import { Button } from '@tulipfarm/sprout/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@tulipfarm/sprout/collapsible';
import { Spinner, spinnerActivityNames, type SpinnerActivity, type SpinnerSize } from '@tulipfarm/sprout/spinner';
import { StatePanel } from '@tulipfarm/sprout/state-panel';
import { Switch } from '@tulipfarm/sprout/switch';
import { ToggleGroup, ToggleGroupItem } from '@tulipfarm/sprout/toggle-group';
import '../styles/spinner-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="spinner-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="spinner-demo-card-body">{children}</div>
    </section>
  );
}

function Pane({ caption, children, testId }: { caption: ReactNode; children: ReactNode; testId?: string }) {
  return (
    <div className="spinner-demo-pane" data-testid={testId}>
      <span className="spinner-demo-caption">{caption}</span>
      {children}
    </div>
  );
}

const sizeNotes: Record<SpinnerSize, string> = {
  sm: '12px. Inside badges, such as an integration that is still checking.',
  default: '16px. Inline with text and inside buttons of every size.',
  lg: '20px. Swaps with 20px status icons, so the slot does not jump.',
};

function Sizes() {
  return (
    <Example
      title="Sizes"
      description="Three sizes. The spinner takes the current text color, so it matches the text beside it."
    >
      <div className="spinner-demo-grid">
        <Pane caption={<code>size="sm"</code>} testId="size-sm">
          <p className="spinner-demo-note">{sizeNotes.sm}</p>
          <div className="spinner-demo-row">
            <Badge variant="secondary">
              <Spinner size="sm" aria-hidden="true" />
              Finding sources
            </Badge>
            <Badge variant="secondary">
              <Spinner size="sm" aria-hidden="true" />
              Checking
            </Badge>
          </div>
        </Pane>
        <Pane caption={<code>size="default"</code>} testId="size-default">
          <p className="spinner-demo-note">{sizeNotes.default}</p>
          <p role="status" className="spinner-demo-line">
            <Spinner aria-hidden="true" />
            Loading rows…
          </p>
        </Pane>
        <Pane caption={<code>size="lg"</code>} testId="size-lg">
          <p className="spinner-demo-note">{sizeNotes.lg}</p>
          <div className="spinner-demo-slot-row">
            <span className="spinner-demo-slot">
              <Spinner size="lg" aria-hidden="true" />
            </span>
            <span role="status">Creating the Harvest log table…</span>
          </div>
        </Pane>
      </div>
    </Example>
  );
}

const activityNotes: Record<SpinnerActivity, string> = {
  working: 'Particles on tilted orbits. The general default.',
  searching: 'A scan line sweeps a dotted globe.',
  solving: 'Bands scramble, then click back into place.',
  listening: 'A waveform rolls through the rings.',
  connecting: 'A constellation wires itself together.',
  weaving: 'Three strands plait around the sphere.',
  composing: 'An undulating band, for writing a reply.',
  breathing: 'A ring slowly morphing, for quiet thinking.',
  shaping: 'A dotted outline turns circle, triangle, square.',
};

function Thinking() {
  return (
    <Example
      title="Thinking"
      description='variant="thinking" shows a dotted thought orb for AI and agent work. Pick the activity that matches what the agent is doing.'
    >
      <div className="spinner-demo-orbs" data-testid="thinking-activities">
        {spinnerActivityNames.map(activity => (
          <figure key={activity} className="spinner-demo-orb">
            <Spinner variant="thinking" size="xl" activity={activity} aria-label={`${activity} orb`} />
            <figcaption>
              <code>{activity}</code>
              <span>{activityNotes[activity]}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="spinner-demo-grid">
        <Pane caption={<code>size="lg"</code>} testId="thinking-inline">
          <p className="spinner-demo-note">20px, beside a chat status line.</p>
          <p role="status" className="spinner-demo-line">
            <Spinner variant="thinking" activity="searching" aria-hidden="true" />
            Searching your Drive…
          </p>
          <p role="status" className="spinner-demo-line">
            <Spinner variant="thinking" activity="composing" aria-hidden="true" />
            Writing a reply…
          </p>
        </Pane>
        <Pane caption="Standalone" testId="thinking-name">
          <p className="spinner-demo-note">A status named “Thinking” unless you name it.</p>
          <div className="spinner-demo-row">
            <Spinner variant="thinking" />
            <Spinner variant="thinking" activity="connecting" aria-label="Connecting tools" />
          </div>
        </Pane>
      </div>
    </Example>
  );
}

function Naming() {
  return (
    <Example
      title="Naming"
      description="A spinner on its own is a status named “Loading”. Give it a better name, or hide it when text beside it already explains the wait."
    >
      <div className="spinner-demo-grid">
        <Pane caption="Default name" testId="name-default">
          <Spinner />
        </Pane>
        <Pane caption="Custom name" testId="name-custom">
          <div role="status" className="spinner-demo-row">
            <Spinner aria-label="Opening workspace" />
          </div>
        </Pane>
        <Pane caption="Attachment chip" testId="name-chip">
          <div className="spinner-demo-chip">
            <span className="spinner-demo-chip-name">Q3-harvest-forecast.pdf</span>
            <Spinner aria-label="Uploading" />
          </div>
        </Pane>
        <Pane caption="Hidden beside text" testId="name-hidden">
          <p role="status" className="spinner-demo-line">
            <Spinner aria-hidden="true" />
            Saving access change…
          </p>
        </Pane>
      </div>
    </Example>
  );
}

function Buttons() {
  const [busy, setBusy] = useState(true);
  return (
    <Example
      title="Buttons"
      description="A leading spinner shows a button is working. The button is disabled and aria-busy, and the label often says what is happening."
    >
      <label className="spinner-demo-switch">
        <Switch size="sm" checked={busy} onCheckedChange={setBusy} />
        Show busy state
      </label>
      <div className="spinner-demo-grid">
        <Pane caption={'variant="default"'}>
          <div className="spinner-demo-row">
            <Button disabled={busy} aria-busy={busy}>
              {busy && <Spinner aria-hidden="true" />}
              {busy ? 'Opening sign-in…' : 'Connect account'}
            </Button>
            <Button disabled={busy} aria-busy={busy}>
              {busy ? <Spinner aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
              {busy ? 'Creating workspace…' : 'Create workspace'}
            </Button>
          </div>
        </Pane>
        <Pane caption={'variant="default" and "ghost"'}>
          <div className="spinner-demo-row">
            <Button disabled={busy} aria-busy={busy}>
              {busy && <Spinner aria-hidden="true" />}
              Approve action
            </Button>
            <Button variant="ghost" disabled={busy} aria-busy={false}>
              Decline
            </Button>
          </div>
        </Pane>
        <Pane caption={'variant="outline"'}>
          <div className="spinner-demo-row">
            <Button variant="outline" disabled={busy} aria-busy={busy}>
              {busy && <Spinner aria-hidden="true" />}
              Check Atlassian again
            </Button>
          </div>
        </Pane>
        <Pane caption={'size="sm"'}>
          <div className="spinner-demo-row">
            <Button size="sm" disabled={busy} aria-busy={busy}>
              {busy ? (
                <>
                  <Spinner aria-hidden="true" />
                  Checking…
                </>
              ) : (
                'Apply RSQL'
              )}
            </Button>
            <Button variant="outline" size="sm" disabled={busy} aria-busy={busy}>
              {busy && <Spinner aria-hidden="true" />}
              Refresh integrations
            </Button>
            {busy ? (
              <Button
                variant="outline"
                size="sm"
                aria-label="Exporting 1,240 rows. Cancel export"
                onClick={() => setBusy(false)}
              >
                <Spinner aria-hidden="true" />
                Cancel export
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setBusy(true)}>
                Export CSV
              </Button>
            )}
          </div>
        </Pane>
        <Pane caption={'size="onboarding"'}>
          <Button size="onboarding" disabled={busy} aria-busy={busy}>
            {busy && <Spinner aria-hidden="true" />}
            Continue
          </Button>
        </Pane>
      </div>
    </Example>
  );
}

function StatusLines() {
  return (
    <Example
      title="Status lines"
      description="A status line pairs a hidden spinner with a sentence. It works at text-sm and text-xs, in muted or full text color."
    >
      <div className="spinner-demo-grid">
        <Pane caption="Muted, text-sm">
          <p role="status" className="spinner-demo-line">
            <Spinner aria-hidden="true" />
            Signing you in…
          </p>
          <p role="status" className="spinner-demo-line">
            <Spinner aria-hidden="true" />
            Checking access to this source…
          </p>
        </Pane>
        <Pane caption="Foreground, text-sm">
          <p role="status" className="spinner-demo-line spinner-demo-text">
            <Spinner aria-hidden="true" />
            Copying from Google Drive to Marketing team…
          </p>
        </Pane>
        <Pane caption="Muted, text-xs">
          <p role="status" className="spinner-demo-line spinner-demo-xs">
            <Spinner aria-hidden="true" />
            Loading earlier activity…
          </p>
          <span className="spinner-demo-line spinner-demo-xs">
            <Spinner aria-hidden="true" />
            Uploading…
          </span>
        </Pane>
        <Pane caption="Thinking">
          <span role="status" className="spinner-demo-thinking">
            <Spinner aria-hidden="true" />
            Thinking
          </span>
        </Pane>
        <Pane caption="Mention list">
          <div role="status" className="spinner-demo-mention">
            <Spinner aria-hidden="true" />
            <span>Finding people and files…</span>
          </div>
        </Pane>
        <Pane caption="Refresh over loaded data" testId="refresh">
          <p role="status" className="spinner-demo-sr">
            <Spinner aria-hidden="true" />
            Refreshing Calendar…
          </p>
          <ul className="spinner-demo-events" aria-label="Calendar">
            <li>
              <Calendar size={16} aria-hidden="true" />
              Seed order review · 10:00
            </li>
            <li>
              <Calendar size={16} aria-hidden="true" />
              Greenhouse walk · 14:30
            </li>
          </ul>
        </Pane>
      </div>
    </Example>
  );
}

type Phase = 'pending' | 'running' | 'done' | 'failed';

const phaseLabel: Record<Phase, string> = {
  pending: 'Queued',
  running: 'Running',
  done: 'Done',
  failed: 'Failed',
};

function StatusIcons() {
  const [phase, setPhase] = useState<Phase>('running');
  const running = phase === 'running';
  return (
    <Example
      title="Status icons"
      description="While work runs, the spinner takes the place of a step, tool, or result icon. Pick a state to see each swap."
    >
      <ToggleGroup
        aria-label="Sample task state"
        variant="outline"
        size="sm"
        spacing={0}
        value={[phase]}
        onValueChange={value => {
          if (value[0]) setPhase(value[0] as Phase);
        }}
      >
        <ToggleGroupItem value="pending">Queued</ToggleGroupItem>
        <ToggleGroupItem value="running">Running</ToggleGroupItem>
        <ToggleGroupItem value="done">Done</ToggleGroupItem>
        <ToggleGroupItem value="failed">Failed</ToggleGroupItem>
      </ToggleGroup>
      <div className="spinner-demo-grid">
        <Pane caption="Plan step" testId="icon-plan">
          <div className="spinner-demo-step" data-phase={phase}>
            <span className="spinner-demo-step-icon" aria-hidden="true">
              {running ? (
                <Spinner />
              ) : phase === 'done' ? (
                <Check size={16} />
              ) : phase === 'failed' ? (
                <Warning size={16} />
              ) : (
                <Clock size={16} />
              )}
            </span>
            <span>
              Read the planting schedule
              <span className="spinner-demo-sr">, {phaseLabel[phase]}</span>
            </span>
          </div>
        </Pane>
        <Pane caption="Tool call" testId="icon-tool">
          <Collapsible className="spinner-demo-tool">
            <CollapsibleTrigger className="spinner-demo-tool-trigger">
              {running ? <Spinner aria-hidden="true" /> : <Code size={16} aria-hidden="true" />}
              <span className="spinner-demo-tool-name">search_tables</span>
              <Badge variant={phase === 'failed' ? 'destructive' : phase === 'done' ? 'success' : 'secondary'}>
                {phaseLabel[phase]}
              </Badge>
              <ChevronDown size={14} aria-hidden="true" data-slot="collapsible-indicator" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="spinner-demo-tool-input">{`{ "query": "beds sown this week" }`}</pre>
            </CollapsibleContent>
          </Collapsible>
        </Pane>
        <Pane caption="Result status" testId="icon-result">
          <span role="status" className="spinner-demo-result" data-phase={phase}>
            {running ? (
              <Spinner aria-hidden="true" />
            ) : phase === 'done' ? (
              <Check size={14} aria-hidden="true" />
            ) : phase === 'failed' ? (
              <Danger size={14} aria-hidden="true" />
            ) : null}
            {running
              ? 'Saving to Notion…'
              : phase === 'done'
                ? 'Saved to Notion'
                : phase === 'failed'
                  ? 'Could not save'
                  : 'Ready to save'}
          </span>
        </Pane>
        <Pane caption="Table proposal, 20px slot" testId="icon-proposal">
          <div className="spinner-demo-slot-row">
            <span className="spinner-demo-slot" data-phase={phase}>
              {running ? (
                <Spinner size="lg" aria-hidden="true" />
              ) : phase === 'done' ? (
                <Check size={20} aria-hidden="true" />
              ) : phase === 'failed' ? (
                <Danger size={20} aria-hidden="true" />
              ) : (
                <Database size={20} aria-hidden="true" />
              )}
            </span>
            <span role="status">
              {running
                ? 'Creating Harvest log…'
                : phase === 'done'
                  ? 'Harvest log created'
                  : phase === 'failed'
                    ? 'Could not create Harvest log'
                    : 'Create Harvest log table'}
            </span>
          </div>
        </Pane>
      </div>
    </Example>
  );
}

function PageLoading() {
  return (
    <Example
      title="Page loading"
      description="Route and app loading use a centered spinner. With text it is hidden; alone it carries the name."
    >
      <div className="spinner-demo-grid">
        <Pane caption="Route pending">
          <div role="status" className="spinner-demo-page">
            <Spinner aria-hidden="true" />
            Opening TulipFarm…
          </div>
        </Pane>
        <Pane caption="Spinner only">
          <div role="status" className="spinner-demo-page">
            <Spinner aria-label="Opening workspace" />
          </div>
        </Pane>
      </div>
    </Example>
  );
}

type Load = 'loading' | 'ready' | 'empty' | 'error';

const integrations = [
  { name: 'GitHub', detail: '3 repositories' },
  { name: 'Google Drive', detail: 'Marketing team folder' },
  { name: 'Atlassian', detail: '2 Confluence spaces' },
];

function LoadStates() {
  const [load, setLoad] = useState<Load>('loading');
  return (
    <Example
      title="Load states"
      description="A list that loads, then shows rows, an empty state, or an error with a way to retry."
    >
      <ToggleGroup
        aria-label="Sample load state"
        variant="outline"
        size="sm"
        spacing={0}
        value={[load]}
        onValueChange={value => {
          if (value[0]) setLoad(value[0] as Load);
        }}
      >
        <ToggleGroupItem value="loading">Loading</ToggleGroupItem>
        <ToggleGroupItem value="ready">Loaded</ToggleGroupItem>
        <ToggleGroupItem value="empty">Empty</ToggleGroupItem>
        <ToggleGroupItem value="error">Error</ToggleGroupItem>
      </ToggleGroup>
      <div className="spinner-demo-load">
        {load === 'loading' ? (
          <p role="status" className="spinner-demo-line">
            <Spinner aria-hidden="true" />
            Loading integrations…
          </p>
        ) : load === 'ready' ? (
          <ul className="spinner-demo-list" aria-label="Integrations">
            {integrations.map(item => (
              <li key={item.name}>
                <span>{item.name}</span>
                <span className="spinner-demo-muted">{item.detail}</span>
              </li>
            ))}
          </ul>
        ) : load === 'empty' ? (
          <StatePanel
            kind="empty"
            heading="h4"
            title="No integrations yet"
            description="Connect GitHub, Google Drive, or Atlassian to use them in chats."
          />
        ) : (
          <StatePanel
            kind="error"
            heading="h4"
            title="Could not load integrations"
            description="Check your connection and try again."
          >
            <Button variant="outline" size="sm" onClick={() => setLoad('loading')}>
              Retry
            </Button>
          </StatePanel>
        )}
      </div>
    </Example>
  );
}

export default function SpinnerDemo() {
  return (
    <div id="spinner-demo" className="spinner-demo">
      <Sizes />
      <Naming />
      <Thinking />
      <Buttons />
      <StatusLines />
      <StatusIcons />
      <PageLoading />
      <LoadStates />
    </div>
  );
}
