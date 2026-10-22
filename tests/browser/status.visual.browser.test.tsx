import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Status, statusSizeNames, statusStateNames } from '../../packages/sprout/src/components/status.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('status %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{ display: 'grid', gap: 12, padding: 16, background: 'var(--sprout-canvas)', width: 'max-content' }}
    >
      {statusSizeNames.map(size => (
        <div key={size} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {statusStateNames.map(state => (
            <Status key={state} state={state} size={size} />
          ))}
          <Status state="running" value={0} size={size} />
          <Status state="running" value={40} size={size} />
          <Status state="running" value={100} size={size} />
        </div>
      ))}
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`status-${theme}-${mode}`);
});
