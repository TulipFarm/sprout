import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '../../packages/sprout/src/components/input-otp.js';
import { setTheme, settle, themes } from './support.js';

function Code(props: Partial<Parameters<typeof InputOTP>[0]>) {
  return (
    <InputOTP maxLength={6} aria-label="Verification code" {...props}>
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

it.each(themes)('input-otp %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'inline-grid',
        gap: 12,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      <Code defaultValue="12" />
      <Code aria-invalid defaultValue="194278" />
      <Code disabled defaultValue="123456" />
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`input-otp-${theme}-${mode}`);
});
