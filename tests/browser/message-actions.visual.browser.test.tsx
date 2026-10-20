import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { MessageActions, MessageBranch } from '../../packages/sprout/src/components/message-actions.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('message-actions %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        gap: 12,
        padding: 16,
        width: 360,
        background: 'var(--sprout-canvas)',
      }}
    >
      <MessageActions
        text="Done."
        createdAt="2020-01-03T09:41:00"
        feedback="up"
        onFeedback={() => {}}
        onRetry={() => {}}
      />
      <MessageActions text="Thanks" author="human" />
      <MessageActions text="Done." disabled onFeedback={() => {}} />
      <MessageBranch index={1} total={3} onChange={() => {}} />
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`message-actions-${theme}-${mode}`);
});
