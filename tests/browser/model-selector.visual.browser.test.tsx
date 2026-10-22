import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ModelSelector, type ModelSelectorModel } from '../../packages/sprout/src/components/model-selector.js';
import { emulate, setTheme, settle, themes } from './support.js';

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
  { id: 'grok', label: 'Grok 5', brand: 'grok', description: 'Live search', speed: 110, quality: 85, cost: 6 },
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

it.each(themes)('model-selector %s %s', async (theme, mode) => {
  await page.viewport(800, 640);
  await emulate({ reducedMotion: true });
  setTheme(theme, mode);
  const screen = await render(
    <div style={{ padding: 16 }}>
      <ModelSelector models={models} value="opus" onValueChange={() => {}} />
    </div>,
  );
  await screen.getByRole('combobox', { name: /^Model:/ }).click();
  await expect.element(page.getByRole('listbox')).toBeVisible();
  await settle();
  const popup = document.querySelector('[data-slot="model-selector-content"]')!;
  await expect.element(popup).toMatchScreenshot(`model-selector-${theme}-${mode}`);
});
