import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { AgentFanout, type AgentFanoutAgent } from '../../packages/sprout/src/components/agent-fanout.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const agent = (
  id: string,
  status: AgentFanoutAgent['status'],
  extra: Partial<AgentFanoutAgent> = {},
): AgentFanoutAgent => ({
  id,
  name: id,
  model: 'Sonnet 5.5',
  brand: 'claude',
  tools: ['notion', 'slack'],
  task: `${id} task`,
  status,
  elapsed: 12_000,
  ...extra,
});

const run = (extra: AgentFanoutAgent[] = []) =>
  agent('Orchestrator', 'running', {
    agents: [
      agent('Researcher', 'running', {
        agents: [agent('Scraper', 'done'), agent('Analyst', 'needs-you', { reason: 'Which market?' })],
      }),
      agent('Builder', 'running', {
        agents: [agent('Tester', 'failed', { reason: 'Coupons fail' }), ...extra],
      }),
    ],
  });

const card = (id: string) =>
  document.querySelector<HTMLElement>(`[data-slot="agent-fanout-card"][data-agent="${id}"]`)!;
const box = (element: Element) => element.getBoundingClientRect();
const wires = () => [
  ...document.querySelectorAll<SVGPathElement>('[data-slot="agent-fanout-wires"] .sprout-agent-fanout-wire'),
];
const ghosts = () => document.querySelectorAll('.sprout-agent-fanout-ghosts > *');
const root = () => document.querySelector<HTMLElement>('[data-slot="agent-fanout"]')!;

async function drawn(count: number) {
  await expect.poll(() => wires().length).toBe(count);
  await settle();
}

/** Where a wire ends, in page coordinates. */
function end(path: SVGPathElement) {
  const point = path.getPointAtLength(path.getTotalLength());
  const svg = box(path.ownerSVGElement!);
  return { x: svg.left + point.x, y: svg.top + point.y };
}

const sized = (width: number, node: ReactNode) => <div style={{ width, padding: 16 }}>{node}</div>;

