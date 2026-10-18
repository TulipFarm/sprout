"use client";

import {
  createContext,
  useContext,
  useId,
  type AriaAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check } from "reicon-react/icons/Check";
import { cn } from "../internal/classes.js";
import { Badge } from "./badge.js";
import { RadioGroup, RadioGroupItem } from "./radio-group.js";
import { Separator, type SeparatorLabelProps } from "./separator.js";

export const fieldLabelVisibilityNames = ["visible", "screen-reader"] as const;
export const choiceGroupTypeNames = ["checkbox", "radio"] as const;
export const choiceGroupLayoutNames = ["list", "columns"] as const;
export const checkboxFieldVariantNames = ["default", "neutral"] as const;

export type FieldLabelVisibility = (typeof fieldLabelVisibilityNames)[number];
export type ChoiceGroupType = (typeof choiceGroupTypeNames)[number];
export type ChoiceGroupLayout = (typeof choiceGroupLayoutNames)[number];
export type CheckboxFieldVariant = (typeof checkboxFieldVariantNames)[number];

/** Every field states whether it is required or optional; there is no default. */
export type Requirement =
  { required: true; optional?: never } | { optional: true; required?: never };

/**
 * Locks every Field, ChoiceGroup, and CheckboxField below it. Render it as a
 * provider: `<FieldsDisabled value={saving}>…</FieldsDisabled>`.
 */
export const FieldsDisabled = createContext(false);

interface FieldControl {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
  disabled: boolean;
}

const FieldControlContext = createContext<FieldControl | null>(null);

export interface FieldControlProps {
  id?: string | undefined;
  disabled?: boolean | undefined;
  "aria-describedby"?: string | undefined;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
  "aria-required"?: AriaAttributes["aria-required"];
  "aria-label"?: string | undefined;
  "aria-labelledby"?: string | undefined;
}

/**
 * Connects a control to the Field around it. Pass the control's props; it
 * returns them with the field's id, disabled state, description ids, and
 * invalid and required flags merged in. Outside a Field, or when the control
 * names itself with `aria-label` or `aria-labelledby`, props pass through.
 */
export function useFieldControl<P extends FieldControlProps>(props: P): P {
  const field = useContext(FieldControlContext);
  if (
    !field ||
    props["aria-label"] !== undefined ||
    props["aria-labelledby"] !== undefined
  )
    return props;
  return {
    ...props,
    id: field.id,
    disabled: field.disabled || props.disabled,
    "aria-describedby": ids(field.describedBy, props["aria-describedby"]),
    "aria-invalid": field.invalid || props["aria-invalid"],
    "aria-required": field.required || props["aria-required"],
  };
}

// Deduped so a control that applies useFieldControl twice keeps one copy of each id.
function ids(...values: (string | false | undefined)[]) {
  const tokens = values.flatMap((value) => (value ? value.split(/\s+/) : []));
  return [...new Set(tokens.filter(Boolean))].join(" ") || undefined;
}

function RequirementMarker({
  required,
  id,
}: {
  required: boolean;
  id: string | undefined;
}) {
  return (
    <span
      id={id}
      aria-hidden={id ? undefined : true}
      data-slot="requirement"
      className="sprout-field-requirement"
    >
      {required ? "Required" : "Optional"}
    </span>
  );
}

export type FieldProps = Requirement & {
  label: string;
  /** `screen-reader` keeps the label, marker, and counter for assistive tech only. */
  labelVisibility?: FieldLabelVisibility | undefined;
  helper?: ReactNode;
  /** Replaces the helper line and marks the control invalid. */
  error?: string | undefined;
  /** Short status at the end of the label row, such as `120 / 8,000`. */
  counter?: string | undefined;
  /** The control id. Generated when omitted. */
  id?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  /** One control, or one element that contains it. The control reads the field with `useFieldControl`. */
  children: ReactElement;
};

/**
 * A labeled form row for one control: label, required or optional marker,
 * optional counter, the control, and a helper or error line.
 */
