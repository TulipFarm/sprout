import { createRequire } from "node:module";
import { mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { boardDataDir, repositoryRoot } from "./check.mjs";
import { withLock } from "./lock.mjs";
import { readJson, writeJson } from "./storage.mjs";
import { writeContactSheet } from "./contact-sheet.mjs";

const cloudWeb = path.resolve(repositoryRoot, "../tulipfarm-cloud/apps/web");
const captureDir = path.resolve(
  process.env.CAPTURE_DIR ??
    path.join(repositoryRoot, ".artifacts/tmp/component-capture"),
);
const recipeDir = path.join(captureDir, "recipes");
const harnessDir = path.join(captureDir, "harness");
const resultDir = path.join(captureDir, "results");
const screenshotDir = path.join(boardDataDir, "screenshots");
const boardUrl = process.env.BOARD_URL ?? "http://127.0.0.1:4330";
const viewport = { width: 1440, height: 900 };
const padding = 16;
const errorText =
  /something went wrong|unexpected application error|not-available-in|failed to load|could not load|page not found|cannot read propert|is not a function|is not defined/i;

function parseArgs(argv) {
  const options = { only: null, reportOnly: false, retryFailed: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--only")
      options.only = new Set(argv[++index].split(",").filter(Boolean));
    else if (arg === "--report-only") options.reportOnly = true;
    else if (arg === "--missing") options.retryFailed = true;
    else throw new Error(`Unknown argument ${arg}`);
  }
  return options;
}

async function todoCards() {
  const response = await fetch(`${boardUrl}/api/board`);
  if (!response.ok) throw new Error(`Board returned ${response.status}`);
  const board = await response.json();
  return board.cards.filter((card) => card.state === "TODO");
}

async function loadRecipes() {
  const recipes = new Map();
  for (const file of (await readdir(recipeDir)).sort()) {
    if (!file.endsWith(".mjs")) continue;
    const url = `${pathToFileURL(path.join(recipeDir, file)).href}?t=${Date.now()}`;
    const loaded = await import(url).catch((error) => {
      console.error(`Skipping ${file}: ${error.message}`);
      return { default: [] };
    });
    for (const recipe of loaded.default) {
      if (recipes.has(recipe.slug))
        throw new Error(`${file}: duplicate recipe ${recipe.slug}`);
      if (!["primitive", "pattern", "app"].includes(recipe.classification))
        throw new Error(`${file}: ${recipe.slug} needs a classification`);
      if (!recipe.reason)
        throw new Error(`${file}: ${recipe.slug} needs a reason`);
      if (!recipe.unavailable && !recipe.url && !recipe.harness)
        throw new Error(
          `${file}: ${recipe.slug} needs url, harness, or unavailable`,
        );
      recipes.set(recipe.slug, { ...recipe, file });
    }
  }
  return recipes;
}

let workspacePackages;
async function workspaceSource(source) {
  const name = source.match(/^@tulipfarm\/[^/]+/)?.[0];
  if (!name) return null;
  workspacePackages ??= (async () => {
    const packages = new Map();
    const root = path.resolve(cloudWeb, "../../packages");
    for (const directory of await readdir(root)) {
      const manifest = await readJson(
        path.join(root, directory, "package.json"),
      ).catch(() => null);
      if (manifest?.name)
        packages.set(manifest.name, {
          directory: path.join(root, directory),
          manifest,
        });
    }
    return packages;
  })();
  const entry = (await workspacePackages).get(name);
  if (!entry) return null;
  const subpath = `.${source.slice(name.length)}`;
  const target = entry.manifest.exports?.[subpath];
  const built =
    typeof target === "string" ? target : (target?.import ?? target?.default);
  if (!built) return null;
  const current = path.join(
    entry.directory,
    built.replace(/^\.\/dist\//, "src/").replace(/\.js$/, ".ts"),
  );
  return (await stat(current).then(
    () => true,
    () => false,
  ))
    ? current
    : null;
}

function captureHarness() {
  const cloudEntry = path.join(cloudWeb, "src/main.tsx");
  const bare = /^(?![./\\]|@\/|\/|\0|[a-z]+:)/i;
  return {
    name: "component-capture-harness",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer || !bare.test(source)) return null;
      const local = await workspaceSource(source);
      if (local) return local;
      if (!importer.startsWith(harnessDir)) return null;
      return this.resolve(source, cloudEntry, { ...options, skipSelf: true });
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith("/__capture/harness")) return next();
        const html = `<!doctype html><html lang="en" class="light"><head><meta charset="UTF-8"><title>Capture</title></head><body><div id="root"></div><script type="module" src="/@fs${path.join(harnessDir, "main.tsx")}"></script></body></html>`;
        response.setHeader("Content-Type", "text/html");
        response.end(await server.transformIndexHtml(request.url, html));
      });
    },
  };
}

