import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  access,
  utimes,
  rename,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { Board } from "./board.mjs";
import { createBoardServer } from "./server.mjs";
import { buildInventory } from "./inventory.mjs";
import { runJob, snapshot, buildPrompt, verifyCoverage } from "./worker.mjs";
import { readJson, writeJson } from "./storage.mjs";
import { withLock } from "./lock.mjs";

function inventory() {
  return {
    generatedAt: new Date().toISOString(),
    sourceRoot: "/local/cloud",
    cards: [
      "button",
      "card",
      "dialog",
      "input",
      "select",
      "sidebar",
      "tabs",
    ].map((name) => ({
      id: name,
      slug: name,
      name,
      category: "Primitives",
      source: `apps/web/src/components/ui/${name}.tsx`,
      exports: [name],
      importers: ["apps/web/src/example.tsx"],
      usageCount: 1,
      dependencies: [],
    })),
  };
}

async function temporary(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sprout-board-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function dispatch() {
  const statuses = new Map();
  const started = [];
  const integrated = [];
  return {
    statuses,
    started,
    integrated,
    async start(card) {
      started.push(card);
      statuses.set(card.jobId, { phase: "building", message: "Building" });
      return { workspaceId: `test-${card.id}`, paneId: `test-${card.id}:p1` };
    },
    async status(id) {
      return statuses.get(id);
    },
    async integrate(id) {
      integrated.push(id);
    },
    async log() {
      return "Test worker log";
    },
  };
}

async function fixture(t) {
  const dataDir = await temporary(t);
  const dispatcher = dispatch();
  const board = await new Board({
    dataDir,
    inventory: inventory(),
    dispatcher,
  }).init();
  const move = (id, state, feedback) =>
    board.move(id, { state, revision: board.data.revision, feedback });
  return { dataDir, dispatcher, board, move };
}

test("four states, explicit review approval, PICK limit and persisted feedback", async (t) => {
  const { board, move, dataDir, dispatcher } = await fixture(t);
  assert.equal(board.card("sidebar").state, "REVIEW");
  await assert.rejects(move("button", "DONE"), /Review/);
  await assert.rejects(move("button", "REVIEW"), /worker/);
  for (const id of ["button", "card", "dialog", "input", "select"])
    await move(id, "PICK", "Keep it neutral.");
  await assert.rejects(move("tabs", "PICK"), /Only 5 components/);
  await move("card", "TODO");
  await move("tabs", "PICK");
  await move("sidebar", "DONE");
  const restored = await new Board({
    dataDir,
    inventory: inventory(),
    dispatcher,
  }).init();
  assert.equal(restored.card("button").feedback, "Keep it neutral.");
  assert.equal(restored.card("sidebar").state, "DONE");
  assert.equal(restored.card("tabs").state, "PICK");
});

test("a stored card merged into another component is dropped, not kept as missing", async (t) => {
  const { dataDir, dispatcher } = await fixture(t);
  const stored = await readJson(path.join(dataDir, "state.json"));
  stored.cards.push(
    { ...stored.cards[0], id: "action-button", slug: "action-button" },
    { ...stored.cards[0], id: "gone", slug: "gone" },
  );
  await writeJson(path.join(dataDir, "state.json"), stored);
  const restored = await new Board({
    dataDir,
    inventory: inventory(),
    dispatcher,
  }).init();
  assert.deepEqual(
    restored.data.cards
      .filter((card) => card.sourceMissing)
      .map((card) => card.id),
    ["gone"],
  );
});

test("stale and concurrent requests cannot overwrite the board or overfill PICK", async (t) => {
  const { board, move } = await fixture(t);
  for (const id of ["button", "card", "dialog", "input"])
    await move(id, "PICK");
  const revision = board.data.revision;
  const results = await Promise.allSettled([
    board.move("select", { state: "PICK", revision }),
    board.move("tabs", { state: "PICK", revision }),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    board.data.cards.filter((card) => card.state === "PICK").length,
    5,
  );
  assert.equal(
    results.find((result) => result.status === "rejected").reason.status,
    409,
  );
});

test("three isolated builds run, integration is serial, DONE is never automatic", async (t) => {
  const { board, dispatcher, move } = await fixture(t);
  for (const id of ["button", "card", "dialog"]) await move(id, "PICK");
  await board.tick();
  assert.equal(dispatcher.started.length, 3);
  assert.equal(new Set(dispatcher.started.map((card) => card.jobId)).size, 3);
  await board.tick();
  await assert.rejects(move("button", "TODO"), /active/);
  for (const card of dispatcher.started)
    dispatcher.statuses.set(card.jobId, {
      phase: "waiting-integration",
      message: "Ready",
    });
  await board.tick();
  assert.equal(dispatcher.integrated.length, 1);
  await board.tick();
  assert.equal(
    dispatcher.integrated.length,
    1,
    "stale worker heartbeat must not grant another integration",
  );
  dispatcher.statuses.set(board.card("button").jobId, {
    phase: "review",
    result: { summary: "Built button", previewPath: "/components/button/" },
  });
  await board.tick();
  assert.equal(board.card("button").state, "REVIEW");
  assert.equal(dispatcher.integrated.length, 2);
  assert.equal(
    board.card("button").previewUrl,
    "http://127.0.0.1:4321/components/button/",
  );
  await move("button", "DONE");
  assert.equal(board.card("button").state, "DONE");
});

test("pause, worker failure and explicit retry preserve errors and work", async (t) => {
  const { board, dispatcher, move } = await fixture(t);
  await board.queue({ paused: true, revision: board.data.revision });
  await move("button", "PICK");
  await board.tick();
  assert.equal(dispatcher.started.length, 0);
  await board.queue({ paused: false, revision: board.data.revision });
  await board.tick();
  const first = board.card("button").jobId;
  dispatcher.statuses.set(first, {
    phase: "error",
    message: "A dependency is missing.",
  });
  await board.tick();
  assert.equal(board.card("button").state, "PICK");
  assert.equal(board.card("button").error, "A dependency is missing.");
  assert.equal(board.data.paused, true);
  await board.retry("button", {
    revision: board.data.revision,
    feedback: "Try again.",
  });
  await board.queue({ paused: false, revision: board.data.revision });
  await board.tick();
  assert.notEqual(board.card("button").jobId, first);
});

test("API rejects cross-site requests, stale tokens, bad JSON and forged DONE; streams live state", async (t) => {
  const app = await createBoardServer({
    dataDir: await temporary(t),
    inventory: inventory(),
    dispatcher: dispatch(),
    polling: false,
  });
  const base = await app.listen(0);
  t.after(() => app.close());
  const headers = { "Content-Type": "application/json" };
  assert.equal(
    (
      await fetch(`${base}/api/board`, {
        headers: { Origin: "https://elsewhere.example" },
      })
    ).status,
    403,
  );
  const forgedHostStatus = await new Promise((resolve, reject) => {
    http
      .get(
        `${base}/api/board`,
        { headers: { Host: "evil.example" } },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      )
      .on("error", reject);
  });
  assert.equal(forgedHostStatus, 403);
  assert.equal(
    (await fetch(`${base}/api/queue`, { method: "POST", headers, body: "{}" }))
      .status,
    403,
  );
  const state = await (await fetch(`${base}/api/board`)).json();
  headers["X-Board-Token"] = state.csrfToken;
  assert.equal(
    (
      await fetch(`${base}/api/queue`, {
        method: "POST",
        headers,
        body: "not json",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(`${base}/api/cards/button/move`, {
        method: "POST",
        headers,
        body: JSON.stringify({ state: "DONE", revision: state.revision }),
      })
    ).status,
    400,
  );
  const abort = new AbortController();
  const response = await fetch(`${base}/api/events`, { signal: abort.signal });
  const reader = response.body.getReader();
  const initial = new TextDecoder().decode((await reader.read()).value);
  assert.match(initial, /event: board/);
  await fetch(`${base}/api/cards/button/move`, {
    method: "POST",
    headers,
    body: JSON.stringify({ state: "PICK", revision: state.revision }),
  });
  const update = new TextDecoder().decode((await reader.read()).value);
  assert.match(update, /"state":"PICK"/);
  abort.abort();
});

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

function rawGet(base, requestPath) {
  return new Promise((resolve, reject) => {
    const { hostname, port } = new URL(base);
    http
      .get({ hostname, port, path: requestPath }, (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            status: response.statusCode,
            type: response.headers["content-type"],
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      })
      .on("error", reject);
  });
}

test("serves card screenshots, blocks traversal, and streams screenshot changes", async (t) => {
  const dataDir = await temporary(t);
  const screenshotDir = path.join(dataDir, "screenshots");
  await mkdir(screenshotDir);
  await writeFile(path.join(screenshotDir, "button.png"), png);
  await utimes(
    path.join(screenshotDir, "button.png"),
    new Date("2026-01-01T00:00:00Z"),
    new Date("2026-01-01T00:00:00Z"),
  );
  await writeFile(path.join(dataDir, "state.png"), "secret png");
  const app = await createBoardServer({
    dataDir,
    inventory: inventory(),
    dispatcher: dispatch(),
    polling: false,
  });
  const base = await app.listen(0);
  t.after(() => app.close());

  const image = await fetch(`${base}/screenshots/button.png`);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/png");
  assert.equal(image.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
  assert.equal((await fetch(`${base}/screenshots/card.png`)).status, 404);

  for (const attempt of [
    "/screenshots/..%2Fstate.json",
    "/screenshots/%2e%2e%2fstate.json",
    "/screenshots/../state.json",
    "/screenshots/a%5c..%5cstate.png",
    "/screenshots/..%5cstate.png",
    "/screenshots/%2e%2e%2fstate.png",
    "/screenshots/%00.png",
    "/screenshots/%E0%A4%A.png",
    "/screenshots/A.png",
    "/screenshots/x.png/..",
  ]) {
    const response = await rawGet(base, attempt);
    assert.ok(
      [400, 404].includes(response.status),
      `${attempt} -> ${response.status}`,
    );
    assert.doesNotMatch(response.body, /secret png|"revision"/, attempt);
  }

  const cards = (await (await fetch(`${base}/api/board`)).json()).cards;
  assert.equal(
    cards.find((card) => card.id === "button").screenshot,
    "/screenshots/button.png?v=1767225600000",
  );
  assert.equal(cards.find((card) => card.id === "card").screenshot, null);
  const stored = await readJson(path.join(dataDir, "state.json"));
  assert.equal("screenshot" in stored.cards[0], false);

  const abort = new AbortController();
  t.after(() => abort.abort());
  const reader = (
    await fetch(`${base}/api/events`, { signal: abort.signal })
  ).body.getReader();
  const initial = new TextDecoder().decode((await reader.read()).value);
  assert.match(
    initial,
    /"screenshot":"\/screenshots\/button.png\?v=1767225600000"/,
  );
  await writeFile(path.join(dataDir, "card.png"), png);
  await utimes(
    path.join(dataDir, "card.png"),
    new Date("2026-02-01T00:00:00Z"),
    new Date("2026-02-01T00:00:00Z"),
  );
  await rename(
    path.join(dataDir, "card.png"),
    path.join(screenshotDir, "card.png"),
  );
  const update = new TextDecoder().decode((await reader.read()).value);
  assert.match(
    update,
    /"screenshot":"\/screenshots\/card.png\?v=1769904000000"/,
  );
});

test("inventory carves only importable ui modules and counts actual static/dynamic importers", async (t) => {
  const root = await temporary(t);
  const files = {
    "apps/web/src/components/ui/button.tsx":
      "export const Button = () => <button/>;",
    "apps/web/src/components/ui/message.tsx":
      'import {Button} from "@/components/ui/button"; export const Message=()=> <Button/>;',
    "apps/web/src/features/chat/thread.tsx":
      'export {Message} from "@/components/ui/message";',
    "apps/web/src/pages/home.tsx": 'const b=import("../components/ui/button");',
    "apps/web/src/pages/chat.tsx":
      'import {Message} from "@/features/chat/thread"; import {Item} from "@/components/ui/item";',
    "apps/web/src/components/ui/item.tsx": "export const Item = () => <div/>;",
    "apps/web/src/components/ui/unused.tsx":
      "export const Unused = () => <div/>;",
    "apps/web/src/components/ui/button.test.tsx":
      "export const Test = () => null;",
    "apps/web/src/components/ui/action-button.tsx":
      "export const ActionButton = () => <button/>;",
  };
  for (const [name, text] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), text);
  }
  const data = await buildInventory(root);
  assert.deepEqual(data.cards.map((card) => card.slug).sort(), [
    "button",
    "message",
  ]);
  assert.equal(data.cards.find((card) => card.name === "Button").usageCount, 2);
  assert.equal(
    data.cards.find((card) => card.name === "Message").category,
    "AI & chat",
  );
  assert.deepEqual(
    data.cards.find((card) => card.name === "Message").dependencies,
    ["apps/web/src/components/ui/button.tsx"],
  );
});

test("snapshot includes uncommitted source but never git, env, generated files or node_modules", async (t) => {
  const root = await temporary(t);
  await mkdir(path.join(root, "source"));
  await writeFile(path.join(root, "source", "new.ts"), "uncommitted");
  await writeFile(path.join(root, "source", ".env.local"), "not copied");
  for (const directory of [".git", "node_modules", ".artifacts"]) {
    await mkdir(path.join(root, directory));
    await writeFile(path.join(root, directory, "sentinel"), "not copied");
  }
  const target = path.join(await temporary(t), "copy");
  await snapshot(root, target);
  assert.equal(
    await readFile(path.join(target, "source/new.ts"), "utf8"),
    "uncommitted",
  );
  for (const name of [
    ".git",
    ".artifacts",
    "node_modules",
    "source/.env.local",
  ])
    await assert.rejects(access(path.join(target, name)));
});

test("shared checks lock serializes operations and releases after a crashed owner", async (t) => {
  const directory = await temporary(t);
  const file = path.join(directory, "checks.lock");
  let active = 0,
    maximum = 0;
  await Promise.all(
    [1, 2, 3].map(() =>
      withLock(file, async () => {
        active++;
        maximum = Math.max(maximum, active);
        await sleep(30);
        active--;
      }),
    ),
  );
  assert.equal(maximum, 1);
  const child = spawn(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import {DatabaseSync} from "node:sqlite"; const db=new DatabaseSync(${JSON.stringify(file)}); db.exec("BEGIN IMMEDIATE"); console.log("LOCKED"); setInterval(()=>{},1000);`,
    ],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  t.after(() => child.kill());
  await new Promise((resolve, reject) => {
    child.stdout.once("data", resolve);
    child.once("error", reject);
  });
  await assert.rejects(
    withLock(file, async () => {}, { wait: false }),
    /already running/,
  );
  child.kill("SIGKILL");
  await new Promise((resolve) => child.once("exit", resolve));
  await withLock(file, async () => assert.ok(true));
});

test("worker moves through isolated build, checks, queued integration and verified review", async (t) => {
  const dataDir = await temporary(t);
  const root = path.join(dataDir, "repo");
  const directory = path.join(dataDir, "job");
  const workspace = path.join(dataDir, "copy");
  await mkdir(root);
  await mkdir(directory);
  await writeFile(path.join(root, "package.json"), "{}");
  const job = {
    id: "test",
    root,
    cloudRoot: "/read-only/cloud",
    dataDir,
    directory,
    workspace,
    base: path.join(dataDir, "baseline"),
    card: inventory().cards[0],
    previewPath: "/components/button/",
    model: "claude-opus-5.5",
  };
  const checks = [];
  let copiedSource;
  const running = runJob(job, {
    install: async () => {},
    agent: async (job, phase, prompt, cwd) => {
      assert.match(prompt, /NEVER commit, push/);
      assert.match(prompt, /Cloud.*READ-ONLY/);
      if (phase === "build") {
        assert.equal(cwd, workspace);
        await writeFile(
          path.join(workspace, "button.tsx"),
          "export const Button = 1;",
        );
        copiedSource = await readFile(path.join(root, "package.json"), "utf8");
      } else {
        assert.equal(cwd, root);
        await writeFile(
          path.join(root, "button.tsx"),
          await readFile(path.join(workspace, "button.tsx")),
        );
      }
      await writeJson(
        path.join(
          directory,
          phase === "build" ? "build-result.json" : "integration-result.json",
        ),
        {
          summary: "Verified test component",
          previewPath: job.previewPath,
          coverage: fullCoverage(job.card),
        },
      );
    },
    validate: async (cwd) => {
      checks.push(cwd);
      const route = path.join(cwd, "apps/docs/dist/components/button");
      await mkdir(route, { recursive: true });
      await writeFile(
        path.join(route, "index.html"),
        "<button>Example</button>",
      );
    },
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if (
        (await readJson(path.join(directory, "status.json"))).phase ===
        "waiting-integration"
      )
        break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await sleep(20);
  }
  assert.equal(
    (await readJson(path.join(directory, "status.json"))).phase,
    "waiting-integration",
  );
  await assert.rejects(access(path.join(root, "button.tsx")));
  await writeJson(path.join(directory, "integrate.json"), {
    approvedAt: new Date().toISOString(),
  });
  const result = await running;
  assert.equal(result.phase, "review");
  assert.equal(copiedSource, "{}");
  assert.deepEqual(checks, [workspace, root]);
  assert.match(buildPrompt(job), /Do not integrate into the main checkout/);
});

test("bad worker completion cannot reach REVIEW", async (t) => {
  const dataDir = await temporary(t);
  const root = path.join(dataDir, "repo");
  const directory = path.join(dataDir, "job");
  await mkdir(root);
  await mkdir(directory);
  const job = {
    root,
    cloudRoot: "/cloud",
    dataDir,
    directory,
    workspace: path.join(dataDir, "copy"),
    base: path.join(dataDir, "baseline"),
    card: inventory().cards[0],
    previewPath: "/components/button/",
  };
  const status = await runJob(job, {
    install: async () => {},
    agent: async () =>
      writeJson(path.join(directory, "build-result.json"), {
        blocked: "Needs a design decision.",
      }),
    validate: async () =>
      assert.fail("Blocked worker must not validate or integrate"),
  });
  assert.equal(status.phase, "error");
  assert.equal(status.message, "Needs a design decision.");
});

function fullCoverage(card) {
  return {
    importers: card.importers.map((file) => ({ file, uses: ["default"] })),
    requirements: [
      { requirement: "default", covered: true, evidence: "Docs example" },
    ],
  };
}

test("partial Cloud usage coverage cannot reach REVIEW", async (t) => {
  const card = { ...inventory().cards[0], importers: ["a.tsx", "b.tsx"] };
  const partial = fullCoverage(card);
  partial.importers.pop();
  assert.throws(() => verifyCoverage(partial, card.importers), /b\.tsx/);
  const uncovered = fullCoverage(card);
  uncovered.requirements.push({
    requirement: "size lg",
    covered: false,
    evidence: "",
  });
  assert.throws(() => verifyCoverage(uncovered, card.importers), /size lg/);
  assert.throws(() => verifyCoverage(undefined, card.importers), /coverage/);
  assert.ok(verifyCoverage(fullCoverage(card), card.importers));

  const dataDir = await temporary(t);
  const root = path.join(dataDir, "repo");
  const directory = path.join(dataDir, "job");
  await mkdir(root);
  await mkdir(directory);
  const job = {
    root,
    cloudRoot: "/cloud",
    dataDir,
    directory,
    workspace: path.join(dataDir, "copy"),
    base: path.join(dataDir, "baseline"),
    card,
    previewPath: "/components/button/",
  };
  assert.match(buildPrompt(job), /COMPLETENESS GATE/);
  assert.match(buildPrompt(job), /b\.tsx/);
  const status = await runJob(job, {
    install: async () => {},
    agent: async () =>
      writeJson(path.join(directory, "build-result.json"), {
        summary: "Only default variant",
        previewPath: job.previewPath,
        coverage: partial,
      }),
    validate: async () => assert.fail("Partial coverage must not validate"),
  });
  assert.equal(status.phase, "error");
  assert.match(status.message, /not audited: b\.tsx/);
});

test("direct jobs build and check in the main checkout without copies", async (t) => {
  const dataDir = await temporary(t);
  const root = path.join(dataDir, "repo");
  const directory = path.join(dataDir, "job");
  await mkdir(root);
  await mkdir(directory);
  const card = { ...inventory().cards[0], importers: ["a.tsx"] };
  const job = {
    root,
    cloudRoot: "/cloud",
    dataDir,
    directory,
    workspace: root,
    direct: true,
    base: path.join(dataDir, "baseline"),
    card,
    previewPath: "/components/button/",
  };
  const checks = [];
  const status = await runJob(job, {
    install: async () => assert.fail("Direct jobs must not install a copy"),
    agent: async (job, phase, prompt, cwd) => {
      assert.equal(phase, "build");
      assert.equal(cwd, root);
      assert.match(prompt, /DIRECTLY in the MAIN Sprout checkout/);
      assert.match(prompt, /COMPLETENESS GATE/);
      await writeJson(path.join(directory, "build-result.json"), {
        summary: "Built",
        previewPath: job.previewPath,
        coverage: fullCoverage(card),
      });
    },
    retryDelay: 0,
    validate: async (cwd, { scope }) => {
      checks.push([cwd, scope]);
      if (checks.length === 1)
        throw new Error("another worker broke typecheck");
      const route = path.join(cwd, "apps/docs/dist/components/button");
      await mkdir(route, { recursive: true });
      await writeFile(path.join(route, "index.html"), "ok");
    },
  });
  assert.equal(status.phase, "review");
  assert.deepEqual(checks, [
    [root, "button"],
    [root, "button"],
  ]);
  await assert.rejects(access(job.base));
});
