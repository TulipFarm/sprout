import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '../../packages/sprout/src/components/alert.js';
import { Button } from '../../packages/sprout/src/components/button.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('alert %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        gap: 12,
        padding: 16,
        width: 480,
        background: 'var(--sprout-canvas)',
      }}
    >
      {(['default', 'destructive'] as const).map(variant => (
        <Alert key={variant} variant={variant}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" />
          </svg>
          <AlertTitle>Payment {variant}</AlertTitle>
          <AlertDescription>
            The invoice is ready. <a href="#details">See what changes</a>
          </AlertDescription>
          <AlertAction>
            <Button size="sm" variant="outline">
              Undo
            </Button>
          </AlertAction>
        </Alert>
      ))}
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`alert-${theme}-${mode}`);
});
