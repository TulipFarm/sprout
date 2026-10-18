"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { stateClassName } from "../internal/classes.js";

interface TooltipContextValue {
  id: string;
  describedBy: string | undefined;
  setDescribedBy: (id: string | undefined) => void;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

function joinIds(...ids: (string | undefined)[]) {
  return ids.filter(Boolean).join(" ") || undefined;
}

export type TooltipProviderProps = TooltipPrimitive.Provider.Props;

/**
 * Shares one open delay across a group of tooltips. Once one tooltip is open,
 * moving to a neighbour opens it instantly. Defaults to no delay.
 */
export function TooltipProvider({ delay = 0, ...props }: TooltipProviderProps) {
  return <TooltipPrimitive.Provider delay={delay} {...props} />;
}

export type TooltipProps = TooltipPrimitive.Root.Props;

type TooltipActions = TooltipPrimitive.Root.Actions;

/**
 * Open tooltips across the page. Base UI closes a focus-opened tooltip on blur
 * one task late, after the next trigger has already opened its own, so opening
 * a tooltip closes the others right away and only one ever shows.
 */
const openTooltips = new Set<RefObject<TooltipActions | null>>();

export function Tooltip({ onOpenChange, actionsRef, ...props }: TooltipProps) {
  const id = useId();
  const actions = useRef<TooltipActions | null>(null);
  const [registered, setDescribedBy] = useState<string>();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(
    props.defaultOpen ?? false,
  );
  const open = props.open ?? uncontrolledOpen;
  // A kept-mounted popup stays in the DOM while closed; only describe while open.
  const describedBy = open ? registered : undefined;
  useImperativeHandle(actionsRef, () => ({
    close: () => actions.current?.close(),
    unmount: () => actions.current?.unmount(),
  }));
  useEffect(() => {
    if (!open) return;
    openTooltips.add(actions);
    return () => {
      openTooltips.delete(actions);
    };
  }, [open]);
  return (
    <TooltipContext value={{ id, describedBy, setDescribedBy }}>
      <TooltipPrimitive.Root
        {...props}
        actionsRef={actions}
        onOpenChange={(next, details) => {
          onOpenChange?.(next, details);
          if (details.isCanceled) return;
          if (next) {
            for (const other of [...openTooltips]) {
              if (other === actions) continue;
              openTooltips.delete(other);
              other.current?.close();
            }
            openTooltips.add(actions);
          }
          setUncontrolledOpen(next);
        }}
      />
    </TooltipContext>
  );
}

export type TooltipTriggerProps = TooltipPrimitive.Trigger.Props;

/**
 * The element that opens the tooltip on hover and keyboard focus. Pass a
 * `Button`, a link, or another component's trigger through `render`. While the
 * tooltip shows, the trigger is described by it.
 */
export function TooltipTrigger({
  render,
  "aria-describedby": ownDescribedBy,
  ...props
}: TooltipTriggerProps) {
  const context = useContext(TooltipContext);
  const tooltipId = context?.describedBy;
  // Base UI lets props on the render element win, so merge the id into it.
  const element = render as ReactElement<{ "aria-describedby"?: string }>;
  const merged =
    tooltipId && isValidElement(element)
      ? cloneElement(element, {
          "aria-describedby": joinIds(
            element.props["aria-describedby"],
            ownDescribedBy,
            tooltipId,
          ),
        })
      : typeof render === "function" && tooltipId
        ? (((renderProps, state) =>
            render(
              {
                ...renderProps,
                "aria-describedby": joinIds(
                  renderProps["aria-describedby"],
                  tooltipId,
                ),
              },
              state,
            )) as typeof render)
        : render;
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      {...props}
      aria-describedby={joinIds(ownDescribedBy, tooltipId)}
      render={merged}
    />
  );
}

type PositionerProps = Pick<
  TooltipPrimitive.Positioner.Props,
  | "align"
  | "alignOffset"
  | "side"
  | "sideOffset"
  | "anchor"
  | "collisionPadding"
  | "collisionAvoidance"
  | "sticky"
  | "positionMethod"
>;

export interface TooltipContentProps
  extends TooltipPrimitive.Popup.Props, PositionerProps {
  /** Keep the tooltip in the DOM while closed. */
  keepMounted?: TooltipPrimitive.Portal.Props["keepMounted"];
  /** Where the portal renders. Defaults to `document.body`. */
  container?: TooltipPrimitive.Portal.Props["container"];
  /** Render nothing, for example while a sidebar is expanded and its labels show. */
  hidden?: boolean;
}

function Describe({ id }: { id: string }) {
  const setDescribedBy = useContext(TooltipContext)?.setDescribedBy;
  useEffect(() => {
    setDescribedBy?.(id);
    return () => setDescribedBy?.(undefined);
  }, [id, setDescribedBy]);
  return null;
}

/**
 * The tooltip label. It renders its own portal, positioner, and arrow, so
 * place it directly inside `Tooltip`.
 */
export function TooltipContent({
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  collisionPadding = 8,
  collisionAvoidance,
  sticky,
  positionMethod,
  anchor,
  keepMounted = false,
  container,
  hidden = false,
  id,
  className,
  children,
  ...props
}: TooltipContentProps) {
  const context = useContext(TooltipContext);
  if (hidden) return null;
  const popupId = id ?? context?.id;
  return (
    <TooltipPrimitive.Portal keepMounted={keepMounted} container={container}>
      <TooltipPrimitive.Positioner
        className="sprout-tooltip-positioner"
        anchor={anchor}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        collisionAvoidance={collisionAvoidance}
        sticky={sticky}
        positionMethod={positionMethod}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          role="tooltip"
          id={popupId}
          {...props}
          className={stateClassName<TooltipPrimitive.Popup.State>(
            "sprout-tooltip-content",
            className,
          )}
        >
          {popupId && <Describe id={popupId} />}
          {children}
          <TooltipPrimitive.Arrow
            data-slot="tooltip-arrow"
            className="sprout-tooltip-arrow"
          />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}
