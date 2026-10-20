import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';
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
import { axeViolations, emulate, setTheme, settle, size } from './support.js';

const durations = ['15 minutes', '30 minutes', '1 hour', '2 hours'];
const repeats = ['Does not repeat', 'Every day', 'Weekdays', 'Every week'];

function Choice({
  label,
  items,
  value,
  ...trigger
}: {
  label: string;
  items: string[];
  value?: string;
} & Parameters<typeof SelectTrigger>[0]) {
  return (
    <Select defaultValue={value ?? items[0]}>
      <SelectTrigger aria-label={label} {...trigger}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map(item => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const listbox = () => page.getByRole('listbox');
const content = () => document.querySelector<HTMLElement>('[data-slot="select-content"][data-open]')!;

/** True when every child of `node` stays inside its left and right edges. */
function fitsSideways(node: Element) {
  const box = node.getBoundingClientRect();
  return [...node.querySelectorAll('*')].every(child => {
    const rect = child.getBoundingClientRect();
    return !rect.width || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
  });
}

function insideViewport(node: Element) {
  const box = node.getBoundingClientRect();
  return box.left >= 0 && box.top >= 0 && box.right <= innerWidth + 0.5 && box.bottom <= innerHeight + 0.5;
}

describe('Select in a real browser', () => {
  it('keyboard opens, moves, typeaheads, commits, escapes and returns focus', async () => {
    const screen = await render(
      <>
        <Choice label="Duration" items={durations} value="30 minutes" />
        <Choice label="Repeat" items={repeats} />
      </>,
    );
    const duration = screen.getByRole('combobox', { name: 'Duration' });
    (duration.element() as HTMLElement).focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(listbox()).toBeVisible();
    await expect.element(page.getByRole('option', { name: '30 minutes' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(page.getByRole('option', { name: '1 hour' })).toHaveAttribute('data-highlighted', '');
    await userEvent.keyboard('{Enter}');
    await expect.element(listbox()).not.toBeInTheDocument();
    await expect.element(duration).toHaveTextContent('1 hour');
    await expect.element(duration).toHaveFocus();

    const repeat = screen.getByRole('combobox', { name: 'Repeat' });
    (repeat.element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(listbox()).toBeVisible();
    await userEvent.keyboard('w');
    await expect.element(page.getByRole('option', { name: 'Weekdays' })).toHaveAttribute('data-highlighted', '');
    await userEvent.keyboard('{End}');
    await expect.element(page.getByRole('option', { name: 'Every week' })).toHaveAttribute('data-highlighted', '');
    await userEvent.keyboard('{Escape}');
    await expect.element(listbox()).not.toBeInTheDocument();
    await expect.element(repeat).toHaveTextContent('Does not repeat');
    await expect.element(repeat).toHaveFocus();
  });

  it('sizes and widths render at Cloud dimensions without overflow', async () => {
    const screen = await render(
      <div style={{ width: 400, display: 'grid', gap: 8 }}>
        <Choice label="Team" items={['Platform engineering']} width="full" />
        <Choice label="Role" items={['Can view']} />
        <Choice label="Rows" items={['25', '100']} size="sm" />
        <Choice label="View" items={['Week']} size="calendar" />
        <Choice label="Proposal" size="sm" items={['Post the launch summary in #launches and tag the owners']} />
      </div>,
    );
    const el = (name: string) => screen.getByRole('combobox', { name }).element();
    expect(size(el('Team'))[1]).toBe(32);
    expect(size(el('Team'))[0]).toBe(400);
    expect(size(el('Role'))[1]).toBe(32);
    expect(size(el('Role'))[0]).toBeLessThan(160);
    expect(size(el('Rows'))[1]).toBe(28);
    expect(getComputedStyle(el('Rows')).fontSize).toBe('12px');
    expect(size(el('View'))[1]).toBe(32);
    expect(getComputedStyle(el('View')).fontSize).toBe('12px');
    for (const name of ['Team', 'Role', 'Rows', 'View', 'Proposal']) expect(fitsSideways(el(name)), name).toBe(true);
  });

  it('groups, separators and disabled items render and stay unpickable', async () => {
    const screen = await render(
      <Select defaultValue="Weekly">
        <SelectTrigger aria-label="Digest">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Cadence</SelectLabel>
            <SelectItem value="Daily">Daily</SelectItem>
            <SelectItem value="Weekly">Weekly</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectItem value="monthly" disabled>
            Monthly (unavailable)
          </SelectItem>
        </SelectContent>
      </Select>,
    );
    await screen.getByRole('combobox', { name: 'Digest' }).click();
    await expect.element(page.getByRole('group', { name: 'Cadence' })).toBeVisible();
    const monthly = page.getByRole('option', { name: 'Monthly (unavailable)' });
    await expect.element(monthly).toHaveAttribute('aria-disabled', 'true');
    expect(getComputedStyle(monthly.element()).opacity).toBe('0.5');
    await monthly.click({ force: true });
    await expect.element(listbox()).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(screen.getByRole('combobox', { name: 'Digest' })).toHaveTextContent('Weekly');
  });

  it('invalid triggers use the danger border', async () => {
    const screen = await render(<Choice label="Source" items={['Engineering']} aria-invalid="true" />);
    const probe = document.createElement('div');
    probe.style.color = 'var(--sprout-danger)';
    document.body.append(probe);
    const danger = getComputedStyle(probe).color;
    probe.remove();
    expect(getComputedStyle(screen.getByRole('combobox').element()).borderTopColor).toBe(danger);
  });

  it('a long list scrolls and stays inside a short viewport', async () => {
    await page.viewport(1280, 520);
    const zones = Array.from({ length: 60 }, (_, i) => `Zone ${i + 1}`);
    const screen = await render(<Choice label="Time zone" items={zones} />);
    await screen.getByRole('combobox').click();
    await settle();
    expect(insideViewport(content())).toBe(true);
    const list = content().querySelector('.sprout-select-list') ?? content();
    expect(list.scrollHeight > list.clientHeight || content().scrollHeight > content().clientHeight).toBe(true);
    await userEvent.keyboard('{End}');
    await expect.element(page.getByRole('option', { name: 'Zone 60' })).toBeInViewport();
  });

  for (const mode of ['light', 'dark'] as const)
    it(`${mode} mode paints the surface, passes axe, and fades the popup`, async () => {
      setTheme('neutral', mode);
      const screen = await render(<Choice label="Duration" items={durations} />);
      const trigger = screen.getByRole('combobox');
      const surface = mode === 'dark' ? 'rgb(29, 29, 29)' : 'rgb(253, 253, 253)';
      expect(getComputedStyle(trigger.element()).backgroundColor).toBe(surface);
      await trigger.click();
      await settle();
      const popup = getComputedStyle(content());
      expect(popup.backgroundColor).toBe(surface);
      expect(popup.opacity).toBe('1');
      expect(popup.transitionDuration).toBe('0.12s, 0.12s');
      expect(await axeViolations()).toEqual([]);
    });

  it('reduced motion removes the popup transition', async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Choice label="Duration" items={durations} />);
    await screen.getByRole('combobox').click();
    expect(getComputedStyle(content()).transitionDuration).toBe('0s');
  });

  it('keyboard focus shows a 1px solid ring', async () => {
    const screen = await render(<Choice label="Calendar" items={['Work']} />);
    await userEvent.tab();
    const trigger = screen.getByRole('combobox').element();
    expect(document.activeElement).toBe(trigger);
    expect(getComputedStyle(trigger).outlineStyle).toBe('solid');
    expect(getComputedStyle(trigger).outlineWidth).toBe('1px');
  });
});
