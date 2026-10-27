// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  KnowledgeBase,
  KnowledgeBaseSources,
  type KnowledgeBaseSource,
  type KnowledgeBaseSourcesProps,
} from '../packages/sprout/src/components/knowledge-base.js';

const source = (
  id: string,
  status: KnowledgeBaseSource['status'],
  extra: Partial<KnowledgeBaseSource> = {},
): KnowledgeBaseSource => ({ id, name: id, status, ...extra });

const handlers = () => ({
  onSync: vi.fn(),
  onPauseSync: vi.fn(),
  onResumeSync: vi.fn(),
  onCancelSync: vi.fn(),
  onSettings: vi.fn(),
  onDisconnect: vi.fn(),
});

const show = (sources: readonly KnowledgeBaseSource[], props: KnowledgeBaseSourcesProps = {}) =>
  render(
    <KnowledgeBase sources={sources}>
      <KnowledgeBaseSources {...props} />
    </KnowledgeBase>,
  );

async function menuOf(name: string) {
  fireEvent.click(screen.getByRole('button', { name: `Actions for ${name}` }));
  return (await screen.findAllByRole('menuitem')).map(item => item.textContent);
}

describe('KnowledgeBaseSources menu', () => {
  it.each([
    ['connected', ['Sync now', 'Pause syncing', 'Settings', 'Disconnect']],
    ['paused', ['Sync now', 'Resume syncing', 'Settings', 'Disconnect']],
    ['syncing', ['Pause syncing', 'Cancel sync']],
    ['queued', ['Cancel sync']],
    ['error', ['Settings', 'Disconnect']],
  ] as const)('offers the actions that fit a %s source', async (status, items) => {
    show([source('Slack', status)], handlers());
    expect(await menuOf('Slack')).toEqual(items);
  });

  it('calls back with the source', async () => {
    const props = handlers();
    const slack = source('Slack', 'connected');
    show([slack], props);
    await menuOf('Slack');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Pause syncing' }));
    expect(props.onPauseSync).toHaveBeenCalledWith(slack);
    await menuOf('Slack');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Disconnect' }));
    expect(props.onDisconnect).toHaveBeenCalledWith(slack);
    expect(props.onSync).not.toHaveBeenCalled();
  });

  it('fires Connect and Retry', () => {
    const onConnect = vi.fn();
    const onRetry = vi.fn();
    const drive = source('Drive', 'available');
    const docs = source('Docs', 'error');
    show([drive, docs], { onConnect, onRetry });
    fireEvent.click(screen.getByRole('button', { name: 'Connect Drive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry Docs' }));
    expect(onConnect).toHaveBeenCalledWith(drive);
    expect(onRetry).toHaveBeenCalledWith(docs);
  });

  it('keeps the menu column on rows without a menu, and drops it when no row has one', () => {
    const { container, unmount } = show([source('Slack', 'connected'), source('Drive', 'available')], {
      onSettings: vi.fn(),
    });
    const [slack, drive] = container.querySelectorAll('li');
    expect(within(slack!).getByRole('button', { name: 'Actions for Slack' })).toBeTruthy();
    expect(drive!.querySelector('.sprout-knowledge-base-source-menu-space')).not.toBeNull();
    unmount();
    const bare = show([source('Slack', 'connected'), source('Drive', 'available')]);
    expect(bare.container.querySelector('.sprout-knowledge-base-source-menu-space')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Actions for/ })).toBeNull();
  });
});

describe('KnowledgeBaseSources progress', () => {
  it('reports a syncing source as a progress bar, indeterminate without progress', () => {
    show([source('Slack', 'syncing', { progress: 140 }), source('Drive', 'syncing'), source('Docs', 'connected')]);
    const [slack, drive] = screen.getAllByRole('progressbar');
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
    expect(slack!.getAttribute('aria-label')).toBe('Slack sync');
    expect(slack!.getAttribute('aria-valuenow')).toBe('100');
    expect(slack!.getAttribute('aria-valuemax')).toBe('100');
    expect(drive!.hasAttribute('aria-valuenow')).toBe(false);
    expect(drive!.hasAttribute('data-indeterminate')).toBe(true);
  });
});

describe('KnowledgeBase announcer', () => {
  it('reads out a source that finishes syncing or fails', () => {
    const view = (sources: readonly KnowledgeBaseSource[]) => (
      <KnowledgeBase sources={sources}>
        <KnowledgeBaseSources />
      </KnowledgeBase>
    );
    const { rerender } = render(view([source('Slack', 'syncing'), source('Drive', 'syncing')]));
    rerender(
      view([source('Slack', 'connected', { chunks: 1200 }), source('Drive', 'error', { error: 'Token expired.' })]),
    );
    expect(screen.getByRole('status').textContent).toBe('Slack connected, 1,200 chunks. Drive failed: Token expired.');
  });
});
