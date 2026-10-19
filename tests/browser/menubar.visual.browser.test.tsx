import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "../../packages/sprout/src/components/menubar.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("menubar %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(360, 260);
  await render(
    <div style={{ padding: 16 }}>
      <Menubar aria-label="Application menu">
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarGroup>
              <MenubarLabel inset>Draft</MenubarLabel>
              <MenubarCheckboxItem checked>Autosave</MenubarCheckboxItem>
            </MenubarGroup>
            <MenubarItem inset>
              New draft<MenubarShortcut>⌘ N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem inset disabled>
              Print
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset variant="destructive">
              Discard draft
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Help</MenubarTrigger>
        </MenubarMenu>
      </Menubar>
    </div>,
  );
  await page.getByRole("menuitem", { name: "File" }).click();
  await settle();
  await expect
    .element(page.elementLocator(document.body))
    .toMatchScreenshot(`menubar-${theme}-${mode}`);
});
