// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasPanel, ChatSplit, type CanvasTab } from '../packages/sprout/src/components/canvas.js';

let width = 1200;
let observers: Array<() => void> = [];
beforeEach(() => {
  width = 1200;
  observers = [];
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb: () => void) {
        observers.push(cb);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const Icon = () => <svg />;
const start: CanvasTab[] = [
  { id: 'a', title: 'Alpha', icon: Icon },
  { id: 'b', title: 'Beta', busy: true },
  { id: 'c', title: 'Gamma' },
];

function Panel({ initial = start, active = 'a' as string | null }) {
  const [tabs, setTabs] = useState(initial);
  const [activeId, setActiveId] = useState(active);
  const [closed, setClosed] = useState(0);
  return (
    <>
      <CanvasPanel
        tabs={tabs}
        activeId={activeId}
        onSelect={setActiveId}
        onCloseTab={id => setTabs(all => all.filter(t => t.id !== id))}
        onClose={() => setClosed(n => n + 1)}
        activity={<p>Activity</p>}
      >
        Body
      </CanvasPanel>
      <output>{closed}</output>
    </>
  );
}

const tab = (name: string | RegExp) => screen.getByRole('tab', { name });

describe('Canvas in the DOM', () => {
  it('moves between tabs with the keyboard and closes them', () => {
    render(<Panel />);
    fireEvent.keyDown(tab('Alpha'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab('Beta, loading'));
    fireEvent.keyDown(tab('Beta, loading'), { key: 'End' });
    fireEvent.keyDown(tab('Gamma'), { key: 'ArrowRight' });
    expect(tab('Alpha').getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(tab('Alpha'), { key: 'ArrowLeft' });
    fireEvent.keyDown(tab('Gamma'), { key: 'Home' });
    fireEvent.keyDown(tab('Alpha'), { key: 'a' });
    fireEvent.pointerEnter(tab('Alpha'));
    expect(tab('Alpha').hasAttribute('data-hover')).toBe(true);
    fireEvent.pointerLeave(tab('Alpha'));
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Close Gamma' }));
    fireEvent.pointerLeave(screen.getByRole('button', { name: 'Close Gamma' }));
    fireEvent.click(tab('Gamma'));

    fireEvent.keyDown(tab('Gamma'), { key: 'Delete' });
    expect(document.activeElement).toBe(tab('Beta, loading'));
    fireEvent.click(screen.getByRole('button', { name: 'Close Alpha' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close Beta' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close canvas' }));
    expect(screen.getByRole('heading', { name: 'Canvas' })).toBeTruthy();

    fireEvent.keyDown(screen.getByRole('region'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close canvas' }));
    expect(screen.getByRole('status').textContent).toBe('2');
  });

  it('scrolls the active tab into view', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockReturnValue(500);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100);
    width = 200;
    const { rerender } = render(<Panel active="c" />);
    const list = document.querySelector<HTMLElement>('.sprout-canvas-tabs')!;
    expect(list.scrollLeft).toBe(428);
    list.scrollLeft = 900;
    fireEvent.click(tab('Alpha'));
    expect(list.scrollLeft).toBe(500);
    rerender(<Panel active="zzz" />);
  });

  it('shows a back button as a sheet and focuses the heading when tabs empty', () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = vi.fn(
      () =>
        ({
          matches: true,
          addEventListener() {},
          removeEventListener() {},
        }) as never,
    );
    render(<Panel initial={[{ id: 'a', title: 'Alpha' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close Alpha' }));
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Canvas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to chat' }));
    expect(screen.getByRole('status').textContent).toBe('1');
    window.matchMedia = matchMedia;
  });

  it('moves the canvas between the split and the sheet without remounting', () => {
    const onOpenChange = vi.fn();
    let mounts = 0;
    function Content() {
      useState(() => mounts++);
      return <p>Result</p>;
    }
    const split = (open: boolean) => (
      <ChatSplit open={open} onOpenChange={onOpenChange} chat={<p>Chat</p>} canvas={<Content />} />
    );
    const { rerender } = render(split(true));
    expect(document.querySelector("[data-layout='split']")).toBeTruthy();
    expect(screen.getByText('Result')).toBeTruthy();
    width = 500;
    act(() => observers.forEach(cb => cb()));
    expect(document.querySelector("[data-slot='chat-split']")!.getAttribute('data-layout')).toBe('sheet');
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });
    rerender(split(false));
    expect(mounts).toBe(1);
  });
});
