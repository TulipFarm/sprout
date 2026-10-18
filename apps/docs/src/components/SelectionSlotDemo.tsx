import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Add } from "reicon-react/icons/Add";
import { Book } from "reicon-react/icons/Book";
import { Briefcase } from "reicon-react/icons/Briefcase";
import { ChatRound } from "reicon-react/icons/ChatRound";
import { Download } from "reicon-react/icons/Download";
import { Eye } from "reicon-react/icons/Eye";
import { FileText } from "reicon-react/icons/FileText";
import { Filter } from "reicon-react/icons/Filter";
import { Folder } from "reicon-react/icons/Folder";
import { FolderMove } from "reicon-react/icons/FolderMove";
import { Grid } from "reicon-react/icons/Grid";
import { Kanban } from "reicon-react/icons/Kanban";
import { List } from "reicon-react/icons/List";
import { Search } from "reicon-react/icons/Search";
import { SliderHorizontal } from "reicon-react/icons/SliderHorizontal";
import { Trash } from "reicon-react/icons/Trash";
import { Trash2 } from "reicon-react/icons/Trash2";
import { Button } from "@tulipfarm/sprout/button";
import { Checkbox } from "@tulipfarm/sprout/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@tulipfarm/sprout/dropdown-menu";
import { Label } from "@tulipfarm/sprout/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tulipfarm/sprout/select";
import { SelectionSlot } from "@tulipfarm/sprout/selection-slot";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@tulipfarm/sprout/sheet";
import { Switch } from "@tulipfarm/sprout/switch";
import { ToggleGroup, ToggleGroupItem } from "@tulipfarm/sprout/toggle-group";
import "../styles/selection-slot-demo.css";

function Example({
  title,
  description,
  controls,
  children,
}: {
  title: string;
  description: string;
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="selection-slot-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
        {controls && (
          <div className="selection-slot-demo-controls">{controls}</div>
        )}
      </header>
      <div className="selection-slot-demo-card-body">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Label className="selection-slot-demo-switch">
      <Switch size="sm" checked={checked} onCheckedChange={onChange} />
      {label}
    </Label>
  );
}

/* ------------------------------------------------------------------ */
/* Playground swap                                                     */
/* ------------------------------------------------------------------ */

