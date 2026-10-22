import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@tulipfarm/sprout/button';
import type { StatusState } from '@tulipfarm/sprout/status';
import { TaskTree, type TaskTreeTask } from '@tulipfarm/sprout/task-tree';
import '../styles/task-tree-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="task-tree-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="task-tree-demo-card-body">{children}</div>
    </section>
  );
}

interface Plan {
  id: string;
  title: string;
  /** How long the task runs, in ms. */
  duration: number;
  /** Shows a running amount instead of a spinning line. */
  known?: boolean;
  /** Fails when the run is set to fail. */
  fails?: boolean;
  children?: Plan[];
}

const plan: Plan = {
  id: 'scaffold',
  title: 'Scaffolding project',
  duration: 700,
  children: [
    {
      id: 'deps',
      title: 'Installing dependencies',
      duration: 1400,
      known: true,
      children: [
        {
          id: 'schema',
          title: 'Defining signups schema',
          duration: 700,
          children: [
            {
              id: 'join',
              title: 'Implementing join logic',
              duration: 900,
              children: [
                {
                  id: 'sqlite',
                  title: 'Adding SQLite layer',
                  duration: 800,
                  children: [
                    {
                      id: 'route',
                      title: 'Wiring POST /api/join',
                      duration: 600,
                      children: [
                        {
                          id: 'api',
                          title: 'Building join API',
                          duration: 900,
                          children: [
                            { id: 'ui-states', title: 'Handling UI states', duration: 800 },
                            {
                              id: 'landing',
                              title: 'Building landing form',
                              duration: 1100,
                              children: [{ id: 'smoke', title: 'Smoke testing API', duration: 700, fails: true }],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      id: 'unit',
                      title: 'Writing unit tests',
                      duration: 1000,
                      children: [{ id: 'test', title: 'Testing', duration: 1600, known: true }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        { id: 'validate', title: 'Validating email input', duration: 900 },
        { id: 'signup', title: 'Building signup form', duration: 1300 },
      ],
    },
    {
      id: 'ignore',
      title: 'Ignoring DB files',
      duration: 400,
      children: [{ id: 'readme', title: 'Writing README', duration: 900 }],
    },
  ],
};

interface Run {
  state: StatusState;
  elapsed: number;
}

const tick = 100;
const concurrency = 2;
const plans = new Map<string, Plan>();
const leaves: string[] = [];
(function index(node: Plan) {
  plans.set(node.id, node);
  if (node.children) node.children.forEach(index);
  else leaves.push(node.id);
})(plan);

const fresh = () => new Map(leaves.map(id => [id, { state: 'pending', elapsed: 0 } as Run]));

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

// One step of the run: finish what is due, then start the next leaves in order, two at a time.
function advance(runs: Map<string, Run>, fail: boolean) {
  const next = new Map(runs);
  for (const [id, run] of runs) {
    if (run.state !== 'running') continue;
    const task = plans.get(id)!;
    const elapsed = run.elapsed + tick / 2;
    if (elapsed < task.duration) next.set(id, { ...run, elapsed });
    else next.set(id, { state: fail && task.fails ? 'error' : 'success', elapsed: task.duration });
  }
  const failed = [...next.values()].some(run => run.state === 'error');
  let busy = [...next.values()].filter(run => run.state === 'running').length;
  for (const id of leaves) {
    if (next.get(id)!.state !== 'pending') continue;
    if (failed) next.set(id, { state: 'skipped', elapsed: 0 });
    else if (busy < concurrency) {
      next.set(id, { state: 'running', elapsed: 0 });
      busy += 1;
    }
  }
  return next;
}

function toTask(node: Plan, runs: Map<string, Run>): TaskTreeTask {
  if (node.children)
    return { id: node.id, title: node.title, children: node.children.map(child => toTask(child, runs)) };
  const run = runs.get(node.id)!;
  const amount = Math.round((run.elapsed / node.duration) * 100);
  const detail =
    run.state === 'running'
      ? node.known
        ? `${amount}%`
        : undefined
      : run.state === 'success'
        ? seconds(run.elapsed)
        : run.state === 'error'
          ? '1 check failed'
          : run.state === 'stopped'
            ? 'Stopped by you'
            : undefined;
  return {
    id: node.id,
    title: node.title,
    state: run.state,
    value: run.state === 'running' && node.known ? amount : undefined,
    detail,
  };
}

function LiveRun() {
  const [runs, setRuns] = useState(() => advance(fresh(), false));
  const [running, setRunning] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const stopTimer = () => window.clearInterval(timer.current);

  const start = (fail: boolean) => {
    stopTimer();
    // Starts the first tasks straight away, so the tree doesn't flash back to pending before they run.
    let current = advance(fresh(), fail);
    setRuns(current);
    setRunning(true);
    timer.current = window.setInterval(() => {
      current = advance(current, fail);
      setRuns(current);
      if ([...current.values()].every(run => run.state !== 'running' && run.state !== 'pending')) {
        stopTimer();
        setRunning(false);
      }
    }, tick);
  };

  useEffect(() => {
    start(false);
    return stopTimer;
  }, []);

  const stop = () => {
    stopTimer();
    setRunning(false);
    setRuns(
      list =>
        new Map(
          [...list].map(([id, run]) => [
            id,
            run.state === 'running'
              ? { ...run, state: 'stopped' }
              : run.state === 'pending'
                ? { ...run, state: 'skipped' }
                : run,
          ]),
        ),
    );
  };

  return (
    <Example
      title="Live run"
      description="Two tasks run at a time. A parent’s mark follows its parts: it fills as they finish, and fails if one fails. Lines turn green as the tasks they lead to succeed."
    >
      <div className="task-tree-demo-toolbar">
        <Button size="sm" onClick={() => start(false)} disabled={running}>
          Run again
        </Button>
        <Button variant="outline" size="sm" onClick={() => start(true)} disabled={running}>
          Run with a failing check
        </Button>
        <Button variant="ghost" size="sm" onClick={stop} disabled={!running}>
          Stop run
        </Button>
      </div>
      <TaskTree className="task-tree-demo-tree" data-testid="live" tasks={[toTask(plan, runs)]} />
    </Example>
  );
}

const states: TaskTreeTask[] = [
  {
    id: 'release',
    title: 'Releasing v2.4',
    children: [
      {
        id: 'notes',
        title: 'Drafting release notes from 38 merged pull requests and the changelog entries they reference',
        state: 'success',
        detail: '12s',
      },
      {
        id: 'publish',
        title: 'Publishing packages',
        children: [
          { id: 'pypi', title: 'PyPI', state: 'running', value: 60, detail: '60%' },
          { id: 'npm', title: 'npm', state: 'paused', detail: 'Waiting for 2FA' },
          { id: 'docker', title: 'Docker image', state: 'error', detail: 'Registry timed out' },
        ],
      },
      {
        id: 'announce',
        title: 'Announcing in #releases',
        state: 'stopped',
        children: [{ id: 'tweet', title: 'Posting to social', state: 'skipped' }],
      },
    ],
  },
];

function States() {
  return (
    <Example
      title="Every state"
      description="Parents without a state follow their parts, so one failed upload marks the release failed. “Announcing” sets its own state. Long titles wrap under themselves."
    >
      <TaskTree className="task-tree-demo-tree" data-testid="states" title="Release" tasks={states} />
    </Example>
  );
}

function Empty() {
  return (
    <Example title="No tasks" description="Before the first task arrives, the tree says so.">
      <TaskTree className="task-tree-demo-tree" tasks={[]} empty="No tasks yet. They appear here as the agent plans." />
    </Example>
  );
}

export default function TaskTreeDemo() {
  return (
    <div id="task-tree-demo" className="task-tree-demo">
      <LiveRun />
      <States />
      <Empty />
    </div>
  );
}
