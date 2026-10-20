import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { Field } from '../packages/sprout/src/components/field.js';
import {
  Form,
  FormFooter,
  FormSection,
  formFooterLayoutNames,
  formSectionLevelNames,
} from '../packages/sprout/src/components/form.js';
import { Input } from '../packages/sprout/src/components/input.js';
import * as sprout from '../packages/sprout/src/index.js';

const root = new URL('../packages/sprout/', import.meta.url);
const ready = { kind: 'ready' } as const;
const submit = {
  label: 'Save sharing',
  pendingLabel: 'Saving sharing…',
  state: ready,
};

describe('Form', () => {
  it('renders a named noValidate form', () => {
    const html = renderToString(
      <Form id="knowledge" label="Add repositories to Knowledge" onSubmit={() => undefined}>
        <p>Body</p>
      </Form>,
    );
    expect(html).toMatch(/^<form [^>]*><p>Body<\/p><\/form>$/);
    for (const attr of [
      'id="knowledge"',
      'data-slot="form"',
      'noValidate=""',
      'aria-label="Add repositories to Knowledge"',
      'class="sprout-form"',
    ])
      expect(html).toContain(attr);
  });

  it('locks the fields inside while disabled', () => {
    const locked = renderToString(
      <Form disabled onSubmit={() => undefined}>
        <Field label="Workspace URL" required>
          <Input />
        </Field>
      </Form>,
    );
    expect(locked).toContain('data-disabled="true"');
    expect(locked).toMatch(/<input[^>]*disabled=""/);
    const open = renderToString(
      <Form onSubmit={() => undefined}>
        <Field label="Workspace URL" required>
          <Input />
        </Field>
      </Form>,
    );
    expect(open).not.toMatch(/<input[^>]*disabled=""/);
  });
});

describe('FormSection', () => {
  it('names the region by title and shows description and meta', () => {
    const html = renderToString(
      <FormSection title="What it can do" description="Choose actions by app." meta="3 / 20">
        <p>Tools</p>
      </FormSection>,
    );
    expect(html).toMatch(/<section[^>]*aria-label="What it can do"[^>]*>/);
    expect(html).toContain('data-slot="form-section"');
    expect(html).toContain('<h2 class="sprout-form-section-title">What it can do</h2>');
    expect(html).toContain('<p class="sprout-form-section-description">Choose actions by app.</p>');
    expect(html).toMatch(/sprout-badge-secondary[^>]*>3 \/ 20</);
    expect(html).toContain('<div class="sprout-form-section-content"><p>Tools</p></div>');
  });

  it('supports a label override, id, level 3, and no description or meta', () => {
    const html = renderToString(
      <FormSection id="agent-activations" title="Activate instructions" label="Agent activations" level={3}>
        <p>Body</p>
      </FormSection>,
    );
    expect(html).toContain('id="agent-activations"');
    expect(html).toContain('aria-label="Agent activations"');
    expect(html).toContain('<h3');
    expect(html).not.toContain('sprout-form-section-description');
    expect(html).not.toContain('sprout-badge');
    expect(formSectionLevelNames).toEqual([2, 3]);
  });
});

