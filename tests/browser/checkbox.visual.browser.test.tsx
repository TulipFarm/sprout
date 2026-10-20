import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Checkbox, checkboxVariantNames } from '../../packages/sprout/src/components/checkbox.js';
import { Label } from '../../packages/sprout/src/components/label.js';
import { setTheme, settle, themes } from './support.js';

const states = {
  Off: {},
  On: { defaultChecked: true },
  Mixed: { indeterminate: true },
  Disabled: { disabled: true, defaultChecked: true },
  Invalid: { 'aria-invalid': true },
} as const;

it.each(themes)('checkbox %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'inline-grid',
        gap: 12,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      {checkboxVariantNames.map(variant => (
        <div key={variant} style={{ display: 'flex', gap: 16 }}>
          {Object.entries(states).map(([state, props]) => (
            <Label key={state}>
              <Checkbox variant={variant} {...props} />
              {state}
            </Label>
          ))}
        </div>
      ))}
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`checkbox-${theme}-${mode}`);
});
