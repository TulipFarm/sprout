import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import {
  basicFunctions,
  catalogDefinition,
  checkMessage,
  checkSurface,
  compileRegex,
  defineCatalog,
  defineComponent,
  defineFunction,
  dynamicStringSchema,
  evaluate,
  evaluateChecks,
  formatDate,
  isIdentifier,
  markdownTable,
  markdownUrls,
  promptSnippet,
  readPath,
  readSurface,
  rendererMessageSchema,
  sproutCatalog,
  surfaceSchema,
  surfaceText,
  writePath,
  type Catalog,
  type SurfaceLimits,
} from '../packages/sprout/src/a2ui/catalog.js';

const version = '1.0';
const catalogs = [sproutCatalog];

function messages(
  components: Record<string, unknown>[],
  dataModel?: unknown,
  catalogId: string | undefined = sproutCatalog.id,
) {
  return [
    {
      version,
      createSurface: {
        surfaceId: 's1',
        ...(catalogId && { catalogId }),
        ...(dataModel !== undefined && { dataModel }),
      },
    },
    { version, updateComponents: { surfaceId: 's1', components } },
  ];
}

function check(
  components: Record<string, unknown>[],
  data?: unknown,
  limits?: Partial<SurfaceLimits>,
  list: readonly Catalog[] = catalogs,
) {
  return checkSurface(messages(components, data), { catalogs: list, ...(limits && { limits }) });
}

function errors(components: Record<string, unknown>[], data?: unknown, limits?: Partial<SurfaceLimits>) {
  const result = check(components, data, limits);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.errors.map(error => `${error.path} ${error.message}`);
}

function codes(components: Record<string, unknown>[], data?: unknown, list: readonly Catalog[] = catalogs) {
  const result = check(components, data, undefined, list);
  return result.ok ? [] : result.errors.map(error => error.code);
}

const memory = [
  { id: 'root', component: 'Column', children: ['summary', 'used', 'chart'] },
  { id: 'summary', component: 'Text', text: 'You are using **11.2 GB** of 16 GB.' },
  {
    id: 'used',
    component: 'Metric',
    label: 'Memory used',
    value: { '@path': '/used' },
    change: { value: '0.4 GB', direction: 'up', tone: 'negative', label: 'in 10 min' },
    trend: { '@path': '/trend' },
  },
  {
    id: 'chart',
    component: 'Chart',
    type: 'area',
    title: 'Memory',
    category: 'time',
    series: [{ key: 'gb', label: 'GB' }],
    rows: { '@path': '/points' },
  },
];
const memoryData = {
  used: '11.2 GB',
  trend: [10.8, 11, 11.2],
  points: [
    { time: '14:28', gb: 11 },
    { time: '14:29', gb: 11.2 },
  ],
};

const form = (
  checks: unknown[] = [
    { condition: { '@call': 'required', args: { value: { '@path': '/name' } } }, message: 'Enter a name.' },
  ],
) => [
  { id: 'root', component: 'Column', children: ['name', 'send'] },
  { id: 'name', component: 'TextField', label: 'Name', value: { '@path': '/name' }, '@checks': checks },
  {
    id: 'send',
    component: 'Button',
    label: 'Send',
    action: { event: { name: 'send', context: { name: { '@path': '/name' } } } },
  },
];

