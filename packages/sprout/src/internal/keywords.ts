import type { RichTextKeyword } from '../components/rich-text-editor.js';

export type KeywordHit = { keyword: RichTextKeyword; from: number; to: number };
export type KeywordPattern = { regex: RegExp; terms: Map<string, RichTextKeyword> };

/** Stands in for code, inline nodes, and line breaks, so offsets line up and words don't join across them. */
export const objectReplacement = '\ufffc';

export const accountLabel = (keyword: RichTextKeyword) =>
  keyword.accounts?.find(account => account.id === keyword.account)?.label ?? keyword.account;

/** A keyword explains itself on hover when it is disconnected or names the account it uses. */
export const hasHint = (keyword: RichTextKeyword) => keyword.connected === false || !!keyword.account;

const normalizeTerm = (term: string) => term.trim().toLowerCase().replace(/\s+/g, ' ');

export function keywordPattern(keywords: readonly RichTextKeyword[]): KeywordPattern | null {
  const terms = new Map<string, RichTextKeyword>();
  for (const keyword of keywords)
    for (const term of keyword.match?.length ? keyword.match : [keyword.label]) {
      const key = normalizeTerm(term);
      if (key && !terms.has(key)) terms.set(key, keyword);
    }
  if (!terms.size) return null;
  const alternatives = [...terms.keys()]
    .sort((a, b) => b.length - a.length)
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'));
  return {
    regex: new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}_])`, 'giu'),
    terms,
  };
}

export function scanText(text: string, pattern: KeywordPattern, offset: number, hits: KeywordHit[]) {
  for (const match of text.matchAll(pattern.regex)) {
    const keyword = pattern.terms.get(normalizeTerm(match[0]));
    if (keyword) hits.push({ keyword, from: offset + match.index, to: offset + match.index + match[0].length });
  }
}
