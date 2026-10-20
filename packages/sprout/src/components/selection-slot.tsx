'use client';

import { useLayoutEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../internal/classes.js';

export interface SelectionSlotProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** Shows `selection` in place of `children`. */
  active: boolean;
  /** The toolbar for the current selection, such as a count and bulk actions. */
  selection: ReactNode;
  /** The tools shown while nothing is selected, such as search and filters. */
  children: ReactNode;
}

const tabbable =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

function focusable(root: HTMLElement | null) {
  return Array.from(root?.querySelectorAll<HTMLElement>(tabbable) ?? []).find(
    node => !node.closest('[inert]') && node.getClientRects().length > 0,
  );
}

function lost() {
  const current = document.activeElement;
  return !current || current === document.body;
}

/**
 * Swaps a toolbar for a selection toolbar in the same place. Both share one
 * grid cell, so the row keeps the height of the taller one and nothing below
 * it moves. The hidden tools stay mounted, so their state survives, but are
 * inert. Focus moves into the selection when it came from the hidden tools,
 * and returns to where it was when the selection closes. If that element is
 * gone, focus that was in the selection goes to the first tool.
 */
export function SelectionSlot({ active, selection, children, className, ...props }: SelectionSlotProps) {
  const tools = useRef<HTMLDivElement>(null);
  const selected = useRef<HTMLDivElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const previous = useRef(false);
  const inside = useRef(false);
  useLayoutEffect(() => {
    if (active && !previous.current) {
      const current = document.activeElement;
      origin.current = current instanceof HTMLElement && current !== document.body ? current : null;
      if (origin.current && tools.current?.contains(origin.current))
        focusable(selected.current)?.focus({ preventScroll: true });
    }
    if (!active && previous.current && lost()) {
      if (origin.current?.isConnected) origin.current.focus({ preventScroll: true });
      else if (inside.current) focusable(tools.current)?.focus({ preventScroll: true });
    }
    if (!active) inside.current = false;
    previous.current = active;
  }, [active]);
  return (
    <div
      data-slot="selection-slot"
      data-active={active || undefined}
      className={cn('sprout-selection-slot', className)}
      {...props}
    >
      <div
        ref={tools}
        data-slot="selection-slot-default"
        className="sprout-selection-slot-layer"
        inert={active}
        aria-hidden={active || undefined}
      >
        {children}
      </div>
      {active && (
        <div
          ref={selected}
          onFocus={() => (inside.current = true)}
          onBlur={event => {
            // A null target means focus was dropped, as when the focused button is disabled.
            const next = event.relatedTarget;
            if (next && !event.currentTarget.contains(next)) inside.current = false;
          }}
          data-slot="selection-slot-selection"
          className="sprout-selection-slot-layer sprout-selection-slot-selection"
        >
          {selection}
        </div>
      )}
    </div>
  );
}
