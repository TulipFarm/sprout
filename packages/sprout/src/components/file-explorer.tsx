'use client';

import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { ChevronRight } from 'reicon-react/icons/ChevronRight';
import { FileText } from 'reicon-react/icons/FileText';
import { Folder } from 'reicon-react/icons/Folder';
import { FolderOpen } from 'reicon-react/icons/FolderOpen';
import { MinusSquare } from 'reicon-react/icons/MinusSquare';
import { X } from 'reicon-react/icons/X';
import { cn } from '../internal/classes.js';
import { tokenClass, useCodeTokens } from '../internal/code-tokens.js';
import { codeLanguageNames, type CodeLanguage } from '../internal/languages.js';
import { languageForFilename } from '../internal/syntax.js';
import { SearchField } from './search-field.js';
import { StatePanel } from '../internal/state-panel.js';

export interface FileExplorerTextFile {
  /** A slash-separated path, such as `agents/scout/persona.md`. Folders come from the paths. */
  path: string;
  content: string;
}

export interface FileExplorerUnavailableFile {
  path: string;
  /** Why the file has no text to show, such as “Binary files cannot be displayed.” */
  unavailable: string;
}

export type FileExplorerFile = FileExplorerTextFile | FileExplorerUnavailableFile;

export interface FileExplorerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  files: FileExplorerFile[];
  /** Heads the sidebar and names the tree, such as “Soul”. */
  label?: string | undefined;
  /** The file open at first. Its folders start expanded. */
  defaultPath?: string | undefined;
}

type Node =
  | { kind: 'folder'; path: string; name: string; children: Node[] }
  | { kind: 'file'; path: string; name: string; file: FileExplorerFile };

type Row = { node: Node; depth: number; size: number; position: number };
type Range = [start: number, end: number];
type Hit = { line: number; text: string; ranges: Range[] };

/** Search stops after this many matching lines, so one common word cannot flood the list. */
export const fileExplorerMaxMatches = 500;

const nameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);
const folderOf = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf('/')));
const order = (a: Node, b: Node) =>
  a.kind === b.kind ? a.name.localeCompare(b.name, undefined, { numeric: true }) : a.kind === 'folder' ? -1 : 1;

function ancestors(path: string) {
  const parts = path.split('/').slice(0, -1);
  return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
}

function buildTree(files: FileExplorerFile[]) {
  const root: Node[] = [];
  const folders = new Map<string, Node[]>([['', root]]);
  for (const file of files) {
    for (const folder of ancestors(file.path)) {
      if (folders.has(folder)) continue;
      const children: Node[] = [];
      folders.get(folderOf(folder))!.push({
        kind: 'folder',
        path: folder,
        name: nameOf(folder),
        children,
      });
      folders.set(folder, children);
    }
    folders.get(folderOf(file.path))!.push({ kind: 'file', path: file.path, name: nameOf(file.path), file });
  }
  for (const children of folders.values()) children.sort(order);
  return root;
}

function visibleRows(nodes: Node[], expanded: Set<string>, depth = 0): Row[] {
  return nodes.flatMap((node, index) => [
    { node, depth, size: nodes.length, position: index + 1 },
    ...(node.kind === 'folder' && expanded.has(node.path) ? visibleRows(node.children, expanded, depth + 1) : []),
  ]);
}

function rangesIn(text: string, needle: string): Range[] {
  const haystack = text.toLowerCase();
  const ranges: Range[] = [];
  for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + needle.length))
    ranges.push([at, at + needle.length]);
  return ranges;
}

const excerptLead = 32;

function searchFiles(files: FileExplorerFile[], query: string) {
  const needle = query.toLowerCase();
  const names = files.filter(file => file.path.toLowerCase().includes(needle));
  const hits: { file: FileExplorerTextFile; lines: Hit[] }[] = [];
  let total = 0;
  for (const file of files) {
    if (!('content' in file) || total >= fileExplorerMaxMatches) continue;
    const lines: Hit[] = [];
    file.content.split('\n').forEach((raw, index) => {
      if (total >= fileExplorerMaxMatches) return;
      const ranges = rangesIn(raw, needle);
      if (!ranges.length) return;
      const indent = raw.length - raw.trimStart().length;
      const cut = Math.max(indent, ranges[0]![0] - excerptLead);
      const prefix = cut > indent ? '…' : '';
      const shift = cut - prefix.length;
      lines.push({
        line: index + 1,
        text: prefix + raw.slice(cut).trimEnd(),
        ranges: ranges.map(([start, end]) => [start - shift, end - shift]),
      });
      total += 1;
    });
    if (lines.length) hits.push({ file, lines });
  }
  return { names, hits, total, capped: total >= fileExplorerMaxMatches };
}

