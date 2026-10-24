'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { Command } from 'reicon-react/icons/Command';
import { cn } from '../internal/classes.js';
import { Button } from './button.js';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible.js';
import { Spinner } from './spinner.js';
import { Status, type StatusState } from './status.js';
import { WebSource, type WebSourceIcon } from './web-source.js';

export const toolActivityStatusNames = [
  'queued',
  'running',
  'waiting',
  'completed',
  'blocked',
  'failed',
  'cancelled',
  'unknown',
] as const;

export const toolActivityVariantNames = ['collapsible', 'stepper', 'transcript'] as const;

export type ToolActivityStatus = (typeof toolActivityStatusNames)[number];
export type ToolActivityVariant = (typeof toolActivityVariantNames)[number];

export interface ToolActivitySource {
  url: string;
  title: string;
}

export interface ToolActivityItem {
  id: string;
  label: string;
  status: ToolActivityStatus;
  /** A 14px icon or `BrandIcon size="inline"` for the tool or app. */
  visual: ReactNode;
  /** One line under the label. Red when the item is `failed` or `blocked`. */
  detail?: string | undefined;
  /** Extra content under the row, lined up with the label, such as a details toggle. */
  details?: ReactNode;
  /** A compact control on the label line, such as an icon button with an `aria-label` and tooltip. */
  action?: ReactNode;
  /** Web pages the tool read. Shown as source chips. */
  urls?: readonly string[] | undefined;
  /** Pages that could not be read. Their chips show a warning. */
  failedUrls?: readonly string[] | undefined;
  /** The search text a web search used. */
  query?: string | undefined;
  /** Titles for `urls`. Chips without a title show the address. */
  sources?: readonly ToolActivitySource[] | undefined;
}

/** Returns an image address for a page's icon, or nothing to show the site's first letter. */
export type ToolActivitySourceIcon = WebSourceIcon;

const statusText: Record<ToolActivityStatus, string> = {
  queued: 'Pending',
  running: 'In progress',
  waiting: 'Waiting',
  completed: 'Completed',
  blocked: 'Access denied',
  failed: 'Failed',
  cancelled: 'Cancelled',
  unknown: 'Outcome unknown',
};

const visibleSourceCount = 4;

