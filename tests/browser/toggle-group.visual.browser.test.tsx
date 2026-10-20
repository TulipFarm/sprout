import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { ToggleGroup, ToggleGroupItem } from '../../packages/sprout/src/components/toggle-group.js';
import { setTheme, settle, themes } from './support.js';

function glyph(d: string) {
  return function Glyph(props: { 'aria-hidden'?: 'true' }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
        <path d={d} />
      </svg>
    );
  };
}
const Bold = glyph('M7 5h6a3.5 3.5 0 0 1 0 7H7zm0 7h7a3.5 3.5 0 0 1 0 7H7z');
const Italic = glyph('M10 5h8M6 19h8M14 5l-4 14');
const Underline = glyph('M7 4v7a5 5 0 0 0 10 0V4M5 20h14');

it.each(themes)('toggle-group %s %s', async (theme, mode) => {
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
      <ToggleGroup aria-label="Split usage by" variant="outline" size="sm" spacing={0} defaultValue={['model']}>
        <ToggleGroupItem value="model">Model</ToggleGroupItem>
        <ToggleGroupItem value="agent">Agent</ToggleGroupItem>
        <ToggleGroupItem value="user">User</ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup aria-label="Theme" defaultValue={['light']}>
        <ToggleGroupItem value="system">System</ToggleGroupItem>
        <ToggleGroupItem value="light">Light</ToggleGroupItem>
        <ToggleGroupItem value="dark" disabled>
          Dark
        </ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup aria-label="Format" variant="outline" size="lg" multiple defaultValue={['bold', 'underline']}>
        <ToggleGroupItem value="bold" aria-label="Bold">
          <Bold aria-hidden="true" />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Italic">
          <Italic aria-hidden="true" />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Underline">
          <Underline aria-hidden="true" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`toggle-group-${theme}-${mode}`);
});
