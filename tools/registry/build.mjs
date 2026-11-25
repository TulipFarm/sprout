// Builds the shadcn registry: one item per component, served from the docs site at /r/<name>.json.
// `npx shadcn add https://sprout.tulipfarm.ai/r/button.json` copies the component source into the
// app, rewrites its imports to the app's aliases, installs its npm dependencies, pulls in the
// Sprout components it uses, and merges its CSS into the app's Tailwind stylesheet.
import { readdirSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Features, transform } from 'lightningcss';
import postcss from 'postcss';

const root = path.resolve(import.meta.dirname, '../..');
const pkgDir = path.join(root, 'packages/sprout');
const src = path.join(pkgDir, 'src');
const styles = path.join(src, 'styles');
const iconsBarrel = path.join(src, 'components/icons.tsx');

export const DEFAULT_BASE_URL = 'https://sprout.tulipfarm.ai/r';
export const BASE_ITEM = 'sprout-base';
const SCHEMA = 'https://ui.shadcn.com/schema/registry-item.json';
const IGNORED_PACKAGES = new Set(['react', 'react-dom']);

const posix = file => file.split(path.sep).join('/');
const toKebab = name => name.toLowerCase().replaceAll(' ', '-');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(entry => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)])),
  );
  return files.flat().filter(file => /\.tsx?$/.test(file));
}

/** Where a package source file lands in a shadcn app, and the alias import that reaches it. */
// shadcn rewrites an import to whichever installed file shares its basename, so every target
// needs a unique basename. Icons gain an -icon suffix and internals named like a component -core.
const componentNames = new Set(
  readdirSync(path.join(src, 'components'))
    .filter(name => /\.tsx?$/.test(name))
    .map(name => name.replace(/\.tsx?$/, '')),
);

export function placement(file) {
  const rel = posix(path.relative(src, file));
  let bare = rel.replace(/\.tsx?$/, '');
  const ext = path.extname(rel);
  if (rel.startsWith('components/icons/')) {
    const sub = bare.slice('components/'.length).replace(/(?<!-icon)$/, '-icon');
    return { kind: 'lib', target: `lib/sprout/${sub}${ext}`, specifier: `@/lib/sprout/${sub}` };
  }
  if (!rel.startsWith('components/') && componentNames.has(path.basename(bare))) bare += '-core';
  if (rel.startsWith('components/')) {
    const name = bare.slice('components/'.length);
    return {
      kind: 'component',
      item: name,
      target: `components/ui/${name}${ext}`,
      specifier: `@/components/ui/${name}`,
    };
  }
  if (rel === 'a2ui/surface.tsx') {
    return {
      kind: 'component',
      item: 'a2ui-surface',
      target: 'components/ui/a2ui-surface.tsx',
      specifier: '@/components/ui/a2ui-surface',
    };
  }
  if (rel.startsWith('a2ui/')) {
    return { kind: 'lib', target: `lib/sprout/${bare}${ext}`, specifier: `@/lib/sprout/${bare}` };
  }
  if (rel === 'internal/classes.ts') {
    return { kind: 'base', target: 'lib/sprout/classes.ts', specifier: '@/lib/sprout/classes' };
  }
  if (rel.startsWith('internal/')) {
    const sub = bare.slice('internal/'.length);
    return { kind: 'lib', target: `lib/sprout/${sub}${ext}`, specifier: `@/lib/sprout/${sub}` };
  }
  throw new Error(`No registry placement for ${rel}`);
}

