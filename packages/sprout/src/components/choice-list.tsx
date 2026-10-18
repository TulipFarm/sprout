"use client";

import { useId, type ReactNode } from "react";
import { Check } from "reicon-react/icons/Check";
import { HelpCircle } from "reicon-react/icons/HelpCircle";
import { cn } from "../internal/classes.js";
import { Badge } from "./badge.js";

export const choiceListLayoutNames = ["stacked", "compact"] as const;

export type ChoiceListLayout = (typeof choiceListLayoutNames)[number];

export interface ChoiceListOption {
  id: string;
  label: string;
  /** Shows a "Recommended" badge. A label ending in "(Recommended)" does the same. */
  recommended?: boolean | undefined;
}

export interface ChoiceListTextOption {
  value: string;
  /** True while the typed answer is the chosen one. */
  active: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  /** Id of the answer box, for an "Other answer" toggle's `aria-controls`. */
  id?: string | undefined;
  error: string | null;
  label?: string | undefined;
  placeholder?: string | undefined;
}

export interface ChoiceListProps {
  legend: string;
  options: readonly ChoiceListOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  /** Checkboxes instead of radios. */
  multiple?: boolean | undefined;
  disabled?: boolean | undefined;
  error?: string | undefined;
  /**
   * `stacked` draws bordered rows with radio or checkbox marks. `compact`
   * draws numbered rows in a scrolling list, for questions inside a chat.
   */
  layout?: ChoiceListLayout | undefined;
  /** A free-text answer after the options. Compact lists show it only while active. */
  textOption?: ChoiceListTextOption | undefined;
  className?: string | undefined;
}

const recommendedSuffix = /\s*\(recommended\)\s*$/i;

/**
 * A fieldset of radio or checkbox rows for answering a question, with an
 * optional typed answer. Value is always an array of option ids.
 */
export function ChoiceList({
  legend,
  options,
  value,
  onChange,
  multiple = false,
  disabled = false,
  error,
  layout = "stacked",
  textOption,
  className,
}: ChoiceListProps) {
  const name = useId();
  const compact = layout === "compact";
  const errorId = `${name}-choices-error`;
  const textId = `${name}-text`;
  const textErrorId = `${name}-text-error`;
  return (
    <fieldset
      data-slot="choice-list"
      data-layout={layout}
      data-multiple={multiple || undefined}
      disabled={disabled}
      className={cn("sprout-choice-list", className)}
    >
      <legend
        className={
          compact && !multiple
            ? "sprout-choice-list-sr-only"
            : "sprout-choice-list-legend"
        }
      >
        {legend}
      </legend>
      <div
        data-slot="choice-list-options"
        className="sprout-choice-list-options"
      >
        {options.map((option, index) => {
          const checked = value.includes(option.id);
          const recommended =
            option.recommended === true || recommendedSuffix.test(option.label);
          const label = option.label.replace(recommendedSuffix, "");
          return (
            <label
              key={option.id}
              data-slot="choice-list-option"
              data-checked={checked || undefined}
              data-disabled={disabled || undefined}
              data-recommended={recommended || undefined}
              className="sprout-choice-list-option"
            >
              <input
                type={multiple ? "checkbox" : "radio"}
                name={name}
                value={option.id}
                checked={checked}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                onChange={(event) =>
                  onChange(
                    multiple
                      ? event.target.checked
                        ? [...value, option.id]
                        : value.filter((id) => id !== option.id)
                      : [option.id],
                  )
                }
                className="sprout-choice-list-input"
              />
              <span aria-hidden="true" className="sprout-choice-list-mark">
                {checked ? <Check /> : compact ? index + 1 : null}
              </span>
              <span className="sprout-choice-list-label">
                {label}
                {recommended && (
                  <Badge variant="info" className="sprout-choice-list-badge">
                    Recommended
                  </Badge>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="sprout-choice-list-error">
          {error}
        </p>
      )}
      {textOption && (!compact || textOption.active) && (
        <div
          id={textOption.id ?? `${name}-custom`}
          data-slot="choice-list-text"
          data-checked={textOption.active || undefined}
          data-invalid={textOption.error ? true : undefined}
          className="sprout-choice-list-text"
        >
          <span aria-hidden="true" className="sprout-choice-list-mark">
            {textOption.active && <Check />}
          </span>
          <div className="sprout-choice-list-text-body">
            <label htmlFor={textId} className="sprout-choice-list-text-label">
              {textOption.label ?? "Your answer"}
            </label>
            <textarea
              id={textId}
              autoFocus={compact}
              rows={1}
              value={textOption.value}
              disabled={disabled}
              placeholder={textOption.placeholder ?? "Type a different answer…"}
              aria-describedby={textOption.error ? textErrorId : undefined}
              aria-invalid={textOption.error ? true : undefined}
              onFocus={textOption.onFocus}
              onChange={(event) => textOption.onChange(event.target.value)}
              className="sprout-choice-list-textarea"
            />
            {textOption.error && (
              <p
                id={textErrorId}
                role="alert"
                className="sprout-choice-list-error"
              >
                {textOption.error}
              </p>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
}

export interface ChoiceSummaryProps {
  prompt: string;
  /** The recorded answer. Omit it when the question expired or was cancelled. */
  answer?: string | undefined;
  className?: string | undefined;
  children?: ReactNode;
}

/** One line that shows a question and its recorded answer. */
export function ChoiceSummary({
  prompt,
  answer,
  className,
  children,
}: ChoiceSummaryProps) {
  return (
    <div
      data-slot="choice-summary"
      className={cn("sprout-choice-summary", className)}
    >
      <HelpCircle aria-hidden="true" className="sprout-choice-summary-icon" />
      <span className="sprout-choice-summary-prompt">{prompt}</span>
      {answer && (
        <span className="sprout-choice-summary-answer">
          <Check aria-hidden="true" className="sprout-choice-summary-check" />
          <span className="sprout-choice-summary-answer-text">{answer}</span>
        </span>
      )}
      {children}
    </div>
  );
}
