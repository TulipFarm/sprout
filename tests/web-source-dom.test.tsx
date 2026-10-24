// @vitest-environment jsdom
import { act, fireEvent, render } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WebSource } from '../packages/sprout/src/components/web-source.js';

const favicon = () => document.querySelector("[data-slot='source-favicon']")!;

describe('WebSource favicon', () => {
  it('shows a tile until the icon loads, then the icon', () => {
    const { unmount } = render(<WebSource url="https://a.test" />);
    expect(favicon().querySelector('svg')).toBeNull();
    fireEvent.load(favicon().querySelector('img')!);
    expect(favicon().getAttribute('data-status')).toBe('loaded');
    expect(favicon().querySelector('svg')).toBeNull();
    unmount();
  });

  it('keeps the globe when the icon fails, and retries for a new page', () => {
    const { rerender } = render(<WebSource url="https://a.test" />);
    fireEvent.error(favicon().querySelector('img')!);
    expect(favicon().getAttribute('data-status')).toBe('failed');
    expect(favicon().querySelector('img')).toBeNull();
    rerender(<WebSource url="https://b.test" />);
    expect(favicon().getAttribute('data-status')).toBe('loading');
    expect(favicon().querySelector('img')?.getAttribute('src')).toBe('https://icon.horse/icon/b.test');
  });

  it.each([
    [16, 'loaded'],
    [0, 'failed'],
  ])('reads an icon that settled before hydration (width %i)', async (width, status) => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<WebSource url="https://a.test" />);
    document.body.append(container);
    const img = container.querySelector('img')!;
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: width });
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, <WebSource url="https://a.test" />);
    });
    expect(favicon().getAttribute('data-status')).toBe(status);
    act(() => root!.unmount());
    container.remove();
  });
});
