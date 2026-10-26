import { useEffect, useRef, useState } from 'react';
import { AgentFanout, type AgentFanoutAgent, type AgentFanoutStatus } from '@tulipfarm/sprout/agent-fanout';
import type { Brand } from '@tulipfarm/sprout/brand-icon';
import { Button } from '@tulipfarm/sprout/button';
import { Refresh } from 'reicon-react/icons/Refresh';
import '../styles/agent-fanout-demo.css';

interface Run {
  id: string;
  parent?: string;
  name: string;
  model: string;
  brand: Brand;
  tools: Brand[];
  task: string;
  status: AgentFanoutStatus;
  start: number;
  end?: number;
  reason?: string;
}

type Runs = Run[];

const spawn = (run: Omit<Run, 'status' | 'start'>) => (runs: Runs, now: number) => [
  ...runs,
  { ...run, status: 'running' as const, start: now },
];

const finish =
  (id: string, status: AgentFanoutStatus, reason?: string, only?: AgentFanoutStatus) => (runs: Runs, now: number) =>
    runs.map(run =>
      run.id === id && (!only || run.status === only)
        ? {
            ...run,
            status,
            reason,
            end: status === 'running' || status === 'needs-you' ? undefined : now,
          }
        : run,
    );

const retry = (id: string) => (runs: Runs, now: number) => {
  const failed = runs.find(run => run.id === id);
  if (!failed || failed.status !== 'failed') return runs;
  const next = {
    ...failed,
    id: `${id}-again`,
    status: 'running' as const,
    start: now,
    end: undefined,
    reason: undefined,
  };
  return [...finish(id, 'stopped')(runs, now), next];
};

/** The run in the reference video, in ms from the start. */
const script: [number, (runs: Runs, now: number) => Runs][] = [
  [
    0,
    spawn({
      id: 'orchestrator',
      name: 'Orchestrator',
      model: 'Opus 5.5',
      brand: 'claude',
      tools: ['slack', 'notion', 'github'],
      task: 'Launch the new pricing page by Friday',
    }),
  ],
  [
    900,
    spawn({
      id: 'researcher',
      parent: 'orchestrator',
      name: 'Researcher',
      model: 'GPT-5.5',
      brand: 'openai',
      tools: ['notion', 'slack'],
      task: 'Compare the pricing of five competitors',
    }),
  ],
  [
    1900,
    spawn({
      id: 'builder',
      parent: 'orchestrator',
      name: 'Builder',
      model: 'Sonnet 5.5',
      brand: 'claude',
      tools: ['github', 'linear'],
      task: 'Ship the page behind a flag',
    }),
  ],
  [
    3100,
    spawn({
      id: 'scraper',
      parent: 'researcher',
      name: 'Scraper',
      model: 'DeepSeek V4',
      brand: 'deepseek',
      tools: ['google-sheets'],
      task: 'Pull plan prices from competitor sites',
    }),
  ],
  [
    4100,
    spawn({
      id: 'writer',
      parent: 'builder',
      name: 'Writer',
      model: 'Grok 5',
      brand: 'grok',
      tools: ['notion', 'figma'],
      task: 'Write the copy for the three plans',
    }),
  ],
  [
    5100,
    spawn({
      id: 'analyst',
      parent: 'researcher',
      name: 'Analyst',
      model: 'GPT-5.5 mini',
      brand: 'openai',
      tools: ['google-sheets', 'notion'],
      task: 'Chart where our plans land',
    }),
  ],
  [
    6100,
    spawn({
      id: 'tester',
      parent: 'builder',
      name: 'Tester',
      model: 'DeepSeek V4',
      brand: 'deepseek',
      tools: ['github'],
      task: 'Run the checkout tests',
    }),
  ],
  [7300, finish('writer', 'needs-you', 'Pick a name for the top plan: Scale or Business?')],
  [8300, finish('scraper', 'done')],
  [9300, finish('tester', 'failed', '2 of 14 checkout tests fail. Coupon codes are not applied.')],
  [10500, finish('analyst', 'done')],
  [11500, finish('researcher', 'done')],
  [13500, finish('writer', 'running', undefined, 'needs-you')],
  [15000, retry('tester')],
  [17000, finish('writer', 'done', undefined, 'running')],
  [18400, finish('tester-again', 'done', undefined, 'running')],
  [19400, finish('builder', 'done', undefined, 'running')],
  [20600, finish('orchestrator', 'done', undefined, 'running')],
];

function toTree(runs: Runs, now: number, parent?: string): AgentFanoutAgent[] {
  return runs
    .filter(run => run.parent === parent)
    .map(run => ({
      id: run.id,
      name: run.name,
      model: run.model,
      brand: run.brand,
      tools: run.tools,
      task: run.task,
      status: run.status,
      reason: run.reason,
      elapsed: (run.end ?? now) - run.start,
      agents: toTree(runs, now, run.id),
    }));
}

