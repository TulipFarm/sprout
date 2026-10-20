import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import { ResultNotice } from '../../packages/sprout/src/components/result-notice.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('result-notice %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{ display: 'grid', gap: 12, width: 640, padding: 16, background: 'var(--sprout-canvas)' }}
    >
      <ResultNotice
        shown={100}
        total={2431}
        noun="rows"
        action={
          <Button size="sm" variant="ghost">
            Open in Table
          </Button>
        }
      />
      <ResultNotice shown={100} total="10000+" noun="groups" />
      <div style={{ width: 300 }}>
        <ResultNotice
          shown={100}
          total={84210}
          noun="rows"
          action={
            <Button size="sm" variant="ghost">
              Open in Table
            </Button>
          }
        />
      </div>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`result-notice-${theme}-${mode}`);
});
