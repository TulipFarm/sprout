'use client';

import type { ReactNode } from 'react';
import { Toast as ToastPrimitive } from '@base-ui/react/toast';
import { CheckCircle } from 'reicon-react/icons/CheckCircle';
import { Danger } from 'reicon-react/icons/Danger';
import { XCircle } from 'reicon-react/icons/XCircle';
import { InfoCircle } from 'reicon-react/icons/InfoCircle';
import { X } from 'reicon-react/icons/X';
import { stateClassName } from '../internal/classes.js';
import { Button } from './button.js';
import { Spinner } from './spinner.js';

/** Toast types that `Toaster` gives an icon. Any other `type` shows no icon. */
export const toastTypeNames = ['success', 'error', 'warning', 'info', 'loading'] as const;

export type ToastType = (typeof toastTypeNames)[number];

export type ToastManager = ReturnType<typeof ToastPrimitive.createToastManager>;

/** Makes a toast manager you can call from anywhere, inside or outside React. */
export const createToastManager = ToastPrimitive.createToastManager;

/** Reads the nearest provider's toasts and its `add`, `update`, `close`, and `promise`. */
export const useToastManager = ToastPrimitive.useToastManager;

/** The shared manager that `Toaster` uses when you don't pass one. */
export const toast: ToastManager = createToastManager();

export type ToastProviderProps = ToastPrimitive.Provider.Props;

export function ToastProvider(props: ToastProviderProps) {
  return <ToastPrimitive.Provider {...props} />;
}

export type ToastPortalProps = ToastPrimitive.Portal.Props;

export function ToastPortal(props: ToastPortalProps) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />;
}

export type ToastViewportProps = ToastPrimitive.Viewport.Props;

/** The fixed region in the bottom corner that stacks toasts. Press F6 to focus it. */
export function ToastViewport({ className, ...props }: ToastViewportProps) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      {...props}
      className={stateClassName<ToastPrimitive.Viewport.State>('sprout-toast-viewport', className)}
    />
  );
}

export type ToastProps = ToastPrimitive.Root.Props;

/** One toast in the stack. Pass the `toast` object from `useToastManager().toasts`. */
export function Toast({ className, ...props }: ToastProps) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      {...props}
      className={stateClassName<ToastPrimitive.Root.State>('sprout-toast', className)}
    />
  );
}

export type ToastContentProps = ToastPrimitive.Content.Props;

export function ToastContent({ className, ...props }: ToastContentProps) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      {...props}
      className={stateClassName<ToastPrimitive.Content.State>('sprout-toast-content', className)}
    />
  );
}

export type ToastTitleProps = ToastPrimitive.Title.Props;

export function ToastTitle({ className, ...props }: ToastTitleProps) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      {...props}
      className={stateClassName<ToastPrimitive.Title.State>('sprout-toast-title', className)}
    />
  );
}

export type ToastDescriptionProps = ToastPrimitive.Description.Props;

export function ToastDescription({ className, ...props }: ToastDescriptionProps) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      {...props}
      className={stateClassName<ToastPrimitive.Description.State>('sprout-toast-description', className)}
    />
  );
}

export type ToastActionProps = ToastPrimitive.Action.Props;

/**
 * A small outline button. It renders only when it has children, either its
 * own or the toast's `actionProps.children`.
 */
export function ToastAction({
  className,
  render = <Button variant="outline" size="sm" />,
  ...props
}: ToastActionProps) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      {...props}
      className={stateClassName<ToastPrimitive.Action.State>('sprout-toast-action', className)}
    />
  );
}

export type ToastCloseProps = ToastPrimitive.Close.Props;

/** A ghost icon button labeled "Close toast". Its hit area extends 8px past the icon. */
export function ToastClose({
  className,
  children,
  render = <Button variant="ghost" size="icon-sm" />,
  ...props
}: ToastCloseProps) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Close toast"
      render={render}
      {...props}
      className={stateClassName<ToastPrimitive.Close.State>('sprout-toast-close', className)}
    >
      {children ?? <X aria-hidden="true" />}
    </ToastPrimitive.Close>
  );
}

const toastIcons: Record<ToastType, ReactNode> = {
  success: <CheckCircle aria-hidden="true" />,
  info: <InfoCircle aria-hidden="true" />,
  warning: <Danger aria-hidden="true" />,
  error: <XCircle aria-hidden="true" />,
  loading: <Spinner aria-hidden="true" />,
};

function ToastIcon({ type }: { type: string | undefined }) {
  const icon = type && type in toastIcons ? toastIcons[type as ToastType] : null;
  if (!icon) return null;
  return (
    <span data-slot="toast-icon" data-type={type} className="sprout-toast-icon">
      {icon}
    </span>
  );
}

function ToastList() {
  const { toasts } = useToastManager();
  return toasts.map(item => (
    <Toast key={item.id} toast={item}>
      <ToastContent>
        <ToastIcon type={item.type} />
        <div className="sprout-toast-text">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastAction />
        <ToastClose />
      </ToastContent>
    </Toast>
  ));
}

export interface ToasterProps extends ToastProviderProps {
  /** Defaults to the shared `toast` manager. Pass your own to isolate a region. */
  toastManager?: ToastProviderProps['toastManager'];
}

/**
 * A provider with a ready-made viewport. Each toast shows an icon for its
 * `type`, its title and description, an optional action, and a close button.
 */
export function Toaster({ children, toastManager = toast, ...props }: ToasterProps) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}
