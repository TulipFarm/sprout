'use client';

import {
  Component,
  createContext,
  useContext,
  useMemo,
  useState,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/accordion.js';
import { Alert, AlertDescription, AlertTitle } from '../components/alert.js';
import { Badge, type BadgeVariant } from '../components/badge.js';
import { Button } from '../components/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card.js';
import {
  AreaTrendChart,
  CategoryChart,
  DonutChart,
  Sparkline,
  TrendChart,
  chartPalette,
  type ChartRow,
} from '../components/chart.js';
import { CodeBlock } from '../components/code-block.js';
import { MessageResponse } from '../components/message-response.js';
import { Metric } from '../components/metric.js';
import { Progress, ProgressLabel, ProgressValue } from '../components/progress.js';
import { Separator } from '../components/separator.js';
import { Skeleton } from '../components/skeleton.js';
import { Table, type TableColumn } from '../components/table.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/tabs.js';
import { cn } from '../internal/classes.js';
import {
  componentProps,
  defaultAllowUrl,
  expandChildren,
  readSurface,
  resolveValue,
  sproutCatalog,
  type A2uiTone,
  type Catalog,
  type ChildList,
  type DynamicValue,
  type SproutComponentName,
  type SproutComponentProps,
  type Surface,
  type UrlKind,
} from './catalog.js';

/** What a person did inside a surface. */
export type A2uiAction = { type: 'send'; text: string } | { type: 'expand'; componentId: string };

export type A2uiSize = 'compact' | 'full';

/** Rows a compact table shows before "Show all". */
export const compactTableRows = 10;

export interface A2uiRenderContext {
  /** The component's ID. */
  id: string;
  size: A2uiSize;
  streaming: boolean;
  /** Resolves a literal or `{ path }` value in this component's data scope. */
  resolve<T>(value: DynamicValue<T> | undefined): T | undefined;
  /** Renders one child component by ID. */
  child(id: string): ReactNode;
  /** Renders every child in a child list, each with a key. */
  children(ids: ChildList): ReactNode[];
  allowUrl(url: string, kind: UrlKind): boolean;
  onAction?: ((action: A2uiAction) => void) | undefined;
}

export interface A2uiAdapterProps<Props = any> {
  props: Props;
  context: A2uiRenderContext;
}

/** Draws one catalog component with real components. Hooks are allowed. */
export type A2uiAdapter<Props = any> = ComponentType<A2uiAdapterProps<Props>>;
export type A2uiAdapters = Readonly<Record<string, A2uiAdapter>>;

interface SurfaceContextValue {
  surface: Surface;
  catalog: Catalog;
  adapters: A2uiAdapters;
  size: A2uiSize;
  streaming: boolean;
  allowUrl: (url: string, kind: UrlKind) => boolean;
  onAction?: ((action: A2uiAction) => void) | undefined;
}

const SurfaceContext = createContext<SurfaceContextValue | null>(null);

export function A2uiUnavailable() {
  return (
    <div className="sprout-a2ui-unavailable" role="note">
      This part couldn&apos;t be displayed.
    </div>
  );
}

function A2uiPending() {
  return (
    <div className="sprout-a2ui-pending" aria-hidden="true">
      <Skeleton shape="line" />
    </div>
  );
}

class NodeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(_error: unknown, _info: ErrorInfo) {}
  override render() {
    return this.state.failed ? <A2uiUnavailable /> : this.props.children;
  }
}

function A2uiNode({ id, scope, trail }: { id: string; scope: string; trail: readonly string[] }) {
  const value = useContext(SurfaceContext)!;
  const { surface, catalog, adapters, streaming } = value;
  const component = surface.components.get(id);
  if (!component) return streaming ? <A2uiPending /> : <A2uiUnavailable />;
  const definition = catalog.components[component.component];
  const Adapter = adapters[component.component];
  if (!definition || !Adapter || trail.includes(id) || trail.length > 32) return <A2uiUnavailable />;
  const parsed = definition.props.safeParse(componentProps(component));
  if (!parsed.success) return streaming ? <A2uiPending /> : <A2uiUnavailable />;
  const next = [...trail, id];
  const context: A2uiRenderContext = {
    id,
    size: value.size,
    streaming,
    resolve: item => resolveValue(surface.data, item, scope),
    child: child => <A2uiNode key={child} id={child} scope={scope} trail={next} />,
    children: ids =>
      expandChildren(surface.data, ids, scope).map(([child, childScope], index) => (
        <A2uiNode key={`${index}:${child}`} id={child} scope={childScope} trail={next} />
      )),
    allowUrl: value.allowUrl,
    onAction: value.onAction,
  };
  return (
    <NodeBoundary>
      <Adapter props={parsed.data} context={context} />
    </NodeBoundary>
  );
}

