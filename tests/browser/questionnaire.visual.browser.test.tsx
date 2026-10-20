import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireTitle,
} from '../../packages/sprout/src/components/questionnaire.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('questionnaire %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        width: 420,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      <Questionnaire shortcuts="letters">
        <QuestionnaireProgress />
        <QuestionnaireItem name="style" invalid>
          <QuestionnaireTitle>How should replies read?</QuestionnaireTitle>
          <QuestionnaireDescription>Pick one.</QuestionnaireDescription>
          <QuestionnaireChoices>
            <QuestionnaireChoice value="short">Short answers</QuestionnaireChoice>
            <QuestionnaireChoice value="detailed" defaultChecked>
              Detailed answers
            </QuestionnaireChoice>
            <QuestionnaireChoice value="deep" disabled>
              Deep research
            </QuestionnaireChoice>
          </QuestionnaireChoices>
          <QuestionnaireError>Pick a style that is available.</QuestionnaireError>
        </QuestionnaireItem>
        <QuestionnaireItem name="note">
          <QuestionnaireTitle>Anything else?</QuestionnaireTitle>
        </QuestionnaireItem>
        <QuestionnaireActions>
          <QuestionnairePrevious />
          <QuestionnaireSkip />
          <QuestionnaireNext />
        </QuestionnaireActions>
      </Questionnaire>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`questionnaire-${theme}-${mode}`);
});
