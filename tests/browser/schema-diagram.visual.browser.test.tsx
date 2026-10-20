import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  SchemaDiagram,
  type SchemaLink,
  type SchemaTable,
} from '../../packages/sprout/src/components/schema-diagram.js';
import { setTheme, settle, themes } from './support.js';

const tables: SchemaTable[] = [
  {
    id: 'projects',
    label: 'Projects',
    state: 'new',
    fields: [{ id: 'name', label: 'Name', type: 'text', required: true, unique: true }],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    state: 'changed',
    fields: [
      {
        id: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        change: 'changed',
      },
      {
        id: 'due',
        label: 'Due',
        type: 'date',
        required: false,
        change: 'added',
      },
      {
        id: 'note',
        label: 'Old note',
        type: 'text',
        required: false,
        change: 'removed',
      },
      { id: 'project', label: 'Project', type: 'link', required: true },
    ],
  },
];
const links: SchemaLink[] = [
  {
    id: 'l1',
    source: 'tasks',
    field: 'project',
    target: 'projects',
    label: 'N:1',
  },
];

it.each(themes)('schema-diagram %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(800, 420);
  const screen = await render(
    <div data-testid="shot" style={{ height: 400, padding: 8 }}>
      <SchemaDiagram tables={tables} links={links} label="Schema" />
    </div>,
  );
  await expect
    .poll(() =>
      [...document.querySelectorAll<HTMLElement>('.react-flow__node')].every(
        node => getComputedStyle(node).visibility === 'visible',
      ),
    )
    .toBe(true);
  await settle();
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`schema-diagram-${theme}-${mode}`);
});
