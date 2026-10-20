'use client';

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'reicon-react/icons/ArrowLeft';
import { SidebarRight } from 'reicon-react/icons/SidebarRight';
import { X } from 'reicon-react/icons/X';
import { cn } from '../internal/classes.js';
import { Button } from './button.js';
import { Spinner } from './spinner.js';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, useResizableLayout } from './resizable.js';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './sheet.js';

/** Below this split width (px), the canvas opens as a full-screen sheet. */
export const canvasSplitMinWidth = 720;

export interface CanvasTab {
  id: string;
  title: string;
  icon?: ComponentType<{ size?: number }> | undefined;
  /** The result is still loading. Shows a spinner and reads “loading”. */
  busy?: boolean | undefined;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const mobileQuery = '(max-width: 767px)';

function subscribeMobile(callback: () => void) {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function useViewportMobile() {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(mobileQuery).matches,
    () => false,
  );
}

const CanvasNarrowContext = createContext<boolean | null>(null);

export interface ChatSplitProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat: ReactNode;
  canvas: ReactNode;
  /** Saves the person's split sizes under this key. Use one per screen. */
  layoutId?: string | undefined;
  className?: string | undefined;
}

/**
 * Chat beside a resizable canvas. Under 768px viewports, or when the split is
 * narrower than `canvasSplitMinWidth`, the canvas opens as a full-screen
 * sheet. The canvas moves between both without remounting, so drafts,
 * reviews, and scroll survive.
 */
