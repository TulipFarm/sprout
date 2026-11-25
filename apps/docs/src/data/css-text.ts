export type CssObject = { [key: string]: string | CssObject };

/** The CSS a registry item adds, written out the way shadcn writes it. */
export function cssText(css: CssObject, depth = 0): string {
  const pad = '  '.repeat(depth);
  return Object.entries(css)
    .map(([key, value]) =>
      typeof value === 'string' ? `${pad}${key}: ${value};` : `${pad}${key} {\n${cssText(value, depth + 1)}\n${pad}}`,
    )
    .join('\n');
}
