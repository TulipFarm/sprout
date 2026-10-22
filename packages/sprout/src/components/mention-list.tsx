import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../internal/classes.js';
import { Button } from './button.js';
import { Spinner } from './spinner.js';

export const mentionStatusToneNames = ['loading', 'empty', 'error'] as const;

export type MentionStatusTone = (typeof mentionStatusToneNames)[number];

export interface MentionListProps extends Omit<ComponentProps<'div'>, 'id' | 'children'> {
  /** The listbox id. Point the text field's `aria-controls` at it. */
  id: string;
  /** Names the listbox, such as “Files you can add”. */
  label: string;
  /** One or more `MentionStatus` rows shown under the options. */
  status?: ReactNode;
  /**
   * Read by screen readers when it changes. A textarea keeps its textbox
   * role, so this tells people the panel opened and how to use it.
   */
  announcement?: string | undefined;
  /** `MentionOption` rows, or `MentionGroup`s of them. */
  children?: ReactNode;
}

/**
 * A suggestion panel for `@` and `/` triggers. The text field keeps focus and
 * owns the arrow keys; it points `aria-activedescendant` at the active option.
 */
export function MentionList({ id, label, status, announcement, children, className, ...props }: MentionListProps) {
  return (
    <div data-slot="mention-list" className={cn('sprout-mention-list', className)} {...props}>
      <ul id={id} role="listbox" aria-label={label} className="sprout-mention-list-options">
        {children}
      </ul>
      {status}
      <p role="status" className="sprout-mention-list-announcement">
        {announcement}
      </p>
    </div>
  );
}

export interface MentionOptionProps extends Omit<ComponentProps<'li'>, 'id' | 'title' | 'children' | 'onSelect'> {
  /** Unique id the text field uses in `aria-activedescendant`. */
  id: string;
  /** The keyboard-highlighted option. It scrolls into view when it becomes active. */
  active: boolean;
  onSelect: () => void;
  /** A 16px icon, file icon, brand glyph, or small avatar. */
  media?: ReactNode;
  title: string;
  description?: string | undefined;
}

export function MentionOption({
  id,
  active,
  onSelect,
  media,
  title,
  description,
  className,
  ...props
}: MentionOptionProps) {
  const option = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const el = option.current;
    const list = el?.closest<HTMLElement>('.sprout-mention-list-options');
    if (!active || !el || !list) return;
    // Scroll only the listbox; scrollIntoView would also scroll the page.
    const item = el.getBoundingClientRect();
    const view = list.getBoundingClientRect();
    if (item.top < view.top + 4) list.scrollTop -= view.top + 4 - item.top;
    else if (item.bottom > view.bottom - 4) list.scrollTop += item.bottom - view.bottom + 4;
  }, [active]);
  return (
    <li
      ref={option}
      id={id}
      role="option"
      aria-selected={active}
      data-slot="mention-option"
      data-active={active ? '' : undefined}
      className={cn('sprout-mention-option', className)}
      {...props}
      // Keeps focus (and the caret) in the text field.
      onMouseDown={event => event.preventDefault()}
      onClick={onSelect}
    >
      {media != null && media !== false && (
        <span data-slot="mention-option-media" className="sprout-mention-option-media">
          {media}
        </span>
      )}
      <span className="sprout-mention-option-text">
        <span className="sprout-mention-option-title" title={title}>
          {title}
        </span>
        {description && <span className="sprout-mention-option-description">{description}</span>}
      </span>
    </li>
  );
}

export interface MentionGroupProps {
  /** The source, such as “Files” or “Google Drive”. */
  label: string;
  children: ReactNode;
}

/** A labelled run of options inside the same listbox, so arrow keys move across groups. */
export function MentionGroup({ label, children }: MentionGroupProps) {
  const id = useId();
  return (
    <li role="presentation" data-slot="mention-group" className="sprout-mention-group">
      <span id={id} aria-hidden="true" className="sprout-mention-group-label">
        {label}
      </span>
      <ul role="group" aria-labelledby={id} className="sprout-mention-group-options">
        {children}
      </ul>
    </li>
  );
}

export interface MentionStatusAction {
  label: string;
  onAction: () => void;
}

export interface MentionStatusProps {
  /** `loading` adds a spinner; `error` is an alert in the danger color. */
  tone: MentionStatusTone;
  children: ReactNode;
  /** A small outline button, usually Retry. */
  action?: MentionStatusAction | undefined;
}

export function MentionStatus({ tone, children, action }: MentionStatusProps) {
  return (
    <div
      data-slot="mention-status"
      data-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
      className="sprout-mention-status"
    >
      {tone === 'loading' && <Spinner aria-hidden="true" />}
      <span className="sprout-mention-status-text">{children}</span>
      {action && (
        <Button
          size="sm"
          variant="outline"
          className="sprout-mention-status-action"
          onMouseDown={event => event.preventDefault()}
          onClick={action.onAction}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
