"use client";

import {
  Background,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { useId, useMemo, type HTMLAttributes } from "react";
import { Key } from "reicon-react/icons/Key";
import { cn } from "../internal/classes.js";
import {
  FitOnResize,
  flowMaxZoom as maxZoom,
  flowMinZoom as minZoom,
  useKeyboardView,
  useViewportMobile,
  ZoomControls,
} from "../internal/flow.js";
import { Badge, type BadgeVariant } from "./badge.js";

export const schemaTableStateNames = [
  "new",
  "changed",
  "unchanged",
  "linked",
] as const;
export const schemaChangeNames = ["added", "changed", "removed"] as const;
export const schemaDiagramLayoutNames = [
  "auto",
  "horizontal",
  "vertical",
] as const;

export type SchemaTableState = (typeof schemaTableStateNames)[number];
export type SchemaChange = (typeof schemaChangeNames)[number];
export type SchemaDiagramLayout = (typeof schemaDiagramLayoutNames)[number];

export interface SchemaField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  unique?: boolean | undefined;
  /** A second, muted line under the field, such as a relation target. */
  detail?: string | undefined;
  change?: SchemaChange | undefined;
}

export interface SchemaTable {
  id: string;
  label: string;
  state: SchemaTableState;
  fields: SchemaField[];
}

/** A link starts at a field row and ends at the target table header. */
export interface SchemaLink {
  id: string;
  /** The table that holds `field`. */
  source: string;
  field: string;
  target: string;
  label: string;
}

type Direction = "horizontal" | "vertical";
type TableNode = Node<{ table: SchemaTable; direction: Direction }, "table">;
type LinkEdge = Edge<{ label: string }, "link">;

const tableWidth = 264;
const columnGap = 80;
const rowGap = 48;
const fitOptions = { padding: 0.15, maxZoom: 1 };

const tableHeight = (table: SchemaTable) =>
  44 +
  (table.fields.length === 0
    ? 32
    : table.fields.reduce((sum, field) => sum + (field.detail ? 48 : 32), 0));

const stateBadge: Record<
  SchemaTableState,
  { label: string; variant: BadgeVariant } | null
> = {
  new: { label: "New", variant: "success" },
  changed: { label: "Changed", variant: "warning" },
  linked: { label: "Existing", variant: "secondary" },
  unchanged: null,
};

/** Referenced tables sit one column right of (or below) the tables that link to them. */
function layout(
  tables: readonly SchemaTable[],
  links: readonly SchemaLink[],
  direction: Direction,
): TableNode[] {
  const node = (table: SchemaTable, x: number, y: number): TableNode => ({
    id: table.id,
    type: "table",
    position: { x, y },
    data: { table, direction },
    ariaRole: "group",
    ariaLabel: `${table.label} table`,
    domAttributes: { "aria-roledescription": "table card" },
    sourcePosition: direction === "vertical" ? Position.Bottom : Position.Right,
    targetPosition: direction === "vertical" ? Position.Top : Position.Left,
  });

  if (direction === "vertical") {
    const ordered: SchemaTable[] = [];
    const seen = new Set<string>();
    const add = (table: SchemaTable | undefined) => {
      if (table && !seen.has(table.id)) {
        ordered.push(table);
        seen.add(table.id);
      }
    };
    for (const link of links)
      for (const id of [link.source, link.target])
        add(tables.find((table) => table.id === id));
    for (const table of tables) add(table);
    let y = 0;
    return ordered.map((table) => {
      const placed = node(table, 0, y);
      y += tableHeight(table) + rowGap;
      return placed;
    });
  }

  const depth = new Map(tables.map((table) => [table.id, 0]));
  for (let pass = 0; pass < tables.length; pass++) {
    let moved = false;
    for (const link of links) {
      const next = (depth.get(link.source) ?? 0) + 1;
      if (
        link.source !== link.target &&
        next > (depth.get(link.target) ?? 0) &&
        next < tables.length
      ) {
        depth.set(link.target, next);
        moved = true;
      }
    }
    if (!moved) break;
  }
  const columns = new Map<number, number>();
  return tables.map((table) => {
    const column = depth.get(table.id) ?? 0;
    const y = columns.get(column) ?? 0;
    columns.set(column, y + tableHeight(table) + rowGap);
    return node(table, column * (tableWidth + columnGap), y);
  });
}

