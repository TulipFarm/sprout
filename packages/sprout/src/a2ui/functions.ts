import { z } from 'zod';
import {
  EvaluationError,
  defineFunction,
  dynamicBooleanSchema,
  dynamicNumberSchema,
  dynamicStringSchema,
  dynamicValueSchema,
  interpolate,
  toBoolean,
  type CatalogFunction,
  type ValidationResult,
} from './core.js';

// --- The A2UI regex dialect ------------------------------------------------

type CharSet = (codePoint: number) => boolean;
type Item = { atom: Atom; min: number; max: number };
type Atom =
  | { kind: 'set'; set: CharSet }
  | { kind: 'group'; branches: Item[][] }
  | { kind: 'assert'; branches?: Item[][] };

const isDigit: CharSet = c => c >= 48 && c <= 57;
const isWord: CharSet = c => isDigit(c) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95;
const isSpace: CharSet = c => /\s/u.test(String.fromCodePoint(c));
const isLineTerminator: CharSet = c => c === 10 || c === 13 || c === 0x2028 || c === 0x2029;
const syntaxCharacters = '^$\\.*+?()[]{}|/';
// Enough code points to tell the dialect's character sets apart.
const samples = [...Array.from({ length: 128 }, (_, c) => c), 0xa0, 0xe9, 0x2028, 0x3000, 0x4e00, 0x1f600];
const overlaps = (left: CharSet, right: CharSet) => samples.some(c => left(c) && right(c));

const fail = (message: string): never => {
  throw new EvaluationError('EXPRESSION_ERROR', `regex: ${message}`);
};

