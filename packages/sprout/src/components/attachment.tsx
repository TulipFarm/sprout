'use client';

import {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type DragEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { ChevronLeft } from 'reicon-react/icons/ChevronLeft';
import { ChevronRight } from 'reicon-react/icons/ChevronRight';
import { Image } from 'reicon-react/icons/Image';
import { Upload } from 'reicon-react/icons/Upload';
import { X } from 'reicon-react/icons/X';
import { cn } from '../internal/classes.js';
import { defaultFileAccept, fileKind, formatFileSize, type FileKind } from '../internal/file-kind.js';
import { Button, type ButtonProps } from './button.js';
import { FilePreview, FileViewer, isPreviewableFile, type ViewableFile } from './file-viewer.js';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card.js';
import { Spinner } from './spinner.js';

export const attachmentStateNames = ['idle', 'uploading', 'processing', 'error', 'done'] as const;
export const attachmentSizeNames = ['default', 'sm', 'xs'] as const;
export const attachmentOrientationNames = ['horizontal', 'vertical'] as const;
export const attachmentMediaVariantNames = ['icon', 'image'] as const;
export const attachmentGroupVariantNames = ['carousel', 'grid', 'inline', 'list'] as const;
export const fileAttachmentVariantNames = ['list', 'grid', 'inline', 'chip'] as const;
export const fileAttachmentStateNames = ['ready', 'uploading', 'processing', 'error'] as const;
export const fileTypeIconSizeNames = ['sm', 'lg'] as const;

export type AttachmentState = (typeof attachmentStateNames)[number];
export type AttachmentSize = (typeof attachmentSizeNames)[number];
export type AttachmentOrientation = (typeof attachmentOrientationNames)[number];
export type AttachmentMediaVariant = (typeof attachmentMediaVariantNames)[number];
export type AttachmentGroupVariant = (typeof attachmentGroupVariantNames)[number];
export type FileAttachmentVariant = (typeof fileAttachmentVariantNames)[number];
export type FileAttachmentState = (typeof fileAttachmentStateNames)[number];
export type FileTypeIconSize = (typeof fileTypeIconSizeNames)[number];
export type { FileKind };

export interface AttachmentProps extends ComponentProps<'div'> {
  /** `idle` dashes the border, `uploading` and `processing` shimmer the title and dim image media, `error` turns it red. */
  state?: AttachmentState | undefined;
  size?: AttachmentSize | undefined;
  orientation?: AttachmentOrientation | undefined;
}

/** A file card built from media, content, and actions. */
export function Attachment({
  className,
  state = 'done',
  size = 'default',
  orientation = 'horizontal',
  ...props
}: AttachmentProps) {
  return (
    <div
      data-slot="attachment"
      data-state={state}
      data-size={size}
      data-orientation={orientation}
      className={cn(
        'sprout-attachment',
        `sprout-attachment-size-${size}`,
        `sprout-attachment-${orientation}`,
        className,
      )}
      {...props}
    />
  );
}

export interface AttachmentMediaProps extends ComponentProps<'div'> {
  /** `icon` centers an icon or spinner; `image` crops an `img` to the square. */
  variant?: AttachmentMediaVariant | undefined;
}

export function AttachmentMedia({ className, variant = 'icon', ...props }: AttachmentMediaProps) {
  return (
    <div
      data-slot="attachment-media"
      data-variant={variant}
      className={cn('sprout-attachment-media', className)}
      {...props}
    />
  );
}

export function AttachmentContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="attachment-content" className={cn('sprout-attachment-content', className)} {...props} />;
}

/** A single-line name. It shimmers while the attachment uploads or processes. */
export function AttachmentTitle({ className, ...props }: ComponentProps<'span'>) {
  return <span data-slot="attachment-title" className={cn('sprout-attachment-title', className)} {...props} />;
}

export function AttachmentDescription({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span data-slot="attachment-description" className={cn('sprout-attachment-description', className)} {...props} />
  );
}