export interface ActivityPanelProps {
  /** Shows a spinner and “Working…”. Otherwise the trigger reads “Worked”. */
  working: boolean;
  /** What is happening now, shown beside “Working…”. */
  activityLabel?: string | null | undefined;
  /** Draws a line under the panel when a result follows it. */
  hasResult?: boolean | undefined;
  /** Closes the panel once work stops, and reopens it when work restarts. */
  collapseWhenDone?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/**
 * A collapsible frame for live agent work. It holds a scrolling timeline,
 * usually a stepper `ToolActivity`, and is at most 40% of its parent's height.
 */
export function ActivityPanel({
  working,
  activityLabel,
  hasResult = false,
  collapseWhenDone = false,
  className,
  children,
}: ActivityPanelProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(true);
  const settled = useRef(false);
  useEffect(() => {
    if (working) {
      if (settled.current) setOpen(true);
      settled.current = false;
    } else if (!settled.current && collapseWhenDone) {
      settled.current = true;
      setOpen(false);
    }
  }, [working, collapseWhenDone]);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      data-slot="activity-panel"
      data-has-result={hasResult || undefined}
      role="region"
      aria-label="Chat activity"
      className={cn('sprout-activity-panel', className)}
    >
      <CollapsibleTrigger
        aria-label={working ? `Working…${activityLabel ? ` ${activityLabel}` : ''}` : 'Worked'}
        className="sprout-activity-panel-trigger"
      >
        {working && <Spinner aria-hidden="true" />}
        <span className="sprout-activity-panel-status">{working ? 'Working…' : 'Worked'}</span>
        {working && activityLabel && <span className="sprout-activity-panel-label">{activityLabel}</span>}
        <ChevronDown size={14} aria-hidden="true" data-slot="collapsible-indicator" />
      </CollapsibleTrigger>
      {/* Button children are presentational, so the live region sits beside the trigger. */}
      <span role="status" className="sprout-tool-activity-sr-only">
        {working ? 'Working…' : 'Worked'}
      </span>
      <CollapsibleContent keepMounted className="sprout-activity-panel-content">
        <div className="sprout-activity-panel-frame" data-scrolled={scrolled || undefined}>
          <div
            data-slot="activity-viewport"
            role="region"
            aria-label="Activity timeline"
            tabIndex={0}
            className="sprout-activity-panel-viewport"
            onScroll={event => setScrolled(event.currentTarget.scrollTop > 0)}
          >
            {children}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ToolSources({ item, sourceIcon }: { item: ToolActivityItem; sourceIcon: ToolActivitySourceIcon | undefined }) {
  const [expanded, setExpanded] = useState(false);
  const urls = [...new Set([...(item.urls ?? []), ...(item.failedUrls ?? [])])];
  if (!urls.length) return null;
  const titles = new Map(item.sources?.map(source => [source.url, source.title.trim()]));
  const visible = expanded ? urls : urls.slice(0, visibleSourceCount);
  return (
    <div data-slot="tool-sources" className="sprout-tool-activity-sources">
      <ul aria-label="Web sources" className="sprout-tool-activity-source-list">
        {visible.map(url => (
          <li key={url} className="sprout-tool-activity-source">
            <WebSource
              url={url}
              title={titles.get(url)}
              failed={item.failedUrls?.includes(url) ?? false}
              icon={sourceIcon}
              size="sm"
            />
          </li>
        ))}
      </ul>
      {urls.length > visibleSourceCount && (
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={expanded}
          onClick={() => setExpanded(value => !value)}
          className="sprout-tool-activity-more"
        >
          {expanded ? 'Show fewer sources' : `${urls.length - visibleSourceCount} more`}
        </Button>
      )}
    </div>
  );
}

const statusStates = {
  queued: 'pending',
  running: 'running',
  waiting: 'paused',
  completed: 'success',
  blocked: 'error',
  failed: 'error',
  cancelled: 'stopped',
  unknown: 'warning',
} as const satisfies Record<ToolActivityStatus, StatusState>;

export interface ToolActivityProps {
  items: ToolActivityItem[];
  /** The reply is still working, even if no item is running. */
  active?: boolean | undefined;
  /** The accessible name of the list. */
  label?: string | undefined;
  /** What is happening now. `transcript` shows it after “Working…”. */
  activityLabel?: string | null | undefined;
  /** Called when someone opens or closes the list. */
  onToggle?: (() => void) | undefined;
  /**
   * `collapsible` opens while work is pending and closes when it settles.
   * `stepper` is always open, oldest first, and follows the newest row in an
   * `ActivityPanel`. `transcript` starts closed under a chat reply.
   */
  variant?: ToolActivityVariant | undefined;
  /** Stepper only: loads older rows when the top of the panel scrolls in. */
  onLoadOlder?: (() => void) | undefined;
  /** Stepper only: retries a failed older load. */
  onRetryOlder?: (() => void) | undefined;
  hasOlder?: boolean | undefined;
  loadingOlder?: boolean | undefined;
  olderError?: boolean | undefined;
  /** Resolves an icon image for a source chip. Defaults to `webSourceIcon`. */
  sourceIcon?: ToolActivitySourceIcon | undefined;
  className?: string | undefined;
}

/**
 * A timeline of the tools an agent used, with a status mark per row,
 * web sources, and a summary trigger that counts problems.
 */
export function ToolActivity({
  items,
  active = false,
  label = 'Tool activity',
  activityLabel,
  onToggle,
  variant = 'collapsible',
  onLoadOlder,
  onRetryOlder,
  hasOlder = false,
  loadingOlder = false,
  olderError = false,
  sourceIcon,
  className,
}: ToolActivityProps) {
  const visible = variant === 'stepper' ? items.slice().reverse() : items;
  const list = useRef<HTMLOListElement>(null);
  const olderSentinel = useRef<HTMLLIElement>(null);
  const latestId = variant === 'stepper' ? visible.at(-1)?.id : undefined;
  useLayoutEffect(() => {
    if (!latestId) return;
    const activity = list.current?.closest<HTMLElement>('[data-slot="activity-viewport"]');
    if (activity) activity.scrollTop = activity.scrollHeight;
  }, [latestId]);
  useEffect(() => {
    if (variant !== 'stepper' || !hasOlder || loadingOlder || olderError || !onLoadOlder) return;
    const target = olderSentinel.current;
    if (!target) return;
    let mutationObserver: MutationObserver | undefined;
    let stopObserving: (() => void) | undefined;
    const attach = () => {
      const root = list.current?.closest<HTMLElement>('[data-slot="activity-viewport"]');
      if (!root) return false;
      if (typeof IntersectionObserver === 'undefined') {
        const checkTop = () => {
          if (root.scrollTop <= 40) onLoadOlder();
        };
        root.addEventListener('scroll', checkTop, { passive: true });
        stopObserving = () => root.removeEventListener('scroll', checkTop);
      } else {
        const observer = new IntersectionObserver(
          entries => {
            if (entries.some(entry => entry.isIntersecting)) {
              observer.disconnect();
              onLoadOlder();
            }
          },
          { root, rootMargin: '40px 0px 0px' },
        );
        observer.observe(target);
        stopObserving = () => observer.disconnect();
      }
      mutationObserver?.disconnect();
      return true;
    };
    if (!attach()) {
      mutationObserver = new MutationObserver(() => {
        attach();
      });
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
    return () => {
      mutationObserver?.disconnect();
      stopObserving?.();
    };
  }, [variant, hasOlder, loadingOlder, olderError, onLoadOlder, items.length]);

  const running = items.some(item => item.status === 'running');
  const working = active || running;
  const pending =
    working || items.some(item => item.status === 'queued' || item.status === 'waiting' || item.status === 'unknown');
  const [expansion, setExpansion] = useState({
    pending,
    open: variant === 'transcript' ? false : pending,
  });
  if (variant !== 'transcript' && expansion.pending !== pending) setExpansion({ pending, open: pending });
  const open = variant === 'transcript' || expansion.pending === pending ? expansion.open : pending;

  if (items.length === 0)
    return active && variant === 'transcript' ? (
      <div data-slot="reply-progress" role="status" className={cn('sprout-tool-activity-progress', className)}>
        <Spinner aria-hidden="true" />
        {activityLabel || 'Thinking…'}
      </div>
    ) : null;

  const problems = items.filter(
    item => item.status === 'blocked' || item.status === 'failed' || item.status === 'unknown',
  ).length;
  const count = `${items.length} ${items.length === 1 ? 'tool' : 'tools'}`;
  const attention = items.some(item => item.status === 'unknown')
    ? 'Outcome unconfirmed'
    : items.some(item => item.status === 'failed')
      ? 'Some work failed'
      : items.some(item => item.status === 'blocked')
        ? 'Access denied'
        : items.some(item => item.status === 'waiting')
          ? 'Waiting for input'
          : !working && items.some(item => item.status === 'cancelled')
            ? 'Work cancelled'
            : null;
  const title =
    variant === 'transcript'
      ? `${
          working
            ? `Working… ${activityLabel || items.find(item => item.status === 'running')?.label || ''}`.trim()
            : pending
              ? 'Work pending'
              : `Tool activity · ${count}`
        }${attention ? ` · ${attention}` : ''}`
      : `${working ? `Using ${count}` : pending ? `${count} waiting` : `Used ${count}`}${
          problems ? ` · ${problems} need${problems === 1 ? 's' : ''} attention` : ''
        }`;

  return (
    <Collapsible
      data-slot="tool-activity"
      data-variant={variant}
      open={variant === 'stepper' || open}
      onOpenChange={next => {
        onToggle?.();
        setExpansion({ pending, open: next });
      }}
      className={cn('sprout-tool-activity', className)}
    >
      {variant !== 'stepper' && (
        <>
          <CollapsibleTrigger aria-label={title} className="sprout-tool-activity-trigger">
            {working ? <Spinner aria-hidden="true" /> : <Command size={14} aria-hidden="true" />}
            <span className="sprout-tool-activity-title">{title}</span>
            <ChevronDown size={14} aria-hidden="true" data-slot="collapsible-indicator" />
          </CollapsibleTrigger>
          <span role="status" className="sprout-tool-activity-sr-only">
            {title}
          </span>
        </>
      )}
      <CollapsibleContent>
        {variant === 'stepper' && loadingOlder && (
          <div role="status" className="sprout-tool-activity-older">
            <Spinner aria-hidden="true" />
            Loading earlier activity…
          </div>
        )}
        {variant === 'stepper' && olderError && (
          <div role="alert" className="sprout-tool-activity-older" data-tone="danger">
            <span>Earlier activity didn’t load.</span>
            <Button variant="link" size="sm" disabled={!onRetryOlder} onClick={onRetryOlder}>
              Retry loading
            </Button>
          </div>
        )}
        <ol ref={list} aria-label={label} className="sprout-tool-activity-list">
          {variant === 'stepper' && hasOlder && (
            <li ref={olderSentinel} aria-hidden="true" className="sprout-tool-activity-sentinel" />
          )}
          {visible.map((item, index) => (
            <li key={item.id} data-tool-id={item.id} data-status={item.status} className="sprout-tool-activity-row">
              {index < visible.length - 1 && (
                <span data-slot="timeline-connector" aria-hidden="true" className="sprout-tool-activity-connector" />
              )}
              <div className="sprout-tool-activity-head">
                <span data-slot="tool-status-mark" className="sprout-tool-activity-mark">
                  <Status state={statusStates[item.status]} tooltip={statusText[item.status]} aria-hidden="true" />
                </span>
                <span aria-hidden="true" className="sprout-tool-activity-visual">
                  {item.visual}
                </span>
                <span data-slot="tool-row-label" className="sprout-tool-activity-label">
                  <span className="sprout-tool-activity-label-text">{item.label}</span>
                  <span
                    data-slot="tool-status-label"
                    role={item.status === 'running' && variant !== 'transcript' ? 'status' : undefined}
                    className="sprout-tool-activity-sr-only"
                  >
                    {statusText[item.status]}
                  </span>
                </span>
                {item.action != null && item.action !== false && (
                  <span data-slot="tool-action" className="sprout-tool-activity-action">
                    {item.action}
                  </span>
                )}
              </div>
              {item.query && (
                <p data-slot="web-search-query" className="sprout-tool-activity-query">
                  {item.query}
                </p>
              )}
              {item.detail && (
                <p
                  data-slot="tool-detail"
                  data-tone={item.status === 'failed' || item.status === 'blocked' ? 'danger' : undefined}
                  className="sprout-tool-activity-detail"
                >
                  {item.detail}
                </p>
              )}
              {item.details != null && item.details !== false && (
                <div data-slot="tool-details" className="sprout-tool-activity-details">
                  {item.details}
                </div>
              )}
              <ToolSources item={item} sourceIcon={sourceIcon} />
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}