function parsePattern(source: string): Item[][] {
  let at = 0;
  const peek = () => source[at];
  const hex = (count: number) => {
    const digits = source.slice(at, at + count);
    if (!new RegExp(`^[0-9a-fA-F]{${count}}$`).test(digits)) fail('bad hex escape.');
    at += count;
    return parseInt(digits, 16);
  };
  // Returns a set for a class escape, or one code point.
  const escape = (inClass: boolean): CharSet | number => {
    const char = source[at++];
    if (char === undefined) return fail('trailing backslash.');
    switch (char) {
      case 'd':
        return isDigit;
      case 'D':
        return c => !isDigit(c);
      case 'w':
        return isWord;
      case 'W':
        return c => !isWord(c);
      case 's':
        return isSpace;
      case 'S':
        return c => !isSpace(c);
      case 't':
        return 9;
      case 'n':
        return 10;
      case 'v':
        return 11;
      case 'f':
        return 12;
      case 'r':
        return 13;
      case 'x':
        return hex(2);
      case 'u':
        if (peek() === '{') {
          const end = source.indexOf('}', at);
          const digits = source.slice(at + 1, end);
          if (end < 0 || !/^[0-9a-fA-F]{1,6}$/.test(digits)) fail('bad \\u{...} escape.');
          at = end + 1;
          return parseInt(digits, 16);
        }
        return hex(4);
      case '0':
        if (isDigit(source.codePointAt(at) ?? 0)) fail('legacy octal escapes are not allowed.');
        return 0;
      case 'k':
        return fail('backreferences are not allowed.');
      case 'p':
      case 'P':
        return fail('\\p{...} is not allowed.');
      case 'c':
        return fail('\\cX is not allowed.');
      default:
        if (/[1-9]/.test(char)) fail('backreferences are not allowed.');
        if (syntaxCharacters.includes(char) || (inClass && char === '-')) return char.codePointAt(0)!;
        return fail(`unknown escape \\${char}.`);
    }
  };
  const characterClass = (): CharSet => {
    const negate = peek() === '^';
    if (negate) at++;
    const parts: CharSet[] = [];
    const single = (): CharSet | number => {
      if (at >= source.length) fail('unclosed character class.');
      if (peek() === '\\') {
        at++;
        return escape(true);
      }
      const code = source.codePointAt(at)!;
      at += code > 0xffff ? 2 : 1;
      return code;
    };
    while (peek() !== ']') {
      const start = single();
      if (peek() === '-' && source[at + 1] !== ']' && at + 1 < source.length) {
        at++;
        const end = single();
        if (typeof start !== 'number' || typeof end !== 'number' || start > end) fail('bad character range.');
        parts.push(c => c >= (start as number) && c <= (end as number));
      } else parts.push(typeof start === 'number' ? c => c === start : start);
    }
    at++;
    return c => parts.some(part => part(c)) !== negate;
  };
  const quantifier = (): [number, number] | undefined => {
    const char = peek();
    let bounds: [number, number] | undefined;
    if (char === '*') bounds = [0, Infinity];
    else if (char === '+') bounds = [1, Infinity];
    else if (char === '?') bounds = [0, 1];
    else if (char === '{') {
      const match = /^\{(\d+)(,(\d*))?\}/.exec(source.slice(at));
      if (!match) return fail('a lone { must be escaped.');
      const min = Number(match[1]);
      const max = match[2] === undefined ? min : match[3] ? Number(match[3]) : Infinity;
      if (max < min) fail('quantifier bounds are out of order.');
      at += match[0].length - 1;
      bounds = [min, max];
    }
    if (!bounds) return undefined;
    at++;
    if (peek() === '?') at++;
    return bounds;
  };
  const sequence = (): Item[] => {
    const items: Item[] = [];
    while (at < source.length && peek() !== '|' && peek() !== ')') {
      const char = source[at++]!;
      let atom: Atom;
      if (char === '(') {
        let lookaround = false;
        if (source.startsWith('?:', at)) at += 2;
        else if (source.startsWith('?=', at) || source.startsWith('?!', at)) {
          at += 2;
          lookaround = true;
        } else if (source.startsWith('?<=', at) || source.startsWith('?<!', at)) fail('lookbehind is not allowed.');
        else if (source.startsWith('?<', at)) fail('named groups are not allowed.');
        else if (peek() === '?') fail('inline flags are not allowed.');
        const branches = alternation();
        if (peek() !== ')') fail('unclosed group.');
        at++;
        atom = lookaround ? { kind: 'assert', branches } : { kind: 'group', branches };
      } else if (char === '[') atom = { kind: 'set', set: characterClass() };
      else if (char === '\\') {
        if (peek() === 'b' || peek() === 'B') {
          at++;
          atom = { kind: 'assert' };
        } else {
          const value = escape(false);
          atom = { kind: 'set', set: typeof value === 'number' ? c => c === value : value };
        }
      } else if (char === '^' || char === '$') atom = { kind: 'assert' };
      else if (char === '.') atom = { kind: 'set', set: c => !isLineTerminator(c) };
      else if ('*+?{}]'.includes(char)) return fail(`unexpected "${char}".`);
      else {
        const code = source.codePointAt(at - 1)!;
        if (code > 0xffff) at++;
        atom = { kind: 'set', set: c => c === code };
      }
      const bounds = quantifier();
      if (bounds && atom.kind === 'assert') fail('assertions cannot be quantified.');
      items.push({ atom, min: bounds?.[0] ?? 1, max: bounds?.[1] ?? 1 });
    }
    return items;
  };
  const alternation = (): Item[][] => {
    const branches = [sequence()];
    while (peek() === '|') {
      at++;
      branches.push(sequence());
    }
    return branches;
  };
  const result = alternation();
  if (at < source.length) fail('unbalanced parenthesis.');
  return result;
}

// A group whose only content is one atom counts as that atom, unless both
// repeat: the engine still backtracks through nested repeats such as (a+)+.
function unwrap(item: Item): Item {
  const { atom } = item;
  if (atom.kind !== 'group' || atom.branches.length !== 1 || atom.branches[0]!.length !== 1) return item;
  const inner = unwrap(atom.branches[0]![0]!);
  if (item.max > 1 && inner.max > 1) return item;
  return { atom: inner.atom, min: item.min * inner.min, max: item.max * inner.max };
}

const nullable = (item: Item): boolean =>
  item.min === 0 ||
  item.atom.kind === 'assert' ||
  (item.atom.kind === 'group' && item.atom.branches.some(branch => branch.every(nullable)));

function firstSet(items: readonly Item[]): CharSet {
  const sets: CharSet[] = [];
  for (const item of items) {
    const { atom } = item;
    if (atom.kind === 'set') sets.push(atom.set);
    else if (atom.kind === 'group') sets.push(...atom.branches.map(firstSet));
    if (!nullable(item)) break;
  }
  return c => sets.some(set => set(c));
}

