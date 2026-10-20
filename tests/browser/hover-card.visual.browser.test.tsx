import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../packages/sprout/src/components/hover-card.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('hover-card %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(320, 200);
  const screen = await render(
    <p style={{ margin: 0, padding: 16 }}>
      Ask{' '}
      <HoverCard>
        <HoverCardTrigger delay={0} href="#priya">
          Priya Raman
        </HoverCardTrigger>
        <HoverCardContent align="start">
          <p style={{ fontWeight: 500 }}>Priya Raman</p>
          <p style={{ color: 'var(--sprout-muted)' }}>
            Runs the weekly seed-catalog review and owns the spring launch.
          </p>
        </HoverCardContent>
      </HoverCard>{' '}
      about the launch.
    </p>,
  );
  await screen.getByRole('link').hover();
  await expect.poll(() => document.querySelector('[data-slot="hover-card-content"][data-open]')).not.toBeNull();
  await settle();
  await expect.element(page.elementLocator(document.body)).toMatchScreenshot(`hover-card-${theme}-${mode}`);
});
