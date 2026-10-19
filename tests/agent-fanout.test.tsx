import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import * as sprout from "../packages/sprout/src/index.js";
import {
  AgentFanout,
  agentFanoutStateNames,
  agentFanoutStatusNames,
  type AgentFanoutAgent,
} from "../packages/sprout/src/components/agent-fanout.js";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const agent = (
  id: string,
  status: AgentFanoutAgent["status"],
  extra: Partial<AgentFanoutAgent> = {},
): AgentFanoutAgent => ({
  id,
  name: id,
  icon: <svg />,
  task: `${id} task`,
  status,
  ...extra,
});

const footer = (html: string) => html.match(/role="status"[^>]*>([^<]*)</)?.[1];

describe("AgentFanout", () => {
  it("is exported from the package root, subpath, CSS entry, and docs nav", () => {
    expect(sprout.AgentFanout).toBe(AgentFanout);
    expect(sprout.agentFanoutStatusNames).toBe(agentFanoutStatusNames);
    const manifest = JSON.parse(read("../packages/sprout/package.json"));
    expect(manifest.exports["./agent-fanout"]).toEqual({
      types: "./dist/components/agent-fanout.d.ts",
      import: "./dist/components/agent-fanout.js",
    });
    expect(read("../packages/sprout/src/styles/index.css")).toContain(
      '@import "./agent-fanout.css";',
    );
    expect(read("../apps/docs/src/data/nav.ts")).toMatch(
      /component\(\s*"Agent Fanout"/,
    );
  });

  it("lists every agent status and fanout state", () => {
    expect(agentFanoutStatusNames).toEqual([
      "queued",
      "working",
      "done",
      "failed",
      "stopped",
    ]);
    expect(agentFanoutStateNames).toEqual(["running", "done", "stopped"]);
  });

  it("names the phase from the agents' statuses", () => {
    const phase = (agents: AgentFanoutAgent[]) =>
      footer(renderToString(<AgentFanout task="t" agents={agents} />));
    expect(phase([agent("a", "queued"), agent("b", "queued")])).toBe(
      "Delegating work",
    );
    expect(phase([agent("a", "working"), agent("b", "queued")])).toBe(
      "Specialists working",
    );
    expect(phase([agent("a", "done"), agent("b", "working")])).toBe(
      "Merging results",
    );
    expect(phase([agent("a", "done"), agent("b", "failed")])).toBe(
      "Composing answer",
    );
  });

  it("counts merged results when done and keeps the timer out of the live region", () => {
    const html = renderToString(
      <AgentFanout
        task="t"
        state="done"
        elapsed={7300}
        agents={[agent("a", "done"), agent("b", "failed")]}
      />,
    );
    expect(footer(html)).toBe("Merged 1 result in 7.3s");
    const running = renderToString(
      <AgentFanout task="t" elapsed={3600} agents={[agent("a", "working")]} />,
    );
    expect(footer(running)).toBe("Specialists working");
    expect(running).toContain(">3.6s<");
  });

  it("shows result and duration once done, and the task before", () => {
    const html = renderToString(
      <AgentFanout
        task="t"
        agents={[
          agent("a", "done", { result: "Found 18 sources", duration: 3000 }),
          agent("b", "working", { result: "unused" }),
        ]}
      />,
    );
    expect(html).toContain("Found 18 sources");
    expect(html).toContain("3.0s");
    expect(html).toContain("b task");
    expect(html).not.toContain("unused");
  });

  it("hides the graph and does not animate the first render", () => {
    const html = renderToString(
      <AgentFanout task="t" agents={[agent("a", "done")]} state="done" />,
    );
    expect(html).toMatch(
      /data-slot="agent-fanout-graph"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*data-slot="agent-fanout-graph"/,
    );
    expect(html).not.toContain("data-changed");
    expect(html).not.toContain("data-trip");
  });

  it("shows Stop while running and Run again after", () => {
    const noop = () => {};
    const running = renderToString(
      <AgentFanout task="t" agents={[]} onStop={noop} onRestart={noop} />,
    );
    expect(running).toContain("Stop");
    expect(running).not.toContain("Run again");
    const stopped = renderToString(
      <AgentFanout
        task="t"
        agents={[]}
        state="stopped"
        elapsed={1200}
        onStop={noop}
        onRestart={noop}
      />,
    );
    expect(stopped).toContain("Run again");
    expect(footer(stopped)).toBe("Stopped after 1.2s");
  });

  it("lists nested agents behind a closed Details button", () => {
    const html = renderToString(
      <AgentFanout
        task="t"
        agents={[
          agent("lead", "working", {
            agents: [
              agent("helper", "done", {
                agents: [agent("deep", "queued")],
              }),
            ],
          }),
        ]}
      />,
    );
    expect(html).toContain("1 of 3 finished");
    expect(html).toMatch(/aria-expanded="false"/);
    expect(html).toContain("deep task");
    expect(html).toContain("--sprout-agent-fanout-depth:2");
    const open = renderToString(
      <AgentFanout task="t" defaultOpen agents={[agent("a", "done")]} />,
    );
    expect(open).toMatch(/aria-expanded="true"/);
  });
});
