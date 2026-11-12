import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import {
  catalogDefinition,
  checkMessage,
  checkSurface,
  defineCatalog,
  defineComponent,
  defineFunction,
  evaluate,
  evaluateChecks,
  expandChildren,
  interpolate,
  markdownTable,
  promptSnippet,
  readSurface,
  sproutCatalog,
  surfaceText,
  toBoolean,
  toValidationResult,
  writePath,
  type Catalog,
  type EvaluateOptions,
  type SurfaceLimits,
} from '../packages/sprout/src/a2ui/catalog.js';

const version = '1.0';
const catalogs = [sproutCatalog];

const surface = (components: unknown[], dataModel?: Record<string, unknown>, extra: unknown[] = []) => [
  { version, createSurface: { surfaceId: 's', catalogId: sproutCatalog.id, ...(dataModel && { dataModel }) } },
  { version, updateComponents: { surfaceId: 's', components } },
  ...extra,
];

function problems(
  components: unknown[],
  dataModel?: Record<string, unknown>,
  options: { limits?: Partial<SurfaceLimits>; list?: readonly Catalog[]; extra?: unknown[] } = {},
) {
  const result = checkSurface(surface(components, dataModel, options.extra), {
    catalogs: options.list ?? catalogs,
    ...(options.limits && { limits: options.limits }),
  });
  return result.ok ? [] : result.errors.map(error => `${error.code} ${error.path} ${error.message}`);
}

const root = (...children: string[]) => ({ id: 'root', component: 'Column', children });

const appCatalog = defineCatalog({
  id: 'app@1',
  components: {
    Box: defineComponent({
      description: 'A box.',
      props: z.strictObject({ children: z.array(z.string()) }),
      allowedChildren: ['Text'],
      children: props => [{ prop: 'children', ids: props.children }],
    }),
  },
  functions: {
    agentOnlyThing: defineFunction({ description: 'Agent only.', returnType: 'string', allowedCallers: 'agentOnly' }),
    lookup: defineFunction({
      description: 'Looks up a name on the agent.',
      args: z.strictObject({ id: z.string() }),
      returnType: 'string',
    }),
    later: defineFunction({ description: 'Async.', returnType: 'string', run: () => Promise.resolve('done') }),
    label: defineFunction({ description: 'A label.', returnType: 'string', run: () => 'label' }),
    broken: defineFunction({
      description: 'Throws.',
      returnType: 'string',
      run: () => {
        throw 'plain failure';
      },
    }),
    crash: defineFunction({
      description: 'Throws an Error.',
      returnType: 'string',
      run: () => {
        throw new Error('crashed');
      },
    }),
    touch: defineFunction({ description: 'Needs a click.', returnType: 'void', requiresUserActivation: true }),
  },
});

describe('defineCatalog', () => {
  it('refuses bad catalogs', () => {
    const props = z.strictObject({});
    expect(() => defineCatalog({ id: '' })).toThrow('needs an ID');
    expect(() =>
      defineCatalog({ id: 'x', components: { 'my-box': defineComponent({ description: '', props }) } }),
    ).toThrow('Component name "my-box"');
    expect(() =>
      defineCatalog({ id: 'x', components: { Surface: defineComponent({ description: '', props }) } }),
    ).toThrow('reserved');
    expect(() =>
      defineCatalog({
        id: 'x',
        components: { Box: defineComponent({ description: '', props: z.strictObject({ 'max-width': z.number() }) }) },
      }),
    ).toThrow('Prop "Box.max-width"');
    expect(() =>
      defineCatalog({ id: 'x', functions: { 'to-upper': defineFunction({ description: '', returnType: 'string' }) } }),
    ).toThrow('Function name "to-upper"');
    expect(() =>
      defineCatalog({
        id: 'x',
        functions: {
          upper: defineFunction({ description: '', args: z.strictObject({ 'a-b': z.string() }), returnType: 'string' }),
        },
      }),
    ).toThrow('Argument "upper.a-b"');
    expect(() =>
      defineCatalog({
        id: 'x',
        functions: {
          open: defineFunction({
            description: '',
            returnType: 'void',
            requiresUserActivation: true,
            allowedCallers: 'rendererOrAgent',
          }),
        },
      }),
    ).toThrow('must be rendererOnly');
  });

  it('describes a minimal catalog without functions or instructions', () => {
    const bare = defineCatalog({ id: 'bare@1' });
    expect(bare).toEqual({ id: 'bare@1', protocolVersion: '1.0', components: {}, functions: {} });
    const definition = catalogDefinition(bare);
    expect(definition).not.toHaveProperty('title');
    expect(definition).not.toHaveProperty('instructions');
    expect(promptSnippet(bare)).not.toContain('Functions:');
    expect(promptSnippet(bare)).not.toContain('Instructions:');
  });

  it('describes allowedChildren, callers and functions without arguments', () => {
    const definition = catalogDefinition(appCatalog) as Record<string, any>;
    expect(definition.components.Box.allowedChildren).toEqual(['Text']);
    expect(definition.functions.label).toMatchObject({ allowedCallers: 'rendererOnly', required: ['@call'] });
    expect(definition.functions.touch.requiresUserActivation).toBe(true);
    expect(definition.functions.lookup.required).toEqual(['@call', 'args']);
    const prompt = promptSnippet(appCatalog);
    expect(prompt).not.toContain('agentOnlyThing');
    expect(prompt).toContain('- touch{} → void (button actions only)');
  });
});

