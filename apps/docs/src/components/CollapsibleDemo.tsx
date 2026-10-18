import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "reicon-react/icons/ChevronDown";
import { ChevronRight } from "reicon-react/icons/ChevronRight";
import { ChevronUp } from "reicon-react/icons/ChevronUp";
import { Code } from "reicon-react/icons/Code";
import { Command } from "reicon-react/icons/Command";
import { FileText } from "reicon-react/icons/FileText";
import { Inbox } from "reicon-react/icons/Inbox";
import { Refresh } from "reicon-react/icons/Refresh";
import { ShieldCheck } from "reicon-react/icons/ShieldCheck";
import { Sparkle } from "reicon-react/icons/Sparkle";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  collapsibleContentVariantNames,
  type CollapsibleContentVariant,
} from "@tulipfarm/sprout/collapsible";
import { Badge, type BadgeVariant } from "@tulipfarm/sprout/badge";
import { BrandIcon, type Brand } from "@tulipfarm/sprout/brand-icon";
import { Button } from "@tulipfarm/sprout/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@tulipfarm/sprout/sidebar";
import "../styles/collapsible-demo.css";
import DocsSelect from "./DocsSelect";

function Example({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="collapsible-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="collapsible-demo-card-body">{children}</div>
    </section>
  );
}

function Pair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="collapsible-demo-pair" role="group" aria-label={label}>
      <span className="collapsible-demo-label">{label}</span>
      <div className="collapsible-demo-pair-body">{children}</div>
    </div>
  );
}

function Spinner() {
  return <span className="collapsible-demo-spinner" aria-hidden="true" />;
}

export function CollapsibleHero() {
  const [open, setOpen] = useState({ expanded: true, collapsed: false });
  return (
    <div className="collapsible-demo collapsible-demo-hero">
      {(["expanded", "collapsed"] as const).map((example) => (
        <Example
          key={example}
          title={
            example === "expanded" ? "Open by default" : "Closed by default"
          }
          description="Show or hide sample project details. Nothing is loaded or saved."
        >
          <Collapsible
            open={open[example]}
            onOpenChange={(next) =>
              setOpen((current) => ({ ...current, [example]: next }))
            }
          >
            <CollapsibleTrigger render={<Button variant="outline" />}>
              {open[example] ? (
                <ChevronUp aria-hidden="true" />
              ) : (
                <ChevronDown aria-hidden="true" />
              )}
              {open[example] ? "Hide project details" : "Show project details"}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="collapsible-demo-text collapsible-demo-gap">
                The sample Meadow project has three tasks and two team members.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </Example>
      ))}
    </div>
  );
}

function CheckStatus() {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setBusy(false), 900);
    return () => clearTimeout(timer);
  }, [busy]);
  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label="Check request status"
      aria-busy={busy}
      disabled={busy}
      onClick={() => setBusy(true)}
    >
      <Refresh size={14} aria-hidden="true" />
      {busy ? "Checking…" : "Check status"}
    </Button>
  );
}

function DetailsText({ children }: { children: ReactNode }) {
  return <div className="collapsible-demo-details">{children}</div>;
}