export interface A2uiSurfaceProps {
  /** A2UI messages for one surface, in order. They may be incomplete while streaming. */
  messages?: readonly unknown[];
  /** A surface already read with `readSurface` or `checkSurface`. Used instead of `messages`. */
  surface?: Surface;
  catalog?: Catalog;
  adapters?: A2uiAdapters;
  /** `compact` fits a chat message: shorter charts and the first rows of each table. */
  size?: A2uiSize;
  /** Shows placeholders for components that have not arrived yet. */
  streaming?: boolean;
  onAction?: (action: A2uiAction) => void;
  /** Decides which links are live and which images load. */
  allowUrl?: (url: string, kind: UrlKind) => boolean;
  className?: string;
}

/** Draws an A2UI surface from catalog components. It never shows raw JSON. */
export function A2uiSurface({
  messages,
  surface: given,
  catalog = sproutCatalog,
  adapters = sproutAdapters,
  size = 'full',
  streaming = false,
  onAction,
  allowUrl = defaultAllowUrl,
  className,
}: A2uiSurfaceProps) {
  const read = useMemo(() => given ?? readSurface(messages ?? []), [given, messages]);
  const value = useMemo(
    () => (read ? { surface: read, catalog, adapters, size, streaming, allowUrl, onAction } : null),
    [read, catalog, adapters, size, streaming, allowUrl, onAction],
  );
  return (
    <div
      data-slot="a2ui-surface"
      data-size={size}
      aria-busy={streaming || undefined}
      className={cn('sprout-a2ui', className)}
    >
      {value && !value.surface.deleted ? (
        <SurfaceContext.Provider value={value}>
          <A2uiNode id="root" scope="" trail={[]} />
        </SurfaceContext.Provider>
      ) : streaming ? (
        <A2uiPending />
      ) : (
        <A2uiUnavailable />
      )}
    </div>
  );
}

// --- Adapters --------------------------------------------------------------

type Adapter<Name extends SproutComponentName> = A2uiAdapter<SproutComponentProps<Name>>;

const asText = (value: unknown) =>
  value === undefined || value === null ? '' : typeof value === 'number' ? value.toLocaleString() : String(value);

const asRows = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter(
        (row): row is Record<string, unknown> => row !== null && typeof row === 'object' && !Array.isArray(row),
      )
    : [];

const cellText = (value: unknown) =>
  value === null || value === undefined
    ? ''
    : typeof value === 'number'
      ? value.toLocaleString()
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);

function Markdown({ text, context, className }: { text: string; context: A2uiRenderContext; className?: string }) {
  return (
    <MessageResponse
      className={className}
      renderLink={(href, children) =>
        context.allowUrl(href, 'link') ? (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ) : (
          <span>{children}</span>
        )
      }
    >
      {text}
    </MessageResponse>
  );
}

const TextAdapter: Adapter<'Text'> = ({ props, context }) => (
  <Markdown
    text={asText(context.resolve(props.text))}
    context={context}
    className={cn('sprout-a2ui-text', props.variant === 'caption' && 'sprout-a2ui-caption')}
  />
);

const HeadingAdapter: Adapter<'Heading'> = ({ props, context }) => {
  const level = props.level ?? 2;
  return (
    <div role="heading" aria-level={level + 1} data-level={level} className="sprout-a2ui-heading">
      {asText(context.resolve(props.text))}
    </div>
  );
};

const SectionAdapter: Adapter<'Section'> = ({ props, context }) => {
  const title = asText(context.resolve(props.title));
  return (
    <section className="sprout-a2ui-section" aria-label={title || undefined}>
      {title ? (
        <div role="heading" aria-level={3} className="sprout-a2ui-section-title">
          {title}
        </div>
      ) : null}
      <div className="sprout-a2ui-stack" data-gap="medium">
        {context.children(props.children)}
      </div>
    </section>
  );
};

const RowAdapter: Adapter<'Row'> = ({ props, context }) => (
  <div className="sprout-a2ui-row" data-gap={props.gap ?? 'medium'} data-align={props.align ?? 'stretch'}>
    {context.children(props.children)}
  </div>
);

