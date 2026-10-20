import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Alert, AlertTitle } from '../../packages/sprout/src/components/alert.js';
import { PageContent } from '../../packages/sprout/src/components/page-content.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('page-content %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        width: 480,
        outline: '1px dashed var(--sprout-line)',
        background: 'var(--sprout-canvas)',
      }}
    >
      <PageContent>
        <h1 style={{ margin: 0, fontSize: 20 }}>Files</h1>
        <Alert>
          <AlertTitle>Storage is almost full.</AlertTitle>
        </Alert>
        <nav
          aria-label="Filter apps"
          style={{
            marginInline: 'calc(-1 * var(--sprout-page-content-inline))',
            height: 32,
            background: 'var(--sprout-hover)',
          }}
        />
        <p style={{ margin: 0 }}>Q3 board deck.pdf</p>
      </PageContent>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`page-content-${theme}-${mode}`);
});
