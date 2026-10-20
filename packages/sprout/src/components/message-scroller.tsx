'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type TouchEvent,
  type UIEvent,
  type WheelEvent,
} from 'react';
import { useRender } from '@base-ui/react/use-render';
import { mergeProps } from '@base-ui/react/merge-props';
import { ArrowDown } from 'reicon-react/icons/ArrowDown';
import { cn } from '../internal/classes.js';
import {
  MessageScrollerController,
  scrollIntentKeys,
  type MessageScrollerDefaultScrollPosition,
  type MessageScrollerScrollable,
  type MessageScrollerScrollOptions,
  type MessageScrollerVisibilityState,
} from '../internal/message-scroller.js';
import { Button, type ButtonSize, type ButtonVariant } from './button.js';

export type {
  MessageScrollerDefaultScrollPosition,
  MessageScrollerScrollAlign,
  MessageScrollerScrollable,
  MessageScrollerScrollOptions,
  MessageScrollerVisibilityState,
} from '../internal/message-scroller.js';

export const messageScrollerDefaultScrollPositionNames = ['end', 'start', 'last-anchor'] as const;
export const messageScrollerButtonDirectionNames = ['end', 'start'] as const;
export const messageScrollerScrollAlignNames = ['start', 'center', 'end', 'nearest'] as const;

export type MessageScrollerButtonDirection = (typeof messageScrollerButtonDirectionNames)[number];

const ScrollerContext = createContext<MessageScrollerController | null>(null);

function useController(part: string) {
  const controller = useContext(ScrollerContext);
  if (!controller) throw new Error(`${part} must be used within a MessageScrollerProvider.`);
  return controller;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

function usePendingDefaultScroll(controller: MessageScrollerController) {
  const store = controller.pendingDefaultStore;
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export interface MessageScrollerProviderProps {
  children?: ReactNode;
  /** Keep following the newest content while the reader is at the end. */
  autoScroll?: boolean | undefined;
  /** Where the history opens: the newest message, the oldest, or the last `scrollAnchor` item pinned under the top edge. */
  defaultScrollPosition?: MessageScrollerDefaultScrollPosition | undefined;
  /** Pixels from an edge that still count as “at” it. */
  scrollEdgeThreshold?: number | undefined;
  /** Pixels of the previous message left showing above a pinned turn. */
  scrollPreviousItemPeek?: number | undefined;
  /** Extra pixels kept above a message scrolled into view. */
  scrollMargin?: number | undefined;
}

/** Owns the scroll state. Wrap the scroller and anything that calls the hooks, such as a composer. */
export function MessageScrollerProvider({
  children,
  autoScroll = false,
  defaultScrollPosition = 'end',
  scrollEdgeThreshold = 8,
  scrollPreviousItemPeek = 64,
  scrollMargin = 0,
}: MessageScrollerProviderProps) {
  const options = {
    autoScroll,
    defaultScrollPosition,
    scrollEdgeThreshold,
    scrollPreviousItemPeek,
    scrollMargin,
  };
  const [controller] = useState(() => new MessageScrollerController(options));
  controller.setOptions(options);
  useLayoutEffect(() => controller.applyDefaultOrSettle(), [controller, defaultScrollPosition]);
  useLayoutEffect(() => controller.followOnAutoScroll(), [controller, autoScroll]);
  useEffect(() => controller.dispose, [controller]);
  return <ScrollerContext.Provider value={controller}>{children}</ScrollerContext.Provider>;
}

export type MessageScrollerProps = ComponentProps<'div'>;

/** The positioned frame. Holds the viewport and the jump buttons, and fills its parent. */
export function MessageScroller({ className, ref, ...props }: MessageScrollerProps) {
  const controller = useController('MessageScroller');
  const pending = usePendingDefaultScroll(controller);
  const setRef = useCallback(
    (element: HTMLDivElement | null) => {
      controller.setRoot(element);
      assignRef(ref, element);
    },
    [controller, ref],
  );
  return (
    <div
      data-slot="message-scroller"
      ref={setRef}
      className={cn('sprout-message-scroller', className)}
      {...props}
      {...(pending ? { 'data-pending-scroll': '' } : null)}
    />
  );
}

export interface MessageScrollerViewportProps extends ComponentProps<'div'> {
  /** Keep the message you are reading still when older messages load above it. */
  preserveScrollOnPrepend?: boolean | undefined;
}

/** The scrolling region. Focusable, named “Messages” unless you pass `aria-label`. */
export function MessageScrollerViewport({
  className,
  ref,
  role,
  tabIndex,
  preserveScrollOnPrepend = true,
  onKeyDown,
  onScroll,
  onTouchMove,
  onWheel,
  'aria-label': ariaLabel,
  ...props
}: MessageScrollerViewportProps) {
  const controller = useController('MessageScrollerViewport');
  const pending = usePendingDefaultScroll(controller);
  controller.preserveScrollOnPrepend = preserveScrollOnPrepend;
  const setRef = useCallback(
    (element: HTMLDivElement | null) => {
      controller.setViewport(element);
      assignRef(ref, element);
    },
    [controller, ref],
  );
  useEffect(() => {
    const viewport = controller.getViewport();
    if (!viewport || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(controller.handleResize);
    });
    observer.observe(viewport);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [controller]);
  return (
    <div
      data-slot="message-scroller-viewport"
      ref={setRef}
      role={role ?? 'region'}
      aria-label={ariaLabel ?? 'Messages'}
      tabIndex={tabIndex ?? 0}
      className={cn('sprout-message-scroller-viewport', className)}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (scrollIntentKeys.has(event.key)) controller.userScrollIntent();
        onKeyDown?.(event);
      }}
      onScroll={(event: UIEvent<HTMLDivElement>) => {
        controller.syncAfterScroll();
        onScroll?.(event);
      }}
      onTouchMove={(event: TouchEvent<HTMLDivElement>) => {
        controller.userScrollIntent();
        onTouchMove?.(event);
      }}
      onWheel={(event: WheelEvent<HTMLDivElement>) => {
        controller.userScrollIntent();
        onWheel?.(event);
      }}
      {...props}
      {...(pending ? { 'data-pending-scroll': '' } : null)}
    />
  );
}

