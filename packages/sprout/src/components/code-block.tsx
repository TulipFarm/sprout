"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from "react";
import type { ThemedToken } from "shiki/core";
import { Check } from "reicon-react/icons/Check";
import { Copy } from "reicon-react/icons/Copy";
import { cn } from "../internal/classes.js";
import {
  codeLanguageIds,
  codeLanguageNames,
  type CodeLanguage,
} from "../internal/languages.js";
import {
  codeTokens,
  embeddedLanguages,
  isLanguageReady,
  languageForFilename,
  loadCodeLanguage,
  maxHighlightedLength,
  resolveCodeLanguage,
} from "../internal/syntax.js";
import { Button } from "./button.js";

export type { CodeLanguage };
export { languageForFilename };

export const codeBlockVariantNames = ["inline", "file", "preview"] as const;
export type CodeBlockVariant = (typeof codeBlockVariantNames)[number];

/** Every language that gets syntax colors. Aliases and file extensions such as `ts`, `py`, and `yml` work too. */
export const codeBlockLanguages = codeLanguageIds;

export type CodeBlockCopyState = "idle" | "copying" | "copied" | "error";

export interface CodeBlockProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  code: string;
  /** A language name, alias, or extension. Defaults to the one `filename` implies, else plain text. */
  language?: string | undefined;
  /** Shown in the header instead of the language, and names the copy button and the scroll region. */
  filename?: string | undefined;
  lineNumbers?: boolean | undefined;
  /** Wraps long lines instead of scrolling sideways, for prose such as notes and Markdown. Hides line numbers. */
  wrap?: boolean | undefined;
  /**
   * `inline` is a bordered card capped at 24rem. `file` fills its parent's
   * height without a frame. `preview` is a frameless, headerless snippet
   * clipped to its parent, for hover cards and thumbnails.
   */
  variant?: CodeBlockVariant | undefined;
}

const copiedResetMs = 2000;

export function isHighlightedLanguage(language: string) {
  return resolveCodeLanguage(language) !== null;
}

/** The display name for a language, alias, or extension, such as “TypeScript” for `ts`. */
export function codeLanguageName(language: string) {
  const resolved = resolveCodeLanguage(language);
  return resolved ? codeLanguageNames[resolved] : "Plain text";
}

/**
 * Loads the grammars for these languages, so the next render colors them
 * at once. Await it before server rendering to send highlighted HTML.
 */
export async function preloadCodeLanguages(...languages: string[]) {
  await Promise.all(
    languages.flatMap((language) => {
      const resolved = resolveCodeLanguage(language);
      return resolved ? [loadCodeLanguage(resolved)] : [];
    }),
  );
}

function useCodeTokens(code: string, language: CodeLanguage | null) {
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

function tokenClass(token: ThemedToken) {
  const role = /--sprout-syntax-(?:token-)?([a-z-]+)/.exec(
    token.color ?? "",
  )?.[1];
  const classes =
    role && role !== "foreground" ? [`sprout-syntax-${role}`] : [];
  for (const [flag, name] of fontStyleClasses)
    if ((token.fontStyle ?? 0) & flag) classes.push(name);
  return classes.length ? classes.join(" ") : undefined;
}

export function CodeBlock({
  code,
  language,
  filename,
  lineNumbers = true,
  wrap = false,
  variant = "inline",
  className,
  ...props
}: CodeBlockProps) {
  const [copyState, setCopyState] = useState<CodeBlockCopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const resolved = resolveCodeLanguage(language, filename);
  const tokens = useCodeTokens(code, resolved);
  const lineCount = useMemo(() => code.split("\n").length, [code]);

  const copy = async () => {
    clearTimeout(timer.current);
    setCopyState("copying");
    try {
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
      timer.current = setTimeout(() => setCopyState("idle"), copiedResetMs);
    } catch {
      setCopyState("error");
    }
  };

  const languageLabel = resolved ? codeLanguageNames[resolved] : "Plain text";
  const label = filename ?? languageLabel;
  const copied = copyState === "copied";
  const preview = variant === "preview";
  return (
    <div
      data-slot="code-block"
      data-variant={variant}
      data-language={resolved ?? "text"}
      data-highlighted={tokens ? "" : undefined}
      data-wrap={wrap ? "" : undefined}
      data-copy-state={copyState}
      {...props}
      className={cn("sprout-code-block", className)}
    >
      {!preview && (
        <div className="sprout-code-block-header">
          <span className="sprout-code-block-label">{label}</span>
          <Button
            variant="ghost"
            size="sm"
            focusableWhenDisabled
            disabled={copyState === "copying"}
            onClick={() => void copy()}
            aria-label={`Copy ${filename ?? "code"}`}
            className="sprout-code-block-copy"
          >
            <span className="sprout-code-block-icon" aria-hidden="true">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </span>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      )}
      <div
        className="sprout-code-block-viewport"
        {...(preview
          ? {}
          : {
              tabIndex: 0,
              role: "region",
              "aria-label": filename ?? `${languageLabel} code`,
            })}
      >
        {lineNumbers && !wrap && (
          <pre aria-hidden="true" className="sprout-code-block-gutter">
            {Array.from({ length: lineCount }, (_, index) => index + 1).join(
              "\n",
            )}
          </pre>
        )}
        <pre className="sprout-code-block-pre">
          {tokens ? (
            <code className="sprout-code-block-syntax">
              {tokens.map((line, row) => (
                <Fragment key={row}>
                  {row > 0 && "\n"}
                  {line.map((token, index) => (
                    <span key={index} className={tokenClass(token)}>
                      {token.content}
                    </span>
                  ))}
                </Fragment>
              ))}
            </code>
          ) : (
            <code>{code}</code>
          )}
        </pre>
      </div>
      {copyState === "error" && (
        <p role="alert" className="sprout-code-block-error">
          Clipboard unavailable. Select the code to copy it, or try Copy again.
        </p>
      )}
      {!preview && (
        <span className="sprout-code-block-sr-only" role="status">
          {copied ? "Code copied to clipboard." : ""}
        </span>
      )}
    </div>
  );
}
