import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { TaskTree, type TaskTreeTask } from '../../packages/sprout/src/components/task-tree.js';
import type { StatusState } from '../../packages/sprout/src/components/status.js';
import { axeViolations, emulate, resetEmulation, setTheme, settle, themes } from './support.js';

afterEach(resetEmulation);

const tasks = (last: StatusState): TaskTreeTask[] => [
  { id: 'scaffold', title: 'Scaffolding project', state: 'success' },
  {
    id: 'build',
    title: 'Building app',
    children: [
      { id: 'web', title: 'Building web', state: 'success' },
      { id: 'api', title: 'Building API', state: last, detail: '12s' },
    ],
  },
];

function Tree({ last = 'running' }: { last?: StatusState }) {
  return (
    <div style={{ width: 360, padding: 16, background: 'var(--sprout-canvas)' }}>
      <TaskTree tasks={tasks(last)} data-testid="tree" />
    </div>
  );
}

const drawn = (root: Element) =>
  expect.poll(() => root.querySelector('.sprout-task-tree-flow[data-drawn]')).not.toBeNull();
const row = (root: Element, title: string) =>
  [...root.querySelectorAll('.sprout-task-tree-flow .sprout-task-tree-row')].find(element =>
    element.textContent?.includes(title),
  )!;

describe('TaskTree', () => {
  it.each(themes)('has no axe violations in %s %s', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Tree />);
    await drawn(screen.container);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('swaps the server drawing for React Flow in place', async () => {
    const screen = await render(<Tree />);
    const root = screen.container;
    const before = root.querySelector('.sprout-task-tree-sketch .sprout-task-tree-row:nth-of-type(2)')!;
    const box = before.getBoundingClientRect();
    await drawn(root);
    expect(root.querySelector('.sprout-task-tree-sketch')).toBeNull();
    const after = row(root, 'Building app').getBoundingClientRect();
    expect([after.left, after.top]).toEqual([box.left, box.top]);
    expect(root.querySelectorAll('.sprout-task-tree-flow .sprout-task-tree-path')).toHaveLength(2);
  });

  it('grows the green line up before the parent finishes', async () => {
    await emulate({ reducedMotion: false });
    const screen = await render(<Tree />);
    const root = screen.container;
    await drawn(root);
    expect(row(root, 'Building app').getAttribute('data-state')).toBe('running');
    await screen.rerender(<Tree last="success" />);
    const lines = [...root.querySelectorAll<SVGPathElement>('.sprout-task-tree-flow .sprout-task-tree-path-done')];
    expect(lines).toHaveLength(2);
    expect(lines.some(line => line.getAnimations().length > 0)).toBe(true);
    expect(row(root, 'Building app').getAttribute('data-state')).toBe('running');
    await expect.poll(() => row(root, 'Building app').getAttribute('data-state')).toBe('success');
    expect(root.querySelector('.sprout-task-tree-summary')!.textContent).toBe('3 of 3 done');
  });

  it('shows changes at once with reduced motion', async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Tree />);
    const root = screen.container;
    await drawn(root);
    await screen.rerender(<Tree last="success" />);
    await expect.poll(() => row(root, 'Building app').getAttribute('data-state')).toBe('success');
    for (const line of root.querySelectorAll('.sprout-task-tree-flow .sprout-task-tree-path-done'))
      expect(line.getAnimations()).toHaveLength(0);
  });

  it('shows a failed part on its parent without waiting', async () => {
    await emulate({ reducedMotion: false });
    const screen = await render(<Tree />);
    const root = screen.container;
    await drawn(root);
    await screen.rerender(<Tree last="error" />);
    await expect.poll(() => row(root, 'Building app').getAttribute('data-state'), { timeout: 100 }).toBe('error');
  });
});
