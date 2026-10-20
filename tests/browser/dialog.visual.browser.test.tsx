import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../packages/sprout/src/components/dialog.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('dialog %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(480, 320);
  await render(
    <Dialog defaultOpen>
      <DialogContent size="form">
        <DialogHeader>
          <DialogTitle>Rename file</DialogTitle>
          <DialogDescription>Links and sharing stay the same after renaming.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <p style={{ margin: 0 }}>Spring launch – supplier onboarding</p>
        </DialogBody>
        <DialogFooter showCloseButton closeLabel="Cancel">
          <p>Saved to Drive.</p>
          <Button>Rename</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>,
  );
  await expect.element(page.getByRole('dialog')).toBeVisible();
  await settle();
  await expect.element(page.elementLocator(document.body)).toMatchScreenshot(`dialog-${theme}-${mode}`);
});
