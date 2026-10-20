import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Message,
  MessageAvatar,
  MessageBubble,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
  MessageReactions,
  messageBubbleVariantNames,
} from '../../packages/sprout/src/components/message.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('message %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div data-testid="shot" style={{ width: 520, padding: 24, background: 'var(--sprout-surface)' }}>
      <MessageGroup>
        <Message>
          <MessageAvatar>
            <span
              style={{
                width: 32,
                height: 32,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              AM
            </span>
          </MessageAvatar>
          <MessageContent>
            <MessageHeader>Ana Morales</MessageHeader>
            <MessageBubble
              variant="secondary"
              reactions={
                <MessageReactions>
                  <button type="button" aria-pressed="true">
                    👍 2
                  </button>
                </MessageReactions>
              }
            >
              Bed 2 tomatoes are ready on Friday.
            </MessageBubble>
            <MessageFooter>Read 9:41</MessageFooter>
          </MessageContent>
        </Message>
        <Message align="end">
          <MessageContent>
            <MessageHeader>You</MessageHeader>
            <MessageBubble>Great, I'll bring the crates.</MessageBubble>
            <MessageFooter>Sent</MessageFooter>
          </MessageContent>
        </Message>
        {messageBubbleVariantNames.map(variant => (
          <MessageBubble key={variant} variant={variant}>
            {variant} bubble
          </MessageBubble>
        ))}
      </MessageGroup>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`message-${theme}-${mode}`);
});
