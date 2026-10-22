'use client';

import {
  createContext,
  isValidElement,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Check } from 'reicon-react/icons/Check';
import { Search } from 'reicon-react/icons/Search';
import { cn } from '../internal/classes.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  type DialogContentProps,
  type DialogProps,
} from './dialog.js';

/** Scores how well `value` and `keywords` match `search`. `0` hides the item; higher ranks first. */
export type CommandFilter = (value: string, search: string, keywords?: readonly string[]) => number;

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

function tokenScore(haystack: string, token: string) {
  const index = haystack.indexOf(token);
  if (index === 0) return 1;
  if (index > 0) return /[\s\-_/.(]/.test(haystack[index - 1]!) ? 0.9 : 0.7;
  let from = 0;
  let last = -1;
  let gaps = 0;
  for (const char of token) {
    const found = haystack.indexOf(char, from);
    if (found === -1) return 0;
    if (last >= 0) gaps += found - last - 1;
    last = found;
    from = found + 1;
  }
  return Math.max(0.05, 0.5 - gaps * 0.02);
}

/**
 * The default filter. Every word of the search must appear in the value or a
 * keyword, as a substring or in order with gaps. Prefix and word-start matches
 * rank above loose ones. Case and accents are ignored.
 */
export const defaultCommandFilter: CommandFilter = (value, search, keywords = []) => {
  const haystack = normalize([value, ...keywords].join(' '));
  const tokens = normalize(search).trim().split(/\s+/).filter(Boolean);
  let score = 1;
  for (const token of tokens) score = Math.min(score, tokenScore(haystack, token));
  return score;
};

interface Entry {
  value: string;
  keywords: readonly string[];
  group: string | null;
  select: () => void;
}

interface Options {
  filter: CommandFilter;
  shouldFilter: boolean;
}

class CommandStore {
  search = '';
  active: string | null = null;
  ready = false;
  count = 0;
  version = 0;
  needsFirst = true;
  options: Options = { filter: defaultCommandFilter, shouldFilter: true };
  readonly items = new Map<string, Entry>();
  readonly scores = new Map<string, number>();
  readonly groupScores = new Map<string, number>();
  private readonly listeners = new Set<() => void>();
  private scheduled = false;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  get filtering() {
    return this.options.shouldFilter && this.search.trim() !== '';
  }

  emit() {
    this.version++;
    for (const listener of this.listeners) listener();
  }

  refilter() {
    this.scores.clear();
    this.groupScores.clear();
    let count = 0;
    for (const [id, entry] of this.items) {
      const score = this.filtering ? this.options.filter(entry.value, this.search, entry.keywords) : 1;
      if (score <= 0) continue;
      count++;
      this.scores.set(id, score);
      if (entry.group) this.groupScores.set(entry.group, Math.max(score, this.groupScores.get(entry.group) ?? 0));
    }
    this.count = count;
  }

  /** Coalesces item registrations into one refilter and render. */
  schedule() {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.refilter();
      if (this.active && !this.scores.has(this.active)) this.needsFirst = true;
      this.emit();
    });
  }

  setSearch(search: string) {
    if (search === this.search) return;
    this.search = search;
    this.refilter();
    this.needsFirst = true;
    this.emit();
  }

  setActive(id: string | null) {
    if (id === this.active) return;
    this.active = id;
    this.emit();
  }

  isVisible(id: string) {
    return !this.filtering || this.scores.has(id);
  }

  order(score: number | undefined) {
    return this.filtering && score ? -Math.round(score * 1000) : undefined;
  }
}

interface CommandContextValue {
  store: CommandStore;
  listId: string;
  inputId: string;
  labelId: string;
  label: string | undefined;
}

const CommandContext = createContext<CommandContextValue | null>(null);
const GroupContext = createContext<string | null>(null);

function useCommandContext(part: string) {
  const context = useContext(CommandContext);
  if (!context) throw new Error(`${part} must be inside Command.`);
  return context;
}

function useStore<T>(store: CommandStore, read: () => T) {
  return useSyncExternalStore(store.subscribe, read, read);
}

const ITEM = '[data-slot="command-item"]';

function orderOf(element: Element | null) {
  return element instanceof HTMLElement ? Number(element.style.order || 0) : 0;
}

/** Enabled items in visual order: groups and items reorder by score while searching. */
function enabledItems(root: HTMLElement) {
  const items = [...root.querySelectorAll<HTMLElement>(`${ITEM}:not([aria-disabled="true"])`)].filter(
    item => item.closest('[data-slot="command"]') === root,
  );
  const keyed = items.map(item => {
    const group = item.closest<HTMLElement>('[data-slot="command-group"]');
    return group && root.contains(group)
      ? { item, group, outer: orderOf(group), inner: orderOf(item) }
      : { item, group: null, outer: orderOf(item), inner: 0 };
  });
  return keyed.sort((a, b) => a.outer - b.outer || a.inner - b.inner);
}

