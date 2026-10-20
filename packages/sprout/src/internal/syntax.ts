import type { HighlighterCore, ThemedToken } from 'shiki/core';
import { codeLanguageAliases, codeLanguageFilenames, type CodeLanguage } from './languages.js';

const plain = new Set(['text', 'txt', 'plain', 'plaintext']);

/** The Shiki language for a file name, from its whole name or its extension. */
export function languageForFilename(name: string): CodeLanguage | null {
  const base = (name.split(/[\\/]/).at(-1) ?? '').toLowerCase();
  const whole = codeLanguageFilenames[base];
  if (whole) return whole;
  if (base.startsWith('.env.')) return 'dotenv';
  const dot = base.lastIndexOf('.');
  return dot < 0 ? null : (codeLanguageAliases[base.slice(dot + 1)] ?? null);
}

/** Resolves a language name or alias, falling back to the file name. `null` means plain text. */
export function resolveCodeLanguage(language: string | undefined, filename?: string): CodeLanguage | null {
  const key = language?.trim().toLowerCase();
  if (key && plain.has(key)) return null;
  const named = key ? codeLanguageAliases[key] : undefined;
  return named ?? (filename ? languageForFilename(filename) : null);
}

/** Longer code renders as plain text, so one huge file cannot freeze the page. */
export const maxHighlightedLength = 200_000;

const role = (name: string) => `var(--sprout-syntax-token-${name})`;

// Shiki's CSS-variables theme leaves prose markup in the foreground color, so Markdown and diffs read as plain text.
const markupRules = [
  {
    scope: ['markup.heading', 'entity.name.section', 'punctuation.definition.heading'],
    settings: { foreground: role('heading'), fontStyle: 'bold' },
  },
  {
    scope: [
      'punctuation.definition.list.begin',
      'beginning.punctuation.definition.list',
      'punctuation.definition.list',
    ],
    settings: { foreground: role('constant') },
  },
  {
    scope: [
      'punctuation.definition.bold',
      'punctuation.definition.italic',
      'punctuation.definition.strikethrough',
      'punctuation.definition.quote.begin',
      'meta.separator',
    ],
    settings: { foreground: role('punctuation') },
  },
  {
    scope: ['markup.quote'],
    settings: { foreground: role('comment'), fontStyle: 'italic' },
  },
  {
    scope: ['markup.inline.raw', 'markup.fenced_code', 'markup.raw'],
    settings: { foreground: role('string') },
  },
  {
    scope: ['fenced_code.block.language'],
    settings: { foreground: role('keyword') },
  },
  {
    scope: ['markup.inserted', 'punctuation.definition.inserted'],
    settings: { foreground: role('inserted') },
  },
  {
    scope: ['markup.deleted', 'punctuation.definition.deleted'],
    settings: { foreground: role('deleted') },
  },
  {
    scope: ['meta.diff.range', 'punctuation.definition.range.diff', 'meta.diff.header'],
    settings: { foreground: role('keyword') },
  },
];

let highlighter: HighlighterCore | undefined;
let starting: Promise<HighlighterCore> | undefined;
const loading = new Map<CodeLanguage, Promise<void>>();

function start() {
  starting ??= Promise.all([import('shiki/core'), import('shiki/engine/javascript')]).then(
    async ([{ createHighlighterCore, createCssVariablesTheme }, { createJavaScriptRegexEngine }]) => {
      const theme = createCssVariablesTheme({
        name: 'sprout',
        variablePrefix: '--sprout-syntax-',
        fontStyle: true,
      });
      theme.tokenColors = [...(theme.tokenColors ?? []), ...markupRules];
      highlighter = await createHighlighterCore({
        themes: [theme],
        langs: [],
        engine: createJavaScriptRegexEngine({ forgiving: true }),
      });
      return highlighter;
    },
  );
  return starting;
}

export function loadCodeLanguage(language: CodeLanguage): Promise<void> {
  let loaded = loading.get(language);
  if (!loaded) {
    loaded = Promise.all([start(), import('shiki/langs')]).then(([core, { bundledLanguages }]) =>
      core.loadLanguage(bundledLanguages[language]),
    );
    loading.set(language, loaded);
    loaded.catch(() => loading.delete(language));
  }
  return loaded;
}

/** Languages a file needs beyond its own, such as the fences inside Markdown. */
export function embeddedLanguages(code: string, language: CodeLanguage) {
  if (language !== 'markdown' && language !== 'mdx') return [];
  const found = new Set<CodeLanguage>();
  for (const [, name] of code.matchAll(/^\s*(?:```|~~~)\s*([\w#+.-]+)/gm)) {
    const fence = resolveCodeLanguage(name);
    if (fence) found.add(fence);
  }
  return [...found];
}

export function isLanguageReady(language: CodeLanguage) {
  return highlighter?.getLoadedLanguages().includes(language) ?? false;
}

/** Tokens when the language is already loaded, otherwise `null`. */
export function codeTokens(code: string, language: CodeLanguage): ThemedToken[][] | null {
  if (!highlighter || !isLanguageReady(language)) return null;
  return highlighter.codeToTokensBase(code, {
    lang: language,
    theme: 'sprout',
  });
}
