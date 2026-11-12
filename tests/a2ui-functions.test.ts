import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  basicFunctions,
  compileRegex,
  formatDate,
  openLink,
  type FunctionContext,
} from '../packages/sprout/src/a2ui/catalog.js';

const context: FunctionContext = {
  catalogId: 'sprout/basic@2',
  data: { name: 'Ada' },
  scope: '',
  index: undefined,
  userActivated: false,
  evaluate: value => (typeof value === 'object' && value !== null ? 'Ada' : value),
};

const run = (name: keyof typeof basicFunctions, args: Record<string, unknown>) =>
  basicFunctions[name].run!(args, context);

const failing = (code: string) => ({ valid: false, code, severity: 'error' });

describe('the A2UI regex dialect', () => {
  it.each([
    ['^\\d{3}-\\d{4}$', '555-1234', '55-1234'],
    ['^\\D\\W\\S$', 'a!x', '1!x'],
    ['^\\w+\\s\\w+$', 'hello world', 'hello'],
    ['^[^0-9]+$', 'abc', 'a1'],
    ['^[a-c\\-x]+$', 'a-x', 'd'],
    ['^[\\d\\s]+$', '1 2', 'a'],
    ['^\\t\\n\\v\\f\\r$', '\t\n\v\f\r', 'x'],
    ['^\\x41\\u0042\\u{43}$', 'ABC', 'abc'],
    ['^\\0$', '\0', '0'],
    ['^a.c$', 'abc', 'a\nc'],
    ['^(?:ab|cd)$', 'cd', 'ac'],
    ['^a(?=b)', 'ab', 'ac'],
    ['^a(?!b)', 'ac', 'ab'],
    ['\\bcat\\B', 'cats', 'cat'],
    ['^a{2}$', 'aa', 'a'],
    ['^a{1,}$', 'aaa', ''],
    ['^a{1,2}?$', 'aa', 'aaa'],
    ['^😀+$', '😀😀', 'x'],
    ['^[😀-😂]$', '😁', 'x'],
    ['^\\.\\*\\/?$', '.*/', '.'],
    ['^(a|b)+c$', 'abac', 'abc!'],
  ])('compiles %s', (pattern, match, miss) => {
    const expression = compileRegex(pattern);
    expect(expression.test(match)).toBe(true);
    expect(expression.test(miss)).toBe(false);
  });

  it.each([
    ['\\', 'trailing backslash'],
    ['\\xZZ', 'bad hex escape'],
    ['\\u{zz}', 'bad \\u{...} escape'],
    ['\\u{41', 'bad \\u{...} escape'],
    ['\\01', 'legacy octal'],
    ['\\k<a>', 'backreferences'],
    ['(a)\\1', 'backreferences'],
    ['\\p{L}', '\\p{...}'],
    ['\\P{L}', '\\p{...}'],
    ['\\cA', '\\cX'],
    ['\\q', 'unknown escape'],
    ['[abc', 'unclosed character class'],
    ['[z-a]', 'bad character range'],
    ['[\\d-z]', 'bad character range'],
    ['a{', 'a lone {'],
    ['a{3,1}', 'out of order'],
    ['(?<=a)b', 'lookbehind'],
    ['(?<!a)b', 'lookbehind'],
    ['(?<name>a)', 'named groups'],
    ['(?i)a', 'inline flags'],
    ['(a', 'unclosed group'],
    ['a)', 'unbalanced parenthesis'],
    ['*a', 'unexpected "*"'],
    [']', 'unexpected "]"'],
    ['^*', 'cannot be quantified'],
    ['(a+)+', 'unbounded quantifier'],
    ['(a|ab)*', 'start with the same character'],
    ['a+a+', 'adjacent unbounded'],
    ['\\d+\\w*', 'adjacent unbounded'],
    ['a'.repeat(257), 'at most 256'],
  ])('refuses %s', (pattern, message) => {
    expect(() => compileRegex(pattern)).toThrow(message);
  });

  it('lets bounded and separated repeats through', () => {
    expect(() => compileRegex('(ab){2,3}')).not.toThrow();
    expect(() => compileRegex('a+b+')).not.toThrow();
    expect(() => compileRegex('a+-a+')).not.toThrow();
    expect(() => compileRegex('(a|b)*')).not.toThrow();
  });
});

describe('formatDate', () => {
  it('formats every token for a date and time', () => {
    const date = new Date(2026, 2, 5, 14, 7, 9);
    expect(formatDate(date, "yyyy yy MM M dd d HH H hh h mm ss a 'at' ''", 'en-US')).toBe(
      "2026 26 03 3 05 5 14 14 02 2 07 09 PM at '",
    );
    expect(formatDate(date, 'MMMM MMM EEEE EEE E', 'en-US')).toBe('March Mar Thursday Thu Thu');
    expect(formatDate(new Date(2026, 0, 1, 0, 30).getTime(), 'h a', 'en-US')).toBe('12 AM');
  });

  it('keeps the calendar day of a date-only value', () => {
    expect(formatDate('2026-12-31', 'd MMM yyyy HH:mm', 'en-US')).toBe('31 Dec 2026 00:00');
  });

  it('refuses values that are not dates', () => {
    expect(() => formatDate('soon', 'yyyy')).toThrow('not a date');
    expect(() => formatDate(null, 'yyyy')).toThrow('not a date');
  });
});