/** Splits text pieces at the match ranges and wraps the matches in `mark`. */
function marked(pieces: { content: string; className?: string | undefined }[], ranges: Range[]) {
  const out: ReactNode[] = [];
  let offset = 0;
  pieces.forEach((piece, index) => {
    const end = offset + piece.content.length;
    const cuts = new Set([offset, end]);
    for (const [start, stop] of ranges) for (const cut of [start, stop]) if (cut > offset && cut < end) cuts.add(cut);
    const sorted = [...cuts].sort((a, b) => a - b);
    for (let at = 0; at < sorted.length - 1; at += 1) {
      const from = sorted[at]!;
      const text = piece.content.slice(from - offset, sorted[at + 1]! - offset);
      const span = (
        <span key={`${index}-${from}`} className={piece.className}>
          {text}
        </span>
      );
      out.push(
        ranges.some(([start, stop]) => from >= start && from < stop) ? (
          <mark key={`${index}-${from}`} className="sprout-file-explorer-mark">
            {span}
          </mark>
        ) : (
          span
        ),
      );
    }
    offset = end;
  });
  return out;
}

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'accent' | 'muted';

const glyphs: Partial<Record<CodeLanguage, [label: string, tone: Tone]>> = {
  typescript: ['TS', 'info'],
  tsx: ['TSX', 'info'],
  javascript: ['JS', 'warning'],
  jsx: ['JSX', 'warning'],
  json: ['{ }', 'warning'],
  jsonc: ['{ }', 'warning'],
  json5: ['{ }', 'warning'],
  markdown: ['MD', 'accent'],
  mdx: ['MDX', 'accent'],
  python: ['PY', 'info'],
  yaml: ['YML', 'danger'],
  toml: ['TML', 'danger'],
  css: ['CSS', 'accent'],
  scss: ['SCS', 'accent'],
  html: ['< >', 'danger'],
  xml: ['< >', 'warning'],
  shellscript: ['SH', 'success'],
  dotenv: ['ENV', 'success'],
  sql: ['SQL', 'accent'],
  rust: ['RS', 'danger'],
  go: ['GO', 'info'],
  ruby: ['RB', 'danger'],
};

/** A 16px tile with a short language label, tinted by language. Decorative. */
function FileGlyph({ name }: { name: string }) {
  const language = languageForFilename(name);
  const extension = name.includes('.') ? (name.split('.').at(-1) ?? '') : '';
  const [label, tone] = (language && glyphs[language]) ?? [extension.slice(0, 3).toUpperCase(), 'muted' as const];
  if (!label) return <FileText size={16} aria-hidden="true" className="sprout-file-explorer-glyph" />;
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      data-tone={tone}
      className="sprout-file-explorer-glyph"
    >
      <rect x="0.5" y="1.5" width="15" height="13" rx="3" className="sprout-file-explorer-glyph-tile" />
      <text
        x="8"
        y="10.8"
        textAnchor="middle"
        fontSize={label.length > 2 ? 6 : 7.4}
        fontWeight="700"
        className="sprout-file-explorer-glyph-label"
      >
        {label}
      </text>
    </svg>
  );
}

