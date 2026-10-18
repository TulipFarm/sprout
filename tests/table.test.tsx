import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  Table,
  tableLayoutKeys,
  tableNarrowNames,
  tableVariantNames,
  type TableColumn,
} from "../packages/sprout/src/components/table.js";
import * as sprout from "../packages/sprout/src/index.js";

type Item = {
  id: string;
  name: string;
  status: string;
  size: number;
  done: boolean;
  kids?: Item[];
};

const data: Item[] = [
  { id: "a", name: "Alpha", status: "open", size: 3, done: false },
  { id: "b", name: "Bravo", status: "done", size: 5, done: true },
  { id: "c", name: "Charlie", status: "open", size: 2, done: false },
];

const columns: TableColumn<Item>[] = [
  {
    key: "name",
    header: "Name",
    sort: true,
    filter: "text",
    hint: "The record name",
  },
  {
    key: "status",
    header: "Status",
    filter: "select",
    group: true,
    options: [
      { label: "Open", value: "open" },
      { label: "Done", value: "done" },
    ],
  },
  {
    key: "size",
    header: "Size",
    align: "right",
    sort: true,
    aggregate: "sum",
    edit: "number",
  },
];

const render = (props: Partial<Parameters<typeof Table<Item>>[0]> = {}) =>
  renderToString(
    <Table
      aria-label="Items"
      data={data}
      columns={columns}
      getRowId={(r) => r.id}
      {...props}
    />,
  ).replaceAll("<!-- -->", "");

describe("Table", () => {
  it("is exported from the package root", () => {
    expect(sprout).toHaveProperty("Table");
    expect(sprout).not.toHaveProperty("DataList");
    expect(tableVariantNames).toEqual(["plain", "grid"]);
    expect(tableNarrowNames).toEqual(["scroll", "stack"]);
    expect(tableLayoutKeys).toEqual([
      "columnSizing",
      "columnOrder",
      "columnPinning",
      "columnVisibility",
    ]);
  });

  it("renders headers, rows, and the old classes", () => {
    const html = render();
    expect(html).toContain('class="sprout-table-container"');
    expect(html).toContain('data-variant="plain"');
    expect(html).toContain('aria-label="Sort by Name"');
    expect(html).toContain('aria-label="About Name"');
    expect(html).toContain(">Alpha</span></td>");
    expect(html).toContain('data-align="right"');
    expect(html.match(/<tr data-slot="table-row"/g)).toHaveLength(4);
  });

  it("sorts from controlled state and sets aria-sort", () => {
    const html = render({ state: { sorting: [{ id: "size", desc: true }] } });
    expect(html).toContain('aria-sort="descending"');
    expect(html.indexOf("Bravo")).toBeLessThan(html.indexOf("Alpha"));
    expect(html.indexOf("Alpha")).toBeLessThan(html.indexOf("Charlie"));
  });

  it("filters by column and by search", () => {
    const byStatus = render({
      state: { columnFilters: [{ id: "status", value: ["done"] }] },
    });
    expect(byStatus).toContain("Bravo");
    expect(byStatus).not.toContain("Alpha");
    expect(byStatus).toContain("Status: Done");

    const bySearch = render({
      searchable: true,
      state: { globalFilter: "char" },
    });
    expect(bySearch).toContain("Charlie");
    expect(bySearch).not.toContain(">Alpha<");
  });

  it("shows the empty message", () => {
    expect(render({ data: [], empty: "Nothing yet" })).toContain("Nothing yet");
  });

  it("adds selection boxes and the footer total", () => {
    const html = render({ selectable: true });
    expect(html).toContain('aria-label="Select all rows"');
    expect(html).toContain('aria-label="Select a"');
    expect(html).toContain("sprout-table-footer");
    expect(html).toMatch(/>Total<.*>10</);
  });

  it("groups rows with a count and totals", () => {
    const html = render({ state: { grouping: ["status"] } });
    expect(html).toContain('data-group=""');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("Status: Open");
    expect(html).toMatch(
      /Status: Open<\/span><span class="sprout-table-group-count">2</,
    );
    expect(html).toMatch(/data-group=""[^]*?>5</);
  });

  it("pages rows", () => {
    const html = render({ pageSize: 2 });
    expect(html).toContain("Page 1 of 2");
    expect(html).not.toContain("Charlie");
  });

  it("hides and pins columns", () => {
    const hidden = render({ state: { columnVisibility: { status: false } } });
    expect(hidden).not.toContain(">Status<");
    const pinned = render({
      columns: columns.map((c) =>
        c.key === "name" ? { ...c, pin: "left" } : c,
      ),
    });
    expect(pinned).toContain('data-pinned="start"');
    expect(pinned).toContain("data-pin-start");
    expect(pinned).not.toContain("data-sized");
    const endPinned = render({
      columns: columns.map((c) =>
        c.key === "name" ? { ...c, pin: "right" } : c,
      ),
    });
    expect(endPinned.indexOf(">Alpha<")).toBeGreaterThan(
      endPinned.indexOf('data-label="Size"'),
    );
  });

  it("adds Edit, link, and actions cells", () => {
    const html = render({
      onRowSave: () => {},
      getRowHref: (r) => `/items/${r.id}`,
      actions: (r) => <button type="button">Open {r.name}</button>,
    });
    expect(html).toContain('aria-label="Edit a"');
    expect(html).toContain('href="/items/a"');
    expect(html).toContain("Open Alpha");
    expect(html).toContain("data-sticky-end");
  });

  it("renders sub-rows with expand buttons", () => {
    const html = render({
      data: [
        {
          ...data[0]!,
          kids: [
            {
              id: "a1",
              name: "Alpha one",
              status: "open",
              size: 1,
              done: false,
            },
          ],
        },
      ],
      getSubRows: (r) => r.kids,
    });
    expect(html).toContain('aria-label="Collapse a"');
    expect(html).toContain("Alpha one");
  });

  it("adds ARIA roles in the stack layout and handles for row drag", () => {
    const html = render({
      narrow: "stack",
      onRowReorder: () => {},
      resizable: true,
    });
    expect(html).toContain('data-narrow="stack"');
    expect(html).toContain('role="table"');
    expect(html).toContain('data-label="Size"');
    expect(html).toContain('aria-label="Move a"');
    expect(html).toContain('aria-label="Resize Name column"');
  });

  it("renders virtual rows with row indexes", () => {
    const html = render({ virtual: true });
    expect(html).toContain('aria-rowcount="4"');
    expect(html).toContain('aria-rowindex="2"');
  });
});
