import { readdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const components = readdirSync('apps/docs/src/pages/components')
  .filter(file => file.endsWith('.astro'))
  .map(file => `/components/${file.replace('.astro', '')}/`);
const guides = ['/', '/installation/', '/theming/', '/changelog/'];

async function open(page: Page, route: string) {
  await page.goto(route);
  await expect(page.locator('astro-island[ssr]:not([client="visible"])')).toHaveCount(0);
}

async function expectAxeClean(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .exclude('[data-base-ui-focus-guard]')
    .analyze();
  expect(results.violations).toEqual([]);
}

test('every route loads without errors or native selects', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(`${page.url()}: ${error}`));
  page.on('console', message => {
    // Avatar demos load a missing image on purpose; route status covers real 404s.
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource'))
      errors.push(`${page.url()}: ${message.text()}`);
  });
  for (const route of [...guides, ...components]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator('h1').first(), route).toBeVisible();
    await expect(page.locator('select'), route).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('search opens from the button, ⌘K and /, and navigates', async ({ page }) => {
  await open(page, '/installation/');
  const dialog = page.getByRole('dialog', { name: 'Search documentation' });
  await page.getByRole('button', { name: 'Search components' }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+k');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.keyboard.press('/');
  await expect(dialog).toBeVisible();
  await page.keyboard.type('button group');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/components\/button-group\/$/);
  await expect(page.getByRole('heading', { level: 1, name: /^Button group$/i })).toBeVisible();
});

test('the docs nav marks the current page and the phone drawer opens', async ({ page }) => {
  await open(page, '/components/badge/');
  const nav = page.getByRole('navigation', { name: 'Documentation' });
  await expect(nav.getByRole('link', { name: 'Badge', exact: true })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Card', exact: true }).click();
  await expect(page).toHaveURL(/\/components\/card\/$/);
  await expect(nav.getByRole('link', { name: 'Card', exact: true })).toHaveAttribute('aria-current', 'page');

  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = page.locator('.nav-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(nav).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('site theme and dark mode apply to the page and persist', async ({ page }) => {
  await open(page, '/theming/');
  await page.getByRole('button', { name: /^Site theme/ }).click();
  await page.getByRole('option', { name: 'TulipFarm' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-sprout-theme', 'tulipfarm');
  await page.getByRole('button', { name: 'Dark mode' }).click();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-sprout-theme', 'tulipfarm');
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
});

test('code blocks copy their exact source', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, '/components/sidebar/');
  const block = page.getByRole('group', { name: 'Sidebar usage', exact: true });
  const button = block.getByRole('button', { name: 'Copy Sidebar usage code' });
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveText('Copied');
  await expect(block.getByRole('status')).toHaveText('Code copied to clipboard.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await block.getAttribute('data-code'));
});

test('component pages install through shadcn, by hand, or from npm', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, '/components/button/');
  const install = page.locator('.component-install');
  await install.getByRole('tab', { name: 'npm', exact: true }).first().click();
  await install.getByRole('button', { name: 'Copy shadcn command' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'npx shadcn@latest add https://sprout.tulipfarm.ai/r/button.json',
  );

  await install.getByRole('tab', { name: 'Manual' }).click();
  const item = await (await page.request.get('/r/button.json')).json();
  const source = install.getByRole('group', { name: 'components/ui/button.tsx' });
  await source.getByRole('button', { name: 'Expand' }).click();
  await expect(source.getByRole('button', { name: 'Collapse' })).toHaveAttribute('aria-expanded', 'true');
  const main = source.getByRole('button', { name: 'Copy components/ui/button.tsx code' });
  await main.click();
  await expect(main).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(item.files[0].content);
  const helper = install.getByRole('button', { name: 'Copy lib/sprout/pressable.tsx' });
  await helper.click();
  await expect(helper).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(item.files[1].content);

  await page.reload();
  await expect(page.locator('.component-install').getByRole('tab', { name: 'Manual' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.locator('.component-quality-trigger').click();
  await expect(page.getByRole('dialog', { name: 'Verified' })).toContainText('React Doctor');
  await expectAxeClean(page);
});

for (const width of [390, 1440])
  for (const mode of ['light', 'dark'] as const)
    test(`key pages pass axe at ${width}px in ${mode} mode`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: mode });
      for (const route of ['/installation/', '/theming/', '/components/button/']) {
        await open(page, route);
        await expectAxeClean(page);
      }
    });
