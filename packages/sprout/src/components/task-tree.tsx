'use client';

import {
  Handle,
  Position,
  ReactFlow,
  useNodesInitialized,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from 'react';
import { cn } from '../internal/classes.js';
import { motion } from '../internal/flow.js';
import { Status, type StatusState } from './status.js';

export interface TaskTreeTask {
  id: string;
  title: ReactNode;
  /**
   * What the task is doing. Defaults to `"pending"`. Leave it out on a task
   * with children and its mark follows them.
   */
  state?: StatusState | undefined;
  /** How much of a `"running"` task is done, from 0 to 100. */
  value?: number | null | undefined;
  /** Short muted text at the end of the row, such as “12s” or “3 files”. */
  detail?: ReactNode;
  /**
   * The task's parts. One part continues in the same column with a straight
   * line; two or more branch into the next column.
   */
  children?: readonly TaskTreeTask[] | undefined;
}

export interface TaskTreeProps extends Omit<ComponentProps<'section'>, 'title' | 'children'> {
  /** Tasks in order. Each top-level task starts its own tree. The count covers tasks without parts. */
  tasks: readonly TaskTreeTask[];
  /** The heading. Defaults to “Tasks”. */
  title?: ReactNode;
  /** Replaces the “3 of 8 done” count. Pass `null` to hide it. */
  summary?: ReactNode;
  /** Shown when there are no tasks. Defaults to “No tasks yet.” */
  empty?: ReactNode;
}

interface Mark {
  state: StatusState;
  value: number | null | undefined;
  /** Finished leaves under this task, or the task itself when it has none. */
  done: number;
  leaves: number;
}

const finished = new Set<StatusState>(['success', 'warning', 'skipped']);

// A group without its own state follows its parts: failed beats running, running beats paused, and so on.
function rollUp(parts: Mark[]): StatusState {
  const has = (state: StatusState) => parts.some(part => part.state === state);
  if (has('error')) return 'error';
  if (has('running')) return 'running';
  if (has('paused')) return 'paused';
  if (parts.every(part => part.state === 'pending')) return 'pending';
  if (parts.every(part => finished.has(part.state)))
    return parts.every(part => part.state === 'skipped') ? 'skipped' : has('warning') ? 'warning' : 'success';
  if (has('stopped')) return 'stopped';
  return 'running';
}

function measure(tasks: readonly TaskTreeTask[], marks = new Map<string, Mark>()) {
  for (const task of tasks) {
    const children = task.children ?? [];
    if (children.length === 0) {
      const state = task.state ?? 'pending';
      marks.set(task.id, { state, value: task.value, done: finished.has(state) ? 1 : 0, leaves: 1 });
      continue;
    }
    measure(children, marks);
    const parts = children.map(child => marks.get(child.id)!);
    const done = parts.reduce((sum, part) => sum + part.done, 0);
    const leaves = parts.reduce((sum, part) => sum + part.leaves, 0);
    const state = task.state ?? rollUp(parts);
    const value = task.state ? task.value : state === 'running' ? (done / leaves) * 100 : undefined;
    marks.set(task.id, { state, value, done, leaves });
  }
  return marks;
}

const rowHeight = 32;
const indent = 24;
// The 16px mark sits 8px from the row's top and left, so its centre is 8px in and 16px down.
const markCenter = 8;
const markTop = 8;
const markBottom = 24;
const gap = 2;
const radius = 6;

type TaskNodeData = {
  task: TaskTreeTask;
  mark: Mark;
  width: number;
  /** Added after the tree first appeared, so the row fades in. */
  entering: boolean;
  /** Lines a change travels before it reaches this mark: 0 for a task with its own state, one more than its slowest part otherwise. */
  hops: number;
};
type TaskNode = Node<TaskNodeData, 'task'>;
type TaskEdge = Edge<{ path: string; hops: number; doneAt: number | null }, 'task'>;

function chainPath(from: TaskNode, to: TaskNode) {
  const x = from.position.x + markCenter;
  return `M ${x} ${from.position.y + markBottom + gap} V ${to.position.y + markTop - gap}`;
}

function branchPath(from: TaskNode, to: TaskNode) {
  const x = from.position.x + markCenter;
  const y = to.position.y + markTop + markCenter;
  return `M ${x} ${from.position.y + markBottom + gap} V ${y - radius} Q ${x} ${y} ${x + radius} ${y} H ${to.position.x - gap - 1}`;
}

// How long a part's green line takes to reach its parent.
const lineTravel = 280;
const rowEnter = 220;

function hopsOf(task: TaskTreeTask): number {
  const children = task.children ?? [];
  if (task.state || children.length === 0) return 0;
  return 1 + Math.max(...children.map(hopsOf));
}

interface History {
  /** False until the tree has first appeared; what is there already shows without motion. */
  primed: boolean;
  doneAt: Map<string, number>;
  addedAt: Map<string, number>;
}

// Places each task on its own row. One part stays in its parent's column; several move one column in.
function place(tasks: readonly TaskTreeTask[], marks: Map<string, Mark>, width: number, history: History) {
  const { primed, doneAt, addedAt } = history;
  const now = typeof performance === 'undefined' ? 0 : performance.now();
  const nodes: TaskNode[] = [];
  const edges: TaskEdge[] = [];
  const visit = (task: TaskTreeTask, column: number, parent?: TaskNode, chain?: boolean) => {
    const children = task.children ?? [];
    const mark = marks.get(task.id)!;
    const x = column * indent;
    if (!addedAt.has(task.id)) addedAt.set(task.id, primed ? now : -Infinity);
    const node: TaskNode = {
      id: task.id,
      type: 'task',
      position: { x, y: nodes.length * rowHeight },
      width: Math.max(0, width - x),
      height: rowHeight,
      data: {
        task,
        mark,
        width: Math.max(0, width - x),
        entering: now - addedAt.get(task.id)! < rowEnter,
        hops: hopsOf(task),
      },
    };
    nodes.push(node);
    if (parent) {
      const id = `${parent.id}->${task.id}`;
      if (mark.state !== 'success') doneAt.delete(id);
      else if (!doneAt.has(id)) doneAt.set(id, primed ? now : -Infinity);
      edges.push({
        id,
        type: 'task',
        source: parent.id,
        target: task.id,
        zIndex: doneAt.has(id) ? 1 : 0,
        data: {
          path: chain ? chainPath(parent, node) : branchPath(parent, node),
          hops: node.data.hops,
          doneAt: doneAt.get(id) ?? null,
        },
      });
    }
    if (children.length === 1) visit(children[0]!, column, node, true);
    else for (const child of children) visit(child, column + 1, node, false);
  };
  for (const task of tasks) visit(task, 0);
  return { nodes, edges };
}

// A task that follows its parts waits for the green line from a newly finished part to reach it. Other changes show at once.
function useArrival(mark: Mark, hops: number) {
  const [shown, setShown] = useState(mark);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const lastDone = useRef(mark.done);
  const key = `${mark.state}:${mark.value ?? ''}:${mark.done}`;
  useEffect(() => {
    const arrived = mark.done > lastDone.current;
    lastDone.current = mark.done;
    const delay = arrived ? motion(hops * lineTravel) : 0;
    if (delay === 0) {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      setShown(mark);
      return;
    }
    // Each arrival keeps its own timer, so quick successes land in order instead of resetting each other.
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setShown(mark);
    }, delay);
    timers.current.add(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hops]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);
  return hops === 0 ? mark : shown;
}

