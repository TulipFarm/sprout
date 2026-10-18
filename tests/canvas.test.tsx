import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as sprout from "../packages/sprout/src/index.js";
import {
  CanvasFrame,
  CanvasPanel,
  CanvasSection,
  CanvasToggle,
  ChatSplit,
  canvasSplitMinWidth,
} from "../packages/sprout/src/components/canvas.js";

const noop = () => {};
const Database = ({ size }: { size?: number }) => (
  <svg width={size} height={size} />
);

describe("Canvas", () => {
  it("is exported from the package root", () => {
    for (const name of [
      "CanvasFrame",
      "CanvasPanel",
      "CanvasSection",
      "CanvasToggle",
      "ChatSplit",
      "canvasSplitMinWidth",
    ]) {
      expect(sprout).toHaveProperty(name);
    }
    expect(canvasSplitMinWidth).toBe(720);
  });

  it("labels the toggle by state and count", () => {
    const closed = renderToString(
      <CanvasToggle open={false} count={0} onToggle={noop} />,
    );
    expect(closed).toContain('aria-label="Show canvas"');
    expect(closed).toContain('aria-pressed="false"');
    expect(closed).toContain("View results");
    expect(closed).not.toContain("sprout-canvas-toggle-count");

    const counted = renderToString(
      <CanvasToggle open={false} count={3} onToggle={noop} />,
    );
    expect(counted).toContain('aria-label="Show canvas, 3 open"');
    expect(counted).toMatch(/sprout-canvas-toggle-count[^>]*>3</);

    const open = renderToString(
      <CanvasToggle open count={1} onToggle={noop} />,
    );
    expect(open).toContain('aria-label="Hide canvas"');
    expect(open).toContain('aria-pressed="true"');
    expect(open).toContain("Hide results");
  });

  it("renders sections with and without a header", () => {
    const full = renderToString(
      <CanvasSection
        title="Google Calendar"
        meta="Read Oct 18 · Saved snapshot, not a live calendar"
        actions={<a href="#live">Open live calendar</a>}
      >
        <p>Events</p>
      </CanvasSection>,
    );
    expect(full).toContain('data-slot="canvas-section"');
    expect(full).toMatch(/<h3[^>]*>Google Calendar<\/h3>/);
    expect(full).toContain("Saved snapshot, not a live calendar");
    expect(full).toContain("sprout-canvas-section-actions");

    const titleOnly = renderToString(
      <CanvasSection title="Table changed">
        <p>Body</p>
      </CanvasSection>,
    );
    expect(titleOnly).not.toContain("sprout-canvas-section-meta");
    expect(titleOnly).not.toContain("sprout-canvas-section-actions");

    const bare = renderToString(
      <CanvasSection>
        <p>Plan</p>
      </CanvasSection>,
    );
    expect(bare).not.toContain("sprout-canvas-section-header");
    expect(bare).toContain("<p>Plan</p>");
  });

  it("sandboxes the frame", () => {
    const html = renderToString(
      <CanvasFrame src="/sample.html" title="Pricing page" />,
    );
    expect(html).toContain('sandbox="allow-scripts allow-popups"');
    expect(html.toLowerCase()).toContain('referrerpolicy="no-referrer"');
    expect(html).toContain('title="Pricing page"');
    expect(html).toContain('loading="lazy"');
  });

  it("renders tabs, busy tabs, and the empty heading", () => {
    const html = renderToString(
      <CanvasPanel
        tabs={[
          { id: "customers", title: "Customers", icon: Database },
          { id: "pipeline", title: "Weekly pipeline", busy: true },
        ]}
        activeId="customers"
        onSelect={noop}
        onCloseTab={noop}
        onClose={noop}
        activity={<div>A Google action needs your review</div>}
      >
        <p>Rows</p>
      </CanvasPanel>,
    );
    expect(html).toContain('aria-label="Canvas"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Open in canvas"');
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-label="Weekly pipeline, loading"');
    expect(html).toContain('aria-label="Close Customers"');
    expect(html).toContain('aria-label="Close canvas"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain("A Google action needs your review");

    const empty = renderToString(
      <CanvasPanel
        tabs={[]}
        activeId={null}
        onSelect={noop}
        onCloseTab={noop}
        onClose={noop}
      >
        <p>No workflow open</p>
      </CanvasPanel>,
    );
    expect(empty).toMatch(/<h2[^>]*>Canvas<\/h2>/);
    expect(empty).not.toContain('role="tablist"');
    expect(empty).not.toContain('role="tabpanel"');
  });

  it("renders the chat in a split without a canvas", () => {
    const html = renderToString(
      <ChatSplit
        open={false}
        onOpenChange={noop}
        layoutId="test:split"
        chat={<p>Conversation</p>}
        canvas={false}
      />,
    );
    expect(html).toContain('data-slot="chat-split"');
    expect(html).toContain('data-layout="split"');
    expect(html).toContain("<p>Conversation</p>");
    expect(html).not.toContain("data-open");
  });
});
