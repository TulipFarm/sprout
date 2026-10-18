import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { PageContent } from "../packages/sprout/src/components/page-content.js";
import * as sprout from "../packages/sprout/src/index.js";
import { PageHeader } from "../packages/sprout/src/components/page-header.js";

const root = new URL("../packages/sprout/", import.meta.url);

describe("PageContent", () => {
  it("renders a slotted div around its children", () => {
    const html = renderToString(
      <PageContent>
        <PageHeader title="Usage" />
        <p>Credits, and where they go.</p>
      </PageContent>,
    );
    expect(html).toMatch(
      /^<div data-slot="page-content" class="sprout-page-content"><header data-slot="page-header"/,
    );
    expect(html).toContain("<p>Credits, and where they go.</p></div>");
  });

  it("passes div props and merges className", () => {
    const html = renderToString(
      <PageContent
        id="files"
        role="presentation"
        aria-busy="true"
        data-scroll-restoration-id="files-library"
        className="pb-20"
      >
        Files
      </PageContent>,
    );
    expect(html).toContain('id="files"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-scroll-restoration-id="files-library"');
    expect(html).toContain('class="sprout-page-content pb-20"');
  });

  it("accepts a ref prop and renders nothing extra without children", () => {
    const ref = createRef<HTMLDivElement>();
    expect(renderToString(<PageContent ref={ref} />)).toBe(
      '<div data-slot="page-content" class="sprout-page-content"></div>',
    );
  });

  it("is exported from the root and its own subpath with CSS", () => {
    expect(sprout.PageContent).toBe(PageContent);
    const manifest = JSON.parse(
      readFileSync(new URL("package.json", root), "utf8"),
    );
    expect(manifest.exports["./page-content"]).toEqual({
      types: "./dist/components/page-content.d.ts",
      import: "./dist/components/page-content.js",
    });
    expect(
      readFileSync(new URL("src/styles/index.css", root), "utf8"),
    ).toContain('@import "./page-content.css";');
    const css = readFileSync(
      new URL("src/styles/page-content.css", root),
      "utf8",
    );
    expect(css).toContain("--sprout-page-content-inline: 1rem");
    expect(css).toContain("--sprout-page-content-inline: 1.5rem");
    expect(css).toContain("--sprout-page-content-block: 1.25rem");
    expect(css).toContain(":where(.sprout-page-content > :not(:last-child))");
  });
});
