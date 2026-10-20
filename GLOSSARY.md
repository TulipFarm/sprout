# Sprõut

Sprõut is a React component library. This glossary covers the shared words for its components.

## Table

**Table**:
The one component for showing rows of records in columns. It replaces every other table-like component.
_Avoid_: Data grid, data list, data table

**Column**:
One field of a record shown down the Table, with its header, width, and rules for sort, filter, edit, and group.
_Avoid_: Field, header

**Narrow layout**:
How a Table looks on a small screen: it scrolls sideways (scroll) or turns each row into a card (stack).
_Avoid_: Mobile mode, responsive mode

**Toolbar**:
The bar above a Table with search, filter chips, group, and column controls.
_Avoid_: Header bar, controls

**Filter chip**:
One active filter shown in the Toolbar, which the user can edit or remove.
_Avoid_: Tag, pill

**Group row**:
A full-width row that heads one group of rows. It shows the group value, the row count, and column totals, and it opens or closes.
_Avoid_: Section header, aggregate row

**Row edit**:
The state where one whole row shows editors, with Save and Cancel.
_Avoid_: Inline edit, cell edit

**View state**:
The parts of a Table a user can share by URL: sort, filters, search, grouping, and page.
_Avoid_: Query state, table state

**Layout**:
The parts of a Table a user can save on their own device: column widths, order, pinning, and hidden columns.
_Avoid_: Preferences, settings

## Board

**Board**:
A Kanban view: columns across, lanes down, and cards in the cells where they meet. Use it when the column is the status of the work.
_Avoid_: Kanban, task board

**Lane**:
One row across every column of a Board, such as one person or one priority.
_Avoid_: Swimlane, row, group

**Cell**:
The place where one Board column and one lane meet. It holds a list of cards.
_Avoid_: Bucket, slot

**Limit**:
The most cards a Board column should hold. Over it, the header says "Over limit".
_Avoid_: WIP limit, cap

## Views

**Result notice**:
The strip inside a chart or timeline that says it shows only the first part of the result, such as "Showing the first 100 of 2,431 rows.", and offers Table for the rest.
_Avoid_: Limit notice, truncation warning, cap banner
