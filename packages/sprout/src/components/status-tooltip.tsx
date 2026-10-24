'use client';

import type { ReactNode, RefObject } from 'react';
import { Tooltip, TooltipContent } from './tooltip.js';

export interface StatusTooltipProps {
  anchor: RefObject<HTMLSpanElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/** Status loads this on first hover, so the mark itself stays small. */
export default function StatusTooltip({ anchor, open, onOpenChange, children }: StatusTooltipProps) {
  return (
    <Tooltip open={open} onOpenChange={onOpenChange}>
      <TooltipContent anchor={anchor}>{children}</TooltipContent>
    </Tooltip>
  );
}
