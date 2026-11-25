// Measures each registry component for its docs page: bundle size, tests, React Compiler
// coverage, and React Doctor findings. Writes apps/docs/src/data/component-stats.json.
//   node tools/component-stats/stats.mjs           write the file
//   node tools/component-stats/stats.mjs --check   fail when the file is stale
import { transformAsync } from '@babel/core';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { availableParallelism, tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { buildRegistry } from '../registry/build.mjs';

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, '../..');
const pkgDir = path.join(root, 'packages/sprout');
const componentsDir = path.join(pkgDir, 'src/components');
const output = path.join(root, 'apps/docs/src/data/component-stats.json');
const bin = name => path.join(root, 'node_modules/.bin', name);

const isBare = specifier => !specifier.startsWith('.') && !path.isAbsolute(specifier);
const isComponent = file =>
  path.dirname(file) === componentsDir && path.basename(file) !== 'icons.tsx' && /\.tsx?$/.test(file);

/**
 * Minified gzip bytes of what an entry loads up front, built on its own so shared chunks don't
 * carry other components' code. `own` keeps npm packages and other Sprout components out;
 * `total` bundles everything except React.
 */
async function size(entry, mode) {
  const result = await build({
    entryPoints: { entry },
    bundle: true,
    splitting: true,
    format: 'esm',
    minify: true,
    write: false,
    metafile: true,
    absWorkingDir: root,
    outdir: 'stats-out',
    loader: { '.css': 'empty' },
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'error',
    plugins: [
      {
        name: 'externals',
        setup(build) {
          build.onResolve({ filter: /.*/ }, async args => {
            if (args.kind === 'entry-point' || args.pluginData) return;
            if (isBare(args.path)) {
              const react = /^react(-dom)?(\/|$)/.test(args.path);
              return mode === 'own' || react ? { path: args.path, external: true } : undefined;
            }
            if (mode !== 'own') return;
            const resolved = await build.resolve(args.path, {
              importer: args.importer,
              resolveDir: args.resolveDir,
              kind: args.kind,
              pluginData: true,
            });
            return isComponent(resolved.path) ? { path: args.path, external: true } : { path: resolved.path };
          });
        },
      },
    ],
  });
  const files = new Map(result.outputFiles.map(file => [path.relative(root, file.path), file.contents]));
  const outputs = result.metafile.outputs;
  // Lazy import() chunks (shiki languages, optional extras) load later, so they don't count.
  const seen = new Set();
  const visit = file => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const dep of outputs[file].imports) {
      if (dep.kind === 'import-statement' && !dep.external) visit(dep.path);
    }
  };
  visit('stats-out/entry.js');
  return gzipSync(Buffer.concat([...seen].map(file => files.get(file))), { level: 9 }).length;
}

async function sizes(entries) {
  const queue = Object.entries(entries);
  const result = {};
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [name, entry] = next;
      result[name] = { own: await size(entry, 'own'), total: await size(entry, 'total') };
    }
  };
  await Promise.all(Array.from({ length: availableParallelism() }, worker));
  return Object.fromEntries(Object.keys(entries).map(name => [name, result[name]]));
}

/** Declared tests per test file name, and how many of them run axe. */
async function tests() {
  const dir = await mkdtemp(path.join(tmpdir(), 'sprout-stats-'));
  const list = path.join(dir, 'tests.json');
  try {
    await run(bin('vitest'), ['list', '--project', 'unit', '--project', 'browser', `--json=${list}`], {
      cwd: root,
      maxBuffer: 64 * 1024 * 1024,
    });
    const counts = new Map();
    for (const test of JSON.parse(await readFile(list, 'utf8'))) {
      const name = path.basename(test.file).replace(/(\.browser)?\.test\.tsx?$/, '');
      const count = counts.get(name) ?? { behavior: 0, axe: 0 };
      count.behavior += 1;
      if (/\baxe\b/i.test(test.name)) count.axe += 1;
      counts.set(name, count);
    }
    return counts;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** React Compiler results for one file: compiled functions and bailouts. */
async function compile(file) {
  const events = [];
  await transformAsync(await readFile(file, 'utf8'), {
    filename: file,
    babelrc: false,
    configFile: false,
    presets: [['@babel/preset-typescript', { isTSX: true, allExtensions: true }]],
    plugins: [
      [
        'babel-plugin-react-compiler',
        { target: '19', panicThreshold: 'none', logger: { logEvent: (_, event) => events.push(event) } },
      ],
    ],
  });
  return {
    compiled: events.filter(event => event.kind === 'CompileSuccess').length,
    bailouts: events.filter(event => event.kind === 'CompileError').length,
  };
}

/** React Doctor diagnostics keyed by absolute file path. */
async function doctor() {
  const dir = await mkdtemp(path.join(tmpdir(), 'sprout-doctor-'));
  const report = path.join(dir, 'report.json');
  try {
    await run(
      bin('react-doctor'),
      [pkgDir, '--json', '--json-out', report, '--no-supply-chain', '--no-telemetry', '--no-cache', '-y'],
      { cwd: root, maxBuffer: 64 * 1024 * 1024 },
    ).catch(error => {
      // React Doctor exits non-zero when it finds errors; the report is still written.
      if (error.code !== 1) throw error;
    });
    const diagnostics = new Map();
    for (const diagnostic of JSON.parse(await readFile(report, 'utf8')).diagnostics) {
      const file = path.resolve(pkgDir, diagnostic.filePath);
      const list = diagnostics.get(file) ?? [];
      list.push(diagnostic.severity);
      diagnostics.set(file, list);
    }
    return diagnostics;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function collect() {
  const { items, sourceFiles } = await buildRegistry();
  const components = items.filter(item => item.type === 'registry:ui');
  const [bytes, counts, diagnostics] = await Promise.all([
    sizes(Object.fromEntries(components.map(item => [item.name, sourceFiles.get(item.name)[0]]))),
    tests(),
    doctor(),
  ]);
  const stats = {};
  for (const item of components) {
    const files = sourceFiles.get(item.name);
    const compiler = { compiled: 0, bailouts: 0 };
    for (const file of files) {
      const result = await compile(file);
      compiler.compiled += result.compiled;
      compiler.bailouts += result.bailouts;
    }
    const findings = files.flatMap(file => diagnostics.get(file) ?? []);
    const testCount = counts.get(item.name) ?? { behavior: 0, axe: 0 };
    stats[item.name] = {
      size: bytes[item.name],
      accessibility: testCount.axe,
      behavior: testCount.behavior,
      compiler,
      doctor: {
        errors: findings.filter(severity => severity === 'error').length,
        warnings: findings.filter(severity => severity !== 'error').length,
      },
    };
  }
  return stats;
}

if (process.argv[1] === import.meta.filename) {
  const next = `${JSON.stringify(await collect(), null, 2)}\n`;
  if (process.argv.includes('--check')) {
    const current = await readFile(output, 'utf8').catch(() => '');
    if (current !== next) {
      console.error('apps/docs/src/data/component-stats.json is stale. Run `pnpm stats`.');
      process.exit(1);
    }
  } else {
    await writeFile(output, next);
    console.log(`Wrote stats for ${Object.keys(JSON.parse(next)).length} components`);
  }
}
