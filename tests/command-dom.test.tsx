// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  type CommandProps,
} from "../packages/sprout/src/components/command.js";

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.scrollTo = vi.fn();
});

const flush = () => act(async () => {});

function Palette({
  onSelect = () => {},
  extra,
  ...props
}: Partial<CommandProps> & {
  onSelect?: (value: string) => void;
  extra?: React.ReactNode;
}) {
  return (
    <Command label="Commands" {...props}>
      <CommandInput />
      <CommandList>
        <CommandEmpty>
          No match <button type="button">Clear</button>
        </CommandEmpty>
        <CommandGroup heading="Plants">
          <CommandItem onSelect={onSelect}>
            <span>Tulip</span>
          </CommandItem>
          <CommandItem onSelect={onSelect} disabled>
            Rose
          </CommandItem>
          <CommandItem onSelect={onSelect} keywords={["sunny"]}>
            Daisy
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandSeparator alwaysRender />
        <CommandGroup heading="Tools">
          <CommandItem value="hoe" onSelect={onSelect}>
            Hoe <CommandShortcut>H</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={onSelect}>{["Rake", 2]}</CommandItem>
        </CommandGroup>
        <CommandItem onSelect={onSelect} forceMount>
          Help
        </CommandItem>
        {extra}
      </CommandList>
    </Command>
  );
}

const input = () => screen.getByRole("combobox");
const active = () =>
  document.getElementById(input().getAttribute("aria-activedescendant") ?? "")
    ?.dataset.value;
const key = (k: string, init: object = {}) =>
  fireEvent.keyDown(input(), { key: k, ...init });

