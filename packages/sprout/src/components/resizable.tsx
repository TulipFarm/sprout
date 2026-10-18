"use client";

import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "../internal/classes.js";

export const resizableOrientationNames = ["horizontal", "vertical"] as const;

/** `"horizontal"` places panels side by side. `"vertical"` stacks them. */
export type ResizableOrientation = (typeof resizableOrientationNames)[number];

/**
 * Numbers are pixels. Strings may end in `%`, `px`, `rem`, `em`, `vw`, or `vh`.
 * A string without a unit is a percentage, so `"40"` is the same as `"40%"`.
 */
export type ResizableSize = number | string;

/** Panel sizes in percent of the group, keyed by panel `id`. */
export type ResizableLayout = Record<string, number>;

export interface ResizableLayoutChangeDetails {
  /** True for pointer and keyboard resizes. False for mount and container changes. */
  isUserInteraction: boolean;
}

interface PanelEntry {
  id: string;
  element: HTMLElement;
  defaultSize: ResizableSize | undefined;
  minSize: ResizableSize | undefined;
  maxSize: ResizableSize | undefined;
}

interface Bounds {
  min: number;
  max: number;
}

interface SeparatorLink {
  before: string;
  after: string;
}

interface GroupContextValue {
  orientation: ResizableOrientation;
  layout: ResizableLayout;
  autoSize: number;
  bounds: Record<string, Bounds>;
  links: Record<string, SeparatorLink>;
  dragging: string | null;
  registerPanel: (entry: PanelEntry) => () => void;
  registerSeparator: (id: string, element: HTMLElement) => () => void;
  startDrag: (id: string, event: PointerEvent<HTMLElement>) => void;
  resizeWithKey: (id: string, key: string) => boolean;
}

const GroupContext = createContext<GroupContextValue | null>(null);

function useGroup(part: string) {
  const context = useContext(GroupContext);
  if (!context)
    throw new Error(`${part} must be used inside ResizablePanelGroup.`);
  return context;
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const KEYBOARD_STEP = 5;
const EPSILON = 0.001;

/** Percent value of a size that can be resolved without measuring, or undefined. */
function staticPercent(size: ResizableSize | undefined) {
  if (typeof size !== "string") return undefined;
  const value = size.trim();
  if (/^-?[\d.]+%?$/.test(value)) return Number.parseFloat(value);
  return undefined;
}

function toPercent(
  size: ResizableSize | undefined,
  available: number,
  element: HTMLElement,
): number | undefined {
  if (size === undefined) return undefined;
  const percent = staticPercent(size);
  if (percent !== undefined) return percent;
  if (available <= 0) return undefined;
  let pixels: number;
  if (typeof size === "number") pixels = size;
  else {
    const value = Number.parseFloat(size);
    const unit = size.trim().replace(/^-?[\d.]+/, "");
    const view = element.ownerDocument.defaultView;
    const font = (node: Element) =>
      Number.parseFloat(view?.getComputedStyle(node).fontSize ?? "") || 16;
    if (unit === "px") pixels = value;
    else if (unit === "rem")
      pixels = value * font(element.ownerDocument.documentElement);
    else if (unit === "em") pixels = value * font(element);
    else if (unit === "vw") pixels = (value * (view?.innerWidth ?? 0)) / 100;
    else if (unit === "vh") pixels = (value * (view?.innerHeight ?? 0)) / 100;
    else return undefined;
  }
  return (pixels / available) * 100;
}

const clamp = (value: number, { min, max }: Bounds) =>
  Math.min(Math.max(value, min), max);
const total = (sizes: number[]) => sizes.reduce((sum, size) => sum + size, 0);

/** Clamp each size to its bounds, then spread any remainder over panels with room. */
function validate(sizes: number[], bounds: Bounds[]) {
  const next = sizes.map((size, index) => clamp(size, bounds[index]!));
  for (let pass = 0; pass < 8; pass += 1) {
    const diff = 100 - total(next);
    if (Math.abs(diff) < EPSILON) break;
    const open = next.flatMap((size, index) =>
      (diff > 0 ? size < bounds[index]!.max : size > bounds[index]!.min)
        ? [index]
        : [],
    );
    if (!open.length) break;
    for (const index of open)
      next[index] = clamp(next[index]! + diff / open.length, bounds[index]!);
  }
  const sum = total(next);
  return Math.abs(sum - 100) < EPSILON || sum <= 0
    ? next
    : next.map((size) => (size / sum) * 100);
}

/**
 * Move the boundary after panel `pivot` by `delta` percent. The adjacent panel
 * on the growing side takes the space; panels on the shrinking side give it up
 * nearest first, each down to its minimum.
 */
function resize(
  base: number[],
  bounds: Bounds[],
  pivot: number,
  delta: number,
) {
  const next = [...base];
  if (Math.abs(delta) < EPSILON) return next;
  const grow = delta > 0 ? pivot : pivot + 1;
  const shrink =
    delta > 0
      ? next.map((_, index) => index).slice(pivot + 1)
      : next
          .map((_, index) => index)
          .slice(0, pivot + 1)
          .reverse();
  const room = Math.min(
    bounds[grow]!.max - next[grow]!,
    total(shrink.map((index) => next[index]! - bounds[index]!.min)),
  );
  let remaining = Math.max(0, Math.min(Math.abs(delta), room));
  next[grow] = next[grow]! + remaining;
  for (const index of shrink) {
    const take = Math.min(remaining, next[index]! - bounds[index]!.min);
    next[index] = next[index]! - take;
    remaining -= take;
    if (remaining < EPSILON) break;
  }
  return next;
}

function sameLayout(a: ResizableLayout, b: ResizableLayout) {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => key in b && Math.abs(a[key]! - b[key]!) < EPSILON)
  );
}