describe('the data model', () => {
  it('writes and deletes values without touching unsafe keys', () => {
    expect(writePath({ a: 1 }, undefined, { b: 2 })).toEqual({ b: 2 });
    expect(writePath({ a: 1 }, '/', null)).toEqual({});
    expect(writePath(undefined, '/list/0/name', 'Ada')).toEqual({ list: [{ name: 'Ada' }] });
    expect(writePath({ list: ['a', 'b', 'c'] }, '/list/1', null)).toEqual({ list: ['a', 'c'] });
    expect(writePath({ a: { b: 1 } }, '/a/b', undefined)).toEqual({ a: {} });
    expect(writePath({ a: 1 }, '/__proto__/polluted', true)).toEqual({ a: 1 });
    expect(writePath({ a: 1 }, 'x', 2, '/row')).toEqual({ a: 1, row: { x: 2 } });
  });

  it('expands child lists and templates', () => {
    expect(expandChildren({}, undefined)).toEqual([]);
    expect(expandChildren({}, 'one', '/s', 2)).toEqual([['one', '/s', 2]]);
    expect(expandChildren({ list: 'x' }, { componentId: 'item', path: '/list' })).toEqual([]);
    expect(expandChildren({ 'a/b': [1, 2] }, { componentId: 'item', path: '/a~1b' })).toEqual([
      ['item', '/a~1b/0', 0],
      ['item', '/a~1b/1', 1],
    ]);
  });

  it('reads a surface leniently', () => {
    const read = readSurface([
      null,
      { version: '0.9', createSurface: { surfaceId: 'old' } },
      { version, updateComponents: { surfaceId: 's', components: [] } },
      {
        version,
        createSurface: {
          surfaceId: 's',
          sendDataModel: true,
          metadata: { extensions: {} },
          dataModel: { a: 1 },
          components: [{ id: 'root', component: 'Text', text: 'Hi' }, { bad: true }],
        },
      },
      { version, createSurface: { surfaceId: 'other' } },
      { version, updateComponents: { surfaceId: 's', components: 'nope' } },
      { version, updateDataModel: { surfaceId: 's', value: { b: 2 } } },
      { version, updateDataModel: { surfaceId: 'other', path: '/c', value: 3 } },
      {
        version,
        callRendererFunction: { functionCallId: 'c1', callFunction: { '@call': 'label', catalogId: 'app@1' } },
      },
      {
        version,
        callRendererFunction: {
          surfaceId: 'other',
          functionCallId: 'c2',
          callFunction: { '@call': 'label', catalogId: 'app@1' },
        },
      },
      { version, callRendererFunction: { functionCallId: 'c3' } },
      { version, agentFunctionResponse: { functionCallId: 'f1', value: 'x' } },
      { version, agentFunctionResponse: { functionCallId: 'f2', value: 'x', error: { code: 'E', message: '' } } },
      { version, deleteSurface: { surfaceId: 's' } },
    ])!;
    expect(read).toMatchObject({
      surfaceId: 's',
      catalogId: undefined,
      data: { b: 2 },
      deleted: true,
      sendDataModel: true,
      metadata: { extensions: {} },
    });
    expect([...read.components.keys()]).toEqual(['root']);
    expect(read.rendererCalls.map(call => call.functionCallId)).toEqual(['c1']);
    expect([...read.functionResponses.keys()]).toEqual(['f1']);
    expect(readSurface([{ version, createSurface: { surfaceId: 's', dataModel: [] } }])?.data).toEqual({});
  });
});

