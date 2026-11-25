import { codeToHtml } from 'shiki';

/** Highlights code with the CodeBlock themes and returns the inner HTML of its `<code>`. */
export async function highlight(code: string, lang: string) {
  const html = await codeToHtml(code, {
    lang,
    themes: { light: 'github-light-high-contrast', dark: 'github-dark-default' },
    defaultColor: false,
  });
  return html.match(/<code[^>]*>([\s\S]*)<\/code>/)?.[1] ?? '';
}
