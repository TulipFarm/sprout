import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ModelSelector, type ModelSelectorModel } from '../../packages/sprout/src/components/model-selector.js';
import { axeViolations, setTheme, settle, themes } from './support.js';

const models: ModelSelectorModel[] = [
  {
    id: 'opus',
    label: 'Claude Opus 5.5',
    brand: 'claude',
    description: 'Hardest problems',
    speed: 40,
    quality: 95,
    cost: 25,
  },
  {
    id: 'gpt',
    label: 'GPT-5.5',
    brand: 'openai',
    description: 'Writing and analysis',
    speed: 80,
    quality: 92,
    cost: 12,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek V4',
    brand: 'deepseek',
    description: 'Cheap and capable',
    speed: 70,
    quality: 80,
    cost: 1,
  },
];

function Picker() {
  const [value, setValue] = useState('opus');
  return (
    <div style={{ padding: 48 }}>
      <ModelSelector models={models} value={value} onValueChange={setValue} />
      <p role="status">Using {value}</p>
    </div>
  );
}

describe('ModelSelector', () => {
  it('opens a listbox of models and picks one by pointer', async () => {
    const screen = await render(<Picker />);
    await screen.getByRole('combobox', { name: 'Model: Claude Opus 5.5' }).click();
    await expect.element(page.getByRole('listbox')).toBeVisible();
    await expect.element(page.getByText('Speed', { exact: true })).toBeVisible();
    await page.getByRole('option', { name: /DeepSeek V4/ }).click();
    await expect.element(screen.getByRole('status')).toHaveTextContent('Using deepseek');
    await expect.element(screen.getByRole('combobox', { name: 'Model: DeepSeek V4' })).toBeVisible();
  });

  it('works from the keyboard and returns focus', async () => {
    const screen = await render(<Picker />);
    const trigger = screen.getByRole('combobox', { name: /^Model:/ });
    (trigger.element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(page.getByRole('listbox')).toBeVisible();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect.element(screen.getByRole('status')).not.toHaveTextContent('Using opus');
    await expect.poll(() => document.activeElement).toBe(trigger.element());
  });

  it('focuses the search and picks the first match with Enter', async () => {
    const screen = await render(<Picker />);
    await screen.getByRole('combobox', { name: /^Model:/ }).click();
    await expect.element(page.getByRole('combobox', { name: 'Search models' })).toHaveFocus();
    await userEvent.keyboard('deeps');
    await expect.poll(() => document.querySelectorAll('[role="option"]').length).toBe(1);
    await userEvent.keyboard('{Enter}');
    await expect.element(screen.getByRole('status')).toHaveTextContent('Using deepseek');
  });

  it('closes on Escape without changing the model', async () => {
    const screen = await render(<Picker />);
    await screen.getByRole('combobox', { name: /^Model:/ }).click();
    await expect.element(page.getByRole('listbox')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByRole('listbox')).not.toBeInTheDocument();
    await expect.element(screen.getByRole('status')).toHaveTextContent('Using opus');
  });

  it('explains each column heading in a tooltip', async () => {
    const screen = await render(<Picker />);
    await screen.getByRole('combobox', { name: /^Model:/ }).click();
    await expect.element(page.getByRole('listbox')).toBeVisible();
    await userEvent.hover(page.getByText('Speed', { exact: true }));
    const tip = page.getByText('How quickly it answers.', { exact: false });
    await expect.element(tip).toBeVisible();
    await expect.element(page.getByText('Slowest')).toBeVisible();
    await expect.element(page.getByText('Fastest')).toBeVisible();
    await expect.element(page.getByRole('combobox', { name: 'Search models' })).toHaveFocus();
    await userEvent.hover(page.getByText('Cost', { exact: true }));
    await expect.element(page.getByText('Priciest')).toBeVisible();
  });

  it('fills the meters of the selected row', async () => {
    const screen = await render(<Picker />);
    await screen.getByRole('combobox', { name: /^Model:/ }).click();
    await settle();
    const filled = document.querySelectorAll('[data-selected] .sprout-model-selector-segment[data-on="true"]');
    expect(filled.length).toBeGreaterThan(0);
  });

  it.each(themes)('has no axe violations open in %s %s', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Picker />);
    await screen.getByRole('combobox', { name: /^Model:/ }).click();
    await expect.element(page.getByRole('listbox')).toBeVisible();
    await settle();
    expect(await axeViolations()).toEqual([]);
  });
});