describe('checkSurface', () => {
  it('accepts a complete surface and returns its model', () => {
    const result = check(memory, memoryData);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.surface.surfaceId).toBe('s1');
    expect(result.surface.components.size).toBe(4);
    expect(readPath(result.surface.data, '/points/1/gb')).toBe(11.2);
  });

  it('takes components and data inline in createSurface', () => {
    const result = checkSurface(
      [
        {
          version,
          createSurface: {
            surfaceId: 's1',
            catalogId: sproutCatalog.id,
            components: memory,
            dataModel: memoryData,
            metadata: { extensions: {} },
          },
        },
      ],
      { catalogs },
    );
    expect(result.ok).toBe(true);
  });

  it('accepts only version 1.0 and no theme', () => {
    const old = checkSurface([{ version: 'v0.9.1', createSurface: { surfaceId: 's1', catalogId: sproutCatalog.id } }], {
      catalogs,
    });
    expect(old.ok).toBe(false);
    const themed = checkSurface(
      [{ version, createSurface: { surfaceId: 's1', catalogId: sproutCatalog.id, theme: { primaryColor: '#f00' } } }],
      { catalogs },
    );
    expect(themed.ok).toBe(false);
    expect(checkSurface('nope', { catalogs }).ok).toBe(false);
  });

  it('needs createSurface first and only once', () => {
    const update = { version, updateComponents: { surfaceId: 's1', components: [] } };
    expect(checkSurface([update], { catalogs })).toMatchObject({
      ok: false,
      errors: [{ path: '/0', message: 'The first message must be createSurface.' }],
    });
    const twice = [...messages(memory, memoryData), messages([])[0]!];
    const again = checkSurface(twice, { catalogs });
    expect(again.ok || again.errors[0]).toMatchObject({ code: 'INTEGRITY_ERROR' });
  });

  it('refuses deleteSurface, other surfaces and duplicate IDs', () => {
    const list = [
      ...messages([...memory, { id: 'summary', component: 'Divider' }], memoryData),
      { version, updateDataModel: { surfaceId: 'other', value: 1 } },
      { version, deleteSurface: { surfaceId: 's1' } },
    ];
    const result = checkSurface(list, { catalogs });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map(error => error.message)).toEqual([
      'Every message must target surface "s1".',
      'deleteSurface is not allowed here.',
    ]);
  });

  it('needs updateDataModel to carry a value, with null deleting', () => {
    const base = messages(memory, memoryData);
    expect(
      checkSurface([...base, { version, updateDataModel: { surfaceId: 's1', path: '/used' } }], { catalogs }).ok,
    ).toBe(false);
    expect(
      checkSurface([...base, { version, updateDataModel: { surfaceId: 's1', path: '/x', value: null } }], { catalogs })
        .ok,
    ).toBe(true);
  });

  it('needs a root, known components and valid props', () => {
    expect(errors([{ id: 'a', component: 'Column', children: [] }])).toContain(
      ' One component must have the ID "root".',
    );
    expect(codes([{ id: 'root', component: 'Marquee' }])).toEqual(['VALIDATION_FAILED']);
    expect(codes([{ id: 'root', component: 'Text', text: 'hi', style: 'color: red' }])).toEqual(['VALIDATION_FAILED']);
    expect(codes([{ id: 'root', component: 'Image', src: 'https://example.com/a.png' }])).toEqual([
      'VALIDATION_FAILED',
    ]);
  });

  it('finds missing children, cycles, orphans and deep trees', () => {
    expect(errors([{ id: 'root', component: 'Column', children: ['gone'] }])).toEqual([
      '/1/updateComponents/components/0/children/0 Component "gone" does not exist.',
    ]);
    expect(
      errors([
        { id: 'root', component: 'Column', children: ['a'] },
        { id: 'a', component: 'Column', children: ['root'] },
      ]),
    ).toEqual(['/1/updateComponents/components/0 Component "root" contains itself.']);
    expect(
      errors([
        { id: 'root', component: 'Column', children: [] },
        { id: 'lost', component: 'Divider' },
      ]),
    ).toEqual(['/1/updateComponents/components/1 Component "lost" is not reachable from "root".']);
    const chain = Array.from({ length: 4 }, (_, index) => ({
      id: index === 0 ? 'root' : `c${index}`,
      component: 'Column',
      children: index === 3 ? [] : [`c${index + 1}`],
    }));
    expect(errors(chain, undefined, { depth: 2 })).toContain(
      '/1/updateComponents/components/2 The tree is deeper than 2 levels.',
    );
  });

  it('expands templates over the data model', () => {
    const list = [
      { id: 'root', component: 'List', children: { componentId: 'item', path: '/apps' } },
      { id: 'item', component: 'Text', text: { '@path': 'name' } },
    ];
    const result = check(list, { apps: [{ name: 'Chrome' }, { name: 'Slack' }] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(surfaceText(result.surface, catalogs)).toBe('- Chrome\n- Slack');
    expect(check(list, { apps: [] }).ok).toBe(true);
    expect(errors(list, { apps: 'none' })).toEqual([
      '/1/updateComponents/components/0/children/path "/apps" is not a list in the data model.',
    ]);
  });

  it('allows @index only inside a template', () => {
    const indexed = (children: unknown) => [
      { id: 'root', component: 'List', children },
      { id: 'item', component: 'Text', text: { '@call': 'formatString', args: { value: 'Item ${@index()}' } } },
    ];
    expect(check(indexed({ componentId: 'item', path: '/apps' }), { apps: [1, 2] }).ok).toBe(true);
    expect(codes(indexed(['item']))).toEqual(['EXPRESSION_ERROR']);
  });

  it('enforces size limits', () => {
    expect(errors(memory, memoryData, { bytes: 100 })[0]).toMatch(/bytes; the limit is 100\.$/);
    expect(errors(memory, memoryData, { components: 2 })).toContain(' The surface has 4 components; the limit is 2.');
    expect(errors(memory, memoryData, { textLength: 5 })).toEqual([
      ' The surface has 35 characters of text; the limit is 5.',
    ]);
    const table = (rows: unknown) => [
      { id: 'root', component: 'Table', label: 'Apps', columns: [{ key: 'name', label: 'Name' }], rows },
    ];
    expect(errors(table([{ name: 'a' }, { name: 'b' }]), undefined, { tableRows: 1 })).toEqual([
      '/1/updateComponents/components/0/rows The table has 2 rows; the limit is 1.',
    ]);
  });

  it('checks chart data', () => {
    const chart = (props: Record<string, unknown>) => [
      {
        id: 'root',
        component: 'Chart',
        type: 'bar',
        title: 'Apps',
        category: 'name',
        series: [{ key: 'gb', label: 'GB' }],
        rows: [{ name: 'a', gb: 1 }],
        ...props,
      },
    ];
    expect(check(chart({})).ok).toBe(true);
    expect(errors(chart({ rows: [{ name: 'a', gb: '1' }] }))).toEqual([
      '/1/updateComponents/components/0/rows Every row needs a number for each series key.',
    ]);
  });

  it('refuses unsafe links and Markdown images unless the app allows them', () => {
    expect(errors([{ id: 'root', component: 'Text', text: '[go](javascript:alert(1))' }])).toHaveLength(1);
    expect(check([{ id: 'root', component: 'Text', text: '[docs](https://example.com)' }]).ok).toBe(true);
    const image = messages([{ id: 'root', component: 'Text', text: '![chart](https://example.com/a.png)' }]);
    expect(checkSurface(image, { catalogs }).ok).toBe(false);
    expect(checkSurface(image, { catalogs, allowUrl: (_url, kind) => kind === 'image' }).ok).toBe(true);
  });
});