describe('evaluate', () => {
  const options = (extra: Partial<EvaluateOptions> = {}): EvaluateOptions => ({
    catalogs: [sproutCatalog, appCatalog],
    data: { name: 'Ada', items: ['a'] },
    catalogId: 'app@1',
    ...extra,
  });

  it('reads @index with an offset only inside a template', () => {
    expect(evaluate({ '@call': '@index' }, options())).toMatchObject({ status: 'error', code: 'EXPRESSION_ERROR' });
    expect(evaluate({ '@call': '@index', args: { offset: 1 } }, options({ index: 2 }))).toEqual({
      status: 'done',
      value: 3,
    });
    expect(evaluate({ '@call': '@index', args: { offset: 'x' } }, options({ index: 2 }))).toEqual({
      status: 'done',
      value: 2,
    });
  });

  it('refuses calls it cannot route', () => {
    const error = (value: unknown, extra?: Partial<EvaluateOptions>) => {
      const result = evaluate(value, options(extra));
      return result.status === 'error' ? result.message : result.status;
    };
    expect(error({ '@call': 'label' }, { catalogId: undefined })).toContain('no known catalog');
    expect(error({ '@call': 'label', catalogId: 'nope@1' })).toContain('no known catalog');
    expect(error({ '@call': 'missing' })).toContain('Unknown function "missing"');
    expect(error({ '@call': 'agentOnlyThing' })).toContain('only be called by the agent');
    expect(error({ '@call': 'touch' })).toContain('only from a click');
    expect(error({ '@call': 'broken' })).toBe('plain failure');
    expect(error({ '@call': 'crash' })).toBe('crashed');
    expect(error({ '@call': 'lookup', args: { id: 1 } }, { call: () => ({ status: 'done', value: 'x' }) })).toContain(
      "don't match",
    );
  });

  it('routes calls without an implementation, and async ones, through call', () => {
    expect(evaluate({ '@call': 'lookup', args: { id: 'a' } }, options())).toEqual({ status: 'pending' });
    expect(evaluate({ '@call': 'later' }, options())).toEqual({ status: 'pending' });
    const requests: unknown[] = [];
    const call: EvaluateOptions['call'] = request => {
      requests.push(request);
      return { status: 'done', value: `answer for ${request.name}` };
    };
    expect(evaluate({ '@call': 'lookup', args: { id: { '@path': '/name' } } }, options({ call }))).toEqual({
      status: 'done',
      value: 'answer for lookup',
    });
    expect(evaluate({ '@call': 'later' }, options({ call, fresh: true }))).toMatchObject({ status: 'done' });
    expect(requests).toMatchObject([
      { name: 'lookup', args: { id: 'Ada' }, fresh: false },
      { name: 'later', fresh: true },
    ]);
    expect(
      evaluate({ '@call': 'lookup', args: { id: 'a' } }, options({ call: () => ({ status: 'pending' }) })),
    ).toEqual({
      status: 'pending',
    });
    expect(
      evaluate(
        { '@call': 'lookup', args: { id: 'a' } },
        options({ call: () => ({ status: 'error', code: 'EXECUTION_ERROR', message: 'down' }) }),
      ),
    ).toEqual({ status: 'error', code: 'EXECUTION_ERROR', message: 'down' });
  });

  it('reuses cached results unless the call is fresh', () => {
    const cached = () => ({ status: 'done' as const, value: 'cached' });
    expect(evaluate({ '@call': 'label' }, options({ cached }))).toEqual({ status: 'done', value: 'cached' });
    expect(evaluate({ '@call': 'label' }, options({ cached, fresh: true }))).toEqual({
      status: 'done',
      value: 'label',
    });
  });

  it('uses app implementations before the catalog, and evaluates list arguments', () => {
    const functions = { 'app@1': { label: () => 'from the app' } };
    expect(evaluate({ '@call': 'label' }, options({ functions }))).toEqual({ status: 'done', value: 'from the app' });
    expect(
      evaluate(
        { '@call': 'and', catalogId: sproutCatalog.id, args: { values: [true, { '@path': '/name' }] } },
        options(),
      ),
    ).toEqual({ status: 'done', value: false });
    expect(evaluate({ '@@note': [{ '@@x': 1 }] }, options())).toEqual({
      status: 'done',
      value: { '@note': [{ '@x': 1 }] },
    });
  });
});

