import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '../../packages/sprout/src/components/dropdown-menu.js';
import { emulate, setTheme, settle, themes } from './support.js';

it.each(themes)('dropdown-menu %s %s', async (theme, mode) => {
  await emulate({ reducedMotion: true });
  setTheme(theme, mode);
  await page.viewport(320, 300);
  await render(
    <div style={{ padding: 16 }}>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>Actions</DropdownMenuTrigger>
        <DropdownMenuContent size="menu">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Tasks</DropdownMenuLabel>
            <DropdownMenuItem>
              New task<DropdownMenuShortcut>⌘ N</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Unavailable action</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuCheckboxItem checked>Show completed</DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete sample</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>,
  );
  await page.getByRole('button', { name: 'Actions' }).click();
  await expect.element(page.getByRole('menu')).toBeVisible();
  await settle();
  await expect.element(page.elementLocator(document.body)).toMatchScreenshot(`dropdown-menu-${theme}-${mode}`);
});