export function AgentFanoutPlayground() {
  const [round, setRound] = useState(0);
  const [now, setNow] = useState(0);
  const [runs, setRuns] = useState<Runs>([]);
  const step = useRef(0);
  const started = useRef(0);

  useEffect(() => {
    step.current = 0;
    started.current = performance.now();
    setRuns([]);
    setNow(0);
    const timer = window.setInterval(() => {
      const time = performance.now() - started.current;
      setNow(time);
      setRuns(current => {
        let next = current;
        while (step.current < script.length && script[step.current]![0] <= time) {
          next = script[step.current]![1](next, time);
          step.current += 1;
        }
        return next;
      });
      if (step.current >= script.length) window.clearInterval(timer);
    }, 200);
    return () => window.clearInterval(timer);
  }, [round]);

  const act = (change: (runs: Runs, now: number) => Runs) => setRuns(current => change(current, now));
  const [root] = toTree(runs, now);

  return (
    <div className="fanout-demo">
      <div className="fanout-demo-stage" data-size="tall">
        {root && (
          <AgentFanout
            key={round}
            agent={root}
            onRetry={agent => act(retry(agent.id))}
            onDismiss={agent => act(finish(agent.id, 'stopped'))}
            onOpen={agent => act(finish(agent.id, 'running', undefined, 'needs-you'))}
          />
        )}
      </div>
      <div className="fanout-demo-controls">
        <Button variant="outline" size="sm" onClick={() => setRound(value => value + 1)}>
          <Refresh data-icon="inline-start" aria-hidden="true" />
          Replay
        </Button>
      </div>
    </div>
  );
}

const agent = (
  id: string,
  name: string,
  status: AgentFanoutStatus,
  task: string,
  rest: Partial<AgentFanoutAgent> = {},
): AgentFanoutAgent => ({ id, name, status, task, model: 'Sonnet 5.5', brand: 'claude', ...rest });

const statesRun: AgentFanoutAgent = agent('lead', 'Lead', 'running', 'Prepare the quarterly board update', {
  model: 'Opus 5.5',
  tools: ['notion', 'google-sheets', 'slack'],
  elapsed: 186_000,
  agents: [
    agent('analyst', 'Analyst', 'running', 'Gather the numbers for the quarter', {
      tools: ['google-sheets', 'linear'],
      elapsed: 124_000,
      agents: [
        agent('finance', 'Finance', 'done', 'Pull revenue and burn from the ledger', {
          model: 'Haiku 4.5',
          tools: ['google-sheets'],
          elapsed: 64_000,
        }),
        agent('product', 'Product', 'needs-you', 'Summarize what shipped', {
          model: 'Haiku 4.5',
          tools: ['linear'],
          elapsed: 92_000,
          reason: 'Should the beta features count as shipped?',
        }),
      ],
    }),
    agent('design', 'Designer', 'running', 'Lay out the slides in the board template', {
      model: 'GPT-5.5',
      brand: 'openai',
      tools: ['figma', 'google-slides'],
      elapsed: 41_000,
      agents: [
        agent('charts', 'Charts', 'failed', 'Render the revenue charts', {
          model: 'Haiku 4.5',
          tools: ['google-sheets'],
          elapsed: 18_000,
          reason: 'The ledger export has no March rows.',
        }),
        agent('copy', 'Copy', 'stopped', 'Draft speaker notes', { model: 'Haiku 4.5', elapsed: 9_000 }),
        agent('review', 'Reviewer', 'queued', 'Check every number against the ledger', { model: 'Haiku 4.5' }),
      ],
    }),
  ],
});

export function AgentFanoutStates() {
  return (
    <div className="fanout-demo-stage">
      <AgentFanout agent={statesRun} title="Board update" onRetry={() => {}} onDismiss={() => {}} onOpen={() => {}} />
    </div>
  );
}

export function AgentFanoutList() {
  return (
    <div className="fanout-demo-stage">
      <div className="fanout-demo-narrow">
        <AgentFanout agent={statesRun} title="Board update" layout="list" defaultCollapsed={['design']} />
      </div>
    </div>
  );
}

const wideRun: AgentFanoutAgent = agent('main', 'Main agent', 'running', 'Audit the checkout flow before launch', {
  model: 'Opus 5.5',
  tools: ['github', 'linear', 'slack'],
  elapsed: 212_000,
  agents: [
    agent('ux', 'UX review', 'done', 'Walk every checkout step on mobile', {
      tools: ['figma'],
      elapsed: 98_000,
    }),
    agent('perf', 'Performance', 'running', 'Profile the payment page load', {
      model: 'GPT-5.5',
      brand: 'openai',
      tools: ['github'],
      elapsed: 143_000,
    }),
    agent('a11y', 'Accessibility', 'needs-you', 'Check forms with a screen reader', {
      model: 'Haiku 4.5',
      elapsed: 77_000,
      reason: 'Is the coupon field in scope for this audit?',
    }),
    agent('copy', 'Copy', 'queued', 'Proofread every error message', { model: 'Grok 5', brand: 'grok' }),
  ],
});

export function AgentFanoutWide() {
  return (
    <div className="fanout-demo-stage">
      <AgentFanout agent={wideRun} title="Checkout audit" onOpen={() => {}} />
    </div>
  );
}
