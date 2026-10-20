// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Board,
  type BoardColumn,
  type BoardItem,
  type BoardProps,
} from "../packages/sprout/src/components/board.js";
import { DropdownMenuItem } from "../packages/sprout/src/components/dropdown-menu.js";

const startColumns: BoardColumn[] = [
  { id: "todo", title: "To do" },
  { id: "doing", title: "Doing", limit: 1 },
  { id: "done", title: "Done" },
];

const startItems: BoardItem[] = [
  { id: "a", title: "Plant tulips", columnId: "todo", laneId: "ana" },
  { id: "b", title: "Order soil", columnId: "todo", laneId: "ana" },
  { id: "c", title: "Fix gate", columnId: "doing", laneId: "ben" },
  { id: "d", title: "Paint shed", columnId: "doing", laneId: "ana" },
];

const lanes = [
  { id: "ana", title: "Ana" },
  { id: "ben", title: "Ben" },
];

let latestItems: BoardItem[] = [];
let latestColumns: BoardColumn[] = [];

function Harness({
  withLanes = true,
  ...props
}: Partial<BoardProps<BoardItem>> & { withLanes?: boolean }) {
  const [columns, setColumns] = useState(startColumns);
  const [items, setItems] = useState(startItems);
  latestItems = items;
  latestColumns = columns;
  return (
    <Board
      label="Farm board"
      columns={columns}
      lanes={withLanes ? lanes : undefined}
      items={items}
      onItemsChange={setItems}
      onColumnsChange={setColumns}
      onItemAdd={({ title, columnId, laneId }) =>
        setItems((list) => [
          ...list,
          { id: `n${list.length}`, title, columnId, laneId },
        ])
      }
      searchable
      {...props}
    />
  );
}

const COLUMN_WIDTH = 300;
const LANE_HEIGHT = 400;

/** Columns 300px apart, lanes 400px apart, cards 60px apart in a cell. */
function fakeRect(this: Element): DOMRect {
  const box = (x: number, y: number, width: number, height: number) =>
    ({
      x,
      y,
      left: x,
      top: y,
      width,
      height,
      right: x + width,
      bottom: y + height,
      toJSON() {},
    }) as DOMRect;
  const indexIn = (node: Element | null) =>
    node?.parentElement ? [...node.parentElement.children].indexOf(node) : 0;
  const header = this.closest(".sprout-board-column-header");
  if (header && this.closest(".sprout-board-header"))
    return box(indexIn(header) * COLUMN_WIDTH, 0, 280, 30);
  const cell = this.closest(".sprout-board-cell");
  if (!cell) return box(0, 0, 0, 0);
  const lane = Number(
    this.closest("section[data-index]")?.getAttribute("data-index") ?? 0,
  );
  const x = indexIn(cell) * COLUMN_WIDTH;
  const y = 40 + lane * LANE_HEIGHT;
  const slot = this.closest(".sprout-board-card-slot");
  if (slot)
    return box(x, y + Number(slot.getAttribute("data-index")) * 60, 280, 50);
  return box(x, y, 280, 350);
}

const pointer = { isPrimary: true, button: 0, pointerType: "mouse" };
const frame = () =>
  act(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );

async function drag(from: Element, to: { x: number; y: number }) {
  const start = from.getBoundingClientRect();
  const x = start.left + 10;
  const y = start.top + 10;
  fireEvent.pointerDown(from, { ...pointer, clientX: x, clientY: y });
  fireEvent.pointerMove(document, {
    ...pointer,
    clientX: x + 8,
    clientY: y + 8,
  });
  await frame();
  fireEvent.pointerMove(document, { ...pointer, clientX: to.x, clientY: to.y });
  await frame();
  fireEvent.pointerMove(document, {
    ...pointer,
    clientX: to.x + 1,
    clientY: to.y + 1,
  });
  await frame();
  fireEvent.pointerUp(document, { ...pointer, clientX: to.x, clientY: to.y });
  await frame();
}

const card = (title: string) =>
  screen
    .getAllByRole("group", { name: title })
    .find((node) => node.classList.contains("sprout-board-card"))!;
