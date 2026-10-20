import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from '../../packages/sprout/src/components/combobox.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const fruits = ['Apple', 'Apricot', 'Blueberry', 'Cherry', 'Pear'];
const channels = ['general', 'launches', 'incidents', 'design-reviews'];
const regions = [
  { value: 'Americas', items: ['America/Denver', 'America/New_York'] },
  { value: 'Europe', items: ['Europe/London', 'Europe/Berlin'] },
  { value: 'Asia', items: ['Asia/Kolkata', 'Asia/Tokyo'] },
];
const zones = regions.flatMap(region => region.items);

function Items() {
  return (
    <ComboboxList>
      {(item: string) => (
        <ComboboxItem key={item} value={item}>
          {item}
        </ComboboxItem>
      )}
    </ComboboxList>
  );
}

function Fruit({ disabled }: { disabled?: boolean }) {
  return (
    <Combobox items={fruits} disabled={disabled}>
      <ComboboxInput aria-label="Choose a fruit" placeholder="Choose a fruit" showClear />
      <ComboboxContent>
        <ComboboxEmpty>No fruit found.</ComboboxEmpty>
        <Items />
      </ComboboxContent>
    </Combobox>
  );
}

function Channels({ anchored }: { anchored?: boolean }) {
  const anchor = useComboboxAnchor();
  return (
    <Combobox items={channels} multiple defaultValue={['general', 'launches']}>
      <ComboboxChips ref={anchor} style={{ width: 320 }}>
        <ComboboxValue>
          {(values: string[]) =>
            values.map(value => (
              <ComboboxChip key={value} showRemove={value !== 'general'}>
                {value}
              </ComboboxChip>
            ))
          }
        </ComboboxValue>
        <ComboboxChipsInput aria-label="Channels" placeholder="Add channel" />
      </ComboboxChips>
      <ComboboxContent anchor={anchored ? anchor : undefined}>
        <ComboboxEmpty>No channel found.</ComboboxEmpty>
        <Items />
      </ComboboxContent>
    </Combobox>
  );
}

const popup = () => document.querySelector<HTMLElement>('[data-slot="combobox-content"][data-open]');
const options = () => [...document.querySelectorAll('[role="option"]')].map(o => o.textContent);