export function ChatSplit({ open, onOpenChange, chat, canvas, layoutId = 'chat-canvas', className }: ChatSplitProps) {
  const viewportMobile = useViewportMobile();
  const container = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);
  const mobile = viewportMobile || (availableWidth !== null && availableWidth < canvasSplitMinWidth);
  const split = open && !mobile;
  useIsomorphicLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => setAvailableWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const layout = useResizableLayout({
    id: layoutId,
    panelIds: split ? ['chat', 'canvas'] : ['chat'],
    onlySaveAfterUserInteractions: true,
  });
  const [desktopHost, setDesktopHost] = useState<HTMLDivElement | null>(null);
  const [mobileHost, setMobileHost] = useState<HTMLDivElement | null>(null);
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  useIsomorphicLayoutEffect(() => {
    const element = document.createElement('div');
    element.className = 'sprout-canvas-host';
    setTarget(element);
  }, []);
  useIsomorphicLayoutEffect(() => {
    if (!target || !open) return;
    (mobile ? mobileHost : desktopHost)?.append(target);
    return () => target.remove();
  }, [mobile, open, target, mobileHost, desktopHost]);
  return (
    <CanvasNarrowContext value={mobile}>
      <div
        ref={container}
        data-slot="chat-split"
        data-layout={mobile ? 'sheet' : 'split'}
        data-open={open ? '' : undefined}
        className={cn('sprout-chat-split', className)}
      >
        {target && createPortal(canvas, target)}
        <ResizablePanelGroup
          orientation="horizontal"
          defaultLayout={layout.defaultLayout}
          onLayoutChanged={layout.onLayoutChanged}
        >
          <ResizablePanel id="chat" minSize="40%" defaultSize={split ? '55%' : '100%'}>
            <div className="sprout-chat-split-pane">{chat}</div>
          </ResizablePanel>
          {split && (
            <>
              <ResizableHandle withHandle aria-label="Resize canvas" />
              <ResizablePanel id="canvas" minSize="320px" defaultSize="45%">
                <div ref={setDesktopHost} className="sprout-chat-split-pane" />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
        <Sheet open={open && mobile} onOpenChange={next => onOpenChange(next)}>
          <SheetContent
            side="right"
            size="full"
            showCloseButton={false}
            keepMounted
            finalFocus={!open}
            className="sprout-canvas-sheet"
          >
            <div className="sprout-canvas-sr-only">
              <SheetTitle>Canvas</SheetTitle>
              <SheetDescription>Detailed result. Return to chat to continue the conversation.</SheetDescription>
            </div>
            <div ref={setMobileHost} className="sprout-chat-split-pane" />
          </SheetContent>
        </Sheet>
      </div>
    </CanvasNarrowContext>
  );
}

export interface CanvasPanelProps {
  /** Open results. With none, the header reads “Canvas”. */
  tabs: readonly CanvasTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCloseTab: (id: string) => void;
  /** Hides the canvas. Called by Escape, the close button, and “Back to chat”. */
  onClose: () => void;
  children: ReactNode;
  /** A strip under the tabs, such as “A Google action needs your review”. */
  activity?: ReactNode;
  className?: string | undefined;
}

/**
 * The canvas surface: a tab per open result, a close button, and the active
 * result below. Arrow keys, Home, and End move between tabs; Delete closes
 * the focused tab; Escape closes the canvas.
 */
export function CanvasPanel({
  tabs,
  activeId,
  onSelect,
  onCloseTab,
  onClose,
  children,
  activity,
  className,
}: CanvasPanelProps) {
  const viewportMobile = useViewportMobile();
  const narrow = useContext(CanvasNarrowContext);
  const mobile = narrow ?? viewportMobile;
  const base = useId();
  const list = useRef<HTMLDivElement>(null);
  const tabButtons = useRef(new Map<string, HTMLButtonElement>());
  const closeButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const refocus = useRef<number | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const activeIndex = tabs.findIndex(tab => tab.id === activeId);
  const tabId = (index: number) => `${base}-tab-${index}`;
  const bodyId = `${base}-body`;

  useEffect(() => {
    const scroller = list.current;
    const tab = activeId ? tabButtons.current.get(activeId) : null;
    if (!scroller || !tab) return;
    const start = tab.offsetLeft;
    const end = start + tab.offsetWidth + 28;
    if (start < scroller.scrollLeft) scroller.scrollLeft = start;
    else if (end > scroller.scrollLeft + scroller.clientWidth) scroller.scrollLeft = end - scroller.clientWidth;
  }, [activeId, tabs.length]);

  useEffect(() => {
    const index = refocus.current;
    if (index === null) return;
    refocus.current = null;
    const next = tabs[Math.min(index, tabs.length - 1)];
    const target = (next && tabButtons.current.get(next.id)) ?? closeButton.current ?? heading.current;
    target?.focus();
  }, [tabs]);

  const closeTab = (index: number) => {
    const tab = tabs[index];
    if (!tab) return;
    refocus.current = index;
    onCloseTab(tab.id);
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'Delete') {
      event.preventDefault();
      closeTab(index);
      return;
    }
    const next =
      event.key === 'ArrowRight'
        ? index + 1
        : event.key === 'ArrowLeft'
          ? index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? tabs.length - 1
              : null;
    if (next === null || tabs.length === 0) return;
    event.preventDefault();
    const target = tabs[(next + tabs.length) % tabs.length];
    if (!target) return;
    onSelect(target.id);
    tabButtons.current.get(target.id)?.focus();
  };

  return (
    <section
      data-slot="canvas"
      data-layout={mobile ? 'sheet' : 'split'}
      aria-label="Canvas"
      className={cn('sprout-canvas', className)}
      onKeyDown={event => {
        if (event.key === 'Escape' && !event.defaultPrevented) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      {mobile && (
        <div className="sprout-canvas-back">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back to chat
          </Button>
        </div>
      )}
      <header className="sprout-canvas-header">
        {tabs.length === 0 ? (
          <h2 ref={heading} tabIndex={-1} className="sprout-canvas-heading">
            Canvas
          </h2>
        ) : (
          <div ref={list} className="sprout-canvas-tabs">
            <div role="tablist" aria-label="Open in canvas" className="sprout-canvas-tablist">
              {tabs.map((tab, index) => {
                const active = index === activeIndex;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={tabId(index)}
                    ref={node => {
                      if (node) tabButtons.current.set(tab.id, node);
                      else tabButtons.current.delete(tab.id);
                    }}
                    data-slot="canvas-tab"
                    data-active={active ? '' : undefined}
                    data-busy={tab.busy ? '' : undefined}
                    data-hover={hovered === tab.id ? '' : undefined}
                    aria-label={tab.busy ? `${tab.title}, loading` : undefined}
                    aria-selected={active}
                    aria-controls={bodyId}
                    tabIndex={active || (activeIndex === -1 && index === 0) ? 0 : -1}
                    style={{ order: index * 2 }}
                    onClick={() => onSelect(tab.id)}
                    onKeyDown={event => onTabKeyDown(event, index)}
                    onPointerEnter={() => setHovered(tab.id)}
                    onPointerLeave={() => setHovered(null)}
                    className="sprout-canvas-tab"
                  >
                    {tab.busy ? (
                      <Spinner size="sm" aria-hidden="true" />
                    ) : (
                      Icon && (
                        <span aria-hidden="true" className="sprout-canvas-tab-icon">
                          <Icon size={14} />
                        </span>
                      )
                    )}
                    <span className="sprout-canvas-tab-title">{tab.title}</span>
                  </button>
                );
              })}
            </div>
            {tabs.map((tab, index) => {
              const active = index === activeIndex;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-label={`Close ${tab.title}`}
                  data-active={active ? '' : undefined}
                  data-hover={hovered === tab.id ? '' : undefined}
                  tabIndex={active ? 0 : -1}
                  style={{ order: index * 2 + 1 }}
                  onClick={() => closeTab(index)}
                  onPointerEnter={() => setHovered(tab.id)}
                  onPointerLeave={() => setHovered(null)}
                  className="sprout-canvas-tab-close"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}
        {!mobile && (
          <Button
            ref={closeButton}
            variant="ghost"
            size="icon-sm"
            aria-label="Close canvas"
            title="Close canvas (Esc)"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </Button>
        )}
      </header>
      {activity}
      <div
        id={bodyId}
        role={tabs.length ? 'tabpanel' : undefined}
        aria-labelledby={activeIndex === -1 ? undefined : tabId(activeIndex)}
        tabIndex={tabs.length ? 0 : undefined}
        className="sprout-canvas-body"
      >
        {children}
      </div>
    </section>
  );
}

export interface CanvasToggleProps {
  open: boolean;
  /** Open results. Shown as a badge when above zero. */
  count: number;
  onToggle: () => void;
  className?: string | undefined;
}

/** A header button that shows or hides the canvas. */
export function CanvasToggle({ open, count, onToggle, className }: CanvasToggleProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      data-slot="canvas-toggle"
      aria-pressed={open}
      aria-label={open ? 'Hide canvas' : count ? `Show canvas, ${count} open` : 'Show canvas'}
      title="Open detailed results without leaving your chat"
      onClick={onToggle}
      className={cn('sprout-canvas-toggle', className)}
    >
      <SidebarRight size={16} aria-hidden="true" />
      <span className="sprout-canvas-toggle-label">{open ? 'Hide results' : 'View results'}</span>
      {count > 0 && (
        <span aria-hidden="true" className="sprout-canvas-toggle-count">
          {count}
        </span>
      )}
    </Button>
  );
}

export interface CanvasSectionProps {
  title?: string | undefined;
  /** A short line under the title, such as a row count, source, or URL. */
  meta?: string | undefined;
  /** Buttons beside the title. They wrap below it when space runs out. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
}

/** Padded content for one result, with an optional title, meta, and actions. */
export function CanvasSection({ title, meta, actions, children, className }: CanvasSectionProps) {
  return (
    <div data-slot="canvas-section" className={cn('sprout-canvas-section', className)}>
      {(title || actions) && (
        <div className="sprout-canvas-section-header">
          <div className="sprout-canvas-section-text">
            {title && <h3 className="sprout-canvas-section-title">{title}</h3>}
            {meta && <p className="sprout-canvas-section-meta">{meta}</p>}
          </div>
          {actions && <div className="sprout-canvas-section-actions">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export interface CanvasFrameProps {
  src: string;
  /** Names the frame for assistive tech, such as the page title. */
  title: string;
  className?: string | undefined;
}

/**
 * A sandboxed page preview. Scripts and popups run; same-origin access,
 * forms, and top navigation are blocked, and no referrer is sent.
 */
export function CanvasFrame({ src, title, className }: CanvasFrameProps) {
  return (
    <div data-slot="canvas-frame" className={cn('sprout-canvas-frame', className)}>
      <iframe
        src={src}
        title={title}
        sandbox="allow-scripts allow-popups"
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    </div>
  );
}