function RowBody({ task, mark }: { task: TaskTreeTask; mark: Mark }) {
  return (
    <>
      <Status state={mark.state} value={mark.value} aria-hidden="true" className="sprout-task-tree-status" />
      <span className="sprout-task-tree-title">{task.title}</span>
      {task.detail != null && <span className="sprout-task-tree-detail">{task.detail}</span>}
    </>
  );
}

function TaskRow({ data }: NodeProps<TaskNode>) {
  const { task, width, hops, entering } = data;
  const mark = useArrival(data.mark, hops);
  return (
    <div
      className="sprout-task-tree-row"
      data-state={mark.state}
      {...(entering ? { 'data-entering': '' } : {})}
      style={{ width }}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} className="sprout-task-tree-handle" />
      <RowBody task={task} mark={mark} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} className="sprout-task-tree-handle" />
    </div>
  );
}

// The muted line is always drawn; a green copy grows over it from the child up to the parent once the child succeeds,
// after any lines below the child have arrived.
function TaskLink({ data }: EdgeProps<TaskEdge>) {
  const { path, hops, doneAt } = data!;
  const done = useRef<SVGPathElement>(null);
  // Timed from when the task finished, so a remount after a resize picks up where it was instead of replaying.
  useLayoutEffect(() => {
    const element = done.current;
    if (!element || doneAt === null || typeof element.animate !== 'function') return;
    const duration = motion(lineTravel);
    const delay = hops * lineTravel - (performance.now() - doneAt);
    if (duration === 0 || delay + duration <= 0) return;
    const animation = element.animate([{ strokeDashoffset: -1 }, { strokeDashoffset: 0 }], {
      duration,
      delay,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'backwards',
    });
    return () => animation.cancel();
  }, [doneAt, hops]);
  return (
    <g className="sprout-task-tree-link">
      <path className="sprout-task-tree-path" d={path} />
      {doneAt !== null && <path ref={done} className="sprout-task-tree-path-done" d={path} pathLength={1} />}
    </g>
  );
}

// The same drawing without React Flow: what the server sends and what shows until the flow has measured itself.
function Sketch({ nodes, edges }: { nodes: TaskNode[]; edges: TaskEdge[] }) {
  return (
    <div className="sprout-task-tree-sketch">
      <svg className="sprout-task-tree-sketch-lines" focusable="false">
        {edges.map(edge => (
          <g key={edge.id}>
            <path className="sprout-task-tree-path" d={edge.data!.path} />
            {edge.data!.doneAt !== null && <path className="sprout-task-tree-path-done" d={edge.data!.path} />}
          </g>
        ))}
      </svg>
      {nodes.map(node => (
        <div
          key={node.id}
          className="sprout-task-tree-row"
          data-state={node.data.mark.state}
          style={{ left: node.position.x, top: node.position.y }}
        >
          <RowBody task={node.data.task} mark={node.data.mark} />
        </div>
      ))}
    </div>
  );
}

