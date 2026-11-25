import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { CssObject } from './css-text';
import stats from './component-stats.json';
import { allPages } from './nav';

export const registryUrl = 'https://sprout.tulipfarm.ai/r';

export interface ComponentStats {
  size: { own: number; total: number };
  accessibility: number;
  behavior: number;
  compiler: { compiled: number; bailouts: number };
  doctor: { errors: number; warnings: number };
}

export interface InstallFile {
  target: string;
  bytes: number;
}

export interface InstallInfo {
  name: string;
  title: string;
  dependencies: string[];
  requires: { name: string; title: string; href?: string }[];
  files: InstallFile[];
  importLine: string;
  packageImport: string;
  source?: string;
}

interface RegistryItem {
  name: string;
  title: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files?: { target: string; content: string }[];
  css?: CssObject;
  meta?: { source?: string };
}

// The docs scripts run tools/registry/build.mjs first, so the JSON is fresh in dev and build.
export const registryItem = (name: string): RegistryItem =>
  JSON.parse(readFileSync(path.join(process.cwd(), 'public/r', `${name}.json`), 'utf8'));

const exportName = (content: string) => content.match(/export (?:function|const) ([A-Z]\w*)/)?.[1];

export function componentStats(name: string): ComponentStats | undefined {
  return (stats as Record<string, ComponentStats>)[name];
}

export function installInfo(name: string): InstallInfo {
  const item = registryItem(name);
  const base = registryItem('sprout-base');
  const main = item.files?.[0];
  const binding = (main && exportName(main.content)) ?? item.title.replace(/\W/g, '');
  const requires = (item.registryDependencies ?? []).map(url => {
    const dep = path.basename(url, '.json');
    const page = allPages.find(entry => entry.href === `/components/${dep}/`);
    return {
      name: dep,
      title: dep === 'sprout-base' ? 'Sprout base' : (page?.name ?? registryItem(dep).title),
      href: page?.href,
    };
  });
  return {
    name,
    title: item.title,
    dependencies: [...new Set([...(base.dependencies ?? []), ...(item.dependencies ?? [])])],
    requires,
    files: (item.files ?? []).map(file => ({ target: file.target, bytes: file.content.length })),
    importLine: `import { ${binding} } from "@/components/ui/${name}";`,
    source: item.meta?.source && `https://github.com/TulipFarm/sprout/blob/main/${item.meta.source}`,
    packageImport: `import { ${binding} } from "@tulipfarm/sprout/${name === 'a2ui-surface' ? 'a2ui' : name}";`,
  };
}
