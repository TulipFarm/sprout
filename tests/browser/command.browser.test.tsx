import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
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
} from "../../packages/sprout/src/components/command.js";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../packages/sprout/src/components/popover.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

function Palette({ onPick = () => {} }: { onPick?: (value: string) => void }) {
  return (
    <Command label="Search sample commands">
      <CommandInput placeholder="Search sample commands…" />
      <CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem onSelect={onPick}>
            New draft
            <CommandShortcut>⌘ N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={onPick}>Open folder</CommandItem>
          <CommandItem disabled onSelect={onPick}>
            Unavailable action
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem onSelect={onPick}>Preferences</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

function Picked() {
  const [picked, setPicked] = useState("");
  return (
    <div style={{ width: 360, padding: 16 }}>
      <Palette onPick={setPicked} />
      <p role="status">{picked && `Chosen: ${picked}`}</p>
    </div>
  );
}

function Launcher() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState("");
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Search commands
      </Button>
      <p role="status">{last}</p>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Palette
          onPick={(value) => {
            setLast(value);
            setOpen(false);
          }}
        />
      </CommandDialog>
    </>
  );
}

const projects = [
  "Personal chats",
  "Q4 hiring plan",
  "Lisbon office launch",
  "Archived supplier onboarding programme for the northern region warehouses (archived)",
];

function Picker() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        Project
      </PopoverTrigger>
      <PopoverContent size="picker" align="start">
        <Command label="Chat projects">
          <CommandInput placeholder="Search projects…" />
          <CommandList>
            {projects.map((name) => (
              <CommandItem key={name} onSelect={() => setOpen(false)}>
                {name}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const input = () => page.getByRole("combobox").first();
const active = () =>
  document
    .getElementById(
      input().element().getAttribute("aria-activedescendant") ?? "",
    )
    ?.getAttribute("data-value");

/** The panel stays in the viewport, and nothing inside it spills sideways. */
function contained(node: Element) {
  const box = node.getBoundingClientRect();
  const inside = [...node.querySelectorAll("*")].every((child) => {
    const rect = child.getBoundingClientRect();
    return (
      !rect.width || (rect.left >= box.left - 1 && rect.right <= box.right + 1)
    );
  });
  return {
    inViewport:
      box.left >= 0 &&
      box.right <= innerWidth + 0.5 &&
      box.top >= 0 &&
      box.bottom <= innerHeight + 0.5,
    inside,
    noScroll: node.scrollWidth <= node.clientWidth + 1,
  };
}

describe("Command in a real browser", () => {
  it.each(themes)(
    "%s %s passes axe inline and as a dialog",
    async (theme, mode) => {
      setTheme(theme, mode);
      const screen = await render(
        <>
          <Picked />
          <Launcher />
        </>,
      );
      await settle();
      expect(await axeViolations()).toEqual([]);
      await screen.getByRole("button", { name: "Search commands" }).click();
      await expect.element(page.getByRole("dialog")).toBeVisible();
      await settle();
      expect(await axeViolations()).toEqual([]);
    },
  );

  it("typing filters, Enter picks, and focus never leaves the search", async () => {
    const screen = await render(<Picked />);
    await userEvent.click(input());
    await expect.poll(active).toBe("New draft⌘ N");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(active()).toBe("Preferences");
    await userEvent.keyboard("{Control>}p{/Control}");
    expect(active()).toBe("Open folder");
    await userEvent.fill(input(), "PREF");
    await expect
      .poll(() => screen.getByRole("option").elements().length)
      .toBe(1);
    await expect.element(screen.getByText("Suggestions")).not.toBeVisible();
    expect(active()).toBe("Preferences");
    await userEvent.keyboard("{Enter}");
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent("Chosen: Preferences");
    await expect.element(input()).toHaveFocus();

    await userEvent.fill(input(), "zzz");
    await expect
      .element(screen.getByText("No matching commands."))
      .toBeVisible();
    await expect.element(input()).toHaveAttribute("aria-expanded", "false");
    await userEvent.fill(input(), "");
    await expect
      .poll(() => screen.getByRole("option").elements().length)
      .toBe(4);
  });

  it("hover highlights, disabled items do not, and clicks keep focus in the search", async () => {
    const screen = await render(<Picked />);
    await userEvent.click(input());
    const folder = screen.getByRole("option", { name: "Open folder" });
    await folder.hover();
    await expect.element(folder).toHaveAttribute("data-selected", "true");
    await settle();
    const before = getComputedStyle(folder.element()).backgroundColor;
    expect(before).not.toBe("rgba(0, 0, 0, 0)");
    await screen
      .getByRole("option", { name: "Unavailable action" })
      .hover({ force: true });
    await expect.element(folder).toHaveAttribute("data-selected", "true");
    await folder.click();
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent("Chosen: Open folder");
    await expect.element(input()).toHaveFocus();
  });

  it("the dialog focuses its search, closes on pick or Escape, and restores focus", async () => {
    const screen = await render(<Launcher />);
    const trigger = screen.getByRole("button", { name: "Search commands" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Command Palette" });
    await expect.element(dialog).toBeVisible();
    await expect.element(input()).toHaveFocus();
    await userEvent.keyboard("fold{Enter}");
    await expect.element(dialog).not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent("Open folder");
    await expect.element(trigger).toHaveFocus();
    await trigger.click();
    await expect.element(dialog).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  it("dialog and popover pickers fit a phone and wrap long names", async () => {
    await page.viewport(390, 844);
    const screen = await render(
      <div style={{ padding: 16 }}>
        <Picker />
        <Launcher />
      </div>,
    );
    await screen.getByRole("button", { name: "Project" }).click();
    await settle();
    const popover = document.querySelector(
      '[data-slot="popover-content"][data-open]',
    )!;
    expect(contained(popover)).toEqual({
      inViewport: true,
      inside: true,
      noScroll: true,
    });
    const [short, long] = [projects[1]!, projects[3]!].map(
      (name) =>
        page.getByRole("option", { name }).element().getBoundingClientRect()
          .height,
    );
    expect(long!).toBeGreaterThan(short! + 10);
    await userEvent.keyboard("{Escape}");
    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();

    await screen.getByRole("button", { name: "Search commands" }).click();
    await settle();
    const dialog = page
      .getByRole("dialog", { name: "Command Palette" })
      .element();
    expect(contained(dialog)).toEqual({
      inViewport: true,
      inside: true,
      noScroll: true,
    });
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("highlights animate only when motion is allowed", async () => {
    const screen = await render(<Picked />);
    const item = screen.getByRole("option", { name: "Open folder" }).element();
    expect(getComputedStyle(item).transitionDuration).toBe("0.12s");
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(item).transitionDuration).toBe("0s");
  });
});
