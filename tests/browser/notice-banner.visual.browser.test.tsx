import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import { NoticeBanner } from '../../packages/sprout/src/components/notice-banner.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('notice-banner %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        width: 720,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      <NoticeBanner
        aria-label="Integration authorization"
        actions={<Button variant="outline">Update permissions</Button>}
      >
        <p>3 integrations need authorization.</p>
      </NoticeBanner>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`notice-banner-${theme}-${mode}`);
});
