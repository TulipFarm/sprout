// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SelectionSlot } from '../packages/sprout/src/components/selection-slot.js';

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as never);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const slot = (active: boolean, tool = 'Search') => (
  <>
    <SelectionSlot active={active} selection={<button type="button">Delete</button>}>
      <button key={tool} type="button">
        {tool}
      </button>
    </SelectionSlot>
    <button type="button">Outside</button>
  </>
);
const button = (name: string) => screen.getByRole('button', { name });

describe('SelectionSlot in the DOM', () => {
  it('moves focus into the selection and back to the tool', () => {
    const { rerender } = render(slot(false));
    button('Search').focus();
    rerender(slot(true));
    expect(document.activeElement).toBe(button('Delete'));
    rerender(slot(false));
    expect(document.activeElement).toBe(button('Search'));
  });

  it('focuses the first tool when the origin is gone', () => {
    const { rerender } = render(slot(false));
    button('Search').focus();
    rerender(slot(true, 'Filter'));
    button('Delete').focus();
    rerender(slot(false, 'Filter'));
    expect(document.activeElement).toBe(button('Filter'));
  });

  it('leaves focus alone when it started outside or left the selection', () => {
    const { rerender } = render(slot(false));
    rerender(slot(true));
    expect(document.activeElement).toBe(document.body);
    rerender(slot(false));
    expect(document.activeElement).toBe(document.body);

    const loose = document.body.appendChild(document.createElement('button'));
    loose.focus();
    rerender(slot(true, 'Filter'));
    expect(document.activeElement).toBe(loose);
    fireEvent.focus(button('Delete'));
    fireEvent.blur(button('Delete'), { relatedTarget: null });
    fireEvent.blur(button('Delete'), { relatedTarget: button('Outside') });
    loose.remove();
    rerender(slot(false, 'Search'));
    expect(document.activeElement).toBe(document.body);
  });
});
