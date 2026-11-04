import { Fragment, useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react';
import { LinkOff } from 'reicon-react/icons/LinkOff';
import { chatReferenceChars } from '../internal/chat-reference.js';
import { cn } from '../internal/classes.js';
import { KeywordHintBody } from '../internal/keyword-hint.js';
import {
  ReferenceHintBody,
  ReferencePeek,
  referenceDetail,
  referenceHover,
  type ChatReferenceDetail,
  type ChatReferenceResolved,
} from '../internal/reference-hint.js';
import {
  hasHint,
  keywordPattern,
  objectReplacement,
  scanText,
  type KeywordHit,
  type KeywordPattern,
} from '../internal/keywords.js';
import type { RichTextKeyword, RichTextValue } from './rich-text-editor.js';
import { FileViewer } from './file-viewer.js';
import { HoverCard, HoverCardTrigger } from './hover-card.js';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip.js';

export interface MessageRichTextProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** A message as `ChatInput` or `RichTextEditor` sent it. */
  value: RichTextValue;
  /** The same keywords given to the composer, so sent messages show the same chips. */
  keywords?: readonly RichTextKeyword[] | undefined;
  /** The account each keyword was sent with, from `keywordAccounts`. It wins over the keyword's current account. */
  accounts?: Readonly<Record<string, string>> | undefined;
  /**
   * Looks up a tagged agent, skill, or file, such as the suggestion it was picked from. Its `media` shows in
   * the hover card. A file's `file` lets its chip peek on hover and open in `FileViewer` on click.
   */
  resolveReference?:
    | ((reference: MessageRichTextReference) => MessageRichTextResolvedReference | undefined)
    | undefined;
  /**
   * Draws an inline node the component doesn't know, such as an app's own file or link chip. Keyword matching
   * treats it as one character, so a keyword never spans it. Unknown nodes are left out without it.
   */
  renderNode?: ((node: RichTextValue) => ReactNode) | undefined;
}

/** A tagged agent, skill, or file in a sent message. */
export type MessageRichTextReference = ChatReferenceDetail;
export type MessageRichTextResolvedReference = ChatReferenceResolved;

/** Hover and focus show `hint` over the chip, like the composer does. */
function ChipHint({ hint, children }: { hint: ReactNode; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger delay={150} tabIndex={0} render={<span className="sprout-message-rich-text-keyword" />}>
        {children}
      </TooltipTrigger>
      <TooltipContent className="sprout-message-rich-text-hint">{hint}</TooltipContent>
    </Tooltip>
  );
}

type Mark = { type: string; attrs?: Record<string, unknown> };

const safeHref = (href: unknown) =>
  typeof href === 'string' && /^(https?:|mailto:)/i.test(href.trim()) ? href.trim() : undefined;

function withMarks(content: ReactNode, marks: readonly Mark[] | undefined, key: string): ReactNode {
  let node = content;
  for (const mark of marks ?? []) {
    if (mark.type === 'bold') node = <strong>{node}</strong>;
    else if (mark.type === 'italic') node = <em>{node}</em>;
    else if (mark.type === 'strike') node = <s>{node}</s>;
    else if (mark.type === 'underline') node = <u>{node}</u>;
    else if (mark.type === 'code') node = <code>{node}</code>;
    else if (mark.type === 'link') {
      const href = safeHref(mark.attrs?.href);
      if (href)
        node = (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {node}
          </a>
        );
    }
  }
  return <span key={key}>{node}</span>;
}

/** The composer's chip markup and classes, so a sent chip looks exactly like the one that was typed. */
function Keyword({ keyword, children }: { keyword: RichTextKeyword; children: ReactNode }) {
  const connected = String(keyword.connected !== false);
  const style = keyword.color ? ({ '--sprout-rich-text-keyword-color': keyword.color } as CSSProperties) : undefined;
  const chip = (
    <>
      {keyword.icon != null && (
        <span
          className="sprout-rich-text-keyword-icon"
          data-keyword={keyword.id}
          data-connected={connected}
          aria-hidden="true"
        >
          <span className="sprout-rich-text-keyword-glyph">{keyword.icon}</span>
        </span>
      )}
      <span
        className="sprout-rich-text-keyword"
        data-keyword={keyword.id}
        data-connected={connected}
        data-icon={keyword.icon != null ? '' : undefined}
        data-tinted={keyword.color ? '' : undefined}
        style={style}
      >
        {children}
      </span>
      {keyword.connected === false && (
        <span
          className="sprout-rich-text-keyword-status"
          data-keyword={keyword.id}
          data-connected="false"
          aria-hidden="true"
        >
          <span className="sprout-rich-text-keyword-glyph">
            <LinkOff />
          </span>
        </span>
      )}
    </>
  );
  if (!hasHint(keyword)) return chip;
  return <ChipHint hint={<KeywordHintBody keyword={keyword} />}>{chip}</ChipHint>;
}

function plainChild(child: RichTextValue) {
  return child.type === 'text' && !child.marks?.some(mark => mark.type === 'code');
}

type Renderers = Pick<MessageRichTextProps, 'resolveReference' | 'renderNode'>;