async function startCloud() {
  const { createServer } = await import(
    pathToFileURL(
      createRequire(path.join(cloudWeb, "package.json")).resolve("vite"),
    ).href
  );
  const server = await createServer({
    root: cloudWeb,
    logLevel: "error",
    clearScreen: false,
    plugins: [captureHarness()],
    oxc: { tsconfig: false },
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
      fs: { allow: [path.resolve(cloudWeb, "../.."), captureDir] },
    },
    optimizeDeps: {
      entries: ["index.html", path.join(harnessDir, "**/*.tsx")],
    },
  });
  await server.listen();
  return { origin: server.resolvedUrls.local[0].replace(/\/$/, ""), server };
}

async function blankOrError(page, file, element, recipe) {
  const text = (await element.innerText().catch(() => "")).slice(0, 4000);
  const match = recipe.allowErrorText ? null : text.match(errorText);
  if (match) return `shows error text "${match[0]}"`;
  const data = (await readFile(file)).toString("base64");
  const stats = await page.evaluate(async (source) => {
    const image = new Image();
    image.src = `data:image/png;base64,${source}`;
    await image.decode();
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    const [r, g, b] = pixels;
    let differing = 0;
    const colors = new Set();
    for (let index = 0; index < pixels.length; index += 16) {
      const delta =
        Math.abs(pixels[index] - r) +
        Math.abs(pixels[index + 1] - g) +
        Math.abs(pixels[index + 2] - b);
      if (delta > 24) differing++;
      colors.add(
        (pixels[index] >> 4) * 256 +
          (pixels[index + 1] >> 4) * 16 +
          (pixels[index + 2] >> 4),
      );
    }
    return {
      width: image.width,
      height: image.height,
      ratio: differing / (pixels.length / 16),
      colors: colors.size,
    };
  }, data);
  if (stats.width < 24 || stats.height < 16)
    return `too small (${stats.width}x${stats.height})`;
  if (stats.ratio < 0.002 || stats.colors < 3)
    return `looks blank (${(stats.ratio * 100).toFixed(2)}% non-background, ${stats.colors} colors)`;
  return null;
}

