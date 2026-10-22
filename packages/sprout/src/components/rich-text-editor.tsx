'use client';

import {
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Extension, InputRule, type Editor, type Extensions, type JSONContent } from '@tiptap/core';
import { Fragment, Slice, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection, type EditorState } from '@tiptap/pm/state';
import { canSplit } from '@tiptap/pm/transform';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Check } from 'reicon-react/icons/Check';
import { LinkOff } from 'reicon-react/icons/LinkOff';
import { cn } from '../internal/classes.js';
import { Spinner } from './spinner.js';

export const richTextEditorSizeNames = ['md', 'sm'] as const;

export type RichTextEditorSize = (typeof richTextEditorSizeNames)[number];
/** A Tiptap JSON document, such as `{ type: "doc", content: [{ type: "paragraph" }] }`. */
export type RichTextValue = JSONContent;
export type RichTextEditorHandle = {
  /** Puts the caret back in the editor. */
  focus: () => void;
  /** The Tiptap editor, or `null` before it mounts. Use it for formatting commands. */
  editor: () => Editor | null;
  /** Replaces the document and calls `onChange`. */
  setContent: (content: RichTextValue) => void;
};

/** An account a keyword can use, such as a Slack workspace or a Google login. */
export interface RichTextKeywordAccount {
  id: string;
  label: string;
}

/** A word the editor shows as a chip while it's typed, such as an integration name. */
export interface RichTextKeyword {
  id: string;
  /** The name in the chip's tooltip and announcements, such as `Slack`. */
  label: string;
  /** Whole words that become this chip, any case. Defaults to `[label]`. */
  match?: readonly string[] | undefined;
  /** A static 16px icon, such as `<BrandIcon brand="slack" size="inline" />`. It's copied into each chip. */
  icon?: ReactNode;
  /**
   * Any CSS color. Tints the chip text and fill; the chip stays neutral without it. Use a mid-tone that holds
   * 4.5:1 in both themes; black, white, or pale brand colors read poorly, so leave those neutral.
   */
  color?: string | undefined;
  /** `false` mutes the chip and adds a disconnected mark. Defaults to `true`. */
  connected?: boolean | undefined;
  /** The account a connected keyword uses: an `accounts` id, or a label such as `acme.slack.com`. Shown in its tooltip. */
  account?: string | undefined;
  /** Accounts to switch between. With two or more and `onKeywordAccountChange`, the tooltip offers a Switch menu. */
  accounts?: readonly RichTextKeywordAccount[] | undefined;
}

export interface RichTextEditorProps {
  ref?: Ref<RichTextEditorHandle> | undefined;
  /**
   * `md` is an 80px to 256px box with 16px text and a toolbar row below.
   * `sm` is a 40px to 128px box with 14px text and the toolbar inline at
   * the end.
   */
  size?: RichTextEditorSize | null | undefined;
  /** Shrinks a default editor to one compact row with an inline toolbar, such as while an agent question waits. */
  condensed?: boolean | undefined;
  value: RichTextValue;
  onChange: (value: RichTextValue) => void;
  /** Runs on Enter (outside lists and code) and on Cmd or Ctrl+Enter. */
  onSend: () => void;
  /** Extra Tiptap extensions, such as mention nodes and suggestion triggers. */
  extensions?: Extensions | undefined;
  /** Words shown as chips with an icon while typed. They stay plain text in `value`; read them with `findKeywords`. */
  keywords?: readonly RichTextKeyword[] | undefined;
  /** Adds a Connect button to a disconnected chip's hint and runs when its mark is clicked. */
  onKeywordConnect?: ((keyword: RichTextKeyword) => void) | undefined;
  /**
   * Runs with the account id picked from a chip's Switch menu. Return a promise to keep the menu open with a
   * spinner on that account until it settles; a rejection shows an error and keeps the menu open.
   */
  onKeywordAccountChange?: ((keyword: RichTextKeyword, accountId: string) => void | Promise<unknown>) | undefined;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  /** Accessible name of the textbox. Defaults to `Message`. */
  ariaLabel?: string | undefined;
  ariaInvalid?: boolean | undefined;
  ariaDescribedBy?: string | undefined;
  /** Set while a suggestion list is open; Enter then picks a suggestion instead of sending. */
  ariaExpanded?: boolean | undefined;
  ariaControls?: string | undefined;
  ariaActiveDescendant?: string | undefined;
  /** Buttons and pickers shown with the editor: a row below, or inline when compact or condensed. */
  toolbarAddon?: ReactNode | undefined;
  className?: string | undefined;
}

