import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { WebSource } from '../../packages/sprout/src/components/web-source.js';
import { brandGlyphs } from '../../packages/sprout/src/internal/brand-glyphs.js';
import { setTheme, settle, themes } from './support.js';

// Real site marks from the bundled brand glyphs, so the shot needs no network.
const sites: Record<string, { brand: keyof typeof brandGlyphs; color: string }> = {
  'docs.stripe.com': { brand: 'stripe', color: '#635BFF' },
  'linear.app': { brand: 'linear', color: '#5E6AD2' },
  'www.figma.com': { brand: 'figma', color: '#000000' },
};

const icon = (url: string) => {
  const site = sites[new URL(url).hostname];
  if (!site) return null;
  const glyph = brandGlyphs[site.brand];
  const paths = glyph.paths
    .map(path => {
      const rule = 'evenOdd' in path && path.evenOdd ? ' fill-rule="evenodd" clip-rule="evenodd"' : '';
      return `<path d="${path.d}" fill="${'fill' in path && path.fill ? path.fill : site.color}"${rule}/>`;
    })
    .join('');
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${glyph.viewBox}" width="20" height="20">${paths}</svg>`)}`;
};

it.each(themes)('web source %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: 16,
        background: 'var(--sprout-canvas)',
        width: 520,
      }}
    >
      <WebSource
        url="https://docs.stripe.com/payments/checkout"
        title="Stripe Checkout | Stripe Documentation"
        icon={icon}
      />
      <WebSource url="https://linear.app/docs/triage" title="Triage – Linear Docs" icon={icon} />
      <WebSource url="https://www.w3.org/WAI/standards-guidelines/wcag/" icon={icon} />
      <WebSource
        url="https://www.figma.com/best-practices/components-styles-and-shared-libraries/"
        title="Components, styles, and shared libraries"
        icon={icon}
        failed
      />
      <p style={{ margin: 0, color: 'var(--sprout-text)', fontSize: 15, lineHeight: 1.7 }}>
        Checkout handles payments{' '}
        <WebSource variant="inline" url="https://docs.stripe.com/payments/checkout" title="Stripe Docs" icon={icon} />,
        and triage keeps the queue small{' '}
        <WebSource variant="inline" url="https://linear.app/docs/triage" title="Linear" icon={icon} />.
      </p>
    </div>,
  );
  await expect.poll(() => document.querySelectorAll('[data-status="loaded"]').length).toBe(5);
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`web-source-${theme}-${mode}`);
});
