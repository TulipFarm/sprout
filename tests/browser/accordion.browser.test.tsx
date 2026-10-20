import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../packages/sprout/src/components/accordion.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

function Faq({ multiple = false }: { multiple?: boolean }) {
  return (
    <Accordion multiple={multiple} defaultValue={['what']}>
      <AccordionItem value="what">
        <AccordionTrigger>What is this example?</AccordionTrigger>
        <AccordionContent>
          <p>Real shared components.</p>
          <p>
            Read about{' '}
            <a href="#knowledge" style={{ color: 'inherit' }}>
              Automatic Knowledge
            </a>
            .
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="more">
        <AccordionTrigger>Can I open more than one?</AccordionTrigger>
        <AccordionContent>Only in multiple mode.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="off" disabled>
        <AccordionTrigger>Disabled item</AccordionTrigger>
        <AccordionContent>Unavailable</AccordionContent>
      </AccordionItem>
      <AccordionItem value="quiet">
        <AccordionTrigger variant="quiet" aria-describedby="quiet-summary">
          <span>
            Google calendars
            <span id="quiet-summary" style={{ display: 'block' }}>
              2 of 3 shown
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent>Work, Personal</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

const trigger = (name: string) => page.getByRole('button', { name, exact: false }).first();

function rotation(node: Element) {
  const value = getComputedStyle(node).transform;
  if (value === 'none') return 0;
  const [a, b] = value.slice(7, -1).split(',').map(Number);
  return Math.round((Math.atan2(b, a) * 180) / Math.PI);
}

const overflowing = (root: Element) =>
  [...root.querySelectorAll('[data-slot="accordion-trigger"], [data-slot="accordion-content"]')].filter(
    node => node.scrollWidth > node.clientWidth + 1,
  );

describe('Accordion in a real browser', () => {
  it.each(themes)('%s %s passes axe open and closed', async (theme, mode) => {
    await emulate({ reducedMotion: true });
    setTheme(theme, mode);
    const screen = await render(<Faq multiple />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
    await trigger('Can I open more than one?').click();
    await trigger('Google calendars').click();
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('keyboard tabs between triggers, skips disabled, and toggles', async () => {
    await emulate({ reducedMotion: true });
    await render(<Faq />);
    const first = trigger('What is this example?');
    const second = trigger('Can I open more than one?');
    await userEvent.tab();
    await expect.element(first).toHaveFocus();
    expect(getComputedStyle(first.element()).outlineStyle).toBe('solid');
    await userEvent.keyboard('{Enter}');
    await expect.element(first).toHaveAttribute('aria-expanded', 'false');
    await userEvent.tab();
    await expect.element(second).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect.element(second).toHaveAttribute('aria-expanded', 'true');
    await expect.element(page.getByRole('region', { name: 'Can I open more than one?' })).toBeVisible();
    await userEvent.tab();
    await expect.element(trigger('Google calendars')).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect.element(second).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect.element(first).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect.element(first).toHaveAttribute('aria-expanded', 'true');
    await expect.element(second).toHaveAttribute('aria-expanded', 'false');
  });

  it('disabled triggers fade and ignore clicks', async () => {
    await render(<Faq />);
    const disabled = trigger('Disabled item');
    expect(getComputedStyle(disabled.element()).opacity).toBe('0.5');
    await disabled.click({ force: true });
    await expect.element(disabled).toHaveAttribute('aria-expanded', 'false');
  });

  it('default underlines on hover, quiet does not, and the chevron turns', async () => {
    const screen = await render(<Faq />);
    const plain = trigger('Can I open more than one?');
    const quiet = trigger('Google calendars');
    await expect.element(quiet).toHaveAccessibleDescription('2 of 3 shown');
    await plain.hover();
    expect(getComputedStyle(plain.element()).textDecorationLine).toBe('underline');
    await quiet.hover();
    expect(getComputedStyle(quiet.element()).textDecorationLine).toBe('none');
    const icon = plain.element().querySelector('[data-slot="accordion-trigger-icon"]')!;
    expect(rotation(icon)).toBe(0);
    expect(getComputedStyle(icon).transitionDuration).toBe('0.12s');
    const content = screen.container.querySelector('[data-slot="accordion-content"]')!;
    expect(getComputedStyle(content).transitionDuration).toBe('0.18s');
    await plain.click();
    await settle();
    expect(Math.abs(rotation(icon))).toBe(180);
    const panel = page.getByRole('region', { name: 'Can I open more than one?' }).element();
    expect(panel.getBoundingClientRect().height).toBeGreaterThan(0);
  });

  it('reduced motion removes transitions', async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Faq />);
    const icon = screen.container.querySelector('[data-slot="accordion-trigger-icon"]')!;
    expect(getComputedStyle(icon).transitionDuration).toBe('0s');
  });

  it('content spaces paragraphs and underlines links', async () => {
    await render(<Faq />);
    const link = page.getByRole('link', { name: 'Automatic Knowledge' });
    await expect.element(link).toBeVisible();
    expect(getComputedStyle(link.element()).textDecorationLine).toBe('underline');
    const first = page.getByText('Real shared components.').element();
    expect(getComputedStyle(first).marginBottom).toBe('16px');
  });

  it('fits a 390px phone open and closed', async () => {
    await emulate({ reducedMotion: true });
    await page.viewport(390, 800);
    const screen = await render(<Faq multiple />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    expect(overflowing(screen.container)).toEqual([]);
    await trigger('Can I open more than one?').click();
    await trigger('Google calendars').click();
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    expect(overflowing(screen.container)).toEqual([]);
  });
});
