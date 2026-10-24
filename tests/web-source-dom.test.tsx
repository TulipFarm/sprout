// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WebSource } from '../packages/sprout/src/components/web-source.js';

const favicon = () => document.querySelector("[data-slot='source-favicon']")!;

describe('WebSource favicon', () => {
  it('swaps the globe for the icon once it loads', () => {
    const { unmount } = render(<WebSource url="https://a.test" />);
    expect(favicon().querySelector('svg')).toBeTruthy();
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
});
