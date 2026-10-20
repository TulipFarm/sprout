'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { X } from 'reicon-react/icons/X';
import { cn, stateClassName } from '../internal/classes.js';
import { Button } from './button.js';

export const dialogSizeNames = ['default', 'form', 'split', 'fullscreen'] as const;
export const dialogPlacementNames = ['center', 'top'] as const;

export type DialogSize = (typeof dialogSizeNames)[number];
export type DialogPlacement = (typeof dialogPlacementNames)[number];

export type DialogProps = DialogPrimitive.Root.Props;

export function Dialog(props: DialogProps) {
  return <DialogPrimitive.Root {...props} />;
}

export type DialogTriggerProps = DialogPrimitive.Trigger.Props;

export function DialogTrigger(props: DialogTriggerProps) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

export type DialogPortalProps = DialogPrimitive.Portal.Props;

export function DialogPortal(props: DialogPortalProps) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

export type DialogCloseProps = DialogPrimitive.Close.Props;

export function DialogClose(props: DialogCloseProps) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

export type DialogOverlayProps = DialogPrimitive.Backdrop.Props;

export function DialogOverlay({ className, ...props }: DialogOverlayProps) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      {...props}
      className={stateClassName<DialogPrimitive.Backdrop.State>('sprout-dialog-overlay', className)}
    />
  );
}

export interface DialogContentProps extends DialogPrimitive.Popup.Props {
  /** Adds a ghost icon button in the top-right corner. Defaults to `true`. */
  showCloseButton?: boolean;
  /** Accessible name of the corner close button. */
  closeLabel?: string;
  size?: DialogSize;
  /** `top` pins the dialog near the top of the viewport for search and command palettes. */
  placement?: DialogPlacement;
  /** Where the portal renders. Defaults to `document.body`. */
  container?: DialogPrimitive.Portal.Props['container'];
}

/**
 * The dialog surface. It renders its own portal and overlay, so place it
 * directly inside `Dialog`.
 */
export function DialogContent({
  className,
  children,
  showCloseButton = true,
  closeLabel = 'Close',
  size = 'default',
  placement = 'center',
  container,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal container={container}>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-size={size}
        data-placement={size === 'fullscreen' ? undefined : placement}
        {...props}
        className={stateClassName<DialogPrimitive.Popup.State>(
          cn('sprout-dialog-content', `sprout-dialog-${size}`),
          className,
        )}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="sprout-dialog-close"
            aria-label={closeLabel}
            render={<Button variant="ghost" size="icon-sm" />}
          >
            <X size={16} aria-hidden="true" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

type PartSlot = 'dialog-header' | 'dialog-body';

export interface DialogPartState extends Record<string, unknown> {
  slot: PartSlot | 'dialog-footer';
}

export type DialogPartProps = useRender.ComponentProps<'div', DialogPartState>;

function part(slot: PartSlot, base: string) {
  return function DialogPart({ className, render, ref, ...props }: DialogPartProps) {
    return useRender({
      defaultTagName: 'div',
      ref,
      render,
      props: mergeProps<'div'>({ 'data-slot': slot, className: cn(base, className) } as object, props),
      state: { slot },
    });
  };
}

/** Stacks the title and description. */
export const DialogHeader = part('dialog-header', 'sprout-dialog-header');

/**
 * The scrolling middle of a `form` dialog. It bleeds to the dialog edges so
 * scrollbars and focus rings are not clipped.
 */
export const DialogBody = part('dialog-body', 'sprout-dialog-body');

export interface DialogFooterProps extends DialogPartProps {
  /** Appends an outline Close button after the other actions. */
  showCloseButton?: boolean;
  closeLabel?: string;
}

/**
 * A tinted action bar pinned to the bottom edge. Actions stack in reverse
 * order on narrow screens and align right from 640px. A leading `<p>` becomes
 * a hint that sits at the start.
 */
export function DialogFooter({
  className,
  render,
  ref,
  showCloseButton = false,
  closeLabel = 'Close',
  children,
  ...props
}: DialogFooterProps) {
  return useRender({
    defaultTagName: 'div',
    ref,
    render,
    props: mergeProps<'div'>(
      {
        'data-slot': 'dialog-footer',
        className: cn('sprout-dialog-footer', className),
        children: (
          <>
            {children}
            {showCloseButton && (
              <DialogPrimitive.Close render={<Button variant="outline" />}>{closeLabel}</DialogPrimitive.Close>
            )}
          </>
        ),
      } as object,
      props,
    ),
    state: { slot: 'dialog-footer' },
  });
}

export type DialogTitleProps = DialogPrimitive.Title.Props;

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      {...props}
      className={stateClassName<DialogPrimitive.Title.State>('sprout-dialog-title', className)}
    />
  );
}

export type DialogDescriptionProps = DialogPrimitive.Description.Props;

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      {...props}
      className={stateClassName<DialogPrimitive.Description.State>('sprout-dialog-description', className)}
    />
  );
}
