'use client';

import {
  Background,
  getSmoothStepPath,
  Handle,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useInternalNode,
  useNodesState,
  type Edge,
  type EdgeProps,
  type InternalNode,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
} from '@xyflow/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react';
import { Fingerprint } from 'reicon-react/icons/Fingerprint';
import { Key } from 'reicon-react/icons/Key';
import { Layers } from 'reicon-react/icons/Layers';
import { Link } from 'reicon-react/icons/Link';
import { cn } from '../internal/classes.js';
import {
  FitOnResize,
  flowMaxZoom,
  flowMinZoom,
  useKeyboardView,
  useViewportMobile,
  ZoomControls,
} from '../internal/flow.js';
import { Button } from './button.js';

export const sqlViewerLayoutNames = ['auto', 'horizontal', 'vertical'] as const;
export type SqlViewerLayout = (typeof sqlViewerLayoutNames)[number];
export type SqlViewerCardinality = 'one' | 'many';

export interface SqlViewerOption {
  id: string;
  label: string;
  retired: boolean;
}

/** One field of a TulipFarm table definition (format 2) or table document (format 3). */
export type SqlViewerField = {
  id: string;
  label: string;
  required: boolean;
} & (
  | { kind: 'text'; maxLength: number }
  | { kind: 'numeric'; precision: number; scale: number }
  | { kind: 'boolean' }
  | { kind: 'date' }
  | { kind: 'timestamp'; timezone?: 'UTC' }
  | {
      kind: 'single-select' | 'multi-select';
      options: readonly SqlViewerOption[];
    }
  | {
      kind: 'relationship';
      /** A table name (format 3) or table UUID (format 2), matching a table's `id`. */
      targetTableId: string;
      cardinality: SqlViewerCardinality;
      inverseCardinality: SqlViewerCardinality;
      reverse?: { fieldId: string; label: string } | null;
      onDelete?: 'restrict';
    }
  | {
      kind: 'file';
      cardinality: SqlViewerCardinality;
      access?: 'independent';
    }
);

export interface SqlViewerUniqueKey {
  id: string;
  fieldIds: readonly string[];
}

/** A TulipFarm table definition or table document. Extra keys are ignored. */
export interface SqlViewerTable {
  id: string;
  label: string;
  owningTeamId?: string;
  fields: readonly SqlViewerField[];
  uniqueKeys?: readonly SqlViewerUniqueKey[];
}

type Direction = 'horizontal' | 'vertical';
type Side = 'left' | 'right';
type TableNode = Node<{ table: SqlViewerTable; tone: number }, 'table'>;
type GroupNode = Node<{ label: string; tone: number; count: number }, 'group'>;
type MoreNode = Node<{ tables: SqlViewerTable[] }, 'more'>;
type ViewerNode = TableNode | GroupNode | MoreNode;
type JoinEdge = Edge<
  {
    join: string;
    description: string;
    sourceMany: boolean;
    targetMany: boolean;
  },
  'join'
>;

interface Focus {
  table: string;
  field?: string | undefined;
}

const moreId = '~more';
const groupId = (key: string) => `~group:${key}`;

// Card geometry. The CSS uses the same numbers so layout never waits for a measure.
const cardWidth = 272;
const cardChrome = 4;
const headerHeight = 40;
const rowHeight = 28;
const keysChrome = 36;
const keyHeight = 26;
const colGap = 104;
const rowGap = 32;
const groupPad = 20;
const groupHeader = 44;
const groupGap = 56;
const wrapWidth = 1400;
const tones = 5;

const fitAll = { padding: 0.12, maxZoom: 1 };

const compositeKeys = (table: SqlViewerTable) => (table.uniqueKeys ?? []).filter(key => key.fieldIds.length > 1);

const cardHeight = (table: SqlViewerTable) => {
  const keys = compositeKeys(table).length;
  return cardChrome + headerHeight + (table.fields.length + 1) * rowHeight + (keys ? keysChrome + keys * keyHeight : 0);
};

function columnType(field: SqlViewerField) {
  switch (field.kind) {
    case 'text':
      return `varchar(${field.maxLength})`;
    case 'numeric':
      return `numeric(${field.precision},${field.scale})`;
    case 'timestamp':
      return 'timestamptz';
    case 'single-select':
      return 'enum';
    case 'multi-select':
      return 'enum[]';
    case 'relationship':
      return field.cardinality === 'one' ? 'uuid' : 'uuid[]';
    case 'file':
      return field.cardinality === 'one' ? 'file' : 'file[]';
    default:
      return field.kind;
  }
}

