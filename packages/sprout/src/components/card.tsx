import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "../internal/classes.js";

export const cardSizeNames = ["default", "sm"] as const;
export const cardSurfaceNames = ["default", "raised"] as const;

export type CardSize = (typeof cardSizeNames)[number];
export type CardSurface = (typeof cardSurfaceNames)[number];

export interface CardVariantOptions {
  size?: CardSize | null;
  surface?: CardSurface | null;
  className?: string;
}

export function cardVariants({
  size,
  surface,
  className,
}: CardVariantOptions = {}) {
  return cn(
    "sprout-card",
    size === "sm" && "sprout-card-sm",
    surface === "raised" && "sprout-card-raised",
    className,
  );
}

export interface CardState extends Record<string, unknown> {
  slot: "card";
  size: CardSize;
  surface: CardSurface;
}

export interface CardProps extends useRender.ComponentProps<"div", CardState> {
  /** `sm` tightens padding and gaps from 16px to 12px and shrinks the title. */
  size?: CardSize;
  /** `raised` lifts the card off a surface of the same color. */
  surface?: CardSurface;
}

/**
 * A bordered panel that groups related content. Compose it with
 * `CardHeader`, `CardContent`, and `CardFooter`.
 */
export function Card({
  className,
  size = "default",
  surface = "default",
  render,
  ref,
  ...props
}: CardProps) {
  return useRender({
    defaultTagName: "div",
    ref,
    render,
    props: mergeProps<"div">(
      { className: cardVariants({ size, surface, className }) },
      props,
    ),
    state: { slot: "card", size, surface },
  });
}

type PartSlot =
  | "card-header"
  | "card-title"
  | "card-description"
  | "card-action"
  | "card-content"
  | "card-footer";

export interface CardPartState extends Record<string, unknown> {
  slot: PartSlot;
}

export type CardPartProps = useRender.ComponentProps<"div", CardPartState>;

function part(slot: PartSlot, base: string) {
  return function CardPart({
    className,
    render,
    ref,
    ...props
  }: CardPartProps) {
    return useRender({
      defaultTagName: "div",
      ref,
      render,
      props: mergeProps<"div">({ className: cn(base, className) }, props),
      state: { slot },
    });
  };
}

/** Lays out the title, description, and an optional `CardAction`. */
export const CardHeader = part("card-header", "sprout-card-header");
/** A `div` by default. Pass `render={<h3 />}` to put it in the outline. */
export const CardTitle = part("card-title", "sprout-card-title");
export const CardDescription = part(
  "card-description",
  "sprout-card-description",
);
/** Pins a badge or compact control to the header's top-right corner. */
export const CardAction = part("card-action", "sprout-card-action");
export const CardContent = part("card-content", "sprout-card-content");
/** A tinted bar along the bottom edge for actions and status. */
export const CardFooter = part("card-footer", "sprout-card-footer");
