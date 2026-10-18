"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  type RefCallback,
} from "react";
import { ChevronLeft } from "reicon-react/icons/ChevronLeft";
import { ChevronRight } from "reicon-react/icons/ChevronRight";
import { cn } from "../internal/classes.js";
import { Button, type ButtonProps } from "./button.js";

export const carouselOrientationNames = ["horizontal", "vertical"] as const;
export const carouselAlignNames = ["start", "center", "end"] as const;

export type CarouselOrientation = (typeof carouselOrientationNames)[number];
export type CarouselAlign = (typeof carouselAlignNames)[number];
export type CarouselEvent = "select" | "reInit";

export interface CarouselOptions {
  /** Where a slide lands in the viewport when it is the current one. Default `start`. */
  align?: CarouselAlign | undefined;
  /** Scroll freely without snapping to slides. Arrows and keys still step one slide. */
  dragFree?: boolean | undefined;
  /** Next on the last slide goes back to the first, and Previous on the first goes to the last. */
  loop?: boolean | undefined;
  /** The slide to show first, without animation. Default `0`. */
  startIndex?: number | undefined;
}

export interface CarouselApi {
  scrollPrev(): void;
  scrollNext(): void;
  scrollTo(index: number): void;
  canScrollPrev(): boolean;
  canScrollNext(): boolean;
  selectedScrollSnap(): number;
  /** Scroll offsets, in px, of each stop. Slides that share the end stop share one entry. */
  scrollSnapList(): number[];
  slideNodes(): HTMLElement[];
  on(event: CarouselEvent, listener: (api: CarouselApi) => void): CarouselApi;
  off(event: CarouselEvent, listener: (api: CarouselApi) => void): CarouselApi;
}

export interface CarouselProps extends ComponentProps<"div"> {
  opts?: CarouselOptions | undefined;
  orientation?: CarouselOrientation | undefined;
  /** Receives the carousel API once it mounts. */
  setApi?: ((api: CarouselApi) => void) | undefined;
}

export interface CarouselContextValue {
  /** Attach to the scrolling viewport. `CarouselContent` does this. */
  carouselRef: RefCallback<HTMLDivElement>;
  api: CarouselApi;
  opts: CarouselOptions | undefined;
  orientation: CarouselOrientation;
  scrollPrev: () => void;
  scrollNext: () => void;
  scrollTo: (index: number) => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  selectedIndex: number;
  snapCount: number;
}

const CarouselContext = createContext<CarouselContextValue | null>(null);

export function useCarousel() {
  const context = useContext(CarouselContext);
  if (!context)
    throw new Error("useCarousel must be used within a <Carousel />");
  return context;
}

const typing = 'input, textarea, select, [contenteditable="true"]';
const focusable =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

interface Geometry {
  position: number;
  max: number;
  snaps: number[];
}

function measure(
  viewport: HTMLElement,
  horizontal: boolean,
  align: CarouselAlign,
): Geometry {
  const position = horizontal ? viewport.scrollLeft : viewport.scrollTop;
  const view = horizontal ? viewport.clientWidth : viewport.clientHeight;
  const max = Math.max(
    0,
    (horizontal ? viewport.scrollWidth : viewport.scrollHeight) - view,
  );
  const frame = viewport.getBoundingClientRect();
  const slides = Array.from(viewport.firstElementChild?.children ?? []);
  const snaps: number[] = [];
  for (const slide of slides) {
    const box = slide.getBoundingClientRect();
    const start =
      (horizontal ? box.left - frame.left : box.top - frame.top) + position;
    const length = horizontal ? box.width : box.height;
    const target =
      align === "start"
        ? start
        : align === "center"
          ? start + length / 2 - view / 2
          : start + length - view;
    snaps.push(Math.round(Math.min(max, Math.max(0, target))));
  }
  // Like a contained scroll: the first stop is the start and the last is the end.
  if (snaps.length) {
    snaps[0] = 0;
    snaps[snaps.length - 1] = Math.round(max);
  }
  const unique = snaps.filter(
    (snap, index) => index === 0 || Math.abs(snap - snaps[index - 1]!) > 1,
  );
  return { position, max, snaps: unique.length ? unique : [0] };
}

function nearest(snaps: number[], position: number) {
  let best = 0;
  for (let index = 1; index < snaps.length; index += 1)
    if (Math.abs(snaps[index]! - position) < Math.abs(snaps[best]! - position))
      best = index;
  return best;
}

interface CarouselState {
  canScrollPrev: boolean;
  canScrollNext: boolean;
  selectedIndex: number;
  snapCount: number;
  viewportFocusable: boolean;
}

