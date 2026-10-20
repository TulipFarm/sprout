import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Badge, badgeVariantNames } from '../../packages/sprout/src/components/badge.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const Check = (props: { 'data-icon'?: string }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
    <path d="M3 8l3 3 7-7" fill="none" stroke="currentColor" />
  </svg>
);

function Gallery() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16 }} data-testid="gallery">
      {badgeVariantNames.map(variant => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
      <Badge variant="success">
        <Check data-icon="inline-start" />
        Connected
      </Badge>
      <Badge size="chip" variant="outline">
        group.calendar.example.com
      </Badge>
      <Badge render={<a href="#workflow" />}>View workflow</Badge>
      <Badge variant="outline" render={<a href="#outline" />}>
        Outline link
      </Badge>
      <Badge variant="ghost" render={<button type="button" />}>
        Ghost button
      </Badge>
    </div>
  );
}

function colorOf(value: string) {
  const probe = document.createElement('span');
  probe.style.color = value;
  document.body.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

const variant = (name: string) =>
  document.querySelector<HTMLElement>(`[data-testid="gallery"] > [data-variant="${name}"]`)!;

describe('Badge in a real browser', () => {
  it.each(themes)('%s %s passes axe and paints the primary tone', async (theme, mode) => {
    await emulate({ reducedMotion: true });
    setTheme(theme, mode);
    const screen = await render(<Gallery />);
    await settle();
    expect(getComputedStyle(variant('default')).color).toBe(colorOf('var(--sprout-primary)'));
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('tones differ from each other and between light and dark', async () => {
    await emulate({ reducedMotion: true });
    await render(<Gallery />);
    const tones = ['default', 'success', 'warning', 'info', 'secondary', 'destructive'];
    const read = () => tones.map(name => getComputedStyle(variant(name)).backgroundColor);
    const light = read();
    setTheme('neutral', 'dark');
    const dark = read();
    tones.forEach((name, index) => expect(dark[index], name).not.toBe(light[index]));
    expect(new Set(light).size).toBe(6);
    expect(getComputedStyle(variant('outline')).borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(variant('ghost')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  it('default and chip sizes keep their geometry', async () => {
    const screen = await render(
      <div style={{ width: 160 }}>
        <Badge variant="success" data-testid="pill">
          <Check data-icon="inline-start" />
          Connected
        </Badge>
        <Badge variant="outline" data-testid="open">
          Open
          <Check data-icon="inline-end" />
        </Badge>
        <Badge size="chip" data-testid="chip">
          group.calendar.example.com.with.a.very.long.name
        </Badge>
      </div>,
    );
    const pill = screen.getByTestId('pill').element();
    expect(getComputedStyle(pill).height).toBe('20px');
    expect(getComputedStyle(pill).whiteSpace).toBe('nowrap');
    expect(getComputedStyle(pill).paddingLeft).toBe('6px');
    expect(getComputedStyle(pill.querySelector('svg')!).width).toBe('12px');
    expect(getComputedStyle(screen.getByTestId('open').element()).paddingRight).toBe('6px');
    const chip = screen.getByTestId('chip').element().getBoundingClientRect();
    expect(chip.height).toBeGreaterThan(24);
    expect(chip.width).toBeLessThanOrEqual(160.5);
  });

  it('long values truncate inside the badge without overflowing', async () => {
    const screen = await render(
      <div data-testid="cell" style={{ width: 140 }}>
        <Badge variant="secondary">
          <span data-testid="long" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Billing and invoicing enquiries from enterprise
          </span>
        </Badge>
      </div>,
    );
    const long = screen.getByTestId('long').element();
    expect(long.scrollWidth).toBeGreaterThan(long.clientWidth);
    const cell = screen.getByTestId('cell').element();
    expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth);
  });

  it('keyboard reaches rendered links and buttons with a visible focus ring', async () => {
    const screen = await render(
      <>
        <Badge data-testid="static">Static</Badge>
        <Badge render={<a href="#workflow" />}>View workflow</Badge>
        <Badge variant="outline" render={<a href="#outline" />}>
          Outline link
        </Badge>
        <Badge variant="ghost" render={<button type="button" />}>
          Ghost button
        </Badge>
        <Badge variant="outline" aria-invalid="true">
          Invalid value
        </Badge>
      </>,
    );
    expect((screen.getByTestId('static').element() as HTMLElement).tabIndex).toBe(-1);
    const link = page.getByRole('link', { name: 'View workflow' });
    await userEvent.tab();
    await expect.element(link).toHaveFocus();
    expect(getComputedStyle(link.element()).outlineStyle).toBe('solid');
    expect(getComputedStyle(link.element()).outlineWidth).toBe('1px');
    await userEvent.keyboard('{Enter}');
    expect(location.hash).toBe('#workflow');
    await userEvent.tab();
    await expect.element(page.getByRole('link', { name: 'Outline link' })).toHaveFocus();
    await userEvent.tab();
    const button = page.getByRole('button', { name: 'Ghost button' });
    await expect.element(button).toHaveFocus();
    expect(getComputedStyle(button.element()).cursor).toBe('pointer');
    expect(getComputedStyle(page.getByText('Invalid value').element()).borderTopColor).toBe(
      colorOf('var(--sprout-danger)'),
    );
    history.replaceState(null, '', location.pathname + location.search);
  });

  it('hover tones apply to interactive badges only', async () => {
    await emulate({ reducedMotion: true });
    await render(
      <>
        <Badge variant="outline" render={<a href="#outline" />}>
          Outline link
        </Badge>
        <Badge variant="link" render={<a href="#workflow" />}>
          Link badge
        </Badge>
        <Badge variant="outline">+2</Badge>
      </>,
    );
    const outline = page.getByRole('link', { name: 'Outline link' });
    const before = getComputedStyle(outline.element()).backgroundColor;
    await outline.hover();
    expect(getComputedStyle(outline.element()).backgroundColor).not.toBe(before);
    const linkBadge = page.getByRole('link', { name: 'Link badge' });
    await linkBadge.hover();
    expect(getComputedStyle(linkBadge.element()).textDecorationLine).toBe('underline');
    const plain = page.getByText('+2', { exact: true });
    await plain.hover();
    expect(getComputedStyle(plain.element()).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  it('micro transitions respect reduced motion', async () => {
    const screen = await render(<Badge>New</Badge>);
    const badge = screen.getByText('New').element();
    expect(getComputedStyle(badge).transitionDuration).toBe('0.12s, 0.12s, 0.12s, 0.18s');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(badge).transitionDuration).toBe('0s');
  });

  it('fits a 390px phone', async () => {
    await page.viewport(390, 800);
    await render(<Gallery />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });
});
