'use client';

import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Extension, Node, mergeAttributes, type Extensions } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { exitSuggestion, type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion';
import { ArrowUp } from 'reicon-react/icons/ArrowUp';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { Folder } from 'reicon-react/icons/Folder';
import { Plus } from 'reicon-react/icons/Plus';
import { Sliders } from 'reicon-react/icons/Sliders';
import { X } from 'reicon-react/icons/X';
import { cn } from '../internal/classes.js';
import { FileAttachment, type AttachmentFile } from './attachment.js';
import { Button } from './button.js';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './dropdown-menu.js';
import { InputGroup, InputGroupAddon, InputGroupButton } from './input-group.js';
import { MentionList, MentionOption, MentionStatus } from './mention-list.js';
import { ModelSelector, type ModelSelectorModel } from './model-selector.js';
import { Popover, PopoverContent, PopoverTrigger } from './popover.js';
import { RichTextEditor, type RichTextEditorHandle, type RichTextValue } from './rich-text-editor.js';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip.js';

export const chatInputReferenceKindNames = ['agent', 'skill', 'file'] as const;
export const chatInputStatusNames = ['idle', 'streaming'] as const;

export type ChatInputReferenceKind = (typeof chatInputReferenceKindNames)[number];
export type ChatInputStatus = (typeof chatInputStatusNames)[number];

/** One row in the `@`, `/`, or `#` panel. Picking it drops a chip into the message. */
export interface ChatInputSuggestion {
  id: string;
  label: string;
  description?: string | undefined;
  /** A 16px icon, file icon, brand glyph, or small avatar. */
  media?: ReactNode;
}

/** Returns the rows that match what follows the trigger. It may be async. */
export type ChatInputSource = (query: string) => ChatInputSuggestion[] | Promise<ChatInputSuggestion[]>;

export interface ChatInputAction {
  id: string;
  label: string;
  description?: string | undefined;
  icon?: ReactNode;
  onSelect: () => void;
}

export interface ChatInputOption {
  id: string;
  label: string;
  description?: string | undefined;
  icon?: ReactNode;
  /** Modes only. Any CSS color; tints the box border, chip, and menu icon while on. */
  color?: string | undefined;
}

/** A model in the picker. Give `speed`, `quality`, and `cost` numbers to show the meters. */
export type ChatInputModel = ModelSelectorModel;

export interface ChatInputPrompt {
  id: string;
  label: string;
  icon?: ReactNode;
  /** The text put in the message. Defaults to `label`. */
  prompt?: string | undefined;
}

export interface ChatInputProps {
  value: RichTextValue;
  onValueChange: (value: RichTextValue) => void;
  /** Runs on Enter, Cmd or Ctrl+Enter, and the send button, only when the message has content. */
  onSend: () => void;
  /** Shown in place of send while `status` is `streaming`. */
  onStop?: (() => void) | undefined;
  /** `streaming` swaps send for stop and shows `streamingPlaceholder`. */
  status?: ChatInputStatus | undefined;
  placeholder?: string | undefined;
  streamingPlaceholder?: string | undefined;
  disabled?: boolean | undefined;
  /** Accessible name of the form. Defaults to `Message`. */
  label?: string | undefined;
  /** `@` opens these. Leave unset to turn the trigger off. */
  agents?: ChatInputSource | undefined;
  /** `/` opens these. */
  skills?: ChatInputSource | undefined;
  /** `#` opens these. */
  files?: ChatInputSource | undefined;
  attachments?: AttachmentFile[] | undefined;
  onRemoveAttachment?: ((id: string) => void) | undefined;
  /** The `+` menu, such as upload from computer, Google Drive, or a URL. */
  attachActions?: ChatInputAction[] | undefined;
  /** The modes menu, such as Plan, Deep research, or Learning. One mode at a time. */
  modes?: ChatInputOption[] | undefined;
  mode?: string | null | undefined;
  onModeChange?: ((mode: string | null) => void) | undefined;
  projects?: ChatInputOption[] | undefined;
  project?: string | undefined;
  onProjectChange?: ((project: string) => void) | undefined;
  models?: ChatInputModel[] | undefined;
  model?: string | undefined;
  onModelChange?: ((model: string) => void) | undefined;
  /** Starter chips under an empty message. A click fills the message. */
  prompts?: ChatInputPrompt[] | undefined;
  onPromptSelect?: ((prompt: ChatInputPrompt) => void) | undefined;
  className?: string | undefined;
}

const triggers = {
  agent: { char: '@', label: 'Agents', empty: 'No agents match.' },
  skill: { char: '/', label: 'Skills', empty: 'No skills match.' },
  file: { char: '#', label: 'Files', empty: 'No files match.' },
} as const satisfies Record<ChatInputReferenceKind, { char: string; label: string; empty: string }>;

type PanelState = {
  kind: ChatInputReferenceKind;
  items: ChatInputSuggestion[];
  active: number;
  select: (index: number) => void;
} | null;

const referenceNode = Node.create({
  name: 'chatReference',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      kind: {
        default: 'file',
        rendered: false,
        parseHTML: el => el.getAttribute('data-chat-reference'),
      },
      id: {
        default: '',
        rendered: false,
        parseHTML: el => el.getAttribute('data-id'),
      },
      label: {
        default: '',
        rendered: false,
        parseHTML: el => el.getAttribute('data-label'),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-chat-reference]' }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const kind = node.attrs.kind as ChatInputReferenceKind;
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-chat-reference': kind,
        'data-id': node.attrs.id,
        'data-label': node.attrs.label,
        class: 'sprout-chat-input-reference',
      }),
      `${triggers[kind]?.char ?? ''}${node.attrs.label}`,
    ];
  },
  renderText({ node }) {
    const kind = node.attrs.kind as ChatInputReferenceKind;
    return `${triggers[kind]?.char ?? ''}${node.attrs.label}`;
  },
});

