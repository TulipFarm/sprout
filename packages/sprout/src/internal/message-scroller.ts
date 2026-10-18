// The scroll engine behind MessageScroller: follows new output, pins a new
// turn under the top edge, keeps the reader's place when older messages are
// prepended, and reports which edges can still be scrolled to.

export type MessageScrollerDefaultScrollPosition =
  "start" | "end" | "last-anchor";
export type MessageScrollerScrollAlign = "start" | "center" | "end" | "nearest";

export interface MessageScrollerScrollOptions {
  align?: MessageScrollerScrollAlign | undefined;
  behavior?: ScrollBehavior | undefined;
  scrollMargin?: number | undefined;
}

export interface MessageScrollerScrollable {
  start: boolean;
  end: boolean;
}

export interface MessageScrollerVisibilityState {
  currentAnchorId: string | null;
  visibleMessageIds: string[];
}

export interface MessageScrollerOptions {
  autoScroll: boolean;
  defaultScrollPosition: MessageScrollerDefaultScrollPosition;
  scrollEdgeThreshold: number;
  scrollPreviousItemPeek: number;
  scrollMargin: number;
}

type Mode =
  | "following-bottom"
  | "free-scrolling"
  | "anchored-to-message"
  | "settling-jump";

const epsilon = 0.5;
const autoscrollMs = 180;

export const scrollIntentKeys = new Set([
  "ArrowDown",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
  " ",
]);

const noEdges: MessageScrollerScrollable = { start: false, end: false };
const noVisibility: MessageScrollerVisibilityState = {
  currentAnchorId: null,
  visibleMessageIds: [],
};

export interface Store<T> {
  getSnapshot: () => T;
  hasListeners: () => boolean;
  setSnapshot: (next: T) => void;
  subscribe: (
    listener: () => void,
    onFirst?: () => void,
    onLast?: () => void,
  ) => () => void;
}

function createStore<T>(initial: T, equal: (a: T, b: T) => boolean): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => value,
    hasListeners: () => listeners.size > 0,
    setSnapshot: (next) => {
      if (equal(value, next)) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener, onFirst, onLast) => {
      const first = listeners.size === 0;
      listeners.add(listener);
      if (first) onFirst?.();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) onLast?.();
      };
    },
  };
}

const sameEdges = (
  a: MessageScrollerScrollable,
  b: MessageScrollerScrollable,
) => a.start === b.start && a.end === b.end;

const sameVisibility = (
  a: MessageScrollerVisibilityState,
  b: MessageScrollerVisibilityState,
) =>
  a.currentAnchorId === b.currentAnchorId &&
  a.visibleMessageIds.length === b.visibleMessageIds.length &&
  a.visibleMessageIds.every((id, index) => id === b.visibleMessageIds[index]);

const pixels = (value: string | undefined) => {
  const number = Number.parseFloat(value ?? "");
  return Number.isFinite(number) ? number : 0;
};

function blockPadding(element: Element | null | undefined) {
  if (!element) return { start: 0, end: 0 };
  const style = getComputedStyle(element);
  return {
    start: pixels(style.paddingBlockStart || style.paddingTop),
    end: pixels(style.paddingBlockEnd || style.paddingBottom),
  };
}

function rowGap(element: Element | null) {
  if (!element) return 0;
  const style = getComputedStyle(element);
  return pixels(style.rowGap === "normal" ? style.gap : style.rowGap);
}

const isAnchor = (element: HTMLElement | undefined) =>
  element?.dataset.scrollAnchor === "true";

function itemsOf(content: HTMLElement, spacer: HTMLElement | null) {
  return Array.from(content.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child !== spacer,
  );
}

const offsetIn = (element: HTMLElement, viewport: HTMLElement) =>
  element.getBoundingClientRect().top -
  viewport.getBoundingClientRect().top +
  viewport.scrollTop;

const topIn = (element: HTMLElement, viewport: HTMLElement) =>
  element.getBoundingClientRect().top - viewport.getBoundingClientRect().top;

const maxScroll = (viewport: HTMLElement) =>
  Math.max(0, viewport.scrollHeight - viewport.clientHeight);

