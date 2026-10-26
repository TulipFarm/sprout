'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Check } from 'reicon-react/icons/Check';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { ClockCircle } from 'reicon-react/icons/ClockCircle';
import { Danger } from 'reicon-react/icons/Danger';
import { Hourglass } from 'reicon-react/icons/Hourglass';
import { Sparkle } from 'reicon-react/icons/Sparkle';
import { StopCircle } from 'reicon-react/icons/StopCircle';
import { cn } from '../internal/classes.js';
import { Badge, type BadgeVariant } from './badge.js';
import { BrandIcon, BrandStack, BrandTile, brandNames, type Brand } from './brand-icon.js';
import { Button } from './button.js';
import { Popover, PopoverContent, PopoverTrigger } from './popover.js';

export const agentFanoutStatusNames = ['queued', 'running', 'needs-you', 'done', 'failed', 'stopped'] as const;

export const agentFanoutLayoutNames = ['auto', 'tree', 'list'] as const;

export type AgentFanoutStatus = (typeof agentFanoutStatusNames)[number];
export type AgentFanoutLayout = (typeof agentFanoutLayoutNames)[number];

export interface AgentFanoutAgent {
  id: string;
  /** The agent's role, such as “Researcher”. */
  name: string;
  /** The model it runs on, such as “Sonnet 5.5”. Defaults to the brand's name. */
  model?: string | undefined;
  /** The model's maker. Its logo marks the agent. */
  brand?: Brand | undefined;
  /** Replaces the brand logo, for agents that are not a known model. */
  icon?: ReactNode;
  /** What the agent was asked to do. */
  task: string;
  /** The apps the agent uses, shown before the task. */
  tools?: readonly Brand[] | undefined;
  status: AgentFanoutStatus;
  /** How long the agent has run, in ms. Your app owns the clock. */
  elapsed?: number | undefined;
  /** Why it failed, or what it needs from you. Shown in the header's list. */
  reason?: string | undefined;
  /** The agents this agent started. */
  agents?: readonly AgentFanoutAgent[] | undefined;
}

export interface AgentFanoutProps {
  /** The agent that starts the others. */
  agent: AgentFanoutAgent;
  /** The header title. */
  title?: ReactNode;
  /**
   * `tree` puts the first agents it starts side by side, narrowing their cards
   * to fit, `list` stacks every agent under its parent, and `auto` uses `tree`
   * while the narrowest cards still fit the width.
   */
  layout?: AgentFanoutLayout | undefined;
  /** Agents whose subagents start hidden. */
  defaultCollapsed?: readonly string[] | undefined;
  /** Shows Retry on failed agents in the header's list. */
  onRetry?: ((agent: AgentFanoutAgent) => void) | undefined;
  /** Shows Dismiss on failed agents in the header's list. */
  onDismiss?: ((agent: AgentFanoutAgent) => void) | undefined;
  /** Shows Open on agents that need you in the header's list. */
  onOpen?: ((agent: AgentFanoutAgent) => void) | undefined;
  className?: string | undefined;
}

const statusText: Record<AgentFanoutStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  'needs-you': 'Needs you',
  done: 'Done',
  failed: 'Failed',
  stopped: 'Stopped',
};

const statusVariant: Record<AgentFanoutStatus, BadgeVariant> = {
  queued: 'outline',
  running: 'info',
  'needs-you': 'warning',
  done: 'success',
  failed: 'destructive',
  stopped: 'secondary',
};

const maxTools = 4;

const pad = (value: number) => String(value).padStart(2, '0');

/** 9s, 1m 06s, 2h 05m. */
function formatElapsed(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${pad(seconds % 60)}s`;
  return `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;
}

function flatten(agent: AgentFanoutAgent): AgentFanoutAgent[] {
  return [agent, ...(agent.agents ?? []).flatMap(flatten)];
}

