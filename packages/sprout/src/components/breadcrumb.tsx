import type { ComponentProps, ReactNode } from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ChevronRight } from "reicon-react/icons/ChevronRight";
import { MoreH } from "reicon-react/icons/MoreH";
import { cn } from "../internal/classes.js";

export type BreadcrumbProps = ComponentProps<"nav">;

export function Breadcrumb({
  className,
  "aria-label": label = "Breadcrumb",
  ...props
}: BreadcrumbProps) {
  return (
    <nav
      aria-label={label}
      data-slot="breadcrumb"
      className={cn("sprout-breadcrumb", className)}
      {...props}
    />
  );
}

export interface BreadcrumbListProps extends ComponentProps<"ol"> {
  /** Wrap long paths onto more lines. Set `false` to keep one line and let the current page shrink. */
  wrap?: boolean;
}

export function BreadcrumbList({
  className,
  wrap = true,
  ...props
}: BreadcrumbListProps) {
  return (
    <ol
      data-slot="breadcrumb-list"
      data-wrap={wrap ? "true" : "false"}
      className={cn("sprout-breadcrumb-list", className)}
      {...props}
    />
  );
}

export type BreadcrumbItemProps = ComponentProps<"li">;

export function BreadcrumbItem({ className, ...props }: BreadcrumbItemProps) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("sprout-breadcrumb-item", className)}
      {...props}
    />
  );
}

function label(children: ReactNode, truncate: boolean | undefined) {
  if (!truncate) return children;
  return (
    <span
      data-slot="breadcrumb-label"
      className="sprout-breadcrumb-label"
      title={
        typeof children === "string" || typeof children === "number"
          ? String(children)
          : undefined
      }
    >
      {children}
    </span>
  );
}

export interface BreadcrumbLinkState extends Record<string, unknown> {
  slot: "breadcrumb-link";
}

export interface BreadcrumbLinkProps extends useRender.ComponentProps<
  "a",
  BreadcrumbLinkState
> {
  /** Cut a long name to one line with an ellipsis. String names also get a `title`. */
  truncate?: boolean;
}

export function BreadcrumbLink({
  className,
  render,
  ref,
  truncate,
  children,
  ...props
}: BreadcrumbLinkProps) {
  return useRender({
    defaultTagName: "a",
    ref,
    render,
    props: mergeProps<"a">(
      {
        className: cn("sprout-breadcrumb-link", className),
        children: label(children, truncate),
      },
      props,
    ),
    state: { slot: "breadcrumb-link" },
  });
}

export interface BreadcrumbPageProps extends ComponentProps<"span"> {
  /** Cut a long name to one line with an ellipsis. String names also get a `title`. */
  truncate?: boolean;
}

export function BreadcrumbPage({
  className,
  truncate,
  children,
  ...props
}: BreadcrumbPageProps) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("sprout-breadcrumb-page", className)}
      {...props}
    >
      {label(children, truncate)}
    </span>
  );
}

export type BreadcrumbSeparatorProps = ComponentProps<"li">;

export function BreadcrumbSeparator({
  children,
  className,
  ...props
}: BreadcrumbSeparatorProps) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("sprout-breadcrumb-separator", className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}

export type BreadcrumbEllipsisProps = ComponentProps<"span">;

/** Marks hidden folders. It is hidden from screen readers, so put the reason in a visually hidden sibling. */
export function BreadcrumbEllipsis({
  className,
  ...props
}: BreadcrumbEllipsisProps) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn("sprout-breadcrumb-ellipsis", className)}
      {...props}
    >
      <MoreH />
      <span className="sprout-breadcrumb-sr-only">More</span>
    </span>
  );
}
