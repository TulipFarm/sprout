import { spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withLock } from "./lock.mjs";

export const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const boardDataDir = path.join(
  repositoryRoot,
  ".artifacts/component-board",
);

export async function command(command, args, { cwd, output = "inherit" } = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: output });
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              `${command} ${args.join(" ")} failed (${signal ?? code}).`,
            ),
          ),
    );
  });
}

async function existing(cwd, files) {
  const found = [];
  for (const file of files) {
    try {
      await access(path.join(cwd, file));
      found.push(file);
    } catch {}
  }
  return found;
}

// A scoped check runs only one component's tests, so another worker's
// half-built tests in the shared checkout cannot fail it.
export async function check(
  cwd,
  { output = "inherit", dataDir = boardDataDir, scope } = {},
) {
  await mkdir(dataDir, { recursive: true });
  await withLock(path.join(dataDir, "checks.lock"), async () => {
    await command("pnpm", ["typecheck"], { cwd, output });
    await command("pnpm", ["build"], { cwd, output });
    if (!scope) {
      await command("pnpm", ["test"], { cwd, output });
      await command("pnpm", ["test:browser"], { cwd, output });
      return;
    }
    const unit = await existing(cwd, [`tests/${scope}.test.tsx`]);
    if (unit.length) await command("pnpm", ["test", ...unit], { cwd, output });
    const browser = await existing(cwd, [`tests/browser/${scope}.spec.ts`]);
    if (browser.length)
      await command("pnpm", ["test:browser", ...browser], { cwd, output });
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const cwd = path.resolve(process.argv[2] ?? repositoryRoot);
  check(cwd, { scope: process.argv[3] }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
