// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AttachmentDropzone,
  AttachmentGroup,
  AttachmentTrigger,
  FileAttachment,
  LocalFileAttachment,
  type AttachmentFile,
} from '../packages/sprout/src/components/attachment.js';

const file = (over: Partial<AttachmentFile> = {}): AttachmentFile => ({
  id: 'a',
  name: 'notes.txt',
  mediaType: 'text/plain',
  size: '1 KB',
  state: 'ready',
  source: {
    kind: 'local',
    file: new File(['hello'], 'notes.txt', { type: 'text/plain' }),
  },
  ...over,
});

let observers: Array<() => void> = [];
beforeEach(() => {
  observers = [];
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb: () => void) {
        observers.push(cb);
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Attachment in the DOM', () => {
  it('scrolls the carousel with arrows and keys', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(500);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
    const scrollBy = vi.fn();
    HTMLElement.prototype.scrollBy = scrollBy;
    render(
      <AttachmentGroup aria-label="Files" onKeyDownCapture={e => e.key === 'Home' && e.preventDefault()}>
        <FileAttachment file={file()} />
        {null}
        {false}
        <input aria-label="note" />
      </AttachmentGroup>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next attachments' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 80 });
    const viewport = document.querySelector<HTMLElement>('.sprout-attachment-carousel-viewport')!;
    viewport.scrollLeft = 400;
    fireEvent.scroll(viewport);
    act(() => observers.forEach(cb => cb()));
    fireEvent.click(screen.getByRole('button', { name: 'Previous attachments' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -80 });
    const region = screen.getByRole('region');
    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    fireEvent.keyDown(region, { key: 'Home' });
    fireEvent.keyDown(region, { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowLeft' });
    expect(scrollBy).toHaveBeenCalledTimes(4);
  });

  it('opens a shared viewer in page order and steps through it', async () => {
    render(
      <AttachmentGroup variant="list" aria-labelledby="t">
        <FileAttachment viewable file={file({ id: '1', name: 'a.txt' })} />
        <FileAttachment viewable file={file({ id: '2', name: 'b.txt' })} />
        <FileAttachment viewable file={file({ id: '3', name: 'c.txt', source: undefined })} />
      </AttachmentGroup>,
    );
    expect(screen.getByRole('group')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Inspect b.txt' }));
    expect(await screen.findByText('b.txt, file 2 of 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Previous file' }));
    expect(await screen.findByText('a.txt, file 1 of 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close file viewer' }));
  });

  it('opens a single viewer, calls onOpen, retries, and removes', async () => {
    const onOpen = vi.fn();
    const onRetry = vi.fn();
    const onRemove = vi.fn();
    const { rerender } = render(<FileAttachment viewable variant="grid" file={file()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Inspect notes.txt' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();

    rerender(
      <FileAttachment
        variant="inline"
        onOpen={onOpen}
        onRetry={onRetry}
        onRemove={onRemove}
        actionLabel="Download"
        file={file({ state: 'error' })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Download notes.txt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry notes.txt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove notes.txt' }));
    expect(screen.getByText('Failed')).toBeTruthy();
    expect([onOpen, onRetry, onRemove].map(f => f.mock.calls.length)).toEqual([1, 1, 1]);

    rerender(<FileAttachment variant="inline" file={file({ state: 'processing' })} />);
    expect(screen.getByLabelText('Processing…')).toBeTruthy();
    rerender(<FileAttachment variant="grid" file={file({ state: 'uploading' })} />);
    expect(screen.getByText('Uploading…')).toBeTruthy();
  });

  it('shows image fallbacks and chips in every state', () => {
    const image = file({
      name: 'p.png',
      mediaType: 'image/png',
      url: 'https://x.test/p.png',
    });
    const { rerender } = render(<FileAttachment variant="list" file={image} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('Image unavailable')).toBeTruthy();

    rerender(<FileAttachment variant="chip" file={image} onRemove={() => {}} />);
    fireEvent.error(screen.getByRole('img'));
    rerender(<FileAttachment variant="chip" file={{ ...image, url: undefined, state: 'uploading' }} />);
    expect(screen.getByLabelText('Uploading…')).toBeTruthy();
    rerender(<FileAttachment variant="chip" viewable preview file={file()} />);
    expect(screen.getByRole('button', { name: 'Inspect notes.txt' }).getAttribute('title')).toBeNull();
    rerender(<FileAttachment variant="chip" viewable file={file()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Inspect notes.txt' }));
  });

  it('peeks at a file on hover', async () => {
    render(<FileAttachment preview file={file({ url: 'https://x.test/n.txt', source: undefined })} />);
    const trigger = screen.getByText('notes.txt');
    fireEvent.focus(trigger);
    fireEvent.pointerEnter(trigger);
  });

  it('takes files from drops and the picker', () => {
    const onFiles = vi.fn();
    const { rerender } = render(<AttachmentDropzone onFiles={onFiles} />);
    const zone = document.querySelector<HTMLElement>("[data-slot='attachment-dropzone']")!;
    const dataTransfer = { files: [new File(['x'], 'x.txt')], dropEffect: '' };
    fireEvent.dragEnter(zone, { dataTransfer });
    expect(zone.hasAttribute('data-dragging')).toBe(true);
    fireEvent.dragLeave(zone, { relatedTarget: zone.firstChild });
    fireEvent.dragLeave(zone, { relatedTarget: null });
    expect(zone.hasAttribute('data-dragging')).toBe(false);
    fireEvent.dragOver(zone, { dataTransfer });
    fireEvent.drop(zone, { dataTransfer });
    expect(onFiles).toHaveBeenCalledTimes(1);

    const input = zone.querySelector('input')!;
    const click = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Choose files' }));
    expect(click).toHaveBeenCalled();
    fireEvent.change(input, { target: { files: [new File(['y'], 'y.txt')] } });
    fireEvent.change(input, { target: { files: null } });
    expect(onFiles).toHaveBeenCalledTimes(3);

    rerender(<AttachmentDropzone onFiles={onFiles} disabled />);
    fireEvent.dragOver(zone, { dataTransfer });
    fireEvent.drop(zone, { dataTransfer });
    expect(dataTransfer.dropEffect).toBe('none');
    expect(onFiles).toHaveBeenCalledTimes(3);
  });

  it('makes a blob preview for local images and renders custom triggers', () => {
    const { unmount } = render(
      <>
        <LocalFileAttachment file={new File(['x'], 'p.png', { type: 'image/png' })} />
        <LocalFileAttachment file={new File(['x'], 'a.txt', { type: 'text/plain' })} />
        <AttachmentTrigger aria-label="Open" />
        <AttachmentTrigger aria-label="Link" render={<a href="#x" />} />
      </>,
    );
    expect(screen.getByRole('img').getAttribute('src')).toBe('blob:x');
    expect(screen.getByRole('button', { name: 'Open' }).getAttribute('type')).toBe('button');
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });
});