const hasUnbounded = (branches: readonly Item[][]): boolean =>
  branches.some(branch =>
    branch.some(
      item =>
        item.max === Infinity ||
        (item.atom.kind !== 'set' && item.atom.branches ? hasUnbounded(item.atom.branches) : false),
    ),
  );

function checkSafety(branches: readonly Item[][]) {
  for (const branch of branches) {
    const items = branch.map(unwrap);
    items.forEach((item, index) => {
      const { atom } = item;
      if (atom.kind !== 'set' && atom.branches) checkSafety(atom.branches);
      if (atom.kind === 'group' && item.max > 1 && hasUnbounded(atom.branches))
        fail('a repeated group contains an unbounded quantifier.');
      if (atom.kind === 'group' && item.max === Infinity && atom.branches.length > 1) {
        const firsts = atom.branches.map(firstSet);
        for (let left = 0; left < firsts.length; left++)
          for (let right = left + 1; right < firsts.length; right++)
            if (overlaps(firsts[left]!, firsts[right]!))
              fail('an unbounded alternation has branches that start with the same character.');
      }
      if (item.max !== Infinity) return;
      for (let next = index + 1; next < items.length; next++) {
        const other = items[next]!;
        if (other.max === Infinity && overlaps(firstSet([item]), firstSet([other])))
          fail('two adjacent unbounded parts can match the same characters.');
        if (!nullable(other)) break;
      }
    });
  }
}

const maxPatternLength = 256;
const maxValueLength = 4096;

/** Compiles a pattern in the A2UI regex dialect, or throws an `EXPRESSION_ERROR`. */
export function compileRegex(pattern: string): RegExp {
  if ([...pattern].length > maxPatternLength) fail(`patterns are at most ${maxPatternLength} code points.`);
  checkSafety(parsePattern(pattern));
  try {
    return new RegExp(pattern, 'u');
  } catch (error) {
    return fail((error as Error).message);
  }
}

// --- Formatting ------------------------------------------------------------

const asNumber = (value: unknown) =>
  typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
const asString = (value: unknown) => (value === null || value === undefined ? '' : String(value));

function numberOptions(args: { decimals?: unknown; grouping?: unknown }): Intl.NumberFormatOptions {
  const decimals = asNumber(args.decimals);
  return {
    ...(Number.isInteger(decimals) && decimals >= 0 && decimals <= 20
      ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
      : {}),
    useGrouping: args.grouping === undefined || args.grouping === null ? true : toBoolean(args.grouping),
  };
}

const dateTokens = /'([^']*)'|yyyy|yy|MMMM|MMM|MM|M|dd|d|EEEE|EEE|E|HH|H|hh|h|mm|ss|a/g;

/** Formats a date with Unicode TR35 tokens such as `MMM d, yyyy` and `HH:mm`. */
export function formatDate(value: unknown, format: string, locale?: string): string {
  const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = value instanceof Date ? value : new Date(typeof value === 'number' ? value : asString(value));
  if (Number.isNaN(date.getTime())) throw new EvaluationError('EXPRESSION_ERROR', 'formatDate: not a date.');
  // A date without a time is a calendar day, so read it in UTC to keep the day.
  const timeZone = dateOnly ? 'UTC' : undefined;
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date);
  const get = (unit: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second') => {
    const values = {
      year: dateOnly ? date.getUTCFullYear() : date.getFullYear(),
      month: (dateOnly ? date.getUTCMonth() : date.getMonth()) + 1,
      day: dateOnly ? date.getUTCDate() : date.getDate(),
      hour: dateOnly ? 0 : date.getHours(),
      minute: dateOnly ? 0 : date.getMinutes(),
      second: dateOnly ? 0 : date.getSeconds(),
    };
    return values[unit];
  };
  const pad = (number: number) => String(number).padStart(2, '0');
  return format.replace(dateTokens, (token, literal: string | undefined) => {
    if (literal !== undefined) return literal === '' ? "'" : literal;
    switch (token) {
      case 'yyyy':
        return String(get('year'));
      case 'yy':
        return pad(get('year') % 100);
      case 'MMMM':
        return part({ month: 'long' });
      case 'MMM':
        return part({ month: 'short' });
      case 'MM':
        return pad(get('month'));
      case 'M':
        return String(get('month'));
      case 'dd':
        return pad(get('day'));
      case 'd':
        return String(get('day'));
      case 'EEEE':
        return part({ weekday: 'long' });
      case 'EEE':
      case 'E':
        return part({ weekday: 'short' });
      case 'HH':
        return pad(get('hour'));
      case 'H':
        return String(get('hour'));
      case 'hh':
        return pad(get('hour') % 12 || 12);
      case 'h':
        return String(get('hour') % 12 || 12);
      case 'mm':
        return pad(get('minute'));
      case 'ss':
        return pad(get('second'));
      default:
        return get('hour') < 12 ? 'AM' : 'PM';
    }
  });
}

