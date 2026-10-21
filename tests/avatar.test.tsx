import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
  EntityAvatar,
} from '../packages/sprout/src/components/avatar.js';

describe('Avatar', () => {
  it('renders sizes, fallbacks, badges, and groups on the server', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const html = renderToString(
        <Avatar size={size}>
          <AvatarImage src="/a.png" alt="Alex" />
          <AvatarFallback>AM</AvatarFallback>
          <AvatarBadge aria-label="Verified" role="img" />
        </Avatar>,
      );
      expect(html).toContain(`data-size="${size}"`);
      expect(html).toContain('data-slot="avatar"');
      expect(html).toContain('>AM<');
      expect(html).toContain('data-slot="avatar-badge"');
    }
    expect(renderToString(<Avatar />)).toContain('data-size="md"');
    const group = renderToString(
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+4</AvatarGroupCount>
      </AvatarGroup>,
    );
    expect(group).toContain('data-slot="avatar-group"');
    expect(group).toContain('data-slot="avatar-group-count"');
    expect(group).toContain('>+4<');
  });

  it('merges class names', () => {
    expect(renderToString(<Avatar className="custom" size="lg" />)).toMatch(/class="sprout-avatar custom"/);
    expect(renderToString(<AvatarBadge className="b" />)).toContain('class="sprout-avatar-badge b"');
  });

  it('draws seeded entity avatars in every size and shape', () => {
    const a = renderToString(<EntityAvatar seed="s" name="Meadow" />);
    expect(a).toBe(renderToString(<EntityAvatar seed="s" name="Meadow" />));
    expect(a).toContain('linear-gradient(135deg, oklch(0.62 0.15');
    expect(a).toContain('data-shape="circle"');
    expect(a).toContain('>M<');
    expect(a).not.toBe(renderToString(<EntityAvatar seed="t" name="Meadow" />));
    for (const size of ['sm', 'md', 'lg'] as const)
      expect(renderToString(<EntityAvatar seed="s" name="M" size={size} shape="square" />)).toContain(
        `data-size="${size}"`,
      );
    expect(renderToString(<EntityAvatar seed="s" name="  " />)).toContain('>?<');
  });
});
