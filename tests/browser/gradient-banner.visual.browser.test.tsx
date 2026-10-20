import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  GradientBanner,
  GradientBannerBadge,
  GradientBannerPanel,
  GradientBannerProgress,
} from '../../packages/sprout/src/components/gradient-banner.js';
import { emulate, setTheme, settle, themes } from './support.js';

it.each(themes)('gradient-banner %s %s', async (theme, mode) => {
  await emulate({ reducedMotion: true });
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        gap: 12,
        width: 360,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      <GradientBanner variant="aurora" size="sm" texture={false}>
        <GradientBannerPanel>
          <GradientBannerBadge>Draft</GradientBannerBadge>
          Post the weekly update
        </GradientBannerPanel>
      </GradientBanner>
      <GradientBanner variant="cobalt" size="sm" texture={false}>
        <GradientBannerPanel tone="dark" style={{ display: 'grid', width: 240 }}>
          <GradientBannerBadge>Marketing agent</GradientBannerBadge>
          <GradientBannerProgress value={38} aria-label="Spring launch email" />
        </GradientBannerPanel>
      </GradientBanner>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`gradient-banner-${theme}-${mode}`);
});