const linkShortcut = Extension.create({
  name: 'chatInputLinkShortcut',
  addKeyboardShortcuts() {
    return {
      'Mod-k': ({ editor }) => {
        if (editor.isActive('link')) return editor.chain().focus().unsetLink().run();
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to).trim();
        const href = /^\S+@\S+\.\S+$/.test(text)
          ? `mailto:${text}`
          : /^(https?:\/\/|www\.)\S+$/i.test(text)
            ? text.startsWith('www.')
              ? `https://${text}`
              : text
            : null;
        if (!href) return false;
        return editor.chain().focus().setLink({ href }).run();
      },
    };
  },
});

function triggerExtension(
  kind: ChatInputReferenceKind,
  source: { current: ChatInputSource | undefined },
  onState: (state: PanelState) => void,
) {
  const key = new PluginKey(`chatInput-${kind}`);
  return Extension.create({
    name: `chatInput-${kind}`,
    addProseMirrorPlugins() {
      return [
        Suggestion<ChatInputSuggestion>({
          editor: this.editor,
          pluginKey: key,
          char: triggers[kind].char,
          allowSpaces: false,
          items: async ({ query }) => (await source.current?.(query)) ?? [],
          command: ({ editor, range, props }) =>
            editor
              .chain()
              .focus()
              .insertContentAt(range, [
                {
                  type: 'chatReference',
                  attrs: { kind, id: props.id, label: props.label },
                },
                { type: 'text', text: ' ' },
              ])
              .run(),
          render: () => {
            let current: SuggestionProps<ChatInputSuggestion> | null = null;
            let active = 0;
            const publish = () => {
              if (!current) return;
              const items = current.items;
              onState({
                kind,
                items,
                active: Math.min(active, Math.max(0, items.length - 1)),
                select: index => {
                  const item = items[index];
                  if (item) current?.command(item);
                },
              });
            };
            return {
              onStart: props => {
                current = props;
                active = 0;
                publish();
              },
              onUpdate: props => {
                current = props;
                active = 0;
                publish();
              },
              onKeyDown: ({ event, view }: SuggestionKeyDownProps) => {
                if (event.key === 'Escape') {
                  exitSuggestion(view, key);
                  return true;
                }
                const count = current?.items.length ?? 0;
                if (!count) return false;
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  active = (active + (event.key === 'ArrowDown' ? 1 : count - 1)) % count;
                  publish();
                  return true;
                }
                if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
                  current!.command(current!.items[active]!);
                  return true;
                }
                return false;
              },
              onExit: () => {
                current = null;
                onState(null);
              },
            };
          },
        }),
      ];
    },
  });
}

