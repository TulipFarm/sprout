// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  A2uiSurface,
  A2uiUnavailable,
  compactTableRows,
  defineCatalog,
  defineComponent,
  defineFunction,
  dynamicStringSchema,
  readSurface,
  sproutAdapters,
  sproutCatalog,
  type A2uiAdapter,
  type A2uiOutgoingMessage,
} from '../packages/sprout/src/a2ui/surface.js';
import { Metric } from '../packages/sprout/src/components/metric.js';

const version = '1.0';

function messages(components: Record<string, unknown>[], dataModel?: unknown, extra: Record<string, unknown> = {}) {
  return [
    {
      version,
      createSurface: {
        surfaceId: 's1',
        catalogId: sproutCatalog.id,
        ...(dataModel !== undefined && { dataModel }),
        ...extra,
      },
    },
    { version, updateComponents: { surfaceId: 's1', components } },
  ];
}

const rows = Array.from({ length: 14 }, (_, index) => ({ name: `App ${index + 1}`, gb: index + 0.5 }));
const table = { id: 'root', component: 'Table', label: 'Apps', columns: [{ key: 'name', label: 'Name' }], rows };

const required = (path: string, message: string) => ({
  condition: { '@call': 'required', args: { value: { '@path': path } } },
  message,
});
const form = [
  { id: 'root', component: 'Column', children: ['name', 'notify', 'plan', 'when', 'send'] },
  {
    id: 'name',
    component: 'TextField',
    label: 'Name',
    value: { '@path': '/name' },
    '@checks': [required('/name', 'Enter a name.')],
  },
  { id: 'notify', component: 'CheckBox', label: 'Email me', value: { '@path': '/notify' } },
  {
    id: 'plan',
    component: 'ChoicePicker',
    label: 'Plan',
    options: [
      { label: 'Free', value: 'free' },
      { label: 'Team', value: 'team' },
    ],
    value: { '@path': '/plan' },
  },
  { id: 'when', component: 'DateTimeInput', label: 'Start', value: { '@path': '/when' }, enableDate: true },
  {
    id: 'send',
    component: 'Button',
    label: 'Send',
    variant: 'primary',
    '@checks': [required('/name', 'Enter a name first.')],
    action: {
      event: {
        name: 'signup',
        userMessage: { '@call': 'formatString', args: { value: 'Sign up ${/name}' } },
        context: {
          name: { '@path': '/name' },
          notify: { '@path': '/notify' },
          plan: { '@path': '/plan' },
          when: { '@path': '/when' },
        },
      },
    },
  },
];
const formData = { name: '', notify: false, plan: ['free'], when: '' };

