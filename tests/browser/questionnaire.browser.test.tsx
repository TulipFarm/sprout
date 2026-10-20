import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
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
  type QuestionnaireProps,
} from '../../packages/sprout/src/components/questionnaire.js';
import type { ButtonSize } from '../../packages/sprout/src/components/button.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

function Survey({
  size,
  defaultItem,
  invalid = false,
  ...props
}: Partial<QuestionnaireProps> & { size?: ButtonSize; invalid?: boolean }) {
  return (
    <Questionnaire shortcuts="letters" defaultItem={defaultItem} onSubmit={event => event.preventDefault()} {...props}>
      <QuestionnaireProgress />
      <QuestionnaireItem name="style" required invalid={invalid}>
        <QuestionnaireTitle>How should replies read?</QuestionnaireTitle>
        <QuestionnaireDescription>Pick one.</QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="short">Short answers</QuestionnaireChoice>
          <QuestionnaireChoice value="detailed" defaultChecked>
            Detailed answers with sources and a summary of the steps taken
          </QuestionnaireChoice>
          <QuestionnaireChoice value="deep" disabled>
            Deep research
          </QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError>Pick a supplier that is still open.</QuestionnaireError>
      </QuestionnaireItem>
      <QuestionnaireItem name="flowers" multiple>
        <QuestionnaireTitle>Which flowers?</QuestionnaireTitle>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="tulips">Tulips</QuestionnaireChoice>
          <QuestionnaireChoice value="daisies">Daisies</QuestionnaireChoice>
        </QuestionnaireChoices>
      </QuestionnaireItem>
      <QuestionnaireItem name="note">
        <QuestionnaireTitle>Anything else?</QuestionnaireTitle>
        <QuestionnaireInput aria-label="Additional note" />
      </QuestionnaireItem>
      <QuestionnaireActions>
        <QuestionnairePrevious size={size} />
        <QuestionnaireSkip size={size} />
        <QuestionnaireNext size={size} />
        <QuestionnaireSubmit size={size} />
      </QuestionnaireActions>
    </Questionnaire>
  );
}

function colorOf(token: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="questionnaire-${name}"]`)!;
const choices = () => [
  ...document.querySelectorAll<HTMLElement>(
    '[data-slot="questionnaire-item"][data-active] [data-slot="questionnaire-choice"]',
  ),
];

describe('Questionnaire in a real browser', () => {
  it.each(themes)('%s %s passes axe and paints checked, indicator and error tones', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Survey invalid />);
    await settle();
    const checked = document.querySelector<HTMLElement>('[data-slot="questionnaire-choice"][data-checked]')!;
    expect(getComputedStyle(checked).backgroundColor).toBe(colorOf('--sprout-primary-subtle'));
    expect(getComputedStyle(slot('choice-indicator', checked)).backgroundColor).toBe(colorOf('--sprout-primary'));
    expect(getComputedStyle(slot('error')).color).toBe(colorOf('--sprout-danger'));
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('fits a phone with 44px choice rows and actions', async () => {
    await page.viewport(390, 900);
    await render(
      <div style={{ padding: 16 }}>
        <Survey defaultItem="flowers" />
      </div>,
    );
    for (const row of choices()) {
      const box = row.getBoundingClientRect();
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.right).toBeLessThanOrEqual(390);
    }
    const visible = [...document.querySelectorAll<HTMLElement>('.sprout-questionnaire-action')].filter(
      button => !button.hidden,
    );
    expect(visible.length).toBeGreaterThan(0);
    for (const button of visible) expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    for (const node of document.querySelectorAll(
      '.sprout-questionnaire, .sprout-questionnaire-choice, .sprout-questionnaire-actions',
    ))
      expect(node.scrollWidth).toBeLessThanOrEqual(node.clientWidth + 1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it('keyboard picks answers, shows a focus ring and steps forward and back', async () => {
    const screen = await render(<Survey />);
    const progress = screen.getByRole('progressbar');
    const short = screen.getByRole('radio', { name: /Short answers/ });
    await userEvent.tab();
    await expect.element(screen.getByRole('radio', { name: /Detailed answers/ })).toHaveFocus();
    expect(getComputedStyle(choices()[1]!).outlineStyle).toBe('solid');
    await userEvent.keyboard('{ArrowUp}');
    await expect.element(short).toBeChecked();
    await expect.element(short).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect.element(progress).toHaveTextContent('Question 2 of 3');
    const tulips = screen.getByRole('checkbox', { name: 'Tulips' });
    (tulips.element() as HTMLElement).focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(screen.getByRole('checkbox', { name: 'Daisies' })).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect.element(screen.getByRole('checkbox', { name: 'Daisies' })).toBeChecked();
    await userEvent.keyboard('{ArrowLeft}');
    await expect.element(progress).toHaveTextContent('Question 1 of 3');
  });

  it('letter shortcuts pick and focus the matching choice', async () => {
    const screen = await render(<Survey />);
    const badges = [...document.querySelectorAll('[data-active] [data-slot="questionnaire-choice-shortcut"]')].map(
      badge => badge.textContent,
    );
    // Disabled choices get no shortcut badge.
    expect(badges).toEqual(['A', 'B']);
    (screen.getByRole('radio', { name: /Detailed answers/ }).element() as HTMLElement).focus();
    await userEvent.keyboard('a');
    const short = screen.getByRole('radio', { name: /Short answers/ });
    await expect.element(short).toBeChecked();
    await expect.element(short).toHaveFocus();
  });

  it('small actions use a smaller font than default actions', async () => {
    const screen = await render(
      <>
        <div data-testid="regular">
          <Survey />
        </div>
        <div data-testid="small">
          <Survey size="sm" />
        </div>
      </>,
    );
    const next = (id: string) => slot('next', screen.getByTestId(id).element());
    expect(parseFloat(getComputedStyle(next('small')).fontSize)).toBeLessThan(
      parseFloat(getComputedStyle(next('regular')).fontSize),
    );
  });

  it('choice motion is subtle and turns off for reduced motion', async () => {
    await render(<Survey />);
    const choice = choices()[0]!;
    const seconds = getComputedStyle(choice).transitionDuration.split(',').map(Number.parseFloat);
    expect(Math.max(...seconds)).toBeGreaterThanOrEqual(0.12);
    expect(Math.max(...seconds)).toBeLessThanOrEqual(0.18);
    await emulate({ reducedMotion: true });
    expect(
      getComputedStyle(choice)
        .transitionDuration.split(',')
        .every(value => Number.parseFloat(value) === 0),
    ).toBe(true);
  });
});
