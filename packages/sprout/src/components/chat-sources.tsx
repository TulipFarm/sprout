'use client';

import { useRef, type ComponentProps } from 'react';
import { ArrowUpRight } from 'reicon-react/icons/ArrowUpRight';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { FileText } from 'reicon-react/icons/FileText';
import { cn } from '../internal/classes.js';
import { Button } from './button.js';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible.js';
import { Popover, PopoverContent, PopoverTrigger } from './popover.js';
import { Spinner } from './spinner.js';

export type ChatSource = {
  id: string;
  title: string;
  /** Where the passage lives, such as a collection or a heading. */
  location: string;
  excerpt: string;
  /** Opens the source in a new tab. */
  href: string;
};

const hoverDelay = 300;
const hoverCloseDelay = 150;

function hostOf(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function SourceContent({ source, number }: { source: ChatSource; number?: number }) {
  const host = number === undefined ? null : hostOf(source.href);
  return (
    <div data-slot="chat-source" className="sprout-chat-sources-source">
      {number !== undefined && (
        <p className="sprout-chat-sources-preview-head">
          <span className="sprout-chat-sources-badge" aria-hidden="true">
            {number}
          </span>
          <span>{host ?? `Source ${number}`}</span>
        </p>
      )}
      <p className="sprout-chat-sources-title">{source.title}</p>
      <p className="sprout-chat-sources-location">{source.location}</p>
      <p className="sprout-chat-sources-excerpt">{source.excerpt}</p>
      <a href={source.href} target="_blank" rel="noopener noreferrer" className="sprout-chat-sources-link">
        Open source
        <ArrowUpRight size={14} aria-hidden="true" />
        <span className="sprout-chat-sources-sr-only"> in a new tab</span>
      </a>
    </div>
  );
}

export interface InlineCitationProps {
  source: ChatSource;
  /** The citation number shown in the reply and in the sources list. */
  number: number;
}

/**
 * A numbered citation inside a reply. Hovering, clicking, tapping, or pressing
 * Enter shows the cited passage and where it comes from.
 */
export function InlineCitation({ source, number }: InlineCitationProps) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={hoverDelay}
        closeDelay={hoverCloseDelay}
        data-slot="inline-citation"
        className="sprout-chat-sources-citation"
        render={<Button variant="secondary" size="icon-xs" aria-label={`Source ${number}: ${source.title}`} />}
      >
        {number}
      </PopoverTrigger>
      <PopoverContent className="sprout-chat-sources-preview">
        <SourceContent source={source} number={number} />
      </PopoverContent>
    </Popover>
  );
}

export interface ChatSourcesProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** Sources in citation order. With none, it says no sources were used. */
  sources: readonly ChatSource[];
  /** Start with the list open. */
  defaultOpen?: boolean | undefined;
}

/**
 * The sources a reply used. A count opens the numbered list; numbers match
 * each `InlineCitation`.
 */
export function ChatSources({ sources, defaultOpen, className, ...props }: ChatSourcesProps) {
  if (sources.length === 0)
    return (
      <div data-slot="chat-sources" data-empty="" {...props} className={cn('sprout-chat-sources', className)}>
        <p className="sprout-chat-sources-empty">No sources were used for this response.</p>
      </div>
    );
  return (
    <Collapsible
      data-slot="chat-sources"
      defaultOpen={defaultOpen}
      {...props}
      className={cn('sprout-chat-sources', className)}
    >
      <CollapsibleTrigger className="sprout-chat-sources-trigger">
        <FileText size={16} aria-hidden="true" />
        <span>
          {sources.length} {sources.length === 1 ? 'source' : 'sources'}
        </span>
        <ChevronDown size={14} aria-hidden="true" data-slot="collapsible-indicator" />
      </CollapsibleTrigger>
      <CollapsibleContent variant="sidebar">
        <ol className="sprout-chat-sources-list">
          {sources.map((source, index) => (
            <li key={source.id} className="sprout-chat-sources-item">
              <span className="sprout-chat-sources-number">{index + 1}</span>
              <SourceContent source={source} />
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}

export const citationStateKindNames = ['idle', 'loading', 'ready', 'unavailable', 'error'] as const;

export type CitationStateKind = (typeof citationStateKindNames)[number];

export type CitationState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; title: string; location: string; excerpt: string }
  | { kind: 'unavailable'; message: string }
  | { kind: 'error'; message: string };

export interface CheckedCitationProps {
  /** The linked words in the reply. */
  label: string;
  state: CitationState;
  /** Called each time the passage opens, to check access again. */
  onOpen: () => void;
  /** Called by “Load source again” after an error. */
  onRetry: () => void;
}

/**
 * A citation link whose passage is checked each time it opens, on hover or
 * click. While checking it shows a spinner; an unavailable source never shows
 * an old passage.
 */
export function CheckedCitation({ label, state, onOpen, onRetry }: CheckedCitationProps) {
  const popup = useRef<HTMLDivElement>(null);
  const openReason = useRef<string | undefined>(undefined);
  return (
    <Popover
      onOpenChange={(open, details) => {
        if (open) {
          openReason.current = details.reason;
          onOpen();
          return;
        }
        // Base UI keeps a hover-close timer from before a reopen; a passage
        // opened by click or keyboard closes only by click, Escape, or outside press.
        if (details.reason === 'trigger-hover' && openReason.current === 'trigger-press') details.cancel();
      }}
    >
      <PopoverTrigger
        openOnHover
        delay={hoverDelay}
        closeDelay={hoverCloseDelay}
        data-slot="checked-citation"
        className="sprout-chat-sources-checked"
        render={<Button variant="link" aria-label={`Source: ${label}`} />}
      >
        {label}
      </PopoverTrigger>
      <PopoverContent ref={popup} data-citation-state={state.kind} className="sprout-chat-sources-preview">
        {state.kind === 'idle' || state.kind === 'loading' ? (
          <p role="status" className="sprout-chat-sources-checking">
            <Spinner aria-hidden="true" />
            Checking access to this source…
          </p>
        ) : state.kind === 'ready' ? (
          <div data-slot="chat-source" className="sprout-chat-sources-source">
            <p className="sprout-chat-sources-title">{state.title}</p>
            <p className="sprout-chat-sources-location">{state.location}</p>
            <p className="sprout-chat-sources-excerpt" data-preserve-lines="">
              {state.excerpt}
            </p>
          </div>
        ) : (
          <div className="sprout-chat-sources-source">
            <p className="sprout-chat-sources-title">
              {state.kind === 'unavailable' ? 'Source unavailable' : 'Couldn’t load this source'}
            </p>
            <p role="alert" className="sprout-chat-sources-excerpt">
              {state.message}
            </p>
            {state.kind === 'error' && (
              <Button
                variant="outline"
                size="sm"
                className="sprout-chat-sources-retry"
                onClick={() => {
                  // The button leaves as loading starts; keep focus in the passage.
                  popup.current?.focus();
                  onRetry();
                }}
              >
                Load source again
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
