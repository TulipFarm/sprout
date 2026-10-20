import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import { ToolbarStatus } from '../../packages/sprout/src/components/toolbar-status.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('toolbar status %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(440, 260);
  await render(
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8,
        padding: 16,
      }}
    >
      <ToolbarStatus label="Exported" message="Exported 3 selected rows." />
      <ToolbarStatus defaultOpen error label="Export failed" message="The table changed while exporting. Try again.">
        <Button size="sm">Retry export</Button>
      </ToolbarStatus>
    </div>,
  );
  await expect.poll(() => document.querySelector('[data-slot="toolbar-status-content"][data-open]')).not.toBeNull();
  await settle();
  await expect.element(page.elementLocator(document.body)).toMatchScreenshot(`toolbar-status-${theme}-${mode}`);
});
