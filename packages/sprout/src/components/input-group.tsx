"use client";

import type { ComponentProps, MouseEvent } from "react";
import { cn } from "../internal/classes.js";
import { Button, type ButtonProps } from "./button.js";
import { Input, type InputProps } from "./input.js";
import { Textarea, type TextareaProps } from "./textarea.js";

export const inputGroupSizeNames = ["default", "lg"] as const;
export const inputGroupVariantNames = [
  "default",
  "composer",
  "question-composer",
] as const;
export const inputGroupAddonAlignNames = [
  "inline-start",
  "inline-end",
  "block-start",
  "block-end",
] as const;
export const inputGroupButtonSizeNames = [
  "xs",
  "sm",
  "icon-xs",
  "icon-sm",
] as const;

export type InputGroupSize = (typeof inputGroupSizeNames)[number];
export type InputGroupVariant = (typeof inputGroupVariantNames)[number];
export type InputGroupAddonAlign = (typeof inputGroupAddonAlignNames)[number];
export type InputGroupButtonSize = (typeof inputGroupButtonSizeNames)[number];

export interface InputGroupProps extends ComponentProps<"div"> {
  /** `default` is 32px tall with 14px text. `lg` is 44px with 16px text. */
  size?: InputGroupSize | null;
  /**
   * `default` is a single field row. `composer` stacks a message box with
   * block additions on a raised card. `question-composer` is the same box
   * with a quieter border while an agent question waits for an answer.
   */
  variant?: InputGroupVariant | null;
}

/**
 * One bordered field made of a control and its additions: icons, text,
 * shortcuts, and buttons. The group draws the border, fill, focus ring, and
 * invalid and disabled states for the control inside it. Any element marked
 * `data-slot="input-group-control"`, such as `InputGroupInput`,
 * `InputGroupTextarea`, or a rich text editor, drives those states.
 */
export function InputGroup({
  size,
  variant,
  className,
  ...props
}: InputGroupProps) {
  const scale = size ?? "default";
  const kind = variant ?? "default";
  return (
    <div
      data-slot="input-group"
      role="group"
      data-size={scale}
      data-variant={kind}
      {...props}
      className={cn(
        "sprout-input-group",
        `sprout-input-group-size-${scale}`,
        `sprout-input-group-variant-${kind}`,
        className,
      )}
    />
  );
}

export interface InputGroupAddonProps extends ComponentProps<"div"> {
  /** Inline additions sit beside the control; block additions span a row above or below it. */
  align?: InputGroupAddonAlign | null;
}

const controlSelector =
  '[data-slot="input-group-control"], input, textarea, [contenteditable="true"]';

/**
 * An icon, text, shortcut, or button area inside an `InputGroup`. It may come
 * before or after the control in markup; `align` places it. Clicking anywhere
 * in it except a button focuses the control, like a label.
 */
export function InputGroupAddon({
  align,
  className,
  onClick,
  ...props
}: InputGroupAddonProps) {
  const side = align ?? "inline-start";
  const focusControl = (event: MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a[href], [role='button'], input, textarea"))
      return;
    const control =
      event.currentTarget.parentElement?.querySelector<HTMLElement>(
        controlSelector,
      );
    if (!control || control.matches(":disabled")) return;
    control.focus();
  };
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={side}
      {...props}
      onClick={focusControl}
      className={cn(
        "sprout-input-group-addon",
        `sprout-input-group-addon-align-${side}`,
        className,
      )}
    />
  );
}

export interface InputGroupButtonProps extends Omit<
  ButtonProps,
  "size" | "type"
> {
  /** `xs` and `sm` fit a label; `icon-xs` (24px) and `icon-sm` (28px) are square. */
  size?: InputGroupButtonSize | null;
  type?: "button" | "submit" | "reset";
}

/**
 * A compact Sprout `Button` sized to sit inside an `InputGroup` addon. It is
 * `ghost` and `xs` by default, and a plain `type="button"` so it never
 * submits a form by accident. Use `render` to make it a menu, popover, or
 * combobox trigger.
 */
export function InputGroupButton({
  size,
  variant,
  type = "button",
  className,
  ...props
}: InputGroupButtonProps) {
  const scale = size ?? "xs";
  const kind = variant ?? "ghost";
  return (
    <Button
      type={type}
      variant={kind}
      data-size={scale}
      data-variant={kind}
      {...props}
      className={(state) =>
        cn(
          "sprout-input-group-button",
          `sprout-input-group-button-size-${scale}`,
          typeof className === "function" ? className(state) : className,
        )
      }
    />
  );
}

export type InputGroupTextProps = ComponentProps<"span">;

/** Muted text or an icon with text inside an addon, such as a URL prefix or a unit. */
export function InputGroupText({ className, ...props }: InputGroupTextProps) {
  return (
    <span
      data-slot="input-group-text"
      {...props}
      className={cn("sprout-input-group-text", className)}
    />
  );
}

export type InputGroupInputProps = Omit<InputProps, "scale">;

/**
 * A Sprout `Input` without its own border, fill, or ring, so the group draws
 * them. It reads a surrounding `Field` the same way `Input` does.
 */
export function InputGroupInput({ className, ...props }: InputGroupInputProps) {
  return (
    <Input
      data-slot="input-group-control"
      {...props}
      className={(state) =>
        cn(
          "sprout-input-group-input",
          typeof className === "function" ? className(state) : className,
        )
      }
    />
  );
}

export type InputGroupTextareaProps = Omit<TextareaProps, "variant">;

/**
 * A Sprout `Textarea` without its own border, fill, or ring, so the group
 * draws them. It grows with its content from a 96px floor and never resizes
 * by hand.
 */
export function InputGroupTextarea({
  className,
  ...props
}: InputGroupTextareaProps) {
  return (
    <Textarea
      variant="embedded"
      data-slot="input-group-control"
      {...props}
      className={cn("sprout-input-group-textarea", className)}
    />
  );
}
