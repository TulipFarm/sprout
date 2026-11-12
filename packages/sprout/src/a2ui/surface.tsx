'use client';

import {
  Component,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type AriaAttributes,
  type ComponentType,
  type CSSProperties,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/accordion.js';
import { Alert, AlertDescription, AlertTitle } from '../components/alert.js';
import { Badge, type BadgeVariant } from '../components/badge.js';
import { Button, type ButtonVariant } from '../components/button.js';
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
import { CheckboxField, ChoiceGroup, Field } from '../components/field.js';
import { Input } from '../components/input.js';
import { MessageResponse } from '../components/message-response.js';
import { Metric } from '../components/metric.js';
import { Progress, ProgressLabel, ProgressValue } from '../components/progress.js';
import { Separator } from '../components/separator.js';
import { Skeleton } from '../components/skeleton.js';
import { Slider } from '../components/slider.js';
import { Table, type TableColumn } from '../components/table.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/tabs.js';
import { Textarea } from '../components/textarea.js';
import { cn } from '../internal/classes.js';
import {
  a2uiVersion,
  componentCatalogId,
  componentProps,
  defaultAllowUrl,
  evaluate,
  evaluateChecks,
  expandChildren,
  isDataBinding,
  isFunctionCall,
  pointer,
  readSurface,
  sproutCatalog,
  writePath,
  type A2uiActionDefinition,
  type A2uiErrorCode,
  type A2uiTone,
  type Accessibility,
  type Catalog,
  type CheckRule,
  type ChecksResult,
  type ChildList,
  type DynamicValue,
  type EvaluateOptions,
  type Evaluation,
  type PendingCall,
  type RendererFunctions,
  type RendererMessage,
  type SproutComponentName,
  type SproutComponentProps,
  type Surface,
  type UrlKind,
} from './catalog.js';

/** A local request that never goes to the agent: show a whole table. The app decides where. */
export type A2uiLocalMessage = { type: 'expand'; componentId: string };
/** What `A2uiSurface` sends: an A2UI renderer message, or a local request. */
export type A2uiOutgoingMessage = RendererMessage | A2uiLocalMessage;
/**
 * Sent with every message when the surface was created with `sendDataModel`.
 * Put it in your transport's metadata.
 */
export type A2uiMessageMetadata = { dataModel: unknown };

export type A2uiSize = 'compact' | 'full';

/** Rows a compact table shows before "Show all". */
export const compactTableRows = 10;

/** `@accessibility`, resolved to ARIA attributes. Spread it on the adapter's root element. */
export type A2uiAria = Pick<AriaAttributes, 'aria-label' | 'aria-description' | 'aria-live' | 'aria-hidden'>;

/** A form field's check state. */
export interface A2uiFieldState {
  /** The message to show under the field, once the person has left it or tried to send. */
  error: string | undefined;
  /** True when a `required` check applies. */
  required: boolean;
  /** Call when the person leaves the field. */
  touch(): void;
}

export interface A2uiRenderContext {
  /** The component's ID. */
  id: string;
  size: A2uiSize;
  streaming: boolean;
  /** Fields and buttons are disabled. */
  readOnly: boolean;
  /** Resolves a literal, binding or function call in this component's scope, or `undefined` while pending. */
  resolve<T>(value: DynamicValue<T> | undefined): T | undefined;
  /** Renders one child component by ID. */
  child(id: string): ReactNode;
  /** Renders every child in a child list, each with a key. */
  children(ids: ChildList): ReactNode[];
  allowUrl(url: string, kind: UrlKind): boolean;
  aria: A2uiAria;
  /** Writes a field value into the viewer's copy of the data model. Only bindings are writable. */
  write(target: DynamicValue<unknown>, value: unknown): void;
  field: A2uiFieldState;
  /** The component's own `@checks`. */
  checks: ChecksResult;
  /** Runs a button action. Returns false when checks block it. */
  act(action: A2uiActionDefinition): boolean;
  /** True when actions can run: not read-only, and someone listens. */
  canAct: boolean;
  /** Asks the app to show all of this component, such as every table row. */
  expand?: (() => void) | undefined;
}

export interface A2uiAdapterProps<Props = any> {
  props: Props;
  context: A2uiRenderContext;
}

/** Draws one catalog component with real components. Hooks are allowed. */
export type A2uiAdapter<Props = any> = ComponentType<A2uiAdapterProps<Props>>;
/** Adapters by component name, for one catalog. */
export type A2uiAdapters = Readonly<Record<string, A2uiAdapter>>;

interface CallEntry {
  result: Evaluation;
  /** Set when the call went to the agent. */
  functionCallId?: string;
}

interface SurfaceContextValue {
  surface: Surface;
  data: unknown;
  catalogs: readonly Catalog[];
  adapters: Readonly<Record<string, A2uiAdapters>>;
  functions: RendererFunctions | undefined;
  size: A2uiSize;
  streaming: boolean;
  readOnly: boolean;
  allowUrl: (url: string, kind: UrlKind) => boolean;
  call: (request: PendingCall) => Evaluation;
  cached: (key: string) => Evaluation | undefined;
  write: (path: string, value: unknown) => void;
  touched: ReadonlySet<string>;
  touch: (key: string) => void;
  attempted: boolean;
  attempt: () => void;
  send?: ((message: A2uiOutgoingMessage) => void) | undefined;
  flush: () => void;
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

// Worst state of every function call in the props, except actions, which run on click.
function propsState(value: unknown, options: EvaluateOptions, key?: string): Evaluation['status'] {
  if (key === 'action') return 'done';
  if (isFunctionCall(value)) return evaluate(value, options).status;
  if (isDataBinding(value) || value === null || typeof value !== 'object') return 'done';
  let state: Evaluation['status'] = 'done';
  for (const [name, item] of Object.entries(value)) {
    const next = propsState(item, options, Array.isArray(value) ? undefined : name);
    if (next === 'error') return 'error';
    if (next === 'pending') state = 'pending';
  }
  return state;
}

const hasRequiredCheck = (checks: readonly CheckRule[] | undefined) =>
  (checks ?? []).some(rule => isFunctionCall(rule.condition) && rule.condition['@call'] === 'required');

const failureMessage = (checks: ChecksResult) => checks.failures[0]?.message;

function A2uiNode({
  id,
  scope,
  index,
  trail,
}: {
  id: string;
  scope: string;
  index: number | undefined;
  trail: readonly string[];
}) {
  const value = useContext(SurfaceContext)!;
  const { surface, catalogs, adapters, streaming } = value;
  useEffect(() => value.flush());
  const component = surface.components.get(id);
  if (!component) return streaming ? <A2uiPending /> : <A2uiUnavailable />;
  const catalogId = componentCatalogId(component, surface);
  const catalog = catalogs.find(item => item.id === catalogId);
  const definition =
    catalog && Object.hasOwn(catalog.components, component.component)
      ? catalog.components[component.component]
      : undefined;
  const Adapter = catalogId ? adapters[catalogId]?.[component.component] : undefined;
  if (!definition || !Adapter || trail.includes(`${id}|${scope}`) || trail.length > 32) return <A2uiUnavailable />;
  const parsed = definition.props.safeParse(componentProps(component));
  if (!parsed.success) return streaming ? <A2uiPending /> : <A2uiUnavailable />;
  const options: EvaluateOptions = {
    catalogs,
    data: value.data,
    scope,
    ...(index === undefined ? {} : { index }),
    ...(catalogId ? { catalogId } : {}),
    ...(value.functions ? { functions: value.functions } : {}),
    call: value.call,
    cached: value.cached,
  };
  const state = propsState(parsed.data, options);
  if (state === 'pending') return <A2uiPending />;
  if (state === 'error') return <A2uiUnavailable />;
  const resolve = <T,>(item: DynamicValue<T> | undefined) => {
    const result = evaluate(item, options);
    return result.status === 'done' ? (result.value as T) : undefined;
  };
  const accessibility: Accessibility = component['@accessibility'] ?? {};
  const hidden = resolve(accessibility.hidden);
  const label = resolve(accessibility.label);
  const description = resolve(accessibility.description);
  // Only set keys, so spreading `aria` keeps an adapter's own labels.
  const aria: A2uiAria = {
    ...(label ? { 'aria-label': label } : {}),
    ...(description ? { 'aria-description': description } : {}),
    ...(accessibility.live ? { 'aria-live': accessibility.live } : {}),
    ...(hidden === true ? { 'aria-hidden': true } : {}),
  };
  const checks = evaluateChecks(component['@checks'], options);
  const key = `${id}|${scope}`;
  const next = [...trail, key];
  const shown = value.attempted || value.touched.has(key);
  const { send } = value;
  const sendAction = value.readOnly ? undefined : send;
  const canAct = sendAction !== undefined;
  const context: A2uiRenderContext = {
    id,
    size: value.size,
    streaming,
    readOnly: value.readOnly,
    resolve,
    child: child => <A2uiNode key={child} id={child} scope={scope} index={index} trail={next} />,
    children: ids =>
      expandChildren(value.data, ids, scope, index).map(([child, childScope, childIndex], at) => (
        <A2uiNode key={`${at}:${child}`} id={child} scope={childScope} index={childIndex} trail={next} />
      )),
    allowUrl: value.allowUrl,
    aria,
    write: (target, item) => {
      if (!value.readOnly && isDataBinding(target))
        value.write(
          pointer(String(target['@path']), scope)
            .map(segment => `/${segment.replace(/~/g, '~0').replace(/\//g, '~1')}`)
            .join(''),
          item,
        );
    },
    field: {
      error: shown ? failureMessage(checks) : undefined,
      required: hasRequiredCheck(component['@checks']),
      touch: () => value.touch(key),
    },
    checks,
    canAct,
    act: action => {
      if (!sendAction) return false;
      if (!checks.valid) {
        value.attempt();
        return false;
      }
      const activated = { ...options, userActivated: true };
      if ('functionCall' in action) {
        const result = evaluate(action.functionCall, { ...activated, fresh: true });
        value.flush();
        if (result.status === 'error')
          sendAction({
            version: a2uiVersion,
            error: { code: result.code, surfaceId: surface.surfaceId, message: result.message },
          });
        return result.status !== 'error';
      }
      const { event } = action;
      const userMessage = evaluate(event.userMessage, activated);
      const context: Record<string, unknown> = {};
      for (const [name, item] of Object.entries(event.context ?? {})) {
        const result = evaluate(item, activated);
        if (result.status !== 'done') return false;
        context[name] = result.value ?? null;
      }
      if (userMessage.status !== 'done') return false;
      sendAction({
        version: a2uiVersion,
        action: {
          name: event.name,
          surfaceId: surface.surfaceId,
          sourceComponentId: id,
          timestamp: new Date().toISOString(),
          context,
          ...(typeof userMessage.value === 'string' && userMessage.value ? { userMessage: userMessage.value } : {}),
        },
      });
      return true;
    },
    expand: send ? () => send({ type: 'expand', componentId: id }) : undefined,
  };
  return (
    <NodeBoundary>
      <Adapter props={parsed.data} context={context} />
    </NodeBoundary>
  );
}

let callCount = 0;
const newCallId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `call_${Date.now()}_${++callCount}`;

const errorResponse = (functionCallId: string, code: A2uiErrorCode, message: string): RendererMessage => ({
  version: a2uiVersion,
  rendererFunctionResponse: { functionCallId, error: { code, message } },
});

/** Runs one `callRendererFunction` from the agent and returns its response. */
async function runRendererCall(
  request: Surface['rendererCalls'][number],
  catalogs: readonly Catalog[],
  functions: RendererFunctions | undefined,
  data: unknown,
): Promise<RendererMessage> {
  const { functionCallId, callFunction } = request;
  const name = String(callFunction['@call']);
  const catalog = catalogs.find(item => item.id === callFunction.catalogId);
  const definition = catalog && Object.hasOwn(catalog.functions, name) ? catalog.functions[name] : undefined;
  if (!catalog || !definition)
    return errorResponse(
      functionCallId,
      'INVALID_FUNCTION_CALL',
      `Unknown function "${name}" in "${callFunction.catalogId}".`,
    );
  if ((definition.allowedCallers ?? 'rendererOnly') === 'rendererOnly' || definition.requiresUserActivation)
    return errorResponse(functionCallId, 'INVALID_FUNCTION_CALL', `The agent may not call "${name}".`);
  const implementation = functions?.[catalog.id]?.[name] ?? definition.run;
  if (!implementation)
    return errorResponse(functionCallId, 'INVALID_FUNCTION_CALL', `"${name}" has no implementation in this renderer.`);
  const rawArgs = (callFunction.args ?? {}) as Record<string, unknown>;
  const options: EvaluateOptions = { catalogs, data, catalogId: catalog.id, ...(functions ? { functions } : {}) };
  const args: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(rawArgs)) {
    const result = evaluate(item, options);
    if (result.status !== 'done')
      return errorResponse(
        functionCallId,
        result.status === 'error' ? result.code : 'EXECUTION_ERROR',
        result.status === 'error' ? result.message : `Argument "${key}" is not ready.`,
      );
    args[key] = result.value;
  }
  if (definition.args && !definition.args.safeParse(args).success)
    return errorResponse(
      functionCallId,
      'INVALID_FUNCTION_CALL',
      `The arguments for "${name}" don't match its catalog.`,
    );
  try {
    const value = await implementation(args, {
      catalogId: catalog.id,
      data,
      scope: '',
      index: undefined,
      userActivated: false,
      evaluate: item => evaluate(item, options),
    });
    return { version: a2uiVersion, rendererFunctionResponse: { functionCallId, value: value ?? null } };
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? (error.code as A2uiErrorCode) : 'EXECUTION_ERROR';
    return errorResponse(functionCallId, code, error instanceof Error ? error.message : String(error));
  }
}

export interface A2uiSurfaceProps {
  /** A2UI messages for one surface, in order. They may be incomplete while streaming. */
  messages?: readonly unknown[];
  /** A surface already read with `readSurface` or `checkSurface`. Used instead of `messages`. */
  surface?: Surface;
  /** Every catalog the surface may use. Defaults to `[sproutCatalog]`. */
  catalogs?: readonly Catalog[];
  /** Adapters by catalog ID, then component name. Defaults to Sprout's adapters for `sproutCatalog`. */
  adapters?: Readonly<Record<string, A2uiAdapters>>;
  /** Renderer function implementations by catalog ID, then name. They add to or replace the catalogs' own. */
  functions?: RendererFunctions;
  /** `compact` fits a chat message: shorter charts and the first rows of each table. */
  size?: A2uiSize;
  /** Disables every field and button, such as after a form was sent. */
  readOnly?: boolean;
  /** Shows placeholders for components that have not arrived yet. */
  streaming?: boolean;
  /**
   * Receives `action`, `callAgentFunction`, `rendererFunctionResponse` and
   * `error` messages for the agent, and local `expand` requests. Feed the
   * agent's `agentFunctionResponse` back in through `messages`.
   */
  onMessage?: (message: A2uiOutgoingMessage, metadata?: A2uiMessageMetadata) => void;
  /** Decides which links are live. */
  allowUrl?: (url: string, kind: UrlKind) => boolean;
  className?: string;
}

const defaultCatalogs = [sproutCatalog];

/** Draws an A2UI 1.0 surface from catalog components. It never shows raw JSON. */
export function A2uiSurface({
  messages,
  surface: given,
  catalogs = defaultCatalogs,
  adapters = defaultAdapters,
  functions,
  size = 'full',
  readOnly = false,
  streaming = false,
  onMessage,
  allowUrl = defaultAllowUrl,
  className,
}: A2uiSurfaceProps) {
  const read = useMemo(() => given ?? readSurface(messages ?? []), [given, messages]);
  const surfaceId = read?.surfaceId;
  const [edits, setEdits] = useState<{ surfaceId: string | undefined; list: [string, unknown][] }>({
    surfaceId,
    list: [],
  });
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [attempted, setAttempted] = useState(false);
  const [, setTick] = useState(0);
  const calls = useRef(new Map<string, CallEntry>());
  const outbox = useRef<A2uiOutgoingMessage[]>([]);
  const answered = useRef(new Set<string>());
  const owner = useRef(surfaceId);
  if (owner.current !== surfaceId) {
    owner.current = surfaceId;
    calls.current = new Map();
    answered.current = new Set();
  }
  const list = edits.surfaceId === surfaceId ? edits.list : [];
  const data = useMemo(
    () => list.reduce<unknown>((current, [path, value]) => writePath(current, path, value), read?.data ?? {}),
    [list, read],
  );
  const dataRef = useRef(data);
  dataRef.current = data;
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const send = useCallback(
    (message: A2uiOutgoingMessage) =>
      onMessageRef.current?.(message, read?.sendDataModel ? { dataModel: dataRef.current } : undefined),
    [read],
  );
  const flush = useCallback(() => {
    for (const message of outbox.current.splice(0)) send(message);
  }, [send]);

  const responses = read?.functionResponses;
  const call = useCallback(
    (request: PendingCall): Evaluation => {
      let entry = calls.current.get(request.key);
      if (!entry || request.fresh) {
        entry = { result: { status: 'pending' } };
        const stored = entry;
        if (request.promise)
          request.promise.then(
            value => {
              stored.result = { status: 'done', value };
              setTick(tick => tick + 1);
            },
            (error: unknown) => {
              stored.result = {
                status: 'error',
                code: 'EXECUTION_ERROR',
                message: error instanceof Error ? error.message : String(error),
              };
              setTick(tick => tick + 1);
            },
          );
        else if (surfaceId !== undefined) {
          stored.functionCallId = newCallId();
          outbox.current.push({
            version: a2uiVersion,
            callAgentFunction: {
              surfaceId,
              functionCallId: stored.functionCallId,
              callFunction: { '@call': request.name, args: request.args, catalogId: request.catalogId },
            },
          });
        }
        if (!request.fresh) calls.current.set(request.key, entry);
      }
      return entry.result;
    },
    [surfaceId],
  );

  const cached = useCallback(
    (key: string): Evaluation | undefined => {
      const entry = calls.current.get(key);
      if (entry?.functionCallId && entry.result.status === 'pending') {
        const response = responses?.get(entry.functionCallId);
        if (response)
          entry.result = response.error
            ? { status: 'error', code: 'EXECUTION_ERROR', message: response.error.message }
            : { status: 'done', value: response.value };
      }
      return entry?.result;
    },
    [responses],
  );

  const write = useCallback(
    (path: string, value: unknown) =>
      setEdits(current => {
        const base = current.surfaceId === surfaceId ? current.list : [];
        return { surfaceId, list: [...base.filter(([item]) => item !== path), [path, value]] };
      }),
    [surfaceId],
  );
  const touch = useCallback(
    (key: string) => setTouched(current => (current.has(key) ? current : new Set(current).add(key))),
    [],
  );
  const attempt = useCallback(() => setAttempted(true), []);

  useEffect(() => {
    if (!read) return;
    for (const request of read.rendererCalls) {
      if (answered.current.has(request.functionCallId)) continue;
      answered.current.add(request.functionCallId);
      void runRendererCall(request, catalogs, functions, dataRef.current).then(send);
    }
  }, [read, catalogs, functions, send]);
  useEffect(() => flush());

  const value = useMemo<SurfaceContextValue | null>(
    () =>
      read
        ? {
            surface: read,
            data,
            catalogs,
            adapters,
            functions,
            size,
            streaming,
            readOnly,
            allowUrl,
            call,
            cached,
            write,
            touched,
            touch,
            attempted,
            attempt,
            send: onMessage ? send : undefined,
            flush,
          }
        : null,
    [
      read,
      data,
      catalogs,
      adapters,
      functions,
      size,
      streaming,
      readOnly,
      allowUrl,
      call,
      cached,
      write,
      touched,
      touch,
      attempted,
      attempt,
      onMessage,
      send,
      flush,
    ],
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
          <A2uiNode id="root" scope="" index={undefined} trail={[]} />
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

function Markdown({
  text,
  context,
  className,
  aria,
}: {
  text: string;
  context: A2uiRenderContext;
  className?: string;
  aria?: A2uiAria;
}) {
  return (
    <MessageResponse
      {...aria}
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
    aria={context.aria}
    className={cn('sprout-a2ui-text', props.variant === 'caption' && 'sprout-a2ui-caption')}
  />
);

const HeadingAdapter: Adapter<'Heading'> = ({ props, context }) => {
  const level = props.level ?? 2;
  return (
    <div {...context.aria} role="heading" aria-level={level + 1} data-level={level} className="sprout-a2ui-heading">
      {asText(context.resolve(props.text))}
    </div>
  );
};

const SectionAdapter: Adapter<'Section'> = ({ props, context }) => {
  const title = asText(context.resolve(props.title));
  return (
    <section className="sprout-a2ui-section" aria-label={title || undefined} {...context.aria}>
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
  <div
    {...context.aria}
    className="sprout-a2ui-row"
    data-gap={props.gap ?? 'medium'}
    data-align={props.align ?? 'stretch'}
  >
    {context.children(props.children)}
  </div>
);

const ColumnAdapter: Adapter<'Column'> = ({ props, context }) => (
  <div
    {...context.aria}
    className="sprout-a2ui-stack"
    data-gap={props.gap ?? 'medium'}
    data-align={props.align ?? 'stretch'}
  >
    {context.children(props.children)}
  </div>
);

const CardAdapter: Adapter<'Card'> = ({ props, context }) => {
  const title = asText(context.resolve(props.title));
  const description = asText(context.resolve(props.description));
  return (
    <Card {...context.aria} size="sm" className="sprout-a2ui-card">
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

const DividerAdapter: Adapter<'Divider'> = ({ context }) => (
  <Separator {...context.aria} className="sprout-a2ui-divider" />
);

const TabsAdapter: Adapter<'Tabs'> = ({ props, context }) => (
  <Tabs {...context.aria} defaultValue={0} className="sprout-a2ui-tabs">
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
  <Accordion {...context.aria} multiple className="sprout-a2ui-details">
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
      {...context.aria}
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
  <Badge {...context.aria} variant={badgeTone[props.tone ?? 'neutral']} className="sprout-a2ui-badge">
    {asText(context.resolve(props.text))}
  </Badge>
);

const ListAdapter: Adapter<'List'> = ({ props, context }) => {
  const List = props.ordered ? 'ol' : 'ul';
  return (
    <List {...context.aria} className="sprout-a2ui-list">
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
    <div {...context.aria} className="sprout-a2ui-table">
      <Table<Row>
        aria-label={label}
        data={shown}
        columns={tableColumns}
        getRowId={row => ids.get(row) ?? ''}
        caption={caption || undefined}
        narrow="scroll"
      />
      {limited ? (
        <Button
          variant="ghost"
          size="sm"
          className="sprout-a2ui-more"
          onClick={() => (context.expand ? context.expand() : setExpanded(true))}
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
  const unitGap = unit && /^[/%]/u.test(unit) ? '' : ' ';
  const valueFormatter = unit ? (value: number) => `${value.toLocaleString()}${unitGap}${unit}` : undefined;
  const common = { rows, category: props.category, title: props.title, valueFormatter };
  const horizontal = props.horizontal ?? rows.some(row => String(row[props.category] ?? '').length > 12);
  // Horizontal bars get taller with each bar, so grouped comparisons keep bars thick enough to read.
  const barRows = props.type === 'bar' && horizontal ? rows.length * (props.stack ? 1 : series.length) : 0;
  const style = barRows
    ? ({ '--sprout-a2ui-chart-height': `${Math.max(256, barRows * 18 + rows.length * 16 + 72)}px` } as CSSProperties)
    : undefined;
  const chart =
    props.type === 'bar' ? (
      <CategoryChart
        {...common}
        series={series}
        horizontal={horizontal}
        max={props.max}
        stack={props.stack ? 'stacked' : 'none'}
      />
    ) : props.type === 'line' ? (
      <TrendChart {...common} series={series} max={props.max} />
    ) : props.type === 'area' ? (
      <AreaTrendChart {...common} series={series} max={props.max} stack={props.stack ? 'stacked' : 'none'} />
    ) : (
      <DonutChart {...common} value={series[0]!.key} variant={props.type} />
    );
  return (
    <figure {...context.aria} className="sprout-a2ui-chart" style={style}>
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
          context={{ ...context, aria: {} }}
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
    <Progress {...context.aria} value={typeof value === 'number' ? value : null} className="sprout-a2ui-progress">
      <ProgressLabel>{asText(context.resolve(props.label))}</ProgressLabel>
      <ProgressValue />
    </Progress>
  );
};

const CalloutAdapter: Adapter<'Callout'> = ({ props, context }) => {
  const title = asText(context.resolve(props.title));
  return (
    <Alert
      {...context.aria}
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
  <div {...context.aria} className="sprout-a2ui-code">
    <CodeBlock code={asText(context.resolve(props.code))} language={props.language ?? 'text'} />
  </div>
);

function CheckAlert({ message }: { message: string | undefined }) {
  return (
    <span role="alert" className="sprout-a2ui-sr-only">
      {message ?? ''}
    </span>
  );
}

const buttonVariant: Record<'default' | 'primary' | 'borderless', ButtonVariant> = {
  default: 'outline',
  primary: 'default',
  borderless: 'ghost',
};

const ButtonAdapter: Adapter<'Button'> = ({ props, context }) => {
  // Failing checks keep the button focusable, so pressing it can show what to fix.
  const blocked = !context.checks.valid;
  const message = context.field.error;
  return (
    <div className="sprout-a2ui-action">
      <Button
        {...context.aria}
        variant={buttonVariant[props.variant ?? 'default']}
        size="sm"
        className="sprout-a2ui-button"
        disabled={!context.canAct}
        aria-disabled={blocked || undefined}
        data-blocked={blocked || undefined}
        onClick={() => context.act(props.action)}
      >
        {props.label}
      </Button>
      {message ? <p className="sprout-field-message sprout-field-error">{message}</p> : null}
      <CheckAlert message={message} />
    </div>
  );
};

const requirement = (context: A2uiRenderContext) =>
  context.field.required ? ({ required: true } as const) : ({ optional: true } as const);

const fieldDisabled = (context: A2uiRenderContext, value: unknown) => context.readOnly || !isDataBinding(value);

const TextFieldAdapter: Adapter<'TextField'> = ({ props, context }) => {
  const value = context.resolve(props.value);
  const disabled = fieldDisabled(context, props.value);
  const number = props.variant === 'number';
  const common = {
    value: asText(value),
    placeholder: asText(context.resolve(props.placeholder)) || undefined,
    disabled,
    onBlur: context.field.touch,
  };
  const change = (text: string) =>
    context.write(props.value, number && text.trim() !== '' && Number.isFinite(Number(text)) ? Number(text) : text);
  return (
    <div {...context.aria} className="sprout-a2ui-field">
      <Field
        label={asText(context.resolve(props.label))}
        error={context.field.error}
        disabled={disabled}
        {...requirement(context)}
      >
        {props.variant === 'longText' ? (
          <Textarea {...common} rows={4} onChange={event => change(event.target.value)} />
        ) : (
          <Input
            {...common}
            type={number ? 'number' : 'text'}
            inputMode={number ? 'decimal' : undefined}
            onChange={event => change(event.target.value)}
          />
        )}
      </Field>
      <CheckAlert message={context.field.error} />
    </div>
  );
};

const CheckBoxAdapter: Adapter<'CheckBox'> = ({ props, context }) => {
  const disabled = fieldDisabled(context, props.value);
  return (
    <div {...context.aria} className="sprout-a2ui-field">
      <CheckboxField
        label={asText(context.resolve(props.label))}
        checked={context.resolve(props.value) === true}
        disabled={disabled}
        error={context.field.error}
        onCheckedChange={checked => {
          context.write(props.value, checked);
          context.field.touch();
        }}
      />
      <CheckAlert message={context.field.error} />
    </div>
  );
};

const ChoicePickerAdapter: Adapter<'ChoicePicker'> = ({ props, context }) => {
  const [filter, setFilter] = useState('');
  const filterId = useId();
  const chosen = context.resolve(props.value);
  const value = Array.isArray(chosen) ? chosen.filter((item): item is string => typeof item === 'string') : [];
  const all = (context.resolve(props.options) ?? []).map(option => ({
    value: option.value,
    label: asText(context.resolve(option.label)) || option.value,
  }));
  const query = filter.trim().toLowerCase();
  const options = query ? all.filter(option => option.label.toLowerCase().includes(query)) : all;
  const disabled = fieldDisabled(context, props.value);
  const label = asText(context.resolve(props.label));
  const change = (next: string[]) => {
    context.write(props.value, next);
    context.field.touch();
  };
  const group =
    props.variant === 'multipleSelection' ? (
      <ChoiceGroup
        type="checkbox"
        legend={label}
        options={options}
        value={value}
        onValueChange={change}
        error={context.field.error}
        disabled={disabled}
        {...requirement(context)}
      />
    ) : (
      <ChoiceGroup
        type="radio"
        legend={label}
        options={options}
        value={value[0] ?? ''}
        onValueChange={next => change([next])}
        error={context.field.error}
        disabled={disabled}
        {...requirement(context)}
      />
    );
  return (
    <div {...context.aria} className="sprout-a2ui-field" data-display={props.displayStyle ?? 'checkbox'}>
      {props.filterable ? (
        <Input
          id={filterId}
          type="search"
          scale="sm"
          aria-label={`Filter ${label}`}
          placeholder="Filter"
          value={filter}
          onChange={event => setFilter(event.target.value)}
          className="sprout-a2ui-filter"
        />
      ) : null}
      {group}
      <CheckAlert message={context.field.error} />
    </div>
  );
};

const SliderAdapter: Adapter<'Slider'> = ({ props, context }) => {
  const labelId = useId();
  const min = props.min ?? 0;
  const raw = context.resolve(props.value);
  const value = typeof raw === 'number' ? Math.min(Math.max(raw, min), props.max) : min;
  const step = props.steps ? (props.max - min) / props.steps : 'any';
  const disabled = fieldDisabled(context, props.value);
  return (
    <div
      {...context.aria}
      className="sprout-a2ui-field sprout-a2ui-slider"
      data-invalid={context.field.error ? true : undefined}
    >
      <div className="sprout-a2ui-slider-header">
        <span id={labelId} className="sprout-field-label">
          {asText(context.resolve(props.label))}
        </span>
        <output aria-hidden="true" className="sprout-a2ui-slider-value">
          {value.toLocaleString()}
        </output>
      </div>
      <Slider<number>
        aria-labelledby={labelId}
        min={min}
        max={props.max}
        {...(step === 'any' ? {} : { step })}
        value={value}
        disabled={disabled}
        onValueChange={next => context.write(props.value, next)}
        onValueCommitted={() => context.field.touch()}
      />
      {context.field.error ? <p className="sprout-field-message sprout-field-error">{context.field.error}</p> : null}
      <CheckAlert message={context.field.error} />
    </div>
  );
};

// `<input type="datetime-local">` takes `YYYY-MM-DDTHH:mm`, without seconds or an offset.
const inputDate = (value: unknown, type: string) => {
  const text = asText(value);
  if (!text) return '';
  if (type === 'date') return text.slice(0, 10);
  if (type === 'time') return text.includes('T') ? text.slice(11, 16) : text.slice(0, 5);
  return text.slice(0, 16);
};

const DateTimeInputAdapter: Adapter<'DateTimeInput'> = ({ props, context }) => {
  const type = props.enableDate && props.enableTime ? 'datetime-local' : props.enableTime ? 'time' : 'date';
  const disabled = fieldDisabled(context, props.value);
  const min = inputDate(context.resolve(props.min), type) || undefined;
  const max = inputDate(context.resolve(props.max), type) || undefined;
  return (
    <div {...context.aria} className="sprout-a2ui-field">
      <Field
        label={asText(context.resolve(props.label))}
        error={context.field.error}
        disabled={disabled}
        {...requirement(context)}
      >
        <Input
          type={type}
          value={inputDate(context.resolve(props.value), type)}
          min={min}
          max={max}
          disabled={disabled}
          onChange={event => context.write(props.value, event.target.value)}
          onBlur={context.field.touch}
        />
      </Field>
      <CheckAlert message={context.field.error} />
    </div>
  );
};

/** Draws every component in `sprout/basic@2`. */
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
  Button: ButtonAdapter,
  TextField: TextFieldAdapter,
  CheckBox: CheckBoxAdapter,
  ChoicePicker: ChoicePickerAdapter,
  Slider: SliderAdapter,
  DateTimeInput: DateTimeInputAdapter,
} satisfies Record<SproutComponentName, A2uiAdapter>;

const defaultAdapters: Readonly<Record<string, A2uiAdapters>> = { [sproutCatalog.id]: sproutAdapters };

export * from './catalog.js';
