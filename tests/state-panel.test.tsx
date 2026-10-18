import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  StatePanel,
  statePanelKindNames,
} from "../packages/sprout/src/components/state-panel.js";

function Glyph({ size }: { size?: number }) {
  return <svg data-glyph={size} />;
}

describe("StatePanel", () => {
  it("lists every Cloud kind", () => {
    expect(statePanelKindNames).toEqual([
      "empty",
      "loading",
      "success",
      "unavailable",
      "error",
    ]);
  });

  it("renders the centered layout with an h2 and no live role for empty", () => {
    const html = renderToString(
      <StatePanel
        kind="empty"
        title="No files yet"
        description="Upload one."
      />,
    );
    expect(html).toMatch(/^<div data-slot="state-panel"/);
    expect(html).toContain('data-layout="centered"');
    expect(html).toContain('data-kind="empty"');
    expect(html).toContain(
      '<h2 class="sprout-state-panel-title">No files yet</h2>',
    );
    expect(html).toContain("Upload one.");
    expect(html).not.toContain("role=");
    expect(html).not.toContain("state-panel-actions");
  });

  it("maps kinds to live roles", () => {
    const roles = {
      loading: 'role="status"',
      success: 'role="status"',
      unavailable: null,
    } as const;
    for (const [kind, role] of Object.entries(roles)) {
      const html = renderToString(
        <StatePanel
          kind={kind as keyof typeof roles}
          title="Title"
          description="Description"
        />,
      );
      if (role) expect(html).toContain(role);
      else expect(html).not.toContain("role=");
      expect(html).toContain('aria-atomic="true"');
    }
    const error = renderToString(
      <StatePanel kind="error" title="Failed" description="Try again.">
        <button type="button">Try again</button>
      </StatePanel>,
    );
    expect(error).toContain('role="alert"');
    expect(error).toContain("sprout-state-panel-danger");
    expect(error).toContain('data-slot="state-panel-actions"');
  });

  it("uses fixed media for loading, success, and error and icon otherwise", () => {
    const glyph = (kind: "empty" | "unavailable" | "loading" | "success") =>
      renderToString(
        <StatePanel kind={kind} icon={Glyph} title="T" description="D" />,
      );
    expect(glyph("empty")).toContain('data-glyph="20"');
    expect(glyph("unavailable")).toContain('data-glyph="20"');
    expect(glyph("loading")).not.toContain("data-glyph");
    expect(glyph("loading")).toContain("sprout-state-panel-spinner");
    expect(glyph("success")).not.toContain("data-glyph");
    expect(
      renderToString(<StatePanel kind="empty" title="T" description="D" />),
    ).toContain('aria-hidden="true"');
  });

  it("drops the icon tile for empty and unavailable when icon is null", () => {
    for (const kind of ["empty", "unavailable"] as const)
      expect(
        renderToString(
          <StatePanel
            kind={kind}
            icon={null}
            title="Nothing"
            description="Yet"
          />,
        ),
      ).not.toContain('data-slot="state-panel-media"');
    expect(
      renderToString(
        <StatePanel
          kind="loading"
          icon={null}
          title="Loading"
          description="Wait"
        />,
      ),
    ).toContain('data-slot="state-panel-media"');
  });

  it("supports every heading level", () => {
    for (const heading of ["h1", "h2", "h3", "h4"] as const) {
      expect(
        renderToString(
          <StatePanel
            kind="unavailable"
            heading={heading}
            title="T"
            description="D"
          />,
        ),
      ).toContain(`<${heading} class="sprout-state-panel-title">`);
    }
  });

  it("skips the actions wrapper for conditional children that render nothing", () => {
    const html = renderToString(
      <StatePanel kind="unavailable" title="T" description="D">
        {false}
      </StatePanel>,
    );
    expect(html).not.toContain("state-panel-actions");
  });

  it("renders the sample layout as an inert decorative preview", () => {
    const html = renderToString(
      <StatePanel
        kind="empty"
        heading="h3"
        icon={Glyph}
        title="No files yet"
        description="Upload one."
        sample={<ul data-sample-list />}
        className="extra"
        id="files-empty"
      >
        <button type="button">Upload</button>
      </StatePanel>,
    );
    expect(html).toMatch(/^<section data-slot="state-panel"/);
    expect(html).toContain('data-layout="sample"');
    expect(html).toContain('id="files-empty"');
    expect(html).toContain('class="sprout-state-panel extra"');
    expect(html).toContain('<h3 class="sprout-state-panel-title">');
    expect(html).toMatch(
      /data-slot="state-panel-sample" class="sprout-state-panel-sample" aria-hidden="true" inert=""/,
    );
    expect(html).toContain("data-sample-list");
    expect(html).toContain("Upload</button>");
  });

  it("falls back to the centered layout without a sample", () => {
    const html = renderToString(
      <StatePanel kind="empty" title="T" description="D" sample={undefined} />,
    );
    expect(html).toContain('data-layout="centered"');
  });
});