describe('basic functions', () => {
  it('checks required values', () => {
    for (const value of [null, undefined, false, '  ', []])
      expect(run('required', { value })).toEqual(failing('REQUIRED'));
    for (const value of ['x', 0, true, ['a']]) expect(run('required', { value })).toEqual({ valid: true });
  });

  it('checks patterns and refuses huge values', () => {
    expect(run('regex', { value: 'abc', pattern: '^a' })).toEqual({ valid: true });
    expect(run('regex', { value: null, pattern: '^a' })).toEqual(failing('PATTERN_MISMATCH'));
    expect(run('regex', { value: 'a'.repeat(4097), pattern: '^a' })).toEqual(failing('TOO_LONG'));
    expect(basicFunctions.regex.args.safeParse({ value: 'a', pattern: '(a+)+' }).success).toBe(false);
  });

  it('checks lengths of text and lists', () => {
    expect(run('length', { value: 'ab', min: 3 })).toEqual(failing('TOO_SHORT'));
    expect(run('length', { value: ['a', 'b'], max: 1 })).toEqual(failing('TOO_LONG'));
    expect(run('length', { value: '😀', min: 1, max: 1 })).toEqual({ valid: true });
    expect(basicFunctions.length.args.safeParse({ value: 'a' }).success).toBe(false);
  });

  it('checks numbers', () => {
    expect(run('numeric', { value: '', min: 1 })).toEqual(failing('NOT_A_NUMBER'));
    expect(run('numeric', { value: null, min: 1 })).toEqual(failing('NOT_A_NUMBER'));
    expect(run('numeric', { value: {}, min: 1 })).toEqual(failing('NOT_A_NUMBER'));
    expect(run('numeric', { value: '0', min: 1 })).toEqual(failing('TOO_SMALL'));
    expect(run('numeric', { value: 11, max: 10 })).toEqual(failing('TOO_LARGE'));
    expect(run('numeric', { value: 5, min: 1, max: 10 })).toEqual({ valid: true });
  });

  it('checks email addresses', () => {
    expect(run('email', { value: 'ada@example.com' })).toEqual({ valid: true });
    expect(run('email', { value: 'ada@example' })).toEqual(failing('INVALID_EMAIL'));
    expect(run('email', { value: undefined })).toEqual(failing('INVALID_EMAIL'));
  });

  it('formats numbers and money', () => {
    expect(run('formatNumber', { value: 1234.5 })).toBe((1234.5).toLocaleString());
    expect(run('formatNumber', { value: '1234.5', decimals: 2, grouping: false })).toBe(
      new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, useGrouping: false }).format(1234.5),
    );
    expect(run('formatNumber', { value: 1, decimals: 99, grouping: null })).toBe('1');
    expect(run('formatNumber', { value: 'x' })).toBe('');
    expect(run('formatCurrency', { value: 'x', currency: 'USD' })).toBe('');
    expect(run('formatCurrency', { value: 5, currency: 'USD', decimals: 0 })).toBe(
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }).format(5),
    );
  });

  it('formats dates and leaves empty values empty', () => {
    expect(run('formatDate', { value: '2026-01-02', format: 'yyyy-MM-dd' })).toBe('2026-01-02');
    for (const value of [null, undefined, '']) expect(run('formatDate', { value, format: 'yyyy' })).toBe('');
  });

  it('picks plural forms', () => {
    const forms = { zero: 'none', one: 'one item', other: 'items' };
    expect(run('pluralize', { value: 0, ...forms })).toBe('none');
    expect(run('pluralize', { value: 1, ...forms })).toBe('one item');
    expect(run('pluralize', { value: 3, ...forms })).toBe('items');
    expect(run('pluralize', { value: 0, other: 'items' })).toBe('items');
    expect(run('pluralize', { value: 'x', one: 'one', other: 'items' })).toBe('items');
  });

  it('interpolates formatString through the caller', () => {
    expect(run('formatString', { value: 'Hi ${/name}' })).toBe('Hi Ada');
    expect(run('formatString', { value: null })).toBe('');
  });

  it('combines booleans and checks', () => {
    expect(run('and', { values: [true, { valid: true }] })).toBe(true);
    expect(run('and', { values: [true, { valid: false }] })).toBe(false);
    expect(run('or', { values: [false, { valid: true }] })).toBe(true);
    expect(run('or', { values: [false, false] })).toBe(false);
    expect(run('not', { value: { valid: false } })).toBe(true);
  });
});

describe('openLink', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does nothing on a server', () => {
    expect(openLink('https://example.com')).toBeNull();
  });

  it('opens only web and mail links', () => {
    const open = vi.fn();
    vi.stubGlobal('window', { open });
    expect(openLink(' mailto:ada@example.com ')).toBeNull();
    expect(open).toHaveBeenCalledWith('mailto:ada@example.com', '_blank', 'noopener,noreferrer');
    expect(() => openLink('javascript:alert(1)')).toThrow('only HTTP, HTTPS and mailto');
    expect(() => openLink(undefined)).toThrow('only HTTP, HTTPS and mailto');
    expect(basicFunctions.openUrl.args.safeParse({ url: 'example.com' }).success).toBe(false);
  });
});