export interface MessageScrollerContentProps extends ComponentProps<'div'> {
  /** Class for the hidden spacer that lets a pinned turn reach the top edge. */
  spacerClassName?: string | undefined;
}

/** The message column, a polite `log` that announces additions. Items sit 24px apart. */
export function MessageScrollerContent({
  className,
  children,
  ref,
  role,
  spacerClassName,
  'aria-relevant': ariaRelevant,
  ...props
}: MessageScrollerContentProps) {
  const controller = useController('MessageScrollerContent');
  const element = useRef<HTMLDivElement | null>(null);
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      element.current = node;
      controller.setContent(node);
      assignRef(ref, node);
    },
    [controller, ref],
  );
  useLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    controller.handleContentChange();
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(controller.handleContentChange);
    observer.observe(node, { childList: true });
    return () => observer.disconnect();
  }, [controller]);
  useEffect(() => {
    const node = element.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(controller.handleResize);
    });
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [controller]);
  return (
    <div
      data-slot="message-scroller-content"
      ref={setRef}
      role={role ?? 'log'}
      aria-relevant={ariaRelevant ?? 'additions'}
      className={cn('sprout-message-scroller-content', className)}
      {...props}
    >
      {children}
      <div
        ref={controller.setSpacer}
        aria-hidden="true"
        data-message-scroller-spacer=""
        hidden
        className={spacerClassName}
      />
    </div>
  );
}

export interface MessageScrollerItemProps extends ComponentProps<'div'> {
  /** Stable id used by `scrollToMessage` and visibility. */
  messageId?: string | undefined;
  /** Pin this item under the top edge when it is added, such as the newest user turn. */
  scrollAnchor?: boolean | undefined;
}

