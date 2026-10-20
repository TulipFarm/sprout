import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useState } from 'react';
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
  FileAttachment,
  FileTypeIcon,
  type AttachmentFile,
} from '../../packages/sprout/src/components/attachment.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const local = (name: string, mediaType: string, body = 'Plant bulbs') =>
  ({
    kind: 'local',
    file: new File([body], name, { type: mediaType }),
  }) as const;

const file = (name: string, over: Partial<AttachmentFile> = {}): AttachmentFile => ({
  id: name,
  name,
  mediaType: 'text/plain',
  size: '12 KB',
  state: 'ready',
  ...over,
});

function Card({
  size = 'default',
  state = 'done',
  orientation = 'horizontal',
  testId,
}: {
  size?: 'default' | 'sm' | 'xs';
  state?: 'idle' | 'uploading' | 'done' | 'error';
  orientation?: 'horizontal' | 'vertical';
  testId?: string;
}) {
  return (
    <Attachment size={size} state={state} orientation={orientation} data-testid={testId}>
      <AttachmentMedia>
        <FileTypeIcon name="Returns policy.pdf" mediaType="application/pdf" />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>Returns policy.pdf</AttachmentTitle>
        <AttachmentDescription>{state === 'error' ? 'Upload failed' : '48 KB'}</AttachmentDescription>
      </AttachmentContent>
    </Attachment>
  );
}

function Gallery() {
  return (
    <div style={{ display: 'grid', gap: 12, padding: 16, maxWidth: 480 }}>
      <Card />
      <Card state="error" />
      <Card state="idle" size="sm" />
      <AttachmentGroup variant="list" aria-label="Files">
        <FileAttachment
          file={file('Returns policy.pdf', { mediaType: 'application/pdf' })}
          onOpen={() => {}}
          onRemove={() => {}}
        />
        <FileAttachment file={file('Price list 2026.xlsx', { state: 'uploading' })} onOpen={() => {}} />
        <FileAttachment file={file('Supplier notes.docx', { state: 'error' })} onRetry={() => {}} onRemove={() => {}} />
      </AttachmentGroup>
      <AttachmentGroup variant="inline" aria-label="Chips">
        <FileAttachment variant="chip" file={file('garden-notes.txt')} />
        <FileAttachment variant="chip" file={file('inventory.json', { state: 'uploading' })} />
      </AttachmentGroup>
    </div>
  );
}

const names = [
  'Price list 2026.xlsx',
  'garden-notes.txt',
  'inventory.json',
  'Returns policy.pdf',
  'Q3 launch deck.pptx',
];

function Composer() {
  const [files, setFiles] = useState(names);
  return (
    <div style={{ width: 320, padding: 16 }}>
      <AttachmentGroup aria-label="Attached files">
        {files.map(name => (
          <FileAttachment
            key={name}
            variant="chip"
            viewable
            file={file(name, { source: local(name, 'text/plain') })}
            onRemove={() => setFiles(files.filter(other => other !== name))}
          />
        ))}
      </AttachmentGroup>
    </div>
  );
}

const viewport = () => document.querySelector<HTMLElement>('.sprout-attachment-carousel-viewport')!;

function inside(node: Element, outer: Element) {
  const own = node.getBoundingClientRect();
  const box = outer.getBoundingClientRect();
  return own.left >= box.left - 1 && own.right <= box.right + 1;
}

