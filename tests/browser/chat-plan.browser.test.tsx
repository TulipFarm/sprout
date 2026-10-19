import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  ChatPlan,
  type ChatPlanStep,
} from "../../packages/sprout/src/components/chat-plan.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const steps: ChatPlanStep[] = [
  { id: "patch", title: "Choose a patch", state: "complete" },
  { id: "soil", title: "Prepare the soil", state: "running" },
  {
    id: "bulbs",
    title: "Order bulbs",
    detail: "The sample supplier is unavailable.",
    state: "error",
  },
  { id: "plant", title: "Plant the bulbs", state: "pending" },
];

const long: ChatPlanStep[] = [
  {
    id: "long",
    title:
      "Reconcile-every-supplier-invoice-against-the-purchase-ledger-before-closing-the-quarter",
    detail:
      "https://suppliers.example.com/invoices/2026/q3/reconciliation/unmatched-items-export.csv",
    state: "error",
  },
  {
    id: "short",
    title: "Email the finance team a summary of unmatched invoices",
    state: "pending",
  },
];

function Plans() {
  return (
    <div style={{ display: "grid", gap: 16, padding: 16 }}>
      <ChatPlan title="Fictional garden plan" steps={steps} />
      <ChatPlan title="New plan" steps={[]} />
      <ChatPlan
        title="A very long plan title that keeps going so it has to wrap on a phone"
        steps={long}
      />
    </div>
  );
}

function colorOf(value: string) {
  const probe = document.createElement("span");
  probe.style.color = value;
  document.body.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

const icon = (state: string) =>
  document.querySelector<HTMLElement>(
    `[data-state="${state}"] .sprout-chat-plan-icon`,
  )!;

describe("ChatPlan in a real browser", () => {
  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    await emulate({ reducedMotion: true });
    setTheme(theme, mode);
    const screen = await render(<Plans />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it.each(themes)(
    "%s %s colors complete, failed, and pending icons with tokens",
    async (theme, mode) => {
      setTheme(theme, mode);
      await render(<Plans />);
      expect(getComputedStyle(icon("complete")).color).toBe(
        colorOf("var(--sprout-success)"),
      );
      expect(getComputedStyle(icon("error")).color).toBe(
        colorOf("var(--sprout-danger)"),
      );
      expect(getComputedStyle(icon("pending")).color).toBe(
        colorOf("var(--sprout-muted)"),
      );
      expect(getComputedStyle(icon("running")).color).toBe(
        colorOf("var(--sprout-muted)"),
      );
    },
  );

  it("hides state words visually but keeps them in the accessible text", async () => {
    await render(<Plans />);
    const hidden = document.querySelector<HTMLElement>(
      ".sprout-chat-plan-sr-only",
    )!;
    const box = hidden.getBoundingClientRect();
    expect(box.width).toBeLessThanOrEqual(1);
    expect(box.height).toBeLessThanOrEqual(1);
    expect(getComputedStyle(hidden).clipPath).toBe("inset(50%)");
    const plan = page.getByRole("region", { name: "Fictional garden plan" });
    await expect
      .element(plan.getByRole("listitem").nth(1))
      .toHaveTextContent("Prepare the soil · In progress");
  });

  it("long titles and details wrap inside the plan padding at 390px", async () => {
    await page.viewport(390, 844);
    await render(<Plans />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const plan of document.querySelectorAll<HTMLElement>(
      '[data-slot="chat-plan"]',
    )) {
      expect(plan.scrollWidth).toBeLessThanOrEqual(plan.clientWidth + 1);
      const outer = plan.getBoundingClientRect();
      for (const step of plan.querySelectorAll<HTMLElement>(
        '[data-slot="chat-plan-step"]',
      )) {
        expect(step.scrollWidth).toBeLessThanOrEqual(step.clientWidth + 1);
        expect(step.getBoundingClientRect().right).toBeLessThanOrEqual(
          outer.right - 15,
        );
      }
    }
    const title = document.querySelectorAll<HTMLElement>(
      ".sprout-chat-plan-step-title",
    )[4]!;
    expect(title.getBoundingClientRect().height).toBeGreaterThan(20);
  });

  it("step icons fade in, and replay when a step changes state", async () => {
    const screen = await render(
      <ChatPlan
        title="Plan"
        steps={[{ id: "a", title: "A", state: "pending" }]}
      />,
    );
    const first = document.querySelector<HTMLElement>(
      ".sprout-chat-plan-icon",
    )!;
    const style = getComputedStyle(first);
    expect(style.animationName).toBe("sprout-chat-plan-icon-in");
    expect(style.animationDuration).toBe("0.18s");
    await screen.rerender(
      <ChatPlan
        title="Plan"
        steps={[{ id: "a", title: "A", state: "complete" }]}
      />,
    );
    const next = document.querySelector<HTMLElement>(".sprout-chat-plan-icon")!;
    expect(next).not.toBe(first);
    expect(next.getAnimations().length).toBeGreaterThan(0);
  });

  it("reduced motion skips the icon animation", async () => {
    await emulate({ reducedMotion: true });
    await render(<Plans />);
    expect(getComputedStyle(icon("complete")).animationName).toBe("none");
  });
});
