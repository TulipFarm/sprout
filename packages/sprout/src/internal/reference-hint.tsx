import type { ReactNode } from 'react';
import { BookOpen } from 'reicon-react/icons/BookOpen';
import { FileText } from 'reicon-react/icons/FileText';
import { User } from 'reicon-react/icons/User';
import { FilePreview, isPreviewableFile, type ViewableFile } from '../components/file-viewer.js';
import { HoverCardContent, type HoverCardContentProps } from '../components/hover-card.js';
import type { ChatReferenceKind } from './chat-reference.js';

/** A tagged agent, skill, or file as stored in a message. */
export interface ChatReferenceDetail {
  kind: ChatReferenceKind;
  id: string;
  label: string;
  description?: string | undefined;
}

/** What the app knows about a tagged item beyond the message: its icon, and for files, the file itself. */
export interface ChatReferenceResolved {
  media?: ReactNode;
  file?: ViewableFile | undefined;
}

const fallbackIcons = { agent: User, skill: BookOpen } as const;

/** What an `@` or `/` chip says on hover, in the composer and in sent messages alike. */
export function ReferenceHintBody({ reference, media }: { reference: ChatReferenceDetail; media?: ReactNode }) {
  const Fallback = reference.kind === 'file' ? FileText : fallbackIcons[reference.kind];
  return (
    <>
      <span className="sprout-rich-text-keyword-hint-icon" aria-hidden="true">
        {media ?? <Fallback size={16} />}
      </span>
      <span className="sprout-rich-text-keyword-hint-label">{reference.label}</span>
      {reference.description && <span className="sprout-rich-text-keyword-hint-account">{reference.description}</span>}
    </>
  );
}

/** A `#` chip's hover card: a peek at the file, the same as an attachment chip shows. */
export function ReferencePeek({
  file,
  anchor,
  ...props
}: { file: ViewableFile; anchor?: HoverCardContentProps['anchor'] } & {
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  return (
    <HoverCardContent
      side="top"
      align="start"
      anchor={anchor}
      className="sprout-file-attachment-peek"
      data-slot="chat-reference-peek"
      {...props}
    >
      <FilePreview file={file} />
    </HoverCardContent>
  );
}

/** Which hover a reference chip gets: a file peek, a name card, or none for a file the app can't show. */
export function referenceHover(reference: ChatReferenceDetail, resolved: ChatReferenceResolved | undefined) {
  if (reference.kind !== 'file') return 'hint';
  return resolved?.file && isPreviewableFile(resolved.file) ? 'peek' : null;
}

/** Reads a reference chip's stored details from its element or node attributes. */
export function referenceDetail(attrs: Record<string, unknown> | undefined): ChatReferenceDetail {
  const kind = String(attrs?.kind ?? 'file') as ChatReferenceKind;
  return {
    kind,
    id: String(attrs?.id ?? ''),
    label: String(attrs?.label ?? ''),
    description: attrs?.description ? String(attrs.description) : undefined,
  };
}
