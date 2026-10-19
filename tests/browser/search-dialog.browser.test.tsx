import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
import {
  SearchDialog,
  SearchEmpty,
  SearchFilter,
  SearchFilters,
  SearchFooter,
  SearchGroup,
  SearchHint,
  SearchInput,
  SearchItem,
  SearchItemIcon,
  SearchList,
} from "../../packages/sprout/src/components/search-dialog.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const Dot = () => (
  <svg viewBox="0 0 16 16" width="16" height="16">
    <circle cx="8" cy="8" r="5" fill="currentColor" />
  </svg>
);

interface Entry {
  id: string;
  title: string;
  group: "Pages" | "Actions";
  doc?: boolean;
  shared?: boolean;
  meta?: string;
  detail?: string;
  trailing?: string;
}

const records: Entry[] = [
  {
    id: "home",
    title: "Home",
    group: "Pages",
    doc: true,
    meta: "Document",
    detail: "Edited 2 hours ago · Notes",
  },
  {
    id: "chats",
    title: "Chats",
    group: "Pages",
    shared: true,
    trailing: "G C",
  },
  { id: "tables", title: "Tables", group: "Pages", doc: true, shared: true },
  { id: "new-chat", title: "New chat", group: "Actions", trailing: "C" },
  {
    id: "review",
    title: "Quarterly planning review with the whole spring bulb sourcing team",
    group: "Actions",
    detail: "2:00 PM – 3:30 PM",
  },
];