const initialState: CarouselState = {
  canScrollPrev: false,
  canScrollNext: false,
  selectedIndex: 0,
  snapCount: 0,
  viewportFocusable: false,
};

export function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  className,
  children,
  onKeyDownCapture,
  ...props
}: CarouselProps) {
  const horizontal = orientation === "horizontal";
  const align = opts?.align ?? "start";
  const loop = opts?.loop ?? false;
  const viewport = useRef<HTMLDivElement | null>(null);
  const settings = useRef({ horizontal, align, loop });
  settings.current = { horizontal, align, loop };
  const pending = useRef<{ target: number; timer: number } | null>(null);
  const selected = useRef(0);
  const listeners = useRef(
    new Map<CarouselEvent, Set<(api: CarouselApi) => void>>(),
  );
  const [state, setState] = useState(initialState);

  const geometry = useCallback((): Geometry | null => {
    const node = viewport.current;
    if (!node) return null;
    const { horizontal, align } = settings.current;
    return measure(node, horizontal, align);
  }, []);

  const apiRef = useRef<CarouselApi | null>(null);
  const emit = useCallback((event: CarouselEvent) => {
    const api = apiRef.current;
    if (!api) return;
    listeners.current.get(event)?.forEach((listener) => listener(api));
  }, []);

  const update = useCallback(() => {
    const node = viewport.current;
    const shape = geometry();
    if (!node || !shape) return;
    const { position, max, snaps } = shape;
    const target = pending.current?.target;
    if (target !== undefined && Math.abs(position - target) <= 1) {
      window.clearTimeout(pending.current!.timer);
      pending.current = null;
    }
    const wraps = settings.current.loop && snaps.length > 1;
    const next: CarouselState = {
      canScrollPrev: wraps || position > 1,
      canScrollNext: wraps || position < max - 1,
      selectedIndex: nearest(snaps, position),
      snapCount: snaps.length,
      viewportFocusable:
        max > 0 && !node.firstElementChild?.querySelector(focusable),
    };
    const changed = next.selectedIndex !== selected.current;
    selected.current = next.selectedIndex;
    setState((current) =>
      current.canScrollPrev === next.canScrollPrev &&
      current.canScrollNext === next.canScrollNext &&
      current.selectedIndex === next.selectedIndex &&
      current.snapCount === next.snapCount &&
      current.viewportFocusable === next.viewportFocusable
        ? current
        : next,
    );
    if (changed) emit("select");
  }, [emit, geometry]);

  const go = useCallback(
    (target: number, instant = false) => {
      const node = viewport.current;
      if (!node) return;
      if (pending.current) window.clearTimeout(pending.current.timer);
      pending.current = {
        target,
        timer: window.setTimeout(() => {
          pending.current = null;
          update();
        }, 700),
      };
      const key = settings.current.horizontal ? "left" : "top";
      node.scrollTo({
        [key]: target,
        ...(instant ? { behavior: "instant" } : {}),
      });
      update();
    },
    [update],
  );

  const scrollTo = useCallback(
    (index: number, instant = false) => {
      const shape = geometry();
      if (!shape) return;
      const clamped = Math.min(shape.snaps.length - 1, Math.max(0, index));
      go(shape.snaps[clamped]!, instant);
    },
    [geometry, go],
  );

  const step = useCallback(
    (direction: -1 | 1) => {
      const shape = geometry();
      if (!shape) return;
      const from = pending.current?.target ?? shape.position;
      const target =
        direction > 0
          ? shape.snaps.find((snap) => snap > from + 1)
          : [...shape.snaps].reverse().find((snap) => snap < from - 1);
      if (target !== undefined) go(target);
      else if (settings.current.loop && shape.snaps.length > 1)
        go(direction > 0 ? 0 : shape.max);
    },
    [geometry, go],
  );

  const scrollPrev = useCallback(() => step(-1), [step]);
  const scrollNext = useCallback(() => step(1), [step]);

  if (!apiRef.current) {
    const api: CarouselApi = {
      scrollPrev: () => step(-1),
      scrollNext: () => step(1),
      scrollTo: (index) => scrollTo(index),
      canScrollPrev: () => {
        const shape = geometry();
        if (!shape) return false;
        return (
          (settings.current.loop && shape.snaps.length > 1) ||
          shape.position > 1
        );
      },
      canScrollNext: () => {
        const shape = geometry();
        if (!shape) return false;
        return (
          (settings.current.loop && shape.snaps.length > 1) ||
          shape.position < shape.max - 1
        );
      },
      selectedScrollSnap: () => selected.current,
      scrollSnapList: () => geometry()?.snaps ?? [],
      slideNodes: () =>
        Array.from(
          viewport.current?.firstElementChild?.children ?? [],
        ) as HTMLElement[],
      on: (event, listener) => {
        const set = listeners.current.get(event) ?? new Set();
        set.add(listener);
        listeners.current.set(event, set);
        return api;
      },
      off: (event, listener) => {
        listeners.current.get(event)?.delete(listener);
        return api;
      },
    };
    apiRef.current = api;
  }
  const api = apiRef.current;

  const frame = useRef(0);
  const scheduleUpdate = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      update();
    });
  }, [update]);

  const startIndex = opts?.startIndex ?? 0;
  const started = useRef(false);
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const carouselRef = useCallback<RefCallback<HTMLDivElement>>((element) => {
    viewport.current = element;
    setNode(element);
  }, []);

  useEffect(() => {
    if (!node) return;
    const reInit = () => {
      update();
      emit("reInit");
    };
    if (!started.current) {
      started.current = true;
      if (startIndex > 0) scrollTo(startIndex, true);
    }
    update();
    const resize = new ResizeObserver(reInit);
    resize.observe(node);
    const track = node.firstElementChild;
    if (track) resize.observe(track);
    const mutation = new MutationObserver(() => {
      if (track) for (const slide of track.children) resize.observe(slide);
      reInit();
    });
    if (track) {
      for (const slide of track.children) resize.observe(slide);
      mutation.observe(track, { childList: true, subtree: true });
    }
    node.addEventListener("scroll", scheduleUpdate, { passive: true });
    node.addEventListener("scrollend", update);
    return () => {
      resize.disconnect();
      mutation.disconnect();
      node.removeEventListener("scroll", scheduleUpdate);
      node.removeEventListener("scrollend", update);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [node, emit, scheduleUpdate, scrollTo, startIndex, update]);

  // Orientation, alignment, and looping change the stops.
  useEffect(() => {
    if (!node) return;
    update();
    emit("reInit");
  }, [node, horizontal, align, loop, update, emit]);

  useEffect(() => {
    if (!setApi) return;
    setApi(api);
  }, [api, setApi]);

  useEffect(
    () => () => {
      if (pending.current) window.clearTimeout(pending.current.timer);
    },
    [],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDownCapture?.(event);
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    if ((event.target as Element).closest(typing)) return;
    const back =
      event.key === "ArrowLeft" || (!horizontal && event.key === "ArrowUp");
    const forward =
      event.key === "ArrowRight" || (!horizontal && event.key === "ArrowDown");
    if (back || forward) {
      event.preventDefault();
      step(back ? -1 : 1);
    } else if (event.key === "Home" || event.key === "End") {
      if (!(event.target as Element).closest('[data-slot="carousel-content"]'))
        return;
      event.preventDefault();
      scrollTo(event.key === "Home" ? 0 : Number.MAX_SAFE_INTEGER);
    }
  };

  const value = useMemo<CarouselContextValue>(
    () => ({
      carouselRef,
      api,
      opts,
      orientation,
      scrollPrev,
      scrollNext,
      scrollTo: (index: number) => scrollTo(index),
      canScrollPrev: state.canScrollPrev,
      canScrollNext: state.canScrollNext,
      selectedIndex: state.selectedIndex,
      snapCount: state.snapCount,
    }),
    [
      carouselRef,
      api,
      opts,
      orientation,
      scrollPrev,
      scrollNext,
      scrollTo,
      state,
    ],
  );

  return (
    <CarouselContext.Provider value={value}>
      <ViewportFocus.Provider value={state.viewportFocusable}>
        <div
          role="region"
          aria-roledescription="carousel"
          data-slot="carousel"
          data-orientation={orientation}
          className={cn("sprout-carousel", className)}
          onKeyDownCapture={handleKeyDown}
          {...props}
        >
          {children}
        </div>
      </ViewportFocus.Provider>
    </CarouselContext.Provider>
  );
}

const ViewportFocus = createContext(false);

export function CarouselContent({
  className,
  ...props
}: ComponentProps<"div">) {
  const { carouselRef, orientation, opts, api } = useCarousel();
  const focusableViewport = useContext(ViewportFocus);
  const horizontal = orientation === "horizontal";
  const drag = useRef<{
    id: number;
    start: number;
    scroll: number;
    moved: boolean;
  } | null>(null);
  const node = useRef<HTMLDivElement | null>(null);
  const ref = useCallback<RefCallback<HTMLDivElement>>(
    (element) => {
      node.current = element;
      carouselRef(element);
    },
    [carouselRef],
  );

  const coordinate = (event: PointerEvent) =>
    horizontal ? event.clientX : event.clientY;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    if ((event.target as Element).closest(typing)) return;
    const viewport = node.current!;
    drag.current = {
      id: event.pointerId,
      start: coordinate(event),
      scroll: horizontal ? viewport.scrollLeft : viewport.scrollTop,
      moved: false,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const delta = coordinate(event) - current.start;
    if (!current.moved) {
      if (Math.abs(delta) < 5) return;
      current.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.setAttribute("data-dragging", "");
    }
    const viewport = event.currentTarget;
    if (horizontal) viewport.scrollLeft = current.scroll - delta;
    else viewport.scrollTop = current.scroll - delta;
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    if (!current.moved) return;
    const viewport = event.currentTarget;
    if (viewport.hasPointerCapture(event.pointerId))
      viewport.releasePointerCapture(event.pointerId);
    const swallow = (click: MouseEvent) => {
      click.preventDefault();
      click.stopPropagation();
    };
    window.addEventListener("click", swallow, { capture: true, once: true });
    window.setTimeout(
      () => window.removeEventListener("click", swallow, { capture: true }),
      0,
    );
    const release = () => {
      if (!drag.current) viewport.removeAttribute("data-dragging");
    };
    if (opts?.dragFree) return release();
    const position = horizontal ? viewport.scrollLeft : viewport.scrollTop;
    const view = horizontal ? viewport.clientWidth : viewport.clientHeight;
    const moved = position - current.scroll;
    const snaps = api.scrollSnapList();
    const from = nearest(snaps, current.scroll);
    // A short flick still moves one slide; a long drag lands on the nearest.
    const index =
      Math.abs(moved) > view * 0.5
        ? nearest(snaps, position)
        : Math.abs(moved) > Math.min(40, view * 0.15)
          ? from + Math.sign(moved)
          : from;
    const target = snaps[Math.min(snaps.length - 1, Math.max(0, index))];
    if (target === undefined || Math.abs(target - position) < 1)
      return release();
    // Snapping stays off until the settle scroll ends; turning it back on
    // earlier makes the browser pull the viewport to the closest stop instead.
    let timer = 0;
    const settle = () => {
      window.clearTimeout(timer);
      viewport.removeEventListener("scrollend", settle);
      release();
    };
    viewport.addEventListener("scrollend", settle);
    timer = window.setTimeout(settle, 700);
    const smooth = window.matchMedia(
      "(prefers-reduced-motion: no-preference)",
    ).matches;
    viewport.scrollTo({
      [horizontal ? "left" : "top"]: target,
      behavior: smooth ? "smooth" : "instant",
    });
  };

  return (
    <div
      ref={ref}
      data-slot="carousel-content"
      data-orientation={orientation}
      data-align={opts?.align ?? "start"}
      data-drag-free={opts?.dragFree ? "" : undefined}
      tabIndex={focusableViewport ? 0 : undefined}
      className="sprout-carousel-content"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onDragStart={(event) => {
        if (drag.current) event.preventDefault();
      }}
    >
      <div
        data-slot="carousel-track"
        className={cn("sprout-carousel-track", className)}
        {...props}
      />
    </div>
  );
}

export function CarouselItem({ className, ...props }: ComponentProps<"div">) {
  const { orientation } = useCarousel();
  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      data-orientation={orientation}
      className={cn("sprout-carousel-item", className)}
      {...props}
    />
  );
}

export type CarouselButtonProps = Omit<ButtonProps, "state" | "pendingLabel">;

export function CarouselPrevious({
  className,
  variant = "secondary",
  size = "icon",
  children,
  ...props
}: CarouselButtonProps) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();
  return (
    <Button
      data-slot="carousel-previous"
      data-orientation={orientation}
      variant={variant}
      size={size}
      aria-label="Previous slide"
      focusableWhenDisabled
      className={cn(
        "sprout-carousel-control",
        "sprout-carousel-previous",
        className,
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      {children ?? <ChevronLeft aria-hidden="true" />}
    </Button>
  );
}

export function CarouselNext({
  className,
  variant = "secondary",
  size = "icon",
  children,
  ...props
}: CarouselButtonProps) {
  const { orientation, scrollNext, canScrollNext } = useCarousel();
  return (
    <Button
      data-slot="carousel-next"
      data-orientation={orientation}
      variant={variant}
      size={size}
      aria-label="Next slide"
      focusableWhenDisabled
      className={cn(
        "sprout-carousel-control",
        "sprout-carousel-next",
        className,
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      {children ?? <ChevronRight aria-hidden="true" />}
    </Button>
  );
}
