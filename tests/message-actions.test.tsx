import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as sprout from "../packages/sprout/src/index.js";
import {
  MessageActions,
  MessageBranch,
  messageActionsAuthorNames,
} from "../packages/sprout/src/components/message-actions.js";

const today = () => {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    9,
    41,
  ).toISOString();
};

describe("MessageActions", () => {
  it("is exported from the package root", () => {
    expect(sprout).toHaveProperty("MessageActions");
    expect(sprout).toHaveProperty("MessageBranch");
    expect(messageActionsAuthorNames).toEqual(["assistant", "human"]);
  });

  it("shows only Copy for text alone, named for a response", () => {
    const html = renderToString(<MessageActions text="Handoff" />);
    expect(html).toContain('data-slot="message-actions"');
    expect(html).toContain('data-author="assistant"');
    expect(html).toContain('role="group" aria-label="Response actions"');
    expect(html).toContain('aria-label="Copy response"');
    expect(html).toContain('title="Copy response"');
    expect(html).toContain('data-variant="ghost" data-size="icon-sm"');
    expect(html).not.toContain("<time");
    expect(html).not.toContain("Helpful");
    expect(html).not.toContain("Regenerate");
    expect(html).not.toContain("data-hover");
    expect(html).toContain('role="status"');
    expect(html).not.toContain('role="alert"');
  });

  it("names human controls as a message and shows the send time", () => {
    const createdAt = today();
    const html = renderToString(
      <MessageActions
        text="Which orders are missing?"
        author="human"
        createdAt={createdAt}
        hover
      />,
    );
    expect(html).toContain('aria-label="Message actions"');
    expect(html).toContain('aria-label="Copy message"');
    expect(html).toContain('data-hover=""');
    expect(html).toContain(`dateTime="${createdAt}"`);
    expect(html).toMatch(
      /<time class="sprout-message-actions-time"[^>]*title="[^"]+"[^>]*>[^<]*41/,
    );
  });

  it("shows yesterday and dated send times", () => {
    const now = new Date();
    const yesterday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      16,
      30,
    ).toISOString();
    const older = new Date(now.getFullYear() - 1, 10, 18, 14, 5).toISOString();
    expect(
      renderToString(<MessageActions text="a" createdAt={yesterday} />),
    ).toMatch(/>Yesterday [^<]*:30/);
    expect(
      renderToString(<MessageActions text="a" createdAt={older} />),
    ).toContain(String(now.getFullYear() - 1));
  });

  it("shows feedback toggles with the given rating pressed, and Regenerate", () => {
    const html = renderToString(
      <MessageActions
        text="Reply"
        feedback="up"
        onFeedback={() => {}}
        onRetry={() => {}}
      />,
    );
    expect(html).toMatch(
      /data-variant="secondary"[^>]*aria-label="Helpful response" aria-pressed="true"/,
    );
    expect(html).toMatch(
      /data-variant="ghost"[^>]*aria-label="Unhelpful response" aria-pressed="false"/,
    );
    expect(html).toMatch(
      /data-variant="ghost" data-size="sm"[^>]*>Regenerate</,
    );
  });

  it("disables every button", () => {
    const html = renderToString(
      <MessageActions
        text="Reply"
        disabled
        onFeedback={() => {}}
        onRetry={() => {}}
      />,
    );
    expect(html.match(/<button[^>]*disabled=""/g)).toHaveLength(4);
  });
});

describe("MessageBranch", () => {
  it("shows the one-based position and disables the ends", () => {
    const first = renderToString(
      <MessageBranch index={0} total={3} onChange={() => {}} />,
    );
    expect(first).toContain('data-slot="message-branch"');
    expect(first).toContain('aria-label="Response versions"');
    expect(first.replaceAll("<!-- -->", "")).toContain(">1 / 3</span>");
    expect(first).toMatch(
      /<button(?=[^>]*aria-label="Previous response")[^>]*disabled=""/,
    );
    expect(first).not.toMatch(
      /<button(?=[^>]*aria-label="Next response")[^>]*disabled=""/,
    );
    const last = renderToString(
      <MessageBranch index={2} total={3} onChange={() => {}} />,
    );
    expect(last).toMatch(
      /<button(?=[^>]*aria-label="Next response")[^>]*disabled=""/,
    );
    expect(last).not.toMatch(
      /<button(?=[^>]*aria-label="Previous response")[^>]*disabled=""/,
    );
  });
});
