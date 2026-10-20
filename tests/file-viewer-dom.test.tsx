// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FileContent,
  FilePreview,
  FileRenderersProvider,
  FileViewer,
  ViewableFileContent,
  type ViewableFile,
} from '../packages/sprout/src/components/file-viewer.js';

const local = (name: string, text: string, type = 'text/plain'): ViewableFile => ({
  name,
  mediaType: type,
  source: { kind: 'local', file: new File([text], name, { type }) },
});
const remote = (name: string, url: string, type = 'text/plain'): ViewableFile => ({
  name,
  mediaType: type,
  source: { kind: 'remote', url },
});

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('FileViewer in the DOM', () => {
  it('steps through files with buttons and arrow keys', async () => {
    const files = [local('a.txt', 'A'), local('b.txt', 'B'), local('c.txt', 'C')];
    function Viewer() {
      const [index, setIndex] = useState(0);
      return <FileViewer open onOpenChange={() => {}} files={files} index={index} onIndexChange={setIndex} />;
    }
    render(<Viewer />);
    await screen.findByText('A');
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' });
    fireEvent.keyDown(dialog, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(dialog, { key: 'x' });
    expect(screen.getByText('a.txt, file 1 of 3')).toBeTruthy();
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    await screen.findByText('B');
    const next = screen.getByRole('button', { name: 'Next file' });
    next.focus();
    fireEvent.click(next);
    await screen.findByText('C');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Previous file' }));
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    screen.getByRole('button', { name: 'Previous file' }).focus();
    fireEvent.click(screen.getByRole('button', { name: 'Previous file' }));
    await screen.findByText('B');
    fireEvent.click(screen.getByRole('button', { name: 'Previous file' }));
    await screen.findByText('A');
    fireEvent.keyDown(screen.getByRole('button', { name: 'More actions' }), {
      key: 'ArrowRight',
    });
    await screen.findByText('B');
  });

  it('shows a single linked Google document and reloads it', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(
      <FileViewer open onOpenChange={() => {}} file={remote('Plan', 'https://docs.google.com/document/d/abc/edit')} />,
    );
    expect(screen.getByText('Google document')).toBeTruthy();
    act(() => vi.advanceTimersByTime(12000));
    expect(screen.getByRole('status').textContent).toContain('longer');
    fireEvent.click(screen.getByRole('button', { name: 'Reload viewer' }));
    const frame = document.querySelector('iframe')!;
    fireEvent.load(frame);
    expect(frame.closest('[data-state]')!.getAttribute('data-state')).toBe('loaded');
  });

  it('loads remote files and reports failures', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    fetch.mockResolvedValueOnce(new Response('hello', { headers: { 'content-type': 'text/plain' } }));
    const { rerender } = render(<ViewableFileContent file={remote('a.txt', 'https://x.test/a')} />);
    await screen.findByText('hello');
    expect(screen.getByText('Download').closest('a')!.getAttribute('download')).toBe('a.txt');

    fetch.mockResolvedValueOnce(new Response('', { status: 404 }));
    rerender(<ViewableFileContent file={remote('b.txt', 'https://x.test/b')} />);
    await screen.findByText(/could not be loaded/);

    fetch.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'AbortError' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText(/took too long/);

    fetch.mockRejectedValueOnce('boom');
    rerender(<ViewableFileContent file={remote('c.txt', 'https://x.test/c')} />);
    await screen.findByText(/took too long/);

    const big = new Blob(['x']);
    Object.defineProperty(big, 'size', { value: 60 * 1024 * 1024 });
    fetch.mockResolvedValueOnce({ ok: true, blob: async () => big });
    rerender(<ViewableFileContent file={remote('d.txt', 'https://x.test/d')} />);
    await screen.findByText(/50 MB/);
  });

  it('aborts slow fetches and ignores results after unmount', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, { signal }: RequestInit) =>
          new Promise((_, reject) =>
            signal!.addEventListener('abort', () => reject(Object.assign(new Error('a'), { name: 'AbortError' }))),
          ),
      ),
    );
    render(<ViewableFileContent file={remote('a.txt', 'https://x.test/a')} />);
    await act(async () => vi.advanceTimersByTime(15000));
    expect(screen.getByText(/took too long/)).toBeTruthy();

    let resolve!: (value: unknown) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(r => (resolve = r))),
    );
    const view = render(<ViewableFileContent file={remote('b.txt', 'https://x.test/b')} />);
    view.unmount();
    await act(async () => resolve(new Response('late')));
  });

  it('zooms images and handles decode errors', async () => {
    render(<ViewableFileContent file={local('p.png', 'png', 'image/png')} />);
    const img = await screen.findByRole('img', { name: 'p.png' });
    fireEvent.load(img);
    expect(img.getAttribute('data-state')).toBe('ready');
    fireEvent.click(screen.getByRole('button', { name: 'Actual size' }));
    expect(screen.getByRole('region', { name: 'p.png at actual size' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fit image' }));
    fireEvent.error(img);
    expect(screen.getByText(/could not decode/)).toBeTruthy();
  });

  it('toggles formatted Markdown and shows Google shortcut errors', async () => {
    render(
      <FileRenderersProvider renderers={{ markdown: ({ text }) => <b>{text.toUpperCase()}</b> }}>
        <FileRenderersProvider renderers={{}}>
          <FileContent
            name="r.md"
            mediaType="text/markdown"
            bytes={new TextEncoder().encode('hi').buffer as ArrayBuffer}
            url="blob:x"
            onRetry={() => {}}
          />
        </FileRenderersProvider>
      </FileRenderersProvider>,
    );
    expect(screen.getByText('HI')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show source' }));
    expect(screen.getByRole('button', { name: 'Show formatted' })).toBeTruthy();

    const shortcut = (text: string) => (
      <FileContent
        name="s.gdoc"
        mediaType=""
        bytes={new TextEncoder().encode(text).buffer as ArrayBuffer}
        url="blob:x"
        onRetry={() => {}}
      />
    );
    const { rerender } = render(shortcut('{"url":"https://example.com"}'));
    expect(screen.getByText(/supported Google/)).toBeTruthy();
    rerender(shortcut('{}'));
    expect(screen.getByText(/does not contain a document link/)).toBeTruthy();
  });

  it('previews loading, errors, empty files, images, and text', async () => {
    const { rerender } = render(<FilePreview file={local('a.ts', 'const a = 1;')} />);
    expect(screen.getByText('Loading preview…')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Loading preview…')).toBeNull());

    rerender(<FilePreview file={local('e.txt', '  ')} />);
    await screen.findByText('This file is empty');

    rerender(<FilePreview file={local('p.png', 'x', 'image/png')} />);
    await waitFor(() => expect(screen.getByRole('img').getAttribute('src')).toBe('blob:x'));

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    );
    rerender(<FilePreview file={remote('r.md', 'https://x.test/r')} />);
    await screen.findByText('Preview unavailable');
  });
});
