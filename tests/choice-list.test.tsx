import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { ChoiceList, ChoiceSummary, choiceListLayoutNames } from '../packages/sprout/src/components/choice-list.js';
import * as sprout from '../packages/sprout/src/index.js';

const root = new URL('../packages/sprout/', import.meta.url);
const options = [
  { id: 'short', label: 'Short answers (Recommended)' },
  { id: 'detailed', label: 'Detailed answers' },
];
const noop = () => {};

describe('ChoiceList', () => {
  it('renders a stacked radio fieldset with a visible legend by default', () => {
    const html = renderToString(
      <ChoiceList legend="Reply style" options={options} value={['detailed']} onChange={noop} />,
    );
    expect(html).toMatch(/^<fieldset data-slot="choice-list" data-layout="stacked" class="sprout-choice-list">/);
    expect(html).toContain('<legend class="sprout-choice-list-legend">Reply style</legend>');
    expect(html.match(/type="radio"/g)).toHaveLength(2);
    expect(html).toMatch(/data-checked="true"[^>]*><input type="radio"[^>]*checked="" value="detailed"/);
    expect(html).not.toContain('aria-invalid');
    expect(choiceListLayoutNames).toEqual(['stacked', 'compact']);
  });

  it('strips a (Recommended) suffix into an info badge, or reads the recommended flag', () => {
    const html = renderToString(
      <ChoiceList
        legend="Reply style"
        options={[...options, { id: 'custom', label: 'Custom', recommended: true }]}
        value={[]}
        onChange={noop}
      />,
    );
    expect(html).toContain('Short answers<span');
    expect(html).not.toContain('(Recommended)');
    expect(html.match(/sprout-badge-info/g)).toHaveLength(2);
    expect(html.match(/data-recommended="true"/g)).toHaveLength(2);
  });

  it('uses checkboxes for multiple and keeps the legend visible in compact', () => {
    const html = renderToString(
      <ChoiceList
        layout="compact"
        multiple
        legend="Choose one or more answers"
        options={options}
        value={['short']}
        onChange={noop}
      />,
    );
    expect(html).toContain('data-layout="compact" data-multiple="true"');
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(html).toContain('<legend class="sprout-choice-list-legend">');
  });

  it('numbers compact rows and hides a single-answer legend visually', () => {
    const html = renderToString(
      <ChoiceList layout="compact" legend="Choose one answer" options={options} value={[]} onChange={noop} />,
    );
    expect(html).toContain('<legend class="sprout-choice-list-sr-only">Choose one answer</legend>');
    expect(html).toContain('class="sprout-choice-list-mark">1</span>');
    expect(html).toContain('class="sprout-choice-list-mark">2</span>');
  });

  it('links an error to every input and disables the fieldset', () => {
    const html = renderToString(
      <ChoiceList
        legend="Reply style"
        options={options}
        value={['short']}
        onChange={noop}
        disabled
        error="Choose a reply style."
      />,
    );
    expect(html).toContain('disabled=""');
    expect(html.match(/aria-invalid="true"/g)).toHaveLength(2);
    const id = html.match(/aria-describedby="([^"]+)"/)![1];
    expect(html).toContain(`<p id="${id}" class="sprout-choice-list-error">Choose a reply style.</p>`);
    expect(html.match(/data-disabled="true"/g)).toHaveLength(2);
  });

  it('always shows a stacked typed answer, and a compact one only while active', () => {
    const textOption = {
      value: '',
      active: false,
      onChange: noop,
      onFocus: noop,
      error: null,
    };
    const stacked = renderToString(
      <ChoiceList legend="Reply style" options={options} value={[]} onChange={noop} textOption={textOption} />,
    );
    expect(stacked).toContain('data-slot="choice-list-text"');
    expect(stacked).toContain('>Your answer</label>');
    expect(stacked).toContain('placeholder="Type a different answer…"');
    expect(stacked).not.toContain('autofocus');
    const hidden = renderToString(
      <ChoiceList
        layout="compact"
        legend="Choose one answer"
        options={options}
        value={[]}
        onChange={noop}
        textOption={{ ...textOption, id: 'custom' }}
      />,
    );
    expect(hidden).not.toContain('choice-list-text');
    const active = renderToString(
      <ChoiceList
        layout="compact"
        legend="Choose one answer"
        options={options}
        value={[]}
        onChange={noop}
        textOption={{
          ...textOption,
          id: 'custom',
          active: true,
          error: 'Enter your answer.',
        }}
      />,
    );
    expect(active).toContain('id="custom" data-slot="choice-list-text" data-checked="true" data-invalid="true"');
    expect(active).toContain('role="alert"');
    expect(active).toMatch(/<textarea[^>]*aria-invalid="true"/);
  });
});

describe('ChoiceSummary', () => {
  it('shows a prompt and the recorded answer', () => {
    const html = renderToString(<ChoiceSummary prompt="Reply style" answer="Short answers" />);
    expect(html).toMatch(/^<div data-slot="choice-summary" class="sprout-choice-summary">/);
    expect(html).toContain('<span class="sprout-choice-summary-prompt">Reply style</span>');
    expect(html).toContain('<span class="sprout-choice-summary-answer-text">Short answers</span>');
  });

  it('omits the answer chip when there is no answer and renders children', () => {
    const html = renderToString(
      <ChoiceSummary prompt="Should I archive the docs?" className="mt-2">
        <em>Expired</em>
      </ChoiceSummary>,
    );
    expect(html).not.toContain('sprout-choice-summary-answer');
    expect(html).toContain('class="sprout-choice-summary mt-2"');
    expect(html).toContain('<em>Expired</em>');
  });
});

describe('Choice List packaging', () => {
  it('is exported from the root, a subpath, and the CSS entry', () => {
    expect(sprout.ChoiceList).toBe(ChoiceList);
    expect(sprout.ChoiceSummary).toBe(ChoiceSummary);
    const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
    expect(manifest.exports['./choice-list']).toEqual({
      types: './dist/components/choice-list.d.ts',
      import: './dist/components/choice-list.js',
    });
    expect(readFileSync(new URL('src/styles/index.css', root), 'utf8')).toContain("@import './choice-list.css';");
    const css = readFileSync(new URL('src/styles/choice-list.css', root), 'utf8');
    expect(css).toContain('prefers-reduced-motion: no-preference');
    expect(css).toContain('var(--sprout-primary-subtle)');
  });
});
