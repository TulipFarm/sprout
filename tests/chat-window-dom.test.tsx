// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef, useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
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
  ChatWindowTrigger,
  type ChatWindowContentProps,
  type ChatWindowLayoutMenuProps,
  type ChatWindowProps,
} from '../packages/sprout/src/components/chat-window.js';

const flush = () => act(async () => {});

function Bud({
  content,
  menu,
  ...props
}: ChatWindowProps & { content?: ChatWindowContentProps; menu?: ChatWindowLayoutMenuProps }) {
  return (
    <ChatWindow {...props}>
      <ChatWindowLauncher>Bud</ChatWindowLauncher>
      <ChatWindowContent {...content}>
        <ChatWindowHeader>
          <ChatWindowTitle>Late supplier deliveries</ChatWindowTitle>
          <ChatWindowActions>
            <ChatWindowLayoutMenu {...menu} />
            <ChatWindowClose />
          </ChatWindowActions>
        </ChatWindowHeader>
        <ChatWindowBody>Messages</ChatWindowBody>
        <ChatWindowFooter>
          <textarea aria-label="Message" />
        </ChatWindowFooter>
      </ChatWindowContent>
    </ChatWindow>
  );
}

const content = () => document.querySelector<HTMLElement>('[data-slot="chat-window-content"]');

async function openMenu() {
  const trigger = document.querySelector<HTMLElement>('[data-slot="chat-window-layout-trigger"]')!;
  fireEvent.click(trigger);
  await flush();
  return trigger;
}

async function pick(option: string) {
  const item = document.querySelector<HTMLElement>(`[data-layout-option="${option}"]`)!;
  fireEvent.click(item);
  await flush();
}

describe('ChatWindow in the DOM', () => {
  it('opens from the launcher, focuses the window, and forwards refs', async () => {
    const objectRef = createRef<HTMLDivElement>();
    const callbackRef = vi.fn();
    const { rerender } = render(<Bud content={{ ref: objectRef }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bud' }));
    await flush();
    expect(content()?.hasAttribute('data-open')).toBe(true);
    expect(content()?.getAttribute('data-layout')).toBe('window');
    expect(content()?.getAttribute('data-corner')).toBe('bottom-right');
    expect(objectRef.current).toBe(content());
    await waitFor(() => expect(document.activeElement).toBe(content()));

    rerender(<Bud content={{ ref: callbackRef }} />);
    await flush();
    expect(callbackRef).toHaveBeenCalledWith(content());
  });

  it('focuses a custom initialFocus target', async () => {
    function Custom() {
      const target = useRef<HTMLButtonElement>(null);
      return (
        <ChatWindow defaultOpen>
          <ChatWindowContent initialFocus={target}>
            <button type="button" ref={target}>
              Start
            </button>
          </ChatWindowContent>
        </ChatWindow>
      );
    }
    render(<Custom />);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Start' })));
  });

  it('switches layouts from the menu and reports the change', async () => {
    const onLayoutChange = vi.fn();
    render(<Bud defaultOpen corner="top-left" onLayoutChange={onLayoutChange} />);
    await flush();
    expect(content()?.getAttribute('data-corner')).toBe('top-left');
    const trigger = await openMenu();
    expect(trigger?.getAttribute('aria-label')).toBe('Switch layout, Window');
    await pick('drawer');
    expect(onLayoutChange).toHaveBeenCalledWith('drawer');
    expect(content()?.getAttribute('data-layout')).toBe('drawer');
    expect(trigger?.getAttribute('aria-label')).toBe('Switch layout, Side drawer');
  });

  it('keeps a controlled layout until the owner updates it', async () => {
    const onLayoutChange = vi.fn();
    render(<Bud defaultOpen layout="page" onLayoutChange={onLayoutChange} />);
    await flush();
    await openMenu();
    await pick('window');
    expect(onLayoutChange).toHaveBeenCalledWith('window');
    expect(content()?.getAttribute('data-layout')).toBe('page');
  });

  it('minimizes back to the launcher once the menu has closed', async () => {
    const onOpenChange = vi.fn();
    render(<Bud defaultOpen onOpenChange={onOpenChange} />);
    await flush();
    await openMenu();
    await pick('minimize');
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything()));
    await waitFor(() => expect(content()?.hasAttribute('data-open')).toBe(false));
    expect(content()).not.toBeNull();
  });

  it('closes a menu without minimizing when Minimize was not chosen', async () => {
    render(<Bud defaultOpen />);
    await flush();
    await openMenu();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await flush();
    expect(content()?.hasAttribute('data-open')).toBe(true);
  });

  it('offers only the requested layouts, with custom labels, and can hide Minimize', async () => {
    render(
      <Bud
        defaultOpen
        menu={{ layouts: ['page', 'window'], showMinimize: false, labels: { page: 'Expand', trigger: 'Layout' } }}
      />,
    );
    await flush();
    const trigger = await openMenu();
    expect(trigger?.getAttribute('aria-label')).toBe('Layout, Window');
    const options = [...document.querySelectorAll('[data-layout-option]')].map(node => node.textContent);
    expect(options).toEqual(['Expand', 'Window']);
  });

  it('closes from the close button and reopens from a trigger', async () => {
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <ChatWindow open={open} onOpenChange={setOpen}>
          <ChatWindowTrigger>Ask Bud</ChatWindowTrigger>
          <ChatWindowContent keepMounted={false}>
            <ChatWindowClose label="Hide" />
          </ChatWindowContent>
        </ChatWindow>
      );
    }
    render(<Controlled />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    await waitFor(() => expect(content()).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Ask Bud' }));
    await flush();
    expect(content()?.hasAttribute('data-open')).toBe(true);
  });

  it('stays open when the owner cancels a change', async () => {
    render(<Bud defaultOpen onOpenChange={(_open, details) => details.cancel()} />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await flush();
    expect(content()?.hasAttribute('data-open')).toBe(true);
  });

  it('requires a ChatWindow around its parts', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ChatWindowLauncher>Bud</ChatWindowLauncher>)).toThrow(
      'ChatWindowLauncher must be placed inside ChatWindow.',
    );
    vi.restoreAllMocks();
  });
});