// --- The basic functions ---------------------------------------------------

const valid: ValidationResult = { valid: true };
// No message, so the check's own message is shown; see toValidationResult.
const invalid = (code: string): ValidationResult => ({ valid: false, code, severity: 'error' });
const isEmpty = (value: unknown) =>
  value === null ||
  value === undefined ||
  value === false ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

const minMax = <T extends z.ZodType>(bound: T) =>
  z
    .strictObject({ value: dynamicValueSchema, min: bound.optional(), max: bound.optional() })
    .refine(args => args.min !== undefined || args.max !== undefined, 'Set min, max or both.');

const numberArgs = {
  value: dynamicNumberSchema,
  decimals: dynamicNumberSchema.optional(),
  grouping: dynamicBooleanSchema.optional(),
};
const isUri = (value: string) => /^[a-z][a-z0-9+.-]*:\S+$/i.test(value);

/** Opens HTTP, HTTPS and mailto links in a new tab. */
export function openLink(url: unknown) {
  const href = asString(url).trim();
  if (!/^(https?:\/\/|mailto:)/i.test(href))
    throw new EvaluationError('EXECUTION_ERROR', 'openUrl: only HTTP, HTTPS and mailto links open.');
  if (typeof window !== 'undefined') window.open(href, '_blank', 'noopener,noreferrer');
  return null;
}