describe('FormFooter', () => {
  it('defaults to the bar layout with a ready submit', () => {
    const html = renderToString(<FormFooter dirty={false} submit={submit} />);
    expect(html).toContain('data-layout="bar"');
    expect(html).toContain('data-slot="form-footer"');
    expect(html.match(/<button[^>]*>Save sharing<\/button>/)?.[0]).toContain('type="submit"');
    expect(html).not.toContain('Unsaved changes');
    expect(html).not.toContain('aria-busy');
    expect(formFooterLayoutNames).toEqual(['bar', 'stack', 'compact']);
  });

  it('shows unsaved changes, note, error, and a reset cancel while dirty', () => {
    const html = renderToString(
      <FormFooter
        dirty
        note="Runs use these tools after a manager activates the new version."
        error="Fix 1 field to change the interval."
        submit={submit}
        cancel={{
          kind: 'reset',
          label: 'Discard changes',
          onReset: () => undefined,
        }}
      />,
    );
    expect(html).toContain('Unsaved changes');
    expect(html).toContain('sprout-form-footer-dirty-dot');
    expect(html).toContain('<p class="sprout-form-footer-note">Runs use these tools');
    expect(html).toMatch(/role="alert"[^>]*>Fix 1 field/);
    expect(html).toMatch(/sprout-alert-destructive[^>]*>Fix 1 field/);
    expect(html).toContain('>Discard changes</button>');
  });

  it('hides the reset cancel when clean or busy and shows the pending label', () => {
    const cancel = {
      kind: 'reset',
      label: 'Discard changes',
      onReset: () => undefined,
    } as const;
    expect(renderToString(<FormFooter dirty={false} submit={submit} cancel={cancel} />)).not.toContain(
      'Discard changes',
    );
    const busy = renderToString(<FormFooter dirty submit={{ ...submit, state: { kind: 'busy' } }} cancel={cancel} />);
    expect(busy).not.toContain('Discard changes');
    expect(busy).toContain('>Saving sharing…</button>');
    expect(busy).toContain('aria-busy="true"');
    expect(busy).toMatch(/<button[^>]*(aria-disabled="true"|data-disabled)/);
    expect(busy).not.toMatch(/<button[^>]*\sdisabled=""[^>]*>Saving sharing/);
  });

  it('describes a blocked submit with its reason and fix', () => {
    for (const fix of [
      {
        kind: 'jump',
        label: 'Choose a team',
        target: 'slack-destination-team',
      },
      { kind: 'action', label: 'Try again', onClick: () => undefined },
    ] as const) {
      const html = renderToString(
        <FormFooter
          dirty={false}
          submit={{
            ...submit,
            state: {
              kind: 'blocked',
              reason: 'Choose a destination team below first.',
              fix,
            },
          }}
        />,
      );
      const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];
      expect(describedBy).toBeTruthy();
      expect(html).toContain(`<span id="${describedBy}">Choose a destination team below first.</span>`);
      expect(html).toContain('data-slot="action-reason" class="sprout-action-reason"');
      expect(html).toMatch(new RegExp(`sprout-button-variant-link[^>]*>${fix.label}</button>`));
    }
    const link = renderToString(
      <FormFooter
        dirty={false}
        submit={{
          ...submit,
          state: {
            kind: 'blocked',
            reason: 'Restore the original Google integration.',
            fix: {
              kind: 'link',
              label: 'Open integrations',
              link: <a href="/integrations" />,
            },
          },
        }}
      />,
    );
    expect(link).toMatch(/<a[^>]*href="\/integrations"[^>]*>Open integrations<\/a>/);
  });

  it('renders a leave link cancel and a secondary submit', () => {
    const html = renderToString(
      <FormFooter
        dirty={false}
        submit={{
          label: 'Continue',
          pendingLabel: 'Saving setup…',
          state: ready,
        }}
        secondarySubmit={{
          label: 'Save draft',
          disabled: false,
          onSelect: () => undefined,
        }}
        cancel={{ kind: 'leave', label: 'Cancel', link: <a href="/agents" /> }}
      />,
    );
    expect(html).toMatch(/<a[^>]*href="\/agents"[^>]*>Cancel<\/a>/);
    expect(html).toMatch(/<button[^>]*sprout-button-variant-outline[^>]*>Save draft<\/button>/);
    expect(html.match(/<button[^>]*>Save draft/)?.[0]).toContain('type="submit"');
    expect(html.indexOf('Cancel')).toBeLessThan(html.indexOf('Save draft'));
    expect(html.indexOf('Save draft')).toBeLessThan(html.indexOf('Continue'));
  });

  it('uses large full-width buttons and children below in the stack layout', () => {
    const html = renderToString(
      <FormFooter
        layout="stack"
        dirty={false}
        note="Drafts stay here until you leave Members."
        submit={{
          label: 'Send invitations',
          pendingLabel: 'Sending invitations…',
          state: ready,
        }}
      >
        <button type="button">Not now</button>
      </FormFooter>,
    );
    expect(html).toContain('data-layout="stack"');
    const send = html.match(/<button[^>]*>Send invitations/)?.[0] ?? '';
    expect(send).toContain('sprout-button-size-lg');
    expect(send).toContain('sprout-form-footer-wide');
    expect(html.indexOf('Drafts stay here')).toBeLessThan(html.indexOf('Send invitations'));
    expect(html.indexOf('Send invitations')).toBeLessThan(html.indexOf('Not now'));
  });

  it('puts compact children beside the buttons and hides the status from sight', () => {
    const html = renderToString(
      <FormFooter
        layout="compact"
        dirty
        submit={{
          label: 'Save answer',
          pendingLabel: 'Saving answer...',
          state: ready,
        }}
      >
        <button type="button">Skip</button>
      </FormFooter>,
    );
    expect(html).toContain('<div class="sprout-form-footer-sr-only"><p class="sprout-form-footer-dirty">');
    expect(html).toMatch(/sprout-form-footer-actions"><button type="button">Skip<\/button><button/);
  });

  it('replaces the status with a summary and targets an outside form', () => {
    const html = renderToString(
      <FormFooter
        form="knowledge"
        layout="compact"
        dirty
        summary={<p role="status">3 / 20 selected</p>}
        submit={{
          label: 'Add to Knowledge',
          pendingLabel: 'Adding to Knowledge…',
          state: ready,
        }}
      />,
    );
    expect(html).toContain('<div class="sprout-form-footer-status"><p role="status">3 / 20 selected</p></div>');
    expect(html).not.toContain('Unsaved changes');
    expect(html.match(/<button[^>]*>Add to Knowledge/)?.[0]).toContain('form="knowledge"');
  });
});

describe('Form package wiring', () => {
  it('exports Form parts from the root and the form subpath', () => {
    for (const name of ['Form', 'FormFooter', 'FormSection', 'formFooterLayoutNames', 'formSectionLevelNames'])
      expect(sprout).toHaveProperty(name);
    const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
    expect(manifest.exports['./form']).toEqual({
      types: './dist/components/form.d.ts',
      import: './dist/components/form.js',
    });
    expect(readFileSync(new URL('src/styles/index.css', root), 'utf8')).toContain("@import './form.css';");
  });

  it('styles only with namespaced Sprout tokens and guards motion', () => {
    const css = readFileSync(new URL('src/styles/form.css', root), 'utf8');
    for (const token of css.match(/var\(--[\w-]+/g) ?? []) expect(token).toMatch(/^var\(--sprout-/);
    expect(css).toContain('prefers-reduced-motion: no-preference');
  });
});
