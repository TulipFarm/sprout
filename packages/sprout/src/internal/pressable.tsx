"use client";

import { Button } from "@base-ui/react/button";
import { useRender } from "@base-ui/react/use-render";

// Base UI gives non-native renders role="button"; navigation needs real link semantics.
export function Pressable({
  nativeButton = true,
  render,
  ref,
  className,
  disabled = false,
  focusableWhenDisabled = false,
  onClick,
  ...props
}: Button.Props) {
  const link = useRender({
    enabled: !nativeButton,
    defaultTagName: "a",
    render,
    ref,
    state: { disabled },
    props: {
      ...props,
      className:
        typeof className === "function" ? className({ disabled }) : className,
      "aria-disabled": disabled || undefined,
      tabIndex: disabled && !focusableWhenDisabled ? -1 : props.tabIndex,
      onClick: ((event) => {
        if (disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }) satisfies NonNullable<Button.Props["onClick"]>,
    },
  });
  return nativeButton ? (
    <Button
      {...props}
      render={render}
      ref={ref}
      className={className}
      disabled={disabled}
      focusableWhenDisabled={focusableWhenDisabled}
      onClick={onClick}
    />
  ) : (
    link
  );
}