describe('formatString templates', () => {
  const read = (value: unknown) => JSON.stringify(value);

  it('reads paths, calls with every argument type, and escapes', () => {
    expect(interpolate('\\${not} ${ /a } ${b}', read)).toBe('${not} {"@path":"/a"} {"@path":"b"}');
    expect(
      interpolate(
        `\${fn( s: 'it\\'s', d: "x", n: -1.5e2, t: true, f: false, z: null, inner: \${/p} )}`,
        value => (value as { args?: unknown }).args ?? 'P',
      ),
    ).toBe('{"s":"it\'s","d":"x","n":-150,"t":true,"f":false,"z":null,"inner":"P"}');
    expect(interpolate('${fn()}', () => null)).toBe('');
    expect(interpolate('${a}', () => undefined)).toBe('');
    expect(interpolate('${a}', () => 3)).toBe('3');
  });

  it.each([
    ['${}', 'expected a path or a function call'],
    ['${a', 'expected a path or a function call'],
    ['${fn(1)}', 'expected name: value'],
    ['${fn(a 1)}', 'expected name: value'],
    ['${fn(a: 1 b: 2)}', 'expected , or )'],
    ['${fn(a: 1)', 'expected }'],
    ["${fn(a: 'x)}", 'unclosed string'],
    ['${fn(a: x)}', 'arguments are quoted strings'],
  ])('refuses %s', (template, message) => {
    expect(() => interpolate(template, () => '')).toThrow(message);
  });
});

describe('checks', () => {
  it('coerces values to booleans as A2UI does', () => {
    expect([true, 1, NaN, 0, 'TRUE', 'yes', { valid: true }, null, []].map(toBoolean)).toEqual([
      true,
      true,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
    ]);
  });

  it('picks failure messages in order', () => {
    expect(toValidationResult(true)).toEqual({ valid: true });
    expect(toValidationResult({ valid: false, message: 'own', severity: 'warning' }, 'rule')).toEqual({
      valid: false,
      message: 'own',
      severity: 'warning',
    });
    expect(toValidationResult(false, 'rule')).toMatchObject({ message: 'rule', severity: 'error' });
    expect(toValidationResult({ valid: false, code: 'TOO_LONG' }).message).toBe('This value is too long.');
    expect(toValidationResult({ valid: false, code: 'ODD' }).message).toBe("This value isn't valid.");
  });

  it('reports pending and broken checks', () => {
    const options: EvaluateOptions = { catalogs: [sproutCatalog, appCatalog], data: {}, catalogId: 'app@1' };
    expect(evaluateChecks(undefined, options)).toEqual({ valid: true, pending: false, failures: [] });
    expect(evaluateChecks([{ condition: { '@call': 'lookup', args: { id: 'a' } } }], options)).toMatchObject({
      valid: false,
      pending: true,
    });
    expect(evaluateChecks([{ condition: { '@call': 'missing' }, message: 'Broken.' }], options).failures).toEqual([
      { valid: false, code: 'EXPRESSION_ERROR', message: 'Broken.', severity: 'error' },
    ]);
    expect(evaluateChecks([{ condition: { '@call': 'missing' } }], options).failures[0]?.message).toContain('Unknown');
  });
});

