import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarShortcut,
  MenubarTrigger,
  menubarItemVariantNames,
} from "../packages/sprout/src/components/menubar.js";
import * as sprout from "../packages/sprout/src/index.js";

function tag(html: string, slot: string) {
  const match = html.match(
    new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`),
  );
  expect(match, slot).toBeTruthy();
  return match![0];
}

describe("Menubar", () => {
  it("lists the item variants Cloud uses", () => {
    expect(menubarItemVariantNames).toEqual(["default", "destructive"]);
  });

  it("exports every Cloud part from the package root", () => {
    for (const name of [
      "Menubar",
      "MenubarCheckboxItem",
      "MenubarContent",
      "MenubarGroup",
      "MenubarItem",
      "MenubarLabel",
      "MenubarMenu",
      "MenubarPortal",
      "MenubarRadioGroup",
      "MenubarRadioItem",
      "MenubarSeparator",
      "MenubarShortcut",
      "MenubarSub",
      "MenubarSubContent",
      "MenubarSubTrigger",
      "MenubarTrigger",
    ]) {
      expect(sprout, name).toHaveProperty(name);
    }
  });

  it("renders a menubar with triggers and no popup until opened", () => {
    const html = renderToString(
      <Menubar aria-label="Application menu" className="app-bar">
        <MenubarMenu>
          <MenubarTrigger className="file">File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem variant="destructive">Discard draft</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
        </MenubarMenu>
      </Menubar>,
    );
    const bar = tag(html, "menubar");
    expect(bar).toContain('role="menubar"');
    expect(bar).toContain('class="sprout-menubar app-bar"');
    expect(bar).toContain('aria-label="Application menu"');
    const trigger = tag(html, "menubar-trigger");
    expect(trigger).toMatch(/^<button /);
    expect(trigger).toContain('class="sprout-menubar-trigger file"');
    expect(trigger).toContain('aria-haspopup="menu"');
    expect(html.match(/data-slot="menubar-trigger"/g)).toHaveLength(2);
    expect(html).not.toContain("menubar-content");
    expect(html).not.toContain("Discard draft");
  });

  it("renders the shortcut as plain hint text", () => {
    const html = renderToString(
      <MenubarShortcut className="x">⌘ N</MenubarShortcut>,
    );
    expect(html).toBe(
      '<span data-slot="menubar-shortcut" class="sprout-menubar-shortcut x">⌘ N</span>',
    );
  });
});
