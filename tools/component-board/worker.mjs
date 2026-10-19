import { cp, mkdir, open, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { command, check } from "./check.mjs";
import { readJson, writeJson } from "./storage.mjs";
import { withLock } from "./lock.mjs";

const ignored = new Set([
  ".git",
  ".artifacts",
  "node_modules",
  "dist",
  ".astro",
  "test-results",
  "playwright-report",
  ".DS_Store",
]);
function keep(name) {
  return (
    !ignored.has(name) &&
    !name.startsWith(".env") &&
    !name.endsWith(".tsbuildinfo")
  );
}

export async function snapshot(source, target) {
  await mkdir(target, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (!keep(entry.name)) continue;
    if (entry.isSymbolicLink())
      throw new Error(
        `Snapshot refused unexpected symbolic link: ${entry.name}`,
      );
    await cp(path.join(source, entry.name), path.join(target, entry.name), {
      recursive: true,
      filter: (file) => keep(path.basename(file)),
    });
  }
}

async function hashes(directory, relative = "") {
  const result = {};
  for (const entry of await readdir(path.join(directory, relative), {
    withFileTypes: true,
  })) {
    if (!keep(entry.name)) continue;
    const name = path.join(relative, entry.name);
    if (entry.isDirectory())
      Object.assign(result, await hashes(directory, name));
    else if (entry.isFile())
      result[name] = createHash("sha256")
        .update(await readFile(path.join(directory, name)))
        .digest("hex");
  }
  return result;
}

function constraints(job) {
  return `You are a Sprout component worker using Opus 5.5. The current user selected this component on their local board.
Build Sprout only. Cloud at ${job.cloudRoot} is READ-ONLY reference. No Cloud edits or migration.
NEVER commit, push, publish, deploy, create a PR, or rewrite git history. All current Sprout work must remain uncommitted.
Use Base UI behavior, React 19, Tailwind4/CSS-only namespaced tokens, reicon-react icons. Preserve neutral light/dark and opt-in brand.
Polished compact UI, subtle 120–180ms transitions, reduced-motion support, accessible full keyboard/focus behavior. NEVER native select dropdowns.
Docs examples must show each variant/size in the variant pairing and realistic content Cloud actually uses (never one generic label/variant for every size); check spacing, padding and overflow in screenshots.
Read existing Sprout code, package manifests, and user instructions before editing. Follow prior art, not generic demo styling.
User permits expanding the previous Sidebar-only catalog for THIS picked component. Preserve all existing Sidebar functionality and demos.
Do not implement unrelated component families. If extraction needs an unpicked public family or a user design decision, record a clear blocker rather than silently expanding scope.
NEVER run test commands directly or start unattended dev servers. All typecheck/build/tests must use this shared one-at-a-time gate:
node ${JSON.stringify(path.join(job.root, "tools/component-board/check.mjs"))} <absolute-checkout-path> ${job.card.slug}
The gate runs typecheck, build, then only tests/${job.card.slug}.test.tsx and tests/browser/${job.card.slug}.browser.test.tsx, globally serialized across workers. Name your tests with exactly those paths so the gate and the board runner run them.
Use Vitest browser-mode tests for light/dark/mobile, keyboard, and empty/loading/error states. Add screenshot baselines in tests/browser/${job.card.slug}.visual.browser.test.tsx; CI checks them on Linux. Close every owned browser/server.
Do not change tools/component-board, board state, locks, other jobs, or test tooling to bypass checks. Do not leak private source or data to third-party websites.
Do not nest more agents or workflows. Stop only when the selected component is complete or explicitly blocked.
The user alone approves DONE. You only prepare REVIEW.
COMPLETENESS GATE: the component may reach REVIEW only when it fulfils EVERY TulipFarm Cloud usage of it — every variant, size, state, prop combination, composition, and feature used by any importer. Audit every importer, not a sample. A partial extraction is not complete; record a blocker instead.`;
}

function coverageContract(job) {
  return `Every importer must appear in coverage.importers: ${JSON.stringify(job.card.importers)}
Coverage JSON shape: "coverage": { "importers": [{ "file": "<importer path>", "uses": ["<variant/size/props/composition used there>"] }], "requirements": [{ "requirement": "<variant, size, combination, or feature>", "covered": true, "evidence": "<Sprout API and docs example/test proving it>" }] }
List every distinct requirement, each covered: true with concrete evidence. If anything cannot be covered, write a blocker instead.`;
}

export function verifyCoverage(coverage, importers) {
  if (
    !coverage ||
    !Array.isArray(coverage.importers) ||
    !Array.isArray(coverage.requirements)
  )
    throw new Error("Worker did not report Cloud usage coverage.");
  const audited = new Set(
    coverage.importers
      .filter(
        (entry) => typeof entry?.file === "string" && Array.isArray(entry.uses),
      )
      .map((entry) => entry.file),
  );
  const missing = importers.filter((file) => !audited.has(file));
  if (missing.length)
    throw new Error(`Cloud usages not audited: ${missing.join(", ")}`);
  if (!coverage.requirements.length)
    throw new Error("Worker reported no Cloud usage requirements.");
  const uncovered = coverage.requirements.filter(
    (entry) =>
      entry?.covered !== true ||
      typeof entry.requirement !== "string" ||
      !entry.requirement.trim() ||
      typeof entry.evidence !== "string" ||
      !entry.evidence.trim(),
  );
  if (uncovered.length)
    throw new Error(
      `Cloud usage not fully covered: ${uncovered.map((entry) => entry?.requirement ?? "unnamed").join(", ")}`,
    );
  return coverage;
}

export function buildPrompt(job) {
  return `${constraints(job)}
Work ONLY in isolated checkout: ${job.workspace}
Component card: ${JSON.stringify({ name: job.card.name, category: job.card.category, source: job.card.source, exports: job.card.exports, dependencies: job.card.dependencies, importers: job.card.importers })}
Read the actual Cloud source at ${path.join(job.cloudRoot, job.card.source)} and EVERY importer listed above. Inventory each variant, size, state, prop combination, composition, and feature they use, and implement and demonstrate all of them. Extract reusable presentation/interaction, not Cloud business/data/auth logic. App-specific compositions should use sample adapters/data in docs.
Feedback from user: ${JSON.stringify(job.card.feedback || "None")}
Implement the component in packages/sprout, wire relevant exports/CSS/package subpaths and docs navigation. Add a working Astro example at exactly ${job.previewPath}.
Update previous Sidebar-only assertions/docs surgically for the expanded catalog; preserve meaningful existing coverage instead of deleting tests.
Run the shared check gate for this checkout, fix failures, and include visual screenshot coverage in its browser tests.
Write ${path.join(job.directory, "build-result.json")} with JSON { "summary": "<what was built, limitations>", "previewPath": "${job.previewPath}", "coverage": {...} } ONLY when implementation and checks pass and every Cloud usage is covered.
${coverageContract(job)}
If blocked, write { "blocked": "<specific reason and required decision>" } to that file and stop. Never invent success.
Do not integrate into the main checkout; the coordinator schedules that separately.`;
}

export function directPrompt(job) {
  return `${constraints(job)}
Work DIRECTLY in the MAIN Sprout checkout at ${job.root}. There is no isolated copy and no later integration phase.
The user watches the live docs dev server on http://127.0.0.1:4321 (already running; never start or stop it). Your edits appear there immediately.
Up to two other Opus workers are editing this same checkout in parallel on other components. Keep your changes scoped to this component's own files.
For shared files (package exports, index.ts, CSS entry, docs navigation, shared tests), make small surgical edits; re-read the file immediately before every edit and never overwrite or revert changes you did not make.
If a check failure is caused by another worker's in-progress component, do not modify their files; wait briefly and rerun the gate. Fix only failures caused by your component.
Preserve all existing uncommitted user changes. No wholesale replacement or deletion.
Component card: ${JSON.stringify({ name: job.card.name, category: job.card.category, source: job.card.source, exports: job.card.exports, dependencies: job.card.dependencies, importers: job.card.importers })}
Read the actual Cloud source at ${path.join(job.cloudRoot, job.card.source)} and EVERY importer listed above. Inventory each variant, size, state, prop combination, composition, and feature they use, and implement and demonstrate all of them. Extract reusable presentation/interaction, not Cloud business/data/auth logic. App-specific compositions should use sample adapters/data in docs.
Feedback from user: ${JSON.stringify(job.card.feedback || "None")}
Implement the component in packages/sprout, wire relevant exports/CSS/package subpaths and docs navigation. Add a working Astro example at exactly ${job.previewPath}.
Update previous Sidebar-only assertions/docs surgically for the expanded catalog; preserve meaningful existing coverage instead of deleting tests.
Run the shared check gate for ${job.root}, fix failures from your component, and include visual screenshot coverage in its browser tests.
Write ${path.join(job.directory, "build-result.json")} with JSON { "summary": "<what was built, limitations>", "previewPath": "${job.previewPath}", "coverage": {...} } ONLY when implementation and checks pass and every Cloud usage is covered.
${coverageContract(job)}
If blocked, write { "blocked": "<specific reason and required decision>" } to that file and stop. Never invent success.`;
}

export function integrationPrompt(job, changes) {
  return `${constraints(job)}
This is the integration phase for ${job.card.name}. Work in the MAIN Sprout checkout at ${job.root}.
The coordinator exclusively serialized this integration; other builders are isolated and may keep working.
Completed isolated source: ${job.workspace}
Exact baseline it started from: ${job.base}
Changed files: ${JSON.stringify(changes)}
Compare baseline, isolated implementation, and current main version. Bring in only this component's changes with surgical edits.
Preserve all existing uncommitted user changes and components integrated since this baseline. Never blindly copy shared files over newer versions.
Do not change files outside the listed paths unless strictly required to resolve integration/import/test conflicts from this component. No wholesale replacement or deletion.
The shared root node_modules is already installed. Only install dependencies if manifest changes or missing-dependency failures require it.
Run the shared check gate for ${job.root}; fix any new integration failures. Confirm the live dev route ${job.previewPath} can render after the build.
Re-verify in main that every Cloud usage from the isolated build-result coverage still works after integration.
Write ${path.join(job.directory, "integration-result.json")} with JSON { "summary": "<what is ready for user review>", "previewPath": "${job.previewPath}", "coverage": {...} } ONLY when done and verified.
${coverageContract(job)}
If blocked, write {"blocked":"<reason>"} instead. Do not mark the board or user approval yourself.
Any screenshots should be local only, never pushed. Close owned review processes; preserve the user's docs server on4321.`;
}

async function runAgent(job, phase, prompt, cwd) {
  const log = await open(path.join(job.directory, `${phase}.log`), "a", 0o600);
  try {
    await command(
      "copilot",
      [
        "-p",
        prompt,
        "--model",
        job.model,
        "--yolo",
        "--name",
        `Sprout ${job.card.name} ${phase}`,
        "--session-id",
        randomUUID(),
        "--disable-builtin-mcps",
        "--deny-tool=shell(git commit:*)",
        "--deny-tool=shell(git push:*)",
        "--deny-tool=shell(git reset:*)",
        "--deny-tool=shell(git clean:*)",
        "--deny-tool=shell(gh:*)",
        "--deny-tool=shell(npm publish:*)",
        "--deny-tool=shell(pnpm publish:*)",
        "--output-format",
        "text",
      ],
      { cwd, output: ["ignore", log.fd, log.fd] },
    );
  } finally {
    await log.close();
  }
}

async function verifiedResult(file, job) {
  const result = await readJson(file);
  if (typeof result.blocked === "string") throw new Error(result.blocked);
  if (
    result.previewPath !== job.previewPath ||
    typeof result.summary !== "string" ||
    !result.summary.trim()
  ) {
    throw new Error("Worker did not produce a valid completion report.");
  }
  verifyCoverage(result.coverage, job.card.importers);
  return result;
}

export async function runJob(
  job,
  {
    agent = runAgent,
    validate = check,
    checkAttempts = 3,
    retryDelay = 180_000,
    install = (cwd) =>
      command("pnpm", ["install", "--frozen-lockfile", "--prefer-offline"], {
        cwd,
      }),
  } = {},
) {
  let status = {
    phase: "preparing",
    message: "Copying current uncommitted Sprout source.",
    runnerPid: process.pid,
  };
  let writes = Promise.resolve();
  function update(next = {}) {
    status = { ...status, ...next, updatedAt: new Date().toISOString() };
    writes = writes.then(() =>
      writeJson(path.join(job.directory, "status.json"), status),
    );
    return writes;
  }
  const heartbeat = setInterval(() => {
    update().catch((error) => console.error("Worker heartbeat failed:", error));
  }, 5000);
  async function validateWithLog(cwd, filename, scope) {
    const log = await open(path.join(job.directory, filename), "a", 0o600);
    try {
      await validate(cwd, {
        dataDir: job.dataDir,
        output: ["ignore", log.fd, log.fd],
        scope,
      });
    } finally {
      await log.close();
    }
  }
  // Parallel workers can briefly leave main uncompilable; let them settle.
  async function validateDirect() {
    for (let attempt = 1; ; attempt++) {
      try {
        return await validateWithLog(job.root, "checks.log", job.card.slug);
      } catch (error) {
        if (attempt >= checkAttempts) throw error;
        await update({
          message: `Shared checks failed (attempt ${attempt}). Retrying after other workers settle.`,
        });
        await sleep(retryDelay);
      }
    }
  }
  try {
    await update();
    if (job.direct) {
      await update({
        phase: "building",
        message: "Opus 5.5 is building directly in the main Sprout checkout.",
      });
      await agent(job, "build", directPrompt(job), job.root);
      const result = await verifiedResult(
        path.join(job.directory, "build-result.json"),
        job,
      );
      await update({
        phase: "validating",
        message: "Waiting for / running the shared checks gate.",
      });
      await validateDirect();
      const route = path.join(
        job.root,
        "apps/docs/dist",
        job.previewPath,
        "index.html",
      );
      if (!(await stat(route)).isFile())
        throw new Error("Built preview route is missing.");
      await update({
        phase: "review",
        message: "Built in main and verified. Ready for your review.",
        result,
      });
      return status;
    }
    await withLock(path.join(job.dataDir, "integration.lock"), async () => {
      await snapshot(job.root, job.base);
      await snapshot(job.base, job.workspace);
    });
    await command("git", [
      "init",
      "--quiet",
      "--initial-branch=component-work",
      job.workspace,
    ]);
    await install(job.workspace);
    await update({
      phase: "building",
      message: "Opus 5.5 is building the isolated component.",
    });
    await agent(job, "build", buildPrompt(job), job.workspace);
    await verifiedResult(path.join(job.directory, "build-result.json"), job);
    await update({
      phase: "validating",
      message: "Waiting for / running the shared checks gate.",
    });
    await validateWithLog(job.workspace, "checks.log");
    const baseHashes = await hashes(job.base);
    const workHashes = await hashes(job.workspace);
    const changes = [
      ...new Set([...Object.keys(baseHashes), ...Object.keys(workHashes)]),
    ].filter((file) => baseHashes[file] !== workHashes[file]);
    if (!changes.length)
      throw new Error("Worker reported completion without source changes.");
    if (changes.some((file) => file.startsWith("tools/component-board/")))
      throw new Error("Worker changed the board tooling. Integration refused.");
    await writeJson(path.join(job.directory, "changes.json"), changes);
    await update({
      phase: "waiting-integration",
      message: "Isolated checks passed. Waiting for serial integration.",
    });
    for (;;) {
      try {
        await readJson(path.join(job.directory, "integrate.json"));
        break;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      await sleep(500);
    }
    await withLock(path.join(job.dataDir, "integration.lock"), async () => {
      await update({
        phase: "integrating",
        message: "Opus 5.5 is integrating without overwriting other work.",
      });
      await agent(job, "integrate", integrationPrompt(job, changes), job.root);
      const result = await verifiedResult(
        path.join(job.directory, "integration-result.json"),
        job,
      );
      await validateWithLog(job.root, "integration-checks.log");
      const route = path.join(
        job.root,
        "apps/docs/dist",
        job.previewPath,
        "index.html",
      );
      if (!(await stat(route)).isFile())
        throw new Error("Built preview route is missing.");
      await update({
        phase: "review",
        message: "Integrated and verified. Ready for your review.",
        result,
      });
    });
  } catch (error) {
    console.error(error);
    await update({ phase: "error", message: error.message });
  } finally {
    clearInterval(heartbeat);
    await writes;
  }
  return status;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  readJson(process.argv[2])
    .then(runJob)
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
