// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SchemaDiagram, type SchemaLink, type SchemaTable } from '../packages/sprout/src/components/schema-diagram.js';

const tables: SchemaTable[] = [
  {
    id: 'deals',
    label: 'Deals',
    state: 'new',
    fields: [
      {
        id: 'customer',
        label: 'Customer',
        type: 'link',
        required: true,
        unique: true,
        change: 'added',
        detail: 'To Customers',
      },
      { id: 'owner', label: 'Owner', type: 'link', required: false },
    ],
  },
  { id: 'customers', label: 'Customers', state: 'changed', fields: [] },
  { id: 'notes', label: 'Notes', state: 'unchanged', fields: [] },
  { id: 'loose', label: 'Loose', state: 'linked', fields: [] },
];
const links: SchemaLink[] = [
  {
    id: 'l1',
    source: 'deals',
    field: 'customer',
    target: 'customers',
    label: 'N:1',
  },
  {
    id: 'l2',
    source: 'customers',
    field: 'missing',
    target: 'notes',
    label: '',
  },
  { id: 'l3', source: 'notes', field: 'x', target: 'notes', label: 'self' },
  { id: 'l4', source: 'ghost', field: 'x', target: 'phantom', label: '?' },
];

let frames: FrameRequestCallback[] = [];
const realMatchMedia = window.matchMedia;
const media = (mobile: boolean, reduced = false) => {
  window.matchMedia = vi.fn(
    (query: string) =>
      ({
        matches: query.includes('max-width') ? mobile : reduced,
        addEventListener() {},
        removeEventListener() {},
      }) as never,
  );
};

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => frames.push(f));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal(
    'DOMMatrixReadOnly',
    class {
      m22: number;
      constructor(transform?: string) {
        const scale = transform?.match(/scale\(([1-9.])\)/)?.[1];
        this.m22 = scale ? Number(scale) : 1;
      }
    },
  );
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.matchMedia = realMatchMedia;
});

const viewport = () => document.querySelector<HTMLElement>("[data-slot='schema-diagram-viewport']")!;

describe('SchemaDiagram in the DOM', () => {
  it('lays out columns, labels links, and handles view keys and buttons', async () => {
    media(false);
    render(<SchemaDiagram tables={tables} links={links} label="Schema" />);
    await act(async () => {});
    act(() => frames.splice(0).forEach(f => f(0)));
    expect(screen.getByRole('figure').getAttribute('data-layout')).toBe('horizontal');
    expect(screen.getByText('Fields not shown')).toBeTruthy();
    expect(screen.getAllByText('No fields')).toHaveLength(2);

    const view = viewport();
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_', '0', 'x'])
      fireEvent.keyDown(view, { key, shiftKey: key === 'ArrowUp' });
    fireEvent.keyDown(view, { key: '+', ctrlKey: true });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Zoom in' }), {
      key: '+',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fit to view' }));
    await act(async () => {});
  });

  it('stacks tables vertically on mobile with reduced motion', async () => {
    media(true, true);
    render(<SchemaDiagram tables={tables} links={links} label="Schema" />);
    await act(async () => {});
    expect(screen.getByRole('figure').getAttribute('data-layout')).toBe('vertical');
    fireEvent.keyDown(viewport(), { key: '0' });
    fireEvent.click(screen.getByRole('button', { name: 'Fit to view' }));
    await act(async () => {});
  });
});
