import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as sprout from '../packages/sprout/src/index.js';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '../packages/sprout/src/components/navigation-menu.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

function tag(html: string, slot: string) {
  const match = html.match(new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`));
  expect(match, slot).toBeTruthy();
  return match![0];
}

function CloudMenu() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Projects</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-56 gap-2 p-4">
              <NavigationMenuLink href="#meadow">Meadow project</NavigationMenuLink>
              <NavigationMenuLink href="#garden">Garden notes</NavigationMenuLink>
            </div>
          </NavigationMenuContent>
          <NavigationMenuIndicator />
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#help">Help</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

describe('Navigation Menu', () => {
  it('exports every Cloud part from the root and its subpath', () => {
    const parts = {
      NavigationMenu,
      NavigationMenuContent,
      NavigationMenuIndicator,
      NavigationMenuItem,
      NavigationMenuLink,
      NavigationMenuList,
      NavigationMenuPositioner,
      NavigationMenuTrigger,
      navigationMenuTriggerStyle,
    };
    for (const [name, part] of Object.entries(parts)) {
      expect((sprout as Record<string, unknown>)[name], name).toBe(part);
    }
    const manifest = JSON.parse(read('../packages/sprout/package.json'));
    expect(manifest.exports['./navigation-menu']).toEqual({
      types: './dist/components/navigation-menu.d.ts',
      import: './dist/components/navigation-menu.js',
    });
    expect(read('../packages/sprout/src/styles/index.css')).toContain('@import "./navigation-menu.css";');
  });

  it('renders the Cloud composition: a nav list with a trigger item and a plain link item', () => {
    const html = renderToString(<CloudMenu />);
    expect(tag(html, 'navigation-menu')).toMatch(/^<nav /);
    expect(tag(html, 'navigation-menu')).toContain('sprout-navigation-menu');
    expect(tag(html, 'navigation-menu-list')).toMatch(/^<ul /);
    expect(tag(html, 'navigation-menu-item')).toMatch(/^<li /);
    const trigger = tag(html, 'navigation-menu-trigger');
    expect(trigger).toMatch(/^<button /);
    expect(trigger).toContain('aria-expanded="false"');
    expect(trigger).toContain('sprout-navigation-menu-trigger');
    expect(tag(html, 'navigation-menu-chevron')).toContain('aria-hidden="true"');
    expect(html).toContain('<svg');
    expect(html).not.toContain('▼');
    const help = tag(html, 'navigation-menu-link');
    expect(help).toMatch(/^<a /);
    expect(help).toContain('href="#help"');
    // Closed panels are not rendered on the server.
    expect(html).not.toContain('Meadow project');
    expect(tag(html, 'navigation-menu-indicator')).not.toContain('data-popup-open');
  });

  it('marks active links as the current page and merges classes', () => {
    const html = renderToString(
      <NavigationMenu>
        <NavigationMenuList className="extra-list">
          <NavigationMenuItem>
            <NavigationMenuLink href="#overview" active className={navigationMenuTriggerStyle('extra-link')}>
              Overview
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger disabled className={() => 'state-class'}>
              Billing
            </NavigationMenuTrigger>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    const link = tag(html, 'navigation-menu-link');
    expect(link).toContain('aria-current="page"');
    expect(link).toContain('data-active');
    expect(link).toContain('sprout-navigation-menu-link sprout-navigation-menu-trigger extra-link');
    expect(tag(html, 'navigation-menu-list')).toContain('sprout-navigation-menu-list extra-list');
    const trigger = tag(html, 'navigation-menu-trigger');
    expect(trigger).toContain('disabled');
    expect(trigger).toContain('sprout-navigation-menu-trigger state-class');
  });

  it('navigationMenuTriggerStyle returns the trigger class', () => {
    expect(navigationMenuTriggerStyle()).toBe('sprout-navigation-menu-trigger');
    expect(navigationMenuTriggerStyle('w-full')).toBe('sprout-navigation-menu-trigger w-full');
  });

  it('styles compactly with sprout tokens and motion only when allowed', () => {
    const css = read('../packages/sprout/src/styles/navigation-menu.css');
    expect(css).toMatch(/\.sprout-navigation-menu-trigger,[^{]*\{[^}]*height: 32px;/);
    expect(css).toMatch(/\.sprout-navigation-menu-positioner \{[^}]*z-index: 50;/);
    expect(css).toMatch(/\.sprout-navigation-menu-popup \{[^}]*width: var\(--popup-width\);/);
    expect(css).toContain('@media (prefers-reduced-motion: no-preference)');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).toContain('[data-activation-direction="left"]');
    expect(css).not.toMatch(/--(?!sprout-|available-|transform-origin|popup-|positioner-)[a-z-]+[:)]/);
    expect(css).not.toMatch(/\d+ms/);
  });

  it('is listed in the docs navigation', () => {
    expect(read('../apps/docs/src/data/nav.ts')).toContain('"Navigation Menu"');
  });
});
