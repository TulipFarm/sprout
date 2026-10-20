'use client';

import { createContext, useContext, useLayoutEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Drawer as SheetPrimitive } from '@base-ui/react/drawer';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { X } from 'reicon-react/icons/X';
import { cn, stateClassName } from '../internal/classes.js';
import { Button } from './button.js';

export const sheetSideNames = ['top', 'right', 'bottom', 'left'] as const;
export const sheetSizeNames = ['default', 'lg', 'xl', 'full'] as const;
export const sheetTitleSizeNames = ['default', 'lg'] as const;

export type SheetSide = (typeof sheetSideNames)[number];
export type SheetSize = (typeof sheetSizeNames)[number];
export type SheetTitleSize = (typeof sheetTitleSizeNames)[number];

const swipeDirections = {
  top: 'up',
  right: 'right',
  bottom: 'down',
  left: 'left',
} as const satisfies Record<SheetSide, SheetPrimitive.Root.Props['swipeDirection']>;

const SheetSideContext = createContext<Dispatch<SetStateAction<SheetSide>> | null>(null);

export type SheetProps = Omit<
  SheetPrimitive.Root.Props,
  'swipeDirection' | 'snapPoints' | 'snapPoint' | 'defaultSnapPoint' | 'onSnapPointChange' | 'snapToSequentialPoints'
>;

/**
 * Groups the parts of a sheet. Touch users can swipe it closed toward the
 * edge set by `SheetContent`'s `side`.
 */
export function Sheet(props: SheetProps) {
  const [side, setSide] = useState<SheetSide>('right');
  return (
    <SheetSideContext.Provider value={setSide}>
      <SheetPrimitive.Root data-slot="sheet" {...props} swipeDirection={swipeDirections[side]} />
    </SheetSideContext.Provider>
  );
}

export type SheetTriggerProps = SheetPrimitive.Trigger.Props;

export function SheetTrigger(props: SheetTriggerProps) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

export type SheetCloseProps = SheetPrimitive.Close.Props;

export function SheetClose(props: SheetCloseProps) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

export type SheetPortalProps = SheetPrimitive.Portal.Props;

export function SheetPortal(props: SheetPortalProps) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

export type SheetOverlayProps = SheetPrimitive.Backdrop.Props;

export function SheetOverlay({ className, ...props }: SheetOverlayProps) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      {...props}
      className={stateClassName<SheetPrimitive.Backdrop.State>('sprout-sheet-overlay', className)}
    />
  );
}

export interface SheetContentProps extends SheetPrimitive.Popup.Props {
  /** The viewport edge the sheet slides in from. Defaults to `"right"`. */
  side?: SheetSide;
  /**
   * Width of a left or right sheet: `default` 24rem, `lg` 32rem, `xl` 42rem.
   * `full` covers the whole viewport from any side.
   */
  size?: SheetSize;
  /** Adds a ghost icon button in the top-right corner. Defaults to `true`. */
  showCloseButton?: boolean;
  /** Accessible name of the corner close button. */
  closeLabel?: string;
  /** Keeps the sheet in the DOM while closed, so drafts and scroll survive. */
  keepMounted?: boolean;
  /** Where the portal renders. Defaults to `document.body`. */
  container?: SheetPrimitive.Portal.Props['container'];
  /** Shows a grab bar on the edge facing the page. Defaults to `false`. */
  showSwipeHandle?: boolean;
}

/**
 * The sliding panel. It renders its own portal and overlay, so place it
 * directly inside `Sheet`. A touch swipe toward `side` closes it. Mouse and pen
 * drags only move it from the handle or empty panel space, so text selection
 * and form fields work as usual.
 */
export function SheetContent({
  className,
  children,
  side = 'right',
  size = 'default',
  showCloseButton = true,
  closeLabel = 'Close',
  keepMounted = false,
  container,
  showSwipeHandle = false,
  ...props
}: SheetContentProps) {
  const setSide = useContext(SheetSideContext);
  // Base UI reads the swipe direction from the root, but `side` lives here.
  useLayoutEffect(() => setSide?.(side), [setSide, side]);
  return (
    <SheetPortal keepMounted={keepMounted} container={container}>
      <SheetOverlay />
      <SheetPrimitive.Viewport data-slot="sheet-viewport" className="sprout-sheet-viewport">
        <SheetPrimitive.Popup
          data-slot="sheet-content"
          data-side={side}
          data-size={size}
          {...props}
          className={stateClassName<SheetPrimitive.Popup.State>('sprout-sheet-content', className)}
        >
          {showSwipeHandle && (
            <div data-slot="sheet-swipe-handle" aria-hidden="true" className="sprout-sheet-swipe-handle" />
          )}
          <SheetPrimitive.Content className="sprout-sheet-inner">{children}</SheetPrimitive.Content>
          {showCloseButton && (
            <SheetPrimitive.Close
              data-slot="sheet-close"
              className="sprout-sheet-close"
              aria-label={closeLabel}
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <X size={16} aria-hidden="true" />
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Popup>
      </SheetPrimitive.Viewport>
    </SheetPortal>
  );
}

type PartSlot = 'sheet-header' | 'sheet-body' | 'sheet-footer';

export interface SheetPartState extends Record<string, unknown> {
  slot: PartSlot;
}

export type SheetPartProps = useRender.ComponentProps<'div', SheetPartState>;

function part(slot: PartSlot, base: string) {
  return function SheetPart({ className, render, ref, ...props }: SheetPartProps) {
    return useRender({
      defaultTagName: 'div',
      ref,
      render,
      props: mergeProps<'div'>({ 'data-slot': slot, className: cn(base, className) } as object, props),
      state: { slot },
    });
  };
}

/** Stacks the title and description with 16px padding. */
export const SheetHeader = part('sheet-header', 'sprout-sheet-header');

/** The scrolling middle. It fills the space between header and footer. */
export const SheetBody = part('sheet-body', 'sprout-sheet-body');

/**
 * Actions pinned to the bottom edge. They stack full width in side sheets and
 * align right in wide top and bottom sheets.
 */
export const SheetFooter = part('sheet-footer', 'sprout-sheet-footer');

export interface SheetTitleProps extends SheetPrimitive.Title.Props {
  /** `lg` is the larger product-page title used in wide detail sheets. */
  size?: SheetTitleSize;
}

export function SheetTitle({ className, size = 'default', ...props }: SheetTitleProps) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      data-size={size}
      {...props}
      className={stateClassName<SheetPrimitive.Title.State>('sprout-sheet-title', className)}
    />
  );
}

export type SheetDescriptionProps = SheetPrimitive.Description.Props;

export function SheetDescription({ className, ...props }: SheetDescriptionProps) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      {...props}
      className={stateClassName<SheetPrimitive.Description.State>('sprout-sheet-description', className)}
    />
  );
}