export function CollapsibleTriggers() {
  return (
    <Example
      title="Trigger pairings"
      description="Each trigger renders a Sprõut Button. Variant and size follow how much weight the hidden content has."
    >
      <Pair label="outline · default">
        <Collapsible defaultOpen>
          <CollapsibleTrigger render={<Button variant="outline" />}>
            Advanced settings
          </CollapsibleTrigger>
          <CollapsibleContent keepMounted>
            <div className="collapsible-demo-stack collapsible-demo-gap">
              <p className="collapsible-demo-text">
                Retries: 3 attempts, 30 seconds apart.
              </p>
              <p className="collapsible-demo-text">
                Time zone: Europe/Amsterdam. Runs pause on public holidays.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Pair>
      <Pair label="ghost · default">
        <Collapsible>
          <CollapsibleTrigger render={<Button variant="ghost" />}>
            Instructions used for this result
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="collapsible-demo-text collapsible-demo-pre-wrap">
              {
                "Check the shared inbox every morning.\nFlag invoices over €5,000 and summarize them for the finance channel."
              }
            </p>
          </CollapsibleContent>
        </Collapsible>
        <Collapsible defaultOpen>
          <CollapsibleTrigger render={<Button variant="ghost" />}>
            Knowledge
            <ChevronDown aria-hidden="true" data-slot="collapsible-indicator" />
          </CollapsibleTrigger>
          <CollapsibleContent keepMounted>
            <p className="collapsible-demo-text collapsible-demo-gap-lg">
              2 Drive folders and 1 shared drive are searchable in chat.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </Pair>
      <Pair label="ghost · sm">
        <Collapsible defaultOpen>
          <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
            Approval details
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="collapsible-demo-small collapsible-demo-approval">
              Only the listed changes are approved. Each table applies as one
              unit. Completed tables stay applied if later work stops.
            </p>
          </CollapsibleContent>
        </Collapsible>
        <Collapsible>
          <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
            Field names and operators
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="collapsible-demo-small collapsible-demo-list collapsible-demo-gap-sm">
              <li>
                <code>status</code> Status: <code>==</code> <code>!=</code>{" "}
                <code>=in=</code>
              </li>
              <li>
                <code>owner</code> Owner: <code>==</code> <code>=isme=</code>
              </li>
            </ul>
          </CollapsibleContent>
        </Collapsible>
        <Collapsible>
          <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
            Details
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="collapsible-demo-small collapsible-demo-gap-sm">
              Read-only configuration. Make changes in chat.
            </p>
            <pre className="collapsible-demo-pre" tabIndex={0}>
              {JSON.stringify(
                {
                  schedule: "0 9 * * 1-5",
                  table: "Invoices",
                  notify: ["#finance"],
                },
                null,
                2,
              )}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </Pair>
      <Pair label="ghost · xs">
        <Collapsible defaultOpen>
          <CollapsibleTrigger render={<Button variant="ghost" size="xs" />}>
            Verification details
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="collapsible-demo-small collapsible-demo-list collapsible-demo-gap-sm">
              <li>
                Every invoice has an owner: passed{" "}
                <code>call_7f2a91c4e0b8</code>
              </li>
              <li>
                Totals match the ledger: passed <code>call_3b19d0aa6f52</code>
              </li>
            </ul>
          </CollapsibleContent>
        </Collapsible>
        <Collapsible>
          <CollapsibleTrigger render={<Button variant="ghost" size="xs" />}>
            Details
          </CollapsibleTrigger>
          <CollapsibleContent>
            <DetailsText>
              <p>Request revision 2. Expires Oct 24, 2026, 5:00 PM.</p>
              <p>
                Only this card records your approval. Your current permission is
                checked when you decide.
              </p>
              <CheckStatus />
            </DetailsText>
          </CollapsibleContent>
        </Collapsible>
      </Pair>
      <Pair label="link · sm">
        <Collapsible>
          <CollapsibleTrigger render={<Button variant="link" size="sm" />}>
            Details
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ol
              aria-label="Knowledge branches"
              className="collapsible-demo-small collapsible-demo-list"
            >
              <li>
                <p>Branch 1: Read</p>
                <p>Q3 planning notes: 4 passages. Full document returned.</p>
              </li>
              <li>
                <p>Branch 2: Timed out</p>
              </li>
            </ol>
          </CollapsibleContent>
        </Collapsible>
      </Pair>
      <Pair label="ghost · chat-row">
        <ToolPickerRow app="google-drive" label="Google Drive" defaultOpen />
        <ToolPickerRow app="slack" label="Slack" />
      </Pair>
    </Example>
  );
}

const toolOptions: Record<string, { read: string[]; change: string[] }> = {
  "google-drive": {
    read: ["Search files", "Read file contents"],
    change: ["Create documents"],
  },
  slack: { read: ["Read channel history"], change: ["Post messages"] },
};

