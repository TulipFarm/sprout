import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  ChatConfirmation,
  type ChatConfirmationDecision,
  type ConfirmationState,
} from "../../packages/sprout/src/components/chat-confirmation.js";
import { axeViolations, setTheme, settle, size, themes } from "./support.js";

const details = [
  { label: "Table", value: "Supplier deliveries" },
  { label: "Affected rows", value: "1,284 rows lose their Notes value" },
];

const states: ConfirmationState[] = [
  { kind: "pending" },
  { kind: "submitting", decision: "approve" },
  { kind: "submitting", decision: "reject" },
  { kind: "error", message: "Your decision could not be recorded. Try again." },
  { kind: "approved" },
  { kind: "rejected" },
  { kind: "expired" },
  { kind: "cancelled" },
];

/** A card that submits on decision and settles when the test calls `finish`. */
function Live({ onSubmit }: { onSubmit: (finish: () => void) => void }) {
  const [state, setState] = useState<ConfirmationState>({ kind: "pending" });
  const decide = (decision: ChatConfirmationDecision) => {
    setState({ kind: "submitting", decision });
    onSubmit(() =>
      setState({ kind: decision === "approve" ? "approved" : "rejected" }),
    );
  };
  return (
    <ChatConfirmation
      title="Remove the Notes field from Supplier deliveries"
      description="Review these changes before approving."
      details={details}
      state={state}
      onDecision={decide}
    />
  );
}

function All() {
  return (
    <div style={{ display: "grid", gap: 12, padding: 16, maxWidth: 640 }}>
      {states.map((state, i) => (
        <ChatConfirmation
          key={i}
          title={`Remove the Notes field (${state.kind})`}
          description="Review these changes before approving."
          details={details}
          state={state}
          onDecision={() => {}}
        />
      ))}
    </div>
  );
}

const card = () =>
  document.querySelector<HTMLElement>('[data-slot="chat-confirmation"]')!;

/** Tabs from the top of the page, whatever the previous test left focused. */
async function tabFromStart() {
  const start = document.createElement("button");
  document.body.prepend(start);
  start.focus();
  await userEvent.tab();
  start.remove();
}

describe("ChatConfirmation in a real browser", () => {
  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<All />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it("keyboard approval submits, settles and moves focus to the outcome", async () => {
    let finish = () => {};
    const screen = await render(<Live onSubmit={(done) => (finish = done)} />);
    const approve = screen.getByRole("button", { name: "Approve action" });
    await tabFromStart();
    await userEvent.tab();
    await expect.element(approve).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect.element(approve).toHaveAttribute("aria-busy", "true");
    await expect.element(approve).toBeDisabled();
    await expect
      .element(screen.getByRole("button", { name: "Decline" }))
      .toBeDisabled();
    finish();
    const outcome = screen.getByRole("status");
    await expect
      .element(outcome)
      .toHaveTextContent(
        "Approval recorded. This does not confirm the action has completed.",
      );
    await expect.element(outcome).toHaveFocus();
    await expect
      .element(screen.getByRole("button", { name: "Approve action" }))
      .not.toBeInTheDocument();

    const trigger = screen.getByRole("button", {
      name: "Remove the Notes field from Supplier deliveries",
    });
    await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.tab({ shift: true });
    await expect.element(trigger).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect.element(trigger).toHaveAttribute("aria-expanded", "true");
    await expect.element(screen.getByText("Affected rows")).toBeVisible();
  });

  it("declining shows a busy Decline, then focuses the declined outcome", async () => {
    let finish = () => {};
    const screen = await render(<Live onSubmit={(done) => (finish = done)} />);
    const decline = screen.getByRole("button", { name: "Decline" });
    await decline.click();
    await expect.element(decline).toHaveAttribute("aria-busy", "true");
    await expect
      .element(screen.getByRole("button", { name: "Approve action" }))
      .toHaveAttribute("aria-busy", "false");
    finish();
    const outcome = screen.getByRole("status");
    await expect
      .element(outcome)
      .toHaveTextContent("The proposed action was declined.");
    await expect.element(outcome).toHaveFocus();
  });

  it("outcomes set from outside do not steal focus", async () => {
    function Remote() {
      const [state, setState] = useState<ConfirmationState>({
        kind: "pending",
      });
      return (
        <>
          <button onClick={() => setState({ kind: "expired" })}>Expire</button>
          <ChatConfirmation
            title="Send a reminder"
            description="Review before approving."
            details={details}
            state={state}
            onDecision={() => {}}
          />
        </>
      );
    }
    const screen = await render(<Remote />);
    const expire = screen.getByRole("button", { name: "Expire" });
    await expire.click();
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent("This approval expired. No approval was granted.");
    await expect.element(expire).toHaveFocus();
  });

  it("Tab moves between the decision buttons", async () => {
    const screen = await render(
      <ChatConfirmation
        title="Send a reminder"
        description="Review before approving."
        details={[{ label: "To", value: "alex@example.com" }]}
        state={{ kind: "pending" }}
        onDecision={() => {}}
      />,
    );
    const approve = screen.getByRole("button", { name: "Approve action" });
    (approve.element() as HTMLElement).focus();
    await userEvent.tab();
    await expect
      .element(screen.getByRole("button", { name: "Decline" }))
      .toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect.element(approve).toHaveFocus();
  });

  it("the focused outcome shows a focus ring and error text uses the danger tone", async () => {
    let finish = () => {};
    const screen = await render(
      <>
        <Live onSubmit={(done) => (finish = done)} />
        <ChatConfirmation
          title="Failed"
          description="Review before approving."
          details={details}
          state={{ kind: "error", message: "Could not record." }}
          onDecision={() => {}}
        />
      </>,
    );
    const probe = document.createElement("span");
    probe.style.color = "var(--sprout-danger)";
    document.body.append(probe);
    const danger = getComputedStyle(probe).color;
    probe.remove();
    expect(getComputedStyle(screen.getByRole("alert").element()).color).toBe(
      danger,
    );
    const approve = screen
      .getByRole("button", { name: "Approve action" })
      .first();
    (approve.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    finish();
    const outcome = screen.getByRole("status");
    await expect.element(outcome).toHaveFocus();
    expect(getComputedStyle(outcome.element()).outlineStyle).toBe("solid");
  });

  it("every state fits a 390px phone with actions inside the footer", async () => {
    await page.viewport(390, 900);
    const screen = await render(<All />);
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const node of screen.container.querySelectorAll(
      '[data-slot="chat-confirmation"], .sprout-review-card-header, .sprout-review-card-badge, [data-slot="review-row"]',
    ))
      expect(node.scrollWidth, node.className).toBeLessThanOrEqual(
        node.clientWidth + 1,
      );
    for (const button of screen.container.querySelectorAll(
      ".sprout-review-card-actions button",
    )) {
      const footer = button
        .closest(".sprout-review-card-footer")!
        .getBoundingClientRect();
      const box = button.getBoundingClientRect();
      expect(box.left).toBeGreaterThanOrEqual(footer.left);
      expect(box.right).toBeLessThanOrEqual(footer.right);
    }
    expect(size(card())[0]).toBeLessThanOrEqual(390);
  });
});
