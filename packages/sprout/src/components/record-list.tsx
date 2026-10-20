'use client';

import {
  useCallback,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { cn } from '../internal/classes.js';
import { Button } from './button.js';
import { Skeleton, SkeletonGroup } from './skeleton.js';
import { StatePanel } from './state-panel.js';

export const recordListStatusNames = ['ready', 'loading', 'error'] as const;
export const recordListDensityNames = ['default', 'compact'] as const;

export type RecordListStatus = (typeof recordListStatusNames)[number];
export type RecordListDensity = (typeof recordListDensityNames)[number];

/** The most labelled values a row shows. Extra values are left out. */
export const recordListMaxValues = 4;

export interface RecordListItem {
  id: string;
  /** Plain text name of the record. Screen readers use it, and it shows in full on hover. */
  title: string;
}

export interface RecordListValue {
  /** The field name, such as "Assignee". */
  label: string;
  value: ReactNode;
  /** Full text for the hover hint when `value` is not a string or number. */
  text?: string | undefined;
}

export interface RecordListHandle {
  /**
   * Moves focus to the first row, or to the empty or error state when there
   * are no rows. While `status` is `"loading"` it waits for the next render
   * that is not loading. Call it after a page change.
   */
  focusFirst: () => void;
}

export interface RecordListProps<T extends RecordListItem> {
  /** Rows on the current page, in order. */
  items: T[];
  /** Accessible name of the list, such as "Tickets". The row count is added to it. */
  label: string;
  /** Title content, such as an icon or key before the text. Screen readers still use `item.title`. */
  renderTitle?: ((item: T) => ReactNode) | undefined;
  /** Labelled values under the title. Only the first four show; leave out empty values. */
  values?: ((item: T) => RecordListValue[]) | undefined;
  /** Choice badges, such as status and tags. Leave out empty choices. */
  badges?: ((item: T) => ReactNode) | undefined;
  /** Row actions, such as an Edit button and a `DropdownMenu`. Clicks here do not open the row. */
  renderActions?: ((item: T) => ReactNode) | undefined;
  /** Click or Enter on a row. Open your own Sheet or Dialog here. */
  onItemOpen?: ((item: T) => void) | undefined;
  /** `"loading"` dims the current rows, or shows skeleton rows when there are none. Defaults to `"ready"`. */
  status?: RecordListStatus | undefined;
  /** Error description. Defaults to a short generic message. */
  error?: ReactNode;
  /** Shows a "Try again" button in the error state. */
  onRetry?: (() => void) | undefined;
  /** Shown when `items` is empty and ready. Pass a `StatePanel` or text. */
  empty?: ReactNode;
  /** Shown under the rows, inside the panel. Put the app's `Pagination` here. */
  footer?: ReactNode;
  /** `"compact"` uses less padding for dense pages. Defaults to `"default"`. */
  density?: RecordListDensity | undefined;
  /** Gets `focusFirst()` for moving focus after a page change. */
  ref?: Ref<RecordListHandle> | undefined;
  className?: string | undefined;
}

const SKELETON_ROWS = 5;
const ROW = 'data-record-list-row';
const SAVED_TAB = 'data-record-list-tabindex';
const FOCUSABLE =
  'a[href], area[href], button, input, select, textarea, iframe, summary, [contenteditable=""], [contenteditable="true"], [tabindex]';

const rowsName = (label: string, count: number) => `${label}, ${count} ${count === 1 ? 'row' : 'rows'}`;
const hint = (entry: RecordListValue) =>
  entry.text ?? (typeof entry.value === 'string' || typeof entry.value === 'number' ? String(entry.value) : undefined);

/** Keeps only the active row's own controls in the tab order, so Tab leaves the list after them. */
function syncTabStops(list: HTMLElement) {
  for (const row of list.querySelectorAll<HTMLElement>(`[${ROW}]`)) {
    const active = row.tabIndex === 0;
    for (const control of row.querySelectorAll<HTMLElement>(FOCUSABLE)) {
      if (active) {
        const saved = control.getAttribute(SAVED_TAB);
        if (saved === null) continue;
        if (saved === '') control.removeAttribute('tabindex');
        else control.setAttribute('tabindex', saved);
        control.removeAttribute(SAVED_TAB);
      } else if (!control.hasAttribute(SAVED_TAB) && control.tabIndex >= 0) {
        control.setAttribute(SAVED_TAB, control.getAttribute('tabindex') ?? '');
        control.setAttribute('tabindex', '-1');
      }
    }
  }
}

function SkeletonRows() {
  return (
    <SkeletonGroup
      label="Loading rows"
      gap="sm"
      className="sprout-record-list-skeleton"
      data-slot="record-list-skeleton"
    >
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="sprout-record-list-skeleton-row">
          <div className="sprout-record-list-skeleton-main">
            <Skeleton className="sprout-record-list-skeleton-title" />
            <Skeleton className="sprout-record-list-skeleton-values" />
          </div>
          <Skeleton shape="action" />
        </div>
      ))}
    </SkeletonGroup>
  );
}