// Reports once every row is measured and every line is in the page, a frame later so both have painted.
function OnDrawn({
  root,
  lines,
  onDrawn,
}: {
  root: RefObject<HTMLDivElement | null>;
  lines: number;
  onDrawn: () => void;
}) {
  // The live store flag skips measurement, so check every node's handles instead.
  const initialized = useNodesInitialized({ includeHiddenNodes: true });
  useEffect(() => {
    if (!initialized) return;
    let frame = 0;
    const check = () => {
      frame = requestAnimationFrame(() =>
        (root.current?.querySelectorAll('.sprout-task-tree-link').length ?? 0) >= lines ? onDrawn() : check(),
      );
    };
    check();
    return () => cancelAnimationFrame(frame);
  }, [initialized, root, lines, onDrawn]);
  return null;
}

const nodeTypes = { task: TaskRow };
const edgeTypes = { task: TaskLink };

function Outline({ tasks, marks }: { tasks: readonly TaskTreeTask[]; marks: Map<string, Mark> }) {
  return (
    <ul className="sprout-task-tree-list">
      {tasks.map(task => {
        const mark = marks.get(task.id)!;
        return (
          <li key={task.id} data-slot="task-tree-item" data-state={mark.state} className="sprout-task-tree-item">
            <span className="sprout-task-tree-item-row">
              <Status state={mark.state} value={mark.value} size="sm" />
              <span className="sprout-task-tree-item-title">{task.title}</span>
              {task.detail != null && <span className="sprout-task-tree-detail">{task.detail}</span>}
            </span>
            {task.children && task.children.length > 0 && <Outline tasks={task.children} marks={marks} />}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A live list of tasks drawn as a tree. Each row has a Status mark and a
 * title. A task with one part continues straight down; a task with several
 * branches them out. A task with parts and no `state` of its own follows
 * them. When a task succeeds, a green line grows from it up to its parent.
 */
export function TaskTree({ tasks, title = 'Tasks', summary, empty, className, ...rest }: TaskTreeProps) {
  const headingId = useId();
  const history = useRef<History>({ primed: false, doneAt: new Map(), addedAt: new Map() });
  const root = useRef<HTMLElement>(null);
  const flow = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [drawn, setDrawn] = useState(false);
  const marks = measure(tasks);
  const total = tasks.reduce((sum, task) => sum + marks.get(task.id)!.leaves, 0);
  const done = tasks.reduce((sum, task) => sum + marks.get(task.id)!.done, 0);
  const count = summary === undefined ? `${done} of ${total} done` : summary;
  const { nodes, edges } = place(tasks, marks, width, history.current);

  useEffect(() => {
    history.current.primed = true;
  }, []);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    setWidth(Math.floor(element.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry!.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The marks already played their entrance in the sketch, so the swap to the flow finishes them instead of replaying.
  const showFlow = useCallback(() => {
    for (const animation of flow.current?.getAnimations({ subtree: true }) ?? [])
      if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    setDrawn(true);
  }, []);
  return (
    <section
      data-slot="task-tree"
      aria-labelledby={headingId}
      className={cn('sprout-task-tree', className)}
      {...rest}
      ref={root}
    >
      <header className="sprout-task-tree-header">
        <h3 id={headingId} className="sprout-task-tree-heading">
          {title}
        </h3>
        {count != null && total > 0 && (
          <span className="sprout-task-tree-summary" aria-live="polite">
            {count}
          </span>
        )}
      </header>
      {total > 0 ? (
        <>
          <div className="sprout-task-tree-outline">
            <Outline tasks={tasks} marks={marks} />
          </div>
          <div className="sprout-task-tree-stage" aria-hidden="true" style={{ height: nodes.length * rowHeight }}>
            {!drawn && <Sketch nodes={nodes} edges={edges} />}
            {width > 0 && (
              <div ref={flow} className="sprout-task-tree-flow" {...(drawn ? { 'data-drawn': '' } : {})}>
                <ReactFlow
                  className="sprout-task-tree-canvas"
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                  minZoom={1}
                  maxZoom={1}
                  panOnDrag={false}
                  panOnScroll={false}
                  zoomOnScroll={false}
                  zoomOnPinch={false}
                  zoomOnDoubleClick={false}
                  preventScrolling={false}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  nodesFocusable={false}
                  edgesFocusable={false}
                  elementsSelectable={false}
                  proOptions={{ hideAttribution: true }}
                >
                  {!drawn && <OnDrawn root={flow} lines={edges.length} onDrawn={showFlow} />}
                </ReactFlow>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="sprout-task-tree-empty">{empty ?? 'No tasks yet.'}</p>
      )}
    </section>
  );
}