function colorOf(token: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

describe('Attachment in a real browser', () => {
  it.each(themes)('%s %s passes axe', async (theme, mode) => {
    await emulate({ reducedMotion: true });
    setTheme(theme, mode);
    const screen = await render(<Gallery />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('sizes keep the Cloud footprint and states paint', async () => {
    const screen = await render(
      <div style={{ display: 'grid', gap: 8, width: 480 }}>
        <Card testId="default" />
        <Card testId="sm" size="sm" />
        <Card testId="xs" size="xs" />
        <Card testId="vertical" orientation="vertical" />
        <Card testId="error" state="error" />
        <Card testId="idle" state="idle" />
        <FileAttachment variant="chip" file={file('garden-notes.txt')} />
        <FileTypeIcon name="a.pdf" mediaType="application/pdf" size="sm" />
        <FileTypeIcon name="b.pdf" mediaType="application/pdf" size="lg" />
      </div>,
    );
    const media = (id: string) =>
      screen.getByTestId(id).element().querySelector('[data-slot="attachment-media"]')!.getBoundingClientRect();
    for (const [id, px] of [
      ['default', 40],
      ['sm', 32],
      ['xs', 28],
    ] as const)
      expect([media(id).width, media(id).height], id).toEqual([px, px]);
    expect(screen.getByTestId('vertical').element().getBoundingClientRect().height).toBeGreaterThan(
      screen.getByTestId('default').element().getBoundingClientRect().height,
    );
    const chip = screen.container.querySelector('[data-variant="chip"]')!;
    expect(Math.round(chip.getBoundingClientRect().height)).toBe(36);
    const icon = (size: string) =>
      screen.container.querySelector(`.sprout-file-type-icon-size-${size}`)!.getBoundingClientRect();
    expect([icon('sm').width, icon('sm').height]).toEqual([20, 24]);
    expect([icon('lg').width, icon('lg').height]).toEqual([30, 36]);
    const description = screen.getByTestId('error').element().querySelector('[data-slot="attachment-description"]')!;
    expect(getComputedStyle(description).color).toBe(colorOf('--sprout-danger'));
    expect(getComputedStyle(screen.getByTestId('idle').element()).borderTopStyle).toBe('dashed');
  });

  it('file attachments open, retry and remove from the keyboard', async () => {
    const calls: string[] = [];
    await render(
      <AttachmentGroup variant="list" aria-label="Files">
        <FileAttachment
          file={file('Returns policy.pdf')}
          onOpen={() => calls.push('open')}
          onRemove={() => calls.push('remove')}
        />
        <FileAttachment file={file('Supplier notes.docx', { state: 'error' })} onRetry={() => calls.push('retry')} />
      </AttachmentGroup>,
    );
    const open = page.getByRole('button', {
      name: 'Inspect Returns policy.pdf',
    });
    await userEvent.tab();
    await expect.element(open).toHaveFocus();
    expect(getComputedStyle(open.element()).outlineStyle).toBe('solid');
    await userEvent.keyboard('{Enter}');
    await userEvent.tab();
    await expect.element(page.getByRole('button', { name: 'Remove Returns policy.pdf' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.tab();
    await expect.element(page.getByRole('button', { name: 'Retry Supplier notes.docx' })).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(calls).toEqual(['open', 'remove', 'retry']);
  });

  it('the carousel scrolls with arrows and keys and reveals focused chips', async () => {
    await emulate({ reducedMotion: true });
    await page.viewport(390, 700);
    await render(<Composer />);
    const carousel = page.getByRole('region', { name: 'Attached files' });
    await expect.element(carousel).toHaveAttribute('aria-roledescription', 'carousel');
    await expect.element(page.getByRole('button', { name: 'Previous attachments' })).not.toBeInTheDocument();
    await page.getByRole('button', { name: 'Next attachments' }).click();
    await expect.poll(() => viewport().scrollLeft).toBeGreaterThan(0);
    await expect.element(page.getByRole('button', { name: 'Previous attachments' })).toBeVisible();
    viewport().scrollTo({ left: 0 });
    await expect.poll(() => viewport().scrollLeft).toBe(0);

    const first = page.getByRole('button', {
      name: 'Inspect Price list 2026.xlsx',
    });
    (first.element() as HTMLElement).focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.poll(() => viewport().scrollLeft).toBeGreaterThan(0);
    await userEvent.keyboard('{ArrowLeft}');
    await expect.poll(() => viewport().scrollLeft).toBe(0);

    const last = page.getByRole('button', { name: 'Inspect Q3 launch deck.pptx' }).element() as HTMLElement;
    last.focus();
    await expect.poll(() => inside(last, viewport())).toBe(true);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it('a group opens one viewer, steps through files, and returns focus', async () => {
    await emulate({ reducedMotion: true });
    await render(
      <AttachmentGroup variant="list" aria-label="Files">
        {['garden-notes.txt', 'inventory.txt'].map(name => (
          <FileAttachment key={name} viewable file={file(name, { source: local(name, 'text/plain') })} />
        ))}
      </AttachmentGroup>,
    );
    await page.getByRole('button', { name: 'Inspect garden-notes.txt' }).click();
    await expect.element(page.getByRole('dialog', { name: 'garden-notes.txt' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Previous file' })).toBeDisabled();
    await page.getByRole('button', { name: 'Next file' }).click();
    await expect.element(page.getByRole('dialog', { name: 'inventory.txt' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Inspect inventory.txt' })).toHaveFocus();
  });

  it('the stretched trigger rings the whole card', async () => {
    await render(
      <Attachment>
        <AttachmentContent>
          <AttachmentTitle>Q3 launch deck.pptx</AttachmentTitle>
        </AttachmentContent>
        <AttachmentTrigger aria-label="Open Q3 launch deck.pptx" />
      </Attachment>,
    );
    await userEvent.tab();
    const trigger = page.getByRole('button', {
      name: 'Open Q3 launch deck.pptx',
    });
    await expect.element(trigger).toHaveFocus();
    const card = trigger.element().closest('[data-slot="attachment"]')!;
    expect(getComputedStyle(card).outlineStyle).toBe('solid');
    const box = card.getBoundingClientRect();
    const hit = trigger.element().getBoundingClientRect();
    expect(hit.width).toBeGreaterThanOrEqual(box.width - 2);
    expect(hit.height).toBeGreaterThanOrEqual(box.height - 2);
  });

  it('reduced motion stops the title shimmer', async () => {
    const screen = await render(<Card state="uploading" />);
    const title = screen.container.querySelector('[data-slot="attachment-title"]')!;
    expect(getComputedStyle(title).animationName).toBe('sprout-attachment-shimmer');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(title).animationName).toBe('none');
  });

  it('fits a 390px phone', async () => {
    await emulate({ reducedMotion: true });
    await page.viewport(390, 800);
    const screen = await render(<Gallery />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    const pane = screen.container.firstElementChild!;
    for (const item of screen.container.querySelectorAll('[data-slot="file-attachment"], [data-slot="attachment"]'))
      expect(inside(item, pane)).toBe(true);
  });
});
