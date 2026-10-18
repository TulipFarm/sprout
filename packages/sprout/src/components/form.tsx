"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "../internal/classes.js";
import { Alert } from "./alert.js";
import { Badge } from "./badge.js";
import {
  Button,
  jumpTo,
  useActionControl,
  type ButtonBlockerFix as ActionBlockerFix,
  type ButtonState as ActionControlState,
} from "./button.js";
import { FieldsDisabled } from "./field.js";

export const formFooterLayoutNames = ["bar", "stack", "compact"] as const;
export const formSectionLevelNames = [2, 3] as const;

export type FormFooterLayout = (typeof formFooterLayoutNames)[number];
export type FormSectionLevel = (typeof formSectionLevelNames)[number];
export type FormBlockerFix = ActionBlockerFix;
/** `blocked` keeps the submit focusable and shows the reason, with an optional fix, under the buttons. */
export type FormActionState = ActionControlState;

export interface FormProps {
  id?: string | undefined;
  /** Locks every Field, ChoiceGroup, and CheckboxField inside. */
  disabled?: boolean | undefined;
  /** Return `"invalid"` after revealing errors; Form then focuses the first invalid control. */
  onSubmit: () => "invalid" | void;
  /** The form's accessible name. */
  label?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/**
 * A `noValidate` form that prevents the native submit, locks the fields inside
 * while `disabled`, and moves focus to the first invalid control after a
 * failed submit.
 */
export function Form({
  id,
  disabled = false,
  onSubmit,
  label,
  className,
  children,
}: FormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [failedSubmits, setFailedSubmits] = useState(0);
  useEffect(() => {
    const invalid =
      failedSubmits > 0
        ? formRef.current?.querySelector('[aria-invalid="true"]')
        : null;
    if (invalid) jumpTo(invalid);
  }, [failedSubmits]);
  return (
    <FieldsDisabled value={disabled}>
      <form
        id={id}
        ref={formRef}
        data-slot="form"
        noValidate
        aria-label={label}
        className={cn("sprout-form", className)}
        onSubmit={(event) => {
          event.preventDefault();
          if (onSubmit() === "invalid") setFailedSubmits((count) => count + 1);
        }}
      >
        {children}
      </form>
    </FieldsDisabled>
  );
}

export interface FormSectionProps {
  title: string;
  description?: string | undefined;
  /** A short count or status badge beside the title, such as `3 / 20`. */
  meta?: string | undefined;
  /** Region name override; the title names the region otherwise. */
  label?: string | undefined;
  id?: string | undefined;
  level?: FormSectionLevel | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/** A bordered, named region of a form with a title, description, and optional meta badge. */
export function FormSection({
  title,
  description,
  meta,
  label,
  id,
  level = 2,
  className,
  children,
}: FormSectionProps) {
  const Heading = level === 3 ? "h3" : "h2";
  return (
    <section
      id={id}
      data-slot="form-section"
      aria-label={label ?? title}
      className={cn("sprout-form-section", className)}
    >
      <div className="sprout-form-section-header">
        <div className="sprout-form-section-text">
          <Heading className="sprout-form-section-title">{title}</Heading>
          {description && (
            <p className="sprout-form-section-description">{description}</p>
          )}
        </div>
        {meta && <Badge variant="secondary">{meta}</Badge>}
      </div>
      <div className="sprout-form-section-content">{children}</div>
    </section>
  );
}

export type FormCancel =
  /** Shown only while the form is dirty and not busy. */
  | { kind: "reset"; label: string; onReset: () => void }
  /** A link element, such as a router `<Link>`, rendered through Button `render`. */
  | { kind: "leave"; label: string; link: ReactElement };

export interface FormFooterSubmit {
  label: string;
  pendingLabel: string;
  state: FormActionState;
}

export interface FormFooterSecondarySubmit {
  label: string;
  disabled: boolean;
  onSelect: () => void;
}

export interface FormFooterProps {
  /** The id of the form to submit, for a footer rendered outside it. */
  form?: string | undefined;
  /** Replaces the unsaved-changes and note status on the left of `bar` and `compact`. */
  summary?: ReactNode;
  submit: FormFooterSubmit;
  /** An outline submit beside the main one, such as Save draft. */
  secondarySubmit?: FormFooterSecondarySubmit | undefined;
  dirty: boolean;
  cancel?: FormCancel | undefined;
  note?: string | undefined;
  error?: string | undefined;
  /** `bar` sits under a divider, `stack` gives full-width large buttons, `compact` fits cards and chat. */
  layout?: FormFooterLayout | undefined;
  className?: string | undefined;
  /** Extra actions beside the buttons in `compact`; feedback below the footer otherwise. */
  children?: ReactNode;
}

/**
 * The save area of a form: the submit with busy and blocked states, an
 * optional secondary submit and cancel, an unsaved-changes line, a note, and
 * an error alert.
 */
export function FormFooter({
  form,
  summary,
  submit,
  secondarySubmit,
  dirty,
  cancel,
  note,
  error,
  layout = "bar",
  className,
  children,
}: FormFooterProps) {
  const action = useActionControl(submit.state);
  const stack = layout === "stack";
  const compact = layout === "compact";
  const size = stack ? "lg" : "default";
  const wide = stack ? "sprout-form-footer-wide" : undefined;
  const save = (
    <Button
      type="submit"
      form={form}
      size={size}
      className={wide}
      {...action.button}
    >
      {submit.state.kind === "busy" ? submit.pendingLabel : submit.label}
    </Button>
  );
  const secondary = secondarySubmit && (
    <Button
      type="submit"
      form={form}
      size={size}
      variant="outline"
      className={wide}
      disabled={secondarySubmit.disabled}
      onClick={secondarySubmit.onSelect}
    >
      {secondarySubmit.label}
    </Button>
  );
  const cancelButton = !cancel ? null : cancel.kind === "leave" ? (
    <Button
      variant="outline"
      size={size}
      className={wide}
      nativeButton={false}
      render={cancel.link}
    >
      {cancel.label}
    </Button>
  ) : dirty && submit.state.kind !== "busy" ? (
    <Button
      variant="outline"
      size={size}
      className={wide}
      onClick={cancel.onReset}
    >
      {cancel.label}
    </Button>
  ) : null;
  const status = (
    <>
      {dirty && (
        <p className="sprout-form-footer-dirty">
          <span aria-hidden="true" className="sprout-form-footer-dirty-dot" />
          Unsaved changes
        </p>
      )}
      {note && <p className="sprout-form-footer-note">{note}</p>}
    </>
  );
  return (
    <div
      data-slot="form-footer"
      data-layout={layout}
      className={cn("sprout-form-footer", className)}
    >
      {stack ? (
        <>
          {status}
          <div className="sprout-form-footer-stack">
            {save}
            {secondary}
            {cancelButton}
          </div>
        </>
      ) : (
        <div className="sprout-form-footer-row">
          <div
            className={
              compact && !summary
                ? "sprout-form-footer-sr-only"
                : "sprout-form-footer-status"
            }
          >
            {summary ?? status}
          </div>
          <div className="sprout-form-footer-actions">
            {compact && children}
            {cancelButton}
            {secondary}
            {save}
          </div>
        </div>
      )}
      {action.reason}
      {error && <Alert variant="destructive">{error}</Alert>}
      {!compact && children}
    </div>
  );
}
