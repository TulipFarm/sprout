"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  aggregationFn_count,
  aggregationFn_max,
  aggregationFn_mean,
  aggregationFn_min,
  aggregationFn_sum,
  columnFilteringFeature,
  columnGroupingFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  constructFilterFn,
  createExpandedRowModel,
  createFilteredRowModel,
  createGroupedRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_equals,
  filterFn_inDateRange,
  filterFn_inNumberRange,
  filterFn_includesString,
  functionalUpdate,
  globalFilteringFeature,
  rowAggregationFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type ColumnVisibilityState,
  type ExpandedState,
  type GroupingState,
  type Header,
  type PaginationState,
  type Row,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown } from "reicon-react/icons/ArrowDown";
import { ArrowUp } from "reicon-react/icons/ArrowUp";
import { ChevronDown } from "reicon-react/icons/ChevronDown";
import { ChevronRight } from "reicon-react/icons/ChevronRight";
import { InfoCircle } from "reicon-react/icons/InfoCircle";
import { Plus } from "reicon-react/icons/Plus";
import { Reorder } from "reicon-react/icons/Reorder";
import { SortV } from "reicon-react/icons/SortV";
import { X } from "reicon-react/icons/X";
import { cn } from "../internal/classes.js";
import { Button } from "./button.js";
import { Checkbox } from "./checkbox.js";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu.js";
import { Input } from "./input.js";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.js";
import { ScrollArea } from "./scroll-area.js";
import { SearchField } from "./search-field.js";
import { Skeleton } from "./skeleton.js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip.js";

export const tableVariantNames = ["plain", "grid"] as const;
export const tableNarrowNames = ["scroll", "stack"] as const;
export const tableAlignNames = ["left", "right"] as const;
export const tableFilterNames = [
  "text",
  "number",
  "select",
  "date",
  "boolean",
] as const;
export const tableEditNames = [
  "text",
  "number",
  "select",
  "date",
  "checkbox",
] as const;
export const tableAggregateNames = [
  "sum",
  "count",
  "min",
  "max",
  "mean",
] as const;

export type TableVariant = (typeof tableVariantNames)[number];
export type TableNarrow = (typeof tableNarrowNames)[number];
export type TableAlign = (typeof tableAlignNames)[number];
export type TableFilter = (typeof tableFilterNames)[number];
export type TableEdit = (typeof tableEditNames)[number];
export type TableAggregate = (typeof tableAggregateNames)[number];

export interface TableOption {
  label: string;
  value: string;
}

export interface TableColumn<Row> {
  key: keyof Row & string;
  header: string;
  /** Shows an info button next to the header whose tooltip explains the column. */
  hint?: string;
  /** Custom cell content. Sorting, filtering, and editing still use `row[key]`. */
  cell?: (row: Row) => ReactNode;
  /** `"right"` aligns numbers and dates to the end of the column. */
  align?: TableAlign;
  /** Starting width in pixels. Columns without one share the free space. */
  width?: number;
  sort?: boolean;
  filter?: TableFilter;
  /** Choices for `filter: "select"` and `edit: "select"`. */
  options?: TableOption[];
  edit?: TableEdit;
  /** Lets people group rows by this column from the Toolbar. */
  group?: boolean;
  /** Shown on group rows and in the footer total row. */
  aggregate?: TableAggregate;
  /** Formats aggregate values. Defaults to `toLocaleString()`. */
  formatAggregate?: (value: number) => ReactNode;
  pin?: "left" | "right";
  hidden?: boolean;
}

/**
 * The View state (sort, filters, search, grouping, page) and the Layout
 * (widths, order, pinning, hidden columns).
 */
export interface TableState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  globalFilter: string;
  grouping: GroupingState;
  expanded: ExpandedState;
  pagination: PaginationState;
  columnSizing: ColumnSizingState;
  columnOrder: ColumnOrderState;
  columnPinning: ColumnPinningState;
  columnVisibility: ColumnVisibilityState;
}

export const tableLayoutKeys = [
  "columnSizing",
  "columnOrder",
  "columnPinning",
  "columnVisibility",
] as const satisfies readonly (keyof TableState)[];

export interface TableProps<Row> {
  /** Names the table, and the scrolling region when it overflows. */
  "aria-label": string;
  data: Row[];
  columns: TableColumn<Row>[];
  getRowId: (row: Row) => string;
  /** Names a row in control labels, like "Select Invoices". Defaults to the row id. */
  rowLabel?: (row: Row) => string;
  /**
   * `"plain"` is borderless. `"grid"` frames the table in a bordered
   * `ScrollArea` capped at 60dvh, with column dividers and a pinned header.
   */
  variant?: TableVariant;
  /** On narrow containers, `"scroll"` scrolls sideways and `"stack"` turns rows into cards. */
  narrow?: TableNarrow;
  caption?: ReactNode;
  /** The server sorts, filters, and pages. Pass `rowCount` and handle `onStateChange`. */
  manual?: boolean;
  rowCount?: number;
  /** Controls any part of the state. Anything left out stays internal. */
  state?: Partial<TableState>;
  onStateChange?: (state: TableState) => void;
  /** Saves the Layout to localStorage under this key. */
  persistKey?: string;
  /** Shows a search field in the Toolbar. */
  searchable?: boolean;
  /** Shows the Columns menu for hiding, pinning, and resetting columns. */
  columnMenu?: boolean;
  resizable?: boolean;
  /** Lets people drag column headers to reorder them. */
  reorderable?: boolean;
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  /** Splits rows into pages of this size. */
  pageSize?: number;
  /** Renders only the rows in view, inside a scroll box capped at 60dvh. */
  virtual?: boolean;
  /** Adds drag handles to rows. Indexes are positions in `data`. */
  onRowReorder?: (from: number, to: number) => void;
  getSubRows?: (row: Row) => Row[] | undefined;
  /** Adds an Edit action that opens Row edit. A rejected promise keeps the row open and shows the error. */
  onRowSave?: (row: Row, changes: Partial<Row>) => void | Promise<void>;
  /** Makes the first cell a link whose hit area covers the row. */
  getRowHref?: (row: Row) => string;
  /** Makes the first cell a button whose hit area covers the row. */
  onRowClick?: (row: Row) => void;
  /** Accepts files dragged onto a row. */
  onRowDrop?: (row: Row, files: File[]) => void;
  /** Content for the pinned trailing actions cell. */
  actions?: (row: Row) => ReactNode;
  loading?: boolean;
  empty?: ReactNode;
  className?: string;
}

