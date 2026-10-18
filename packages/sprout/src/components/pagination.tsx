"use client";

import type { ComponentProps } from "react";
import { ChevronLeft } from "reicon-react/icons/ChevronLeft";
import { ChevronRight } from "reicon-react/icons/ChevronRight";
import { MoreH } from "reicon-react/icons/MoreH";
import { cn } from "../internal/classes.js";
import { Button, type ButtonProps, type ButtonSize } from "./button.js";

export type PaginationProps = ComponentProps<"nav">;

export function Pagination({
  className,
  "aria-label": label = "pagination",
  ...props
}: PaginationProps) {
  return (
    <nav
      role="navigation"
      aria-label={label}
      data-slot="pagination"
      className={cn("sprout-pagination", className)}
      {...props}
    />
  );
}

export type PaginationContentProps = ComponentProps<"ul">;

export function PaginationContent({
  className,
  ...props
}: PaginationContentProps) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("sprout-pagination-content", className)}
      {...props}
    />
  );
}

export type PaginationItemProps = ComponentProps<"li">;

export function PaginationItem({ className, ...props }: PaginationItemProps) {
  return (
    <li
      data-slot="pagination-item"
      className={cn("sprout-pagination-item", className)}
      {...props}
    />
  );
}

export interface PaginationLinkProps extends Omit<
  ComponentProps<"a">,
  "className"
> {
  className?: string;
  /** Marks the current page: outline style and `aria-current="page"`. */
  isActive?: boolean;
  /** Any Sprout `Button` size. Page numbers default to `icon`. */
  size?: ButtonSize;
  /** Sets `aria-disabled`, removes the link from the tab order, and blocks clicks. */
  disabled?: boolean;
  /** Swap the `a` for a router link, as with Base UI `render`. */
  render?: ButtonProps["render"];
}

export function PaginationLink({
  className,
  isActive,
  size = "icon",
  render,
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      variant={isActive ? "outline" : "ghost"}
      size={size}
      nativeButton={false}
      render={render}
      {...(props as ButtonProps)}
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive ? "true" : undefined}
      className={cn("sprout-pagination-link", className)}
    />
  );
}

export interface PaginationDirectionProps extends PaginationLinkProps {
  /** Visible label. It is hidden below 640px, where only the chevron shows. */
  text?: string;
}

export function PaginationPrevious({
  className,
  text = "Previous",
  ...props
}: PaginationDirectionProps) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("sprout-pagination-previous", className)}
      {...props}
    >
      <ChevronLeft data-icon="inline-start" aria-hidden="true" />
      <span className="sprout-pagination-label">{text}</span>
    </PaginationLink>
  );
}

export function PaginationNext({
  className,
  text = "Next",
  ...props
}: PaginationDirectionProps) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("sprout-pagination-next", className)}
      {...props}
    >
      <span className="sprout-pagination-label">{text}</span>
      <ChevronRight data-icon="inline-end" aria-hidden="true" />
    </PaginationLink>
  );
}

export type PaginationEllipsisProps = ComponentProps<"span">;

/** Marks skipped pages. It is hidden from screen readers. */
export function PaginationEllipsis({
  className,
  ...props
}: PaginationEllipsisProps) {
  return (
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      className={cn("sprout-pagination-ellipsis", className)}
      {...props}
    >
      <MoreH />
      <span className="sprout-pagination-sr-only">More pages</span>
    </span>
  );
}
