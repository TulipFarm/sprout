import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '../../packages/sprout/src/components/alert-dialog.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('alert-dialog %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(480, 300);
  await render(
    <AlertDialog defaultOpen>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 4h10M6 4V2h4v2M4 4l1 10h6l1-10" fill="none" stroke="currentColor" />
            </svg>
          </AlertDialogMedia>
          <AlertDialogTitle>Delete Q3 supplier contracts.pdf?</AlertDialogTitle>
          <AlertDialogDescription>
            The file leaves Files for everyone. It stays recoverable for 30 days.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep file</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Delete file</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>,
  );
  await expect.element(page.getByRole('alertdialog')).toBeVisible();
  await settle();
  await expect.element(page.elementLocator(document.body)).toMatchScreenshot(`alert-dialog-${theme}-${mode}`);
});