// dnd-kit's live region is a div; inside <table> it breaks the table roles.
const dndAccessibility = {
  container: typeof document === "undefined" ? undefined : document.body,
};

const isAnyOf = constructFilterFn({
  filter: (dataValue: unknown, filterValue: string[]) =>
    filterValue.includes(String(dataValue)),
  autoRemove: (value: string[] | undefined) => !value?.length,
});

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  columnGroupingFeature,
  rowAggregationFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnResizingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  groupedRowModel: createGroupedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: {
    includesString: filterFn_includesString,
    inNumberRange: filterFn_inNumberRange,
    inDateRange: filterFn_inDateRange,
    equals: filterFn_equals,
    isAnyOf,
  },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    text: sortFn_text,
    datetime: sortFn_datetime,
    basic: sortFn_basic,
  },
  aggregationFns: {
    sum: aggregationFn_sum,
    count: aggregationFn_count,
    min: aggregationFn_min,
    max: aggregationFn_max,
    mean: aggregationFn_mean,
  },
});

type Features = typeof features;
type TRow<R extends RowData> = Row<Features, R>;
type TColumn<R extends RowData> = Column<Features, R>;

const filterFnFor = {
  text: "includesString",
  number: "inNumberRange",
  select: "isAnyOf",
  date: "inDateRange",
  boolean: "equals",
} as const;

const DEFAULT_PAGE_SIZE = 10;

const pageResetKeys = new Set<keyof TableState>([
  "sorting",
  "columnFilters",
  "globalFilter",
  "grouping",
]);

function initialState<R extends RowData>(
  columns: TableColumn<R>[],
  pageSize: number | undefined,
): TableState {
  return {
    sorting: [],
    columnFilters: [],
    globalFilter: "",
    grouping: [],
    expanded: true,
    pagination: { pageIndex: 0, pageSize: pageSize ?? DEFAULT_PAGE_SIZE },
    columnSizing: {},
    columnOrder: [],
    columnPinning: {
      start: columns.filter((c) => c.pin === "left").map((c) => c.key),
      end: columns.filter((c) => c.pin === "right").map((c) => c.key),
    },
    columnVisibility: Object.fromEntries(
      columns.filter((c) => c.hidden).map((c) => [c.key, false]),
    ),
  };
}

const storageKey = (key: string) => `sprout-table:${key}`;

function readLayout(key: string): Partial<TableState> {
  try {
    const raw = localStorage.getItem(storageKey(key));
    return raw ? (JSON.parse(raw) as Partial<TableState>) : {};
  } catch {
    return {};
  }
}

function writeLayout(key: string, state: TableState) {
  try {
    localStorage.setItem(
      storageKey(key),
      JSON.stringify(
        Object.fromEntries(tableLayoutKeys.map((k) => [k, state[k]])),
      ),
    );
  } catch {
    // Storage can be full or blocked; the Layout then lasts for this visit only.
  }
}

type Editing = {
  id: string;
  draft: Record<string, unknown>;
  error?: string;
  saving?: boolean;
};

/**
 * A data table. Pass rows and column settings; it renders the header, body,
 * Toolbar, and footer, and runs sorting, filtering, grouping, selection,
 * paging, Row edit, and Layout changes for you.
 */
