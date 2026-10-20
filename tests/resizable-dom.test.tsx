// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { Fragment } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  useResizableLayout,
  type ResizablePanelGroupProps,
} from '../packages/sprout/src/components/resizable.js';

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(500);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

function Split(props: Partial<ResizablePanelGroupProps> & { third?: boolean }) {
  const { third = false, ...rest } = props;
  return (
    <ResizablePanelGroup {...rest}>
      <ResizablePanel id="left" defaultSize="30%" minSize="100px" maxSize="60">
        Left
      </ResizablePanel>
      <ResizableHandle withHandle />
      <Fragment>
        <ResizablePanel id="middle" minSize="1rem" maxSize="90vw">
          Middle
        </ResizablePanel>
      </Fragment>
      {third && (
        <>
          <ResizableHandle />
          <ResizablePanel id="right" defaultSize={200} minSize="2em" maxSize="40vh">
            Right
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}

const sizes = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-panel-id]')).map(panel =>
    Math.round(Number(panel.style.flexGrow)),
  );

describe('Resizable in the DOM', () => {
  it('resolves sizes in every unit and links handles', () => {
    const onLayoutChanged = vi.fn();
    render(<Split third onLayoutChanged={onLayoutChanged} />);
    expect(sizes()).toEqual([30, 50, 20]);
    expect(onLayoutChanged).toHaveBeenCalledWith(expect.objectContaining({ left: expect.any(Number) }), {
      isUserInteraction: false,
    });
    const [first] = screen.getAllByRole('separator');
    expect(first!.getAttribute('aria-controls')).toBe('left');
    expect(first!.getAttribute('aria-valuenow')).toBe('30');
  });

  it('resizes with the keyboard', () => {
    const onKeyDown = vi.fn();
    const onLayoutChanged = vi.fn();
    render(
      <ResizablePanelGroup onLayoutChanged={onLayoutChanged}>
        <ResizablePanel id="a" maxSize="80%">
          A
        </ResizablePanel>
        <ResizableHandle onKeyDown={onKeyDown} />
        <ResizablePanel id="b" minSize="10%">
          B
        </ResizablePanel>
      </ResizablePanelGroup>,
    );
    const handle = screen.getByRole('separator');
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(sizes()).toEqual([55, 45]);
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(sizes()).toEqual([50, 50]);
    fireEvent.keyDown(handle, { key: 'End' });
    expect(sizes()).toEqual([80, 20]);
    fireEvent.keyDown(handle, { key: 'Home' });
    expect(sizes()).toEqual([0, 100]);
    fireEvent.keyDown(handle, { key: 'x' });
    expect(onKeyDown).toHaveBeenCalledTimes(5);
    expect(onLayoutChanged).toHaveBeenLastCalledWith(expect.any(Object), {
      isUserInteraction: true,
    });
  });

  it('lets onKeyDown and onPointerDown cancel', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel id="a">A</ResizablePanel>
        <ResizableHandle onKeyDown={event => event.preventDefault()} onPointerDown={event => event.preventDefault()} />
        <ResizablePanel id="b">B</ResizablePanel>
      </ResizablePanelGroup>,
    );
    const handle = screen.getByRole('separator');
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1 });
    expect(sizes()).toEqual([50, 50]);
  });

  it('uses vertical keys and rtl direction', () => {
    const { unmount } = render(
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel id="a">A</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="b">B</ResizablePanel>
      </ResizablePanelGroup>,
    );
    const handle = screen.getByRole('separator');
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(sizes()).toEqual([55, 45]);
    unmount();

    render(
      <ResizablePanelGroup dir="rtl" style={{ direction: 'rtl' }}>
        <ResizablePanel id="a">A</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="b">B</ResizablePanel>
      </ResizablePanelGroup>,
    );
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowRight' });
    expect(sizes()).toEqual([45, 55]);
  });

  it('drags the handle with the pointer', () => {
    const onLayoutChange = vi.fn();
    const onLayoutChanged = vi.fn();
    render(
      <ResizablePanelGroup onLayoutChange={onLayoutChange} onLayoutChanged={onLayoutChanged}>
        <ResizablePanel id="a">A</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="b">B</ResizablePanel>
      </ResizablePanelGroup>,
    );
    const handle = screen.getByRole('separator');
    // Only the primary button starts a drag.
    fireEvent.pointerDown(handle, { button: 2, pointerId: 1 });
    expect(document.documentElement.style.cursor).toBe('');

    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 500 });
    expect(document.documentElement.style.cursor).toBe('col-resize');
    expect(handle.hasAttribute('data-dragging')).toBe(true);
    fireEvent.pointerMove(handle, { pointerId: 2, clientX: 900 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 700 });
    expect(sizes()).toEqual([70, 30]);
    expect(onLayoutChange).toHaveBeenCalled();
    fireEvent.pointerUp(handle, { pointerId: 2 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(document.documentElement.style.cursor).toBe('');
    expect(handle.hasAttribute('data-dragging')).toBe(false);
    expect(onLayoutChanged).toHaveBeenLastCalledWith({ a: 70, b: 30 }, { isUserInteraction: true });
    // Moves after release are ignored.
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 100 });
    expect(sizes()).toEqual([70, 30]);
  });

  it('ignores a handle with no panel after it', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel id="a">A</ResizablePanel>
        <ResizableHandle />
      </ResizablePanelGroup>,
    );
    const handle = screen.getByRole('separator');
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1 });
    expect(handle.getAttribute('aria-valuemax')).toBe('100');
  });

  it('restores a saved layout and re-applies changed defaults', () => {
    const { rerender } = render(<Split defaultLayout={{ left: 40, middle: 60 }} />);
    expect(sizes()).toEqual([40, 60]);
    rerender(<Split defaultLayout={{ left: 45, middle: 55 }} />);
    expect(sizes()).toEqual([45, 55]);
    // Missing ids fall back to declared sizes.
    rerender(<Split defaultLayout={{ left: 45 }} />);
    rerender(<Split third defaultLayout={{ left: 45 }} />);
    expect(sizes()).toEqual([30, 50, 20]);
  });

  it('normalizes impossible bounds', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel id="a" defaultSize="10%" maxSize="10%">
          A
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="b" defaultSize="10%" maxSize="10%" minSize="bogus">
          B
        </ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(sizes()).toEqual([50, 50]);
  });

  it('re-measures when the container resizes', () => {
    let callback: () => void = () => {};
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          callback = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<Split />);
    act(() => callback());
    expect(sizes()).toEqual([30, 70]);
  });

  it('throws outside a group and forwards refs', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ResizablePanel />)).toThrow(/ResizablePanelGroup/);
    const groupRef = vi.fn();
    const panelRef = { current: null as HTMLDivElement | null };
    const handleRef = vi.fn();
    render(
      <ResizablePanelGroup ref={groupRef}>
        <ResizablePanel ref={panelRef}>A</ResizablePanel>
        <ResizableHandle ref={handleRef} />
        <ResizablePanel>B</ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(groupRef).toHaveBeenCalled();
    expect(panelRef.current).toBeInstanceOf(HTMLDivElement);
    expect(handleRef).toHaveBeenCalled();
  });
});

