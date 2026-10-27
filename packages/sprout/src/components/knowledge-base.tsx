'use client';

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { MoreH } from 'reicon-react/icons/MoreH';
import { brandGlyphs } from '../internal/brand-glyphs.js';
import { cn } from '../internal/classes.js';
import { Badge, type BadgeVariant } from './badge.js';
import { BrandIcon, BrandTile, type Brand } from './brand-icon.js';
import { Button } from './button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu.js';
import { Spinner } from './spinner.js';

export const knowledgeBaseSourceStatusNames = [
  'available',
  'queued',
  'syncing',
  'connected',
  'paused',
  'error',
] as const;

export type KnowledgeBaseSourceStatus = (typeof knowledgeBaseSourceStatusNames)[number];

export const knowledgeBaseStateNames = ['empty', 'syncing', 'attention', 'partial', 'ready'] as const;

/** The whole knowledge base, worked out from its sources. */
export type KnowledgeBaseState = (typeof knowledgeBaseStateNames)[number];

export interface KnowledgeBaseSource {
  id: string;
  /** The source's name, such as “Slack” or “Docs site”. */
  name: string;
  /** The app it comes from. Its logo marks the source in the list and the diagram. */
  brand?: Brand | undefined;
  /** Replaces the brand logo in the list, for sources that are not a known app. */
  icon?: ReactNode;
  /** What is read and how often, such as “#support, #eng · live”. */
  detail?: ReactNode;
  /**
   * `available` can be connected, `queued` waits for its first sync, `syncing`
   * is reading content now, `connected` is searchable and up to date, `paused`
   * is searchable but not updating, and `error` stopped syncing.
   */
  status: KnowledgeBaseSourceStatus;
  /** How much of a `syncing` source is read, from 0 to 100. Also marks where an `error` stopped. */
  progress?: number | null | undefined;
  /** How many chunks this source added. */
  chunks?: number | null | undefined;
  /** Chunks added by the latest sync, shown as “+128 new”. */
  newChunks?: number | null | undefined;
  /** Why an `error` source stopped, and how to fix it. Shown in place of `detail`. */
  error?: string | undefined;
  /** Its line and progress color. Defaults to the brand’s own color, or a categorical hue without a brand. */
  color?: string | undefined;
}

interface Derived {
  sources: readonly KnowledgeBaseSource[];
  state: KnowledgeBaseState;
  hues: ReadonlyMap<string, string>;
  chunks: number;
  /** Chunks added by the latest syncs, across sources. */
  newChunks: number;
  searchable: number;
  /** Sources the user has added, whatever their status. */
  linked: number;
  syncing: number;
  failed: number;
  paused: number;
  format: (value: number) => string;
  titleId: string;
}

const KnowledgeBaseContext = createContext<Derived | null>(null);

function useKnowledgeBase(part: string) {
  const context = useContext(KnowledgeBaseContext);
  if (!context) throw new Error(`${part} must be used inside <KnowledgeBase>.`);
  return context;
}

// Sources without a brand take a hue; red, orange, green, and yellow would read as a status.
const hues = ['sky', 'teal', 'purple', 'indigo', 'tan', 'blue'] as const;

// Multi-colour marks pick the colour people know the app by; marks without a fill have none.
const brandHex: Partial<Record<Brand, string>> = {
  confluence: '#1868DB',
  'google-drive': '#00AC47',
  'google-calendar': '#4285F4',
};

/** The app's own colour, lifted toward the text colour on dark surfaces so deep blues stay visible. */
function brandColor(brand: Brand) {
  const hex = brandHex[brand] ?? brandGlyphs[brand].paths.find(path => 'fill' in path && path.fill !== '#FFF')?.fill;
  if (!hex) return 'color-mix(in oklab, var(--sprout-text) 62%, var(--sprout-surface))';
  return `color-mix(in oklab, ${hex} var(--sprout-knowledge-base-brand-mix), var(--sprout-text))`;
}

const clamp = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;

const plural = (count: string, value: number, one: string, many: string) => `${count} ${value === 1 ? one : many}`;

const isSearchable = (status: KnowledgeBaseSourceStatus) => status === 'connected' || status === 'paused';

function overallState(sources: readonly KnowledgeBaseSource[]): KnowledgeBaseState {
  if (sources.some(source => source.status === 'syncing' || source.status === 'queued')) return 'syncing';
  if (sources.some(source => source.status === 'error')) return 'attention';
  const searchable = sources.filter(source => isSearchable(source.status)).length;
  if (searchable === 0) return 'empty';
  return searchable === sources.length ? 'ready' : 'partial';
}

export interface KnowledgeBaseProps extends Omit<ComponentProps<'section'>, 'children'> {
  /** Every source the knowledge base can read from, connected or not, in display order. */
  sources: readonly KnowledgeBaseSource[];
  /** Formats counts. Defaults to `en-US`, so server and browser agree. */
  locale?: string | undefined;
  children?: ReactNode;
}

/**
 * A panel that shows which sources feed a knowledge base and how each one is
 * doing. Compose it from `KnowledgeBaseHeader`, `KnowledgeBaseDiagram`,
 * `KnowledgeBaseSummary`, `KnowledgeBaseSources`, and `KnowledgeBaseFooter`.
 */
