import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { WebSource } from '../../packages/sprout/src/components/web-source.js';
import { setTheme, settle, themes } from './support.js';

const icon = () =>
  `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" rx="4" fill="#146c2f"/></svg>')}`;

it.each(themes)('web source %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: 16,
        background: 'var(--sprout-canvas)',
        width: 520,
      }}
    >
      <WebSource
        url="https://developer.mozilla.org/en-US/docs/Web/Accessibility"
        title="Accessibility | MDN"
        icon={icon}
      />
      <WebSource url="https://www.w3.org/WAI/standards-guidelines/wcag/" icon={() => null} />
      <WebSource url="https://www.ft.com/content/inflation" title="Inflation outlook" icon={() => null} failed />
      <WebSource
        url="https://example.com/a/very/long/path"
        title="A very long page title that is cut off with an ellipsis"
        icon={icon}
      />
    </div>,
  );
  await expect.poll(() => document.querySelectorAll('[data-status="loaded"]').length).toBe(2);
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`web-source-${theme}-${mode}`);
});
