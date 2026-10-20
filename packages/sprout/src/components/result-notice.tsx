import type { ComponentProps, ReactNode } from 'react';
import { InfoCircle } from 'reicon-react/icons/InfoCircle';
import { cn } from '../internal/classes.js';

export interface ResultNoticeProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** How many items the view shows, such as 100. */
  shown: number;
  /** How many items exist, as a number or a capped count such as "10000+". */
  total: number | string;
  /** The plural name of the items, such as "rows" or "groups". */
  noun: string;
  /** A control at the end, such as a button that opens the result in Table. */
  action?: ReactNode;
}

const countPattern = /^(\d+)(\+?)$/;

const formatCount = (value: number | string) => {
  if (typeof value === 'number') return value.toLocaleString('en-US');
  const match = countPattern.exec(value.trim());
  return match ? `${Number(match[1]).toLocaleString('en-US')}${match[2]}` : value;
};

/** The exact total, or undefined when it is capped ("10000+") or not a count. */
const exactCount = (value: number | string) => {
  if (typeof value === 'number') return value;
  const match = countPattern.exec(value.trim());
  return match && !match[2] ? Number(match[1]) : undefined;
};

/**
 * A quiet strip inside a view that says the view shows only part of the
 * result, such as "Showing the first 100 of 2,431 rows." Mount it whenever a
 * chart or timeline cuts its result short. It renders nothing when `total` is
 * an exact count that is not above `shown`, so it never claims more exist.
 */
export function ResultNotice({ shown, total, noun, action, className, ...props }: ResultNoticeProps) {
  const exact = exactCount(total);
  if (exact !== undefined && exact <= shown) return null;
  return (
    <div data-slot="result-notice" className={cn('sprout-result-notice', className)} {...props}>
      <div className="sprout-result-notice-content">
        <InfoCircle aria-hidden="true" className="sprout-result-notice-icon" />
        <p role="status" data-slot="result-notice-message" className="sprout-result-notice-message">
          {shown === 1 ? (
            'Showing the first of '
          ) : (
            <>
              Showing the first <strong>{formatCount(shown)}</strong> of{' '}
            </>
          )}
          <strong>{formatCount(total)}</strong> {noun}.
        </p>
      </div>
      {action != null && action !== false && (
        <div data-slot="result-notice-action" className="sprout-result-notice-action">
          {action}
        </div>
      )}
    </div>
  );
}
