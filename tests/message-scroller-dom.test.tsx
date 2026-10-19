// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
  useMessageScrollerVisibility,
} from "../packages/sprout/src/components/message-scroller.js";

afterEach(() => vi.unstubAllGlobals());

function Thread({
  onKeyDown,
  onScroll,
  onTouchMove,
  onWheel,
  onClick,
  rootRef,
  viewportRef,
  contentRef,
  itemRef,
}: {
  onKeyDown?: () => void;
  onScroll?: () => void;
  onTouchMove?: () => void;
  onWheel?: () => void;
  onClick?: (event: React.MouseEvent) => void;
  rootRef?: React.Ref<HTMLDivElement>;
  viewportRef?: React.Ref<HTMLDivElement>;
  contentRef?: React.Ref<HTMLDivElement>;
  itemRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <MessageScrollerProvider defaultScrollPosition="start">
      <MessageScroller ref={rootRef}>
        <MessageScrollerViewport
          ref={viewportRef}
          onKeyDown={onKeyDown}
          onScroll={onScroll}
          onTouchMove={onTouchMove}
          onWheel={onWheel}
        >
          <MessageScrollerContent ref={contentRef}>
            <MessageScrollerItem messageId="a" ref={itemRef}>
              Seed order
            </MessageScrollerItem>
            <MessageScrollerItem>Untracked</MessageScrollerItem>
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton direction="start" onClick={onClick} />
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

describe("MessageScroller in the DOM", () => {
  it("forwards refs and handlers on the viewport", () => {
    const handlers = {
      onKeyDown: vi.fn(),
      onScroll: vi.fn(),
      onTouchMove: vi.fn(),
      onWheel: vi.fn(),
    };
    const rootRef = createRef<HTMLDivElement>();
    const viewportRef = vi.fn();
    const contentRef = createRef<HTMLDivElement>();
    const itemRef = createRef<HTMLDivElement>();
    const { unmount } = render(
      <Thread
        {...handlers}
        rootRef={rootRef}
        viewportRef={viewportRef}
        contentRef={contentRef}
        itemRef={itemRef}
      />,
    );
    expect(rootRef.current?.dataset.slot).toBe("message-scroller");
    expect(viewportRef).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    expect(contentRef.current?.getAttribute("role")).toBe("log");
    expect(itemRef.current?.dataset.messageId).toBe("a");
    const viewport = screen.getByRole("region", { name: "Messages" });
    fireEvent.keyDown(viewport, { key: "ArrowUp" });
    fireEvent.keyDown(viewport, { key: "a" });
    fireEvent.scroll(viewport);
    fireEvent.touchMove(viewport);
    fireEvent.wheel(viewport);
    expect(handlers.onKeyDown).toHaveBeenCalledTimes(2);
    expect(handlers.onScroll).toHaveBeenCalledOnce();
    expect(handlers.onTouchMove).toHaveBeenCalledOnce();
    expect(handlers.onWheel).toHaveBeenCalledOnce();
    unmount();
  });

  it("works without ResizeObserver and MutationObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    vi.stubGlobal("MutationObserver", undefined);
    render(<Thread />);
    expect(screen.getByText("Seed order")).toBeTruthy();
  });

  it("runs the resize observers through animation frames", () => {
    const callbacks: ResizeObserverCallback[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: ResizeObserverCallback) {
          callbacks.push(cb);
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<Thread />);
    act(() => callbacks.forEach((cb) => cb([], {} as ResizeObserver)));
    expect(callbacks.length).toBe(2);
  });

  it("scrolls from the buttons only while active", () => {
    const onClick = vi.fn();
    render(<Thread onClick={onClick} />);
    const viewport = screen.getByRole("region");
    const [start, end] = screen.getAllByRole("button", { hidden: true });
    fireEvent.click(start!);
    expect(onClick).not.toHaveBeenCalled();

    Object.defineProperties(viewport, {
      scrollTop: { value: 100, writable: true },
      clientHeight: { value: 50 },
    });
    viewport.scrollTo = vi.fn();
    const item = screen.getByText("Seed order");
    item.getBoundingClientRect = () =>
      ({ top: -100, bottom: 400, height: 500 }) as DOMRect;
    fireEvent.scroll(viewport);
    expect(start!.getAttribute("data-active")).toBe("true");
    expect(end!.getAttribute("data-active")).toBe("true");

    fireEvent.click(start!);
    expect(onClick).toHaveBeenCalledOnce();
    expect(viewport.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });

    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    fireEvent.click(end!);
    expect(viewport.scrollTo).toHaveBeenLastCalledWith({
      top: expect.any(Number),
      behavior: "auto",
    });
  });

  it("lets onClick cancel the jump", () => {
    render(<Thread onClick={(event) => event.preventDefault()} />);
    const viewport = screen.getByRole("region");
    Object.defineProperty(viewport, "scrollTop", {
      value: 100,
      writable: true,
    });
    viewport.scrollTo = vi.fn();
    fireEvent.scroll(viewport);
    fireEvent.click(screen.getAllByRole("button", { hidden: true })[0]!);
    expect(viewport.scrollTo).not.toHaveBeenCalled();
  });

  it("exposes the scroll api and visibility to children", () => {
    let api: ReturnType<typeof useMessageScroller> | undefined;
    function Probe() {
      api = useMessageScroller();
      const visibility = useMessageScrollerVisibility();
      return <output>{visibility.visibleMessageIds.join(",")}</output>;
    }
    const { unmount } = render(
      <MessageScrollerProvider defaultScrollPosition="end">
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent>
              <MessageScrollerItem messageId="x">One</MessageScrollerItem>
            </MessageScrollerContent>
          </MessageScrollerViewport>
        </MessageScroller>
        <Probe />
      </MessageScrollerProvider>,
    );
    expect(api!.scrollToMessage("x")).toBe(true);
    expect(api!.scrollToEnd()).toBe(true);
    expect(api!.scrollToStart()).toBe(true);
    unmount();
  });
});