/** Levels in the tree, counting `agent` as one. */
function levels(agent: AgentFanoutAgent): number {
  return 1 + Math.max(0, ...(agent.agents ?? []).map(levels));
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Running, or started an agent that is. */
const busy = (agent: AgentFanoutAgent): boolean => agent.status === 'running' || (agent.agents ?? []).some(busy);

function Arc() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" data-icon="inline-start" className="sprout-agent-fanout-arc">
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function StatusIcon({ status }: { status: AgentFanoutStatus }) {
  const props = { 'aria-hidden': true, 'data-icon': 'inline-start' } as const;
  switch (status) {
    case 'running':
      return <Arc />;
    case 'needs-you':
      return <ClockCircle {...props} />;
    case 'done':
      return <Check {...props} />;
    case 'failed':
      return <Danger {...props} />;
    case 'stopped':
      return <StopCircle {...props} />;
    default:
      return <Hourglass {...props} />;
  }
}

/** A number that rolls in when it changes. */
function Count({ value }: { value: number }) {
  return (
    <span key={value} className="sprout-agent-fanout-count">
      {value}
    </span>
  );
}

function Mark({ agent }: { agent: AgentFanoutAgent }) {
  if (agent.icon === undefined && agent.brand)
    return (
      <BrandIcon brand={agent.brand} size="md" data-slot="agent-fanout-mark" className="sprout-agent-fanout-mark" />
    );
  return (
    <BrandTile size="md" data-slot="agent-fanout-mark" className="sprout-agent-fanout-mark">
      <span aria-hidden="true" className="sprout-agent-fanout-mark-icon">
        {agent.icon ?? <Sparkle size={16} />}
      </span>
    </BrandTile>
  );
}

function Tools({ tools }: { tools: readonly Brand[] }) {
  const shown = tools.length > maxTools ? tools.slice(0, maxTools - 1) : tools;
  return (
    <span className="sprout-agent-fanout-tools">
      <BrandStack
        brands={shown.map(brand => ({ brand, name: brandNames[brand] }))}
        label={`Uses ${tools.map(brand => brandNames[brand]).join(', ')}`}
      />
      {shown.length < tools.length && (
        <span aria-hidden="true" className="sprout-agent-fanout-tools-more">
          +{tools.length - shown.length}
        </span>
      )}
    </span>
  );
}

interface BranchProps {
  agent: AgentFanoutAgent;
  depth: number;
  row: boolean;
  collapsed: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

function Branch({ agent, depth, row, collapsed, onToggle }: BranchProps) {
  const listId = useId();
  const kids = agent.agents ?? [];
  const open = !collapsed.has(agent.id);
  const count = kids.length;
  const model = agent.model ?? (agent.brand && brandNames[agent.brand]);
  return (
    <li data-slot="agent-fanout-branch" className="sprout-agent-fanout-branch">
      <div
        data-slot="agent-fanout-card"
        data-agent={agent.id}
        data-status={agent.status}
        data-depth={depth}
        className="sprout-agent-fanout-card"
      >
        <div className="sprout-agent-fanout-head">
          <Mark agent={agent} />
          <div className="sprout-agent-fanout-who">
            <span className="sprout-agent-fanout-name">{agent.name}</span>
            {model && <span className="sprout-agent-fanout-model">{model}</span>}
          </div>
          <Badge
            key={agent.status}
            variant={statusVariant[agent.status]}
            data-slot="agent-fanout-status"
            className="sprout-agent-fanout-status"
          >
            <StatusIcon status={agent.status} />
            <span className="sprout-agent-fanout-status-text">{statusText[agent.status]}</span>
          </Badge>
        </div>
        <p className="sprout-agent-fanout-task">
          {agent.tools && agent.tools.length > 0 && <Tools tools={agent.tools} />}
          <span className="sprout-agent-fanout-task-text">{agent.task}</span>
        </p>
        {/* Stays in the DOM when empty: narrow cards show the status here. */}
        <div className="sprout-agent-fanout-foot">
          {agent.elapsed !== undefined && (
            <time dateTime={`PT${Math.max(0, Math.floor(agent.elapsed / 1000))}S`} className="sprout-agent-fanout-time">
              {formatElapsed(agent.elapsed)}
            </time>
          )}
          {count > 0 && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={listId}
              aria-label={`${open ? 'Hide' : 'Show'} ${plural(count, 'agent', 'agents')} started by ${agent.name}`}
              data-slot="agent-fanout-toggle"
              className="sprout-agent-fanout-toggle"
              onClick={() => onToggle(agent.id)}
            >
              {open ? count : `+${count}`}
              <ChevronDown size={14} aria-hidden="true" data-icon="inline-end" />
            </button>
          )}
        </div>
      </div>
      {count > 0 && (
        <ul
          id={listId}
          hidden={!open}
          aria-label={`Started by ${agent.name}`}
          data-layout={row ? 'row' : 'stack'}
          className="sprout-agent-fanout-children"
        >
          {kids.map(kid => (
            <Branch key={kid.id} agent={kid} depth={depth + 1} row={false} collapsed={collapsed} onToggle={onToggle} />
          ))}
        </ul>
      )}
    </li>
  );
}

function Issues({
  kind,
  agents,
  onRetry,
  onDismiss,
  onOpen,
}: {
  kind: 'needs-you' | 'failed';
  agents: AgentFanoutAgent[];
  onRetry: AgentFanoutProps['onRetry'];
  onDismiss: AgentFanoutProps['onDismiss'];
  onOpen: AgentFanoutProps['onOpen'];
}) {
  const label = kind === 'failed' ? 'failed' : 'needs you';
  return (
    <Popover>
      <PopoverTrigger data-slot="agent-fanout-issues" data-kind={kind} className="sprout-agent-fanout-chip">
        <Count value={agents.length} />
        {` ${label}`}
        <ChevronDown size={14} aria-hidden="true" data-icon="inline-end" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        aria-label={kind === 'failed' ? 'Agents that failed' : 'Agents that need you'}
        className="sprout-agent-fanout-issues"
      >
        <ul className="sprout-agent-fanout-issue-list">
          {agents.map(agent => (
            <li key={agent.id} data-kind={kind} className="sprout-agent-fanout-issue">
              <span aria-hidden="true" className="sprout-agent-fanout-issue-mark">
                {kind === 'failed' ? <Danger size={16} /> : <ClockCircle size={16} />}
              </span>
              <div className="sprout-agent-fanout-issue-body">
                <p className="sprout-agent-fanout-issue-title">
                  <span className="sprout-agent-fanout-issue-name">{agent.name}</span>
                  <span className="sprout-agent-fanout-issue-task">{agent.task}</span>
                </p>
                {agent.reason && <p className="sprout-agent-fanout-issue-reason">{agent.reason}</p>}
                {kind === 'failed' && (onDismiss || onRetry) && (
                  <div className="sprout-agent-fanout-issue-actions">
                    {onDismiss && (
                      <Button variant="outline" size="sm" onClick={() => onDismiss(agent)}>
                        Dismiss
                      </Button>
                    )}
                    {onRetry && (
                      <Button size="sm" onClick={() => onRetry(agent)}>
                        Retry
                      </Button>
                    )}
                  </div>
                )}
                {kind === 'needs-you' && onOpen && (
                  <div className="sprout-agent-fanout-issue-actions">
                    <Button size="sm" aria-label={`Open ${agent.name}`} onClick={() => onOpen(agent)}>
                      Open
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

type Box = { x: number; y: number; w: number; h: number };
type Wire = { id: string; d: string; active: boolean };
type Dot = { id: string; x: number; y: number; active: boolean };
type Geometry = { wires: Wire[]; dots: Dot[]; width: number; height: number };

const emptyGeometry: Geometry = { wires: [], dots: [], width: 0, height: 0 };

/** Whether the row fits, and the card width and gap it fits at, in px. */
interface Fit {
  fits: boolean;
  card?: number;
  gap?: number;
}

const fullFit: Fit = { fits: true };

/** Position inside `root`, ignoring transforms so running slides don't skew it. */
function boxIn(element: HTMLElement, root: HTMLElement): Box | null {
  if (element.offsetParent === null) return null;
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = element;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
    if (node && node !== root) {
      x += node.clientLeft;
      y += node.clientTop;
    }
  }
  return node ? { x, y, w: element.offsetWidth, h: element.offsetHeight } : null;
}

const round = (value: number) => Math.round(value * 2) / 2;

/** Elbow from a parent's bottom center to a child's top center, through a shared bus. */
function busWire(sx: number, sy: number, child: Box) {
  const cx = round(child.x + child.w / 2);
  const bus = round(sy + (child.y - sy) / 2);
  const sign = Math.sign(cx - sx);
  const r = Math.min(10, Math.abs(cx - sx) / 2, (child.y - sy) / 2);
  return `M${sx} ${sy} V${bus - r} Q${sx} ${bus} ${sx + sign * r} ${bus} H${cx - sign * r} Q${cx} ${bus} ${cx} ${bus + r} V${child.y}`;
}

/** Down the parent's left rail, then into the child's left edge level with its mark. */
function railWire(sx: number, sy: number, child: Box, hook: number) {
  const y = round(child.y + hook);
  const r = Math.min(8, child.x - sx, y - sy);
  return `M${sx} ${sy} V${y - r} Q${sx} ${y} ${sx + r} ${y} H${child.x}`;
}

function measure(root: AgentFanoutAgent, tree: HTMLElement, collapsed: ReadonlySet<string>) {
  const cards = new Map<string, HTMLElement>();
  for (const card of tree.querySelectorAll<HTMLElement>('[data-slot="agent-fanout-card"]'))
    cards.set(card.dataset.agent!, card);
  const boxes = new Map<string, Box>();
  for (const [id, card] of cards) {
    const box = boxIn(card, tree);
    if (box) boxes.set(id, box);
  }
  const wires: Wire[] = [];
  const dots: Dot[] = [];
  const walk = (agent: AgentFanoutAgent) => {
    const kids = agent.agents ?? [];
    const parent = boxes.get(agent.id);
    if (!parent || kids.length === 0 || collapsed.has(agent.id)) return;
    const card = cards.get(agent.id)!;
    const row = card.nextElementSibling?.getAttribute('data-layout') === 'row';
    const mark = card.querySelector<HTMLElement>('[data-slot="agent-fanout-mark"]');
    const markBox = mark && boxIn(mark, card);
    const sx = round(
      row || !markBox ? parent.x + parent.w / 2 : parent.x + card.clientLeft + markBox.x + markBox.w / 2,
    );
    const sy = round(parent.y + parent.h);
    const hook = markBox ? card.clientTop + markBox.y + markBox.h / 2 : 24;
    let drawn = false;
    let active = false;
    for (const kid of kids) {
      const child = boxes.get(kid.id);
      if (!child) continue;
      drawn = true;
      const lit = busy(kid);
      active ||= lit;
      wires.push({
        id: `${agent.id}\u0000${kid.id}`,
        d: row ? busWire(sx, sy, child) : railWire(sx, sy, child, hook),
        active: lit,
      });
      walk(kid);
    }
    if (drawn) dots.push({ id: agent.id, x: sx, y: sy, active });
  };
  walk(root);
  // From the cards, not the tree's scroll size, which includes the last drawing.
  let width = 0;
  let height = 0;
  for (const box of boxes.values()) {
    width = Math.max(width, Math.ceil(box.x + box.w));
    height = Math.max(height, Math.ceil(box.y + box.h));
  }
  return { cards, boxes, geometry: { wires, dots, width, height } };
}

const sameGeometry = (a: Geometry, b: Geometry) =>
  a.width === b.width &&
  a.height === b.height &&
  a.wires.length === b.wires.length &&
  a.dots.length === b.dots.length &&
  a.wires.every((wire, index) => {
    const other = b.wires[index]!;
    return wire.id === other.id && wire.d === other.d && wire.active === other.active;
  }) &&
  a.dots.every((dot, index) => {
    const other = b.dots[index]!;
    return dot.x === other.x && dot.y === other.y && dot.active === other.active;
  });

const svgNs = 'http://www.w3.org/2000/svg';
// `--sprout-motion-ease`; WAAPI can't read custom properties.
const easeOut = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

function svgNode<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string | number>) {
  const node = document.createElementNS(svgNs, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

/**
 * Cards and lines that just left fade out where they were: a copy of each
 * card, and its line drawing back to the parent. React has already removed
 * or hidden the real ones.
 */
function leave(
  layer: HTMLElement,
  cards: ReadonlyMap<string, HTMLElement>,
  before: ReadonlyMap<string, Box>,
  after: ReadonlyMap<string, Box>,
  from: Geometry,
  to: Geometry,
  still: boolean,
) {
  const timing: KeyframeAnimationOptions = { duration: still ? 120 : 160, easing: easeOut, fill: 'forwards' };
  const fade = (node: Element, keyframes: Keyframe[] | PropertyIndexedKeyframes) =>
    node.animate(keyframes, timing).finished.then(
      () => node.remove(),
      () => node.remove(),
    );
  let left = false;
  for (const [id, box] of before) {
    const card = cards.get(id);
    if (after.has(id) || !card) continue;
    const ghost = card.cloneNode(true) as HTMLElement;
    for (const node of [ghost, ...ghost.querySelectorAll('[data-slot], [id], [aria-controls]')]) {
      for (const name of ['data-slot', 'data-agent', 'id', 'aria-controls']) node.removeAttribute(name);
    }
    ghost.classList.add('sprout-agent-fanout-ghost');
    ghost.style.cssText = `left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px`;
    layer.append(ghost);
    fade(ghost, still ? { opacity: [1, 0] } : { opacity: [1, 0], translate: ['0 0', '0 -0.375rem'] });
    left = true;
  }
  const wires = new Set(to.wires.map(wire => wire.id));
  const dots = new Set(to.dots.map(dot => dot.id));
  const goneWires = from.wires.filter(wire => !wires.has(wire.id));
  const goneDots = from.dots.filter(dot => !dots.has(dot.id));
  if (goneWires.length + goneDots.length > 0) {
    const svg = svgNode('svg', {
      class: 'sprout-agent-fanout-wires',
      width: from.width,
      height: from.height,
      viewBox: `0 0 ${from.width} ${from.height}`,
    });
    const runs: Promise<Animation>[] = [];
    for (const wire of goneWires) {
      const path = svgNode('path', { d: wire.d, pathLength: 1, class: 'sprout-agent-fanout-wire' });
      if (wire.active) path.dataset.active = '';
      svg.append(path);
      runs.push(path.animate(still ? { opacity: [1, 0] } : { strokeDashoffset: [0, 1] }, timing).finished);
    }
    for (const dot of goneDots) {
      const circle = svgNode('circle', { cx: dot.x, cy: dot.y, r: 3.5, class: 'sprout-agent-fanout-dot' });
      if (dot.active) circle.dataset.active = '';
      svg.append(circle);
      runs.push(circle.animate({ opacity: [1, 0] }, timing).finished);
    }
    layer.prepend(svg);
    Promise.allSettled(runs).then(() => svg.remove());
  }
  return left;
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Which agents started which, live. Each agent is a card with its model,
 * tools, task, status, and run time. The first agents the root starts sit
 * side by side; deeper ones stack under their parent. New agents draw their
 * line in, cards slide to make room, and the header counts agents that are
 * running, need you, or failed.
 */
export function AgentFanout({
  agent,
  title = 'Agents',
  layout = 'auto',
  defaultCollapsed,
  onRetry,
  onDismiss,
  onOpen,
  className,
}: AgentFanoutProps) {
  const titleId = useId();
  const treeRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set(defaultCollapsed));
  const [fit, setFit] = useState<Fit>(fullFit);
  const [geometry, setGeometry] = useState<Geometry>(emptyGeometry);
  // Animations wait for the first drawing, so the first render stays still.
  const [live, setLive] = useState(false);
  const places = useRef(new Map<string, Box>());
  const seen = useRef<ReadonlyMap<string, HTMLElement>>(new Map());
  const drawn = useRef<Geometry>(emptyGeometry);
  const lastHeight = useRef(0);
  const ghostRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ agent, collapsed, layout });
  latest.current = { agent, collapsed, layout };

  const all = flatten(agent);
  const running = all.filter(item => item.status === 'running').length;
  const needsYou = all.filter(item => item.status === 'needs-you');
  const failed = all.filter(item => item.status === 'failed');
  const nest = Math.max(0, levels(agent) - 2);
  const row = layout === 'tree' || (layout === 'auto' && fit.fits);

  const toggle = (id: string) =>
    setCollapsed(current => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  // The row gives up its gaps first, then card width, before `auto` stacks it.
  const decide = () => {
    const { agent, layout } = latest.current;
    const tree = treeRef.current;
    const probe = probeRef.current;
    if (layout === 'list' || !tree || !probe) return;
    // The probe carries the tokens as resolved px in properties that take no room.
    const style = getComputedStyle(probe);
    const card = parseFloat(style.maxWidth) || probe.offsetWidth;
    const cardMin = Math.min(card, parseFloat(style.maxHeight) || card);
    const gap = parseFloat(style.marginRight) || 0;
    const gapMin = Math.min(gap, parseFloat(style.marginBottom) || gap);
    const indent = parseFloat(style.paddingLeft) || 0;
    // Stacks under the row hang right of their card, into the gap.
    const overhang = indent * Math.max(0, levels(agent) - 2);
    const count = agent.agents?.length ?? 0;
    const gaps = Math.max(0, count - 1);
    const box = getComputedStyle(tree);
    const inner = tree.clientWidth - (parseFloat(box.paddingLeft) || 0) - (parseFloat(box.paddingRight) || 0);
    const room = inner - overhang;
    let rowGap = Math.max(gap, overhang + 16);
    let rowCard = card;
    if (count * rowCard + gaps * rowGap > room) {
      const tight = Math.max(gapMin, overhang + 16);
      rowGap = gaps ? Math.max(tight, Math.min(rowGap, (room - count * rowCard) / gaps)) : rowGap;
      rowCard = Math.min(card, (room - gaps * rowGap) / Math.max(1, count));
    }
    const next: Fit = {
      fits: count === 0 || rowCard >= cardMin,
      card: Math.floor(Math.max(cardMin, rowCard)),
      gap: Math.floor(rowGap),
    };
    setFit(current =>
      current.fits === next.fits && current.card === next.card && current.gap === next.gap ? current : next,
    );
  };

  const draw = (animate: boolean) => {
    const tree = treeRef.current;
    if (!tree) return;
    const { cards, boxes, geometry: next } = measure(latest.current.agent, tree, latest.current.collapsed);
    const height = tree.offsetHeight;
    const still = reducedMotion();
    if (animate && ghostRef.current) {
      const left = leave(ghostRef.current, seen.current, places.current, boxes, drawn.current, next, still);
      // Ease the tree down so the cards that left can fade where they were.
      if (left && !still && height < lastHeight.current)
        tree.animate({ height: [`${lastHeight.current}px`, `${height}px`] }, { duration: 160, easing: easeOut });
    }
    if (animate && !still) {
      for (const [id, box] of boxes) {
        const before = places.current.get(id);
        if (!before) continue;
        const dx = before.x - box.x;
        const dy = before.y - box.y;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
        tree
          .querySelector<HTMLElement>(`[data-slot="agent-fanout-card"][data-agent="${CSS.escape(id)}"]`)
          ?.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
            duration: 280,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          });
      }
    }
    places.current = boxes;
    seen.current = cards;
    drawn.current = next;
    lastHeight.current = height;
    setGeometry(current => (sameGeometry(current, next) ? current : next));
  };

  useLayoutEffect(() => {
    decide();
    draw(live);
  });

  useEffect(() => {
    const tree = treeRef.current;
    if (!tree || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(() => {
      decide();
      draw(false);
    });
    observer.observe(tree);
    for (const card of tree.querySelectorAll('[data-slot="agent-fanout-card"]')) observer.observe(card);
    return () => observer.disconnect();
  });

  useEffect(() => {
    if (live || geometry === emptyGeometry) return;
    const frame = requestAnimationFrame(() => setLive(true));
    return () => cancelAnimationFrame(frame);
  }, [geometry, live]);

  const summary = [
    plural(all.length, 'agent', 'agents'),
    running > 0 && `${running} running`,
    needsYou.length > 0 && `${needsYou.length} ${needsYou.length === 1 ? 'needs' : 'need'} you`,
    failed.length > 0 && `${failed.length} failed`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <section
      data-slot="agent-fanout"
      data-layout={row ? 'tree' : 'list'}
      data-live={live || undefined}
      aria-labelledby={titleId}
      className={cn('sprout-agent-fanout', className)}
    >
      <header className="sprout-agent-fanout-header">
        <h2 id={titleId} className="sprout-agent-fanout-title">
          <Sparkle size={16} aria-hidden="true" className="sprout-agent-fanout-title-icon" />
          {title}
        </h2>
        <div className="sprout-agent-fanout-summary">
          <span aria-hidden="true" className="sprout-agent-fanout-stat">
            <Count value={all.length} /> {all.length === 1 ? 'agent' : 'agents'}
          </span>
          {running > 0 && (
            <span aria-hidden="true" data-tone="info" className="sprout-agent-fanout-stat">
              <Count value={running} /> running
            </span>
          )}
          {needsYou.length > 0 && (
            <Issues kind="needs-you" agents={needsYou} onRetry={onRetry} onDismiss={onDismiss} onOpen={onOpen} />
          )}
          {failed.length > 0 && (
            <Issues kind="failed" agents={failed} onRetry={onRetry} onDismiss={onDismiss} onOpen={onOpen} />
          )}
          <span role="status" className="sprout-agent-fanout-sr-only">
            {summary}
          </span>
        </div>
      </header>
      <div
        ref={treeRef}
        data-slot="agent-fanout-tree"
        className="sprout-agent-fanout-tree"
        style={
          {
            '--sprout-agent-fanout-nest': nest,
            '--sprout-agent-fanout-fit-card': fit.card ? `${fit.card}px` : undefined,
            '--sprout-agent-fanout-fit-gap': fit.gap ? `${fit.gap}px` : undefined,
          } as CSSProperties
        }
      >
        <div ref={probeRef} aria-hidden="true" className="sprout-agent-fanout-probe" />
        <ul aria-label="Agent tree" className="sprout-agent-fanout-root">
          <Branch agent={agent} depth={0} row={row} collapsed={collapsed} onToggle={toggle} />
        </ul>
        {geometry.width > 0 && (
          <svg
            aria-hidden="true"
            data-slot="agent-fanout-wires"
            className="sprout-agent-fanout-wires"
            width={geometry.width}
            height={geometry.height}
            viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          >
            {geometry.wires.map(wire => (
              <path
                key={wire.id}
                d={wire.d}
                pathLength={1}
                data-active={wire.active || undefined}
                className="sprout-agent-fanout-wire"
              />
            ))}
            {geometry.dots.map(dot => (
              <circle
                key={dot.id}
                cx={dot.x}
                cy={dot.y}
                r={3.5}
                data-active={dot.active || undefined}
                className="sprout-agent-fanout-dot"
              />
            ))}
          </svg>
        )}
        <div ref={ghostRef} aria-hidden="true" inert className="sprout-agent-fanout-ghosts" />
      </div>
    </section>
  );
}
