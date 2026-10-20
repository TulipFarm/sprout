'use client';

import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Check } from 'reicon-react/icons/Check';
import { Plus } from 'reicon-react/icons/Plus';
import { X } from 'reicon-react/icons/X';
import { cn } from '../internal/classes.js';
import { Button } from './button.js';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu.js';
import { Tabs, TabsList, TabsTrigger } from './tabs.js';

export interface ViewSwitcherView {
  /** Passed back in `onValueChange`, `onAdd`, and `onClose`. */
  id: string;
  label: string;
  /** Drawn at 14px in the tab and 16px in the menu. */
  icon: ComponentType<{ size?: number }>;
  /** Shows a close control on the tab. The app decides. It needs `onClose`. */
  closable?: boolean | undefined;
}

export interface ViewSwitcherOption extends ViewSwitcherView {
  /** One line about what the view is for. */
  description: string;
  /** Why the view cannot be added. When set, the option is disabled and shows this instead of the description. */
  unavailable?: string | undefined;
}

export interface ViewSwitcherProps {
  /** The tabs in the bar, in order. Sprout shows exactly these. */
  views: ViewSwitcherView[];
  /** The `id` of the active view. */
  value: string;
  /** Called when a tab is chosen by click or arrow keys. */
  onValueChange: (id: string) => void;
  /** The views in the "Add view" menu, in order. Leave out to hide the menu. */
  options?: ViewSwitcherOption[] | undefined;
  /**
   * Called with the chosen option. Options that are already in `views` show a
   * check; the app decides what choosing one does, usually switching to it.
   */
  onAdd?: ((id: string) => void) | undefined;
  /** Called by a tab's close control or the Delete key. The app removes the view from `views`. */
  onClose?: ((id: string) => void) | undefined;
  /** Accessible name of the tab list. Defaults to "Views". */
  label?: string | undefined;
  /** Text of the menu button. Defaults to "Add view". */
  addLabel?: string | undefined;
  /** Controls at the end of the bar, such as a settings button. */
  actions?: ReactNode;
  /** The `id` of the panel that shows the active view. Every tab points to it with `aria-controls`. */
  panelId?: string | undefined;
  className?: string | undefined;
}

/** The `id` of a view's tab, for the panel's `aria-labelledby`. Needs the same `panelId` as the switcher. */
export function viewSwitcherTabId(panelId: string, viewId: string) {
  return `${panelId}-tab-${viewId}`;
}

const fade = 24;

/**
 * The bar of a table's open views, with an "Add view" menu. It is fully
 * controlled: the app owns which views exist, are open, or can close.
 */
