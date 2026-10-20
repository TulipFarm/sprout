import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '../packages/sprout/src/components/input-otp.js';
import * as sprout from '../packages/sprout/src/index.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../packages/sprout/src/styles/input-otp.css');

function Code(props: Partial<Parameters<typeof InputOTP>[0]>) {
  return (
    <InputOTP maxLength={6} aria-label="Verification code" {...props}>
      <InputOTPGroup>
        {[0, 1, 2].map(index => (
          <InputOTPSlot key={index} index={index} />
        ))}
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        {[3, 4, 5].map(index => (
          <InputOTPSlot key={index} index={index} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}

const count = (html: string, text: string) => html.split(text).length - 1;

describe('Input OTP', () => {
  it('is exported from the package root, its subpath, the CSS entry, and the docs nav', () => {
    for (const name of ['InputOTP', 'InputOTPGroup', 'InputOTPSeparator', 'InputOTPSlot']) {
      expect(sprout).toHaveProperty(name);
    }
    const pkg = JSON.parse(read('../packages/sprout/package.json'));
    expect(pkg.exports['./input-otp']).toEqual({
      types: './dist/components/input-otp.d.ts',
      import: './dist/components/input-otp.js',
    });
    expect(read('../packages/sprout/src/styles/index.css')).toContain('@import "./input-otp.css";');
    expect(read('../apps/docs/src/data/nav.ts')).toContain('"Input OTP"');
  });

  it('renders a labelled group of six inputs with two groups and a separator', () => {
    const html = renderToString(<Code defaultValue="12" />);
    expect(html).toContain('data-slot="input-otp"');
    expect(html).toContain('role="group"');
    expect(count(html, 'data-slot="input-otp-group"')).toBe(2);
    expect(count(html, 'data-slot="input-otp-slot"')).toBe(6);
    expect(count(html, 'data-slot="input-otp-separator"')).toBe(1);
    expect(html).toContain('role="separator"');
    expect(html).toContain('class="sprout-input-otp-sr-only"');
    expect(html).toContain('>Verification code</span>');
    const labelId = /aria-labelledby="([^"]+)"/.exec(html)![1];
    expect(html).toContain(`id="${labelId}"`);
    expect(html).toContain('aria-label="Character 2 of 6"');
    expect(html).toContain('aria-label="Character 6 of 6"');
    expect(html).not.toContain('aria-label="Character 1 of 6"');
    expect(html).toContain('autoComplete="one-time-code"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('value="1"');
    expect(html).toContain('value="2"');
    expect(html).toContain('<svg');
  });

  it('propagates aria-invalid and aria-describedby', () => {
    const html = renderToString(<Code value="194278" onChange={() => {}} aria-invalid aria-describedby="otp-error" />);
    expect(html).toContain('data-invalid');
    expect(count(html, 'aria-invalid="true"')).toBe(6);
    expect(html).toContain('aria-describedby="otp-error"');
    for (const digit of '194278') expect(html).toContain(`value="${digit}"`);

    const valid = renderToString(<Code aria-invalid={false} />);
    expect(valid).not.toContain('aria-invalid="true"');
  });

  it('accepts aria-invalid per slot as Cloud does', () => {
    const html = renderToString(
      <InputOTP maxLength={2} aria-label="Code">
        <InputOTPGroup>
          <InputOTPSlot index={0} aria-invalid />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </InputOTP>,
    );
    expect(count(html, 'aria-invalid="true"')).toBe(1);
  });

  it('disables every slot', () => {
    const html = renderToString(<Code disabled defaultValue="123456" />);
    expect(count(html, 'disabled=""')).toBeGreaterThanOrEqual(6);
    expect(html).toContain('data-disabled');
  });

  it('uses a native label instead of aria-label when given an id', () => {
    const html = renderToString(
      <InputOTP maxLength={2} id="signin-code">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </InputOTP>,
    );
    expect(html).toContain('id="signin-code"');
    expect(html).not.toContain('sprout-input-otp-sr-only');
  });

  it('styles Cloud dimensions, states, touch size, and motion in namespaced CSS', () => {
    expect(css).toMatch(/\.sprout-input-otp-slot \{[^}]*width: 32px;[^}]*height: 32px;/s);
    expect(css).toMatch(/@media \(pointer: coarse\)[^@]*width: 44px;/s);
    expect(css).toContain('.sprout-input-otp-slot[aria-invalid="true"]');
    expect(css).toContain('.sprout-input-otp-group:has(.sprout-input-otp-slot[aria-invalid="true"])');
    expect(css).toContain('.sprout-input-otp[data-disabled]');
    expect(css).toContain('@media (prefers-reduced-motion: no-preference)');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).not.toMatch(/--(?!sprout-)[a-z-]+:/);
  });
});