const fenceLanguage = /^[\w+#.-]{1,32}$/;
const typedFence = /```([\w+#.-]{1,32})?\s$/;
const fenceOnly = /^```([\w+#.-]{1,32})?$/;
const openingFence = /^ {0,3}(?:(`{3,})([^`]*)|(~{3,})(.*))$/;

function isFenceLine(state: EditorState) {
  const { $from, empty } = state.selection;
  if (!empty || $from.parent.type.name !== 'paragraph' || $from.parentOffset !== $from.parent.content.size)
    return false;
  return fenceOnly.test($from.parent.textBetween(0, $from.parentOffset, undefined, '\n').split('\n').at(-1) ?? '');
}

function markdownBlocks(schema: Schema, text: string) {
  const blocks: ProseMirrorNode[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  while (lines.length) {
    const line = lines.shift()!;
    const open = openingFence.exec(line);
    if (!open) {
      if (line.trim()) blocks.push(schema.nodes.paragraph!.create(null, schema.text(line)));
      continue;
    }
    const fence = open[1] ?? open[3]!;
    const info = (open[2] ?? open[4]!).trim().split(/\s/)[0]!;
    const closing = new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`);
    const end = lines.findIndex(candidate => closing.test(candidate));
    const code = (end === -1 ? lines.splice(0) : lines.splice(0, end + 1).slice(0, -1)).join('\n');
    blocks.push(
      schema.nodes.codeBlock!.create(
        { language: fenceLanguage.test(info) ? info : null },
        code ? schema.text(code) : null,
      ),
    );
  }
  return blocks;
}

// StarterKit's fence rule only fires at the start of a paragraph, but Shift+Enter leaves the fence after a hard break.
const MarkdownCodeFence = Extension.create({
  name: 'markdownCodeFence',
  priority: 1000,
  addInputRules() {
    return [
      new InputRule({
        find: typedFence,
        handler: ({ state, range, match }) => {
          const { tr, schema } = state;
          const codeBlock = schema.nodes.codeBlock!;
          const $from = tr.doc.resolve(range.from);
          if ($from.parent.type.name !== 'paragraph' || range.to !== $from.end()) return null;
          const before = $from.nodeBefore;
          const attrs = { language: match[1] ?? null };
          if (!before) {
            if (!$from.node(-1).canReplaceWith($from.index(-1), $from.indexAfter(-1), codeBlock)) return null;
            tr.delete(range.from, range.to).setBlockType(range.from, range.from, codeBlock, attrs);
            return;
          }
          if (before.type.name !== 'hardBreak') return null;
          const splitAt = range.from - before.nodeSize;
          tr.delete(splitAt, range.to);
          if (!canSplit(tr.doc, splitAt, 1, [{ type: codeBlock, attrs }])) return null;
          tr.split(splitAt, 1, [{ type: codeBlock, attrs }]);
          tr.setSelection(TextSelection.create(tr.doc, splitAt + 2));
        },
      }),
    ];
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markdownCodeFencePaste'),
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData('text/plain') ?? '';
            if (
              view.state.selection.$from.parent.type.spec.code ||
              !text.split(/\r\n?|\n/).some(line => openingFence.test(line))
            )
              return false;
            const blocks = markdownBlocks(view.state.schema, text);
            const slice = new Slice(
              Fragment.from(blocks),
              blocks[0]?.type.name === 'paragraph' ? 1 : 0,
              blocks.at(-1)?.type.name === 'paragraph' ? 1 : 0,
            );
            view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView().setMeta('paste', true));
            return true;
          },
        },
      }),
    ];
  },
});

const MessageFormatting = Extension.create({
  name: 'messageFormatting',
  extendMarkSchema(extension) {
    if (extension.name === 'link') return { inclusive: false };
    return {};
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('clearDeletedLink'),
        appendTransaction(transactions, oldState, state) {
          const link = state.schema.marks.link;
          if (
            !link ||
            !transactions.some(transaction => transaction.docChanged) ||
            state.doc.content.size >= oldState.doc.content.size ||
            !state.selection.empty ||
            !state.storedMarks?.some(mark => mark.type === link)
          )
            return null;
          if (
            state.selection.$from.parent.content.size &&
            state.selection.$from.marks().some(mark => mark.type === link)
          )
            return null;
          return state.tr.removeStoredMark(link);
        },
      }),
    ];
  },
});

function within(state: EditorState, name: string) {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) if ($from.node(depth).type.name === name) return true;
  return false;
}

type KeywordHit = { keyword: RichTextKeyword; from: number; to: number };
type KeywordPattern = { regex: RegExp; terms: Map<string, RichTextKeyword> };
type KeywordSource = {
  pattern: KeywordPattern | null;
  signature: string;
  revision: number;
  glyph: (id: string) => Element | null;
  connect: (id: string) => void;
};
type KeywordState = { hits: KeywordHit[]; decorations: DecorationSet };

const objectReplacement = '\ufffc';
const statusTemplate = 'sprout-status';
const keywordKey = new PluginKey<KeywordState>('richTextKeywords');

const normalizeTerm = (term: string) => term.trim().toLowerCase().replace(/\s+/g, ' ');

function keywordPattern(keywords: readonly RichTextKeyword[]): KeywordPattern | null {
  const terms = new Map<string, RichTextKeyword>();
  for (const keyword of keywords)
    for (const term of keyword.match?.length ? keyword.match : [keyword.label]) {
      const key = normalizeTerm(term);
      if (key && !terms.has(key)) terms.set(key, keyword);
    }
  if (!terms.size) return null;
  const alternatives = [...terms.keys()]
    .sort((a, b) => b.length - a.length)
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'));
  return {
    regex: new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}_])`, 'giu'),
    terms,
  };
}

function scanText(text: string, pattern: KeywordPattern, offset: number, hits: KeywordHit[]) {
  for (const match of text.matchAll(pattern.regex)) {
    const keyword = pattern.terms.get(normalizeTerm(match[0]));
    if (keyword) hits.push({ keyword, from: offset + match.index, to: offset + match.index + match[0].length });
  }
}

// Code, inline nodes, and line breaks become one placeholder character each, so positions still line up and words don't join across them.
function docKeywords(doc: ProseMirrorNode, pattern: KeywordPattern | null) {
  const hits: KeywordHit[] = [];
  if (!pattern) return hits;
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    if (node.type.spec.code) return false;
    let text = '';
    node.forEach(child => {
      text +=
        child.isText && !child.marks.some(mark => mark.type.spec.code)
          ? child.text!
          : objectReplacement.repeat(child.nodeSize);
    });
    scanText(text, pattern, pos + 1, hits);
    return false;
  });
  return hits;
}