async function shoot(page, origin, recipe, file) {
  const errors = [];
  page.removeAllListeners("pageerror");
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize(recipe.viewport ?? viewport);
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      ["http:", "https:", "ws:", "wss:"].includes(url.protocol) &&
      url.hostname !== "127.0.0.1"
    )
      return route.abort();
    return route.fallback();
  });
  if (recipe.mock) await recipe.mock(page, { origin });
  const target = recipe.harness
    ? `/__capture/harness?case=${encodeURIComponent(recipe.harness)}`
    : recipe.url;
  await page.goto(`${origin}${target}`, { waitUntil: "load" });
  if (recipe.harness)
    await page.waitForSelector("#capture-root[data-ready], #capture-error", {
      timeout: 20000,
    });
  const harnessError = await page
    .locator("#capture-error")
    .textContent()
    .catch(() => null);
  if (harnessError) throw new Error(`harness: ${harnessError}`);
  if (recipe.prepare) await recipe.prepare(page, { origin });
  const element =
    typeof recipe.target === "function"
      ? recipe.target(page)
      : page.locator(recipe.target ?? "#capture-root > *").first();
  await element.waitFor({ state: "visible", timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(recipe.settle ?? 400);
  await element.scrollIntoViewIfNeeded();
  let box = await element.boundingBox();
  if (!box) throw new Error("target has no box");
  const needed = Math.ceil(box.height + 2 * padding + 40);
  if (needed > page.viewportSize().height) {
    await page.setViewportSize({
      width: page.viewportSize().width,
      height: Math.min(needed, 4000),
    });
    await page.waitForTimeout(200);
    await element.scrollIntoViewIfNeeded();
    box = await element.boundingBox();
  }
  const size = page.viewportSize();
  const x = Math.max(0, Math.floor(box.x - padding));
  const y = Math.max(0, Math.floor(box.y - padding));
  const clip = {
    x,
    y,
    width: Math.min(size.width - x, Math.ceil(box.width + 2 * padding)),
    height: Math.min(size.height - y, Math.ceil(box.height + 2 * padding)),
  };
  await page.screenshot({
    path: file,
    clip,
    animations: "disabled",
    caret: "hide",
  });
  const problem = await blankOrError(page, file, element, recipe);
  if (problem) throw new Error(problem);
  return {
    width: clip.width,
    height: clip.height,
    pageErrors: errors.slice(0, 3),
  };
}

async function capture(cards, recipes, options) {
  await mkdir(screenshotDir, { recursive: true });
  await mkdir(resultDir, { recursive: true });
  const work = cards.filter(
    (card) => recipes.get(card.slug) && !recipes.get(card.slug).unavailable,
  );
  const selected = [];
  for (const card of work) {
    if (options.only && !options.only.has(card.slug)) continue;
    if (options.retryFailed) {
      const previous = await readJson(
        path.join(resultDir, `${card.slug}.json`),
      ).catch(() => null);
      if (previous?.ok) continue;
    }
    selected.push(card);
  }
  if (!selected.length) return;
  const { origin, server } = await startCloud();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport,
      colorScheme: "light",
      reducedMotion: "reduce",
      deviceScaleFactor: 1,
    });
    await context.addInitScript(() => {
      try {
        localStorage.setItem("tulipfarm.theme", "light");
      } catch {}
    });
    for (const card of selected) {
      const recipe = recipes.get(card.slug);
      const file = path.join(screenshotDir, `${card.slug}.png`);
      const page = await context.newPage();
      let result;
      try {
        const shot = await shoot(page, origin, recipe, file).catch(() =>
          shoot(page, origin, recipe, file),
        );
        result = { slug: card.slug, ok: true, ...shot };
      } catch (error) {
        await rm(file, { force: true });
        result = {
          slug: card.slug,
          ok: false,
          error: error.message.split("\n")[0].slice(0, 300),
        };
      } finally {
        await page.close();
      }
      result.capturedAt = new Date().toISOString();
      await writeJson(path.join(resultDir, `${card.slug}.json`), result);
      console.log(
        `${result.ok ? "ok  " : "FAIL"} ${card.slug}${result.ok ? "" : `: ${result.error}`}`,
      );
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

async function report(cards, recipes) {
  const entries = [];
  for (const card of cards) {
    const recipe = recipes.get(card.slug);
    const result = await readJson(
      path.join(resultDir, `${card.slug}.json`),
    ).catch(() => null);
    const shot = path.join(screenshotDir, `${card.slug}.png`);
    const exists = await stat(shot).then(
      () => true,
      () => false,
    );
    const captured = Boolean(
      recipe && !recipe.unavailable && result?.ok && exists,
    );
    const missing = !recipe
      ? "No capture recipe written yet."
      : (recipe.unavailable ??
        (result ? `Capture failed: ${result.error}` : "Not captured yet."));
    entries.push({
      slug: card.slug,
      name: card.name,
      category: card.category,
      source: card.source,
      usageCount: card.usageCount,
      screenshot: captured ? `${card.slug}.png` : null,
      classification: recipe?.classification ?? null,
      reason: captured
        ? recipe.reason
        : `No screenshot: ${missing} Classification: ${recipe?.reason ?? "unclassified"}`,
      via: recipe
        ? recipe.harness
          ? `harness ${recipe.harness}`
          : (recipe.url ?? null)
        : null,
    });
  }
  await writeJson(path.join(screenshotDir, "manifest.json"), entries);
  await writeContactSheet(path.join(screenshotDir, "index.html"), entries);
  const tally = {};
  for (const entry of entries) {
    tally[entry.category] ??= { captured: 0, missing: 0 };
    tally[entry.category][entry.screenshot ? "captured" : "missing"]++;
  }
  console.table(tally);
  return entries;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const cards = await todoCards();
  const recipes = await loadRecipes();
  await mkdir(captureDir, { recursive: true });
  await withLock(path.join(captureDir, "browser.lock"), async () => {
    if (!options.reportOnly) await capture(cards, recipes, options);
    await report(cards, recipes);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