export interface CommandProps extends ComponentProps<'div'> {
  /** Accessible name for the search input when it has no `aria-label`. */
  label?: string;
  /** Set to `false` to filter items yourself and render only the matches. */
  shouldFilter?: boolean;
  /** Custom scoring. Return `0` to hide an item. */
  filter?: CommandFilter;
  /** Wrap from the last item to the first with the arrow keys. */
  loop?: boolean;
}

/**
 * A searchable list of actions. Type to filter, move with the arrow keys,
 * and press Enter to choose. Focus stays in the search input while the
 * active item is announced through `aria-activedescendant`.
 */
export function Command({
  label,
  shouldFilter = true,
  filter = defaultCommandFilter,
  loop = false,
  className,
  children,
  onKeyDown,
  ref,
  ...props
}: CommandProps) {
  const [store] = useState(() => new CommandStore());
  const root = useRef<HTMLDivElement | null>(null);
  const id = useId();
  const context = useRef<CommandContextValue>({
    store,
    listId: `${id}-list`,
    inputId: `${id}-input`,
    labelId: `${id}-label`,
    label,
  }).current;
  context.label = label;

  const version = useStore(store, () => store.version);

  useLayoutEffect(() => {
    const changed = store.options.filter !== filter || store.options.shouldFilter !== shouldFilter;
    store.options = { filter, shouldFilter };
    if (changed && store.ready) {
      store.refilter();
      store.needsFirst = true;
      store.emit();
    }
  }, [store, filter, shouldFilter]);

  useLayoutEffect(() => {
    if (!store.ready) {
      store.ready = true;
      store.refilter();
      store.emit();
      return;
    }
    if (!store.needsFirst || !root.current) return;
    store.needsFirst = false;
    const first = enabledItems(root.current)[0]?.item;
    store.setActive(first?.id ?? null);
    root.current.querySelector('[data-slot="command-list"]')?.scrollTo({ top: 0 });
  }, [store, version]);

  const move = (to: (items: ReturnType<typeof enabledItems>, index: number) => number) => {
    if (!root.current) return;
    const items = enabledItems(root.current);
    if (!items.length) return;
    const index = items.findIndex(({ item }) => item.id === store.active);
    const next = items[to(items, index)];
    if (!next) return;
    store.setActive(next.item.id);
    const firstInGroup = next.group && items.find(({ group }) => group === next.group) === next;
    const heading = firstInGroup ? next.group!.querySelector('[data-slot="command-group-heading"]') : null;
    (heading ?? next.item).scrollIntoView({ block: 'nearest' });
    if (heading) next.item.scrollIntoView({ block: 'nearest' });
  };

  const step = (delta: 1 | -1) =>
    move((items, index) => {
      if (index === -1) return delta === 1 ? 0 : items.length - 1;
      const next = index + delta;
      if (loop) return (next + items.length) % items.length;
      return Math.min(Math.max(next, 0), items.length - 1);
    });

  const jumpGroup = (delta: 1 | -1) =>
    move((items, index) => {
      const current = items[index];
      if (!current) return 0;
      const groups = [...new Set(items.map(({ group }) => group))];
      const next = groups[groups.indexOf(current.group) + delta];
      if (next === undefined) return index;
      return items.findIndex(({ group }) => group === next);
    });

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement;
    const fromInput = target.dataset.slot === 'command-input';
    if (!fromInput && target.closest('button, a[href], input, textarea, select, [contenteditable]')) return;
    const vim = event.ctrlKey && !event.metaKey && !event.altKey;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        if (event.metaKey) move(items => (delta === 1 ? items.length - 1 : 0));
        else if (event.altKey) jumpGroup(delta);
        else step(delta);
        break;
      }
      case 'n':
      case 'j':
        if (!vim) return;
        step(1);
        break;
      case 'p':
      case 'k':
        if (!vim) return;
        step(-1);
        break;
      case 'Home':
        move(() => 0);
        break;
      case 'End':
        move(items => items.length - 1);
        break;
      case 'Enter': {
        if (!store.active) return;
        const entry = store.items.get(store.active);
        if (!entry) return;
        event.preventDefault();
        entry.select();
        return;
      }
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <CommandContext.Provider value={context}>
      <div
        data-slot="command"
        {...props}
        ref={node => {
          root.current = node;
          if (typeof ref === 'function') return ref(node);
          if (ref) ref.current = node;
        }}
        className={cn('sprout-command', className)}
        onKeyDown={handleKeyDown}
      >
        {label && (
          <label id={context.labelId} htmlFor={context.inputId} className="sprout-command-sr-only">
            {label}
          </label>
        )}
        {children}
      </div>
    </CommandContext.Provider>
  );
}

