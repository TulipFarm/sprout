// Installs every Sprout registry item into a fresh shadcn app with the real shadcn CLI, then
// type-checks the copied source, compiles its Tailwind CSS against the package's own CSS, and
// renders components on the server.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { transform } from 'lightningcss';
import postcss from 'postcss';
import { registryItemSchema } from 'shadcn/schema';
import { buildRegistry } from '../tools/registry/build.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = path.join(root, '.artifacts');
await mkdir(artifacts, { recursive: true });
const work = await mkdtemp(path.join(artifacts, 'registry-'));
const registryDir = path.join(work, 'r');
const shadcn = path.join(root, 'node_modules/.bin/shadcn');

function run(command, args, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', env: { ...process.env, CI: 'true' } });
    child.on('error', reject);
    child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${command} ${args[0]} exited with ${code}`))));
  });
}

const server = createServer((request, response) => {
  const file = path.join(registryDir, path.basename(request.url ?? ''));
  const stream = createReadStream(file);
  stream.on('error', () => response.writeHead(404).end());
  stream.on('open', () => {
    response.setHeader('Content-Type', 'application/json');
    stream.pipe(response);
  });
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert.ok(address && typeof address === 'object');
const baseUrl = `http://127.0.0.1:${address.port}`;

async function app(name) {
  const dir = path.join(work, name);
  await cp(path.join(root, 'tests/fixtures/shadcn-app'), dir, { recursive: true });
  await run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], dir);
  return dir;
}

const sorted = object => JSON.stringify(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));

/** Each Sprout rule Tailwind emits, keyed by its at-rule context and selector, with its declarations. */
async function sproutRules(cssFile, cwd) {
  const out = path.join(path.dirname(cssFile), `${path.basename(cssFile, '.css')}.out.css`);
  await run('node', ['node_modules/@tailwindcss/cli/dist/index.mjs', '-i', cssFile, '-o', out], cwd);
  // lightningcss gives both stylesheets one spelling for quotes, pseudo-elements, and values.
  const { code } = transform({ filename: out, code: await readFile(out), minify: true });
  const rules = new Map();
  const context = node => {
    const parts = [];
    for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent) {
      if (parent.type === 'atrule' && parent.name !== 'layer') parts.unshift(`@${parent.name} ${parent.params}`);
    }
    return parts.join(' ');
  };
  const add = (key, declarations) => rules.set(key, { ...rules.get(key), ...declarations });
  postcss.parse(code.toString()).walk(node => {
    if (node.type === 'rule' && node.selector.includes('.sprout-') && node.parent?.name !== 'keyframes') {
      const declarations = {};
      node.each(child => {
        if (child.type === 'decl') declarations[child.prop] = child.value;
      });
      for (const selector of node.selectors) {
        // The registry keeps a repeated selector in cascade order as :is(selector).
        const plain = selector.replace(/^(?::is\()+(.*?)\)*$/, (_, inner) => inner);
        add(`${context(node)} ${plain}`.trim(), declarations);
      }
    }
    if (node.type === 'atrule' && node.name === 'keyframes' && node.params.startsWith('sprout-')) {
      add(`@keyframes ${node.params}`, { body: node.toString() });
    }
  });
  return rules;
}

try {
  const { items } = await buildRegistry({ baseUrl, outDir: registryDir });
  for (const item of items) registryItemSchema.parse(item);
  const components = items.filter(item => item.type === 'registry:ui');

  // One component on its own, by its @sprout name, pulls everything it needs through registry dependencies.
  const single = await app('single');
  const config = path.join(single, 'components.json');
  await writeFile(
    config,
    JSON.stringify({
      ...JSON.parse(await readFile(config, 'utf8')),
      registries: { '@sprout': `${baseUrl}/{name}.json` },
    }),
  );
  await run(shadcn, ['add', '@sprout/chat-input', '--yes', '--cwd', single]);
  await readFile(path.join(single, 'src/components/ui/chat-input.tsx'), 'utf8');
  await run('node_modules/.bin/tsc', ['-p', '.'], single);

  const full = await app('full');
  await run(shadcn, [
    'add',
    ...components.map(item => `${baseUrl}/${item.name}.json`),
    `${baseUrl}/theme-tulipfarm.json`,
    '--yes',
    '--cwd',
    full,
  ]);
  for (const item of components) {
    await readFile(path.join(full, 'src', item.files[0].target), 'utf8');
  }
  await run('node_modules/.bin/tsc', ['-p', '.'], full);

  // Installed CSS styles every Sprout selector the package's own stylesheet styles.
  const reference = path.join(full, 'reference.css');
  await writeFile(
    reference,
    `@import 'tailwindcss';\n@import '${path.join(root, 'packages/sprout/src/styles/index.css')}';\n@import '${path.join(root, 'packages/sprout/src/styles/themes/tulipfarm.css')}';\n`,
  );
  const expected = await sproutRules(reference, full);
  const actual = await sproutRules(path.join(full, 'src/styles/globals.css'), full);
  const missing = [...expected.keys()].filter(rule => !actual.has(rule));
  assert.deepEqual(missing, [], 'installed CSS must cover every Sprout rule');
  const changed = [...expected].filter(([rule, declarations]) => sorted(actual.get(rule)) !== sorted(declarations));
  assert.deepEqual(
    changed.map(([rule]) => rule),
    [],
    'installed Sprout rules must declare what the package declares',
  );

  const css = await readFile(path.join(full, 'src/styles/globals.css'), 'utf8');
  assert.match(css, /--color-sprout-canvas:\s*var\(--sprout-canvas\)/, 'theme utilities are registered');
  assert.equal(css.match(/@import 'tailwindcss'/g)?.length, 1);

  const smoke = path.join(full, 'src/smoke.tsx');
  await writeFile(
    smoke,
    `import { renderToString } from 'react-dom/server';
${components.map((item, index) => `import * as m${index} from '@/components/ui/${item.name}';`).join('\n')}
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';

export const modules = [${components.map((_, index) => `m${index}`).join(', ')}];
export const html = renderToString(
  <>
    <Button variant="outline">Saved</Button>
    <Accordion defaultValue={['a']}>
      <AccordionItem value="a">
        <AccordionTrigger>Details</AccordionTrigger>
        <AccordionContent>Inside</AccordionContent>
      </AccordionItem>
    </Accordion>
    <Card><CardContent>Card body</CardContent></Card>
  </>,
);
`,
  );
  const bundle = path.join(full, 'smoke.mjs');
  await build({
    entryPoints: [smoke],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: bundle,
    jsx: 'automatic',
    alias: { '@': path.join(full, 'src') },
    loader: { '.css': 'empty' },
    packages: 'external',
    logLevel: 'error',
  });
  const { html, modules } = await import(bundle);
  assert.equal(modules.length, components.length);
  assert.match(html, /data-slot="button"[^>]*>Saved/);
  assert.match(html, /data-slot="accordion-trigger"[\s\S]*Details/);
  assert.match(html, /data-slot="card"[\s\S]*Card body/);

  await writeFile(
    path.join(artifacts, 'registry-proof.json'),
    `${JSON.stringify({ items: items.length, components: components.length, rules: expected.size }, null, 2)}\n`,
  );
  console.log(`Installed ${components.length} components; ${expected.size} Sprout CSS rules match the package.`);
} finally {
  server.close();
}
