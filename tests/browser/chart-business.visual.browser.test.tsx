import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { BusinessFixture } from './chart-business-fixture.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('business charts %s %s', async (theme, mode) => {
  // Tall enough that every chart paints inside the shot.
  await page.viewport(760, 3400);
  setTheme(theme, mode);
  const screen = await render(<BusinessFixture />);
  await expect
    .poll(() =>
      ['.recharts-pie-sector', '.recharts-sankey-nodes rect', '.recharts-radar-polygon'].every(selector =>
        document.querySelector(selector),
      ),
    )
    .toBe(true);
  await settle();
  await expect.element(screen.getByTestId('business')).toMatchScreenshot(`chart-business-${theme}-${mode}`);
});
