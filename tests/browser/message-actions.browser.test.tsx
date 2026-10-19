import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import {
  MessageActions,
  MessageBranch,
  type MessageFeedback,
} from "../../packages/sprout/src/components/message-actions.js";
import {
  Message,
  MessageContent,
  MessageGroup,
} from "../../packages/sprout/src/components/message.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const reply =
  "Notes are in [the reconciliation sheet](https://example.com/sheets/march-recon). **1,284** orders matched.";
const question = "Which March orders still need a match?";
const now = new Date().toISOString();

function Rated() {
  const [feedback, setFeedback] = useState<MessageFeedback | null>(null);
  const [index, setIndex] = useState(1);
  return (
    <div style={{ display: "grid", gap: 12, padding: 16, maxWidth: 480 }}>
      <MessageActions
        text={reply}
        createdAt={now}
        feedback={feedback}
        onFeedback={setFeedback}
        onRetry={() => {}}
      />
      <MessageActions text={question} author="human" createdAt={now} />
      <MessageActions
        text={reply}
        disabled
        feedback="up"
        onFeedback={() => {}}
      />
      <MessageBranch index={index} total={3} onChange={setIndex} />
    </div>
  );
}

function Conversation() {
  return (
    <MessageGroup style={{ padding: 16, maxWidth: 480 }}>
      <Message align="end" data-testid="human">
        <MessageContent>
          {question}
          <MessageActions text={question} author="human" hover />
        </MessageContent>
      </Message>
      <Message data-testid="assistant">
        <MessageContent>
          See <a href="#sheet">the reconciliation sheet</a>.
          <MessageActions text={reply} hover />
        </MessageContent>
      </Message>
    </MessageGroup>
  );
}

const row = (name: string) =>
  page.getByRole("group", { name }).element() as HTMLElement;
const opacity = (name: string) => getComputedStyle(row(name)).opacity;

function colorOf(token: string) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

/** Captures clipboard writes so copy works without permission prompts. */
function stubClipboard() {
  const written: string[] = [];
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (text: string) => void written.push(text),
      write: async () => {
        throw new Error("blocked");
      },
    },
  });
  return written;
}

describe("MessageActions in a real browser", () => {
  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Rated />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it("buttons keep their size and the human row aligns to the end", async () => {
    const screen = await render(<Rated />);
    await settle();
    for (const button of screen.container.querySelectorAll("button"))
      expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    const human = screen.container.querySelector(
      '[data-author="human"] [role="group"]',
    )!;
    const copy = human.querySelector("button")!.getBoundingClientRect();
    expect(human.getBoundingClientRect().right - copy.right).toBeLessThan(80);
    expect(getComputedStyle(human).justifyContent).toBe("flex-end");
    for (const button of screen.container.querySelectorAll(
      '[data-slot="message-actions"]:nth-child(3) button',
    ))
      expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("rates, clears and tabs through in order by keyboard", async () => {
    const screen = await render(<Rated />);
    const helpful = screen
      .getByRole("button", { name: "Helpful response", exact: true })
      .first();
    const unhelpful = screen
      .getByRole("button", { name: "Unhelpful response", exact: true })
      .first();
    await userEvent.tab();
    await expect
      .element(screen.getByRole("button", { name: "Copy response" }).first())
      .toHaveFocus();
    await userEvent.tab();
    await expect.element(helpful).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect.element(helpful).toHaveAttribute("aria-pressed", "true");
    await expect.element(helpful).toHaveAttribute("data-variant", "secondary");
    await userEvent.tab();
    await expect.element(unhelpful).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect.element(unhelpful).toHaveAttribute("aria-pressed", "true");
    await expect.element(helpful).toHaveAttribute("aria-pressed", "false");
    await userEvent.keyboard(" ");
    await expect.element(unhelpful).toHaveAttribute("aria-pressed", "false");
    await userEvent.tab();
    await expect
      .element(screen.getByRole("button", { name: "Regenerate" }))
      .toHaveFocus();
  });

  it("copy keeps focus on the relabelled button and shows a failure", async () => {
    const written = stubClipboard();
    const screen = await render(
      <>
        <MessageActions text={reply} />
        <MessageActions
          text={reply}
          html={() => "<strong>1,284</strong>"}
          author="human"
        />
      </>,
    );
    screen.getByRole("button", { name: "Copy response" }).element().focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .element(screen.getByRole("button", { name: "Response copied" }))
      .toHaveFocus();
    await expect
      .element(screen.getByRole("status").first())
      .toHaveTextContent("Response copied to clipboard.");
    expect(written[0]).toContain(
      "the reconciliation sheet (https://example.com/sheets/march-recon)",
    );
    await screen.getByRole("button", { name: "Copy message" }).click();
    const alert = screen.getByRole("alert");
    await expect
      .element(alert)
      .toHaveTextContent(
        "Couldn't copy. Select the message text or try again.",
      );
    expect(getComputedStyle(alert.element()).color).toBe(
      colorOf("--sprout-danger"),
    );
  });

  it("branch steps by keyboard and disables the ends", async () => {
    const screen = await render(<Rated />);
    const previous = screen.getByRole("button", { name: "Previous response" });
    const next = screen.getByRole("button", { name: "Next response" });
    previous.element().focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .element(screen.getByRole("group", { name: "Response versions" }))
      .toHaveTextContent("1 / 3");
    await expect.element(previous).toBeDisabled();
    await next.click();
    await next.click();
    await expect.element(next).toBeDisabled();
  });

  it("hover rows reveal on hover and on keyboard focus", async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Conversation />);
    await userEvent.hover(document.body, { position: { x: 1200, y: 700 } });
    await expect.poll(() => opacity("Message actions")).toBe("0");
    await expect.poll(() => opacity("Response actions")).toBe("0");
    await screen.getByTestId("assistant").hover();
    await expect.poll(() => opacity("Response actions")).toBe("1");
    expect(opacity("Message actions")).toBe("0");
    await userEvent.hover(document.body, { position: { x: 1200, y: 700 } });
    await userEvent.tab();
    await expect
      .element(screen.getByRole("button", { name: "Copy message" }))
      .toHaveFocus();
    await expect.poll(() => opacity("Message actions")).toBe("1");
    await userEvent.tab();
    await expect.element(screen.getByRole("link")).toHaveFocus();
    await expect.poll(() => opacity("Response actions")).toBe("1");
    await expect.poll(() => opacity("Message actions")).toBe("0");
  });

  it("fades hover rows, and reduced motion turns the fade off", async () => {
    await render(<Conversation />);
    expect(getComputedStyle(row("Message actions")).transitionProperty).toBe(
      "opacity",
    );
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(row("Message actions")).transitionProperty).toBe(
      "none",
    );
  });
});
