import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  type NavigationMenuProps,
} from '../../packages/sprout/src/components/navigation-menu.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const resources = ['Planting guides', 'Harvest calendar', 'Yield reports', 'Soil testing'];

function Site({
  align,
  current = 'Overview',
  inset = 8,
}: {
  align?: NavigationMenuProps['align'];
  current?: string;
  inset?: number;
}) {
  return (
    <div style={{ padding: `16px ${inset}px`, overflowX: 'auto' }}>
      <NavigationMenu aria-label="Site" align={align}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink
              href="#overview"
              active={current === 'Overview'}
              className={navigationMenuTriggerStyle()}
              onClick={event => event.preventDefault()}
            >
              Overview
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Projects</NavigationMenuTrigger>
            <NavigationMenuContent>
              <div style={{ display: 'grid', padding: 8 }}>
                {['Meadow project', 'Garden notes'].map(name => (
                  <NavigationMenuLink key={name} href={`#${name}`} onClick={event => event.preventDefault()}>
                    {name}
                  </NavigationMenuLink>
                ))}
              </div>
            </NavigationMenuContent>
            <NavigationMenuIndicator />
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul style={{ margin: 0, padding: 8, listStyle: 'none' }}>
                {resources.map(name => (
                  <li key={name}>
                    <NavigationMenuLink
                      href={`#${name}`}
                      closeOnClick
                      active={current === name}
                      onClick={event => event.preventDefault()}
                    >
                      {name}
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
            <NavigationMenuIndicator />
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger disabled>Billing</NavigationMenuTrigger>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink
              href="#help"
              className={navigationMenuTriggerStyle()}
              onClick={event => event.preventDefault()}
            >
              Help
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}

const popup = () => document.querySelector<HTMLElement>('[data-slot="navigation-menu-popup"]');
const openPanel = () => document.querySelector('[data-slot="navigation-menu-content"][data-open]');

/** The popup stays in the viewport and nothing inside it spills sideways. */
function contained(node: HTMLElement) {
  const box = node.getBoundingClientRect();
  const inside = [...node.querySelectorAll('*:not([data-base-ui-focus-guard])')].every(child => {
    const rect = child.getBoundingClientRect();
    return !rect.width || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
  });
  return {
    inViewport: box.left >= 0 && box.right <= innerWidth + 0.5 && box.top >= 0 && box.bottom <= innerHeight + 0.5,
    inside,
    noScroll: node.scrollWidth <= node.clientWidth + 1,
  };
}
const fits = { inViewport: true, inside: true, noScroll: true };

const panelText = () => openPanel()?.textContent ?? null;

async function close() {
  await userEvent.keyboard('{Escape}');
  await expect.poll(openPanel).toBeNull();
}

describe('NavigationMenu in a real browser', () => {
  it.each(themes)('%s %s passes axe closed and open', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Site />);
    await settle();
    expect(await axeViolations()).toEqual([]);
    await screen.getByRole('button', { name: 'Projects' }).click();
    await expect.poll(openPanel).not.toBeNull();
    await settle();
    expect(await axeViolations()).toEqual([]);
  });

  for (const width of [390, 1280])
    it(`items are 32px tall and panels fit at ${width}px`, async () => {
      await page.viewport(width, 800);
      const screen = await render(<Site />);
      for (const item of [
        screen.getByRole('link', { name: 'Overview' }),
        screen.getByRole('button', { name: 'Projects' }),
        screen.getByRole('link', { name: 'Help' }),
      ])
        expect(getComputedStyle(item.element()).height).toBe('32px');
      const projects = screen.getByRole('button', { name: 'Projects' });
      projects.element().scrollIntoView({ inline: 'center' });
      await projects.click();
      await expect.element(projects).toHaveAttribute('aria-expanded', 'true');
      await settle();
      expect(contained(popup()!)).toEqual(fits);
      expect(document.querySelectorAll('[data-slot="navigation-menu-indicator"][data-popup-open]')).toHaveLength(1);
      await close();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    });

  it('keyboard opens panels, moves through links, and Escape returns focus', async () => {
    const screen = await render(<Site />);
    const projects = screen.getByRole('button', { name: 'Projects' });
    const overview = screen.getByRole('link', { name: 'Overview' });
    (overview.element() as HTMLElement).focus();
    await userEvent.tab();
    await expect.element(projects).toHaveFocus();
    expect(getComputedStyle(projects.element()).outlineStyle).toBe('solid');
    expect(openPanel()).toBeNull();
    await userEvent.keyboard('{Enter}');
    await expect.element(projects).toHaveAttribute('aria-expanded', 'true');
    await userEvent.tab();
    const meadow = page.getByRole('link', { name: 'Meadow project' });
    await expect.element(meadow).toHaveFocus();
    expect(getComputedStyle(meadow.element()).outlineStyle).toBe('solid');
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(page.getByRole('link', { name: 'Garden notes' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    await expect.element(meadow).toHaveFocus();
    await close();
    await expect.element(projects).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(screen.getByRole('button', { name: 'Resources' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect.element(projects).toHaveFocus();
  });

  it('hover opens a panel, moving across triggers swaps it, closeOnClick links close it', async () => {
    const screen = await render(<Site current="Harvest calendar" />);
    const projects = screen.getByRole('button', { name: 'Projects' });
    const more = screen.getByRole('button', { name: 'Resources' });
    await projects.hover();
    await expect.poll(panelText).toMatch(/Meadow project/);
    // Base UI blocks pointer events outside the open panel's safe area, so
    // the first move leaves that area and the second lands on the trigger.
    await more.hover({ force: true });
    await more.hover();
    await expect.element(more).toHaveAttribute('aria-expanded', 'true');
    await expect.element(projects).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(panelText).toMatch(/Planting guides/);
    const harvest = page.getByRole('link', { name: 'Harvest calendar' });
    await expect.element(harvest).toHaveAttribute('aria-current', 'page');
    await harvest.click();
    await expect.poll(openPanel).toBeNull();

    await projects.click();
    await page.getByRole('link', { name: 'Garden notes' }).click();
    await expect.poll(openPanel).not.toBeNull();
  });

  it('active and disabled items', async () => {
    const screen = await render(<Site />);
    await expect.element(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    await expect.element(screen.getByRole('link', { name: 'Help' })).not.toHaveAttribute('aria-current');
    const billing = screen.getByRole('button', { name: 'Billing' });
    await expect.element(billing).toBeDisabled();
    expect(getComputedStyle(billing.element()).opacity).toBe('0.5');
  });

  for (const align of ['start', 'center', 'end'] as const)
    it(`align ${align} lines the panel up with its trigger`, async () => {
      const screen = await render(<Site align={align} inset={240} />);
      const projects = screen.getByRole('button', { name: 'Projects' });
      await projects.click();
      await expect
        .element(page.elementLocator(document.querySelector('[data-slot="navigation-menu-positioner"]')!))
        .toHaveAttribute('data-align', align);
      await settle();
      const box = popup()!.getBoundingClientRect();
      const anchor = projects.element().getBoundingClientRect();
      const edge = {
        start: [box.left, anchor.left],
        center: [box.left + box.width / 2, anchor.left + anchor.width / 2],
        end: [box.right, anchor.right],
      }[align];
      expect(Math.abs(edge[0] - edge[1])).toBeLessThan(2);
      expect(box.top).toBeGreaterThanOrEqual(anchor.bottom + 7);
    });

  it('motion uses 120–180ms transitions and turns off for reduced motion', async () => {
    const screen = await render(<Site />);
    const projects = screen.getByRole('button', { name: 'Projects' });
    const chevron = projects.element().querySelector('[data-slot="navigation-menu-chevron"]')!;
    await projects.click();
    await expect.poll(openPanel).not.toBeNull();
    expect(getComputedStyle(popup()!).transitionDuration).toBe('0.12s, 0.12s, 0.18s, 0.18s');
    expect(getComputedStyle(chevron).transitionDuration).toBe('0.18s');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(popup()!).transitionDuration).toBe('0s');
    expect(getComputedStyle(chevron).transitionDuration).toBe('0s');
  });
});
