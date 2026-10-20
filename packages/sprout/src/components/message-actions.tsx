'use client';

import { useState } from 'react';
import { Check } from 'reicon-react/icons/Check';
import { ChevronLeft } from 'reicon-react/icons/ChevronLeft';
import { ChevronRight } from 'reicon-react/icons/ChevronRight';
import { Copy } from 'reicon-react/icons/Copy';
import { ThumbsDown } from 'reicon-react/icons/ThumbsDown';
import { ThumbsUp } from 'reicon-react/icons/ThumbsUp';
import { cn } from '../internal/classes.js';
import { Button } from './button.js';

export const messageActionsAuthorNames = ['assistant', 'human'] as const;

export type MessageActionsAuthor = (typeof messageActionsAuthorNames)[number];

export type MessageFeedback = 'up' | 'down';

export interface MessageActionsProps {
  /** The Markdown the message was written in. Copy turns links into `label (url)` plain text. */
  text: string;
  /** Names the actions "Message" for `"human"` and "Response" for `"assistant"`. */
  author?: MessageActionsAuthor;
  /** ISO time the message was sent, shown as a short local time with the full date on hover. */
  createdAt?: string | undefined;
  /** Returns formatted HTML to copy beside the plain text, read when Copy is pressed. */
  html?: (() => string | undefined) | undefined;
  /** Hides the row until the surrounding Message is hovered or anything in it has focus. */
  hover?: boolean;
  /** The rating already given. Pressing it again clears it. */
  feedback?: MessageFeedback | null | undefined;
  /** Shows Helpful and Unhelpful toggles. */
  onFeedback?: ((value: MessageFeedback | null) => void) | undefined;
  /** Shows a Regenerate button. */
  onRetry?: (() => void) | undefined;
  disabled?: boolean;
  className?: string | undefined;
}

const markdownLink = /\[([^\]]*)\]\(<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/g;

function plainTextFromMarkdown(markdown: string) {
  return markdown
    .replace(markdownLink, (_, label: string, url: string) => (!label || label === url ? url : `${label} (${url})`))
    .replace(/<(https?:\/\/[^>\s]+)>/g, '$1');
}

function formatDate(options: Intl.DateTimeFormatOptions, date: Date) {
  return Number.isNaN(date.getTime()) ? date.toString() : new Intl.DateTimeFormat([], options).format(date);
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

function messageTime(iso: string, now = new Date()) {
  const date = new Date(iso);
  const time = formatDate({ hour: 'numeric', minute: '2-digit' }, date);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return time;
  if (days === 1) return `Yesterday ${time}`;
  const day = formatDate(
    date.getFullYear() === now.getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' },
    date,
  );
  return `${day}, ${time}`;
}

/** Copy, send time, feedback, and regenerate for one chat message. */
export function MessageActions({
  text,
  author = 'assistant',
  createdAt,
  html,
  hover = false,
  feedback,
  onFeedback,
  onRetry,
  disabled = false,
  className,
}: MessageActionsProps) {
  const [copy, setCopy] = useState<'idle' | 'copied' | 'error'>('idle');
  const noun = author === 'human' ? 'message' : 'response';
  const Noun = author === 'human' ? 'Message' : 'Response';
  const copyText = async () => {
    const plain = plainTextFromMarkdown(text);
    const rich = html?.();
    try {
      if (rich && typeof ClipboardItem !== 'undefined')
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([rich], { type: 'text/html' }),
            'text/plain': new Blob([plain], { type: 'text/plain' }),
          }),
        ]);
      else await navigator.clipboard.writeText(plain);
      setCopy('copied');
    } catch {
      setCopy('error');
    }
  };
  const rate = (value: MessageFeedback) => onFeedback?.(feedback === value ? null : value);
  return (
    <div data-slot="message-actions" data-author={author} className={cn('sprout-message-actions', className)}>
      <div
        role="group"
        aria-label={`${Noun} actions`}
        data-hover={hover ? '' : undefined}
        className="sprout-message-actions-row"
      >
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label={copy === 'copied' ? `${Noun} copied` : `Copy ${noun}`}
          title={`Copy ${noun}`}
          data-copied={copy === 'copied' ? '' : undefined}
          onClick={() => void copyText()}
        >
          {copy === 'copied' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        </Button>
        {createdAt && (
          <time
            className="sprout-message-actions-time"
            dateTime={createdAt}
            title={formatDate({ dateStyle: 'full', timeStyle: 'medium' }, new Date(createdAt))}
          >
            {messageTime(createdAt)}
          </time>
        )}
        {onFeedback && (
          <>
            <Button
              variant={feedback === 'up' ? 'secondary' : 'ghost'}
              size="icon-sm"
              disabled={disabled}
              aria-label="Helpful response"
              aria-pressed={feedback === 'up'}
              title="Helpful"
              onClick={() => rate('up')}
            >
              <ThumbsUp size={16} aria-hidden="true" />
            </Button>
            <Button
              variant={feedback === 'down' ? 'secondary' : 'ghost'}
              size="icon-sm"
              disabled={disabled}
              aria-label="Unhelpful response"
              aria-pressed={feedback === 'down'}
              title="Unhelpful"
              onClick={() => rate('down')}
            >
              <ThumbsDown size={16} aria-hidden="true" />
            </Button>
          </>
        )}
        {onRetry && (
          <Button variant="ghost" size="sm" disabled={disabled} onClick={onRetry}>
            Regenerate
          </Button>
        )}
      </div>
      {copy === 'error' && (
        <p role="alert" className="sprout-message-actions-error">
          Couldn't copy. Select the {noun} text or try again.
        </p>
      )}
      <span role="status" className="sprout-message-actions-sr-only">
        {copy === 'copied' ? `${Noun} copied to clipboard.` : ''}
      </span>
    </div>
  );
}

export interface MessageBranchProps {
  /** Zero-based version shown now. */
  index: number;
  total: number;
  onChange: (index: number) => void;
  className?: string | undefined;
}

/** Steps between regenerated versions of one response. */
export function MessageBranch({ index, total, onChange, className }: MessageBranchProps) {
  return (
    <div
      data-slot="message-branch"
      role="group"
      aria-label="Response versions"
      className={cn('sprout-message-branch', className)}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Previous response"
        disabled={index <= 0}
        onClick={() => onChange(index - 1)}
      >
        <ChevronLeft size={14} aria-hidden="true" />
      </Button>
      <span aria-live="polite" className="sprout-message-branch-count">
        {index + 1} / {total}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Next response"
        disabled={index >= total - 1}
        onClick={() => onChange(index + 1)}
      >
        <ChevronRight size={14} aria-hidden="true" />
      </Button>
    </div>
  );
}
