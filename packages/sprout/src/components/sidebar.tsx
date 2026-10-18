"use client";

import { ChevronRight } from "reicon-react/icons/ChevronRight";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import type { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { Collapsible } from "@base-ui/react/collapsible";
import { cn, stateClassName } from "../internal/classes.js";
import { Pressable } from "../internal/pressable.js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  type TooltipContentProps,
} from "./tooltip.js";
import { Input, type InputProps, type InputState } from "./input.js";
import { Separator, type SeparatorLineProps } from "./separator.js";

type TooltipContentState = TooltipPrimitive.Popup.State;

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: SetStateAction<boolean>) => void;
  openMobile: boolean;
  setOpenMobile: (open: SetStateAction<boolean>) => void;
  isMobile: boolean;
  state: "expanded" | "collapsed";
  toggleSidebar: () => void;
  panelId: string;
  triggerRef: RefObject<HTMLElement | null>;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);
const PanelContext = createContext<{
  collapsed: boolean;
  side: "left" | "right";
  portalContainer?: Dialog.Portal.Props["container"];
} | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context)
    throw new Error("Sidebar parts must be inside SidebarProvider.");
  return context;
}

function usePanel() {
  const context = useContext(PanelContext);
  if (!context)
    throw new Error("Sidebar navigation parts must be inside Sidebar.");
  return context;
}

