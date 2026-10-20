import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Avatar, AvatarFallback } from '../../packages/sprout/src/components/avatar.js';
import { PresenceCursor } from '../../packages/sprout/src/components/presence-cursor.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('presence-cursor %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        position: 'relative',
        width: 360,
        height: 160,
        background: 'var(--sprout-canvas)',
      }}
    >
      <PresenceCursor name="rico@gmail.com" color="#c92a2a" x={24} y={16} />
      <PresenceCursor name="jessica@gmail.com" color="#5b4fe0" x={180} y={60} />
      <PresenceCursor
        name="jenny@gmail.com"
        color="#b55309"
        x={40}
        y={96}
        avatar={
          <Avatar size="sm">
            <AvatarFallback>JE</AvatarFallback>
          </Avatar>
        }
      />
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`presence-cursor-${theme}-${mode}`);
});