const ColumnAdapter: Adapter<'Column'> = ({ props, context }) => (
  <div className="sprout-a2ui-stack" data-gap={props.gap ?? 'medium'} data-align={props.align ?? 'stretch'}>
    {context.children(props.children)}
  </div>
);

const CardAdapter: Adapter<'Card'> = ({ props, context }) => {
  const title = asText(context.resolve(props.title));
  const description = asText(context.resolve(props.description));
  return (
    <Card size="sm" className="sprout-a2ui-card">
      {title || description ? (
        <CardHeader>
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      ) : null}
      <CardContent className="sprout-a2ui-stack" data-gap="medium">
        {context.children(props.children)}
      </CardContent>
    </Card>
  );
};

const DividerAdapter: Adapter<'Divider'> = () => <Separator className="sprout-a2ui-divider" />;

const TabsAdapter: Adapter<'Tabs'> = ({ props, context }) => (
  <Tabs defaultValue={0} className="sprout-a2ui-tabs">
    <TabsList variant="line">
      {props.tabs.map((tab, index) => (
        <TabsTrigger key={index} value={index}>
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
    {props.tabs.map((tab, index) => (
      <TabsContent key={index} value={index}>
        {context.child(tab.child)}
      </TabsContent>
    ))}
  </Tabs>
);

const DetailsAdapter: Adapter<'Details'> = ({ props, context }) => (
  <Accordion multiple className="sprout-a2ui-details">
    {props.items.map((item, index) => (
      <AccordionItem key={index} value={index}>
        <AccordionTrigger>{item.title}</AccordionTrigger>
        <AccordionContent>{context.child(item.child)}</AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

const MetricAdapter: Adapter<'Metric'> = ({ props, context }) => {
  const label = asText(context.resolve(props.label));
  const trend = context.resolve(props.trend);
  const points = Array.isArray(trend) ? trend.filter((point): point is number => typeof point === 'number') : [];
  return (
    <Metric
      className="sprout-a2ui-metric"
      label={label}
      value={asText(context.resolve(props.value))}
      change={props.change}
      caption={asText(context.resolve(props.caption)) || undefined}
      trend={points.length > 1 ? <Sparkline values={points} title={`${label} trend`} area /> : undefined}
    />
  );
};

const badgeTone: Record<A2uiTone, BadgeVariant> = {
  neutral: 'secondary',
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'destructive',
};

const BadgeAdapter: Adapter<'Badge'> = ({ props, context }) => (
  <Badge variant={badgeTone[props.tone ?? 'neutral']} className="sprout-a2ui-badge">
    {asText(context.resolve(props.text))}
  </Badge>
);

const ListAdapter: Adapter<'List'> = ({ props, context }) => {
  const List = props.ordered ? 'ol' : 'ul';
  return (
    <List className="sprout-a2ui-list">
      {context.children(props.children).map((child, index) => (
        <li key={index}>{child}</li>
      ))}
    </List>
  );
};

type Row = Record<string, unknown>;

function DataTable({
  label,
  columns,
  rows,
  caption,
  context,
}: {
  label: string;
  columns: { key: string; label: string; align?: 'start' | 'end' | undefined }[];
  rows: Row[];
  caption?: string | undefined;
  context: A2uiRenderContext;
}) {
  const [expanded, setExpanded] = useState(false);
  const limited = context.size === 'compact' && !expanded && rows.length > compactTableRows;
  const shown = limited ? rows.slice(0, compactTableRows) : rows;
  const ids = useMemo(() => new Map(rows.map((row, index) => [row, String(index)])), [rows]);
  const tableColumns = useMemo<TableColumn<Row>[]>(
    () =>
      columns.map(column => ({
        key: column.key,
        header: column.label,
        align: column.align === 'end' ? 'right' : 'left',
        cell: row => cellText(row[column.key]),
      })),
    [columns],
  );
  return (
    <div className="sprout-a2ui-table">
      <Table<Row>
        aria-label={label}
        data={shown}
        columns={tableColumns}
        getRowId={row => ids.get(row) ?? ''}
        caption={caption || undefined}
        variant="plain"
        narrow="scroll"
      />
      {limited ? (
        <Button
          variant="ghost"
          size="sm"
          className="sprout-a2ui-more"
          onClick={() =>
            context.onAction ? context.onAction({ type: 'expand', componentId: context.id }) : setExpanded(true)
          }
        >
          Show all {rows.length.toLocaleString()} rows
        </Button>
      ) : null}
    </div>
  );
}

const TableAdapter: Adapter<'Table'> = ({ props, context }) => (
  <DataTable
    label={props.label}
    columns={props.columns}
    rows={asRows(context.resolve(props.rows))}
    caption={asText(context.resolve(props.caption))}
    context={context}
  />
);

const ChartAdapter: Adapter<'Chart'> = ({ props, context }) => {
  const [showData, setShowData] = useState(false);
  const rows = asRows(context.resolve(props.rows)) as ChartRow[];
  const series = props.series.map((item, index) => ({
    ...item,
    color: chartPalette[index % chartPalette.length]!,
  }));
  const unit = props.unit;
  const valueFormatter = unit ? (value: number) => `${value.toLocaleString()} ${unit}` : undefined;
  const common = { rows, category: props.category, title: props.title, valueFormatter };
  const chart =
    props.type === 'bar' ? (
      <CategoryChart
        {...common}
        series={series}
        horizontal={props.horizontal}
        stack={props.stack ? 'stacked' : 'none'}
      />
    ) : props.type === 'line' ? (
      <TrendChart {...common} series={series} />
    ) : props.type === 'area' ? (
      <AreaTrendChart {...common} series={series} stack={props.stack ? 'stacked' : 'none'} />
    ) : (
      <DonutChart {...common} value={series[0]!.key} variant={props.type} />
    );
  return (
    <figure className="sprout-a2ui-chart">
      <figcaption className="sprout-a2ui-chart-header">
        <span className="sprout-a2ui-chart-title">{props.title}</span>
        <Button variant="ghost" size="sm" aria-pressed={showData} onClick={() => setShowData(value => !value)}>
          {showData ? 'Show chart' : 'Show data'}
        </Button>
      </figcaption>
      {showData ? (
        <DataTable
          label={props.title}
          columns={[
            { key: props.category, label: props.category },
            ...props.series.map(item => ({ ...item, align: 'end' as const })),
          ]}
          rows={rows}
          context={context}
        />
      ) : (
        chart
      )}
    </figure>
  );
};

const ProgressAdapter: Adapter<'Progress'> = ({ props, context }) => {
  const value = context.resolve(props.value);
  return (
    <Progress value={typeof value === 'number' ? value : null} className="sprout-a2ui-progress">
      <ProgressLabel>{asText(context.resolve(props.label))}</ProgressLabel>
      <ProgressValue />
    </Progress>
  );
};

const CalloutAdapter: Adapter<'Callout'> = ({ props, context }) => {
  const title = asText(context.resolve(props.title));
  return (
    <Alert
      role="note"
      variant={props.tone === 'error' ? 'destructive' : 'default'}
      data-tone={props.tone}
      className="sprout-a2ui-callout"
    >
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      <AlertDescription>
        <Markdown text={asText(context.resolve(props.text))} context={context} />
      </AlertDescription>
    </Alert>
  );
};

const CodeAdapter: Adapter<'Code'> = ({ props, context }) => (
  <CodeBlock code={asText(context.resolve(props.code))} language={props.language ?? 'text'} />
);

const ImageAdapter: Adapter<'Image'> = ({ props, context }) =>
  context.allowUrl(props.src, 'image') ? (
    <img src={props.src} alt={props.alt} loading="lazy" className="sprout-a2ui-image" />
  ) : (
    <A2uiUnavailable />
  );

const ButtonAdapter: Adapter<'Button'> = ({ props, context }) => (
  <Button
    variant="outline"
    size="sm"
    className="sprout-a2ui-button"
    disabled={!context.onAction}
    onClick={() => context.onAction?.({ type: 'send', text: props.message })}
  >
    {props.label}
  </Button>
);

/** Draws every component in `sprout/basic@1`. Spread it to add your own. */
export const sproutAdapters = {
  Text: TextAdapter,
  Heading: HeadingAdapter,
  Section: SectionAdapter,
  Row: RowAdapter,
  Column: ColumnAdapter,
  Card: CardAdapter,
  Divider: DividerAdapter,
  Tabs: TabsAdapter,
  Details: DetailsAdapter,
  Metric: MetricAdapter,
  Badge: BadgeAdapter,
  List: ListAdapter,
  Table: TableAdapter,
  Chart: ChartAdapter,
  Progress: ProgressAdapter,
  Callout: CalloutAdapter,
  Code: CodeAdapter,
  Image: ImageAdapter,
  Button: ButtonAdapter,
} satisfies Record<SproutComponentName, A2uiAdapter>;

export * from './catalog.js';
