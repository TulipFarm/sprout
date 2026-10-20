import { useEffect, useId, useImperativeHandle, useRef, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../internal/classes.js';

export interface GlassBannerProps extends Omit<ComponentProps<'div'>, 'title' | 'children'> {
  /** The headline on the glass. */
  title: ReactNode;
  /** A quieter line under the title. It also names the chip list. */
  caption?: ReactNode;
  /** `GlassChip` items. Up to three float around the art on wide banners. */
  children: ReactNode;
}

/**
 * A frosted showcase banner with draggable glass chips. The bubble art is
 * hidden from assistive technology; the chips are announced as a list named
 * by the caption, or by the title when there is no caption.
 */
export function GlassBanner({ title, caption, className, children, ...props }: GlassBannerProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const captionId = `${id}-caption`;
  const hasCaption = caption !== undefined && caption !== null && caption !== false && caption !== '';

  return (
    <div data-slot="glass-banner" {...props} className={cn('sprout-glass-banner', className)}>
      <div data-slot="glass-banner-art" className="sprout-glass-banner-art" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} data-slot="glass-bubble" className="sprout-glass-bubble" />
        ))}
      </div>
      <div data-slot="glass-banner-copy" className="sprout-glass-banner-copy">
        <p id={titleId} data-slot="glass-banner-title" className="sprout-glass-banner-title">
          {title}
        </p>
        {hasCaption && (
          <p id={captionId} data-slot="glass-banner-caption" className="sprout-glass-banner-caption">
            {caption}
          </p>
        )}
      </div>
      <ul
        data-slot="glass-banner-chips"
        className="sprout-glass-banner-chips"
        aria-labelledby={hasCaption ? captionId : titleId}
      >
        {children}
      </ul>
    </div>
  );
}

export interface GlassChipProps extends Omit<ComponentProps<'li'>, 'children'> {
  /** A 28px round badge before the text, such as a brand glyph or icon. */
  icon?: ReactNode;
  children: ReactNode;
}

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A glass pill that can be dragged with a pointer and springs back on
 * release, stretching with its speed. The drag is play only: chips are not
 * controls and take no focus. With reduced motion the chip neither floats
 * nor springs; it snaps home on release.
 */
export function GlassChip({ icon, className, children, ref, ...props }: GlassChipProps) {
  const chip = useRef<HTMLLIElement>(null);
  useImperativeHandle(ref, () => chip.current!, []);

  useEffect(() => {
    const element = chip.current;
    if (!element) return;
    let x = 0,
      y = 0,
      vx = 0,
      vy = 0,
      targetX = 0,
      targetY = 0;
    let startX = 0,
      startY = 0,
      pointer: number | null = null,
      frame = 0;

    const paint = () => {
      const speed = Math.hypot(vx, vy);
      const stretch = Math.min(speed / 70, 0.22);
      const angle = Math.atan2(vy, vx);
      element.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.55}) rotate(${-angle}rad) rotate(${clamp(vx * 0.35, 10)}deg) skewX(${clamp(-vx * 0.25, 8)}deg)`;
    };
    const rest = () => {
      x = y = vx = vy = 0;
      element.style.transform = '';
      element.removeAttribute('data-dragging');
      frame = 0;
    };
    const tick = () => {
      if (pointer !== null) {
        vx = (targetX - x) * 0.28;
        vy = (targetY - y) * 0.28;
      } else {
        vx = (vx - x * 0.09) * 0.82;
        vy = (vy - y * 0.09) * 0.82;
        if (Math.abs(x) + Math.abs(y) + Math.abs(vx) + Math.abs(vy) < 0.05) {
          rest();
          return;
        }
      }
      x += vx;
      y += vy;
      paint();
      frame = requestAnimationFrame(tick);
    };
    const run = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const down = (event: PointerEvent) => {
      if (event.button !== 0 || pointer !== null) return;
      pointer = event.pointerId;
      element.setPointerCapture?.(pointer);
      element.setAttribute('data-dragging', '');
      startX = event.clientX - x;
      startY = event.clientY - y;
      targetX = x;
      targetY = y;
      run();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      targetX = event.clientX - startX;
      targetY = event.clientY - startY;
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      if (prefersReducedMotion()) {
        cancelAnimationFrame(frame);
        rest();
        return;
      }
      run();
    };

    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    element.addEventListener('lostpointercapture', up);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      element.removeEventListener('lostpointercapture', up);
    };
  }, []);

  return (
    <li ref={chip} data-slot="glass-chip" {...props} className={cn('sprout-glass-chip', className)}>
      <span data-slot="glass-chip-surface" className="sprout-glass-chip-surface">
        {icon && (
          <span data-slot="glass-chip-icon" className="sprout-glass-chip-icon">
            {icon}
          </span>
        )}
        <span data-slot="glass-chip-label" className="sprout-glass-chip-label">
          {children}
        </span>
      </span>
    </li>
  );
}
