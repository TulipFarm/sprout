import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { build } from "esbuild";

export const WARN_PCT = 5;
export const FAIL_PCT = 10;
export const MIN_BYTES = 1000;

const root = path.resolve(import.meta.dirname, "../..");
const START = "<!-- bundle-size:start -->";
const END = "<!-- bundle-size:end -->";

function sizes(buffer) {
  return {
    raw: buffer.length,
    gzip: gzipSync(buffer, { level: 9 }).length,
    brotli: brotliCompressSync(buffer, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
}

// Measures what a consumer loads up front for each entry: minified, peer deps
// external, lazy import() chunks (shiki languages) left out.
export async function measure(packageDir = path.join(root, "packages/sprout")) {
  const pkg = JSON.parse(
    await readFile(path.join(packageDir, "package.json"), "utf8"),
  );
  const entries = Object.entries(pkg.exports)
    .filter(([, target]) => target.import)
    .map(([key, target]) => ({
      name: key === "." ? "sprout" : key.slice(2),
      in: path.join(packageDir, target.import),
    }));
  const peers = Object.keys(pkg.peerDependencies ?? {});
  const result = await build({
    entryPoints: entries.map((entry) => ({ in: entry.in, out: entry.name })),
    bundle: true,
    splitting: true,
    format: "esm",
    minify: true,
    write: false,
    metafile: true,
    absWorkingDir: root,
    outdir: "size-out",
    external: peers.flatMap((name) => [name, `${name}/*`]),
    loader: { ".css": "empty" },
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "error",
  });
  const files = new Map(result.outputFiles.map((file) => [file.path, file]));
  const outputs = result.metafile.outputs;
  const report = {};
  for (const entry of entries) {
    const seen = new Set();
    const visit = (file) => {
      if (seen.has(file)) return;
      seen.add(file);
      for (const dep of outputs[file].imports) {
        if (dep.kind === "import-statement" && !dep.external) visit(dep.path);
      }
    };
    visit(`size-out/${entry.name}.js`);
    report[entry.name] = sizes(
      Buffer.concat(
        [...seen].map((file) => files.get(path.join(root, file)).contents),
      ),
    );
  }
  return report;
}

const kb = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;

function delta(before, after) {
  if (before === undefined) return "new";
  const diff = after - before;
  if (diff === 0) return "0";
  const pct = before
    ? ` (${diff > 0 ? "+" : ""}${((diff / before) * 100).toFixed(1)}%)`
    : "";
  return `${diff > 0 ? "+" : ""}${kb(diff)}${pct}`;
}

export function status(before, after) {
  if (before === undefined || after === undefined) return "ok";
  const diff = after.gzip - before.gzip;
  if (diff < 0) return "smaller";
  if (diff < MIN_BYTES) return "ok";
  const pct = (diff / before.gzip) * 100;
  if (pct > FAIL_PCT) return "fail";
  if (pct > WARN_PCT) return "warn";
  return "ok";
}

const icons = { fail: "❌", warn: "⚠️", smaller: "✅", ok: "" };

export function compare(base, head) {
  const names = [...new Set([...Object.keys(base), ...Object.keys(head)])];
  const rows = names.map((name) => ({
    name,
    before: base[name],
    after: head[name],
    status: status(base[name], head[name]),
  }));
  const changed = rows.filter((row) => row.before?.gzip !== row.after?.gzip);
  const line = ({ name, before, after, status }) =>
    after
      ? `| ${icons[status]} \`${name}\` | ${before ? kb(before.gzip) : "—"} | ${kb(after.gzip)} | ${delta(before?.gzip, after.gzip)} | ${kb(after.raw)} | ${kb(after.brotli)} |`
      : `| \`${name}\` | ${kb(before.gzip)} | removed | | | |`;
  const header =
    "| Entry | Base gzip | PR gzip | Change | PR raw | PR brotli |\n| --- | ---: | ---: | ---: | ---: | ---: |";
  const failed = rows.filter((row) => row.status === "fail");
  const warned = rows.filter((row) => row.status === "warn");
  const summary = failed.length
    ? `❌ ${failed.length} entr${failed.length === 1 ? "y" : "ies"} grew more than ${FAIL_PCT}% gzip.`
    : warned.length
      ? `⚠️ ${warned.length} entr${warned.length === 1 ? "y" : "ies"} grew more than ${WARN_PCT}% gzip.`
      : "✅ No entry grew past the warning threshold.";
  const markdown = [
    "## Bundle size",
    "",
    summary,
    "",
    `Warn above ${WARN_PCT}%, fail above ${FAIL_PCT}% gzip growth. Changes under ${kb(MIN_BYTES)} are ignored. This check is not required: merge anyway when the growth is on purpose, such as a new dependency.`,
    "",
    changed.length
      ? [header, ...changed.map(line)].join("\n")
      : "No size changes.",
    "",
    "<details><summary>All entries</summary>",
    "",
    header,
    ...rows.map(line),
    "",
    "</details>",
    "",
  ].join("\n");
  return { markdown, failed, warned };
}

export function readmeTable(report) {
  const { sprout, ...components } = report;
  return [
    START,
    `Full library: **${kb(sprout.gzip)}** gzip. Each component path is smaller. Sizes are minified, with React and other peer dependencies left out.`,
    "",
    "<details>",
    "<summary>Size of each component</summary>",
    "",
    "| Component | Raw | Gzip | Brotli |",
    "| --- | ---: | ---: | ---: |",
    ...Object.entries(components).map(
      ([name, size]) =>
        `| \`${name}\` | ${kb(size.raw)} | ${kb(size.gzip)} | ${kb(size.brotli)} |`,
    ),
    "",
    "</details>",
    END,
  ].join("\n");
}

if (import.meta.main) {
  const [command, ...args] = process.argv.slice(2);
  if (command === "measure") {
    const report = await measure(args[0] && path.resolve(args[0]));
    if (args[1]) await writeFile(args[1], JSON.stringify(report, null, 2));
    else console.table(report);
  } else if (command === "compare") {
    const [base, head] = await Promise.all(
      args.map(async (file) => JSON.parse(await readFile(file, "utf8"))),
    );
    const { markdown, failed, warned } = compare(base, head);
    process.stdout.write(markdown);
    for (const row of warned) {
      console.error(
        `::warning title=Bundle size::${row.name} grew ${delta(row.before.gzip, row.after.gzip)} gzip`,
      );
    }
    for (const row of failed) {
      console.error(
        `::error title=Bundle size::${row.name} grew ${delta(row.before.gzip, row.after.gzip)} gzip`,
      );
    }
    process.exitCode = failed.length ? 1 : 0;
  } else if (command === "readme") {
    const file = path.join(root, "README.md");
    const readme = await readFile(file, "utf8");
    const start = readme.indexOf(START);
    const end = readme.indexOf(END);
    if (start < 0 || end < 0)
      throw new Error(`README.md needs ${START} and ${END}`);
    const table = readmeTable(await measure());
    await writeFile(
      file,
      readme.slice(0, start) + table + readme.slice(end + END.length),
    );
  } else {
    console.error(
      "Usage: size.mjs measure [packageDir] [out.json] | compare base.json head.json | readme",
    );
    process.exitCode = 1;
  }
}