function hasContent(node: RichTextValue): boolean {
  if (node.type === 'chatReference') return true;
  if (node.text?.trim()) return true;
  return node.content?.some(hasContent) ?? false;
}

function textDoc(text: string): RichTextValue {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

function OptionPicker({
  label,
  search,
  options,
  value,
  onChange,
  disabled,
  icon,
  align,
}: {
  label: string;
  search: string;
  options: ChatInputOption[];
  value: string | undefined;
  onChange: (id: string) => void;
  disabled: boolean;
  icon: (option: ChatInputOption | undefined) => ReactNode;
  align: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <InputGroupButton
            aria-label={`${label}: ${selected?.label ?? 'None'}`}
            disabled={disabled}
            className="sprout-chat-input-picker"
          />
        }
      >
        {icon(selected)}
        <span className="sprout-chat-input-picker-label">{selected?.label ?? label}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent size="picker" side="top" align={align} sideOffset={8} className="sprout-chat-input-menu">
        <Command>
          <CommandInput aria-label={search} placeholder={`${search}…`} />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup heading={label}>
              {options.map(option => (
                <CommandItem
                  key={option.id}
                  value={`${option.label} ${option.description ?? ''}`}
                  data-checked={option.id === value}
                  onSelect={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  {icon(option)}
                  <span className="sprout-chat-input-option-text">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="sprout-chat-input-option-description">{option.description}</span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * A chat message box on `RichTextEditor`. `@` tags agents, `/` adds skills,
 * and `#` adds files. The bar holds attach and mode menus, a project picker,
 * a model picker, and send or stop. Starter prompts sit under an empty box.
 */
export function ChatInput({
  value,
  onValueChange,
  onSend,
  onStop,
  status = 'idle',
  placeholder = 'Ask anything, @agents, /skills, #files…',
  streamingPlaceholder = 'Working on your request…',
  disabled = false,
  label = 'Message',
  agents,
  skills,
  files,
  attachments = [],
  onRemoveAttachment,
  attachActions,
  modes,
  mode = null,
  onModeChange,
  projects,
  project,
  onProjectChange,
  models,
  model,
  onModelChange,
  prompts,
  onPromptSelect,
  className,
}: ChatInputProps) {
  const editor = useRef<RichTextEditorHandle>(null);
  const form = useRef<HTMLFormElement>(null);
  const listId = useId();
  const [panel, setPanel] = useState<PanelState>(null);
  const [panelBelow, setPanelBelow] = useState(false);
  const sources = {
    agent: useRef(agents),
    skill: useRef(skills),
    file: useRef(files),
  };
  sources.agent.current = agents;
  sources.skill.current = skills;
  sources.file.current = files;
  const enabled = `${!!agents}${!!skills}${!!files}`;
  const extensions = useMemo<Extensions>(
    () => [
      referenceNode,
      linkShortcut,
      ...chatInputReferenceKindNames
        .filter(kind => sources[kind].current)
        .map(kind => triggerExtension(kind, sources[kind], setPanel)),
    ],
    // Sources are refs, so only adding or removing a trigger rebuilds the editor.
    [enabled],
  );
  const streaming = status === 'streaming';
  const filled = hasContent(value) || attachments.length > 0;
  const canSend = filled && !disabled && !streaming;
  const activeMode = modes?.find(option => option.id === mode);
  const optionId = (index: number) => `${listId}-option-${index}`;
  const panelOpen = !!panel;

  useLayoutEffect(() => {
    const bounds = form.current?.getBoundingClientRect();
    // Near the top of a short screen there's no room above, so the panel opens below.
    if (panel && bounds) setPanelBelow(bounds.top < 320 && window.innerHeight - bounds.bottom > bounds.top);
  }, [panelOpen]);

  const send = () => {
    if (canSend) onSend();
  };
  const fill = (prompt: ChatInputPrompt) => {
    editor.current?.setContent(textDoc(prompt.prompt ?? prompt.label));
    editor.current?.editor()?.commands.focus('end');
    onPromptSelect?.(prompt);
  };

  return (
    <div
      data-slot="chat-input"
      data-status={status}
      data-mode-color={activeMode?.color ? '' : undefined}
      style={
        activeMode?.color
          ? ({
              '--sprout-chat-input-mode': activeMode.color,
            } as CSSProperties)
          : undefined
      }
      className={cn('sprout-chat-input', className)}
    >
      <form
        ref={form}
        aria-label={label}
        className="sprout-chat-input-form"
        onSubmit={event => {
          event.preventDefault();
          send();
        }}
      >
        <InputGroup variant="composer" className="sprout-chat-input-box">
          {attachments.length > 0 && (
            <InputGroupAddon align="block-start" className="sprout-chat-input-attachments">
              {attachments.map(file => (
                <FileAttachment
                  key={file.id}
                  file={file}
                  variant="chip"
                  viewable
                  preview
                  onRemove={onRemoveAttachment && !disabled ? () => onRemoveAttachment(file.id) : undefined}
                />
              ))}
            </InputGroupAddon>
          )}
          <RichTextEditor
            ref={editor}
            value={value}
            onChange={onValueChange}
            onSend={send}
            extensions={extensions}
            placeholder={streaming ? streamingPlaceholder : placeholder}
            disabled={disabled}
            ariaLabel={label}
            ariaExpanded={!!panel}
            ariaControls={panel ? listId : undefined}
            ariaActiveDescendant={panel?.items.length ? optionId(panel.active) : undefined}
            className="sprout-chat-input-editor"
            toolbarAddon={
              <div className="sprout-chat-input-bar">
                <div className="sprout-chat-input-bar-start">
                  {attachActions && attachActions.length > 0 && (
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <DropdownMenuTrigger
                              render={
                                <InputGroupButton size="icon" aria-label="Add files and more" disabled={disabled} />
                              }
                            />
                          }
                        >
                          <Plus size={16} aria-hidden="true" />
                        </TooltipTrigger>
                        <TooltipContent>Add files and more</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent size="menu" side="top" align="start" className="sprout-chat-input-menu">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Add</DropdownMenuLabel>
                          {attachActions.map(action => (
                            <DropdownMenuItem key={action.id} onClick={action.onSelect}>
                              {action.icon}
                              <span className="sprout-chat-input-option-text">
                                <span>{action.label}</span>
                                {action.description && (
                                  <span className="sprout-chat-input-option-description">{action.description}</span>
                                )}
                              </span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {modes && modes.length > 0 && (
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <DropdownMenuTrigger
                              render={
                                <InputGroupButton
                                  size="icon"
                                  aria-label={`Mode: ${activeMode?.label ?? 'Default'}`}
                                  disabled={disabled}
                                />
                              }
                            />
                          }
                        >
                          <Sliders size={16} aria-hidden="true" />
                        </TooltipTrigger>
                        <TooltipContent>Modes</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent size="menu" side="top" align="start" className="sprout-chat-input-menu">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Mode</DropdownMenuLabel>
                          <DropdownMenuRadioGroup
                            value={mode ?? ''}
                            onValueChange={next => onModeChange?.(next === mode || !next ? null : String(next))}
                          >
                            {modes.map(option => (
                              <DropdownMenuRadioItem
                                key={option.id}
                                value={option.id}
                                closeOnClick
                                style={
                                  option.color
                                    ? ({
                                        '--sprout-chat-input-mode': option.color,
                                      } as CSSProperties)
                                    : undefined
                                }
                                className={option.color ? 'sprout-chat-input-mode-option' : undefined}
                              >
                                {option.icon}
                                <span className="sprout-chat-input-option-text">
                                  <span>{option.label}</span>
                                  {option.description && (
                                    <span className="sprout-chat-input-option-description">{option.description}</span>
                                  )}
                                </span>
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {activeMode && (
                    <InputGroupButton
                      variant="secondary"
                      className="sprout-chat-input-mode"
                      aria-label={`Turn off ${activeMode.label}`}
                      disabled={disabled}
                      onClick={() => onModeChange?.(null)}
                    >
                      {activeMode.icon}
                      <span className="sprout-chat-input-picker-label">{activeMode.label}</span>
                      <X size={12} aria-hidden="true" />
                    </InputGroupButton>
                  )}
                  {projects && projects.length > 0 && (
                    <>
                      <span className="sprout-chat-input-divider" aria-hidden="true" />
                      <OptionPicker
                        label="Project"
                        search="Search projects"
                        options={projects}
                        value={project}
                        onChange={id => onProjectChange?.(id)}
                        disabled={disabled}
                        icon={option => option?.icon ?? <Folder size={16} aria-hidden="true" />}
                        align="start"
                      />
                    </>
                  )}
                </div>
                <div className="sprout-chat-input-bar-end">
                  {models && models.length > 0 && (
                    <ModelSelector
                      models={models}
                      value={model}
                      onValueChange={id => onModelChange?.(id)}
                      disabled={disabled}
                      side="top"
                      align="end"
                      render={<InputGroupButton className="sprout-chat-input-picker" />}
                    />
                  )}
                  {streaming ? (
                    <InputGroupButton
                      size="icon"
                      variant="default"
                      className="sprout-chat-input-send"
                      aria-label="Stop"
                      onClick={onStop}
                    >
                      <span className="sprout-chat-input-stop" aria-hidden="true" />
                    </InputGroupButton>
                  ) : (
                    <InputGroupButton
                      type="submit"
                      size="icon"
                      variant={canSend ? 'default' : 'secondary'}
                      className="sprout-chat-input-send"
                      aria-label="Send message"
                      disabled={!canSend}
                    >
                      <ArrowUp size={16} aria-hidden="true" />
                    </InputGroupButton>
                  )}
                </div>
              </div>
            }
          />
        </InputGroup>
        {panel && (
          <div className="sprout-chat-input-panel" data-side={panelBelow ? 'bottom' : 'top'}>
            <MentionList
              id={listId}
              label={triggers[panel.kind].label}
              announcement={
                panel.items.length
                  ? `${panel.items.length} ${triggers[panel.kind].label.toLowerCase()}. Use Up and Down to choose, Enter to add, Escape to close.`
                  : triggers[panel.kind].empty
              }
              status={
                panel.items.length ? undefined : (
                  <MentionStatus tone="empty">{triggers[panel.kind].empty}</MentionStatus>
                )
              }
            >
              {panel.items.map((item, index) => (
                <MentionOption
                  key={item.id}
                  id={optionId(index)}
                  active={index === panel.active}
                  onSelect={() => panel.select(index)}
                  media={item.media}
                  title={item.label}
                  description={item.description}
                />
              ))}
            </MentionList>
          </div>
        )}
      </form>
      {prompts && prompts.length > 0 && !filled && !streaming && (
        <div role="group" aria-label="Suggested prompts" className="sprout-chat-input-prompts">
          {prompts.map(prompt => (
            <Button
              key={prompt.id}
              size="sm"
              variant="outline"
              disabled={disabled}
              className="sprout-chat-input-prompt"
              onClick={() => fill(prompt)}
            >
              {prompt.icon}
              {prompt.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
