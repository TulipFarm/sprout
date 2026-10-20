import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { ScrollArea } from '../../packages/sprout/src/components/scroll-area.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('scroll-area %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        width: 320,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      <ScrollArea size="sm" variant="table" viewportLabel="Sample records">
        {Array.from({ length: 16 }, (_, index) => (
          <p key={index} style={{ margin: 0, padding: '6px 12px' }}>
            Sample record {index + 1} · Meadow project
          </p>
        ))}
      </ScrollArea>
    </div>,
  );
  await expect.poll(() => document.querySelector('[data-slot="scroll-area-thumb"]')).not.toBeNull();
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`scroll-area-${theme}-${mode}`);
});
