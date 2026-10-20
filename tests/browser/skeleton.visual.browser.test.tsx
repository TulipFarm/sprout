import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Skeleton, SkeletonGroup } from '../../packages/sprout/src/components/skeleton.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('skeleton %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div data-testid="shot" style={{ width: 280, padding: 16, background: 'var(--sprout-canvas)' }}>
      <SkeletonGroup label="Loading projects">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton shape="avatar" />
          <Skeleton shape="title" />
        </div>
        <Skeleton />
        <Skeleton shape="panel" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton shape="checkbox" />
          {/* Skeletons don't shrink by design; the row hands the line its space. */}
          <Skeleton style={{ flex: 1, width: 'auto' }} />
          <Skeleton shape="action" />
        </div>
      </SkeletonGroup>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`skeleton-${theme}-${mode}`);
});
