import { describe, expect, it } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "../../packages/sprout/src/components/context-menu.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const Pencil = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 13l2-1 7-7-1-1-7 7z" stroke="currentColor" fill="none" />
  </svg>
);

function Sample() {
  return (
    <ContextMenu>
      <ContextMenuTrigger
        tabIndex={0}
        role="group"
        aria-label="Sample card actions"
        style={{
          width: 280,
          height: 160,
          margin: 16,
          border: "1px dashed var(--sprout-line)",
        }}
      >
        Right-click or long-press
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuLabel inset>Sample card</ContextMenuLabel>
          <ContextMenuItem>
            <Pencil />
            Open
            <ContextMenuShortcut>Enter</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem disabled>Unavailable</ContextMenuItem>
          <ContextMenuCheckboxItem>Favorite</ContextMenuCheckboxItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup defaultValue="List">
          <ContextMenuRadioItem value="List">List</ContextMenuRadioItem>
          <ContextMenuRadioItem value="Grid">Grid</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>Share</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>Copy sample title</ContextMenuItem>
            <ContextMenuItem>
              Orchard Lane community garden shared planning folder
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem variant="destructive">Delete sample</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

const trigger = () => page.getByRole("group", { name: "Sample card actions" });
const menus = () => page.getByRole("menu");
const item = (name: string | RegExp) => page.getByRole("menuitem", { name });
const content = () =>
  document.querySelector('[data-slot="context-menu-content"]')!;
const subContent = () =>
  document.querySelector('[data-slot="context-menu-sub-content"]')!;

/** The menu stays in the viewport, and nothing inside it spills sideways. */
function contained(menu: Element) {
  const box = menu.getBoundingClientRect();
  return {
    inViewport:
      box.left >= 0 &&
      box.top >= 0 &&
      box.right <= innerWidth + 0.5 &&
      box.bottom <= innerHeight + 0.5,
    inside: [...menu.querySelectorAll("*")].every((child) => {
      const rect = child.getBoundingClientRect();
      return (
        !rect.width ||
        (rect.left >= box.left - 1 && rect.right <= box.right + 1)
      );
    }),
    noScroll: menu.scrollWidth <= menu.clientWidth + 1,
  };
}
const fits = { inViewport: true, inside: true, noScroll: true };

/** Right-clicks the trigger at an offset and returns the page point. */
async function rightClick(x = 40, y = 40) {
  const box = trigger().element().getBoundingClientRect();
  await trigger().click({ button: "right", position: { x, y } });
  await expect.element(menus()).toBeVisible();
  return { x: box.left + x, y: box.top + y };
}

describe("ContextMenu in a real browser", () => {
  it.each(themes)(
    "%s %s opens at the pointer, fits, and passes axe",
    async (theme, mode) => {
      setTheme(theme, mode);
      await render(<Sample />);
      const point = await rightClick();
      await settle();
      const box = content().getBoundingClientRect();
      expect(box.width).toBeGreaterThanOrEqual(144);
      expect(Math.abs(box.left - point.x)).toBeLessThanOrEqual(2);
      expect(box.top).toBeGreaterThanOrEqual(point.y);
      expect(box.top - point.y).toBeLessThanOrEqual(8);
      expect(contained(content())).toEqual(fits);
      await item("Share").hover();
      await expect.poll(() => menus().elements().length).toBe(2);
      await settle();
      expect(contained(subContent())).toEqual(fits);
      expect(await axeViolations()).toEqual([]);
    },
  );

  it("disabled items fade and stay open; choices toggle; destructive is red", async () => {
    await render(<Sample />);
    await rightClick();
    const unavailable = item("Unavailable");
    await expect.element(unavailable).toHaveAttribute("aria-disabled", "true");
    await settle();
    expect(getComputedStyle(unavailable.element()).opacity).toBe("0.5");
    await unavailable.click({ force: true });
    await expect.element(menus()).toBeVisible();

    const favorite = page.getByRole("menuitemcheckbox", { name: "Favorite" });
    await favorite.click();
    await expect.element(favorite).toHaveAttribute("aria-checked", "true");
    await expect.element(menus()).toBeVisible();
    const grid = page.getByRole("menuitemradio", { name: "Grid" });
    await grid.click();
    await expect.element(grid).toHaveAttribute("aria-checked", "true");

    const danger = getComputedStyle(item("Delete sample").element()).color;
    expect(danger).not.toBe(getComputedStyle(favorite.element()).color);
    await item("Share").hover();
    await item("Copy sample title").click();
    await expect.element(menus()).not.toBeInTheDocument();
  });

  it("an inset label lines up with item text after an icon", async () => {
    await render(<Sample />);
    await rightClick();
    const textStart = (node: Element, index: number) => {
      const range = document.createRange();
      range.selectNodeContents(node.childNodes[index]!);
      return range.getBoundingClientRect().left;
    };
    const label = document.querySelector('[data-slot="context-menu-label"]')!;
    const open = item(/^Open/).element();
    const textIndex = [...open.childNodes].findIndex(
      (node) => node.nodeType === Node.TEXT_NODE,
    );
    expect(
      Math.abs(textStart(label, 0) - textStart(open, textIndex)),
    ).toBeLessThanOrEqual(1);
  });

  it("keyboard moves, typeaheads, opens the submenu, and closes", async () => {
    await render(<Sample />);
    await rightClick();
    await expect.element(menus()).toHaveFocus();
    await userEvent.keyboard("f");
    const favorite = page.getByRole("menuitemcheckbox", { name: "Favorite" });
    await expect.element(favorite).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect.element(favorite).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard("{End}");
    await expect.element(item("Delete sample")).toHaveFocus();
    await userEvent.keyboard("{Home}");
    await expect.element(item(/^Open/)).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(item("Unavailable")).toHaveFocus();
    await userEvent.keyboard("{End}{ArrowUp}");
    await expect.element(item("Share")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect.element(item("Copy sample title")).toHaveFocus();
    expect(menus().elements()).toHaveLength(2);
    await userEvent.keyboard("{ArrowLeft}");
    await expect.poll(() => menus().elements().length).toBe(1);
    await expect.element(item("Share")).toHaveAttribute("data-highlighted", "");
    await userEvent.keyboard("{Escape}");
    await expect.element(menus()).not.toBeInTheDocument();
  });

  it("the trigger shows a focus ring and blocks text selection", async () => {
    await render(<Sample />);
    await userEvent.tab();
    await expect.element(trigger()).toHaveFocus();
    const style = getComputedStyle(trigger().element());
    expect(style.outlineStyle).toBe("solid");
    expect(style.userSelect).toBe("none");
  });

  it("a long press opens the menu at the finger on a phone", async () => {
    await emulate({ coarse: true });
    await page.viewport(390, 844);
    await render(<Sample />);
    const box = trigger().element().getBoundingClientRect();
    const point = { x: Math.round(box.left + 60), y: Math.round(box.top + 50) };
    const session = cdp();
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point],
    });
    // Base UI opens on a held touch, so the finger has to stay down.
    await new Promise((resolve) => setTimeout(resolve, 700));
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect.element(menus()).toBeVisible();
    await settle();
    expect(contained(content())).toEqual(fits);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("menus fade over the fast motion token, and not with reduced motion", async () => {
    await render(<Sample />);
    await rightClick();
    expect(getComputedStyle(content()).transitionDuration).toBe("0.12s, 0.12s");
    await userEvent.keyboard("{Escape}");
    await expect.element(menus()).not.toBeInTheDocument();
    await emulate({ reducedMotion: true });
    await rightClick();
    expect(getComputedStyle(content()).transitionDuration).toBe("0s");
  });
});
