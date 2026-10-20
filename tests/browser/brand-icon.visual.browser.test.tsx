import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { BrandIcon, BrandStack, BrandTile, type Brand } from '../../packages/sprout/src/components/brand-icon.js';
import { Button } from '../../packages/sprout/src/components/button.js';
import { setTheme, settle, themes } from './support.js';

const brands: Brand[] = ['google', 'slack', 'github', 'notion', 'gmail', 'figma'];

it.each(themes)('brand-icon %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        gap: 12,
        width: 320,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        {brands.map(brand => (
          <BrandIcon key={brand} brand={brand} />
        ))}
      </div>
      <BrandStack
        brands={[
          { brand: 'google', name: 'Google Workspace' },
          { brand: 'slack', name: 'Slack' },
          { brand: 'github', name: 'GitHub' },
        ]}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <BrandTile size="action" render={<Button variant="ghost" size="icon" />} aria-label="Gmail actions">
          <BrandIcon brand="gmail" size="fill" />
        </BrandTile>
        <BrandTile size="action" render={<Button variant="ghost" size="icon" disabled />} aria-label="Slack actions">
          <BrandIcon brand="slack" size="fill" />
        </BrandTile>
      </div>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`brand-icon-${theme}-${mode}`);
});
