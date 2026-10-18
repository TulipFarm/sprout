/**
 * Tells Sprout's Base UI parts which way text reads, so arrow keys, sliding
 * indicators, and popup sides follow it. It does not set the `dir` attribute;
 * set `dir` on a wrapping element so CSS and the browser follow the same way.
 */
export {
  DirectionProvider,
  useDirection,
  type DirectionProviderProps,
  type TextDirection,
} from "@base-ui/react/direction-provider";
