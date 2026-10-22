// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentFanout, type AgentFanoutAgent } from '../packages/sprout/src/components/agent-fanout.js';

const agent = (
  id: string,
  status: AgentFanoutAgent['status'],
  extra: Partial<AgentFanoutAgent> = {},
): AgentFanoutAgent => ({ id, name: id, task: `${id} task`, status, ...extra });

const run = (lead: AgentFanoutAgent['status'] = 'running') =>
  agent('lead', lead, {
    brand: 'claude',
    tools: ['slack', 'notion', 'github', 'linear', 'figma'],
    elapsed: 7_500_000,
    agents: [
      agent('writer', 'needs-you', { brand: 'grok', reason: 'Pick a plan name' }),
      agent('coder', 'running', {
        icon: <svg />,
        elapsed: 61_000,
        agents: [agent('tester', 'failed', { reason: 'Coupons fail' }), agent('linter', 'stopped')],
      }),
      agent('scout', 'queued'),
    ],
  });

/** Fake layout: cards stack 120px apart, indented 40px per depth. */
let width = 1400;
let shift = 0;
let reduce = false;
const animations: { node: Element; keyframes: unknown }[] = [];
const settle: Array<() => void> = [];

const order = (card: HTMLElement) =>
  [...card.closest('[data-slot="agent-fanout-tree"]')!.querySelectorAll('[data-slot="agent-fanout-card"]')].indexOf(
    card,
  );
const isCard = (node: HTMLElement) =>
  node.dataset.slot === 'agent-fanout-card' && !node.closest('.sprout-agent-fanout-ghosts');

function getter<K extends keyof HTMLElement>(key: K, get: (node: HTMLElement) => unknown) {
  vi.spyOn(HTMLElement.prototype, key as never, 'get' as never).mockImplementation(function (this: HTMLElement) {
    return get(this);
  } as never);
}

