// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ActivityPanel,
  ToolActivity,
  type ToolActivityItem,
  type ToolActivityProps,
} from '../packages/sprout/src/components/tool-activity.js';

const item = (id: string, over: Partial<ToolActivityItem> = {}): ToolActivityItem => ({
  id,
  label: `Tool ${id}`,
  status: 'completed',
  visual: null,
  ...over,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function Stepper(props: Partial<ToolActivityProps>) {
  return (
    <ActivityPanel working>
      <ToolActivity variant="stepper" items={[item('a'), item('b')]} {...props} />
    </ActivityPanel>
  );
}

describe('ToolActivity in the DOM', () => {
  it('collapses the panel when work stops and reopens when it restarts', () => {
    const panel = (working: boolean) => (
      <ActivityPanel working={working} collapseWhenDone activityLabel="Reading">
        <p>Timeline</p>
      </ActivityPanel>
    );
    const { rerender } = render(panel(true));
    const trigger = screen.getByRole('button', { name: 'Working… Reading' });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    rerender(panel(false));
    expect(screen.getByRole('button', { name: 'Worked' }).getAttribute('aria-expanded')).toBe('false');
    rerender(panel(true));
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const viewport = screen.getByRole('region', { name: 'Activity timeline' });
    viewport.scrollTop = 10;
    fireEvent.scroll(viewport);
    expect(viewport.parentElement!.hasAttribute('data-scrolled')).toBe(true);
  });

  it('loads older rows when the sentinel scrolls in', () => {
    const callbacks: IntersectionObserverCallback[] = [];
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callbacks.push(cb);
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    const onLoadOlder = vi.fn();
    const { unmount } = render(<Stepper hasOlder onLoadOlder={onLoadOlder} />);
    act(() => callbacks[0]!([{ isIntersecting: false }] as never, {} as never));
    act(() => callbacks[0]!([{ isIntersecting: true }] as never, {} as never));
    expect(onLoadOlder).toHaveBeenCalledOnce();
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('falls back to a scroll listener without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const onLoadOlder = vi.fn();
    render(<Stepper hasOlder onLoadOlder={onLoadOlder} />);
    const viewport = screen.getByRole('region', { name: 'Activity timeline' });
    viewport.scrollTop = 100;
    fireEvent.scroll(viewport);
    viewport.scrollTop = 0;
    fireEvent.scroll(viewport);
    expect(onLoadOlder).toHaveBeenCalledOnce();
  });

  it('skips observing while loading older rows', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const onLoadOlder = vi.fn();
    const { rerender } = render(
      <ToolActivity variant="stepper" items={[item('a')]} hasOlder onLoadOlder={onLoadOlder} />,
    );
    await act(async () => {});
    rerender(<ToolActivity variant="stepper" items={[item('a')]} hasOlder loadingOlder onLoadOlder={onLoadOlder} />);
    expect(onLoadOlder).not.toHaveBeenCalled();
  });

  it('attaches once a viewport appears', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const onLoadOlder = vi.fn();
    const { container } = render(
      <ToolActivity variant="stepper" items={[item('a')]} hasOlder onLoadOlder={onLoadOlder} />,
    );
    const viewport = document.createElement('div');
    viewport.dataset.slot = 'activity-viewport';
    await act(async () => {
      container.parentElement!.insertBefore(viewport, container);
      viewport.append(container);
    });
    viewport.scrollTop = 0;
    fireEvent.scroll(viewport);
    expect(onLoadOlder).toHaveBeenCalledOnce();
  });

  it('toggles the list, expands sources, and swaps failed favicons', () => {
    const onToggle = vi.fn();
    const urls = ['https://a.test', 'https://b.test', 'https://c.test', 'https://d.test', 'ftp://e.test', 'not a url'];
    render(
      <ToolActivity
        onToggle={onToggle}
        sourceIcon={url => `${url}/icon.png`}
        items={[item('a', { urls, failedUrls: ['https://a.test'] })]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Used 1 tool' }));
    expect(onToggle).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '2 more', hidden: true }));
    expect(screen.getByText('e.test', { exact: false })).toBeTruthy();
    const imgs = document.querySelectorAll('img');
    fireEvent.load(imgs[0]!);
    fireEvent.error(imgs[1]!);
    const statuses = [...document.querySelectorAll("[data-slot='source-favicon']")].map(el =>
      el.getAttribute('data-status'),
    );
    expect(statuses.slice(0, 2)).toEqual(['loaded', 'failed']);
  });
});