export interface CommandInputProps extends Omit<
  ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'type'
> {
  /** Controlled search text. */
  value?: string;
  onValueChange?: (search: string) => void;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

/** The search field with a leading magnifier. It drives filtering and keyboard navigation. */
export function CommandInput({ value, onValueChange, onChange, className, id, ...props }: CommandInputProps) {
  const { store, listId, inputId, labelId, label } = useCommandContext('CommandInput');
  const search = useStore(store, () => store.search);
  const active = useStore(store, () => store.active);
  const empty = useStore(store, () => store.ready && store.count === 0);

  useLayoutEffect(() => {
    if (value !== undefined) store.setSearch(value);
  }, [store, value]);

  return (
    <div data-slot="command-input-wrapper" className="sprout-command-input-wrapper">
      <div data-slot="command-input-group" className="sprout-command-input-group">
        <Search size={16} aria-hidden="true" className="sprout-command-input-icon" />
        <input
          id={id ?? inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={!empty}
          aria-controls={listId}
          aria-labelledby={label && !props['aria-label'] ? labelId : undefined}
          aria-activedescendant={active ?? undefined}
          data-slot="command-input"
          {...props}
          value={value ?? search}
          onChange={event => {
            onChange?.(event);
            onValueChange?.(event.target.value);
            if (value === undefined) store.setSearch(event.target.value);
          }}
          className={cn('sprout-command-input', className)}
        />
      </div>
    </div>
  );
}

export type CommandListProps = ComponentProps<'div'>;

/**
 * The scrolling listbox. It caps at 18rem and keeps the active item in view.
 * While nothing matches it drops the listbox role so `CommandEmpty` can hold
 * ordinary content such as a Clear search button.
 */
export function CommandList({ className, children, ...props }: CommandListProps) {
  const { store, listId, label } = useCommandContext('CommandList');
  const empty = useStore(store, () => store.ready && store.count === 0);
  const {
    'aria-label': ariaLabel = props['aria-labelledby'] ? undefined : (label ?? 'Suggestions'),
    'aria-labelledby': ariaLabelledBy,
    ...rest
  } = props;
  return (
    <div
      id={listId}
      role={empty ? undefined : 'listbox'}
      tabIndex={empty ? undefined : -1}
      aria-label={empty ? undefined : ariaLabel}
      aria-labelledby={empty ? undefined : ariaLabelledBy}
      data-slot="command-list"
      data-empty={empty || undefined}
      {...rest}
      className={cn('sprout-command-list', className)}
    >
      <div data-slot="command-list-sizer" className="sprout-command-list-sizer">
        {children}
      </div>
    </div>
  );
}

export type CommandEmptyProps = ComponentProps<'div'>;

/** Shown only when no item matches the search. It can hold a recovery action. */
export function CommandEmpty({ className, ...props }: CommandEmptyProps) {
  const { store } = useCommandContext('CommandEmpty');
  const empty = useStore(store, () => store.ready && store.count === 0);
  if (!empty) return null;
  return (
    <div role="presentation" data-slot="command-empty" {...props} className={cn('sprout-command-empty', className)} />
  );
}

export interface CommandGroupProps extends Omit<ComponentProps<'div'>, 'value'> {
  /** Small muted label above the items. Omit for an unlabeled group. */
  heading?: ReactNode;
  /** Keep the group visible even when none of its items match. */
  forceMount?: boolean;
}

/** Groups related items under an optional heading. It hides when none of its items match. */
export function CommandGroup({ heading, forceMount = false, className, children, style, ...props }: CommandGroupProps) {
  const { store } = useCommandContext('CommandGroup');
  const id = useId();
  const headingId = `${id}-heading`;
  const matched = useStore(store, () => store.groupScores.has(id));
  const filtering = useStore(store, () => store.filtering);
  const order = useStore(store, () => store.order(store.groupScores.get(id)));
  const hidden = filtering && !matched && !forceMount;
  return (
    <div
      role="presentation"
      data-slot="command-group"
      hidden={hidden || undefined}
      {...props}
      style={{ order, ...style }}
      className={cn('sprout-command-group', className)}
    >
      {heading != null && heading !== false && (
        <div
          id={headingId}
          aria-hidden="true"
          data-slot="command-group-heading"
          className="sprout-command-group-heading"
        >
          {heading}
        </div>
      )}
      <div
        role="group"
        aria-labelledby={heading != null && heading !== false ? headingId : undefined}
        data-slot="command-group-items"
        className="sprout-command-group-items"
      >
        <GroupContext.Provider value={id}>{children}</GroupContext.Provider>
      </div>
    </div>
  );
}

export interface CommandSeparatorProps extends ComponentProps<'div'> {
  /** Keep the line while searching. By default it hides once the user types. */
  alwaysRender?: boolean;
}

export function CommandSeparator({ alwaysRender = false, className, ...props }: CommandSeparatorProps) {
  const { store } = useCommandContext('CommandSeparator');
  const searching = useStore(store, () => store.search !== '');
  if (searching && !alwaysRender) return null;
  return (
    // Decorative: a listbox may only own options and groups, and group headings already divide it.
    <div
      aria-hidden="true"
      data-slot="command-separator"
      {...props}
      className={cn('sprout-command-separator', className)}
    />
  );
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

export interface CommandItemProps extends Omit<ComponentProps<'div'>, 'value' | 'onSelect'> {
  /** Text the filter matches and `onSelect` receives. Defaults to the item's text. */
  value?: string;
  /** Extra words that match this item, such as a name when `value` is an id. */
  keywords?: readonly string[];
  disabled?: boolean;
  /** Runs on click or Enter. */
  onSelect?: (value: string) => void;
  /** Keep the item visible even when it doesn't match the search. */
  forceMount?: boolean;
  /** `true` shows a trailing check for the current choice. Hidden when the item has a shortcut. */
  'data-checked'?: boolean;
}

/**
 * One choice. Put an icon first, then the label. A trailing check marks the
 * current choice with `data-checked`; a `CommandShortcut` replaces it.
 */
export function CommandItem({
  value,
  keywords,
  disabled = false,
  onSelect,
  forceMount = false,
  className,
  children,
  style,
  onClick,
  onPointerMove,
  onPointerDown,
  ...props
}: CommandItemProps) {
  const { store } = useCommandContext('CommandItem');
  const group = useContext(GroupContext);
  const id = useId();
  const resolved = (value ?? textOf(children)).trim();
  const select = useRef(() => {});
  select.current = () => {
    if (!disabled) onSelect?.(resolved);
  };
  const keywordKey = (keywords ?? []).join('\u0000');

  useLayoutEffect(() => {
    store.items.set(id, {
      value: resolved,
      keywords: keywordKey ? keywordKey.split('\u0000') : [],
      group,
      select: () => select.current(),
    });
    store.schedule();
    return () => {
      store.items.delete(id);
      if (store.active === id) store.needsFirst = true;
      store.schedule();
    };
  }, [store, id, resolved, keywordKey, group]);

  const visible = useStore(store, () => forceMount || store.isVisible(id));
  const active = useStore(store, () => store.active === id);
  // Subscribe to the order, not the score: a score that stays 1 when filtering starts still moves the item.
  const order = useStore(store, () => store.order(store.scores.get(id)));
  if (!visible) return null;

  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      aria-disabled={disabled || undefined}
      data-selected={active || undefined}
      data-disabled={disabled || undefined}
      data-value={resolved}
      data-slot="command-item"
      {...props}
      style={{ order, ...style }}
      className={cn('sprout-command-item', className)}
      onPointerDown={event => {
        onPointerDown?.(event);
        // Keep focus in the search input so typing and arrows keep working.
        if (!event.defaultPrevented) event.preventDefault();
      }}
      onPointerMove={event => {
        onPointerMove?.(event);
        if (!disabled && !event.defaultPrevented) store.setActive(id);
      }}
      onClick={event => {
        onClick?.(event);
        if (!event.defaultPrevented) select.current();
      }}
    >
      {children}
      <Check size={16} aria-hidden="true" className="sprout-command-item-check" />
    </div>
  );
}

export type CommandShortcutProps = ComponentProps<'span'>;

/** A keyboard hint at the end of an item. */
export function CommandShortcut({ className, ...props }: CommandShortcutProps) {
  return <span data-slot="command-shortcut" {...props} className={cn('sprout-command-shortcut', className)} />;
}

export interface CommandDialogProps extends Omit<DialogProps, 'children'> {
  /** Visually hidden dialog title. */
  title?: string;
  /** Visually hidden dialog description. */
  description?: string;
  className?: string;
  /** Adds the corner close button. Defaults to `false`; Escape closes the palette. */
  showCloseButton?: boolean;
  closeLabel?: string;
  /** Where the portal renders. Defaults to `document.body`. */
  container?: DialogContentProps['container'];
  /** Usually a `Command`. */
  children: ReactNode;
}

/** A command palette pinned near the top of the viewport. */
export function CommandDialog({
  title = 'Command Palette',
  description = 'Search for a command to run...',
  className,
  showCloseButton = false,
  closeLabel,
  container,
  children,
  ...props
}: CommandDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent
        placement="top"
        showCloseButton={showCloseButton}
        closeLabel={closeLabel}
        container={container}
        className={cn('sprout-command-dialog', className)}
      >
        <DialogTitle className="sprout-command-sr-only">{title}</DialogTitle>
        <DialogDescription className="sprout-command-sr-only">{description}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
