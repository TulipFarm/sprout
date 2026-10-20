import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { PromptList, type PromptListItem } from '../packages/sprout/src/components/prompt-list.js';
import * as sprout from '../packages/sprout/src/index.js';

const root = new URL('../packages/sprout/', import.meta.url);
const items: PromptListItem[] = [
  {
    id: 'follow-ups',
    label: 'Plan customer follow-ups',
    icon: <svg data-icon="checklist" />,
  },
  {
    id: 'meetings',
    label: "Prepare me for tomorrow's meetings",
    icon: <svg data-icon="calendar" />,
    brands: [{ brand: 'google-calendar', name: 'Google Calendar' }],
  },
  {
    id: 'standup',
    label: 'Prepare a daily team update',
    icon: <svg data-icon="clock" />,
    brands: [
      { brand: 'github', name: 'GitHub' },
      { brand: 'slack', name: 'Slack' },
    ],
  },
];
const noop = () => {};

describe('PromptList', () => {
  it('names the section by its visible title and renders one button per row', () => {
    const html = renderToString(<PromptList title="Start with a task" items={items} onSelect={noop} />);
    const id = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toMatch(/^<section data-slot="prompt-list" aria-labelledby="[^"]+" class="sprout-prompt-list">/);
    expect(html).toContain(`<h3 id="${id}" class="sprout-prompt-list-title">Start with a task</h3>`);
    expect(html).not.toContain('aria-label="Start with a task"');
    expect(html.match(/<button type="button"/g)).toHaveLength(3);
    expect(html).toContain(
      'title="Plan customer follow-ups" class="sprout-prompt-list-button">Plan customer follow-ups</button>',
    );
    expect(html.match(/data-slot="prompt-list-item"/g)).toHaveLength(3);
    expect(html).toContain('--sprout-prompt-index:2');
  });

  it('hides the title but keeps it as the accessible name', () => {
    const html = renderToString(<PromptList title="More tasks" showTitle={false} items={items} onSelect={noop} />);
    expect(html).toContain('aria-label="More tasks"');
    expect(html).not.toContain('aria-labelledby');
    expect(html).not.toContain('<h3');
  });

  it('draws icons, arrows, and brand stacks only where brands exist', () => {
    const html = renderToString(<PromptList title="Start with a task" items={items} onSelect={noop} />);
    expect(html.match(/<span aria-hidden="true" class="sprout-prompt-list-icon"><svg data-icon=/g)).toHaveLength(3);
    expect(html.match(/sprout-prompt-list-arrow/g)).toHaveLength(3);
    expect(html.match(/data-slot="brand-stack"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Google Calendar"');
    expect(html).toContain('aria-label="GitHub, Slack"');
    expect(html).toContain('sprout-brand-stack sprout-prompt-list-brands');
    const empty = renderToString(<PromptList title="t" items={[{ ...items[0]!, brands: [] }]} onSelect={noop} />);
    expect(empty).not.toContain('brand-stack');
  });

  it('disables every row and marks the list', () => {
    const html = renderToString(<PromptList title="Start with a task" items={items} onSelect={noop} disabled />);
    expect(html).toContain('data-disabled="true"');
    expect(html.match(/<button type="button" disabled=""/g)).toHaveLength(3);
  });

  it('forwards className and section props', () => {
    const html = renderToString(
      <PromptList title="t" items={items} onSelect={noop} className="extra" data-testid="tasks" />,
    );
    expect(html).toContain('data-testid="tasks"');
    expect(html).toContain('class="sprout-prompt-list extra"');
  });

  it('ships a subpath export, the root export, and styles in the CSS entry', () => {
    const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
    expect(manifest.exports['./prompt-list']).toEqual({
      types: './dist/components/prompt-list.d.ts',
      import: './dist/components/prompt-list.js',
    });
    expect(sprout.PromptList).toBe(PromptList);
    const entry = readFileSync(new URL('src/styles/index.css', root), 'utf8');
    expect(entry).toContain("@import './prompt-list.css';");
    const css = readFileSync(new URL('src/styles/prompt-list.css', root), 'utf8');
    expect(css).toContain('prefers-reduced-motion: no-preference');
    expect(css).toContain('pointer: coarse');
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });
});