/** One message or turn in the column. Off-screen items skip rendering work. */
export function MessageScrollerItem({
  className,
  ref,
  messageId,
  scrollAnchor = false,
  ...props
}: MessageScrollerItemProps) {
  const controller = useController('MessageScrollerItem');
  const previous = useRef<HTMLDivElement | null>(null);
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      const before = previous.current;
      previous.current = node;
      if (messageId) controller.registerMessage(messageId, node, before);
      assignRef(ref, node);
    },
    [controller, messageId, ref],
  );
  return (
    <div
      data-slot="message-scroller-item"
      ref={setRef}
      data-message-id={messageId}
      data-scroll-anchor={scrollAnchor ? 'true' : 'false'}
      className={cn('sprout-message-scroller-item', className)}
      {...props}
    />
  );
}

export interface MessageScrollerButtonState extends Record<string, unknown> {
  active: boolean;
  direction: MessageScrollerButtonDirection;
}

export type MessageScrollerButtonProps = useRender.ComponentProps<'button', MessageScrollerButtonState> & {
  /** Which edge the button scrolls to. `"start"` sits at the top with the arrow turned up. */
  direction?: MessageScrollerButtonDirection | undefined;
  /** `"smooth"` by default; becomes `"auto"` when reduced motion is set. */
  behavior?: ScrollBehavior | undefined;
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
};

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A floating jump button that shows only while there is more history in its direction. */
export function MessageScrollerButton({
  className,
  children,
  render,
  ref,
  direction = 'end',
  behavior = 'smooth',
  variant = 'secondary',
  size = 'icon-sm',
  tabIndex,
  onClick,
  ...props
}: MessageScrollerButtonProps) {
  const controller = useController('MessageScrollerButton');
  const store = controller.stateStore;
  const read = useCallback(
    () => (direction === 'start' ? store.getSnapshot().start : store.getSnapshot().end),
    [direction, store],
  );
  const active = useSyncExternalStore(store.subscribe, read, read);
  const state = useMemo<MessageScrollerButtonState>(() => ({ active, direction }), [active, direction]);
  return useRender({
    defaultTagName: 'button',
    render: render ?? <Button variant={variant} size={size} />,
    ref,
    state,
    stateAttributesMapping: { active: () => null },
    props: mergeProps<'button'>(
      {
        type: 'button',
        'data-slot': 'message-scroller-button',
        'data-active': active ? 'true' : 'false',
        className: cn('sprout-message-scroller-button', className),
        inert: !active,
        tabIndex: active ? tabIndex : -1,
        onClick: event => {
          if (!active) return;
          onClick?.(event);
          if (event.defaultPrevented) return;
          event.currentTarget.blur();
          const scroll = {
            behavior: prefersReducedMotion() ? 'auto' : behavior,
          } as const;
          if (direction === 'start') controller.scrollToStart(scroll);
          else controller.scrollToEnd(scroll);
        },
        children: children ?? (
          <>
            <ArrowDown aria-hidden="true" />
            <span className="sprout-message-scroller-sr-only">
              {direction === 'end' ? 'Scroll to end' : 'Scroll to start'}
            </span>
          </>
        ),
      } as ComponentProps<'button'>,
      props,
    ),
  });
}

/** Scroll the history from outside it, such as after sending or from a “jump to” link. */
export function useMessageScroller() {
  const controller = useController('useMessageScroller');
  return useMemo(
    () => ({
      scrollToEnd: controller.scrollToEnd as (options?: MessageScrollerScrollOptions) => boolean,
      scrollToMessage: controller.scrollToMessage as (
        messageId: string,
        options?: MessageScrollerScrollOptions,
      ) => boolean,
      scrollToStart: controller.scrollToStart as (options?: MessageScrollerScrollOptions) => boolean,
    }),
    [controller],
  );
}

/** Whether there is more history above (`start`) or below (`end`) the current view. */
export function useMessageScrollerScrollable(): MessageScrollerScrollable {
  const store = useController('useMessageScrollerScrollable').stateStore;
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/** The ids of items in view and the pinned turn under the top edge. Observes only while used. */
export function useMessageScrollerVisibility(): MessageScrollerVisibilityState {
  const controller = useController('useMessageScrollerVisibility');
  const store = controller.visibilityStore;
  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(listener, controller.observeVisibility, controller.unobserveVisibility),
    [controller, store],
  );
  return useSyncExternalStore(subscribe, store.getSnapshot, store.getSnapshot);
}
