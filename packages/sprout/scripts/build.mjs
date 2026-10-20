import { execFileSync } from 'node:child_process';
import { cp, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const at = relative => fileURLToPath(new URL(relative, import.meta.url));
const next = at('../dist.next/');
const old = at('../dist.old/');

// Build beside dist and swap, so the docs dev server never sees a missing
// or half-written dist while a build runs or fails.
await rm(next, { recursive: true, force: true });
execFileSync('tsc', ['-p', 'tsconfig.json', '--outDir', next], {
  cwd: at('../'),
  stdio: 'inherit',
});
await cp(at('../src/styles/'), `${next}styles/`, { recursive: true });
await cp(at('../../../LICENSE'), at('../LICENSE'));
await rm(old, { recursive: true, force: true });
await rename(at('../dist/'), old).catch(error => {
  if (error.code !== 'ENOENT') throw error;
});
await rename(next, at('../dist/'));
await rm(old, { recursive: true, force: true });