export function KnowledgeBase({ sources, locale = 'en-US', className, children, ...props }: KnowledgeBaseProps) {
  const titleId = useId();
  const derived = useMemo<Derived>(() => {
    const formatter = new Intl.NumberFormat(locale);
    let next = 0;
    const map = new Map<string, string>();
    for (const source of sources) {
      map.set(
        source.id,
        source.color ?? (source.brand ? brandColor(source.brand) : `var(--sprout-${hues[next++ % hues.length]})`),
      );
    }
    return {
      sources,
      state: overallState(sources),
      hues: map,
      chunks: sources.reduce((sum, source) => sum + Math.max(0, source.chunks ?? 0), 0),
      newChunks: sources.reduce((sum, source) => sum + Math.max(0, source.newChunks ?? 0), 0),
      searchable: sources.filter(source => isSearchable(source.status)).length,
      linked: sources.filter(source => source.status !== 'available').length,
      syncing: sources.filter(source => source.status === 'syncing' || source.status === 'queued').length,
      failed: sources.filter(source => source.status === 'error').length,
      paused: sources.filter(source => source.status === 'paused').length,
      format: value => formatter.format(value),
      titleId,
    };
  }, [sources, locale, titleId]);
  return (
    <KnowledgeBaseContext.Provider value={derived}>
      <section
        data-slot="knowledge-base"
        data-state={derived.state}
        aria-labelledby={titleId}
        {...props}
        className={cn('sprout-knowledge-base', className)}
      >
        {children}
        <Announcer />
      </section>
    </KnowledgeBaseContext.Provider>
  );
}

/** Reads out a source when it finishes syncing or fails, without repeating the whole list. */
function Announcer() {
  const { sources, format } = useKnowledgeBase('KnowledgeBase');
  const previous = useRef<Map<string, KnowledgeBaseSourceStatus> | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const before = previous.current;
    previous.current = new Map(sources.map(source => [source.id, source.status]));
    if (!before) return;
    const changes: string[] = [];
    for (const source of sources) {
      const was = before.get(source.id);
      if (was === undefined || was === source.status) continue;
      if (source.status === 'connected' && (was === 'syncing' || was === 'queued'))
        changes.push(
          source.chunks == null
            ? `${source.name} connected`
            : `${source.name} connected, ${plural(format(source.chunks), source.chunks, 'chunk', 'chunks')}`,
        );
      else if (source.status === 'error')
        changes.push(source.error ? `${source.name} failed: ${source.error}` : `${source.name} failed to sync`);
      else if (source.status === 'syncing' && was !== 'queued') changes.push(`${source.name} syncing`);
      else if (source.status === 'available' && isSearchable(was)) changes.push(`${source.name} disconnected`);
    }
    if (changes.length) setMessage(changes.join('. '));
  }, [sources, format]);
  return (
    <span role="status" className="sprout-knowledge-base-sr-only">
      {message}
    </span>
  );
}

export interface KnowledgeBaseHeaderProps extends Omit<ComponentProps<'header'>, 'title'> {
  /** Defaults to “Knowledge base”. */
  title?: ReactNode;
  /** Whose knowledge base it is, such as the assistant's name. */
  subtitle?: ReactNode;
  /** The heading level. Defaults to 2. */
  headingLevel?: 2 | 3 | 4 | undefined;
  /** Icon buttons on the right, such as settings and close. */
  children?: ReactNode;
}

export function KnowledgeBaseHeader({
  title = 'Knowledge base',
  subtitle,
  headingLevel = 2,
  className,
  children,
  ...props
}: KnowledgeBaseHeaderProps) {
  const { titleId } = useKnowledgeBase('KnowledgeBaseHeader');
  const Heading = `h${headingLevel}` as const;
  return (
    <header data-slot="knowledge-base-header" {...props} className={cn('sprout-knowledge-base-header', className)}>
      <Heading id={titleId} className="sprout-knowledge-base-title">
        {title}
        {subtitle != null && <span className="sprout-knowledge-base-subtitle">{subtitle}</span>}
      </Heading>
      {children != null && <div className="sprout-knowledge-base-header-actions">{children}</div>}
    </header>
  );
}

const defaultTitles = (context: Derived): Record<KnowledgeBaseState, string> => {
  const { sources, syncing, failed, searchable } = context;
  return {
    empty: 'Nothing indexed yet',
    syncing: `Indexing ${plural(String(syncing), syncing, 'source', 'sources')}`,
    attention:
      failed === 1
        ? `${sources.find(s => s.status === 'error')!.name} stopped syncing`
        : `${failed} sources stopped syncing`,
    partial: `${plural(String(searchable), searchable, 'source', 'sources')} connected`,
    ready: 'Knowledge base is ready',
  };
};