export function ViewSwitcher({
  views,
  value,
  onValueChange,
  options,
  onAdd,
  onClose,
  label = 'Views',
  addLabel = 'Add view',
  actions,
  panelId,
  className,
}: ViewSwitcherProps) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const tabs = useRef(new Map<string, HTMLElement>());
  const pendingFocus = useRef<{ closed: string; neighbour: string | undefined } | null>(null);
  const open = new Set(views.map(view => view.id));

  const tabId = (id: string) => (panelId ? viewSwitcherTabId(panelId, id) : `${baseId}-tab-${id}`);

  function close(index: number) {
    const view = views[index];
    if (!view || !view.closable || !onClose) return;
    const tab = tabs.current.get(view.id);
    if (tab && tab === document.activeElement) {
      pendingFocus.current = { closed: view.id, neighbour: (views[index + 1] ?? views[index - 1])?.id };
    }
    onClose(view.id);
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLElement>, index: number) {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    event.preventDefault();
    close(index);
  }

  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (!pending || open.has(pending.closed)) return;
    pendingFocus.current = null;
    const target = value !== pending.closed && open.has(value) ? value : pending.neighbour;
    if (target) tabs.current.get(target)?.focus();
  }, [views, value]);

  useLayoutEffect(() => {
    const list = listRef.current;
    const tab = tabs.current.get(value);
    if (!list || !tab || list.scrollWidth <= list.clientWidth) return;
    const bounds = list.getBoundingClientRect();
    const rect = tab.getBoundingClientRect();
    if (rect.left < bounds.left + fade) list.scrollLeft -= bounds.left + fade - rect.left;
    else if (rect.right > bounds.right - fade) list.scrollLeft += rect.right - (bounds.right - fade);
  }, [value, views]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () => {
      const scrolled = Math.abs(list.scrollLeft);
      const max = list.scrollWidth - list.clientWidth;
      list.toggleAttribute('data-overflow-start', scrolled > 1);
      list.toggleAttribute('data-overflow-end', max - scrolled > 1);
    };
    update();
    list.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(list);
    for (const child of list.children) observer.observe(child);
    return () => {
      list.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [views]);

  return (
    <div data-slot="view-switcher" className={cn('sprout-view-switcher', className)}>
      <Tabs
        className="sprout-view-switcher-tabs"
        value={open.has(value) ? value : null}
        onValueChange={next => {
          if (typeof next === 'string') onValueChange(next);
        }}
      >
        <TabsList
          ref={listRef}
          variant="line"
          activateOnFocus
          loopFocus={false}
          aria-label={label}
          className="sprout-view-switcher-list"
        >
          {views.map((view, index) => {
            const Icon = view.icon;
            const closable = Boolean(view.closable && onClose);
            return (
              <TabsTrigger
                key={view.id}
                value={view.id}
                id={tabId(view.id)}
                ref={(node: HTMLElement | null) => {
                  if (node) tabs.current.set(view.id, node);
                  else tabs.current.delete(view.id);
                }}
                className="sprout-view-switcher-tab"
                data-closable={closable || undefined}
                aria-keyshortcuts={closable ? 'Delete' : undefined}
                {...(panelId ? { 'aria-controls': panelId } : {})}
                onKeyDown={event => onTabKeyDown(event, index)}
              >
                <span className="sprout-view-switcher-icon" aria-hidden="true">
                  <Icon size={14} />
                </span>
                <span className="sprout-view-switcher-label">{view.label}</span>
                {closable && (
                  <span
                    aria-hidden="true"
                    title={`Close ${view.label}`}
                    data-slot="view-switcher-close"
                    className="sprout-view-switcher-close"
                    onPointerDown={event => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onMouseDown={event => event.preventDefault()}
                    onClick={event => {
                      event.preventDefault();
                      event.stopPropagation();
                      close(index);
                    }}
                  >
                    <X size={12} />
                  </span>
                )}
              </TabsTrigger>
            );
          })}
          <BaseTabs.Indicator className="sprout-view-switcher-indicator" />
        </TabsList>
      </Tabs>
      {options && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="sm" className="sprout-view-switcher-add" />}
            data-slot="view-switcher-add"
          >
            <Plus size={14} aria-hidden="true" data-icon="inline-start" />
            <span className="sprout-view-switcher-add-label">{addLabel}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" size="menu" className="sprout-view-switcher-menu">
            <div className="sprout-view-switcher-options">
              {options.map(option => (
                <ViewOption
                  key={option.id}
                  option={option}
                  baseId={baseId}
                  isOpen={open.has(option.id)}
                  onSelect={() => onAdd?.(option.id)}
                />
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {actions != null && actions !== false && (
        <div data-slot="view-switcher-actions" className="sprout-view-switcher-actions">
          {actions}
        </div>
      )}
    </div>
  );
}

function ViewOption({
  option,
  baseId,
  isOpen,
  onSelect,
}: {
  option: ViewSwitcherOption;
  baseId: string;
  isOpen: boolean;
  onSelect: () => void;
}) {
  const Icon = option.icon;
  const unavailable = Boolean(option.unavailable);
  const titleId = `${baseId}-option-${option.id}-title`;
  const noteId = `${baseId}-option-${option.id}-note`;
  const openId = `${baseId}-option-${option.id}-open`;
  return (
    <DropdownMenuItem
      data-slot="view-switcher-option"
      className="sprout-view-switcher-option"
      disabled={unavailable}
      data-open={isOpen || undefined}
      aria-labelledby={titleId}
      aria-describedby={isOpen ? `${openId} ${noteId}` : noteId}
      onClick={unavailable ? undefined : onSelect}
    >
      <span className="sprout-view-switcher-tile" aria-hidden="true">
        <Icon size={16} />
      </span>
      <span className="sprout-view-switcher-option-text">
        <span id={titleId} className="sprout-view-switcher-option-title">
          {option.label}
        </span>
        <span
          id={noteId}
          className="sprout-view-switcher-option-note"
          data-kind={unavailable ? 'unavailable' : 'description'}
        >
          {option.unavailable || option.description}
        </span>
      </span>
      {isOpen && (
        <span className="sprout-view-switcher-check">
          <Check size={16} aria-hidden="true" />
          <span id={openId} className="sprout-view-switcher-sr-only">
            Already open.
          </span>
        </span>
      )}
    </DropdownMenuItem>
  );
}