describe('reserved keys and identifiers', () => {
  it('reads @path bindings and leaves bare path objects literal', () => {
    const table = (rows: unknown) => [
      { id: 'root', component: 'Table', label: 'Files', columns: [{ key: 'path', label: 'Path' }], rows },
    ];
    expect(check(table([{ path: '/var/log' }])).ok).toBe(true);
    expect(check(table({ '@path': '/rows' }), { rows: [{ path: '/a' }] }).ok).toBe(true);
  });

  it('rejects unknown single-@ keys and unknown envelope keys', () => {
    const result = checkMessage(
      {
        version,
        updateComponents: {
          surfaceId: 's1',
          components: [{ id: 'root', component: 'Text', text: 'hi', '@style': 'x' }],
        },
      },
      { catalogs, catalogId: sproutCatalog.id },
    );
    expect(result.map(error => error.code)).toContain('INVALID_RESERVED_KEY');
    const value = checkMessage(
      {
        version,
        updateComponents: {
          surfaceId: 's1',
          components: [
            { id: 'root', component: 'Table', label: 'T', columns: [{ key: 'a', label: 'A' }], rows: [{ '@if': 1 }] },
          ],
        },
      },
      { catalogs, catalogId: sproutCatalog.id },
    );
    expect(value.map(error => error.code)).toContain('INVALID_RESERVED_KEY');
  });

  it('unescapes @@ keys to a literal @', () => {
    const result = evaluate({ '@@path': '/static', nested: [{ '@@type': 'x' }] }, { catalogs, data: {} });
    expect(result).toEqual({ status: 'done', value: { '@path': '/static', nested: [{ '@type': 'x' }] } });
  });

  it('uses UAX #31 identifiers for IDs and names', () => {
    expect(isIdentifier('name_2')).toBe(true);
    expect(isIdentifier('名前')).toBe(true);
    expect(isIdentifier('first-name')).toBe(false);
    expect(isIdentifier('2nd')).toBe(false);
    expect(
      codes([
        { id: 'root', component: 'Column', children: ['first-name'] },
        { id: 'first-name', component: 'Divider' },
      ]),
    ).toContain('VALIDATION_FAILED');
    const Any = defineComponent({ description: 'x', props: z.strictObject({}) });
    expect(() => defineCatalog({ id: 'x', components: { 'my-thing': Any } })).toThrow('Component name "my-thing"');
    expect(() => defineCatalog({ id: 'x', components: { Surface: Any } })).toThrow('reserved');
    expect(() =>
      defineCatalog({
        id: 'x',
        components: { Thing: defineComponent({ description: 'x', props: z.strictObject({ 'a-b': z.string() }) }) },
      }),
    ).toThrow('Prop "Thing.a-b"');
    expect(() =>
      defineCatalog({
        id: 'x',
        functions: {
          go: defineFunction({
            description: 'x',
            returnType: 'void',
            requiresUserActivation: true,
            allowedCallers: 'agentOnly',
          }),
        },
      }),
    ).toThrow('rendererOnly');
  });
});