export function Table<R extends RowData>(props: TableProps<R>) {
  const {
    data,
    columns,
    getRowId,
    rowLabel = getRowId,
    variant = "plain",
    narrow = "scroll",
    caption,
    manual = false,
    rowCount,
    onStateChange,
    persistKey,
    searchable = false,
    columnMenu = false,
    resizable = false,
    reorderable = false,
    selectable = false,
    onSelectionChange,
    pageSize,
    virtual = false,
    onRowReorder,
    getSubRows,
    onRowSave,
    getRowHref,
    onRowClick,
    onRowDrop,
    actions,
    loading = false,
    empty,
    className,
  } = props;
  const label = props["aria-label"];

  const [inner, setInner] = useState(() => initialState(columns, pageSize));
  const state: TableState = { ...inner, ...props.state };
  const stateRef = useRef(state);
  stateRef.current = state;

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [editing, setEditing] = useState<Editing | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [pinOffsets, setPinOffsets] = useState<PinOffsets>({});
  const headRowRef = useRef<HTMLTableRowElement>(null);
  const anchorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!persistKey) return;
    const saved = readLayout(persistKey);
    if (Object.keys(saved).length) setInner((prev) => ({ ...prev, ...saved }));
  }, [persistKey]);

  const setSlice =
    <K extends keyof TableState>(key: K) =>
    (updater: Updater<TableState[K]>) => {
      const next = {
        ...stateRef.current,
        [key]: functionalUpdate(updater, stateRef.current[key]),
      };
      if (pageResetKeys.has(key) && next.pagination.pageIndex !== 0) {
        next.pagination = { ...next.pagination, pageIndex: 0 };
      }
      stateRef.current = next;
      setInner(next);
      if (persistKey && (tableLayoutKeys as readonly string[]).includes(key)) {
        writeLayout(persistKey, next);
      }
      onStateChange?.(next);
    };

  const byKey = useMemo(
    () => new Map(columns.map((c) => [c.key as string, c])),
    [columns],
  );

  const columnDefs = useMemo(
    () =>
      columns.map((c): ColumnDef<Features, R> => ({
        id: c.key,
        accessorFn: (row) => row[c.key],
        header: c.header,
        enableSorting: c.sort ?? false,
        sortDescFirst: false,
        enableColumnFilter: !!c.filter,
        enableGrouping: c.group ?? false,
        ...(c.filter ? { filterFn: filterFnFor[c.filter] } : {}),
        ...(c.aggregate ? { aggregationFn: c.aggregate } : {}),
        ...(c.width ? { size: c.width } : {}),
      })),
    [columns],
  );

  const table = useTable({
    features,
    columns: columnDefs,
    data,
    getRowId,
    ...(getSubRows ? { getSubRows } : {}),
    state: { ...state, rowSelection },
    onSortingChange: setSlice("sorting"),
    onColumnFiltersChange: setSlice("columnFilters"),
    onGlobalFilterChange: setSlice("globalFilter"),
    onGroupingChange: setSlice("grouping"),
    onExpandedChange: setSlice("expanded"),
    onPaginationChange: setSlice("pagination"),
    onColumnSizingChange: setSlice("columnSizing"),
    onColumnOrderChange: setSlice("columnOrder"),
    onColumnPinningChange: setSlice("columnPinning"),
    onColumnVisibilityChange: setSlice("columnVisibility"),
    onRowSelectionChange: (updater) => {
      const next = functionalUpdate(updater, rowSelection);
      setRowSelection(next);
      onSelectionChange?.(Object.keys(next).filter((id) => next[id]));
    },
    globalFilterFn: "includesString",
    groupedColumnMode: "remove",
    // The reset would use TanStack's empty default, closing every group on each search.
    autoResetExpanded: false,
    // TanStack resets on every new state array (inline or URL state) and never in manual mode; setSlice resets instead.
    autoResetPageIndex: false,
    columnResizeMode: "onChange",
    enableMultiSort: true,
    manualSorting: manual,
    manualFiltering: manual,
    manualPagination: manual || !pageSize,
    ...(rowCount !== undefined ? { rowCount } : {}),
  });

  const rows = table.getRowModel().rows;
  // getVisibleLeafColumns keeps the column order but ignores pinning; the header follows pinning.
  const leafColumns = [
    ...table.getStartVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ];
  const editable = !!onRowSave && columns.some((c) => c.edit);
  const hasActions = !!actions || editable;
  const draggableRows =
    !!onRowReorder &&
    state.sorting.length === 0 &&
    state.grouping.length === 0 &&
    state.columnFilters.length === 0 &&
    !state.globalFilter;
  const totals =
    columns.some((c) => c.aggregate) && !loading && rows.length > 0;
  const colSpan =
    leafColumns.length +
    (selectable ? 1 : 0) +
    (onRowReorder ? 1 : 0) +
    (hasActions ? 1 : 0);
  const sized = resizable || columns.some((c) => c.width);
  const pinsStart = !!state.columnPinning.start?.length;
  const pinned = pinsStart || !!state.columnPinning.end?.length;
  const pinLayout = `${leafColumns.map((c) => `${c.id}:${c.getIsPinned()}`).join()}|${selectable}|${!!onRowReorder}|${hasActions}`;

  useLayoutEffect(() => {
    const row = headRowRef.current;
    if (!pinned || !row) return;
    const observer = new ResizeObserver(() => {
      const next = measurePinOffsets(Array.from(row.children) as HTMLElement[]);
      setPinOffsets((prev) =>
        JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
      );
    });
    for (const cell of row.children) observer.observe(cell);
    return () => observer.disconnect();
  }, [pinned, pinLayout]);

  const selectRow = (row: TRow<R>, checked: boolean, range: boolean) => {
    const ids = rows
      .filter((r) => !r.getIsGrouped() && r.getCanSelect())
      .map((r) => r.id);
    const from = anchorRef.current ? ids.indexOf(anchorRef.current) : -1;
    const to = ids.indexOf(row.id);
    if (range && from !== -1 && to !== -1) {
      const span = ids.slice(Math.min(from, to), Math.max(from, to) + 1);
      table.setRowSelection((prev) => {
        const next = { ...prev };
        for (const id of span) {
          if (checked) next[id] = true;
          else delete next[id];
        }
        return next;
      });
    } else {
      row.toggleSelected(checked);
    }
    anchorRef.current = row.id;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: virtual ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 41,
    overscan: 8,
    initialRect: { width: 0, height: 600 },
  });
  const virtualItems = virtualizer.getVirtualItems();
  const visibleRows = virtual
    ? virtualItems.flatMap((item) => rows[item.index] ?? [])
    : rows;
  const paddingTop = virtual ? (virtualItems[0]?.start ?? 0) : 0;
  const paddingBottom = virtual
    ? virtualizer.getTotalSize() - (virtualItems.at(-1)?.end ?? 0)
    : 0;

  const startEdit = (row: TRow<R>) =>
    setEditing({
      id: row.id,
      draft: Object.fromEntries(
        columns.filter((c) => c.edit).map((c) => [c.key, row.original[c.key]]),
      ),
    });

  const saveEdit = async (row: TRow<R>) => {
    if (!editing || !onRowSave) return;
    const changes = Object.fromEntries(
      Object.entries(editing.draft).filter(
        ([key, value]) => row.original[key as keyof R] !== value,
      ),
    ) as Partial<R>;
    setEditing({ ...editing, saving: true });
    try {
      await onRowSave(row.original, changes);
      setEditing(null);
    } catch (error) {
      setEditing({
        ...editing,
        saving: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const onColumnDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const order = state.columnOrder.length
      ? state.columnOrder
      : table.getAllLeafColumns().map((c) => c.id);
    table.setColumnOrder(
      arrayMove(
        order,
        order.indexOf(String(active.id)),
        order.indexOf(String(over.id)),
      ),
    );
  };

  const onRowDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !onRowReorder) return;
    const ids = data.map(getRowId);
    onRowReorder(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
  };

  const toolbar =
    searchable || columns.some((c) => c.filter || c.group) || columnMenu;

  const allPageSelected = table.getIsAllPageRowsSelected();
  const somePageSelected = table.getIsSomePageRowsSelected();
  const stack = narrow === "stack";
  const role = (value: string) => (stack ? value : undefined);

  const header = (
    <thead
      data-slot="table-header"
      className="sprout-table-header"
      role={role("rowgroup")}
    >
      <DndContext
        sensors={sensors}
        accessibility={dndAccessibility}
        collisionDetection={closestCenter}
        onDragEnd={onColumnDragEnd}
      >
        <SortableContext
          items={leafColumns.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          <tr
            ref={headRowRef}
            data-slot="table-row"
            className="sprout-table-row"
            role={role("row")}
          >
            {onRowReorder && (
              <th
                className="sprout-table-head"
                data-selection=""
                data-column-id="__reorder"
                role={role("columnheader")}
              >
                <span className="sprout-table-sr-only">Reorder</span>
              </th>
            )}
            {selectable && (
              <th
                className="sprout-table-head"
                data-selection=""
                data-column-id="__select"
                role={role("columnheader")}
              >
                <Checkbox
                  aria-label="Select all rows"
                  checked={allPageSelected}
                  indeterminate={!allPageSelected && somePageSelected}
                  onCheckedChange={(checked) =>
                    table.toggleAllPageRowsSelected(checked)
                  }
                />
              </th>
            )}
            {table
              .getFlatHeaders()
              .map((h) =>
                h.column.getIsVisible() ? (
                  <HeadCell
                    key={h.id}
                    header={h}
                    config={byKey.get(h.column.id)}
                    resizable={resizable}
                    reorderable={reorderable}
                    sized={sized}
                    role={role("columnheader")}
                  />
                ) : null,
              )}
            {hasActions && (
              <th
                className="sprout-table-head"
                data-sticky-end=""
                data-column-id="__actions"
                role={role("columnheader")}
              >
                <span className="sprout-table-sr-only">Actions</span>
              </th>
            )}
          </tr>
        </SortableContext>
      </DndContext>
    </thead>
  );

  const body = (
    <tbody
      data-slot="table-body"
      className="sprout-table-body"
      role={role("rowgroup")}
    >
      {paddingTop > 0 && (
        <tr aria-hidden="true">
          <td colSpan={colSpan} style={{ height: paddingTop, padding: 0 }} />
        </tr>
      )}
      {loading ? (
        Array.from({ length: 3 }, (_, i) => (
          <tr
            key={i}
            className="sprout-table-row"
            data-loading-row=""
            role={role("row")}
          >
            {onRowReorder && (
              <td className="sprout-table-cell" data-selection="" />
            )}
            {selectable && (
              <td className="sprout-table-cell" data-selection="">
                <Skeleton shape="checkbox" />
              </td>
            )}
            {leafColumns.map((c) => (
              <td key={c.id} className="sprout-table-cell" role={role("cell")}>
                <Skeleton />
              </td>
            ))}
            {hasActions && (
              <td className="sprout-table-cell" data-sticky-end="">
                <Skeleton shape="action" />
              </td>
            )}
          </tr>
        ))
      ) : rows.length === 0 ? (
        <tr className="sprout-table-row" role={role("row")}>
          <td
            className="sprout-table-cell sprout-table-empty"
            colSpan={colSpan}
            role={role("cell")}
          >
            {empty ?? "No results."}
          </td>
        </tr>
      ) : (
        <DndContext
          sensors={sensors}
          accessibility={dndAccessibility}
          collisionDetection={closestCenter}
          onDragEnd={onRowDragEnd}
        >
          <SortableContext
            items={rows.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            {visibleRows.map((row) =>
              row.getIsGrouped() ? (
                <GroupRow
                  key={row.id}
                  row={row}
                  columns={leafColumns}
                  byKey={byKey}
                  selectable={selectable}
                  reorder={!!onRowReorder}
                  hasActions={hasActions}
                  rowIndex={virtual ? row.index + 2 : undefined}
                  role={role}
                />
              ) : (
                <BodyRow
                  key={row.id}
                  row={row}
                  columns={leafColumns}
                  byKey={byKey}
                  label={rowLabel(row.original)}
                  selectable={selectable}
                  onSelect={(checked, range) => selectRow(row, checked, range)}
                  reorder={onRowReorder ? draggableRows : undefined}
                  editing={editing?.id === row.id ? editing : null}
                  editable={editable}
                  onEditChange={(key, value) =>
                    setEditing(
                      (prev) =>
                        prev && {
                          ...prev,
                          draft: { ...prev.draft, [key]: value },
                        },
                    )
                  }
                  onEdit={() => startEdit(row)}
                  onSave={() => void saveEdit(row)}
                  onCancel={() => setEditing(null)}
                  actions={actions}
                  hasActions={hasActions}
                  href={getRowHref?.(row.original)}
                  onOpen={
                    onRowClick ? () => onRowClick(row.original) : undefined
                  }
                  drop={
                    onRowDrop
                      ? {
                          active: dropTarget === row.id,
                          set: (on) => setDropTarget(on ? row.id : null),
                          onDrop: (files) => onRowDrop(row.original, files),
                        }
                      : undefined
                  }
                  colSpan={colSpan}
                  rowIndex={virtual ? row.index + 2 : undefined}
                  role={role}
                />
              ),
            )}
          </SortableContext>
        </DndContext>
      )}
      {paddingBottom > 0 && (
        <tr aria-hidden="true">
          <td colSpan={colSpan} style={{ height: paddingBottom, padding: 0 }} />
        </tr>
      )}
    </tbody>
  );

  const footer = totals && (
    <tfoot
      data-slot="table-footer"
      className="sprout-table-footer"
      role={role("rowgroup")}
    >
      <tr className="sprout-table-row" role={role("row")}>
        {onRowReorder && <td className="sprout-table-cell" data-selection="" />}
        {selectable && <td className="sprout-table-cell" data-selection="" />}
        {leafColumns.map((c, index) => {
          const config = byKey.get(c.id);
          return (
            <td
              key={c.id}
              className="sprout-table-cell"
              data-align={config?.align ?? "left"}
              data-label={config?.header}
              role={role("cell")}
              style={pinStyle(c, sized, pinOffsets)}
              data-pinned={c.getIsPinned() || undefined}
            >
              {config?.aggregate
                ? formatAggregate(config, c.getAggregationValue())
                : index === 0
                  ? "Total"
                  : null}
            </td>
          );
        })}
        {hasActions && <td className="sprout-table-cell" data-sticky-end="" />}
      </tr>
    </tfoot>
  );

  const tableElement = (
    <table
      data-slot="table"
      data-variant={variant}
      data-narrow={narrow}
      data-sized={sized || undefined}
      data-pin-start={pinsStart || undefined}
      className="sprout-table"
      aria-label={label}
      aria-rowcount={virtual ? rows.length + 1 : undefined}
      aria-busy={loading || undefined}
      role={role("table")}
      style={{
        ...(sized ? { minWidth: table.getTotalSize() } : {}),
        ...(pinOffsets.__select !== undefined
          ? { "--sprout-table-select-start": `${pinOffsets.__select}px` }
          : {}),
      }}
    >
      {caption && (
        <caption data-slot="table-caption" className="sprout-table-caption">
          {caption}
        </caption>
      )}
      <PinOffsetsContext value={pinOffsets}>
        {header}
        {body}
      </PinOffsetsContext>
      {footer}
    </table>
  );

  const pageCount = table.getPageCount();

  return (
    <TooltipProvider>
      <div
        data-slot="table-root"
        className={cn("sprout-table-root", className)}
      >
        {toolbar && (
          <Toolbar
            table={table}
            columns={columns}
            label={label}
            searchable={searchable}
            columnMenu={columnMenu}
            onReset={() => {
              const reset = initialState(columns, pageSize);
              for (const key of tableLayoutKeys)
                setSlice(key)(reset[key] as never);
            }}
          />
        )}
        {virtual ? (
          <div
            ref={scrollRef}
            data-slot="table-container"
            data-virtual=""
            className="sprout-table-container"
            tabIndex={0}
            role="region"
            aria-label={label}
          >
            {tableElement}
          </div>
        ) : variant === "grid" ? (
          <ScrollArea
            variant="table"
            orientation="both"
            viewportLabel={label}
            data-slot="table-container"
          >
            {tableElement}
          </ScrollArea>
        ) : (
          <PlainContainer label={label}>{tableElement}</PlainContainer>
        )}
        {pageSize && pageCount > 1 && (
          <nav className="sprout-table-pages" aria-label={`${label} pages`}>
            <span aria-live="polite">
              Page {state.pagination.pageIndex + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </Button>
          </nav>
        )}
      </div>
    </TooltipProvider>
  );
}

type PinOffsets = Record<string, number>;

const PinOffsetsContext = createContext<PinOffsets>({});

/** Sticky offsets from the real header cell widths, so columns without a set width pin in the right place. */
function measurePinOffsets(cells: HTMLElement[]): PinOffsets {
  const offsets: PinOffsets = {};
  let start = 0;
  for (const cell of cells) {
    const id = cell.dataset.columnId;
    if (
      !id ||
      (cell.dataset.selection === undefined && cell.dataset.pinned !== "start")
    )
      continue;
    offsets[id] = start;
    start += cell.getBoundingClientRect().width;
  }
  let end = 0;
  for (const cell of [...cells].reverse()) {
    const id = cell.dataset.columnId;
    if (
      !id ||
      (cell.dataset.stickyEnd === undefined && cell.dataset.pinned !== "end")
    )
      continue;
    offsets[id] = end;
    end += cell.getBoundingClientRect().width;
  }
  return offsets;
}

function pinStyle<R extends RowData>(
  column: TColumn<R>,
  sized: boolean,
  offsets: PinOffsets,
): CSSProperties | undefined {
  const pinned = column.getIsPinned();
  const width = sized ? column.getSize() : undefined;
  if (!pinned) return width ? { width } : undefined;
  return pinned === "start"
    ? {
        width,
        insetInlineStart: offsets[column.id] ?? column.getStart("start"),
      }
    : { width, insetInlineEnd: offsets[column.id] ?? column.getAfter("end") };
}

function formatAggregate<R extends RowData>(
  config: TableColumn<R>,
  value: unknown,
): ReactNode {
  if (typeof value !== "number") return null;
  return config.formatAggregate
    ? config.formatAggregate(value)
    : value.toLocaleString();
}

/** Joins the Tab order only while the table is wider than its container, so keyboard users can scroll it. */
function PlainContainer({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const measure = () =>
      setOverflowing(element.scrollWidth > element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      data-slot="table-container"
      data-overflowing={overflowing || undefined}
      className="sprout-table-container"
      tabIndex={overflowing ? 0 : undefined}
      role={overflowing ? "region" : undefined}
      aria-label={overflowing ? label : undefined}
    >
      {children}
    </div>
  );
}

function HeadCell<R extends RowData>({
  header,
  config,
  resizable,
  reorderable,
  sized,
  role,
}: {
  header: Header<Features, R>;
  config: TableColumn<R> | undefined;
  resizable: boolean;
  reorderable: boolean;
  sized: boolean;
  role: string | undefined;
}) {
  const column = header.column;
  const title = config?.header ?? column.id;
  const align = config?.align ?? "left";
  const sorted = column.getIsSorted();
  const sortable = column.getCanSort();
  const sortable_ = useSortable({ id: column.id, disabled: !reorderable });
  const pinned = column.getIsPinned();
  const offsets = useContext(PinOffsetsContext);
  const style: CSSProperties = {
    ...pinStyle(column, sized, offsets),
    ...(reorderable && sortable_.transform
      ? {
          transform: CSS.Translate.toString(sortable_.transform),
          transition: sortable_.transition,
        }
      : {}),
  };
  const next = column.getNextSortingOrder();
  const hint =
    sorted === "asc"
      ? `, ascending. ${next === "desc" ? "Select for descending" : "Select to clear"}`
      : sorted === "desc"
        ? `, descending. ${next === "asc" ? "Select for ascending" : "Select to clear"}`
        : "";
  const Icon =
    sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : SortV;

  const onResizeKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 40 : 10;
    const delta =
      event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0;
    if (!delta) return;
    event.preventDefault();
    column.table.setColumnSizing((prev) => ({
      ...prev,
      [column.id]: Math.max(48, column.getSize() + delta),
    }));
  };

  return (
    <th
      ref={reorderable ? sortable_.setNodeRef : undefined}
      data-slot="table-head"
      data-align={align}
      data-pinned={pinned || undefined}
      data-column-id={column.id}
      data-dragging={sortable_.isDragging || undefined}
      className="sprout-table-head"
      aria-sort={
        sorted === "asc"
          ? "ascending"
          : sorted === "desc"
            ? "descending"
            : undefined
      }
      role={role}
      style={style}
    >
      <span className="sprout-table-head-inner">
        {reorderable && (
          <button
            type="button"
            className="sprout-table-handle"
            aria-label={`Move ${title} column`}
            {...sortable_.attributes}
            {...sortable_.listeners}
          >
            <Reorder size={14} aria-hidden="true" />
          </button>
        )}
        {sortable ? (
          <Button
            variant={sorted ? "secondary" : "ghost"}
            size={align === "right" ? "column-header-end" : "column-header"}
            aria-label={`Sort by ${title}${hint}`}
            title={sorted ? undefined : "Sort ascending"}
            onClick={column.getToggleSortingHandler()}
          >
            {title}
            <Icon size={14} aria-hidden="true" />
          </Button>
        ) : (
          title
        )}
        {config?.hint && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={`About ${title}`}
                  className="sprout-table-hint"
                />
              }
            >
              <InfoCircle size={14} aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>{config.hint}</TooltipContent>
          </Tooltip>
        )}
      </span>
      {resizable && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${title} column`}
          aria-valuenow={column.getSize()}
          aria-valuemin={48}
          tabIndex={0}
          className="sprout-table-resizer"
          data-resizing={column.getIsResizing() || undefined}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onKeyDown={onResizeKey}
          onDoubleClick={() => column.resetSize()}
        />
      )}
    </th>
  );
}

function GroupRow<R extends RowData>({
  row,
  columns,
  byKey,
  selectable,
  reorder,
  hasActions,
  rowIndex,
  role,
}: {
  row: TRow<R>;
  columns: TColumn<R>[];
  byKey: Map<string, TableColumn<R>>;
  selectable: boolean;
  reorder: boolean;
  hasActions: boolean;
  rowIndex: number | undefined;
  role: (value: string) => string | undefined;
}) {
  const groupColumn = byKey.get(row.groupingColumnId ?? "");
  const value = row.groupingValue;
  const option = groupColumn?.options?.find((o) => o.value === String(value));
  const name =
    option?.label ?? (value == null || value === "" ? "None" : String(value));
  const expanded = row.getIsExpanded();
  const leafRows = row.getLeafRows().filter((r) => !r.getIsGrouped());
  const offsets = useContext(PinOffsetsContext);
  return (
    <tr
      data-slot="table-row"
      data-group=""
      className="sprout-table-row"
      aria-rowindex={rowIndex}
      role={role("row")}
    >
      {reorder && <td className="sprout-table-cell" data-selection="" />}
      {selectable && <td className="sprout-table-cell" data-selection="" />}
      {columns.map((column, index) => {
        const config = byKey.get(column.id);
        return (
          <td
            key={column.id}
            className="sprout-table-cell"
            data-align={index === 0 ? "left" : (config?.align ?? "left")}
            data-pinned={column.getIsPinned() || undefined}
            role={role("cell")}
            style={pinStyle(column, false, offsets)}
          >
            {index === 0 ? (
              <button
                type="button"
                className="sprout-table-toggle"
                aria-expanded={expanded}
                onClick={row.getToggleExpandedHandler()}
                style={{ paddingInlineStart: row.depth * 16 }}
              >
                {expanded ? (
                  <ChevronDown size={14} aria-hidden="true" />
                ) : (
                  <ChevronRight size={14} aria-hidden="true" />
                )}
                <span className="sprout-table-group-name">
                  {groupColumn?.header}: {name}
                </span>
                <span className="sprout-table-group-count">
                  {leafRows.length}
                </span>
              </button>
            ) : config?.aggregate ? (
              formatAggregate(
                config,
                column.getAggregationValue({ rows: leafRows }),
              )
            ) : null}
          </td>
        );
      })}
      {hasActions && <td className="sprout-table-cell" data-sticky-end="" />}
    </tr>
  );
}

interface BodyRowProps<R extends RowData> {
  row: TRow<R>;
  columns: TColumn<R>[];
  byKey: Map<string, TableColumn<R>>;
  label: string;
  selectable: boolean;
  /** `range` is true on Shift+click, to set every row since the last one picked. */
  onSelect: (checked: boolean, range: boolean) => void;
  /** `undefined` hides the handle column; `false` shows it disabled. */
  reorder: boolean | undefined;
  editing: Editing | null;
  editable: boolean;
  onEditChange: (key: string, value: unknown) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  actions: ((row: R) => ReactNode) | undefined;
  hasActions: boolean;
  href: string | undefined;
  onOpen: (() => void) | undefined;
  drop:
    | {
        active: boolean;
        set: (on: boolean) => void;
        onDrop: (files: File[]) => void;
      }
    | undefined;
  colSpan: number;
  rowIndex: number | undefined;
  role: (value: string) => string | undefined;
}

function BodyRow<R extends RowData>({
  row,
  columns,
  byKey,
  label,
  selectable,
  onSelect,
  reorder,
  editing,
  editable,
  onEditChange,
  onEdit,
  onSave,
  onCancel,
  actions,
  hasActions,
  href,
  onOpen,
  drop,
  colSpan,
  rowIndex,
  role,
}: BodyRowProps<R>) {
  const sortable = useSortable({ id: row.id, disabled: !reorder });
  const selected = row.getIsSelected();
  const offsets = useContext(PinOffsetsContext);
  const hasFiles = (event: DragEvent) =>
    event.dataTransfer.types.includes("Files");

  const onKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (!editing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    } else if (
      event.key === "Enter" &&
      event.target instanceof HTMLInputElement
    ) {
      event.preventDefault();
      onSave();
    }
  };

  return (
    <>
      <tr
        ref={reorder !== undefined ? sortable.setNodeRef : undefined}
        data-slot="table-row"
        data-state={selected ? "selected" : undefined}
        data-editing={editing ? "" : undefined}
        data-drop-target={drop?.active || undefined}
        data-linked={href || onOpen ? "" : undefined}
        data-dragging={sortable.isDragging || undefined}
        className="sprout-table-row"
        aria-rowindex={rowIndex}
        aria-selected={selectable ? selected : undefined}
        role={role("row")}
        style={
          sortable.transform
            ? {
                transform: CSS.Translate.toString(sortable.transform),
                transition: sortable.transition,
              }
            : undefined
        }
        onKeyDown={onKeyDown}
        onDragOver={
          drop
            ? (event) => {
                if (!hasFiles(event)) return;
                event.preventDefault();
                if (!drop.active) drop.set(true);
              }
            : undefined
        }
        onDragLeave={
          drop
            ? (event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                )
                  drop.set(false);
              }
            : undefined
        }
        onDrop={
          drop
            ? (event) => {
                if (!hasFiles(event)) return;
                event.preventDefault();
                drop.set(false);
                drop.onDrop(Array.from(event.dataTransfer.files));
              }
            : undefined
        }
      >
        {reorder !== undefined && (
          <td
            className="sprout-table-cell"
            data-selection=""
            role={role("cell")}
          >
            <button
              type="button"
              className="sprout-table-handle"
              aria-label={`Move ${label}`}
              disabled={!reorder}
              title={
                reorder
                  ? undefined
                  : "Clear sorting, filters, and grouping to reorder"
              }
              {...sortable.attributes}
              {...sortable.listeners}
            >
              <Reorder size={14} aria-hidden="true" />
            </button>
          </td>
        )}
        {selectable && (
          <td
            className="sprout-table-cell"
            data-selection=""
            role={role("cell")}
          >
            <Checkbox
              aria-label={`Select ${label}`}
              checked={selected}
              disabled={!row.getCanSelect()}
              onCheckedChange={(checked, details) =>
                onSelect(
                  checked,
                  (details.event as MouseEvent | KeyboardEvent).shiftKey ===
                    true,
                )
              }
            />
          </td>
        )}
        {columns.map((column, index) => {
          const config = byKey.get(column.id);
          const content = config?.cell
            ? config.cell(row.original)
            : (row.getValue(column.id) as ReactNode);
          const first = index === 0;
          const canExpand = first && row.getCanExpand();
          return (
            <td
              key={column.id}
              data-slot="table-cell"
              data-align={config?.align ?? "left"}
              data-pinned={column.getIsPinned() || undefined}
              data-label={config?.header}
              className="sprout-table-cell"
              role={role("cell")}
              style={pinStyle(column, false, offsets)}
            >
              {editing && config?.edit ? (
                <Editor
                  config={config}
                  label={`${config.header} for ${label}`}
                  value={editing.draft[column.id]}
                  onChange={(value) => onEditChange(column.id, value)}
                  autoFocus={
                    first ||
                    columns.findIndex((c) => byKey.get(c.id)?.edit) === index
                  }
                />
              ) : first ? (
                <span
                  className="sprout-table-first"
                  style={
                    row.depth
                      ? { paddingInlineStart: row.depth * 16 }
                      : undefined
                  }
                >
                  {canExpand && (
                    <button
                      type="button"
                      className="sprout-table-toggle"
                      aria-expanded={row.getIsExpanded()}
                      aria-label={`${row.getIsExpanded() ? "Collapse" : "Expand"} ${label}`}
                      onClick={row.getToggleExpandedHandler()}
                    >
                      {row.getIsExpanded() ? (
                        <ChevronDown size={14} aria-hidden="true" />
                      ) : (
                        <ChevronRight size={14} aria-hidden="true" />
                      )}
                    </button>
                  )}
                  {href ? (
                    <a className="sprout-table-link" href={href}>
                      {content}
                    </a>
                  ) : onOpen ? (
                    <button
                      type="button"
                      className="sprout-table-link"
                      onClick={onOpen}
                    >
                      {content}
                    </button>
                  ) : (
                    content
                  )}
                </span>
              ) : (
                content
              )}
            </td>
          );
        })}
        {hasActions && (
          <td
            className="sprout-table-cell"
            data-sticky-end=""
            role={role("cell")}
          >
            <span className="sprout-table-actions">
              {editing ? (
                <>
                  <Button size="sm" disabled={editing.saving} onClick={onSave}>
                    {editing.saving ? "Saving" : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={editing.saving}
                    onClick={onCancel}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  {editable && (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Edit ${label}`}
                      onClick={onEdit}
                    >
                      Edit
                    </Button>
                  )}
                  {actions?.(row.original)}
                </>
              )}
            </span>
          </td>
        )}
      </tr>
      {editing?.error && (
        <tr className="sprout-table-row" data-error-row="" role={role("row")}>
          <td
            colSpan={colSpan}
            className="sprout-table-cell sprout-table-error"
            role="alert"
          >
            {editing.error}
          </td>
        </tr>
      )}
    </>
  );
}