describe('AgentFanout in a real browser', () => {
  it.each(themes)('%s %s passes axe, with the failed list open too', async (theme, mode) => {
    await emulate({ reducedMotion: true });
    setTheme(theme, mode);
    const screen = await render(
      sized(1100, <AgentFanout agent={run()} onRetry={() => {}} onDismiss={() => {}} onOpen={() => {}} />),
    );
    await drawn(5);
    expect(await axeViolations(screen.container)).toEqual([]);
    await userEvent.click(page.getByRole('button', { name: '1 failed' }));
    await expect.element(page.getByRole('dialog', { name: 'Agents that failed' })).toBeVisible();
    await settle();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it('puts the first agents side by side under a centered root, and wires every card', async () => {
    await render(sized(1100, <AgentFanout agent={run()} />));
    await drawn(5);
    expect(root().dataset.layout).toBe('tree');
    const [researcher, builder] = [box(card('Researcher')), box(card('Builder'))];
    expect(researcher.top).toBe(builder.top);
    expect(builder.left - researcher.right).toBeGreaterThanOrEqual(48);
    const lead = box(card('Orchestrator'));
    expect(Math.abs(lead.left + lead.width / 2 - (researcher.left + builder.right) / 2)).toBeLessThan(1);

    const ends = wires().map(end);
    for (const id of ['Researcher', 'Builder']) {
      const child = box(card(id));
      expect(
        ends.some(({ x, y }) => Math.abs(x - (child.left + child.width / 2)) < 1 && Math.abs(y - child.top) < 1),
      ).toBe(true);
    }
    for (const id of ['Scraper', 'Analyst', 'Tester']) {
      const child = box(card(id));
      const mark = box(card(id).querySelector('[data-slot="agent-fanout-mark"]')!);
      expect(
        ends.some(({ x, y }) => Math.abs(x - child.left) < 1 && Math.abs(y - (mark.top + mark.height / 2)) < 1),
      ).toBe(true);
    }
    expect(document.querySelectorAll('.sprout-agent-fanout-dot')).toHaveLength(3);
  });

  it('narrows a wide row to keep the tree, with icon-only statuses that still read', async () => {
    const ids = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
    await render(
      sized(
        800,
        <AgentFanout
          agent={agent('Lead', 'running', { agents: ids.map(id => agent(id, id === 'Delta' ? 'queued' : 'running')) })}
        />,
      ),
    );
    await drawn(4);
    expect(root().dataset.layout).toBe('tree');
    const tree = document.querySelector<HTMLElement>('[data-slot="agent-fanout-tree"]')!;
    expect(tree.scrollWidth).toBeLessThanOrEqual(tree.clientWidth);
    const boxes = ids.map(id => box(card(id)));
    for (const child of boxes) {
      expect(child.top).toBe(boxes[0]!.top);
      expect(child.width).toBeLessThan(box(card('Lead')).width);
      expect(child.width).toBeGreaterThanOrEqual(152);
    }
    const badge = card('Delta').querySelector('[data-slot="agent-fanout-status"]')!;
    expect(box(badge).top).toBeGreaterThanOrEqual(
      box(card('Delta').querySelector('.sprout-agent-fanout-task')!).bottom,
    );
    const status = card('Delta').querySelector<HTMLElement>('.sprout-agent-fanout-status-text')!;
    expect(status.textContent).toBe('Queued');
    expect(box(status).width).toBeLessThanOrEqual(1);
    expect(box(card('Lead').querySelector('.sprout-agent-fanout-status-text')!).width).toBeGreaterThan(1);
  });

  it('turns into a list that fits 390px without scrolling sideways', async () => {
    await render(sized(358, <AgentFanout agent={run()} />));
    await drawn(5);
    expect(root().dataset.layout).toBe('list');
    const tree = document.querySelector<HTMLElement>('[data-slot="agent-fanout-tree"]')!;
    expect(tree.scrollWidth).toBeLessThanOrEqual(tree.clientWidth);
    expect(box(card('Builder')).top).toBeGreaterThan(box(card('Analyst')).bottom);
    expect(box(card('Researcher')).left).toBeGreaterThan(box(card('Orchestrator')).left);
    expect(Math.round(box(card('Researcher')).right)).toBe(Math.round(box(card('Orchestrator')).right));
  });

  it('hides and shows the agents a card started', async () => {
    await render(sized(1100, <AgentFanout agent={run()} defaultCollapsed={['Builder']} />));
    await drawn(4);
    expect(card('Tester')).not.toBeVisible();
    const show = page.getByRole('button', { name: 'Show 1 agent started by Builder' });
    await expect.element(show).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(show);
    await expect.element(page.getByRole('button', { name: 'Hide 1 agent started by Builder' })).toHaveFocus();
    await drawn(5);
    expect(card('Tester')).toBeVisible();
  });

  it('lists failed agents with Retry and Dismiss, and agents that need you with Open', async () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    const onOpen = vi.fn();
    await render(sized(1100, <AgentFanout agent={run()} onRetry={onRetry} onDismiss={onDismiss} onOpen={onOpen} />));
    await userEvent.click(page.getByRole('button', { name: '1 failed' }));
    const failed = page.getByRole('dialog', { name: 'Agents that failed' });
    await expect.element(failed.getByText('Coupons fail')).toBeVisible();
    await userEvent.click(failed.getByRole('button', { name: 'Dismiss' }));
    await userEvent.click(failed.getByRole('button', { name: 'Retry' }));
    expect(onDismiss).toHaveBeenCalledWith(expect.objectContaining({ id: 'Tester' }));
    expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ id: 'Tester' }));
    await userEvent.keyboard('{Escape}');
    await userEvent.click(page.getByRole('button', { name: '1 needs you' }));
    await userEvent.click(page.getByRole('button', { name: 'Open Analyst' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'Analyst' }));
  });

  it('draws a new agent in, slides its neighbors, and updates the live counts', async () => {
    await emulate({ reducedMotion: false });
    const screen = await render(sized(1100, <AgentFanout agent={run()} />));
    await drawn(5);
    await expect.poll(() => root().hasAttribute('data-live')).toBe(true);
    const status = page.getByRole('status');
    await expect.element(status).toHaveTextContent('6 agents, 3 running, 1 needs you, 1 failed');
    await screen.rerender(sized(1100, <AgentFanout agent={run([agent('Linter', 'running')])} />));
    await expect.poll(() => wires().length).toBe(6);
    const moving = document
      .getAnimations()
      .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity);
    expect(moving.length).toBeGreaterThan(0);
    await expect.element(status).toHaveTextContent('7 agents, 4 running, 1 needs you, 1 failed');
  });

  it('fades out the agents a card hides, retracts their lines, then clears the copies', async () => {
    await emulate({ reducedMotion: false });
    await render(sized(1100, <AgentFanout agent={run()} />));
    await drawn(5);
    await expect.poll(() => root().hasAttribute('data-live')).toBe(true);
    await userEvent.click(page.getByRole('button', { name: 'Hide 2 agents started by Researcher' }));
    expect(wires()).toHaveLength(3);
    const copies = document.querySelectorAll('.sprout-agent-fanout-ghost');
    expect(copies).toHaveLength(2);
    for (const copy of copies) {
      expect(copy.hasAttribute('data-slot')).toBe(false);
      expect(copy.closest('[aria-hidden="true"][inert]')).not.toBeNull();
    }
    expect(document.querySelectorAll('.sprout-agent-fanout-ghosts .sprout-agent-fanout-wire')).toHaveLength(2);
    await expect.poll(() => ghosts().length).toBe(0);
  });

  it('lights only the lines that lead to running agents', async () => {
    await emulate({ reducedMotion: true });
    await render(sized(1100, <AgentFanout agent={run([agent('Linter', 'running')])} />));
    await drawn(6);
    const lit = wires().filter(wire => wire.hasAttribute('data-active'));
    // Root to Researcher and Builder, and Builder to Linter.
    expect(lit).toHaveLength(3);
    expect(getComputedStyle(lit[0]!).stroke).not.toBe(
      getComputedStyle(wires().find(wire => !wire.hasAttribute('data-active'))!).stroke,
    );
  });

  it('reduced motion only fades, and nothing moves', async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(sized(1100, <AgentFanout agent={run()} />));
    await drawn(5);
    await expect.poll(() => root().hasAttribute('data-live')).toBe(true);
    await screen.rerender(sized(1100, <AgentFanout agent={run([agent('Linter', 'running')])} />));
    await expect.poll(() => wires().length).toBe(6);
    const running = document
      .getAnimations()
      .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity);
    expect(running.length).toBeGreaterThan(0);
    for (const animation of running) expect((animation as CSSTransition).transitionProperty).toBe('opacity');
  });
});
