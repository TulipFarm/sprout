import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '../../packages/sprout/src/components/popover.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('popover %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(340, 260);
  const screen = await render(
    <div style={{ padding: 16 }}>
      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>Customize</PopoverTrigger>
        <PopoverContent align="start">
          <PopoverHeader>
            <PopoverTitle>Group and calculate</PopoverTitle>
            <PopoverDescription>Group rows by owner and total the forecast.</PopoverDescription>
          </PopoverHeader>
          <Button size="sm">Apply</Button>
        </PopoverContent>
      </Popover>
    </div>,
  );
  await screen.getByRole('button', { name: 'Customize' }).click();
  await settle();
  await expect.element(page.elementLocator(document.body)).toMatchScreenshot(`popover-${theme}-${mode}`);
});