function TableCard({ data: { table, direction } }: NodeProps<TableNode>) {
  const badge = stateBadge[table.state];
  const vertical = direction === "vertical";
  return (
    <section
      data-slot="schema-table"
      data-state={table.state}
      className="sprout-schema-table"
    >
      <Handle
        type="target"
        position={vertical ? Position.Top : Position.Left}
        isConnectable={false}
        className="sprout-schema-handle sprout-schema-handle-target"
      />
      <header className="sprout-schema-table-header">
        <h3 className="sprout-schema-table-title" title={table.label}>
          {table.label}
        </h3>
        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
      </header>
      {table.fields.length === 0 ? (
        <p className="sprout-schema-table-empty">
          {table.state === "linked" ? "Fields not shown" : "No fields"}
        </p>
      ) : (
        <ul className="sprout-schema-fields">
          {table.fields.map((field) => (
            <li
              key={field.id}
              data-slot="schema-field"
              data-change={field.change}
              className="sprout-schema-field"
            >
              <div className="sprout-schema-field-line">
                <span className="sprout-schema-field-key">
                  {field.unique && (
                    <Key size={11} aria-label="Unique" role="img" />
                  )}
                </span>
                <span className="sprout-schema-field-name" title={field.label}>
                  {field.label}
                  {field.required && (
                    <span className="sprout-schema-field-required">
                      <span aria-hidden="true"> *</span>
                      <span className="sprout-schema-sr-only">, required</span>
                    </span>
                  )}
                </span>
                <span className="sprout-schema-field-type">{field.type}</span>
                {field.change && (
                  <span className="sprout-schema-sr-only">
                    , {field.change}
                  </span>
                )}
              </div>
              {field.detail && (
                <p className="sprout-schema-field-detail" title={field.detail}>
                  {field.detail}
                </p>
              )}
              <Handle
                id={field.id}
                type="source"
                position={vertical ? Position.Bottom : Position.Right}
                isConnectable={false}
                className="sprout-schema-handle"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LinkLine({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<LinkEdge>) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
    offset: 24,
  });
  return (
    <>
      <BaseEdge id={id} path={path} />
      {data?.label && (
        <EdgeLabelRenderer>
          <span
            aria-hidden="true"
            className="nodrag nopan sprout-schema-link-label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {data.label}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { table: TableCard };
const edgeTypes = { link: LinkLine };

const keyboardHint =
  "Arrow keys pan, plus and minus zoom, and 0 fits the diagram. Tab moves between tables.";

function DiagramFlow({
  nodes,
  edges,
  direction,
  label,
  hintId,
}: {
  nodes: TableNode[];
  edges: LinkEdge[];
  direction: Direction;
  label: string;
  hintId: string;
}) {
  const onKeyDown = useKeyboardView(fitOptions);
  return (
    <ReactFlow
      className="sprout-schema-flow"
      data-slot="schema-diagram-viewport"
      aria-label={label}
      aria-describedby={hintId}
      tabIndex={0}
      onKeyDown={onKeyDown}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={fitOptions}
      minZoom={minZoom}
      maxZoom={maxZoom}
      nodesConnectable={false}
      elementsSelectable={false}
      edgesFocusable={false}
      ariaLabelConfig={{
        "node.a11yDescription.default": keyboardHint,
        "node.a11yDescription.keyboardDisabled": keyboardHint,
      }}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} size={1} />
      <FitOnResize nodes={nodes} fit={fitOptions} />
      <ZoomControls
        position={direction === "vertical" ? "top-right" : "bottom-right"}
        fit={fitOptions}
        className="sprout-schema-controls"
        slot="schema-diagram-controls"
      />
    </ReactFlow>
  );
}

export interface SchemaDiagramProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "role" | "children"
> {
  tables: readonly SchemaTable[];
  links: readonly SchemaLink[];
  /** Names the diagram for assistive tech, such as “Schema diagram for Launch tracker”. */
  label: string;
  /**
   * `auto` stacks tables top to bottom on viewports under 768px and lays them
   * out in columns otherwise.
   */
  layout?: SchemaDiagramLayout | undefined;
}

/**
 * A pan-and-zoom diagram of tables, their fields, and the links between them,
 * with proposed changes marked on each table and field.
 */
export function SchemaDiagram({
  tables,
  links,
  label,
  layout: layoutName = "auto",
  className,
  ...props
}: SchemaDiagramProps) {
  const mobile = useViewportMobile();
  const direction: Direction =
    layoutName === "auto" ? (mobile ? "vertical" : "horizontal") : layoutName;
  const hintId = useId();
  const nodes = useMemo(
    () => layout(tables, links, direction),
    [tables, links, direction],
  );
  const edges = useMemo(() => {
    const names = new Map(tables.map((table) => [table.id, table]));
    return links.map((link): LinkEdge => {
      const source = names.get(link.source);
      const field = source?.fields.find(
        (candidate) => candidate.id === link.field,
      );
      const from = `${source?.label ?? link.source}${field ? ` ${field.label}` : ""}`;
      return {
        id: link.id,
        type: "link",
        source: link.source,
        sourceHandle: link.field,
        target: link.target,
        ariaLabel: `${from} links to ${names.get(link.target)?.label ?? link.target}: ${link.label}`,
        data: { label: link.label },
      };
    });
  }, [tables, links]);
  return (
    <div
      {...props}
      role="figure"
      aria-label={label}
      data-slot="schema-diagram"
      data-layout={direction}
      className={cn("sprout-schema-diagram", className)}
    >
      <p id={hintId} className="sprout-schema-sr-only">
        {keyboardHint}
      </p>
      {/* A new layout direction moves every table, so start a fresh viewport and fit. */}
      <ReactFlowProvider key={direction}>
        <DiagramFlow
          nodes={nodes}
          edges={edges}
          direction={direction}
          label={label}
          hintId={hintId}
        />
      </ReactFlowProvider>
    </div>
  );
}

export interface SchemaLegendProps extends Omit<
  HTMLAttributes<HTMLUListElement>,
  "children"
> {}

/** Explains the change colors, the unique key, and the required mark. */
export function SchemaLegend({ className, ...props }: SchemaLegendProps) {
  return (
    <ul
      aria-label="Legend"
      data-slot="schema-legend"
      {...props}
      className={cn("sprout-schema-legend", className)}
    >
      {schemaChangeNames.map((change) => (
        <li key={change} className="sprout-schema-legend-item">
          <span
            aria-hidden="true"
            data-change={change}
            className="sprout-schema-legend-swatch"
          />
          {change[0]!.toUpperCase() + change.slice(1)}
        </li>
      ))}
      <li className="sprout-schema-legend-item">
        <Key size={11} aria-hidden="true" />
        Unique
      </li>
      <li className="sprout-schema-legend-item">* Required</li>
    </ul>
  );
}