beforeEach(() => {
  width = 1400;
  shift = 0;
  reduce = false;
  animations.length = 0;
  settle.length = 0;
  getter('offsetParent', node => {
    if (node.closest('[hidden]')) return null;
    if (node.dataset.slot === 'agent-fanout-mark') return node.closest('[data-slot="agent-fanout-card"]');
    if (isCard(node)) return node.closest('[data-slot="agent-fanout-tree"]');
    return node.parentElement;
  });
  getter('offsetLeft', node =>
    isCard(node) ? shift + Number(node.dataset.depth) * 40 : node.dataset.slot === 'agent-fanout-mark' ? 16 : 0,
  );
  getter('offsetTop', node => (isCard(node) ? order(node) * 120 : node.dataset.slot === 'agent-fanout-mark' ? 16 : 0));
  getter('offsetWidth', node =>
    isCard(node) ? 200 : node.dataset.slot === 'agent-fanout-mark' ? 32 : node.className.includes('probe') ? 276 : 0,
  );
  getter('offsetHeight', node => {
    if (isCard(node)) return 100;
    if (node.dataset.slot === 'agent-fanout-mark') return 32;
    if (node.dataset.slot === 'agent-fanout-tree')
      return node.querySelectorAll('[data-slot="agent-fanout-card"]:not([hidden] *)').length * 120;
    return 0;
  });
  getter('clientWidth', () => width);
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce, media: query }) as MediaQueryList);
  vi.stubGlobal('CSS', { escape: (value: string) => value });
  Element.prototype.animate = vi.fn(function (this: Element, keyframes: unknown) {
    animations.push({ node: this, keyframes });
    let done!: () => void;
    const finished = new Promise<void>(resolve => (done = resolve));
    settle.push(done);
    return { finished } as unknown as Animation;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const frame = () => act(() => new Promise(resolve => setTimeout(resolve, 20)));
const finish = () =>
  act(async () => {
    for (const done of settle.splice(0)) done();
    await Promise.resolve();
    await Promise.resolve();
  });
const section = () => document.querySelector<HTMLElement>('[data-slot="agent-fanout"]')!;
const ghosts = () => document.querySelector('.sprout-agent-fanout-ghosts')!;

describe('AgentFanout in the DOM', () => {
  it('draws wires and dots from the fake layout, and goes live after the first drawing', async () => {
    render(<AgentFanout agent={run()} />);
    await frame();
    expect(section().dataset.live).toBe('true');
    const wires = document.querySelectorAll('[data-slot="agent-fanout-wires"] path');
    expect(wires).toHaveLength(5);
    expect([...wires].filter(wire => wire.hasAttribute('data-active'))).toHaveLength(1);
    expect(document.querySelectorAll('[data-slot="agent-fanout-wires"] circle')).toHaveLength(2);
    expect(section().dataset.layout).toBe('tree');
    expect(screen.getByText('2h 05m')).toBeTruthy();
    expect(screen.getByText('1m 01s')).toBeTruthy();
    expect(screen.getByText('+2')).toBeTruthy();
    expect(screen.getByText('Grok')).toBeTruthy();
    expect(animations).toHaveLength(0);
  });

  it('falls back to a list when the row does not fit, and keeps tree or list when asked', async () => {
    width = 300;
    const { rerender } = render(<AgentFanout agent={run()} />);
    await frame();
    expect(section().dataset.layout).toBe('list');
    rerender(<AgentFanout agent={run()} layout="tree" />);
    expect(section().dataset.layout).toBe('tree');
    rerender(<AgentFanout agent={agent('solo', 'done')} />);
    await frame();
    expect(section().dataset.layout).toBe('tree');
    expect(document.querySelectorAll('[data-slot="agent-fanout-wires"] path')).toHaveLength(0);
  });

  it('fades hidden cards and retracts their wires, then clears them', async () => {
    render(<AgentFanout agent={run()} />);
    await frame();
    fireEvent.click(screen.getByRole('button', { name: 'Hide 2 agents started by coder' }));
    expect(screen.getByRole('button', { name: 'Show 2 agents started by coder' }).textContent).toContain('+2');
    const cards = ghosts().querySelectorAll('.sprout-agent-fanout-ghost');
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card.hasAttribute('data-slot')).toBe(false);
      expect(card.hasAttribute('data-agent')).toBe(false);
    }
    expect(ghosts().querySelectorAll(':scope > svg path')).toHaveLength(2);
    expect(ghosts().querySelectorAll(':scope > svg circle')).toHaveLength(1);
    const kinds = animations.map(({ keyframes }) => Object.keys(keyframes as object).join());
    expect(kinds).toContain('opacity,translate');
    expect(kinds).toContain('strokeDashoffset');
    expect(animations.some(({ node }) => node.matches('[data-slot="agent-fanout-tree"]'))).toBe(true);
    await finish();
    expect(ghosts().childElementCount).toBe(0);
  });

  it('only fades under reduced motion and skips the height ease', async () => {
    reduce = true;
    render(<AgentFanout agent={run()} defaultCollapsed={['lead']} />);
    await frame();
    expect(document.querySelectorAll('[data-slot="agent-fanout-wires"] path')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Show 3 agents started by lead' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide 3 agents started by lead' }));
    expect(animations.length).toBeGreaterThan(0);
    for (const { keyframes } of animations) expect(Object.keys(keyframes as object)).toEqual(['opacity']);
    expect(animations.some(({ node }) => node.matches('[data-slot="agent-fanout-tree"]'))).toBe(false);
  });

  it('slides cards that move, and lights wires as agents start running', async () => {
    const { rerender } = render(<AgentFanout agent={run('done')} />);
    await frame();
    shift = 24;
    rerender(<AgentFanout agent={run('running')} />);
    const slides = animations.filter(({ keyframes }) => Array.isArray(keyframes)).length;
    expect(slides).toBeGreaterThan(0);
    rerender(<AgentFanout agent={run('running')} />);
    expect(animations.filter(({ keyframes }) => Array.isArray(keyframes))).toHaveLength(slides);
  });

  it('removes wires to agents that left the run', async () => {
    const full = run();
    const { rerender } = render(<AgentFanout agent={full} />);
    await frame();
    rerender(<AgentFanout agent={{ ...full, agents: full.agents!.slice(0, 1) }} />);
    expect(ghosts().querySelectorAll('.sprout-agent-fanout-ghost').length).toBeGreaterThan(0);
    expect(ghosts().querySelector('path[data-active]')).toBeTruthy();
    await finish();
    expect(ghosts().childElementCount).toBe(0);
  });

  it('lists agents that need you or failed, with their actions', async () => {
    const onOpen = vi.fn();
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    render(<AgentFanout agent={run()} onOpen={onOpen} onRetry={onRetry} onDismiss={onDismiss} />);
    await frame();
    fireEvent.click(screen.getByText(/needs you/, { selector: '[data-slot="agent-fanout-issues"]' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open writer' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'writer' }));
    fireEvent.click(screen.getByText(/failed/, { selector: '[data-slot="agent-fanout-issues"]' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ id: 'tester' }));
    expect(onDismiss).toHaveBeenCalledWith(expect.objectContaining({ id: 'tester' }));
    expect(screen.getByText('Coupons fail')).toBeTruthy();
  });

  it('lists failed agents without actions when no handlers are passed', async () => {
    render(<AgentFanout agent={agent('lead', 'failed')} />);
    await frame();
    fireEvent.click(screen.getByText(/failed/, { selector: '[data-slot="agent-fanout-issues"]' }));
    expect(await screen.findByText('lead task', { selector: '.sprout-agent-fanout-issue-task' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('redraws when observed sizes change', async () => {
    const callbacks: Array<() => void> = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          callbacks.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<AgentFanout agent={run()} />);
    await frame();
    width = 300;
    act(() => callbacks.at(-1)!());
    expect(section().dataset.layout).toBe('list');
  });
});