function Editor<R extends RowData>({
  config,
  label,
  value,
  onChange,
  autoFocus,
}: {
  config: TableColumn<R>;
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  autoFocus: boolean;
}) {
  if (config.edit === "checkbox") {
    return (
      <Checkbox
        aria-label={label}
        checked={Boolean(value)}
        onCheckedChange={(checked) => onChange(checked)}
        autoFocus={autoFocus}
      />
    );
  }
  if (config.edit === "select") {
    return (
      <select
        aria-label={label}
        className="sprout-table-select"
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        autoFocus={autoFocus}
      >
        {config.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <Input
      aria-label={label}
      type={
        config.edit === "number"
          ? "number"
          : config.edit === "date"
            ? "date"
            : "text"
      }
      value={value == null ? "" : String(value)}
      onValueChange={(next) =>
        onChange(
          config.edit === "number" ? (next === "" ? null : Number(next)) : next,
        )
      }
      autoFocus={autoFocus}
      className="sprout-table-input"
    />
  );
}

type AnyTable<R extends RowData> = ReturnType<typeof useTable<Features, R>>;

function Toolbar<R extends RowData>({
  table,
  columns,
  label,
  searchable,
  columnMenu,
  onReset,
}: {
  table: AnyTable<R>;
  columns: TableColumn<R>[];
  label: string;
  searchable: boolean;
  columnMenu: boolean;
  onReset: () => void;
}) {
  const [pending, setPending] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const filters = table.state.columnFilters;
  const filterable = columns.filter((c) => c.filter);
  const groupable = columns.filter((c) => c.group);
  const grouping = table.state.grouping;
  const chips = filterable.filter(
    (c) => pending.includes(c.key) || filters.some((f) => f.id === c.key),
  );

  return (
    <div
      className="sprout-table-toolbar"
      role="toolbar"
      aria-label={`${label} tools`}
    >
      {searchable && (
        <SearchField
          label={`Search ${label}`}
          value={String(table.state.globalFilter ?? "")}
          onChange={(value) => table.setGlobalFilter(value)}
        />
      )}
      {chips.map((c) => {
        const column = table.getColumn(c.key);
        if (!column) return null;
        return (
          <span key={c.key} className="sprout-table-chip">
            <Popover
              open={open === c.key}
              onOpenChange={(next) => setOpen(next ? c.key : null)}
            >
              <PopoverTrigger className="sprout-table-chip-label">
                {c.header}
                {describeFilter(c, column.getFilterValue())}
              </PopoverTrigger>
              <PopoverContent align="start">
                <FilterEditor config={c} column={column} />
              </PopoverContent>
            </Popover>
            <button
              type="button"
              className="sprout-table-chip-remove"
              aria-label={`Remove ${c.header} filter`}
              onClick={() => {
                column.setFilterValue(undefined);
                setPending((p) => p.filter((k) => k !== c.key));
              }}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        );
      })}
      {filterable.length > chips.length && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
            <Plus size={14} aria-hidden="true" />
            Filter
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" size="menu">
            {filterable
              .filter((c) => !chips.includes(c))
              .map((c) => (
                <DropdownMenuItem
                  key={c.key}
                  onClick={() => {
                    setPending((p) => [...p, c.key]);
                    setOpen(c.key);
                  }}
                >
                  {c.header}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <span className="sprout-table-toolbar-end">
        {groupable.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              {grouping.length ? `Group: ${grouping.length}` : "Group"}
              <ChevronDown size={14} aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" size="menu">
              {groupable.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={grouping.includes(c.key)}
                  onCheckedChange={() =>
                    table.getColumn(c.key)?.toggleGrouping()
                  }
                >
                  {c.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {columnMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              Columns
              <ChevronDown size={14} aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" size="menu">
              {columns.map((c) => {
                const column = table.getColumn(c.key);
                if (!column) return null;
                return (
                  <DropdownMenuSub key={c.key}>
                    <DropdownMenuSubTrigger>{c.header}</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuCheckboxItem
                        checked={column.getIsVisible()}
                        onCheckedChange={(checked) =>
                          column.toggleVisibility(checked)
                        }
                      >
                        Show
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup
                        value={column.getIsPinned() || "none"}
                        onValueChange={(value) =>
                          column.pin(
                            value === "none"
                              ? false
                              : (value as "start" | "end"),
                          )
                        }
                      >
                        <DropdownMenuRadioItem value="none">
                          Not pinned
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="start">
                          Pin to start
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="end">
                          Pin to end
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onReset}>
                Reset columns
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </span>
    </div>
  );
}

function describeFilter<R extends RowData>(
  config: TableColumn<R>,
  value: unknown,
): string {
  if (value === undefined) return "";
  if (config.filter === "select" && Array.isArray(value)) {
    const labels = value.map(
      (v) => config.options?.find((o) => o.value === v)?.label ?? String(v),
    );
    return `: ${labels.join(", ")}`;
  }
  if (
    (config.filter === "number" || config.filter === "date") &&
    Array.isArray(value)
  ) {
    const [min, max] = value as [unknown, unknown];
    const has = (v: unknown) => v !== undefined && v !== null && v !== "";
    if (has(min) && has(max)) return `: ${min} – ${max}`;
    if (has(min)) return `: ≥ ${min}`;
    if (has(max)) return `: ≤ ${max}`;
    return "";
  }
  if (config.filter === "boolean") return `: ${value ? "Yes" : "No"}`;
  return `: ${String(value)}`;
}

function FilterEditor<R extends RowData>({
  config,
  column,
}: {
  config: TableColumn<R>;
  column: TColumn<R>;
}) {
  const value = column.getFilterValue();
  const name = config.header;
  if (config.filter === "select") {
    const selected = (value as string[] | undefined) ?? [];
    return (
      <fieldset className="sprout-table-filter">
        <legend>{name}</legend>
        {config.options?.map((o) => (
          <label key={o.value} className="sprout-table-filter-option">
            <Checkbox
              variant="neutral"
              checked={selected.includes(o.value)}
              onCheckedChange={(checked) =>
                column.setFilterValue(
                  checked
                    ? [...selected, o.value]
                    : selected.filter((v) => v !== o.value),
                )
              }
            />
            {o.label}
          </label>
        ))}
      </fieldset>
    );
  }
  if (config.filter === "boolean") {
    return (
      <fieldset className="sprout-table-filter">
        <legend>{name}</legend>
        {[true, false].map((option) => (
          <label key={String(option)} className="sprout-table-filter-option">
            <input
              type="radio"
              name={`${column.id}-filter`}
              checked={value === option}
              onChange={() => column.setFilterValue(option)}
            />
            {option ? "Yes" : "No"}
          </label>
        ))}
      </fieldset>
    );
  }
  if (config.filter === "number" || config.filter === "date") {
    const [min, max] = (value as [unknown, unknown] | undefined) ?? [
      undefined,
      undefined,
    ];
    const type = config.filter === "number" ? "number" : "date";
    const set = (index: 0 | 1, next: string) => {
      const parsed =
        next === "" ? undefined : type === "number" ? Number(next) : next;
      const range: [unknown, unknown] =
        index === 0 ? [parsed, max] : [min, parsed];
      column.setFilterValue(
        range[0] === undefined && range[1] === undefined ? undefined : range,
      );
    };
    return (
      <fieldset className="sprout-table-filter" data-range="">
        <legend>{name}</legend>
        <Input
          aria-label={`${name} from`}
          type={type}
          value={min == null ? "" : String(min)}
          onValueChange={(next) => set(0, next)}
        />
        <Input
          aria-label={`${name} to`}
          type={type}
          value={max == null ? "" : String(max)}
          onValueChange={(next) => set(1, next)}
        />
      </fieldset>
    );
  }
  return (
    <Input
      aria-label={`${name} contains`}
      autoFocus
      value={String(value ?? "")}
      onValueChange={(next) => column.setFilterValue(next || undefined)}
    />
  );
}
