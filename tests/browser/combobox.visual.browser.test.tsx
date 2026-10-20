import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from '../../packages/sprout/src/components/combobox.js';
import { setTheme, settle, themes } from './support.js';

const fruits = ['Apple', 'Apricot', 'Blueberry', 'Cherry'];

it.each(themes)('combobox %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(360, 300);
  const screen = await render(
    <div style={{ display: 'grid', gap: 8, padding: 16, width: 280 }}>
      <Combobox items={fruits} multiple defaultValue={['Apple', 'Cherry']}>
        <ComboboxChips>
          <ComboboxValue>
            {(values: string[]) => values.map(value => <ComboboxChip key={value}>{value}</ComboboxChip>)}
          </ComboboxValue>
          <ComboboxChipsInput aria-label="Add fruit" placeholder="Add fruit" />
        </ComboboxChips>
      </Combobox>
      <Combobox items={fruits} defaultValue="Apricot">
        <ComboboxInput aria-label="Choose a fruit" showClear />
        <ComboboxContent>
          <ComboboxEmpty>No fruit found.</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>,
  );
  await screen.getByRole('combobox', { name: 'Choose a fruit' }).click();
  await expect.element(page.getByRole('listbox')).toBeVisible();
  await settle();
  await expect.element(page.elementLocator(document.body)).toMatchScreenshot(`combobox-${theme}-${mode}`);
});
