import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../packages/sprout/src/components/tooltip.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('tooltip %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(320, 160);
  await render(
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        height: 160,
        background: 'var(--sprout-canvas)',
      }}
    >
      <Tooltip>
        <TooltipTrigger delay={0} render={<Button variant="outline" />}>
          Attach files
        </TooltipTrigger>
        <TooltipContent>Attach files from your device</TooltipContent>
      </Tooltip>
    </div>,
  );
  await page.getByRole('button', { name: 'Attach files' }).hover();
  await expect.element(page.getByRole('tooltip')).toBeVisible();
  await settle();
  await expect.element(page.elementLocator(document.body)).toMatchScreenshot(`tooltip-${theme}-${mode}`);
});