const titlesIn = (name: string) =>
  [
    ...(document
      .querySelector(`[role="list"][aria-label^="${name},"]`)
      ?.querySelectorAll(".sprout-board-card-title") ?? []),
  ].map((node) => node.textContent);
const status = () =>
  document.querySelector(".sprout-board-status")?.textContent;

beforeEach(() => {
  // The virtualizers read element sizes, which jsdom leaves at 0.
  vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(1000);
  vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(1200);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      if (this.classList.contains("sprout-board-card-slot")) return 50;
      return this.classList.contains("sprout-board-lane") ? LANE_HEIGHT : 0;
    },
  );
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    fakeRect,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Board cards", () => {
  it("opens a card on click and Enter", () => {
    const onItemOpen = vi.fn();
    render(<Harness onItemOpen={onItemOpen} />);
    fireEvent.click(card("Plant tulips"));
    fireEvent.keyDown(card("Order soil"), { key: "Enter" });
    expect(onItemOpen.mock.calls.map(([item]) => item.id)).toEqual(["a", "b"]);
    expect(card("Plant tulips").hasAttribute("data-openable")).toBe(true);
  });

  it("selects with modifier clicks, a shift range, and clears", () => {
    render(<Harness />);
    fireEvent.click(card("Plant tulips"), { metaKey: true });
    expect(status()).toContain("1 selected");
    fireEvent.click(card("Paint shed"), { shiftKey: true });
    expect(status()).toContain("3 selected");
    fireEvent.click(card("Order soil"), { ctrlKey: true });
    expect(status()).toContain("2 selected");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(status()).toBe("4 cards");
    fireEvent.click(card("Fix gate"), { metaKey: true });
    fireEvent.keyDown(card("Fix gate"), { key: "Escape" });
    expect(status()).toBe("4 cards");
  });

  it("renames by F2, double-click, and the menu", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    fireEvent.keyDown(card("Plant tulips"), { key: "F2" });
    const field = screen.getByRole("textbox", { name: "Card title" });
    fireEvent.change(field, { target: { value: "Plant bulbs" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(latestItems[0]!.title).toBe("Plant bulbs");

    fireEvent.doubleClick(card("Order soil"));
    const second = screen.getByRole("textbox", { name: "Card title" });
    fireEvent.change(second, { target: { value: "Ignored" } });
    fireEvent.keyDown(second, { key: "Escape" });
    expect(latestItems[1]!.title).toBe("Order soil");

    await user.click(
      screen.getByRole("button", { name: "Actions for Fix gate" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Rename" }));
    const third = screen.getByRole("textbox", { name: "Card title" });
    fireEvent.change(third, { target: { value: "Mend gate" } });
    fireEvent.blur(third);
    expect(latestItems[2]!.title).toBe("Mend gate");
  });

  it("shows app actions after Rename", async () => {
    const user = userEvent.setup();
    const remove = vi.fn();
    render(
      <Harness
        itemActions={(item) => (
          <DropdownMenuItem onClick={() => remove(item.id)}>
            Delete card
          </DropdownMenuItem>
        )}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Actions for Order soil" }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Delete card" }),
    );
    expect(remove).toHaveBeenCalledWith("b");
  });

  it("renders custom cards with the board's title and menu", () => {
    render(
      <Harness
        renderTitle={(item) => <b>#{item.id}</b>}
        renderCard={(item, parts) => (
          <article data-testid={`custom-${item.id}`}>
            {parts.title}
            {parts.menu}
          </article>
        )}
      />,
    );
    const custom = screen.getByTestId("custom-a");
    expect(custom.textContent).toContain("#a");
    expect(
      within(custom).getByRole("button", { name: "Actions for Plant tulips" }),
    ).toBeTruthy();
    expect(card("Plant tulips").hasAttribute("data-custom")).toBe(true);
  });

  it("shows read-only cards without a menu", () => {
    render(
      <Board
        columns={startColumns}
        items={startItems}
        renderBody={(item) => <i>{item.id}</i>}
      />,
    );
    expect(screen.queryByRole("button", { name: /^Actions for/ })).toBeNull();
    expect(card("Plant tulips").getAttribute("aria-roledescription")).toBe(
      "card",
    );
    expect(card("Plant tulips").getAttribute("aria-describedby")).toBeTruthy();
  });
});

describe("Board toolbar", () => {
  it("filters by title and extra search text", () => {
    render(<Harness searchText={(item) => item.columnId} />);
    const search = screen.getByRole("searchbox", { name: "Search cards" });
    fireEvent.change(search, { target: { value: "soil" } });
    expect(status()).toBe("1 of 4 cards");
    fireEvent.change(search, { target: { value: "doing" } });
    expect(status()).toBe("2 of 4 cards");
    fireEvent.change(search, { target: { value: "zebra" } });
    expect(status()).toBe("No cards match “zebra”");
  });

  it("changes lanes with the Lanes by select", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Harness
        laneBy={{
          value: "person",
          options: [
            { value: "person", label: "Person" },
            { value: "column", label: "Column" },
          ],
          onChange,
        }}
      />,
    );
    await user.click(screen.getByRole("combobox", { name: "Lanes by" }));
    await user.click(await screen.findByRole("option", { name: "Column" }));
    expect(onChange).toHaveBeenCalledWith("column");
  });
});

