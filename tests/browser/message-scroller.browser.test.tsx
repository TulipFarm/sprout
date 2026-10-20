import { useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Message, MessageBubble, MessageContent } from '../../packages/sprout/src/components/message.js';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
  type MessageScrollerDefaultScrollPosition,
  type MessageScrollerProviderProps,
} from '../../packages/sprout/src/components/message-scroller.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

type Turn = { id: string; text: string };

const lines = [
  'Which March orders are missing from the warehouse export?',
  'Three of the 1,284 March orders are missing: SO-1042, SO-1077, and SO-1103.',
  'Why weren’t they exported?',
  'All three were created on March 28, after the 6 pm export had already run.',
  'Will they show up in the April file?',
  'Yes. The April 1 export picks up anything created since the last run.',
  'Can you draft a note to Robin about it?',
  'Draft: “Hi Robin — SO-1042, SO-1077, and SO-1103 missed the March export.”',
  'Who owns the export job?',
  'Jordan Lee owns it and can approve a schedule change.',
  'Move it to 11:30 pm then.',
  'Done. The next run is tonight at 11:30 pm.',
];
const script = (prefix = 'm', from = 1): Turn[] =>
  lines.map((text, index) => ({ id: `${prefix}${index + from}`, text }));

const longReply = Array.from(
  { length: 40 },
  () => 'I matched every March order by order number, then by customer and total for the re-issued ones.',
).join(' ');

function Bubble({ index, text }: { index: number; text: ReactNode }) {
  const human = index % 2 === 0;
  return (
    <div style={{ padding: 16 }}>
      <Message align={human ? 'end' : 'start'}>
        <MessageContent>
          <MessageBubble variant={human ? 'default' : 'secondary'}>{text}</MessageBubble>
        </MessageContent>
      </Message>
    </div>
  );
}

