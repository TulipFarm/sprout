import { useEffect, useState } from "react";
import {
  AgentFanout,
  type AgentFanoutAgent,
  type AgentFanoutState,
} from "@tulipfarm/sprout/agent-fanout";
import { ChartLine } from "reicon-react/icons/ChartLine";
import { Command } from "reicon-react/icons/Command";
import { Eye } from "reicon-react/icons/Eye";
import { Globe } from "reicon-react/icons/Globe";
import { Magnifier } from "reicon-react/icons/Magnifier";
import "../styles/agent-fanout-demo.css";

const task = "Choose a vector store for the retrieval stack";

/** When each specialist starts and how long it takes, in ms. */
const crew = [
  {
    id: "researcher",
    name: "Researcher",
    icon: <Globe size={16} />,
    task: "Web search",
    result: "Found 18 sources",
    start: 300,
    duration: 3000,
  },
  {
    id: "analyst",
    name: "Analyst",
    icon: <ChartLine size={16} />,
    task: "Benchmarks",
    result: "Compared 6 engines",
    start: 450,
    duration: 4400,
  },
  {
    id: "engineer",
    name: "Engineer",
    icon: <Command size={16} />,
    task: "Code audit",
    result: "Scanned 42 call sites",
    start: 750,
    duration: 5600,
  },
  {
    id: "reviewer",
    name: "Reviewer",
    icon: <Eye size={16} />,
    task: "Fact check",
    result: "Verified 12 claims",
    start: 600,
    duration: 3800,
  },
];

const finish = Math.max(...crew.map((agent) => agent.start + agent.duration));
const composeTime = 900;

function agentsAt(time: number, stopped: boolean): AgentFanoutAgent[] {
  return crew.map(({ start, ...agent }) => {
    const status =
      time >= start + agent.duration
        ? "done"
        : stopped && time >= start
          ? "stopped"
          : time >= start
            ? "working"
            : stopped
              ? "stopped"
              : "queued";
    return { ...agent, status };
  });
}

