import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../internal/classes.js';

export const noticeBannerCompactNames = ['sm', 'md', 'lg'] as const;

/** Compact below this width: `sm` 640px, `md` 768px, `lg` 1024px. */
export type NoticeBannerCompactBelow = (typeof noticeBannerCompactNames)[number];

export interface NoticeBannerProps extends Omit<ComponentProps<'section'>, 'children'> {
  /** The message. Put `role="status"` or `role="alert"` on it when it changes. */
  children: ReactNode;
  /** Controls for the notice, such as buttons or a select. They wrap. */
  actions?: ReactNode;
  /**
   * Keeps the message on one line, cut off with an ellipsis, and one trailing
   * action beside it. `true` is compact at every width; `sm`, `md` or `lg` is
   * compact only below 640px, 768px or 1024px. The cut-off text stays in the
   * DOM, so screen readers read all of it.
   */
  compact?: boolean | NoticeBannerCompactBelow | undefined;
}

/**
 * A full-width strip at the top of a page for something that needs action,
 * such as an integration that needs authorization. The message and actions
 * stack on narrow screens and sit on one row from 640px. Name the region
 * with `aria-label`.
 */
export function NoticeBanner({ children, actions, compact, className, ...props }: NoticeBannerProps) {
  return (
    <section
      data-slot="notice-banner"
      data-compact={compact === true ? '' : compact || undefined}
      className={cn('sprout-notice-banner', className)}
      {...props}
    >
      <div data-slot="notice-banner-content" className="sprout-notice-banner-content">
        {children}
      </div>
      {actions != null && actions !== false && (
        <div data-slot="notice-banner-actions" className="sprout-notice-banner-actions">
          {actions}
        </div>
      )}
    </section>
  );
}