describe('checkMessage', () => {
  const list = [sproutCatalog, appCatalog];
  const call = (callFunction: unknown) =>
    checkMessage({ version, callRendererFunction: { functionCallId: 'c', callFunction } }, { catalogs: list });

  it('names the surface of the message, if any', () => {
    expect(checkMessage('nope', { catalogs: list })[0]?.surfaceId).toBe('');
    expect(checkMessage({ version, deleteSurface: {} }, { catalogs: list })[0]?.surfaceId).toBe('');
    expect(
      checkMessage(
        { version, updateComponents: { surfaceId: 'x', components: [{ id: 'a', component: 'Nope' }] } },
        {
          catalogs: list,
          catalogId: sproutCatalog.id,
        },
      )[0],
    ).toMatchObject({ surfaceId: 'x', path: '/updateComponents/components/0/component' });
  });

  it('checks only the shape and catalog of an agent call', () => {
    expect(call({ '@call': 'agentOnlyThing', catalogId: 'app@1' })).toEqual([]);
    expect(call({ '@call': 'touch', catalogId: 'app@1' })).toEqual([]);
    expect(call({ '@call': 'label', catalogId: 'nope@1' })[0]?.message).toBe('Unknown catalog "nope@1".');
  });

  it('reports component problems inside a message that fails its shape', () => {
    const errors = checkMessage(
      {
        version,
        createSurface: {
          surfaceId: 's',
          catalogId: sproutCatalog.id,
          components: [{ id: 'root', component: 'Nope' }],
          extra: true,
        },
      },
      { catalogs: list },
    );
    expect(errors.map(error => error.path)).toEqual(['/createSurface/components/0/component', '/createSurface']);
  });
});

describe('checkSurface function calls', () => {
  const text = (value: unknown) => [root('t'), { id: 't', component: 'Text', text: value }];
  const first = (value: unknown, list?: readonly Catalog[]) => problems(text(value), undefined, { list })[0];

  it.each([
    [{ '@call': 'label', args: 'x' }, 'INVALID_FUNCTION_CALL /1/updateComponents/components/1/text/args'],
    [
      { '@call': '@index', catalogId: 'app@1' },
      'INVALID_FUNCTION_CALL /1/updateComponents/components/1/text/catalogId',
    ],
    [
      { '@call': '@index', args: { offset: 'x' } },
      'INVALID_FUNCTION_CALL /1/updateComponents/components/1/text/args/offset',
    ],
    [{ '@call': '@now' }, 'INVALID_FUNCTION_CALL /1/updateComponents/components/1/text/@call Unknown system function'],
    [{ '@call': 'to-upper' }, 'INVALID_FUNCTION_CALL /1/updateComponents/components/1/text/@call'],
    [
      { '@call': 'label', catalogId: 'nope@1' },
      'INVALID_FUNCTION_CALL /1/updateComponents/components/1/text/catalogId Unknown catalog',
    ],
    [
      { '@call': 'formatString', args: { value: '${fn(}' } },
      'EXPRESSION_ERROR /1/updateComponents/components/1/text/args/value formatString',
    ],
    [
      { '@call': 'formatString', args: { value: '${missing()}' } },
      'INVALID_FUNCTION_CALL /1/updateComponents/components/1/text/args/value/@call Unknown function "missing"',
    ],
  ])('refuses %j', (value, expected) => {
    expect(first(value, [sproutCatalog, appCatalog])).toContain(expected);
  });

  it('allows calls from another catalog, and refuses checks that do not return a boolean', () => {
    expect(
      problems(text({ '@call': 'label', catalogId: 'app@1' }), undefined, { list: [sproutCatalog, appCatalog] }),
    ).toEqual([]);
    const field = (condition: unknown) => [
      root('f'),
      { id: 'f', component: 'TextField', label: 'Name', value: '', '@checks': [{ condition }] },
    ];
    expect(problems(field({ '@call': 'formatNumber', args: { value: 1 } }))[0]).toContain('returns string');
    expect(problems(field({ '@call': '@index' }))[0]).toContain('returns a number');
  });

  it('checks links in openUrl and reserved keys in accessibility and props', () => {
    const button = (url: string) => [
      root('b'),
      { id: 'b', component: 'Button', label: 'Open', action: { functionCall: { '@call': 'openUrl', args: { url } } } },
    ];
    expect(problems(button('https://example.com'))).toEqual([]);
    expect(problems(button('ftp://example.com'))[0]).toContain('Link "ftp://example.com" is not allowed');
    const codes = (component: Record<string, unknown>) =>
      problems([root('t'), { id: 't', component: 'Text', text: 'x', ...component }]).map(line =>
        line.split(' ').slice(0, 2).join(' '),
      );
    expect(codes({ '@bogus': 1 })).toContain('INVALID_RESERVED_KEY /1/updateComponents/components/1/@bogus');
    expect(codes({ '@accessibility': { label: { '@call': 'missing' } } })).toEqual([
      'INVALID_FUNCTION_CALL /1/updateComponents/components/1/@accessibility/label/@call',
    ]);
  });

  it('reports an unknown component catalog', () => {
    expect(problems([root('t'), { id: 't', component: 'Text', text: 'x', '@catalogId': 'nope@1' }])[0]).toContain(
      '/@catalogId Unknown catalog "nope@1"',
    );
  });
});

