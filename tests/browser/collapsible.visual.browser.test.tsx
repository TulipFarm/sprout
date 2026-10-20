import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../packages/sprout/src/components/collapsible.js';
import { setTheme, settle, themes } from './support.js';

const Chevron = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" data-slot="collapsible-indicator">
    <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" />
  </svg>
);

it.each(themes)('collapsible %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        gap: 12,
        padding: 16,
        width: 320,
        background: 'var(--sprout-canvas)',
      }}
    >
      <Collapsible defaultOpen>
        <CollapsibleTrigger render={<Button variant="outline" />}>
          Project details
          <Chevron />
        </CollapsibleTrigger>
        <CollapsibleContent variant="card">
          <p style={{ margin: '8px 0 0' }}>Meadow launches on Friday.</p>
        </CollapsibleContent>
      </Collapsible>
      <Collapsible>
        <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
          Thinking
          <Chevron />
        </CollapsibleTrigger>
        <CollapsibleContent>Hidden</CollapsibleContent>
      </Collapsible>
      <Collapsible disabled>
        <CollapsibleTrigger>Show unavailable details</CollapsibleTrigger>
      </Collapsible>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`collapsible-${theme}-${mode}`);
});
