import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import {
  RichTextEditor,
  richTextEditorSizeNames,
  type RichTextValue,
} from "../packages/sprout/src/components/rich-text-editor.js";
import {
  InputGroup,
  InputGroupAddon,
} from "../packages/sprout/src/components/input-group.js";
import * as sprout from "../packages/sprout/src/index.js";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("../packages/sprout/src/styles/rich-text-editor.css");
const empty: RichTextValue = { type: "doc", content: [{ type: "paragraph" }] };
const noop = () => {};

describe("RichTextEditor", () => {
  it("is exported from the package root, its subpath, the CSS entry, and the docs", () => {
    expect(sprout).toHaveProperty("RichTextEditor");
    expect(sprout).toHaveProperty("richTextEditorSizeNames");
    const pkg = JSON.parse(read("../packages/sprout/package.json"));
    expect(pkg.exports["./rich-text-editor"]).toEqual({
      types: "./dist/components/rich-text-editor.d.ts",
      import: "./dist/components/rich-text-editor.js",
    });
    for (const dep of [
      "@tiptap/core",
      "@tiptap/extension-placeholder",
      "@tiptap/pm",
      "@tiptap/react",
      "@tiptap/starter-kit",
    ]) {
      expect(pkg.dependencies).toHaveProperty(dep);
    }
    expect(read("../packages/sprout/src/styles/index.css")).toContain(
      '@import "./rich-text-editor.css";',
    );
    expect(read("../apps/docs/src/data/nav.ts")).toContain(
      '"Rich Text Editor"',
    );
  });

  it("names both Cloud sizes", () => {
    expect(richTextEditorSizeNames).toEqual(["default", "compact"]);
  });

  it("renders the default size with a stacked toolbar", () => {
    const html = renderToString(
      <RichTextEditor
        value={empty}
        onChange={noop}
        onSend={noop}
        toolbarAddon={<button type="button">Send</button>}
      />,
    );
    expect(html).toContain('data-slot="rich-text-editor"');
    expect(html).toContain('data-size="default"');
    expect(html).toContain("sprout-rich-text-editor-size-default");
    expect(html).toContain('data-slot="rich-text-editor-toolbar"');
    expect(html).not.toContain("sprout-rich-text-editor-toolbar-inline");
    expect(html).not.toContain("data-condensed");
    expect(html).not.toContain("data-disabled");
  });

  it("puts the toolbar inline for compact and condensed editors", () => {
    const compact = renderToString(
      <RichTextEditor
        size="compact"
        value={empty}
        onChange={noop}
        onSend={noop}
        toolbarAddon={<button type="button">Send</button>}
      />,
    );
    expect(compact).toContain('data-size="compact"');
    expect(compact).toContain("sprout-rich-text-editor-toolbar-inline");

    const condensed = renderToString(
      <RichTextEditor
        condensed
        value={empty}
        onChange={noop}
        onSend={noop}
        toolbarAddon={<button type="button">Send</button>}
      />,
    );
    expect(condensed).toContain('data-size="default"');
    expect(condensed).toContain('data-condensed="true"');
    expect(condensed).toContain("sprout-rich-text-editor-condensed");
    expect(condensed).toContain("sprout-rich-text-editor-toolbar-inline");
  });

  it("omits the toolbar without an addon and marks disabled editors", () => {
    const html = renderToString(
      <RichTextEditor
        size="compact"
        disabled
        className="extra"
        value={empty}
        onChange={noop}
        onSend={noop}
      />,
    );
    expect(html).not.toContain("rich-text-editor-toolbar");
    expect(html).toContain('data-disabled="true"');
    expect(html).toContain("extra");
  });

  it("composes inside the chat composer group", () => {
    const html = renderToString(
      <InputGroup variant="question-composer">
        <InputGroupAddon align="block-start">Q3 report.pdf</InputGroupAddon>
        <RichTextEditor
          condensed
          placeholder="Send a separate message…"
          value={empty}
          onChange={noop}
          onSend={noop}
        />
      </InputGroup>,
    );
    expect(html).toContain('data-variant="question-composer"');
    expect(html).toContain('data-slot="rich-text-editor"');
  });

  it("styles every size, the toolbar, and content, with motion and contrast fallbacks", () => {
    for (const selector of [
      ".sprout-rich-text-editor-content",
      ".sprout-rich-text-editor-size-compact",
      ".sprout-rich-text-editor-condensed",
      ".sprout-rich-text-editor-toolbar-inline",
      ".is-editor-empty",
      "pre",
      "blockquote",
    ]) {
      expect(css).toContain(selector);
    }
    expect(css).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toContain(".sprout-input-group");
  });
});