function contentHeight(
  content: HTMLElement,
  spacer: HTMLElement | null,
  viewport: HTMLElement,
) {
  const padding = blockPadding(content);
  const viewportTop = viewport.getBoundingClientRect().top;
  let height = padding.start + padding.end;
  for (const item of itemsOf(content, spacer))
    height = Math.max(
      height,
      item.getBoundingClientRect().bottom -
        viewportTop +
        viewport.scrollTop +
        padding.end,
    );
  return height;
}

export class MessageScrollerController {
  options: MessageScrollerOptions;
  readonly stateStore = createStore<MessageScrollerScrollable>(
    noEdges,
    sameEdges,
  );
  readonly visibilityStore = createStore<MessageScrollerVisibilityState>(
    noVisibility,
    sameVisibility,
  );
  readonly pendingDefaultStore: Store<boolean>;
  preserveScrollOnPrepend = true;

  private root: HTMLElement | null = null;
  private viewport: HTMLElement | null = null;
  private content: HTMLElement | null = null;
  private spacer: HTMLElement | null = null;
  private spacerGap = 0;
  private spacerHeight = 0;
  private mode: Mode;
  private itemCount = 0;
  private firstItem: HTMLElement | null = null;
  private lastScrollTop = 0;
  private autoscrolling = false;
  private autoscrollTimer: number | null = null;
  private streamingTurn: HTMLElement | null = null;
  private pendingMessage: {
    messageId: string;
    options?: MessageScrollerScrollOptions | undefined;
  } | null = null;
  private prependRestore: { element: HTMLElement; viewportTop: number } | null =
    null;
  private defaultApplied = false;
  private messages = new Map<string, HTMLElement>();
  private visibleIds = new Set<string>();
  private handledAnchors = new WeakSet<HTMLElement>();
  private observer: IntersectionObserver | null = null;
  private stateFrame: number | null = null;
  private visibilityFrame: number | null = null;
  private pendingFrame: number | null = null;

  constructor(options: MessageScrollerOptions) {
    this.options = options;
    this.mode = options.autoScroll ? "following-bottom" : "free-scrolling";
    this.pendingDefaultStore = createStore(
      options.defaultScrollPosition === "end" ||
        options.defaultScrollPosition === "last-anchor",
      Object.is,
    );
  }

  setOptions(next: MessageScrollerOptions) {
    if (next.defaultScrollPosition !== this.options.defaultScrollPosition)
      this.defaultApplied = false;
    this.options = next;
  }

  // Elements

  setRoot = (element: HTMLElement | null) => {
    this.root = element;
    if (element) this.applyAttributes(this.stateStore.getSnapshot());
  };

  setViewport = (element: HTMLElement | null) => {
    this.viewport = element;
    if (element) this.applyAttributes(this.stateStore.getSnapshot());
  };

  getViewport = () => this.viewport;

  setContent = (element: HTMLElement | null) => {
    this.content = element;
  };

  setSpacer = (element: HTMLElement | null) => {
    this.spacer = element;
    this.spacerGap = rowGap(element?.parentElement ?? null);
  };

  registerMessage = (
    messageId: string,
    element: HTMLElement | null,
    previous: HTMLElement | null,
  ) => {
    if (element) {
      this.messages.set(messageId, element);
      this.observer?.observe(element);
      this.scheduleVisibility();
      if (this.pendingMessage?.messageId === messageId)
        this.schedulePendingFlush();
      return;
    }
    if (previous && this.messages.get(messageId) === previous) {
      this.messages.delete(messageId);
      this.visibleIds.delete(messageId);
      this.observer?.unobserve(previous);
      this.scheduleVisibility();
    }
  };

  // Public scrolling

  scrollToStart = ({
    behavior = "auto",
  }: MessageScrollerScrollOptions = {}) => {
    if (!this.viewport) return false;
    this.setSpacerHeight(0);
    this.streamingTurn = null;
    this.mode = "free-scrolling";
    this.scrollViewportTo(0, { behavior });
    this.scheduleVisibility();
    return true;
  };

