// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ModelSelector, type ModelSelectorModel } from '../packages/sprout/src/components/model-selector.js';

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
  { id: 'haiku', label: 'Claude Haiku 5.5', brand: 'claude', speed: 200, quality: 60 },
  { id: 'off', label: 'Retired', disabled: true, speed: 10, quality: 10, cost: 1 },
  { id: 'gpt', label: 'GPT-5.5', brand: 'openai', description: 'Writing and analysis' },
];

function Picker({ list = models }: { list?: ModelSelectorModel[] }) {
  const [value, setValue] = useState('opus');
  return <ModelSelector models={list} value={value} onValueChange={setValue} />;
}

async function open() {
  const trigger = screen.getByRole('combobox');
  await act(async () => {
    fireEvent.click(trigger);
  });
  return screen.findByRole('listbox');
}

describe('ModelSelector (dom)', () => {
  it('lists models with meters and unknowns, then picks one', async () => {
    render(<Picker />);
    const list = await open();
    expect(document.querySelector('[data-metered="true"]')).not.toBeNull();
    expect(within(list).getAllByRole('option')).toHaveLength(4);
    expect(list.textContent).toContain('Speed 1 of 5, slowest.');
    expect(list.textContent).toContain('Cost unknown.');
    expect(list.textContent).toContain('Quality unknown.');
    expect(list.textContent).toContain('Hardest problems');
    const haiku = within(list).getByRole('option', { name: /Claude Haiku 5\.5/ });
    await act(async () => {
      fireEvent.pointerDown(haiku, { pointerType: 'mouse' });
      fireEvent.mouseDown(haiku);
      fireEvent.pointerUp(haiku, { pointerType: 'mouse' });
      fireEvent.mouseUp(haiku);
      fireEvent.click(haiku);
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    expect(screen.getByRole('combobox').getAttribute('aria-label')).toBe('Model: Claude Haiku 5.5');
  });

  it('drops the meters when no model has numbers', async () => {
    render(
      <Picker
        list={[
          { id: 'opus', label: 'Opus' },
          { id: 'b', label: 'Bravo' },
        ]}
      />,
    );
    const list = await open();
    expect(document.querySelector('[data-metered="false"]')).not.toBeNull();
    expect(list.querySelector('[data-slot="model-selector-meter"]')).toBeNull();
  });

  it('filters by name, description, or vendor and says when nothing matches', async () => {
    render(<Picker />);
    await open();
    const search = screen.getByRole('combobox', { name: 'Search models' });
    const type = async (text: string) => {
      await act(async () => {
        fireEvent.change(search, { target: { value: text } });
      });
    };
    await type('openai');
    expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual([
      expect.stringContaining('GPT-5.5'),
    ]);
    await type('hardest');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await type('haiku');
    expect(screen.getByRole('option').textContent).toContain('Claude Haiku 5.5');
    await type('zzz');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('No model found.')).toBeTruthy();
    await type('  ');
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });
});
