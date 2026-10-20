import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Toggle } from '../../packages/sprout/src/components/toggle.js';
import { setTheme, settle, themes } from './support.js';

const Icon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" data-icon="inline-start">
    <path d="M3 3h10v10H3z" fill="none" stroke="currentColor" />
  </svg>
);

it.each(themes)('toggle %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'inline-grid',
        gap: 8,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      {(['default', 'outline'] as const).map(variant => (
        <div key={variant} style={{ display: 'flex', gap: 8 }}>
          <Toggle variant={variant} size="sm">
            Off
          </Toggle>
          <Toggle variant={variant} defaultPressed>
            <Icon />
            Pressed
          </Toggle>
          <Toggle variant={variant} size="lg" disabled defaultPressed>
            Disabled
          </Toggle>
          <Toggle variant={variant} aria-invalid="true">
            Invalid
          </Toggle>
        </div>
      ))}
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`toggle-${theme}-${mode}`);
});
