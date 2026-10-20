import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as sprout from '../packages/sprout/src/index.js';
import {
  PlanOutline,
  planOutlineMarkNames,
  planOutlineToneNames,
  type PlanOutlineTask,
} from '../packages/sprout/src/components/plan-outline.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const labels = {
  pending: 'Not started',
  running: 'Working',
  attention: 'Needs your answer',
  blocked: 'Blocked',
  done: 'Verified',
  failed: 'Failed',
  cancelled: 'Cancelled',
} as const;

const marks: PlanOutlineTask[] = planOutlineMarkNames.map((mark, index) => ({
  id: mark,
  title: `${index + 1}. ${mark} task`,
  mark,
  label: labels[mark],
  assignee: 'Alex Meadow',
  brief: 'Prepare a small garden bed.',
  criteria: ['Leave room between bulbs.'],
  dependencies: index ? [{ id: 'pending', title: 'Choose location', label: 'Depends on' }] : [],
  reason: mark === 'blocked' ? 'Waiting for sample approval.' : mark === 'failed' ? 'The courier has no slots.' : '',
  children:
    index === 0
      ? [
          {
            id: 'child',
            title: 'Pick a sunny patch',
            mark: 'pending',
            label: 'Pending',
          },
        ]
      : undefined,
}));

const render = (tasks: PlanOutlineTask[], extra: Partial<Parameters<typeof PlanOutline>[0]> = {}) =>
  renderToString(
    <PlanOutline
      title="Meadow garden plan"
      status="Running"
      tone="active"
      progress="1 of 7 tasks complete"
      tasks={tasks}
      {...extra}
    />,
  );

const rows = (html: string) =>
  (html.match(/<li[^>]*data-slot="plan-outline-task"[^>]*>/g) ?? []).map(
    tag => `${tag.match(/data-kind="(\w+)"/)![1]}:${tag.match(/data-mark="(\w+)"/)![1]}`,
  );

describe('PlanOutline', () => {
  it('is exported from the package root, subpath, CSS entry, and docs nav', () => {
    expect(sprout.PlanOutline).toBe(PlanOutline);
    expect(sprout.planOutlineMarkNames).toBe(planOutlineMarkNames);
    expect(sprout.planOutlineToneNames).toBe(planOutlineToneNames);
    const manifest = JSON.parse(read('../packages/sprout/package.json'));
    expect(manifest.exports['./plan-outline']).toEqual({
      types: './dist/components/plan-outline.d.ts',
      import: './dist/components/plan-outline.js',
    });
    expect(read('../packages/sprout/src/styles/index.css')).toContain("@import './plan-outline.css';");
    expect(read('../apps/docs/src/data/nav.ts')).toMatch(/component\(\s*'Plan Outline'/);
  });

  it('lists every Cloud mark and tone', () => {
    expect(planOutlineMarkNames).toEqual(['pending', 'running', 'attention', 'blocked', 'done', 'failed', 'cancelled']);
    expect(planOutlineToneNames).toEqual(['active', 'attention', 'done', 'failed', 'neutral']);
  });

  it('maps each tone to its status badge color', () => {
    const badge = {
      active: 'info',
      attention: 'warning',
      done: 'success',
      failed: 'destructive',
      neutral: 'secondary',
    };
    for (const tone of planOutlineToneNames) {
      const html = render([], { tone, status: `Status ${tone}` });
      expect(html).toContain(`sprout-badge-${badge[tone]}`);
      expect(html).toMatch(new RegExp(`data-tone="${tone}"[^>]*>Status ${tone}<`));
    }
  });

  it('renders a named section with an h3, brief, rail, progress, notice, and stale slot', () => {
    const html = render(marks, {
      brief: 'A fictional example of a saved plan.',
      notice: <p>Actions affect this example only.</p>,
      stale: <p>Showing the last loaded plan</p>,
    });
    expect(html).toMatch(/^<section[^>]*data-slot="plan-outline"[^>]*aria-label="Meadow garden plan"/);
    expect(html).toMatch(/<h3[^>]*>Meadow garden plan<\/h3>/);
    expect(html).toContain('A fictional example of a saved plan.');
    expect(html).toContain('1 of 7 tasks complete');
    expect(html.indexOf('Actions affect this example only.')).toBeLessThan(
      html.indexOf('Showing the last loaded plan'),
    );
    // One segment per work task: groups flatten to their children; cancelled is left out.
    const rail = html.match(/<div[^>]*data-slot="plan-outline-rail"[\s\S]*?<\/div>/)![0];
    expect([...rail.matchAll(/data-mark="(\w+)"/g)].map(match => match[1])).toEqual([
      'pending',
      'running',
      'attention',
      'blocked',
      'done',
      'failed',
    ]);
    expect(rail).toContain('aria-hidden="true"');
  });

  it('renders groups open, task details closed, and static rows without a button', () => {
    const html = render([
      ...marks,
      {
        id: 'plain',
        title: 'Water the bed',
        mark: 'pending',
        label: 'Not started',
      },
    ]);
    expect(rows(html)).toEqual([
      'group:pending',
      'task:pending',
      'task:running',
      'task:attention',
      'task:blocked',
      'task:done',
      'task:failed',
      'task:cancelled',
      'task:pending',
    ]);
    expect(html).toContain('aria-label="Tasks"');
    expect(html).toContain('aria-label="1. pending task tasks"');
    expect(html).toContain('Pick a sunny patch');
    expect((html.match(/aria-expanded="true"/g) ?? []).length).toBe(1);
    expect((html.match(/aria-expanded="false"/g) ?? []).length).toBe(6);
    expect(html).not.toContain('Done when');
    const plain = html.slice(html.lastIndexOf('<li', html.indexOf('Water the bed')));
    expect(plain.slice(0, plain.indexOf('</li>'))).not.toContain('<button');
  });

  it("shows each mark's label and the spinner for running", () => {
    const html = render(marks);
    for (const label of Object.values(labels)) expect(html).toContain(`>${label}<`);
    const start = html.search(/<li[^>]*data-mark="running"/);
    const running = html.slice(start, html.indexOf('</li>', start));
    expect(running).toContain('data-slot="spinner"');
    expect(running).not.toContain('role="status"');
    expect(html).toContain('Alex Meadow');
  });

  it('renders an empty plan and an empty group', () => {
    expect(render([], { progress: 'No tasks yet' })).toContain('No tasks have been added yet.');
    expect(render([], { progress: 'No tasks yet' })).not.toContain('plan-outline-rail');
    const group = render([
      {
        id: 'follow',
        title: 'Follow up',
        mark: 'pending',
        label: 'No tasks yet',
        brief: 'Check in next week.',
        children: [],
      },
    ]);
    expect(group).toContain('This group has no tasks yet.');
    expect(group).toContain('Check in next week.');
  });

  it('scopes row ids so dependency links stay inside their outline', () => {
    const html = renderToString(
      <>
        <PlanOutline
          title="One"
          status="Running"
          tone="active"
          progress=""
          tasks={[{ id: 'a', title: 'A', mark: 'done', label: 'Done' }]}
        />
        <PlanOutline
          title="Two"
          status="Running"
          tone="active"
          progress=""
          tasks={[{ id: 'a', title: 'A', mark: 'done', label: 'Done' }]}
        />
      </>,
    );
    const ids = [...html.matchAll(/<li[^>]*id="([^"]+)"/g)].map(match => match[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(ids.every(id => /^plan-[\w-]+-task-a$/.test(id!))).toBe(true);
  });
});
