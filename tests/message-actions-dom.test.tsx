// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MessageActions,
  MessageBranch,
  type MessageActionsStats,
} from '../packages/sprout/src/components/message-actions.js';

function clipboard(fail = false) {
  const value = {
    write: vi.fn(async () => {}),
    writeText: vi.fn(async () => {
      if (fail) throw new Error('denied');
    }),
  };
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
  return value;
}
const click = (name: string | RegExp) =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MessageActions in the DOM', () => {
  it('copies plain text with readable links', async () => {
    const board = clipboard();
    render(
      <MessageActions
        author="human"
        text={'See [docs](https://a.test) and [](https://b.test) and [https://c.test](https://c.test) <https://d.test>'}
      />,
    );
    await click('Copy message');
    expect(board.writeText).toHaveBeenCalledWith(
      'See docs (https://a.test) and https://b.test and https://c.test https://d.test',
    );
    expect(screen.getByRole('button', { name: 'Message copied' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Message copied to clipboard.');
  });

  it('copies rich HTML when the browser supports it', async () => {
    const board = clipboard();
    vi.stubGlobal(
      'ClipboardItem',
      class {
        constructor(public items: object) {}
      },
    );
    render(<MessageActions text="hi" html={() => '<b>hi</b>'} />);
    await click('Copy response');
    expect(board.write).toHaveBeenCalled();
  });

  it('shows an error when copying fails', async () => {
    clipboard(true);
    render(<MessageActions text="hi" />);
    await click('Copy response');
    expect(screen.getByRole('alert').textContent).toContain("Couldn't copy");
  });

  it('toggles feedback and regenerates', () => {
    const onFeedback = vi.fn();
    const onRetry = vi.fn();
    render(<MessageActions text="hi" feedback="up" onFeedback={onFeedback} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Helpful response' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unhelpful response' }));
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate response' }));
    expect(onFeedback.mock.calls).toEqual([[null], ['down']]);
    expect(onRetry).toHaveBeenCalled();
  });

  it('formats send times for today, yesterday, this year, older, and bad dates', () => {
    const now = new Date();
    const at = (days: number, years = 0) =>
      new Date(now.getFullYear() - years, now.getMonth(), now.getDate() - days, 12).toISOString();
    for (const createdAt of [at(0), at(1), at(3), at(0, 2), 'nope'])
      render(<MessageActions text="hi" createdAt={createdAt} />);
    const times = [...document.querySelectorAll('time')].map(t => t.textContent);
    expect(times[1]).toMatch(/^Yesterday /);
    expect(times[3]).toContain(String(now.getFullYear() - 2));
    expect(times[4]).toContain('Invalid Date');
  });

  it('shows reply stats when the send time gets focus', async () => {
    const createdAt = new Date().toISOString();
    const stats = (value: MessageActionsStats) => {
      const { unmount } = render(<MessageActions text="Hi" createdAt={createdAt} stats={value} />);
      fireEvent.focus(document.querySelector('time')!);
      return { unmount };
    };
    const card = async () =>
      (await screen.findByText(/\d{4}/, { selector: 'p' })).closest('.sprout-message-actions-stats')!;

    let view = stats({
      model: 'Opus',
      firstTokenMs: 420,
      durationMs: 3_420,
      inputTokens: 1_200,
      outputTokens: 600,
      traceId: 'abc123',
    });
    let text = (await card()).textContent;
    for (const part of ['Opus', '420 ms', '3.4 s', '1,200 in · 600 out', '200 tokens/s', 'abc123'])
      expect(text).toContain(part);
    view.unmount();

    view = stats({ durationMs: 125_000, outputTokens: 10 });
    text = (await card()).textContent;
    expect(text).toContain('2 min 5 s');
    expect(text).toContain('10 out');
    expect(text).not.toContain(' in');
    view.unmount();

    view = stats({ inputTokens: 5, outputTokens: 0, firstTokenMs: 500 });
    text = (await card()).textContent;
    expect(text).toContain('5 in · 0 out');
    expect(text).not.toContain('Speed');
    view.unmount();

    stats({});
    expect((await card()).querySelector('dl')).toBeNull();
  });

  it('steps between response versions', () => {
    const onChange = vi.fn();
    render(<MessageBranch index={1} total={3} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Previous response' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next response' }));
    expect(onChange.mock.calls).toEqual([[0], [2]]);
  });
});
