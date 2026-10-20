import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
  EntityAvatar,
} from '../../packages/sprout/src/components/avatar.js';
import { axeViolations, emulate, setTheme, settle, size, themes } from './support.js';

const art = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#dceefb"/><circle cx="32" cy="30" r="12" fill="#e2557f"/></svg>',
)}`;
const broken = 'data:image/png;base64,AAAA';
const sizes = { xs: 20, sm: 24, default: 32, lg: 40 } as const;

const Check = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8l3 3 7-7" stroke="currentColor" fill="none" />
  </svg>
);

function Gallery() {
  return (
    <div style={{ display: 'grid', gap: 12, padding: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {Object.keys(sizes).map(name => (
          <Avatar key={name} size={name as keyof typeof sizes} data-testid={`avatar-${name}`}>
            <AvatarFallback>AM</AvatarFallback>
            <AvatarBadge>
              <Check />
            </AvatarBadge>
          </Avatar>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {[...Object.keys(sizes), 'xl'].flatMap(name =>
          (['circle', 'square'] as const).map(shape => (
            <EntityAvatar
              key={name + shape}
              seed="studio"
              name="Studio"
              size={name as keyof typeof sizes}
              shape={shape}
            />
          )),
        )}
      </div>
      {(['sm', 'default', 'lg'] as const).map(name => (
        <AvatarGroup key={name} role="group" aria-label={`7 people, ${name}`}>
          {['AM', 'RF', 'PR'].map(initials => (
            <Avatar key={initials} size={name}>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          ))}
          <AvatarGroupCount>+4</AvatarGroupCount>
        </AvatarGroup>
      ))}
    </div>
  );
}

const entity = (container: Element, name: string, shape: string) =>
  container.querySelector(`[data-slot="entity-avatar"][data-size="${name}"][data-shape="${shape}"]`)!;

describe('Avatar in a real browser', () => {
  it.each(themes)('%s %s passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Gallery />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('sizes, shapes, badges, and group counts match the Cloud scale', async () => {
    const screen = await render(<Gallery />);
    for (const [name, px] of Object.entries(sizes)) {
      const avatar = screen.getByTestId(`avatar-${name}`).element();
      expect(size(avatar), name).toEqual([px, px]);
      const badge = avatar.querySelector('[data-slot="avatar-badge"]')!;
      expect(size(badge)[0], name).toBeGreaterThan(0);
      expect(getComputedStyle(badge.querySelector('svg')!).display, name).toBe(
        name === 'xs' || name === 'sm' ? 'none' : 'block',
      );
    }
    for (const [name, px] of Object.entries({ ...sizes, xl: 64 }))
      for (const shape of ['circle', 'square']) expect(size(entity(screen.container, name, shape))).toEqual([px, px]);
    const radius = (name: string, shape: string) =>
      getComputedStyle(entity(screen.container, name, shape)).borderRadius;
    expect(radius('xs', 'square')).toBe('4px');
    expect(radius('lg', 'square')).toBe('8px');
    expect(radius('lg', 'circle')).toBe('9999px');
    for (const [name, px] of Object.entries({ sm: 24, default: 32, lg: 40 })) {
      const group = screen.getByRole('group', { name: `7 people, ${name}` });
      const count = group.element().querySelector('[data-slot="avatar-group-count"]')!;
      expect(size(count)).toEqual([px, px]);
      const [first, second] = [...group.element().children].map(child => child.getBoundingClientRect());
      expect(first!.right - second!.left).toBe(8);
    }
  });

  it('images load, fail, and fall back to initials', async () => {
    const screen = await render(
      <div style={{ display: 'flex', gap: 8 }}>
        <Avatar data-testid="loaded">
          <AvatarImage src={art} alt="Alex Meadow" />
          <AvatarFallback>AM</AvatarFallback>
        </Avatar>
        <Avatar data-testid="broken">
          <AvatarImage src={broken} alt="Robin Field" />
          <AvatarFallback>RF</AvatarFallback>
        </Avatar>
        <EntityAvatar data-testid="entity" seed="r" name="robin" image={broken} />
        <EntityAvatar data-testid="entity-image" seed="s" name="S" image={art} />
      </div>,
    );
    const image = screen.getByRole('img', { name: 'Alex Meadow' });
    await expect.element(image).toBeVisible();
    expect(size(image.element())).toEqual([32, 32]);
    await expect.element(screen.getByTestId('broken')).toHaveTextContent('RF');
    expect(screen.getByTestId('broken').element().querySelector('img')).toBeNull();
    await expect.element(screen.getByTestId('entity')).toHaveTextContent('R');
    const entityImage = screen.getByTestId('entity-image').element();
    await expect.poll(() => entityImage.querySelector('img')?.referrerPolicy).toBe('no-referrer');
  });

  it('the image fades in, and reduced motion turns the fade off', async () => {
    const screen = await render(
      <Avatar>
        <AvatarImage src={art} alt="Alex Meadow" />
        <AvatarFallback>AM</AvatarFallback>
      </Avatar>,
    );
    const image = screen.getByRole('img', { name: 'Alex Meadow' });
    await expect.element(image).toBeVisible();
    expect(getComputedStyle(image.element()).transitionDuration).toBe('0.18s');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(image.element()).transitionDuration).toBe('0s');
  });

  it('does not overflow a 390px viewport', async () => {
    await page.viewport(390, 844);
    await render(<Gallery />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });
});
