import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@tulipfarm/sprout/button";
import { CanvasSection } from "@tulipfarm/sprout/canvas";
import {
  CodeBlock,
  codeBlockVariantNames,
  type CodeBlockVariant,
} from "@tulipfarm/sprout/code-block";
import { Switch } from "@tulipfarm/sprout/switch";
import { ToggleGroup, ToggleGroupItem } from "@tulipfarm/sprout/toggle-group";
import DocsSelect from "./DocsSelect";
import "../styles/code-block-demo.css";

function Frame({
  title,
  note,
  controls,
  children,
  id,
}: {
  title: string;
  note?: string;
  controls?: ReactNode;
  children: ReactNode;
  id: string;
}) {
  return (
    <section className="code-demo-frame" aria-label={title} data-recipe={id}>
      <div className="code-demo-bar">
        <div className="code-demo-bar-text">
          <span className="code-demo-bar-title">{title}</span>
          {note && <span className="code-demo-note">{note}</span>}
        </div>
        {controls && <div className="code-demo-controls">{controls}</div>}
      </div>
      <div className="code-demo-body">{children}</div>
    </section>
  );
}

/* Playground ---------------------------------------------------------------- */

type Sample = {
  label: string;
  language: string;
  filename: string;
  code: string;
};

const samples = {
  json: {
    label: "JSON",
    language: "json",
    filename: "fictional-garden.json",
    code: '{\n  "project": "Meadow",\n  "tasks": 3,\n  "ready": true\n}',
  },
  typescript: {
    label: "TypeScript",
    language: "typescript",
    filename: "lead-score.ts",
    code: `type Lead = { company: string; seats: number; replied: boolean };

export function scoreLead(lead: Lead): number {
  // Replies count more than company size.
  const base = Math.min(lead.seats, 50);
  return lead.replied ? base + 40 : base;
}`,
  },
  javascript: {
    label: "JavaScript",
    language: "javascript",
    filename: "calculate.js",
    code: `const total = input.items.reduce((sum, item) => sum + item.amount, 0);
return { total, currency: input.currency ?? "USD" };`,
  },
  python: {
    label: "Python",
    language: "python",
    filename: "summarize.py",
    code: `def summarize(rows):
    """Count open tickets per owner."""
    counts = {}
    for row in rows:
        if row["status"] == "open":
            counts[row["owner"]] = counts.get(row["owner"], 0) + 1
    return {"owners": counts, "total": sum(counts.values())}`,
  },
  sql: {
    label: "SQL",
    language: "sql",
    filename: "weekly-signups.sql",
    code: `SELECT date_trunc('week', created_at) AS week,
       count(*) AS signups
FROM accounts
WHERE created_at >= now() - interval '8 weeks'
GROUP BY 1
ORDER BY 1 DESC;`,
  },
  rust: {
    label: "Rust",
    language: "rust",
    filename: "src/main.rs",
    code: `use std::collections::HashMap;

fn main() {
    let mut beds: HashMap<&str, u32> = HashMap::new();
    beds.insert("north", 12);
    for (name, weeks) in &beds {
        println!("{name} is ready in {weeks} weeks");
    }
}`,
  },
  go: {
    label: "Go",
    language: "go",
    filename: "server.go",
    code: `package main

import "net/http"

func main() {
	http.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Write([]byte("ok"))
	})
	http.ListenAndServe(":8080", nil)
}`,
  },
  markdown: {
    label: "Markdown",
    language: "markdown",
    filename: "README.md",
    code: `# Meadow

A **fictional** garden planner.

\`\`\`bash
pnpm install && pnpm dev
\`\`\`

- [Docs](https://example.com)
- Track sowing dates`,
  },
  yaml: {
    label: "YAML",
    language: "yaml",
    filename: ".github/workflows/ci.yml",
    code: `name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test`,
  },
  dockerfile: {
    label: "Dockerfile",
    language: "dockerfile",
    filename: "Dockerfile",
    code: `FROM node:22-alpine
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
CMD ["pnpm", "start"]`,
  },
  css: {
    label: "CSS",
    language: "css",
    filename: "garden.css",
    code: `.bed {
  display: grid;
  gap: 0.5rem;
  color: oklch(62% 0.14 145);
}`,
  },
  text: {
    label: "Plain text",
    language: "text",
    filename: "notes.txt",
    code: "Plant bulbs\nWater gently\nEnjoy the flowers",
  },
} satisfies Record<string, Sample>;

