import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import * as sprout from "../packages/sprout/src/index.js";
import {
  CodeBlock,
  codeBlockLanguages,
  codeBlockVariantNames,
  codeLanguageName,
  isHighlightedLanguage,
  languageForFilename,
  preloadCodeLanguages,
} from "../packages/sprout/src/components/code-block.js";

const json = '{\n  "project": "Meadow",\n  "tasks": 3,\n  "ready": true\n}';

beforeAll(async () => {
  await preloadCodeLanguages(
    "json",
    "ts",
    "python",
    "sql",
    "javascript",
    "markdown",
    "rust",
  );
});

describe("CodeBlock", () => {
  it("is exported from the package root", () => {
    for (const name of [
      "CodeBlock",
      "codeBlockLanguages",
      "codeBlockVariantNames",
      "codeLanguageName",
      "isHighlightedLanguage",
      "languageForFilename",
      "preloadCodeLanguages",
    ]) {
      expect(sprout).toHaveProperty(name);
    }
    expect(codeBlockVariantNames).toEqual(["inline", "file", "preview"]);
  });

  it("colors every bundled language plus extensions and fence aliases", () => {
    expect(codeBlockLanguages.length).toBeGreaterThan(200);
    for (const language of [
      ...codeBlockLanguages,
      "js",
      "jsx",
      "ts",
      "tsx",
      "py",
      "rs",
      "sh",
      "yml",
      "kt",
      "cs",
      "md",
    ]) {
      expect(isHighlightedLanguage(language)).toBe(true);
    }
    for (const language of ["text", "txt", "plaintext", "", "not-a-language"]) {
      expect(isHighlightedLanguage(language)).toBe(false);
    }
    expect(codeLanguageName("ts")).toBe("TypeScript");
    expect(codeLanguageName("txt")).toBe("Plain text");
  });

  it("detects languages from extensions and whole file names", () => {
    expect(languageForFilename("src/main.py")).toBe("python");
    expect(languageForFilename("lib.RS")).toBe("rust");
    expect(languageForFilename("deploy/Dockerfile")).toBe("docker");
    expect(languageForFilename("Makefile")).toBe("make");
    expect(languageForFilename(".env.local")).toBe("dotenv");
    expect(languageForFilename("README.md")).toBe("markdown");
    expect(languageForFilename("notes.txt")).toBeNull();
    expect(languageForFilename("LICENSE")).toBeNull();
  });

  it("renders a highlighted inline file with line numbers by default", () => {
    const html = renderToString(
      <CodeBlock
        code={json}
        language="json"
        filename="fictional-garden.json"
      />,
    );
    expect(html).toContain('data-slot="code-block"');
    expect(html).toContain('data-variant="inline"');
    expect(html).toContain('data-language="json"');
    expect(html).toContain("data-highlighted");
    expect(html).toMatch(
      /sprout-code-block-label[^>]*>fictional-garden\.json</,
    );
    expect(html).toContain('aria-label="Copy fictional-garden.json"');
    expect(html).toMatch(
      /role="region"[^>]*aria-label="fictional-garden.json"|aria-label="fictional-garden.json"[^>]*role="region"/,
    );
    expect(html).toContain('tabindex="0"');
    expect(html).toMatch(
      /aria-hidden="true" class="sprout-code-block-gutter">1\n2\n3\n4\n5</,
    );
    expect(html).toContain(
      '<span class="sprout-syntax-keyword">&quot;project&quot;</span>',
    );
    expect(html).toContain('<span class="sprout-syntax-constant">3</span>');
    expect(html).toContain('<span class="sprout-syntax-constant">true</span>');
    expect(html).not.toContain("style=");
    expect(html).toContain(">Copy</button>");
    expect(html).not.toContain('role="alert"');
  });

  it("takes the language from the file name when none is given", () => {
    const html = renderToString(
      <CodeBlock
        code={'fn main() {\n    println!("hi");\n}'}
        filename="src/main.rs"
      />,
    );
    expect(html).toContain('data-language="rust"');
    expect(html).toContain('<span class="sprout-syntax-keyword">fn</span>');
    expect(html).toContain(
      '<span class="sprout-syntax-string-expression">&quot;hi&quot;</span>',
    );
  });

  it("renders text files and unknown languages as plain text", () => {
    for (const props of [{ filename: "notes.txt" }, { language: "txt" }, {}]) {
      const html = renderToString(
        <CodeBlock
          code={"Plant bulbs\nWater gently"}
          lineNumbers={false}
          {...props}
        />,
      );
      expect(html).toContain('data-language="text"');
      expect(html).not.toContain("data-highlighted");
      expect(html).not.toContain("sprout-code-block-gutter");
      expect(html).toContain("<code>Plant bulbs\nWater gently</code>");
    }
    const unnamed = renderToString(<CodeBlock code="x" />);
    expect(unnamed).toMatch(/sprout-code-block-label[^>]*>Plain text</);
    expect(unnamed).toContain('aria-label="Copy code"');
    expect(unnamed).toContain('aria-label="Plain text code"');
  });

  it("names the language for fenced Markdown code", () => {
    const html = renderToString(
      <CodeBlock code="const a = 1;" language="ts" />,
    );
    expect(html).toMatch(/sprout-code-block-label[^>]*>TypeScript</);
    expect(html).toContain('aria-label="TypeScript code"');
    expect(html).toContain('<span class="sprout-syntax-keyword">const</span>');
  });

  it("highlights Python, SQL, and JavaScript", () => {
    const python = renderToString(
      <CodeBlock
        code={'def run(lead):\n    return {"score": 40}'}
        filename="score_lead.py"
      />,
    );
    expect(python).toContain('<span class="sprout-syntax-keyword">def</span>');
    expect(python).toContain('<span class="sprout-syntax-function">run</span>');
    const query = renderToString(
      <CodeBlock code="SELECT count(*) FROM accounts;" language="sql" />,
    );
    expect(query).toContain(
      '<span class="sprout-syntax-keyword">SELECT</span>',
    );
    const script = renderToString(
      <CodeBlock code="return { total: input.amount };" language="js" />,
    );
    expect(script).toContain(
      '<span class="sprout-syntax-keyword">return</span>',
    );
  });

  it("highlights Markdown and the code fenced inside it", () => {
    const html = renderToString(
      <CodeBlock
        code={
          "# Garden\n\n- Sow **bold** peas\n> Quote\n\n```python\nimport os\n```"
        }
        filename="README.md"
      />,
    );
    expect(html).toContain('data-language="markdown"');
    expect(html).toContain(
      '<span class="sprout-syntax-heading sprout-syntax-bold"># Garden</span>',
    );
    expect(html).toContain('<span class="sprout-syntax-constant">-</span>');
    expect(html).toContain(
      '<span class="sprout-syntax-punctuation sprout-syntax-bold">**</span><span class="sprout-syntax-bold">bold</span>',
    );
    expect(html).toContain(
      '<span class="sprout-syntax-comment sprout-syntax-italic"> Quote</span>',
    );
    expect(html).toContain(
      '<span class="sprout-syntax-string">```</span><span class="sprout-syntax-keyword">python</span>',
    );
    expect(html).toContain('<span class="sprout-syntax-keyword">import</span>');
  });

  it("colors diff additions, removals, and ranges", async () => {
    await preloadCodeLanguages("diff");
    const html = renderToString(
      <CodeBlock code={"@@ -1 +1 @@\n-old\n+new"} language="diff" />,
    );
    expect(html).toContain(
      '<span class="sprout-syntax-keyword">@@ -1 +1 @@</span>',
    );
    expect(html).toContain('<span class="sprout-syntax-deleted">-old</span>');
    expect(html).toContain('<span class="sprout-syntax-inserted">+new</span>');
  });

  it("renders plain text until the grammar loads", async () => {
    const go = <CodeBlock code="x := 1" filename="main.go" />;
    expect(renderToString(go)).not.toContain("data-highlighted");
    await preloadCodeLanguages("go");
    expect(renderToString(go)).toContain("data-highlighted");
  });

  it("escapes markup in plain and highlighted code", () => {
    const source = '<img src=x onerror="alert(1)">';
    for (const language of ["text", "javascript"]) {
      const html = renderToString(
        <CodeBlock code={source} language={language} />,
      );
      expect(html).not.toContain("<img");
      expect(html).toContain("&lt;");
    }
  });

  it("fills its parent as a file with an empty-file gutter of one line", () => {
    const html = renderToString(
      <CodeBlock
        code=""
        language="text"
        filename="notes/scratch.md"
        variant="file"
      />,
    );
    expect(html).toContain('data-variant="file"');
    expect(html).toContain('aria-label="Copy notes/scratch.md"');
    expect(html).toMatch(/sprout-code-block-gutter">1</);
    expect(html).toContain("<code></code>");
  });

  it("drops the header, copy button, and focus stop as a preview", () => {
    const html = renderToString(
      <CodeBlock code="const a = 1;" language="ts" variant="preview" />,
    );
    expect(html).toContain('data-variant="preview"');
    expect(html).not.toContain("sprout-code-block-header");
    expect(html).not.toContain("tabindex");
    expect(html).not.toContain('role="region"');
  });

  it("forwards className and DOM props", () => {
    const html = renderToString(
      <CodeBlock
        code="x"
        className="mt-4"
        id="curl"
        data-testid="curl"
        filename="curl example"
      />,
    );
    expect(html).toContain('class="sprout-code-block mt-4"');
    expect(html).toContain('id="curl"');
    expect(html).toContain('data-testid="curl"');
  });
});