function subscribeMobile(callback: () => void) {
  const media = window.matchMedia("(max-width: 767px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export interface SidebarProviderProps extends Omit<
  ComponentProps<"div">,
  "ref"
> {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  openMobile?: boolean;
  onOpenMobileChange?: (open: boolean) => void;
  keyboardShortcut?: boolean;
}

export function SidebarProvider({
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  openMobile: controlledMobile,
  onOpenMobileChange,
  keyboardShortcut = true,
  className,
  children,
  ...props
}: SidebarProviderProps) {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const [localMobile, setLocalMobile] = useState(false);
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );
  const open = controlledOpen ?? localOpen;
  const openMobile = controlledMobile ?? localMobile;
  const panelId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  function setOpen(value: SetStateAction<boolean>) {
    const next = typeof value === "function" ? value(open) : value;
    if (controlledOpen === undefined) setLocalOpen(next);
    onOpenChange?.(next);
  }

  function setOpenMobile(value: SetStateAction<boolean>) {
    const next = typeof value === "function" ? value(openMobile) : value;
    if (controlledMobile === undefined) setLocalMobile(next);
    onOpenMobileChange?.(next);
  }

  function toggleSidebar() {
    if (isMobile) setOpenMobile((value) => !value);
    else setOpen((value) => !value);
  }

  useEffect(() => {
    if (!keyboardShortcut) return;
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "b"
      )
        return;
      const target = event.target;
      if (target instanceof Element) {
        if (
          target.closest(
            "input, textarea, select, [role=combobox], [role=listbox], [role=menu], [aria-haspopup=menu], [contenteditable]:not([contenteditable=false])",
          )
        )
          return;
        const owner = target.closest("[data-sprout-sidebar-provider]");
        if (owner && owner !== wrapperRef.current) return;
      }
      event.preventDefault();
      toggleSidebar();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  return (
    <SidebarContext.Provider
      value={{
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        isMobile,
        state: open ? "expanded" : "collapsed",
        toggleSidebar,
        panelId,
        triggerRef,
      }}
    >
      <TooltipProvider delay={200}>
        <div
          {...props}
          ref={wrapperRef}
          data-sprout-sidebar-provider=""
          className={cn(
            "sprout-sidebar-layout font-sprout text-sprout-text",
            className,
          )}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

export interface SidebarProps extends ComponentProps<"aside"> {
  side?: "left" | "right";
  collapsible?: "icon" | "offcanvas" | "none";
  label?: string;
  portalContainer?: Dialog.Portal.Props["container"];
}

export function Sidebar({
  side = "left",
  collapsible = "icon",
  label = "Navigation",
  portalContainer,
  className,
  children,
  ...props
}: SidebarProps) {
  const { open, openMobile, setOpenMobile, isMobile, panelId, triggerRef } =
    useSidebar();
  const mobile = isMobile && collapsible !== "none";
  const collapsed = !mobile && !open && collapsible === "icon";
  const offcanvas = !open && collapsible === "offcanvas";
  const content = (
    <PanelContext.Provider value={{ collapsed, side, portalContainer }}>
      {children}
    </PanelContext.Provider>
  );

  if (mobile) {
    return (
      <Dialog.Root open={openMobile} onOpenChange={setOpenMobile}>
        <Dialog.Portal container={portalContainer}>
          <Dialog.Backdrop className="sprout-sidebar-backdrop" />
          <Dialog.Popup
            id={panelId}
            data-side={side}
            className="sprout-sidebar-drawer font-sprout text-sprout-text"
            finalFocus={triggerRef}
          >
            <div className="sprout-sidebar-drawer-heading">
              <Dialog.Title>{label}</Dialog.Title>
              <Dialog.Close className="sprout-sidebar-close">
                Close
              </Dialog.Close>
            </div>
            <aside
              {...props}
              aria-label={label}
              data-sprout-sidebar=""
              data-state="expanded"
              className={cn(
                "sprout-sidebar-panel sprout-sidebar-mobile bg-sprout-canvas",
                className,
              )}
            >
              {content}
            </aside>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <aside
      {...props}
      id={panelId}
      aria-label={label}
      data-sprout-sidebar=""
      data-state={collapsed ? "collapsed" : "expanded"}
      data-side={side}
      data-collapsible={collapsible}
      data-offcanvas={offcanvas ? "" : undefined}
      aria-hidden={offcanvas || undefined}
      inert={offcanvas}
      className={cn("sprout-sidebar-panel bg-sprout-canvas", className)}
    >
      {content}
    </aside>
  );
}

export function SidebarTrigger({
  className,
  onClick,
  children = "Toggle sidebar",
  ...props
}: Button.Props) {
  const { isMobile, open, openMobile, toggleSidebar, panelId, triggerRef } =
    useSidebar();
  return (
    <Button
      aria-label="Toggle sidebar"
      aria-expanded={isMobile ? openMobile : open}
      aria-controls={panelId}
      {...props}
      className={stateClassName<Button.State>(
        "sprout-sidebar-trigger",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        triggerRef.current = event.currentTarget;
        toggleSidebar();
      }}
    >
      {children}
    </Button>
  );
}

export function SidebarHeader({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("sprout-sidebar-header", className)} />;
}
/** A 32px search or filter field for the sidebar header, on the canvas color. */
export function SidebarInput({ className, ...props }: InputProps) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      {...props}
      className={stateClassName<InputState>("sprout-sidebar-input", className)}
    />
  );
}
export function SidebarFooter({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("sprout-sidebar-footer", className)} />;
}
export function SidebarSeparator({ className, ...props }: SeparatorLineProps) {
  return (
    <Separator
      data-sidebar="separator"
      {...props}
      className={stateClassName("sprout-sidebar-separator", className)}
    />
  );
}
export function SidebarContent({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("sprout-sidebar-content", className)} />;
}
export function SidebarGroup({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("sprout-sidebar-group", className)} />;
}
export function SidebarGroupLabel({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div {...props} className={cn("sprout-sidebar-group-label", className)} />
  );
}
export function SidebarMenu({ className, ...props }: ComponentProps<"ul">) {
  return <ul {...props} className={cn("sprout-sidebar-menu", className)} />;
}
export function SidebarMenuItem({ className, ...props }: ComponentProps<"li">) {
  return (
    <li {...props} className={cn("sprout-sidebar-menu-item", className)} />
  );
}

export interface SidebarMenuButtonProps extends Button.Props {
  icon?: ReactNode;
  badge?: ReactNode;
  isActive?: boolean;
  /**
   * The label shown beside the collapsed icon rail. Pass `TooltipContent`
   * props to change its content or placement; `hidden` overrides when it shows.
   */
  tooltip?: string | TooltipContentProps;
}

export function SidebarMenuButton({
  icon,
  badge,
  isActive = false,
  tooltip,
  className,
  children,
  onClick,
  ...props
}: SidebarMenuButtonProps) {
  const { collapsed, side, portalContainer } = usePanel();
  const { setOpenMobile } = useSidebar();
  const content = typeof tooltip === "string" ? { children: tooltip } : tooltip;
  const { hidden: hideTooltip = !collapsed, ...contentProps } = content ?? {};
  const accessibleLabel =
    props["aria-label"] ??
    (typeof content?.children === "string" ? content.children : undefined) ??
    (typeof children === "string" ? children : undefined);
  return (
    <Tooltip disabled={hideTooltip || props.disabled}>
      <TooltipTrigger
        render={
          <Pressable
            {...props}
            aria-label={accessibleLabel}
            aria-current={
              props["aria-current"] ??
              (isActive && props.nativeButton === false ? "page" : undefined)
            }
            data-active={isActive ? "" : undefined}
            className={stateClassName<Button.State>(
              "sprout-sidebar-menu-button",
              className,
            )}
            onClick={(event) => {
              onClick?.(event);
              if (
                !event.defaultPrevented &&
                props.nativeButton === false &&
                !event.metaKey &&
                !event.ctrlKey &&
                !event.shiftKey &&
                !event.altKey
              )
                setOpenMobile(false);
            }}
          />
        }
      >
        {icon && (
          <span className="sprout-sidebar-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="sprout-sidebar-label">{children}</span>
        {badge != null && <span className="sprout-sidebar-badge">{badge}</span>}
      </TooltipTrigger>
      <TooltipContent
        side={side === "left" ? "right" : "left"}
        sideOffset={8}
        container={portalContainer}
        {...contentProps}
        className={stateClassName<TooltipContentState>(
          "sprout-sidebar-tooltip",
          contentProps.className,
        )}
      >
        {contentProps.children ?? children}
      </TooltipContent>
    </Tooltip>
  );
}

export function SidebarMenuAction({ className, ...props }: Button.Props) {
  usePanel();
  return (
    <Button
      {...props}
      className={stateClassName<Button.State>(
        "sprout-sidebar-menu-action",
        className,
      )}
    />
  );
}
export function SidebarMenuSub({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      {...props}
      className={cn("sprout-sidebar-menu sprout-sidebar-sub", className)}
    />
  );
}
export const SidebarMenuSubItem = SidebarMenuItem;
export function SidebarMenuSubButton({
  className,
  ...props
}: SidebarMenuButtonProps) {
  return (
    <SidebarMenuButton
      {...props}
      className={stateClassName<Button.State>(
        "sprout-sidebar-sub-button",
        className,
      )}
    />
  );
}

export interface SidebarSectionProps extends Omit<
  SidebarMenuButtonProps,
  "onChange"
> {
  label: string;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SidebarSection({
  label,
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  ...props
}: SidebarSectionProps) {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const { collapsed } = usePanel();
  const open = !collapsed && (controlledOpen ?? localOpen);
  return (
    <SidebarMenuItem>
      <Collapsible.Root
        open={open}
        onOpenChange={(value) => {
          if (controlledOpen === undefined) setLocalOpen(value);
          onOpenChange?.(value);
        }}
      >
        <div className="sprout-sidebar-section-heading">
          <SidebarMenuButton {...props}>{label}</SidebarMenuButton>
          <Collapsible.Trigger
            render={
              <SidebarMenuAction
                aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
              />
            }
          >
            <ChevronRight
              size={16}
              aria-hidden="true"
              className="sprout-sidebar-chevron"
            />
          </Collapsible.Trigger>
        </div>
        <Collapsible.Panel
          className="sprout-sidebar-section-content"
          inert={!open}
        >
          <SidebarMenuSub>{children}</SidebarMenuSub>
        </Collapsible.Panel>
      </Collapsible.Root>
    </SidebarMenuItem>
  );
}

export function SidebarMenuSkeleton({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={cn("sprout-sidebar-skeleton", className)}
    >
      <span />
      <span />
    </div>
  );
}