function Reference({ reference, resolved }: { reference: ChatReferenceDetail; resolved?: ChatReferenceResolved }) {
  const [open, setOpen] = useState(false);
  const chip = (
    <span className="sprout-chat-input-reference" data-chat-reference={reference.kind} data-id={reference.id}>
      {`${chatReferenceChars[reference.kind] ?? ''}${reference.label}`}
    </span>
  );
  const hover = referenceHover(reference, resolved);
  if (hover === 'hint')
    return <ChipHint hint={<ReferenceHintBody reference={reference} media={resolved?.media} />}>{chip}</ChipHint>;
  const file = resolved?.file;
  if (!file) return chip;
  const opener = {
    type: 'button' as const,
    className: 'sprout-message-rich-text-keyword sprout-message-rich-text-file',
    onClick: () => setOpen(true),
  };
  return (
    <>
      {hover === 'peek' ? (
        <HoverCard>
          <HoverCardTrigger delay={300} closeDelay={150} render={<button {...opener} />}>
            {chip}
          </HoverCardTrigger>
          <ReferencePeek file={file} />
        </HoverCard>
      ) : (
        <button {...opener}>{chip}</button>
      )}
      <FileViewer file={file} open={open} onOpenChange={setOpen} />
    </>
  );
}

function renderInline(
  content: readonly RichTextValue[],
  pattern: KeywordPattern | null,
  renderers: Renderers,
  key: string,
) {
  const hits: KeywordHit[] = [];
  if (pattern) {
    const text = content.map(child => (plainChild(child) ? (child.text ?? '') : objectReplacement)).join('');
    scanText(text, pattern, 0, hits);
  }
  const out: ReactNode[] = [];
  let offset = 0;
  content.forEach((child, index) => {
    const childKey = `${key}.${index}`;
    if (child.type === 'text') {
      const text = child.text ?? '';
      const start = offset;
      const end = start + (plainChild(child) ? text.length : 1);
      offset = end;
      if (!plainChild(child)) return out.push(withMarks(text, child.marks as Mark[], childKey));
      let cursor = start;
      for (const hit of hits) {
        if (hit.to <= start || hit.from >= end) continue;
        const from = Math.max(hit.from, start);
        const to = Math.min(hit.to, end);
        if (from > cursor)
          out.push(withMarks(text.slice(cursor - start, from - start), child.marks as Mark[], `${childKey}.${cursor}`));
        out.push(
          <Keyword key={`${childKey}.${from}.k`} keyword={hit.keyword}>
            {withMarks(text.slice(from - start, to - start), child.marks as Mark[], 'text')}
          </Keyword>,
        );
        cursor = to;
      }
      if (cursor < end) out.push(withMarks(text.slice(cursor - start), child.marks as Mark[], `${childKey}.${cursor}`));
      return;
    }
    offset += 1;
    if (child.type === 'hardBreak') out.push(<br key={childKey} />);
    else if (child.type === 'chatReference') {
      const reference = referenceDetail(child.attrs);
      out.push(<Reference key={childKey} reference={reference} resolved={renderers.resolveReference?.(reference)} />);
    } else if (renderers.renderNode) out.push(<Fragment key={childKey}>{renderers.renderNode(child)}</Fragment>);
  });
  return out;
}

function renderBlock(
  node: RichTextValue,
  pattern: KeywordPattern | null,
  renderers: Renderers,
  key: string,
): ReactNode {
  const children = (node.content ?? []).map((child, index) =>
    renderBlock(child, pattern, renderers, `${key}.${index}`),
  );
  const inline = () => renderInline(node.content ?? [], pattern, renderers, key);
  switch (node.type) {
    case 'doc':
      return children;
    case 'paragraph':
      return <p key={key}>{inline()}</p>;
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 6);
      const Heading = `h${level}` as 'h1';
      return <Heading key={key}>{inline()}</Heading>;
    }
    case 'bulletList':
      return <ul key={key}>{children}</ul>;
    case 'orderedList':
      return (
        <ol key={key} start={Number(node.attrs?.start) || undefined}>
          {children}
        </ol>
      );
    case 'listItem':
      return <li key={key}>{children}</li>;
    case 'blockquote':
      return <blockquote key={key}>{children}</blockquote>;
    case 'codeBlock':
      return (
        <pre key={key}>
          <code>{(node.content ?? []).map(child => child.text ?? '').join('')}</code>
        </pre>
      );
    case 'horizontalRule':
      return <hr key={key} />;
    default:
      return node.content?.some(child => child.type === 'text') ? <p key={key}>{inline()}</p> : children;
  }
}

/** A sent message, with the same reference pills and keyword chips the composer showed. */
export function MessageRichText({
  value,
  keywords,
  accounts,
  resolveReference,
  renderNode,
  className,
  ...props
}: MessageRichTextProps) {
  const sent = accounts
    ? keywords?.map(keyword =>
        accounts[keyword.id] ? { ...keyword, connected: true, account: accounts[keyword.id] } : keyword,
      )
    : keywords;
  const pattern = sent?.length ? keywordPattern(sent) : null;
  return (
    <div data-slot="message-rich-text" className={cn('sprout-message-rich-text', className)} {...props}>
      {renderBlock(value, pattern, { resolveReference, renderNode }, 'n')}
    </div>
  );
}