describe('Combobox in a real browser', () => {
  it('filters, picks with the keyboard, swaps chevron for clear, and shows empty', async () => {
    const screen = await render(<Fruit />);
    const input = screen.getByRole('combobox', { name: 'Choose a fruit' });
    const chevron = () => screen.container.querySelector('.sprout-combobox-input-trigger')!;
    expect(getComputedStyle(chevron()).display).not.toBe('none');
    await input.click();
    await userEvent.keyboard('ap');
    await expect.element(input).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(options).toEqual(['Apple', 'Apricot']);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect.element(page.getByRole('option', { name: 'Apricot' })).toHaveAttribute('data-highlighted', '');
    await userEvent.keyboard('{Enter}');
    await expect.poll(popup).toBeNull();
    await expect.element(input).toHaveValue('Apricot');
    await expect.element(input).toHaveFocus();

    const clear = screen.getByRole('button', { name: 'Clear selection' });
    await expect.element(clear).toBeVisible();
    expect(getComputedStyle(chevron()).display).toBe('none');

    await userEvent.keyboard('{ArrowDown}');
    const apricot = page.getByRole('option', { name: 'Apricot' });
    await expect.element(apricot).toHaveAttribute('aria-selected', 'true');
    await expect
      .element(page.elementLocator(apricot.element().querySelector('.sprout-combobox-item-indicator')!))
      .toBeVisible();
    await userEvent.keyboard('{Escape}');
    await clear.click();
    await expect.element(input).toHaveValue('');
    await expect.element(clear).not.toBeInTheDocument();

    await userEvent.fill(input, 'zzz');
    await expect.element(page.getByRole('status')).toHaveTextContent('No fruit found.');
    expect(options()).toEqual([]);
    await userEvent.keyboard('{Escape}');
    await expect.poll(popup).toBeNull();
    await expect.element(input).toHaveFocus();
    await userEvent.fill(input, '');
    await userEvent.keyboard('{Escape}');
    await page.elementLocator(chevron()).click();
    await expect.poll(() => options().length).toBe(5);
  });

  it('chips add with the keyboard, Backspace and × remove, and locked chips stay', async () => {
    const screen = await render(<Channels />);
    const chips = () =>
      [...screen.container.querySelectorAll('[data-slot="combobox-chip"]')].map(chip => chip.textContent);
    expect(chips()).toEqual(['general', 'launches']);
    await expect.element(screen.getByRole('button', { name: 'Remove general' })).not.toBeInTheDocument();
    await screen.getByRole('combobox', { name: 'Channels' }).click();
    await userEvent.keyboard('inc');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect.poll(chips).toEqual(['general', 'launches', 'incidents']);
    await userEvent.keyboard('{Escape}');
    await userEvent.fill(screen.getByRole('combobox'), '');
    await userEvent.keyboard('{Backspace}');
    await expect.poll(chips).toEqual(['general', 'launches']);
    await screen.getByRole('button', { name: 'Remove launches' }).click();
    await expect.poll(chips).toEqual(['general']);
  });

  it('an anchored list lines up with the whole chips field', async () => {
    const screen = await render(
      <div style={{ padding: 24 }}>
        <Channels anchored />
      </div>,
    );
    await screen.getByRole('combobox', { name: 'Channels' }).click();
    await expect.poll(popup).not.toBeNull();
    expect(popup()).toHaveAttribute('data-chips', 'true');
    await settle();
    const field = screen.container.querySelector('[data-slot="combobox-chips"]')!.getBoundingClientRect();
    const list = popup()!.getBoundingClientRect();
    expect(Math.abs(list.x - field.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(list.width - field.width)).toBeLessThanOrEqual(1);
    await expect.element(page.getByRole('option', { name: 'launches' })).toHaveAttribute('aria-selected', 'true');
  });

  it("disabled inputs, chevrons and chip removers can't be used", async () => {
    const screen = await render(
      <>
        <Fruit disabled />
        <Combobox items={channels} multiple defaultValue={['launches']} disabled>
          <ComboboxChips>
            <ComboboxValue>
              {(values: string[]) => values.map(value => <ComboboxChip key={value}>{value}</ComboboxChip>)}
            </ComboboxValue>
            <ComboboxChipsInput aria-label="Locked channels" />
          </ComboboxChips>
        </Combobox>
      </>,
    );
    await expect.element(screen.getByRole('combobox', { name: 'Choose a fruit' })).toBeDisabled();
    await expect.element(screen.getByRole('button', { name: 'Show options' })).toBeDisabled();
    await expect.element(screen.getByRole('combobox', { name: 'Locked channels' })).toBeDisabled();
    await expect.element(screen.getByRole('button', { name: 'Remove launches' })).toBeDisabled();
  });

  it('a trigger picker keeps its search field inside the list', async () => {
    const screen = await render(
      <Combobox items={zones} defaultValue="Asia/Kolkata">
        <ComboboxTrigger render={<Button variant="outline" />} aria-label="Digest time zone">
          <ComboboxValue />
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxInput aria-label="Search time zones" placeholder="Search" showTrigger={false} />
          <ComboboxEmpty>No time zone found.</ComboboxEmpty>
          <Items />
        </ComboboxContent>
      </Combobox>,
    );
    const trigger = screen.getByRole('combobox', { name: 'Digest time zone' });
    await expect.element(trigger).toHaveTextContent('Asia/Kolkata');
    await trigger.click();
    const search = page.getByRole('combobox', { name: 'Search time zones' });
    await expect.element(search).toBeVisible();
    await expect.element(search).toHaveFocus();
    expect(getComputedStyle(search.element().parentElement!).height).toBe('32px');
    await userEvent.keyboard('tok');
    await expect.poll(options).toEqual(['Asia/Tokyo']);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect.poll(popup).toBeNull();
    await expect.element(trigger).toHaveTextContent('Asia/Tokyo');
  });

  it('groups show labels and separators and filter inside each group', async () => {
    const screen = await render(
      <Combobox items={regions}>
        <ComboboxInput aria-label="Office time zone" />
        <ComboboxContent>
          <ComboboxEmpty>No time zone found.</ComboboxEmpty>
          <ComboboxList>
            {(region: (typeof regions)[number], index: number) => (
              <ComboboxGroup key={region.value} items={region.items}>
                {index > 0 && <ComboboxSeparator />}
                <ComboboxLabel>{region.value}</ComboboxLabel>
                <ComboboxCollection>
                  {(zone: string) => (
                    <ComboboxItem key={zone} value={zone}>
                      {zone}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    const labels = () => [...popup()!.querySelectorAll('[data-slot="combobox-label"]')].map(label => label.textContent);
    const input = screen.getByRole('combobox');
    await input.click();
    await expect.poll(labels).toEqual(['Americas', 'Europe', 'Asia']);
    expect(popup()!.querySelectorAll('[data-slot="combobox-separator"]')).toHaveLength(2);
    const separator = popup()!.querySelector('[data-slot="combobox-separator"]')!;
    await settle();
    expect(separator.getBoundingClientRect().height).toBeCloseTo(1, 1);
    await userEvent.fill(input, 'berlin');
    await expect.poll(options).toEqual(['Europe/Berlin']);
    expect(labels()).toEqual(['Europe']);
    await userEvent.fill(input, 'nowhere');
    await expect.element(page.getByRole('status')).toHaveTextContent('No time zone found.');
  });

  it('disabled items are dimmed and unpickable', async () => {
    const screen = await render(
      <Combobox items={['Leads', 'Renewals']}>
        <ComboboxInput aria-label="Sync into" />
        <ComboboxContent>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item} disabled={item === 'Renewals'}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    const input = screen.getByRole('combobox');
    await input.click();
    const renewals = page.getByRole('option', { name: 'Renewals' });
    await expect.element(renewals).toHaveAttribute('aria-disabled', 'true');
    expect(getComputedStyle(renewals.element()).opacity).toBe('0.5');
    await renewals.click({ force: true });
    await expect.element(input).toHaveValue('');
    await page.getByRole('option', { name: 'Leads' }).click();
    await expect.element(input).toHaveValue('Leads');
  });

  for (const mode of ['light', 'dark'] as const)
    it(`${mode} popup paints the surface, fades, and reduced motion drops the fade`, async () => {
      setTheme('neutral', mode);
      const screen = await render(<Fruit />);
      await screen.getByRole('combobox').click();
      await expect.poll(popup).not.toBeNull();
      const surface = getComputedStyle(popup()!);
      expect(surface.backgroundColor).toBe(mode === 'dark' ? 'rgb(29, 29, 29)' : 'rgb(253, 253, 253)');
      expect(surface.transitionDuration).toMatch(/0\.12s/);
      await settle();
      expect(surface.opacity).toBe('1');
      await emulate({ reducedMotion: true });
      expect(getComputedStyle(popup()!).transitionDuration).toBe('0s');
    });

  it('keyboard focus rings the input group and the chips field', async () => {
    const screen = await render(
      <>
        <Fruit />
        <Channels />
      </>,
    );
    await userEvent.tab();
    const group = screen.container.querySelector('[data-slot="input-group"]')!;
    expect(getComputedStyle(group).outlineStyle).toBe('solid');
    expect(getComputedStyle(group).outlineWidth).toBe('1px');
    (screen.getByRole('combobox', { name: 'Channels' }).element() as HTMLElement).focus();
    const chips = screen.container.querySelector('[data-slot="combobox-chips"]')!;
    await expect.poll(() => getComputedStyle(chips).outlineStyle).toBe('solid');
  });

  it.each(themes)('%s %s passes axe closed and open', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(
      <div style={{ display: 'grid', gap: 8, width: 360 }}>
        <Fruit />
        <Channels anchored />
      </div>,
    );
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
    await screen.getByRole('combobox', { name: 'Choose a fruit' }).click();
    await expect.poll(popup).not.toBeNull();
    await settle();
    expect(await axeViolations(popup()!)).toEqual([]);
  });
});
