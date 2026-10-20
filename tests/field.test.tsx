import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { ComponentProps } from 'react';
import {
  CheckboxField,
  ChoiceGroup,
  Field,
  FieldSeparator,
  FieldsDisabled,
  checkboxFieldVariantNames,
  choiceGroupLayoutNames,
  choiceGroupTypeNames,
  fieldLabelVisibilityNames,
  useFieldControl,
} from '../packages/sprout/src/components/field.js';
import { Input } from '../packages/sprout/src/components/input.js';
import { Select, SelectTrigger, SelectValue } from '../packages/sprout/src/components/select.js';
import * as sprout from '../packages/sprout/src/index.js';

function Textarea(rest: ComponentProps<'textarea'>) {
  const props = useFieldControl(rest);
  return <textarea {...props} />;
}

const attr = (html: string, tag: string, name: string) =>
  html.match(new RegExp(`<${tag}[^>]*\\s${name}="([^"]*)"`))?.[1];

const noop = () => {};

describe('Field', () => {
  it('is exported from the package root', () => {
    for (const name of [
      'CheckboxField',
      'ChoiceGroup',
      'Field',
      'FieldSeparator',
      'FieldsDisabled',
      'useFieldControl',
    ]) {
      expect(sprout).toHaveProperty(name);
    }
    expect(fieldLabelVisibilityNames).toEqual(['visible', 'screen-reader']);
    expect(choiceGroupTypeNames).toEqual(['checkbox', 'radio']);
    expect(choiceGroupLayoutNames).toEqual(['list', 'columns']);
    expect(checkboxFieldVariantNames).toEqual(['default', 'neutral']);
  });

  it('labels a required Input and hides the required marker', () => {
    const html = renderToString(
      <Field id="name" label="Name" required>
        <Input />
      </Field>,
    );
    expect(html).toContain('data-slot="field"');
    expect(html).toContain('for="name"');
    expect(attr(html, 'input', 'id')).toBe('name');
    expect(attr(html, 'input', 'aria-required')).toBe('true');
    expect(attr(html, 'input', 'aria-describedby')).toBeUndefined();
    expect(html).toMatch(/aria-hidden="true"[^>]*>Required</);
  });

  it('describes with the helper, optional marker, then counter', () => {
    const html = renderToString(
      <Field id="notes" label="Notes" optional helper="Shown to the agent." counter="12 / 8,000">
        <Textarea />
      </Field>,
    );
    expect(attr(html, 'textarea', 'aria-describedby')).toBe('notes-helper notes-requirement notes-counter');
    expect(html).toContain('id="notes-requirement"');
    expect(html).toContain('>Optional<');
    expect(html).toContain('id="notes-counter"');
    expect(attr(html, 'textarea', 'aria-required')).toBeUndefined();
  });

  it('replaces the helper with an error and marks the control invalid', () => {
    const html = renderToString(
      <Field id="email" label="Email" required helper="Work email" error="Enter an email.">
        <Input type="email" />
      </Field>,
    );
    expect(html).not.toContain('Work email');
    expect(html).toContain('id="email-error"');
    expect(html).toContain('data-invalid="true"');
    expect(attr(html, 'input', 'aria-invalid')).toBe('true');
    expect(attr(html, 'input', 'aria-describedby')).toBe('email-error');
  });

  it('reaches a control inside a wrapper and keeps its own description', () => {
    const html = renderToString(
      <Field id="query" label="Filter" optional helper="Use AND and OR.">
        <div className="font-mono">
          <Textarea aria-describedby="query-hint" />
        </div>
      </Field>,
    );
    expect(attr(html, 'textarea', 'id')).toBe('query');
    expect(attr(html, 'textarea', 'aria-describedby')).toBe('query-helper query-requirement query-hint');
  });

  it('joins a SelectTrigger to the field', () => {
    const html = renderToString(
      <Field id="model" label="Model" optional error="Pick a model.">
        <Select items={[{ value: 'a', label: 'A' }]} value="a">
          <SelectTrigger width="full">
            <SelectValue />
          </SelectTrigger>
        </Select>
      </Field>,
    );
    expect(html).toMatch(/id="model"[^>]*data-slot="select-trigger"|data-slot="select-trigger"[^>]*id="model"/);
    expect(html).toMatch(/aria-describedby="model-error model-requirement"/);
  });

  it('hides the label row visually when asked', () => {
    const html = renderToString(
      <Field id="invite" label="Email 1" labelVisibility="screen-reader" required>
        <Input />
      </Field>,
    );
    expect(html).toContain('class="sprout-field-sr-only"');
    expect(html).toContain('>Email 1<');
  });

  it('passes props through outside a field or when the control names itself', () => {
    const html = renderToString(<Textarea id="free" aria-invalid="false" />);
    expect(attr(html, 'textarea', 'id')).toBe('free');
    const named = renderToString(
      <Field id="field" label="Hidden" required>
        <Textarea id="own" aria-label="Own name" />
      </Field>,
    );
    expect(attr(named, 'textarea', 'id')).toBe('own');
    expect(attr(named, 'textarea', 'aria-required')).toBeUndefined();
  });

  it('disables fields from a prop and from FieldsDisabled', () => {
    const one = renderToString(
      <Field id="a" label="A" optional disabled>
        <Input />
      </Field>,
    );
    expect(one).toContain('data-disabled="true"');
    expect(one).toMatch(/<input[^>]*disabled=""/);
    const all = renderToString(
      <FieldsDisabled value>
        <Field id="b" label="B" required>
          <Textarea />
        </Field>
        <ChoiceGroup
          type="checkbox"
          legend="Tools"
          optional
          options={[{ value: 'search', label: 'Search' }]}
          value={[]}
          onValueChange={noop}
        />
        <CheckboxField label="Notify" checked={false} onCheckedChange={noop} />
      </FieldsDisabled>,
    );
    expect(all).toMatch(/<textarea[^>]*disabled=""/);
    expect(all.match(/aria-disabled="true"/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('ChoiceGroup', () => {
  const options = [
    { value: 'daily', label: 'Every day', description: 'Runs at 9:00 AM' },
    { value: 'weekly', label: 'Every week', disabled: true },
  ];

  it('renders a labelled checkbox group with descriptions, a warning, and an error', () => {
    const html = renderToString(
      <ChoiceGroup
        id="tools"
        type="checkbox"
        legend="Tools"
        optional
        layout="columns"
        helper="Turn on what the agent can use."
        warning="Changes data"
        error="Turn on one tool."
        options={options}
        value={['daily']}
        onValueChange={noop}
      />,
    );
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-labelledby="tools-legend"');
    expect(html).toContain('aria-describedby="tools-error tools-helper tools-requirement"');
    expect(html).toContain('data-layout="columns"');
    expect(html).toContain('Changes data');
    expect(html).toContain('id="tools-option-0-description"');
    expect(html).toContain('aria-describedby="tools-option-0-description"');
    expect(html.match(/role="checkbox"/g)).toHaveLength(2);
    expect(html).toMatch(/data-checked="true"[^>]*class="sprout-choice-option"/);
  });

  it('renders a required radiogroup without a described marker', () => {
    const html = renderToString(
      <ChoiceGroup
        id="repeat"
        type="radio"
        legend="Repeat"
        required
        legendVisibility="screen-reader"
        options={options}
        value="daily"
        onValueChange={noop}
      />,
    );
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-required="true"');
    expect(html).not.toContain('id="repeat-requirement"');
    expect(html).toContain('data-layout="list"');
    expect(html).toContain('class="sprout-field-sr-only"');
    expect(html.match(/role="radio"/g)).toHaveLength(2);
  });
});

describe('CheckboxField and FieldSeparator', () => {
  it('puts the id on the wrapper and describes the checkbox', () => {
    for (const variant of checkboxFieldVariantNames) {
      const html = renderToString(
        <CheckboxField
          id="consent"
          variant={variant}
          label="I agree"
          error="Accept to continue."
          checked
          onCheckedChange={noop}
        />,
      );
      expect(html).toMatch(/<div id="consent"/);
      expect(html).toContain(`data-variant="${variant}"`);
      expect(html).toContain('aria-describedby="consent-error"');
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain('aria-checked="true"');
    }
  });

  it('renders a field separator with and without text', () => {
    const text = renderToString(<FieldSeparator>or</FieldSeparator>);
    expect(text).toContain('data-slot="field-separator"');
    expect(text).toContain('sprout-field-separator');
    expect(text).toContain('>or<');
    const plain = renderToString(<FieldSeparator />);
    expect(plain).toContain('data-content="false"');
  });
});
