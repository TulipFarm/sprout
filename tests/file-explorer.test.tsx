// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import {
  FileExplorer,
  fileExplorerMaxMatches,
  type FileExplorerFile,
} from '../packages/sprout/src/components/file-explorer.js';
import { preloadCodeLanguages } from '../packages/sprout/src/components/code-block.js';
import * as sprout from '../packages/sprout/src/index.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const files: FileExplorerFile[] = [
  { path: 'SOUL.md', content: '# Meadow\n\nFrost watch.\n' },
  {
    path: 'agents/scout/tools.ts',
    content: `export const a = 1;\n    ${'x'.repeat(40)} frost and Frost\n`,
  },
  { path: 'agents/scout/persona.md', content: '# Scout\n' },
  { path: 'agents/harvest/plan.py', content: "print('hi')\n" },
  { path: 'memory/notes/10.md', content: 'ten' },
  { path: 'memory/notes/9.md', content: 'nine' },
  { path: 'assets/map.png', unavailable: 'Images cannot be displayed here.' },
  { path: 'data.xyzw', content: 'raw\n' },
  { path: 'README', content: '' },
];

const tree = () => screen.getByRole('tree');
const row = (path: string) => document.querySelector<HTMLElement>(`[data-path="${path}"]`)!;
const key = (name: string) => fireEvent.keyDown(tree(), { key: name });
const search = (value: string) => fireEvent.change(screen.getByRole('searchbox'), { target: { value } });
const tabs = () =>
  [...document.querySelectorAll('.sprout-file-explorer-tab-open')].map(tab => tab.getAttribute('title'));

beforeAll(async () => {
  Element.prototype.scrollIntoView = function () {};
  await preloadCodeLanguages('typescript', 'markdown');
});