/** The keywords a message mentions, in order of first mention. Code and code blocks don't count. */
export function findKeywords(value: RichTextValue, keywords: readonly RichTextKeyword[]): RichTextKeyword[] {
  const pattern = keywordPattern(keywords);
  if (!pattern) return [];
  const hits: KeywordHit[] = [];
  const visit = (node: JSONContent) => {
    if (node.type === 'codeBlock' || !node.content) return;
    if (!node.content.some(child => child.type === 'text')) return node.content.forEach(visit);
    const text = node.content
      .map(child =>
        child.type === 'text' && !child.marks?.some(mark => mark.type === 'code')
          ? (child.text ?? '')
          : objectReplacement,
      )
      .join('');
    scanText(text, pattern, 0, hits);
  };
  visit(value);
  return [...new Set(hits.map(hit => hit.keyword))];
}

function keywordWidget(kind: 'icon' | 'status', keyword: RichTextKeyword, glyph: Element | null) {
  const widget = document.createElement('span');
  widget.className = `sprout-rich-text-keyword-${kind}`;
  widget.contentEditable = 'false';
  widget.setAttribute('aria-hidden', 'true');
  widget.dataset.keyword = keyword.id;
  widget.dataset.connected = String(keyword.connected !== false);
  const box = document.createElement('span');
  box.className = 'sprout-rich-text-keyword-glyph';
  if (glyph) box.append(glyph.cloneNode(true));
  // The glyph is out of flow inside an empty inline box, which adds no line-break opportunity, so it never wraps away from its word.
  widget.append(box);
  return widget;
}

