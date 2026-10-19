import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
  AgentFanout,
  type AgentFanoutAgent,
} from "../../packages/sprout/src/components/agent-fanout.js";
import { emulate, setTheme, settle, themes } from "./support.js";

const agent = (
  id: string,
  status: AgentFanoutAgent["status"],
  extra: Partial<AgentFanoutAgent> = {},
): AgentFanoutAgent => ({
  id,
  name: id,
  icon: <svg width={16} height={16} />,
  task: `${id} task`,
  status,
  ...extra,
});

it.each(themes)("agent-fanout %s %s", async (theme, mode) => {
  await emulate({ reducedMotion: true });
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        width: 480,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      <AgentFanout
        task="Choose a vector store for the retrieval stack"
        elapsed={4200}
        onStop={() => {}}
        agents={[
          agent("Research", "done", {
            result: "Found 18 sources",
            duration: 3000,
            agents: [agent("Papers", "done"), agent("Blogs", "done")],
          }),
          agent("Bench", "working", {
            agents: [agent("Latency", "working"), agent("Cost", "queued")],
          }),
          agent("Critic", "failed", { result: "Rate limited" }),
        ]}
      />
    </div>,
  );
  await expect
    .poll(() => document.querySelectorAll(".sprout-agent-fanout-edge").length)
    .toBe(7);
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`agent-fanout-${theme}-${mode}`);
});
