import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { Label } from "../packages/sprout/src/components/label.js";
import * as sprout from "../packages/sprout/src/index.js";

describe("Label", () => {
  it("is exported from the package root", () => {
    expect(sprout).toHaveProperty("Label", Label);
  });

  it("renders a label with its slot and class", () => {
    expect(renderToString(<Label>Workspace name</Label>)).toBe(
      '<label data-slot="label" class="sprout-label">Workspace name</label>',
    );
  });

  it("points at a control with htmlFor", () => {
    for (const [id, text] of [
      ["workspace-name", "Workspace name"],
      ["share-role", "Access"],
      ["heartbeat-cadence", "Check every, in minutes"],
      [
        "retained-data",
        "I understand that workspace data is retained, not erased.",
      ],
    ])
      expect(renderToString(<Label htmlFor={id}>{text}</Label>)).toBe(
        `<label data-slot="label" class="sprout-label" for="${id}">${text}</label>`,
      );
  });

  it("wraps a control with its text, including hidden text", () => {
    const wrapped = renderToString(
      <Label key="invoke">
        <input type="checkbox" defaultChecked />
        Run workflow
      </Label>,
    );
    expect(wrapped).toContain(
      '<input type="checkbox" checked=""/>Run workflow</label>',
    );
    const hidden = renderToString(
      <Label>
        <input type="checkbox" />
        <span className="sr-only">Use Maya Chen</span>
      </Label>,
    );
    expect(hidden).toContain(
      '<span class="sr-only">Use Maya Chen</span></label>',
    );
    const block = renderToString(
      <Label>
        Decision or comment
        <textarea disabled />
      </Label>,
    );
    expect(block).toContain(
      'Decision or comment<textarea disabled=""></textarea>',
    );
  });

  it("passes attributes and handlers and merges classes", () => {
    const html = renderToString(
      <Label
        id="message-label"
        className="sr-only"
        title="Message text"
        onClick={() => {}}
      >
        Message text
      </Label>,
    );
    expect(html).toContain('id="message-label"');
    expect(html).toContain('title="Message text"');
    expect(html).toContain('class="sprout-label sr-only"');
    expect(html).not.toContain("for=");
  });
});
