import { readFileSync, readdirSync, realpathSync } from 'node:fs';

const rootName = specifier =>
  specifier
    .split('/')
    .slice(0, specifier.startsWith('@') ? 2 : 1)
    .join('/');

const docsDir = new URL('./', import.meta.url);
const sproutDir = new URL('../../packages/sprout/', import.meta.url);

function packageCopy(fromDir, name) {
  try {
    return realpathSync(new URL(`node_modules/${name}`, fromDir));
  } catch {
    return undefined;
  }
}

// Docs loads Sprout's dist through /@fs, so its bare imports such as `three` resolve as
// plain ids and Vite never matches a nested `@tulipfarm/sprout > three` entry. A late
// discovery re-optimizes and serves two React copies, so docs must share every package.
function sproutSpecifier(specifier) {
  const name = rootName(specifier);
  const shared = packageCopy(docsDir, name);
  if (!shared || shared !== packageCopy(sproutDir, name))
    throw new Error(`apps/docs must depend on ${name} at Sprout's version so Vite pre-bundles the same copy.`);
  return specifier;
}

function bareImports(packageDir, toId) {
  const { dependencies = {} } = JSON.parse(readFileSync(new URL('package.json', packageDir), 'utf8'));
  const source = new URL('src/', packageDir);
  const found = [];
  for (const file of readdirSync(source, { recursive: true })) {
    if (!/\.(tsx?|astro)$/.test(file)) continue;
    const text = readFileSync(new URL(file, source), 'utf8');
    const imports = text.matchAll(
      /^import\s+(?!type\b)[^;]*?from\s+["']([^."'][^"']*)["']|\bimport\(\s*["']([^."'][^"']*)["']\s*\)/gm,
    );
    for (const [, staticSpecifier, dynamicSpecifier] of imports) {
      const specifier = staticSpecifier ?? dynamicSpecifier;
      const name = rootName(specifier);
      if (name in dependencies && name !== '@tulipfarm/sprout') found.push(toId(specifier));
    }
  }
  return found;
}

// Component work keeps importing new icons and Base UI parts. Pre-bundling their whole
// export map keeps the list stable, so an edit never forces a mid-session re-optimize.
const wholeSurface = ['@base-ui/react', 'reicon-react'];

function exportedEntries(name) {
  const { exports } = JSON.parse(readFileSync(`${packageCopy(sproutDir, name)}/package.json`, 'utf8'));
  return Object.keys(exports)
    .filter(key => key !== './package.json' && !/\.(css|json)$/.test(key))
    .map(key => (key === '.' ? name : `${name}/${key.slice(2)}`));
}

// Vite otherwise discovers these lazily, re-optimizes, and answers islands already
// loading with 504 Outdated Optimize Dep, leaving stale transforms until restart.
export function docsOptimizedDeps() {
  const scanned = [...bareImports(sproutDir, sproutSpecifier), ...bareImports(docsDir, specifier => specifier)].filter(
    specifier => !wholeSurface.includes(rootName(specifier)),
  );
  return [...new Set([...scanned, ...wholeSurface.flatMap(name => exportedEntries(sproutSpecifier(name)))])].sort();
}
