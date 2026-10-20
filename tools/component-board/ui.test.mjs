import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createBoardServer } from './server.mjs';

test('live HTML board supports picking, review, filters, drag, feedback and mobile access', async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'sprout-board-ui-'));
  const statuses = new Map();
  const inventory = {
    generatedAt: new Date().toISOString(),
    sourceRoot: '/local/cloud',
    cards: ['Button', 'Card', 'Dialog', 'Input', 'Select', 'Tabs', 'Sidebar', 'Message'].map(name => ({
      id: name.toLowerCase(),
      slug: name.toLowerCase(),
      name,
      category: name === 'Message' ? 'AI & chat' : 'Primitives',
      source: `apps/web/src/components/ui/${name.toLowerCase()}.tsx`,
      exports: [name],
      dependencies: [],
      importers: ['apps/web/src/features/chat/example.tsx'],
      usageCount: 1,
    })),
  };
  const dispatcher = {
    async start(card) {
      statuses.set(card.jobId, {
        phase: 'building',
        message: 'Building component',
      });
      return {};
    },
    async status(id) {
      return statuses.get(id);
    },
    async integrate() {},
    async log() {
      return "<script>alert('not HTML')</script>\nExample worker output";
    },
  };
  await mkdir(path.join(dataDir, 'screenshots'));
  await writeFile(
    path.join(dataDir, 'screenshots', 'card.png'),
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    ),
  );
  const app = await createBoardServer({
    dataDir,
    inventory,
    dispatcher,
    polling: false,
  });
  const base = await app.listen(0);
  let browser;
  t.after(async () => {
    await browser?.close();
    await app.close();
    await rm(dataDir, { recursive: true, force: true });
  });
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'light',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await expect(page.locator('[data-card-id="button"]')).toBeVisible();
  await expect(page.locator('select')).toHaveCount(0);
  const thumbnail = page.getByRole('button', {
    name: 'Open screenshot: Card',
    exact: true,
  });
  await expect(thumbnail).toBeVisible();
  await expect(page.locator('[data-card-id="button"] .card-shot')).toBeHidden();
  const thumbSrc = await thumbnail.locator('img').getAttribute('src');
  assert.match(thumbSrc, /^\/screenshots\/card\.png\?v=\d+$/);
  await expect.poll(() => thumbnail.locator('img').evaluate(img => img.naturalWidth)).toBe(1);
  await thumbnail.click();
  await expect(page.locator('#shot')).toBeVisible();
  await expect(page.locator('#shot-title')).toHaveText('Card screenshot');
  await expect(page.locator('#shot-img')).toHaveAttribute('src', thumbSrc);
  await expect(page.locator('#detail')).not.toBeVisible();
  await app.board.queue({ paused: true, revision: app.board.data.revision });
  await expect(page.locator('#pause-toggle')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#shot')).toBeVisible();
  assert.equal(await thumbnail.locator('img').getAttribute('src'), thumbSrc);
  await page.keyboard.press('Escape');
  await expect(page.locator('#shot')).not.toBeVisible();
  assert.equal(app.board.card('card').state, 'TODO');
  await app.board.queue({ paused: false, revision: app.board.data.revision });
  await expect(page.locator('#pause-toggle')).toHaveAttribute('aria-checked', 'false');
  const light = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();

  await page.locator('#search').fill('Message');
  await expect(page.locator('[data-card-id="message"]')).toBeVisible();
  await expect(page.locator('[data-card-id="button"]')).not.toBeVisible();
  await page.locator('#search').fill('');
  await page.locator('#cat-btn').click();
  await page.getByRole('menuitemradio', { name: /AI & chat/ }).click();
  await expect(page.locator('[data-card-id="button"]')).not.toBeVisible();
  await page.locator('#cat-btn').click();
  await page.getByRole('menuitemradio', { name: /All/ }).click();

  await page.locator('[data-card-id="button"]').dragTo(page.locator('[data-column="PICK"]'));
  await expect(page.locator('[data-column="PICK"] [data-card-id="button"]')).toBeVisible();
  for (const id of ['card', 'dialog', 'input', 'select']) {
    await page.locator(`[data-card-id="${id}"] [data-action="pick"]`).click();
    await expect(page.locator(`[data-column="PICK"] [data-card-id="${id}"]`)).toBeVisible();
  }
  await expect(page.locator('[data-card-id="tabs"] [data-action="pick"]')).toHaveAttribute('aria-disabled', 'true');
  assert.equal(app.board.data.cards.filter(card => card.state === 'PICK').length, 5);

  await page.getByRole('button', { name: 'Open details: Button', exact: true }).click();
  await page.locator('#d-feedback').fill('Keep this feedback while live updates arrive.');
  await page.locator('#d-feedback').focus();
  await app.board.tick();
  await app.board.tick();
  await expect(page.locator('#d-feedback')).toBeFocused();
  await expect(page.locator('#d-feedback')).toHaveValue('Keep this feedback while live updates arrive.');
  await page.locator('#d-close').click();
  statuses.set(app.board.card('button').jobId, {
    phase: 'review',
    message: 'Verified',
    result: { summary: 'Button ready', previewPath: '/components/button/' },
  });
  await app.board.tick();
  await expect(page.locator('[data-column="REVIEW"] [data-card-id="button"]')).toBeVisible();
  await page.locator('[data-card-id="button"] [data-action="done"]').click();
  await expect(page.locator('[data-column="DONE"] [data-card-id="button"]')).toBeVisible();
  assert.equal(app.board.card('button').state, 'DONE');

  await page.locator('#pause-toggle').click();
  await expect(page.locator('#pause-toggle')).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.locator('[data-column="DONE"] [data-card-id="button"]')).toBeVisible();
  await expect(page.locator('#pause-toggle')).toHaveAttribute('aria-checked', 'true');
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await expect(page.locator('.card-title').first()).toHaveCSS('color', 'rgb(237, 237, 237)');
  const dark = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#search')).toBeVisible();
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'no page-wide mobile overflow',
  );
  await page.locator('#search').fill('Sidebar');
  await page.getByRole('button', { name: 'Open details: Sidebar', exact: true }).click();
  await expect(page.locator('#d-feedback')).toBeVisible();
  const mobile = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  await page.keyboard.press('Escape');
  await expect(page.locator('#d-feedback')).not.toBeVisible();
  assert.deepEqual(errors, []);
  assert.deepEqual([...light.violations, ...dark.violations, ...mobile.violations], []);
});
