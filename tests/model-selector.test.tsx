import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as sprout from '../packages/sprout/src/index.js';
import {
  ModelSelector,
  modelSelectorMetricNames,
  rateModels,
  type ModelSelectorModel,
} from '../packages/sprout/src/components/model-selector.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

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
  { id: 'haiku', label: 'Claude Haiku 5.5', brand: 'claude', speed: 200, quality: 60, cost: 1 },
  { id: 'mid', label: 'Middle', speed: 120, quality: 77.5, cost: 13 },
  { id: 'custom', label: 'Custom', icon: <svg data-testid="custom" /> },
];

const render = (props: Partial<Parameters<typeof ModelSelector>[0]> = {}) =>
  renderToString(<ModelSelector models={models} value="opus" onValueChange={() => {}} {...props} />);

describe('rateModels', () => {
  it('rates 1 to 5 against the min and max of the list', () => {
    const ratings = rateModels(models);
    expect(ratings.get('opus')).toEqual({ speed: 1, quality: 5, cost: 5 });
    expect(ratings.get('haiku')).toEqual({ speed: 5, quality: 1, cost: 1 });
    expect(ratings.get('mid')).toEqual({ speed: 3, quality: 3, cost: 3 });
    expect(ratings.get('custom')).toEqual({ speed: null, quality: null, cost: null });
  });

  it('gives 3 when every model ties and null when a number is missing or invalid', () => {
    const ratings = rateModels([
      { id: 'a', label: 'A', speed: 10, cost: Number.NaN },
      { id: 'b', label: 'B', speed: 10 },
    ]);
    expect(ratings.get('a')).toEqual({ speed: 3, quality: null, cost: null });
    expect(ratings.get('b')).toEqual({ speed: 3, quality: null, cost: null });
  });

  it('lists the metrics in column order', () => {
    expect(modelSelectorMetricNames).toEqual(['speed', 'quality', 'cost']);
  });
});

describe('ModelSelector', () => {
  it('is exported from the package root', () => {
    expect(sprout.ModelSelector).toBe(ModelSelector);
    expect(sprout.rateModels).toBe(rateModels);
  });

  it('renders the trigger with logo, name and accessible label', () => {
    const html = render();
    expect(html).toContain('data-slot="model-selector"');
    expect(html).toContain('aria-label="Model: Claude Opus 5.5"');
    expect(html).toContain('data-slot="model-selector-mark"');
    expect(html).toContain('Claude Opus 5.5');
    expect(html).not.toContain('$');
  });

  it('falls back to the label when nothing matches and disables an empty list', () => {
    const html = render({ value: 'missing', label: 'Engine' });
    expect(html).toContain('aria-label="Engine: None"');
    expect(html).toContain('data-empty="true"');
    expect(html).not.toContain('data-slot="model-selector-mark"');
    expect(render({ models: [] })).toMatch(/disabled/);
  });

  it('shows a letter when a model has no logo or icon', () => {
    const html = render({ models: [{ id: 's', label: ' sonnet' }], value: 's' });
    expect(html).toContain('sprout-model-selector-letter');
    expect(html).toMatch(/>S</);
  });

  it('shows a custom icon', () => {
    expect(render({ value: 'custom' })).toContain('data-testid="custom"');
  });

  it('ships its stylesheet and package export', () => {
    expect(read('../packages/sprout/src/styles/index.css')).toContain("@import './model-selector.css';");
    const css = read('../packages/sprout/src/styles/model-selector.css');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('forced-colors');
    expect(JSON.parse(read('../packages/sprout/package.json')).exports['./model-selector']).toBeDefined();
  });
});