describe('useResizableLayout', () => {
  it('saves and reads layouts from localStorage', () => {
    const { result } = renderHook(() => useResizableLayout({ id: 'garden', panelIds: ['a', 'b'] }));
    expect(result.current.defaultLayout).toBeUndefined();
    act(() => result.current.onLayoutChanged({ a: 40, b: 60 }, { isUserInteraction: false }));
    expect(localStorage.getItem('sprout-resizable:garden:a,b')).toBe('{"a":40,"b":60}');
    expect(result.current.defaultLayout).toEqual({ a: 40, b: 60 });
    // Same value is not written again.
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    act(() => result.current.onLayoutChanged({ a: 40, b: 60 }, { isUserInteraction: false }));
    expect(setItem).not.toHaveBeenCalled();
  });

  it('skips non-user changes when asked', () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
    const { result } = renderHook(() =>
      useResizableLayout({
        id: 'x',
        storage,
        onlySaveAfterUserInteractions: true,
      }),
    );
    result.current.onLayoutChanged({ a: 1 }, { isUserInteraction: false });
    expect(storage.setItem).not.toHaveBeenCalled();
    result.current.onLayoutChanged({ a: 1 }, { isUserInteraction: true });
    expect(storage.setItem).toHaveBeenCalledWith('sprout-resizable:x', '{"a":1}');
  });

  it('ignores bad saved values and throwing storage', () => {
    for (const raw of ['{bad', '[1]', 'null', '{"a":"x"}']) {
      const storage = { getItem: () => raw, setItem: vi.fn() };
      const { result } = renderHook(() => useResizableLayout({ id: 'y', storage }));
      expect(result.current.defaultLayout).toBeUndefined();
    }
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: vi.fn(),
    };
    const { result } = renderHook(() => useResizableLayout({ id: 'z', storage: broken }));
    expect(result.current.defaultLayout).toBeUndefined();
    result.current.onLayoutChanged({ a: 1 }, { isUserInteraction: true });
    expect(broken.setItem).not.toHaveBeenCalled();
  });

  it('survives a localStorage getter that throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useResizableLayout({ id: 'w' }));
    expect(result.current.defaultLayout).toBeUndefined();
    result.current.onLayoutChanged({ a: 1 }, { isUserInteraction: true });
  });
});