export function Field({
  label,
  labelVisibility = "visible",
  helper,
  error,
  counter,
  id,
  disabled,
  required,
  className,
  children,
}: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const locked = useContext(FieldsDisabled) || disabled === true;
  const lineId = error
    ? `${controlId}-error`
    : helper
      ? `${controlId}-helper`
      : undefined;
  const markerId = required ? undefined : `${controlId}-requirement`;
  const counterId = counter ? `${controlId}-counter` : undefined;
  const control: FieldControl = {
    id: controlId,
    describedBy: ids(lineId, markerId, counterId),
    invalid: Boolean(error),
    required: required === true,
    disabled: locked,
  };
  return (
    <div
      data-slot="field"
      data-disabled={locked || undefined}
      data-invalid={error ? true : undefined}
      className={cn("sprout-field", className)}
    >
      <div
        data-slot="field-header"
        className={
          labelVisibility === "screen-reader"
            ? "sprout-field-sr-only"
            : "sprout-field-header"
        }
      >
        <div className="sprout-field-heading">
          <label
            data-slot="label"
            htmlFor={controlId}
            className="sprout-field-label"
          >
            {label}
          </label>
          <RequirementMarker required={required === true} id={markerId} />
        </div>
        {counter && (
          <p
            id={counterId}
            data-slot="field-counter"
            className="sprout-field-counter"
          >
            {counter}
          </p>
        )}
      </div>
      <FieldControlContext value={control}>{children}</FieldControlContext>
      {error ? (
        <p
          id={lineId}
          data-slot="field-error"
          className="sprout-field-message sprout-field-error"
        >
          {error}
        </p>
      ) : helper ? (
        <p
          id={lineId}
          data-slot="field-helper"
          className="sprout-field-message"
        >
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function FieldCheckbox({
  variant = "default",
  className,
  ...props
}: BaseCheckbox.Root.Props & { variant?: CheckboxFieldVariant | undefined }) {
  return (
    <BaseCheckbox.Root
      data-slot="checkbox"
      data-variant={variant}
      className={cn("sprout-field-checkbox", className)}
      {...props}
    >
      <BaseCheckbox.Indicator
        data-slot="checkbox-indicator"
        className="sprout-field-checkbox-indicator"
      >
        <Check aria-hidden="true" />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}

export interface ChoiceOption<V extends string> {
  value: V;
  label: string;
  description?: string | undefined;
  disabled?: boolean | undefined;
}

export type ChoiceGroupProps<V extends string> = Requirement & {
  legend: string;
  legendVisibility?: FieldLabelVisibility | undefined;
  helper?: ReactNode;
  error?: string | undefined;
  /** A warning badge after the legend, such as "Changes data". */
  warning?: string | undefined;
  options: readonly ChoiceOption<V>[];
  /** `columns` splits options into two columns from 640px. */
  layout?: ChoiceGroupLayout | undefined;
  disabled?: boolean | undefined;
  /** The group id. Generated when omitted. */
  id?: string | undefined;
  className?: string | undefined;
} & (
    | {
        type: "checkbox";
        value: readonly V[];
        onValueChange: (value: V[]) => void;
      }
    | { type: "radio"; value: V; onValueChange: (value: V) => void }
  );

/**
 * A labeled set of checkboxes (many values) or radios (one value), with
 * optional descriptions per option, a helper, a warning badge, and an error.
 */
export function ChoiceGroup<V extends string>(props: ChoiceGroupProps<V>) {
  const {
    legend,
    legendVisibility = "visible",
    helper,
    error,
    warning,
    options,
    layout = "list",
    required,
    className,
  } = props;
  const generatedId = useId();
  const groupId = props.id ?? generatedId;
  const locked = useContext(FieldsDisabled) || props.disabled === true;
  const radio = props.type === "radio";
  const legendId = `${groupId}-legend`;
  const errorId = error ? `${groupId}-error` : undefined;
  const helperId = helper ? `${groupId}-helper` : undefined;
  // A radiogroup carries aria-required; a checkbox group cannot, so it describes its marker either way.
  const markerId = radio && required ? undefined : `${groupId}-requirement`;
  const labelling = {
    id: groupId,
    "aria-labelledby": legendId,
    "aria-describedby": ids(errorId, helperId, markerId),
  };

  const rows = options.map((option, index) => {
    const checked =
      props.type === "checkbox"
        ? props.value.includes(option.value)
        : props.value === option.value;
    const disabled = locked || option.disabled === true;
    const descriptionId = option.description
      ? `${groupId}-option-${index}-description`
      : undefined;
    let control: ReactElement;
    if (props.type === "checkbox") {
      const { value, onValueChange } = props;
      control = (
        <FieldCheckbox
          checked={checked}
          disabled={disabled}
          aria-describedby={descriptionId}
          aria-invalid={error ? true : undefined}
          onCheckedChange={(next) =>
            onValueChange(
              next
                ? [...value, option.value]
                : value.filter((item) => item !== option.value),
            )
          }
        />
      );
    } else {
      control = (
        <RadioGroupItem
          className="sprout-field-radio"
          value={option.value}
          disabled={disabled}
          aria-describedby={descriptionId}
        />
      );
    }
    return (
      <div
        key={option.value}
        data-slot="choice-option"
        data-checked={checked || undefined}
        data-disabled={disabled || undefined}
        className="sprout-choice-option"
      >
        <label className="sprout-choice-option-label">
          {control}
          <span className="sprout-choice-option-text">{option.label}</span>
        </label>
        {option.description && (
          <p id={descriptionId} className="sprout-choice-option-description">
            {option.description}
          </p>
        )}
      </div>
    );
  });

  const content = (
    <>
      <div
        className={
          legendVisibility === "screen-reader"
            ? "sprout-field-sr-only"
            : "sprout-choice-group-legend"
        }
      >
        <p id={legendId} className="sprout-choice-group-legend-text">
          {legend}
        </p>
        <RequirementMarker required={required === true} id={markerId} />
        {warning && <Badge variant="warning">{warning}</Badge>}
      </div>
      {helper && (
        <p id={helperId} className="sprout-field-message">
          {helper}
        </p>
      )}
      <div
        data-slot="choice-group-options"
        data-layout={layout}
        className="sprout-choice-group-options"
      >
        {rows}
      </div>
      {error && (
        <p id={errorId} className="sprout-field-message sprout-field-error">
          {error}
        </p>
      )}
    </>
  );

  const classes = cn("sprout-choice-group", className);
  if (props.type === "radio") {
    const { onValueChange } = props;
    return (
      <RadioGroup
        data-slot="choice-group"
        data-type="radio"
        className={classes}
        value={props.value}
        disabled={locked}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        {...labelling}
        onValueChange={(next) => {
          const option = options.find((item) => item.value === next);
          if (option) onValueChange(option.value);
        }}
      >
        {content}
      </RadioGroup>
    );
  }
  return (
    <div
      role="group"
      data-slot="choice-group"
      data-type="checkbox"
      data-disabled={locked || undefined}
      className={classes}
      {...labelling}
    >
      {content}
    </div>
  );
}

export interface CheckboxFieldProps {
  label: string;
  helper?: ReactNode;
  error?: string | undefined;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean | undefined;
  /** `neutral` fills with the text color instead of the brand primary, for filter lists. */
  variant?: CheckboxFieldVariant | undefined;
  /** Placed on the wrapper, so focusing the first control inside it focuses the checkbox. */
  id?: string | undefined;
  className?: string | undefined;
}

/** One checkbox with its label and a helper or error line, for consent and on/off settings. */
export function CheckboxField({
  label,
  helper,
  error,
  checked,
  onCheckedChange,
  disabled,
  id,
  variant,
  className,
}: CheckboxFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const locked = useContext(FieldsDisabled) || disabled === true;
  const lineId = error
    ? `${fieldId}-error`
    : helper
      ? `${fieldId}-helper`
      : undefined;
  return (
    <div
      id={fieldId}
      data-slot="checkbox-field"
      data-disabled={locked || undefined}
      className={cn("sprout-checkbox-field", className)}
    >
      <label className="sprout-checkbox-field-label">
        <FieldCheckbox
          variant={variant}
          checked={checked}
          disabled={locked}
          aria-describedby={lineId}
          aria-invalid={error ? true : undefined}
          onCheckedChange={(next) => onCheckedChange(next)}
        />
        <span className="sprout-checkbox-field-text">{label}</span>
      </label>
      {error ? (
        <p
          id={lineId}
          className="sprout-field-message sprout-field-error sprout-checkbox-field-message"
        >
          {error}
        </p>
      ) : helper ? (
        <p
          id={lineId}
          className="sprout-field-message sprout-checkbox-field-message"
        >
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export type FieldSeparatorProps = Omit<
  SeparatorLabelProps,
  "variant" | "children"
> & {
  children?: SeparatorLabelProps["children"];
};

/**
 * A labeled separator sized for a field stack: it pulls in the stack gap so
 * the line sits evenly between fields. Text such as "or" is optional.
 */
export function FieldSeparator({
  className,
  children = null,
  ...props
}: FieldSeparatorProps) {
  return (
    <Separator
      data-slot="field-separator"
      className={cn("sprout-field-separator", className)}
      {...props}
    >
      {children}
    </Separator>
  );
}