describe('FileExplorer', () => {
  it('is exported with its styles', () => {
    expect(sprout.FileExplorer).toBe(FileExplorer);
    expect(read('../packages/sprout/src/styles/index.css')).toContain('@import "./file-explorer.css";');
    expect(JSON.parse(read('../packages/sprout/package.json')).exports['./file-explorer']).toBeDefined();
  });

  it('lists folders first, sorts names by number, and opens the default path', () => {
    render(<FileExplorer files={files} defaultPath="memory/notes/9.md" />);
    expect(screen.getByRole('tree', { name: 'Files' })).toBeDefined();
    const names = [...tree().querySelectorAll('[role=treeitem]')].map(item => item.getAttribute('data-path'));
    expect(names).toEqual([
      'agents',
      'assets',
      'memory',
      'memory/notes',
      'memory/notes/9.md',
      'memory/notes/10.md',
      'data.xyzw',
      'README',
      'SOUL.md',
    ]);
    expect(row('memory/notes/9.md').getAttribute('aria-selected')).toBe('true');
    expect(row('memory/notes/9.md').tabIndex).toBe(0);
    expect(row('memory/notes').getAttribute('aria-level')).toBe('2');
    expect(screen.getByRole('navigation', { name: 'File path' }).textContent).toBe('memorynotes9.md');
  });

  it('shows file glyphs by language, by extension, or a plain icon', () => {
    render(<FileExplorer files={files} />);
    const glyph = (path: string) => row(path).querySelector('.sprout-file-explorer-glyph')!;
    expect(glyph('SOUL.md').getAttribute('data-tone')).toBe('accent');
    expect(glyph('SOUL.md').querySelector('text')!.getAttribute('font-size')).toBe('7.4');
    expect(glyph('data.xyzw').textContent).toBe('XYZ');
    expect(glyph('data.xyzw').getAttribute('data-tone')).toBe('muted');
    expect(glyph('data.xyzw').querySelector('text')!.getAttribute('font-size')).toBe('6');
    expect(glyph('README').tagName.toLowerCase()).toBe('svg');
    expect(glyph('README').getAttribute('data-tone')).toBeNull();
  });

  it('opens files in tabs after the active tab and closes them', () => {
    render(<FileExplorer files={files} label="Soul" />);
    expect(screen.getByText('Open a file')).toBeDefined();
    fireEvent.click(row('SOUL.md'));
    fireEvent.click(row('README'));
    fireEvent.click(screen.getByRole('button', { name: 'SOUL.md' }));
    fireEvent.click(row('data.xyzw'));
    expect(tabs()).toEqual(['SOUL.md', 'data.xyzw', 'README']);
    fireEvent.click(row('SOUL.md'));
    expect(tabs()).toHaveLength(3);
    expect(screen.getByText('Markdown')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'data.xyzw' }));
    expect(screen.getByText('Plain text')).toBeDefined();
    expect(screen.getByText('2 lines')).toBeDefined();

    fireEvent(screen.getByRole('button', { name: 'README' }), new MouseEvent('auxclick', { bubbles: true, button: 2 }));
    expect(tabs()).toHaveLength(3);
    fireEvent(screen.getByRole('button', { name: 'README' }), new MouseEvent('auxclick', { bubbles: true, button: 1 }));
    expect(tabs()).toEqual(['SOUL.md', 'data.xyzw']);
    fireEvent.click(screen.getByRole('button', { name: 'Close SOUL.md' }));
    expect(tabs()).toEqual(['data.xyzw']);
    expect(screen.getByText('Plain text')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Close data.xyzw' }));
    expect(screen.getByText('Open a file')).toBeDefined();
  });

  it('shows empty, unavailable, and highlighted files', () => {
    render(<FileExplorer files={files} defaultPath="README" />);
    expect(screen.getByText('This file is empty.')).toBeDefined();
    fireEvent.click(row('assets'));
    fireEvent.click(row('assets/map.png'));
    expect(screen.getByText('Images cannot be displayed here.')).toBeDefined();
    fireEvent.click(row('agents'));
    fireEvent.click(row('agents/scout'));
    fireEvent.click(row('agents/scout/tools.ts'));
    const code = screen.getByRole('region', { name: 'agents/scout/tools.ts' });
    expect(code.hasAttribute('data-highlighted')).toBe(true);
    expect(code.querySelector('[class*=sprout-syntax-]')).not.toBeNull();
    expect(screen.getByText('TypeScript')).toBeDefined();
  });

  it('collapses every folder', () => {
    render(<FileExplorer files={files} defaultPath="agents/scout/tools.ts" />);
    const collapse = screen.getByRole('button', {
      name: 'Collapse all folders',
    }) as HTMLButtonElement;
    expect(row('agents').getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(collapse);
    expect(row('agents').getAttribute('aria-expanded')).toBe('false');
    expect(row('agents/scout')).toBeNull();
    expect(collapse.disabled).toBe(true);
  });

  it('moves through the tree with the keyboard', () => {
    render(<FileExplorer files={files} />);
    key('ArrowDown');
    expect(row('agents').tabIndex).toBe(0);
    fireEvent.focus(row('agents'));
    key('ArrowRight');
    expect(row('agents').getAttribute('aria-expanded')).toBe('true');
    key('ArrowRight');
    expect(document.activeElement).toBe(row('agents/harvest'));
    key('Enter');
    expect(row('agents/harvest').getAttribute('aria-expanded')).toBe('true');
    key('ArrowDown');
    expect(document.activeElement).toBe(row('agents/harvest/plan.py'));
    key('ArrowRight');
    key(' ');
    expect(tabs()).toEqual(['agents/harvest/plan.py']);
    key('ArrowLeft');
    expect(document.activeElement).toBe(row('agents/harvest'));
    key('ArrowLeft');
    expect(row('agents/harvest').getAttribute('aria-expanded')).toBe('false');
    key('ArrowUp');
    expect(document.activeElement).toBe(row('agents'));
    key('ArrowUp');
    expect(document.activeElement).toBe(row('agents'));
    key('End');
    expect(document.activeElement).toBe(row('SOUL.md'));
    key('ArrowLeft');
    expect(document.activeElement).toBe(row('SOUL.md'));
    key('Tab');
    key('Home');
    expect(document.activeElement).toBe(row('agents'));
  });

  it('ignores keys before a row has focus', () => {
    render(<FileExplorer files={[]} />);
    expect(screen.getByText('No files yet.')).toBeDefined();
    key('ArrowDown');
    expect(tree().querySelector('[role=treeitem]')).toBeNull();
  });

  it('searches file names and text, then opens a match at its line', () => {
    render(<FileExplorer files={files} label="Soul" />);
    search('  FROST ');
    expect(screen.getByRole('status').textContent).toBe('0 file names, 2 lines');
    expect(screen.queryByText('File names')).toBeNull();
    const hit = screen.getByRole('button', {
      name: /^agents\/scout\/tools\.ts, line 2: …/,
    });
    expect(hit.querySelectorAll('mark')).toHaveLength(2);
    fireEvent.click(hit);
    expect(hit.getAttribute('aria-current')).toBe('true');
    expect(screen.getByText('Line 2')).toBeDefined();
    const code = screen.getByRole('region', { name: 'agents/scout/tools.ts' });
    expect(code.querySelector('[data-current]')!.textContent).toContain('frost');
    expect(code.querySelectorAll('mark')).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: /^SOUL\.md/ })[0]!);
    expect(screen.getByText('Line 3')).toBeDefined();

    search('soul');
    expect(screen.getByRole('status').textContent).toBe('1 file name, 0 lines');
    const name = screen.getByText('File names').parentElement!;
    fireEvent.click(name.querySelector('button')!);
    expect(name.querySelector('button')!.getAttribute('aria-current')).toBe('true');
    expect(name.querySelector('mark')!.textContent).toBe('SOUL');

    search('meadow');
    expect(screen.getByRole('status').textContent).toBe('0 file names, 1 line');
    search('notes');
    expect(screen.getByRole('status').textContent).toBe('2 file names, 0 lines');
    search('zebra');
    expect(screen.getByRole('status').textContent).toBe('No files or lines match “zebra”.');
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(tree()).toBeDefined();
  });

  it('stops search after the maximum number of lines', () => {
    const many = Array.from({ length: fileExplorerMaxMatches + 5 }, () => 'hit').join('\n');
    render(
      <FileExplorer
        files={[
          { path: 'a.txt', content: many },
          { path: 'b.txt', content: 'hit' },
        ]}
      />,
    );
    act(() => search('hit'));
    expect(screen.getByRole('status').textContent).toBe(`0 file names, first ${fileExplorerMaxMatches} lines`);
    expect(screen.queryByRole('button', { name: /^b\.txt/ })).toBeNull();
  });

  it('renders on the server', () => {
    const html = renderToString(<FileExplorer files={files} defaultPath="SOUL.md" className="h-96" />);
    expect(html).toContain('data-slot="file-explorer"');
    expect(html).toContain('sprout-file-explorer h-96');
  });
});