describe("Command in the DOM", () => {
  it("moves through items with the keyboard and selects with Enter", async () => {
    const onSelect = vi.fn();
    render(<Palette onSelect={onSelect} />);
    await flush();
    expect(active()).toBe("Tulip");
    key("ArrowDown");
    expect(active()).toBe("Daisy");
    key("ArrowDown");
    expect(active()).toBe("hoe");
    key("ArrowUp");
    key("j", { ctrlKey: true });
    key("n", { ctrlKey: true });
    expect(active()).toBe("Rake2");
    key("k", { ctrlKey: true });
    key("p", { ctrlKey: true });
    expect(active()).toBe("Daisy");
    key("j");
    expect(active()).toBe("Daisy");
    key("End");
    expect(active()).toBe("Help");
    key("ArrowDown");
    expect(active()).toBe("Help");
    key("Home");
    expect(active()).toBe("Tulip");
    key("ArrowDown", { metaKey: true });
    expect(active()).toBe("Help");
    key("ArrowUp", { metaKey: true });
    key("ArrowDown", { altKey: true });
    expect(active()).toBe("hoe");
    key("ArrowDown", { altKey: true });
    expect(active()).toBe("Help");
    key("ArrowDown", { altKey: true });
    expect(active()).toBe("Help");
    key("ArrowUp", { altKey: true });
    expect(active()).toBe("hoe");
    key("Enter");
    expect(onSelect).toHaveBeenCalledWith("hoe");
    key("x");
  });

  it("wraps with loop and starts from the ends with no active item", async () => {
    render(<Palette loop />);
    await flush();
    key("ArrowUp");
    expect(active()).toBe("Help");
    key("ArrowDown");
    expect(active()).toBe("Tulip");
  });

  it("filters, ranks, and shows the empty state", async () => {
    render(<Palette />);
    await flush();
    fireEvent.change(input(), { target: { value: "sun" } });
    expect(active()).toBe("Daisy");
    expect(screen.queryByText("Tulip")).toBeNull();
    expect(screen.getByText("Help")).toBeTruthy();
    expect(
      document.querySelectorAll("[data-slot='command-separator']"),
    ).toHaveLength(1);
    const tools = screen
      .getByText("Tools")
      .closest<HTMLElement>("[data-slot='command-group']")!;
    expect(tools.hidden).toBe(true);

    fireEvent.change(input(), { target: { value: "zzzz" } });
    fireEvent.change(input(), { target: { value: "zzzz" } });
    expect(screen.getByText("No match")).toBeTruthy();
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.keyDown(screen.getByRole("button", { name: "Clear" }), {
      key: "ArrowDown",
    });
  });

  it("ignores keys that were handled, composing, or from other controls", async () => {
    render(
      <Palette
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") event.preventDefault();
        }}
      />,
    );
    await flush();
    key("ArrowUp");
    expect(active()).toBe("Tulip");
    key("ArrowDown", { isComposing: true });
    expect(active()).toBe("Tulip");
  });

  it("selects and activates items with the pointer", async () => {
    const onSelect = vi.fn();
    const onClick = vi.fn((event: React.MouseEvent) => event.preventDefault());
    render(
      <Palette
        onSelect={onSelect}
        extra={
          <CommandItem
            onClick={onClick}
            onPointerMove={(event) => event.preventDefault()}
            onPointerDown={(event) => event.preventDefault()}
          >
            Quiet
          </CommandItem>
        }
      />,
    );
    await flush();
    const daisy = screen.getByText("Daisy");
    fireEvent.pointerMove(daisy);
    expect(active()).toBe("Daisy");
    fireEvent.pointerDown(daisy);
    fireEvent.click(daisy);
    expect(onSelect).toHaveBeenCalledWith("Daisy");
    fireEvent.pointerMove(screen.getByText("Rose"));
    fireEvent.click(screen.getByText("Rose"));
    expect(onSelect).toHaveBeenCalledOnce();
    const quiet = screen.getByText("Quiet");
    fireEvent.pointerMove(quiet);
    fireEvent.pointerDown(quiet);
    fireEvent.click(quiet);
    expect(active()).toBe("Daisy");
    expect(onClick).toHaveBeenCalled();
  });

  it("supports controlled search, custom filters, and turning filtering off", async () => {
    const ref = createRef<HTMLDivElement>();
    const refFn = vi.fn();
    function Controlled() {
      const [search, setSearch] = useState("");
      const [off, setOff] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOff(true)}>
            Off
          </button>
          <Command ref={ref} shouldFilter={!off}>
            <CommandInput
              aria-label="Find"
              value={search}
              onValueChange={setSearch}
              onChange={() => {}}
            />
            <CommandList aria-labelledby="x">
              <CommandItem>Alpha</CommandItem>
              <CommandItem>Beta</CommandItem>
            </CommandList>
          </Command>
          <Command ref={refFn} filter={(v) => (v === "Gamma" ? 1 : 0)}>
            <CommandInput aria-label="Second" defaultValue="" />
            <CommandList>
              <CommandItem>Gamma</CommandItem>
              <CommandItem>Delta</CommandItem>
            </CommandList>
          </Command>
        </>
      );
    }
    render(<Controlled />);
    await flush();
    expect(ref.current?.dataset.slot).toBe("command");
    expect(refFn).toHaveBeenCalled();
    fireEvent.change(screen.getByRole("combobox", { name: "Find" }), {
      target: { value: "bet" },
    });
    expect(screen.queryByText("Alpha")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Off" }));
    expect(screen.getByText("Alpha")).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: "Second" }), {
      target: { value: "a" },
    });
    expect(screen.queryByText("Delta")).toBeNull();
  });

  it("picks a new active item when the active one unmounts", async () => {
    function Removable() {
      const [show, setShow] = useState(true);
      return (
        <Command>
          <CommandInput aria-label="Find" />
          <CommandList>
            {show && (
              <CommandItem onSelect={() => setShow(false)}>Gone</CommandItem>
            )}
            <CommandItem>Stay</CommandItem>
          </CommandList>
        </Command>
      );
    }
    render(<Removable />);
    await flush();
    expect(active()).toBe("Gone");
    key("Enter");
    await flush();
    expect(active()).toBe("Stay");
  });

  it("does nothing on Enter or arrows with no items", async () => {
    render(
      <Command>
        <CommandInput aria-label="Find" />
        <CommandList />
      </Command>,
    );
    await flush();
    key("Enter");
    key("ArrowDown");
    expect(input().getAttribute("aria-activedescendant")).toBeNull();
  });

  it("opens as a dialog", async () => {
    render(
      <CommandDialog open title="Run">
        <Palette />
      </CommandDialog>,
    );
    await flush();
    expect(screen.getByRole("dialog", { name: "Run" })).toBeTruthy();
  });
});
