import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Separator, SeparatorContent, SeparatorIcon } from '../../packages/sprout/src/components/separator.js';
import { setTheme, settle, themes } from './support.js';

const Check = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8l3 3 7-7" stroke="currentColor" fill="none" />
  </svg>
);

it.each(themes)('separator %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        gap: 16,
        padding: 16,
        width: 360,
        background: 'var(--sprout-canvas)',
      }}
    >
      <Separator />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        Draft
        <Separator orientation="vertical" />
        Edited today
        <Separator orientation="vertical" tone="input" />3 files
      </div>
      <Separator>or</Separator>
      <Separator>
        <SeparatorIcon>
          <Check />
        </SeparatorIcon>
        Today
      </Separator>
      <Separator variant="fade">Auto compacted</Separator>
      <Separator variant="marker">
        <SeparatorIcon>
          <Check />
        </SeparatorIcon>
        <SeparatorContent>
          Used skill · <a href="#changes">View changes</a>
        </SeparatorContent>
      </Separator>
      <Separator variant="marker-border">
        <SeparatorContent>Today</SeparatorContent>
      </Separator>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`separator-${theme}-${mode}`);
});
