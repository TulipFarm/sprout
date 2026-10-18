import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { SelectionSlot } from "../packages/sprout/src/components/selection-slot.js";
import * as sprout from "../packages/sprout/src/index.js";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("../packages/sprout/src/styles/selection-slot.css");

describe("SelectionSlot", () => {
  it("is exported from the package root and its subpath", () => {
    expect(sprout).toHaveProperty("SelectionSlot", SelectionSlot);
    const pkg = JSON.parse(read("../packages/sprout/package.json"));
    expect(pkg.exports["./selection-slot"]).toEqual({
      types: "./dist/components/selection-slot.d.ts",
      import: "./dist/components/selection-slot.js",
    });
    expect(read("../packages/sprout/src/styles/index.css")).toContain(
      '@import "./selection-slot.css";',
    );
    expect(read("../apps/docs/src/data/nav.ts")).toContain('"Selection Slot"');
  });

  it("shows only the tools while inactive", () => {
    const html = renderToString(
      <SelectionSlot active={false} selection={<span>2 selected</span>}>
        <button type="button">Search</button>
      </SelectionSlot>,
    );
    expect(html).toContain('data-slot="selection-slot"');
    expect(html).toContain('class="sprout-selection-slot"');
    expect(html).not.toContain("data-active");
    expect(html).toContain('data-slot="selection-slot-default"');
    expect(html).not.toContain("inert");
    expect(html).not.toContain("aria-hidden");
    expect(html).toContain(">Search</button>");
    expect(html).not.toContain("2 selected");
    expect(html).not.toContain("selection-slot-selection");
  });

  it("accepts an undefined selection while inactive", () => {
    const html = renderToString(
      <SelectionSlot active={false} selection={undefined}>
        <fieldset disabled aria-label="Table tools" />
      </SelectionSlot>,
    );
    expect(html).toContain('aria-label="Table tools"');
    expect(html).toContain("disabled");
  });

  it("keeps the tools mounted but inert and hidden while active", () => {
    const html = renderToString(
      <SelectionSlot
        active
        selection={
          <div role="toolbar" aria-label="Selected items">
            <p role="status">2 items selected</p>
          </div>
        }
      >
        <button type="button">Search</button>
      </SelectionSlot>,
    );
    expect(html).toContain('data-active="true"');
    expect(html).toMatch(
      /data-slot="selection-slot-default"[^>]*inert=""[^>]*aria-hidden="true"/,
    );
    expect(html).toContain(">Search</button>");
    expect(html).toContain('data-slot="selection-slot-selection"');
    expect(html).toContain(
      'class="sprout-selection-slot-layer sprout-selection-slot-selection"',
    );
    expect(html).toContain('role="toolbar"');
    expect(html).toContain("2 items selected");
    expect(html.indexOf("Search")).toBeLessThan(
      html.indexOf("2 items selected"),
    );
  });

  it("passes props and merges classes on the root", () => {
    const html = renderToString(
      <SelectionSlot
        active={false}
        selection={null}
        id="files-toolbar"
        className="mt-2"
        data-testid="slot"
      >
        Tools
      </SelectionSlot>,
    );
    expect(html).toContain('id="files-toolbar"');
    expect(html).toContain('class="sprout-selection-slot mt-2"');
    expect(html).toContain('data-testid="slot"');
  });

  it("stacks both layers in one cell, names the container, and respects reduced motion", () => {
    expect(css).toContain("container: sprout-selection / inline-size");
    expect(css).toContain("grid-area: 1 / 1");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(css).toMatch(/\[inert\]\s*\{\s*visibility: hidden;/);
    expect(css).toMatch(
      /prefers-reduced-motion: no-preference[\s\S]*sprout-selection-slot-selection[\s\S]*animation/,
    );
    expect(css).toContain("var(--sprout-motion-normal)");
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });
});
