import { expect, it } from 'vitest';
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
import { setTheme, settle, themes } from './support.js';

const art = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#dceefb"/><circle cx="32" cy="30" r="12" fill="#e2557f"/></svg>',
)}`;

it.each(themes)('avatar %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'inline-grid',
        gap: 12,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {(['xs', 'sm', 'default', 'lg'] as const).map(size => (
          <Avatar key={size} size={size}>
            <AvatarFallback>AM</AvatarFallback>
            <AvatarBadge />
          </Avatar>
        ))}
        <Avatar>
          <AvatarImage src={art} alt="Ana Moreno" />
          <AvatarFallback>AM</AvatarFallback>
        </Avatar>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {(['sm', 'default', 'lg', 'xl'] as const).flatMap(size =>
          (['circle', 'square'] as const).map(shape => (
            <EntityAvatar key={size + shape} seed="studio" name="Studio" size={size} shape={shape} />
          )),
        )}
      </div>
      <AvatarGroup role="group" aria-label="7 people">
        {['AM', 'RF', 'PR'].map(initials => (
          <Avatar key={initials}>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        ))}
        <AvatarGroupCount>+4</AvatarGroupCount>
      </AvatarGroup>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`avatar-${theme}-${mode}`);
});
