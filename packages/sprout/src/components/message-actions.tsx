'use client';

import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Check } from 'reicon-react/icons/Check';
import { ChevronLeft } from 'reicon-react/icons/ChevronLeft';
import { ChevronRight } from 'reicon-react/icons/ChevronRight';
import { Copy3 } from 'reicon-react/icons/Copy3';
import { RotateRight } from 'reicon-react/icons/RotateRight';
import { ThumbsDown } from 'reicon-react/icons/ThumbsDown';
import { ThumbsUp } from 'reicon-react/icons/ThumbsUp';
import { cn } from '../internal/classes.js';
import { Button } from './button.js';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card.js';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip.js';

export const messageActionsAuthorNames = ['assistant', 'human'] as const;

export type MessageActionsAuthor = (typeof messageActionsAuthorNames)[number];

export type MessageFeedback = 'up' | 'down';

/** How a response was produced, shown when the send time is hovered or focused. */
export interface MessageActionsStats {
  /** Display name of the model that wrote the response. */
  model?: string | undefined;
  /** Milliseconds from sending to the first streamed word. */
  firstTokenMs?: number | undefined;
  /** Milliseconds from sending to the end of the response. */
  durationMs?: number | undefined;
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  /** Trace to look the response up by, shown in a monospace font so it can be selected. */
  traceId?: string | undefined;
}

export interface MessageActionsProps {
  /** The Markdown the message was written in. Copy turns links into `label (url)` plain text. */
  text: string;
  /** Names the actions "Message" for `"human"` and "Response" for `"assistant"`. */
  author?: MessageActionsAuthor;
  /** ISO time the message was sent, shown last as a short local time with the full date on hover. */
  createdAt?: string | undefined;
  /** Timing, model, and usage details listed under the full date when the time is hovered. */
  stats?: MessageActionsStats | undefined;
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

function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`;
}

const formatCount = (value: number) => new Intl.NumberFormat().format(value);

function statRows(stats: MessageActionsStats) {
  const rows: [string, ReactNode][] = [];
  const { model, firstTokenMs, durationMs, inputTokens, outputTokens, traceId } = stats;
  if (model) rows.push(['Model', model]);
  if (firstTokenMs !== undefined) rows.push(['First word', formatDuration(firstTokenMs)]);
  if (durationMs !== undefined) rows.push(['Total time', formatDuration(durationMs)]);
  if (inputTokens !== undefined || outputTokens !== undefined)
    rows.push([
      'Tokens',
      [
        inputTokens !== undefined && `${formatCount(inputTokens)} in`,
        outputTokens !== undefined && `${formatCount(outputTokens)} out`,
      ]
        .filter(Boolean)
        .join(' · '),
    ]);
  const writingMs = durationMs !== undefined ? durationMs - (firstTokenMs ?? 0) : 0;
  if (outputTokens !== undefined && writingMs > 0)
    rows.push(['Speed', `${formatCount(Math.round(outputTokens / (writingMs / 1000)))} tokens/s`]);
  if (traceId) rows.push(['Trace', <code className="sprout-message-actions-trace">{traceId}</code>]);
  return rows;
}

function MessageTime({
  createdAt,
  stats,
  align,
}: {
  createdAt: string;
  stats?: MessageActionsStats | undefined;
  align: 'start' | 'end';
}) {
  const rows = stats ? statRows(stats) : [];
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={300}
        closeDelay={150}
        render={<time tabIndex={0} dateTime={createdAt} className="sprout-message-actions-time" />}
      >
        {messageTime(createdAt)}
      </HoverCardTrigger>
      <HoverCardContent side="top" align={align} className="sprout-message-actions-stats">
        <p className="sprout-message-actions-stats-date">
          {formatDate({ dateStyle: 'full', timeStyle: 'medium' }, new Date(createdAt))}
        </p>
        {rows.length > 0 && (
          <dl>
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function ActionButton({ label, ...props }: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger delay={400} render={<Button variant="ghost" size="icon-sm" {...props} />} />
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

/** Copy, feedback, regenerate, and send time for one chat message. */
export function MessageActions({
  text,
  author = 'assistant',
  createdAt,
  stats,
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
  useEffect(() => {
    if (copy !== 'copied') return;
    const timer = setTimeout(() => setCopy('idle'), 2000);
    return () => clearTimeout(timer);
  }, [copy]);
  const rate = (value: MessageFeedback) => onFeedback?.(feedback === value ? null : value);
  return (
    <div
      data-slot="message-actions"
      data-author={author}
      data-hover={hover ? '' : undefined}
      className={cn('sprout-message-actions', className)}
    >
      <div
        role="group"
        aria-label={`${Noun} actions`}
        data-hover={hover ? '' : undefined}
        className="sprout-message-actions-row"
      >
        <ActionButton
          label={copy === 'copied' ? 'Copied' : 'Copy'}
          disabled={disabled}
          aria-label={copy === 'copied' ? `${Noun} copied` : `Copy ${noun}`}
          data-copied={copy === 'copied' ? '' : undefined}
          onClick={() => void copyText()}
        >
          {copy === 'copied' ? <Check size={16} aria-hidden="true" /> : <Copy3 size={16} aria-hidden="true" />}
        </ActionButton>
        {onFeedback && (
          <>
            <ActionButton
              label="Helpful"
              disabled={disabled}
              aria-label="Helpful response"
              aria-pressed={feedback === 'up'}
              onClick={() => rate('up')}
            >
              <ThumbsUp size={16} aria-hidden="true" />
            </ActionButton>
            <ActionButton
              label="Unhelpful"
              disabled={disabled}
              aria-label="Unhelpful response"
              aria-pressed={feedback === 'down'}
              onClick={() => rate('down')}
            >
              <ThumbsDown size={16} aria-hidden="true" />
            </ActionButton>
          </>
        )}
        {onRetry && (
          <ActionButton label="Regenerate" disabled={disabled} aria-label="Regenerate response" onClick={onRetry}>
            <RotateRight size={16} aria-hidden="true" />
          </ActionButton>
        )}
        {createdAt && (
          // The card grows away from the screen edge the message sits on.
          <MessageTime createdAt={createdAt} stats={stats} align={author === 'human' ? 'end' : 'start'} />
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
