import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from '../../packages/sprout/src/components/button-group.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('button-group %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'flex',
        gap: 16,
        alignItems: 'start',
        width: 400,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
        <ButtonGroup aria-label="Pages">
          <Button variant="secondary" disabled>
            Previous
          </Button>
          <ButtonGroupSeparator />
          <Button variant="secondary">Next</Button>
        </ButtonGroup>
        <ButtonGroup aria-label="Quantity">
          <ButtonGroupText>Quantity: 1</ButtonGroupText>
          <Button variant="outline" size="icon" aria-label="Add one">
            +
          </Button>
        </ButtonGroup>
        <ButtonGroup aria-label="View">
          <Button variant="outline">Day</Button>
          <Button variant="outline">Week</Button>
          <Button variant="outline">Month</Button>
        </ButtonGroup>
      </div>
      <ButtonGroup orientation="vertical" aria-label="Vertical">
        <Button variant="secondary">Up</Button>
        <ButtonGroupSeparator orientation="horizontal" />
        <Button variant="secondary">Down</Button>
      </ButtonGroup>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`button-group-${theme}-${mode}`);
});
