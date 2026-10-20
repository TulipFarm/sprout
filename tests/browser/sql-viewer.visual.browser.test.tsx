import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { SqlViewer, type SqlViewerTable } from '../../packages/sprout/src/components/sql-viewer.js';
import { setTheme, settle, themes } from './support.js';

const tables: SqlViewerTable[] = [
  {
    id: 'customers',
    label: 'Customers',
    owningTeamId: 'sales',
    fields: [
      {
        id: 'email',
        label: 'email',
        required: true,
        kind: 'text',
        maxLength: 320,
      },
      {
        id: 'segment',
        label: 'segment',
        required: false,
        kind: 'single-select',
        options: [],
      },
    ],
    uniqueKeys: [{ id: 'email-key', fieldIds: ['email'] }],
  },
  {
    id: 'deals',
    label: 'Deals',
    owningTeamId: 'sales',
    fields: [
      {
        id: 'title',
        label: 'title',
        required: true,
        kind: 'text',
        maxLength: 200,
      },
      {
        id: 'customer',
        label: 'customer_id',
        required: true,
        kind: 'relationship',
        targetTableId: 'customers',
        cardinality: 'one',
        inverseCardinality: 'many',
      },
    ],
    uniqueKeys: [{ id: 'deal-key', fieldIds: ['customer', 'title'] }],
  },
  { id: 'notes', label: 'Notes', fields: [] },
];

it.each(themes)('sql-viewer %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(900, 420);
  const screen = await render(
    <div data-testid="shot" style={{ height: 400, padding: 8 }}>
      <SqlViewer tables={tables} groups={{ sales: 'Sales' }} maxVisible={2} label="Sales tables" />
    </div>,
  );
  await expect
    .poll(() =>
      [...document.querySelectorAll<HTMLElement>('.react-flow__node')].every(
        node => getComputedStyle(node).visibility === 'visible',
      ),
    )
    .toBe(true);
  await expect.poll(() => document.querySelectorAll('.sprout-sql-join').length).toBe(1);
  await settle();
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`sql-viewer-${theme}-${mode}`);
});
