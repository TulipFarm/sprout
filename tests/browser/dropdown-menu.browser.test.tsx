import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  type DropdownMenuContentSize,
} from "../../packages/sprout/src/components/dropdown-menu.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const Icon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 3h10v10H3z" fill="none" stroke="currentColor" />
  </svg>
);

function Playground({
  size = "menu",
  label = "Fixed-width menu",
  side,
  disabled,
}: {
  size?: DropdownMenuContentSize;
  label?: string;
  side?: "top" | "bottom";
  disabled?: boolean;
}) {
  const [completed, setCompleted] = useState(true);
  const [view, setView] = useState("list");
  const [action, setAction] = useState("No action selected.");
  return (
    <div style={{ padding: 16 }}>
      <DropdownMenu disabled={disabled}>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          {label}
        </DropdownMenuTrigger>
        <DropdownMenuContent size={size} side={side}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Tasks</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setAction("New task selected.")}>
              <Icon />
              New task<DropdownMenuShortcut>⌘ N</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled
              onClick={() => setAction("Unavailable chosen.")}
            >
              Unavailable action
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={completed}
            onCheckedChange={setCompleted}
          >
            Show completed
          </DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value={view} onValueChange={setView}>
            <DropdownMenuRadioItem value="list">List</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="grid">Grid</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Archive sample</DropdownMenuItem>
              <DropdownMenuItem>
                Orchard Lane Growers and Distribution Network
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem inset>
            ama.owusu@meadow-farm-cooperative.example
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            Delete sample
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p role="status">{action}</p>
      <p>
        Completed tasks: {completed ? "shown" : "hidden"}. View: {view}.
      </p>
    </div>
  );
}

const menus = () => page.getByRole("menu");
const item = (name: string | RegExp) => page.getByRole("menuitem", { name });
const content = () =>
  document.querySelector<HTMLElement>('[data-slot="dropdown-menu-content"]')!;
const subContent = () =>
  document.querySelector<HTMLElement>(
    '[data-slot="dropdown-menu-sub-content"]',
  )!;

function contained(element: HTMLElement) {
  const box = element.getBoundingClientRect();
  return {
    inViewport:
      box.left >= 0 &&
      box.right <= innerWidth + 0.5 &&
      box.top >= 0 &&
      box.bottom <= innerHeight + 0.5,
    inside: [...element.querySelectorAll("*")].every((child) => {
      const rect = child.getBoundingClientRect();
      return (
        !rect.width ||
        (rect.left >= box.left - 1 && rect.right <= box.right + 1)
      );
    }),
    noScroll: element.scrollWidth <= element.clientWidth + 1,
  };
}
const fits = { inViewport: true, inside: true, noScroll: true };

