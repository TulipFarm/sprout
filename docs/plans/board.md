# Board

A config-driven Kanban board: `<Board columns lanes items />`. No public parts, like `Table`.

## Decisions

- Rows are **lanes** (swimlanes). Each lane crosses every column. A card sits in one cell: lane × column. Without `lanes`, the board is one lane and shows no lane bars.
- **Drag**: cards move to any cell and position; columns reorder by header. Lanes do not drag. Keyboard drag: Space picks up, arrows move, Space drops, Escape cancels.
- **Inline edit**: click a card title or column title to rename (Enter saves, Escape cancels). "Add card" at the end of each cell, "Add column" at the end of the header row. Full editing stays in the app (Sheet or Dialog via `onItemOpen`).
- **Extras**: collapse columns and lanes; column WIP `limit` with "Over limit" in words; card actions menu (`itemActions`); multi-select with Cmd/Ctrl/Shift-click and drag selected cards together; delete column with an Alert Dialog; toolbar with search and a "Lanes by" select.
- **Virtualization**: lanes virtualize down the board, cards virtualize inside each cell. Columns all render. Built on `@tanstack/react-virtual`. The dragged card's lane and row always stay rendered.
- Order of cards in a cell is their order in `items`. Every change comes back as a new `items` array through `onItemsChange`.

## API

```ts
<Board
  columns={[{ id, title, limit? }]}
  lanes={[{ id, title }]}            // optional
  items={[{ id, columnId, laneId?, title, ...yours }]}
  onItemsChange={setItems}           // moves, renames, column delete
  onColumnsChange={setColumns}       // reorder, rename, delete
  onItemAdd={({ title, columnId, laneId }) => …}
  onColumnAdd={(title) => …}
  onItemOpen={(item) => …}
  renderCard={(item) => <Badge … />} // body under the title
  itemActions={(item) => <DropdownMenuItem … />}
  searchable
  laneBy={{ value, options, onChange }}
/>
```

## Files

- `packages/sprout/src/components/board.tsx`, `packages/sprout/src/styles/board.css`, export in `index.ts`, `package.json`, `styles/index.css`
- `apps/docs/src/components/BoardDemo.tsx`, `apps/docs/src/pages/components/board.astro`, nav entry
- `skills/sprout/SKILL.md`, `skills/sprout/references/components.md`, `GLOSSARY.md`
- `tests/board.test.tsx`, `tests/browser/board.browser.test.tsx`
