// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Table,
  type TableColumn,
  type TableProps,
} from "../packages/sprout/src/components/table.js";

type Item = {
  id: string;
  name: string;
  status: string;
  size: number;
  done: boolean;
  due: string;
  kids?: Item[];
};

const data: Item[] = [
  {
    id: "a",
    name: "Alpha",
    status: "open",
    size: 3,
    done: false,
    due: "2026-01-02",
  },
  {
    id: "b",
    name: "Bravo",
    status: "done",
    size: 5,
    done: true,
    due: "2026-02-03",
  },
  {
    id: "c",
    name: "Charlie",
    status: "open",
    size: 2,
    done: false,
    due: "2026-03-04",
  },
];

const status = [
  { label: "Open", value: "open" },
  { label: "Done", value: "done" },
];

const columns: TableColumn<Item>[] = [
  { key: "name", header: "Name", sort: true, filter: "text", edit: "text" },
  {
    key: "status",
    header: "Status",
    filter: "select",
    group: true,
    edit: "select",
    options: status,
  },
  {
    key: "size",
    header: "Size",
    align: "right",
    sort: true,
    filter: "number",
    aggregate: "sum",
    formatAggregate: (v) => `${v} pts`,
    edit: "number",
  },
  {
    key: "done",
    header: "Done",
    filter: "boolean",
    edit: "checkbox",
    group: true,
  },
  {
    key: "due",
    header: "Due",
    filter: "date",
    edit: "date",
    aggregate: "count",
  },
];

function setup(props: Partial<TableProps<Item>> = {}) {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  const view = render(
    <Table
      aria-label="Items"
      data={data}
      columns={columns}
      getRowId={(r) => r.id}
      rowLabel={(r) => r.name}
      {...props}
    />,
  );
  return { user, ...view };
}

