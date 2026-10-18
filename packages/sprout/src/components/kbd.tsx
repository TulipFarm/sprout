import type { ComponentProps } from "react";
import { cn } from "../internal/classes.js";

export const kbdVariantNames = ["default", "outline"] as const;

export type KbdVariant = (typeof kbdVariantNames)[number];

export interface KbdProps extends ComponentProps<"kbd"> {
  /** `"outline"` adds a border on the surface color, for hints on tinted strips and selected rows. */
  variant?: KbdVariant;
}

/** One keyboard key, such as `⌘`, `Enter`, or `Esc`. */
export function Kbd({ variant = "default", className, ...props }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      data-variant={variant}
      className={cn("sprout-kbd", className)}
      {...props}
    />
  );
}

export type KbdGroupProps = ComponentProps<"kbd">;

/** Keys pressed together, such as `⌘` `K`. */
export function KbdGroup({ className, ...props }: KbdGroupProps) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("sprout-kbd-group", className)}
      {...props}
    />
  );
}
