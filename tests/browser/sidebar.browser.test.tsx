import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSection,
  SidebarTrigger,
  type SidebarProps,
  type SidebarProviderProps,
} from '../../packages/sprout/src/components/sidebar.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const Icon = () => (
  <svg viewBox="0 0 16 16">
    <rect x="3" y="3" width="10" height="10" />
  </svg>
);

const pages = ['Overview', 'Inbox', 'Files', 'Reports', 'Members', 'Billing'];

function App({
  provider,
  sidebar,
  long = false,
}: {
  provider?: Partial<SidebarProviderProps>;
  sidebar?: Partial<SidebarProps>;
  long?: boolean;
}) {
  const [current, setCurrent] = useState('Overview');
  const link = (name: string, sub = false) => {
    const Button = sub ? SidebarMenuSubButton : SidebarMenuButton;
    return (
      <Button
        nativeButton={false}
        render={<a href={`#${name}`} onClick={() => setCurrent(name)} />}
        icon={sub ? undefined : <Icon />}
        isActive={current === name}
        tooltip={name}
        title={long && sub ? name : undefined}
      >
        {name}
      </Button>
    );
  };
  return (
    <SidebarProvider style={{ height: 480 }} {...provider}>
      <Sidebar label="Workspace navigation" {...sidebar}>
        <SidebarHeader>
          <SidebarInput aria-label="Filter navigation" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarMenu>
              {pages.map(name => (
                <SidebarMenuItem key={name}>{link(name)}</SidebarMenuItem>
              ))}
              <SidebarSection label="Projects" defaultOpen icon={<Icon />} tooltip="Projects">
                <SidebarMenuSubItem>
                  {link(
                    long ? 'Website refresh and the complete design system documentation' : 'Website refresh',
                    true,
                  )}
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>{link('Garden plan', true)}</SidebarMenuSubItem>
              </SidebarSection>
              <SidebarMenuItem>
                <SidebarMenuButton icon={<Icon />} disabled>
                  Integrations
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenuButton icon={<Icon />}>Settings</SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
      <main className="main" style={{ flex: 1, padding: 16 }}>
        <SidebarTrigger />
        <h1>{current}</h1>
      </main>
    </SidebarProvider>
  );
}