/**
 * A reading and triage list of records: one row per record on the current
 * page, with a title, up to four labelled values, choice badges, and row
 * actions. The list is one tab stop. Arrow keys, Home, and End move between
 * rows, Enter opens a row, and Tab reaches the focused row's actions. The app
 * owns data, paging, and what the actions do.
 */
export function RecordList<T extends RecordListItem>({
  items,
  label,
  renderTitle,
  values,
  badges,
  renderActions,
  onItemOpen,
  status = 'ready',
  error,
  onRetry,
  empty,
  footer,
  density = 'default',
  ref,
  className,
}: RecordListProps<T>) {
  const id = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const stateRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const loading = status === 'loading';
  const showRows = status !== 'error' && items.length > 0;
  const current = items.some(item => item.id === activeId) ? activeId : (items[0]?.id ?? null);

  const rowOf = useCallback(
    (itemId: string) =>
      [...(listRef.current?.querySelectorAll<HTMLElement>(`[${ROW}]`) ?? [])].find(
        row => row.dataset.recordListRow === itemId,
      ),
    [],
  );

  const flushFocus = useCallback(() => {
    if (!pendingFocus.current || loading) return;
    pendingFocus.current = false;
    if (showRows && items[0]) {
      setActiveId(items[0].id);
      rowOf(items[0].id)?.focus();
    } else stateRef.current?.focus();
  }, [items, loading, rowOf, showRows]);

  const latestFlush = useRef(flushFocus);
  useLayoutEffect(() => {
    latestFlush.current = flushFocus;
    flushFocus();
  });

  useImperativeHandle(
    ref,
    () => ({
      focusFirst() {
        pendingFocus.current = true;
        // A task, not a microtask, so a switch to loading queued in the same handler commits first.
        setTimeout(() => latestFlush.current());
      },
    }),
    [],
  );

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    syncTabStops(list);
    const observer = new MutationObserver(() => syncTabStops(list));
    observer.observe(list, { childList: true, subtree: true });
    return () => observer.disconnect();
  });

  const move = (event: KeyboardEvent<HTMLUListElement>) => {
    const row = event.target as HTMLElement;
    if (!row.hasAttribute(ROW) || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = items.findIndex(item => item.id === row.dataset.recordListRow);
    const item = items[index];
    if (!item) return;
    if (event.key === 'Enter') {
      if (!onItemOpen || event.repeat) return;
      event.preventDefault();
      onItemOpen(item);
      return;
    }
    const target =
      event.key === 'ArrowDown'
        ? items[Math.min(index + 1, items.length - 1)]
        : event.key === 'ArrowUp'
          ? items[Math.max(index - 1, 0)]
          : event.key === 'Home'
            ? items[0]
            : event.key === 'End'
              ? items.at(-1)
              : undefined;
    if (!target || event.shiftKey) return;
    event.preventDefault();
    setActiveId(target.id);
    rowOf(target.id)?.focus();
  };

  const open = (event: MouseEvent<HTMLElement>, item: T) => {
    const target = event.target as HTMLElement;
    const row = event.currentTarget;
    // Portaled menus bubble through React, so check the DOM too.
    if (!onItemOpen || !row.contains(target)) return;
    const control = target.closest(FOCUSABLE);
    if (control && control !== row && row.contains(control)) return;
    if (target.closest('[data-slot="record-list-actions"]')) return;
    if (window.getSelection()?.toString()) return;
    onItemOpen(item);
  };

  const emptyContent =
    empty === undefined ? (
      <StatePanel
        kind="empty"
        heading="h3"
        title="No rows to show"
        description="Rows show here when they are added or match the search and filters."
      />
    ) : typeof empty === 'string' ? (
      <p className="sprout-record-list-empty-text">{empty}</p>
    ) : (
      empty
    );

  return (
    <div
      data-slot="record-list"
      data-density={density}
      data-status={status}
      className={cn('sprout-record-list', className)}
    >
      {status === 'error' ? (
        <div ref={stateRef} tabIndex={-1} data-slot="record-list-state" className="sprout-record-list-state">
          <StatePanel
            kind="error"
            heading="h3"
            title="Rows did not load"
            description={error ?? 'Something went wrong while loading the rows.'}
          >
            {onRetry ? (
              <Button variant="outline" onClick={onRetry}>
                Try again
              </Button>
            ) : null}
          </StatePanel>
        </div>
      ) : showRows ? (
        <>
          <ul
            ref={listRef}
            aria-label={rowsName(label, items.length)}
            aria-busy={loading || undefined}
            data-slot="record-list-items"
            className="sprout-record-list-items"
            onKeyDown={move}
          >
            {items.map((item, index) => {
              const shown = values?.(item).slice(0, recordListMaxValues) ?? [];
              const badgeContent = badges?.(item);
              const hasBadges = badgeContent != null && badgeContent !== false;
              const actions = renderActions?.(item);
              const valuesId = `${id}-${index}-values`;
              const badgesId = `${id}-${index}-badges`;
              const described = [shown.length > 0 && valuesId, hasBadges && badgesId].filter(Boolean).join(' ');
              return (
                <li
                  key={item.id}
                  data-record-list-row={item.id}
                  tabIndex={item.id === current ? 0 : -1}
                  aria-label={item.title}
                  aria-describedby={described || undefined}
                  data-slot="record-list-item"
                  data-openable={onItemOpen ? '' : undefined}
                  className="sprout-record-list-item"
                  onFocus={event => {
                    if (event.currentTarget.contains(event.target)) setActiveId(item.id);
                  }}
                  onClick={event => open(event, item)}
                >
                  <div data-slot="record-list-title" className="sprout-record-list-title" title={item.title}>
                    {renderTitle ? renderTitle(item) : item.title}
                  </div>
                  {shown.length > 0 && (
                    <dl id={valuesId} data-slot="record-list-values" className="sprout-record-list-values">
                      {shown.map((entry, position) => (
                        <div key={`${entry.label}-${position}`} className="sprout-record-list-value">
                          <dt>{entry.label}</dt>
                          <dd title={hint(entry)}>{entry.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {hasBadges && (
                    <div id={badgesId} data-slot="record-list-badges" className="sprout-record-list-badges">
                      {badgeContent}
                    </div>
                  )}
                  {actions != null && actions !== false && (
                    <div data-slot="record-list-actions" className="sprout-record-list-actions">
                      {actions}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <span role="status" className="sprout-record-list-sr-only">
            {loading ? 'Loading rows…' : ''}
          </span>
        </>
      ) : (
        <div ref={stateRef} tabIndex={-1} data-slot="record-list-state" className="sprout-record-list-state">
          {loading ? <SkeletonRows /> : emptyContent}
        </div>
      )}
      {footer != null && footer !== false && (
        <div data-slot="record-list-footer" className="sprout-record-list-footer">
          {footer}
        </div>
      )}
    </div>
  );
}
