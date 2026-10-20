import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Field } from '../../packages/sprout/src/components/field.js';
import { Textarea } from '../../packages/sprout/src/components/textarea.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('textarea %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 240px)',
        gap: 16,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      <Field label="Instructions" required helper="Describe its role.">
        <Textarea defaultValue="Answer HR policy questions." />
      </Field>
      <Field label="Your answer" optional>
        <Textarea placeholder="Type your answer…" />
      </Field>
      <Field label="Processing" optional disabled>
        <Textarea defaultValue="Disabled" />
      </Field>
      <Field label="Request" required error="Enter a request.">
        <Textarea />
      </Field>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`textarea-${theme}-${mode}`);
});
