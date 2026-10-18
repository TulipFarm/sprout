"use client";

import { Children, type ReactNode } from "react";
import { Button } from "./button.js";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "./popover.js";

export interface ToolbarStatusProps {
  /** Short outcome on the trigger and the popover title, like "Exported". */
  label: string;
  /** Full explanation. It is announced when it changes and shown in the popover. */
  message: string;
  /**
   * Shows a destructive trigger and announces the message with
   * `role="alert"`. Otherwise the trigger is outline and uses `role="status"`.
   */
  error?: boolean;
  /** Follow-up actions under the message, like "Retry export". */
  children?: ReactNode;
  /** Opens the details once on mount, for an outcome people must read. */
  defaultOpen?: boolean;
}

/**
 * A compact toolbar button that reports the result of an action and opens its
 * details. It replaces the action button until the person acts again.
 */
export function ToolbarStatus({
  label,
  message,
  error = false,
  children,
  defaultOpen = false,
}: ToolbarStatusProps) {
  const tone = error ? "error" : "success";
  const hasActions = Children.toArray(children).length > 0;
  return (
    <Popover defaultOpen={defaultOpen}>
      <span
        data-slot="toolbar-status-message"
        role={error ? "alert" : "status"}
        className="sprout-toolbar-status-message"
      >
        {message}
      </span>
      <PopoverTrigger
        data-slot="toolbar-status-trigger"
        data-status={tone}
        className="sprout-toolbar-status-trigger"
        render={
          <Button variant={error ? "destructive" : "outline"} size="sm" />
        }
      >
        <span className="sprout-toolbar-status-label">{label}</span>
      </PopoverTrigger>
      <PopoverContent
        data-slot="toolbar-status-content"
        data-status={tone}
        align="end"
        className="sprout-toolbar-status-content"
      >
        <div className="sprout-toolbar-status-header">
          <PopoverTitle className="sprout-toolbar-status-title">
            {label}
          </PopoverTitle>
          <PopoverDescription>{message}</PopoverDescription>
        </div>
        {hasActions && (
          <div
            data-slot="toolbar-status-actions"
            className="sprout-toolbar-status-actions"
          >
            {children}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
