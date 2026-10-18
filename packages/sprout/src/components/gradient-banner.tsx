import { Children, useId, type ComponentProps } from "react";
import { cn } from "../internal/classes.js";

export const gradientBannerVariantNames = [
  "aurora",
  "citrus",
  "lagoon",
  "iris",
  "cobalt",
  "mint",
] as const;
export const gradientBannerSizeNames = ["sm", "md", "lg", "xl"] as const;
export const gradientBannerPanelToneNames = ["light", "dark"] as const;

export type GradientBannerVariant = (typeof gradientBannerVariantNames)[number];
export type GradientBannerSize = (typeof gradientBannerSizeNames)[number];
export type GradientBannerPanelTone =
  (typeof gradientBannerPanelToneNames)[number];

export interface GradientBannerProps extends ComponentProps<"div"> {
  /** Color story of the art. Defaults to `"aurora"`. */
  variant?: GradientBannerVariant | undefined;
  /** `sm` 96px, `md` 160px, `lg` 240px (default), `xl` 360px minimum height. */
  size?: GradientBannerSize | undefined;
  /** Film grain over the art. Defaults to `true`. */
  texture?: boolean | undefined;
}

/**
 * Decorative gradient art with centered content on top. The art is hidden from
 * assistive technology; only children are announced.
 */
export function GradientBanner({
  variant = "aurora",
  size = "lg",
  texture = true,
  className,
  children,
  ...props
}: GradientBannerProps) {
  const grainId = useId();
  const hasContent = Children.toArray(children).length > 0;

  return (
    <div
      data-slot="gradient-banner"
      data-variant={variant}
      data-size={size}
      {...props}
      className={cn("sprout-gradient-banner", className)}
    >
      <div
        data-slot="gradient-banner-art"
        className="sprout-gradient-banner-art"
        aria-hidden="true"
      >
        <span className="sprout-gradient-banner-fold" />
        <span className="sprout-gradient-banner-light" />
        {texture && (
          <svg
            data-slot="gradient-banner-texture"
            className="sprout-gradient-banner-texture"
            aria-hidden="true"
            focusable="false"
          >
            <filter id={grainId} x="0%" y="0%" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.82"
                numOctaves="3"
                stitchTiles="stitch"
                seed="17"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#${grainId})`} />
          </svg>
        )}
      </div>
      {hasContent && (
        <div
          data-slot="gradient-banner-content"
          className="sprout-gradient-banner-content"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export interface GradientBannerPanelProps extends ComponentProps<"div"> {
  /** `"light"` paper (default) or `"dark"` night surface. */
  tone?: GradientBannerPanelTone | undefined;
}

/** A solid surface that keeps text readable on any banner variant. */
export function GradientBannerPanel({
  tone = "light",
  className,
  ...props
}: GradientBannerPanelProps) {
  return (
    <div
      data-slot="gradient-banner-panel"
      data-tone={tone}
      {...props}
      className={cn("sprout-gradient-banner-panel", className)}
    />
  );
}

/** A pill label that adapts to the panel tone around it. */
export function GradientBannerBadge({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      data-slot="gradient-banner-badge"
      {...props}
      className={cn("sprout-gradient-banner-badge", className)}
    />
  );
}

export interface GradientBannerProgressProps extends Omit<
  ComponentProps<"div">,
  "children"
> {
  /** Percent complete. Values outside 0–100 are clamped. */
  value: number;
}

/**
 * A thin `progressbar` in the current text color. Name it with `aria-label`
 * or `aria-labelledby`.
 */
export function GradientBannerProgress({
  value,
  className,
  style,
  ...props
}: GradientBannerProgressProps) {
  const percent = Number.isFinite(value)
    ? Math.min(Math.max(value, 0), 100)
    : 0;
  return (
    <div
      data-slot="gradient-banner-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      {...props}
      style={{
        ...style,
        ["--sprout-gradient-banner-progress" as string]: percent / 100,
      }}
      className={cn("sprout-gradient-banner-progress", className)}
    >
      <div className="sprout-gradient-banner-progress-fill" />
    </div>
  );
}
