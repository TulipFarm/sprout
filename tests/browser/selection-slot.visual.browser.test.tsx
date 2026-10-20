import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import { Input } from '../../packages/sprout/src/components/input.js';
import { SelectionSlot } from '../../packages/sprout/src/components/selection-slot.js';
import { setTheme, settle, themes } from './support.js';

function Bar({ active }: { active: boolean }) {
  return (
    <SelectionSlot
      active={active}
      selection={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>2 selected</span>
          <Button variant="outline">Export selected</Button>
          <Button variant="ghost">Clear selection</Button>
        </div>
      }
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <Input aria-label="Search" placeholder="Search" />
        <Button variant="outline">Columns</Button>
      </div>
    </SelectionSlot>
  );
}

it.each(themes)('selection-slot %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        gap: 12,
        padding: 16,
        width: 420,
        background: 'var(--sprout-canvas)',
      }}
    >
      <Bar active={false} />
      <Bar active />
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`selection-slot-${theme}-${mode}`);
});
