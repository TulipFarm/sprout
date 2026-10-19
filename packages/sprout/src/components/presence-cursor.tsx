import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "../internal/classes.js";

export interface PresenceCursorProps extends Omit<
  ComponentProps<"div">,
  "children" | "color"
> {
  /** The person's name or email. Shown in the tag, or read out with an avatar. */
  name: string;
  /** Left offset of the arrow tip in px, from the positioned parent. */
  x: number;
  /** Top offset of the arrow tip in px, from the positioned parent. */
  y: number;
  /** Any CSS color. White text sits on it, so keep 4.5:1 contrast. */
  color: string;
  /** Shows this, such as an `Avatar`, next to the arrow instead of the name tag. */
  avatar?: ReactNode;
}

/**
 * Another person's pointer on a shared surface, with a name tag or an avatar.
 * Put it in a parent with `position: relative`. It ignores pointer events and
 * glides between positions unless reduced motion is requested.
 */
export function PresenceCursor({
  name,
  x,
  y,
  color,
  avatar,
  className,
  style,
  ...props
}: PresenceCursorProps) {
  return (
    <div
      data-slot="presence-cursor"
      role="img"
      aria-label={name}
      className={cn("sprout-presence-cursor", className)}
      style={
        {
          "--sprout-presence-color": color,
          transform: `translate(${x}px, ${y}px)`,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <svg
        className="sprout-presence-cursor-arrow"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path d="M1.5 1.5 14.5 6.6 8.4 8.4 6.6 14.5Z" />
      </svg>
      {avatar != null ? (
        <span
          data-slot="presence-cursor-avatar"
          className="sprout-presence-cursor-avatar"
          aria-hidden="true"
        >
          {avatar}
        </span>
      ) : (
        <span
          data-slot="presence-cursor-label"
          className="sprout-presence-cursor-label"
          aria-hidden="true"
        >
          {name}
        </span>
      )}
    </div>
  );
}
