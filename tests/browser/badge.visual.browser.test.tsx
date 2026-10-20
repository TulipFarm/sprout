import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Badge, badgeVariantNames } from '../../packages/sprout/src/components/badge.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('badge %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        width: 360,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      {badgeVariantNames.map(variant => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
      <Badge variant="success">
        <svg viewBox="0 0 16 16" aria-hidden="true" data-icon="inline-start">
          <path d="M3 8l3 3 7-7" fill="none" stroke="currentColor" />
        </svg>
        Connected
      </Badge>
      <Badge size="chip" variant="outline">
        group.calendar.example.com
      </Badge>
      <Badge render={<a href="#workflow" />}>View workflow</Badge>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`badge-${theme}-${mode}`);
});