function keywordDecorations(doc: ProseMirrorNode, hits: KeywordHit[], source: KeywordSource) {
  const seen = new Map<string, number>();
  const decorations: Decoration[] = [];
  for (const { keyword, from, to } of hits) {
    const index = seen.get(keyword.id) ?? 0;
    seen.set(keyword.id, index + 1);
    // Keys keep widget DOM across edits, so the fade-in plays once per chip.
    const key = `${keyword.id}:${index}:${source.revision}`;
    const connected = keyword.connected !== false;
    const icon = keyword.icon != null ? source.glyph(keyword.id) : null;
    decorations.push(
      Decoration.inline(from, to, {
        class: 'sprout-rich-text-keyword',
        'data-keyword': keyword.id,
        'data-connected': String(connected),
        ...(icon && { 'data-icon': '' }),
        ...(keyword.color && { 'data-tinted': '', style: `--sprout-rich-text-keyword-color: ${keyword.color}` }),
      }),
    );
    if (icon)
      decorations.push(
        Decoration.widget(from, () => keywordWidget('icon', keyword, icon), { side: -1, key: `${key}:icon` }),
      );
    if (!connected)
      decorations.push(
        Decoration.widget(
          to,
          () => {
            const widget = keywordWidget('status', keyword, source.glyph(statusTemplate));
            widget.addEventListener('mousedown', event => {
              event.preventDefault();
              source.connect(keyword.id);
            });
            return widget;
          },
          { side: 1, key: `${key}:status`, stopEvent: () => true },
        ),
      );
  }
  return DecorationSet.create(doc, decorations);
}

function keywordExtension(source: KeywordSource) {
  const build = (doc: ProseMirrorNode): KeywordState => {
    const hits = docKeywords(doc, source.pattern);
    return { hits, decorations: keywordDecorations(doc, hits, source) };
  };
  return Extension.create({
    name: 'richTextKeywords',
    addProseMirrorPlugins() {
      return [
        new Plugin<KeywordState>({
          key: keywordKey,
          state: {
            init: (_, state) => build(state.doc),
            apply: (tr, previous) => (tr.docChanged || tr.getMeta(keywordKey) ? build(tr.doc) : previous),
          },
          props: { decorations: state => keywordKey.getState(state)?.decorations },
        }),
      ];
    },
  });
}

type KeywordHint = { keyword: RichTextKeyword; left: number; top: number; bottom: number; below: boolean };

const accountLabel = (keyword: RichTextKeyword) =>
  keyword.accounts?.find(account => account.id === keyword.account)?.label ?? keyword.account;

const hasHint = (keyword: RichTextKeyword) => keyword.connected === false || !!keyword.account;

const noKeywords: readonly RichTextKeyword[] = [];

const allowedProtocols = ['http:', 'https:', 'mailto:'];

const baseExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    horizontalRule: false,
    underline: false,
    link: {
      openOnClick: false,
      isAllowedUri: (url, context) => {
        const protocol = /^[a-z][a-z\d+.-]*:/i.exec(url)?.[0].toLowerCase();
        return context.defaultValidate(url) && (!protocol || allowedProtocols.includes(protocol));
      },
    },
  }),
  MarkdownCodeFence,
  MessageFormatting,
];

/**
 * A chat message editor built on Tiptap. Enter sends, Shift+Enter adds a
 * line, and lists, code fences, links, and headings work as you type. It marks
 * itself `data-slot="input-group-control"`, so an `InputGroup` around it draws
 * the border, focus, and invalid states.
 */
