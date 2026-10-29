import { describe, expect, it } from 'vitest';
import {
  catalogDefinition,
  checkSurface,
  defineCatalog,
  defineComponent,
  markdownTable,
  markdownUrls,
  promptSnippet,
  readPath,
  readSurface,
  sproutCatalog,
  surfaceText,
  type SurfaceLimits,
} from '../packages/sprout/src/a2ui/catalog.js';

const version = 'v0.9.1';

function messages(components: Record<string, unknown>[], data?: unknown, catalogId = sproutCatalog.id) {
  return [
    { version, createSurface: { surfaceId: 's1', catalogId } },
    { version, updateComponents: { surfaceId: 's1', components } },
    ...(data === undefined ? [] : [{ version, updateDataModel: { surfaceId: 's1', path: '/', value: data } }]),
  ];
}

function check(components: Record<string, unknown>[], data?: unknown, limits?: Partial<SurfaceLimits>) {
  return checkSurface(messages(components, data), { catalog: sproutCatalog, ...(limits && { limits }) });
}

function errors(components: Record<string, unknown>[], data?: unknown, limits?: Partial<SurfaceLimits>) {
  const result = check(components, data, limits);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.errors.map(error => `${error.path} ${error.message}`);
}

const memory = [
  { id: 'root', component: 'Column', children: ['summary', 'used', 'chart'] },
  { id: 'summary', component: 'Text', text: 'You are using **11.2 GB** of 16 GB.' },
  {
    id: 'used',
    component: 'Metric',
    label: 'Memory used',
    value: { path: '/used' },
    change: { value: '0.4 GB', direction: 'up', tone: 'negative', label: 'in 10 min' },
    trend: { path: '/trend' },
  },
  {
    id: 'chart',
    component: 'Chart',
    type: 'area',
    title: 'Memory',
    category: 'time',
    series: [{ key: 'gb', label: 'GB' }],
    rows: { path: '/points' },
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

describe('checkSurface', () => {
  it('accepts a complete surface and returns its model', () => {
    const result = check(memory, memoryData);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.surface.surfaceId).toBe('s1');
    expect(result.surface.components.size).toBe(4);
    expect(readPath(result.surface.data, '/points/1/gb')).toBe(11.2);
  });

  it('reports bad message shapes with a pointer', () => {
    const result = checkSurface([{ version: 'v1', createSurface: { surfaceId: 's1', catalogId: 'x' } }], {
      catalog: sproutCatalog,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatchObject({ code: 'VALIDATION_FAILED', surfaceId: 's1' });
    expect(checkSurface('nope', { catalog: sproutCatalog }).ok).toBe(false);
  });

  it('needs createSurface first, once, with this catalog', () => {
    const update = { version, updateComponents: { surfaceId: 's1', components: [] } };
    expect(checkSurface([update], { catalog: sproutCatalog })).toMatchObject({
      ok: false,
      errors: [{ path: '/0', message: 'The first message must be createSurface.' }],
    });
    expect(checkSurface([], { catalog: sproutCatalog }).ok).toBe(false);

    const wrong = checkSurface(messages(memory, memoryData, 'other@1'), { catalog: sproutCatalog });
    expect(wrong.ok || wrong.errors[0]).toMatchObject({ path: '/0/createSurface/catalogId' });

    const twice = [...messages(memory, memoryData), messages([])[0]!];
    const again = checkSurface(twice, { catalog: sproutCatalog });
    expect(again.ok || again.errors[0]!.message).toBe('Send createSurface only once, first.');
  });

  it('refuses deleteSurface, other surfaces and duplicate IDs', () => {
    const list = [
      ...messages([...memory, { id: 'summary', component: 'Divider' }], memoryData),
      { version, updateDataModel: { surfaceId: 'other', value: 1 } },
      { version, deleteSurface: { surfaceId: 's1' } },
    ];
    const result = checkSurface(list, { catalog: sproutCatalog });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map(error => error.message)).toEqual([
      'Component ID "summary" is used twice.',
      'Every message must target surface "s1".',
      'deleteSurface is not allowed here.',
    ]);
  });

  it('needs a root, known components and valid props', () => {
    expect(errors([{ id: 'a', component: 'Divider' }])).toContain(' One component must have the ID "root".');
    expect(errors([{ id: 'root', component: 'Marquee' }])).toEqual([
      '/1/updateComponents/components/0/component Unknown component "Marquee". Use one from the catalog.',
    ]);
    const [prop] = errors([{ id: 'root', component: 'Text', text: 'hi', style: 'color: red' }]);
    expect(prop).toMatch(/^\/1\/updateComponents\/components\/0 /);
  });

  it('finds missing children, cycles, orphans and deep trees', () => {
    expect(errors([{ id: 'root', component: 'Column', children: ['gone'] }])).toEqual([
      '/1/updateComponents/components/0/children Component "gone" does not exist.',
    ]);
    expect(
      errors([
        { id: 'root', component: 'Column', children: ['a'] },
        { id: 'a', component: 'Column', children: ['root'] },
      ]),
    ).toEqual(['/1/updateComponents/components/0 Component "root" contains itself.']);
    expect(
      errors([
        { id: 'root', component: 'Divider' },
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
      { id: 'item', component: 'Text', text: { path: 'name' } },
    ];
    const result = check(list, { apps: [{ name: 'Chrome' }, { name: 'Slack' }] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(surfaceText(result.surface, sproutCatalog)).toBe('- Chrome\n- Slack');
    expect(check(list, { apps: [] }).ok).toBe(true);

    expect(errors(list, { apps: 'none' })).toEqual([
      '/1/updateComponents/components/0/children/path "/apps" is not a list in the data model.',
    ]);
    expect(
      errors([{ id: 'root', component: 'List', children: { componentId: 'gone', path: '/apps' } }], { apps: [] }),
    ).toEqual(['/1/updateComponents/components/0/children/componentId Component "gone" does not exist.']);
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
    expect(errors(table({ path: '/missing' }), {})).toEqual([
      '/1/updateComponents/components/0/rows rows must be a list of objects.',
    ]);
    expect(errors(table({ path: '/rows' }), { rows: [1] })).toEqual([
      '/1/updateComponents/components/0/rows Every row must be an object.',
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
    expect(errors(chart({ category: 'Name' }))).toEqual([
      '/1/updateComponents/components/0/category Every row needs the category key "Name"; keys are case-sensitive.',
    ]);
    expect(
      errors(
        chart({
          type: 'pie',
          series: [
            { key: 'gb', label: 'GB' },
            { key: 'mb', label: 'MB' },
          ],
          rows: [{ name: 'a', gb: 1, mb: 2 }],
        }),
      ),
    ).toEqual(['/1/updateComponents/components/0/series A pie chart has exactly one series.']);
    expect(
      errors(
        chart({
          rows: [
            { name: 'a', gb: 1 },
            { name: 'b', gb: 2 },
          ],
        }),
        undefined,
        { chartPoints: 1 },
      ),
    ).toEqual(['/1/updateComponents/components/0/rows The chart has 2 points; the limit is 1.']);
    expect(errors(chart({ rows: { path: '/x' } }), {})).toHaveLength(1);
  });

  it('checks metric trends and progress values', () => {
    const metric = (trend: unknown) => [{ id: 'root', component: 'Metric', label: 'CPU', value: 3, trend }];
    expect(errors(metric({ path: '/t' }), { t: ['a'] })).toEqual([
      '/1/updateComponents/components/0/trend trend must be a list of numbers.',
    ]);
    expect(errors(metric([1, 2, 3]), undefined, { chartPoints: 2 })).toEqual([
      '/1/updateComponents/components/0/trend trend has more than 2 points.',
    ]);
    expect(errors([{ id: 'root', component: 'Progress', label: 'Done', value: { path: '/p' } }], { p: 140 })).toEqual([
      '/1/updateComponents/components/0/value value must be a number from 0 to 100.',
    ]);
  });

  it('refuses unsafe links and images unless the app allows them', () => {
    expect(errors([{ id: 'root', component: 'Text', text: '[go](javascript:alert(1)) <data:text/html,hi>' }])).toEqual([
      '/1/updateComponents/components/0/text Link "javascript:alert(1" is not allowed.',
      '/1/updateComponents/components/0/text Link "data:text/html,hi" is not allowed.',
    ]);
    expect(check([{ id: 'root', component: 'Text', text: '[docs](https://example.com)' }]).ok).toBe(true);

    const image = messages([{ id: 'root', component: 'Image', src: 'https://example.com/a.png', alt: 'A' }]);
    const refused = checkSurface(image, { catalog: sproutCatalog });
    expect(refused.ok || refused.errors[0]!.message).toBe('This image URL is not allowed.');
    expect(checkSurface(image, { catalog: sproutCatalog, allowUrl: () => true }).ok).toBe(true);
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
      { version, updateDataModel: { surfaceId: 's1', path: '/c' } },
    ])!;
    expect([...surface.components.keys()]).toEqual(['a']);
    expect(surface.data).toEqual({ a: [{ b: 1 }] });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(readSurface([{ version, deleteSurface: { surfaceId: 's1' } }])).toBeUndefined();
  });

  it('removes list items and marks deleted surfaces', () => {
    const surface = readSurface([
      ...messages([], { list: [1, 2, 3] }),
      { version, updateDataModel: { surfaceId: 's1', path: '/list/1' } },
      { version, deleteSurface: { surfaceId: 's1' } },
    ])!;
    expect(surface.data).toEqual({ list: [1, 3] });
    expect(surface.deleted).toBe(true);
  });

  it('reads escaped JSON Pointer segments', () => {
    expect(readPath({ 'a/b': { '~c': 1 } }, '/a~1b/~0c')).toBe(1);
    expect(readPath({ a: 1 }, '/a/b')).toBeUndefined();
  });
});

describe('surfaceText', () => {
  it('writes every component as Markdown in tree order', () => {
    const components = [
      { id: 'root', component: 'Section', title: 'Report', children: ['h', 'card', 'tabs', 'details', 'tail'] },
      { id: 'h', component: 'Heading', text: 'Memory', level: 1 },
      { id: 'card', component: 'Card', title: 'Used', description: 'Now', children: ['metric', 'badge'] },
      {
        id: 'metric',
        component: 'Metric',
        label: 'Used',
        value: 11.2,
        change: { value: '1 GB', direction: 'up', label: 'today' },
        caption: 'of 16 GB',
      },
      { id: 'badge', component: 'Badge', text: 'High', tone: 'warning' },
      { id: 'tabs', component: 'Tabs', tabs: [{ label: 'Apps', child: 'table' }] },
      {
        id: 'table',
        component: 'Table',
        label: 'Apps',
        caption: 'Top apps',
        columns: [{ key: 'name', label: 'Name' }],
        rows: [{ name: 'a|b' }, { name: null }],
      },
      { id: 'details', component: 'Details', items: [{ title: 'How', child: 'code' }] },
      { id: 'code', component: 'Code', code: 'top', language: 'sh' },
      { id: 'tail', component: 'Row', children: ['progress', 'callout', 'divider', 'image', 'button', 'chart', 'ol'] },
      { id: 'progress', component: 'Progress', label: 'Swap', value: 5 },
      { id: 'callout', component: 'Callout', tone: 'warning', title: 'Warning:', text: 'Filling up' },
      { id: 'divider', component: 'Divider' },
      { id: 'image', component: 'Image', src: 'https://example.com/a.png', alt: 'Graph' },
      { id: 'button', component: 'Button', label: 'More', message: 'more' },
      {
        id: 'chart',
        component: 'Chart',
        type: 'line',
        title: 'Trend',
        category: 't',
        series: [{ key: 'v', label: 'Value' }],
        rows: [{ t: 1, v: 2 }],
      },
      { id: 'ol', component: 'List', ordered: true, children: ['li'] },
      { id: 'li', component: 'Text', text: 'one\ntwo' },
    ];
    const surface = readSurface(messages(components))!;
    expect(surfaceText(surface, sproutCatalog)).toBe(
      [
        '### Report',
        '## Memory',
        '**Used**',
        'Now',
        'Used: 11.2 (up 1 GB today) of 16 GB',
        '[High]',
        '### Apps',
        'Top apps',
        '| Name |\n| --- |\n| a\\|b |\n|  |',
        '**How**',
        '```sh\ntop\n```',
        'Swap: 5%',
        '**Warning:** Filling up',
        '---',
        '[Image: Graph]',
        '**Trend**',
        '| t | Value |\n| --- | --- |\n| 1 | 2 |',
        '1. one\n  two',
      ].join('\n\n'),
    );
  });

  it('skips unknown, invalid and repeated components', () => {
    const surface = readSurface(
      messages([
        { id: 'root', component: 'Column', children: ['a', 'b', 'c', 'root'] },
        { id: 'a', component: 'Marquee' },
        { id: 'b', component: 'Text' },
        { id: 'c', component: 'Text', text: 'ok' },
      ]),
    )!;
    expect(surfaceText(surface, sproutCatalog)).toBe('ok');
  });
});

describe('catalog helpers', () => {
  it('extends a catalog and keeps names PascalCase', () => {
    const Embed = defineComponent({ ...sproutCatalog.components.Image!, description: 'An embed.' });
    const extended = defineCatalog({ id: 'app@1', extends: sproutCatalog, components: { Embed } });
    expect(extended.components.Embed).toBe(Embed);
    expect(extended.components.Text).toBe(sproutCatalog.components.Text);
    expect(() => defineCatalog({ id: 'x', components: { embed: Embed } })).toThrow('PascalCase: embed');
  });

  it('describes the catalog as A2UI JSON Schema', () => {
    const definition = catalogDefinition(sproutCatalog) as Record<string, any>;
    expect(definition.catalogId).toBe('sprout/basic@1');
    expect(Object.keys(definition.components)).toHaveLength(19);
    expect(definition.components.Row.properties.children).toEqual({ $ref: 'common_types.json#/$defs/ChildList' });
    expect(definition.components.Tabs.properties.tabs.items.properties.child).toEqual({
      $ref: 'common_types.json#/$defs/ComponentId',
    });
    expect(definition.components.Table.required).toEqual(['id', 'component', 'label', 'columns', 'rows']);
    expect(definition.$defs.anyComponent.oneOf).toContainEqual({ $ref: '#/components/Chart' });
  });

  it('writes a compact prompt with one line per component', () => {
    const prompt = promptSnippet(sproutCatalog);
    expect(prompt).toContain('A2UI v0.9.1, catalog "sprout/basic@1"');
    expect(prompt).toContain('- Row {children: id[] | {componentId, path}, gap?: "small"|"medium"|"large"');
    expect(prompt).toContain('- Text {text: string (or {path}), variant?: "body"|"caption"}');
    expect(prompt).toContain('level?: 1 | 2 | 3');
    expect(prompt.split('\n').filter(line => line.startsWith('- '))).toHaveLength(19);
  });

  it('writes Markdown tables and finds Markdown links', () => {
    expect(markdownTable([{ key: 'a', label: 'A' }], [{ a: 'x\ny' }])).toBe('| A |\n| --- |\n| x y |');
    expect(markdownUrls('[a](https://a.test) ![b]( <https://b.test> ) <mailto:c@d.test>')).toEqual([
      'https://a.test',
      'https://b.test',
      'mailto:c@d.test',
    ]);
  });
});