const names = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((r) => r.querySelector("td[data-label='Name']")?.textContent);

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Table in the DOM", () => {
  it("sorts by a column through asc, desc, and clear", async () => {
    const onStateChange = vi.fn();
    const { user } = setup({ onStateChange });
    const sort = () => screen.getByRole("button", { name: /^Sort by Size/ });
    await user.click(sort());
    expect(sort().getAttribute("aria-label")).toBe(
      "Sort by Size, ascending. Select for descending",
    );
    expect(names()).toEqual(["Charlie", "Alpha", "Bravo", "Total"]);
    await user.click(sort());
    expect(sort().getAttribute("aria-label")).toBe(
      "Sort by Size, descending. Select to clear",
    );
    expect(sort().closest("th")?.getAttribute("aria-sort")).toBe("descending");
    await user.click(sort());
    expect(sort().closest("th")?.getAttribute("aria-sort")).toBeNull();
    expect(onStateChange).toHaveBeenCalledTimes(3);
  });

  it("renders footer totals with custom and default formats", () => {
    setup();
    const footer = document.querySelector("tfoot")!;
    expect(footer.textContent).toContain("Total");
    expect(footer.textContent).toContain("10 pts");
    expect(footer.textContent).toContain("3");
  });

  it("selects rows, ranges, and all rows", async () => {
    const onSelectionChange = vi.fn();
    const { user } = setup({ selectable: true, onSelectionChange });
    const box = (name: string) => screen.getByRole("checkbox", { name });
    await user.click(box("Select Alpha"));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["a"]);
    await user.keyboard("{Shift>}");
    await user.click(box("Select Charlie"));
    await user.keyboard("{/Shift}");
    expect(onSelectionChange.mock.lastCall![0].sort()).toEqual(["a", "b", "c"]);
    expect(box("Select all rows").getAttribute("aria-checked")).toBe("true");
    await user.keyboard("{Shift>}");
    await user.click(box("Select Alpha"));
    await user.keyboard("{/Shift}");
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    await user.click(box("Select Bravo"));
    expect(box("Select all rows").getAttribute("aria-checked")).toBe("mixed");
    await user.click(box("Select all rows"));
    expect(onSelectionChange.mock.lastCall![0].sort()).toEqual(["a", "b", "c"]);
  });

  it("edits a row and saves only the changes", async () => {
    const onRowSave = vi.fn();
    const { user } = setup({ onRowSave, actions: () => <span>More</span> });
    await user.click(screen.getByRole("button", { name: "Edit Alpha" }));
    const name = screen.getByRole("textbox", { name: "Name for Alpha" });
    expect(document.activeElement).toBe(name);
    await user.clear(name);
    await user.type(name, "Apple");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Status for Alpha" }),
      "done",
    );
    const size = screen.getByRole("spinbutton", { name: "Size for Alpha" });
    await user.clear(size);
    await user.type(size, "7");
    await user.click(screen.getByRole("checkbox", { name: "Done for Alpha" }));
    fireEvent.change(screen.getByLabelText("Due for Alpha"), {
      target: { value: "2026-05-06" },
    });
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onRowSave).toHaveBeenCalledWith(data[0], {
      name: "Apple",
      status: "done",
      size: 7,
      done: true,
      due: "2026-05-06",
    });
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(screen.getAllByText("More")).toHaveLength(3);
  });

  it("saves with Enter, cancels with Escape, and clears a number", async () => {
    const onRowSave = vi.fn();
    const { user } = setup({ onRowSave });
    await user.click(screen.getByRole("button", { name: "Edit Bravo" }));
    const size = screen.getByRole("spinbutton", { name: "Size for Bravo" });
    await user.clear(size);
    await user.keyboard("{Enter}");
    expect(onRowSave).toHaveBeenCalledWith(data[1], { size: null });

    await user.click(screen.getByRole("button", { name: "Edit Bravo" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Edit Bravo" }));
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "a" });
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onRowSave).toHaveBeenCalledOnce();
    fireEvent.keyDown(screen.getAllByRole("row")[1]!, { key: "Escape" });
  });

  it("keeps the row open and shows the error when saving fails", async () => {
    const onRowSave = vi
      .fn()
      .mockRejectedValueOnce(new Error("Server said no"))
      .mockRejectedValueOnce("plain");
    const { user } = setup({ onRowSave });
    await user.click(screen.getByRole("button", { name: "Edit Alpha" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Server said no",
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toBe("plain");
  });

  it("searches, filters, and removes filter chips", async () => {
    const onStateChange = vi.fn();
    const { user } = setup({ searchable: true, onStateChange, pageSize: 2 });
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Page 2 of 2")).toBeTruthy();
    await user.type(screen.getByRole("searchbox"), "bra");
    expect(names()).toEqual(["Bravo", "Total"]);
    expect(onStateChange.mock.lastCall![0].pagination.pageIndex).toBe(0);
    await user.clear(screen.getByRole("searchbox"));

    const chip = (text: string) =>
      expect(
        screen.getByRole("button", {
          name: new RegExp(`: ${text}$`),
          hidden: true,
        }),
      ).toBeTruthy();
    const addFilter = async (header: string) => {
      await user.click(screen.getByRole("button", { name: "Filter" }));
      await user.click(await screen.findByRole("menuitem", { name: header }));
    };

    await addFilter("Name");
    await user.type(
      await screen.findByRole("textbox", { name: "Name contains" }),
      "ar",
    );
    chip("ar");
    await user.keyboard("{Escape}");
    await user.click(
      screen.getByRole("button", { name: "Remove Name filter" }),
    );

    await addFilter("Status");
    await user.click(await screen.findByRole("checkbox", { name: "Done" }));
    await user.click(screen.getByRole("checkbox", { name: "Open" }));
    chip("Done, Open");
    await user.click(screen.getByRole("checkbox", { name: "Done" }));
    await user.keyboard("{Escape}");
    expect(names()).toEqual(["Alpha", "Charlie", "Total"]);
    await user.click(
      screen.getByRole("button", { name: "Remove Status filter" }),
    );

    await addFilter("Size");
    const from = await screen.findByRole("spinbutton", { name: "Size from" });
    await user.type(from, "3");
    chip("≥ 3");
    await user.type(screen.getByRole("spinbutton", { name: "Size to" }), "4");
    chip("3 – 4");
    await user.clear(from);
    chip("≤ 4");
    await user.clear(screen.getByRole("spinbutton", { name: "Size to" }));
    await user.keyboard("{Escape}");
    await user.click(
      screen.getByRole("button", { name: "Remove Size filter" }),
    );

    await addFilter("Done");
    await user.click(await screen.findByRole("radio", { name: "Yes" }));
    chip("Yes");
    await user.click(screen.getByRole("radio", { name: "No" }));
    chip("No");
    await user.keyboard("{Escape}");

    await addFilter("Due");
    fireEvent.change(await screen.findByLabelText("Due from"), {
      target: { value: "2026-02-01" },
    });
    chip("≥ 2026-02-01");
  });

  it("describes a range filter with no ends as empty", () => {
    setup({ state: { columnFilters: [{ id: "size", value: [null, ""] }] } });
    expect(
      screen.getByRole("button", { name: "Remove Size filter" }),
    ).toBeTruthy();
  });

  it("groups rows, toggles groups, and shows group aggregates", async () => {
    const { user } = setup({
      selectable: true,
      onRowReorder: vi.fn(),
      onRowSave: vi.fn(),
    });
    await user.click(screen.getByRole("button", { name: "Group" }));
    await user.click(
      await screen.findByRole("menuitemcheckbox", { name: "Status" }),
    );
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: /Group: 1/ })).toBeTruthy();
    const open = screen.getByRole("button", { name: /Status: Open/ });
    expect(open.getAttribute("aria-expanded")).toBe("true");
    expect(open.closest("tr")?.textContent).toContain("5 pts");
    await user.click(open);
    expect(open.getAttribute("aria-expanded")).toBe("false");
    expect(
      screen
        .getByRole("button", { name: "Move Bravo" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("names a group with no value None", () => {
    setup({
      data: [{ ...data[0]!, status: "" }],
      state: { grouping: ["status"] },
    });
    expect(screen.getByRole("button", { name: /Status: None/ })).toBeTruthy();
  });

  it("hides, pins, and resets columns, saving the layout", async () => {
    const { user } = setup({ columnMenu: true, persistKey: "items" });
    const openSub = async (name: string) => {
      await user.keyboard("{Escape}{Escape}");
      await user.click(screen.getByRole("button", { name: "Columns" }));
      await user.click(await screen.findByRole("menuitem", { name }));
    };
    await openSub("Status");
    fireEvent.click(
      await screen.findByRole("menuitemcheckbox", { name: "Show" }),
    );
    expect(screen.queryByRole("columnheader", { name: "Status" })).toBeNull();
    expect(
      JSON.parse(localStorage.getItem("sprout-table:items")!).columnVisibility,
    ).toEqual({ status: false });

    await openSub("Done");
    fireEvent.click(
      await screen.findByRole("menuitemradio", { name: "Pin to end" }),
    );
    expect(
      document
        .querySelector("th[data-column-id='done']")
        ?.getAttribute("data-pinned"),
    ).toBe("end");
    await openSub("Done");
    fireEvent.click(
      await screen.findByRole("menuitemradio", { name: "Not pinned" }),
    );
    await openSub("Name");
    fireEvent.click(
      await screen.findByRole("menuitemradio", { name: "Pin to start" }),
    );
    expect(
      document.querySelector("table")?.hasAttribute("data-pin-start"),
    ).toBe(true);

    await user.keyboard("{Escape}{Escape}");
    await user.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Reset columns" }),
    );
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeTruthy();
  });

  it("loads a saved layout and survives broken storage", () => {
    localStorage.setItem(
      "sprout-table:items",
      JSON.stringify({ columnVisibility: { size: false } }),
    );
    const { unmount } = setup({ persistKey: "items" });
    expect(document.querySelector("th[data-column-id='size']")).toBeNull();
    unmount();

    localStorage.setItem("sprout-table:items", "{nope");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    setup({ persistKey: "items", resizable: true });
    const resizer = screen.getByRole("separator", {
      name: "Resize Name column",
    });
    fireEvent.keyDown(resizer, { key: "ArrowRight" });
    expect(resizer.getAttribute("aria-valuenow")).toBe("160");
  });

  it("resizes columns from the keyboard and resets on double click", () => {
    setup({ resizable: true });
    const resizer = screen.getByRole("separator", {
      name: "Resize Size column",
    });
    fireEvent.keyDown(resizer, { key: "ArrowRight", shiftKey: true });
    expect(resizer.getAttribute("aria-valuenow")).toBe("190");
    fireEvent.keyDown(resizer, { key: "ArrowLeft" });
    expect(resizer.getAttribute("aria-valuenow")).toBe("180");
    fireEvent.keyDown(resizer, { key: "Enter" });
    fireEvent.doubleClick(resizer);
    expect(resizer.getAttribute("aria-valuenow")).toBe("150");
    fireEvent.mouseDown(resizer, { clientX: 0 });
    fireEvent.mouseUp(document);
  });

  it("measures pin offsets from the header cells", () => {
    const callbacks: ResizeObserverCallback[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: ResizeObserverCallback) {
          callbacks.push(cb);
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 40,
    } as DOMRect);
    setup({
      selectable: true,
      onRowSave: vi.fn(),
      columns: columns.map((c) =>
        c.key === "name"
          ? { ...c, pin: "left", width: 120 }
          : c.key === "due"
            ? { ...c, pin: "right" }
            : c,
      ),
    });
    act(() => callbacks.forEach((cb) => cb([], {} as ResizeObserver)));
    act(() => callbacks.forEach((cb) => cb([], {} as ResizeObserver)));
    const table = document.querySelector("table")!;
    expect(table.style.getPropertyValue("--sprout-table-select-start")).toBe(
      "0px",
    );
    const name = document.querySelector<HTMLElement>(
      "th[data-column-id='name']",
    )!;
    expect(name.style.insetInlineStart).toBe("40px");
    const due = document.querySelector<HTMLElement>(
      "th[data-column-id='due']",
    )!;
    expect(due.style.insetInlineEnd).toBe("40px");
  });

  it("makes the plain container focusable when it overflows", () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(500);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
    setup();
    expect(screen.getByRole("region", { name: "Items" }).tabIndex).toBe(0);
  });

  it("skips overflow tracking without ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    setup();
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("links rows, opens rows, and accepts dropped files", () => {
    const onRowClick = vi.fn();
    const onRowDrop = vi.fn();
    const { unmount } = setup({ onRowClick, onRowDrop });
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
    expect(onRowClick).toHaveBeenCalledWith(data[0]);

    const row = screen.getAllByRole("row")[1]!;
    const file = new File(["x"], "a.txt");
    const files = { types: ["Files"], files: [file] };
    fireEvent.dragOver(row, { dataTransfer: { types: [] } });
    expect(row.hasAttribute("data-drop-target")).toBe(false);
    fireEvent.dragOver(row, { dataTransfer: files });
    fireEvent.dragOver(row, { dataTransfer: files });
    expect(row.hasAttribute("data-drop-target")).toBe(true);
    fireEvent.dragLeave(row, { relatedTarget: null });
    expect(row.hasAttribute("data-drop-target")).toBe(false);
    fireEvent.drop(row, { dataTransfer: { types: [] } });
    fireEvent.drop(row, { dataTransfer: files });
    expect(onRowDrop).toHaveBeenCalledWith(data[0], [file]);
    unmount();

    setup({ getRowHref: (r) => `/items/${r.id}` });
    expect(
      screen.getByRole("link", { name: "Alpha" }).getAttribute("href"),
    ).toBe("/items/a");
  });

  it("expands and collapses sub rows", async () => {
    const { user } = setup({
      data: [{ ...data[0]!, kids: [data[1]!] }],
      getSubRows: (r) => r.kids,
      state: { expanded: {} },
    });
    const toggle = screen.getByRole("button", { name: "Expand Alpha" });
    expect(screen.queryByText("Bravo")).toBeNull();
    await user.click(toggle);
  });

  it("indents sub rows when expanded", () => {
    setup({
      data: [{ ...data[0]!, kids: [data[1]!] }],
      getSubRows: (r) => r.kids,
    });
    expect(screen.getByRole("button", { name: "Collapse Alpha" })).toBeTruthy();
    const bravo = screen.getByText("Bravo");
    expect(bravo.style.paddingInlineStart).toBe("16px");
  });

  it("renders loading rows and the empty state with every extra column", () => {
    const extras = {
      selectable: true,
      onRowReorder: vi.fn(),
      actions: () => null,
    };
    const { unmount } = setup({ ...extras, loading: true });
    expect(document.querySelectorAll("[data-loading-row]")).toHaveLength(3);
    unmount();
    setup({ ...extras, data: [], empty: "Nothing here" });
    expect(screen.getByText("Nothing here").getAttribute("colspan")).toBe("8");
  });

  it("virtualizes rows inside a scroll region", () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
    const many = Array.from({ length: 60 }, (_, i) => ({
      ...data[0]!,
      id: `r${i}`,
      name: `Row ${i}`,
    }));
    setup({ data: many, virtual: true });
    const table = screen.getByRole("table");
    expect(table.getAttribute("aria-rowcount")).toBe("61");
    expect(screen.getByRole("region", { name: "Items" })).toBeTruthy();
    expect(screen.queryByText("Row 59")).toBeNull();
  });

  it("virtualizes group rows with a row index", () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
    setup({ virtual: true, state: { grouping: ["status"] } });
    const group = screen.getByRole("button", { name: /Status: Open/ });
    expect(group.closest("tr")?.getAttribute("aria-rowindex")).toBeTruthy();
  });

  it("stacks rows with ARIA roles and a grid variant", () => {
    setup({ narrow: "stack", variant: "grid", caption: "All items" });
    expect(screen.getByRole("table").getAttribute("role")).toBe("table");
    expect(screen.getByText("All items").tagName).toBe("CAPTION");
  });

  it("reorders columns and rows with the keyboard", async () => {
    const onRowReorder = vi.fn();
    const onStateChange = vi.fn();
    const { user } = setup({ reorderable: true, onRowReorder, onStateChange });
    const rects = new Map<string, number>();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const id =
          this.dataset.columnId ??
          this.closest("tr")?.querySelector("td[data-label='Name']")
            ?.textContent ??
          "";
        const at = rects.get(id) ?? 0;
        return {
          top: at,
          left: at,
          bottom: at + 40,
          right: at + 40,
          width: 40,
          height: 40,
          x: at,
          y: at,
        } as DOMRect;
      },
    );
    ["name", "status", "size", "done", "due"].forEach((id, i) =>
      rects.set(id, i * 100),
    );
    ["Alpha", "Bravo", "Charlie"].forEach((id, i) => rects.set(id, i * 100));

    screen.getByRole("button", { name: "Move Name column" }).focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");
    expect(onStateChange.mock.lastCall?.[0].columnOrder?.[0]).not.toBe("name");

    screen.getByRole("button", { name: "Move Alpha" }).focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowDown}");
    await user.keyboard(" ");
    expect(onRowReorder).toHaveBeenCalledWith(0, 1);
  });
});
