import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  dropdownMenuContentSizeNames,
  dropdownMenuItemVariantNames,
} from '../packages/sprout/src/components/dropdown-menu.js';
import { Button } from '../packages/sprout/src/components/button.js';

function tag(html: string, slot: string) {
  const match = html.match(new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`));
  expect(match, slot).toBeTruthy();
  return match![0];
}

describe('Dropdown Menu', () => {
  it('lists every content size and item variant Cloud uses', () => {
    expect(dropdownMenuContentSizeNames).toEqual(['anchor', 'menu']);
    expect(dropdownMenuItemVariantNames).toEqual(['default', 'destructive']);
  });

  it('renders a Button trigger with menu semantics and no popup until opened', () => {
    const html = renderToString(
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions for row 1042" />}>
          <svg aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent size="menu" align="end">
          <DropdownMenuItem variant="destructive">Delete row</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const trigger = tag(html, 'dropdown-menu-trigger');
    expect(trigger).toMatch(/^<button /);
    expect(trigger).toContain('sprout-button-variant-ghost');
    expect(trigger).toContain('sprout-button-size-icon-sm');
    expect(trigger).toContain('aria-haspopup="menu"');
    expect(trigger).toContain('aria-expanded="false"');
    expect(trigger).toContain('aria-label="Actions for row 1042"');
    expect(html).not.toContain('dropdown-menu-content');
    expect(html).not.toContain('Delete row');
  });

  it('disables the trigger from the menu part', () => {
    const html = renderToString(
      <DropdownMenu>
        <DropdownMenuTrigger disabled render={<Button variant="outline" size="sm" />}>
          Moving…
        </DropdownMenuTrigger>
      </DropdownMenu>,
    );
    const trigger = tag(html, 'dropdown-menu-trigger');
    expect(trigger).toContain('disabled');
    expect(trigger).toContain('sprout-button-variant-outline');
    expect(html).toContain('Moving…');
  });

  it('renders a plain trigger with a custom class for menubar use', () => {
    const html = renderToString(
      <DropdownMenu>
        <DropdownMenuTrigger className="menubar-trigger" data-slot="menubar-trigger">
          File
        </DropdownMenuTrigger>
      </DropdownMenu>,
    );
    const trigger = tag(html, 'menubar-trigger');
    expect(trigger).toContain('class="menubar-trigger"');
    expect(html).not.toContain('data-slot="dropdown-menu-trigger"');
  });

  it('renders shortcut hint text with merged classes', () => {
    const html = renderToString(<DropdownMenuShortcut className="ms-2">⌘ N</DropdownMenuShortcut>);
    const shortcut = tag(html, 'dropdown-menu-shortcut');
    expect(shortcut).toMatch(/^<span /);
    expect(shortcut).toContain('class="sprout-dropdown-menu-shortcut ms-2"');
    expect(html).toContain('>⌘ N</span>');
  });
});