// Recharts draws nothing until its box is measured, and jsdom measures 0.
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [{ target, contentRect: { width: 640, height: 240 } } as unknown as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('A2uiSurface', () => {
  it('draws every report component with Sprout components', () => {
    const components = [
      {
        id: 'root',
        component: 'Section',
        title: 'Report',
        children: ['heading', 'row', 'card', 'tabs', 'details', 'list', 'progress', 'callout', 'code', 'divider'],
      },
      { id: 'heading', component: 'Heading', text: 'Memory', level: 1 },
      { id: 'row', component: 'Row', gap: 'small', align: 'center', children: ['metric', 'badge'] },
      {
        id: 'metric',
        component: 'Metric',
        label: 'Used',
        value: { '@path': '/used' },
        change: { value: '1 GB', direction: 'up', tone: 'negative' },
        caption: 'of 16 GB',
        trend: [1, 2, 3],
      },
      { id: 'badge', component: 'Badge', text: 'High', tone: 'error' },
      { id: 'card', component: 'Card', title: 'Card title', description: 'Card text', children: ['column'] },
      { id: 'column', component: 'Column', children: ['caption'] },
      { id: 'caption', component: 'Text', text: 'A caption', variant: 'caption' },
      { id: 'tabs', component: 'Tabs', tabs: [{ label: 'First tab', child: 'first' }] },
      { id: 'first', component: 'Text', text: 'Tab body' },
      { id: 'details', component: 'Details', items: [{ title: 'How it was measured', child: 'how' }] },
      { id: 'how', component: 'Text', text: 'Sampled' },
      { id: 'list', component: 'List', ordered: true, children: { componentId: 'item', path: '/apps' } },
      {
        id: 'item',
        component: 'Text',
        text: { '@call': 'formatString', args: { value: '#${@index(offset: 1)} ${name}' } },
      },
      { id: 'progress', component: 'Progress', label: 'Swap', value: 40 },
      { id: 'callout', component: 'Callout', tone: 'error', title: 'Error:', text: 'Out of memory' },
      { id: 'code', component: 'Code', code: 'free -h' },
      { id: 'divider', component: 'Divider' },
    ];
    const { container } = render(
      <A2uiSurface messages={messages(components, { used: 11.2, apps: [{ name: 'Chrome' }, { name: 'Slack' }] })} />,
    );
    expect(screen.getByRole('region', { name: 'Report' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Memory' }).getAttribute('aria-level')).toBe('2');
    expect(container.querySelector('[data-slot="metric"]')!.textContent).toContain('11.2');
    expect(container.querySelector('.sprout-a2ui-row')!.getAttribute('data-align')).toBe('center');
    expect(screen.getByText('Card title')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'First tab' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'How it was measured' })).toBeTruthy();
    expect(
      within(container.querySelector('ol')!)
        .getAllByRole('listitem')
        .map(item => item.textContent),
    ).toEqual(['#1 Chrome', '#2 Slack']);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByText('Out of memory')).toBeTruthy();
    expect(container.textContent).not.toContain('"component"');
  });

  it('only links allowed URLs', () => {
    render(
      <A2uiSurface
        messages={messages([
          { id: 'root', component: 'Column', children: ['ok', 'bad'] },
          { id: 'ok', component: 'Text', text: '[docs](https://example.com)' },
          { id: 'bad', component: 'Text', text: '[run](javascript:alert(1))' },
        ])}
      />,
    );
    expect(screen.getByRole('link', { name: 'docs' }).getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.queryByRole('link', { name: 'run' })).toBeNull();
  });

  it('shows the first rows of a compact table and expands', () => {
    const { container } = render(<A2uiSurface messages={messages([table])} size="compact" />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(compactTableRows);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 14 rows' }));
    expect(container.querySelectorAll('tbody tr')).toHaveLength(14);
  });

  it('asks the app to expand a compact table when it handles messages', () => {
    const onMessage = vi.fn();
    render(<A2uiSurface messages={messages([table])} size="compact" onMessage={onMessage} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 14 rows' }));
    expect(onMessage).toHaveBeenCalledWith({ type: 'expand', componentId: 'root' }, undefined);
  });

  it('shows every row at full size', () => {
    const { container } = render(<A2uiSurface messages={messages([table])} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(14);
    expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull();
  });

  it.each(['line', 'area', 'bar', 'pie', 'donut'])('draws a %s chart and its data', type => {
    const chart = {
      id: 'root',
      component: 'Chart',
      type,
      title: 'Memory by app',
      category: 'name',
      series: [{ key: 'gb', label: 'GB' }],
      rows: rows.slice(0, 3),
      unit: 'GB',
      stack: true,
    };
    const { container } = render(<A2uiSurface messages={messages([chart])} size="compact" />);
    expect(container.querySelector('figure.sprout-a2ui-chart')).toBeTruthy();
    const toggle = screen.getByRole('button', { name: 'Show data' });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('table', { name: 'Memory by app' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show chart' }));
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('marks missing, unknown and broken parts without raw JSON', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken: A2uiAdapter = () => {
      throw new Error('boom');
    };
    const { container } = render(
      <A2uiSurface
        messages={messages([
          { id: 'root', component: 'Column', children: ['gone', 'odd', 'bad', 'fails', 'ok', 'root'] },
          { id: 'odd', component: 'Marquee' },
          { id: 'bad', component: 'Text' },
          { id: 'fails', component: 'Badge', text: 'x' },
          { id: 'ok', component: 'Text', text: 'Still here' },
        ])}
        adapters={{ [sproutCatalog.id]: { ...sproutAdapters, Badge: Broken } }}
      />,
    );
    expect(screen.getAllByText("This part couldn't be displayed.")).toHaveLength(5);
    expect(screen.getByText('Still here')).toBeTruthy();
    expect(container.textContent).not.toContain('Marquee');
    expect(container.textContent).not.toContain('{');
  });

  it('shows placeholders while streaming', () => {
    const partial = messages([
      { id: 'root', component: 'Column', children: ['done', 'later', 'half'] },
      { id: 'done', component: 'Text', text: 'Ready' },
      { id: 'half', component: 'Table' },
    ]);
    const { container, rerender } = render(<A2uiSurface messages={partial} streaming />);
    const root = container.querySelector('[data-slot="a2ui-surface"]')!;
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelectorAll('.sprout-a2ui-pending')).toHaveLength(2);
    expect(screen.getByText('Ready')).toBeTruthy();
    rerender(<A2uiSurface messages={partial} />);
    expect(screen.getAllByText("This part couldn't be displayed.")).toHaveLength(2);
  });

  it('accepts a surface that was already read, and hides deleted surfaces', () => {
    const list = messages([{ id: 'root', component: 'Text', text: 'From a surface' }]);
    render(<A2uiSurface surface={readSurface(list)!} className="extra" />);
    expect(screen.getByText('From a surface').closest('.sprout-a2ui.extra')).toBeTruthy();
    const deleted = readSurface([...list, { version, deleteSurface: { surfaceId: 's1' } }])!;
    expect(renderToString(<A2uiSurface surface={deleted} />)).toContain('couldn&#x27;t be displayed');
    expect(renderToString(<A2uiUnavailable />)).toContain('role="note"');
  });

  it('applies @accessibility to the DOM', () => {
    render(
      <A2uiSurface
        messages={messages(
          [
            { id: 'root', component: 'Column', children: ['status', 'decor'] },
            {
              id: 'status',
              component: 'Text',
              text: '3 left',
              '@accessibility': { label: { '@path': '/label' }, live: 'polite' },
            },
            { id: 'decor', component: 'Badge', text: 'New', '@accessibility': { hidden: true } },
          ],
          { label: 'Three items left' },
        )}
      />,
    );
    const status = screen.getByLabelText('Three items left');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText('New').closest('[aria-hidden="true"]')).toBeTruthy();
  });
});

describe('A2uiSurface forms', () => {
  it('sends an action with the form values the person entered', () => {
    const onMessage = vi.fn();
    render(<A2uiSurface messages={messages(form, formData)} onMessage={onMessage} />);
    fireEvent.change(screen.getByRole('textbox', { name: /Name/ }), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Email me' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Team' }));
    fireEvent.change(screen.getByLabelText(/Start/), { target: { value: '2026-05-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onMessage).toHaveBeenCalledTimes(1);
    const [message] = onMessage.mock.calls[0]!;
    expect(message).toMatchObject({
      version,
      action: {
        name: 'signup',
        surfaceId: 's1',
        sourceComponentId: 'send',
        userMessage: 'Sign up Ada',
        context: { name: 'Ada', notify: true, plan: ['team'], when: '2026-05-01' },
      },
    });
    expect(Number.isNaN(Date.parse(message.action.timestamp))).toBe(false);
  });

  it('shows check messages after a field is left and when a send is tried', () => {
    const onMessage = vi.fn();
    render(<A2uiSurface messages={messages(form, formData)} onMessage={onMessage} />);
    expect(screen.queryByText('Enter a name.')).toBeNull();
    const send = screen.getByRole('button', { name: 'Send' });
    expect(send.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(send);
    expect(onMessage).not.toHaveBeenCalled();
    expect(screen.getAllByText('Enter a name.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Enter a name first.').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('alert').some(alert => alert.textContent === 'Enter a name.')).toBe(true);

    fireEvent.change(screen.getByRole('textbox', { name: /Name/ }), { target: { value: 'Ada' } });
    expect(screen.queryByText('Enter a name.')).toBeNull();
    expect(send.getAttribute('aria-disabled')).toBeNull();
  });

  it('shows a field check once the field is left', () => {
    render(<A2uiSurface messages={messages(form, formData)} onMessage={vi.fn()} />);
    fireEvent.blur(screen.getByRole('textbox', { name: /Name/ }));
    expect(screen.getAllByText('Enter a name.').length).toBeGreaterThan(0);
    expect(screen.queryByText('Enter a name first.')).toBeNull();
  });

  it('disables every field and button when read-only', () => {
    const onMessage = vi.fn();
    render(<A2uiSurface messages={messages(form, { ...formData, name: 'Ada' })} onMessage={onMessage} readOnly />);
    expect((screen.getByRole('textbox', { name: /Name/ }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getByRole('checkbox', { name: 'Email me' }).hasAttribute('disabled') ||
        screen.getByRole('checkbox', { name: 'Email me' }).getAttribute('aria-disabled') === 'true',
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('includes the data model when the surface asks for it', () => {
    const onMessage = vi.fn();
    render(
      <A2uiSurface
        messages={messages(form, { ...formData, name: 'Ada' }, { sendDataModel: true })}
        onMessage={onMessage}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onMessage.mock.calls[0]![1]).toEqual({ dataModel: { ...formData, name: 'Ada' } });
  });
});

describe('A2uiSurface functions', () => {
  const app = defineCatalog({
    id: 'app/tickets@1',
    components: {
      Owner: defineComponent({ description: 'An owner.', props: z.strictObject({ name: dynamicStringSchema }) }),
    },
    functions: {
      lookupOwner: defineFunction({
        description: 'Finds the owner.',
        args: z.strictObject({ id: z.string() }),
        returnType: 'string',
      }),
      localTime: defineFunction({
        description: 'The time here.',
        returnType: 'string',
        allowedCallers: 'rendererOrAgent',
      }),
      secret: defineFunction({ description: 'Renderer only.', returnType: 'string', run: () => 'no' }),
    },
  });
  const OwnerAdapter: A2uiAdapter<{ name: unknown }> = ({ props, context }) => (
    <p>Owner: {String(context.resolve(props.name))}</p>
  );
  const catalogs = [sproutCatalog, app];
  const adapters = { [sproutCatalog.id]: sproutAdapters, [app.id]: { Owner: OwnerAdapter } };
  const owner = [
    { id: 'root', component: 'Column', children: ['owner'] },
    {
      id: 'owner',
      component: 'Owner',
      '@catalogId': app.id,
      name: { '@call': 'lookupOwner', catalogId: app.id, args: { id: '7' } },
    },
  ];

  it('asks the agent for functions the renderer lacks, then draws the answer', async () => {
    const sent: A2uiOutgoingMessage[] = [];
    const list = messages(owner);
    const { container, rerender } = render(
      <A2uiSurface messages={list} catalogs={catalogs} adapters={adapters} onMessage={message => sent.push(message)} />,
    );
    expect(container.querySelectorAll('.sprout-a2ui-pending')).toHaveLength(1);
    await waitFor(() => expect(sent).toHaveLength(1));
    const request = sent[0] as Extract<A2uiOutgoingMessage, { callAgentFunction: unknown }>;
    expect(request.callAgentFunction).toMatchObject({
      surfaceId: 's1',
      callFunction: { '@call': 'lookupOwner', catalogId: app.id, args: { id: '7' } },
    });
    const functionCallId = request.callAgentFunction.functionCallId;
    rerender(
      <A2uiSurface
        messages={[...list, { version, agentFunctionResponse: { functionCallId, value: 'Ada' } }]}
        catalogs={catalogs}
        adapters={adapters}
        onMessage={message => sent.push(message)}
      />,
    );
    expect(screen.getByText('Owner: Ada')).toBeTruthy();
    expect(sent).toHaveLength(1);
  });

  it('uses a local implementation when the app provides one', () => {
    render(
      <A2uiSurface
        messages={messages(owner)}
        catalogs={catalogs}
        adapters={adapters}
        functions={{ [app.id]: { lookupOwner: ({ id }) => `Owner ${id}` } }}
      />,
    );
    expect(screen.getByText('Owner: Owner 7')).toBeTruthy();
  });

  it('always answers callRendererFunction', async () => {
    const sent: A2uiOutgoingMessage[] = [];
    const call = (functionCallId: string, name: string) => ({
      version,
      callRendererFunction: { functionCallId, callFunction: { '@call': name, catalogId: app.id } },
    });
    render(
      <A2uiSurface
        messages={[...messages(owner), call('c1', 'localTime'), call('c2', 'secret'), call('c3', 'nothing')]}
        catalogs={catalogs}
        adapters={adapters}
        functions={{ [app.id]: { localTime: () => '09:00', lookupOwner: () => 'Ada' } }}
        onMessage={message => sent.push(message)}
      />,
    );
    await waitFor(() => expect(sent).toHaveLength(3));
    const responses = Object.fromEntries(
      sent.map(message => {
        const { functionCallId, ...rest } = (
          message as Extract<A2uiOutgoingMessage, { rendererFunctionResponse: unknown }>
        ).rendererFunctionResponse;
        return [functionCallId, rest];
      }),
    );
    expect(responses.c1).toEqual({ value: '09:00' });
    expect(responses.c2).toMatchObject({ error: { code: 'INVALID_FUNCTION_CALL' } });
    expect(responses.c3).toMatchObject({ error: { code: 'INVALID_FUNCTION_CALL' } });
  });

  it('runs a button functionCall only from a click', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const onMessage = vi.fn();
    render(
      <A2uiSurface
        messages={messages([
          { id: 'root', component: 'Column', children: ['b'] },
          {
            id: 'b',
            component: 'Button',
            label: 'Open docs',
            action: { functionCall: { '@call': 'openUrl', args: { url: 'https://example.com' } } },
          },
        ])}
        onMessage={onMessage}
      />,
    );
    expect(open).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Open docs' })));
    expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
    expect(onMessage).not.toHaveBeenCalled();
  });
});

describe('Metric', () => {
  it('says the change in words, not only color', () => {
    const { container, rerender } = render(
      <Metric label="Revenue" value="$12k" change={{ value: '4%', direction: 'down', tone: 'negative' }} />,
    );
    const change = container.querySelector('.sprout-metric-change')!;
    expect(change.getAttribute('data-tone')).toBe('negative');
    expect(change.textContent).toBe('↓Down 4%');
    expect(change.querySelector('[aria-hidden="true"]')!.textContent).toBe('↓');

    rerender(<Metric label="Swap" value="0 GB" change={{ value: '0', direction: 'flat', label: 'in 1 hour' }} />);
    expect(container.querySelector('.sprout-metric-change')!.textContent).toBe('→No changein 1 hour');
    expect(container.querySelector('.sprout-metric-change')!.getAttribute('data-tone')).toBe('neutral');
  });

  it('shows the caption and trend only when given', () => {
    const { container, rerender } = render(<Metric label="CPU" value="12%" />);
    expect(container.querySelector('.sprout-metric-trend, .sprout-metric-caption, .sprout-metric-change')).toBeNull();
    rerender(<Metric label="CPU" value="12%" caption="Just now" trend={<svg />} className="x" id="cpu" />);
    const metric = container.querySelector('#cpu')!;
    expect(metric.className).toBe('sprout-metric x');
    expect(metric.querySelector('.sprout-metric-trend svg')).toBeTruthy();
    expect(metric.querySelector('.sprout-metric-caption')!.textContent).toBe('Just now');
  });
});
