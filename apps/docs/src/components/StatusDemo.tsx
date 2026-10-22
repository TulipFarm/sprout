import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@tulipfarm/sprout/button';
import { Status, statusSizeNames, type StatusState } from '@tulipfarm/sprout/status';
import { ToggleGroup, ToggleGroupItem } from '@tulipfarm/sprout/toggle-group';
import '../styles/status-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="status-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="status-demo-card-body">{children}</div>
    </section>
  );
}

const gallery: { state: StatusState; value?: number; name: string; note: string }[] = [
  { state: 'pending', name: 'Pending', note: 'Queued, not started' },
  { state: 'running', name: 'Running', note: 'Amount unknown' },
  { state: 'running', value: 40, name: 'Running, 40%', note: 'Amount known' },
  { state: 'paused', name: 'Paused', note: 'Waiting to resume' },
  { state: 'success', name: 'Succeeded', note: 'Finished' },
  { state: 'warning', name: 'Warning', note: 'Finished with issues' },
  { state: 'error', name: 'Failed', note: 'Needs attention' },
  { state: 'stopped', name: 'Stopped', note: 'Cancelled by someone' },
  { state: 'skipped', name: 'Skipped', note: 'Did not need to run' },
];

function States() {
  return (
    <Example
      title="States"
      description="Eight states, and running with or without a known amount. Hover a mark to replay it. Each size matches Spinner: 12, 16, and 20px."
    >
      <ul className="status-demo-gallery">
        {gallery.map(item => (
          <li key={item.name} data-testid={`state-${item.name}`}>
            <span className="status-demo-sizes">
              {statusSizeNames.map(size => (
                <Status key={size} state={item.state} value={item.value} size={size} aria-hidden="true" />
              ))}
            </span>
            <span className="status-demo-text">
              <span className="status-demo-name">{item.name}</span>
              <span className="status-demo-note">{item.note}</span>
            </span>
          </li>
        ))}
      </ul>
    </Example>
  );
}

type PlaygroundState = StatusState | 'progress';

const playgroundOptions: { value: PlaygroundState; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Running' },
  { value: 'progress', label: 'Progress' },
  { value: 'paused', label: 'Paused' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'skipped', label: 'Skipped' },
];

