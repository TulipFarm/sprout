import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '../../packages/sprout/src/components/input-otp.js';

function Code(props: Partial<Parameters<typeof InputOTP>[0]> & { testId?: string }) {
  const { testId = 'code', ...rest } = props;
  return (
    <InputOTP maxLength={6} aria-label="Verification code" data-testid={testId} {...rest}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
}

const slots = (testId = 'code') => [
  ...page.getByTestId(testId).element().querySelectorAll<HTMLInputElement>('[data-slot="input-otp-slot"]'),
];

describe('InputOTP on a touch screen', () => {
  it('coarse pointers get 44px slots that fit a phone', async () => {
    await page.viewport(390, 844);
    await render(<Code />);
    const first = getComputedStyle(slots()[0]!);
    expect([first.width, first.height]).toEqual(['44px', '44px']);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const slot of slots()) expect(slot.getBoundingClientRect().right).toBeLessThanOrEqual(390);
  });
});
