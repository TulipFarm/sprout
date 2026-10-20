'use client';

import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { cn } from '../internal/classes.js';
import { Badge, type BadgeVariant } from './badge.js';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible.js';

export const reviewCardBadgeVariantNames = [
  'default',
  'success',
  'warning',
  'info',
  'secondary',
  'destructive',
  'outline',
] as const satisfies readonly BadgeVariant[];

export type ReviewCardBadgeVariant = (typeof reviewCardBadgeVariantNames)[number];

export type ReviewCardBadge = {
  label: string;
  variant: ReviewCardBadgeVariant;
};

export interface ReviewCardProps extends Omit<ComponentProps<'section'>, 'title' | 'children'> {
  /** A 14–16px icon shown in a tile before the title. */
  icon: ReactNode;
  title: string;
  badge: ReviewCardBadge;
  /**
   * A decided review. It folds to its header and footer, and folds again
   * whenever `settled` turns true. People can still open it to read it.
   */
  settled?: boolean | undefined;
  /** Footer content that stays visible when folded, such as the outcome. */
  status?: ReactNode;
  /** Decision buttons in the footer. Hidden while the card is folded. */
  actions?: ReactNode;
  /** The review itself: text, `ReviewRows`, `ReviewSteps`, and controls. */
  children?: ReactNode;
  /** Names the card, such as “Review row change”. Defaults to the title. */
  label?: string | undefined;
}

/**
 * A card that asks someone to review a proposed change before it happens:
 * an approval, a draft, or a table edit. The header opens and closes the
 * details; the footer holds the outcome and the decision buttons.
 */
export function ReviewCard({
  icon,
  title,
  badge,
  settled = false,
  status,
  actions,
  children,
  label,
  className,
  ...props
}: ReviewCardProps) {
  const titleId = useId();
  const [open, setOpen] = useState(!settled);
  const [wasSettled, setWasSettled] = useState(settled);
  if (wasSettled !== settled) {
    setWasSettled(settled);
    setOpen(!settled);
  }
  const showActions = open && actions != null && actions !== false;
  const showStatus = status != null && status !== false;
  return (
    <section
      data-slot="review-card"
      data-settled={settled || undefined}
      data-open={open || undefined}
      aria-label={label}
      aria-labelledby={label ? undefined : titleId}
      {...props}
      className={cn('sprout-review-card', className)}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="sprout-review-card-header">
          <span aria-hidden="true" className="sprout-review-card-icon">
            {icon}
          </span>
          <h4 id={titleId} className="sprout-review-card-title">
            <CollapsibleTrigger className="sprout-review-card-trigger">{title}</CollapsibleTrigger>
          </h4>
          <Badge variant={badge.variant} className="sprout-review-card-badge">
            {badge.label}
          </Badge>
          <ChevronDown
            size={16}
            aria-hidden="true"
            data-slot="collapsible-indicator"
            className="sprout-review-card-chevron"
          />
        </div>
        <CollapsibleContent variant="card">
          <div className="sprout-review-card-body">{children}</div>
        </CollapsibleContent>
      </Collapsible>
      {(showStatus || showActions) && (
        <div className="sprout-review-card-footer">
          {status}
          {showActions && <div className="sprout-review-card-actions">{actions}</div>}
        </div>
      )}
    </section>
  );
}

export type ReviewRowsProps = ComponentProps<'dl'>;

/** A bordered list of labeled facts, such as Change, Table, and Trigger. */
export function ReviewRows({ className, ...props }: ReviewRowsProps) {
  return <dl data-slot="review-rows" {...props} className={cn('sprout-review-rows', className)} />;
}

export interface ReviewRowProps extends Omit<ComponentProps<'div'>, 'children'> {
  label: string;
  /** The value: text, badges, or a stacked new and current value. */
  children: ReactNode;
}

/** One fact: the label on the left and its value on the right. */
export function ReviewRow({ label, children, className, ...props }: ReviewRowProps) {
  return (
    <div data-slot="review-row" {...props} className={cn('sprout-review-row', className)}>
      <dt className="sprout-review-row-label">{label}</dt>
      <dd className="sprout-review-row-value">{children}</dd>
    </div>
  );
}

export type ReviewStep = { summary: ReactNode; detail?: ReactNode };

export interface ReviewStepsProps extends Omit<ComponentProps<'div'>, 'title' | 'children'> {
  /** Short heading, such as “3 steps”. */
  title: string;
  steps: readonly ReviewStep[];
}

/** A numbered list of what will happen, each with optional detail below. */
export function ReviewSteps({ title, steps, className, ...props }: ReviewStepsProps) {
  return (
    <div data-slot="review-steps" {...props} className={cn('sprout-review-steps', className)}>
      <h5 className="sprout-review-steps-title">{title}</h5>
      <ol className="sprout-review-steps-list">
        {steps.map((step, index) => (
          <li key={index} className="sprout-review-step">
            <span aria-hidden="true" className="sprout-review-step-number">
              {index + 1}
            </span>
            <div className="sprout-review-step-content">
              <p className="sprout-review-step-summary">{step.summary}</p>
              {step.detail}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export type ReviewValue = { name: string; value: string };

export interface ReviewValuesProps extends Omit<ComponentProps<'dl'>, 'children'> {
  values: readonly ReviewValue[];
}

/** Exact names and values in monospace, such as headers or written fields. */
export function ReviewValues({ values, className, ...props }: ReviewValuesProps) {
  return (
    <dl data-slot="review-values" {...props} className={cn('sprout-review-values', className)}>
      {values.map(({ name, value }) => (
        <div key={name} className="sprout-review-value">
          <dt className="sprout-review-value-name">{name}</dt>
          <dd className="sprout-review-value-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