describe("Board cells, lanes, and columns", () => {
  it("adds cards and keeps the field open", () => {
    render(<Harness withLanes={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Add card to To do" }));
    const field = screen.getByRole("textbox", { name: "New card in To do" });
    fireEvent.change(field, { target: { value: "Rake leaves" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(latestItems.at(-1)).toMatchObject({
      title: "Rake leaves",
      columnId: "todo",
      laneId: undefined,
    });
    expect(
      screen.getByRole("textbox", { name: "New card in To do" }),
    ).toBeTruthy();
    fireEvent.keyDown(field, { key: "Escape" });
    expect(
      screen.queryByRole("textbox", { name: "New card in To do" }),
    ).toBeNull();
  });

  it("adds a column", () => {
    const onColumnAdd = vi.fn();
    render(<Harness onColumnAdd={onColumnAdd} />);
    fireEvent.click(screen.getByRole("button", { name: "Add column" }));
    const field = screen.getByRole("textbox", { name: "New column" });
    fireEvent.change(field, { target: { value: "Later" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onColumnAdd).toHaveBeenCalledWith("Later");
  });

  it("collapses lanes and columns", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const laneToggle = screen.getByRole("button", { name: /^Ana/ });
    fireEvent.click(laneToggle);
    expect(laneToggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(laneToggle);

    fireEvent.click(screen.getByRole("button", { name: "Collapse To do" }));
    expect(
      screen.getAllByRole("group", {
        name: /^To do, Ana, \d cards, collapsed/,
      }),
    ).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Expand To do" }));

    await user.click(
      screen.getByRole("button", { name: "Done column actions" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Collapse" }));
    expect(screen.getByRole("button", { name: "Expand Done" })).toBeTruthy();
  });

  it("marks a column over its limit", () => {
    render(<Harness />);
    expect(
      screen.getByRole("group", { name: "Doing, 2 cards, over limit" }),
    ).toBeTruthy();
    expect(screen.getByText("Over limit")).toBeTruthy();
  });

  it("renames a column from its title and its menu", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Rename To do" }));
    const field = screen.getByRole("textbox", { name: "Column title" });
    fireEvent.change(field, { target: { value: "Backlog" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(latestColumns[0]!.title).toBe("Backlog");

    await user.click(
      screen.getByRole("button", { name: "Done column actions" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Rename" }));
    expect(screen.getByRole("textbox", { name: "Column title" })).toBeTruthy();
  });

  it.each([
    ["Doing", "Its 2 cards are deleted too.", 2],
    ["Done", "The column is empty.", 4],
  ])("deletes the %s column after confirming", async (name, text, left) => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(
      screen.getByRole("button", { name: `${name} column actions` }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Delete column…" }),
    );
    expect((await screen.findByRole("alertdialog")).textContent).toContain(
      text,
    );
    await user.click(screen.getByRole("button", { name: "Delete column" }));
    expect(latestColumns.map((c) => c.title)).not.toContain(name);
    expect(latestItems).toHaveLength(left);
  });

  it("shows fixed columns without tools", () => {
    render(<Board columns={startColumns} items={startItems} />);
    expect(screen.queryByRole("button", { name: /^Rename/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Move/ })).toBeNull();
  });

  it("marks hidden columns at the scroll edges", () => {
    render(<Harness />);
    const viewport = screen.getByRole("region", { name: "Farm board" });
    Object.defineProperties(viewport, {
      scrollWidth: { value: 1000, configurable: true },
      clientWidth: { value: 400, configurable: true },
      scrollLeft: { value: 200, configurable: true, writable: true },
    });
    fireEvent.scroll(viewport);
    const frameEl = viewport.parentElement!;
    expect(frameEl.hasAttribute("data-more-start")).toBe(true);
    expect(frameEl.hasAttribute("data-more-end")).toBe(true);
  });
});

describe("Board drag and drop", () => {
  it("moves a card to another cell", async () => {
    render(<Harness />);
    await drag(card("Plant tulips"), {
      x: 2 * COLUMN_WIDTH + 100,
      y: 40 + LANE_HEIGHT + 200,
    });
    expect(latestItems.find((i) => i.id === "a")).toMatchObject({
      columnId: "done",
      laneId: "ben",
    });
  });

  it("moves a card before another card in a new cell", async () => {
    render(<Harness withLanes={false} />);
    await drag(card("Plant tulips"), { x: COLUMN_WIDTH + 100, y: 50 });
    expect(titlesIn("Doing")).toEqual([
      "Plant tulips",
      "Fix gate",
      "Paint shed",
    ]);
  });

  it("moves a card after another card in a new cell", async () => {
    render(<Harness withLanes={false} />);
    await drag(card("Plant tulips"), { x: COLUMN_WIDTH + 100, y: 250 });
    expect(titlesIn("Doing")).toEqual([
      "Fix gate",
      "Paint shed",
      "Plant tulips",
    ]);
  });

  it("reorders cards in a cell", async () => {
    render(<Harness withLanes={false} />);
    await drag(card("Plant tulips"), { x: 100, y: 110 });
    expect(titlesIn("To do")).toEqual(["Order soil", "Plant tulips"]);
  });

  it("moves every selected card together", async () => {
    render(<Harness withLanes={false} />);
    fireEvent.click(card("Plant tulips"), { metaKey: true });
    fireEvent.click(card("Order soil"), { metaKey: true });
    await drag(card("Plant tulips"), { x: 2 * COLUMN_WIDTH + 100, y: 300 });
    expect(titlesIn("Done")).toEqual(["Plant tulips", "Order soil"]);
    expect(titlesIn("To do")).toEqual([]);
  });

  it("leaves the list alone when a card drops where it was", async () => {
    const onItemsChange = vi.fn();
    render(
      <Board
        columns={startColumns}
        items={startItems}
        onItemsChange={onItemsChange}
      />,
    );
    await drag(card("Plant tulips"), { x: 100, y: 300 });
    expect(onItemsChange).not.toHaveBeenCalled();
  });

  it("reorders columns by their header", async () => {
    render(<Harness />);
    await drag(screen.getByRole("button", { name: "Move To do" }), {
      x: 2 * COLUMN_WIDTH + 20,
      y: 20,
    });
    expect(latestColumns.map((c) => c.id)).toEqual(["doing", "done", "todo"]);
  });

  it("picks up with Space and cancels with Escape", async () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
    } as MediaQueryList);
    render(<Harness />);
    const target = card("Plant tulips");
    target.focus();
    fireEvent.keyDown(target, { key: " ", code: "Space" });
    await frame();
    expect(document.body.textContent).toContain("Picked up card Plant tulips.");
    fireEvent.keyDown(target, { key: "Escape", code: "Escape" });
    await frame();
    expect(document.body.textContent).toContain(
      "Move cancelled. The card went back.",
    );
    expect(latestItems).toEqual(startItems);
  });
});
