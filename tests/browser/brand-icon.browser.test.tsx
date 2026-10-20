import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';
import {
  BrandIcon,
  BrandStack,
  BrandTile,
  brandNames,
  type Brand,
} from '../../packages/sprout/src/components/brand-icon.js';
import { Button } from '../../packages/sprout/src/components/button.js';
import { axeViolations, emulate, setTheme, settle, size, themes } from './support.js';

const stack = [
  { brand: 'google', name: 'Google Workspace' },
  { brand: 'slack', name: 'Slack' },
  { brand: 'github', name: 'GitHub' },
  { brand: 'confluence', name: 'Atlassian' },
] as const;

function Action({ brand, disabled }: { brand: Brand; disabled?: boolean }) {
  return (
    <BrandTile
      size="action"
      render={<Button variant="ghost" size="icon" disabled={disabled} />}
      aria-label={`${brandNames[brand]} actions`}
    >
      <BrandIcon brand={brand} size="fill" />
    </BrandTile>
  );
}

function Gallery() {
  return (
    <div style={{ display: 'grid', gap: 12, padding: 16 }}>
      <ul aria-label="Brand catalog" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: 0 }}>
        {(Object.keys(brandNames) as Brand[]).map(brand => (
          <li key={brand} data-catalog-brand={brand} style={{ listStyle: 'none' }}>
            <BrandIcon brand={brand} />
          </li>
        ))}
      </ul>
      <BrandStack brands={stack} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Action brand="gmail" />
        <Action brand="google-sheets" />
        <Action brand="slack" disabled />
      </div>
    </div>
  );
}

describe('BrandIcon in a real browser', () => {
  it.each(themes)('%s %s passes axe', async (theme, mode) => {
    await emulate({ reducedMotion: true });
    setTheme(theme, mode);
    const screen = await render(<Gallery />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('every size matches the Cloud scale', async () => {
    const screen = await render(
      <div>
        {(['inline', 'glyph', 'sm', 'md', 'lg', 'xl'] as const).map(name => (
          <BrandIcon key={name} brand="notion" size={name} data-testid={name} />
        ))}
        <span data-testid="fill">
          <Action brand="slack" />
        </span>
        <Button>
          <BrandIcon brand="github" size="inline" data-testid="in-button" />
          GitHub
        </Button>
      </div>,
    );
    const expected = { inline: 16, glyph: 20, sm: 24, md: 36, lg: 48, xl: 56 };
    for (const [name, px] of Object.entries(expected))
      expect(size(screen.getByTestId(name).element()), name).toEqual([px, px]);
    const tile = screen.getByTestId('fill').element().querySelector('[data-slot="brand-tile"]')!;
    expect(size(tile)).toEqual([36, 36]);
    expect(size(tile.querySelector('svg')!)).toEqual([18, 18]);
    expect(getComputedStyle(tile).borderRadius).toBe('8px');
    expect(size(screen.getByTestId('in-button').element().querySelector('svg')!)).toEqual([16, 16]);
    expect(getComputedStyle(screen.getByTestId('xl').element()).borderRadius).toBe('16px');
    expect(getComputedStyle(screen.getByTestId('sm').element()).padding).toBe('4px');
  });

  it('near-black logos follow the text color in dark mode', async () => {
    const screen = await render(
      <>
        <BrandIcon brand="github" data-testid="github" />
        <BrandIcon brand="jira" data-testid="jira" />
      </>,
    );
    const github = screen.getByTestId('github').element();
    const path = github.querySelector('path')!;
    const light = getComputedStyle(path).fill;
    setTheme('neutral', 'dark');
    const dark = getComputedStyle(path).fill;
    expect(dark).not.toBe(light);
    expect(dark).toBe(getComputedStyle(github).color);
    expect(screen.getByTestId('jira').element().querySelector('path')!).toHaveAttribute('fill', '#0052CC');
  });

  it('stacks overlap, name their apps, and show tooltips on hover', async () => {
    await render(<BrandStack brands={stack} />);
    const image = page.getByRole('img', {
      name: 'Google Workspace, Slack, GitHub, Atlassian',
    });
    const tiles = image.element().querySelectorAll('.sprout-brand-tile');
    expect(tiles).toHaveLength(4);
    const gap = tiles[1]!.getBoundingClientRect().x - tiles[0]!.getBoundingClientRect().x;
    expect(Math.round(gap)).toBe(18);
    await userEvent.hover(tiles[1]!);
    const tooltip = () => document.querySelector('.sprout-brand-tooltip');
    await expect.poll(() => tooltip()?.textContent).toBe('Slack');
    await userEvent.unhover(tiles[1]!);
    await expect.poll(tooltip).toBeNull();
  });

  it('action tiles work from the keyboard and stay disabled', async () => {
    await render(
      <>
        <Action brand="gmail" />
        <Action brand="google-sheets" />
        <Action brand="slack" disabled />
      </>,
    );
    const gmail = page.getByRole('button', { name: 'Gmail actions' });
    await userEvent.tab();
    await expect.element(gmail).toHaveFocus();
    expect(getComputedStyle(gmail.element()).outlineStyle).toBe('solid');
    await userEvent.tab();
    await expect.element(page.getByRole('button', { name: 'Google Sheets actions' })).toHaveFocus();
    const disabled = page.getByRole('button', { name: 'Slack actions' });
    await expect.element(disabled).toBeDisabled();
    expect(getComputedStyle(disabled.element()).opacity).toBe('0.5');
  });

  it('tooltips respect reduced motion', async () => {
    await emulate({ reducedMotion: true });
    await render(<BrandStack brands={stack} />);
    await userEvent.hover(document.querySelector('[data-slot="brand-stack"] .sprout-brand-tile')!);
    const tooltip = () => document.querySelector<HTMLElement>('.sprout-brand-tooltip');
    await expect.poll(() => tooltip()?.textContent).toBe('Google Workspace');
    expect(getComputedStyle(tooltip()!).transitionDuration).toBe('0s');
  });
});