function joinText(from: string, field: string, to: string, many: boolean): string {
  return many ? `${to}.id = ANY(${from}.${field})` : `${from}.${field} = ${to}.id`;
}

interface Block {
  key: string | null;
  label: string;
  tables: SqlViewerTable[];
}

/** Places tables in team groups. Linked tables sit one column right of the tables that link to them. */
function arrange(
  visible: readonly SqlViewerTable[],
  hidden: readonly SqlViewerTable[],
  groups: Readonly<Record<string, string>> | undefined,
  direction: Direction,
): ViewerNode[] {
  const blocks: Block[] = [];
  for (const table of visible) {
    const team = table.owningTeamId;
    const key = team !== undefined && groups?.[team] ? team : null;
    let block = blocks.find(candidate => candidate.key === key);
    if (!block) {
      block = { key, label: key ? groups![key]! : '', tables: [] };
      blocks.push(block);
    }
    block.tables.push(table);
  }

  const nodes: ViewerNode[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let lineHeight = 0;
  let right = 0;
  let bottom = 0;
  let tone = 0;

  for (const block of blocks) {
    const ids = new Set(block.tables.map(table => table.id));
    const depth = new Map(block.tables.map(table => [table.id, 0]));
    if (direction === 'horizontal') {
      for (let pass = 0; pass < block.tables.length; pass++) {
        let moved = false;
        for (const table of block.tables)
          for (const field of table.fields) {
            if (field.kind !== 'relationship') continue;
            const target = field.targetTableId;
            const next = depth.get(table.id)! + 1;
            if (target !== table.id && ids.has(target) && next > depth.get(target)! && next < block.tables.length) {
              depth.set(target, next);
              moved = true;
            }
          }
        if (!moved) break;
      }
    }
    const columnBottoms = new Map<number, number>();
    const placed = block.tables.map(table => {
      const column = depth.get(table.id)!;
      const y = columnBottoms.get(column) ?? 0;
      columnBottoms.set(column, y + cardHeight(table) + rowGap);
      return { table, x: column * (cardWidth + colGap), y };
    });
    const innerWidth = Math.max(...placed.map(item => item.x)) + cardWidth;
    const innerHeight = Math.max(...columnBottoms.values()) - rowGap;
    const framed = block.key !== null;
    const width = framed ? innerWidth + groupPad * 2 : innerWidth;
    const height = framed ? innerHeight + groupHeader + groupPad : innerHeight;

    if (direction === 'horizontal' && cursorX > 0 && cursorX + width > wrapWidth) {
      cursorX = 0;
      cursorY += lineHeight + groupGap;
      lineHeight = 0;
    }
    const blockTone = framed ? (tone++ % tones) + 1 : 0;
    const parent = framed ? groupId(block.key!) : undefined;
    if (framed)
      nodes.push({
        id: parent!,
        type: 'group',
        position: { x: cursorX, y: cursorY },
        width,
        height,
        data: {
          label: block.label,
          tone: blockTone,
          count: block.tables.length,
        },
        dragHandle: '.sprout-sql-group-label',
        focusable: false,
        selectable: false,
      });
    for (const item of placed)
      nodes.push({
        id: item.table.id,
        type: 'table',
        position: framed
          ? { x: groupPad + item.x, y: groupHeader + item.y }
          : { x: cursorX + item.x, y: cursorY + item.y },
        ...(parent ? { parentId: parent, expandParent: true } : {}),
        data: { table: item.table, tone: blockTone },
        ariaRole: 'group',
        ariaLabel: `${item.table.label} table, ${item.table.fields.length + 1} columns`,
        domAttributes: { 'aria-roledescription': 'table card' },
      });

    right = Math.max(right, cursorX + width);
    bottom = Math.max(bottom, cursorY + height);
    if (direction === 'horizontal') {
      cursorX += width + groupGap;
      lineHeight = Math.max(lineHeight, height);
    } else {
      cursorY += height + groupGap;
    }
  }

  if (hidden.length)
    nodes.push({
      id: moreId,
      type: 'more',
      position: direction === 'horizontal' ? { x: right + colGap, y: 0 } : { x: 0, y: bottom + groupGap },
      data: { tables: [...hidden] },
      focusable: false,
    });
  return nodes;
}

function joins(visible: readonly SqlViewerTable[], hidden: readonly SqlViewerTable[]): JoinEdge[] {
  const shown = new Set(visible.map(table => table.id));
  const collapsed = new Set(hidden.map(table => table.id));
  const labels = new Map([...visible, ...hidden].map(table => [table.id, table.label]));
  const node = (id: string) => (shown.has(id) ? id : collapsed.has(id) ? moreId : null);
  const edges: JoinEdge[] = [];
  for (const table of [...visible, ...hidden])
    for (const field of table.fields) {
      if (field.kind !== 'relationship') continue;
      const source = node(table.id);
      const target = node(field.targetTableId);
      if (!source || !target || (source === moreId && target === moreId)) continue;
      const to = labels.get(field.targetTableId)!;
      const sourceMany = field.inverseCardinality === 'many';
      const targetMany = field.cardinality === 'many';
      edges.push({
        id: `${table.id}/${field.id}`,
        type: 'join',
        source,
        sourceHandle: source === moreId ? 'out:right' : `${field.id}:right`,
        target,
        targetHandle: target === moreId ? 'in:left' : 'id:left',
        data: {
          join: joinText(table.label, field.label, to, targetMany),
          description: `${table.label}.${field.label} joins ${to}.id, ${
            sourceMany ? 'many' : 'one'
          } to ${targetMany ? 'many' : 'one'}`,
          sourceMany,
          targetMany,
        },
      });
    }
  return edges;
}

interface ViewerState {
  focus: Focus | null;
  related: ReadonlySet<string>;
  activeEdges: ReadonlySet<string>;
  hover: (focus: Focus | null) => void;
  pin: (focus: Focus) => void;
  expand: () => void;
}

const ViewerContext = createContext<ViewerState | null>(null);
const useViewer = () => useContext(ViewerContext)!;

function sideHandles(type: 'source' | 'target', id: string) {
  return (
    <>
      <Handle
        id={`${id}:left`}
        type={type}
        position={Position.Left}
        isConnectable={false}
        className="sprout-sql-handle"
      />
      <Handle
        id={`${id}:right`}
        type={type}
        position={Position.Right}
        isConnectable={false}
        className="sprout-sql-handle"
      />
    </>
  );
}

function TableCard({ id, data: { table, tone } }: NodeProps<TableNode>) {
  const viewer = useViewer();
  const composite = compositeKeys(table);
  const unique = new Set((table.uniqueKeys ?? []).filter(key => key.fieldIds.length === 1).map(key => key.fieldIds[0]));
  const labels = new Map(table.fields.map(field => [field.id, field.label]));
  const focused = viewer.focus?.table === id;
  return (
    <section
      data-slot="sql-table"
      data-tone={tone}
      data-dimmed={viewer.focus && !viewer.related.has(id) ? '' : undefined}
      data-active={focused ? '' : undefined}
      className="sprout-sql-table"
      onMouseLeave={() => viewer.hover(null)}
    >
      <header className="sprout-sql-table-header">
        <h3 className="sprout-sql-table-title" title={table.label}>
          {table.label}
        </h3>
      </header>
      <ul className="sprout-sql-columns">
        <li className="sprout-sql-column" data-key="primary">
          {sideHandles('target', 'id')}
          <span className="sprout-sql-column-icon">
            <Key size={12} role="img" aria-label="Primary key" />
          </span>
          <span className="sprout-sql-column-name">id</span>
          <span className="sprout-sql-column-type">uuid</span>
        </li>
        {table.fields.map(field => {
          const join = field.kind === 'relationship';
          const type = columnType(field);
          return (
            <li
              key={field.id}
              className="sprout-sql-column"
              data-join={join ? '' : undefined}
              data-active={focused && viewer.focus?.field === field.id ? '' : undefined}
              title={
                field.kind === 'single-select' || field.kind === 'multi-select'
                  ? field.options
                      .filter(option => !option.retired)
                      .map(option => option.label)
                      .join(' · ')
                  : undefined
              }
              onMouseEnter={join ? () => viewer.hover({ table: id, field: field.id }) : undefined}
              onMouseLeave={join ? () => viewer.hover({ table: id }) : undefined}
              onClick={
                join
                  ? event => {
                      event.stopPropagation();
                      viewer.pin({ table: id, field: field.id });
                    }
                  : undefined
              }
            >
              {join && sideHandles('source', field.id)}
              <span className="sprout-sql-column-icon">
                {join ? (
                  <Link size={12} role="img" aria-label="Foreign key" />
                ) : unique.has(field.id) ? (
                  <Fingerprint size={12} role="img" aria-label="Unique" />
                ) : null}
              </span>
              <span className="sprout-sql-column-name" title={field.label}>
                {field.label}
              </span>
              <span className="sprout-sql-column-type">
                {type}
                {!field.required && (
                  <>
                    <span aria-hidden="true">?</span>
                    <span className="sprout-sql-sr-only">, nullable</span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {composite.length > 0 && (
        <div className="sprout-sql-keys">
          <p className="sprout-sql-keys-title">Unique keys</p>
          <ul className="sprout-sql-keys-list">
            {composite.map(key => (
              <li key={key.id} className="sprout-sql-key">
                <Fingerprint size={12} aria-hidden="true" />
                <span>{key.fieldIds.map(field => labels.get(field) ?? field).join(', ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function GroupFrame({ data: { label, tone, count } }: NodeProps<GroupNode>) {
  return (
    <section
      data-slot="sql-group"
      data-tone={tone}
      aria-label={`${label}, ${count} ${count === 1 ? 'table' : 'tables'}`}
      className="sprout-sql-group"
    >
      <header className="sprout-sql-group-label">
        <Layers size={14} aria-hidden="true" />
        <span className="sprout-sql-group-name">{label}</span>
        <span className="sprout-sql-group-count">{count}</span>
      </header>
    </section>
  );
}

function MoreCard({ data: { tables } }: NodeProps<MoreNode>) {
  const { expand } = useViewer();
  const names = tables.slice(0, 3).map(table => table.label);
  const rest = tables.length - names.length;
  return (
    <div data-slot="sql-more" className="sprout-sql-more">
      {sideHandles('target', 'in')}
      {sideHandles('source', 'out')}
      <span aria-hidden="true" className="sprout-sql-more-sheet" />
      <span aria-hidden="true" className="sprout-sql-more-sheet" />
      <button
        type="button"
        className="nodrag sprout-sql-more-button"
        onClick={expand}
        aria-label={`Show ${tables.length} more ${
          tables.length === 1 ? 'table' : 'tables'
        }: ${tables.map(table => table.label).join(', ')}`}
      >
        <span className="sprout-sql-more-count">
          +{tables.length} {tables.length === 1 ? 'table' : 'tables'}
        </span>
        <span className="sprout-sql-more-names">
          {names.join(', ')}
          {rest > 0 && ` and ${rest} more`}
        </span>
        <span className="sprout-sql-more-action">Show all</span>
      </button>
    </div>
  );
}

function handlePoint(node: InternalNode, type: 'source' | 'target', id: string) {
  const handle = node.internals.handleBounds?.[type]?.find(candidate => candidate.id === id);
  if (!handle) return null;
  return {
    x: node.internals.positionAbsolute.x + handle.x + handle.width / 2,
    y: node.internals.positionAbsolute.y + handle.y + handle.height / 2,
  };
}

/** A crow's foot for many, a bar for one, drawn outward from the card edge. */
function endMark(x: number, y: number, side: Side, many: boolean) {
  const out = side === 'right' ? 1 : -1;
  return many
    ? `M ${x + out * 12} ${y} L ${x} ${y - 6} M ${x + out * 12} ${y} L ${x} ${y + 6}`
    : `M ${x + out * 9} ${y - 5} L ${x + out * 9} ${y + 5}`;
}

// Picks the facing sides of the two cards on every render, so links stay tidy while tables are dragged.
function JoinLine({ id, source, target, sourceHandleId, targetHandleId, data }: EdgeProps<JoinEdge>) {
  const from = useInternalNode(source);
  const to = useInternalNode(target);
  const viewer = useViewer();
  if (!from || !to || !data || !sourceHandleId || !targetHandleId) return null;
  const fromLeft = from.internals.positionAbsolute.x;
  const toLeft = to.internals.positionAbsolute.x;
  const fromRight = fromLeft + (from.measured.width ?? 0);
  const toRight = toLeft + (to.measured.width ?? 0);
  const [sourceSide, targetSide]: [Side, Side] =
    fromRight + 24 <= toLeft ? ['right', 'left'] : toRight + 24 <= fromLeft ? ['left', 'right'] : ['right', 'right'];
  const base = (handle: string) => handle.slice(0, handle.lastIndexOf(':'));
  const start = handlePoint(from, 'source', `${base(sourceHandleId)}:${sourceSide}`);
  const end = handlePoint(to, 'target', `${base(targetHandleId)}:${targetSide}`);
  if (!start || !end) return null;
  const position = (side: Side) => (side === 'right' ? Position.Right : Position.Left);
  const [path] = getSmoothStepPath({
    sourceX: start.x,
    sourceY: start.y,
    sourcePosition: position(sourceSide),
    targetX: end.x,
    targetY: end.y,
    targetPosition: position(targetSide),
    borderRadius: 10,
    offset: 28,
  });
  const active = viewer.activeEdges.has(id);
  return (
    <path
      d={`${path} ${endMark(start.x, start.y, sourceSide, data.sourceMany)} ${endMark(
        end.x,
        end.y,
        targetSide,
        data.targetMany,
      )}`}
      className="react-flow__edge-path sprout-sql-join"
      data-active={active ? '' : undefined}
      data-dimmed={viewer.focus && !active ? '' : undefined}
    />
  );
}

const nodeTypes = { table: TableCard, group: GroupFrame, more: MoreCard };
const edgeTypes = { join: JoinLine };

const keyboardHint =
  "Arrow keys pan, plus and minus zoom, and 0 fits the diagram. Tab moves between tables; Enter pins a table's joins.";

function ViewerFlow({
  layoutNodes,
  edges,
  direction,
  label,
  hintId,
  expanded,
  setExpanded,
  collapsible,
  maxVisible,
}: {
  layoutNodes: ViewerNode[];
  edges: JoinEdge[];
  direction: Direction;
  label: string;
  hintId: string;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  collapsible: boolean;
  maxVisible: number;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<ViewerNode>(layoutNodes);
  useEffect(() => setNodes(layoutNodes), [layoutNodes, setNodes]);

  const [hovered, setHovered] = useState<Focus | null>(null);
  const [pinned, setPinned] = useState<Focus | null>(null);
  const focus = hovered ?? pinned;
  const pin = useCallback(
    (next: Focus) =>
      setPinned(current => (current?.table === next.table && current.field === next.field ? null : next)),
    [],
  );
  const state = useMemo<ViewerState>(() => {
    const activeEdges = new Set<string>();
    const related = new Set<string>();
    if (focus) {
      related.add(focus.table);
      for (const edge of edges) {
        const hit = focus.field
          ? edge.id === `${focus.table}/${focus.field}`
          : edge.source === focus.table || edge.target === focus.table;
        if (!hit) continue;
        activeEdges.add(edge.id);
        related.add(edge.source).add(edge.target);
      }
    }
    return {
      focus,
      related,
      activeEdges,
      hover: setHovered,
      pin,
      expand: () => setExpanded(true),
    };
  }, [focus, edges, pin, setExpanded]);

  const shownEdges = useMemo(
    () =>
      state.activeEdges.size
        ? edges.map(edge => (state.activeEdges.has(edge.id) ? { ...edge, zIndex: 1000 } : edge))
        : edges,
    [edges, state.activeEdges],
  );

  // Phones fit the first block to the width and let people pan down; wider panes fit everything.
  const fitFirst = useMemo(
    () =>
      direction === 'vertical' && layoutNodes[0]
        ? { padding: 0.06, maxZoom: 1, nodes: [{ id: layoutNodes[0].id }] }
        : fitAll,
    [direction, layoutNodes],
  );

  const keyboardView = useKeyboardView(fitAll);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const id = target.dataset['id'];
    if ((event.key === 'Enter' || event.key === ' ') && target.classList.contains('react-flow__node-table') && id) {
      event.preventDefault();
      pin({ table: id });
      return;
    }
    if (event.key === 'Escape' && pinned) {
      setPinned(null);
      return;
    }
    keyboardView(event);
  };
  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    const id = event.target.dataset['id'];
    if (event.target.classList.contains('react-flow__node-table') && id) setHovered({ table: id });
  };
  const onNodeMouseEnter: NodeMouseHandler<ViewerNode> = (_, node) => {
    if (node.type === 'table') setHovered({ table: node.id });
  };
  const onNodeClick: NodeMouseHandler<ViewerNode> = (_, node) => {
    if (node.type === 'table') pin({ table: node.id });
  };

  return (
    <ViewerContext.Provider value={state}>
      <ReactFlow<ViewerNode, JoinEdge>
        className="sprout-schema-flow sprout-sql-flow"
        data-slot="sql-viewer-viewport"
        data-focus={focus ? '' : undefined}
        aria-label={label}
        aria-describedby={hintId}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={() => setHovered(null)}
        nodes={nodes}
        edges={shownEdges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeClick={onNodeClick}
        onPaneClick={() => setPinned(null)}
        fitView
        fitViewOptions={fitFirst}
        minZoom={flowMinZoom}
        maxZoom={flowMaxZoom}
        nodesConnectable={false}
        elementsSelectable={false}
        edgesFocusable={false}
        ariaLabelConfig={{
          'node.a11yDescription.default': keyboardHint,
          'node.a11yDescription.keyboardDisabled': keyboardHint,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
        <FitOnResize nodes={layoutNodes} fit={fitFirst} />
        {collapsible && expanded && (
          <Panel position="top-left" data-slot="sql-viewer-collapse">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPinned(null);
                setExpanded(false);
              }}
            >
              Show {maxVisible} tables
            </Button>
          </Panel>
        )}
        {state.activeEdges.size > 0 && (
          <Panel position="bottom-left" data-slot="sql-viewer-joins" aria-hidden="true" className="sprout-sql-joins">
            {edges
              .filter(edge => state.activeEdges.has(edge.id))
              .slice(0, 3)
              .map(edge => (
                <code key={edge.id} className="sprout-sql-join-text">
                  {edge.data!.join}
                </code>
              ))}
            {state.activeEdges.size > 3 && (
              <span className="sprout-sql-joins-more">and {state.activeEdges.size - 3} more</span>
            )}
          </Panel>
        )}
        <ZoomControls
          position={direction === 'vertical' ? 'top-right' : 'bottom-right'}
          fit={fitAll}
          className="sprout-schema-controls"
          slot="sql-viewer-controls"
        />
      </ReactFlow>
    </ViewerContext.Provider>
  );
}

export interface SqlViewerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children'> {
  /** TulipFarm table definitions or table documents, in display order. */
  tables: readonly SqlViewerTable[];
  /** Names the diagram for assistive tech, such as “Tables in Sales”. */
  label: string;
  /** Team names by `owningTeamId`. Tables of a named team sit in one tinted group. */
  groups?: Readonly<Record<string, string>> | undefined;
  /** Tables shown before the rest collapse into one “+N tables” card. Default 4. */
  maxVisible?: number | undefined;
  /** `auto` stacks tables under 768px and uses columns otherwise. */
  layout?: SqlViewerLayout | undefined;
}

/**
 * A pan-and-zoom map of SQL tables, their columns and keys, and the joins
 * between them. Hover or pin a table or a foreign key to trace its joins.
 */
export function SqlViewer({
  tables,
  label,
  groups,
  maxVisible = 4,
  layout = 'auto',
  className,
  ...props
}: SqlViewerProps) {
  const mobile = useViewportMobile();
  const direction: Direction = layout === 'auto' ? (mobile ? 'vertical' : 'horizontal') : layout;
  const hintId = useId();
  const [expanded, setExpanded] = useState(false);
  const limit = Math.max(1, Math.floor(maxVisible));
  const collapsible = tables.length > limit;
  const [visible, hidden] = useMemo(
    () => (collapsible && !expanded ? [tables.slice(0, limit), tables.slice(limit)] : [tables, []]),
    [tables, limit, collapsible, expanded],
  );
  const layoutNodes = useMemo(() => arrange(visible, hidden, groups, direction), [visible, hidden, groups, direction]);
  const edges = useMemo(() => joins(visible, hidden), [visible, hidden]);
  const descriptions = joins(tables, []);
  return (
    <div
      {...props}
      role="figure"
      aria-label={label}
      data-slot="sql-viewer"
      data-layout={direction}
      className={cn('sprout-sql-viewer', className)}
    >
      <p id={hintId} className="sprout-sql-sr-only">
        {keyboardHint}
      </p>
      {descriptions.length > 0 && (
        <ul aria-label="Joins" className="sprout-sql-sr-only">
          {descriptions.map(edge => (
            <li key={edge.id}>{edge.data!.description}</li>
          ))}
        </ul>
      )}
      {tables.length === 0 ? (
        <p className="sprout-sql-empty">No tables to show</p>
      ) : (
        // A new layout direction moves every table, so start a fresh viewport.
        <ReactFlowProvider key={direction}>
          <ViewerFlow
            layoutNodes={layoutNodes}
            edges={edges}
            direction={direction}
            label={label}
            hintId={hintId}
            expanded={expanded}
            setExpanded={setExpanded}
            collapsible={collapsible}
            maxVisible={limit}
          />
        </ReactFlowProvider>
      )}
    </div>
  );
}
