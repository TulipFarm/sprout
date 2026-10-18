"use client";

import {
  useId,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ArrowRight } from "reicon-react/icons/ArrowRight";
import { cn } from "../internal/classes.js";
import { BrandStack, type BrandStackItem } from "./brand-icon.js";

export interface PromptListItem {
  id: string;
  /** One line. Long labels are cut with an ellipsis and shown in full on hover. */
  label: string;
  /** A 16px icon shown before the label. */
  icon: ReactNode;
  /** Apps the prompt uses, shown as overlapping tiles with tooltips. */
  brands?: readonly BrandStackItem[] | undefined;
}

export interface PromptListProps extends Omit<
  ComponentProps<"section">,
  "title" | "children" | "onSelect"
> {
  /** Names the list. Shown as a small heading unless `showTitle` is false. */
  title: string;
  /** Hide the heading but keep `title` as the list's accessible name. */
  showTitle?: boolean | undefined;
  items: readonly PromptListItem[];
  onSelect: (id: string) => void;
  /** Locks every row, for example while a message is sending. */
  disabled?: boolean | undefined;
}

/** A titled list of one-line prompts. Choosing a row calls `onSelect` with its id. */
export function PromptList({
  title,
  showTitle = true,
  items,
  onSelect,
  disabled = false,
  className,
  ...props
}: PromptListProps) {
  const heading = useId();
  return (
    <section
      data-slot="prompt-list"
      data-disabled={disabled || undefined}
      {...props}
      aria-labelledby={showTitle ? heading : undefined}
      aria-label={showTitle ? undefined : title}
      className={cn("sprout-prompt-list", className)}
    >
      {showTitle && (
        <h3 id={heading} className="sprout-prompt-list-title">
          {title}
        </h3>
      )}
      <ul className="sprout-prompt-list-items">
        {items.map((item, index) => (
          <li
            key={item.id}
            data-slot="prompt-list-item"
            className="sprout-prompt-list-item"
            style={{ "--sprout-prompt-index": index } as CSSProperties}
          >
            <span aria-hidden="true" className="sprout-prompt-list-icon">
              {item.icon}
            </span>
            <button
              type="button"
              disabled={disabled}
              title={item.label}
              onClick={() => onSelect(item.id)}
              className="sprout-prompt-list-button"
            >
              {item.label}
            </button>
            {!!item.brands?.length && (
              <BrandStack
                brands={item.brands}
                className="sprout-prompt-list-brands"
              />
            )}
            <ArrowRight
              aria-hidden="true"
              className="sprout-prompt-list-arrow"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
