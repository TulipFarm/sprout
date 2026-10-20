"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Check } from "reicon-react/icons/Check";
import { ChevronDown } from "reicon-react/icons/ChevronDown";
import { Danger } from "reicon-react/icons/Danger";
import { MinusCircle } from "reicon-react/icons/MinusCircle";
import { RotateLeft } from "reicon-react/icons/RotateLeft";
import { Sparkle } from "reicon-react/icons/Sparkle";
import { cn } from "../internal/classes.js";
import { Button } from "./button.js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible.js";

export const agentFanoutStatusNames = [
  "queued",
  "working",
  "done",
  "failed",
  "stopped",
] as const;

export const agentFanoutStateNames = ["running", "done", "stopped"] as const;

export type AgentFanoutStatus = (typeof agentFanoutStatusNames)[number];
export type AgentFanoutState = (typeof agentFanoutStateNames)[number];

export interface AgentFanoutAgent {
  id: string;
  name: string;
  /** A 16px icon for the subagent's role. */
  icon: ReactNode;
  /** What the subagent was asked to do, such as “Web search”. */
  task: string;
  /** What it found. Replaces `task` once the subagent is done or failed. */
  result?: string | undefined;
  status: AgentFanoutStatus;
  /** How long the subagent took, in ms. Shown once it is done. */
  duration?: number | undefined;
  /** Any CSS color. Defaults to the next of ten `--sprout-chart-*` colors. */
  color?: string | undefined;
  /** Subagents this agent calls in turn. They take its color. */
  agents?: AgentFanoutAgent[] | undefined;
}

export interface AgentFanoutProps {
  /** The parent agent's task, shown above the graph. */
  task: ReactNode;
  agents: AgentFanoutAgent[];
  /** The parent agent. `done` once it has merged the results into an answer. */
  state?: AgentFanoutState | undefined;
  /** Time since the parent started, in ms. */
  elapsed?: number | undefined;
  /** Replaces the footer text that names the current phase. */
  label?: ReactNode;
  /** Shows the per-agent list at first. It starts closed. */
  defaultOpen?: boolean | undefined;
  /** Shows a Stop button while the parent is running. */
  onStop?: (() => void) | undefined;
  /** Shows a Run again button once the parent is done or stopped. */
  onRestart?: (() => void) | undefined;
  className?: string | undefined;
}

const rootTop = 12;
const rootSize = 44;
const levelTop = 120;
const levelGap = 108;
const nodeLabel = 22;
const bottomGap = 36;
const colorCount = 10;

const statusText: Record<AgentFanoutStatus, string> = {
  queued: "Queued",
  working: "Working",
  done: "Done",
  failed: "Failed",
  stopped: "Stopped",
};

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

