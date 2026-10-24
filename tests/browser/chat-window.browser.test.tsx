import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
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
  type ChatWindowProps,
} from '../../packages/sprout/src/components/chat-window.js';
import { axeViolations, setTheme, settle, themes } from './support.js';

function Sample(props: ChatWindowProps) {
  return (
    <>
      <button type="button">Outside</button>
      <ChatWindow {...props}>
        <ChatWindowLauncher>Ask Bud</ChatWindowLauncher>
        <ChatWindowContent>
          <ChatWindowHeader>
            <ChatWindowTitle>Late supplier deliveries</ChatWindowTitle>
            <ChatWindowActions>
              <ChatWindowLayoutMenu />
              <ChatWindowClose />
            </ChatWindowActions>
          </ChatWindowHeader>
          <ChatWindowBody>
            <p>Harbor Glass is three days late on the spring order.</p>
          </ChatWindowBody>
          <ChatWindowFooter>
            <textarea aria-label="Message Bud" />
          </ChatWindowFooter>
        </ChatWindowContent>
      </ChatWindow>
    </>
  );
}

const content = () => document.querySelector<HTMLElement>('[data-slot="chat-window-content"]')!;
const isOpen = () => content()?.hasAttribute('data-open') ?? false;
const launcher = () => document.querySelector<HTMLElement>('[data-slot="chat-window-launcher"]')!;
const visible = (element: HTMLElement) => getComputedStyle(element).visibility !== 'hidden';

async function open(props: ChatWindowProps = {}) {
  const screen = await render(<Sample {...props} />);
  await screen.getByRole('button', { name: 'Ask Bud' }).click();
  await expect.poll(isOpen).toBe(true);
  await settle();
  return screen;
}

async function chooseLayout(name: RegExp) {
  await page.getByRole('button', { name: /^Switch layout/ }).click();
  await page.getByRole('menuitemradio', { name }).click();
  await expect.poll(() => document.querySelector('[role="menu"]')).toBeNull();
  await settle();
}

describe('ChatWindow in a real browser', () => {
  it('opens into the window layout, focuses the window and hides the launcher', async () => {
    await page.viewport(1440, 900);
    await open();
    expect(content().dataset.layout).toBe('window');
    expect(document.activeElement).toBe(content());
    await expect.poll(() => visible(launcher())).toBe(false);
    const rect = content().getBoundingClientRect();
    expect(Math.round(rect.right)).toBeLessThanOrEqual(1440);
    expect(Math.round(rect.bottom)).toBeLessThanOrEqual(900);
    expect(rect.left).toBeGreaterThan(720);
  });

  it('stays open while you work on the page behind it', async () => {
    await page.viewport(1440, 900);
    const screen = await open();
    await screen.getByRole('button', { name: 'Outside' }).click();
    await settle();
    expect(isOpen()).toBe(true);
  });

  it('switches between window, side drawer and full page', async () => {
    await page.viewport(1440, 900);
    const changes: string[] = [];
    await open({ onLayoutChange: layout => changes.push(layout) });

    await chooseLayout(/Side drawer/);
    expect(content().dataset.layout).toBe('drawer');
    let rect = content().getBoundingClientRect();
    expect(Math.round(rect.top)).toBe(0);
    expect(Math.round(rect.bottom)).toBe(900);
    expect(Math.round(rect.right)).toBe(1440);

    await chooseLayout(/Full page/);
    expect(content().dataset.layout).toBe('page');
    rect = content().getBoundingClientRect();
    expect(Math.round(rect.width)).toBe(1440);

    await chooseLayout(/Window/);
    expect(changes).toEqual(['drawer', 'page', 'window']);
  });

  it('minimizes back into the launcher and returns focus to it', async () => {
    await page.viewport(1440, 900);
    await open();
    await page.getByRole('button', { name: /^Switch layout/ }).click();
    await page.getByRole('menuitem', { name: 'Minimize' }).click();
    await expect.poll(isOpen).toBe(false);
    await expect.poll(() => visible(launcher())).toBe(true);
    await expect.poll(() => document.activeElement).toBe(launcher());
  });

  it('closes with Escape and with the close button', async () => {
    await page.viewport(1440, 900);
    await open();
    await userEvent.keyboard('{Escape}');
    await expect.poll(isOpen).toBe(false);
    await expect.poll(() => document.activeElement).toBe(launcher());
    await launcher().click();
    await expect.poll(isOpen).toBe(true);
    await page.getByRole('button', { name: 'Close' }).click();
    await expect.poll(isOpen).toBe(false);
  });

  it('fills a phone screen and only offers full page and minimize', async () => {
    await page.viewport(390, 844);
    await open();
    const rect = content().getBoundingClientRect();
    expect(Math.round(rect.width)).toBe(390);
    expect(Math.round(rect.height)).toBe(844);
    await page.getByRole('button', { name: /^Switch layout/ }).click();
    const options = [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"], [role="menuitem"]')]
      .filter(visible)
      .filter(item => item.offsetParent !== null)
      .map(item => item.textContent?.trim());
    expect(options).toEqual(['Full page', 'Minimize']);
  });

  describe.each(themes)('%s %s', (theme, mode) => {
    it.each([390, 1440])('passes axe at %ipx', async width => {
      setTheme(theme, mode);
      await page.viewport(width, 900);
      await open();
      expect(await axeViolations()).toEqual([]);
    });
  });
});