export function AgentFanoutPlayground() {
  const [run, setRun] = useState(0);
  const [time, setTime] = useState(0);
  const [stopped, setStopped] = useState(false);
  const state: AgentFanoutState = stopped
    ? "stopped"
    : time >= finish + composeTime
      ? "done"
      : "running";

  useEffect(() => {
    if (state !== "running") return;
    const began = performance.now() - time;
    const id = window.setInterval(
      () => setTime(performance.now() - began),
      100,
    );
    return () => window.clearInterval(id);
    // The clock restarts only on a new run, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, state]);

  return (
    <div className="fanout-demo-stage">
      <div className="fanout-demo-card">
        <AgentFanout
          task={task}
          agents={agentsAt(time, stopped)}
          state={state}
          elapsed={Math.min(time, finish + composeTime)}
          onStop={() => setStopped(true)}
          onRestart={() => {
            setStopped(false);
            setTime(0);
            setRun((value) => value + 1);
          }}
        />
      </div>
    </div>
  );
}

const settled: AgentFanoutAgent[] = [
  {
    ...crew[0]!,
    status: "done",
  },
  {
    ...crew[1]!,
    status: "failed",
    result: "Benchmark site timed out",
  },
  { ...crew[2]!, status: "stopped" },
  { ...crew[3]!, status: "done" },
];

export function AgentFanoutStates() {
  return (
    <div className="fanout-demo-stage">
      <div className="fanout-demo-card">
        <AgentFanout
          task="Pick a launch date for the spring catalog"
          agents={settled}
          state="stopped"
          elapsed={4200}
        />
      </div>
    </div>
  );
}

const many: AgentFanoutAgent[] = [
  ["Planner", "Split the brief", "done"],
  ["Writer", "Draft copy", "working"],
  ["Designer", "Pick imagery", "working"],
  ["Translator", "French and German", "queued"],
  ["Legal", "Claims check", "working"],
  ["Editor", "Tone pass", "queued"],
].map(([name, work, status], index) => ({
  id: name!,
  name: name!,
  icon: [<Globe size={16} />, <ChartLine size={16} />, <Command size={16} />][
    index % 3
  ],
  task: work!,
  result: "Ready",
  duration: 2100,
  status: status as AgentFanoutAgent["status"],
}));

export function AgentFanoutMany() {
  return (
    <div className="fanout-demo-stage">
      <div className="fanout-demo-card">
        <AgentFanout
          task="Prepare the spring launch email"
          agents={many}
          elapsed={2600}
        />
      </div>
    </div>
  );
}

type Step = Omit<AgentFanoutAgent, "status" | "agents"> & {
  start: number;
  agents?: Step[];
};

/** A lead that splits its part across its own helpers, two levels deep. */
const tree: Step[] = [
  {
    id: "research-lead",
    name: "Research lead",
    icon: <Globe size={16} />,
    task: "Gather sources",
    result: "31 sources",
    start: 300,
    duration: 5200,
    agents: [
      {
        id: "papers",
        name: "Papers",
        icon: <Magnifier size={16} />,
        task: "arXiv search",
        result: "13 papers",
        start: 1100,
        duration: 2200,
      },
      {
        id: "blogs",
        name: "Blogs",
        icon: <Magnifier size={16} />,
        task: "Vendor posts",
        result: "18 posts",
        start: 1250,
        duration: 3000,
      },
    ],
  },
  {
    id: "bench-lead",
    name: "Bench lead",
    icon: <ChartLine size={16} />,
    task: "Run benchmarks",
    result: "3 engines ranked",
    start: 450,
    duration: 6400,
    agents: [
      {
        id: "latency",
        name: "Latency",
        icon: <ChartLine size={16} />,
        task: "p95 queries",
        result: "pgvector fastest",
        start: 1300,
        duration: 2600,
        agents: [
          {
            id: "small",
            name: "1M rows",
            icon: <Command size={16} />,
            task: "Small index",
            result: "4 ms p95",
            start: 2000,
            duration: 1400,
          },
          {
            id: "large",
            name: "50M rows",
            icon: <Command size={16} />,
            task: "Large index",
            result: "19 ms p95",
            start: 2150,
            duration: 1600,
          },
        ],
      },
      {
        id: "cost",
        name: "Cost",
        icon: <ChartLine size={16} />,
        task: "Monthly bill",
        result: "$410 a month",
        start: 1450,
        duration: 3600,
      },
    ],
  },
  {
    id: "reviewer",
    name: "Reviewer",
    icon: <Eye size={16} />,
    task: "Fact check",
    result: "Verified 12 claims",
    start: 600,
    duration: 3800,
  },
];

const treeEnd = (steps: Step[]): number =>
  Math.max(
    ...steps.map((step) =>
      Math.max(step.start + step.duration!, treeEnd(step.agents ?? [])),
    ),
    0,
  );

function treeAt(steps: Step[], time: number): AgentFanoutAgent[] {
  return steps.map(({ start, agents, ...agent }) => ({
    ...agent,
    status:
      time >= start + agent.duration!
        ? "done"
        : time >= start
          ? "working"
          : "queued",
    ...(agents && { agents: treeAt(agents, time) }),
  }));
}

export function AgentFanoutTree() {
  const [time, setTime] = useState(0);
  const [run, setRun] = useState(0);
  const end = treeEnd(tree) + composeTime;
  useEffect(() => {
    const began = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now() - began;
      setTime(now);
      if (now >= end) window.clearInterval(id);
    }, 100);
    return () => window.clearInterval(id);
  }, [end, run]);
  return (
    <div className="fanout-demo-stage">
      <div className="fanout-demo-card">
        <AgentFanout
          key={run}
          task="Pick a vector store, with numbers"
          agents={treeAt(tree, time)}
          state={time >= end ? "done" : "running"}
          elapsed={Math.min(time, end)}
          defaultOpen
          onRestart={() => {
            setTime(0);
            setRun((value) => value + 1);
          }}
        />
      </div>
    </div>
  );
}