function Window({
  turns,
  anchor = 'last',
  provider,
  preserve,
  children,
  height = 384,
}: {
  turns: Turn[];
  anchor?: 'last' | 'none' | string;
  provider?: MessageScrollerProviderProps;
  preserve?: boolean;
  children?: ReactNode;
  height?: number;
}) {
  return (
    <MessageScrollerProvider {...provider}>
      <div
        data-testid="window"
        style={{
          position: 'relative',
          height,
          overflow: 'hidden',
          border: '1px solid var(--sprout-line)',
          background: 'var(--sprout-surface)',
        }}
      >
        <MessageScroller>
          <MessageScrollerViewport aria-label="Conversation history" preserveScrollOnPrepend={preserve}>
            <MessageScrollerContent>
              {turns.map((turn, index) => (
                <MessageScrollerItem
                  key={turn.id}
                  messageId={turn.id}
                  scrollAnchor={anchor === 'last' ? index === turns.length - 1 : anchor === turn.id}
                >
                  <Bubble index={index} text={turn.text} />
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton aria-label="Scroll to newest message" />
          <MessageScrollerButton direction="start" aria-label="Scroll to first message" />
        </MessageScroller>
      </div>
      {children}
    </MessageScrollerProvider>
  );
}

function Growing() {
  const [turns, setTurns] = useState(script().slice(0, 8));
  return (
    <>
      <button
        type="button"
        onClick={() => setTurns(all => [...all, { id: `m${all.length + 1}`, text: lines[all.length % 12]! }])}
      >
        Add message
      </button>
      <Window turns={turns} />
    </>
  );
}

const viewport = () => document.querySelector<HTMLElement>('[data-slot="message-scroller-viewport"]')!;
const button = (direction: 'end' | 'start' = 'end') =>
  document.querySelector<HTMLElement>(`[data-slot="message-scroller-button"][data-direction="${direction}"]`)!;
const fromEnd = (el = viewport()) => Math.round(el.scrollHeight - el.clientHeight - el.scrollTop);
const offsetIn = (id: string, el = viewport()) =>
  Math.round(
    el.querySelector(`[data-message-id="${id}"]`)!.getBoundingClientRect().top - el.getBoundingClientRect().top,
  ) + 0;
const frames = (count = 2) =>
  new Promise<void>(resolve => {
    const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve());
    step(count);
  });
/** Resolves once the viewport has held still for a few frames. */
const still = (el = viewport()) =>
  new Promise<void>(resolve => {
    let last = el.scrollTop;
    let count = 0;
    const tick = () => {
      count = el.scrollTop === last ? count + 1 : 0;
      last = el.scrollTop;
      if (count >= 5) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
const ready = () => expect.poll(() => document.querySelectorAll('[data-pending-scroll]').length).toBe(0);

describe('MessageScroller in a real browser', () => {
  it.each(themes)('%s %s passes axe', async (theme, mode) => {
    await emulate({ reducedMotion: true });
    setTheme(theme, mode);
    const screen = await render(<Window turns={script()} />);
    await ready();
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it.each([390, 1280])('at %ipx nothing spills sideways', async width => {
    await emulate({ reducedMotion: true });
    await page.viewport(width, 800);
    await render(
      <Window
        turns={[
          ...script(),
          {
            id: 'url',
            text: 'https://warehouse.example.com/exports/2026/march/orders-missing-from-the-export.csv',
          },
        ]}
      />,
    );
    await ready();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect(viewport().scrollWidth).toBeLessThanOrEqual(viewport().clientWidth + 1);
  });

  it('opens at the newest message and pins each added one with a 64px peek', async () => {
    await emulate({ reducedMotion: true });
    await render(<Growing />);
    await ready();
    await expect.element(page.getByRole('log')).toBeInTheDocument();
    expect(viewport()).toHaveAttribute('role', 'region');
    await expect.element(page.getByRole('region', { name: 'Conversation history' })).toBeVisible();
    await expect.poll(() => fromEnd()).toBeLessThanOrEqual(1);
    expect(button()).toHaveAttribute('data-active', 'false');
    await expect.poll(() => viewport().getAttribute('data-scrollable')).toBe('start');

    await page.getByRole('button', { name: 'Add message' }).click();
    await expect
      .poll(() => document.querySelector('[data-message-id="m9"]')?.getAttribute('data-scroll-anchor'))
      .toBe('true');
    expect(document.querySelectorAll('[data-scroll-anchor="true"]')).toHaveLength(1);
    await expect.poll(() => offsetIn('m9')).toBe(64);
    await page.getByRole('button', { name: 'Add message' }).click();
    await expect.poll(() => offsetIn('m10')).toBe(64);
  });

  it('the jump button appears when scrolled up and returns by pointer and keyboard', async () => {
    await emulate({ reducedMotion: true });
    await render(<Window turns={script()} />);
    await ready();
    await expect.poll(() => fromEnd()).toBeLessThanOrEqual(1);
    expect(button().hasAttribute('inert')).toBe(true);
    expect(getComputedStyle(button()).opacity).toBe('0');

    viewport().focus();
    await expect.element(viewport()).toHaveFocus();
    await userEvent.keyboard('{Home}');
    await expect.poll(() => Math.round(viewport().scrollTop)).toBe(0);
    await still();
    await expect.poll(() => button().getAttribute('data-active')).toBe('true');
    expect(button().hasAttribute('inert')).toBe(false);
    expect(viewport()).toHaveAttribute('data-scrollable', 'end');
    await expect.element(button()).toHaveAccessibleName('Scroll to newest message');
    const box = button().getBoundingClientRect();
    const frame = viewport().getBoundingClientRect();
    expect(box.width).toBe(28);
    expect(Math.abs(box.left + box.width / 2 - (frame.left + frame.width / 2))).toBeLessThanOrEqual(1);
    expect(Math.round(frame.bottom - box.bottom)).toBe(16);
    await expect.poll(() => getComputedStyle(button()).opacity).toBe('1');

    await userEvent.click(button());
    await expect.poll(() => fromEnd()).toBeLessThanOrEqual(1);
    await expect.poll(() => button().getAttribute('data-active')).toBe('false');
    expect(document.activeElement).not.toBe(button());

    viewport().focus();
    await userEvent.keyboard('{PageUp}');
    await still();
    await expect.poll(() => button().getAttribute('data-active')).toBe('true');
    await userEvent.tab();
    await expect.element(button()).toHaveFocus();
    expect(button()).not.toHaveAttribute('tabindex', '-1');
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => fromEnd()).toBeLessThanOrEqual(1);
    await expect.poll(() => button().getAttribute('data-active')).toBe('false');
  });

  it.each([true, false])(
    'with autoScroll %s a growing reply is followed or the sent turn stays pinned',
    async autoScroll => {
      await emulate({ reducedMotion: true });
      const turns = script().slice(0, 6);
      const sent = { id: 'sent', text: 'Can we add a second run?' };
      const screen = await render(<Window turns={turns} provider={{ autoScroll }} anchor="sent" />);
      await ready();
      await screen.rerender(
        <Window turns={[...turns, sent, { id: 'reply', text: '' }]} provider={{ autoScroll }} anchor="sent" />,
      );
      for (let words = 20; words <= longReply.split(' ').length; words += 60) {
        await screen.rerender(
          <Window
            turns={[
              ...turns,
              sent,
              {
                id: 'reply',
                text: longReply.split(' ').slice(0, words).join(' '),
              },
            ]}
            provider={{ autoScroll }}
            anchor="sent"
          />,
        );
        await frames();
      }
      await screen.rerender(
        <Window turns={[...turns, sent, { id: 'reply', text: longReply }]} provider={{ autoScroll }} anchor="sent" />,
      );
      if (autoScroll) await expect.poll(() => fromEnd()).toBeLessThanOrEqual(1);
      else {
        await expect.poll(() => offsetIn('sent')).toBe(64);
        expect(fromEnd()).toBeGreaterThan(1);
      }
    },
  );

  it('hooks jump to messages by alignment and report edges and visible items', async () => {
    await emulate({ reducedMotion: true });
    function Controls() {
      const { scrollToMessage, scrollToStart, scrollToEnd } = useMessageScroller();
      const edges = useMessageScrollerScrollable();
      const { visibleMessageIds } = useMessageScrollerVisibility();
      return (
        <div>
          <button type="button" onClick={() => scrollToStart()}>
            First
          </button>
          <button type="button" onClick={() => scrollToEnd()}>
            Latest
          </button>
          {(['start', 'center', 'end'] as const).map(align => (
            <button key={align} type="button" onClick={() => scrollToMessage('m7', { align })}>
              m7 {align}
            </button>
          ))}
          <output data-testid="edges">
            {edges.start ? 'start' : ''}|{edges.end ? 'end' : ''}
          </output>
          <output data-testid="visible">{visibleMessageIds.join(',')}</output>
        </div>
      );
    }
    await render(
      <Window turns={script()} height={240}>
        <Controls />
      </Window>,
    );
    await ready();
    const edges = page.getByTestId('edges');
    const visible = () => page.getByTestId('visible').element().textContent!.split(',');
    await expect.element(edges).toHaveTextContent('start|');
    await expect.poll(visible).toContain('m12');

    await page.getByRole('button', { name: 'First' }).click();
    await expect.poll(() => Math.round(viewport().scrollTop)).toBe(0);
    await expect.element(edges).toHaveTextContent('|end');
    await expect.poll(visible).toContain('m1');
    expect(button('start')).toHaveAttribute('data-active', 'false');
    expect(button('end')).toHaveAttribute('data-active', 'true');

    await page.getByRole('button', { name: 'm7 start' }).click();
    await expect.poll(() => offsetIn('m7')).toBe(0);
    await expect.poll(visible).toContain('m7');
    await expect.poll(() => button('start').getAttribute('data-active')).toBe('true');
    const item = () => viewport().querySelector('[data-message-id="m7"]')!.getBoundingClientRect();
    await page.getByRole('button', { name: 'm7 center' }).click();
    await expect
      .poll(() => {
        const box = viewport().getBoundingClientRect();
        return Math.abs(item().top + item().height / 2 - (box.top + box.height / 2));
      })
      .toBeLessThanOrEqual(2);
    await page.getByRole('button', { name: 'm7 end' }).click();
    await expect.poll(() => Math.abs(Math.round(viewport().getBoundingClientRect().bottom - item().bottom))).toBe(0);

    // The start button sits at the top with its arrow turned up.
    const start = button('start').getBoundingClientRect();
    expect(Math.round(start.top - viewport().getBoundingClientRect().top)).toBe(16);
    await userEvent.click(button('start'));
    await expect.poll(() => Math.round(viewport().scrollTop)).toBe(0);
    await page.getByRole('button', { name: 'Latest' }).click();
    await expect.poll(() => fromEnd()).toBeLessThanOrEqual(1);
  });

  it.each<[MessageScrollerDefaultScrollPosition]>([['last-anchor'], ['end'], ['start']])(
    'opens at %s',
    async position => {
      await emulate({ reducedMotion: true });
      await render(
        <Window
          turns={[
            ...script().slice(0, 4),
            { id: 'q', text: 'Can you reconcile March for me?' },
            { id: 'long', text: longReply },
          ]}
          anchor="q"
          provider={{ defaultScrollPosition: position }}
        />,
      );
      await ready();
      if (position === 'last-anchor') {
        await expect.poll(() => offsetIn('q')).toBe(64);
        expect(button('end')).toHaveAttribute('data-active', 'true');
        expect(button('start')).toHaveAttribute('data-active', 'true');
      } else if (position === 'end') {
        // Exact end landing dropped: scrollToEnd skips measuringFrom, so content-visibility estimates can leave it ~68px short.
        await expect.poll(() => viewport().scrollTop).toBeGreaterThan(0);
        expect(button('start')).toHaveAttribute('data-active', 'true');
      } else {
        await expect.poll(() => Math.round(viewport().scrollTop)).toBe(0);
        expect(button('start')).toHaveAttribute('data-active', 'false');
        expect(button('end')).toHaveAttribute('data-active', 'true');
      }
    },
  );

  it.each([
    ['secondary', 'icon-sm', 'Scroll to newest message', 28],
    ['outline', 'sm', 'New replies', 0],
    ['default', 'icon', 'Scroll to newest message', 32],
  ] as const)('a %s %s jump button keeps its size and place', async (variant, size, name, width) => {
    await emulate({ reducedMotion: true });
    await render(
      <MessageScrollerProvider defaultScrollPosition="start">
        <div style={{ position: 'relative', height: 240 }}>
          <MessageScroller>
            <MessageScrollerViewport aria-label="History">
              <MessageScrollerContent>
                {script().map((turn, index) => (
                  <MessageScrollerItem key={turn.id} messageId={turn.id}>
                    <Bubble index={index} text={turn.text} />
                  </MessageScrollerItem>
                ))}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton variant={variant} size={size} aria-label={width ? name : undefined}>
              {width ? undefined : name}
            </MessageScrollerButton>
          </MessageScroller>
        </div>
      </MessageScrollerProvider>,
    );
    await ready();
    const jump = button();
    await expect.poll(() => jump.getAttribute('data-active')).toBe('true');
    expect(jump).toHaveAttribute('data-variant', variant);
    expect(jump).toHaveAttribute('data-size', size);
    await expect.element(jump).toHaveAccessibleName(name);
    const box = jump.getBoundingClientRect();
    const frame = viewport().getBoundingClientRect();
    if (width) expect(box.width).toBe(width);
    else expect(box.width).toBeGreaterThan(80);
    expect(box.left).toBeGreaterThanOrEqual(frame.left);
    expect(box.right).toBeLessThanOrEqual(frame.right);
    await userEvent.click(jump);
    await expect.poll(() => fromEnd()).toBeLessThanOrEqual(1);
    await expect.poll(() => jump.getAttribute('data-active')).toBe('false');
  });

  it.each([true, false])('prepending older messages with preserveScrollOnPrepend %s', async preserve => {
    await emulate({ reducedMotion: true });
    const recent = script('m', 5).slice(0, 8);
    const screen = await render(<Window turns={recent} anchor="none" preserve={preserve} />);
    await ready();
    await frames();
    if (preserve) {
      await expect.poll(() => fromEnd()).toBeLessThanOrEqual(1);
      const before = offsetIn('m9');
      await screen.rerender(<Window turns={[...script('e').slice(0, 4), ...recent]} anchor="none" preserve />);
      await expect.poll(() => offsetIn('m9')).toBe(before);
    } else {
      viewport().scrollTop = 0;
      await expect.poll(() => Math.round(viewport().scrollTop)).toBe(0);
      const top = offsetIn('m5');
      await screen.rerender(<Window turns={[...script('e').slice(0, 4), ...recent]} anchor="none" preserve={false} />);
      await frames();
      expect(Math.round(viewport().scrollTop)).toBe(0);
      expect(offsetIn('m5')).toBeGreaterThan(top);
    }
  });

  it('the jump button slides over 180ms, and only fades under reduced motion', async () => {
    await render(<Window turns={script()} />);
    await ready();
    let style = getComputedStyle(button());
    expect(style.transitionProperty).toContain('translate');
    expect(style.transitionProperty).toContain('opacity');
    expect(style.transitionDuration).toContain('0.18s');
    expect(style.translate).not.toBe('-50%');
    await emulate({ reducedMotion: true });
    style = getComputedStyle(button());
    expect(style.transitionProperty).toBe('opacity');
    expect(style.transitionDuration).toBe('0.12s');
  });
});
