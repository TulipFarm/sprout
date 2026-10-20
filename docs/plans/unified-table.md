# Unified Table

One `<Table data columns />` replaces the `Table` parts and `DataList`. TanStack Table runs underneath. See [ADR 0001](../adr/0001-one-table-component.md) and the Table terms in [GLOSSARY.md](../../GLOSSARY.md).

## Decisions

| #   | Topic              | Decision                                                                                                                                                                               |
| --- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | API                | Config only: `<Table data columns … />`. The old parts become internal.                                                                                                                |
| 2   | Narrow screens     | `narrow="scroll"` (default) or `"stack"` (the DataList card layout).                                                                                                                   |
| 3   | Data mode          | Client side by default. `manual` passes sort, filter, and page to the server.                                                                                                          |
| 4   | URL state          | Controlled `state` / `onStateChange`. `useTableUrlState()` lives in `@tulipfarm/sprout/table-nuqs`. nuqs is an optional peer dependency.                                               |
| 5   | v1 features        | All of them: core, column layout, data shaping, editing, and scale.                                                                                                                    |
| 6   | Editing            | Row edit. An Edit action opens editors for the whole row, with Save and Cancel. `onRowSave(row, changes)` can be async; if it rejects, the row stays in edit mode and shows the error. |
| 7   | Filters            | Toolbar with search, a "+ Filter" button, and filter chips.                                                                                                                            |
| 8   | New dependencies   | `@tanstack/react-table`, `@tanstack/react-virtual`, `@dnd-kit/core`, `@dnd-kit/sortable`.                                                                                              |
| 9   | Layout persistence | `persistKey` saves the Layout to localStorage. No key means nothing is saved.                                                                                                          |
| 10  | Migration          | Hard switch. Delete the old exports and rewrite every demo.                                                                                                                            |
| 11  | Group by           | Group rows that open and close, with value, count, and column totals. Groups can nest and start open.                                                                                  |
| 12  | DataList extras    | Keep `getRowHref` / `onRowClick`, `onRowDrop`, column `hint`, and the pinned `actions` column.                                                                                         |

## Shape

```
<Table data columns …>
 ├─ Toolbar       search · filter chips · Group ▾ · Columns ▾
 ├─ Header        sort (multi) · resize · reorder (dnd-kit) · pin · hint
 ├─ Body          select boxes · group rows · sub-rows · row edit
 │                virtual rows (react-virtual) · row drag · row link · file drop
 ├─ Footer        pagination · totals
 └─ narrow        scroll | stack
state/onStateChange ──► useTableUrlState()  (table-nuqs entry)
persistKey          ──► localStorage (Layout only)
manual              ──► server does sort/filter/page
```

## Draft API

```tsx
type TableColumn<Row> = {
  key: keyof Row & string;
  header: string;
  hint?: string;
  cell?: (row: Row) => ReactNode;
  align?: 'left' | 'right';
  width?: number;
  sort?: boolean;
  filter?: 'text' | 'number' | 'select' | 'date' | 'boolean';
  filterOptions?: { label: string; value: string }[];
  edit?: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  aggregate?: 'sum' | 'count' | 'min' | 'max' | 'mean';
  pin?: 'left' | 'right';
  hidden?: boolean;
};

interface TableProps<Row> {
  'aria-label': string;
  data: Row[];
  columns: TableColumn<Row>[];
  getRowId: (row: Row) => string;
  narrow?: 'scroll' | 'stack';
  variant?: 'plain' | 'grid';
  manual?: boolean;
  rowCount?: number;
  state?: Partial<TableState>;
  onStateChange?: (state: TableState) => void;
  persistKey?: string;
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  pageSize?: number;
  virtual?: boolean;
  onRowReorder?: (from: number, to: number) => void;
  getSubRows?: (row: Row) => Row[] | undefined;
  onRowSave?: (row: Row, changes: Partial<Row>) => void | Promise<void>;
  getRowHref?: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  onRowDrop?: (row: Row, files: File[]) => void;
  actions?: (row: Row) => ReactNode;
  loading?: boolean;
  empty?: ReactNode;
}
```

`TableState` holds the View state (sorting, columnFilters, globalFilter, grouping, expanded, pagination) and the Layout (columnSizing, columnOrder, columnPinning, columnVisibility).

## Steps

1. Add the dependencies to `packages/sprout/package.json`. Add the `./table-nuqs` export and the optional `nuqs` peer dependency.
2. Rewrite `packages/sprout/src/components/table.tsx` as the new `Table`. Keep the current markup and classes so the UI looks the same. Turn the old parts into internal pieces.
3. Move the stack layout from `src/styles/data-list.css` into `src/styles/table.css`, under `[data-narrow="stack"]`.
4. Build the features one at a time. After each one, add tests to `tests/table.test.tsx`:
   1. sorting, selection, pagination, column visibility, and search
   2. resizing, reordering, and pinning
   3. Toolbar filters with chips, group rows with totals, and sub-rows
   4. row edit
   5. virtual rows and row drag
   6. row link, file drop, hints, and the actions column
   7. `persistKey`, plus the `table-nuqs` entry with `useTableUrlState()`
5. Delete `src/components/data-list.tsx`, `src/styles/data-list.css`, `tests/data-list.test.tsx`, and the DataList export in `src/index.ts`.
6. Rewrite these demos in `apps/docs/src`: TableDemo, DataListDemo, SkeletonDemo, CanvasDemo, HomePreview, SheetPatternsDemo, and StatePanelSamplesDemo. Remove `pages/components/data-list.astro` or turn it into a redirect.
7. Run checks one at a time: `pnpm vitest run tests/table.test.tsx`, then `pnpm typecheck`, then the Playwright and axe browser tests for the table page.
8. Take before and after screenshots with agent-browser for the PR.

## Accessibility

- Keep `aria-sort` and the sort button names from the current `TableSortHead`.
- Every checkbox, edit control, drag handle, and resize handle can be used with the keyboard.
- dnd-kit uses its keyboard sensor. A column resize handle moves with the Arrow keys.
- Group rows use `aria-expanded`. Virtual rows set `aria-rowcount` and `aria-rowindex`.