describe('catalog mixing', () => {
  const Ticket = defineComponent({
    description: 'A ticket.',
    props: z.strictObject({ title: dynamicStringSchema }),
    allowedParents: ['Surface', 'Column'],
  });
  const app = defineCatalog({
    id: 'app/tickets@1',
    components: { Ticket },
    functions: {
      lookupOwner: defineFunction({
        description: 'Finds the owner.',
        args: z.strictObject({ id: z.string() }),
        returnType: 'string',
      }),
      refresh: defineFunction({ description: 'Refreshes.', returnType: 'void', allowedCallers: 'agentOnly' }),
    },
  });
  const both = [sproutCatalog, app];

  it('resolves @catalogId per component, then the surface default', () => {
    const tree = [
      { id: 'root', component: 'Column', children: ['ticket'] },
      {
        id: 'ticket',
        component: 'Ticket',
        '@catalogId': app.id,
        title: { '@call': 'lookupOwner', catalogId: app.id, args: { id: '7' } },
      },
    ];
    expect(check(tree, undefined, undefined, both).ok).toBe(true);
    expect(codes(tree)).toContain('VALIDATION_FAILED');
    expect(
      codes(
        [
          { id: 'root', component: 'Column', children: ['t'] },
          { id: 't', component: 'Ticket', title: 'x' },
        ],
        undefined,
        both,
      ),
    ).toContain('VALIDATION_FAILED');
  });

  it('has no fallback when the surface names no catalog', () => {
    const result = checkSurface(messages([{ id: 'root', component: 'Column', children: [] }], undefined, ''), {
      catalogs,
    });
    expect(result.ok || result.errors[0]!.message).toMatch(/no catalog/);
  });

  it('rejects agent-only and unknown functions in components', () => {
    const call = (name: string) => [
      { id: 'root', component: 'Column', children: ['t'] },
      { id: 't', component: 'Ticket', '@catalogId': app.id, title: { '@call': name, catalogId: app.id } },
    ];
    expect(codes(call('refresh'), undefined, both)).toEqual(['INVALID_FUNCTION_CALL']);
    expect(codes(call('nothing'), undefined, both)).toEqual(['INVALID_FUNCTION_CALL']);
  });

  it('enforces allowedParents and allowedChildren', () => {
    expect(
      codes([
        { id: 'root', component: 'Row', children: ['d'] },
        { id: 'd', component: 'Divider' },
      ]),
    ).toEqual(['UNALLOWED_PARENT']);
    expect(codes([{ id: 'root', component: 'Divider' }])).toEqual(['UNALLOWED_PARENT']);
    const Strict = defineComponent({
      description: 'Only text.',
      props: z.strictObject({ children: z.array(z.string()) }),
      allowedChildren: ['Text'],
      children: props => [{ prop: 'children', ids: props.children }],
    });
    const strict = defineCatalog({
      id: 'strict@1',
      components: { Strict, Text: sproutCatalog.components.Text!, Badge: sproutCatalog.components.Badge! },
    });
    const tree = (child: string) => [
      { id: 'root', component: 'Strict', children: ['c'] },
      { id: 'c', component: child, text: 'x' },
    ];
    expect(checkSurface(messages(tree('Text'), undefined, strict.id), { catalogs: [strict] }).ok).toBe(true);
    const bad = checkSurface(messages(tree('Badge'), undefined, strict.id), { catalogs: [strict] });
    expect(bad.ok || bad.errors.map(error => error.code)).toEqual(['UNALLOWED_CHILD']);
  });
});