/** Sits above the trigger. Vertical attachments float it over the media corner. */
export function AttachmentActions({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="attachment-actions" className={cn('sprout-attachment-actions', className)} {...props} />;
}

/** A ghost `icon-xs` Button. Give icon-only actions an `aria-label`. */
export function AttachmentAction({ variant, size = 'icon-xs', ...props }: ButtonProps) {
  return <Button data-slot="attachment-action" variant={variant ?? 'ghost'} size={size} {...props} />;
}

export type AttachmentTriggerProps = useRender.ComponentProps<'button'>;

/** Stretches over the whole attachment so a click anywhere opens it. Name it with `aria-label`. */
export function AttachmentTrigger({ className, render, type, ...props }: AttachmentTriggerProps) {
  return useRender({
    defaultTagName: 'button',
    render,
    props: mergeProps<'button'>(
      {
        type: render ? type : (type ?? 'button'),
        className: cn('sprout-attachment-trigger', className),
      },
      { 'data-slot': 'attachment-trigger' } as ComponentProps<'button'>,
      props,
    ),
  });
}

export interface AttachmentGroupProps extends ComponentProps<'div'> {
  /**
   * `carousel` scrolls one row sideways with edge arrows, `grid` makes two
   * columns (three from 640px), `inline` wraps, and `list` stacks.
   */
  variant?: AttachmentGroupVariant | undefined;
}

interface ViewerEntry {
  file: () => ViewableFile | null;
  node: () => HTMLElement | null;
}

interface SharedViewer {
  register: (id: string, entry: ViewerEntry) => () => void;
  open: (id: string) => void;
}

const SharedViewerContext = createContext<SharedViewer | null>(null);

interface OpenSet {
  ids: string[];
  files: ViewableFile[];
  index: number;
}

const byDocumentOrder = (a: { node: HTMLElement | null }, b: { node: HTMLElement | null }) =>
  a.node && b.node && a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1;

/** One FileViewer for every viewable attachment in a group, stepping through them in page order. */
function SharedFileViewer({ children }: { children: ReactNode }) {
  const entries = useRef(new Map<string, ViewerEntry>());
  const [set, setSet] = useState<OpenSet | null>(null);
  const [open, setOpen] = useState(false);
  const shared = useMemo<SharedViewer>(
    () => ({
      register(id, entry) {
        entries.current.set(id, entry);
        return () => entries.current.delete(id);
      },
      open(id) {
        const ordered = [...entries.current]
          .map(([key, entry]) => ({
            id: key,
            file: entry.file(),
            node: entry.node(),
          }))
          .filter((item): item is typeof item & { file: ViewableFile } => item.file !== null)
          .sort(byDocumentOrder);
        const index = ordered.findIndex(item => item.id === id);
        if (index < 0) return;
        setSet({
          ids: ordered.map(item => item.id),
          files: ordered.map(item => item.file),
          index,
        });
        setOpen(true);
      },
    }),
    [],
  );
  const current = set && entries.current.get(set.ids[set.index] ?? '');
  return (
    <SharedViewerContext.Provider value={shared}>
      {children}
      {set && (
        <FileViewer
          files={set.files}
          index={set.index}
          onIndexChange={index => setSet({ ...set, index })}
          open={open}
          onOpenChange={setOpen}
          finalFocus={() => current?.node()?.querySelector<HTMLElement>('button.sprout-file-attachment-open') ?? true}
        />
      )}
    </SharedViewerContext.Provider>
  );
}

export function AttachmentGroup(props: AttachmentGroupProps) {
  return (
    <SharedFileViewer>
      <AttachmentGroupFrame {...props} />
    </SharedFileViewer>
  );
}

function AttachmentGroupFrame({ className, variant = 'carousel', children, ...props }: AttachmentGroupProps) {
  if (variant === 'carousel')
    return (
      <AttachmentCarousel className={className} {...props}>
        {children}
      </AttachmentCarousel>
    );
  return (
    <div
      data-slot="attachment-group"
      data-variant={variant}
      role={props['aria-label'] || props['aria-labelledby'] ? 'group' : undefined}
      className={cn('sprout-attachment-group', `sprout-attachment-group-${variant}`, className)}
      {...props}
    >
      {children}
    </div>
  );
}

const typing = 'input, textarea, select, [contenteditable="true"]';

function AttachmentCarousel({ className, children, onKeyDownCapture, ...props }: ComponentProps<'div'>) {
  const viewport = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const node = viewport.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    const start = node.scrollLeft > 1;
    const end = node.scrollLeft < max - 1;
    setEdges(current => (current.start === start && current.end === end ? current : { start, end }));
  }, []);

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    return () => observer.disconnect();
  }, [measure]);

  const scroll = (direction: -1 | 1) => {
    const node = viewport.current;
    if (node) node.scrollBy({ left: direction * node.clientWidth * 0.8 });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDownCapture?.(event);
    if (event.defaultPrevented) return;
    if ((event.target as Element).closest(typing)) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      scroll(event.key === 'ArrowLeft' ? -1 : 1);
    }
  };

  return (
    <div
      data-slot="attachment-group"
      data-variant="carousel"
      role="region"
      aria-roledescription="carousel"
      className={cn('sprout-attachment-group', 'sprout-attachment-group-carousel', className)}
      onKeyDownCapture={handleKeyDown}
      {...props}
    >
      <div ref={viewport} className="sprout-attachment-carousel-viewport" onScroll={measure}>
        <div className="sprout-attachment-carousel-track">
          {Children.map(children, child =>
            child == null || child === false ? null : (
              <div role="group" aria-roledescription="slide" className="sprout-attachment-carousel-item">
                {child}
              </div>
            ),
          )}
        </div>
      </div>
      {edges.start && (
        <span className="sprout-attachment-carousel-edge" data-side="start">
          <Button
            variant="outline"
            size="icon-xs"
            aria-label="Previous attachments"
            tabIndex={-1}
            className="sprout-attachment-carousel-arrow"
            onClick={() => scroll(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
        </span>
      )}
      {edges.end && (
        <span className="sprout-attachment-carousel-edge" data-side="end">
          <Button
            variant="outline"
            size="icon-xs"
            aria-label="Next attachments"
            tabIndex={-1}
            className="sprout-attachment-carousel-arrow"
            onClick={() => scroll(1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </span>
      )}
    </div>
  );
}

export interface FileTypeIconProps extends Omit<ComponentProps<'svg'>, 'children'> {
  name: string;
  mediaType: string;
  /** `sm` is 20 × 24px for rows and chips; `lg` is 30 × 36px for grid previews. */
  size?: FileTypeIconSize | undefined;
}

/** A paper glyph with a colored extension badge, such as PDF or XLSX. Decorative. */
export function FileTypeIcon({ name, mediaType, size = 'sm', className, ...props }: FileTypeIconProps) {
  const label = name.includes('.') ? (name.split('.').at(-1) ?? '').toUpperCase().slice(0, 4) : '';
  const badgeWidth = label.length > 3 ? 13 : 11;
  return (
    <svg
      viewBox="0 0 20 24"
      aria-hidden="true"
      focusable="false"
      data-slot="file-type-icon"
      data-size={size}
      data-kind={fileKind(name, mediaType)}
      className={cn('sprout-file-type-icon', `sprout-file-type-icon-size-${size}`, className)}
      {...props}
    >
      <path
        d="M3.5 1.5h9l4.5 4.5v16a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-20a.5.5 0 0 1 .5-.5Z"
        className="sprout-file-type-icon-paper"
        strokeLinejoin="round"
      />
      <path d="M12.5 1.5v4a.5.5 0 0 0 .5.5h4" className="sprout-file-type-icon-fold" strokeLinejoin="round" />
      <path d="M6 15h8M6 17.5h8M6 20h5" className="sprout-file-type-icon-lines" strokeLinecap="round" />
      {label && (
        <>
          <rect x="1" y="6" width={badgeWidth} height="6" rx="1.5" className="sprout-file-type-icon-badge" />
          <text
            x={1 + badgeWidth / 2}
            y="10.4"
            textAnchor="middle"
            fontSize="4.2"
            fontWeight="700"
            className="sprout-file-type-icon-label"
          >
            {label}
          </text>
        </>
      )}
    </svg>
  );
}

export type AttachmentFileSource = { kind: 'local'; file: File } | { kind: 'remote'; url: string };

export interface AttachmentFile {
  id: string;
  name: string;
  mediaType: string;
  /** A formatted size or a short source line, such as “48 KB” or “Google Drive”. */
  size: string;
  /** An image preview URL. */
  url?: string | undefined;
  source?: AttachmentFileSource | undefined;
  state: FileAttachmentState;
}

export interface FileAttachmentProps {
  file: AttachmentFile;
  variant?: FileAttachmentVariant | undefined;
  onRemove?: (() => void) | undefined;
  onRetry?: (() => void) | undefined;
  /** Opens the file your own way, instead of `viewable`. Disabled while the file uploads or processes. */
  onOpen?: (() => void) | undefined;
  /**
   * Opens the file in the full-screen `FileViewer` on click. Needs a
   * `source` or `url`. Wrap the app in `FileRenderersProvider` to view
   * sheets, Office files, and formatted Markdown.
   */
  viewable?: boolean | undefined;
  /** Peeks at images, text, code, JSON, and Markdown in a card on hover or focus. Needs a `source` or `url`. */
  preview?: boolean | undefined;
  /** The verb in the open button's name, such as “Download report.pdf”. */
  actionLabel?: 'Inspect' | 'Download' | undefined;
  className?: string | undefined;
}

function AttachmentImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className="sprout-attachment-image-failed">
      <Image size={16} aria-hidden="true" />
      Image unavailable
    </span>
  ) : (
    <img src={src} alt={name} onError={() => setFailed(true)} className="sprout-attachment-image" />
  );
}

function viewableFile(file: AttachmentFile): ViewableFile | null {
  const source = file.source ?? (file.url ? { kind: 'remote' as const, url: file.url } : null);
  return source && { name: file.name, mediaType: file.mediaType, source };
}

function stateLabelFor(file: AttachmentFile) {
  return file.state === 'ready'
    ? file.size
    : file.state === 'error'
      ? 'Upload failed'
      : file.state === 'uploading'
        ? 'Uploading…'
        : 'Processing…';
}

/** A ready-made file row, card, inline mention, or chip with upload states, retry, and remove. */
export function FileAttachment({
  file,
  variant = 'list',
  onRemove,
  onRetry,
  onOpen,
  viewable = false,
  preview = false,
  actionLabel = 'Inspect',
  className,
}: FileAttachmentProps) {
  const [open, setOpen] = useState(false);
  const shared = useContext(SharedViewerContext);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const image = fileKind(file.name, file.mediaType) === 'image';
  const busy = file.state === 'uploading' || file.state === 'processing';
  const stateLabel = stateLabelFor(file);
  const target = viewable || preview ? viewableFile(file) : null;
  const inViewer = !onOpen && viewable && target !== null;
  const openable = !!onOpen || inViewer;
  const peek = preview && target !== null && file.state !== 'error' && isPreviewableFile(target);
  const latest = useRef(target);
  latest.current = inViewer ? target : null;
  useEffect(
    () =>
      shared && inViewer
        ? shared.register(id, {
            file: () => latest.current,
            node: () => root.current,
          })
        : undefined,
    [shared, inViewer, id],
  );
  const withPreview = (trigger: ReactElement) =>
    peek ? (
      <HoverCard>
        <HoverCardTrigger delay={400} closeDelay={150} render={trigger} />
        <HoverCardContent side="top" align="start" className="sprout-file-attachment-peek">
          <FilePreview file={target} />
        </HoverCardContent>
      </HoverCard>
    ) : (
      trigger
    );
  const openLabel = `${actionLabel} ${file.name}`;
  const openProps = {
    type: 'button' as const,
    disabled: !!onOpen && busy,
    onClick: () => (onOpen ? onOpen() : shared ? shared.open(id) : setOpen(true)),
  };
  const retry = file.state === 'error' && onRetry && (
    <Button variant="ghost" size="sm" onClick={onRetry} aria-label={`Retry ${file.name}`}>
      Retry
    </Button>
  );
  const remove = (size: 'icon-xs' | 'icon-sm') =>
    onRemove && (
      <Button variant="ghost" size={size} aria-label={`Remove ${file.name}`} onClick={onRemove}>
        <X size={14} aria-hidden="true" />
      </Button>
    );
  const viewer = inViewer && !shared && <FileViewer file={target} open={open} onOpenChange={setOpen} />;

  if (variant === 'chip') {
    const inner = (
      <>
        {image && file.url ? (
          <span className="sprout-file-attachment-thumb">
            <AttachmentImage key={file.url} src={file.url} name={file.name} />
          </span>
        ) : (
          <FileTypeIcon name={file.name} mediaType={file.mediaType} />
        )}
        <span className="sprout-file-attachment-name">{file.name}</span>
      </>
    );
    return (
      <>
        <div
          ref={root}
          data-slot="file-attachment"
          data-variant="chip"
          data-state={file.state}
          data-removable={onRemove ? '' : undefined}
          className={cn('sprout-file-attachment', className)}
          title={openable ? undefined : `${file.name} · ${stateLabel}`}
        >
          {withPreview(
            openable ? (
              <button
                {...openProps}
                aria-label={openLabel}
                title={peek ? undefined : `${file.name} · ${stateLabel}`}
                className="sprout-file-attachment-open"
              >
                {inner}
              </button>
            ) : (
              <span className="sprout-file-attachment-open">{inner}</span>
            ),
          )}
          {busy && <Spinner aria-label={stateLabel} />}
          {retry}
          {remove('icon-xs')}
        </div>
        {viewer}
      </>
    );
  }

  const name = (
    <>
      <span className="sprout-file-attachment-name" title={file.name}>
        {file.name}
      </span>
      {variant !== 'inline' && (
        <span className="sprout-file-attachment-status">
          {busy && <Spinner size="sm" aria-hidden="true" />}
          {stateLabel}
        </span>
      )}
    </>
  );
  const thumbnail =
    image && file.url ? (
      <AttachmentImage key={file.url} src={file.url} name={file.name} />
    ) : (
      <FileTypeIcon name={file.name} mediaType={file.mediaType} size="lg" />
    );

  return (
    <>
      <div
        ref={root}
        data-slot="file-attachment"
        data-variant={variant}
        data-state={file.state}
        className={cn('sprout-file-attachment', className)}
      >
        {variant === 'grid' &&
          (openable ? (
            <button {...openProps} tabIndex={-1} aria-hidden="true" className="sprout-file-attachment-preview">
              {thumbnail}
            </button>
          ) : (
            <span className="sprout-file-attachment-preview">{thumbnail}</span>
          ))}
        {variant !== 'grid' && (
          <span className="sprout-file-attachment-media">
            {image && file.url && variant === 'list' ? (
              <AttachmentImage key={file.url} src={file.url} name={file.name} />
            ) : (
              <FileTypeIcon name={file.name} mediaType={file.mediaType} />
            )}
          </span>
        )}
        {withPreview(
          openable ? (
            <button {...openProps} aria-label={openLabel} className="sprout-file-attachment-open">
              {name}
            </button>
          ) : (
            <span className="sprout-file-attachment-open">{name}</span>
          ),
        )}
        {variant === 'inline' && busy && <Spinner aria-label={stateLabel} />}
        {variant === 'inline' && file.state === 'error' && (
          <span className="sprout-file-attachment-failed">Failed</span>
        )}
        {(retry || onRemove) && (
          <div className="sprout-file-attachment-actions">
            {retry}
            {remove('icon-sm')}
          </div>
        )}
      </div>
      {viewer}
    </>
  );
}

export interface AttachmentDropzoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean | undefined;
  /** File types the picker offers. Defaults to documents, sheets, slides, PDF, text, Google shortcuts, and images. */
  accept?: string | undefined;
  className?: string | undefined;
}

