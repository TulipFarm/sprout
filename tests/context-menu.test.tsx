import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
  contextMenuItemVariantNames,
} from "../packages/sprout/src/components/context-menu.js";
import * as sprout from "../packages/sprout/src/index.js";

function tag(html: string, slot: string) {
  const match = html.match(
    new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`),
  );
  expect(match, slot).toBeTruthy();
  return match![0];
}

describe("Context Menu", () => {
  it("lists the item variants Cloud uses", () => {
    expect(contextMenuItemVariantNames).toEqual(["default", "destructive"]);
  });

  it("exports every Cloud part from the package root", () => {
    for (const name of [
      "ContextMenu",
      "ContextMenuCheckboxItem",
      "ContextMenuContent",
      "ContextMenuGroup",
      "ContextMenuItem",
      "ContextMenuLabel",
      "ContextMenuPortal",
      "ContextMenuRadioGroup",
      "ContextMenuRadioItem",
      "ContextMenuSeparator",
      "ContextMenuShortcut",
      "ContextMenuSub",
      "ContextMenuSubContent",
      "ContextMenuSubTrigger",
      "ContextMenuTrigger",
    ]) {
      expect(sprout, name).toHaveProperty(name);
    }
  });

  it("renders a focusable trigger that passes Cloud's props and no popup until opened", () => {
    const html = renderToString(
      <ContextMenu>
        <ContextMenuTrigger
          tabIndex={0}
          role="group"
          aria-label="Sample card actions"
          aria-describedby="context-menu-help"
          className="sample-card"
        >
          Right-click this sample card
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem variant="destructive">Delete sample</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    const trigger = tag(html, "context-menu-trigger");
    expect(trigger).toMatch(/^<div /);
    expect(trigger).toContain(
      'class="sprout-context-menu-trigger sample-card"',
    );
    expect(trigger).toContain('tabindex="0"');
    expect(trigger).toContain('role="group"');
    expect(trigger).toContain('aria-label="Sample card actions"');
    expect(trigger).toContain('aria-describedby="context-menu-help"');
    expect(html).toContain("Right-click this sample card");
    expect(html).not.toContain("context-menu-content");
    expect(html).not.toContain("Delete sample");
  });

  it("renders the trigger through render", () => {
    const html = renderToString(
      <ContextMenu>
        <ContextMenuTrigger render={<li />}>Q3 budget.xlsx</ContextMenuTrigger>
      </ContextMenu>,
    );
    expect(tag(html, "context-menu-trigger")).toMatch(/^<li /);
  });

  it("renders shortcut hint text with merged classes", () => {
    const html = renderToString(
      <ContextMenuShortcut className="ms-2">Enter</ContextMenuShortcut>,
    );
    const shortcut = tag(html, "context-menu-shortcut");
    expect(shortcut).toMatch(/^<span /);
    expect(shortcut).toContain('class="sprout-context-menu-shortcut ms-2"');
    expect(html).toContain(">Enter</span>");
  });
});
