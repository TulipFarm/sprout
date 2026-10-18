import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChatSources,
  CheckedCitation,
  InlineCitation,
  type ChatSource,
  type CitationState,
  type CitationStateKind,
} from "@tulipfarm/sprout/chat-sources";
import { MessageResponse } from "@tulipfarm/sprout/message-response";
import DocsSelect from "./DocsSelect";
import "../styles/chat-sources-demo.css";

function Frame({
  id,
  title,
  note,
  controls,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="sources-demo-frame" aria-label={title} data-recipe={id}>
      <div className="sources-demo-bar">
        <div className="sources-demo-bar-text">
          <span className="sources-demo-bar-title">{title}</span>
          {note && <span className="sources-demo-note">{note}</span>}
        </div>
        {controls && <div className="sources-demo-controls">{controls}</div>}
      </div>
      <div className="sources-demo-stage">{children}</div>
    </section>
  );
}

/* Playground: a reply whose knowledge citations are checked on open ------------ */

type CheckResult = "ready" | "unavailable" | "error";

const checkChoices: { value: CheckResult; label: string }[] = [
  { value: "ready", label: "Access allowed" },
  { value: "unavailable", label: "Source removed" },
  { value: "error", label: "Check fails" },
];

const prefix = "#knowledge-citation=";

// Sample passages keyed like Cloud's citation ids. Nothing is fetched.
const passages: Record<
  string,
  { title: string; location: string; excerpt: string }
> = {
  "3f2a9c1e-5b7d-4e8a-9c0f-1a2b3c4d5e6f:0": {
    title: "Supplier onboarding checklist",
    location: "Note · Before the first order",
    excerpt:
      "Collect the W-9 and bank details before the first purchase order.\nAdd the supplier to the Approved vendors table once both are on file.",
  },
  "7c8d9e0f-1a2b-4c3d-8e4f-5a6b7c8d9e0f:3": {
    title: "Q3 vendor review.pdf",
    location: "File · Payment terms",
    excerpt:
      "Net 30 remains the default. Suppliers with three late deliveries in a quarter move to Net 15…",
  },
};

const reply = `Before ordering from a new supplier, collect their tax form and bank details — see the [onboarding checklist](${prefix}3f2a9c1e-5b7d-4e8a-9c0f-1a2b3c4d5e6f:0).

Payment terms default to **Net 30**, but suppliers with repeated late deliveries move to Net 15 ([Q3 vendor review](${prefix}7c8d9e0f-1a2b-4c3d-8e4f-5a6b7c8d9e0f:3)).`;

function labelText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number")
    return String(children);
  if (Array.isArray(children)) return children.map(labelText).join("");
  return "knowledge source";
}

/** A sample adapter in the shape of Cloud's KnowledgeCitation: it rechecks access on every open. */
function SampleKnowledgeCitation({
  citationId,
  result,
  children,
}: {
  citationId: string;
  result: CheckResult;
  children: ReactNode;
}) {
  const [state, setState] = useState<CitationState>({ kind: "idle" });
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function load(outcome: CheckResult) {
    window.clearTimeout(timer.current);
    setState({ kind: "loading" });
    timer.current = window.setTimeout(() => {
      const passage = passages[citationId];
      if (outcome === "unavailable" || !passage)
        setState({
          kind: "unavailable",
          message:
            "This source changed, was removed, or your access ended. Its passage is hidden. Ask again to search current knowledge.",
        });
      else if (outcome === "error")
        setState({
          kind: "error",
          message:
            "We couldn’t check access to this source. Your answer is unchanged.",
        });
      else setState({ kind: "ready", ...passage });
    }, 700);
  }
  return (
    <CheckedCitation
      label={labelText(children)}
      state={state}
      onOpen={() => load(result)}
      onRetry={() => load("ready")}
    />
  );
}

export function ChatSourcesPlayground() {
  const [result, setResult] = useState<CheckResult>("ready");
  return (
    <section
      className="sources-demo-frame"
      aria-label="Chat sources playground"
    >
      <div className="sources-demo-toolbar">
        <span className="sources-demo-picker">
          Next access check
          <DocsSelect<CheckResult>
            label="Next access check"
            value={result}
            onValueChange={setResult}
            items={checkChoices}
          />
        </span>
        <span className="sources-demo-note">
          Checks are simulated locally; no request is sent.
        </span>
      </div>
      <div className="sources-demo-stage">
        <div className="sources-demo-chat">
          <MessageResponse
            renderLink={(href, label) => {
              const id = href.startsWith(prefix)
                ? href.slice(prefix.length)
                : null;
              return id ? (
                <SampleKnowledgeCitation citationId={id} result={result}>
                  {label}
                </SampleKnowledgeCitation>
              ) : (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {label}
                </a>
              );
            }}
          >
            {reply}
          </MessageResponse>
        </div>
      </div>
    </section>
  );
}

/* Every checked-citation state, as Cloud's playground shows them ---------------- */

