import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import {
  ActionGroup,
  Button,
  jumpTo,
  useActionControl,
  type ButtonState,
} from '../packages/sprout/src/components/button.js';
import * as sprout from '../packages/sprout/src/index.js';

const root = new URL('../packages/sprout/', import.meta.url);
const ready: ButtonState = { kind: 'ready' };
const busy: ButtonState = { kind: 'busy' };
const button = (html: string) => html.match(/<button[^>]*>/)?.[0] ?? '';

describe('Button without state', () => {
  it('renders the single element it always has, with no wrapper', () => {
    expect(
      renderToString(
        <Button variant="outline" size="sm" className="extra" disabled pendingLabel="Saving…">
          Save
        </Button>,
      ),
    ).toBe(
      '<button type="button" data-disabled="" tabindex="0" disabled="" data-slot="button" data-variant="outline" data-size="sm" class="sprout-button sprout-button-variant-outline sprout-button-size-sm extra">Save</button>',
    );
    expect(
      renderToString(
        <Button nativeButton={false} render={<a href="/x" />}>
          Go
        </Button>,
      ),
    ).toBe(
      '<a href="/x" data-slot="button" data-variant="default" data-size="md" class="sprout-button sprout-button-variant-default sprout-button-size-md">Go</a>',
    );
  });
  it('renders the ghost-destructive variant class', () => {
    const html = renderToString(<Button variant="ghost-destructive">Remove</Button>);
    expect(html).toContain('class="sprout-button sprout-button-variant-ghost-destructive sprout-button-size-md"');
  });
});

describe('Button with state', () => {
  it('wraps a ready button and puts className on the wrapper', () => {
    const html = renderToString(
      <Button state={ready} className="extra">
        Activate saved instructions
      </Button>,
    );
    expect(html).toMatch(
      /^<div data-slot="button-action" data-state="ready" class="sprout-button-action extra"><button/,
    );
    const tag = button(html);
    expect(tag).toContain('type="button"');
    expect(tag).toContain('class="sprout-button sprout-button-variant-default sprout-button-size-md"');
    expect(tag).not.toMatch(/ disabled=""|aria-disabled="true"|data-disabled/);
    expect(tag).not.toContain('aria-busy');
    expect(html).toContain('>Activate saved instructions</button></div>');
  });

  it('swaps in the pending label and a hidden Sprout spinner while busy', () => {
    const html = renderToString(
      <Button state={busy} pendingLabel="Deleting agent…" variant="destructive">
        Delete agent
      </Button>,
    );
    const tag = button(html);
    expect(tag).toContain('aria-busy="true"');
    expect(tag).toContain('aria-disabled="true"');
    expect(tag).not.toMatch(/ disabled=""/);
    expect(tag).toContain('sprout-button-variant-destructive');
    expect(html).toMatch(/<svg[^>]*data-slot="spinner"[^>]*aria-hidden="true"/);
    expect(html).not.toContain('role="status"');
    expect(html).toContain('Deleting agent…</button>');
    expect(html).not.toContain('Delete agent<');
  });

  it('keeps the label without a spinner when busy has no pending label', () => {
    const html = renderToString(
      <Button state={busy} variant="outline">
        Check channel
      </Button>,
    );
    expect(button(html)).toContain('aria-busy="true"');
    expect(html).not.toContain('data-slot="spinner"');
    expect(html).toContain('>Check channel</button>');
  });

  it('describes a blocked button by its reason and keeps it focusable', () => {
    const html = renderToString(
      <Button
        state={{
          kind: 'blocked',
          reason: 'Check whether the agent was deleted before trying again.',
        }}
      >
        Delete agent
      </Button>,
    );
    const tag = button(html);
    const id = tag.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(tag).toContain('aria-disabled="true"');
    expect(tag).not.toContain('tabindex="-1"');
    expect(html).toContain(
      `<p data-slot="action-reason" class="sprout-action-reason"><span id="${id}">Check whether the agent was deleted before trying again.</span></p></div>`,
    );
  });

  it("keeps an explicit disabled and a caller's aria-describedby", () => {
    const tag = button(
      renderToString(
        <Button state={ready} disabled aria-describedby="hint">
          Save draft
        </Button>,
      ),
    );
    expect(tag).toContain('aria-disabled="true"');
    expect(tag).toContain('aria-describedby="hint"');
  });

  it('renders jump, action, and link fixes as link buttons', () => {
    const jump = renderToString(
      <Button
        state={{
          kind: 'blocked',
          reason: 'Choose a table to inspect first.',
          fix: {
            kind: 'jump',
            label: 'Choose a table',
            target: 'schedule-resource',
          },
        }}
      >
        Activate saved revision for inspection
      </Button>,
    );
    expect(jump).toMatch(
      /<button[^>]*sprout-button-variant-link[^>]*sprout-button-size-sm[^>]*>Choose a table<\/button>/,
    );
    const action = renderToString(
      <Button
        state={{
          kind: 'blocked',
          reason: 'Your sponsor details could not load.',
          fix: { kind: 'action', label: 'Try again', onClick: () => undefined },
        }}
      >
        Sponsor this schedule
      </Button>,
    );
    expect(action).toMatch(/<button[^>]*>Try again<\/button>/);
    const link = renderToString(
      <Button
        state={{
          kind: 'blocked',
          reason: 'An agent manager must activate this agent first.',
          fix: {
            kind: 'link',
            label: 'See setup steps',
            link: <a href="/agents/setup" />,
          },
        }}
      >
        Start task
      </Button>,
    );
    expect(link).toMatch(/<a [^>]*href="\/agents\/setup"[^>]*>See setup steps<\/a>/);
  });

  it('passes submit type, variant, and size to the button', () => {
    const tag = button(
      renderToString(
        <Button type="submit" state={ready} variant="ghost" size="lg">
          Send request
        </Button>,
      ),
    );
    expect(tag).toContain('type="submit"');
    expect(tag).toContain('class="sprout-button sprout-button-variant-ghost sprout-button-size-lg"');
  });
});

