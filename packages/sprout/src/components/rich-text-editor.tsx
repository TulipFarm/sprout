'use client';

import { useEffect, useImperativeHandle, useMemo, useRef, type ReactNode, type Ref } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Extension, InputRule, type Editor, type Extensions, type JSONContent } from '@tiptap/core';
import { Fragment, Slice, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection, type EditorState } from '@tiptap/pm/state';
import { canSplit } from '@tiptap/pm/transform';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '../internal/classes.js';

export const richTextEditorSizeNames = ['default', 'compact'] as const;

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

export interface RichTextEditorProps {
  ref?: Ref<RichTextEditorHandle> | undefined;
  /**
   * `default` is an 80px to 256px box with 16px text and a toolbar row below.
   * `compact` is a 40px to 128px box with 14px text and the toolbar inline at
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
  const scale = size ?? 'default';
  const inline = condensed || scale === 'compact';
  const onSendRef = useRef(onSend);
  const onChangeRef = useRef(onChange);
  const placeholderRef = useRef(placeholder);
  const suggestionOpenRef = useRef(ariaExpanded ?? false);
  onSendRef.current = onSend;
  onChangeRef.current = onChange;
  placeholderRef.current = placeholder;
  suggestionOpenRef.current = ariaExpanded ?? false;
  const configured = useMemo(
    () => [...baseExtensions, Placeholder.configure({ placeholder: () => placeholderRef.current }), ...extensions],
    [extensions],
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
      <div className="sprout-rich-text-editor-body">
        <EditorContent editor={editor} />
      </div>
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