function phaseText(
  agents: AgentFanoutAgent[],
  state: AgentFanoutState,
  elapsed: number | undefined,
) {
  const time = elapsed === undefined ? "" : seconds(elapsed);
  if (state === "done") {
    const merged = agents.filter((agent) => agent.status === "done").length;
    return {
      text: `Merged ${merged} ${merged === 1 ? "result" : "results"}${time && ` in ${time}`}`,
      time: "",
    };
  }
  if (state === "stopped")
    return { text: time ? `Stopped after ${time}` : "Stopped", time: "" };
  const settled = agents.filter(
    (agent) => agent.status === "done" || agent.status === "failed",
  ).length;
  const text = agents.every((agent) => agent.status === "queued")
    ? "Delegating work"
    : settled === agents.length
      ? "Composing answer"
      : settled > 0
        ? "Merging results"
        : "Specialists working";
  return { text, time };
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

type Trip = "out" | "back" | null;

type Line = {
  agent: AgentFanoutAgent;
  parent: string;
  depth: number;
  changed: true | undefined;
  trip: Trip;
  style: CSSProperties;
};

/** Every agent in tree order, with the parent it reports to. */
function flatten(
  agents: AgentFanoutAgent[],
  initial: Map<string, AgentFanoutStatus>,
  parent = rootId,
  depth = 1,
  color?: string,
): Line[] {
  return agents.flatMap((agent, index) => {
    const own =
      agent.color ?? color ?? `var(--sprout-chart-${(index % colorCount) + 1})`;
    const changed = initial.get(agent.id) !== agent.status;
    const line: Line = {
      agent,
      parent,
      depth,
      changed: changed || undefined,
      trip: !changed
        ? null
        : agent.status === "working"
          ? "out"
          : agent.status === "done"
            ? "back"
            : null,
      style: {
        "--sprout-agent-fanout-color": own,
        "--sprout-agent-fanout-index": index,
        "--sprout-agent-fanout-depth": depth - 1,
      } as CSSProperties,
    };
    return [
      line,
      ...flatten(agent.agents ?? [], initial, agent.id, depth + 1, own),
    ];
  });
}

const rootId = "agent-fanout-root";

type RootNode = Node<
  { state: AgentFanoutState; changed: true | undefined },
  "root"
>;
type AgentNode = Node<Line, "agent">;
type TripEdge = Edge<{ trip: Trip; style: CSSProperties }, "trip">;

// Fresh node objects every render drop React Flow's measured handles, which
// unmounts the edges and restarts their pulses. Declared handles survive.
const handle = (type: "source" | "target", x: number, y: number) => ({
  type,
  position: type === "source" ? Position.Bottom : Position.Top,
  x,
  y,
  width: 0,
  height: 0,
});

/** Leaves share the width; each parent sits over the middle of its children. */
function layout(
  lines: Line[],
  width: number,
  state: AgentFanoutState,
  rootChanged: true | undefined,
) {
  const children = new Map<string, Line[]>();
  for (const line of lines)
    children.set(line.parent, [...(children.get(line.parent) ?? []), line]);
  const leaves = lines.filter((line) => !children.has(line.agent.id)).length;
  const column = width / Math.max(leaves, 1);
  const centers = new Map<string, number>();
  let leaf = 0;
  const place = (id: string): number => {
    const kids = children.get(id);
    const xs = kids?.map((kid) => place(kid.agent.id));
    const x = xs ? (xs[0]! + xs.at(-1)!) / 2 : (leaf++ + 0.5) * column;
    centers.set(id, x);
    return x;
  };
  place(rootId);
  const depth = Math.max(0, ...lines.map((line) => line.depth));
  const dot = width ? Math.min(40, Math.max(28, column - 12)) : 40;
  const nodes: (RootNode | AgentNode)[] = [
    {
      id: rootId,
      type: "root",
      position: { x: width / 2 - rootSize / 2, y: rootTop },
      width: rootSize,
      height: rootSize,
      handles: [handle("source", rootSize / 2, rootSize)],
      data: { state, changed: rootChanged },
    },
    ...lines.map((line): AgentNode => ({
      id: line.agent.id,
      type: "agent",
      position: {
        x: centers.get(line.agent.id)! - column / 2,
        y: levelTop + (line.depth - 1) * levelGap,
      },
      width: column,
      height: dot + nodeLabel,
      handles: [
        handle("target", column / 2, 0),
        handle("source", column / 2, dot),
      ],
      data: line,
    })),
  ];
  const edges: TripEdge[] = lines.map((line) => ({
    id: `${line.parent}-${line.agent.id}`,
    type: "trip",
    source: line.parent,
    target: line.agent.id,
    data: { trip: line.trip, style: line.style },
  }));
  return {
    nodes,
    edges,
    dot,
    height:
      levelTop +
      Math.max(depth - 1, 0) * levelGap +
      dot +
      nodeLabel +
      bottomGap,
  };
}

function RootMark({ data: { state, changed } }: NodeProps<RootNode>) {
  return (
    <span
      data-slot="agent-fanout-root"
      data-state={state}
      data-changed={changed}
      className="sprout-agent-fanout-root"
    >
      {state === "done" ? (
        <Check size={18} />
      ) : state === "stopped" ? (
        <MinusCircle size={18} />
      ) : (
        <Sparkle size={18} />
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="sprout-agent-fanout-handle"
      />
    </span>
  );
}

function AgentMark({ data: { agent, changed, style } }: NodeProps<AgentNode>) {
  return (
    <div
      data-slot="agent-fanout-node"
      data-status={agent.status}
      data-changed={changed}
      className="sprout-agent-fanout-node"
      style={style}
    >
      <span className="sprout-agent-fanout-dot">
        <NodeMark agent={agent} />
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={false}
          className="sprout-agent-fanout-handle"
        />
        {agent.agents && agent.agents.length > 0 && (
          <Handle
            type="source"
            position={Position.Bottom}
            isConnectable={false}
            className="sprout-agent-fanout-handle"
          />
        )}
      </span>
      <span className="sprout-agent-fanout-node-name">{agent.name}</span>
    </div>
  );
}

function TripLine({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<TripEdge>) {
  const drop = targetY - sourceY;
  const d = `M ${sourceX} ${sourceY} C ${sourceX} ${sourceY + drop * 0.5}, ${targetX} ${sourceY + drop * 0.2}, ${targetX} ${targetY}`;
  const trip = data?.trip;
  return (
    <g style={data?.style}>
      <BaseEdge id={id} path={d} className="sprout-agent-fanout-edge" />
      {trip && (
        <>
          <path
            key={trip}
            d={d}
            pathLength={1}
            data-trip={trip}
            className="sprout-agent-fanout-trail"
          />
          <EdgeLabelRenderer>
            <span
              key={trip}
              data-trip={trip}
              className="sprout-agent-fanout-comet"
              style={{ ...data.style, offsetPath: `path("${d}")` }}
            />
          </EdgeLabelRenderer>
        </>
      )}
    </g>
  );
}

const nodeTypes = { root: RootMark, agent: AgentMark };
const edgeTypes = { trip: TripLine };
const viewport = { x: 0, y: 0, zoom: 1 };

function NodeMark({ agent }: { agent: AgentFanoutAgent }) {
  if (agent.status === "done")
    return <Check size={16} strokeWidth={2.5} aria-hidden="true" />;
  if (agent.status === "failed") return <Danger size={16} aria-hidden="true" />;
  return <span aria-hidden="true">{agent.icon}</span>;
}

function StatusMark({ agent }: { agent: AgentFanoutAgent }) {
  if (agent.status === "done")
    return (
      <>
        <Check size={12} aria-hidden="true" />
        {agent.duration === undefined ? "Done" : seconds(agent.duration)}
      </>
    );
  if (agent.status === "working")
    return (
      <>
        <span aria-hidden="true" className="sprout-agent-fanout-pulse" />
        Working
      </>
    );
  return <>{statusText[agent.status]}</>;
}

/**
 * A parent agent that hands one task to several subagents and merges what
 * they find. Each status change sends a pulse along the subagent's line:
 * down when it starts, back up when it finishes.
 */
export function AgentFanout({
  task,
  agents,
  state = "running",
  elapsed,
  label,
  defaultOpen = false,
  onStop,
  onRestart,
  className,
}: AgentFanoutProps) {
  const [graphRef, width] = useWidth();
  // Only changes after the first render animate, so a finished fanout
  // renders still instead of replaying every pulse.
  const [initial] = useState(() => ({
    state,
    statuses: new Map(
      flatten(agents, new Map()).map(({ agent }) => [agent.id, agent.status]),
    ),
  }));
  const phase = phaseText(agents, state, elapsed);
  const lines = flatten(agents, initial.statuses);
  const graph = layout(
    lines,
    width,
    state,
    initial.state !== state || undefined,
  );
  const finished = lines.filter(
    ({ agent }) => agent.status === "done" || agent.status === "failed",
  ).length;

  return (
    <section
      data-slot="agent-fanout"
      data-state={state}
      aria-label="Subagents"
      className={cn("sprout-agent-fanout", className)}
    >
      <div className="sprout-agent-fanout-panel">
        <div className="sprout-agent-fanout-task">
          <span className="sprout-agent-fanout-task-text">{task}</span>
        </div>
        <div
          ref={graphRef}
          aria-hidden="true"
          data-slot="agent-fanout-graph"
          className="sprout-agent-fanout-graph"
          style={
            {
              height: graph.height,
              "--sprout-agent-fanout-dot": `${graph.dot}px`,
            } as CSSProperties
          }
        >
          {width > 0 && (
            <ReactFlow
              className="sprout-agent-fanout-flow"
              nodes={graph.nodes}
              edges={graph.edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultViewport={viewport}
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
            />
          )}
        </div>
        <Collapsible
          defaultOpen={defaultOpen}
          className="sprout-agent-fanout-details"
        >
          <CollapsibleTrigger className="sprout-agent-fanout-trigger">
            <span className="sprout-agent-fanout-trigger-label">Details</span>
            <span className="sprout-agent-fanout-trigger-count">
              {`${finished} of ${lines.length} finished`}
            </span>
            <ChevronDown
              size={14}
              aria-hidden="true"
              data-slot="collapsible-indicator"
            />
          </CollapsibleTrigger>
          <CollapsibleContent keepMounted>
            <ul
              aria-label="Subagent status"
              className="sprout-agent-fanout-rows"
            >
              {lines.map(({ agent, changed, style }) => {
                const settled =
                  agent.status === "done" || agent.status === "failed";
                return (
                  <li
                    key={agent.id}
                    data-slot="agent-fanout-row"
                    data-status={agent.status}
                    className="sprout-agent-fanout-row"
                    style={style}
                  >
                    <span className="sprout-agent-fanout-row-name">
                      {agent.name}
                    </span>
                    <span
                      key={settled && agent.result ? "result" : "task"}
                      data-changed={changed}
                      className="sprout-agent-fanout-row-detail"
                    >
                      {settled && agent.result ? agent.result : agent.task}
                    </span>
                    <span
                      key={agent.status}
                      data-changed={changed}
                      className="sprout-agent-fanout-row-status"
                    >
                      <StatusMark agent={agent} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </div>
      <div className="sprout-agent-fanout-footer">
        <p className="sprout-agent-fanout-phase">
          <span role="status">{label ?? phase.text}</span>
          {!label && phase.time && (
            <span className="sprout-agent-fanout-time">{phase.time}</span>
          )}
        </p>
        {state === "running" && onStop && (
          <Button
            variant="outline"
            size="sm"
            onClick={onStop}
            className="sprout-agent-fanout-action"
          >
            <MinusCircle size={14} aria-hidden="true" />
            Stop
          </Button>
        )}
        {state !== "running" && onRestart && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRestart}
            className="sprout-agent-fanout-action"
          >
            <RotateLeft size={14} aria-hidden="true" />
            Run again
          </Button>
        )}
      </div>
    </section>
  );
}
