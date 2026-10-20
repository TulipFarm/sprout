import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
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
  defaultCommandFilter,
} from '../packages/sprout/src/components/command.js';

function tag(html: string, slot: string) {
  const match = html.match(new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`));
  expect(match, slot).toBeTruthy();
  return match![0];
}

function tags(html: string, slot: string) {
  return html.match(new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`, 'g')) ?? [];
}

const playground = (
  <Command>
    <CommandInput aria-label="Search sample commands" placeholder="Search sample commands…" />
    <CommandList>
      <CommandEmpty>No matching commands.</CommandEmpty>
      <CommandGroup heading="Suggestions">
        <CommandItem>
          New draft
          <CommandShortcut>⌘ N</CommandShortcut>
        </CommandItem>
        <CommandItem>Open folder</CommandItem>
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Settings">
        <CommandItem disabled>Unavailable action</CommandItem>
      </CommandGroup>
    </CommandList>
  </Command>
);

describe('Command', () => {
  it('renders the search as a combobox that controls a listbox', () => {
    const html = renderToString(playground);
    const input = tag(html, 'command-input');
    const list = tag(html, 'command-list');
    expect(input).toContain('role="combobox"');
    expect(input).toContain('aria-autocomplete="list"');
    expect(input).toContain('aria-expanded="true"');
    expect(input).toContain('aria-label="Search sample commands"');
    expect(input).toContain('placeholder="Search sample commands…"');
    expect(input).toContain('autoComplete="off"');
    const controls = input.match(/aria-controls="([^"]+)"/)![1];
    expect(list).toContain(`id="${controls}"`);
    expect(list).toContain('role="listbox"');
    expect(list).toContain('aria-label="Suggestions"');
    expect(tag(html, 'command')).toContain('class="sprout-command"');
  });

  it('names groups by their heading and renders items as options', () => {
    const html = renderToString(playground);
    const headings = tags(html, 'command-group-heading');
    expect(headings).toHaveLength(2);
    const headingId = headings[0]!.match(/id="([^"]+)"/)![1];
    expect(headings[0]).toContain('aria-hidden="true"');
    expect(html).toContain(`role="group" aria-labelledby="${headingId}"`);
    const items = tags(html, 'command-item');
    expect(items).toHaveLength(3);
    for (const item of items) expect(item).toContain('role="option"');
    expect(items[0]).toContain('data-value="New draft⌘ N"');
    expect(items[1]).toContain('data-value="Open folder"');
    expect(items[2]).toContain('aria-disabled="true"');
    expect(items[2]).toContain('data-disabled');
    expect(tag(html, 'command-separator')).toContain('aria-hidden="true"');
    expect(tag(html, 'command-separator')).not.toContain('role=');
    expect(tag(html, 'command-shortcut')).toContain('sprout-command-shortcut');
  });

  it('hides the empty state until items have been counted', () => {
    expect(renderToString(playground)).not.toContain('No matching commands.');
  });

  it('supports ids with keywords, checked items, and headingless groups', () => {
    const html = renderToString(
      <Command>
        <CommandInput aria-label="Search projects" value="" onValueChange={() => {}} />
        <CommandList aria-label="Chat projects">
          <CommandGroup>
            <CommandItem value="private" keywords={['Personal chats']} data-checked>
              Personal chats
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Projects">
            <CommandItem value="prj_lisbon" keywords={['Lisbon office launch']} data-checked={false}>
              Lisbon office launch
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );
    expect(tag(html, 'command-list')).toContain('aria-label="Chat projects"');
    expect(tags(html, 'command-group-heading')).toHaveLength(1);
    expect(html).toContain('role="group" data-slot="command-group-items"');
    const [personal, lisbon] = tags(html, 'command-item');
    expect(personal).toContain('data-value="private"');
    expect(personal).toContain('data-checked="true"');
    expect(lisbon).toContain('data-value="prj_lisbon"');
    expect(lisbon).toContain('data-checked="false"');
    expect(html.match(/sprout-command-item-check/g)).toHaveLength(2);
  });

  it('labels the input from Command label when there is no aria-label', () => {
    const html = renderToString(
      <Command label="Search commands">
        <CommandInput />
        <CommandList />
      </Command>,
    );
    const labelId = html.match(/<label id="([^"]+)"/)![1];
    expect(tag(html, 'command-input')).toContain(`aria-labelledby="${labelId}"`);
    expect(tag(html, 'command-list')).toContain('aria-label="Search commands"');
  });

  it('requires its parts to be inside Command', () => {
    expect(() => renderToString(<CommandItem>Orphan</CommandItem>)).toThrow('CommandItem must be inside Command.');
    expect(() => renderToString(<CommandInput />)).toThrow('CommandInput must be inside Command.');
  });

  it('renders nothing for a closed dialog', () => {
    expect(
      renderToString(
        <CommandDialog open={false}>
          <Command>
            <CommandInput aria-label="Search commands" />
          </Command>
        </CommandDialog>,
      ),
    ).not.toContain('command-input');
  });
});

describe('defaultCommandFilter', () => {
  it('ranks prefix, word start, substring, and loose matches', () => {
    const prefix = defaultCommandFilter('Research', 'res');
    const wordStart = defaultCommandFilter('Customer research', 'res');
    const substring = defaultCommandFilter('Fresh notes', 'res');
    const loose = defaultCommandFilter('Recruiting scheduler', 'rsc');
    expect(prefix).toBe(1);
    expect(wordStart).toBeLessThan(prefix);
    expect(substring).toBeLessThan(wordStart);
    expect(loose).toBeGreaterThan(0);
    expect(loose).toBeLessThan(substring);
    expect(defaultCommandFilter('Quick', 'zzz')).toBe(0);
  });

  it('matches keywords, every word, and ignores case and accents', () => {
    expect(defaultCommandFilter('prj_lisbon', 'lisbon', ['Lisbon office launch'])).toBeGreaterThan(0);
    expect(defaultCommandFilter('Lisbon office launch', 'office lis')).toBeGreaterThan(0);
    expect(defaultCommandFilter('Lisbon office launch', 'office paris')).toBe(0);
    expect(defaultCommandFilter('Café menu', 'CAFE')).toBe(1);
    expect(defaultCommandFilter('Anything', '   ')).toBe(1);
  });
});
