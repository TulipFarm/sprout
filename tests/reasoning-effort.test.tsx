import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { ReasoningEffort } from "../packages/sprout/src/components/reasoning-effort.js";
import * as sprout from "../packages/sprout/src/index.js";

const css = readFileSync(
  new URL(
    "../packages/sprout/src/styles/reasoning-effort.css",
    import.meta.url,
  ),
  "utf8",
);

const noop = () => {};

function count(html: string, text: string) {
  return html.split(text).length - 1;
}

function ticks(html: string) {
  return [...html.matchAll(/data-slot="reasoning-effort-tick"[^>]*>/g)].map(
    ([tag]) => tag,
  );
}

describe("ReasoningEffort", () => {
  it("is exported from the package root, its subpath, and the CSS entry", () => {
    expect(sprout).toHaveProperty("ReasoningEffort");
    const pkg = JSON.parse(
      readFileSync(
        new URL("../packages/sprout/package.json", import.meta.url),
        "utf8",
      ),
    );
    expect(pkg.exports["./reasoning-effort"]).toEqual({
      types: "./dist/components/reasoning-effort.d.ts",
      import: "./dist/components/reasoning-effort.js",
    });
    const entry = readFileSync(
      new URL("../packages/sprout/src/styles/index.css", import.meta.url),
      "utf8",
    );
    expect(entry).toContain('@import "./reasoning-effort.css";');
  });

  it("renders Cloud's playground: four levels, default name, no label", () => {
    const levels = ["Quick", "Balanced", "Thorough", "Maximum"];
    const html = renderToString(
      <ReasoningEffort levels={levels} value={1} onValueChange={noop} />,
    );
    expect(html).toContain('data-slot="reasoning-effort"');
    expect(html).toContain('class="sprout-reasoning-effort"');
    expect(html).toContain('data-dragging="false"');
    expect(html).toContain('role="slider"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-label="Reasoning effort"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="3"');
    expect(html).toContain('aria-valuenow="1"');
    expect(html).toContain('aria-valuetext="Balanced"');
    expect(count(html, 'data-slot="reasoning-effort-tick"')).toBe(4);
    expect(html).toContain('data-slot="reasoning-effort-fill"');
    expect(html).toContain('data-slot="reasoning-effort-thumb"');
    expect(html).not.toContain("sprout-reasoning-effort-bubble-label");
    expect(html).toContain(
      '<span class="sprout-reasoning-effort-bubble-level">Balanced</span>',
    );
    // The bubble is decorative; the slider's value text names the level.
    expect(html).toMatch(
      /data-slot="reasoning-effort-bubble" aria-hidden="true"/,
    );
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it("renders Cloud's composer: model label before the level in the bubble", () => {
    const html = renderToString(
      <ReasoningEffort
        label="Claude Opus"
        levels={["Low", "Medium", "High", "Max"]}
        value={2}
        onValueChange={noop}
      />,
    );
    expect(html).toContain(
      '<span class="sprout-reasoning-effort-bubble-label">Claude Opus</span><span class="sprout-reasoning-effort-bubble-level">High</span>',
    );
    expect(html).toContain('aria-valuetext="High"');
    expect(html).toContain('aria-valuemax="3"');
  });

  it("spreads ticks evenly and grows them toward higher effort", () => {
    const html = renderToString(
      <ReasoningEffort
        levels={["Low", "Medium", "High"]}
        value={0}
        onValueChange={noop}
      />,
    );
    const tags = ticks(html);
    expect(tags).toHaveLength(3);
    expect(tags[0]).toContain("left:16px");
    expect(tags[1]).toContain("left:128px");
    expect(tags[2]).toContain("left:240px");
    expect(tags[0]).toContain("height:4.8px");
    expect(tags[2]).toContain("height:9.6px");
    // The resting thumb covers the first tick.
    expect(tags[0]).toContain('data-on-thumb="true"');
    expect(tags[1]).toContain('data-on-thumb="false"');
  });

  it("marks the tick under the fill as active once the thumb moves past it", () => {
    const html = renderToString(
      <ReasoningEffort
        levels={["Low", "High"]}
        value={1}
        onValueChange={noop}
      />,
    );
    const tags = ticks(html);
    expect(tags[0]).toContain('data-active="false"');
    expect(tags[1]).toContain('data-on-thumb="true"');
    expect(html).toMatch(/data-slot="reasoning-effort-fill"[^>]*width:256px/);
  });

  it("handles one level and clamps an out-of-range value", () => {
    const one = renderToString(
      <ReasoningEffort levels={["High"]} value={0} onValueChange={noop} />,
    );
    expect(one).toContain('aria-valuemax="0"');
    expect(one).toContain('aria-valuetext="High"');
    expect(count(one, 'data-slot="reasoning-effort-tick"')).toBe(1);
    const clamped = renderToString(
      <ReasoningEffort
        levels={["Low", "High"]}
        value={7}
        onValueChange={noop}
      />,
    );
    expect(clamped).toContain('aria-valuenow="1"');
    expect(clamped).toContain('aria-valuetext="High"');
  });

  it("takes a custom name, aria-labelledby, and className", () => {
    const named = renderToString(
      <ReasoningEffort
        aria-label="Claude Opus reasoning effort"
        levels={["Low", "High"]}
        value={0}
        onValueChange={noop}
        className="mt-2"
      />,
    );
    expect(named).toContain('aria-label="Claude Opus reasoning effort"');
    expect(named).toContain('class="sprout-reasoning-effort mt-2"');
    const labelled = renderToString(
      <ReasoningEffort
        aria-labelledby="effort-heading"
        levels={["Low", "High"]}
        value={0}
        onValueChange={noop}
      />,
    );
    expect(labelled).toContain('aria-labelledby="effort-heading"');
    expect(labelled).not.toContain("aria-label=");
  });

  it("styles with namespaced tokens, reduced motion, and forced colors", () => {
    expect(css).toContain("var(--sprout-primary)");
    expect(css).toContain("var(--sprout-focus)");
    expect(css).toContain("--sprout-reasoning-effort-thumb");
    expect(css).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(css).toContain("var(--sprout-motion-normal, 180ms)");
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).not.toMatch(/--color-(muted|accent|border)\b/);
  });
});
