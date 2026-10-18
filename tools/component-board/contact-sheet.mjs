import { writeFile } from "node:fs/promises";

const escape = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

function tile(entry) {
  const image = entry.screenshot
    ? `<a class="shot" href="${escape(entry.screenshot)}"><img loading="lazy" src="${escape(entry.screenshot)}" alt="${escape(entry.name)} screenshot"></a>`
    : `<div class="shot none">No screenshot</div>`;
  return `<article class="tile ${escape(entry.classification ?? "unclassified")}" id="${escape(entry.slug)}">
${image}
<h3>${escape(entry.name)} <span class="tag">${escape(entry.classification ?? "unclassified")}</span></h3>
<p class="source">${escape(entry.source)}</p>
<p class="meta">usageCount ${escape(entry.usageCount)}</p>
<p class="reason">${escape(entry.reason)}</p>
</article>`;
}

export function contactSheet(entries) {
  const categories = [
    ...new Set(entries.map((entry) => entry.category)),
  ].sort();
  const count = (filter) => entries.filter(filter).length;
  const classes = ["primitive", "pattern", "app"]
    .map((name) => `${name} ${count((entry) => entry.classification === name)}`)
    .join(" · ");
  const sections = categories
    .map((category) => {
      const items = entries
        .filter((entry) => entry.category === category)
        .sort((a, b) => a.name.localeCompare(b.name));
      return `<section><h2>${escape(category)} <small>${items.filter((entry) => entry.screenshot).length}/${items.length} captured</small></h2><div class="grid">${items.map(tile).join("\n")}</div></section>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>TODO components in TulipFarm Cloud</title>
<style>
body{font:14px/1.45 system-ui,sans-serif;margin:0;padding:24px 32px;background:#f6f6f4;color:#1d1d1b}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:32px 0 12px;position:sticky;top:0;background:#f6f6f4;padding:8px 0;z-index:1}
h2 small,.summary{color:#6b6b66;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.tile{background:#fff;border:1px solid #e3e3df;border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:4px;min-width:0}
.shot{display:flex;align-items:flex-start;justify-content:center;height:200px;overflow:hidden;border:1px solid #eee;border-radius:6px;background:#fafaf8}
.shot img{max-width:100%;max-height:100%;object-fit:contain;object-position:top}
.shot.none{align-items:center;color:#9a9a94;font-style:italic}
.tile h3{font-size:14px;margin:6px 0 0;display:flex;justify-content:space-between;gap:8px}
.tag{font-size:11px;font-weight:600;border-radius:999px;padding:1px 8px;background:#eee;white-space:nowrap}
.primitive .tag{background:#dff3e4;color:#17602e}.pattern .tag{background:#e2ecfb;color:#1d4b8f}.app .tag{background:#f6e6d8;color:#8a4310}
.source{font:12px ui-monospace,monospace;color:#55554f;margin:0;overflow-wrap:anywhere}.meta{margin:0;color:#6b6b66;font-size:12px}.reason{margin:0;font-size:13px}
</style></head><body>
<h1>TODO components in TulipFarm Cloud</h1>
<p class="summary">${entries.length} cards · ${count((entry) => entry.screenshot)} captured · ${classes}</p>
${sections}
</body></html>
`;
}

export async function writeContactSheet(file, entries) {
  await writeFile(file, contactSheet(entries));
}
