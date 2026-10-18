import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { Slider } from "../packages/sprout/src/components/slider.js";
import * as sprout from "../packages/sprout/src/index.js";

const css = readFileSync(
  new URL("../packages/sprout/src/styles/slider.css", import.meta.url),
  "utf8",
);

function count(html: string, text: string) {
  return html.split(text).length - 1;
}

describe("Slider", () => {
  it("is exported from the package root, its subpath, and the CSS entry", () => {
    expect(sprout).toHaveProperty("Slider");
    const pkg = JSON.parse(
      readFileSync(
        new URL("../packages/sprout/package.json", import.meta.url),
        "utf8",
      ),
    );
    expect(pkg.exports["./slider"]).toEqual({
      types: "./dist/components/slider.d.ts",
      import: "./dist/components/slider.js",
    });
    const entry = readFileSync(
      new URL("../packages/sprout/src/styles/index.css", import.meta.url),
      "utf8",
    );
    expect(entry).toContain('@import "./slider.css";');
  });

  it("renders one named thumb for a number value with Cloud's 0–100 default", () => {
    const html = renderToString(<Slider aria-label="Volume" value={40} />);
    expect(html).toContain('data-slot="slider"');
    expect(html).toContain('class="sprout-slider"');
    expect(html).toContain('role="group"');
    expect(html).toContain('data-slot="slider-control"');
    expect(html).toContain('data-slot="slider-track"');
    expect(html).toContain('data-slot="slider-range"');
    expect(count(html, 'data-slot="slider-thumb"')).toBe(1);
    expect(html).toContain('type="range"');
    expect(html).toContain('aria-label="Volume"');
    expect(html).toContain('min="0"');
    expect(html).toContain('max="100"');
    expect(html).toContain('value="40"');
    expect(html).toContain('data-orientation="horizontal"');
  });

  it("renders a thumb per range entry, named minimum and maximum", () => {
    const html = renderToString(<Slider aria-label="Range" value={[20, 75]} />);
    expect(count(html, 'data-slot="slider-thumb"')).toBe(2);
    expect(html).toContain('aria-label="Range minimum"');
    expect(html).toContain('aria-label="Range maximum"');
    expect(html).toContain('value="20"');
    expect(html).toContain('value="75"');
  });

  it("numbers thumbs past two and honors getAriaLabel and aria-labelledby", () => {
    const three = renderToString(
      <Slider aria-label="Stops" defaultValue={[10, 50, 90]} />,
    );
    expect(count(three, 'data-slot="slider-thumb"')).toBe(3);
    expect(three).toContain('aria-label="Stops 3"');
    const custom = renderToString(
      <Slider
        aria-label="Budget"
        defaultValue={[5, 15]}
        getAriaLabel={(index) => (index ? "Most credits" : "Fewest credits")}
        getAriaValueText={(formatted) => `${formatted} credits`}
      />,
    );
    expect(custom).toContain('aria-label="Fewest credits"');
    expect(custom).toContain('aria-valuetext="5 credits"');
    const labelled = renderToString(
      <Slider aria-labelledby="volume-label" defaultValue={30} />,
    );
    expect(labelled).toContain('aria-labelledby="volume-label"');
    expect(labelled).not.toContain("aria-label=");
  });

  it("renders a disabled scalar defaultValue and a vertical slider", () => {
    const disabled = renderToString(
      <Slider aria-label="Disabled" disabled defaultValue={65} />,
    );
    expect(count(disabled, 'data-slot="slider-thumb"')).toBe(1);
    expect(disabled).toContain("data-disabled");
    expect(disabled).toContain("disabled");
    expect(disabled).toContain('value="65"');
    const vertical = renderToString(
      <Slider aria-label="Vertical volume" orientation="vertical" value={60} />,
    );
    expect(vertical).toContain('data-orientation="vertical"');
    expect(vertical).toContain('aria-orientation="vertical"');
  });

  it("passes min, max, step, name, and className through", () => {
    const html = renderToString(
      <Slider
        aria-label="Temperature"
        min={-10}
        max={10}
        step={2}
        name="temperature"
        defaultValue={4}
        className={(state) => (state.disabled ? "off" : "extra")}
      />,
    );
    expect(html).toContain('class="sprout-slider extra"');
    expect(html).toContain('min="-10"');
    expect(html).toContain('max="10"');
    expect(html).toContain('step="2"');
    expect(html).toContain('name="temperature"');
  });

  it("styles with namespaced tokens, reduced motion, and forced colors", () => {
    expect(css).toContain("var(--sprout-input)");
    expect(css).toContain("var(--sprout-primary)");
    expect(css).toContain("var(--sprout-focus)");
    expect(css).toContain("--sprout-slider-thumb");
    expect(css).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toContain("min-height: 160px");
    expect(css).not.toMatch(/--(?!sprout-)[a-z]+-[a-z-]*:/);
  });
});
