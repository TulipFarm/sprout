import { describe, expect, it } from 'vitest';
import { createRef } from 'react';
import { renderToString } from 'react-dom/server';
import {
  Message,
  MessageAvatar,
  MessageBubble,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
  MessageReactions,
  messageAlignNames,
  messageBubbleVariantNames,
  messageReactionsSideNames,
} from '../packages/sprout/src/components/message.js';
import * as sprout from '../packages/sprout/src/index.js';

describe('Message', () => {
  it('is exported from the package root', () => {
    for (const name of [
      'Message',
      'MessageAvatar',
      'MessageContent',
      'MessageFooter',
      'MessageGroup',
      'MessageHeader',
      'MessageBubble',
      'MessageReactions',
      'messageAlignNames',
      'messageBubbleVariantNames',
      'messageReactionsSideNames',
    ])
      expect(sprout).toHaveProperty(name);
    expect(messageAlignNames).toEqual(['start', 'end']);
    expect(messageBubbleVariantNames).toEqual([
      'default',
      'secondary',
      'muted',
      'tinted',
      'outline',
      'ghost',
      'destructive',
    ]);
    expect(messageReactionsSideNames).toEqual(['top', 'bottom']);
  });

  it('defaults to start alignment', () => {
    expect(renderToString(<Message />)).toBe(
      '<div data-slot="message" data-align="start" class="sprout-message"></div>',
    );
  });

  it('renders every alignment with realistic content', () => {
    for (const align of messageAlignNames) {
      const html = renderToString(
        <Message align={align}>
          <MessageContent>
            <MessageHeader>{align === 'end' ? 'You' : 'TulipFarm guide'}</MessageHeader>
            <p>Meadow Growers</p>
          </MessageContent>
        </Message>,
      );
      expect(html).toContain(`data-align="${align}"`);
      expect(html).toContain('data-slot="message-content"');
      expect(html).toContain('class="sprout-message-header"');
    }
  });

  it('composes every part with slots and classes', () => {
    const html = renderToString(
      <MessageGroup aria-label="Conversation">
        <Message>
          <MessageAvatar>
            <span>AM</span>
          </MessageAvatar>
          <MessageContent>
            <MessageHeader>Alex Meadow · 10:30</MessageHeader>
            <MessageBubble variant="secondary">Can you help plan the garden?</MessageBubble>
            <MessageFooter>Delivered</MessageFooter>
          </MessageContent>
        </Message>
      </MessageGroup>,
    );
    for (const slot of [
      'message-group',
      'message',
      'message-avatar',
      'message-content',
      'message-header',
      'message-footer',
      'message-bubble',
    ]) {
      expect(html).toContain(`data-slot="${slot}"`);
      expect(html).toContain(`sprout-${slot}`);
    }
    expect(html).toContain('aria-label="Conversation"');
    expect(html).toContain('>Delivered</div>');
  });

  it('passes attributes and merges classes', () => {
    const html = renderToString(
      <Message align="start" aria-busy="true" className="mt-2" id="reply">
        <MessageContent className="gap-4">
          <span className="sr-only">TulipFarm said</span>
        </MessageContent>
      </Message>,
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('id="reply"');
    expect(html).toContain('class="sprout-message mt-2"');
    expect(html).toContain('class="sprout-message-content gap-4"');
  });

  it('forwards refs on the content', () => {
    const ref = createRef<HTMLDivElement>();
    const html = renderToString(<MessageContent ref={ref} />);
    expect(html).toBe('<div data-slot="message-content" class="sprout-message-content"></div>');
  });

  it('renders a default bubble as one element', () => {
    expect(renderToString(<MessageBubble>Can you help plan the garden?</MessageBubble>)).toBe(
      '<div data-slot="message-bubble" data-variant="default" class="sprout-message-bubble sprout-message-bubble-default">Can you help plan the garden?</div>',
    );
  });

  it('renders every bubble variant', () => {
    for (const variant of messageBubbleVariantNames)
      expect(
        renderToString(
          <MessageBubble variant={variant}>Create a Customers table with Name, Email, and Status.</MessageBubble>,
        ),
      ).toBe(
        `<div data-slot="message-bubble" data-variant="${variant}" class="sprout-message-bubble sprout-message-bubble-${variant}">Create a Customers table with Name, Email, and Status.</div>`,
      );
  });

  it('renders a bubble as a link or button and keeps the slot', () => {
    expect(
      renderToString(
        <MessageBubble variant="outline" render={<a href="/results/investor-update" />}>
          Open result
        </MessageBubble>,
      ),
    ).toBe(
      '<a href="/results/investor-update" data-slot="message-bubble" data-variant="outline" class="sprout-message-bubble sprout-message-bubble-outline">Open result</a>',
    );
    expect(
      renderToString(
        <MessageBubble variant="destructive" render={<button type="button" />} aria-pressed="false" className="retry">
          Retry
        </MessageBubble>,
      ),
    ).toBe(
      '<button type="button" data-slot="message-bubble" data-variant="destructive" class="sprout-message-bubble sprout-message-bubble-destructive retry" aria-pressed="false">Retry</button>',
    );
  });

  it('draws no frame without reactions', () => {
    for (const reactions of [undefined, null, false])
      expect(
        renderToString(
          <MessageBubble variant="secondary" reactions={reactions}>
            Hello
          </MessageBubble>,
        ),
      ).toBe(
        '<div data-slot="message-bubble" data-variant="secondary" class="sprout-message-bubble sprout-message-bubble-secondary">Hello</div>',
      );
  });

  it('wraps the bubble and its reactions in a frame', () => {
    expect(
      renderToString(
        <MessageBubble
          variant="tinted"
          render={<button type="button" />}
          reactions={<MessageReactions align="start">🌱 2</MessageReactions>}
        >
          Hello from Alex.
        </MessageBubble>,
      ),
    ).toBe(
      '<div data-slot="message-bubble-frame" data-variant="tinted" class="sprout-message-bubble-frame">' +
        '<button type="button" data-slot="message-bubble" data-variant="tinted" class="sprout-message-bubble sprout-message-bubble-tinted">Hello from Alex.</button>' +
        '<div data-slot="message-reactions" data-align="start" data-side="bottom" class="sprout-message-reactions">🌱 2</div>' +
        '</div>',
    );
  });

  it('places reactions on every side and corner, defaulting to bottom end', () => {
    expect(renderToString(<MessageReactions>🌱 2</MessageReactions>)).toBe(
      '<div data-slot="message-reactions" data-align="end" data-side="bottom" class="sprout-message-reactions">🌱 2</div>',
    );
    for (const side of messageReactionsSideNames)
      for (const align of messageAlignNames)
        expect(
          renderToString(
            <MessageReactions side={side} align={align} className="pill" title="Reactions">
              ✓ 1
            </MessageReactions>,
          ),
        ).toBe(
          `<div data-slot="message-reactions" data-align="${align}" data-side="${side}" class="sprout-message-reactions pill" title="Reactions">✓ 1</div>`,
        );
  });

  it('passes bubble attributes and merges classes', () => {
    const html = renderToString(
      <MessageBubble variant="ghost" id="answer" className="wide" aria-busy="true">
        Thinking
      </MessageBubble>,
    );
    expect(html).toContain('id="answer"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('class="sprout-message-bubble sprout-message-bubble-ghost wide"');
  });

  it('puts consecutive bubbles in one content column', () => {
    const html = renderToString(
      <Message align="end">
        <MessageContent>
          <MessageBubble variant="secondary">Add a Churned status.</MessageBubble>
          <MessageBubble variant="secondary">Make Name required.</MessageBubble>
        </MessageContent>
      </Message>,
    );
    expect(html).toBe(
      '<div data-slot="message" data-align="end" class="sprout-message"><div data-slot="message-content" class="sprout-message-content">' +
        '<div data-slot="message-bubble" data-variant="secondary" class="sprout-message-bubble sprout-message-bubble-secondary">Add a Churned status.</div>' +
        '<div data-slot="message-bubble" data-variant="secondary" class="sprout-message-bubble sprout-message-bubble-secondary">Make Name required.</div>' +
        '</div></div>',
    );
  });
});