function collectPanelProps(
  children: ReactNode,
  found: ResizablePanelProps[] = [],
) {
  Children.forEach(children, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return;
    if (child.type === ResizablePanel)
      found.push(child.props as ResizablePanelProps);
    else if (child.type === Fragment)
      collectPanelProps(child.props.children, found);
  });
  return found;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

export interface ResizablePanelGroupProps extends ComponentProps<"div"> {
  /** `"horizontal"` (default) places panels side by side. `"vertical"` stacks them. */
  orientation?: ResizableOrientation;
  /** Starting sizes by panel `id`, such as a layout saved by `useResizableLayout`. */
  defaultLayout?: ResizableLayout | undefined;
  /** Called on every change, including each pointer move while dragging. */
  onLayoutChange?: ((layout: ResizableLayout) => void) | undefined;
  /** Called once a change settles: on mount, after a drag ends, and after each key press. */
  onLayoutChanged?:
    | ((layout: ResizableLayout, details: ResizableLayoutChangeDetails) => void)
    | undefined;
}

/** A row or column of resizable panels separated by `ResizableHandle`s. */
export function ResizablePanelGroup({
  orientation = "horizontal",
  defaultLayout,
  onLayoutChange,
  onLayoutChanged,
  className,
  children,
  ref,
  ...props
}: ResizablePanelGroupProps) {
  const element = useRef<HTMLDivElement | null>(null);
  const panels = useRef(new Map<string, PanelEntry>());
  const separators = useRef(new Map<string, HTMLElement>());
  const [version, setVersion] = useState(0);
  const [extent, setExtent] = useState(0);
  const [layout, setLayout] = useState<ResizableLayout>({});
  const [bounds, setBounds] = useState<Record<string, Bounds>>({});
  const [links, setLinks] = useState<Record<string, SeparatorLink>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const layoutRef = useRef(layout);
  const panelKey = useRef<string | null>(null);
  const defaultsKey = useRef<string | null>(null);
  const interacted = useRef(false);
  const callbacks = useRef({ onLayoutChange, onLayoutChanged });
  callbacks.current = { onLayoutChange, onLayoutChanged };
  const horizontal = orientation === "horizontal";

  const autoSize = useMemo(() => {
    const declared = collectPanelProps(children).map((panel) =>
      staticPercent(panel.defaultSize),
    );
    const unknown = declared.filter((size) => size === undefined).length;
    const known = total(
      declared.filter((size): size is number => size !== undefined),
    );
    return unknown ? Math.max(0, 100 - known) / unknown : 0;
  }, [children]);

  const ordered = useCallback(
    () =>
      [...panels.current.values()].sort((a, b) =>
        a.element.compareDocumentPosition(b.element) &
        Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1,
      ),
    [],
  );

  const available = useCallback(() => {
    const root = element.current;
    if (!root) return 0;
    let size = horizontal ? root.clientWidth : root.clientHeight;
    for (const separator of separators.current.values())
      size -= horizontal ? separator.offsetWidth : separator.offsetHeight;
    return Math.max(0, size);
  }, [horizontal]);

  const measureBounds = useCallback(
    (entries: PanelEntry[]) => {
      const space = available();
      return entries.map((entry) => {
        const min = toPercent(entry.minSize, space, entry.element) ?? 0;
        const max = toPercent(entry.maxSize, space, entry.element) ?? 100;
        return {
          min: Math.min(Math.max(min, 0), 100),
          max: Math.max(Math.min(max, 100), Math.min(Math.max(min, 0), 100)),
        };
      });
    },
    [available],
  );

  const commit = useCallback(
    (
      ids: string[],
      sizes: number[],
      settled: ResizableLayoutChangeDetails | null,
    ) => {
      const next = Object.fromEntries(
        ids.map((id, index) => [id, sizes[index]!]),
      );
      if (!sameLayout(next, layoutRef.current)) {
        layoutRef.current = next;
        setLayout(next);
        callbacks.current.onLayoutChange?.(next);
      } else if (!settled) return;
      if (settled) callbacks.current.onLayoutChanged?.(next, settled);
    },
    [],
  );

  const defaultLayoutKey = defaultLayout ? JSON.stringify(defaultLayout) : "";
  useIsomorphicLayoutEffect(() => {
    const entries = ordered();
    const ids = entries.map((entry) => entry.id);
    const key = ids.join("\u0000");
    const limits = measureBounds(entries);
    const changedPanels = key !== panelKey.current;
    const changedDefaults = defaultLayoutKey !== defaultsKey.current;
    if (changedPanels) interacted.current = false;
    let sizes: number[];
    if (changedPanels || (changedDefaults && !interacted.current)) {
      const saved =
        defaultLayout &&
        ids.length &&
        ids.every((id) => typeof defaultLayout[id] === "number")
          ? ids.map((id) => defaultLayout[id]!)
          : null;
      if (saved) sizes = saved;
      else {
        const space = available();
        const declared = entries.map((entry) =>
          toPercent(entry.defaultSize, space, entry.element),
        );
        const unknown = declared.filter((size) => size === undefined).length;
        const rest =
          Math.max(
            0,
            100 -
              total(
                declared.filter((size): size is number => size !== undefined),
              ),
          ) / Math.max(unknown, 1);
        sizes = declared.map((size) => size ?? rest);
      }
    } else sizes = ids.map((id) => layoutRef.current[id] ?? 0);
    const before = layoutRef.current;
    const next = validate(sizes, limits);
    const nextLayout = Object.fromEntries(
      ids.map((id, index) => [id, next[index]!]),
    );
    commit(ids, next, null);
    if (changedPanels || !sameLayout(before, nextLayout))
      callbacks.current.onLayoutChanged?.(nextLayout, {
        isUserInteraction: false,
      });
    panelKey.current = key;
    defaultsKey.current = defaultLayoutKey;
    const nextBounds = Object.fromEntries(
      ids.map((id, index) => [id, limits[index]!]),
    );
    setBounds((current) =>
      JSON.stringify(current) === JSON.stringify(nextBounds)
        ? current
        : nextBounds,
    );
    const nextLinks: Record<string, SeparatorLink> = {};
    for (const [separatorId, separator] of separators.current) {
      let previous: PanelEntry | undefined;
      let following: PanelEntry | undefined;
      for (const entry of entries) {
        if (
          separator.compareDocumentPosition(entry.element) &
          Node.DOCUMENT_POSITION_PRECEDING
        )
          previous = entry;
        else {
          following = entry;
          break;
        }
      }
      if (previous && following)
        nextLinks[separatorId] = { before: previous.id, after: following.id };
    }
    setLinks((current) =>
      JSON.stringify(current) === JSON.stringify(nextLinks)
        ? current
        : nextLinks,
    );
  }, [
    version,
    extent,
    defaultLayoutKey,
    ordered,
    measureBounds,
    available,
    commit,
  ]);

  useEffect(() => {
    const root = element.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() =>
      setExtent(Math.round(available())),
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [available]);

  const registerPanel = useCallback((entry: PanelEntry) => {
    panels.current.set(entry.id, entry);
    setVersion((value) => value + 1);
    return () => {
      if (panels.current.get(entry.id) === entry)
        panels.current.delete(entry.id);
      setVersion((value) => value + 1);
    };
  }, []);

  const registerSeparator = useCallback((id: string, node: HTMLElement) => {
    separators.current.set(id, node);
    setVersion((value) => value + 1);
    return () => {
      separators.current.delete(id);
      setVersion((value) => value + 1);
    };
  }, []);

  const pivotFor = useCallback(
    (separatorId: string) => {
      const separator = separators.current.get(separatorId);
      if (!separator) return null;
      const entries = ordered();
      let pivot = -1;
      entries.forEach((entry, index) => {
        if (
          separator.compareDocumentPosition(entry.element) &
          Node.DOCUMENT_POSITION_PRECEDING
        )
          pivot = index;
      });
      if (pivot < 0 || pivot >= entries.length - 1) return null;
      const ids = entries.map((entry) => entry.id);
      return {
        ids,
        pivot,
        base: ids.map((id) => layoutRef.current[id] ?? 0),
        limits: measureBounds(entries),
      };
    },
    [ordered, measureBounds],
  );

  const reversed = useCallback(
    () =>
      horizontal &&
      !!element.current &&
      getComputedStyle(element.current).direction === "rtl",
    [horizontal],
  );

  const startDrag = useCallback(
    (separatorId: string, event: PointerEvent<HTMLElement>) => {
      const target = pivotFor(separatorId);
      if (!target) return;
      event.preventDefault();
      const handle = event.currentTarget;
      const pointerId = event.pointerId;
      const origin = horizontal ? event.clientX : event.clientY;
      const space = available();
      const direction = reversed() ? -1 : 1;
      const ownerDocument = handle.ownerDocument;
      const root = ownerDocument.documentElement;
      const previousCursor = root.style.cursor;
      const previousSelect = root.style.userSelect;
      root.style.cursor = horizontal ? "col-resize" : "row-resize";
      root.style.userSelect = "none";
      handle.setPointerCapture?.(pointerId);
      handle.focus({ preventScroll: true });
      setDragging(separatorId);
      let latest = target.base;
      const move = (moveEvent: globalThis.PointerEvent) => {
        if (moveEvent.pointerId !== pointerId || space <= 0) return;
        const position = horizontal ? moveEvent.clientX : moveEvent.clientY;
        const delta = (((position - origin) * direction) / space) * 100;
        latest = resize(target.base, target.limits, target.pivot, delta);
        commit(target.ids, latest, null);
      };
      const end = (endEvent: globalThis.PointerEvent) => {
        if (endEvent.pointerId !== pointerId) return;
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", end);
        handle.removeEventListener("pointercancel", end);
        handle.releasePointerCapture?.(pointerId);
        root.style.cursor = previousCursor;
        root.style.userSelect = previousSelect;
        setDragging(null);
        interacted.current = true;
        commit(target.ids, latest, { isUserInteraction: true });
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", end);
      handle.addEventListener("pointercancel", end);
    },
    [pivotFor, horizontal, available, reversed, commit],
  );

  const resizeWithKey = useCallback(
    (separatorId: string, key: string) => {
      const target = pivotFor(separatorId);
      if (!target) return false;
      const { base, limits, pivot } = target;
      const forward = reversed() ? -KEYBOARD_STEP : KEYBOARD_STEP;
      let delta: number;
      if (key === (horizontal ? "ArrowRight" : "ArrowDown")) delta = forward;
      else if (key === (horizontal ? "ArrowLeft" : "ArrowUp")) delta = -forward;
      else if (key === "Home") delta = limits[pivot]!.min - base[pivot]!;
      else if (key === "End") delta = limits[pivot]!.max - base[pivot]!;
      else return false;
      interacted.current = true;
      commit(target.ids, resize(base, limits, pivot, delta), {
        isUserInteraction: true,
      });
      return true;
    },
    [pivotFor, horizontal, reversed, commit],
  );

  const context = useMemo<GroupContextValue>(
    () => ({
      orientation,
      layout,
      autoSize,
      bounds,
      links,
      dragging,
      registerPanel,
      registerSeparator,
      startDrag,
      resizeWithKey,
    }),
    [
      orientation,
      layout,
      autoSize,
      bounds,
      links,
      dragging,
      registerPanel,
      registerSeparator,
      startDrag,
      resizeWithKey,
    ],
  );

  return (
    <GroupContext value={context}>
      <div
        data-slot="resizable-panel-group"
        data-orientation={orientation}
        data-dragging={dragging ? "" : undefined}
        className={cn("sprout-resizable-group", className)}
        ref={(node) => {
          element.current = node;
          assignRef(ref, node);
        }}
        {...props}
      >
        {children}
      </div>
    </GroupContext>
  );
}

export interface ResizablePanelProps extends Omit<ComponentProps<"div">, "id"> {
  /** Key for this panel in layouts. Set it when saving layouts or showing panels conditionally. */
  id?: string;
  /** Starting size. Panels without one share the space that is left. */
  defaultSize?: ResizableSize | undefined;
  /** Smallest size while resizing. Defaults to 0%. */
  minSize?: ResizableSize | undefined;
  /** Largest size while resizing. Defaults to 100%. */
  maxSize?: ResizableSize | undefined;
}

/** One resizable region. It must be a direct child of `ResizablePanelGroup`. */
export function ResizablePanel({
  id: idProp,
  defaultSize,
  minSize,
  maxSize,
  className,
  style,
  ref,
  ...props
}: ResizablePanelProps) {
  const group = useGroup("ResizablePanel");
  const generated = useId();
  const id = idProp ?? generated;
  const element = useRef<HTMLDivElement | null>(null);
  const { registerPanel } = group;
  useIsomorphicLayoutEffect(() => {
    if (!element.current) return;
    return registerPanel({
      id,
      element: element.current,
      defaultSize,
      minSize,
      maxSize,
    });
  }, [registerPanel, id, defaultSize, minSize, maxSize]);
  const size = group.layout[id] ?? staticPercent(defaultSize) ?? group.autoSize;
  const flex: CSSProperties = { flexGrow: size, flexShrink: 1, flexBasis: 0 };
  return (
    <div
      data-slot="resizable-panel"
      data-panel-id={id}
      id={id}
      className={cn("sprout-resizable-panel", className)}
      ref={(node) => {
        element.current = node;
        assignRef(ref, node);
      }}
      {...props}
      style={{ ...style, ...flex }}
    />
  );
}

export interface ResizableHandleProps extends ComponentProps<"div"> {
  /** Shows a small grip on the line, for splits people resize often. */
  withHandle?: boolean;
}

/**
 * The divider between two panels. Drag it, or focus it and use the arrow keys.
 * Home and End move it to the first panel's minimum and maximum size.
 */
export function ResizableHandle({
  withHandle = false,
  className,
  children,
  onPointerDown,
  onKeyDown,
  ref,
  ...props
}: ResizableHandleProps) {
  const group = useGroup("ResizableHandle");
  const id = useId();
  const element = useRef<HTMLDivElement | null>(null);
  const { registerSeparator } = group;
  useIsomorphicLayoutEffect(() => {
    if (!element.current) return;
    return registerSeparator(id, element.current);
  }, [registerSeparator, id]);
  const link = group.links[id];
  const value = link ? group.layout[link.before] : undefined;
  let limits: Bounds | undefined;
  if (link && group.bounds[link.before]) {
    const own = group.bounds[link.before]!;
    const others = Object.entries(group.bounds).filter(
      ([key]) => key !== link.before,
    );
    limits = {
      min: Math.max(own.min, 100 - total(others.map(([, bound]) => bound.max))),
      max: Math.min(own.max, 100 - total(others.map(([, bound]) => bound.min))),
    };
  }
  const lineOrientation =
    group.orientation === "horizontal" ? "vertical" : "horizontal";
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation={lineOrientation}
      aria-controls={link?.before}
      aria-valuenow={value === undefined ? undefined : Math.round(value)}
      aria-valuemin={limits ? Math.round(limits.min) : 0}
      aria-valuemax={limits ? Math.round(limits.max) : 100}
      data-slot="resizable-handle"
      data-orientation={lineOrientation}
      data-with-handle={withHandle ? "" : undefined}
      data-dragging={group.dragging === id ? "" : undefined}
      className={cn("sprout-resizable-handle", className)}
      ref={(node) => {
        element.current = node;
        assignRef(ref, node);
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.defaultPrevented || event.button !== 0) return;
        group.startDrag(id, event);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (group.resizeWithKey(id, event.key)) event.preventDefault();
      }}
      {...props}
    >
      {withHandle && (
        <span
          aria-hidden="true"
          data-slot="resizable-handle-grip"
          className="sprout-resizable-grip"
        />
      )}
      {children}
    </div>
  );
}

