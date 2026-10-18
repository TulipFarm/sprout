import { useState, type ReactNode } from "react";
import { Badge, type BadgeVariant } from "@tulipfarm/sprout/badge";
import { Button } from "@tulipfarm/sprout/button";
import { CanvasSection } from "@tulipfarm/sprout/canvas";
import {
  SchemaDiagram,
  SchemaLegend,
  type SchemaDiagramLayout,
  type SchemaLink,
  type SchemaTable,
} from "@tulipfarm/sprout/schema-diagram";
import { Skeleton } from "@tulipfarm/sprout/skeleton";
import { StatePanel } from "@tulipfarm/sprout/state-panel";
import DocsSelect from "./DocsSelect";
import "../styles/schema-diagram-demo.css";

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
    <section className="schema-demo-frame" aria-label={title} data-demo={id}>
      <div className="schema-demo-bar">
        <div className="schema-demo-bar-text">
          <span className="schema-demo-bar-title">{title}</span>
          {note && <span className="schema-demo-note">{note}</span>}
        </div>
        {controls && <div className="schema-demo-controls">{controls}</div>}
      </div>
      {children}
    </section>
  );
}

/* Sample proposals shaped like the ones a TulipFarm chat assistant drafts. */

const salesTables: SchemaTable[] = [
  {
    id: "deals",
    label: "Deals",
    state: "new",
    fields: [
      {
        id: "deal-title",
        label: "Title",
        type: "text",
        required: true,
        unique: true,
      },
      { id: "deal-amount", label: "Amount", type: "decimal", required: true },
      {
        id: "deal-stage",
        label: "Stage",
        type: "select",
        required: true,
        detail: "Qualified · Proposal · Won · Lost",
      },
      {
        id: "deal-close",
        label: "Expected close",
        type: "date & time",
        required: false,
      },
      { id: "deal-customer", label: "Customer", type: "link", required: true },
      { id: "deal-files", label: "Contracts", type: "files", required: false },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    state: "changed",
    fields: [
      {
        id: "customer-name",
        label: "Company name",
        type: "text",
        required: true,
        unique: true,
      },
      {
        id: "customer-email",
        label: "Billing email",
        type: "text",
        required: true,
        unique: true,
        change: "added",
      },
      {
        id: "customer-segment",
        label: "Segment",
        type: "select",
        required: false,
        detail: "SMB · Mid-market · Enterprise",
        change: "changed",
      },
      {
        id: "customer-fax",
        label: "Fax number",
        type: "text",
        required: false,
        change: "removed",
      },
      {
        id: "customer-owner",
        label: "Account manager",
        type: "link",
        required: false,
      },
    ],
  },
  {
    id: "people",
    label: "People",
    state: "linked",
    fields: [
      { id: "person-name", label: "Full name", type: "text", required: true },
      {
        id: "person-email",
        label: "Work email",
        type: "text",
        required: true,
        unique: true,
      },
      { id: "person-active", label: "Active", type: "yes/no", required: false },
    ],
  },
];

const salesLinks: SchemaLink[] = [
  {
    id: "deal-customer",
    source: "deals",
    field: "deal-customer",
    target: "customers",
    label: "N:1",
  },
  {
    id: "customer-owner",
    source: "customers",
    field: "customer-owner",
    target: "people",
    label: "N:1",
  },
];

const ticketTables: SchemaTable[] = [
  {
    id: "tickets",
    label: "Support tickets",
    state: "new",
    fields: [
      { id: "ticket-subject", label: "Subject", type: "text", required: true },
      {
        id: "ticket-number",
        label: "Ticket number",
        type: "number",
        required: true,
        unique: true,
      },
      {
        id: "ticket-priority",
        label: "Priority",
        type: "select",
        required: true,
        detail: "Low · Normal · Urgent",
      },
      { id: "ticket-account", label: "Account", type: "link", required: false },
    ],
  },
  { id: "accounts", label: "Linked table", state: "linked", fields: [] },
];

const ticketLinks: SchemaLink[] = [
  {
    id: "ticket-account",
    source: "tickets",
    field: "ticket-account",
    target: "accounts",
    label: "N:1",
  },
];

const statuses = {
  pending: { label: "Not yet applied", variant: "info" },
  approved: { label: "Approval recorded", variant: "info" },
  running: { label: "Applying changes", variant: "info" },
  completed: { label: "Changes applied", variant: "success" },
  partial: { label: "Partially completed", variant: "warning" },
  failed: { label: "Execution failed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "warning" },
  rejected: { label: "Rejected", variant: "destructive" },
  expired: { label: "Expired", variant: "warning" },
} as const satisfies Record<string, { label: string; variant: BadgeVariant }>;
type Status = keyof typeof statuses;

function footer(status: Status) {
  if (status === "completed")
    return "Changes applied. Open the result from the approval area at the bottom of the chat.";
  if (status === "pending")
    return "Review these changes, then use the approval area at the bottom of the chat.";
  if (status === "approved" || status === "running")
    return "Follow progress in the approval area at the bottom of the chat.";
  return "Check the outcome and available actions in the approval area at the bottom of the chat.";
}

const proposals = {
  sales: {
    title: "Sales pipeline",
    tables: salesTables,
    links: salesLinks,
    plans: 2,
  },
  tickets: {
    title: "Support desk",
    tables: ticketTables,
    links: ticketLinks,
    plans: 1,
  },
} as const;
type Read = keyof typeof proposals | "loading" | "redacted" | "error";

const plural = (count: number, word: string) =>
  `${count} ${count === 1 ? word : `${word}s`}`;

/** The chat canvas composition: status badge, diagram, legend, and approval hint. */
function ProposalCanvas({
  read,
  status,
  layout,
  onRetry,
}: {
  read: Read;
  status: Status;
  layout: SchemaDiagramLayout;
  onRetry: () => void;
}) {
  if (read === "loading")
    return (
      <div
        aria-label="Loading tables"
        role="status"
        className="schema-demo-loading"
      >
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <span className="schema-demo-sr-only">Loading tables…</span>
      </div>
    );
  if (read === "error")
    return (
      <StatePanel
        kind="error"
        heading="h3"
        title="Could not load tables"
        description="The schema proposal did not load. Your chat is unchanged."
      >
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </StatePanel>
    );
  if (read === "redacted")
    return (
      <StatePanel
        kind="unavailable"
        heading="h3"
        title="Schema no longer available"
        description="Proposal values were removed after the review period. Ask the assistant for a new proposal to see its schema."
      />
    );
  const proposal = proposals[read];
  return (
    <CanvasSection
      title={proposal.title}
      meta={`${plural(proposal.plans, "table")} in this proposal · ${plural(proposal.links.length, "link")}`}
    >
      <div role="status">
        <Badge variant={statuses[status].variant}>
          {statuses[status].label}
        </Badge>
      </div>
      <SchemaDiagram
        tables={proposal.tables}
        links={proposal.links}
        layout={layout}
        label={`Schema diagram for ${proposal.title}`}
      />
      <SchemaLegend />
      <p className="schema-demo-footer">{footer(status)}</p>
    </CanvasSection>
  );
}

const readItems = [
  { value: "sales", label: "2 tables, 2 links" },
  { value: "tickets", label: "1 table, 1 link" },
  { value: "loading", label: "Loading" },
  { value: "error", label: "Load error" },
  { value: "redacted", label: "Values removed" },
] as const satisfies readonly { value: Read; label: string }[];

const statusItems = (Object.keys(statuses) as Status[]).map((value) => ({
  value,
  label: statuses[value].label,
}));

const layoutItems = [
  { value: "auto", label: "Auto layout" },
  { value: "horizontal", label: "Columns" },
  { value: "vertical", label: "Stacked" },
] as const satisfies readonly { value: SchemaDiagramLayout; label: string }[];

export function SchemaDiagramPlayground() {
  const [read, setRead] = useState<Read>("sales");
  const [status, setStatus] = useState<Status>("pending");
  const [layout, setLayout] = useState<SchemaDiagramLayout>("auto");
  return (
    <Frame
      id="playground"
      title="Schema proposal in the canvas"
      note="Sample data. Nothing is written to a database."
      controls={
        <>
          <DocsSelect
            label="Proposal"
            value={read}
            items={readItems}
            onValueChange={setRead}
          />
          <DocsSelect
            label="Status"
            value={status}
            items={statusItems}
            onValueChange={setStatus}
          />
          <DocsSelect
            label="Layout"
            value={layout}
            items={layoutItems}
            onValueChange={setLayout}
          />
        </>
      }
    >
      <div className="schema-demo-canvas">
        <ProposalCanvas
          read={read}
          status={status}
          layout={layout}
          onRetry={() => setRead("sales")}
        />
      </div>
    </Frame>
  );
}

const stateTables: SchemaTable[] = [
  {
    id: "projects",
    label: "Projects",
    state: "new",
    fields: [
      {
        id: "project-name",
        label: "Name",
        type: "text",
        required: true,
        unique: true,
      },
      {
        id: "project-status",
        label: "Status",
        type: "select",
        required: true,
        detail: "Planned · In progress · Done",
      },
      { id: "project-lead", label: "Lead", type: "link", required: false },
    ],
  },
  {
    id: "tasks",
    label: "Tasks",
    state: "changed",
    fields: [
      {
        id: "task-title",
        label: "Title",
        type: "text",
        required: true,
        change: "changed",
      },
      {
        id: "task-due",
        label: "Due",
        type: "date & time",
        required: false,
        change: "added",
      },
      { id: "task-project", label: "Project", type: "link", required: true },
      {
        id: "task-note",
        label: "Old note",
        type: "text",
        required: false,
        change: "removed",
      },
    ],
  },
  {
    id: "team",
    label: "Team members",
    state: "linked",
    fields: [
      {
        id: "member-email",
        label: "Email",
        type: "text",
        required: true,
        unique: true,
      },
    ],
  },
  {
    id: "time",
    label: "Time entries",
    state: "unchanged",
    fields: [
      { id: "time-hours", label: "Hours", type: "decimal", required: true },
      {
        id: "time-billable",
        label: "Billable",
        type: "yes/no",
        required: false,
      },
    ],
  },
];

const stateLinks: SchemaLink[] = [
  {
    id: "task-project",
    source: "tasks",
    field: "task-project",
    target: "projects",
    label: "N:1",
  },
  {
    id: "project-lead",
    source: "projects",
    field: "project-lead",
    target: "team",
    label: "N:1",
  },
];

/** The internal playground composition: a legend above a fixed-height frame. */
export function SchemaDiagramStates() {
  return (
    <Frame
      id="states"
      title="Table states and field changes"
      note="New, Changed, Existing, and unchanged tables. Drag to pan; scroll or pinch to zoom."
    >
      <div className="schema-demo-body">
        <SchemaLegend />
        <div className="schema-demo-fixed">
          <SchemaDiagram
            label="Project tracker schema"
            tables={stateTables}
            links={stateLinks}
          />
        </div>
      </div>
    </Frame>
  );
}

export function SchemaDiagramLayouts() {
  return (
    <div className="schema-demo-pair">
      {(["horizontal", "vertical"] as const).map((layout) => (
        <Frame
          key={layout}
          id={`layout-${layout}`}
          title={layout === "horizontal" ? "Columns" : "Stacked"}
          note={
            layout === "horizontal"
              ? "Linked tables sit one column right. Controls bottom right."
              : "Phones stack tables in link order. Controls top right."
          }
        >
          <div className="schema-demo-body">
            <div className="schema-demo-fixed">
              <SchemaDiagram
                layout={layout}
                label={`${layout === "horizontal" ? "Columns" : "Stacked"} sales schema`}
                tables={salesTables}
                links={salesLinks}
              />
            </div>
          </div>
        </Frame>
      ))}
    </div>
  );
}

const edgeTables: SchemaTable[] = [
  {
    id: "employees",
    label: "Employees",
    state: "new",
    fields: [
      { id: "employee-name", label: "Name", type: "text", required: true },
      {
        id: "employee-manager",
        label: "Manager",
        type: "link",
        required: false,
      },
      {
        id: "employee-badge",
        label: "Badge photo",
        type: "file",
        required: false,
      },
      { id: "employee-office", label: "Office", type: "link", required: true },
    ],
  },
  {
    id: "renewals",
    label: "Quarterly enterprise renewal opportunities and follow-ups",
    state: "changed",
    fields: [
      {
        id: "renewal-contact",
        label: "Primary billing contact email address for invoices",
        type: "text",
        required: true,
        unique: true,
        change: "added",
      },
      {
        id: "renewal-region",
        label: "Region",
        type: "multi-select",
        required: false,
        detail:
          "North America · Europe · Middle East · Africa · Asia Pacific · Latin America",
      },
      { id: "renewal-owner", label: "Owner", type: "links", required: false },
    ],
  },
  { id: "drafts", label: "Onboarding checklist", state: "new", fields: [] },
  { id: "offices", label: "Linked table", state: "linked", fields: [] },
];

const edgeLinks: SchemaLink[] = [
  {
    id: "employee-manager",
    source: "employees",
    field: "employee-manager",
    target: "employees",
    label: "N:1",
  },
  {
    id: "renewal-owner",
    source: "renewals",
    field: "renewal-owner",
    target: "employees",
    label: "N:N",
  },
  {
    id: "employee-office",
    source: "employees",
    field: "employee-office",
    target: "offices",
    label: "N:1",
  },
];

export function SchemaDiagramEdgeCases() {
  return (
    <Frame
      id="edge-cases"
      title="Self links, empty tables, and long names"
      note="Long labels truncate and show the full text on hover."
    >
      <div className="schema-demo-body">
        <div className="schema-demo-fixed">
          <SchemaDiagram
            label="Team operations schema"
            tables={edgeTables}
            links={edgeLinks}
          />
        </div>
      </div>
    </Frame>
  );
}
