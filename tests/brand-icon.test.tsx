import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  BrandIcon,
  BrandStack,
  BrandTile,
  brandIconSizeNames,
  brandNames,
  brandTileSizeNames,
  type Brand,
} from "../packages/sprout/src/components/brand-icon.js";
import { Button } from "../packages/sprout/src/components/button.js";
import { brandGlyphs } from "../packages/sprout/src/internal/brand-glyphs.js";

const cloudBrands = [
  "claude",
  "openai",
  "deepseek",
  "grok",
  "kimi",
  "gemini",
  "mistral",
  "meta",
  "qwen",
  "google",
  "gmail",
  "google-calendar",
  "google-drive",
  "google-sheets",
  "google-docs",
  "google-slides",
  "google-forms",
  "slack",
  "github",
  "jira",
  "confluence",
  "trello",
  "notion",
  "hubspot",
  "figma",
  "microsoft",
  "linear",
  "stripe",
  "airtable",
  "asana",
  "clickup",
  "discord",
  "shopify",
  "zendesk",
  "dropbox",
  "gitlab",
  "calendly",
];

describe("Brand catalog", () => {
  it("names every Cloud brand and ships a glyph for each", () => {
    expect(Object.keys(brandNames)).toEqual(cloudBrands);
    expect(Object.keys(brandGlyphs)).toEqual(cloudBrands);
    expect(brandNames.google).toBe("Google Workspace");
    expect(brandNames["google-calendar"]).toBe("Google Calendar");
    expect(brandNames.github).toBe("GitHub");
    for (const brand of cloudBrands as Brand[]) {
      const html = renderToString(<BrandIcon brand={brand} />);
      expect(html).toContain(`data-brand="${brand}"`);
      expect(html).toMatch(/<path d="[Mm]/);
    }
  });

  it("lists every size", () => {
    expect(brandIconSizeNames).toEqual([
      "inline",
      "glyph",
      "fill",
      "sm",
      "md",
      "lg",
      "xl",
    ]);
    expect(brandTileSizeNames).toEqual(["sm", "md", "lg", "xl", "action"]);
  });

  it("lets near-black marks follow the text color and keeps brand colors", () => {
    for (const brand of [
      "github",
      "notion",
      "openai",
      "grok",
      "kimi",
      "confluence",
      "zendesk",
    ] as Brand[]) {
      const html = renderToString(<BrandIcon brand={brand} size="inline" />);
      expect(html).toContain('fill="currentColor"');
      expect(html).not.toMatch(/fill="#/);
    }
    expect(renderToString(<BrandIcon brand="jira" />)).toContain(
      'fill="#0052CC"',
    );
    expect(
      renderToString(<BrandIcon brand="slack" />).match(/fill="#/g),
    ).toHaveLength(4);
    expect(renderToString(<BrandIcon brand="github" />)).toContain(
      'fill-rule="evenodd"',
    );
  });
});

describe("BrandIcon", () => {
  it("draws bare glyphs for inline, glyph, and fill", () => {
    for (const size of ["inline", "glyph", "fill"] as const) {
      const html = renderToString(<BrandIcon brand="slack" size={size} />);
      expect(html).toMatch(
        new RegExp(
          `^<span data-slot="brand-icon" data-brand="slack" data-size="${size}" class="sprout-brand-icon">`,
        ),
      );
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toContain("sprout-brand-tile");
    }
  });

  it("frames tile sizes and defaults to md", () => {
    expect(renderToString(<BrandIcon brand="notion" />)).toMatch(
      /data-slot="brand-tile"[^>]*data-size="md"|data-size="md"[^>]*data-slot="brand-tile"/,
    );
    for (const size of ["sm", "md", "lg", "xl"] as const) {
      const html = renderToString(
        <BrandIcon brand="github" size={size} className="extra" />,
      );
      expect(html).toContain(`data-size="${size}"`);
      expect(html).toContain('data-brand="github"');
      expect(html).toContain('class="sprout-brand-tile extra"');
    }
  });
});

describe("BrandTile", () => {
  it("renders a span tile with any child", () => {
    const html = renderToString(
      <BrandTile>
        <svg data-testid="custom" />
      </BrandTile>,
    );
    expect(html).toMatch(/^<span /);
    expect(html).toContain('data-slot="brand-tile"');
    expect(html).toContain('data-size="md"');
    expect(html).toContain('data-testid="custom"');
  });

  it("becomes a Sprout ghost icon button through render", () => {
    const html = renderToString(
      <BrandTile
        size="action"
        render={<Button variant="ghost" size="icon" disabled />}
        aria-label="Gmail actions"
      >
        <BrandIcon brand="gmail" size="fill" />
      </BrandTile>,
    );
    expect(html).toMatch(/^<button /);
    expect(html).toContain('data-size="action"');
    expect(html).toContain('data-slot="brand-tile"');
    expect(html).toContain("sprout-brand-tile");
    expect(html).toContain("sprout-button-variant-ghost");
    expect(html).toContain('aria-label="Gmail actions"');
    expect(html).toContain("disabled");
    expect(html).toContain('data-size="fill"');
  });
});

describe("BrandStack", () => {
  const items = [
    { brand: "google", name: "Google Workspace" },
    { brand: "jira", name: "Atlassian" },
  ] as const;

  it("renders nothing for an empty list", () => {
    expect(renderToString(<BrandStack brands={[]} />)).toBe("");
  });

  it("is one image named by its items or a label", () => {
    const html = renderToString(<BrandStack brands={items} />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Google Workspace, Atlassian"');
    expect(html.match(/data-brand="(google|jira)"/g)).toEqual([
      'data-brand="google"',
      'data-brand="jira"',
    ]);
    expect(html.match(/data-size="sm"/g)).toHaveLength(2);
    expect(
      renderToString(
        <BrandStack brands={items} label="Example integrations" />,
      ),
    ).toContain('aria-label="Example integrations"');
  });

  it("keeps class names and attributes", () => {
    const html = renderToString(
      <BrandStack brands={items} className="extra" data-testid="tools" />,
    );
    expect(html).toContain('class="sprout-brand-stack extra"');
    expect(html).toContain('data-testid="tools"');
  });
});