type SampleKey = keyof typeof samples;
type Clipboard = "works" | "blocked";

/** Swaps the browser clipboard for one that rejects, so the error state can be tried. */
function useBlockedClipboard(blocked: boolean) {
  useEffect(() => {
    if (!blocked) return;
    const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          Promise.reject(
            new DOMException("Blocked in this sample", "NotAllowedError"),
          ),
      },
    });
    return () => {
      if (original) Object.defineProperty(navigator, "clipboard", original);
      else delete (navigator as { clipboard?: unknown }).clipboard;
    };
  }, [blocked]);
}

export function CodeBlockPlayground() {
  const [variant, setVariant] = useState<CodeBlockVariant>("inline");
  const [sample, setSample] = useState<SampleKey>("typescript");
  const [lineNumbers, setLineNumbers] = useState(true);
  const [showFilename, setShowFilename] = useState(true);
  const [clipboard, setClipboard] = useState<Clipboard>("works");
  useBlockedClipboard(clipboard === "blocked");
  const current = samples[sample];
  return (
    <Frame
      id="playground"
      title="Code Block playground"
      note="Copy uses your clipboard. Choose Blocked to see the error."
      controls={
        <>
          <DocsSelect
            label="Variant"
            value={variant}
            items={codeBlockVariantNames.map((value) => ({
              value,
              label:
                value === "inline"
                  ? "Inline"
                  : value === "file"
                    ? "File"
                    : "Preview",
            }))}
            onValueChange={setVariant}
          />
          <DocsSelect
            label="Language"
            value={sample}
            items={(Object.keys(samples) as SampleKey[]).map((value) => ({
              value,
              label: samples[value].label,
            }))}
            onValueChange={setSample}
          />
          <DocsSelect
            label="Clipboard"
            value={clipboard}
            items={[
              { value: "works", label: "Clipboard works" },
              { value: "blocked", label: "Clipboard blocked" },
            ]}
            onValueChange={setClipboard}
          />
          <label className="code-demo-switch">
            <Switch
              size="sm"
              aria-label="Line numbers"
              checked={lineNumbers}
              onCheckedChange={setLineNumbers}
            />
            Line numbers
          </label>
          <label className="code-demo-switch">
            <Switch
              size="sm"
              aria-label="Filename"
              checked={showFilename}
              onCheckedChange={setShowFilename}
            />
            Filename
          </label>
        </>
      }
    >
      <div className="code-demo-stage" data-variant={variant}>
        <CodeBlock
          key={`${clipboard}:${variant}`}
          code={current.code}
          language={current.language}
          filename={showFilename ? current.filename : undefined}
          lineNumbers={lineNumbers}
          variant={variant}
        />
      </div>
    </Frame>
  );
}

/* Variants ------------------------------------------------------------------ */

export function CodeBlockVariants() {
  return (
    <div className="code-demo-split">
      <Frame
        id="variant-inline"
        title="Inline"
        note="Bordered card, scrolls after 24rem."
      >
        <CodeBlock
          language="json"
          filename="fictional-garden.json"
          code={samples.json.code}
        />
      </Frame>
      <Frame id="variant-file" title="File" note="Fills its parent. No frame.">
        <div className="code-demo-file-host">
          <CodeBlock
            language="text"
            filename="memory/preferences.md"
            variant="file"
            code={
              "# Preferences\n\n- Reply in short paragraphs.\n- Use metric units.\n- Ask before sending email."
            }
          />
        </div>
      </Frame>
    </div>
  );
}

/* Chat response (message-response) ------------------------------------------ */

type Part =
  | { kind: "text"; text: string }
  | { kind: "code"; code: string; language: string };

