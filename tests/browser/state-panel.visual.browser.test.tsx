import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import { FilesSample, StatePanel } from '../../packages/sprout/src/components/state-panel.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('state-panel %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(900, 720);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        gap: 16,
        width: 820,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <StatePanel
          kind="error"
          heading="h3"
          title="Could not open this file"
          description="The file moved or you lost access."
        >
          <Button variant="outline">Try again</Button>
        </StatePanel>
        <StatePanel
          kind="success"
          heading="h3"
          title="Google Drive is ready"
          description="Files will appear in a moment."
        />
      </div>
      <StatePanel
        kind="empty"
        heading="h3"
        title="No files yet"
        description="Upload files to use them in chats."
        sample={<FilesSample />}
      >
        <Button>Upload files</Button>
      </StatePanel>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`state-panel-${theme}-${mode}`);
});
