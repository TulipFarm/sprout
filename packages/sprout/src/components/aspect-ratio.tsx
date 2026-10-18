import type { ComponentProps, CSSProperties } from "react";
import { cn } from "../internal/classes.js";

export interface AspectRatioProps extends ComponentProps<"div"> {
  /** Width divided by height, such as `16 / 9`, `4 / 3`, or `1`. */
  ratio: number;
}

/** Keeps its content at a fixed width-to-height ratio as its width changes. */
export function AspectRatio({
  ratio,
  className,
  style,
  ...props
}: AspectRatioProps) {
  return (
    <div
      data-slot="aspect-ratio"
      className={cn("sprout-aspect-ratio", className)}
      style={{ ...style, "--sprout-aspect-ratio": ratio } as CSSProperties}
      {...props}
    />
  );
}
