import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as sprout from '../packages/sprout/src/index.js';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  messageScrollerButtonDirectionNames,
  messageScrollerDefaultScrollPositionNames,
  messageScrollerScrollAlignNames,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
  type MessageScrollerDefaultScrollPosition,
} from '../packages/sprout/src/components/message-scroller.js';
import { MessageScrollerController } from '../packages/sprout/src/internal/message-scroller.js';

function Conversation({
  position,
  count = 3,
  children,
}: {
  position?: MessageScrollerDefaultScrollPosition;
  count?: number;
  children?: React.ReactNode;
}) {
  return (
    <MessageScrollerProvider defaultScrollPosition={position}>
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent>
            {Array.from({ length: count }, (_, index) => (
              <MessageScrollerItem key={index} messageId={`example-${index}`} scrollAnchor={index === count - 1}>
                <div className="p-4">Fictional garden message {index + 1}</div>
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        {children ?? <MessageScrollerButton aria-label="Scroll to newest message" />}
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

describe('MessageScroller', () => {
  it('is exported from the package root with its hooks and names', () => {
    for (const name of [
      'MessageScroller',
      'MessageScrollerButton',
      'MessageScrollerContent',
      'MessageScrollerItem',
      'MessageScrollerProvider',
      'MessageScrollerViewport',
      'useMessageScroller',
      'useMessageScrollerScrollable',
      'useMessageScrollerVisibility',
    ])
      expect(sprout).toHaveProperty(name);
    expect(messageScrollerDefaultScrollPositionNames).toEqual(['end', 'start', 'last-anchor']);
    expect(messageScrollerButtonDirectionNames).toEqual(['end', 'start']);
    expect(messageScrollerScrollAlignNames).toEqual(['start', 'center', 'end', 'nearest']);
  });

  it('renders the slots, a named focusable region, and a polite log', () => {
    const html = renderToString(<Conversation />);
    expect(html).toContain('data-slot="message-scroller"');
    expect(html).toMatch(
      /data-slot="message-scroller-viewport"[^>]*role="region"[^>]*aria-label="Messages"[^>]*tabindex="0"/i,
    );
    expect(html).toMatch(/data-slot="message-scroller-content"[^>]*role="log"[^>]*aria-relevant="additions"/);
    expect(html).toContain('aria-hidden="true" data-message-scroller-spacer="" hidden=""');
  });

  it('lets the viewport name and content role be overridden', () => {
    const html = renderToString(
      <MessageScrollerProvider defaultScrollPosition="start">
        <MessageScroller className="h-96">
          <MessageScrollerViewport aria-label="Order thread" className="custom-viewport">
            <MessageScrollerContent role="list" spacerClassName="custom-spacer" className="gap-2" />
          </MessageScrollerViewport>
        </MessageScroller>
      </MessageScrollerProvider>,
    );
    expect(html).toContain('aria-label="Order thread"');
    expect(html).not.toContain('aria-label="Messages"');
    expect(html).toContain('role="list"');
    expect(html).toContain('sprout-message-scroller h-96');
    expect(html).toContain('sprout-message-scroller-viewport custom-viewport');
    expect(html).toContain('sprout-message-scroller-content gap-2');
    expect(html).toContain('class="custom-spacer"');
  });

  it('marks message ids and the scroll anchor', () => {
    const html = renderToString(<Conversation count={12} />);
    expect(html.match(/data-slot="message-scroller-item"/g)).toHaveLength(12);
    expect(html).toContain('data-message-id="example-0" data-scroll-anchor="false"');
    expect(html).toContain('data-message-id="example-11" data-scroll-anchor="true"');
    expect(html.match(/data-scroll-anchor="true"/g)).toHaveLength(1);
    expect(html).toContain('Fictional garden message <!-- -->12');
  });

  it('renders the jump button as an inert secondary icon-sm Button by default', () => {
    const html = renderToString(<Conversation />);
    const button = html.match(/<button[^>]*data-slot="message-scroller-button"[^>]*>.*?<\/button>/)?.[0] ?? '';
    expect(button).toContain('type="button"');
    expect(button).toContain('data-variant="secondary"');
    expect(button).toContain('data-size="icon-sm"');
    expect(button).toContain('data-direction="end"');
    expect(button).toContain('data-active="false"');
    expect(button).toContain('inert=""');
    expect(button).toContain('tabindex="-1"');
    expect(button).toContain('aria-label="Scroll to newest message"');
    expect(button).toContain('sprout-message-scroller-button');
    expect(button).toContain('<svg');
    expect(button).toContain('<span class="sprout-message-scroller-sr-only">Scroll to end</span>');
  });

  it('supports the start direction, other variants and sizes, children, and render', () => {
    const html = renderToString(
      <Conversation>
        <MessageScrollerButton direction="start" />
        <MessageScrollerButton variant="outline" size="sm">
          New replies
        </MessageScrollerButton>
        <MessageScrollerButton variant="default" size="icon" aria-label="Jump" />
        <MessageScrollerButton render={<a href="#latest" />}>Latest</MessageScrollerButton>
      </Conversation>,
    );
    expect(html).toContain('data-direction="start"');
    expect(html).toContain('Scroll to start');
    expect(html).toMatch(/data-variant="outline" data-size="sm"[^>]*>New replies</);
    expect(html).toMatch(/data-variant="default" data-size="icon"/);
    expect(html).toMatch(/<a href="#latest"[^>]*data-slot="message-scroller-button"[^>]*>Latest<\/a>/);
  });

  it('hides the history until the default scroll is applied, except when opening at the start', () => {
    for (const position of ['end', 'last-anchor'] as const) {
      const html = renderToString(<Conversation position={position} />);
      expect(html.match(/data-pending-scroll=""/g)).toHaveLength(2);
    }
    expect(renderToString(<Conversation position="start" />)).not.toContain('data-pending-scroll');
    expect(renderToString(<Conversation count={0} />)).toContain('data-pending-scroll');
  });

  it('throws when parts or hooks are used outside the provider', () => {
    function Probe({ hook }: { hook: () => unknown }) {
      hook();
      return null;
    }
    expect(() => renderToString(<MessageScroller />)).toThrow(/MessageScrollerProvider/);
    expect(() => renderToString(<MessageScrollerButton />)).toThrow(/MessageScrollerProvider/);
    for (const hook of [useMessageScroller, useMessageScrollerScrollable, useMessageScrollerVisibility])
      expect(() => renderToString(<Probe hook={hook} />)).toThrow(/MessageScrollerProvider/);
  });

  it('reads hook state inside the provider', () => {
    const seen: unknown[] = [];
    function Probe() {
      const api = useMessageScroller();
      seen.push(typeof api.scrollToEnd, typeof api.scrollToMessage, typeof api.scrollToStart);
      seen.push(useMessageScrollerScrollable(), useMessageScrollerVisibility());
      return null;
    }
    renderToString(
      <MessageScrollerProvider>
        <Probe />
      </MessageScrollerProvider>,
    );
    expect(seen).toEqual([
      'function',
      'function',
      'function',
      { start: false, end: false },
      { visibleMessageIds: [], currentAnchorId: null },
    ]);
  });

  it('returns false from edge scrolls before a viewport is attached', () => {
    const controller = new MessageScrollerController({
      autoScroll: false,
      defaultScrollPosition: 'end',
      scrollEdgeThreshold: 8,
      scrollPreviousItemPeek: 64,
      scrollMargin: 0,
    });
    expect(controller.scrollToEnd()).toBe(false);
    expect(controller.scrollToStart()).toBe(false);
    // An empty history queues the jump until the message renders.
    expect(controller.scrollToMessage('m1')).toBe(true);
    controller.dispose();
  });
});
