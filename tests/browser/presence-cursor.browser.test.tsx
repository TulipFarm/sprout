import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Avatar, AvatarFallback } from '../../packages/sprout/src/components/avatar.js';
import { PresenceCursor } from '../../packages/sprout/src/components/presence-cursor.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const red = 'rgb(201, 42, 42)';

function Board({ x = 40, y = 30, name = 'rico@gmail.com', avatar = false }) {
  return (
    <div data-testid="board" style={{ position: 'relative', width: 400, height: 200 }}>
      <PresenceCursor
        name={name}
        color="#c92a2a"
        x={x}
        y={y}
        avatar={
          avatar ? (
            <Avatar size="sm">
              <AvatarFallback>R</AvatarFallback>
            </Avatar>
          ) : undefined
        }
      />
    </div>
  );
}

const cursor = () => document.querySelector<HTMLElement>('[data-slot="presence-cursor"]')!;
const part = (selector: string) => cursor().querySelector<Element>(selector)!;

describe('PresenceCursor in a real browser', () => {
  it.each(themes)('%s %s passes axe with a tag and with an avatar', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(
      <>
        <Board />
        <Board avatar name="jenny@gmail.com" />
      </>,
    );
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('puts the arrow tip at x, y and the tag below right in the color', async () => {
    const screen = await render(<Board />);
    await settle();
    await expect.element(screen.getByRole('img', { name: 'rico@gmail.com' })).toBeVisible();
    const board = screen.getByTestId('board').element().getBoundingClientRect();
    const arrow = part('.sprout-presence-cursor-arrow').getBoundingClientRect();
    expect(arrow.left - board.left).toBe(40);
    expect(arrow.top - board.top).toBe(30);
    const label = part('[data-slot="presence-cursor-label"]');
    const box = label.getBoundingClientRect();
    expect(box.left).toBeGreaterThan(arrow.left);
    expect(box.top).toBeGreaterThan(arrow.top);
    expect(getComputedStyle(label).backgroundColor).toBe(red);
    expect(getComputedStyle(label).color).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(part('path')).fill).toBe(red);
  });

  it('lets clicks pass through to the surface', async () => {
    await render(<Board />);
    expect(getComputedStyle(cursor()).pointerEvents).toBe('none');
  });

  it('rings the avatar in the color and drops the tag', async () => {
    await render(<Board avatar />);
    const ring = part('[data-slot="presence-cursor-avatar"]');
    expect(getComputedStyle(ring).borderTopColor).toBe(red);
    expect(getComputedStyle(ring).borderRadius).toBe('9999px');
    expect(cursor().querySelector('[data-slot="presence-cursor-label"]')).toBe(null);
  });

  it('cuts long names off at 16rem', async () => {
    await render(<Board name="robin.greenhouse.operations@greenhouse-northwind.example" />);
    const label = part('[data-slot="presence-cursor-label"]') as HTMLElement;
    expect(label.getBoundingClientRect().width).toBe(256);
    expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
    expect(getComputedStyle(label).textOverflow).toBe('ellipsis');
  });

  it('glides between spots only when motion is allowed', async () => {
    const screen = await render(<Board />);
    expect(getComputedStyle(cursor()).transitionProperty).toBe('transform');
    expect(getComputedStyle(cursor()).transitionDuration).toBe('0.18s');
    await screen.rerender(<Board x={120} y={90} />);
    expect(cursor().style.transform).toBe('translate(120px, 90px)');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(cursor()).transitionDuration).toBe('0s');
  });
});
