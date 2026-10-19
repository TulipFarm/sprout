import { useEffect, useMemo, useState } from "react";
import type { ThemedToken } from "shiki/core";
import type { CodeLanguage } from "./languages.js";
import {
  codeTokens,
  embeddedLanguages,
  isLanguageReady,
  loadCodeLanguage,
  maxHighlightedLength,
} from "./syntax.js";

export function useCodeTokens(code: string, language: CodeLanguage | null) {
  const [loaded, setLoaded] = useState(0);
  const highlightable =
    language !== null && code.length <= maxHighlightedLength;
  const needed = useMemo(
    () =>
      highlightable ? [language, ...embeddedLanguages(code, language)] : [],
    [code, language, highlightable],
  );
  const missing = needed.filter((name) => !isLanguageReady(name));
  const key = missing.join(" ");
  useEffect(() => {
    if (!key) return;
    let live = true;
    void Promise.all(
      key.split(" ").map((name) => loadCodeLanguage(name as CodeLanguage)),
    ).then(
      () => live && setLoaded((value) => value + 1),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [key]);
  return useMemo(
    () => (highlightable ? codeTokens(code, language) : null),
    // `loaded` and `key` re-run this once the grammars arrive.
    [code, language, highlightable, loaded, key],
  );
}

const fontStyleClasses = [
  [1, "sprout-syntax-italic"],
  [2, "sprout-syntax-bold"],
  [4, "sprout-syntax-underline"],
] as const;

export function tokenClass(token: ThemedToken) {
  const role = /--sprout-syntax-(?:token-)?([a-z-]+)/.exec(
    token.color ?? "",
  )?.[1];
  const classes =
    role && role !== "foreground" ? [`sprout-syntax-${role}`] : [];
  for (const [flag, name] of fontStyleClasses)
    if ((token.fontStyle ?? 0) & flag) classes.push(name);
  return classes.length ? classes.join(" ") : undefined;
}