function SwapExample() {
  const [active, setActive] = useState(true);
  return (
    <Example
      title="Selection toolbar swap"
      description="A button selects sample records and the toolbar becomes the selection. Clear returns focus to the button that opened it."
    >
      <SelectionSlot
        active={active}
        selection={
          <div className="selection-slot-demo-row">
            <span role="status">2 selected</span>
            <Button variant="outline" onClick={() => setActive(false)}>
              Clear selection
            </Button>
          </div>
        }
      >
        <Button variant="outline" onClick={() => setActive(true)}>
          Select example records
        </Button>
      </SelectionSlot>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Table query bar                                                     */
/* ------------------------------------------------------------------ */

const layouts = [
  { value: "table", label: "Table", icon: Grid },
  { value: "board", label: "Board", icon: Kanban },
  { value: "list", label: "List", icon: List },
] as const;
type Layout = (typeof layouts)[number]["value"];

const orders = [
  {
    id: "ord-1042",
    customer: "Amara Osei",
    status: "Paid",
    total: "$1,240.00",
  },
  {
    id: "ord-1043",
    customer: "Lukas Brandt",
    status: "Pending",
    total: "$86.50",
  },
  {
    id: "ord-1044",
    customer: "Priya Natarajan",
    status: "Refunded",
    total: "$312.99",
  },
  {
    id: "ord-1045",
    customer: "Mateo Alvarez",
    status: "Paid",
    total: "$58.00",
  },
];
const columns = ["Customer", "Status", "Total"];

type Export = {
  kind: "idle" | "loading" | "success" | "error";
  message?: string;
};

function BulkRecordActions({
  count,
  disabled,
  canDelete,
  fail,
  clear,
  remove,
}: {
  count: number;
  disabled: boolean;
  canDelete: boolean;
  fail: boolean;
  clear: () => void;
  remove: () => void;
}) {
  const [state, setState] = useState<Export>({ kind: "idle" });
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const run = () => {
    if (state.kind === "loading") return;
    setState({ kind: "loading" });
    timer.current = window.setTimeout(
      () =>
        setState(
          fail
            ? {
                kind: "error",
                message: "Export failed. The connection timed out.",
              }
            : {
                kind: "success",
                message: `Exported ${count} selected ${count === 1 ? "row" : "rows"}.`,
              },
        ),
      900,
    );
  };
  const loading = state.kind === "loading";
  const outcome = state.message ? (
    <span className="selection-slot-demo-outcome">
      <span
        role="status"
        className="selection-slot-demo-outcome-text"
        data-error={state.kind === "error" || undefined}
        title={state.message}
      >
        {state.message}
      </span>
      <Button variant="outline" size="sm" disabled={disabled} onClick={run}>
        {state.kind === "error" ? "Retry export" : "Export again"}
      </Button>
    </span>
  ) : null;
  return (
    <div
      role="group"
      aria-label="Selected row actions"
      className="selection-slot-demo-row"
    >
      <span role="status" className="selection-slot-demo-count">
        {count} selected<span className="sr-only"> on this page</span>
      </span>
      <div className="selection-slot-demo-wide" data-at="sm">
        {outcome ?? (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-busy={loading}
            onClick={run}
          >
            <Download size={16} aria-hidden="true" />
            {loading ? "Exporting..." : "Export selected"}
          </Button>
        )}
        {canDelete && (
          <Button
            variant="destructive"
            size="sm"
            disabled={disabled}
            onClick={remove}
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete selected
          </Button>
        )}
      </div>
      <div className="selection-slot-demo-narrow" data-at="sm">
        {outcome ?? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  aria-busy={loading}
                />
              }
            >
              {loading ? "Exporting..." : "Selected actions"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem disabled={disabled} onClick={run}>
                  Export selected
                </DropdownMenuItem>
                {canDelete && (
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={disabled}
                    onClick={remove}
                  >
                    Delete selected
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {outcome && canDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" disabled={disabled} />
              }
            >
              Actions
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={disabled}
                  onClick={remove}
                >
                  Delete selected
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-label="Clear selection"
        onClick={clear}
      >
        Clear
      </Button>
    </div>
  );
}

function QueryBarExample() {
  const [layout, setLayout] = useState<Layout>("table");
  const [rows, setRows] = useState(orders);
  const [checked, setChecked] = useState<string[]>([]);
  const [shown, setShown] = useState(columns);
  const [disabled, setDisabled] = useState(false);
  const [canDelete, setCanDelete] = useState(true);
  const [fail, setFail] = useState(false);
  const clear = () => setChecked([]);
  const selection =
    layout === "table" && checked.length > 0 ? (
      <BulkRecordActions
        count={checked.length}
        disabled={disabled}
        canDelete={canDelete}
        fail={fail}
        clear={clear}
        remove={() => {
          setRows((list) => list.filter((row) => !checked.includes(row.id)));
          clear();
        }}
      />
    ) : undefined;
  const all = rows.length > 0 && checked.length === rows.length;
  return (
    <Example
      title="Table query bar"
      description="Select rows to swap the table tools for bulk actions. Below 36rem the actions fold into a menu. Board and List have no row selection, so the tools come back."
      controls={
        <>
          <Toggle
            label="Editing a row"
            checked={disabled}
            onChange={setDisabled}
          />
          <Toggle
            label="Can delete"
            checked={canDelete}
            onChange={setCanDelete}
          />
          <Toggle label="Export fails" checked={fail} onChange={setFail} />
        </>
      }
    >
      <div className="selection-slot-demo-query">
        <ToggleGroup
          aria-label="Layout"
          variant="outline"
          size="sm"
          spacing={0}
          value={[layout]}
          disabled={disabled}
          onValueChange={(value) => {
            const next = layouts.find((item) => item.value === value[0]);
            if (next) setLayout(next.value);
          }}
        >
          {layouts.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem key={value} value={value}>
              <Icon size={14} aria-hidden="true" />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="selection-slot-demo-grow">
          <SelectionSlot active={!!selection} selection={selection}>
            <fieldset
              disabled={disabled}
              aria-label="Table tools"
              className="selection-slot-demo-tools"
            >
              <Button variant="outline" size="sm">
                <Search size={14} aria-hidden="true" />
                Search
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" size="sm" />}
                >
                  <Eye size={14} aria-hidden="true" />
                  Columns
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Shown columns</DropdownMenuLabel>
                    {columns.map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column}
                        checked={shown.includes(column)}
                        onCheckedChange={(next) =>
                          setShown((list) =>
                            next
                              ? columns.filter(
                                  (item) =>
                                    item === column || list.includes(item),
                                )
                              : list.filter((item) => item !== column),
                          )
                        }
                      >
                        {column}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              {layout === "table" && (
                <Button variant="outline" size="sm">
                  <SliderHorizontal size={14} aria-hidden="true" />
                  Summary
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Download size={14} aria-hidden="true" />
                Export
              </Button>
              <Button size="sm">
                <Add size={14} aria-hidden="true" />
                Add row
              </Button>
            </fieldset>
          </SelectionSlot>
        </div>
      </div>
      {layout === "table" ? (
        <div className="selection-slot-demo-table-wrap">
          <table className="selection-slot-demo-table">
            <thead>
              <tr>
                <th scope="col">
                  <Checkbox
                    aria-label="Select all rows"
                    checked={all}
                    indeterminate={checked.length > 0 && !all}
                    disabled={disabled}
                    onCheckedChange={(next) =>
                      setChecked(next ? rows.map((order) => order.id) : [])
                    }
                  />
                </th>
                {shown.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={shown.length + 1}
                    className="selection-slot-demo-empty-cell"
                  >
                    No rows left.{" "}
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setRows(orders)}
                    >
                      Restore sample rows
                    </Button>
                  </td>
                </tr>
              )}
              {rows.map((order) => (
                <tr
                  key={order.id}
                  data-selected={checked.includes(order.id) || undefined}
                >
                  <td>
                    <Checkbox
                      aria-label={`Select ${order.customer}`}
                      checked={checked.includes(order.id)}
                      disabled={disabled}
                      onCheckedChange={(next) =>
                        setChecked((list) =>
                          next
                            ? [...list, order.id]
                            : list.filter((id) => id !== order.id),
                        )
                      }
                    />
                  </td>
                  {shown.includes("Customer") && <td>{order.customer}</td>}
                  {shown.includes("Status") && <td>{order.status}</td>}
                  {shown.includes("Total") && (
                    <td className="selection-slot-demo-number">
                      {order.total}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="selection-slot-demo-empty">
          {layout === "board" ? "Board" : "List"} layout. Rows are not
          selectable here.
        </p>
      )}
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Files toolbar                                                       */
/* ------------------------------------------------------------------ */

const sections = [
  { value: "mine", label: "My files" },
  { value: "shared", label: "Shared with me" },
  { value: "trash", label: "Trash" },
] as const;
type Section = (typeof sections)[number]["value"];

type Item = {
  id: string;
  name: string;
  kind: "file" | "folder";
  modified: string;
};
const library: Record<Section, Item[]> = {
  mine: [
    { id: "f1", name: "Q3 planning", kind: "folder", modified: "Sep 30" },
    {
      id: "f2",
      name: "Supplier contract 2026.pdf",
      kind: "file",
      modified: "Oct 12",
    },
    {
      id: "f3",
      name: "Harvest yield forecast — greenhouse north and south wings.xlsx",
      kind: "file",
      modified: "Oct 15",
    },
    { id: "f4", name: "Brand photos", kind: "folder", modified: "Aug 2" },
  ],
  shared: [
    {
      id: "s1",
      name: "Board minutes October.docx",
      kind: "file",
      modified: "Oct 9",
    },
    { id: "s2", name: "Field reports", kind: "folder", modified: "Oct 1" },
  ],
  trash: [
    { id: "t1", name: "Old price list.xlsx", kind: "file", modified: "Jul 4" },
    { id: "t2", name: "Draft invoices", kind: "folder", modified: "Jun 20" },
  ],
};

const types = [
  { value: "any", label: "Any type" },
  { value: "folder", label: "Folders" },
  { value: "document", label: "Documents" },
  { value: "spreadsheet", label: "Spreadsheets" },
  { value: "pdf", label: "PDFs" },
];
const owners = [
  { value: "any", label: "Anyone" },
  { value: "me", label: "Owned by me" },
  { value: "others", label: "Owned by others" },
];
const sorts = [
  { value: "name:asc", label: "Name, A to Z" },
  { value: "name:desc", label: "Name, Z to A" },
  { value: "modified:desc", label: "Modified, newest first" },
  { value: "modified:asc", label: "Modified, oldest first" },
];

type Filters = { type: string; owner: string; sort: string };
const cleared: Filters = { type: "any", owner: "any", sort: "name:asc" };

function FilterSelect({
  id,
  label,
  value,
  items,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  items: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="selection-slot-demo-field">
      <Label htmlFor={id}>{label}</Label>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => next && onChange(next)}
      >
        <SelectTrigger id={id} size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterBar({
  filters,
  change,
  compact = false,
}: {
  filters: Filters;
  change: (next: Filters) => void;
  compact?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const count =
    Number(filters.type !== "any") + Number(filters.owner !== "any");
  const fields = (prefix: string) => (
    <>
      <FilterSelect
        id={`${prefix}-type`}
        label="Type"
        value={filters.type}
        items={types}
        onChange={(type) => change({ ...filters, type })}
      />
      <FilterSelect
        id={`${prefix}-owner`}
        label="Owner"
        value={filters.owner}
        items={owners}
        onChange={(owner) => change({ ...filters, owner })}
      />
      <FilterSelect
        id={`${prefix}-sort`}
        label="Sort"
        value={filters.sort}
        items={sorts}
        onChange={(sort) => change({ ...filters, sort })}
      />
    </>
  );
  const reset = count > 0 && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => change({ ...cleared, sort: filters.sort })}
    >
      Clear filters
    </Button>
  );
  return (
    <div
      role="group"
      aria-label="Filter and sort"
      className="selection-slot-demo-filters"
    >
      {!compact && (
        <div
          className="selection-slot-demo-wide selection-slot-demo-fields"
          data-at="md"
        >
          {fields(`${id}-bar`)}
          {reset}
        </div>
      )}
      <div
        className={
          compact ? "selection-slot-demo-row" : "selection-slot-demo-narrow"
        }
        data-at="md"
      >
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size={compact ? "icon-sm" : "sm"}
                aria-label={compact ? "Filter and sort" : undefined}
              />
            }
          >
            <Filter size={14} aria-hidden="true" />
            {!compact && (count ? `Filters (${count})` : "Filter and sort")}
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Filter and sort</SheetTitle>
              <SheetDescription>Results update as you choose.</SheetDescription>
            </SheetHeader>
            <div className="selection-slot-demo-sheet-fields">
              {fields(`${id}-sheet`)}
            </div>
            <SheetFooter>
              <Button onClick={() => setOpen(false)}>Show results</Button>
              {reset}
            </SheetFooter>
          </SheetContent>
        </Sheet>
        {!open && !compact && reset}
      </div>
    </div>
  );
}

const itemCount = (total: number) =>
  total === 1 ? "1 item" : `${total} items`;

function FilesExample() {
  const [section, setSection] = useState<Section>("mine");
  const [items, setItems] = useState(library);
  const [selected, setSelected] = useState<string[]>([]);
  const [filters, setFilters] = useState(cleared);
  const [pending, setPending] = useState<"selection" | null>(null);
  const [notice, setNotice] = useState("");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const list = items[section];
  const selection = list.filter((item) => selected.includes(item.id));
  const hasFile = selection.some((item) => item.kind === "file");
  const open = (action: string) =>
    setNotice(`${action}: ${itemCount(selection.length)}.`);
  const trashSelected = () => {
    setPending("selection");
    timer.current = window.setTimeout(() => {
      setItems((all) => ({
        ...all,
        [section]: all[section].filter((item) => !selected.includes(item.id)),
        trash: [...all.trash, ...selection],
      }));
      setNotice(`Moved ${itemCount(selection.length)} to Trash.`);
      setSelected([]);
      setPending(null);
    }, 900);
  };
  const busy = pending !== null;
  return (
    <Example
      title="Files toolbar"
      description="Selecting files or folders swaps the filters for a toolbar of actions. File-only actions appear when a file is selected. Below 44rem the actions fold into a menu. Trash keeps the filters even with a selection."
    >
      <ToggleGroup
        aria-label="Files section"
        variant="outline"
        size="sm"
        spacing={0}
        value={[section]}
        onValueChange={(value) => {
          if (!value[0]) return;
          setSection(value[0] as Section);
          setSelected([]);
          setNotice("");
        }}
      >
        {sections.map((item) => (
          <ToggleGroupItem key={item.value} value={item.value}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <SelectionSlot
        active={selection.length > 0 && section !== "trash"}
        selection={
          <div
            role="toolbar"
            aria-label="Selected items"
            className="selection-slot-demo-row"
          >
            <p role="status" className="selection-slot-demo-count">
              {itemCount(selection.length)} selected
            </p>
            <div className="selection-slot-demo-wide" data-at="md">
              {hasFile && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => open("Use in chat")}
                  >
                    <ChatRound size={14} aria-hidden="true" />
                    Use in chat
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => open("Add to Knowledge")}
                  >
                    <Book size={14} aria-hidden="true" />
                    Add to Knowledge
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => open("Add to project")}
                  >
                    <Briefcase size={14} aria-hidden="true" />
                    Add to project
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => open("Move")}
              >
                <FolderMove size={14} aria-hidden="true" />
                Move
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                aria-busy={pending === "selection"}
                onClick={trashSelected}
              >
                <Trash size={14} aria-hidden="true" />
                {pending === "selection" ? "Moving to Trash…" : "Move to trash"}
              </Button>
            </div>
            <div className="selection-slot-demo-narrow" data-at="md">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      aria-busy={pending === "selection"}
                    />
                  }
                >
                  {pending === "selection" ? "Moving…" : "Selected actions"}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {hasFile && (
                    <>
                      <DropdownMenuItem
                        disabled={busy}
                        onClick={() => open("Use in chat")}
                      >
                        Use in chat
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={busy}
                        onClick={() => open("Add to Knowledge")}
                      >
                        Add to Knowledge
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={busy}
                        onClick={() => open("Add to project")}
                      >
                        Add to project
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem
                    disabled={busy}
                    onClick={() => open("Move")}
                  >
                    Move
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={busy} onClick={trashSelected}>
                    Move to trash
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <FilterBar compact filters={filters} change={setFilters} />
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              aria-label="Clear selection"
              onClick={() => setSelected([])}
            >
              Clear
            </Button>
          </div>
        }
      >
        <FilterBar filters={filters} change={setFilters} />
      </SelectionSlot>
      {section === "trash" && (
        <p className="selection-slot-demo-hint">
          Trash keeps items until someone restores them or the owner deletes
          them forever.
        </p>
      )}
      {notice && (
        <p role="status" className="selection-slot-demo-hint">
          {notice}
        </p>
      )}
      {list.length ? (
        <ul className="selection-slot-demo-files" aria-label="Items">
          {list.map((item) => {
            const Icon = item.kind === "folder" ? Folder : FileText;
            return (
              <li
                key={item.id}
                data-selected={selected.includes(item.id) || undefined}
              >
                <Checkbox
                  aria-label={`Select ${item.name}`}
                  checked={selected.includes(item.id)}
                  disabled={busy}
                  onCheckedChange={(next) =>
                    setSelected((ids) =>
                      next
                        ? [...ids, item.id]
                        : ids.filter((id) => id !== item.id),
                    )
                  }
                />
                <Icon size={16} aria-hidden="true" />
                <span
                  className="selection-slot-demo-file-name"
                  title={item.name}
                >
                  {item.name}
                </span>
                <span className="selection-slot-demo-file-date">
                  {item.modified}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="selection-slot-demo-empty">This section is empty.</p>
      )}
    </Example>
  );
}

export default function SelectionSlotDemo() {
  return (
    <div id="selection-slot-demo" className="selection-slot-demo">
      <SwapExample />
      <QueryBarExample />
      <FilesExample />
    </div>
  );
}
