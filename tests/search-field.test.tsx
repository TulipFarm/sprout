import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { SearchField } from "../packages/sprout/src/components/search-field.js";
import * as sprout from "../packages/sprout/src/index.js";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("../packages/sprout/src/styles/search-field.css");
const noop = () => {};

describe("SearchField", () => {
  it("is exported from the package root and its subpath", () => {
    expect(sprout).toHaveProperty("SearchField", SearchField);
    const pkg = JSON.parse(read("../packages/sprout/package.json"));
    expect(pkg.exports["./search-field"]).toEqual({
      types: "./dist/components/search-field.d.ts",
      import: "./dist/components/search-field.js",
    });
    expect(read("../packages/sprout/src/styles/index.css")).toContain(
      '@import "./search-field.css";',
    );
    expect(read("../apps/docs/src/data/nav.ts")).toContain('"Search Field"');
  });

  it("renders a labelled search input that uses the label as placeholder", () => {
    const html = renderToString(
      <SearchField label="Search models" value="" onChange={noop} />,
    );
    expect(html).toContain('data-slot="search-field"');
    expect(html).toContain(
      "sprout-input-group sprout-input-group-size-default",
    );
    expect(html).toContain('data-slot="input-group-control"');
    expect(html).toContain('type="search"');
    expect(html).toContain('aria-label="Search models"');
    expect(html).toContain('placeholder="Search models"');
    expect(html).toContain('autoComplete="off"');
    expect(html).not.toContain("maxLength");
    expect(html).not.toContain("Clear search");
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it("passes id, placeholder, maxLength, and value", () => {
    const html = renderToString(
      <SearchField
        id="agent-search"
        label="Find agents"
        placeholder="Search agents"
        maxLength={120}
        value="Renewal"
        onChange={noop}
      />,
    );
    expect(html).toContain('id="agent-search"');
    expect(html).toContain('aria-label="Find agents"');
    expect(html).toContain('placeholder="Search agents"');
    expect(html).toContain('maxLength="120"');
    expect(html).toContain('value="Renewal"');
  });

  it("shows a ghost icon clear button only when there is text", () => {
    const html = renderToString(
      <SearchField label="Search chats" value="Q3" onChange={noop} />,
    );
    expect(html).toContain('aria-label="Clear search"');
    expect(html).toContain('data-slot="search-field-clear"');
    expect(html).toContain('type="button"');
    expect(html).toContain("sprout-button-variant-ghost");
    expect(html).toContain("sprout-input-group-button-size-icon-xs");
    expect(html).toContain('data-align="inline-end"');
  });

  it("merges wrapper classes so layouts can size it", () => {
    const html = renderToString(
      <SearchField
        label="Search tables"
        value=""
        onChange={noop}
        className="max-w-none"
      />,
    );
    expect(html).toContain("sprout-search-field max-w-none");
  });

  it("adds only a width cap and a reduced-motion clear animation to InputGroup", () => {
    expect(css).toContain("@layer components");
    expect(css).toContain("max-width: 24rem");
    expect(css).toMatch(
      /prefers-reduced-motion: no-preference\)[\s\S]*animation/,
    );
  });
});