  scrollToEnd = ({ behavior = "auto" }: MessageScrollerScrollOptions = {}) => {
    const viewport = this.viewport;
    if (!viewport) return false;
    this.setSpacerHeight(0);
    this.streamingTurn = null;
    this.mode = this.options.autoScroll ? "following-bottom" : "free-scrolling";
    this.scrollViewportTo(maxScroll(viewport), {
      autoscrolling: true,
      behavior,
    });
    this.scheduleVisibility();
    return true;
  };

  scrollToMessage = (
    messageId: string,
    options?: MessageScrollerScrollOptions,
  ) => {
    const element = this.messages.get(messageId);
    if (element) {
      this.markDefaultApplied();
      this.pendingMessage = this.scrollToElement(element, options)
        ? null
        : { messageId, options };
      return true;
    }
    if (this.itemCount === 0) {
      this.pendingMessage = { messageId, options };
      this.markDefaultApplied();
      return true;
    }
    return false;
  };

  // Events from the parts

  userScrollIntent = () => {
    if (this.mode !== "free-scrolling") {
      this.streamingTurn = null;
      this.mode = "free-scrolling";
    }
  };

  syncAfterScroll = () => {
    this.commit();
    this.scheduleVisibility();
    this.captureFirstVisible();
  };

  handleResize = () => {
    if (this.mode === "following-bottom" && this.options.autoScroll) {
      this.scrollToEnd();
      return;
    }
    const previousSpacer = this.spacerHeight;
    if (this.reanchor()) {
      if (
        this.options.autoScroll &&
        previousSpacer > 0 &&
        this.spacerHeight === 0
      )
        this.scrollToEnd();
      return;
    }
    this.scheduleCommit();
    this.scheduleVisibility();
  };

  handleContentChange = () => {
    const content = this.content;
    if (!content) return;
    const items = itemsOf(content, this.spacer);
    const previousCount = this.itemCount;
    const previousFirst = this.firstItem;
    this.itemCount = items.length;
    this.firstItem = items[0] ?? null;
    this.applyContentChange(items, previousCount, previousFirst);
    this.captureFirstVisible();
  };

  // Mount and option changes

  applyDefaultOrSettle = () => {
    if (!this.applyDefault() && this.itemCount === 0)
      this.pendingDefaultStore.setSnapshot(false);
  };

  followOnAutoScroll = () => {
    if (
      this.options.autoScroll &&
      this.mode === "following-bottom" &&
      this.itemCount > 0
    ) {
      this.scrollToEnd();
      return;
    }
    this.commit();
  };