/** A2UI's basic renderer functions: checks, formatting and logic, plus `openUrl`. */
export const basicFunctions = {
  required: defineFunction({
    description: 'Passes when the value is not empty: not null, an empty string or list, or false.',
    args: z.strictObject({ value: dynamicValueSchema }),
    returnType: 'validationResult',
    run: ({ value }) => (isEmpty(value) ? invalid('REQUIRED') : valid),
  }),
  regex: defineFunction({
    description:
      'Passes when the value contains a match for pattern. Patterns use the portable A2UI regex dialect: no backreferences, lookbehind, named groups or \\p{...}.',
    args: z.strictObject({
      value: dynamicStringSchema,
      pattern: z
        .string()
        .max(1024)
        .superRefine((pattern, context) => {
          try {
            compileRegex(pattern);
          } catch (error) {
            context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : String(error) });
          }
        }),
    }),
    returnType: 'validationResult',
    run: ({ value, pattern }) => {
      const text = asString(value);
      const expression = compileRegex(String(pattern));
      if ([...text].length > maxValueLength) return invalid('TOO_LONG');
      return expression.test(text) ? valid : invalid('PATTERN_MISMATCH');
    },
  }),
  length: defineFunction({
    description: 'Passes when the length of the text, or the number of chosen items, is within min and max.',
    args: minMax(z.number().int().min(0)),
    returnType: 'validationResult',
    run: ({ value, min, max }) => {
      const size = Array.isArray(value) ? value.length : [...asString(value)].length;
      if (typeof min === 'number' && size < min) return invalid('TOO_SHORT');
      if (typeof max === 'number' && size > max) return invalid('TOO_LONG');
      return valid;
    },
  }),
  numeric: defineFunction({
    description: 'Passes when the value is a number within min and max.',
    args: minMax(z.number()),
    returnType: 'validationResult',
    run: ({ value, min, max }) => {
      const number = value === '' || value === null ? NaN : asNumber(value);
      if (Number.isNaN(number)) return invalid('NOT_A_NUMBER');
      if (typeof min === 'number' && number < min) return invalid('TOO_SMALL');
      if (typeof max === 'number' && number > max) return invalid('TOO_LARGE');
      return valid;
    },
  }),
  email: defineFunction({
    description: 'Passes when the value looks like an email address.',
    args: z.strictObject({ value: dynamicStringSchema }),
    returnType: 'validationResult',
    run: ({ value }) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(asString(value)) ? valid : invalid('INVALID_EMAIL')),
  }),
  formatString: defineFunction({
    description:
      'Text with ${/path} or ${relative/path} values and ${function(name: value)} calls. Write \\${ for a literal ${.',
    args: z.strictObject({ value: dynamicStringSchema }),
    returnType: 'string',
    run: ({ value }, context) => interpolate(asString(value), context.evaluate),
  }),
  formatNumber: defineFunction({
    description: 'A number with grouping and a fixed number of decimals.',
    args: z.strictObject(numberArgs),
    returnType: 'string',
    run: args => {
      const number = asNumber(args.value);
      return Number.isNaN(number) ? '' : new Intl.NumberFormat(undefined, numberOptions(args)).format(number);
    },
  }),
  formatCurrency: defineFunction({
    description: 'A number as an amount of money in an ISO 4217 currency, such as USD.',
    args: z.strictObject({ ...numberArgs, currency: dynamicStringSchema }),
    returnType: 'string',
    run: args => {
      const number = asNumber(args.value);
      if (Number.isNaN(number)) return '';
      return new Intl.NumberFormat(undefined, {
        ...numberOptions(args),
        style: 'currency',
        currency: asString(args.currency),
      }).format(number);
    },
  }),
  formatDate: defineFunction({
    description: "A date or time with a Unicode pattern, such as 'MMM d, yyyy' or 'HH:mm'.",
    args: z.strictObject({ value: dynamicValueSchema, format: dynamicStringSchema }),
    returnType: 'string',
    run: ({ value, format }) =>
      value === null || value === undefined || value === '' ? '' : formatDate(value, asString(format)),
  }),
  pluralize: defineFunction({
    description: 'Picks the text for a count: zero, one, two, few, many or other.',
    args: z.strictObject({
      value: dynamicNumberSchema,
      zero: dynamicStringSchema.optional(),
      one: dynamicStringSchema.optional(),
      two: dynamicStringSchema.optional(),
      few: dynamicStringSchema.optional(),
      many: dynamicStringSchema.optional(),
      other: dynamicStringSchema,
    }),
    returnType: 'string',
    run: args => {
      const count = asNumber(args.value);
      if (count === 0 && args.zero !== undefined) return asString(args.zero);
      const category = new Intl.PluralRules().select(Number.isNaN(count) ? 0 : count) as keyof typeof args;
      return asString(args[category] ?? args.other);
    },
  }),
  openUrl: defineFunction({
    description: 'Opens a link in a new tab. Only from a button action.',
    args: z.strictObject({
      url: z.union([
        z.string().max(2048).refine(isUri, 'Use an absolute URL.'),
        dynamicStringSchema.options[1],
        dynamicStringSchema.options[2],
      ]),
    }),
    returnType: 'void',
    allowedCallers: 'rendererOnly',
    requiresUserActivation: true,
    run: ({ url }) => openLink(url),
  }),
  and: defineFunction({
    description: 'True when every value is true or a passing check.',
    args: z.strictObject({ values: z.array(dynamicBooleanSchema).min(2).max(50) }),
    returnType: 'boolean',
    run: ({ values }) => (values as unknown[]).every(toBoolean),
  }),
  or: defineFunction({
    description: 'True when any value is true or a passing check.',
    args: z.strictObject({ values: z.array(dynamicBooleanSchema).min(2).max(50) }),
    returnType: 'boolean',
    run: ({ values }) => (values as unknown[]).some(toBoolean),
  }),
  not: defineFunction({
    description: 'The opposite of a boolean or check.',
    args: z.strictObject({ value: dynamicBooleanSchema }),
    returnType: 'boolean',
    run: ({ value }) => !toBoolean(value),
  }),
} satisfies Record<string, CatalogFunction>;
