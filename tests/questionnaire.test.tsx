import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
  questionnaireItemStatusNames,
  questionnaireShortcutModeNames,
  type QuestionnaireItemDefinition,
} from '../packages/sprout/src/components/questionnaire.js';
import * as sprout from '../packages/sprout/src/index.js';

const root = new URL('../packages/sprout/', import.meta.url);

const items: QuestionnaireItemDefinition[] = [
  {
    name: 'style',
    required: true,
    choices: [{ value: 'short' }, { value: 'detailed' }],
  },
  {
    name: 'plants',
    choices: [{ value: 'tulips' }, { value: 'daisies' }, { value: 'ferns', disabled: true }, { value: 'roses' }],
  },
  { name: 'note' },
];

function Sample({
  shortcuts,
  size,
  defaultItem,
}: {
  shortcuts?: 'letters' | 'numbers';
  size?: 'sm' | 'default';
  defaultItem?: string;
}) {
  return (
    <Questionnaire items={items} shortcuts={shortcuts} defaultItem={defaultItem}>
      <QuestionnaireProgress />
      <QuestionnaireItem name="style" required>
        <QuestionnaireTitle>How should answers look?</QuestionnaireTitle>
        <QuestionnaireDescription>Pick one reply style.</QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="short">
            Short answers
            <QuestionnaireChoiceDescription>A quick summary.</QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
          <QuestionnaireChoice value="detailed">Detailed answers</QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <QuestionnaireItem name="plants" multiple>
        <QuestionnaireTitle>Which plants?</QuestionnaireTitle>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="tulips">Tulips</QuestionnaireChoice>
          <QuestionnaireChoice value="daisies">Daisies</QuestionnaireChoice>
          <QuestionnaireChoice value="ferns" disabled>
            Ferns
          </QuestionnaireChoice>
          <QuestionnaireChoice value="roses">Roses</QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <QuestionnaireItem name="note">
        <QuestionnaireTitle>Anything else?</QuestionnaireTitle>
        <QuestionnaireInput aria-label="Additional note" placeholder="Add a note" />
      </QuestionnaireItem>
      <QuestionnaireActions>
        <QuestionnairePrevious size={size} />
        <QuestionnaireSkip size={size} variant={size === 'sm' ? 'ghost' : undefined} />
        <QuestionnaireNext size={size} />
        <QuestionnaireSubmit size={size}>Save setup</QuestionnaireSubmit>
      </QuestionnaireActions>
    </Questionnaire>
  );
}

function button(html: string, slot: string) {
  return html.match(new RegExp(`<button[^>]*data-slot="questionnaire-${slot}"[^>]*>`))?.[0] ?? '';
}