  observeVisibility = () => {
    if (!this.viewport || !this.visibilityStore.hasListeners()) return;
    if (typeof IntersectionObserver === "undefined") {
      this.scheduleVisibility();
      return;
    }
    if (!this.observer) {
      const inset =
        this.options.scrollMargin + this.options.scrollPreviousItemPeek;
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const id = (entry.target as HTMLElement).dataset.messageId;
            if (!id) continue;
            if (entry.isIntersecting) this.visibleIds.add(id);
            else this.visibleIds.delete(id);
          }
          this.scheduleVisibility();
        },
        {
          root: this.viewport,
          rootMargin: `${-inset}px 0px 0px 0px`,
          threshold: [0, 0.01, 0.5, 1],
        },
      );
    }
    this.messages.forEach((element) => this.observer?.observe(element));
    this.scheduleVisibility();
  };

  unobserveVisibility = () => {
    if (this.visibilityFrame !== null)
      cancelAnimationFrame(this.visibilityFrame);
    this.visibilityFrame = null;
    this.observer?.disconnect();
    this.observer = null;
    this.visibleIds.clear();
    this.visibilityStore.setSnapshot(noVisibility);
  };

  dispose = () => {
    for (const frame of [
      this.stateFrame,
      this.visibilityFrame,
      this.pendingFrame,
    ])
      if (frame !== null) cancelAnimationFrame(frame);
    this.stateFrame = this.visibilityFrame = this.pendingFrame = null;
    if (this.autoscrollTimer !== null) clearTimeout(this.autoscrollTimer);
    this.autoscrollTimer = null;
    this.observer?.disconnect();
    this.observer = null;
  };

  // Internals

  private markDefaultApplied() {
    this.defaultApplied = true;
    this.pendingDefaultStore.setSnapshot(false);
  }

  private applyContentChange(
    items: HTMLElement[],
    previousCount: number,
    previousFirst: HTMLElement | null,
  ) {
    if (this.flushPendingMessage()) return;
    if (previousCount === 0) {
      if (
        this.applyDefault() ||
        (items.length > 0 && this.options.autoScroll && this.scrollToEnd())
      )
        return;
      this.commit();
      this.scheduleVisibility();
      return;
    }
    const firstIndex = previousFirst ? items.indexOf(previousFirst) : -1;
    if (this.preserveScrollOnPrepend && firstIndex > 0) {
      this.restorePrepend();
      return;
    }
    if (items.length > previousCount) {
      const anchor = items.slice(previousCount).find((item) => isAnchor(item));
      if (anchor) {
        const following =
          this.options.autoScroll && this.mode === "following-bottom";
        if (
          following &&
          items.slice(previousCount).filter((item) => isAnchor(item)).length > 1
        ) {
          this.scrollToEnd();
          return;
        }
        this.pinAnchor(anchor);
        return;
      }
    }
    if (items.length === previousCount) {
      const anchor = items.find(
        (item) => isAnchor(item) && !this.handledAnchors.has(item),
      );
      if (anchor) {
        this.pinAnchor(anchor);
        return;
      }
    }
    if (this.mode === "following-bottom" && this.options.autoScroll)
      this.scrollToEnd();
    else {
      this.commit();
      this.scheduleVisibility();
    }
  }

  private pinAnchor(anchor: HTMLElement) {
    this.scrollToElement(anchor, { align: "start" }, true);
    this.handledAnchors.add(anchor);
  }

  private applyDefault() {
    const position = this.options.defaultScrollPosition;
    if (this.defaultApplied || this.itemCount === 0) return false;
    let done = false;
    if (position === "last-anchor") {
      const content = this.content;
      const viewport = this.viewport;
      const anchor =
        content && viewport
          ? itemsOf(content, this.spacer).filter(isAnchor).pop()
          : undefined;
      if (!content || !viewport || !anchor) done = this.scrollToEnd();
      else
        done = this.measuringFrom(anchor, () =>
          contentHeight(content, this.spacer, viewport) -
            offsetIn(anchor, viewport) <=
          viewport.clientHeight
            ? this.scrollToEnd()
            : this.scrollToElement(anchor, { align: "start" }, true),
        );
    } else
      done = position === "end" ? this.scrollToEnd() : this.scrollToStart();
    if (done) this.markDefaultApplied();
    return done;
  }

  private scrollToElement(
    element: HTMLElement,
    options: MessageScrollerScrollOptions = {},
    keepPreviousPeek = false,
  ) {
    const content = this.content;
    const viewport = this.viewport;
    if (!content || !viewport || !content.contains(element)) return false;
    const {
      align = "start",
      behavior = "auto",
      scrollMargin = this.options.scrollMargin,
    } = options;
    const top = this.targetTop(
      element,
      align,
      keepPreviousPeek
        ? scrollMargin + this.options.scrollPreviousItemPeek
        : scrollMargin,
    );
    this.setSpacerHeight(
      top +
        viewport.clientHeight -
        this.measuringFrom(element, () =>
          contentHeight(content, this.spacer, viewport),
        ),
    );
    this.prependRestore = { element, viewportTop: topIn(element, viewport) };
    this.mode = keepPreviousPeek ? "anchored-to-message" : "settling-jump";
    this.streamingTurn = keepPreviousPeek ? element : null;
    this.scrollViewportTo(top, { behavior });
    this.scheduleVisibility();
    return true;
  }

  /** Off-screen items report a 10rem estimate under `content-visibility: auto`; lay out `from` and every later item at real size while measuring. */
  private measuringFrom<T>(from: HTMLElement, measure: () => T): T {
    const items = this.content ? itemsOf(this.content, this.spacer) : [];
    const later = items.slice(Math.max(0, items.indexOf(from)));
    const previous = later.map((item) => item.style.contentVisibility);
    for (const item of later) item.style.contentVisibility = "visible";
    try {
      return measure();
    } finally {
      later.forEach(
        (item, index) => (item.style.contentVisibility = previous[index] ?? ""),
      );
    }
  }

  private targetTop(
    element: HTMLElement,
    align: MessageScrollerScrollAlign,
    margin: number,
  ) {
    const viewport = this.viewport!;
    const offset = offsetIn(element, viewport);
    const height = element.getBoundingClientRect().height;
    const padding = blockPadding(this.spacer?.parentElement);
    if (align === "center") {
      const room = Math.max(
        0,
        viewport.clientHeight - padding.start - padding.end,
      );
      return offset - padding.start - (room - height) / 2 - margin;
    }
    if (align === "end")
      return offset - viewport.clientHeight + height + padding.end + margin;
    if (align === "nearest") {
      const top = viewport.scrollTop + padding.start;
      const bottom = viewport.scrollTop + viewport.clientHeight - padding.end;
      if (offset >= top && offset + height <= bottom) return viewport.scrollTop;
      return offset < top
        ? offset - padding.start - margin
        : offset + height - viewport.clientHeight + padding.end + margin;
    }
    return offset - padding.start - margin;
  }

  private reanchor() {
    const element = this.streamingTurn;
    if (!element || !element.isConnected || this.mode !== "anchored-to-message")
      return false;
    return this.scrollToElement(element, { align: "start" }, true);
  }

  private flushPendingMessage() {
    const pending = this.pendingMessage;
    if (!pending) return false;
    const element = this.messages.get(pending.messageId);
    if (!element || !this.scrollToElement(element, pending.options))
      return false;
    this.pendingMessage = null;
    this.markDefaultApplied();
    return true;
  }

  private schedulePendingFlush() {
    if (this.pendingFrame !== null) return;
    this.pendingFrame = requestAnimationFrame(() => {
      this.pendingFrame = null;
      if (this.flushPendingMessage()) this.captureFirstVisible();
    });
  }

  private setSpacerHeight(value: number) {
    const spacer = this.spacer;
    if (!spacer) return;
    const height = Math.max(0, Math.ceil(value));
    if (this.spacerHeight === height) return;
    this.spacerHeight = height;
    spacer.hidden = height === 0;
    spacer.style.height = `${height}px`;
    spacer.style.marginTop = height > 0 ? `${-this.spacerGap}px` : "";
  }

  private setAutoscrolling(on: boolean) {
    if (this.autoscrollTimer !== null) clearTimeout(this.autoscrollTimer);
    this.autoscrollTimer = null;
    if (this.autoscrolling !== on) {
      this.autoscrolling = on;
      this.commit();
    }
    if (on)
      this.autoscrollTimer = window.setTimeout(() => {
        this.autoscrollTimer = null;
        this.autoscrolling = false;
        this.commit();
      }, autoscrollMs);
  }

  private scrollViewportTo(
    value: number,
    {
      behavior = "auto",
      autoscrolling = false,
    }: { behavior?: ScrollBehavior; autoscrolling?: boolean } = {},
  ) {
    const viewport = this.viewport;
    if (!viewport) return;
    const top = Math.max(0, value);
    if (Math.abs(viewport.scrollTop - top) <= epsilon) {
      viewport.scrollTop = top;
      this.commit();
      return;
    }
    if (autoscrolling) this.setAutoscrolling(true);
    viewport.scrollTo({ top, behavior });
    this.scheduleCommit();
  }

  private restorePrepend() {
    const restore = this.prependRestore;
    const viewport = this.viewport;
    if (!restore || !viewport || !restore.element.isConnected) return false;
    const delta = topIn(restore.element, viewport) - restore.viewportTop;
    if (Math.abs(delta) <= epsilon) return false;
    viewport.scrollTop += delta;
    restore.viewportTop = topIn(restore.element, viewport);
    this.scheduleCommit();
    this.scheduleVisibility();
    return true;
  }

  private captureFirstVisible() {
    const content = this.content;
    const viewport = this.viewport;
    if (!content || !viewport) {
      this.prependRestore = null;
      return;
    }
    const bounds = viewport.getBoundingClientRect();
    const first = itemsOf(content, this.spacer).find((item) => {
      if (!item.dataset.messageId) return false;
      const rect = item.getBoundingClientRect();
      return rect.bottom > bounds.top && rect.top < bounds.bottom;
    });
    this.prependRestore = first
      ? { element: first, viewportTop: topIn(first, viewport) }
      : null;
  }

  private readEdges(): MessageScrollerScrollable {
    const { content, viewport } = this;
    if (!content || !viewport) return noEdges;
    const threshold = this.options.scrollEdgeThreshold;
    const height = contentHeight(content, this.spacer, viewport);
    return {
      start: viewport.scrollTop > threshold,
      end: height - viewport.scrollTop - viewport.clientHeight > threshold,
    };
  }

  private updateMode(edges: MessageScrollerScrollable) {
    const top = this.viewport?.scrollTop ?? 0;
    const scrolledUp = top < this.lastScrollTop - epsilon;
    this.lastScrollTop = top;
    if (
      this.options.autoScroll &&
      !edges.end &&
      this.mode !== "settling-jump" &&
      this.mode !== "anchored-to-message"
    )
      this.mode = "following-bottom";
    else if (
      this.mode === "following-bottom" &&
      edges.end &&
      scrolledUp &&
      !this.autoscrolling
    )
      this.mode = "free-scrolling";
  }

  private applyAttributes(edges: MessageScrollerScrollable) {
    const value = [edges.start && "start", edges.end && "end"]
      .filter(Boolean)
      .join(" ");
    for (const element of [this.root, this.viewport]) {
      if (!element) continue;
      if (value) element.setAttribute("data-scrollable", value);
      else element.removeAttribute("data-scrollable");
      element.toggleAttribute("data-autoscrolling", this.autoscrolling);
    }
  }

  private commit() {
    const edges = this.readEdges();
    this.updateMode(edges);
    const shown =
      this.mode === "following-bottom" ? { ...edges, end: false } : edges;
    this.applyAttributes(shown);
    this.stateStore.setSnapshot(shown);
  }

  private scheduleCommit() {
    if (this.stateFrame !== null) return;
    this.stateFrame = requestAnimationFrame(() => {
      this.stateFrame = null;
      this.commit();
    });
  }

  private scheduleVisibility() {
    if (!this.visibilityStore.hasListeners() || this.visibilityFrame !== null)
      return;
    this.visibilityFrame = requestAnimationFrame(() => {
      this.visibilityFrame = null;
      if (this.visibilityStore.hasListeners())
        this.visibilityStore.setSnapshot(this.readVisibility());
    });
  }

  private readVisibility(): MessageScrollerVisibilityState {
    const { content, viewport } = this;
    if (!content || !viewport) return noVisibility;
    const bounds = viewport.getBoundingClientRect();
    const line =
      bounds.top +
      this.options.scrollMargin +
      this.options.scrollPreviousItemPeek;
    const measure = typeof IntersectionObserver === "undefined";
    const visibleMessageIds: string[] = [];
    let currentAnchorId: string | null = null;
    for (const item of itemsOf(content, this.spacer)) {
      const id = item.dataset.messageId;
      if (!id) continue;
      const anchor = isAnchor(item);
      const rect = anchor || measure ? item.getBoundingClientRect() : null;
      const visible =
        measure && rect
          ? rect.bottom > line && rect.top < bounds.bottom
          : this.visibleIds.has(id);
      if (visible) visibleMessageIds.push(id);
      if (anchor && rect && rect.top <= line + epsilon) currentAnchorId = id;
    }
    return visibleMessageIds.length === 0 && currentAnchorId === null
      ? noVisibility
      : { currentAnchorId, visibleMessageIds };
  }
}
