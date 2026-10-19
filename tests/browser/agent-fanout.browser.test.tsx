import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  AgentFanout,
  type AgentFanoutAgent,
} from "../../packages/sprout/src/components/agent-fanout.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

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

const mixed = [
  agent("Researcher", "done", { result: "Found 18 sources", duration: 3000 }),
  agent("Analyst", "working"),
  agent("Critic", "failed", { result: "Rate limited" }),
  agent("Writer", "queued"),
];

const node = (name: string) =>
  [
    ...document.querySelectorAll<HTMLElement>(
      '[data-slot="agent-fanout-node"]',
    ),
  ].find((item) => item.textContent === name)!;

const dot = (name: string) =>
  node(name).querySelector<HTMLElement>(".sprout-agent-fanout-dot")!;

const box = (element: Element) => element.getBoundingClientRect();

function colorOf(value: string) {
  const probe = document.createElement("span");
  probe.style.color = value;
  document.body.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

async function graph() {
  await expect
    .poll(() => document.querySelectorAll(".sprout-agent-fanout-edge").length)
    .toBeGreaterThan(0);
}

describe("AgentFanout in a real browser", () => {
  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    await emulate({ reducedMotion: true });
    setTheme(theme, mode);
    const screen = await render(
      <AgentFanout task="Pick a vector store" agents={mixed} defaultOpen />,
    );
    await graph();
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it.each(themes)(
    "%s %s draws a Card frame and colors nodes with tokens",
    async (theme, mode) => {
      setTheme(theme, mode);
      await render(<AgentFanout task="t" agents={mixed} />);
      await graph();
      const card = getComputedStyle(
        document.querySelector('[data-slot="agent-fanout"]')!,
      );
      expect(card.borderTopWidth).toBe("1px");
      expect(card.borderTopStyle).toBe("solid");
      expect(card.borderTopColor).toBe(colorOf("var(--sprout-line)"));
      expect(card.boxShadow).toBe("none");
      expect(getComputedStyle(dot("Researcher")).backgroundColor).toBe(
        colorOf("var(--sprout-chart-1)"),
      );
      expect(getComputedStyle(dot("Researcher")).color).toBe(
        colorOf("var(--sprout-surface)"),
      );
      expect(getComputedStyle(dot("Analyst")).borderColor).toBe(
        colorOf("var(--sprout-chart-2)"),
      );
      expect(getComputedStyle(dot("Critic")).color).toBe(
        colorOf("var(--sprout-danger)"),
      );
    },
  );

  it("hides details until the Details button opens them", async () => {
    await render(<AgentFanout task="t" agents={mixed} />);
    const details = page.getByRole("button", { name: /Details/ });
    await expect.element(details).toHaveAttribute("aria-expanded", "false");
    await expect.element(page.getByText("2 of 4 finished")).toBeVisible();
    await expect
      .element(page.getByRole("list", { name: "Subagent status" }))
      .not.toBeInTheDocument();
    await userEvent.click(details);
    await expect.element(details).toHaveAttribute("aria-expanded", "true");
    await expect
      .element(page.getByRole("list", { name: "Subagent status" }))
      .toBeVisible();
    await expect.element(page.getByText("Found 18 sources")).toBeVisible();
  });

  it("puts each level lower and centers a parent over its helpers", async () => {
    await render(
      <AgentFanout
        task="t"
        agents={[
          agent("Lead", "working", {
            agents: [agent("Left", "done"), agent("Right", "queued")],
          }),
          agent("Solo", "queued"),
        ]}
      />,
    );
    await graph();
    const lead = box(dot("Lead"));
    const left = box(dot("Left"));
    const right = box(dot("Right"));
    expect(left.top).toBeGreaterThan(lead.bottom);
    expect(right.top).toBe(left.top);
    expect(
      Math.abs(lead.left + lead.width / 2 - (left.left + right.right) / 2),
    ).toBeLessThanOrEqual(1);
    expect(getComputedStyle(dot("Left")).backgroundColor).toBe(
      getComputedStyle(dot("Lead")).borderColor,
    );
  });

  it("fits six agents inside the card at 390px", async () => {
    await page.viewport(390, 844);
    await render(
      <div style={{ padding: 16 }}>
        <AgentFanout
          task="Plan the launch"
          agents={["One", "Two", "Three", "Four", "Five", "Six"].map((id) =>
            agent(id, "working"),
          )}
          defaultOpen
        />
      </div>,
    );
    await graph();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    const card = box(document.querySelector('[data-slot="agent-fanout"]')!);
    for (const item of document.querySelectorAll(
      '[data-slot="agent-fanout-node"]',
    )) {
      expect(box(item).left).toBeGreaterThanOrEqual(card.left);
      expect(box(item).right).toBeLessThanOrEqual(card.right);
    }
  });

  it("sends a pulse when an agent starts and keeps its line mounted", async () => {
    await emulate({ reducedMotion: false });
    const screen = await render(
      <AgentFanout task="t" agents={[agent("a", "queued")]} />,
    );
    await graph();
    const line = document.querySelector(".sprout-agent-fanout-edge")!;
    expect(document.querySelector("[data-trip]")).toBeNull();
    await screen.rerender(
      <AgentFanout task="t" agents={[agent("a", "working")]} />,
    );
    await expect
      .poll(() =>
        document.querySelector<HTMLElement>(
          '.sprout-agent-fanout-comet[data-trip="out"]',
        ),
      )
      .not.toBeNull();
    const comet = document.querySelector<HTMLElement>(
      ".sprout-agent-fanout-comet",
    )!;
    expect(getComputedStyle(comet).animationName).toBe(
      "sprout-agent-fanout-comet-out",
    );
    await screen.rerender(
      <AgentFanout task="t" agents={[agent("a", "working")]} elapsed={100} />,
    );
    expect(line.isConnected).toBe(true);
    expect(comet.isConnected).toBe(true);
  });

  it("reduced motion skips the pulse", async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(
      <AgentFanout task="t" agents={[agent("a", "queued")]} />,
    );
    await graph();
    await screen.rerender(
      <AgentFanout task="t" agents={[agent("a", "working")]} />,
    );
    await expect
      .poll(() => document.querySelector(".sprout-agent-fanout-comet"))
      .not.toBeNull();
    expect(
      getComputedStyle(document.querySelector(".sprout-agent-fanout-comet")!)
        .animationName,
    ).toBe("none");
  });
});