function Playground() {
  const [picked, setPicked] = useState<PlaygroundState>('running');
  const [amount, setAmount] = useState(25);
  const state: StatusState = picked === 'progress' ? 'running' : picked;
  return (
    <Example
      title="Change state"
      description="The mark animates in again whenever its state changes. A changing amount only fills the next segment."
    >
      <ToggleGroup
        aria-label="Status state"
        variant="outline"
        size="sm"
        className="status-demo-picker"
        value={[picked]}
        onValueChange={value => {
          if (value[0]) setPicked(value[0] as PlaygroundState);
        }}
      >
        {playgroundOptions.map(option => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="status-demo-stage" data-testid="playground">
        <Status state={state} value={picked === 'progress' ? amount : undefined} size="lg" />
        {picked === 'progress' && (
          <Button variant="outline" size="sm" onClick={() => setAmount(value => (value >= 100 ? 0 : value + 15))}>
            {amount >= 100 ? 'Restart' : 'Add 15%'}
          </Button>
        )}
      </div>
    </Example>
  );
}

interface Step {
  id: string;
  name: string;
  state: StatusState;
  value?: number;
  detail: string;
}

const initialSteps: Step[] = [
  { id: 'install', name: 'Install dependencies', state: 'pending', detail: 'Queued' },
  { id: 'build', name: 'Build web app', state: 'pending', detail: 'Queued' },
  { id: 'test', name: 'Run 1,284 tests', state: 'pending', detail: 'Queued' },
  { id: 'migrate', name: 'Migrate database', state: 'pending', detail: 'Queued' },
  { id: 'deploy', name: 'Deploy to production', state: 'pending', detail: 'Queued' },
];

type Outcome = 'success' | 'warning' | 'error';

/* What each step ends in, and what it says, for a run that goes well or one that fails at the tests. */
const script: Record<string, { duration: number; known: boolean; finish: (fail: boolean) => [StatusState, string] }> = {
  install: { duration: 1200, known: false, finish: () => ['success', '14s'] },
  build: { duration: 2000, known: true, finish: () => ['warning', '41s · 3 warnings'] },
  test: {
    duration: 2200,
    known: true,
    finish: fail => (fail ? ['error', '2 tests failed'] : ['success', '1m 12s']),
  },
  migrate: { duration: 1000, known: false, finish: () => ['skipped', 'No new migrations'] },
  deploy: { duration: 1600, known: false, finish: () => ['success', 'Live in eu-west-1'] },
};

function Run() {
  const [steps, setSteps] = useState(initialSteps);
  const [running, setRunning] = useState(false);
  const [fail, setFail] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const stopTimer = () => window.clearInterval(timer.current);
  useEffect(() => stopTimer, []);

  const patch = (id: string, change: Partial<Step>) =>
    setSteps(list => list.map(step => (step.id === id ? { ...step, ...change } : step)));

  const start = (willFail: boolean) => {
    stopTimer();
    setFail(willFail);
    setSteps(initialSteps);
    setRunning(true);
    let index = 0;
    let elapsed = 0;
    const tick = 100;
    timer.current = window.setInterval(() => {
      const step = initialSteps[index]!;
      const plan = script[step.id]!;
      elapsed += tick;
      if (elapsed < plan.duration) {
        patch(step.id, {
          state: 'running',
          value: plan.known ? Math.round((elapsed / plan.duration) * 100) : undefined,
          detail: plan.known ? `${Math.round((elapsed / plan.duration) * 100)}%` : 'Running…',
        });
        return;
      }
      const [state, detail] = plan.finish(willFail);
      patch(step.id, { state, value: undefined, detail });
      elapsed = 0;
      index += 1;
      if (state === 'error') {
        setSteps(list =>
          list.map((other, position) =>
            position >= index ? { ...other, state: 'skipped', detail: 'Not run' } : other,
          ),
        );
      }
      if (state === 'error' || index >= initialSteps.length) {
        stopTimer();
        setRunning(false);
      }
    }, tick);
  };

  const stop = () => {
    stopTimer();
    setRunning(false);
    setSteps(list =>
      list.map(step =>
        step.state === 'running'
          ? { ...step, state: 'stopped', value: undefined, detail: 'Stopped by you' }
          : step.state === 'pending'
            ? { ...step, state: 'skipped', detail: 'Not run' }
            : step,
      ),
    );
  };

  const outcome: Outcome | null = steps.some(step => step.state === 'error')
    ? 'error'
    : steps.every(step => ['success', 'warning', 'skipped'].includes(step.state))
      ? 'success'
      : null;
  const summary = running
    ? `Deploying… step ${steps.findIndex(step => step.state === 'running') + 1} of ${steps.length}`
    : outcome === 'error'
      ? 'Deploy failed at Run 1,284 tests'
      : outcome === 'success'
        ? 'Deployed with 3 warnings'
        : steps.some(step => step.state === 'stopped')
          ? 'Deploy stopped'
          : 'Ready to deploy';

  return (
    <Example
      title="Deploy run"
      description="Each step’s mark follows the run: pending, running with or without an amount, then its result. Stop the run to see stopped and skipped."
    >
      <div className="status-demo-toolbar">
        <Button size="sm" onClick={() => start(false)} disabled={running}>
          Deploy
        </Button>
        <Button variant="outline" size="sm" onClick={() => start(true)} disabled={running}>
          Deploy with failing tests
        </Button>
        <Button variant="ghost" size="sm" onClick={stop} disabled={!running}>
          Stop run
        </Button>
      </div>
      <section className="status-demo-run" aria-label="Deploy steps" data-testid="run" data-fail={fail || undefined}>
        <p role="status" className="status-demo-summary">
          {summary}
        </p>
        <ol>
          {steps.map(step => (
            <li key={step.id} data-testid={`step-${step.id}`}>
              <Status state={step.state} value={step.value} />
              <span className="status-demo-step">{step.name}</span>
              <span className="status-demo-detail">{step.detail}</span>
            </li>
          ))}
        </ol>
      </section>
    </Example>
  );
}

export default function StatusDemo() {
  return (
    <div id="status-demo" className="status-demo">
      <States />
      <Playground />
      <Run />
    </div>
  );
}
