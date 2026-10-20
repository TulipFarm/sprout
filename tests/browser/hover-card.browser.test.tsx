import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  type HoverCardContentProps,
} from '../../packages/sprout/src/components/hover-card.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const people = {
  top: ['Alex Meadow', 'Fictional garden project coordinator.'],
  right: ['Priya Raman', 'Runs the weekly seed-catalog review.'],
  bottom: ['Jonas Becker', 'Answers greenhouse questions.'],
  left: ['Mei Tanaka', 'Draws the plot maps for every season.'],
} as const;

function Profile({
  name,
  about = 'Works on the spring launch.',
  delay = 0,
  ...content
}: {
  name: string;
  about?: string;
  delay?: number;
} & HoverCardContentProps) {
  return (
    <HoverCard>
      <HoverCardTrigger delay={delay} closeDelay={0} render={<a href="#profile" onClick={e => e.preventDefault()} />}>
        {name}
      </HoverCardTrigger>
      <HoverCardContent {...content}>
        <p>{name}</p>
        <p>{about}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

function Sides() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 24,
        justifyContent: 'center',
        padding: '280px 16px',
      }}
    >
      {(Object.keys(people) as (keyof typeof people)[]).map(side => (
        <Profile key={side} side={side} name={people[side][0]} about={people[side][1]} />
      ))}
    </div>
  );
}

const card = () => document.querySelector<HTMLElement>('[data-slot="hover-card-content"][data-open]');

async function leave() {
  await page.elementLocator(document.body).hover({ position: { x: 1, y: 1 } });
  await expect.poll(card).toBeNull();
}

/** The card stays in the viewport and nothing inside spills sideways. */
function contained(node: Element) {
  const box = node.getBoundingClientRect();
  const inside = [...node.querySelectorAll('*')].every(child => {
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

describe('HoverCard in a real browser', () => {
  it('opens on each side at 256px with 10px padding', async () => {
    const screen = await render(<Sides />);
    for (const side of Object.keys(people) as (keyof typeof people)[]) {
      const trigger = screen.getByRole('link', { name: people[side][0] });
      await trigger.hover();
      await expect.poll(card).not.toBeNull();
      await settle();
      expect(card()).toHaveAttribute('data-side', side);
      expect(card()!.textContent).toContain(people[side][1]);
      await expect.element(trigger).toHaveAttribute('data-popup-open', '');
      expect(card()!.getBoundingClientRect().width).toBe(256);
      expect(getComputedStyle(card()!).paddingTop).toBe('10px');
      expect(contained(card()!)).toEqual(fits);
      await leave();
    }
  });

  it('a phone keeps side cards on screen and long names wrap inside', async () => {
    await page.viewport(390, 700);
    const screen = await render(
      <>
        <Sides />
        <p style={{ padding: 8 }}>
          Ask{' '}
          <Profile
            name="greenhouse-irrigation-schedule-for-the-north-plot-v2"
            about="greenhouse-irrigation-schedule-for-the-north-plot-and-the-south-plot"
          />
        </p>
      </>,
    );
    for (const side of Object.keys(people) as (keyof typeof people)[]) {
      await screen.getByRole('link', { name: people[side][0] }).hover();
      await expect.poll(card).not.toBeNull();
      await settle();
      expect(card()!.getBoundingClientRect().width).toBeGreaterThanOrEqual(255);
      expect(contained(card()!)).toEqual(fits);
      await leave();
    }
    const long = screen.getByRole('link', { name: /greenhouse-irrigation/ });
    (long.element() as HTMLElement).scrollIntoView({ block: 'center' });
    await long.hover();
    await expect.poll(card).not.toBeNull();
    await settle();
    expect(contained(card()!)).toEqual(fits);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it('keyboard focus opens without moving focus, Escape closes, Tab moves on', async () => {
    const screen = await render(<Sides />);
    await userEvent.tab();
    const alex = screen.getByRole('link', { name: 'Alex Meadow' });
    await expect.element(alex).toHaveFocus();
    expect(getComputedStyle(alex.element()).outlineStyle).toBe('solid');
    await expect.poll(card).not.toBeNull();
    expect(card()).toHaveAttribute('data-side', 'top');
    expect(card()!.contains(document.activeElement)).toBe(false);
    await userEvent.keyboard('{Escape}');
    await expect.poll(card).toBeNull();
    await expect.element(alex).toHaveFocus();
    await userEvent.tab();
    await expect.element(screen.getByRole('link', { name: 'Priya Raman' })).toHaveFocus();
    await expect.poll(card).not.toBeNull();
    expect(card()).toHaveAttribute('data-side', 'right');
  });

  it('waits before opening and stays open while the pointer is on the card', async () => {
    const screen = await render(
      <div style={{ padding: 40 }}>
        <Profile name="Jonas Becker" delay={300} />
      </div>,
    );
    const jonas = screen.getByRole('link');
    await jonas.hover();
    expect(card()).toBeNull();
    await expect.poll(card).not.toBeNull();
    await settle();
    await page.elementLocator(card()!).hover();
    await new Promise(resolve => setTimeout(resolve, 350));
    expect(card()).not.toBeNull();
    await leave();
  });

  it('mentions align to the start of the name, nudged in 4px', async () => {
    const screen = await render(
      <p style={{ padding: 40 }}>
        Ask <Profile name="Priya Raman" align="start" /> about the launch.
      </p>,
    );
    const priya = screen.getByRole('link');
    await priya.hover();
    await expect.poll(card).not.toBeNull();
    await settle();
    expect(card()).toHaveAttribute('data-align', 'start');
    expect(card()).toHaveAttribute('data-side', 'bottom');
    const anchor = priya.element().getBoundingClientRect();
    const box = card()!.getBoundingClientRect();
    expect(Math.abs(box.x - (anchor.x + 4))).toBeLessThan(2);
    expect(box.y).toBeGreaterThan(anchor.bottom);
  });

  it('motion uses 120ms transitions and turns off for reduced motion', async () => {
    const screen = await render(<Profile name="Alex Meadow" />);
    await screen.getByRole('link').hover();
    await expect.poll(card).not.toBeNull();
    expect(getComputedStyle(card()!).transitionDuration).toBe('0.12s, 0.12s, 0.12s');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(card()!).transitionDuration).toBe('0s');
  });

  it.each(themes)('%s %s passes axe open', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Sides />);
    await screen.getByRole('link', { name: 'Priya Raman' }).hover();
    await expect.poll(card).not.toBeNull();
    await settle();
    expect(await axeViolations()).toEqual([]);
  });
});
