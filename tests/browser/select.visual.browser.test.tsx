import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../../packages/sprout/src/components/select.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('select %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(320, 240);
  const screen = await render(
    <div style={{ display: 'flex', gap: 8, padding: 16 }}>
      <Select defaultValue="Weekly">
        <SelectTrigger aria-label="Digest">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            <SelectLabel>Cadence</SelectLabel>
            <SelectItem value="Daily">Daily</SelectItem>
            <SelectItem value="Weekly">Weekly</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectItem value="Monthly" disabled>
            Monthly (unavailable)
          </SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="25">
        <SelectTrigger aria-label="Rows" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="25">25</SelectItem>
        </SelectContent>
      </Select>
      <Select disabled defaultValue="Locked">
        <SelectTrigger aria-label="Sender">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Locked">Locked</SelectItem>
        </SelectContent>
      </Select>
    </div>,
  );
  await screen.getByRole('combobox', { name: 'Digest' }).click();
  await settle();
  await expect.element(page.elementLocator(document.body)).toMatchScreenshot(`select-${theme}-${mode}`);
});
