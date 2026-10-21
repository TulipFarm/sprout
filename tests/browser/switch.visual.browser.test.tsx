import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Switch } from '../../packages/sprout/src/components/switch.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('switch %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'inline-grid',
        gridTemplateColumns: 'repeat(5, 40px)',
        gap: 16,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      {(['md', 'sm'] as const).flatMap(size => [
        <Switch key={`${size}-off`} size={size} aria-label="Off" />,
        <Switch key={`${size}-on`} size={size} aria-label="On" defaultChecked />,
        <Switch key={`${size}-dis`} size={size} aria-label="Disabled" disabled />,
        <Switch key={`${size}-dison`} size={size} aria-label="Disabled on" disabled defaultChecked />,
        <Switch key={`${size}-inv`} size={size} aria-label="Invalid" aria-invalid="true" />,
      ])}
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`switch-${theme}-${mode}`);
});
