import { describe, expect, it } from "vitest";
import type { CSSProperties } from "react";
import { renderToString } from "react-dom/server";
import {
  Skeleton,
  SkeletonGroup,
  skeletonGroupGapNames,
  skeletonShapeNames,
} from "../packages/sprout/src/components/skeleton.js";
import * as sprout from "../packages/sprout/src/index.js";

describe("Skeleton", () => {
  it("is exported from the package root", () => {
    for (const name of [
      "Skeleton",
      "SkeletonGroup",
      "skeletonShapeNames",
      "skeletonGroupGapNames",
    ])
      expect(sprout).toHaveProperty(name);
    expect(skeletonShapeNames).toEqual([
      "line",
      "title",
      "avatar",
      "panel",
      "checkbox",
      "action",
    ]);
    expect(skeletonGroupGapNames).toEqual(["sm", "md", "lg"]);
  });

  it("renders a hidden line placeholder by default", () => {
    expect(renderToString(<Skeleton />)).toBe(
      '<div aria-hidden="true" data-slot="skeleton" data-shape="line" class="sprout-skeleton"></div>',
    );
  });

  it("supports every shape Cloud uses", () => {
    for (const shape of skeletonShapeNames)
      expect(renderToString(<Skeleton shape={shape} />)).toContain(
        `data-shape="${shape}"`,
      );
  });

  it("passes className, style, data, and aria attributes through", () => {
    const html = renderToString(
      <Skeleton
        className="size-4 rounded-md"
        data-sidebar="menu-skeleton-text"
        style={{ "--skeleton-width": "72%" } as CSSProperties}
        aria-hidden="true"
        id="row"
      />,
    );
    expect(html).toContain('class="sprout-skeleton size-4 rounded-md"');
    expect(html).toContain('data-sidebar="menu-skeleton-text"');
    expect(html).toContain('style="--skeleton-width:72%"');
    expect(html).toContain('id="row"');
    expect(html.match(/aria-hidden/g)).toHaveLength(1);
  });
});

describe("SkeletonGroup", () => {
  it("is a labelled status region with hidden loading text", () => {
    const html = renderToString(
      <SkeletonGroup label="Loading projects" gap="lg">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </SkeletonGroup>,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading projects"');
    expect(html).toContain('data-slot="skeleton-group"');
    expect(html).toContain('data-gap="lg"');
    expect(html).toContain(
      '<span class="sprout-skeleton-group-label">Loading projects…</span>',
    );
    expect(html.match(/data-slot="skeleton"/g)).toHaveLength(3);
  });

  it("defaults to the medium gap and no label", () => {
    const html = renderToString(
      <SkeletonGroup>
        <p>Loading GitHub accounts…</p>
        <Skeleton />
      </SkeletonGroup>,
    );
    expect(html).toContain('data-gap="md"');
    expect(html).not.toContain("aria-label");
    expect(html).not.toContain("sprout-skeleton-group-label");
    expect(html).toContain("<p>Loading GitHub accounts…</p>");
  });

  it("supports every gap, custom classes, and a section element", () => {
    for (const gap of skeletonGroupGapNames)
      expect(renderToString(<SkeletonGroup gap={gap} />)).toContain(
        `data-gap="${gap}"`,
      );
    const html = renderToString(
      <SkeletonGroup
        label="Loading agents"
        className="py-4"
        render={<section />}
      >
        <Skeleton shape="panel" />
      </SkeletonGroup>,
    );
    expect(html.startsWith("<section")).toBe(true);
    expect(html).toContain('class="sprout-skeleton-group py-4"');
    expect(html).toContain('data-shape="panel"');
  });
});
