'use client';

import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cn, stateClassName } from '../internal/classes.js';
import { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './button.js';

export const alertDialogSizeNames = ['default', 'sm'] as const;

export type AlertDialogSize = (typeof alertDialogSizeNames)[number];

export type AlertDialogProps = AlertDialogPrimitive.Root.Props;

export function AlertDialog(props: AlertDialogProps) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

export type AlertDialogTriggerProps = AlertDialogPrimitive.Trigger.Props;

export function AlertDialogTrigger(props: AlertDialogTriggerProps) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

export type AlertDialogPortalProps = AlertDialogPrimitive.Portal.Props;

export function AlertDialogPortal(props: AlertDialogPortalProps) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

export type AlertDialogOverlayProps = AlertDialogPrimitive.Backdrop.Props;

export function AlertDialogOverlay({ className, ...props }: AlertDialogOverlayProps) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      {...props}
      className={stateClassName<AlertDialogPrimitive.Backdrop.State>('sprout-alert-dialog-overlay', className)}
    />
  );
}

export interface AlertDialogContentProps extends AlertDialogPrimitive.Popup.Props {
  /** `sm` centers the header and splits the footer into two equal buttons. */
  size?: AlertDialogSize;
  /** Where the portal renders. Defaults to `document.body`. */
  container?: AlertDialogPrimitive.Portal.Props['container'];
}

/**
 * The alert dialog surface. It renders its own portal and overlay, so place
 * it directly inside `AlertDialog`.
 */
export function AlertDialogContent({ className, size = 'default', container, ...props }: AlertDialogContentProps) {
  return (
    <AlertDialogPortal container={container}>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        {...props}
        className={stateClassName<AlertDialogPrimitive.Popup.State>('sprout-alert-dialog-content', className)}
      />
    </AlertDialogPortal>
  );
}

type PartSlot = 'alert-dialog-header' | 'alert-dialog-footer' | 'alert-dialog-media';

export interface AlertDialogPartState extends Record<string, unknown> {
  slot: PartSlot;
}

export type AlertDialogPartProps = useRender.ComponentProps<'div', AlertDialogPartState>;

function part(slot: PartSlot, base: string) {
  return function AlertDialogPart({ className, render, ref, ...props }: AlertDialogPartProps) {
    return useRender({
      defaultTagName: 'div',
      ref,
      render,
      props: mergeProps<'div'>({ 'data-slot': slot, className: cn(base, className) } as object, props),
      state: { slot },
    });
  };
}

/**
 * Groups media, title, and description. Centered on narrow screens and in
 * `sm` dialogs; from 640px a `default` dialog aligns it to the start with the
 * media beside the text.
 */
export const AlertDialogHeader = part('alert-dialog-header', 'sprout-alert-dialog-header');

/**
 * A tinted action bar pinned to the bottom edge. Actions stack in reverse
 * order on narrow screens and align right from 640px; `sm` dialogs always
 * split it into two equal columns.
 */
export const AlertDialogFooter = part('alert-dialog-footer', 'sprout-alert-dialog-footer');

/** A 40px tile for an icon above or beside the title. */
export const AlertDialogMedia = part('alert-dialog-media', 'sprout-alert-dialog-media');

export type AlertDialogTitleProps = AlertDialogPrimitive.Title.Props;

export function AlertDialogTitle({ className, ...props }: AlertDialogTitleProps) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      {...props}
      className={stateClassName<AlertDialogPrimitive.Title.State>('sprout-alert-dialog-title', className)}
    />
  );
}

export type AlertDialogDescriptionProps = AlertDialogPrimitive.Description.Props;

export function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      {...props}
      className={stateClassName<AlertDialogPrimitive.Description.State>('sprout-alert-dialog-description', className)}
    />
  );
}

export type AlertDialogActionProps = ButtonProps;

/**
 * The confirming button. It does not close the dialog by itself, so the
 * caller can keep it open while work is pending and close it on success.
 */
export function AlertDialogAction(props: AlertDialogActionProps) {
  return <Button data-slot="alert-dialog-action" {...props} />;
}

export interface AlertDialogCancelProps extends AlertDialogPrimitive.Close.Props {
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
}

/** Closes the dialog. An outline button unless `variant` says otherwise. */
export function AlertDialogCancel({ variant = 'outline', size = 'default', ...props }: AlertDialogCancelProps) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  );
}
