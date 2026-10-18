import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "../internal/classes.js";

export const badgeVariantNames = [
  "default",
  "success",
  "warning",
  "info",
  "secondary",
  "destructive",
  "outline",
  "ghost",
  "link",
] as const;
export const badgeSizeNames = ["default", "chip"] as const;

export type BadgeVariant = (typeof badgeVariantNames)[number];
export type BadgeSize = (typeof badgeSizeNames)[number];

export interface BadgeVariantOptions {
  variant?: BadgeVariant | null;
  size?: BadgeSize | null;
  className?: string;
}

export function badgeVariants({
  variant,
  size,
  className,
}: BadgeVariantOptions = {}) {
  return cn(
    "sprout-badge",
    `sprout-badge-${variant ?? "default"}`,
    size === "chip" && "sprout-badge-chip",
    className,
  );
}

export interface BadgeState extends Record<string, unknown> {
  slot: "badge";
  variant: BadgeVariant;
  size: BadgeSize;
}

export interface BadgeProps extends useRender.ComponentProps<
  "span",
  BadgeState
> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  ref,
  ...props
}: BadgeProps) {
  return useRender({
    defaultTagName: "span",
    ref,
    render,
    props: mergeProps<"span">(
      { className: badgeVariants({ variant, size, className }) },
      props,
    ),
    state: { slot: "badge", variant, size },
  });
}
