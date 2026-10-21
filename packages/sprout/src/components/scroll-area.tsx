'use client';

import { ScrollArea as BaseScrollArea } from '@base-ui/react/scroll-area';
import { stateClassName } from '../internal/classes.js';

export const scrollAreaSizeNames = ['sm', 'md'] as const;
export const scrollAreaVariantNames = ['plain', 'table'] as const;
export const scrollAreaOrientationNames = ['vertical', 'horizontal', 'both'] as const;

export type ScrollAreaSize = (typeof scrollAreaSizeNames)[number];
export type ScrollAreaVariant = (typeof scrollAreaVariantNames)[number];
export type ScrollAreaOrientation = (typeof scrollAreaOrientationNames)[number];

export interface ScrollAreaProps extends BaseScrollArea.Root.Props {
  /** `"sm"` is 10rem tall, `"md"` is 16rem tall. Leave it out to follow the content or your className. */
  size?: ScrollAreaSize;
  /** `"table"` adds a bordered surface, caps the height at 60dvh, and makes the viewport a labeled region. */
  variant?: ScrollAreaVariant;
  /** Which scrollbars to draw. Each one appears only while its axis overflows. */
  orientation?: ScrollAreaOrientation;
  /** Accessible name for the scrolling viewport. */
  viewportLabel?: string | undefined;
}

/** A scrolling region with thin, theme-aware scrollbars that keeps native keyboard and wheel scrolling. */
export function ScrollArea({
  className,
  children,
  size,
  variant = 'plain',
  orientation = 'vertical',
  viewportLabel,
  ...props
}: ScrollAreaProps) {
  return (
    <BaseScrollArea.Root
      data-slot="scroll-area"
      data-size={size}
      data-variant={variant}
      className={stateClassName<BaseScrollArea.Root.State>('sprout-scroll-area', className)}
      {...props}
    >
      <BaseScrollArea.Viewport
        data-slot="scroll-area-viewport"
        role={variant === 'table' ? 'region' : undefined}
        aria-label={viewportLabel}
        className="sprout-scroll-area-viewport"
      >
        {children}
      </BaseScrollArea.Viewport>
      {orientation !== 'horizontal' && <ScrollBar />}
      {orientation !== 'vertical' && <ScrollBar orientation="horizontal" />}
      <BaseScrollArea.Corner data-slot="scroll-area-corner" className="sprout-scroll-area-corner" />
    </BaseScrollArea.Root>
  );
}

export type ScrollBarProps = BaseScrollArea.Scrollbar.Props;

/** One scrollbar track and thumb. `ScrollArea` draws these for you from `orientation`. */
export function ScrollBar({ className, orientation = 'vertical', ...props }: ScrollBarProps) {
  return (
    <BaseScrollArea.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={stateClassName<BaseScrollArea.Scrollbar.State>('sprout-scroll-area-scrollbar', className)}
      {...props}
    >
      <BaseScrollArea.Thumb data-slot="scroll-area-thumb" className="sprout-scroll-area-thumb" />
    </BaseScrollArea.Scrollbar>
  );
}