const stateChoices: { value: CitationStateKind; label: string }[] = [
  { value: "idle", label: "Idle" },
  { value: "loading", label: "Loading" },
  { value: "ready", label: "Ready" },
  { value: "unavailable", label: "Unavailable" },
  { value: "error", label: "Error" },
];

const garden: ChatSource = {
  id: "garden-notes",
  title: "Fictional garden notes",
  location: "Example collection",
  excerpt: "Water newly planted bulbs once and keep the soil lightly moist.",
  href: "https://garden.example.com/notes",
};

function stateFor(kind: CitationStateKind): CitationState {
  if (kind === "ready")
    return {
      kind,
      title: garden.title,
      location: garden.location,
      excerpt: garden.excerpt,
    };
  if (kind === "error" || kind === "unavailable")
    return { kind, message: "This sample source is not available." };
  return { kind };
}

export function ChatSourcesCitationStates() {
  const [kind, setKind] = useState<CitationStateKind>("ready");
  return (
    <Frame
      id="states"
      title="Checked citation states"
      note="Idle, loading, ready, unavailable, and error"
      controls={
        <DocsSelect<CitationStateKind>
          label="Citation state"
          value={kind}
          onValueChange={setKind}
          items={stateChoices}
        />
      }
    >
      <p className="sources-demo-reply">
        Plant the bulbs in late autumn, then water them once (
        <CheckedCitation
          label="Garden notes"
          state={stateFor(kind)}
          onOpen={() => {}}
          onRetry={() => setKind("ready")}
        />
        ).
      </p>
    </Frame>
  );
}

/* Numbered citations with the sources list ------------------------------------ */

const vendorSources: ChatSource[] = [
  {
    id: "checklist",
    title: "Supplier onboarding checklist",
    location: "Note · Before the first order",
    excerpt:
      "Collect the W-9 and bank details before the first purchase order.",
    href: "https://notes.example.com/supplier-onboarding",
  },
  {
    id: "review",
    title: "Q3 vendor review.pdf",
    location: "File · Payment terms",
    excerpt:
      "Net 30 remains the default. Suppliers with three late deliveries in a quarter move to Net 15.",
    href: "https://drive.example.com/q3-vendor-review.pdf",
  },
  {
    id: "thread",
    title: "#purchasing — Late deliveries from Greenhouse Supply",
    location: "Slack · 14 replies",
    excerpt: "Agreed: we move Greenhouse Supply to Net 15 starting October.",
    href: "https://slack.example.com/archives/purchasing",
  },
];

export function ChatSourcesWithCitations() {
  return (
    <Frame
      id="sources"
      title="Inline citations and sources"
      note="Three sources, open"
    >
      <div className="sources-demo-chat">
        <p className="sources-demo-reply">
          Collect the tax form and bank details before the first order.
          <InlineCitation source={vendorSources[0]!} number={1} /> Payment terms
          default to Net 30, but suppliers with repeated late deliveries move to
          Net 15.
          <InlineCitation source={vendorSources[1]!} number={2} />
          <InlineCitation source={vendorSources[2]!} number={3} />
        </p>
        <ChatSources sources={vendorSources} defaultOpen />
      </div>
    </Frame>
  );
}

export function ChatSourcesSingle() {
  return (
    <Frame
      id="single"
      title="One source"
      note="Cloud’s playground sample, closed"
    >
      <div className="sources-demo-chat">
        <p className="sources-demo-reply">
          Water bulbs after planting.{" "}
          <InlineCitation source={garden} number={1} />
        </p>
        <ChatSources sources={[garden]} />
      </div>
    </Frame>
  );
}

export function ChatSourcesEmpty() {
  return (
    <Frame id="empty" title="Empty sources" note="The reply used no sources">
      <div className="sources-demo-chat">
        <ChatSources sources={[]} />
      </div>
    </Frame>
  );
}

/* Long content wraps ------------------------------------------------------------ */

const longSources: ChatSource[] = [
  {
    id: "export",
    title:
      "supplier-deliveries-2026-q3-final-v2-reconciled-with-InvoiceReferenceNumberFromLegacyAccountingSystem.csv",
    location:
      "Google Workspace · Shared drives › Operations › Purchasing › Quarterly exports › 2026",
    excerpt:
      "Rows with an empty Supplier field were matched by invoice number. Twelve invoice numbers match more than one supplier and still need a person to choose.",
    href: "#sample-export",
  },
  {
    id: "jira",
    title: "OPS-2214 Reconcile legacy invoice references",
    location: "Jira · In progress",
    excerpt:
      "https://files.example.com/workspaces/tulipfarm/exports/supplier-deliveries-2026-q3-final-v2.csv",
    href: "#sample-jira",
  },
];

export function ChatSourcesLongContent() {
  return (
    <Frame
      id="long"
      title="Long content"
      note="Long names, paths, and links wrap in a narrow chat"
    >
      <div className="sources-demo-narrow">
        <p className="sources-demo-reply">
          Twelve deliveries still need a supplier.
          <InlineCitation source={longSources[0]!} number={1} />
          <InlineCitation source={longSources[1]!} number={2} />
        </p>
        <ChatSources sources={longSources} defaultOpen />
      </div>
    </Frame>
  );
}