describe('forms and functions', () => {
  it('accepts form fields with checks and refuses checks on display components', () => {
    expect(check(form(), { name: '' }).ok).toBe(true);
    expect(codes([{ id: 'root', component: 'Text', text: 'x', '@checks': [] }])).toEqual(['VALIDATION_FAILED']);
  });

  it('has no password fields', () => {
    expect(
      codes([
        { id: 'root', component: 'Column', children: ['p'] },
        { id: 'p', component: 'TextField', label: 'P', value: '', variant: 'obscured' },
      ]),
    ).toEqual(['VALIDATION_FAILED']);
  });

  it('checks function arguments and return types', () => {
    const tree = (condition: unknown) => form([{ condition, message: 'x' }]);
    expect(codes(tree({ '@call': 'required' }))).toEqual(['INVALID_FUNCTION_CALL']);
    expect(codes(tree({ '@call': 'formatNumber', args: { value: 1 } }))).toEqual(['INVALID_FUNCTION_CALL']);
    expect(codes(tree({ '@call': 'regex', args: { value: 'a', pattern: '(a+)+' } }))).toEqual([
      'INVALID_FUNCTION_CALL',
    ]);
  });

  it('only lets a button action call a function that needs user activation', () => {
    const open = { '@call': 'openUrl', args: { url: 'https://example.com' } };
    const button = (action: unknown) => [
      { id: 'root', component: 'Column', children: ['b'] },
      { id: 'b', component: 'Button', label: 'Open', action },
    ];
    expect(check(button({ functionCall: open })).ok).toBe(true);
    expect(codes([{ id: 'root', component: 'Text', text: open }])).toEqual(['EXPRESSION_ERROR']);
    expect(codes(button({ functionCall: { ...open, args: { url: 'javascript:alert(1)' } } }))).toContain(
      'VALIDATION_FAILED',
    );
  });

  it('evaluates checks against the data model', () => {
    const rules = [
      { condition: { '@call': 'required', args: { value: { '@path': '/name' } } }, message: 'Enter a name.' },
      { condition: { '@call': 'length', args: { value: { '@path': '/name' }, max: 3 } }, message: 'Too long.' },
      { condition: { '@call': 'email', args: { value: { '@path': '/mail' } } }, message: 'Bad email.' },
    ];
    const run = (data: unknown) => evaluateChecks(rules, { catalogs, catalogId: sproutCatalog.id, data });
    expect(run({ name: 'Ada', mail: 'a@b.co' })).toMatchObject({ valid: true, failures: [] });
    expect(run({ name: '', mail: 'nope' }).failures.map(failure => failure.message)).toEqual([
      'Enter a name.',
      'Bad email.',
    ]);
    expect(
      evaluateChecks([{ condition: rules[0]!.condition }], { catalogs, catalogId: sproutCatalog.id, data: {} })
        .failures,
    ).toEqual([{ valid: false, code: 'REQUIRED', message: 'This field is required.', severity: 'error' }]);
    expect(run({ name: 'Ada Lovelace', mail: 'a@b.co' }).failures.map(failure => failure.message)).toEqual([
      'Too long.',
    ]);
  });

  it('runs the standard functions', () => {
    const run = (value: unknown, data: unknown = {}) =>
      evaluate(value, { catalogs, catalogId: sproutCatalog.id, data });
    expect(
      run(
        { '@call': 'formatString', args: { value: 'Hi ${/name}, ${formatNumber(value: ${/n}, decimals: 1)}' } },
        { name: 'Ada', n: 2 },
      ),
    ).toEqual({
      status: 'done',
      value: 'Hi Ada, 2.0',
    });
    expect(run({ '@call': 'and', args: { values: [true, { '@call': 'not', args: { value: false } }] } })).toEqual({
      status: 'done',
      value: true,
    });
    expect(run({ '@call': 'pluralize', args: { value: 2, one: 'file', other: 'files' } })).toEqual({
      status: 'done',
      value: 'files',
    });
    expect(run({ '@call': 'formatCurrency', args: { value: 3, currency: 'USD' } })).toMatchObject({ status: 'done' });
    expect(formatDate('2026-03-04', 'yyyy-MM-dd')).toBe('2026-03-04');
    expect(Object.keys(basicFunctions)).toHaveLength(14);
  });

  it('refuses regexes that could run forever', () => {
    expect(compileRegex('^[a-z]+$')?.test('abc')).toBe(true);
    expect(() => compileRegex('(a+)+$')).toThrow();
    expect(() => compileRegex('(a)\\1')).toThrow();
  });
});