describe('Questionnaire', () => {
  it('is exported from the package root and a subpath', () => {
    expect(sprout.Questionnaire).toBe(Questionnaire);
    expect(sprout.QuestionnaireSubmit).toBe(QuestionnaireSubmit);
    expect(questionnaireItemStatusNames).toEqual(['unanswered', 'answered', 'skipped']);
    expect(questionnaireShortcutModeNames).toEqual(['letters', 'numbers']);
    const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
    expect(manifest.exports['./questionnaire']).toBeDefined();
    expect(readFileSync(new URL('src/styles/index.css', root), 'utf8')).toContain("@import './questionnaire.css';");
  });

  it('renders a form with progress and only the first item shown', () => {
    const html = renderToString(<Sample />);
    expect(html).toMatch(/<form[^>]*data-slot="questionnaire"/);
    expect(html).toMatch(/<form[^>]*novalidate=""/i);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('>Question 1 of 3<');
    const fieldsets = html.match(/<fieldset[^>]*>/g) ?? [];
    expect(fieldsets).toHaveLength(3);
    expect(fieldsets[0]).not.toContain('hidden');
    expect(fieldsets[0]).toContain('data-active');
    expect(fieldsets[0]).toContain('data-required');
    expect(fieldsets[1]).toContain('hidden');
    expect(fieldsets[1]).toContain('data-multiple');
    expect(fieldsets[2]).toContain('hidden');
  });

  it('uses radios for single items and checkboxes for multiple items', () => {
    const html = renderToString(<Sample />);
    const inputs = html.match(/<input[^>]*data-slot="questionnaire-choice-input"[^>]*>/g) ?? [];
    expect(inputs).toHaveLength(6);
    expect(inputs.slice(0, 2).every(input => input.includes('type="radio"'))).toBe(true);
    expect(inputs.slice(2).every(input => input.includes('type="checkbox"'))).toBe(true);
    expect(html).toContain('data-slot="questionnaire-choice-description"');
    expect(html).toMatch(/<input[^>]*aria-label="Additional note"[^>]*placeholder="Add a note"/);
    expect(html).toContain('sprout-input');
  });

  it('keeps errors hidden until an answer is attempted', () => {
    const html = renderToString(<Sample />);
    const errors = html.match(/<[a-z]+[^>]*data-slot="questionnaire-error"[^>]*>[^<]*/g) ?? [];
    expect(errors).toHaveLength(2);
    expect(errors.every(error => error.includes('hidden'))).toBe(true);
    expect(errors[0]).toContain('Choose an answer to continue.');
    expect(errors[1]).toContain('Choose an answer or skip this question.');
  });

  it('shows only the buttons that apply to the active step', () => {
    const firstStep = renderToString(<Sample />);
    expect(button(firstStep, 'previous')).toContain('hidden');
    expect(button(firstStep, 'skip')).toContain('hidden');
    expect(button(firstStep, 'next')).not.toContain('hidden');
    expect(button(firstStep, 'next')).toContain('aria-keyshortcuts="Enter"');
    expect(button(firstStep, 'submit')).toContain('hidden');

    const lastStep = renderToString(<Sample defaultItem="note" />);
    expect(button(lastStep, 'previous')).not.toContain('hidden');
    expect(button(lastStep, 'skip')).not.toContain('hidden');
    expect(button(lastStep, 'next')).toContain('hidden');
    expect(button(lastStep, 'submit')).not.toContain('hidden');
    expect(button(lastStep, 'submit')).toContain('type="submit"');
    expect(lastStep).toContain('Save setup');
    expect(lastStep).toContain('>Question 3 of 3<');
  });

  it('styles actions with Button variants and sizes', () => {
    const html = renderToString(<Sample defaultItem="plants" />);
    expect(button(html, 'previous')).toContain('sprout-button-variant-outline');
    expect(button(html, 'skip')).toContain('sprout-button-variant-outline');
    expect(button(html, 'next')).toContain('sprout-button-variant-default');
    expect(button(html, 'next')).toContain('sprout-button-size-md');

    const small = renderToString(<Sample defaultItem="plants" size="sm" />);
    expect(button(small, 'skip')).toContain('sprout-button-variant-ghost');
    expect(button(small, 'next')).toContain('sprout-button-size-sm');
    expect(button(small, 'next')).toContain('sprout-questionnaire-action');
  });

  it('labels choices with letter or number shortcuts in item order', () => {
    const letters = renderToString(<Sample shortcuts="letters" />);
    const letterKeys = [...letters.matchAll(/data-slot="questionnaire-choice-shortcut"[^>]*>([^<]*)</g)].map(m => m[1]);
    expect(letterKeys).toEqual(['A', 'B', 'A', 'B', 'C']);

    const numbers = renderToString(<Sample shortcuts="numbers" />);
    const numberKeys = [...numbers.matchAll(/data-slot="questionnaire-choice-shortcut"[^>]*>([^<]*)</g)].map(m => m[1]);
    expect(numberKeys).toEqual(['1', '2', '1', '2', '3']);

    const none = renderToString(<Sample />);
    expect(none).not.toContain('data-slot="questionnaire-choice-shortcut"');
  });
});