export interface UseResizableLayoutOptions {
  /** Storage key for this split. Use one per place the split appears. */
  id: string;
  /** Panel ids currently shown. Each set of panels keeps its own saved layout. */
  panelIds?: readonly string[] | undefined;
  /** Only save sizes the person chose, not the starting layout. */
  onlySaveAfterUserInteractions?: boolean | undefined;
  /** Where to save. Defaults to `localStorage`. */
  storage?: Pick<Storage, "getItem" | "setItem"> | undefined;
}

export interface ResizableLayoutStore {
  defaultLayout: ResizableLayout | undefined;
  onLayoutChanged: (
    layout: ResizableLayout,
    details: ResizableLayoutChangeDetails,
  ) => void;
}

const storageListeners = new Set<() => void>();

function browserStorage() {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Remembers a group's layout between visits. Spread the result onto
 * `ResizablePanelGroup` as `defaultLayout` and `onLayoutChanged`.
 */
export function useResizableLayout({
  id,
  panelIds,
  onlySaveAfterUserInteractions = false,
  storage,
}: UseResizableLayoutOptions): ResizableLayoutStore {
  const key = `sprout-resizable:${id}${panelIds ? `:${panelIds.join(",")}` : ""}`;
  const subscribe = useCallback((listener: () => void) => {
    storageListeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
      storageListeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  }, []);
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return (storage ?? browserStorage())?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    () => null,
  );
  const defaultLayout = useMemo(() => {
    if (!raw) return undefined;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        return undefined;
      const entries = Object.entries(parsed);
      return entries.every(
        ([, size]) => typeof size === "number" && Number.isFinite(size),
      )
        ? (Object.fromEntries(entries) as ResizableLayout)
        : undefined;
    } catch {
      return undefined;
    }
  }, [raw]);
  const onLayoutChanged = useCallback(
    (layout: ResizableLayout, details: ResizableLayoutChangeDetails) => {
      if (onlySaveAfterUserInteractions && !details.isUserInteraction) return;
      const value = JSON.stringify(layout);
      try {
        const target = storage ?? browserStorage();
        if (!target || target.getItem(key) === value) return;
        target.setItem(key, value);
      } catch {
        return;
      }
      for (const listener of storageListeners) listener();
    },
    [key, onlySaveAfterUserInteractions, storage],
  );
  return { defaultLayout, onLayoutChanged };
}