describe('message schemas', () => {
  it('accepts renderer messages and keeps function responses to value or error', () => {
    const response = (body: unknown) =>
      rendererMessageSchema.safeParse({ version, rendererFunctionResponse: body }).success;
    expect(response({ functionCallId: 'c1', value: 1 })).toBe(true);
    expect(response({ functionCallId: 'c1', error: { code: 'EXECUTION_ERROR', message: 'x' } })).toBe(true);
    expect(response({ functionCallId: 'c1', value: 1, error: { code: 'x', message: 'x' } })).toBe(false);
    const error = (body: unknown) =>
      rendererMessageSchema.safeParse({ version, error: { message: 'x', ...(body as object) } }).success;
    expect(error({ code: 'VALIDATION_FAILED', surfaceId: 's1', path: '/0' })).toBe(true);
    expect(error({ code: 'VALIDATION_FAILED', surfaceId: 's1' })).toBe(false);
    expect(error({ code: 'INVALID_FUNCTION_CALL', functionCallId: 'c1' })).toBe(true);
    expect(error({ code: 'INVALID_FUNCTION_CALL', surfaceId: 's1', functionCallId: 'c1' })).toBe(false);
  });

  it('parses a whole surface', () => {
    expect(surfaceSchema.safeParse(messages(memory, memoryData)).success).toBe(true);
  });
});