describe('checkSurface structure', () => {
  it('needs a list that starts with createSurface', () => {
    expect(checkSurface('x', { catalogs })).toMatchObject({
      ok: false,
      errors: [{ message: 'Send a list of A2UI messages.' }],
    });
    expect(checkSurface([{ version, updateComponents: {} }], { catalogs })).toMatchObject({
      errors: [{ path: '/0', message: 'The first message must be createSurface.' }],
    });
    const many = [...surface([root()]), ...Array.from({ length: 1000 }, () => ({ version }))];
    expect(checkSurface(many, { catalogs }).ok).toBe(false);
  });

  it('refuses surfaces over their size limits', () => {
    expect(problems([root()], undefined, { limits: { bytes: 10 } })[0]).toContain('bytes; the limit is 10');
    expect(
      problems([root('a'), { id: 'a', component: 'Divider' }], undefined, { limits: { components: 1 } })[0],
    ).toContain('2 components; the limit is 1');
    expect(problems([{ id: 'top', component: 'Column', children: [] }])).toContain(
      'VALIDATION_FAILED  One component must have the ID "root".',
    );
    expect(
      problems(
        [root('h', 'c'), { id: 'h', component: 'Heading', text: 'abc' }, { id: 'c', component: 'Code', code: 'abcd' }],
        undefined,
        {
          limits: { textLength: 5 },
        },
      ),
    ).toContain('VALIDATION_FAILED  The surface has 7 characters of text; the limit is 5.');
  });

  it('checks template children', () => {
    const list = (children: unknown) => [
      { id: 'root', component: 'List', children },
      { id: 'item', component: 'Text', text: 'x' },
    ];
    expect(problems(list({ componentId: 'nope', path: '/items' }), { items: [] })[0]).toContain(
      'children/componentId Component "nope" does not exist.',
    );
    expect(problems(list({ componentId: 'item', path: '/items' }), { items: 'x' })[0]).toContain(
      'children/path "/items" is not a list in the data model.',
    );
  });

  it('enforces allowedChildren from another catalog', () => {
    const list = [sproutCatalog, appCatalog];
    const box = (child: Record<string, unknown>) => [
      { id: 'root', component: 'Box', '@catalogId': 'app@1', children: ['c'] },
      { id: 'c', ...child },
    ];
    expect(problems(box({ component: 'Text', text: 'x' }), undefined, { list })).toEqual([]);
    expect(problems(box({ component: 'Badge', text: 'x' }), undefined, { list })[0]).toContain('UNALLOWED_CHILD');
  });
});