function colorOf(token: string) {
  const probe = document.createElement('span');
  probe.style.backgroundColor = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

const panel = () => document.querySelector<HTMLElement>('[data-sprout-sidebar]')!;
const section = () => document.querySelector<HTMLElement>('.sprout-sidebar-section-content')!;

async function sampleTransition(element: HTMLElement, property: string, at = 90) {
  let animation: Animation | undefined;
  for (let frame = 0; frame < 10 && !animation; frame++) {
    await new Promise(requestAnimationFrame);
    animation = element
      .getAnimations()
      .find(entry => entry instanceof CSSTransition && entry.transitionProperty === property);
  }
  if (!animation) throw new Error(`${property} did not animate`);
  animation.pause();
  animation.currentTime = at;
  return {
    rect: element.getBoundingClientRect(),
    resume: () => animation.play(),
  };
}

describe('Sidebar in a real browser', () => {
  it.each(themes)('%s %s paints the canvas, marks the current page and passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<App />);
    await settle();
    // The canvas fill is the bg-sprout-canvas Tailwind utility, which
    // this harness does not compile; the border comes from sidebar.css.
    expect(getComputedStyle(panel()).borderInlineEndColor).toBe(colorOf('--sprout-line'));
    await expect
      .element(screen.getByRole('link', { name: 'Overview', exact: true }))
      .toHaveAttribute('aria-current', 'page');
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('rows are 32px, sub rows 28px, and the section action sits 4px inside its row', async () => {
    await page.viewport(1280, 720);
    const screen = await render(<App />);
    const height = (el: Element) => el.getBoundingClientRect().height;
    expect(height(screen.getByRole('link', { name: 'Overview', exact: true }).element())).toBe(32);
    expect(height(screen.getByRole('link', { name: 'Garden plan' }).element())).toBe(28);
    expect(height(document.querySelector('.sprout-sidebar-trigger')!)).toBe(32);
    const row = document.querySelector('.sprout-sidebar-section-heading')!.getBoundingClientRect();
    const action = document.querySelector('.sprout-sidebar-menu-action')!.getBoundingClientRect();
    expect([action.height, action.top - row.top, row.bottom - action.bottom]).toEqual([24, 4, 4]);
  });

  it('sections disclose independently and rotate the chevron', async () => {
    const screen = await render(<App />);
    const project = screen.getByRole('link', { name: 'Website refresh' });
    const chevron = document.querySelector('svg.sprout-sidebar-chevron')!;
    await expect.element(project).toBeVisible();
    expect(chevron.getAttribute('aria-hidden')).toBe('true');
    expect(getComputedStyle(chevron).transform).toBe('matrix(0, 1, -1, 0, 0, 0)');
    await screen.getByRole('button', { name: 'Collapse Projects' }).click();
    await expect.element(project).not.toBeInTheDocument();
    expect(getComputedStyle(chevron).transform).toBe('none');
    await screen.getByRole('button', { name: 'Expand Projects' }).click();
    await project.click();
    await expect.element(project).toHaveAttribute('aria-current', 'page');
  });

  it('collapses to icons with a tooltip and restores open sections', async () => {
    const screen = await render(<App />);
    const project = screen.getByRole('link', { name: 'Website refresh' });
    await screen.getByRole('button', { name: 'Toggle sidebar' }).click();
    expect(panel().dataset.state).toBe('collapsed');
    await expect.poll(() => getComputedStyle(panel()).width).toBe('56px');
    await expect.element(project).not.toBeInTheDocument();
    const files = screen.getByRole('link', { name: 'Files', exact: true });
    await files.hover();
    await expect.element(page.getByRole('tooltip')).toHaveTextContent('Files');
    await settle();
    const tip = page.getByRole('tooltip').element().getBoundingClientRect();
    expect(tip.left - files.element().getBoundingClientRect().right).toBeCloseTo(8, 0);
    await userEvent.keyboard('{Escape}');
    await screen.getByRole('button', { name: 'Toggle sidebar' }).click();
    await expect.poll(() => getComputedStyle(panel()).width).toBe('244px');
    await expect.element(project).toBeVisible();
  });

  it('links keep native Enter and ignore Space', async () => {
    const screen = await render(<App />);
    const files = screen.getByRole('link', { name: 'Files', exact: true });
    (files.element() as HTMLElement).focus();
    await userEvent.keyboard(' ');
    await expect.element(screen.getByRole('heading')).toHaveTextContent('Overview');
    await userEvent.keyboard('{Enter}');
    await expect.element(screen.getByRole('heading')).toHaveTextContent('Files');
    expect(getComputedStyle(files.element()).outlineStyle).toBe('solid');
  });

  it('width and section height interpolate and a section can reverse mid-exit', async () => {
    const screen = await render(<App />);
    expect(getComputedStyle(panel()).transitionDuration).toBe('0.18s, 0.12s, 0s');
    await screen.getByRole('button', { name: 'Toggle sidebar' }).click();
    const width = await sampleTransition(panel(), 'width');
    expect(width.rect.width).toBeGreaterThan(56);
    expect(width.rect.width).toBeLessThan(244);
    width.resume();
    await expect.poll(() => getComputedStyle(panel()).width).toBe('56px');
    await screen.getByRole('button', { name: 'Toggle sidebar' }).click();
    await expect.poll(() => getComputedStyle(panel()).width).toBe('244px');

    const project = screen.getByRole('link', { name: 'Website refresh' });
    await screen.getByRole('button', { name: 'Collapse Projects' }).click();
    await expect.element(project).not.toBeInTheDocument();
    await screen.getByRole('button', { name: 'Expand Projects' }).click();
    const height = await sampleTransition(section(), 'height');
    const expanded = parseFloat(getComputedStyle(section()).getPropertyValue('--collapsible-panel-height'));
    expect(height.rect.height).toBeGreaterThan(0);
    expect(height.rect.height).toBeLessThan(expanded);
    height.resume();

    const toggle = document.querySelector<HTMLButtonElement>(
      '.sprout-sidebar-section-heading .sprout-sidebar-menu-action',
    )!;
    await expect.element(project).toBeVisible();
    toggle.click();
    await new Promise(requestAnimationFrame);
    toggle.click();
    await expect.element(project).toBeVisible();
    await expect.poll(() => section().hasAttribute('inert')).toBe(false);
    await expect.element(screen.getByRole('button', { name: 'Collapse Projects' })).toBeVisible();
  });

  it('long labels truncate with a title and disabled items stay disabled', async () => {
    const screen = await render(<App long />);
    const name = 'Website refresh and the complete design system documentation';
    const long = screen.getByRole('link', { name });
    await expect.element(long).toHaveAttribute('title', name);
    const label = long.element().querySelector('.sprout-sidebar-label')!;
    expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
    await expect.element(screen.getByRole('button', { name: 'Integrations' })).toBeDisabled();
  });

  it('Ctrl+B and Meta+B toggle except from editing fields', async () => {
    const screen = await render(<App />);
    (screen.getByRole('textbox', { name: 'Filter navigation' }).element() as HTMLElement).focus();
    await userEvent.keyboard('{Control>}b{/Control}');
    expect(panel().dataset.state).toBe('expanded');
    (screen.getByRole('button', { name: 'Toggle sidebar' }).element() as HTMLElement).focus();
    await userEvent.keyboard('{Control>}b{/Control}');
    expect(panel().dataset.state).toBe('collapsed');
    await userEvent.keyboard('{Meta>}b{/Meta}');
    expect(panel().dataset.state).toBe('expanded');
  });

  it('right side, offcanvas, and never-collapsing panels', async () => {
    const screen = await render(<App sidebar={{ side: 'right', collapsible: 'offcanvas' }} />);
    expect(panel().dataset.side).toBe('right');
    expect(getComputedStyle(panel()).borderInlineStartWidth).toBe('1px');
    expect(getComputedStyle(panel()).borderInlineEndWidth).toBe('0px');
    await screen.getByRole('button', { name: 'Toggle sidebar' }).click();
    await expect.poll(() => getComputedStyle(panel()).visibility).toBe('hidden');
    expect(panel().inert).toBe(true);
    await screen.getByRole('button', { name: 'Toggle sidebar' }).click();
    await expect.poll(() => getComputedStyle(panel()).visibility).toBe('visible');

    screen.unmount();
    await page.viewport(390, 844);
    await render(<App sidebar={{ collapsible: 'none' }} />);
    await expect.poll(() => panel()?.checkVisibility()).toBe(true);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('mobile drawer traps focus, closes on navigation and restores focus', async () => {
    await page.viewport(390, 844);
    const screen = await render(<App sidebar={{ side: 'right' }} />);
    const trigger = screen.getByRole('button', { name: 'Toggle sidebar' });
    await trigger.click();
    const drawer = page.getByRole('dialog', { name: 'Workspace navigation' });
    await expect.element(drawer).toBeVisible();
    await expect.element(drawer).toHaveAttribute('data-side', 'right');
    await settle();
    expect(drawer.element().getBoundingClientRect().right).toBeCloseTo(390, 0);
    for (let i = 0; i < 14; i++) {
      await userEvent.tab();
      expect(drawer.element().contains(document.activeElement)).toBe(true);
    }
    const files = drawer.getByRole('link', { name: 'Files', exact: true });
    expect(files.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    await userEvent.keyboard('{Escape}');
    await expect.element(drawer).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
    await trigger.click();
    await drawer.getByRole('link', { name: 'Files', exact: true }).click();
    await expect.element(drawer).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
    await expect.element(screen.getByRole('heading')).toHaveTextContent('Files');
    await trigger.click();
    await drawer.getByRole('button', { name: 'Close', exact: true }).click();
    await expect.element(drawer).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  it('drawer turns back into a panel when the viewport widens', async () => {
    await page.viewport(390, 844);
    const screen = await render(<App />);
    await screen.getByRole('button', { name: 'Toggle sidebar' }).click();
    await expect.element(page.getByRole('dialog')).toBeVisible();
    await page.viewport(1280, 720);
    await expect.poll(() => document.querySelector('[role="dialog"]')).toBeNull();
    await expect.poll(() => panel()?.checkVisibility()).toBe(true);
  });

  it('honors CSS overrides, sticky header and footer, and reduced motion', async () => {
    await emulate({ reducedMotion: true });
    const style = document.createElement('style');
    style.textContent =
      ':root { --sprout-sidebar-width: 280px; --sprout-sidebar-mobile-width: 260px; --sprout-radius-control: 12px; }';
    document.head.append(style);
    try {
      const screen = await render(<App provider={{ style: { height: 260 } }} />);
      expect(getComputedStyle(panel()).width).toBe('280px');
      expect(getComputedStyle(panel()).transitionDuration).toBe('0s');
      expect(getComputedStyle(document.querySelector('.sprout-sidebar-chevron')!).transitionDuration).toBe('0s');
      expect(getComputedStyle(section()).transitionDuration).toBe('0s');
      expect(getComputedStyle(screen.getByRole('link', { name: 'Overview', exact: true }).element()).borderRadius).toBe(
        '12px',
      );
      const footer = document.querySelector('.sprout-sidebar-footer')!;
      const before = footer.getBoundingClientRect().top;
      const content = document.querySelector<HTMLElement>('.sprout-sidebar-content')!;
      expect(content.scrollHeight).toBeGreaterThan(content.clientHeight);
      content.scrollTop = content.scrollHeight;
      expect(footer.getBoundingClientRect().top).toBe(before);

      screen.unmount();
      await page.viewport(390, 844);
      const mobile = await render(<App />);
      await mobile.getByRole('button', { name: 'Toggle sidebar' }).click();
      const drawer = page.getByRole('dialog').element();
      expect(getComputedStyle(drawer).width).toBe('260px');
      expect(getComputedStyle(drawer).transitionDuration).toBe('0s');
    } finally {
      style.remove();
    }
  });
});
