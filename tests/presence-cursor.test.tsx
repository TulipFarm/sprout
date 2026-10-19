import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { PresenceCursor } from "../packages/sprout/src/components/presence-cursor.js";
import * as sprout from "../packages/sprout/src/index.js";

describe("PresenceCursor", () => {
  it("is exported from the package root", () => {
    expect(sprout).toHaveProperty("PresenceCursor", PresenceCursor);
  });

  it("renders a named image at the given spot with a name tag", () => {
    const html = renderToString(
      <PresenceCursor name="rico@gmail.com" color="#c92a2a" x={12} y={34} />,
    );
    expect(html).toMatch(
      /^<div data-slot="presence-cursor" role="img" aria-label="rico@gmail.com" class="sprout-presence-cursor" style="--sprout-presence-color:#c92a2a;transform:translate\(12px, 34px\)">/,
    );
    expect(html).toContain(
      '<span data-slot="presence-cursor-label" class="sprout-presence-cursor-label" aria-hidden="true">rico@gmail.com</span>',
    );
    expect(html).not.toContain("presence-cursor-avatar");
  });

  it("shows the avatar instead of the tag", () => {
    const html = renderToString(
      <PresenceCursor
        name="jenny@gmail.com"
        color="red"
        x={0}
        y={0}
        avatar={<b>JE</b>}
      />,
    );
    expect(html).toContain(
      '<span data-slot="presence-cursor-avatar" class="sprout-presence-cursor-avatar" aria-hidden="true"><b>JE</b></span>',
    );
    expect(html).not.toContain("presence-cursor-label");
    expect(html).toContain('aria-label="jenny@gmail.com"');
  });

  it("merges classes and passes props to the root", () => {
    const html = renderToString(
      <PresenceCursor
        name="a"
        color="red"
        x={0}
        y={0}
        className="z-10"
        data-x="1"
        style={{ opacity: 0.5 }}
      />,
    );
    expect(html).toContain('class="sprout-presence-cursor z-10"');
    expect(html).toContain('data-x="1"');
    expect(html).toContain("opacity:0.5");
  });
});
