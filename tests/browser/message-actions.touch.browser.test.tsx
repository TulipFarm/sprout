import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { MessageActions } from '../../packages/sprout/src/components/message-actions.js';
import { Message, MessageContent, MessageGroup } from '../../packages/sprout/src/components/message.js';

const reply =
  'Notes are in [the reconciliation sheet](https://example.com/sheets/march-recon). **1,284** orders matched.';
const question = 'Which March orders still need a match?';

function Conversation() {
  return (
    <MessageGroup style={{ padding: 16, maxWidth: 480 }}>
      <Message align="end" data-testid="human">
        <MessageContent>
          {question}
          <MessageActions text={question} author="human" hover />
        </MessageContent>
      </Message>
      <Message data-testid="assistant">
        <MessageContent>
          See <a href="#sheet">the reconciliation sheet</a>.
          <MessageActions text={reply} hover />
        </MessageContent>
      </Message>
    </MessageGroup>
  );
}

const row = (name: string) => page.getByRole('group', { name }).element() as HTMLElement;
const opacity = (name: string) => getComputedStyle(row(name)).opacity;

describe('MessageActions on a touch screen', () => {
  it('touch screens always show hover rows without overflowing 390px', async () => {
    await page.viewport(390, 844);
    await render(<Conversation />);
    expect(matchMedia('(hover: none)').matches).toBe(true);
    expect(opacity('Message actions')).toBe('1');
    expect(opacity('Response actions')).toBe('1');
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });
});
