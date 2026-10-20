import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { FileViewer } from '../../packages/sprout/src/components/file-viewer.js';
import { setTheme, settle, themes } from './support.js';

const name = 'Harvest notes.txt';
const file = new File(['Harvest notes\nBed 2 tomatoes are ready on Friday.\nBed 4 needs mulch.\n'], name, {
  type: 'text/plain',
});

it.each(themes)('file-viewer %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(900, 480);
  await render(
    <FileViewer
      file={{ name, mediaType: 'text/plain', source: { kind: 'local', file } }}
      open
      onOpenChange={() => {}}
      panel={<p style={{ padding: 16, margin: 0 }}>Shared with Ana</p>}
      defaultPanelOpen
    />,
  );
  await expect.element(page.getByRole('dialog').getByText(/Bed 4 needs mulch/)).toBeVisible();
  await expect.element(page.getByRole('link', { name: 'Download' })).toBeVisible();
  await settle();
  await expect.element(page.elementLocator(document.body)).toMatchScreenshot(`file-viewer-${theme}-${mode}`);
});
