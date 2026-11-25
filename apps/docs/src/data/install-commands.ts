import type { InstallInfo } from './registry';

export const managers = ['pnpm', 'npm', 'yarn', 'bun'] as const;
export type Manager = (typeof managers)[number];

/** One shell command per package manager, with its highlighted HTML. */
export type CommandSet = Record<Manager, { text: string; html: string }>;

const runner: Record<Manager, string> = {
  pnpm: 'pnpm dlx',
  npm: 'npx',
  yarn: 'yarn dlx',
  bun: 'bunx --bun',
};
const adder: Record<Manager, string> = {
  pnpm: 'pnpm add',
  npm: 'npm install',
  yarn: 'yarn add',
  bun: 'bun add',
};

export function installCommands(info: InstallInfo, registryUrl: string) {
  const packages = info.dependencies.map(dep => dep.replace(/(.)@[^@]+$/, '$1')).join(' ');
  const each = (command: (manager: Manager) => string) =>
    Object.fromEntries(managers.map(manager => [manager, command(manager)])) as Record<Manager, string>;
  return {
    cli: each(manager => `${runner[manager]} shadcn@latest add ${registryUrl}/${info.name}.json`),
    deps: each(manager => `${adder[manager]} ${packages}`),
    npm: each(manager => `${adder[manager]} @tulipfarm/sprout`),
  };
}