describe('ActionGroup', () => {
  it('shares one state and one reason across every action', () => {
    const html = renderToString(
      <ActionGroup
        state={{
          kind: 'blocked',
          reason: 'Refresh administration to load the latest settings.',
          fix: {
            kind: 'action',
            label: 'Refresh administration',
            onClick: () => undefined,
          },
        }}
        actions={[
          {
            label: 'Keep my draft against this version',
            variant: 'outline',
            onClick: () => undefined,
          },
          {
            label: 'Use current administration',
            variant: 'outline',
            onClick: () => undefined,
          },
        ]}
      />,
    );
    expect(html).toContain('data-slot="action-group"');
    expect(html).toContain('class="sprout-action-group-row"');
    const tags = html.match(/<button[^>]*sprout-button-variant-outline[^>]*>/g) ?? [];
    expect(tags).toHaveLength(2);
    const ids = tags.map(tag => tag.match(/aria-describedby="([^"]+)"/)?.[1]);
    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBe(ids[0]);
    expect(html.match(/data-slot="action-reason"/g)).toHaveLength(1);
  });

  it('marks every action busy and defaults to the default variant', () => {
    const html = renderToString(
      <ActionGroup
        state={busy}
        actions={[
          { label: 'Accept', onClick: () => undefined },
          { label: 'Reset', variant: 'outline', onClick: () => undefined },
        ]}
      />,
    );
    expect(html.match(/aria-busy="true"/g)).toHaveLength(2);
    expect(html).toContain('sprout-button-variant-default');
    expect(html).not.toContain('action-reason');
  });
});

describe('useActionControl', () => {
  it('returns button props and the reason for custom controls', () => {
    let readyControl: ReturnType<typeof useActionControl> | undefined;
    let blocked: ReturnType<typeof useActionControl> | undefined;
    function Probe() {
      readyControl = useActionControl({ kind: 'ready' });
      blocked = useActionControl({
        kind: 'blocked',
        reason: 'Choose a task data scope first.',
      });
      return null;
    }
    renderToString(<Probe />);
    expect(readyControl?.button).toStrictEqual({
      disabled: false,
      focusableWhenDisabled: true,
    });
    expect(readyControl?.reason).toBeNull();
    expect(blocked?.button.disabled).toBe(true);
    expect(blocked?.button['aria-describedby']).toMatch(/\S/);
    expect(renderToString(<>{blocked?.reason}</>)).toContain('>Choose a task data scope first.</span>');
  });

  it('jumpTo ignores missing targets', () => {
    const document = globalThis.document;
    Object.assign(globalThis, { document: { getElementById: () => null } });
    try {
      expect(jumpTo('missing')).toBeUndefined();
    } finally {
      Object.assign(globalThis, { document });
    }
  });
});

describe('Button package wiring', () => {
  it('exports the action helpers from the root and button subpath, with no action-button entry', () => {
    for (const name of ['Button', 'ActionGroup', 'jumpTo', 'useActionControl']) expect(sprout).toHaveProperty(name);
    expect(sprout).not.toHaveProperty('ActionButton');
    const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
    expect(manifest.exports['./button']).toEqual({
      types: './dist/components/button.d.ts',
      import: './dist/components/button.js',
    });
    expect(manifest.exports['./action-button']).toBeUndefined();
  });
});