function colorOf(value: string) {
  const probe = document.createElement("span");
  probe.style.color = value;
  document.body.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

describe("DropdownMenu in a real browser", () => {
  it.each(themes)(
    "%s %s passes axe with a submenu open",
    async (theme, mode) => {
      await emulate({ reducedMotion: true });
      setTheme(theme, mode);
      await render(<Playground />);
      expect(await axeViolations()).toEqual([]);
      await page.getByRole("button", { name: "Fixed-width menu" }).click();
      await item("More").hover();
      await expect.element(item("Archive sample")).toBeVisible();
      await settle();
      expect(await axeViolations()).toEqual([]);
    },
  );

  it.each([
    [390, "anchor"],
    [390, "menu"],
    [1280, "anchor"],
    [1280, "menu"],
  ] as const)(
    "at %ipx a %s menu sizes itself and stays in view with its submenu",
    async (width, size) => {
      await emulate({ reducedMotion: true });
      await page.viewport(width, 720);
      const label = size === "menu" ? "Menu" : "A wide trigger-width menu";
      await render(<Playground size={size} label={label} />);
      const trigger = page.getByRole("button", { name: label });
      await trigger.click();
      await expect.element(menus()).toHaveAttribute("data-size", size);
      await settle();
      const menuWidth = content().getBoundingClientRect().width;
      if (size === "menu") expect(menuWidth).toBeCloseTo(256, 0);
      else
        expect(menuWidth).toBeCloseTo(
          trigger.element().getBoundingClientRect().width,
          0,
        );
      expect(contained(content())).toEqual(fits);
      await item("More").hover();
      await expect.element(item("Archive sample")).toBeVisible();
      await settle();
      expect(contained(subContent())).toEqual(fits);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        innerWidth,
      );
    },
  );

  it("an anchor menu never gets narrower than 8rem", async () => {
    await emulate({ reducedMotion: true });
    await render(<Playground size="anchor" label="Go" />);
    await page.getByRole("button", { name: "Go" }).click();
    await settle();
    expect(content().getBoundingClientRect().width).toBe(128);
  });

  it("keyboard opens, moves, enters a submenu, and returns focus", async () => {
    await emulate({ reducedMotion: true });
    await render(<Playground />);
    const trigger = page.getByRole("button", { name: "Fixed-width menu" });
    await expect.element(trigger).toHaveAttribute("aria-haspopup", "menu");
    (trigger.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(menus()).toBeVisible();
    await expect.element(trigger).toHaveAttribute("aria-expanded", "true");
    await expect.element(item("New task ⌘ N")).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(item("Unavailable action")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect.element(menus()).toBeVisible();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("No action selected.");
    await userEvent.keyboard("{ArrowDown}");
    const completed = page.getByRole("menuitemcheckbox", {
      name: "Show completed",
    });
    await expect.element(completed).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect.element(completed).toHaveAttribute("aria-checked", "false");
    await expect.element(menus()).toBeVisible();
    await expect
      .element(page.getByText(/Completed tasks: hidden/))
      .toBeVisible();
    await userEvent.keyboard("{End}");
    await expect.element(item("Delete sample")).toHaveFocus();
    await userEvent.keyboard("{Home}");
    await expect.element(item("New task ⌘ N")).toHaveFocus();
    await userEvent.keyboard("m");
    await expect.element(item("More")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect.element(item("Archive sample")).toHaveFocus();
    await expect
      .poll(() => document.querySelectorAll('[role="menu"]').length)
      .toBe(2);
    await userEvent.keyboard("{ArrowLeft}");
    await expect
      .poll(() => document.querySelectorAll('[role="menu"]').length)
      .toBe(1);
    await expect.element(item("More")).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    const grid = page.getByRole("menuitemradio", { name: "Grid" });
    await expect.element(grid).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect.element(grid).toHaveAttribute("aria-checked", "true");
    await expect.element(page.getByText(/View: grid/)).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(menus()).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();

    await userEvent.keyboard("{ArrowDown}");
    await expect.element(item("New task ⌘ N")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect.element(menus()).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("New task selected.");
    await expect.element(trigger).toHaveFocus();
  });

  it("disabled items fade and can't be chosen, and disabled menus don't open", async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Playground />);
    await page.getByRole("button", { name: "Fixed-width menu" }).click();
    const unavailable = item("Unavailable action");
    await expect.element(unavailable).toHaveAttribute("aria-disabled", "true");
    expect(getComputedStyle(unavailable.element()).opacity).toBe("0.5");
    await unavailable.click({ force: true });
    await expect.element(menus()).toBeVisible();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("No action selected.");
    await userEvent.keyboard("{Escape}");
    await screen.rerender(<Playground disabled />);
    const trigger = page.getByRole("button", { name: "Fixed-width menu" });
    await trigger.click({ force: true });
    await expect.element(menus()).not.toBeInTheDocument();
  });

  it.each(themes)(
    "%s %s destructive items use danger tones; shortcuts brighten on highlight",
    async (theme, mode) => {
      await emulate({ reducedMotion: true });
      setTheme(theme, mode);
      await render(<Playground />);
      await page.getByRole("button", { name: "Fixed-width menu" }).click();
      const remove = item("Delete sample");
      expect(getComputedStyle(remove.element()).color).toBe(
        colorOf("var(--sprout-danger)"),
      );
      expect(getComputedStyle(remove.element()).color).not.toBe(
        getComputedStyle(item("New task ⌘ N").element()).color,
      );
      await remove.hover();
      await expect.element(remove).toHaveAttribute("data-highlighted");
      expect(getComputedStyle(remove.element()).backgroundColor).toBe(
        colorOf("var(--sprout-danger-subtle)"),
      );
      const newTask = item("New task ⌘ N");
      const shortcut = newTask
        .element()
        .querySelector<HTMLElement>('[data-slot="dropdown-menu-shortcut"]')!;
      expect(getComputedStyle(shortcut).color).toBe(
        colorOf("var(--sprout-muted)"),
      );
      await newTask.hover();
      await expect.element(newTask).toHaveAttribute("data-highlighted");
      expect(getComputedStyle(shortcut).color).toBe(
        colorOf("var(--sprout-text)"),
      );
      expect(getComputedStyle(newTask.element()).backgroundColor).toBe(
        colorOf("var(--sprout-hover)"),
      );
    },
  );

  it("inset rows and labels line up with checkable rows; rows stay compact", async () => {
    await emulate({ reducedMotion: true });
    await render(<Playground />);
    await page.getByRole("button", { name: "Fixed-width menu" }).click();
    await settle();
    const inset = item(/ama\.owusu/).element();
    expect(inset).toHaveAttribute("data-inset", "true");
    expect(getComputedStyle(inset).paddingInlineStart).toBe("28px");
    for (const name of ["New task ⌘ N", "Delete sample"])
      expect(
        item(name).element().getBoundingClientRect().height,
      ).toBeLessThanOrEqual(30);
    const separator = content().querySelector<HTMLElement>(
      '[data-slot="dropdown-menu-separator"]',
    )!;
    expect(separator.getBoundingClientRect().width).toBe(content().clientWidth);
    expect(
      getComputedStyle(item("New task ⌘ N").element().querySelector("svg")!)
        .width,
    ).toBe("16px");
  });

  it("long rows wrap inside a 390px menu instead of spilling", async () => {
    await emulate({ reducedMotion: true });
    await page.viewport(390, 700);
    await render(<Playground />);
    await page.getByRole("button", { name: "Fixed-width menu" }).click();
    await settle();
    const email = item(/ama\.owusu/).element();
    expect(email.getBoundingClientRect().height).toBeGreaterThan(28);
    expect(contained(content())).toEqual(fits);
  });

  it("side top opens above the trigger", async () => {
    await emulate({ reducedMotion: true });
    await page.viewport(390, 844);
    await render(
      <div style={{ paddingTop: 500 }}>
        <Playground side="top" label="Add a file" />
      </div>,
    );
    const trigger = page.getByRole("button", { name: "Add a file" });
    await trigger.click();
    await expect.element(menus()).toHaveAttribute("data-side", "top");
    await settle();
    expect(content().getBoundingClientRect().bottom).toBeLessThanOrEqual(
      trigger.element().getBoundingClientRect().top,
    );
    expect(contained(content())).toEqual(fits);
  });

  it("a bottom menu with no room below flips to the top", async () => {
    await emulate({ reducedMotion: true });
    await page.viewport(390, 600);
    await render(
      <div style={{ paddingTop: 420 }}>
        <Playground label="Account menu" />
      </div>,
    );
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect.element(menus()).toHaveAttribute("data-side", "top");
    await settle();
    expect(contained(content())).toEqual(fits);
  });

  it("menus fade in over the fast motion token", async () => {
    await render(<Playground />);
    await page.getByRole("button", { name: "Fixed-width menu" }).click();
    await expect.element(menus()).toBeVisible();
    await expect
      .poll(() => getComputedStyle(content()).transitionDuration)
      .toBe("0.12s, 0.12s");
  });

  it("reduced motion removes the menu transition", async () => {
    await emulate({ reducedMotion: true });
    await render(<Playground />);
    await page.getByRole("button", { name: "Fixed-width menu" }).click();
    await expect.element(menus()).toBeVisible();
    expect(getComputedStyle(content()).transitionDuration).toBe("0s");
  });
});