/** A tiny fence splitter standing in for a Markdown renderer's `pre` override. */
function splitFences(markdown: string): Part[] {
  const parts: Part[] = [];
  const fence = /```([\w-]*)\n([\s\S]*?)\n```/g;
  let last = 0;
  for (const match of markdown.matchAll(fence)) {
    const before = markdown.slice(last, match.index).trim();
    if (before) parts.push({ kind: "text", text: before });
    parts.push({ kind: "code", language: match[1] || "text", code: match[2]! });
    last = match.index + match[0].length;
  }
  const rest = markdown.slice(last).trim();
  if (rest) parts.push({ kind: "text", text: rest });
  return parts;
}

const answer = `Here is a query that counts signups per week for the last two months:

\`\`\`sql
SELECT date_trunc('week', created_at) AS week, count(*) AS signups
FROM accounts
WHERE created_at >= now() - interval '8 weeks'
GROUP BY 1 ORDER BY 1 DESC;
\`\`\`

Run it in your warehouse, then paste the rows back. To chart them in a script:

\`\`\`ts
const weeks = rows.map((row) => ({ week: new Date(row.week), signups: Number(row.signups) }));
\`\`\`

Expected output:

\`\`\`
week        signups
2026-10-12  184
2026-10-05  171
\`\`\``;

export function CodeBlockChatResponse() {
  return (
    <Frame
      id="chat-response"
      title="Chat response"
      note="Fenced code in a reply. The fence names the language; no filename."
    >
      <div className="code-demo-message">
        {splitFences(answer).map((part, index) =>
          part.kind === "text" ? (
            <p key={index}>{part.text}</p>
          ) : (
            <CodeBlock key={index} code={part.code} language={part.language} />
          ),
        )}
      </div>
    </Frame>
  );
}

/* Canvas code result (canvas-items) ----------------------------------------- */

const pipeline = Array.from(
  { length: 28 },
  (_, index) =>
    `  stage_${String(index + 1).padStart(2, "0")} AS (SELECT * FROM ${index ? `stage_${String(index).padStart(2, "0")}` : "raw_events"} WHERE step = ${index + 1}),`,
).join("\n");

export function CodeBlockCanvas() {
  return (
    <Frame
      id="canvas-code"
      title="Canvas code result"
      note="Inside CanvasSection; filename falls back to the canvas tab title."
    >
      <div className="code-demo-canvas">
        <CanvasSection>
          <CodeBlock
            code={`WITH\n${pipeline}\n  final AS (SELECT * FROM stage_28)\nSELECT count(*) FROM final;`}
            language="sql"
            filename="Funnel stages"
          />
        </CanvasSection>
      </div>
    </Frame>
  );
}

/* Workflow code step (workflow-draft-details) ------------------------------- */

const steps = [
  {
    id: "calculate",
    language: "javascript" as const,
    input: "the trigger input",
    source: "return { total: input.amount };",
  },
  {
    id: "score_lead",
    language: "python" as const,
    input: "Lead from Step 1",
    source: `score = 0
if lead["replied"]:
    score += 40
score += min(lead["seats"], 50)
return {"score": score}`,
  },
];

export function CodeBlockWorkflowStep() {
  return (
    <Frame
      id="workflow-step"
      title="Workflow code step"
      note="Draft review detail. Filename is the step id plus .js or .py."
    >
      <ol className="code-demo-steps">
        {steps.map((step, index) => (
          <li key={step.id}>
            <p className="code-demo-step-summary">
              Step {index + 1}: run{" "}
              {step.language === "python" ? "Python" : "JavaScript"} code with{" "}
              {step.input}
            </p>
            <CodeBlock
              code={step.source}
              language={step.language}
              filename={`${step.id}.${step.language === "python" ? "py" : "js"}`}
            />
          </li>
        ))}
      </ol>
    </Frame>
  );
}

/* Internal playground data --------------------------------------------------- */

export function CodeBlockPlainText() {
  return (
    <Frame
      id="plain-text"
      title="Plain text without line numbers"
      note="language defaults to text: no colors, and the header shows “text”."
    >
      <CodeBlock
        code={"Plant bulbs\nWater gently\nEnjoy the flowers"}
        lineNumbers={false}
      />
    </Frame>
  );
}