export function RichTextEditor({
  ref,
  size,
  condensed = false,
  value,
  onChange,
  onSend,
  extensions = [],
  keywords,
  onKeywordConnect,
  onKeywordAccountChange,
  placeholder = 'Ask anything…',
  disabled = false,
  ariaLabel = 'Message',
  ariaInvalid = false,
  ariaDescribedBy,
  ariaExpanded,
  ariaControls,
  ariaActiveDescendant,
  toolbarAddon,
  className,
}: RichTextEditorProps) {
  const scale = size ?? 'md';
  const inline = condensed || scale === 'sm';
  const onSendRef = useRef(onSend);
  const onChangeRef = useRef(onChange);
  const placeholderRef = useRef(placeholder);
  const suggestionOpenRef = useRef(ariaExpanded ?? false);
  onSendRef.current = onSend;
  onChangeRef.current = onChange;
  placeholderRef.current = placeholder;
  suggestionOpenRef.current = ariaExpanded ?? false;
  const keywordList = keywords ?? noKeywords;
  const keywordById = useRef(new Map<string, RichTextKeyword>());
  keywordById.current = new Map(keywordList.map(keyword => [keyword.id, keyword]));
  const onKeywordConnectRef = useRef(onKeywordConnect);
  onKeywordConnectRef.current = onKeywordConnect;
  const root = useRef<HTMLDivElement>(null);
  const templates = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const hovered = useRef<number | null>(null);
  const bubbleFocused = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuOpenRef = useRef(false);
  menuOpenRef.current = menuOpen;
  const [menuSide, setMenuSide] = useState<'top' | 'bottom' | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const pendingToken = useRef<symbol | null>(null);
  const caretChip = useRef<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const announced = useRef(new Set<string>());
  const [hint, setHint] = useState<KeywordHint | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const template = (id: string) =>
    [...(templates.current?.children ?? [])].find(el => (el as HTMLElement).dataset.keywordTemplate === id);
  const source = useMemo<KeywordSource>(
    () => ({
      pattern: null,
      signature: '',
      revision: 0,
      glyph: id => template(id)?.firstElementChild ?? null,
      connect: id => {
        const keyword = keywordById.current.get(id);
        if (keyword) onKeywordConnectRef.current?.(keyword);
      },
    }),
    [],
  );
  const keywordPlugin = useMemo(() => keywordExtension(source), [source]);
  const configured = useMemo(
    () => [
      ...baseExtensions,
      Placeholder.configure({ placeholder: () => placeholderRef.current }),
      keywordPlugin,
      ...extensions,
    ],
    [extensions, keywordPlugin],
  );
  const editor = useEditor({
    immediatelyRender: false,
    extensions: configured,
    content: value,
    editable: !disabled,
    editorProps: {
      // useEditor re-applies editorProps on every render, so these stay current.
      attributes: {
        'data-slot': 'input-group-control',
        role: 'textbox',
        'aria-label': ariaLabel,
        'aria-disabled': String(disabled),
        'aria-multiline': 'true',
        'aria-autocomplete': 'list',
        'aria-invalid': ariaInvalid ? 'true' : 'false',
        // ARIA forbids aria-expanded on a textbox; aria-controls and aria-activedescendant carry the open list.
        ...(ariaDescribedBy && { 'aria-describedby': ariaDescribedBy }),
        ...(ariaControls && { 'aria-controls': ariaControls }),
        ...(ariaActiveDescendant && {
          'aria-activedescendant': ariaActiveDescendant,
        }),
        class: 'sprout-rich-text-editor-content',
      },
      handleKeyDown: (view, event) => {
        if (event.isComposing) return false;
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          onSendRef.current();
          return true;
        }
        if (event.key === 'Enter' && suggestionOpenRef.current) return false;
        if (event.key === 'Enter' && isFenceLine(view.state)) return false;
        if (
          event.key === 'Enter' &&
          !event.shiftKey &&
          !within(view.state, 'listItem') &&
          !within(view.state, 'codeBlock')
        ) {
          event.preventDefault();
          onSendRef.current();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: current }) => onChangeRef.current(current.getJSON()),
  });

  useImperativeHandle(
    ref,
    () => ({
      focus: () => editor?.commands.focus(),
      editor: () => editor,
      setContent: content => editor?.commands.setContent(content, { emitUpdate: true }),
    }),
    [editor],
  );

  // Runs after every render: keyword props are often inline arrays, so only a real change redraws the chips.
  useLayoutEffect(() => {
    const signature = JSON.stringify(
      keywordList.map(keyword => [
        keyword.id,
        keyword.label,
        keyword.match,
        keyword.color,
        keyword.connected !== false,
        keyword.account,
        keyword.accounts,
        template(keyword.id)?.innerHTML ?? '',
      ]),
    );
    if (signature === source.signature) return;
    source.signature = signature;
    source.revision += 1;
    source.pattern = keywordPattern(keywordList);
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(keywordKey, true));
  });

  const canSwitch = (keyword: RichTextKeyword) =>
    keyword.connected !== false && (keyword.accounts?.length ?? 0) > 1 && !!onKeywordAccountChange && !disabled;
  const describeHint = (keyword: RichTextKeyword) =>
    keyword.connected === false
      ? `${keyword.label} isn't connected.${onKeywordConnect && !disabled ? ' Press Tab to connect it.' : ''}`
      : `${keyword.label} uses ${accountLabel(keyword)}.${canSwitch(keyword) ? ' Press Tab to change it.' : ''}`;

  const updateHint = () => {
    if (!editor || editor.isDestroyed || !root.current) return setHint(null);
    const hits = keywordKey.getState(editor.state)?.hits ?? [];
    const { from, empty } = editor.state.selection;
    const hinted = hits.filter(hit => hasHint(hit.keyword));
    const atCaret =
      (editor.isFocused || bubbleFocused.current) && empty
        ? hinted.find(hit => from > hit.from && from < hit.to)
        : undefined;
    // Screen readers can't see the tooltip, so say what it holds once when the caret enters a chip.
    if ((atCaret?.keyword.id ?? null) !== caretChip.current) {
      caretChip.current = atCaret?.keyword.id ?? null;
      if (atCaret && editor.isFocused) setAnnouncement(describeHint(atCaret.keyword));
    }
    const pick = (hovered.current !== null && hinted.find(hit => hit.from === hovered.current)) || atCaret;
    if (!pick) return setHint(null);
    const view = editor.view;
    const start = view.coordsAtPos(pick.from, 1);
    const end = view.coordsAtPos(pick.to, -1);
    const frame = view.dom.getBoundingClientRect();
    if (start.bottom < frame.top || start.top > frame.bottom) return setHint(null);
    const box = root.current.getBoundingClientRect();
    const below = start.top < 48;
    setHint({
      keyword: pick.keyword,
      left: (start.left + end.right) / 2 - box.left,
      top: start.top - box.top - 6,
      bottom: end.bottom - box.top + 6,
      below,
    });
  };
  const updateHintRef = useRef(updateHint);
  updateHintRef.current = updateHint;

  useEffect(() => {
    if (!editor) return;
    const onTransaction = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (transaction.docChanged) {
        hovered.current = null;
        const hits = keywordKey.getState(editor.state)?.hits ?? [];
        const offline = [...new Set(hits.filter(hit => hit.keyword.connected === false).map(hit => hit.keyword))];
        for (const id of announced.current)
          if (!offline.some(keyword => keyword.id === id)) announced.current.delete(id);
        const fresh = offline.filter(keyword => !announced.current.has(keyword.id));
        fresh.forEach(keyword => announced.current.add(keyword.id));
        if (fresh.length)
          setAnnouncement(
            `${fresh.map(keyword => keyword.label).join(', ')} ${fresh.length > 1 ? "aren't" : "isn't"} connected.`,
          );
      }
      updateHintRef.current();
    };
    const onBlur = ({ event }: { event: FocusEvent }) => {
      if (bubble.current?.contains(event.relatedTarget as Node | null)) bubbleFocused.current = true;
      updateHintRef.current();
    };
    const onFocus = () => updateHintRef.current();
    const onScroll = () => updateHintRef.current();
    editor.on('transaction', onTransaction);
    editor.on('focus', onFocus);
    editor.on('blur', onBlur);
    const scroller = editor.isDestroyed ? null : editor.view.dom;
    scroller?.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onScroll);
    return () => {
      editor.off('transaction', onTransaction);
      editor.off('focus', onFocus);
      editor.off('blur', onBlur);
      scroller?.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [editor]);
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  // Keeps the hint inside the editor's width, and fits an open menu into the taller side of the viewport.
  useLayoutEffect(() => {
    const el = bubble.current;
    const frame = root.current?.getBoundingClientRect();
    const width = root.current?.clientWidth;
    if (!hint || !el || !frame || !width) return;
    const half = el.offsetWidth / 2;
    el.style.left = `${Math.min(Math.max(hint.left, half), Math.max(half, width - half))}px`;
    if (!menuOpen) {
      el.style.removeProperty('--sprout-rich-text-keyword-menu-height');
      if (!hint.below && el.getBoundingClientRect().top < 8) setHint({ ...hint, below: true });
      return;
    }
    const menu = el.querySelector<HTMLElement>('[role="menu"]');
    if (!menu) return;
    const space = {
      top: frame.top + hint.top - 8,
      bottom: window.innerHeight - (frame.top + hint.bottom) - 8,
    };
    if (!menuSide) {
      const preferred = hint.below ? 'bottom' : 'top';
      const other = preferred === 'top' ? 'bottom' : 'top';
      setMenuSide(el.offsetHeight > space[preferred] && space[other] > space[preferred] ? other : preferred);
      return;
    }
    const header = el.offsetHeight - menu.offsetHeight;
    el.style.setProperty('--sprout-rich-text-keyword-menu-height', `${Math.max(80, space[menuSide] - header)}px`);
  }, [hint, menuOpen, menuSide]);

  const hintId = hint?.keyword.id;
  useEffect(() => setMenuOpen(false), [hintId]);
  useEffect(() => {
    if (menuOpen) return;
    pendingToken.current = null;
    setPending(null);
    setFailed(false);
  }, [menuOpen]);
  useLayoutEffect(() => {
    if (!menuOpen) return;
    const items = [...(bubble.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
    // The menu may still flip sides after this commit, so don't let focus scroll the page.
    (items.find(item => item.getAttribute('aria-checked') === 'true') ?? items[0])?.focus({ preventScroll: true });
    const close = (event: PointerEvent) => {
      if (bubble.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
      hovered.current = null;
      updateHintRef.current();
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    bubble.current?.querySelector<HTMLElement>('[aria-haspopup="menu"]')?.focus();
  };
  const pickAccount = (keyword: RichTextKeyword, accountId: string) => {
    if (pending) return;
    if (accountId === keyword.account || !onKeywordAccountChange) return closeMenu();
    const result = onKeywordAccountChange(keyword, accountId);
    if (!result || typeof (result as Promise<unknown>).then !== 'function') return closeMenu();
    const token = Symbol();
    pendingToken.current = token;
    setPending(accountId);
    setFailed(false);
    Promise.resolve(result).then(
      () => {
        if (pendingToken.current === token) closeMenu();
      },
      () => {
        if (pendingToken.current !== token) return;
        pendingToken.current = null;
        setPending(null);
        setFailed(true);
        setAnnouncement(`Couldn't switch the ${keyword.label} account.`);
      },
    );
  };
  const menuKeys = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const move = (next: number) => {
      event.preventDefault();
      items[(next + items.length) % items.length]?.focus();
    };
    if (event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowUp') move(index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(items.length - 1);
    else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
    } else if (event.key === 'Tab') setMenuOpen(false);
  };

  const hover = (target: EventTarget | null) => {
    if (!editor || editor.isDestroyed) return;
    const chip = (target as Element | null)?.closest?.(
      '.sprout-rich-text-keyword, .sprout-rich-text-keyword-icon, .sprout-rich-text-keyword-status',
    );
    clearTimeout(hoverTimer.current);
    if (chip) {
      const pos = editor.view.posAtDOM(chip, 0);
      const hit = keywordKey
        .getState(editor.state)
        ?.hits.find(candidate => hasHint(candidate.keyword) && pos >= candidate.from && pos <= candidate.to);
      hovered.current = hit?.from ?? null;
      updateHint();
    } else if (hovered.current !== null && !menuOpenRef.current) {
      // A short delay lets the pointer cross the gap into the hint.
      hoverTimer.current = setTimeout(() => {
        hovered.current = null;
        updateHintRef.current();
      }, 150);
    }
  };

  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [disabled, editor]);
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr);
  }, [editor, placeholder]);
  useEffect(() => {
    if (editor && !editor.state.doc.eq(editor.schema.nodeFromJSON(value)))
      editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div
      ref={root}
      data-slot="rich-text-editor"
      data-size={scale}
      data-condensed={condensed || undefined}
      data-disabled={disabled || undefined}
      className={cn(
        'sprout-rich-text-editor',
        `sprout-rich-text-editor-size-${scale}`,
        condensed && 'sprout-rich-text-editor-condensed',
        className,
      )}
    >
      <div
        className="sprout-rich-text-editor-body"
        onPointerOver={keywordList.length ? event => hover(event.target) : undefined}
        onPointerLeave={keywordList.length ? () => hover(null) : undefined}
      >
        <EditorContent editor={editor} />
      </div>
      {keywordList.length > 0 && (
        <>
          <span ref={templates} hidden>
            {keywordList.map(keyword =>
              keyword.icon != null ? (
                <span key={keyword.id} data-keyword-template={keyword.id}>
                  {keyword.icon}
                </span>
              ) : null,
            )}
            <span data-keyword-template={statusTemplate}>
              <LinkOff aria-hidden="true" />
            </span>
          </span>
          <span className="sprout-rich-text-editor-sr-only" role="status" aria-live="polite">
            {announcement}
          </span>
        </>
      )}
      {hint && (
        <div
          ref={bubble}
          data-slot="rich-text-keyword-hint"
          data-side={(menuOpen && menuSide ? menuSide === 'bottom' : hint.below) ? 'bottom' : 'top'}
          data-menu={menuOpen || undefined}
          className="sprout-rich-text-keyword-hint"
          style={{
            left: hint.left,
            top: (menuOpen && menuSide ? menuSide === 'bottom' : hint.below) ? hint.bottom : hint.top,
          }}
          onPointerEnter={() => clearTimeout(hoverTimer.current)}
          onPointerLeave={() => hover(null)}
          onFocus={() => {
            bubbleFocused.current = true;
          }}
          onBlur={event => {
            if (event.currentTarget.contains(event.relatedTarget)) return;
            bubbleFocused.current = false;
            updateHint();
          }}
          onKeyDown={event => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            bubbleFocused.current = false;
            hovered.current = null;
            editor?.commands.focus();
          }}
        >
          {hint.keyword.connected === false ? (
            <>
              <LinkOff size={14} aria-hidden="true" />
              <span>{hint.keyword.label} isn't connected</span>
            </>
          ) : (
            <>
              {hint.keyword.icon != null && (
                <span className="sprout-rich-text-keyword-hint-icon" aria-hidden="true">
                  {hint.keyword.icon}
                </span>
              )}
              <span className="sprout-rich-text-keyword-hint-label">{hint.keyword.label}</span>
              <span className="sprout-rich-text-keyword-hint-account">{accountLabel(hint.keyword)}</span>
            </>
          )}
          {canSwitch(hint.keyword) && (
            <>
              <button
                type="button"
                className="sprout-rich-text-keyword-connect"
                aria-label={`Switch ${hint.keyword.label} account`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls={menuOpen ? menuId : undefined}
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                  setMenuSide(null);
                  setMenuOpen(open => !open);
                }}
              >
                Switch
              </button>
              {menuOpen && (
                <div
                  id={menuId}
                  role="menu"
                  aria-label={`${hint.keyword.label} accounts`}
                  aria-busy={pending !== null || undefined}
                  className="sprout-rich-text-keyword-menu"
                  onKeyDown={menuKeys}
                >
                  {hint.keyword.accounts!.map(account => {
                    const current = account.id === hint.keyword.account;
                    return (
                      <button
                        key={account.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={current}
                        aria-disabled={(pending !== null && pending !== account.id) || undefined}
                        data-pending={pending === account.id || undefined}
                        tabIndex={-1}
                        className="sprout-rich-text-keyword-menu-item"
                        onPointerMove={event => {
                          if (event.pointerType === 'mouse') event.currentTarget.focus();
                        }}
                        onClick={() => pickAccount(hint.keyword, account.id)}
                      >
                        <span>{account.label}</span>
                        <span className="sprout-rich-text-keyword-menu-mark" aria-hidden="true">
                          {pending === account.id ? (
                            <Spinner size="sm" aria-hidden="true" />
                          ) : (
                            current && <Check size={14} aria-hidden="true" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                  {failed && (
                    <span aria-hidden="true" className="sprout-rich-text-keyword-menu-error">
                      Couldn't switch. Try again.
                    </span>
                  )}
                </div>
              )}
            </>
          )}
          {hint.keyword.connected === false && onKeywordConnect && !disabled && (
            <button
              type="button"
              className="sprout-rich-text-keyword-connect"
              aria-label={`Connect ${hint.keyword.label}`}
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                hovered.current = null;
                onKeywordConnect(hint.keyword);
              }}
            >
              Connect
            </button>
          )}
        </div>
      )}
      {toolbarAddon && (
        <div
          data-slot="rich-text-editor-toolbar"
          className={cn('sprout-rich-text-editor-toolbar', inline && 'sprout-rich-text-editor-toolbar-inline')}
        >
          {toolbarAddon}
        </div>
      )}
    </div>
  );
}
