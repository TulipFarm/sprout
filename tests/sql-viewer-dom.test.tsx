// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SqlViewer,
  type SqlViewerTable,
} from "../packages/sprout/src/components/sql-viewer.js";

const link = (
  id: string,
  targetTableId: string,
  cardinality: "one" | "many" = "one",
) =>
  ({
    id,
    label: `${id}_id`,
    required: true,
    kind: "relationship",
    targetTableId,
    cardinality,
    inverseCardinality: "many",
  }) as const;

const tables: SqlViewerTable[] = [
  {
    id: "deals",
    label: "Deals",
    owningTeamId: "sales",
    fields: [
      link("customer", "customers"),
      link("line", "lines", "many"),
      link("self", "deals"),
      {
        id: "title",
        label: "title",
        required: true,
        kind: "text",
        maxLength: 80,
      },
      {
        id: "amount",
        label: "amount",
        required: false,
        kind: "numeric",
        precision: 12,
        scale: 2,
      },
      { id: "at", label: "at", required: true, kind: "timestamp" },
      { id: "won", label: "won", required: true, kind: "boolean" },
      {
        id: "stage",
        label: "stage",
        required: true,
        kind: "single-select",
        options: [
          { id: "a", label: "Open", retired: false },
          { id: "b", label: "Old", retired: true },
        ],
      },
      {
        id: "tags",
        label: "tags",
        required: false,
        kind: "multi-select",
        options: [],
      },
      {
        id: "pdf",
        label: "pdf",
        required: false,
        kind: "file",
        cardinality: "one",
      },
      {
        id: "docs",
        label: "docs",
        required: false,
        kind: "file",
        cardinality: "many",
      },
    ],
    uniqueKeys: [
      { id: "k1", fieldIds: ["title"] },
      { id: "k2", fieldIds: ["customer", "title", "ghost"] },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    owningTeamId: "sales",
    fields: [],
  },
  { id: "notes", label: "Notes", owningTeamId: "ops", fields: [] },
  { id: "users", label: "Users", fields: [link("deal", "deals")] },
  { id: "lines", label: "Lines", fields: [link("deal", "deals")] },
  { id: "files", label: "Files", fields: [link("line", "lines")] },
  { id: "logs", label: "Logs", fields: [] },
  { id: "tasks", label: "Tasks", fields: [] },
];
const groups = { sales: "Sales" };

const realMatchMedia = window.matchMedia;
const media = (mobile: boolean) => {
  window.matchMedia = vi.fn(
    (query: string) =>
      ({
        matches: query.includes("max-width") ? mobile : true,
        addEventListener() {},
        removeEventListener() {},
      }) as never,
  );
};

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (f: FrameRequestCallback) => {
    f(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(600);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.matchMedia = realMatchMedia;
});

const viewport = () =>
  document.querySelector<HTMLElement>("[data-slot='sql-viewer-viewport']")!;
const card = (id: string) =>
  document.querySelector<HTMLElement>(
    `.react-flow__node[data-id='${id}'] [data-slot='sql-table']`,
  )!;
const node = (id: string) =>
  document.querySelector<HTMLElement>(`.react-flow__node[data-id='${id}']`)!;
const column = (table: string, label: string) =>
  [...card(table).querySelectorAll<HTMLElement>(".sprout-sql-column")].find(
    (row) => row.textContent!.startsWith(label),
  )!;
const moreButton = () =>
  document.querySelector<HTMLButtonElement>(".sprout-sql-more-button")!;
const joinBar = () =>
  document.querySelector<HTMLElement>("[data-slot='sql-viewer-joins']");

describe("SqlViewer in the DOM", () => {
  it("maps fields to SQL types and keys", async () => {
    media(false);
    render(<SqlViewer tables={tables} label="Sales" groups={groups} />);
    await act(async () => {});
    const types = [
      ...card("deals").querySelectorAll(".sprout-sql-column-type"),
    ].map((type) => type.textContent);
    expect(types).toEqual([
      "uuid",
      "uuid",
      "uuid[]",
      "uuid",
      "varchar(80)",
      "numeric(12,2)?, nullable",
      "timestamptz",
      "boolean",
      "enum",
      "enum[]?, nullable",
      "file?, nullable",
      "file[]?, nullable",
    ]);
    expect(column("deals", "stage").title).toBe("Open");
    expect(document.querySelectorAll("[aria-label='Unique']")).toHaveLength(1);
    expect(
      card("deals").querySelector(".sprout-sql-key > span")!.textContent,
    ).toBe("customer_id, title, ghost");
    expect(
      document
        .querySelector("[data-slot='sql-group']")!
        .getAttribute("aria-label"),
    ).toBe("Sales, 2 tables");
  });

  it("highlights joins on hover, pins on click, and clears", async () => {
    media(false);
    render(<SqlViewer tables={tables} label="Sales" groups={groups} />);
    await act(async () => {});
    expect(joinBar()).toBeNull();

    fireEvent.mouseEnter(column("deals", "customer_id"));
    expect(joinBar()!.textContent).toBe("Deals.customer_id = Customers.id");
    expect(card("notes").hasAttribute("data-dimmed")).toBe(true);
    expect(card("customers").hasAttribute("data-dimmed")).toBe(false);
    fireEvent.mouseLeave(column("deals", "customer_id"));
    fireEvent.mouseLeave(card("deals"));
    expect(joinBar()).toBeNull();

    fireEvent.click(column("deals", "line_id"));
    expect(joinBar()!.textContent).toBe("Lines.id = ANY(Deals.line_id)");
    fireEvent.click(column("deals", "line_id"));
    expect(joinBar()).toBeNull();

    fireEvent.click(node("deals"));
    expect(card("deals").hasAttribute("data-active")).toBe(true);
    expect(joinBar()!.textContent).toMatch(/and 2 more$/);
    fireEvent.keyDown(viewport(), { key: "Escape" });
    expect(card("deals").hasAttribute("data-active")).toBe(false);

    fireEvent.mouseEnter(node("customers"));
    expect(joinBar()).not.toBeNull();
    fireEvent.mouseLeave(card("customers"));
    fireEvent.click(node("customers"));
    fireEvent.click(document.querySelector(".react-flow__pane")!);
    expect(joinBar()).toBeNull();
  });

  it("pins from the keyboard and keeps view keys", async () => {
    media(false);
    render(<SqlViewer tables={tables} label="Sales" maxVisible={8} />);
    await act(async () => {});
    fireEvent.focus(node("users"));
    expect(card("deals").hasAttribute("data-dimmed")).toBe(false);
    expect(card("notes").hasAttribute("data-dimmed")).toBe(true);
    fireEvent.keyDown(node("users"), { key: "Enter" });
    fireEvent.blur(node("users"));
    expect(card("users").hasAttribute("data-active")).toBe(true);
    fireEvent.keyDown(node("users"), { key: " " });
    expect(card("users").hasAttribute("data-active")).toBe(false);
    fireEvent.keyDown(viewport(), { key: "Escape" });
    for (const key of ["ArrowLeft", "+", "-", "0", "x"])
      fireEvent.keyDown(viewport(), { key });
    await act(async () => {});
  });

  it("collapses extra tables behind one card and expands them", async () => {
    media(false);
    render(<SqlViewer tables={tables} label="Sales" groups={groups} />);
    await act(async () => {});
    expect(document.querySelectorAll("[data-slot='sql-table']")).toHaveLength(
      4,
    );
    const more = moreButton();
    expect(more.getAttribute("aria-label")).toBe(
      "Show 4 more tables: Lines, Files, Logs, Tasks",
    );
    expect(more.textContent).toContain("+4 tables");
    expect(more.textContent).toContain("Lines, Files, Logs and 1 more");
    fireEvent.click(more);
    await act(async () => {});
    expect(document.querySelectorAll("[data-slot='sql-table']")).toHaveLength(
      tables.length,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Show 4 tables", hidden: true }),
    );
    await act(async () => {});
    expect(document.querySelectorAll("[data-slot='sql-table']")).toHaveLength(
      4,
    );
  });

  it("names a single hidden table", async () => {
    media(false);
    render(
      <SqlViewer tables={tables.slice(0, 3)} label="Sales" maxVisible={2} />,
    );
    await act(async () => {});
    expect(moreButton().getAttribute("aria-label")).toBe(
      "Show 1 more table: Notes",
    );
    expect(moreButton().textContent).toContain("+1 table");
  });

  it("wraps team groups onto a new row past the wrap width", async () => {
    media(false);
    const teams = ["a", "b", "c", "d", "e", "f"];
    render(
      <SqlViewer
        label="Teams"
        maxVisible={teams.length}
        groups={Object.fromEntries(teams.map((team) => [team, team]))}
        tables={teams.map((team) => ({
          id: team,
          label: team,
          owningTeamId: team,
          fields: [],
        }))}
      />,
    );
    await act(async () => {});
    const tones = [...document.querySelectorAll("[data-slot='sql-group']")].map(
      (group) => group.getAttribute("data-tone"),
    );
    expect(tones).toEqual(["1", "2", "3", "4", "5", "1"]);
    const top = (id: string) => node(`~group:${id}`).style.transform;
    expect(top("a")).toMatch(/,0px\)$/);
    expect(top("e")).not.toMatch(/,0px\)$/);
  });

  it("stacks tables on a phone", async () => {
    media(true);
    render(<SqlViewer tables={tables} label="Sales" groups={groups} />);
    await act(async () => {});
    expect(screen.getByRole("figure").getAttribute("data-layout")).toBe(
      "vertical",
    );
    expect(
      document.querySelector("[data-slot='sql-viewer-controls']")!.className,
    ).toContain("top");
  });
});
