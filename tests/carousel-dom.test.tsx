// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
  type CarouselProps,
} from "../packages/sprout/src/components/carousel.js";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Three 100px slides in a 100px viewport. */
function layout(viewport: HTMLElement, horizontal = true) {
  const state = { pos: 0 };
  const [p, v, s] = horizontal
    ? ["scrollLeft", "clientWidth", "scrollWidth"]
    : ["scrollTop", "clientHeight", "scrollHeight"];
  Object.defineProperties(viewport, {
    [p]: {
      configurable: true,
      get: () => state.pos,
      set: (value: number) => (state.pos = value),
    },
    [v]: { configurable: true, value: 100 },
    [s]: { configurable: true, value: 300 },
  });
  viewport.scrollTo = vi.fn((options: ScrollToOptions) => {
    state.pos = (horizontal ? options.left : options.top) ?? state.pos;
  }) as never;
  viewport.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;
  Array.from(viewport.firstElementChild!.children).forEach((slide, i) => {
    slide.getBoundingClientRect = () => {
      const at = i * 100 - state.pos;
      return { left: at, top: at, width: 100, height: 100 } as DOMRect;
    };
  });
  act(() => {
    viewport.dispatchEvent(new Event("scrollend"));
  });
  return state;
}

function Slides({
  input,
  ...props
}: Partial<CarouselProps> & { input?: boolean }) {
  return (
    <Carousel aria-label="Photos" {...props}>
      <CarouselContent>
        <CarouselItem>One</CarouselItem>
        <CarouselItem>
          {input ? <input aria-label="Caption" /> : "Two"}
        </CarouselItem>
        <CarouselItem>Three</CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}

function setup(props: Partial<CarouselProps> & { input?: boolean } = {}) {
  let api: CarouselApi | undefined;
  render(<Slides setApi={(a) => (api = a)} {...props} />);
  const viewport = document.querySelector<HTMLElement>(
    "[data-slot='carousel-content']",
  )!;
  const state = layout(viewport, props.orientation !== "vertical");
  const prev = screen.getByRole("button", { name: "Previous slide" });
  const next = screen.getByRole("button", { name: "Next slide" });
  return { api: api!, viewport, state, prev, next };
}

const disabled = (el: HTMLElement) =>
  el.getAttribute("aria-disabled") === "true";

describe("Carousel in the DOM", () => {
  it("steps with the buttons and reports through the api", () => {
    const { api, viewport, state, prev, next } = setup();
    const onSelect = vi.fn();
    api.on("select", onSelect);
    expect(disabled(prev)).toBe(true);
    expect(viewport.tabIndex).toBe(0);
    expect(api.scrollSnapList()).toEqual([0, 100, 200]);
    expect(api.slideNodes()).toHaveLength(3);
    act(() => fireEvent.click(next));
    expect(state.pos).toBe(100);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(api.selectedScrollSnap()).toBe(1);
    expect(api.canScrollPrev()).toBe(true);
    act(() => api.scrollNext());
    expect(api.canScrollNext()).toBe(false);
    expect(disabled(next)).toBe(true);
    act(() => api.scrollNext());
    expect(state.pos).toBe(200);
    act(() => api.scrollPrev());
    act(() => fireEvent.click(prev));
    expect(state.pos).toBe(0);
    act(() => api.scrollPrev());
    expect(state.pos).toBe(0);
    api.off("select", onSelect);
    act(() => api.scrollTo(9));
    expect(state.pos).toBe(200);
    expect(onSelect).toHaveBeenCalledTimes(4);
  });

  it("wraps around when looping", () => {
    const { api, state, prev } = setup({ opts: { loop: true } });
    expect(disabled(prev)).toBe(false);
    expect(api.canScrollPrev()).toBe(true);
    expect(api.canScrollNext()).toBe(true);
    act(() => fireEvent.click(prev));
    expect(state.pos).toBe(200);
    act(() => api.scrollNext());
    expect(state.pos).toBe(0);
  });

  it("settles a pending scroll after a timeout", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { api, viewport, state } = setup();
    viewport.scrollTo = vi.fn() as never;
    act(() => api.scrollNext());
    act(() => api.scrollNext());
    expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 200 });
    act(() => vi.advanceTimersByTime(700));
    state.pos = 200;
    act(() => {
      viewport.dispatchEvent(new Event("scrollend"));
    });
    expect(api.selectedScrollSnap()).toBe(2);
  });

  it("clears the pending scroll when it lands", () => {
    const { api, viewport } = setup();
    viewport.scrollTo = vi.fn() as never;
    act(() => api.scrollNext());
    Object.defineProperty(viewport, "scrollLeft", { value: 100 });
    act(() => {
      viewport.dispatchEvent(new Event("scrollend"));
    });
    act(() => api.scrollNext());
    expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 200 });
  });

  it("moves with arrow keys, Home, and End", () => {
    const onKeyDownCapture = vi.fn();
    const { viewport, state, next } = setup({ onKeyDownCapture });
    fireEvent.keyDown(viewport, { key: "ArrowRight" });
    expect(state.pos).toBe(100);
    fireEvent.keyDown(viewport, { key: "ArrowLeft" });
    expect(state.pos).toBe(0);
    fireEvent.keyDown(viewport, { key: "ArrowDown" });
    expect(state.pos).toBe(0);
    fireEvent.keyDown(viewport, { key: "End" });
    expect(state.pos).toBe(200);
    fireEvent.keyDown(next, { key: "Home" });
    expect(state.pos).toBe(200);
    fireEvent.keyDown(viewport, { key: "Home" });
    expect(state.pos).toBe(0);
    fireEvent.keyDown(viewport, { key: "ArrowRight", ctrlKey: true });
    fireEvent.keyDown(viewport, { key: "a" });
    expect(state.pos).toBe(0);
    expect(onKeyDownCapture).toHaveBeenCalledTimes(8);
  });

  it("ignores keys while typing or after preventDefault", () => {
    const { state } = setup({
      input: true,
      onKeyDownCapture: (event) => {
        if (event.key === "ArrowLeft") event.preventDefault();
      },
    });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "ArrowRight" });
    expect(state.pos).toBe(0);
    fireEvent.keyDown(screen.getByText("One"), { key: "ArrowLeft" });
    expect(state.pos).toBe(0);
    expect(
      document.querySelector<HTMLElement>("[data-slot='carousel-content']")!
        .tabIndex,
    ).toBe(-1);
  });

  it("uses up and down keys when vertical", () => {
    const { viewport, state } = setup({ orientation: "vertical" });
    fireEvent.keyDown(viewport, { key: "ArrowDown" });
    expect(state.pos).toBe(100);
    fireEvent.keyDown(viewport, { key: "ArrowUp" });
    expect(state.pos).toBe(0);
  });

  it("aligns snaps to the center or end and starts at an index", () => {
    HTMLElement.prototype.scrollTo = vi.fn();
    const { api } = setup({ opts: { align: "center" } });
    expect(api.scrollSnapList()).toEqual([0, 100, 200]);
    document.body.innerHTML = "";
    const end = setup({ opts: { align: "end", startIndex: 2 } });
    expect(end.api.scrollSnapList()).toEqual([0, 100, 200]);
  });

  it("reinitializes on resize and mutation", () => {
    const resize: ResizeObserverCallback[] = [];
    const mutate: MutationCallback[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: ResizeObserverCallback) {
          resize.push(cb);
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      "MutationObserver",
      class {
        constructor(cb: MutationCallback) {
          mutate.push(cb);
        }
        observe() {}
        disconnect() {}
      },
    );
    const { api } = setup();
    const onReInit = vi.fn();
    api.on("reInit", onReInit);
    act(() => resize.at(-1)!([], {} as ResizeObserver));
    act(() => mutate.at(-1)!([], {} as MutationObserver));
    expect(onReInit).toHaveBeenCalledTimes(2);
  });

  it("updates on scroll through one animation frame", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
      frames.push(cb),
    );
    const { api, viewport, state } = setup();
    state.pos = 200;
    fireEvent.scroll(viewport);
    fireEvent.scroll(viewport);
    expect(frames).toHaveLength(1);
    act(() => frames[0]!(0));
    expect(api.selectedScrollSnap()).toBe(2);
  });

  describe("dragging", () => {
    const drag = (viewport: HTMLElement, moves: number[], up = "pointerUp") => {
      fireEvent.pointerDown(viewport, {
        pointerType: "mouse",
        button: 0,
        pointerId: 1,
        clientX: 300,
      });
      for (const x of moves)
        fireEvent.pointerMove(viewport, { pointerId: 1, clientX: x });
      fireEvent[up as "pointerUp"](viewport, { pointerId: 1 });
    };

    function dragSetup(props: Partial<CarouselProps> = {}) {
      const captured = new Set<number>();
      HTMLElement.prototype.setPointerCapture = (id) => captured.add(id);
      HTMLElement.prototype.hasPointerCapture = (id) => captured.has(id);
      HTMLElement.prototype.releasePointerCapture = (id) => captured.delete(id);
      return setup(props);
    }

    it("flicks one slide and swallows the click", () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      vi.stubGlobal("matchMedia", () => ({ matches: true }));
      const { viewport, state } = dragSetup();
      drag(viewport, [298, 250]);
      expect(viewport.hasAttribute("data-dragging")).toBe(true);
      expect(viewport.scrollTo).toHaveBeenLastCalledWith({
        left: 100,
        behavior: "smooth",
      });
      const onClick = vi.fn();
      viewport.addEventListener("click", onClick);
      fireEvent.click(viewport);
      expect(onClick).not.toHaveBeenCalled();
      viewport.dispatchEvent(new Event("scrollend"));
      expect(viewport.hasAttribute("data-dragging")).toBe(false);
      vi.runAllTimers();
      expect(state.pos).toBe(100);
    });

    it("lands on the nearest slide after a long drag", () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      vi.stubGlobal("matchMedia", () => ({ matches: false }));
      const { viewport } = dragSetup({ orientation: "horizontal" });
      drag(viewport, [100, 130]);
      expect(viewport.scrollTo).toHaveBeenLastCalledWith({
        left: 200,
        behavior: "instant",
      });
      vi.advanceTimersByTime(700);
      expect(viewport.hasAttribute("data-dragging")).toBe(false);
    });

    it("stays put after a short drag or when drag free", () => {
      const { viewport, state } = dragSetup({ opts: { dragFree: true } });
      drag(viewport, [250], "pointerCancel");
      expect(state.pos).toBe(50);
      expect(viewport.hasAttribute("data-dragging")).toBe(false);

      document.body.innerHTML = "";
      const short = dragSetup();
      drag(short.viewport, [250, 200]);
      expect(short.state.pos).toBe(100);
      expect(short.viewport.hasAttribute("data-dragging")).toBe(false);
    });

    it("drags vertically", () => {
      const { viewport, state } = dragSetup({ orientation: "vertical" });
      fireEvent.pointerDown(viewport, {
        pointerType: "mouse",
        button: 0,
        pointerId: 2,
        clientY: 300,
      });
      fireEvent.pointerMove(viewport, { pointerId: 2, clientY: 200 });
      expect(state.pos).toBe(100);
      fireEvent.pointerUp(viewport, { pointerId: 2 });
    });

    it("ignores touch, other buttons, other pointers, and inputs", () => {
      const { viewport, state } = dragSetup({ input: true });
      fireEvent.pointerDown(viewport, { pointerType: "touch", button: 0 });
      fireEvent.pointerDown(viewport, { pointerType: "mouse", button: 2 });
      fireEvent.pointerDown(screen.getByRole("textbox"), {
        pointerType: "mouse",
        button: 0,
      });
      fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 0 });
      fireEvent.pointerUp(viewport, { pointerId: 1 });
      fireEvent.pointerDown(viewport, {
        pointerType: "mouse",
        button: 0,
        pointerId: 1,
        clientX: 300,
      });
      fireEvent.dragStart(viewport);
      fireEvent.pointerMove(viewport, { pointerId: 9, clientX: 0 });
      fireEvent.pointerUp(viewport, { pointerId: 9 });
      expect(state.pos).toBe(0);
    });
  });
});