function ToolPickerRow({
  app,
  label,
  defaultOpen = false,
}: {
  app: Brand;
  label: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [selected, setSelected] = useState<string[]>(
    defaultOpen ? ["Search files"] : [],
  );
  const options = toolOptions[app];
  const total = options.read.length + options.change.length;
  const changing = selected.filter((tool) =>
    options.change.includes(tool),
  ).length;
  const toggle = (tool: string, on: boolean) =>
    setSelected((current) =>
      on ? [...current, tool] : current.filter((item) => item !== tool),
    );
  const group = (legend: string, tools: string[]) => (
    <fieldset className="collapsible-demo-fieldset">
      <legend>{legend}</legend>
      {tools.map((tool) => (
        <label key={tool}>
          <input
            type="checkbox"
            checked={selected.includes(tool)}
            onChange={(event) => toggle(tool, event.currentTarget.checked)}
          />
          {tool}
        </label>
      ))}
    </fieldset>
  );
  return (
    <section
      aria-label={`${label} actions`}
      className="collapsible-demo-tool-row"
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <h4>
          <CollapsibleTrigger
            render={<Button variant="ghost" size="chat-row" />}
          >
            <span className="collapsible-demo-tool-name">
              <BrandIcon brand={app} size="sm" />
              {label}
            </span>
            <span className="collapsible-demo-tool-meta">
              <span>
                {selected.length
                  ? `${selected.length} of ${total} selected${changing ? `, ${changing} change data` : ""}`
                  : `${total} available`}
              </span>
              <ChevronDown
                aria-hidden="true"
                data-slot="collapsible-indicator"
              />
            </span>
          </CollapsibleTrigger>
        </h4>
        <CollapsibleContent keepMounted>
          <div className="collapsible-demo-tool-body">
            {group("Read and inspect", options.read)}
            {group("Create or change data", options.change)}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

const motionContent: Record<
  CollapsibleContentVariant,
  { trigger: string; items: string[]; note: string }
> = {
  default: {
    trigger: "Approval details",
    note: "Shows and hides at once, for short notes under a control.",
    items: ["Only the listed changes are approved."],
  },
  sidebar: {
    trigger: "Recent chats",
    note: "Grows and fades in 180ms, for nested navigation.",
    items: ["Q3 launch plan", "Invoice follow-ups", "Hiring loop notes"],
  },
  card: {
    trigger: "Create 2 tables",
    note: "Grows in 180ms inside a bordered card.",
    items: ["Invoices: 6 fields", "Vendors: 4 fields"],
  },
};

export function CollapsibleMotion() {
  return (
    <Example
      title="Content variants"
      description="CollapsibleContent variant sets how the panel enters and leaves. Reduced motion turns every transition off."
    >
      {collapsibleContentVariantNames.map((variant) => {
        const content = motionContent[variant];
        return (
          <Pair key={variant} label={variant}>
            <p className="collapsible-demo-small">{content.note}</p>
            <div
              className="collapsible-demo-motion-frame"
              data-variant={variant}
            >
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="collapsible-demo-inline-trigger">
                  {content.trigger}
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    data-slot="collapsible-indicator"
                  />
                </CollapsibleTrigger>
                <CollapsibleContent variant={variant}>
                  <ul className="collapsible-demo-motion-list">
                    {content.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </Pair>
        );
      })}
    </Example>
  );
}

type ReasoningState =
  | { kind: "thinking" }
  | { kind: "complete"; duration: string }
  | { kind: "interrupted" };

function Reasoning({
  state,
  defaultOpen = false,
}: {
  state: ReasoningState;
  defaultOpen?: boolean;
}) {
  const label =
    state.kind === "thinking"
      ? "Thinking"
      : state.kind === "complete"
        ? `Thought for ${state.duration}`
        : "Thinking interrupted";
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="collapsible-demo-inline-trigger">
        <Sparkle size={16} aria-hidden="true" />
        <span
          className={
            state.kind === "thinking" ? "collapsible-demo-thinking" : undefined
          }
        >
          {label}
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          data-slot="collapsible-indicator"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="collapsible-demo-reasoning">
          The user wants overdue invoices. I will filter the Invoices table by
          due date before today and group the results by vendor.
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

const sources = [
  {
    id: "s1",
    title: "Q3 planning notes",
    location: "Drive · Planning",
    excerpt: "Launch moves to October 14 so the pricing page can ship first.",
  },
  {
    id: "s2",
    title: "Vendor contract — Northwind",
    location: "Drive · Legal · page 4",
    excerpt: "Invoices are due 30 days after receipt unless stated otherwise.",
  },
  {
    id: "s3",
    title: "#finance",
    location: "Slack · yesterday",
    excerpt: "Reminder: close the September books by Friday.",
  },
];

function Sources({ count }: { count: number }) {
  const list = sources.slice(0, count);
  if (list.length === 0)
    return (
      <p className="collapsible-demo-small">
        No sources were used for this response.
      </p>
    );
  return (
    <Collapsible>
      <CollapsibleTrigger className="collapsible-demo-inline-trigger">
        <FileText size={16} aria-hidden="true" />
        <span>
          {list.length} {list.length === 1 ? "source" : "sources"}
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          data-slot="collapsible-indicator"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol className="collapsible-demo-sources">
          {list.map((source, index) => (
            <li key={source.id}>
              <span className="collapsible-demo-source-index">{index + 1}</span>
              <div>
                <p className="collapsible-demo-source-title">{source.title}</p>
                <p className="collapsible-demo-small">{source.location}</p>
                <p className="collapsible-demo-small">{source.excerpt}</p>
              </div>
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}

const activity = [
  "Searched Drive for “Q3 planning”",
  "Read Q3 planning notes",
  "Read Vendor contract — Northwind",
  "Queried Invoices table",
  "Summarized 12 overdue invoices",
];

function ActivityPanel({ working }: { working: boolean }) {
  const [open, setOpen] = useState(true);
  const label = "Reading Vendor contract — Northwind";
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      data-slot="activity-panel"
      role="region"
      aria-label={
        working ? "Chat activity, working" : "Chat activity, finished"
      }
      className="collapsible-demo-activity"
    >
      <CollapsibleTrigger
        aria-label={working ? `Working… ${label}` : "Worked"}
        className="collapsible-demo-inline-trigger collapsible-demo-activity-trigger"
      >
        {working && <Spinner />}
        <span role="status">{working ? "Working…" : "Worked"}</span>
        {working && <span className="collapsible-demo-truncate">{label}</span>}
        <ChevronDown
          size={14}
          aria-hidden="true"
          data-slot="collapsible-indicator"
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        keepMounted
        className="collapsible-demo-activity-content"
      >
        <div
          role="region"
          aria-label="Activity timeline"
          tabIndex={0}
          className="collapsible-demo-activity-viewport"
        >
          <ol>
            {activity.slice(0, working ? 3 : 5).map((item, index, list) => (
              <li key={item}>
                {working && index === list.length - 1 ? (
                  <Spinner />
                ) : (
                  <Command size={14} aria-hidden="true" />
                )}
                {item}
              </li>
            ))}
          </ol>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

type ToolKind = "queued" | "running" | "approval" | "complete" | "error";
const toolLabels: Record<ToolKind, string> = {
  queued: "Queued",
  running: "Running",
  approval: "Needs approval",
  complete: "Complete",
  error: "Failed",
};
const toolBadges: Record<ToolKind, BadgeVariant> = {
  queued: "secondary",
  running: "secondary",
  approval: "warning",
  complete: "success",
  error: "destructive",
};

function ToolCall({
  kind,
  defaultOpen = false,
}: {
  kind: ToolKind;
  defaultOpen?: boolean;
}) {
  const [decision, setDecision] = useState<string>();
  return (
    <div className="collapsible-demo-tool-call" data-kind={kind}>
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger className="collapsible-demo-tool-call-trigger">
          {kind === "running" ? (
            <Spinner />
          ) : (
            <Code size={16} aria-hidden="true" />
          )}
          <span className="collapsible-demo-tool-call-name">
            invoices.query
          </span>
          <Badge variant={toolBadges[kind]}>{toolLabels[kind]}</Badge>
          <ChevronDown
            size={14}
            aria-hidden="true"
            data-slot="collapsible-indicator"
          />
          <span className="collapsible-demo-tool-call-summary">
            Find invoices past their due date
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="collapsible-demo-tool-call-body">
            <div>
              <p className="collapsible-demo-eyebrow">Input</p>
              <pre className="collapsible-demo-pre" tabIndex={0}>
                {'{ "filter": "due<2026-10-18;status!=paid" }'}
              </pre>
            </div>
            {kind === "queued" && (
              <p className="collapsible-demo-small">Waiting to start.</p>
            )}
            {kind === "running" && (
              <p role="status" className="collapsible-demo-small">
                Running the sample tool. No action is executed.
              </p>
            )}
            {kind === "approval" &&
              (decision ? (
                <p role="status" className="collapsible-demo-small">
                  {decision}
                </p>
              ) : (
                <div className="collapsible-demo-actions">
                  <Button
                    size="sm"
                    onClick={() =>
                      setDecision("Approved. The sample runs next.")
                    }
                  >
                    Approve sample
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDecision("Declined. Nothing runs.")}
                  >
                    Decline sample
                  </Button>
                </div>
              ))}
            {kind === "complete" && (
              <p className="collapsible-demo-small">
                Sample result: 12 invoices from 5 vendors.
              </p>
            )}
            {kind === "error" && (
              <p className="collapsible-demo-small">No result was returned.</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
      {kind === "error" && (
        <div className="collapsible-demo-tool-call-error">
          <p role="alert">The Invoices table took too long to answer.</p>
          <Button variant="outline" size="sm">
            Retry tool
          </Button>
        </div>
      )}
    </div>
  );
}

export function CollapsibleChat() {
  const [sourceCount, setSourceCount] = useState<"3" | "1" | "0">("3");
  return (
    <div className="collapsible-demo">
      <Example
        title="Reasoning and sources"
        description="Plain triggers with an icon, a label, and a turning chevron. Text stays muted until hover."
      >
        <Pair label="Thinking">
          <Reasoning state={{ kind: "thinking" }} />
        </Pair>
        <Pair label="Complete">
          <Reasoning
            state={{ kind: "complete", duration: "12s" }}
            defaultOpen
          />
        </Pair>
        <Pair label="Interrupted">
          <Reasoning state={{ kind: "interrupted" }} />
        </Pair>
        <Pair label="Sources">
          <div className="collapsible-demo-toolbar">
            <DocsSelect<"3" | "1" | "0">
              label="Source count"
              value={sourceCount}
              onValueChange={setSourceCount}
              items={[
                { value: "3", label: "3 sources" },
                { value: "1", label: "1 source" },
                { value: "0", label: "No sources" },
              ]}
            />
          </div>
          <Sources count={Number(sourceCount)} />
        </Pair>
      </Example>
      <Example
        title="Activity"
        description="The root is a labelled region. Content stays mounted, so the scroll position survives a close."
      >
        <Pair label="Working">
          <ActivityPanel working />
        </Pair>
        <Pair label="Worked">
          <ActivityPanel working={false} />
        </Pair>
      </Example>
      <Example
        title="Tool calls"
        description="A full-width header trigger carries the name, a status badge, and a summary that wraps."
      >
        {(Object.keys(toolLabels) as ToolKind[]).map((kind) => (
          <Pair key={kind} label={toolLabels[kind]}>
            <ToolCall kind={kind} defaultOpen={kind === "approval"} />
          </Pair>
        ))}
      </Example>
    </div>
  );
}

export function CollapsibleReviewCard() {
  const titleId = useId();
  const [settled, setSettled] = useState(false);
  const [open, setOpen] = useState(true);
  useEffect(() => setOpen(!settled), [settled]);
  return (
    <Example
      title="Review card"
      description="The whole header is the hit area. The chevron sits outside the trigger and still turns. Settling the review closes the card."
    >
      <section aria-labelledby={titleId} className="collapsible-demo-review">
        <Collapsible open={open} onOpenChange={setOpen}>
          <div className="collapsible-demo-review-header">
            <span aria-hidden="true" className="collapsible-demo-review-icon">
              <ShieldCheck size={16} />
            </span>
            <h4 id={titleId}>
              <CollapsibleTrigger className="collapsible-demo-review-trigger">
                Create Invoices and Vendors tables
              </CollapsibleTrigger>
            </h4>
            <Badge variant={settled ? "success" : "warning"}>
              {settled ? "Approved" : "Needs review"}
            </Badge>
            <ChevronDown
              size={16}
              aria-hidden="true"
              data-slot="collapsible-indicator"
            />
          </div>
          <CollapsibleContent variant="card">
            <div className="collapsible-demo-review-body">
              <ul className="collapsible-demo-list collapsible-demo-small">
                <li>
                  Invoices: number, vendor, amount, due date, status, owner
                </li>
                <li>Vendors: name, contact, payment terms, country</li>
              </ul>
            </div>
          </CollapsibleContent>
        </Collapsible>
        <div className="collapsible-demo-review-footer">
          <p role="status" className="collapsible-demo-small">
            {settled
              ? "Approved just now. Tables are being created."
              : "Waiting for your review."}
          </p>
          {open && (
            <div className="collapsible-demo-actions">
              {settled ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSettled(false)}
                >
                  Reset sample
                </Button>
              ) : (
                <>
                  <Button size="sm" onClick={() => setSettled(true)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline">
                    Decline
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </Example>
  );
}

type RecentState = "ready" | "loading" | "empty" | "unavailable" | "error";
const recentChats = [
  "Q3 launch plan",
  "Invoice follow-ups",
  "Hiring loop notes",
];

function RecentItem({
  state,
  retry,
}: {
  state: RecentState;
  retry: () => void;
}) {
  const { isMobile, state: sidebarState, setOpenMobile } = useSidebar();
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState("Chats");
  const visible = open && (isMobile || sidebarState === "expanded");
  const label = "Chats";
  return (
    <SidebarMenuItem>
      <Collapsible open={visible} onOpenChange={setOpen}>
        <div className="collapsible-demo-recent-heading">
          <SidebarMenuButton
            icon={<Inbox aria-hidden="true" />}
            tooltip={label}
            isActive={active === label}
            aria-current={active === label ? "page" : undefined}
            nativeButton={false}
            render={<a href="#collapsible-sidebar" />}
            onClick={(event) => {
              event.preventDefault();
              setActive(label);
              setOpenMobile(false);
            }}
          >
            {label}
          </SidebarMenuButton>
          <CollapsibleTrigger
            aria-label={`${visible ? "Collapse" : "Expand"} ${label}`}
            render={<SidebarMenuAction />}
          >
            <ChevronRight
              size={16}
              aria-hidden="true"
              data-slot="collapsible-indicator"
              data-direction="right"
            />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent variant="sidebar">
          <SidebarMenuSub aria-label={`Recent ${label.toLowerCase()}`}>
            {state === "loading" ? (
              <SidebarMenuSubItem>
                <div role="status" aria-label="Loading recent chats">
                  <span className="sr-only">Loading recent items</span>
                  <SidebarMenuSkeleton />
                  <SidebarMenuSkeleton />
                  <SidebarMenuSkeleton />
                </div>
              </SidebarMenuSubItem>
            ) : state === "unavailable" ? (
              <SidebarMenuSubItem>
                <p className="collapsible-demo-recent-note">
                  Recent chats are unavailable in this workspace.
                </p>
              </SidebarMenuSubItem>
            ) : state === "error" ? (
              <SidebarMenuSubItem>
                <div role="alert" className="collapsible-demo-recent-note">
                  <span>Recent chats didn’t load.</span>
                  <Button variant="link" size="xs" onClick={retry}>
                    Try again
                  </Button>
                </div>
              </SidebarMenuSubItem>
            ) : state === "empty" ? (
              <SidebarMenuSubItem>
                <p className="collapsible-demo-recent-note">No chats yet.</p>
              </SidebarMenuSubItem>
            ) : (
              recentChats.map((chat) => (
                <SidebarMenuSubItem key={chat}>
                  <SidebarMenuSubButton
                    nativeButton={false}
                    isActive={active === chat}
                    aria-current={active === chat ? "page" : undefined}
                    render={<a href="#collapsible-sidebar" />}
                    onClick={(event) => {
                      event.preventDefault();
                      setActive(chat);
                      setOpenMobile(false);
                    }}
                  >
                    {chat}
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

function RecentSidebar({
  state,
  retry,
}: {
  state: RecentState;
  retry: () => void;
}) {
  const { isMobile } = useSidebar();
  return (
    <>
      <Sidebar
        collapsible={isMobile ? "none" : "icon"}
        label="Sample navigation"
      >
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <RecentItem state={state} retry={retry} />
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <div className="collapsible-demo-sidebar-main">
        {!isMobile && <SidebarTrigger />}
        <p className="collapsible-demo-small">
          Collapse the sidebar to icons and the list closes. Expand it and the
          list returns.
        </p>
      </div>
    </>
  );
}

export function CollapsibleSidebar() {
  const [state, setState] = useState<RecentState>("ready");
  return (
    <Example
      title="Sidebar recent items"
      description="A SidebarMenuAction is the trigger. The sidebar content variant grows the nested list."
    >
      <div className="collapsible-demo-toolbar">
        <DocsSelect<RecentState>
          label="Recent chats state"
          value={state}
          onValueChange={setState}
          items={[
            { value: "ready", label: "Ready" },
            { value: "loading", label: "Loading" },
            { value: "empty", label: "Empty" },
            { value: "unavailable", label: "Unavailable" },
            { value: "error", label: "Error" },
          ]}
        />
      </div>
      <div id="collapsible-sidebar">
        <SidebarProvider
          keyboardShortcut={false}
          className="collapsible-demo-sidebar-frame"
        >
          <RecentSidebar state={state} retry={() => setState("ready")} />
        </SidebarProvider>
      </div>
    </Example>
  );
}

const moreTasks = [
  "Draft a weekly status update",
  "Find stale deals",
  "Clean up duplicate contacts",
];

function LazyKnowledge() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  if (open && !seen) setSeen(true);
  return (
    <section aria-label="Knowledge" className="collapsible-demo-sheet-section">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="collapsible-demo-pull">
          <CollapsibleTrigger render={<Button variant="ghost" />}>
            Knowledge
            <ChevronDown aria-hidden="true" data-slot="collapsible-indicator" />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent keepMounted>
          <div className="collapsible-demo-gap-lg">
            {seen && (
              <p className="collapsible-demo-text" data-testid="lazy-knowledge">
                Loaded on first open: 2 Drive folders, 1 Gmail label.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

export function CollapsibleStates() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [olderState, setOlderState] = useState<"loading" | "error">("loading");
  return (
    <div className="collapsible-demo">
      <Example
        title="Disabled"
        description="A disabled root blocks the trigger. Say why next to it."
      >
        <div className="collapsible-demo-stack">
          <Collapsible disabled>
            <CollapsibleTrigger
              aria-describedby="collapsible-disabled-reason"
              render={<Button variant="outline" />}
            >
              <ChevronDown aria-hidden="true" />
              Show unavailable details
            </CollapsibleTrigger>
            <CollapsibleContent>Unavailable</CollapsibleContent>
          </Collapsible>
          <p
            id="collapsible-disabled-reason"
            className="collapsible-demo-small"
          >
            The details cannot be opened in this disabled sample.
          </p>
        </div>
      </Example>
      <Example
        title="Content above the trigger"
        description="Put the content first and the list grows upward from the button. The label and icon follow the open state."
      >
        <div className="collapsible-demo-prompts">
          <p className="collapsible-demo-eyebrow">Start with a task</p>
          <ul className="collapsible-demo-prompt-list">
            <li>Summarize unread email</li>
            <li>Plan my week</li>
          </ul>
          <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
            <CollapsibleContent>
              <ul className="collapsible-demo-prompt-list collapsible-demo-prompt-more">
                {moreTasks.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
            </CollapsibleContent>
            <div className="collapsible-demo-px">
              <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
                {moreOpen ? (
                  <ChevronUp aria-hidden="true" />
                ) : (
                  <ChevronDown aria-hidden="true" />
                )}
                {moreOpen ? "Fewer tasks" : `More tasks (${moreTasks.length})`}
              </CollapsibleTrigger>
            </div>
          </Collapsible>
        </div>
      </Example>
      <Example
        title="Mount on first open"
        description="keepMounted keeps the panel in the page. Render the children only after the first open to defer their work."
      >
        <LazyKnowledge />
      </Example>
      <Example
        title="Always open"
        description="Pass open with no trigger to show the content as a fixed list, with loading and error rows inside."
      >
        <div className="collapsible-demo-toolbar">
          <DocsSelect<"loading" | "error">
            label="Earlier activity"
            value={olderState}
            onValueChange={setOlderState}
            items={[
              { value: "loading", label: "Loading" },
              { value: "error", label: "Error" },
            ]}
          />
        </div>
        <Collapsible
          open
          data-slot="tool-activity"
          className="collapsible-demo-stepper"
        >
          <CollapsibleContent>
            {olderState === "loading" ? (
              <div role="status" className="collapsible-demo-older">
                <Spinner />
                Loading earlier activity…
              </div>
            ) : (
              <div
                role="alert"
                className="collapsible-demo-older collapsible-demo-older-error"
              >
                <span>Earlier activity didn’t load.</span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setOlderState("loading")}
                >
                  Retry loading
                </Button>
              </div>
            )}
            <ol aria-label="Tool activity" className="collapsible-demo-steps">
              {activity.slice(0, 3).map((item) => (
                <li key={item}>
                  <Command size={14} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ol>
          </CollapsibleContent>
        </Collapsible>
      </Example>
    </div>
  );
}