describe('readSurface', () => {
  it('skips what it cannot read, so a stream can draw early', () => {
    const surface = readSurface([
      null,
      { version, updateComponents: { surfaceId: 's1', components: [{ id: 'x', component: 'Divider' }] } },
      { version, createSurface: { surfaceId: 's1', catalogId: sproutCatalog.id } },
      {
        version,
        updateComponents: { surfaceId: 's1', components: [{ id: 'root' }, { id: 'a', component: 'Divider' }] },
      },
      { version, updateDataModel: { surfaceId: 's1', path: '/a/0/b', value: 1 } },
      { version, updateDataModel: { surfaceId: 's1', path: '/__proto__/polluted', value: true } },
      { version, updateDataModel: { surfaceId: 's1', path: '/c', value: 2 } },
      { version, updateDataModel: { surfaceId: 's1', path: '/c', value: null } },
    ])!;
    expect([...surface.components.keys()]).toEqual(['a']);
    expect(surface.data).toEqual({ a: [{ b: 1 }] });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('removes list items and marks deleted surfaces', () => {
    const surface = readSurface([
      ...messages([], { list: [1, 2, 3] }),
      { version, updateDataModel: { surfaceId: 's1', path: '/list/1', value: null } },
      { version, deleteSurface: { surfaceId: 's1' } },
    ])!;
    expect(surface.data).toEqual({ list: [1, 3] });
    expect(surface.deleted).toBe(true);
  });

  it('reads and writes escaped JSON Pointer segments without mutating', () => {
    expect(readPath({ 'a/b': { '~c': 1 } }, '/a~1b/~0c')).toBe(1);
    expect(readPath({ a: 1 }, '/a/b')).toBeUndefined();
    const data = { a: { b: 1 } };
    expect(writePath(data, '/a/c', 2)).toEqual({ a: { b: 1, c: 2 } });
    expect(data).toEqual({ a: { b: 1 } });
  });
});

describe('surfaceText', () => {
  it('writes every component as Markdown in tree order', () => {
    const components = [
      { id: 'root', component: 'Section', title: 'Report', children: ['h', 'card', 'tabs', 'tail'] },
      { id: 'h', component: 'Heading', text: 'Memory', level: 1 },
      { id: 'card', component: 'Card', title: 'Used', description: 'Now', children: ['badge'] },
      { id: 'badge', component: 'Badge', text: 'High', tone: 'warning' },
      { id: 'tabs', component: 'Tabs', tabs: [{ label: 'Apps', child: 'table' }] },
      {
        id: 'table',
        component: 'Table',
        label: 'Apps',
        columns: [{ key: 'name', label: 'Name' }],
        rows: [{ name: 'a|b' }],
      },
      { id: 'tail', component: 'Column', children: ['callout', 'divider', 'check'] },
      { id: 'callout', component: 'Callout', tone: 'warning', title: 'Warning:', text: 'Filling up' },
      { id: 'divider', component: 'Divider' },
      { id: 'check', component: 'CheckBox', label: 'Notify me', value: true },
    ];
    const surface = readSurface(messages(components))!;
    expect(surfaceText(surface, catalogs)).toBe(
      [
        '### Report',
        '## Memory',
        '**Used**',
        'Now',
        '[High]',
        '### Apps',
        '| Name |\n| --- |\n| a\\|b |',
        '**Warning:** Filling up',
        '---',
        '[x] Notify me',
      ].join('\n\n'),
    );
  });
});

describe('catalog helpers', () => {
  it('describes the catalog as A2UI 1.0 JSON Schema', () => {
    const definition = catalogDefinition(sproutCatalog) as Record<string, any>;
    expect(definition.catalogId).toBe('sprout/basic@2');
    expect(definition.protocolVersion).toBe('1.0');
    expect(definition.components.TextField.checkable ?? definition.components.TextField).toBeTruthy();
    expect(definition.functions.openUrl).toMatchObject({
      returnType: 'void',
      allowedCallers: 'rendererOnly',
      requiresUserActivation: true,
    });
    expect(Object.keys(definition.functions)).toHaveLength(14);
  });

  it('writes a compact prompt', () => {
    const prompt = promptSnippet(sproutCatalog);
    expect(prompt).toContain('A2UI 1.0, catalog "sprout/basic@2"');
    expect(prompt).toContain('{"@path": "/pointer"}');
    expect(prompt).toContain('- TextField (checkable)');
    expect(prompt).toContain('- openUrl');
  });

  it('writes Markdown tables and finds Markdown links', () => {
    expect(markdownTable([{ key: 'a', label: 'A' }], [{ a: 'x\ny' }])).toBe('| A |\n| --- |\n| x y |');
    expect(markdownUrls('[a](https://a.test) ![b]( <https://b.test> ) <mailto:c@d.test>')).toEqual([
      'https://a.test',
      'https://b.test',
      'mailto:c@d.test',
    ]);
  });

  it('keeps the catalog entry point free of React', () => {
    for (const file of ['catalog.ts', 'core.ts', 'functions.ts']) {
      const source = readFileSync(new URL(`../packages/sprout/src/a2ui/${file}`, import.meta.url), 'utf8');
      expect(source).not.toMatch(/from ['"](react|react-dom)|from ['"]\.\/surface/);
    }
  });
});
