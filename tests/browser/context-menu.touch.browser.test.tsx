import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { cdp, page } from "vitest/browser";
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
import { settle } from "./support.js";

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
const content = () =>
  document.querySelector('[data-slot="context-menu-content"]')!;

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

describe("ContextMenu on a touch screen", () => {
  it("a long press opens the menu at the finger on a phone", async () => {
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
});
