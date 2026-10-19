import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const ai = new Set(
  "attachment bubble canvas chat-confirmation chat-input chat-plan chat-sources mention-list message message-actions message-response message-scroller plan-outline prompt-list questionnaire reasoning-effort result-card review-card tool-activity typed-text".split(
    " ",
  ),
);
// Card slugs whose Sprout port is part of another component, so they get no card.
export const mergedInto = new Map([
  ["action-button", "button"],
  ["bubble", "message"],
  ["empty", "state-panel"],
  ["divider", "separator"],
  ["marker", "separator"],
  ["file-viewer-office-file", "file-viewer"],
  ["file-viewer-spreadsheet-file", "file-viewer"],
  ["file-viewer-worksheet-grid", "file-viewer"],
  ["data-list", "table"],
  ["table-pagination", "table"],
  ["drawer", "sheet"],
]);
// Card slugs cut from Sprout's scope. Only Cloud's components/ui modules with importers get cards.
export const removed = new Set([
  "item",
  "chat-suggestions",
  "reasoning",
  "tool-call",
  "thinking-state",
  "turnstile-challenge",
  "tulip-avatar",
  "calendar-board",
  "calendar-event-list",
  "workflow-diagram",
]);

export const keepsCard = (card) =>
  card.source.startsWith("apps/web/src/components/ui/") &&
  card.usageCount > 0 &&
  !mergedInto.has(card.slug) &&
  !removed.has(card.slug);

function slugOf(relative) {
  return relative.startsWith("components/ui/")
    ? relative.slice("components/ui/".length, -4).replaceAll("/", "-")
    : relative
        .replace(/^(components|features)\//, "")
        .slice(0, -4)
        .replaceAll("/", "-");
}
const forms = new Set(
  "calendar checkbox choice-list combobox field form input input-group input-otp label radio-group rich-text-editor search-field select selection-slot slider switch textarea".split(
    " ",
  ),
);
const content = new Set(
  "calendar-board calendar-event-list carousel chart code-block file-viewer office-file spreadsheet-file worksheet-grid schema-diagram sql-viewer table table-pagination workflow-diagram".split(
    " ",
  ),
);
const feedback = new Set(
  "alert alert-dialog glass-banner gradient-banner notice-banner progress skeleton spinner state-panel state-sample toast toolbar-status".split(
    " ",
  ),
);

async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", "__tests__", "__fixtures__"].includes(entry.name))
      continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(file)));
    else if (
      /\.[cm]?[jt]sx?$/.test(entry.name) &&
      !/\.(test|spec|stories|d)\./.test(entry.name)
    )
      files.push(file);
  }
  return files.sort();
}

function inspect(file, text) {
  const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const imports = new Set();
  const exports = new Set();
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      if (!node.isTypeOnly && !node.importClause?.isTypeOnly)
        imports.add(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      imports.add(node.arguments[0].text);
    if (
      node.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
    ) {
      if (
        (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
        node.name
      )
        exports.add(node.name.text);
      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name))
            exports.add(declaration.name.text);
        }
      }
    }
    if (
      ts.isExportDeclaration(node) &&
      !node.isTypeOnly &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      for (const item of node.exportClause.elements)
        if (!item.isTypeOnly) exports.add(item.name.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return { imports: [...imports], exports: [...exports].sort() };
}

function title(slug) {
  return slug
    .split("-")
    .map((word) =>
      ["ai", "otp", "mcp"].includes(word)
        ? word.toUpperCase()
        : word[0].toUpperCase() + word.slice(1),
    )
    .join(" ");
}

export async function buildInventory(cloudRoot) {
  const sourceRoot = path.join(cloudRoot, "apps/web/src");
  const files = await sourceFiles(sourceRoot);
  const known = new Set(files);
  const modules = new Map();
  for (const file of files)
    modules.set(file, inspect(file, await readFile(file, "utf8")));
  function resolveImport(file, specifier) {
    const base = specifier.startsWith("@/")
      ? path.join(sourceRoot, specifier.slice(2))
      : specifier.startsWith(".")
        ? path.resolve(path.dirname(file), specifier)
        : null;
    if (!base) return null;
    return (
      [
        base,
        ...[".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"].map(
          (suffix) => base + suffix,
        ),
        base.replace(/\.js$/, ".ts"),
        base.replace(/\.js$/, ".tsx"),
      ].find((candidate) => known.has(candidate)) ?? null
    );
  }
  const importedBy = new Map();
  for (const [file, info] of modules) {
    info.resolved = info.imports
      .map((specifier) => resolveImport(file, specifier))
      .filter(Boolean);
    for (const target of new Set(info.resolved)) {
      if (!importedBy.has(target)) importedBy.set(target, new Set());
      importedBy.get(target).add(path.relative(cloudRoot, file));
    }
  }
  const candidates = files.filter((file) => {
    const relative = path.relative(sourceRoot, file);
    return (
      file.endsWith(".tsx") &&
      relative.startsWith("components/ui/") &&
      !mergedInto.has(slugOf(relative))
    );
  });
  const candidateSet = new Set(candidates);
  return {
    generatedAt: new Date().toISOString(),
    sourceRoot: cloudRoot,
    cards: candidates
      .map((file) => {
        const relative = path.relative(sourceRoot, file);
        const basename = path.basename(file, ".tsx");
        const slug = slugOf(relative);
        const category = ai.has(basename)
          ? "AI & chat"
          : forms.has(basename)
            ? "Forms"
            : content.has(basename) || relative.includes("/file-viewer/")
              ? "Data & content"
              : feedback.has(basename)
                ? "Feedback"
                : "Primitives";
        const importers = [...(importedBy.get(file) ?? [])].sort();
        return {
          id: relative.slice(0, -4).replaceAll("/", "--"),
          slug,
          name: title(basename),
          category,
          source: path.relative(cloudRoot, file),
          exports: modules.get(file).exports,
          importers,
          usageCount: importers.length,
          dependencies: [
            ...new Set(
              modules
                .get(file)
                .resolved.filter((target) => candidateSet.has(target))
                .map((target) => path.relative(cloudRoot, target)),
            ),
          ].sort(),
        };
      })
      .filter(keepsCard)
      .sort(
        (a, b) =>
          a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
      ),
  };
}
