import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  ChatWindow,
  ChatWindowActions,
  ChatWindowBody,
  ChatWindowClose,
  ChatWindowContent,
  ChatWindowFooter,
  ChatWindowHeader,
  ChatWindowLauncher,
  ChatWindowLayoutMenu,
  ChatWindowTitle,
  chatWindowCornerNames,
  chatWindowLayoutNames,
} from '../packages/sprout/src/components/chat-window.js';
import * as sprout from '../packages/sprout/src/index.js';

function tag(html: string, slot: string) {
  const match = html.match(new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`));
  expect(match, slot).toBeTruthy();
  return match![0];
}

function render(props: Parameters<typeof ChatWindow>[0] = {}) {
  return renderToString(
    <ChatWindow {...props}>
      <ChatWindowLauncher>Bud</ChatWindowLauncher>
      <ChatWindowContent>
        <ChatWindowHeader>
          <ChatWindowTitle>Late supplier deliveries</ChatWindowTitle>
          <ChatWindowActions>
            <ChatWindowLayoutMenu />
            <ChatWindowClose />
          </ChatWindowActions>
        </ChatWindowHeader>
        <ChatWindowBody>Messages</ChatWindowBody>
        <ChatWindowFooter>Composer</ChatWindowFooter>
      </ChatWindowContent>
    </ChatWindow>,
  );
}

describe('ChatWindow', () => {
  it('lists its layouts and corners', () => {
    expect(chatWindowLayoutNames).toEqual(['drawer', 'page', 'window']);
    expect(chatWindowCornerNames).toEqual(['bottom-right', 'bottom-left', 'top-right', 'top-left']);
  });

  it('is exported from the package root', () => {
    for (const name of [
      'ChatWindow',
      'ChatWindowActions',
      'ChatWindowBody',
      'ChatWindowClose',
      'ChatWindowContent',
      'ChatWindowFooter',
      'ChatWindowHeader',
      'ChatWindowLauncher',
      'ChatWindowLayoutMenu',
      'ChatWindowTitle',
      'ChatWindowTrigger',
    ])
      expect(sprout).toHaveProperty(name);
  });

  it('renders the launcher as a dialog trigger pinned to its corner', () => {
    const launcher = tag(render({ corner: 'top-left' }), 'chat-window-launcher');
    expect(launcher).toContain('aria-haspopup="dialog"');
    expect(launcher).toContain('data-corner="top-left"');
    expect(launcher).toContain('sprout-chat-window-launcher');
  });

  it('renders nothing but the launcher until opened', () => {
    expect(render()).not.toContain('chat-window-content');
  });
});