/** A dashed drop target with a “Choose files” button. Files are handed to `onFiles`; nothing is uploaded. */
export function AttachmentDropzone({
  onFiles,
  disabled = false,
  accept = defaultFileAccept,
  className,
}: AttachmentDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const over = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
    if (!disabled) setDragging(true);
  };
  return (
    <div
      data-slot="attachment-dropzone"
      data-dragging={dragging ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      className={cn('sprout-attachment-dropzone', className)}
      onDragEnter={over}
      onDragOver={over}
      onDragLeave={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={event => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) onFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple
        hidden
        disabled={disabled}
        onChange={event => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      <Upload size={20} aria-hidden="true" className="sprout-attachment-dropzone-icon" />
      <p className="sprout-attachment-dropzone-text">Drop files here, or choose them from your device.</p>
      <Button variant="outline" disabled={disabled} onClick={() => input.current?.click()}>
        Choose files
      </Button>
    </div>
  );
}

export interface LocalFileAttachmentProps {
  file: File;
  onRemove?: (() => void) | undefined;
  onOpen?: (() => void) | undefined;
  viewable?: boolean | undefined;
  preview?: boolean | undefined;
}

/** A chip for a `File` still in browser memory, with a live image preview. */
export function LocalFileAttachment({ file, onRemove, onOpen, viewable, preview }: LocalFileAttachmentProps) {
  const [url, setUrl] = useState<string>();
  const source = useMemo<AttachmentFileSource>(() => ({ kind: 'local', file }), [file]);
  useEffect(() => {
    if (fileKind(file.name, file.type) !== 'image') return;
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return (
    <FileAttachment
      variant="chip"
      file={{
        id: `${file.name}-${file.lastModified}`,
        name: file.name,
        mediaType: file.type,
        size: formatFileSize(file.size),
        state: 'ready',
        source,
        url,
      }}
      onRemove={onRemove}
      onOpen={onOpen}
      viewable={viewable}
      preview={preview}
    />
  );
}
