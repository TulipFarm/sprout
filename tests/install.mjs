import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, cp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { registryItemSchema } from 'shadcn/schema';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = path.join(root, '.artifacts');
await mkdir(artifacts, { recursive: true });
const work = await mkdtemp(path.join(artifacts, 'install-'));
const fixture = path.join(work, 'consumer');
const shadcn = path.join(root, 'node_modules/.bin/shadcn');
const registry = JSON.parse(await readFile(path.join(root, 'apps/docs/public/r/sprout.json'), 'utf8'));
registryItemSchema.parse(registry);

function run(command, args, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, CI: 'true' },
    });
    child.on('error', reject);
    child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`))));
  });
}

const server = createServer((request, response) => {
  if (request.url !== '/sprout.json') {
    response.writeHead(404).end();
    return;
  }
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(registry));
});

try {
  await run('pnpm', ['--filter', '@tulipfarm/sprout', 'pack', '--pack-destination', work]);
  const tarball = (await readdir(work)).find(name => name.endsWith('.tgz'));
  assert.ok(tarball, 'pnpm pack must produce a tarball');
  registry.dependencies = [`@tulipfarm/sprout@file:${path.join(work, tarball)}`];
  await cp(path.join(root, 'tests/fixtures/consumer'), fixture, {
    recursive: true,
  });
  await run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], fixture);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}/sprout.json`;
  await run(shadcn, ['add', url, '--yes', '--cwd', fixture]);
  await run(path.join(root, 'node_modules/.bin/tsc'), ['-p', fixture]);
  await run('node', ['smoke.mjs'], fixture);
  assert.deepEqual(
    (await readdir(path.join(fixture, 'node_modules/@tulipfarm/sprout/dist/components'))).sort(),
    (await readdir(path.join(root, 'packages/sprout/src/components')))
      .filter(name => /\.tsx?$/.test(name))
      .flatMap(name => {
        const base = name.replace(/\.tsx?$/, '');
        return [`${base}.d.ts`, `${base}.js`];
      })
      .sort(),
    'the tarball must not contain removed component implementations',
  );
  await run(shadcn, ['add', 'button', '--yes', '--overwrite', '--cwd', fixture]);
  const sourcePath = path.join(fixture, 'src/components/ui/button.tsx');
  const originalSource = await readFile(sourcePath, 'utf8');
  const originalFiles = await readdir(path.dirname(sourcePath));
  for (let install = 0; install < 2; install++) {
    await run(shadcn, ['add', url, '--yes', '--cwd', fixture]);
    assert.equal(await readFile(sourcePath, 'utf8'), originalSource, 'existing UI source must not change');
  }
  const cssFile = path.join(fixture, 'src/styles/theme.css');
  const css = await readFile(cssFile, 'utf8');
  assert.equal(css.match(/@tulipfarm\/sprout\/styles\.css/g)?.length, 1, 'CSS import must be idempotent');
  assert.match(css, /--primary:\s*#613dba/);
  assert.match(css, /--sprout-radius-control:\s*0\.625rem/);
  assert.deepEqual(
    await readdir(path.dirname(sourcePath)),
    originalFiles,
    'no component implementations may be copied',
  );
  await run(
    'node',
    ['node_modules/@tailwindcss/cli/dist/index.mjs', '-i', 'src/styles/theme.css', '-o', 'output.css'],
    fixture,
  );
  const output = await readFile(path.join(fixture, 'output.css'), 'utf8');
  assert.match(output, /\.bg-sprout-canvas\s*\{/, 'package classes must be discovered through its exported CSS');
  assert.match(output, /var\(--sprout-canvas\)/);
  assert.match(output, /\.sprout-sidebar-panel/);
  assert.match(output, /\.sprout-alert-destructive/);
  assert.match(output, /\.sprout-avatar/);
  assert.match(output, /\.sprout-sheet-swipe-handle/);
  assert.match(output, /\.sprout-dropdown-menu-content/);
  assert.match(output, /\.sprout-choice-group-options/);
  assert.match(output, /\.sprout-popover-content/);
  assert.match(output, /\.sprout-select-trigger/);
  assert.match(output, /\.sprout-badge-chip/);
  assert.match(output, /\.sprout-brand-tile/);
  assert.match(output, /\.sprout-state-panel-card/);
  assert.match(output, /\.sprout-tabs-list-steps/);
  assert.match(output, /\.sprout-toggle-variant-outline/);
  assert.match(output, /\.sprout-toggle-group-item-outline/);
  assert.match(output, /\.sprout-tooltip-content/);
  assert.match(output, /\.sprout-page-header-breadcrumb/);
  assert.match(output, /\.sprout-page-content/);
  assert.match(output, /\.sprout-settings-row-control/);
  assert.match(output, /\.sprout-button-variant-outline/);
  assert.match(output, /\.bg-primary\s*\{/, 'existing shadcn utilities must remain');
  await run(path.join(root, 'node_modules/.bin/tsc'), ['-p', fixture]);
  await run('node', ['smoke.mjs'], fixture);

  const fixturePackage = JSON.parse(await readFile(path.join(fixture, 'package.json'), 'utf8'));
  assert.ok(fixturePackage.dependencies['@tulipfarm/sprout']);
  await writeFile(
    path.join(artifacts, 'install-proof.json'),
    JSON.stringify(
      {
        shadcn: '4.22.0',
        tailwind: '4.3.3',
        npmPackage: 'packed local 0.1.0, not a public release',
        checks: [
          'clean consumer',
          'npm dependency',
          'no copied controls',
          'repeat install',
          'custom CSS path',
          'CSS overrides preserved',
          'package class discovery',
          'real shadcn button coexistence',
          'consumer types',
          'SSR imports',
        ],
      },
      null,
      2,
    ),
  );
  console.log('Packed npm + shadcn + Tailwind installation proof passed.');
} finally {
  server.close();
  await rm(work, { recursive: true, force: true });
}
