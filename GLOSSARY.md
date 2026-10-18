# Sprout

Sprout is a React component library. This glossary covers the shared words for its components.

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
