import { expect, it } from "vitest";
import { page } from "vitest/browser";
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
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("context-menu %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(320, 340);
  const screen = await render(
    <ContextMenu>
      <ContextMenuTrigger
        style={{
          display: "block",
          width: 280,
          height: 300,
          margin: 16,
          border: "1px dashed var(--sprout-line)",
        }}
      >
        Right-click
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuLabel inset>Sample card</ContextMenuLabel>
          <ContextMenuItem>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3 13l2-1 7-7-1-1-7 7z"
                stroke="currentColor"
                fill="none"
              />
            </svg>
            Open
            <ContextMenuShortcut>Enter</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem disabled>Unavailable</ContextMenuItem>
          <ContextMenuCheckboxItem defaultChecked>
            Favorite
          </ContextMenuCheckboxItem>
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
            <ContextMenuItem>Copy link</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>,
  );
  await screen
    .getByText("Right-click")
    .click({ button: "right", position: { x: 24, y: 16 } });
  await settle();
  await expect
    .element(page.elementLocator(document.body))
    .toMatchScreenshot(`context-menu-${theme}-${mode}`);
});
