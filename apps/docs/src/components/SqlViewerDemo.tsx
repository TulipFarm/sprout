import { useState, type ReactNode } from "react";
import {
  SqlViewer,
  type SqlViewerLayout,
  type SqlViewerTable,
} from "@tulipfarm/sprout/sql-viewer";
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

/* Table documents shaped like the ones TulipFarm stores (format 3). */

const sales = "team-sales";
const billing = "team-billing";
const groups = { [sales]: "Sales", [billing]: "Billing" };

const text = (id: string, label: string, required = true, maxLength = 200) =>
  ({ id, label, required, kind: "text", maxLength }) as const;
const link = (
  id: string,
  label: string,
  targetTableId: string,
  cardinality: "one" | "many" = "one",
  required = true,
) =>
  ({
    id,
    label,
    required,
    kind: "relationship",
    targetTableId,
    cardinality,
    inverseCardinality: "many",
  }) as const;
const option = (id: string, label: string) => ({ id, label, retired: false });

const tables: SqlViewerTable[] = [
  {
    id: "customers",
    label: "Customers",
    owningTeamId: sales,
    fields: [
      text("name", "name"),
      text("email", "email", true, 320),
      {
        id: "segment",
        label: "segment",
        required: false,
        kind: "single-select",
        options: [
          option("smb", "SMB"),
          option("mid", "Mid-market"),
          option("ent", "Enterprise"),
        ],
      },
      { id: "created", label: "created_at", required: true, kind: "timestamp" },
    ],
    uniqueKeys: [{ id: "email-key", fieldIds: ["email"] }],
  },
  {
    id: "deals",
    label: "Deals",
    owningTeamId: sales,
    fields: [
      text("title", "title"),
      link("customer", "customer_id", "customers"),
      link("owner", "owner_id", "employees", "one", false),
      {
        id: "amount",
        label: "amount",
        required: true,
        kind: "numeric",
        precision: 12,
        scale: 2,
      },
      { id: "close", label: "close_date", required: false, kind: "date" },
    ],
    uniqueKeys: [{ id: "deal-key", fieldIds: ["customer", "title"] }],
  },
  {
    id: "invoices",
    label: "Invoices",
    owningTeamId: billing,
    fields: [
      text("number", "number", true, 32),
      link("deal", "deal_id", "deals"),
      link("lines", "line_ids", "line_items", "many", false),
      { id: "paid", label: "paid", required: true, kind: "boolean" },
      {
        id: "pdf",
        label: "pdf",
        required: false,
        kind: "file",
        cardinality: "one",
      },
    ],
    uniqueKeys: [{ id: "number-key", fieldIds: ["number"] }],
  },
  {
    id: "line_items",
    label: "Line items",
    owningTeamId: billing,
    fields: [
      text("description", "description", true, 500),
      link("product", "product_id", "products"),
      {
        id: "quantity",
        label: "quantity",
        required: true,
        kind: "numeric",
        precision: 10,
        scale: 0,
      },
    ],
  },
  {
    id: "products",
    label: "Products",
    owningTeamId: billing,
    fields: [
      text("sku", "sku", true, 64),
      text("product-name", "name"),
      {
        id: "tags",
        label: "tags",
        required: false,
        kind: "multi-select",
        options: [option("new", "New"), option("sale", "On sale")],
      },
    ],
    uniqueKeys: [{ id: "sku-key", fieldIds: ["sku"] }],
  },
  {
    id: "employees",
    label: "Employees",
    fields: [
      text("employee-name", "name"),
      link("manager", "manager_id", "employees", "one", false),
    ],
  },
  {
    id: "payments",
    label: "Payments",
    owningTeamId: billing,
    fields: [
      link("invoice", "invoice_id", "invoices"),
      {
        id: "paid-at",
        label: "paid_at",
        required: true,
        kind: "timestamp",
        timezone: "UTC",
      },
    ],
  },
];

const countItems = [
  { value: "1", label: "1 table" },
  { value: "2", label: "2 tables" },
  { value: "4", label: "4 tables" },
  { value: "7", label: "7 tables" },
] as const;
type Count = (typeof countItems)[number]["value"];

const layoutItems: { value: SqlViewerLayout; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "horizontal", label: "Columns" },
  { value: "vertical", label: "Stacked" },
];

export function SqlViewerPlayground() {
  const [count, setCount] = useState<Count>("7");
  const [layout, setLayout] = useState<SqlViewerLayout>("auto");
  return (
    <Frame
      id="playground"
      title="Sales and billing tables"
      note="Hover a table or a foreign key to trace its joins. Click to pin."
      controls={
        <>
          <DocsSelect
            label="Tables"
            value={count}
            items={countItems}
            onValueChange={setCount}
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
      <div className="schema-demo-body">
        <div className="schema-demo-fixed sql-demo-tall">
          <SqlViewer
            key={count}
            label="Tables in Sales and Billing"
            tables={tables.slice(0, Number(count))}
            groups={groups}
            layout={layout}
          />
        </div>
      </div>
    </Frame>
  );
}

export function SqlViewerLayouts() {
  return (
    <div className="schema-demo-pair">
      {(["horizontal", "vertical"] as const).map((layout) => (
        <Frame
          key={layout}
          id={`layout-${layout}`}
          title={layout === "horizontal" ? "Columns" : "Stacked"}
          note={
            layout === "horizontal"
              ? "Joined tables sit one column right. Teams sit side by side."
              : "Phones stack teams and fit the first one to the width."
          }
        >
          <div className="schema-demo-body">
            <div className="schema-demo-fixed">
              <SqlViewer
                layout={layout}
                label={`${layout === "horizontal" ? "Columns" : "Stacked"} sales tables`}
                tables={tables.slice(0, 3)}
                groups={groups}
              />
            </div>
          </div>
        </Frame>
      ))}
    </div>
  );
}
