'use client';

import type { Button as BaseButton } from '@base-ui/react/button';
import { useId, type ReactElement } from 'react';
import { cn, stateClassName } from '../internal/classes.js';
import { Pressable } from '../internal/pressable.js';
import { Spinner } from './spinner.js';

export const buttonVariantNames = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link', 'scope'] as const;

export const buttonSizeNames = [
  'default',
  'xs',
  'sm',
  'lg',
  'icon',
  'icon-xs',
  'icon-sm',
  'icon-lg',
  'back',
  'onboarding',
  'bud',
  'bud-labeled',
  'chat-row',
  'task-link',
  'card-title',
  'result-card',
  'calendar-title',
  'calendar',
  'calendar-icon',
  'nav',
  'column-header',
  'column-header-end',
  'table-link',
  'badge',
] as const;

export type ButtonVariant = (typeof buttonVariantNames)[number];
export type ButtonSize = (typeof buttonSizeNames)[number];

export interface ButtonVariantOptions {
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
  className?: string;
}

export function buttonVariants({ variant, size, className }: ButtonVariantOptions = {}) {
  return cn(
    'sprout-button',
    `sprout-button-variant-${variant ?? 'default'}`,
    `sprout-button-size-${size ?? 'default'}`,
    className,
  );
}

export type ButtonBlockerFix =
  /** An element id on this page; scrolled into view and focused (or, when it has no tabindex, its first focusable descendant). */
  | { kind: 'jump'; label: string; target: string }
  /** A link element, such as a router `<Link>`, rendered through Button `render`. */
  | { kind: 'link'; label: string; link: ReactElement }
  | { kind: 'action'; label: string; onClick: () => void };

export type ButtonState =
  | { kind: 'ready' }
  | { kind: 'busy' }
  | { kind: 'blocked'; reason: string; fix?: ButtonBlockerFix | undefined };

export interface ButtonProps extends BaseButton.Props {
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
  /**
   * Wraps the button in `data-slot="button-action"`, which also holds the
   * blocked reason; `className` then styles that wrapper. Busy and blocked
   * stay focusable. Keep passing a state (even `ready`) for the button's
   * lifetime so changing kinds never remounts it.
   */
  state?: ButtonState | undefined;
  /** Replaces the label, with a spinner, while `state` is busy. */
  pendingLabel?: string | undefined;
}

export function Button({ state, pendingLabel, ...props }: ButtonProps) {
  return state ? <StatefulButton state={state} pendingLabel={pendingLabel} {...props} /> : <ButtonElement {...props} />;
}

function ButtonElement({ variant, size, className, ...props }: Omit<ButtonProps, 'state' | 'pendingLabel'>) {
  return (
    <Pressable
      data-slot="button"
      data-variant={variant ?? 'default'}
      data-size={size ?? 'default'}
      {...props}
      className={stateClassName<BaseButton.State>(buttonVariants({ variant, size }), className)}
    />
  );
}

function StatefulButton({ state, pendingLabel, className, children, ...props }: ButtonProps & { state: ButtonState }) {
  const action = useActionControl(state);
  const pending = state.kind === 'busy' && pendingLabel;
  return (
    <div data-slot="button-action" data-state={state.kind} className={cn('sprout-button-action', className)}>
      <ButtonElement {...props} {...action.button} disabled={action.button.disabled || props.disabled}>
        {pending ? (
          <>
            <Spinner aria-hidden="true" />
            {pendingLabel}
          </>
        ) : (
          children
        )}
      </ButtonElement>
      {action.reason}
    </div>
  );
}

export interface ActionGroupItem {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant | undefined;
}

export interface ActionGroupProps {
  /** One state for every action, with one shared reason under the row. */
  state: ButtonState;
  actions: readonly ActionGroupItem[];
  className?: string | undefined;
}

/** A row of actions that share one busy or blocked state and one reason. */
export function ActionGroup({ state, actions, className }: ActionGroupProps) {
  const action = useActionControl(state);
  return (
    <div data-slot="action-group" data-state={state.kind} className={cn('sprout-action-group', className)}>
      <div className="sprout-action-group-row">
        {actions.map(item => (
          <Button key={item.label} variant={item.variant} onClick={item.onClick} {...action.button}>
            {item.label}
          </Button>
        ))}
      </div>
      {action.reason}
    </div>
  );
}

const focusable =
  ':is(a[href], button, input, select, textarea, [tabindex]):not([disabled], [tabindex="-1"], [type="hidden"])';

export function jumpTo(target: string | Element) {
  const element = typeof target === 'string' ? document.getElementById(target) : target;
  if (!element) return;
  const control =
    element.matches(focusable) || element.hasAttribute('tabindex') ? element : element.querySelector(focusable);
  (control ?? element).scrollIntoView({ block: 'center' });
  if (control instanceof HTMLElement) control.focus({ preventScroll: true });
}

/**
 * Busy and blocked actions stay focusable so the reason is reachable.
 * Absent ARIA keys are left out so spreading `button` keeps a caller's own.
 */
export function useActionControl(state: ButtonState) {
  const reasonId = useId();
  return {
    button: {
      disabled: state.kind !== 'ready',
      focusableWhenDisabled: true,
      ...(state.kind === 'busy' && { 'aria-busy': true as const }),
      ...(state.kind === 'blocked' && { 'aria-describedby': reasonId }),
    },
    reason:
      state.kind === 'blocked' ? (
        <p data-slot="action-reason" className="sprout-action-reason">
          <span id={reasonId}>{state.reason}</span>
          {state.fix && <FixButton fix={state.fix} />}
        </p>
      ) : null,
  };
}

function FixButton({ fix }: { fix: ButtonBlockerFix }) {
  if (fix.kind === 'link')
    return (
      <Button variant="link" size="xs" nativeButton={false} render={fix.link}>
        {fix.label}
      </Button>
    );
  return (
    <Button variant="link" size="xs" onClick={fix.kind === 'jump' ? () => jumpTo(fix.target) : fix.onClick}>
      {fix.label}
    </Button>
  );
}