function CodeView({ file, query, line }: { file: FileExplorerTextFile; query: string; line: number | null }) {
  const language = languageForFilename(file.path);
  const tokens = useCodeTokens(file.content, language);
  const needle = query.toLowerCase();
  const current = useRef<HTMLDivElement>(null);
  useEffect(() => {
    current.current?.scrollIntoView({ block: 'center' });
  }, [line, file.path]);
  const lines = useMemo<{ content: string; className?: string | undefined }[][]>(
    () =>
      tokens?.map(row =>
        row.map(token => ({
          content: token.content,
          className: tokenClass(token),
        })),
      ) ?? file.content.split('\n').map(content => [{ content }]),
    [tokens, file.content],
  );
  // ponytail: one DOM row per line; virtualize if files past ~20k lines matter.
  return (
    <div
      className="sprout-file-explorer-code"
      tabIndex={0}
      role="region"
      aria-label={file.path}
      data-highlighted={tokens ? '' : undefined}
    >
      <pre className="sprout-file-explorer-pre">
        <code>
          {lines.map((pieces, index) => {
            const text = pieces.map(piece => piece.content).join('');
            return (
              <div
                key={index}
                ref={index + 1 === line ? current : undefined}
                data-current={index + 1 === line ? '' : undefined}
                className="sprout-file-explorer-line"
              >
                <span aria-hidden="true" className="sprout-file-explorer-line-number">
                  {index + 1}
                </span>
                <span className="sprout-file-explorer-line-text">
                  {needle
                    ? marked(pieces, rangesIn(text, needle))
                    : pieces.map((piece, at) => (
                        <span key={at} className={piece.className}>
                          {piece.content}
                        </span>
                      ))}
                  {'\n'}
                </span>
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

/**
 * A read-only code explorer: a folder tree, open tabs, and a syntax-colored
 * file pane. Search filters file names and lists matching lines across every
 * file; picking a line opens the file there.
 */
export function FileExplorer({ files, label = 'Files', defaultPath, className, ...props }: FileExplorerProps) {
  const tree = useMemo(() => buildTree(files), [files]);
  const byPath = useMemo(() => new Map(files.map(file => [file.path, file])), [files]);
  const [expanded, setExpanded] = useState(() => new Set(defaultPath ? ancestors(defaultPath) : []));
  const [tabs, setTabs] = useState<string[]>(defaultPath && byPath.has(defaultPath) ? [defaultPath] : []);
  const [active, setActive] = useState<string | null>(tabs[0] ?? null);
  const [focused, setFocused] = useState<string | null>(active);
  const [line, setLine] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query.trim());
  const results = useMemo(() => (deferred ? searchFiles(files, deferred) : null), [files, deferred]);
  const rows = useMemo(() => visibleRows(tree, expanded), [tree, expanded]);
  const treeRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const toggle = (path: string, open?: boolean) =>
    setExpanded(current => {
      const next = new Set(current);
      if (open ?? !next.has(path)) next.add(path);
      else next.delete(path);
      return next;
    });

  const open = (path: string, at: number | null = null) => {
    setTabs(current => {
      if (current.includes(path)) return current;
      const next = [...current];
      next.splice(active ? next.indexOf(active) + 1 : next.length, 0, path);
      return next;
    });
    setActive(path);
    setFocused(path);
    setLine(at);
    setExpanded(current => new Set([...current, ...ancestors(path)]));
  };

  const close = (path: string) => {
    const index = tabs.indexOf(path);
    const next = tabs.filter(tab => tab !== path);
    setTabs(next);
    if (active === path) {
      setActive(next[Math.min(index, next.length - 1)] ?? null);
      setLine(null);
    }
  };

  const focusRow = (path: string | undefined) => {
    if (!path) return;
    setFocused(path);
    treeRef.current?.querySelector<HTMLElement>(`[data-path="${CSS.escape(path)}"]`)?.focus();
  };

  const onTreeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = rows.findIndex(row => row.node.path === focused);
    const row = rows[index];
    if (!row) return;
    const { node } = row;
    const isOpen = node.kind === 'folder' && expanded.has(node.path);
    switch (event.key) {
      case 'ArrowDown':
        focusRow(rows[index + 1]?.node.path);
        break;
      case 'ArrowUp':
        focusRow(rows[index - 1]?.node.path);
        break;
      case 'Home':
        focusRow(rows[0]?.node.path);
        break;
      case 'End':
        focusRow(rows.at(-1)?.node.path);
        break;
      case 'ArrowRight':
        if (node.kind !== 'folder') return;
        if (isOpen) focusRow(rows[index + 1]?.node.path);
        else toggle(node.path, true);
        break;
      case 'ArrowLeft':
        if (isOpen) toggle(node.path, false);
        else focusRow(folderOf(node.path) || undefined);
        break;
      case 'Enter':
      case ' ':
        if (node.kind === 'folder') toggle(node.path);
        else open(node.path);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const activeFile = active ? byPath.get(active) : undefined;
  const language = activeFile ? languageForFilename(activeFile.path) : null;
  const rovingPath = focused && rows.some(row => row.node.path === focused) ? focused : rows[0]?.node.path;

  return (
    <div data-slot="file-explorer" {...props} className={cn('sprout-file-explorer', className)}>
      <aside className="sprout-file-explorer-sidebar" aria-label={label}>
        <div className="sprout-file-explorer-sidebar-header">
          <span className="sprout-file-explorer-title">{label}</span>
          <button
            type="button"
            className="sprout-file-explorer-icon-button"
            aria-label="Collapse all folders"
            title="Collapse all folders"
            disabled={expanded.size === 0}
            onClick={() => setExpanded(new Set())}
          >
            <MinusSquare size={14} aria-hidden="true" />
          </button>
        </div>
        <div className="sprout-file-explorer-search">
          <SearchField
            label={`Search ${label.toLowerCase()}`}
            placeholder="Search names and text"
            value={query}
            maxLength={120}
            onChange={setQuery}
            className="max-w-none"
          />
        </div>
        {results ? (
          <div className="sprout-file-explorer-results" aria-busy={deferred !== query.trim() || undefined}>
            <p role="status" className="sprout-file-explorer-summary">
              {results.names.length || results.total
                ? `${results.names.length} ${results.names.length === 1 ? 'file name' : 'file names'}, ${results.capped ? `first ${results.total}` : results.total} ${results.total === 1 ? 'line' : 'lines'}`
                : `No files or lines match “${deferred}”.`}
            </p>
            {results.names.length > 0 && (
              <section aria-labelledby={`${id}-names`}>
                <h3 id={`${id}-names`} className="sprout-file-explorer-group">
                  File names
                </h3>
                <ul className="sprout-file-explorer-list">
                  {results.names.map(file => (
                    <li key={file.path}>
                      <button
                        type="button"
                        className="sprout-file-explorer-result"
                        aria-current={file.path === active || undefined}
                        onClick={() => open(file.path)}
                      >
                        <FileGlyph name={file.path} />
                        <span className="sprout-file-explorer-name">
                          {marked(
                            [{ content: nameOf(file.path) }],
                            rangesIn(nameOf(file.path), deferred.toLowerCase()),
                          )}
                        </span>
                        <span className="sprout-file-explorer-dir">{folderOf(file.path)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {results.hits.length > 0 && (
              <section aria-labelledby={`${id}-lines`}>
                <h3 id={`${id}-lines`} className="sprout-file-explorer-group">
                  Text in files
                </h3>
                <ul className="sprout-file-explorer-list">
                  {results.hits.map(({ file, lines }) => (
                    <li key={file.path}>
                      <button
                        type="button"
                        className="sprout-file-explorer-result"
                        onClick={() => open(file.path, lines[0]!.line)}
                      >
                        <FileGlyph name={file.path} />
                        <span className="sprout-file-explorer-name">{nameOf(file.path)}</span>
                        <span className="sprout-file-explorer-dir">{folderOf(file.path)}</span>
                        <span className="sprout-file-explorer-count">{lines.length}</span>
                      </button>
                      <ul className="sprout-file-explorer-list">
                        {lines.map(hit => (
                          <li key={hit.line}>
                            <button
                              type="button"
                              className="sprout-file-explorer-hit"
                              aria-label={`${file.path}, line ${hit.line}: ${hit.text}`}
                              aria-current={(file.path === active && hit.line === line) || undefined}
                              onClick={() => open(file.path, hit.line)}
                            >
                              <span className="sprout-file-explorer-hit-line">{hit.line}</span>
                              <span className="sprout-file-explorer-hit-text">
                                {marked([{ content: hit.text }], hit.ranges)}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <div
            ref={treeRef}
            role="tree"
            aria-label={label}
            className="sprout-file-explorer-tree"
            onKeyDown={onTreeKeyDown}
          >
            {rows.length === 0 && <p className="sprout-file-explorer-summary">No files yet.</p>}
            {rows.map(({ node, depth, size, position }) => {
              const folder = node.kind === 'folder';
              const isOpen = folder && expanded.has(node.path);
              return (
                <div
                  key={node.path}
                  role="treeitem"
                  data-path={node.path}
                  data-kind={node.kind}
                  aria-level={depth + 1}
                  aria-setsize={size}
                  aria-posinset={position}
                  aria-expanded={folder ? isOpen : undefined}
                  aria-selected={folder ? undefined : node.path === active}
                  tabIndex={node.path === rovingPath ? 0 : -1}
                  className="sprout-file-explorer-row"
                  style={{ '--depth': depth } as CSSProperties}
                  onFocus={() => setFocused(node.path)}
                  onClick={() => (folder ? toggle(node.path) : open(node.path))}
                >
                  {Array.from({ length: depth }, (_, at) => (
                    <span key={at} aria-hidden="true" className="sprout-file-explorer-guide" />
                  ))}
                  <span aria-hidden="true" className="sprout-file-explorer-chevron">
                    {folder && <ChevronRight size={12} />}
                  </span>
                  {folder ? (
                    isOpen ? (
                      <FolderOpen size={16} aria-hidden="true" className="sprout-file-explorer-folder" />
                    ) : (
                      <Folder size={16} aria-hidden="true" className="sprout-file-explorer-folder" />
                    )
                  ) : (
                    <FileGlyph name={node.name} />
                  )}
                  <span className="sprout-file-explorer-name" title={node.path}>
                    {node.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </aside>
      <section className="sprout-file-explorer-editor" aria-label="Editor">
        {tabs.length > 0 && (
          <div className="sprout-file-explorer-tabs" aria-label="Open files">
            {tabs.map(path => (
              <div key={path} className="sprout-file-explorer-tab" data-active={path === active ? '' : undefined}>
                <button
                  type="button"
                  className="sprout-file-explorer-tab-open"
                  aria-current={path === active || undefined}
                  title={path}
                  onClick={() => {
                    setActive(path);
                    setLine(null);
                  }}
                  onAuxClick={event => {
                    if (event.button === 1) close(path);
                  }}
                >
                  <FileGlyph name={path} />
                  {nameOf(path)}
                </button>
                <button
                  type="button"
                  className="sprout-file-explorer-tab-close"
                  aria-label={`Close ${nameOf(path)}`}
                  onClick={() => close(path)}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
        {activeFile ? (
          <>
            <nav className="sprout-file-explorer-crumbs" aria-label="File path">
              <ol>
                {activeFile.path.split('/').map((part, index, parts) => (
                  <li key={index} aria-current={index === parts.length - 1 ? 'page' : undefined}>
                    {index > 0 && (
                      <ChevronRight size={10} aria-hidden="true" className="sprout-file-explorer-crumb-separator" />
                    )}
                    {part}
                  </li>
                ))}
              </ol>
            </nav>
            <div className="sprout-file-explorer-body">
              {'content' in activeFile ? (
                activeFile.content === '' ? (
                  <p className="sprout-file-explorer-summary">This file is empty.</p>
                ) : (
                  <CodeView key={activeFile.path} file={activeFile} query={results ? deferred : ''} line={line} />
                )
              ) : (
                <StatePanel
                  kind="unavailable"
                  heading="h3"
                  title="File cannot be displayed"
                  description={activeFile.unavailable}
                />
              )}
            </div>
            <div className="sprout-file-explorer-status">
              <span>{language ? codeLanguageNames[language] : 'Plain text'}</span>
              {'content' in activeFile && <span>{activeFile.content.split('\n').length.toLocaleString()} lines</span>}
              {line !== null && <span>Line {line}</span>}
              <span className="sprout-file-explorer-status-end">Read only</span>
            </div>
          </>
        ) : (
          <StatePanel
            kind="empty"
            heading="h3"
            title="Open a file"
            description="Choose a file in the tree, or search names and text."
            icon={FileText}
          />
        )}
      </section>
    </div>
  );
}
