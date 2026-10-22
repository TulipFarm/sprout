// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TaskTree, type TaskTreeTask } from '../packages/sprout/src/components/task-tree.js';
import * as sprout from '../packages/sprout/src/index.js';

const file = (path: string) => readFileSync(fileURLToPath(new globalThis.URL(path, import.meta.url).href), 'utf8');
const doc = (html: string) => new DOMParser().parseFromString(html, 'text/html');
const outline = (html: string) => doc(html).querySelector('.sprout-task-tree-outline')!;
const itemState = (html: string, title: string) =>
  [...outline(html).querySelectorAll('li')]
    .find(item => item.querySelector('.sprout-task-tree-item-title')!.textContent === title)!
    .getAttribute('data-state');

const parent = (children: TaskTreeTask[], extra: Partial<TaskTreeTask> = {}): TaskTreeTask[] => [
  { id: 'p', title: 'Parent', children, ...extra },
];

describe('TaskTree', () => {
  it('is exported from the package root and its subpath', () => {
    expect(sprout).toHaveProperty('TaskTree');
    const manifest = JSON.parse(file('../packages/sprout/package.json'));
    expect(manifest.exports['./task-tree']).toEqual({
      types: './dist/components/task-tree.d.ts',
      import: './dist/components/task-tree.js',
    });
    expect(file('../packages/sprout/src/styles/index.css')).toContain("@import './task-tree.css';");
  });

  it('is a section named by its heading, with a polite count of finished leaves', () => {
    const html = renderToString(
      <TaskTree
        tasks={parent([
          { id: 'a', title: 'A', state: 'success' },
          { id: 'b', title: 'B', state: 'skipped' },
          { id: 'c', title: 'C', state: 'running' },
        ])}
      />,
    );
    const section = doc(html).querySelector('section')!;
    expect(section.getAttribute('data-slot')).toBe('task-tree');
    const heading = section.querySelector('h3')!;
    expect(heading.textContent).toBe('Tasks');
    expect(section.getAttribute('aria-labelledby')).toBe(heading.id);
    const summary = section.querySelector('.sprout-task-tree-summary')!;
    expect(summary.textContent).toBe('2 of 3 done');
    expect(summary.getAttribute('aria-live')).toBe('polite');
  });

  it('gives screen readers nested lists with named marks, and hides the drawing', () => {
    const html = renderToString(
      <TaskTree
        tasks={parent([
          { id: 'a', title: 'A', state: 'success' },
          { id: 'b', title: 'B', state: 'running', value: 40 },
        ])}
      />,
    );
    const lists = outline(html).querySelectorAll('ul');
    expect(lists).toHaveLength(2);
    expect(lists[1]!.parentElement!.closest('li')!.getAttribute('data-state')).toBe('running');
    expect([...outline(html).querySelectorAll('[role="img"]')].map(mark => mark.getAttribute('aria-label'))).toEqual([
      'Running, 50%',
      'Succeeded',
      'Running, 40%',
    ]);
    expect(doc(html).querySelector('.sprout-task-tree-stage')!.getAttribute('aria-hidden')).toBe('true');
  });

  it.each([
    [['success', 'error', 'running'], 'error'],
    [['success', 'running', 'paused'], 'running'],
    [['success', 'paused', 'pending'], 'paused'],
    [['pending', 'pending'], 'pending'],
    [['success', 'skipped'], 'success'],
    [['success', 'warning'], 'warning'],
    [['skipped', 'skipped'], 'skipped'],
    [['success', 'stopped'], 'stopped'],
    [['success', 'pending'], 'running'],
  ] as const)('rolls %j up to %s', (states, expected) => {
    const html = renderToString(
      <TaskTree tasks={parent(states.map((state, index) => ({ id: `${index}`, title: `${index}`, state })))} />,
    );
    expect(itemState(html, 'Parent')).toBe(expected);
  });

  it('rolls up through every level, and a parent’s own state wins', () => {
    const tasks = parent([
      { id: 'mid', title: 'Mid', children: [{ id: 'leaf', title: 'Leaf', state: 'error' }] },
      { id: 'own', title: 'Own', state: 'success', children: [{ id: 'x', title: 'X' }] },
    ]);
    const html = renderToString(<TaskTree tasks={tasks} />);
    expect(itemState(html, 'Mid')).toBe('error');
    expect(itemState(html, 'Parent')).toBe('error');
    expect(itemState(html, 'Own')).toBe('success');
  });

  it('replaces or hides the count, and shows the empty text', () => {
    const tasks = parent([{ id: 'a', title: 'A' }]);
    expect(renderToString(<TaskTree tasks={tasks} summary="Almost there" />)).toContain('Almost there');
    expect(renderToString(<TaskTree tasks={tasks} summary={null} />)).not.toContain('sprout-task-tree-summary');
    expect(renderToString(<TaskTree tasks={[]} />)).toContain('No tasks yet.');
    expect(renderToString(<TaskTree tasks={[]} empty="Nothing queued" />)).toContain('Nothing queued');
    expect(renderToString(<TaskTree tasks={[]} title="Steps" />)).toContain('Steps');
  });

  it('draws one part straight down and several as branches, green below a success', () => {
    const html = renderToString(
      <TaskTree
        tasks={[
          { id: 'a', title: 'A', state: 'success', children: [{ id: 'b', title: 'B', state: 'success' }] },
          {
            id: 'c',
            title: 'C',
            children: [
              { id: 'd', title: 'D', state: 'success' },
              { id: 'e', title: 'E' },
            ],
          },
        ]}
      />,
    );
    const sketch = doc(html).querySelector('.sprout-task-tree-sketch')!;
    const lines = [...sketch.querySelectorAll('.sprout-task-tree-sketch-lines > g')].map(group => [
      group.querySelector('.sprout-task-tree-path')!.getAttribute('d'),
      group.querySelector('.sprout-task-tree-path-done') !== null,
    ]);
    expect(lines).toEqual([
      ['M 8 26 V 38', true],
      ['M 8 90 V 106 Q 8 112 14 112 H 21', true],
      ['M 8 90 V 138 Q 8 144 14 144 H 21', false],
    ]);
    const rows = [...sketch.querySelectorAll<HTMLElement>('.sprout-task-tree-row')];
    expect(rows.map(row => [row.style.left, row.style.top])).toEqual([
      ['0px', '0px'],
      ['0px', '32px'],
      ['0px', '64px'],
      ['24px', '96px'],
      ['24px', '128px'],
    ]);
  });
});