describe('sprout component checks', () => {
  const one = (
    component: Record<string, unknown>,
    dataModel?: Record<string, unknown>,
    limits?: Partial<SurfaceLimits>,
  ) =>
    problems([root('c'), { id: 'c', ...component }], dataModel, { limits }).map(line =>
      line.split(' ').slice(2).join(' '),
    );

  it('checks metric trends', () => {
    expect(one({ component: 'Metric', label: 'A', value: 1, trend: { '@path': '/t' } }, { t: ['x'] })).toEqual([
      'trend must be a list of numbers.',
    ]);
    expect(one({ component: 'Metric', label: 'A', value: 1, trend: [1, 2, 3] }, undefined, { chartPoints: 2 })).toEqual(
      ['trend has more than 2 points.'],
    );
  });

  it('checks table and chart rows', () => {
    const table = { component: 'Table', label: 'T', columns: [{ key: 'a', label: 'A' }] };
    expect(one({ ...table, rows: { '@path': '/r' } }, { r: 'x' })).toEqual(['rows must be a list of objects.']);
    expect(one({ ...table, rows: { '@path': '/r' } }, { r: [{ a: 1 }, null] })).toEqual([
      'Every row must be an object.',
    ]);
    expect(one({ ...table, rows: [{ a: 1 }, { a: 2 }] }, undefined, { tableRows: 1 })).toEqual([
      'The table has 2 rows; the limit is 1.',
    ]);
    const chart = { component: 'Chart', type: 'pie', title: 'C', category: 'k' };
    const series = [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ];
    expect(one({ ...chart, series, rows: [{ k: 'x', a: 1, b: 2 }] })).toEqual(['A pie chart has exactly one series.']);
    expect(one({ ...chart, series: [series[0]], rows: [{ a: 1 }] })).toEqual([
      'Every row needs the category key "k"; keys are case-sensitive.',
    ]);
    expect(one({ ...chart, series: [series[0]], rows: { '@path': '/r' } }, { r: 1 })).toEqual([
      'rows must be a list of objects.',
    ]);
  });

  it('checks progress, choices, sliders, dates and Markdown images', () => {
    expect(one({ component: 'Progress', label: 'P', value: { '@path': '/p' } }, { p: 'x' })).toEqual([
      'value must be a number from 0 to 100.',
    ]);
    expect(
      one({ component: 'ChoicePicker', label: 'C', options: { '@path': '/o' }, value: [] }, { o: [{ value: 1 }] }),
    ).toEqual(['options must be a list of { label, value }.']);
    expect(one({ component: 'Slider', label: 'S', min: 5, max: 5, value: 5 })).toEqual([
      'max must be greater than min.',
    ]);
    expect(one({ component: 'DateTimeInput', label: 'D', value: '' })).toEqual(['Set enableDate, enableTime or both.']);
    expect(one({ component: 'Callout', tone: 'info', text: '![x](https://example.com/a.png)' })).toEqual([
      'Image "https://example.com/a.png" is not allowed.',
    ]);
  });
});

describe('surfaceText', () => {
  it('writes forms, metrics and containers as text', () => {
    const read = readSurface(
      surface(
        [
          root('card', 'section', 'list', 'row', 'missing', 'loop'),
          { id: 'card', component: 'Card', description: 'About', children: ['check', 'choice', 'code', 'callout'] },
          { id: 'check', component: 'CheckBox', label: 'Agree', value: true },
          {
            id: 'choice',
            component: 'ChoicePicker',
            label: 'Pick',
            options: [{ label: 'A', value: 'a' }],
            value: ['a'],
          },
          { id: 'code', component: 'Code', code: 'x = 1' },
          { id: 'callout', component: 'Callout', tone: 'info', text: 'Note' },
          { id: 'section', component: 'Section', children: ['metric', 'field'] },
          { id: 'metric', component: 'Metric', label: 'Up', value: 3, change: { value: '1', direction: 'up' } },
          { id: 'field', component: 'TextField', label: 'Name', value: { '@path': '/missing' } },
          { id: 'list', component: 'List', children: ['badge'] },
          { id: 'badge', component: 'Badge', text: 'New' },
          { id: 'row', component: 'Row', children: ['picker'] },
          {
            id: 'picker',
            component: 'ChoicePicker',
            label: 'None',
            options: [{ label: 'A', value: 'a' }],
            value: { '@path': '/x' },
          },
          { id: 'loop', component: 'Column', children: ['loop'] },
          { id: 'broken', component: 'Text' },
        ],
        { x: 'not a list' },
      ),
    )!;
    expect(surfaceText(read, sproutCatalog)).toBe(
      ['About', '[x] Agree', 'Pick: a', '```\nx = 1\n```', 'Note', 'Up: 3 (up 1)', 'Name:', '- [New]', 'None:'].join(
        '\n\n',
      ),
    );
  });

  it('skips components from unknown catalogs', () => {
    const read = readSurface(surface([{ id: 'root', component: 'Text', text: 'x', '@catalogId': 'nope@1' }]))!;
    expect(surfaceText(read, [sproutCatalog])).toBe('');
  });

  it('escapes table cells', () => {
    expect(markdownTable([{ key: 'a', label: 'A|B' }], [{ a: 'x\ny' }, { a: null }])).toBe(
      '| A\\|B |\n| --- |\n| x y |\n|  |',
    );
  });
});