const defaultDescriptions = (context: Derived): Record<KnowledgeBaseState, string> => {
  const { chunks, searchable, format, failed } = context;
  const total = plural(format(chunks), chunks, 'chunk', 'chunks');
  return {
    empty: 'Connect a source or upload files. Their content is read, chunked, and embedded so answers can cite it.',
    syncing:
      'Content is being read, chunked, and embedded. Each source becomes searchable as soon as its sync finishes.',
    attention: `${failed === 1 ? 'Retry it' : 'Retry them'}, or reconnect if access changed. Content already indexed stays searchable.`,
    partial: `Answers can cite ${total}. Connect the rest to cover what your team already wrote.`,
    ready: `Answers search ${total} across ${plural(String(searchable), searchable, 'source', 'sources')} and cite the passage behind each one.`,
  };
};

export interface KnowledgeBaseSummaryProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Replaces the heading worked out from the sources, such as “Indexing 2 sources”. */
  title?: ReactNode;
  /** Replaces the sentence worked out from the sources. */
  description?: ReactNode;
  /** Actions under the text, such as “Connect source” and “Upload files”. */
  children?: ReactNode;
}

export function KnowledgeBaseSummary({ title, description, className, children, ...props }: KnowledgeBaseSummaryProps) {
  const context = useKnowledgeBase('KnowledgeBaseSummary');
  return (
    <div
      data-slot="knowledge-base-summary"
      data-state={context.state}
      {...props}
      className={cn('sprout-knowledge-base-summary', className)}
    >
      <p className="sprout-knowledge-base-summary-title">{title ?? defaultTitles(context)[context.state]}</p>
      <p className="sprout-knowledge-base-summary-description">
        {description ?? defaultDescriptions(context)[context.state]}
      </p>
      {children != null && <div className="sprout-knowledge-base-summary-actions">{children}</div>}
    </div>
  );
}

const statusText: Record<KnowledgeBaseSourceStatus, string> = {
  available: 'Not connected',
  queued: 'Queued',
  syncing: 'Syncing',
  connected: 'Connected',
  paused: 'Paused',
  error: 'Failed',
};

const statusVariant: Record<KnowledgeBaseSourceStatus, BadgeVariant> = {
  available: 'outline',
  queued: 'outline',
  syncing: 'info',
  connected: 'success',
  paused: 'secondary',
  error: 'destructive',
};

export interface KnowledgeBaseSourcesProps extends Omit<ComponentProps<'ul'>, 'children'> {
  /** Shows Connect on `available` sources. */
  onConnect?: ((source: KnowledgeBaseSource) => void) | undefined;
  /** Makes Connect a link, such as to the integration's setup page. Takes priority over `onConnect`. */
  connectHref?: ((source: KnowledgeBaseSource) => string) | undefined;
  /** Shows Retry on `error` sources. */
  onRetry?: ((source: KnowledgeBaseSource) => void) | undefined;
  /** Adds “Sync now” to the menu of connected and paused sources. */
  onSync?: ((source: KnowledgeBaseSource) => void) | undefined;
  /** Adds “Pause syncing” to the menu of connected sources. */
  onPauseSync?: ((source: KnowledgeBaseSource) => void) | undefined;
  /** Adds “Resume syncing” to the menu of paused sources. */
  onResumeSync?: ((source: KnowledgeBaseSource) => void) | undefined;
  /** Adds “Cancel sync” to the menu of syncing and queued sources. */
  onCancelSync?: ((source: KnowledgeBaseSource) => void) | undefined;
  /** Adds “Settings” to the menu of connected, paused, and failed sources. */
  onSettings?: ((source: KnowledgeBaseSource) => void) | undefined;
  /** Adds “Disconnect” to the menu of connected, paused, and failed sources. */
  onDisconnect?: ((source: KnowledgeBaseSource) => void) | undefined;
}

