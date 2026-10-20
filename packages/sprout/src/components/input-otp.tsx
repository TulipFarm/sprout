'use client';

import { createContext, useContext, useId, type ComponentProps, type ReactNode } from 'react';
import { OTPField } from '@base-ui/react/otp-field';
import { Minus } from 'reicon-react/icons/Minus';
import { cn, stateClassName } from '../internal/classes.js';

export type InputOTPState = OTPField.Root.State;
export type InputOTPSlotState = OTPField.Input.State;

interface InputOTPContextValue {
  length: number;
  labelId: string | undefined;
  invalid: boolean;
}

const InputOTPContext = createContext<InputOTPContextValue | null>(null);

type Invalid = boolean | 'true' | 'false' | 'grammar' | 'spelling';

const isInvalid = (value: Invalid | undefined) => value === true || value === 'true';

export interface InputOTPProps extends Omit<OTPField.Root.Props, 'length' | 'aria-invalid' | 'children'> {
  /** Number of character slots. Matches the slot indexes you render. */
  maxLength: number;
  /** Called with the new code on every edit, paste, or autofill. */
  onChange?: ((value: string) => void) | undefined;
  /** Marks every slot invalid and draws the danger ring on its group. */
  'aria-invalid'?: Invalid | undefined;
  children?: ReactNode;
}

/**
 * A one-time code field on Base UI `OTPField`. Each slot is a real input, so
 * typing, paste, autofill (`autoComplete="one-time-code"`), arrow keys, Home,
 * End, Backspace, and Delete all work. `aria-label` names the whole code and
 * its first slot; later slots are announced as "Character 2 of 6".
 */
export function InputOTP({
  maxLength,
  onChange,
  onValueChange,
  className,
  children,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-invalid': ariaInvalid,
  validationType = 'numeric',
  ...props
}: InputOTPProps) {
  const generated = useId();
  const labelId = ariaLabelledBy ?? (ariaLabel ? `${generated}-label` : undefined);
  const invalid = isInvalid(ariaInvalid);
  return (
    <InputOTPContext.Provider value={{ length: maxLength, labelId, invalid }}>
      <OTPField.Root
        data-slot="input-otp"
        data-invalid={invalid ? '' : undefined}
        length={maxLength}
        validationType={validationType}
        aria-labelledby={labelId}
        onValueChange={(value, details) => {
          onValueChange?.(value, details);
          onChange?.(value);
        }}
        {...props}
        className={stateClassName<InputOTPState>('sprout-input-otp', className)}
      >
        {ariaLabel && !ariaLabelledBy ? (
          <span id={labelId} className="sprout-input-otp-sr-only">
            {ariaLabel}
          </span>
        ) : null}
        {children}
      </OTPField.Root>
    </InputOTPContext.Provider>
  );
}

export type InputOTPGroupProps = ComponentProps<'div'>;

/** Joins adjacent slots into one bordered segment. */
export function InputOTPGroup({ className, ...props }: InputOTPGroupProps) {
  return <div data-slot="input-otp-group" {...props} className={cn('sprout-input-otp-group', className)} />;
}

export interface InputOTPSlotProps extends Omit<OTPField.Input.Props, 'aria-invalid'> {
  /** Zero-based position of this slot in the code. */
  index: number;
  'aria-invalid'?: Invalid | undefined;
}

/**
 * One character of the code. Render slots in index order; Base UI tracks
 * focus and value by their DOM order.
 */
export function InputOTPSlot({
  index,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-invalid': ariaInvalid,
  ...props
}: InputOTPSlotProps) {
  const context = useContext(InputOTPContext);
  const length = context?.length ?? index + 1;
  const invalid = ariaInvalid === undefined ? context?.invalid : isInvalid(ariaInvalid);
  return (
    <OTPField.Input
      data-slot="input-otp-slot"
      data-index={index}
      aria-labelledby={ariaLabelledBy ?? (index === 0 ? context?.labelId : undefined)}
      aria-label={index === 0 ? undefined : (ariaLabel ?? `Character ${index + 1} of ${length}`)}
      aria-invalid={invalid || undefined}
      {...props}
      className={stateClassName<InputOTPSlotState>('sprout-input-otp-slot', className)}
    />
  );
}

export type InputOTPSeparatorProps = ComponentProps<typeof OTPField.Separator>;

/** A dash between slot groups, such as `123–456`. */
export function InputOTPSeparator({ className, children, ...props }: InputOTPSeparatorProps) {
  return (
    <OTPField.Separator
      data-slot="input-otp-separator"
      orientation="vertical"
      {...props}
      className={stateClassName('sprout-input-otp-separator', className)}
    >
      {children ?? <Minus aria-hidden="true" />}
    </OTPField.Separator>
  );
}
