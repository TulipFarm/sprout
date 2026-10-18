import type { ComponentProps } from "react";
import { cn } from "../internal/classes.js";

export type PageContentProps = ComponentProps<"div">;

/**
 * The padded column that holds a page's header and sections. Direct children
 * are stacked 16px apart. Put it inside your own scroll region.
 */
export function PageContent({ className, ...props }: PageContentProps) {
  return (
    <div
      data-slot="page-content"
      className={cn("sprout-page-content", className)}
      {...props}
    />
  );
}