export function KnowledgeBaseSources({
  onConnect,
  connectHref,
  onRetry,
  onSync,
  onPauseSync,
  onResumeSync,
  onCancelSync,
  onSettings,
  onDisconnect,
  className,
  ...props
}: KnowledgeBaseSourcesProps) {
  const { sources, hues: colors, format } = useKnowledgeBase('KnowledgeBaseSources');
  if (sources.length === 0) return null;
  const actionsOf = (source: KnowledgeBaseSource) => {
    const linked = isSearchable(source.status) || source.status === 'error';
    const canPause = Boolean(onPauseSync && (source.status === 'connected' || source.status === 'syncing'));
    const canResume = Boolean(onResumeSync && source.status === 'paused');
    const canCancel = Boolean(onCancelSync && (source.status === 'syncing' || source.status === 'queued'));
    const canSync = Boolean(onSync && isSearchable(source.status));
    const any = canSync || canPause || canResume || canCancel || (linked && Boolean(onSettings || onDisconnect));
    return { linked, canPause, canResume, canCancel, canSync, any };
  };
  // Rows without a menu keep its column, so every status lines up.
  const reserveMenu = sources.some(source => actionsOf(source).any);
  return (
    <ul data-slot="knowledge-base-sources" {...props} className={cn('sprout-knowledge-base-sources', className)}>
      {sources.map(source => {
        const progress = clamp(source.progress);
        const syncing = source.status === 'syncing';
        const { linked, canPause, canResume, canCancel, canSync, any: menu } = actionsOf(source);
        const fresh = Math.max(0, source.newChunks ?? 0);
        const detail = source.status === 'error' && source.error ? source.error : source.detail;
        return (
          <li
            key={source.id}
            data-slot="knowledge-base-source"
            data-status={source.status}
            className="sprout-knowledge-base-source"
            style={{ '--sprout-knowledge-base-hue': colors.get(source.id) } as CSSProperties}
          >
            {source.icon != null ? (
              <BrandTile size="md" className="sprout-knowledge-base-source-icon" aria-hidden="true">
                {source.icon}
              </BrandTile>
            ) : source.brand ? (
              <BrandIcon
                brand={source.brand}
                size="md"
                className="sprout-knowledge-base-source-icon"
                aria-hidden="true"
              />
            ) : (
              <BrandTile size="md" className="sprout-knowledge-base-source-icon" aria-hidden="true">
                <span className="sprout-knowledge-base-source-initial">{source.name.trim().charAt(0)}</span>
              </BrandTile>
            )}
            <div className="sprout-knowledge-base-source-text">
              <span className="sprout-knowledge-base-source-name">{source.name}</span>
              {detail != null && (
                <span
                  className="sprout-knowledge-base-source-detail"
                  title={typeof detail === 'string' ? detail : undefined}
                >
                  {detail}
                </span>
              )}
            </div>
            <div className="sprout-knowledge-base-source-meta">
              {syncing && progress !== null ? (
                <span className="sprout-knowledge-base-source-count">{Math.round(progress)}%</span>
              ) : source.chunks != null && source.status !== 'available' ? (
                <span className="sprout-knowledge-base-source-count">
                  {fresh > 0 && <span className="sprout-knowledge-base-source-new">+{format(fresh)} new</span>}
                  {plural(format(source.chunks), source.chunks, 'chunk', 'chunks')}
                </span>
              ) : null}
              {source.status === 'available' && connectHref ? (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<a href={connectHref(source)} />}
                  aria-label={`Connect ${source.name}`}
                >
                  Connect
                </Button>
              ) : source.status === 'available' && onConnect ? (
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Connect ${source.name}`}
                  onClick={() => onConnect(source)}
                >
                  Connect
                </Button>
              ) : (
                <Badge variant={statusVariant[source.status]} className="sprout-knowledge-base-source-status">
                  <span className="sprout-knowledge-base-source-dot" aria-hidden="true" />
                  {statusText[source.status]}
                </Badge>
              )}
              {source.status === 'error' && onRetry && (
                <Button variant="outline" size="sm" aria-label={`Retry ${source.name}`} onClick={() => onRetry(source)}>
                  Retry
                </Button>
              )}
              {menu && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="sprout-knowledge-base-source-menu"
                        aria-label={`Actions for ${source.name}`}
                      />
                    }
                  >
                    <MoreH aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canSync && <DropdownMenuItem onClick={() => onSync?.(source)}>Sync now</DropdownMenuItem>}
                    {canPause && (
                      <DropdownMenuItem onClick={() => onPauseSync?.(source)}>Pause syncing</DropdownMenuItem>
                    )}
                    {canResume && (
                      <DropdownMenuItem onClick={() => onResumeSync?.(source)}>Resume syncing</DropdownMenuItem>
                    )}
                    {canCancel && (
                      <DropdownMenuItem onClick={() => onCancelSync?.(source)}>Cancel sync</DropdownMenuItem>
                    )}
                    {onSettings && linked && (
                      <DropdownMenuItem onClick={() => onSettings(source)}>Settings</DropdownMenuItem>
                    )}
                    {onDisconnect && linked && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => onDisconnect(source)}>
                          Disconnect
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {!menu && reserveMenu && <span className="sprout-knowledge-base-source-menu-space" aria-hidden="true" />}
            </div>
            {syncing && (
              <div
                className="sprout-knowledge-base-source-progress"
                role="progressbar"
                aria-label={`${source.name} sync`}
                aria-valuemin={0}
                aria-valuemax={100}
                {...(progress === null ? {} : { 'aria-valuenow': Math.round(progress) })}
                data-indeterminate={progress === null ? '' : undefined}
                style={{ '--sprout-knowledge-base-progress': `${progress ?? 0}%` } as CSSProperties}
              >
                <span className="sprout-knowledge-base-source-progress-fill" />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export interface KnowledgeBaseFooterProps extends ComponentProps<'footer'> {
  /** Actions on the right, such as Reset. */
  children?: ReactNode;
}

export function KnowledgeBaseFooter({ className, children, ...props }: KnowledgeBaseFooterProps) {
  const { searchable, linked, chunks, syncing, failed, paused, format } = useKnowledgeBase('KnowledgeBaseFooter');
  // Rolls in step with KnowledgeBaseActivity, so both always show the same total.
  const rolledChunks = useRollingNumber(chunks);
  const health =
    syncing > 0
      ? `${format(syncing)} syncing`
      : failed > 0
        ? `${failed} failed`
        : searchable === 0
          ? 'Not searchable'
          : paused > 0
            ? `${paused} paused`
            : 'In sync';
  return (
    <footer data-slot="knowledge-base-footer" {...props} className={cn('sprout-knowledge-base-footer', className)}>
      <p className="sprout-knowledge-base-stats">
        <span>{plural(format(linked), linked, 'source', 'sources')}</span>
        <span aria-hidden="true">·</span>
        <span>{plural(format(rolledChunks), rolledChunks, 'chunk', 'chunks')}</span>
        <span aria-hidden="true">·</span>
        <span data-tone={failed > 0 && syncing === 0 ? 'danger' : undefined}>{health}</span>
      </p>
      {children != null && <div className="sprout-knowledge-base-footer-actions">{children}</div>}
    </footer>
  );
}

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

/** Eases a count toward its new value, so arriving chunks tick up instead of jumping. */
function useRollingNumber(value: number) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    if (matchMedia(reducedMotionQuery).matches) {
      from.current = value;
      setShown(value);
      return;
    }
    // Starting on the first frame keeps every counter that changed in the same render in step.
    let began: number | null = null;
    let frame = 0;
    const tick = (now: number) => {
      began ??= now;
      const t = Math.min(1, (now - began) / 350);
      const next = Math.round(start + (value - start) * (1 - (1 - t) ** 3));
      from.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

export interface KnowledgeBaseActivityProps extends Omit<ComponentProps<'div'>, 'children'> {}

/**
 * A compact readout of what is indexed: a spinner while sources sync, the
 * chunk and source counts, and how many chunks the latest syncs added.
 * Counts roll up as they change. Put it in `KnowledgeBaseDiagram` to float it
 * over the stage, or anywhere else inside `KnowledgeBase`.
 */
export function KnowledgeBaseActivity({ className, ...props }: KnowledgeBaseActivityProps) {
  const { chunks, newChunks, linked, syncing, failed, searchable, format } = useKnowledgeBase('KnowledgeBaseActivity');
  const rolledChunks = useRollingNumber(chunks);
  const rolledNew = useRollingNumber(newChunks);
  const tone = syncing > 0 ? 'syncing' : failed > 0 ? 'attention' : searchable > 0 ? 'live' : 'idle';
  return (
    <div
      data-slot="knowledge-base-activity"
      data-tone={tone}
      {...props}
      className={cn('sprout-knowledge-base-activity', className)}
    >
      <span className="sprout-knowledge-base-activity-indicator" aria-hidden="true">
        {tone === 'syncing' ? (
          <Spinner size="sm" aria-hidden="true" />
        ) : (
          <span className="sprout-knowledge-base-activity-dot" />
        )}
      </span>
      <span className="sprout-knowledge-base-activity-text">
        <span className="sprout-knowledge-base-activity-label">
          {tone === 'syncing'
            ? 'Indexing'
            : tone === 'attention'
              ? 'Needs attention'
              : tone === 'live'
                ? 'Live'
                : linked === 0
                  ? 'Nothing indexed'
                  : 'Idle'}
        </span>
        {linked > 0 && (
          <>
            <span>{plural(format(rolledChunks), rolledChunks, 'chunk', 'chunks')}</span>
            <span aria-hidden="true">·</span>
            <span>{plural(format(linked), linked, 'source', 'sources')}</span>
          </>
        )}
      </span>
      {newChunks > 0 && <span className="sprout-knowledge-base-activity-new">+{format(rolledNew)} new</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ Diagram */

const cos30 = Math.cos(Math.PI / 6);
const tan30 = Math.tan(Math.PI / 6);
const width = 640;
const height = 216;
const hubX = width / 2;
const hubY = 150;
const hubHalf = 42;
const hubRadius = 8;
const tileHalf = 16;
const tileRadius = 4;
const tileDepth = 5;

type Point = readonly [number, number];

/** Maps the flat plane at height `z` onto the screen, centred on `origin`. */
const faceMatrix = ([x, y]: Point, z: number) => `matrix(${cos30} 0.5 ${-cos30} 0.5 ${x} ${y - z})`;

const project = ([ox, oy]: Point, x: number, y: number, z: number): Point => [
  ox + (x - y) * cos30,
  oy + (x + y) * 0.5 - z,
];

/** The left, right, and front silhouette points of a rounded square's projection. */
function extremes(origin: Point, half: number, radius: number, z: number) {
  const inset = half - radius;
  const out = radius * Math.SQRT1_2;
  return {
    left: project(origin, -inset - out, inset + out, z),
    right: project(origin, inset + out, -inset - out, z),
    front: project(origin, inset + out, inset + out, z),
  };
}

interface SlabProps {
  origin: Point;
  half: number;
  radius: number;
  /** Height of the top face. */
  z: number;
  depth: number;
  className?: string;
  /** Drawn on the top face, in flat coordinates centred on the slab. */
  children?: ReactNode;
  /** Drawn after the slab in screen coordinates. */
  after?: ReactNode;
}

function Slab({ origin, half, radius, z, depth, className, children, after }: SlabProps) {
  const top = extremes(origin, half, radius, z);
  const bottom = extremes(origin, half, radius, z - depth);
  const face = {
    x: -half,
    y: -half,
    width: half * 2,
    height: half * 2,
    rx: radius,
    vectorEffect: 'non-scaling-stroke',
  } as const;
  return (
    <g className={cn('sprout-knowledge-base-slab', className)}>
      <path
        className="sprout-knowledge-base-slab-side"
        d={`M${top.left}L${bottom.left}L${bottom.front}L${bottom.right}L${top.right}Z`}
      />
      <rect {...face} className="sprout-knowledge-base-slab-edge" transform={faceMatrix(origin, z - depth)} />
      <path
        className="sprout-knowledge-base-slab-edge"
        d={`M${top.left}L${bottom.left}M${top.right}L${bottom.right}`}
      />
      <rect {...face} className="sprout-knowledge-base-slab-face" transform={faceMatrix(origin, z)} />
      {children != null && <g transform={faceMatrix(origin, z)}>{children}</g>}
      {after}
    </g>
  );
}

const hub: Point = [hubX, hubY];
const layers = { base: 14, embed: 38, chunk: 60, doc: 84 } as const;

interface Slot {
  center: Point;
  side: 'left' | 'right';
  /** Height on the hub where the line lands. */
  port: number;
  bend: 'up' | 'down';
}

const slotTable: Record<string, Slot> = {
  lt: { center: [124, 96], side: 'left', port: layers.embed - 3, bend: 'up' },
  rt: { center: [516, 96], side: 'right', port: layers.embed - 3, bend: 'up' },
  lb: { center: [158, 141], side: 'left', port: layers.base - 7, bend: 'down' },
  rb: { center: [482, 141], side: 'right', port: layers.base - 7, bend: 'down' },
  // The outer pair arcs over the top pair, so every line bends and none cross.
  lm: { center: [62, 72], side: 'left', port: layers.chunk - 3, bend: 'up' },
  rm: { center: [578, 72], side: 'right', port: layers.chunk - 3, bend: 'up' },
};

const slotOrder = ['lt', 'rt', 'lb', 'rb', 'lm', 'rm'] as const;
const maxSatellites = slotOrder.length;

const hubPort = (slot: Slot): Point => {
  const { left, right } = extremes(hub, hubHalf, hubRadius, slot.port);
  return slot.side === 'left' ? left : right;
};

const satellitePort = (slot: Slot): Point => {
  const { left, right } = extremes(slot.center, tileHalf, tileRadius, tileDepth / 2);
  return slot.side === 'left' ? right : left;
};

/** An isometric route from a satellite to the hub, up and over or down and under. */
function route(slot: Slot) {
  const [sx, sy] = satellitePort(slot);
  const [hx, hy] = hubPort(slot);
  const direction = Math.sign(hx - sx);
  const k = (slot.bend === 'up' ? -1 : 1) * tan30;
  // Leave the satellite at slope k and arrive at the hub at slope -k.
  const px = (hy - sy + k * direction * sx + k * direction * hx) / (2 * k * direction);
  const py = sy + k * direction * (px - sx);
  if ((px - sx) * direction <= 12 || (hx - px) * direction <= 12) return `M${sx} ${sy}L${hx} ${hy}`;
  const r = 10;
  const ux = cos30 * direction;
  const a: Point = [px - ux * r, py - k * direction * ux * r];
  const b: Point = [px + ux * r, py - k * direction * ux * r];
  return `M${sx} ${sy}L${a[0]} ${a[1]}Q${px} ${py} ${b[0]} ${b[1]}L${hx} ${hy}`;
}

const statusRank: Record<KnowledgeBaseSourceStatus, number> = {
  syncing: 0,
  error: 1,
  queued: 2,
  connected: 3,
  paused: 4,
  available: 5,
};

// Interleaves the embedding dots so each source's share is spread across the layer.
const dotGrid = 5;
const dotOrder = [12, 3, 21, 9, 15, 0, 18, 6, 24, 11, 2, 20, 14, 8, 23, 5, 17, 1, 13, 22, 7, 19, 4, 16, 10];

function fillOf(source: KnowledgeBaseSource) {
  if (isSearchable(source.status)) return 1;
  if (source.status === 'syncing' || source.status === 'error') return (clamp(source.progress) ?? 0) / 100;
  return 0;
}

export interface KnowledgeBaseDiagramProps extends ComponentProps<'div'> {
  /**
   * Your product's mark, laid on top of the index, such as an `<svg>` with a
   * `viewBox`. Defaults to a document outline.
   */
  mark?: ReactNode;
  /** Floats over the stage's top-left corner, such as `KnowledgeBaseActivity`. */
  children?: ReactNode;
}

/**
 * Sources around an index. A syncing source's line draws toward the index as
 * it syncs; once connected, data keeps streaming along it into the index.
 * Hidden from screen readers; `KnowledgeBaseSources` carries the same facts.
 */
export function KnowledgeBaseDiagram({ mark, className, children, ...props }: KnowledgeBaseDiagramProps) {
  const { sources, hues: colors, state } = useKnowledgeBase('KnowledgeBaseDiagram');
  const maskId = useId();

  const shown = useMemo(() => {
    if (sources.length <= maxSatellites) return { list: sources, more: 0 };
    const picked = [...sources]
      .map((source, index) => ({ source, index }))
      .sort((a, b) => statusRank[a.source.status] - statusRank[b.source.status] || a.index - b.index)
      .slice(0, maxSatellites - 1)
      .sort((a, b) => a.index - b.index)
      .map(item => item.source);
    return { list: picked, more: sources.length - picked.length };
  }, [sources]);

  const dots = useMemo(() => {
    const feeding = sources.filter(source => source.status !== 'available' && source.status !== 'queued');
    const colorsByDot: (string | null)[] = Array(dotGrid * dotGrid).fill(null);
    if (feeding.length === 0) return colorsByDot;
    const share = (dotGrid * dotGrid) / feeding.length;
    feeding.forEach((source, index) => {
      const start = Math.round(index * share);
      const lit = Math.min(Math.round(share * fillOf(source)), Math.round((index + 1) * share) - start);
      for (let i = 0; i < lit; i += 1) colorsByDot[dotOrder[start + i]!] = colors.get(source.id) ?? null;
    });
    return colorsByDot;
  }, [sources, colors]);

  const placeholders = sources.length === 0 ? (['lt', 'rt', 'lb', 'rb'] as const) : [];
  // Crop the outer slots away when they are empty, so the index fills narrow panels.
  const slotsUsed = Math.max(placeholders.length, shown.list.length + (shown.more > 0 ? 1 : 0));
  const inset = slotsUsed > 4 ? 0 : 88;

  return (
    <div
      data-slot="knowledge-base-diagram"
      data-state={state}
      {...props}
      className={cn('sprout-knowledge-base-diagram', className)}
    >
      {children != null && <div className="sprout-knowledge-base-diagram-overlay">{children}</div>}
      <svg
        viewBox={`${inset} 0 ${width - inset * 2} ${height}`}
        className="sprout-knowledge-base-diagram-svg"
        aria-hidden="true"
        focusable="false"
      >
        {placeholders.map(key => (
          <path key={key} className="sprout-knowledge-base-track" d={route(slotTable[key]!)} />
        ))}
        {shown.list.map((source, index) => {
          const slot = slotTable[slotOrder[index]!]!;
          const d = route(slot);
          const progress = source.status === 'syncing' ? (clamp(source.progress) ?? 0) : fillOf(source) * 100;
          const dash =
            source.status === 'error' ? '3 2.5' : source.status === 'paused' ? '0.01 2.6' : `${progress} 100`;
          const streaming = source.status === 'syncing' || source.status === 'connected';
          const mask = `${maskId}-${index}`;
          return (
            <g
              key={source.id}
              className="sprout-knowledge-base-link"
              data-status={source.status}
              style={{ '--sprout-knowledge-base-hue': colors.get(source.id) } as CSSProperties}
            >
              <path className="sprout-knowledge-base-track" d={d} />
              <path className="sprout-knowledge-base-flow" d={d} pathLength={100} style={{ strokeDasharray: dash }} />
              {streaming && (
                <>
                  <mask id={mask} maskUnits="userSpaceOnUse" x={inset} y={0} width={width} height={height}>
                    <path
                      className="sprout-knowledge-base-stream-reach"
                      d={d}
                      pathLength={100}
                      style={{ strokeDasharray: `${progress} 100` }}
                    />
                  </mask>
                  <g mask={`url(#${mask})`}>
                    <path
                      className="sprout-knowledge-base-stream"
                      d={d}
                      pathLength={100}
                      style={{ animationDelay: `${index * -0.37}s` }}
                    />
                  </g>
                </>
              )}
            </g>
          );
        })}
        {shown.more > 0 && (
          <path className="sprout-knowledge-base-track" d={route(slotTable[slotOrder[maxSatellites - 1]!]!)} />
        )}

        <Hub dots={dots} mark={mark} />

        {shown.list.map((source, index) => {
          const [cx, cy] = hubPort(slotTable[slotOrder[index]!]!);
          return (
            <g
              key={source.id}
              className="sprout-knowledge-base-ports"
              data-status={source.status}
              style={{ '--sprout-knowledge-base-hue': colors.get(source.id) } as CSSProperties}
            >
              <circle
                className="sprout-knowledge-base-pulse"
                cx={cx}
                cy={cy}
                r={2.75}
                style={{ animationDelay: `${index * -0.37}s` }}
              />
              <circle className="sprout-knowledge-base-port" cx={cx} cy={cy} r={2.75} />
            </g>
          );
        })}

        {shown.list.map((source, index) => (
          <Satellite
            key={source.id}
            slot={slotTable[slotOrder[index]!]!}
            source={source}
            color={colors.get(source.id)}
          />
        ))}
        {shown.more > 0 && <Satellite slot={slotTable[slotOrder[maxSatellites - 1]!]!} more={shown.more} />}
        {placeholders.map(key => (
          <Satellite key={key} slot={slotTable[key]!} />
        ))}
      </svg>
    </div>
  );
}

