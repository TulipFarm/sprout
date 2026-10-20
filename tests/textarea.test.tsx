import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { Textarea, textareaVariantNames } from '../packages/sprout/src/components/textarea.js';
import { Field, FieldsDisabled } from '../packages/sprout/src/components/field.js';
import { Label } from '../packages/sprout/src/components/label.js';
import * as sprout from '../packages/sprout/src/index.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../packages/sprout/src/styles/textarea.css');

describe('Textarea', () => {
  it('is exported from the package root, its subpath, and the CSS entry', () => {
    for (const name of ['Textarea', 'textareaVariantNames']) {
      expect(sprout).toHaveProperty(name);
    }
    expect(textareaVariantNames).toEqual(['default', 'embedded']);
    const pkg = JSON.parse(read('../packages/sprout/package.json'));
    expect(pkg.exports['./textarea']).toEqual({
      types: './dist/components/textarea.d.ts',
      import: './dist/components/textarea.js',
    });
    expect(read('../packages/sprout/src/styles/index.css')).toContain('@import "./textarea.css";');
    expect(read('../apps/docs/src/data/nav.ts')).toContain('"Textarea"');
  });

  it('renders a native textarea with the default variant', () => {
    const html = renderToString(<Textarea placeholder="Type your answer…" />);
    expect(html).toMatch(/^<textarea/);
    expect(html).toContain('data-slot="textarea"');
    expect(html).toContain('data-variant="default"');
    expect(html).toContain('class="sprout-textarea sprout-textarea-variant-default"');
    expect(html).toContain('placeholder="Type your answer…"');
    expect(html).not.toContain('style=');
  });

  it('renders each variant', () => {
    for (const variant of textareaVariantNames) {
      const html = renderToString(<Textarea variant={variant} aria-label="Draft message" />);
      expect(html).toContain(`data-variant="${variant}"`);
      expect(html).toContain(`sprout-textarea-variant-${variant}`);
    }
  });

  it('passes every native prop Cloud uses', () => {
    const html = renderToString(
      <Textarea
        id="knowledge-content"
        rows={10}
        maxLength={1048576}
        required
        readOnly
        spellCheck={false}
        value="Launch brief"
        onChange={() => {}}
        onKeyDown={() => {}}
        aria-invalid
        aria-describedby="help error"
        aria-busy
      />,
    );
    for (const attr of [
      'id="knowledge-content"',
      'rows="10"',
      'maxLength="1048576"',
      'required=""',
      'readOnly=""',
      'spellCheck="false"',
      'aria-invalid="true"',
      'aria-describedby="help error"',
      'aria-busy="true"',
      '>Launch brief</textarea>',
    ]) {
      expect(html).toContain(attr);
    }
    expect(renderToString(<Textarea disabled defaultValue="x" />)).toContain('disabled=""');
  });

  it("exposes rows as a min-height variable and keeps the caller's style", () => {
    for (const rows of [3, 5, 9, 10, 12]) {
      const html = renderToString(<Textarea rows={rows} />);
      expect(html).toContain(`rows="${rows}"`);
      expect(html).toContain(`style="--sprout-textarea-rows:${rows}"`);
    }
    const styled = renderToString(<Textarea rows={5} style={{ maxHeight: 240 }} />);
    expect(styled).toContain('--sprout-textarea-rows:5');
    expect(styled).toContain('max-height:240px');
  });

  it('reads id, descriptions, and states from a Sprout Field', () => {
    const html = renderToString(
      <Field
        id="agent-instructions"
        label="Instructions"
        required
        counter="12 / 32,000"
        helper="Describe its role."
        error="Enter instructions."
      >
        <Textarea rows={9} />
      </Field>,
    );
    expect(html).toContain('for="agent-instructions"');
    expect(html).toContain('id="agent-instructions"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-required="true"');
    expect(html).toContain('aria-describedby="agent-instructions-error agent-instructions-counter"');
    const optional = renderToString(
      <Field id="notes" label="Notes" optional disabled helper="Saved here.">
        <Textarea />
      </Field>,
    );
    expect(optional).toContain('disabled=""');
    expect(optional).toContain('aria-describedby="notes-helper notes-requirement"');
    const locked = renderToString(
      <FieldsDisabled value>
        <Field id="memory" label="Your preferences" optional>
          <Textarea />
        </Field>
      </FieldsDisabled>,
    );
    expect(locked).toMatch(/<textarea[^>]*disabled=""/);
  });

  it('keeps its own name when aria-label is set inside a field', () => {
    const html = renderToString(
      <Field id="ignored" label="Composer" required>
        <Textarea aria-label="Draft message" variant="embedded" />
      </Field>,
    );
    expect(html).toContain('aria-label="Draft message"');
    expect(html).not.toMatch(/<textarea[^>]*id="ignored"/);
  });

  it('works inside a wrapping Label and accepts slot and class overrides', () => {
    const wrapped = renderToString(
      <Label>
        Decision or comment
        <Textarea />
      </Label>,
    );
    expect(wrapped).toMatch(/<label[^>]*>Decision or comment<textarea/);
    const html = renderToString(
      <Textarea data-slot="input-group-control" aria-label="Draft message" className="max-h-60" />,
    );
    expect(html).toContain('data-slot="input-group-control"');
    expect(html).toContain('class="sprout-textarea sprout-textarea-variant-default max-h-60"');
  });

  it('styles states with namespaced tokens and gates motion', () => {
    for (const token of [
      '--sprout-input',
      '--sprout-surface',
      '--sprout-text',
      '--sprout-muted',
      '--sprout-focus',
      '--sprout-danger',
      '--sprout-hover',
      '--sprout-radius-control',
      '--sprout-textarea-rows',
    ]) {
      expect(css).toContain(`var(${token}`);
    }
    expect(css).toContain('@layer components');
    expect(css).toContain('field-sizing: content');
    expect(css).toContain('font-family: inherit');
    expect(css).toContain('.sprout-textarea[aria-invalid="true"]');
    expect(css).toContain('.sprout-textarea-variant-embedded');
    expect(css).toMatch(/prefers-reduced-motion: no-preference\)\s*\{\s*\.sprout-textarea\s*\{\s*transition/);
    expect(css).toContain('forced-colors: active');
  });
});
