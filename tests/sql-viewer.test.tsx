import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as sprout from '../packages/sprout/src/index.js';
import { SqlViewer, type SqlViewerTable } from '../packages/sprout/src/components/sql-viewer.js';

const table = (id: string, fields: SqlViewerTable['fields'] = []) => ({
  id,
  label: id[0]!.toUpperCase() + id.slice(1),
  fields,
});

const tables: SqlViewerTable[] = [
  table('deals', [
    {
      id: 'customer',
      label: 'customer_id',
      required: true,
      kind: 'relationship',
      targetTableId: 'customers',
      cardinality: 'one',
      inverseCardinality: 'many',
    },
    {
      id: 'tags',
      label: 'tags',
      required: false,
      kind: 'relationship',
      targetTableId: 'tags',
      cardinality: 'many',
      inverseCardinality: 'many',
    },
    {
      id: 'gone',
      label: 'gone_id',
      required: false,
      kind: 'relationship',
      targetTableId: 'missing',
      cardinality: 'one',
      inverseCardinality: 'one',
    },
  ]),
  table('customers', [
    {
      id: 'email',
      label: 'email',
      required: true,
      kind: 'text',
      maxLength: 320,
    },
  ]),
  table('tags'),
  table('notes'),
  table('files'),
  table('users'),
];

describe('SQL Viewer', () => {
  it('is exported from the package root', () => {
    expect(sprout.SqlViewer).toBe(SqlViewer);
    expect(sprout.sqlViewerLayoutNames).toEqual(['auto', 'horizontal', 'vertical']);
  });

  it('names the figure and lists every join for screen readers', () => {
    const html = renderToString(<SqlViewer tables={tables} label="Tables in Sales" />);
    expect(html).toContain('role="figure"');
    expect(html).toContain('aria-label="Tables in Sales"');
    expect(html).toContain('Deals.customer_id joins Customers.id, many to one');
    expect(html).toContain('Deals.tags joins Tags.id, many to many');
    expect(html).not.toContain('gone_id joins');
  });

  it('shows an empty state', () => {
    const html = renderToString(<SqlViewer tables={[]} label="Nothing" />);
    expect(html).toContain('No tables to show');
  });

  it('uses the fixed layout it is given', () => {
    const html = renderToString(<SqlViewer tables={tables} label="Stack" layout="vertical" />);
    expect(html).toContain('data-layout="vertical"');
  });
});
