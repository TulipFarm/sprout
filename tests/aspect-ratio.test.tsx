import { describe, expect, it } from "vitest";
import type { CSSProperties } from "react";
import { renderToString } from "react-dom/server";
import { AspectRatio } from "../packages/sprout/src/components/aspect-ratio.js";
import * as sprout from "../packages/sprout/src/index.js";

describe("AspectRatio", () => {
  it("is exported from the package root", () => {
    expect(sprout).toHaveProperty("AspectRatio", AspectRatio);
  });

  it("renders a div that sets the ratio token", () => {
    const html = renderToString(<AspectRatio ratio={16 / 9} />);
    expect(html).toMatch(/^<div[^>]*data-slot="aspect-ratio"/);
    expect(html).toContain('class="sprout-aspect-ratio"');
    expect(html).toContain(`--sprout-aspect-ratio:${16 / 9}`);
    expect(html).not.toContain("role=");
  });

  it("renders every ratio Cloud uses", () => {
    for (const ratio of [16 / 9, 4 / 3, 1]) {
      const html = renderToString(<AspectRatio ratio={ratio} />);
      expect(html).toContain(`--sprout-aspect-ratio:${ratio}`);
    }
  });

  it("renders image children that fill the frame", () => {
    const html = renderToString(
      <AspectRatio ratio={4 / 3}>
        <img
          src="/landscape.svg"
          alt="Fictional green landscape"
          className="size-full object-cover"
        />
      </AspectRatio>,
    );
    expect(html).toContain(
      '<img src="/landscape.svg" alt="Fictional green landscape" class="size-full object-cover"/>',
    );
  });

  it("merges class names and style, and passes div props through", () => {
    const html = renderToString(
      <AspectRatio
        ratio={1}
        className="rounded-xl"
        style={{ maxWidth: 288 }}
        id="cover"
        aria-busy="true"
        data-x="1"
      />,
    );
    expect(html).toContain('class="sprout-aspect-ratio rounded-xl"');
    expect(html).toContain("max-width:288px");
    expect(html).toContain("--sprout-aspect-ratio:1");
    expect(html).toContain('id="cover"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-x="1"');
  });

  it("keeps the ratio when style also sets the token", () => {
    const html = renderToString(
      <AspectRatio
        ratio={4 / 3}
        style={{ "--sprout-aspect-ratio": 2 } as CSSProperties}
      />,
    );
    expect(html).toContain(`--sprout-aspect-ratio:${4 / 3}`);
    expect(html).not.toContain("--sprout-aspect-ratio:2");
  });
});
