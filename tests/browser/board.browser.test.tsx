import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  Board,
  type BoardColumn,
  type BoardItem,
} from "../../packages/sprout/src/components/board.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const startColumns: BoardColumn[] = [
  { id: "todo", title: "To do" },
  { id: "doing", title: "Doing", limit: 1 },
  { id: "done", title: "Done" },
];

const startItems: BoardItem[] = [
  { id: "a", title: "Plant tulips", columnId: "todo", laneId: "ana" },
  { id: "b", title: "Order soil", columnId: "todo", laneId: "ana" },
  { id: "c", title: "Fix gate", columnId: "doing", laneId: "ben" },
];

const lanes = [
  { id: "ana", title: "Ana" },
  { id: "ben", title: "Ben" },
];

let latest: BoardItem[] = [];

function Harness({ withLanes = true }: { withLanes?: boolean }) {
  const [columns, setColumns] = useState(startColumns);
  const [items, setItems] = useState(startItems);
  latest = items;
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
    />
  );
}

const titlesIn = (container: HTMLElement, name: string) =>
  [
    ...(container
      .querySelector(`[role="list"][aria-label^="${name},"]`)
      ?.querySelectorAll(".sprout-board-card-title") ?? []),
  ].map((node) => node.textContent);

const wait = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Board in a real browser", () => {
  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    setTheme(theme, mode);
    await emulate({ reducedMotion: true });
    const screen = await render(<Harness />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it("moves a card to the next column with the keyboard", async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Harness />);
    await settle();
    const card = screen.container.querySelector<HTMLElement>(
      '[aria-label="Plant tulips"]',
    )!;
    card.focus();
    await userEvent.keyboard(" ");
    await wait();
    await userEvent.keyboard("{ArrowRight}");
    await wait();
    await userEvent.keyboard(" ");
    await wait();
    expect(latest.find((i) => i.id === "a")?.columnId).toBe("doing");
    expect(titlesIn(screen.container, "Doing, Ana")).toEqual(["Plant tulips"]);
  });

  it("Escape puts a picked-up card back", async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Harness />);
    await settle();
    screen.container
      .querySelector<HTMLElement>('[aria-label="Plant tulips"]')!
      .focus();
    await userEvent.keyboard(" ");
    await wait();
    await userEvent.keyboard("{ArrowRight}");
    await wait();
    await userEvent.keyboard("{Escape}");
    await wait();
    expect(latest.find((i) => i.id === "a")?.columnId).toBe("todo");
    expect(titlesIn(screen.container, "To do, Ana")).toEqual([
      "Plant tulips",
      "Order soil",
    ]);
  });

  it("renames a card from its menu", async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Harness />);
    await settle();
    await screen
      .getByRole("button", { name: "Actions for Order soil" })
      .click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    const input = screen.getByRole("textbox", { name: "Card title" });
    await input.fill("Order compost");
    await userEvent.keyboard("{Enter}");
    expect(latest.find((i) => i.id === "b")?.title).toBe("Order compost");
  });

  it("F2 renames the focused card", async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Harness />);
    await settle();
    screen.container
      .querySelector<HTMLElement>('[aria-label="Plant tulips"]')!
      .focus();
    await userEvent.keyboard("{F2}");
    const input = screen.getByRole("textbox", { name: "Card title" });
    await input.fill("Plant bulbs");
    await userEvent.keyboard("{Enter}");
    expect(latest.find((i) => i.id === "a")?.title).toBe("Plant bulbs");
  });

  it("adds cards in a cell and keeps the field open", async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Harness withLanes={false} />);
    await settle();
    await screen.getByRole("button", { name: "Add card to Done" }).click();
    const input = screen.getByRole("textbox", { name: "New card in Done" });
    await input.fill("Water beds");
    await userEvent.keyboard("{Enter}");
    await input.fill("Rake paths");
    await userEvent.keyboard("{Enter}");
    expect(titlesIn(screen.container, "Done")).toEqual([
      "Water beds",
      "Rake paths",
    ]);
    await userEvent.keyboard("{Escape}");
    await expect
      .element(screen.getByRole("button", { name: "Add card to Done" }))
      .toBeVisible();
  });

  it("search filters cards and says how many match", async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Harness />);
    await settle();
    await screen.getByRole("searchbox", { name: "Search cards" }).fill("gate");
    await expect.element(screen.getByText("1 of 3 cards")).toBeVisible();
    expect(titlesIn(screen.container, "To do, Ana")).toEqual([]);
    expect(titlesIn(screen.container, "Doing, Ben")).toEqual(["Fix gate"]);
  });

  it("collapses a column to a strip and back", async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Harness />);
    await settle();
    await screen.getByRole("button", { name: "Collapse To do" }).click();
    expect(titlesIn(screen.container, "To do, Ana")).toEqual([]);
    expect(
      screen.container.querySelector(
        '[aria-label="To do, Ana, 2 cards, collapsed"]',
      ),
    ).not.toBeNull();
    await screen.getByRole("button", { name: "Expand To do" }).click();
    expect(titlesIn(screen.container, "To do, Ana")).toHaveLength(2);
  });

  it("deletes a column and its cards after confirming", async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Harness />);
    await settle();
    await screen.getByRole("button", { name: "Doing column actions" }).click();
    await page.getByRole("menuitem", { name: "Delete column…" }).click();
    await expect
      .element(page.getByText("Its 1 card is deleted too.", { exact: false }))
      .toBeVisible();
    await page.getByRole("button", { name: "Delete column" }).click();
    await wait();
    expect(latest.map((i) => i.id)).toEqual(["a", "b"]);
    expect(screen.container.querySelector('[aria-label^="Doing,"]')).toBeNull();
  });
});
