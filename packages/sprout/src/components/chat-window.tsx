'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode, type Ref } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { Maximize } from 'reicon-react/icons/Maximize';
import { Minus } from 'reicon-react/icons/Minus';
import { SidebarRight } from 'reicon-react/icons/SidebarRight';
import { Window } from 'reicon-react/icons/Window';
import { X } from 'reicon-react/icons/X';
import { cn, stateClassName } from '../internal/classes.js';
import { Button } from './button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu.js';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip.js';

export const chatWindowLayoutNames = ['drawer', 'page', 'window'] as const;
export const chatWindowCornerNames = ['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const;

/** `window` floats in a corner, `drawer` fills one side, `page` covers the viewport. */
export type ChatWindowLayout = (typeof chatWindowLayoutNames)[number];
export type ChatWindowCorner = (typeof chatWindowCornerNames)[number];

interface ChatWindowContextValue {
  layout: ChatWindowLayout;
  setLayout: (layout: ChatWindowLayout) => void;
  corner: ChatWindowCorner;
  close: () => void;
}

const ChatWindowContext = createContext<ChatWindowContextValue | null>(null);

function useChatWindow(part: string) {
  const context = useContext(ChatWindowContext);
  if (!context) throw new Error(`${part} must be placed inside ChatWindow.`);
  return context;
}

export interface ChatWindowProps extends Omit<DialogPrimitive.Root.Props, 'modal' | 'disablePointerDismissal'> {
  /** The controlled layout. */
  layout?: ChatWindowLayout;
  /** The layout of an uncontrolled window. Defaults to `"window"`. */
  defaultLayout?: ChatWindowLayout;
  /**
   * Called when someone picks a layout. To open a full chat route instead of
   * covering the page, navigate here for `"page"` and leave `layout` as it is.
   */
  onLayoutChange?: (layout: ChatWindowLayout) => void;
  /** The corner the launcher and window sit in. A drawer fills that side. Defaults to `"bottom-right"`. */
  corner?: ChatWindowCorner;
}

/**
 * A chat that floats over the page without blocking it. The page stays usable
 * while the window is open, and clicking the page does not close it. Escape,
 * Minimize, and the close button tuck it back into its launcher.
 */
export function ChatWindow({
  layout: controlledLayout,
  defaultLayout = 'window',
  onLayoutChange,
  corner = 'bottom-right',
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  actionsRef,
  children,
  ...props
}: ChatWindowProps) {
  const [uncontrolledLayout, setUncontrolledLayout] = useState(defaultLayout);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const layout = controlledLayout ?? uncontrolledLayout;
  const open = controlledOpen ?? uncontrolledOpen;
  const setLayout = useCallback(
    (next: ChatWindowLayout) => {
      setUncontrolledLayout(next);
      onLayoutChange?.(next);
    },
    [onLayoutChange],
  );
  const handleOpenChange: NonNullable<DialogPrimitive.Root.Props['onOpenChange']> = (next, details) => {
    onOpenChange?.(next, details);
    if (!details.isCanceled) setUncontrolledOpen(next);
  };
  const ownActions = useRef<DialogPrimitive.Root.Actions | null>(null);
  const actions = actionsRef ?? ownActions;
  const close = useCallback(() => actions.current?.close(), [actions]);
  return (
    <ChatWindowContext value={{ layout, setLayout, corner, close }}>
      <DialogPrimitive.Root
        {...props}
        actionsRef={actions}
        open={open}
        onOpenChange={handleOpenChange}
        modal={false}
        disablePointerDismissal
      >
        {children}
      </DialogPrimitive.Root>
    </ChatWindowContext>
  );
}

export type ChatWindowTriggerProps = DialogPrimitive.Trigger.Props;

/** Opens the window from any control. It is hidden while the window is open. */
export function ChatWindowTrigger(props: ChatWindowTriggerProps) {
  return <DialogPrimitive.Trigger data-slot="chat-window-trigger" {...props} />;
}

export type ChatWindowLauncherProps = DialogPrimitive.Trigger.Props;

/**
 * A pill pinned to the window's corner. It opens the window and comes back
 * when the window is minimized or closed. Put an avatar and a short label in it.
 */
export function ChatWindowLauncher({ className, render, ...props }: ChatWindowLauncherProps) {
  const { corner } = useChatWindow('ChatWindowLauncher');
  return (
    <DialogPrimitive.Trigger
      data-slot="chat-window-launcher"
      data-corner={corner}
      render={render ?? <Button variant="outline" size="lg" />}
      {...props}
      className={stateClassName<DialogPrimitive.Trigger.State>('sprout-chat-window-launcher', className)}
    />
  );
}

export interface ChatWindowContentProps extends DialogPrimitive.Popup.Props {
  /** Keeps the chat in the DOM while minimized, so drafts and scroll survive. Defaults to `true`. */
  keepMounted?: boolean;
  /** Where the portal renders. Defaults to `document.body`. */
  container?: DialogPrimitive.Portal.Props['container'];
}

/**
 * The window itself. It renders its own portal, so place it directly inside
 * `ChatWindow`. When it opens, focus goes to the window itself, so the
 * composer shows no focus ring until someone clicks or tabs into it. Pass
 * `initialFocus` to focus something else.
 */
export function ChatWindowContent({
  keepMounted = true,
  container,
  initialFocus,
  className,
  children,
  ref,
  ...props
}: ChatWindowContentProps) {
  const { layout, corner } = useChatWindow('ChatWindowContent');
  const popup = useRef<HTMLDivElement | null>(null);
  const setRef = (node: HTMLDivElement | null) => {
    popup.current = node;
    assignRef(ref, node);
  };
  return (
    <DialogPrimitive.Portal keepMounted={keepMounted} container={container}>
      <DialogPrimitive.Popup
        data-slot="chat-window-content"
        data-layout={layout}
        data-corner={corner}
        ref={setRef}
        initialFocus={initialFocus ?? popup}
        {...props}
        className={stateClassName<DialogPrimitive.Popup.State>('sprout-chat-window-content', className)}
      >
        <div className="sprout-chat-window-panel">{children}</div>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

type PartSlot = 'chat-window-header' | 'chat-window-actions' | 'chat-window-body' | 'chat-window-footer';

export interface ChatWindowPartState extends Record<string, unknown> {
  slot: PartSlot;
}

export type ChatWindowPartProps = useRender.ComponentProps<'div', ChatWindowPartState>;

function part(slot: PartSlot, base: string) {
  return function ChatWindowPart({ className, render, ref, ...props }: ChatWindowPartProps) {
    return useRender({
      defaultTagName: 'div',
      ref,
      render,
      props: mergeProps<'div'>({ 'data-slot': slot, className: cn(base, className) } as object, props),
      state: { slot },
    });
  };
}

/** The top bar: title on the start side, `ChatWindowActions` on the end. */
export const ChatWindowHeader = part('chat-window-header', 'sprout-chat-window-header');

/** A row of header buttons pushed to the end of the header. */
export const ChatWindowActions = part('chat-window-actions', 'sprout-chat-window-actions');

/**
 * The middle that fills the space between header and footer. Put a
 * `MessageScroller` in it, or any content that scrolls on its own.
 */
export const ChatWindowBody = part('chat-window-body', 'sprout-chat-window-body');

/** The bottom edge, usually a `ChatInput`. In `page` layout it keeps a readable width. */
export const ChatWindowFooter = part('chat-window-footer', 'sprout-chat-window-footer');

export type ChatWindowTitleProps = DialogPrimitive.Title.Props;

/**
 * Names the window. It renders an `h2`. Inside a breadcrumb, pass
 * `render={<span />}` and wrap only the current page.
 */
export function ChatWindowTitle({ className, ...props }: ChatWindowTitleProps) {
  return (
    <DialogPrimitive.Title
      data-slot="chat-window-title"
      {...props}
      className={stateClassName<DialogPrimitive.Title.State>('sprout-chat-window-title', className)}
    />
  );
}

export interface ChatWindowCloseProps extends Omit<DialogPrimitive.Close.Props, 'children'> {
  /** Accessible name and tooltip. Defaults to `"Close"`. */
  label?: string;
}

/** A ghost icon button that tucks the window back into its launcher. */
export function ChatWindowClose({ label = 'Close', render, ...props }: ChatWindowCloseProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <DialogPrimitive.Close
            data-slot="chat-window-close"
            aria-label={label}
            render={render ?? <Button variant="ghost" size="icon-sm" />}
            {...props}
          />
        }
      >
        <X size={16} aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

const layoutIcons: Record<ChatWindowLayout, ReactNode> = {
  drawer: <SidebarRight size={16} aria-hidden="true" />,
  page: <Maximize size={16} aria-hidden="true" />,
  window: <Window size={16} aria-hidden="true" />,
};

export interface ChatWindowLayoutMenuLabels {
  trigger: string;
  heading: string;
  drawer: string;
  page: string;
  window: string;
  minimize: string;
}

const defaultLabels: ChatWindowLayoutMenuLabels = {
  trigger: 'Switch layout',
  heading: 'Switch layout',
  drawer: 'Side drawer',
  page: 'Full page',
  window: 'Window',
  minimize: 'Minimize',
};

export interface ChatWindowLayoutMenuProps {
  /** The layouts to offer, in this order. Defaults to drawer, page, then window. */
  layouts?: readonly ChatWindowLayout[];
  /** Adds Minimize under the layouts. Defaults to `true`. */
  showMinimize?: boolean;
  /** Override any label, for example to translate them. */
  labels?: Partial<ChatWindowLayoutMenuLabels>;
  className?: string;
}

/**
 * An icon button showing the current layout. Its menu switches between the
 * layouts and minimizes the window. Window and Side drawer are hidden below
 * 640px, where every layout fills the screen.
 */
export function ChatWindowLayoutMenu({
  layouts = chatWindowLayoutNames,
  showMinimize = true,
  labels: labelOverrides,
  className,
}: ChatWindowLayoutMenuProps) {
  const { layout, setLayout, close } = useChatWindow('ChatWindowLayoutMenu');
  const labels = { ...defaultLabels, ...labelOverrides };
  // Minimize waits for the menu to finish closing, so focus is back inside the
  // window and the window can hand it to the launcher.
  const minimizing = useRef(false);
  return (
    <DropdownMenu
      onOpenChangeComplete={open => {
        if (open || !minimizing.current) return;
        minimizing.current = false;
        close();
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              data-slot="chat-window-layout-trigger"
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${labels.trigger}, ${labels[layout]}`}
                  className={className}
                />
              }
            />
          }
        >
          {layoutIcons[layout]}
        </TooltipTrigger>
        <TooltipContent side="bottom">{labels.trigger}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        size="menu"
        align="end"
        data-slot="chat-window-layout-menu"
        className="sprout-chat-window-layout-menu"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>{labels.heading}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={layout} onValueChange={value => setLayout(value as ChatWindowLayout)}>
            {layouts.map(option => (
              <DropdownMenuRadioItem key={option} value={option} closeOnClick data-layout-option={option}>
                {layoutIcons[option]}
                {labels[option]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        {showMinimize && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              data-layout-option="minimize"
              onClick={() => {
                minimizing.current = true;
              }}
            >
              <Minus size={16} aria-hidden="true" />
              {labels.minimize}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
