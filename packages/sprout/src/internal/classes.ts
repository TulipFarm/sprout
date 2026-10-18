import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["sprout-xs", "sprout-sm", "sprout-base"],
      font: ["sprout"],
      radius: ["sprout-control", "sprout-panel"],
      shadow: ["sprout-control", "sprout-panel", "sprout-overlay"],
    },
  },
});

export function cn(...values: ClassValue[]) {
  return merge(clsx(values));
}

export function stateClassName<State>(
  base: string,
  className: string | ((state: State) => string | undefined) | undefined,
) {
  return typeof className === "function"
    ? (state: State) => cn(base, className(state))
    : cn(base, className);
}