/* File explorer (soul-explorer) ---------------------------------------------- */

const files = [
  {
    path: "SOUL.md",
    revision: 4,
    content:
      "# Juniper\n\nYou help the growth team plan launches.\nKeep answers short. Cite the source table for every number.",
  },
  {
    path: "memory/customers/enterprise/renewal-playbooks/northwind-traders-q4.md",
    revision: 2,
    content:
      "Renewal owner: Priya\nRisk: champion left in August.\nNext step: invite the new VP to the October roadmap call.",
  },
  { path: "notes/scratch.md", revision: 1, content: "" },
];

export function CodeBlockFileExplorer() {
  const [path, setPath] = useState(files[0]!.path);
  const file = files.find((item) => item.path === path)!;
  return (
    <Frame
      id="file-explorer"
      title="File explorer"
      note='variant="file" fills the pane. Each file remounts the block.'
    >
      <div className="code-demo-explorer">
        <ul className="code-demo-files" aria-label="Files">
          {files.map((item) => (
            <li key={item.path}>
              <Button
                variant="ghost"
                size="nav"
                aria-current={item.path === path ? "true" : undefined}
                onClick={() => setPath(item.path)}
              >
                <span className="code-demo-file-name">{item.path}</span>
              </Button>
            </li>
          ))}
        </ul>
        <div className="code-demo-pane">
          <CodeBlock
            key={`${file.revision}:${file.path}`}
            code={file.content}
            language="text"
            filename={file.path}
            variant="file"
          />
          {file.content === "" && (
            <p className="code-demo-empty">This file is empty.</p>
          )}
        </div>
      </div>
    </Frame>
  );
}

/* Webhook setup (webhook-setup) ---------------------------------------------- */

const webhookUrl = "https://hooks.tulipfarm.app/w/wf_8k2m4qz7/run";

const curl = {
  signed: [
    `body='{"requestId":"'"$(uuidgen)"'","input":{"example":true}}'`,
    "timestamp=$(date +%s)",
    `signature=$(printf '%s.%s' "$timestamp" "$body" | openssl dgst -sha256 -hmac "$TULIPFARM_WEBHOOK_KEY" | sed 's/^.*= //')`,
    `curl -X POST '${webhookUrl}' \\`,
    '  -H "X-TulipFarm-Timestamp: $timestamp" \\',
    '  -H "X-TulipFarm-Signature: sha256=$signature" \\',
    "  -H 'Content-Type: application/json' \\",
    '  --data-binary "$body"',
  ].join("\n"),
  bearer: [
    `curl -X POST '${webhookUrl}' \\`,
    '  -H "Authorization: Bearer $TULIPFARM_WEBHOOK_KEY" \\',
    "  -H 'Content-Type: application/json' \\",
    `  --data-raw '{"requestId":"'"$(uuidgen)"'","input":{"example":true}}'`,
  ].join("\n"),
};

export function CodeBlockWebhook() {
  const [mode, setMode] = useState<keyof typeof curl>("signed");
  return (
    <Frame
      id="webhook"
      title="Webhook setup"
      note="A shell example: plain text, no line numbers, long lines scroll."
      controls={
        <ToggleGroup
          aria-label="Key type"
          value={[mode]}
          onValueChange={(value) => {
            const next = value[0];
            if (next === "signed" || next === "bearer") setMode(next);
          }}
          size="sm"
          variant="outline"
          spacing={0}
        >
          <ToggleGroupItem value="signed">Signed requests</ToggleGroupItem>
          <ToggleGroupItem value="bearer">Bearer token</ToggleGroupItem>
        </ToggleGroup>
      }
    >
      <div className="code-demo-webhook">
        <p className="code-demo-url">POST {webhookUrl}</p>
        <CodeBlock
          code={curl[mode]}
          filename="curl example"
          lineNumbers={false}
        />
        <p className="code-demo-hint">
          Set TULIPFARM_WEBHOOK_KEY to your key before you run the example. The
          example never contains the key.
        </p>
      </div>
    </Frame>
  );
}
