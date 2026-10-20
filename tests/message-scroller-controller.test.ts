// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MessageScrollerController,
  type MessageScrollerOptions,
} from '../packages/sprout/src/internal/message-scroller.js';

// A tiny layout engine: items stack top to bottom inside a viewport of fixed
// height, so the controller's measurements behave like a real browser.
let frames: FrameRequestCallback[] = [];
// Some tests start real autoscroll timers; dispose clears them before jsdom
// is torn down, or they fire later and throw.
const controllers: MessageScrollerController[] = [];
const flush = () => {
  for (let i = 0; i < 10 && frames.length; i++) {
    const queue = frames;
    frames = [];
    queue.forEach(frame => frame(0));
  }
};

function rect(top: number, height: number) {
  return {
    top,
    bottom: top + height,
    height,
    left: 0,
    right: 100,
    width: 100,
    x: 0,
    y: top,
    toJSON() {},
  } as DOMRect;
}

function setup(
  options: Partial<MessageScrollerOptions> = {},
  heights: number[] = [100, 100, 100],
  viewportHeight = 200,
) {
  const root = document.createElement('div');
  const viewport = document.createElement('div');
  const content = document.createElement('div');
  const spacer = document.createElement('div');
  spacer.hidden = true;
  root.append(viewport);
  viewport.append(content);
  content.append(spacer);
  document.body.append(root);

  let scrollTop = 0;
  const heightOf = (element: HTMLElement) =>
    element === spacer ? Number.parseFloat(spacer.style.height || '0') : Number(element.dataset.h ?? 0);
  const total = () => Array.from(content.children).reduce((sum, child) => sum + heightOf(child as HTMLElement), 0);
  const max = () => Math.max(0, total() - viewportHeight);
  Object.defineProperties(viewport, {
    clientHeight: { get: () => viewportHeight },
    scrollHeight: { get: () => Math.max(total(), viewportHeight) },
    scrollTop: {
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = Math.min(Math.max(0, value), max());
      },
    },
  });
  viewport.scrollTo = ((arg: ScrollToOptions) => {
    viewport.scrollTop = arg.top ?? 0;
  }) as typeof viewport.scrollTo;
  viewport.getBoundingClientRect = () => rect(0, viewportHeight);
  content.getBoundingClientRect = () => rect(-scrollTop, total());

  const place = (element: HTMLElement) => {
    element.getBoundingClientRect = () => {
      let top = -scrollTop;
      for (const child of Array.from(content.children)) {
        if (child === element) break;
        top += heightOf(child as HTMLElement);
      }
      return rect(top, heightOf(element));
    };
  };
  place(spacer);

  const add = (height: number, { id, anchor = false, at }: { id?: string; anchor?: boolean; at?: 'start' } = {}) => {
    const item = document.createElement('div');
    item.dataset.h = String(height);
    if (id) item.dataset.messageId = id;
    item.dataset.scrollAnchor = anchor ? 'true' : 'false';
    place(item);
    if (at === 'start') content.prepend(item);
    else content.insertBefore(item, spacer);
    return item;
  };

  const controller = new MessageScrollerController({
    autoScroll: false,
    defaultScrollPosition: 'start',
    scrollEdgeThreshold: 8,
    scrollPreviousItemPeek: 20,
    scrollMargin: 0,
    ...options,
  });
  controllers.push(controller);
  controller.setRoot(root);
  controller.setViewport(viewport);
  controller.setContent(content);
  controller.setSpacer(spacer);

  const items = heights.map((height, index) => {
    const item = add(height, { id: `m${index}` });
    controller.registerMessage(`m${index}`, item, null);
    return item;
  });

  return {
    root,
    viewport,
    content,
    spacer,
    items,
    controller,
    add,
    get scrollTop() {
      return scrollTop;
    },
  };
}

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) => {
    frames.push(frame);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  controllers.splice(0).forEach(controller => controller.dispose());
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('MessageScrollerController', () => {
  it('applies the start position and reports edges', () => {
    const s = setup();
    s.controller.handleContentChange();
    flush();
    expect(s.scrollTop).toBe(0);
    expect(s.controller.stateStore.getSnapshot()).toEqual({
      start: false,
      end: true,
    });
    expect(s.root.getAttribute('data-scrollable')).toBe('end');
    expect(s.controller.pendingDefaultStore.getSnapshot()).toBe(false);
  });

  it('opens at the end and stops following when the reader scrolls up', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const s = setup({ defaultScrollPosition: 'end', autoScroll: true });
    expect(s.controller.pendingDefaultStore.getSnapshot()).toBe(true);
    s.controller.handleContentChange();
    flush();
    expect(s.scrollTop).toBe(100);
    expect(s.viewport.hasAttribute('data-autoscrolling')).toBe(true);
    vi.advanceTimersByTime(200);
    expect(s.viewport.hasAttribute('data-autoscrolling')).toBe(false);
    // Following hides the end edge.
    expect(s.controller.stateStore.getSnapshot().end).toBe(false);

    // New output keeps following.
    s.add(100);
    s.controller.handleContentChange();
    flush();
    expect(s.scrollTop).toBe(200);
    vi.advanceTimersByTime(200);

    // The reader scrolls up.
    s.controller.userScrollIntent();
    s.viewport.scrollTop = 50;
    s.controller.syncAfterScroll();
    expect(s.controller.stateStore.getSnapshot()).toEqual({
      start: true,
      end: true,
    });
    s.add(100);
    s.controller.handleContentChange();
    expect(s.scrollTop).toBe(50);

    // Scrolling back to the end resumes following.
    s.viewport.scrollTop = 1000;
    s.controller.syncAfterScroll();
    s.add(100);
    s.controller.handleContentChange();
    vi.advanceTimersByTime(200);
    expect(s.scrollTop).toBe(400);

    // A resize while following jumps to the end again.
    s.viewport.scrollTop = 390;
    s.controller.handleResize();
    expect(s.scrollTop).toBe(400);
  });

  it('drops out of following when the reader scrolls up without an intent event', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const s = setup({ defaultScrollPosition: 'end', autoScroll: true });
    s.controller.handleContentChange();
    vi.advanceTimersByTime(200);
    s.controller.syncAfterScroll();
    s.viewport.scrollTop = 20;
    s.controller.syncAfterScroll();
    expect(s.controller.stateStore.getSnapshot().end).toBe(true);
  });

  it('pins the last anchor under the top edge when there is room below', () => {
    const s = setup({ defaultScrollPosition: 'last-anchor' }, [100, 100]);
    const anchor = s.add(50, { id: 'a', anchor: true });
    s.add(400);
    s.controller.handleContentChange();
    // offset 200, minus 20px peek
    expect(s.scrollTop).toBe(180);
    expect(anchor.style.contentVisibility).toBe('');
  });

  it('scrolls to the end when the last anchor already fits', () => {
    const s = setup({ defaultScrollPosition: 'last-anchor' }, [100, 100]);
    s.add(50, { id: 'a', anchor: true });
    s.controller.handleContentChange();
    expect(s.scrollTop).toBe(50);
  });

  it('scrolls to the end when there is no anchor', () => {
    const s = setup({ defaultScrollPosition: 'last-anchor' });
    s.controller.handleContentChange();
    expect(s.scrollTop).toBe(100);
  });

  it('re-applies the default when the position option changes', () => {
    const s = setup({ defaultScrollPosition: 'start' });
    s.controller.handleContentChange();
    s.controller.setOptions({
      ...s.controller.options,
      defaultScrollPosition: 'end',
    });
    s.controller.applyDefaultOrSettle();
    expect(s.scrollTop).toBe(100);
    // Same option again keeps the applied state.
    s.controller.setOptions({ ...s.controller.options });
    s.viewport.scrollTop = 0;
    s.controller.applyDefaultOrSettle();
    expect(s.scrollTop).toBe(0);
  });

  it('settles the pending flag on an empty history', () => {
    const s = setup({ defaultScrollPosition: 'end' }, []);
    s.controller.handleContentChange();
    s.controller.applyDefaultOrSettle();
    expect(s.controller.pendingDefaultStore.getSnapshot()).toBe(false);
  });

  it('follows new items on an empty history with auto scroll', () => {
    const s = setup({ defaultScrollPosition: 'start', autoScroll: true }, []);
    s.controller.handleContentChange();
    s.controller.applyDefaultOrSettle();
    s.add(300, { id: 'x' });
    // The start default is applied as soon as an item lands.
    s.controller.handleContentChange();
    expect(s.scrollTop).toBe(0);
  });

  it('commits without a default when items arrive on an applied empty history', () => {
    const s = setup({ defaultScrollPosition: 'start' }, []);
    s.controller.scrollToStart();
    s.controller.handleContentChange();
    s.controller.applyDefaultOrSettle();
    s.add(300, { id: 'x' });
    s.controller.scrollToMessage('missing');
    s.controller.handleContentChange();
    expect(s.controller.stateStore.getSnapshot().end).toBe(true);
  });

  it('scrolls to a message with every alignment', () => {
    const s = setup({}, [100, 100, 100, 100, 100]);
    s.controller.handleContentChange();
    expect(s.controller.scrollToMessage('m2')).toBe(true);
    expect(s.scrollTop).toBe(200);
    s.controller.scrollToMessage('m2', { align: 'center' });
    expect(s.scrollTop).toBe(150);
    s.controller.scrollToMessage('m3', { align: 'end' });
    expect(s.scrollTop).toBe(200);
    s.controller.scrollToMessage('m1', { align: 'nearest', scrollMargin: 10 });
    expect(s.scrollTop).toBe(90);
    s.controller.scrollToMessage('m4', { align: 'nearest' });
    expect(s.scrollTop).toBe(300);
    s.controller.scrollToMessage('m3', { align: 'nearest' });
    expect(s.scrollTop).toBe(300);
    expect(s.controller.scrollToMessage('nope')).toBe(false);
  });

  it('grows the spacer so the last message can reach the top', () => {
    const s = setup();
    s.controller.handleContentChange();
    s.controller.scrollToMessage('m2');
    expect(s.spacer.hidden).toBe(false);
    expect(s.spacer.style.height).toBe('100px');
    expect(s.scrollTop).toBe(200);
    s.controller.scrollToStart();
    expect(s.spacer.hidden).toBe(true);
    expect(s.spacer.style.marginTop).toBe('');
  });

  it('queues a jump until the message renders', () => {
    const s = setup({}, []);
    expect(s.controller.scrollToMessage('late')).toBe(true);
    s.add(100);
    s.add(100);
    const late = s.add(100, { id: 'late' });
    s.controller.registerMessage('late', late, null);
    flush();
    expect(s.scrollTop).toBe(200);
  });

  it('flushes a queued jump on the next content change', () => {
    const s = setup({}, []);
    s.controller.scrollToMessage('late');
    s.add(150);
    const late = s.add(100, { id: 'late' });
    s.controller.registerMessage('late', late, null);
    s.controller.handleContentChange();
    expect(s.scrollTop).toBe(150);
  });

  it('keeps a jump pending while the element is outside the content', () => {
    const s = setup();
    s.controller.handleContentChange();
    const detached = document.createElement('div');
    s.controller.registerMessage('ghost', detached, null);
    expect(s.controller.scrollToMessage('ghost')).toBe(true);
    flush();
    // Unregistering only removes the matching element.
    s.controller.registerMessage('ghost', null, document.createElement('div'));
    s.controller.registerMessage('ghost', null, detached);
    s.controller.handleContentChange();
    expect(s.scrollTop).toBe(0);
  });

  it('pins a newly added anchor and re-pins it on resize', () => {
    const s = setup({}, [100, 100]);
    s.controller.handleContentChange();
    const turn = s.add(60, { id: 'turn', anchor: true });
    s.controller.handleContentChange();
    expect(s.scrollTop).toBe(180);
    // The reply streams in and grows.
    const reply = s.add(40, { id: 'reply' });
    s.controller.handleContentChange();
    reply.dataset.h = '500';
    s.controller.handleResize();
    expect(s.scrollTop).toBe(180);
    expect(turn.isConnected).toBe(true);
    // A user scroll releases the pin.
    s.controller.userScrollIntent();
    s.controller.handleResize();
    flush();
    expect(s.scrollTop).toBe(180);
  });

  it("scrolls to the end when the pinned turn's spacer collapses under auto scroll", () => {
    const s = setup({ autoScroll: true, defaultScrollPosition: 'start' }, [100, 100]);
    s.controller.handleContentChange();
    s.controller.userScrollIntent();
    s.add(60, { id: 'turn', anchor: true });
    s.controller.handleContentChange();
    const reply = s.add(40);
    s.controller.handleContentChange();
    reply.dataset.h = '600';
    s.controller.handleResize();
    expect(s.scrollTop).toBeGreaterThan(180);
  });

  it('jumps to the end when several anchors arrive while following', () => {
    const s = setup({ autoScroll: true, defaultScrollPosition: 'end' }, [100, 100]);
    s.controller.handleContentChange();
    s.add(100, { anchor: true });
    s.add(100, { anchor: true });
    s.controller.handleContentChange();
    expect(s.scrollTop).toBe(200);
  });

  it('pins an item that becomes an anchor in place', () => {
    const s = setup({}, [100, 100, 100, 100]);
    s.controller.handleContentChange();
    s.items[2]!.dataset.scrollAnchor = 'true';
    s.controller.handleContentChange();
    expect(s.scrollTop).toBe(180);
    // Already handled, so another change just commits.
    s.controller.handleContentChange();
    expect(s.scrollTop).toBe(180);
  });

  it("keeps the reader's place when older messages are prepended", () => {
    const s = setup({}, [100, 100, 100, 100]);
    s.controller.handleContentChange();
    s.viewport.scrollTop = 150;
    s.controller.syncAfterScroll();
    s.add(120, { id: 'old', at: 'start' });
    s.controller.handleContentChange();
    expect(s.scrollTop).toBe(270);
    flush();
  });

  it('can skip prepend restoration', () => {
    const s = setup({}, [100, 100, 100, 100]);
    s.controller.preserveScrollOnPrepend = false;
    s.controller.handleContentChange();
    s.viewport.scrollTop = 150;
    s.controller.syncAfterScroll();
    s.add(120, { at: 'start' });
    s.controller.handleContentChange();
    expect(s.scrollTop).toBe(150);
  });

  it('tracks visibility with measurements when IntersectionObserver is missing', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const s = setup({}, [100, 100, 100]);
    s.items[1]!.dataset.scrollAnchor = 'true';
    const listener = vi.fn();
    const off = s.controller.visibilityStore.subscribe(
      listener,
      s.controller.observeVisibility,
      s.controller.unobserveVisibility,
    );
    s.controller.handleContentChange();
    flush();
    expect(s.controller.visibilityStore.getSnapshot()).toEqual({
      currentAnchorId: null,
      visibleMessageIds: ['m0', 'm1'],
    });
    s.viewport.scrollTop = 100;
    s.controller.syncAfterScroll();
    flush();
    expect(s.controller.visibilityStore.getSnapshot().currentAnchorId).toBe('m1');
    off();
    expect(s.controller.visibilityStore.getSnapshot().visibleMessageIds).toEqual([]);
  });

  it('tracks visibility with an IntersectionObserver', () => {
    let callback: IntersectionObserverCallback = () => {};
    const observed = new Set<Element>();
    class FakeObserver {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
      }
      observe(element: Element) {
        observed.add(element);
      }
      unobserve(element: Element) {
        observed.delete(element);
      }
      disconnect() {
        observed.clear();
      }
    }
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const s = setup({}, [100, 100]);
    const off = s.controller.visibilityStore.subscribe(
      () => {},
      s.controller.observeVisibility,
      s.controller.unobserveVisibility,
    );
    s.controller.observeVisibility();
    expect(observed.size).toBe(2);
    const late = s.add(100, { id: 'late' });
    s.controller.registerMessage('late', late, null);
    expect(observed.has(late)).toBe(true);
    const entry = (target: Element, isIntersecting: boolean) =>
      ({ target, isIntersecting }) as IntersectionObserverEntry;
    callback(
      [entry(s.items[0]!, true), entry(s.items[1]!, true), entry(document.createElement('div'), true)],
      {} as IntersectionObserver,
    );
    flush();
    expect(s.controller.visibilityStore.getSnapshot().visibleMessageIds).toEqual(['m0', 'm1']);
    callback([entry(s.items[0]!, false)], {} as IntersectionObserver);
    s.controller.registerMessage('m1', null, s.items[1]!);
    flush();
    expect(s.controller.visibilityStore.getSnapshot()).toEqual({
      currentAnchorId: null,
      visibleMessageIds: [],
    });
    off();
    expect(observed.size).toBe(0);
  });

  it('skips visibility work without a viewport or listeners', () => {
    const controller = new MessageScrollerController({
      autoScroll: true,
      defaultScrollPosition: 'end',
      scrollEdgeThreshold: 8,
      scrollPreviousItemPeek: 0,
      scrollMargin: 0,
    });
    controller.observeVisibility();
    const off = controller.visibilityStore.subscribe(() => {});
    controller.observeVisibility();
    controller.handleContentChange();
    controller.syncAfterScroll();
    controller.followOnAutoScroll();
    controller.handleResize();
    flush();
    expect(controller.visibilityStore.getSnapshot().visibleMessageIds).toEqual([]);
    off();
    controller.setRoot(null);
    controller.setViewport(null);
    controller.dispose();
  });

  it('follows on auto scroll only with items and in following mode', () => {
    const s = setup({ autoScroll: true, defaultScrollPosition: 'start' });
    s.controller.handleContentChange();
    s.controller.followOnAutoScroll();
    s.controller.userScrollIntent();
    s.controller.followOnAutoScroll();
    expect(s.controller.stateStore.getSnapshot().end).toBe(true);
    s.controller.scrollToEnd();
    s.controller.followOnAutoScroll();
    expect(s.scrollTop).toBe(100);
  });

  it('cancels timers and frames on dispose', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const s = setup({ autoScroll: true, defaultScrollPosition: 'end' });
    s.controller.visibilityStore.subscribe(() => {});
    s.controller.handleContentChange();
    s.controller.scrollToStart({ behavior: 'smooth' });
    s.controller.scrollToEnd({ behavior: 'smooth' });
    s.controller.handleResize();
    s.controller.dispose();
    s.controller.unobserveVisibility();
    expect(s.viewport.hasAttribute('data-autoscrolling')).toBe(true);
  });
});
