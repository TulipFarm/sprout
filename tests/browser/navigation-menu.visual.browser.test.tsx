import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '../../packages/sprout/src/components/navigation-menu.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('navigation-menu %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(440, 240);
  const screen = await render(
    <div style={{ padding: 16 }}>
      <NavigationMenu aria-label="Site">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink href="#overview" active className={navigationMenuTriggerStyle()}>
              Overview
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Projects</NavigationMenuTrigger>
            <NavigationMenuContent>
              <div style={{ display: 'grid', padding: 8, width: 220 }}>
                <NavigationMenuLink href="#meadow" active>
                  Meadow project
                </NavigationMenuLink>
                <NavigationMenuLink href="#garden">Garden notes</NavigationMenuLink>
              </div>
            </NavigationMenuContent>
            <NavigationMenuIndicator />
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger disabled>Billing</NavigationMenuTrigger>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="#help" className={navigationMenuTriggerStyle()}>
              Help
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>,
  );
  await screen.getByRole('button', { name: 'Projects' }).click();
  await expect.element(page.getByRole('link', { name: 'Garden notes' })).toBeVisible();
  await settle();
  await expect.element(page.elementLocator(document.body)).toMatchScreenshot(`navigation-menu-${theme}-${mode}`);
});
