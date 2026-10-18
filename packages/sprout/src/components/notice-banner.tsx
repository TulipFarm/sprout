import type { ComponentProps, ReactNode } from "react";
import { cn } from "../internal/classes.js";

export interface NoticeBannerProps extends Omit<
  ComponentProps<"section">,
  "children"
> {
  /** The message. Put `role="status"` or `role="alert"` on it when it changes. */
  children: ReactNode;
  /** Controls for the notice, such as buttons or a select. They wrap. */
  actions?: ReactNode;
}

/**
 * A full-width strip at the top of a page for something that needs action,
 * such as an integration that needs authorization. The message and actions
 * stack on narrow screens and sit on one row from 640px. Name the region
 * with `aria-label`.
 */
export function NoticeBanner({
  children,
  actions,
  className,
  ...props
}: NoticeBannerProps) {
  return (
    <section
      data-slot="notice-banner"
      className={cn("sprout-notice-banner", className)}
      {...props}
    >
      <div
        data-slot="notice-banner-content"
        className="sprout-notice-banner-content"
      >
        {children}
      </div>
      {actions != null && actions !== false && (
        <div
          data-slot="notice-banner-actions"
          className="sprout-notice-banner-actions"
        >
          {actions}
        </div>
      )}
    </section>
  );
}