function Palette({ onChoose = () => {} }: { onChoose?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState(false);
  const [shared, setShared] = useState(false);
  const shown = records.filter(
    (r) =>
      r.title.toLowerCase().includes(query.toLowerCase()) &&
      (!docs || r.doc) &&
      (!shared || r.shared),
  );
  const group = (name: Entry["group"]) => shown.filter((r) => r.group === name);
  const choose = (id: string) => {
    onChoose(id);
    setOpen(false);
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open search</Button>
      <SearchDialog
        open={open}
        onOpenChange={setOpen}
        title="Search records"
        description="Find pages and actions."
      >
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search…"
          label="Search records"
        />
        <SearchFilters label="Record type">
          <SearchFilter pressed={docs} onPressedChange={setDocs} icon={<Dot />}>
            Documents only
          </SearchFilter>
          <SearchFilter pressed={shared} onPressedChange={setShared}>
            Shared with me
          </SearchFilter>
        </SearchFilters>
        <SearchList label="Results">
          {shown.length === 0 ? (
            <SearchEmpty
              media={
                <>
                  <Dot />
                  <Dot />
                  <Dot />
                </>
              }
              title="No records found"
              description="Try another word or clear the filters."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setDocs(false);
                    setShared(false);
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            (["Pages", "Actions"] as const).map((name) => (
              <SearchGroup key={name} heading={name} count={group(name).length}>
                {group(name).map((r) => (
                  <SearchItem
                    key={r.id}
                    value={r.id}
                    onSelect={() => choose(r.id)}
                    media={
                      <SearchItemIcon>
                        <Dot />
                      </SearchItemIcon>
                    }
                    title={r.title}
                    meta={r.meta}
                    detail={r.detail}
                    trailing={r.trailing}
                  />
                ))}
              </SearchGroup>
            ))
          )}
        </SearchList>
        <SearchFooter>
          <SearchHint keys="↑↓">Select</SearchHint>
          <SearchHint keys="↵">Open</SearchHint>
          <SearchHint keys="Esc">Close</SearchHint>
        </SearchFooter>
      </SearchDialog>
    </>
  );
}

const dialog = () =>
  document.querySelector<HTMLElement>('[data-slot="search-dialog"]');

function activeTitle() {
  const input = page
    .getByRole("combobox", { name: "Search records" })
    .element();
  const id = input.getAttribute("aria-activedescendant");
  return id
    ? document
        .getElementById(id)
        ?.querySelector('[data-slot="search-item-title"]')?.textContent
    : null;
}

/** The dialog stays in the viewport, and nothing outside the filter strip spills sideways. */
function contained(popup: HTMLElement) {
  const box = popup.getBoundingClientRect();
  const inside = [...popup.querySelectorAll("*")]
    .filter(
      (child) =>
        !child.closest('[data-slot="search-filters"]') ||
        child.matches('[data-slot="search-filters"]'),
    )
    .every((child) => {
      const rect = child.getBoundingClientRect();
      return (
        !rect.width ||
        (rect.left >= box.left - 1 && rect.right <= box.right + 1)
      );
    });
  return {
    inViewport:
      box.left >= 0 &&
      box.right <= innerWidth + 0.5 &&
      box.top >= 0 &&
      box.bottom <= innerHeight + 0.5,
    inside,
    noScroll: popup.scrollWidth <= popup.clientWidth + 1,
  };
}
const fits = { inViewport: true, inside: true, noScroll: true };

async function openPalette(onChoose?: (id: string) => void) {
  const screen = await render(<Palette onChoose={onChoose} />);
  const trigger = screen.getByRole("button", { name: "Open search" });
  await trigger.click();
  await settle();
  await expect.poll(dialog).toBeTruthy();
  return { screen, trigger };
}

describe("SearchDialog in a real browser", () => {
  it.each(themes)(
    "%s %s passes axe and stays contained",
    async (theme, mode) => {
      setTheme(theme, mode);
      await openPalette();
      expect(contained(dialog()!)).toEqual(fits);
      expect(await axeViolations()).toEqual([]);
      await page.getByRole("combobox", { name: "Search records" }).fill("zzz");
      await expect.element(page.getByText("No records found")).toBeVisible();
      expect(await axeViolations()).toEqual([]);
    },
  );

  it("focuses the input, names groups with counts, and shows hints", async () => {
    await openPalette();
    await expect
      .element(page.getByRole("combobox", { name: "Search records" }))
      .toHaveFocus();
    await expect
      .element(page.getByRole("listbox", { name: "Results" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("group", { name: "Pages 3" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("group", { name: "Actions 2" }))
      .toBeVisible();
    expect(
      [...document.querySelectorAll('[data-slot="search-hint"]')].map(
        (hint) => hint.textContent,
      ),
    ).toEqual(["↑↓Select", "↵Open", "EscClose"]);
    const footer = document.querySelector('[data-slot="search-footer"]')!;
    expect(getComputedStyle(footer).display).not.toBe("none");
  });

  it("arrow keys wrap, the active item shows Enter, and Enter chooses it", async () => {
    const chosen: string[] = [];
    const { trigger } = await openPalette((id) => chosen.push(id));
    expect(activeTitle()).toBe("Home");
    const enter = () =>
      document.querySelector<HTMLElement>(
        "[data-selected] .sprout-search-item-enter",
      )!;
    expect(getComputedStyle(enter()).display).not.toBe("none");
    await userEvent.keyboard("{ArrowUp}");
    expect(activeTitle()).toBe(records[4]!.title);
    await userEvent.keyboard("{ArrowDown}");
    expect(activeTitle()).toBe("Home");
    await userEvent.keyboard("{ArrowDown}");
    expect(activeTitle()).toBe("Chats");
    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(activeTitle()).toBe("New chat");
    await userEvent.keyboard("{Enter}");
    expect(chosen).toEqual(["new-chat"]);
    await expect.poll(dialog).toBeNull();
    await expect.element(trigger).toHaveFocus();
  });

  it("trailing hints swap for Enter on the active item, and meta and detail render", async () => {
    await openPalette();
    const option = (name: string) =>
      page.getByRole("option", { name: new RegExp(name) }).element();
    const trailing = (name: string) =>
      option(name).querySelector<HTMLElement>(
        '[data-slot="search-item-trailing"]',
      );
    expect(trailing("Home")).toBeNull();
    expect(trailing("New chat")!.textContent).toBe("C");
    expect(getComputedStyle(trailing("New chat")!).display).not.toBe("none");
    await userEvent.keyboard("{ArrowDown}");
    expect(option("Chats").getAttribute("aria-selected")).toBe("true");
    expect(getComputedStyle(trailing("Chats")!).display).toBe("none");
    const home = option("Home");
    expect(
      home.querySelector('[data-slot="search-item-meta"]')!.textContent,
    ).toBe("Document");
    expect(
      home.querySelector('[data-slot="search-item-detail"]')!.textContent,
    ).toBe("Edited 2 hours ago · Notes");
  });

  it("filters toggle with Space and click, and the fanned empty state recovers", async () => {
    await openPalette();
    const docs = page.getByRole("button", { name: "Documents only" });
    const shared = page.getByRole("button", { name: "Shared with me" });
    await expect.element(docs).toHaveAttribute("aria-pressed", "false");
    docs.element().focus();
    await userEvent.keyboard(" ");
    await expect.element(docs).toHaveAttribute("aria-pressed", "true");
    await expect
      .element(page.getByRole("group", { name: "Pages 2" }))
      .toBeVisible();
    await shared.click();
    await expect
      .element(page.getByRole("group", { name: "Pages 1" }))
      .toBeVisible();
    expect(contained(dialog()!)).toEqual(fits);

    const input = page.getByRole("combobox", { name: "Search records" });
    await input.fill("meadow");
    const empty = page
      .getByRole("status")
      .filter({ hasText: "No records found" });
    await expect.element(empty).toBeVisible();
    expect(page.getByRole("option").elements()).toHaveLength(0);
    expect(
      page.getByRole("group", { name: /Pages|Actions/ }).elements(),
    ).toHaveLength(0);
    const tiles = [
      ...empty.element().querySelectorAll('[data-slot="search-empty-tile"]'),
    ];
    expect(tiles.map((tile) => getComputedStyle(tile).rotate)).toEqual([
      "-8deg",
      "none",
      "8deg",
    ]);
    await empty.getByRole("button", { name: "Clear filters" }).click();
    await expect.element(docs).toHaveAttribute("aria-pressed", "false");
    await expect.element(shared).toHaveAttribute("aria-pressed", "false");
    await expect.element(input).toHaveValue("");
    await expect
      .element(page.getByRole("group", { name: "Pages 3" }))
      .toBeVisible();
  });

  it("the close button and Escape close it and return focus", async () => {
    const { trigger } = await openPalette();
    await page.getByRole("button", { name: "Close search" }).click();
    await expect.poll(dialog).toBeNull();
    await expect.element(trigger).toHaveFocus();
    await trigger.click();
    await expect.poll(dialog).toBeTruthy();
    await userEvent.keyboard("{Escape}");
    await expect.poll(dialog).toBeNull();
    await expect.element(trigger).toHaveFocus();
  });

  it("fits a 360px phone, hides the footer, and truncates long titles", async () => {
    await page.viewport(360, 720);
    await openPalette();
    const popup = dialog()!;
    expect(
      getComputedStyle(popup.querySelector('[data-slot="search-footer"]')!)
        .display,
    ).toBe("none");
    expect(contained(popup)).toEqual(fits);
    expect(popup.getBoundingClientRect().width).toBeLessThanOrEqual(
      360 - 32 + 1,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
    await page.getByRole("combobox", { name: "Search records" }).fill("review");
    const title = popup.querySelector<HTMLElement>(
      '[data-slot="search-item-title"]',
    )!;
    expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    expect(getComputedStyle(title).textOverflow).toBe("ellipsis");
    expect(contained(popup)).toEqual(fits);
    expect(await axeViolations()).toEqual([]);
  });

  it("sits 12% down at 672px wide with a steady list height", async () => {
    await page.viewport(1280, 800);
    await openPalette();
    const box = dialog()!.getBoundingClientRect();
    expect(Math.round(box.width)).toBe(672);
    expect(Math.round(box.top)).toBe(Math.round(800 * 0.12));
    const list = dialog()!.querySelector(".sprout-search-list")!;
    expect(getComputedStyle(list).height).toBe("448px");
    await page.getByRole("combobox", { name: "Search records" }).fill("home");
    expect(getComputedStyle(list).height).toBe("448px");
  });

  it("drops its transition with reduced motion", async () => {
    await emulate({ reducedMotion: true });
    await openPalette();
    expect(getComputedStyle(dialog()!).transitionDuration).toBe("0s");
  });
});