// Static imports, re-exports, side-effect imports, and dynamic import() calls.
const IMPORT_RE = /(\b(?:import|export)\s+(type\s+)?(?:([\w*{}\s,$]+?)\s+from\s+)?|\bimport\s*\(\s*)(['"])([^'"]+)\4/g;

function resolveRelative(from, specifier, known) {
  const base = path.resolve(path.dirname(from), specifier.replace(/\.js$/, ''));
  for (const candidate of [`${base}.tsx`, `${base}.ts`, path.join(base, 'index.ts')]) {
    if (known.has(candidate)) return candidate;
  }
  throw new Error(`Cannot resolve ${specifier} from ${path.relative(root, from)}`);
}

function packageName(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** Maps every name the icons barrel exports to the module that defines it. */
async function readIconBarrel() {
  const barrel = await readFile(iconsBarrel, 'utf8');
  const names = new Map();
  for (const match of barrel.matchAll(/export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+'\.\/icons\/([\w-]+)\.js'/g)) {
    for (const name of match[1].split(',')) {
      const clean = name.replace(/^\s*type\s+/, '').trim();
      if (clean) names.set(clean, path.join(src, 'components/icons', `${match[2]}.tsx`));
    }
  }
  return names;
}

/** Splits `import { A, B } from './icons.js'` into one import per icon module. */
function splitIconImport(clause, iconFiles) {
  const byFile = new Map();
  for (const name of clause.replace(/[{}]/g, '').split(',')) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const exported = trimmed.replace(/^type\s+/, '').split(/\s+as\s+/)[0];
    const file = iconFiles.get(exported);
    if (!file) throw new Error(`Unknown icon export ${exported}`);
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push(trimmed);
  }
  return byFile;
}

/** Rewrites a source file's relative imports to app aliases and lists what it imports. */
function analyze(file, content, known, iconFiles) {
  const imports = new Set();
  const packages = new Set();
  const rewritten = content.replace(IMPORT_RE, (whole, head, typeKeyword, clause, quote, specifier) => {
    if (!specifier.startsWith('.')) {
      if (!specifier.startsWith('node:')) packages.add(packageName(specifier));
      return whole;
    }
    const target = resolveRelative(file, specifier, known);
    if (target === iconsBarrel && file !== iconsBarrel && clause?.includes('{')) {
      const keyword = head.trimStart().startsWith('export') ? 'export' : 'import';
      return [...splitIconImport(clause, iconFiles)]
        .map(([iconFile, names]) => {
          imports.add(iconFile);
          const from = `${quote}${placement(iconFile).specifier}${quote}`;
          return `${keyword} ${typeKeyword ? 'type ' : ''}{ ${names.join(', ')} } from ${from}`;
        })
        .join(';\n');
    }
    imports.add(target);
    return `${head}${quote}${placement(target).specifier}${quote}`;
  });
  return { content: rewritten, imports, packages };
}

/** Converts a stylesheet into the nested object shadcn merges into the app's Tailwind CSS. */
export function cssToObject(css, filename) {
  // shadcn writes nested at-rules as siblings of their rule, so nesting is flattened first.
  const { code } = transform({ filename, code: Buffer.from(css), include: Features.Nesting });
  const toObject = container => {
    const object = {};
    container.each(node => {
      if (node.type === 'comment') return;
      if (node.type === 'decl') {
        object[node.prop] = `${node.value}${node.important ? ' !important' : ''}`;
        return;
      }
      let key = node.type === 'rule' ? node.selector : `@${node.name}${node.params ? ` ${node.params}` : ''}`;
      // Object keys are unique, but a repeated selector must keep its place in the cascade.
      // :is() around one selector matches the same elements with the same specificity.
      while (node.type === 'rule' && key in object) {
        if (/::|:(before|after)\b/.test(key)) throw new Error(`${filename}: cannot repeat ${key}`);
        key = postcss.list
          .comma(key)
          .map(selector => `:is(${selector})`)
          .join(', ');
      }
      const value = toObject(node);
      if (node.type === 'atrule' && key in object) mergeCss(object[key], value);
      else object[key] = value;
    });
    return object;
  };
  return toObject(postcss.parse(code.toString()));
}

// shadcn treats declarations inside a top-level at-rule as nested rules, so it cannot write
// @font-face. Theme fallback faces only tune metrics; the font stack still works without them.
function withoutFontFaces(css) {
  return Object.fromEntries(Object.entries(css).filter(([key]) => !key.startsWith('@font-face')));
}

/** Fails on a top-level at-rule with declarations, which shadcn would write as broken CSS. */
function assertWritableCss(name, css = {}) {
  for (const [key, value] of Object.entries(css)) {
    if (!key.startsWith('@') || /^@(layer|media|supports|container|keyframes|utility)\b/.test(key)) continue;
    if (Object.values(value).some(entry => typeof entry === 'string')) {
      throw new Error(`${name}: shadcn cannot install the declarations in ${key}`);
    }
  }
}

function mergeCss(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'object' && typeof target[key] === 'object') mergeCss(target[key], value);
    else target[key] = value;
  }
  return target;
}

/** The classes a stylesheet styles directly: those in the leading compound of each selector. */
function definedClasses(css) {
  const classes = new Set();
  postcss.parse(css).walkRules(rule => {
    for (const selector of rule.selectors) {
      const [compound] = selector.trim().split(/[\s>+~]/);
      if (!compound.startsWith('.sprout-')) continue;
      for (const match of compound.matchAll(/\.(sprout-[\w-]+)/g)) classes.add(match[1]);
    }
  });
  return classes;
}

export const referencedClasses = content =>
  new Set([...content.matchAll(/\bsprout-[a-z0-9]+(?:-[a-z0-9]+)*/g)].map(match => match[0]));

async function readNav() {
  const { componentGroups } = await import(path.join(root, 'apps/docs/src/data/nav.ts'));
  const nav = new Map();
  for (const group of componentGroups) {
    for (const item of group.items) {
      nav.set(item.href.split('/').filter(Boolean).at(-1), { ...item, category: group.title });
    }
  }
  return nav;
}

function baseCss(css) {
  const themeBlock = /@theme\s+inline\s*\{([^}]*)\}/;
  const theme = {};
  for (const match of css.match(themeBlock)[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    theme[match[1]] = match[2].trim();
  }
  // An app's own source files are already scanned, so the package's @source is dropped.
  const rest = css.replace(themeBlock, '').replace(/@source[^;]*;/g, '');
  return { css: cssToObject(rest, 'base.css'), theme };
}

export async function buildRegistry({ baseUrl = DEFAULT_BASE_URL, outDir } = {}) {
  const pkg = JSON.parse(await readFile(path.join(pkgDir, 'package.json'), 'utf8'));
  const versions = { ...pkg.peerDependencies, ...pkg.dependencies };
  // The root barrel re-exports everything; a shadcn app imports each component directly.
  const files = (await walk(src)).filter(file => file !== path.join(src, 'index.ts'));
  const known = new Set(files);
  const basenames = new Map();
  for (const file of files) {
    const base = path.basename(placement(file).target).replace(/\.tsx?$/, '');
    if (basenames.has(base)) throw new Error(`${base} is the basename of ${basenames.get(base)} and ${file}`);
    basenames.set(base, file);
  }
  const iconFiles = await readIconBarrel();
  const nav = await readNav();
  const url = name => `${baseUrl}/${name}.json`;
  const dependency = name => {
    const version = versions[name];
    if (!version) throw new Error(`${name} is imported but not declared in packages/sprout/package.json`);
    return `${name}@${version}`;
  };

  const sources = new Map();
  for (const file of files) {
    sources.set(file, analyze(file, await readFile(file, 'utf8'), known, iconFiles));
  }

  const cssSources = new Map();
  for (const name of await readdir(styles)) {
    if (!name.endsWith('.css') || /^(index|base)\.css$/.test(name)) continue;
    const css = await readFile(path.join(styles, name), 'utf8');
    cssSources.set(name.replace(/\.css$/, ''), { css, classes: definedClasses(css) });
  }

  const itemOf = new Map(
    files.filter(file => placement(file).kind === 'component').map(file => [placement(file).item, file]),
  );

  // A component carries its own module and every internal module it reaches. Other components
  // it reaches become registry dependencies.
  const closure = entry => {
    const own = new Set([entry]);
    const components = new Set();
    const packages = new Set();
    const queue = [entry];
    while (queue.length) {
      const info = sources.get(queue.pop());
      for (const name of info.packages) packages.add(name);
      for (const next of info.imports) {
        const place = placement(next);
        if (place.kind === 'base' || next === entry) continue;
        if (place.kind === 'component') components.add(place.item);
        else if (!own.has(next)) {
          own.add(next);
          queue.push(next);
        }
      }
    }
    return { own, components, packages };
  };
  const graph = new Map([...itemOf].map(([name, file]) => [name, closure(file)]));
  const transitive = name => {
    const seen = new Set();
    const visit = current => {
      for (const dep of graph.get(current).components) {
        if (!seen.has(dep)) {
          seen.add(dep);
          visit(dep);
        }
      }
    };
    visit(name);
    return seen;
  };

  // A class belongs to the sheet named after its prefix (`sprout-board-card` to board.css).
  // Classes without one belong to every sheet that styles them first in a selector.
  const owners = new Map();
  for (const [sheet, { classes }] of cssSources) {
    for (const className of classes) {
      if (!owners.has(className)) owners.set(className, new Set());
      owners.get(className).add(sheet);
    }
  }
  for (const [className, sheets] of owners) {
    const named = [...sheets]
      .filter(sheet => className === `sprout-${sheet}` || className.startsWith(`sprout-${sheet}-`))
      .sort((a, b) => b.length - a.length);
    if (named.length) owners.set(className, new Set([named[0]]));
  }

  // An item ships its own stylesheet plus any sheet whose classes its files use, unless a
  // component it depends on already ships that sheet.
  const sheetsOf = new Map();
  for (const [name, { own }] of graph) {
    const used = new Set([...own].flatMap(file => [...referencedClasses(sources.get(file).content)]));
    const sheets = new Set();
    const ownSheet = name === 'a2ui-surface' ? 'a2ui' : name;
    if (cssSources.has(ownSheet)) sheets.add(ownSheet);
    for (const className of used) {
      for (const sheet of owners.get(className) ?? []) sheets.add(sheet);
    }
    sheetsOf.set(name, sheets);
  }

  const items = [];
  const sourceFiles = new Map();
  for (const [name, file] of [...itemOf].sort(([a], [b]) => a.localeCompare(b))) {
    const { own, components, packages } = graph.get(name);
    sourceFiles.set(name, [file, ...[...own].filter(other => other !== file).sort()]);
    const inherited = new Set([...transitive(name)].flatMap(dep => [...sheetsOf.get(dep)]));
    const css = {};
    for (const sheet of sheetsOf.get(name)) {
      if (!inherited.has(sheet)) mergeCss(css, cssToObject(cssSources.get(sheet).css, `${sheet}.css`));
    }
    // shadcn moves top-level keyframes into @theme, where Tailwind drops any that no
    // --animate-* variable uses. Inside a layer they are kept as written.
    for (const key of Object.keys(css).filter(key => key.startsWith('@keyframes'))) {
      css['@layer components'] ??= {};
      css['@layer components'][key] = css[key];
      delete css[key];
    }
    const meta = nav.get(name);
    items.push({
      $schema: SCHEMA,
      name,
      type: 'registry:ui',
      title: meta?.name ?? name,
      description: meta?.description ?? `Sprout ${name}.`,
      ...(meta && { categories: [toKebab(meta.category)] }),
      dependencies: [...packages]
        .filter(name => !IGNORED_PACKAGES.has(name))
        .sort()
        .map(dependency),
      registryDependencies: [url(BASE_ITEM), ...[...components].sort().map(url)],
      files: sourceFiles.get(name).map(source => {
        const place = placement(source);
        return {
          path: `registry/sprout/${place.target}`,
          type: place.kind === 'component' ? 'registry:ui' : 'registry:lib',
          target: place.target,
          content: sources.get(source).content,
        };
      }),
      ...(Object.keys(css).length && { css }),
      ...(meta && { docs: `Docs and examples: https://sprout.tulipfarm.ai${meta.href}` }),
      meta: { source: path.relative(root, sourceFiles.get(name)[0]).split(path.sep).join('/') },
    });
  }

  const base = baseCss(await readFile(path.join(styles, 'base.css'), 'utf8'));
  items.unshift({
    $schema: SCHEMA,
    name: BASE_ITEM,
    type: 'registry:lib',
    title: 'Sprout base',
    description: 'Sprout tokens, Tailwind theme utilities, and the cn() helper every component uses.',
    dependencies: ['clsx', 'tailwind-merge'].map(dependency),
    files: [
      {
        path: 'registry/sprout/lib/sprout/classes.ts',
        type: 'registry:lib',
        target: 'lib/sprout/classes.ts',
        content: sources.get(path.join(src, 'internal/classes.ts')).content,
      },
    ],
    cssVars: { theme: base.theme },
    css: base.css,
    docs: 'Installed with every Sprout component. Theme by overriding --sprout-* variables.',
  });

  for (const theme of (await readdir(path.join(styles, 'themes'))).filter(name => name.endsWith('.css')).sort()) {
    const themeName = theme.replace(/\.css$/, '');
    items.push({
      $schema: SCHEMA,
      name: `theme-${themeName}`,
      type: 'registry:theme',
      title: `${themeName[0].toUpperCase()}${themeName.slice(1)} theme`,
      description: `Sprout's ${themeName} preset. Set data-sprout-theme="${themeName}" on <html> or any element.`,
      registryDependencies: [url(BASE_ITEM)],
      css: withoutFontFaces(cssToObject(await readFile(path.join(styles, 'themes', theme), 'utf8'), theme)),
    });
  }

  items.push({
    $schema: SCHEMA,
    name: 'sprout',
    type: 'registry:style',
    title: 'Sprout (npm package)',
    description: "Install Sprout's npm package and CSS-first Tailwind theme. No component source is copied.",
    dependencies: [`@tulipfarm/sprout@^${pkg.version}`],
    css: { '@import "@tulipfarm/sprout/styles.css"': {} },
    docs: 'Sprout requires React 19 and Tailwind CSS 4. Import components from @tulipfarm/sprout. Customize --sprout-* variables or Tailwind @theme values in your CSS. Components remain owned by the npm package.',
  });

  for (const item of items) assertWritableCss(item.name, item.css);

  const index = {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'sprout',
    homepage: 'https://sprout.tulipfarm.ai',
    items: items.map(({ $schema, files, css, cssVars, ...item }) => ({
      ...item,
      ...(files && { files: files.map(({ content, ...rest }) => rest) }),
    })),
  };

  if (outDir) {
    await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });
    await Promise.all(
      items.map(item => writeFile(path.join(outDir, `${item.name}.json`), `${JSON.stringify(item, null, 2)}\n`)),
    );
    await writeFile(path.join(outDir, 'registry.json'), `${JSON.stringify(index, null, 2)}\n`);
  }
  return { items, index, sourceFiles };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outDir = path.join(root, 'apps/docs/public/r');
  const { items } = await buildRegistry({ baseUrl: process.env.SPROUT_REGISTRY_URL ?? DEFAULT_BASE_URL, outDir });
  console.log(`Wrote ${items.length} registry items to ${path.relative(root, outDir)}`);
}
