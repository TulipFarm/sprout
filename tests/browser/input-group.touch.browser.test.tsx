import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '../../packages/sprout/src/components/input-group.js';

const Search = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" />
  </svg>
);

function Composer() {
  const [message, setMessage] = useState('');
  const tooLong = message.length > 400;
  return (
    <form style={{ padding: 16, maxWidth: 560 }} onSubmit={e => e.preventDefault()}>
      <InputGroup variant="composer" data-testid="composer">
        <InputGroupTextarea
          aria-label="Message"
          value={message}
          aria-invalid={tooLong}
          onChange={event => setMessage(event.target.value)}
        />
        <InputGroupAddon align="block-end">
          <InputGroupButton size="icon" aria-label="Add a file">
            <Search />
          </InputGroupButton>
          <InputGroupButton
            size="icon"
            type="submit"
            variant={message ? 'default' : 'secondary'}
            disabled={!message || tooLong}
            aria-label="Send message"
          >
            <Search />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}

describe('InputGroup on a touch screen', () => {
  it('coarse pointers grow composer buttons to 44px on a phone', async () => {
    await page.viewport(390, 800);
    const screen = await render(<Composer />);
    const box = screen.getByRole('button', { name: 'Add a file' }).element().getBoundingClientRect();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });
});