function Hub({ dots, mark }: { dots: readonly (string | null)[]; mark?: ReactNode }) {
  const half = hubHalf;
  const guides = [layers.base, layers.embed, layers.chunk].map((z, index) => {
    const lower = extremes(hub, half, hubRadius, z);
    const upper = extremes(hub, half, hubRadius, [layers.embed, layers.chunk, layers.doc][index]! - 6);
    return `M${lower.left}L${upper.left}M${lower.right}L${upper.right}M${lower.front}L${upper.front}`;
  });
  const step = (half * 2) / (dotGrid + 1);
  const chunkStep = (half * 2 - 16) / 3;
  const base = extremes(hub, half, hubRadius, layers.base - 7);
  return (
    <g className="sprout-knowledge-base-hub">
      <path className="sprout-knowledge-base-guide" d={guides.join('')} />
      <Slab
        origin={hub}
        half={half}
        radius={hubRadius}
        z={layers.base}
        depth={14}
        after={[0.28, 0.4, 0.52].map(t => (
          <circle
            key={t}
            className="sprout-knowledge-base-hub-light"
            cx={base.left[0] + (base.front[0] - base.left[0]) * t}
            cy={base.left[1] + (base.front[1] - base.left[1]) * t}
            r={1.6}
          />
        ))}
      />
      <Slab origin={hub} half={half} radius={hubRadius} z={layers.embed} depth={6}>
        {dots.map((color, index) => {
          const col = index % dotGrid;
          const row = Math.floor(index / dotGrid);
          return (
            <circle
              key={index}
              className="sprout-knowledge-base-embedding"
              data-lit={color ? '' : undefined}
              cx={-half + step * (col + 1)}
              cy={-half + step * (row + 1)}
              r={2.4}
              style={color ? ({ fill: color, stroke: color, '--i': index } as CSSProperties) : undefined}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </Slab>
      <Slab origin={hub} half={half} radius={hubRadius} z={layers.chunk} depth={6}>
        {Array.from({ length: 9 }, (_, index) => (
          <rect
            key={index}
            className="sprout-knowledge-base-chunk"
            x={-half + 8 + (index % 3) * chunkStep + 2}
            y={-half + 8 + Math.floor(index / 3) * chunkStep + 2}
            width={chunkStep - 4}
            height={chunkStep - 4}
            rx={3}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </Slab>
      <Slab
        origin={hub}
        half={half}
        radius={hubRadius}
        z={layers.doc}
        depth={10}
        className="sprout-knowledge-base-hub-top"
      >
        {mark != null ? (
          <svg
            x={-half + 12}
            y={-half + 12}
            width={half * 2 - 24}
            height={half * 2 - 24}
            className="sprout-knowledge-base-mark"
            overflow="visible"
          >
            {mark}
          </svg>
        ) : (
          <>
            <rect
              className="sprout-knowledge-base-doc"
              x={-half + 14}
              y={-half + 14}
              width={half * 2 - 28}
              height={half * 2 - 28}
              rx={5}
              vectorEffect="non-scaling-stroke"
            />
            <path
              className="sprout-knowledge-base-doc"
              d={`M${-half + 24} ${-6}h${half - 6}M${-half + 24} ${2}h${half - 6}M${-half + 24} ${10}h${half - 18}`}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              className="sprout-knowledge-base-doc"
              x={-half + 24}
              y={-half + 22}
              width={18}
              height={10}
              rx={2}
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </Slab>
    </g>
  );
}

function Satellite({
  slot,
  source,
  color,
  more,
}: {
  slot: Slot;
  source?: KnowledgeBaseSource;
  color?: string | undefined;
  more?: number;
}) {
  const glyph = source?.brand ? brandGlyphs[source.brand] : null;
  const glyphSize = tileHalf * 1.4;
  const port = satellitePort(slot);
  const top = project(slot.center, 0, 0, tileDepth);
  return (
    <g
      className="sprout-knowledge-base-satellite"
      data-status={source?.status ?? (more ? 'more' : 'placeholder')}
      style={color ? ({ '--sprout-knowledge-base-hue': color } as CSSProperties) : undefined}
    >
      <Slab origin={slot.center} half={tileHalf} radius={tileRadius} z={tileDepth} depth={tileDepth}>
        {glyph ? (
          <svg
            x={-glyphSize / 2}
            y={-glyphSize / 2}
            width={glyphSize}
            height={glyphSize}
            viewBox={glyph.viewBox}
            className="sprout-knowledge-base-satellite-glyph"
            overflow="visible"
          >
            {glyph.paths.map((path, index) => (
              <path
                key={index}
                d={path.d}
                fill={'fill' in path ? path.fill : undefined}
                fillRule={'evenOdd' in path ? 'evenodd' : undefined}
                clipRule={'evenOdd' in path ? 'evenodd' : undefined}
              />
            ))}
          </svg>
        ) : more ? null : (
          <circle className="sprout-knowledge-base-satellite-dot" r={3} vectorEffect="non-scaling-stroke" />
        )}
      </Slab>
      {more ? (
        <text className="sprout-knowledge-base-satellite-more" x={top[0]} y={top[1] + 3.5} textAnchor="middle">
          +{more}
        </text>
      ) : null}
      {source && <circle className="sprout-knowledge-base-port" cx={port[0]} cy={port[1]} r={2.75} />}
    </g>
  );
}
