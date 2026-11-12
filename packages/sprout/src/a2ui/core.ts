import { z } from 'zod';

/** The A2UI protocol version this module reads and writes. */
export const a2uiVersion = '1.0' as const;
export type A2uiVersion = typeof a2uiVersion;
/** The protocol tag to store next to a layout. */
export const a2uiProtocol = 'a2ui/1.0' as const;

// --- Identifiers and reserved keys -----------------------------------------

/** UAX #31 identifiers: names of components, functions and props, and component IDs. */
export const identifierPattern = /^[\p{XID_Start}_][\p{XID_Continue}]*$/u;
export const isIdentifier = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 128 && identifierPattern.test(value);

const identifierMessage = 'Use letters, digits and _ only, not starting with a digit (no hyphens).';
export const identifierSchema = z.string().max(128).regex(identifierPattern, identifierMessage);

/** Keys that start with one `@` are protocol directives. A literal `@` key is escaped as `@@`. */
const reservedKey = /^@([^@]|$)/;
export const isReservedKey = (key: string) => reservedKey.test(key);

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value: unknown, key: string) =>
  value !== null && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key);

export type DataBinding = { '@path': string };
export type FunctionCall = { '@call': string; args?: Record<string, unknown>; catalogId?: string };
export type DynamicValue<T> = T | DataBinding | FunctionCall;

export const isDataBinding = (value: unknown): value is DataBinding => isObject(value) && own(value, '@path');
export const isFunctionCall = (value: unknown): value is FunctionCall => isObject(value) && own(value, '@call');

export const dataBindingSchema = z.strictObject({ '@path': z.string().max(512) });

/** A function call. Its arguments are checked against the function's catalog separately. */
export const functionCallSchema = z.strictObject({
  '@call': z.string().min(1).max(128),
  args: z.record(z.string().max(128), z.unknown()).optional(),
  catalogId: z.string().min(1).max(512).optional(),
});

/** A literal, a `{ "@path" }` binding to the data model, or a `{ "@call" }` function call. */
export const dynamic = <T extends z.ZodType>(literal: T) => z.union([literal, dataBindingSchema, functionCallSchema]);

const literalValue = z
  .unknown()
  .refine(
    value => !isObject(value) || (!own(value, '@path') && !own(value, '@call')),
    'A binding is exactly {"@path"}; a function call has only "@call", "args" and "catalogId".',
  );
/** Any value: a literal, a binding or a function call. */
export const dynamicValueSchema = z.union([dataBindingSchema, functionCallSchema, literalValue]);
export const dynamicStringSchema = dynamic(z.string().max(20_000));
export const dynamicNumberSchema = dynamic(z.number());
export const dynamicBooleanSchema = dynamic(z.boolean());
export const dynamicStringListSchema = dynamic(z.array(z.string().max(2000)).max(1000));

/** The ID of a component in the same surface. */
export const componentIdSchema = identifierSchema.min(1);

/** A list of child IDs, or a template repeated once per item of a data list. */
export const childListSchema = z.union([
  z.array(componentIdSchema).max(500),
  z.strictObject({ componentId: componentIdSchema, path: z.string().min(1).max(512) }),
]);
export type ChildList = string[] | { componentId: string; path: string };

const extensionsSchema = z.record(identifierSchema, z.unknown());
/** `{ extensions }`, with UAX #31 extension names. */
export const metadataSchema = z.strictObject({ extensions: extensionsSchema.optional() });

/** Screen-reader attributes any component can carry under `@accessibility`. */
export const accessibilitySchema = z.strictObject({
  label: dynamic(z.string().max(300)).optional(),
  description: dynamic(z.string().max(1000)).optional(),
  live: z.enum(['off', 'polite', 'assertive']).optional(),
  hidden: dynamicBooleanSchema.optional(),
});
export type Accessibility = z.infer<typeof accessibilitySchema>;

/** One `@checks` rule: a condition and the message shown when it fails. */
export const checkRuleSchema = z.strictObject({
  condition: z.union([dataBindingSchema, functionCallSchema]),
  message: z.string().max(500).optional(),
});
export type CheckRule = z.infer<typeof checkRuleSchema>;

/** What a button does: send an event to the agent, or call a function. */
export const actionSchema = z.union([
  z.strictObject({
    event: z.strictObject({
      name: z.string().min(1).max(128),
      userMessage: dynamic(z.string().max(2000)).optional(),
      context: z.record(z.string().max(128), dynamicValueSchema).optional(),
    }),
  }),
  z.strictObject({ functionCall: functionCallSchema }),
]);
export type A2uiActionDefinition = z.infer<typeof actionSchema>;

// --- Catalogs --------------------------------------------------------------

/** A link from a component to its children, used to walk and check the tree. */
export type ChildRef = { prop: string; ids: ChildList };

export interface TextContext {
  /** Resolves a literal, binding or function call in the component's scope. */
  resolve<T>(value: DynamicValue<T> | undefined): T | undefined;
  /** The plain text of each child, in order. */
  children(ids: ChildList | string | undefined): string[];
}

export interface CheckContext {
  resolve<T>(value: DynamicValue<T> | undefined): T | undefined;
  limits: SurfaceLimits;
  allowUrl: (url: string, kind: UrlKind) => boolean;
  /** Reports a problem with one prop of this component. */
  report(prop: string, message: string): void;
  /** Adds to the surface's text length. */
  countText(length: number): void;
}

export interface CatalogComponent<Props = any> {
  /** One line for agents: what the component is for. */
  description: string;
  /** The component's own props as sent, without the envelope keys. */
  props: z.ZodType<Props>;
  /** Parent component names this component may appear in. `Surface` means the root. */
  allowedParents?: readonly string[];
  /** Component names allowed as children. */
  allowedChildren?: readonly string[];
  /** Whether the component accepts `@checks`. */
  checkable?: boolean;
  /** Every prop that points at other components. */
  children?: (props: Props) => ChildRef[];
  /** The component as plain text, for copy, search and model history. */
  text?: (props: Props, context: TextContext) => string;
  /** Checks that need the data model or options, such as row limits. */
  check?: (props: Props, context: CheckContext) => void;
}

export type FunctionReturnType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'validationResult'
  | 'any'
  | 'void';
export type AllowedCallers = 'rendererOnly' | 'agentOnly' | 'rendererOrAgent';

export interface FunctionContext {
  /** The catalog the call resolved to. */
  catalogId: string;
  data: unknown;
  scope: string;
  /** The innermost template index, if any. */
  index: number | undefined;
  /** True when a click or key press started the call. */
  userActivated: boolean;
  /** Evaluates a literal, binding or call in the caller's scope and catalog. */
  evaluate(value: unknown): unknown;
}

/** A renderer-side function implementation. It receives resolved arguments. */
export type RendererFunction = (args: Record<string, any>, context: FunctionContext) => unknown;
/** Implementations by catalog ID, then function name. */
export type RendererFunctions = Readonly<Record<string, Readonly<Record<string, RendererFunction>>>>;

export interface CatalogFunction<Args = any> {
  description: string;
  /** The arguments as sent, where each may be a binding or call. Defaults to no arguments. */
  args?: z.ZodType<Args>;
  returnType: FunctionReturnType;
  /** Who may call it. Defaults to `rendererOnly`. */
  allowedCallers?: AllowedCallers;
  /** Runs only from a click or key press. Such functions are always `rendererOnly`. */
  requiresUserActivation?: boolean;
  /** The renderer implementation. Without one, renderer calls go to the agent. */
  run?: RendererFunction;
}

export interface Catalog {
  id: string;
  protocolVersion: A2uiVersion;
  title?: string;
  description?: string;
  /** Usage rules for agents, in Markdown. */
  instructions?: string;
  components: Readonly<Record<string, CatalogComponent>>;
  functions: Readonly<Record<string, CatalogFunction>>;
}

/** Typed helper for one catalog component. */
export const defineComponent = <Props>(component: CatalogComponent<Props>): CatalogComponent<Props> => component;
/** Typed helper for one catalog function. */
export const defineFunction = <Args>(definition: CatalogFunction<Args>): CatalogFunction<Args> => definition;

const objectKeys = (schema: z.ZodType | undefined): string[] =>
  schema instanceof z.ZodObject ? Object.keys(schema.shape) : [];

/**
 * Builds a catalog. Names of components, functions, props and arguments must
 * be UAX #31 identifiers. To use several catalogs on one surface, pass them
 * all to `checkSurface` and `A2uiSurface`; components from a catalog other
 * than the surface's name it with `@catalogId`.
 */
export function defineCatalog({
  id,
  title,
  description,
  instructions,
  components = {},
  functions = {},
}: {
  id: string;
  title?: string;
  description?: string;
  instructions?: string;
  components?: Record<string, CatalogComponent>;
  functions?: Record<string, CatalogFunction>;
}): Catalog {
  if (!id) throw new Error('A catalog needs an ID.');
  for (const [name, component] of Object.entries(components)) {
    if (!isIdentifier(name)) throw new Error(`Component name "${name}": ${identifierMessage}`);
    if (name === 'Surface') throw new Error('"Surface" is reserved for the root of a surface.');
    for (const prop of objectKeys(component.props))
      if (!isIdentifier(prop)) throw new Error(`Prop "${name}.${prop}": ${identifierMessage}`);
  }
  for (const [name, definition] of Object.entries(functions)) {
    if (!isIdentifier(name)) throw new Error(`Function name "${name}": ${identifierMessage}`);
    for (const arg of objectKeys(definition.args))
      if (!isIdentifier(arg)) throw new Error(`Argument "${name}.${arg}": ${identifierMessage}`);
    if (definition.requiresUserActivation && (definition.allowedCallers ?? 'rendererOnly') !== 'rendererOnly')
      throw new Error(`Function "${name}" requires user activation, so it must be rendererOnly.`);
  }
  return Object.freeze({
    id,
    protocolVersion: a2uiVersion,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(instructions ? { instructions } : {}),
    components: Object.freeze({ ...components }),
    functions: Object.freeze({ ...functions }),
  });
}

const findCatalog = (catalogs: readonly Catalog[], id: string | undefined) =>
  id === undefined ? undefined : catalogs.find(catalog => catalog.id === id);

// --- Limits and URLs -------------------------------------------------------

export type UrlKind = 'link' | 'image';

export interface SurfaceLimits {
  components: number;
  /** Size of the messages as JSON, in bytes. */
  bytes: number;
  tableRows: number;
  chartPoints: number;
  /** Characters of text across the surface. */
  textLength: number;
  depth: number;
}

export const defaultSurfaceLimits: SurfaceLimits = {
  components: 300,
  bytes: 256 * 1024,
  tableRows: 1000,
  chartPoints: 2000,
  textLength: 100_000,
  depth: 24,
};

/** Links may use HTTP, HTTPS and mailto. Images are refused unless the app allows them. */
export function defaultAllowUrl(url: string, kind: UrlKind): boolean {
  if (kind === 'image') return false;
  return /^(https?:\/\/|mailto:)/i.test(url.trim());
}

// --- Messages --------------------------------------------------------------

const version = z.literal(a2uiVersion);
const surfaceIdSchema = z.string().min(1).max(128);
const callIdSchema = z.string().min(1).max(256);

const envelopeKeys = new Set(['id', 'component', '@catalogId', '@accessibility', '@checks', '@metadata']);

/** One component as sent: the envelope keys and its own props, flat. */
export const componentSchema = z.looseObject({
  id: componentIdSchema,
  component: identifierSchema.refine(name => name !== 'Surface', '"Surface" is reserved for the root of a surface.'),
  '@catalogId': z.string().min(1).max(512).optional(),
  '@accessibility': accessibilitySchema.optional(),
  '@checks': z.array(checkRuleSchema).max(50).optional(),
  '@metadata': metadataSchema.optional(),
});
export type A2uiComponent = z.infer<typeof componentSchema>;

/** A function result: exactly one of `value` and `error`. */
export const functionResponseSchema = z
  .strictObject({
    functionCallId: callIdSchema,
    value: z.unknown().optional(),
    error: z.strictObject({ code: z.string().min(1).max(64), message: z.string().max(2000) }).optional(),
  })
  .refine(response => own(response, 'value') !== own(response, 'error'), 'Send exactly one of "value" and "error".');
export type FunctionResponse = { functionCallId: string; value?: unknown; error?: { code: string; message: string } };

const callRendererFunctionSchema = z.strictObject({
  surfaceId: surfaceIdSchema.optional(),
  functionCallId: callIdSchema,
  callFunction: functionCallSchema.extend({ catalogId: z.string().min(1).max(512) }),
});
export type CallRendererFunction = z.infer<typeof callRendererFunctionSchema>;

export const surfaceMessageSchema = z.union([
  z.strictObject({
    version,
    createSurface: z.strictObject({
      surfaceId: surfaceIdSchema,
      catalogId: z.string().min(1).max(512).optional(),
      sendDataModel: z.boolean().optional(),
      components: z.array(componentSchema).min(1).max(5000).optional(),
      dataModel: z.record(z.string(), z.unknown()).optional(),
      metadata: metadataSchema.optional(),
    }),
  }),
  z.strictObject({
    version,
    updateComponents: z.strictObject({
      surfaceId: surfaceIdSchema,
      components: z.array(componentSchema).max(5000),
    }),
  }),
  z.strictObject({
    version,
    updateDataModel: z.strictObject({
      surfaceId: surfaceIdSchema,
      path: z.string().max(512).optional(),
      // `null` deletes the value at the path.
      value: z.unknown().refine(value => value !== undefined, 'value is required; send null to delete.'),
    }),
  }),
  z.strictObject({ version, deleteSurface: z.strictObject({ surfaceId: surfaceIdSchema }) }),
  z.strictObject({ version, callRendererFunction: callRendererFunctionSchema }),
  z.strictObject({ version, agentFunctionResponse: functionResponseSchema }),
]);
export type SurfaceMessage = z.infer<typeof surfaceMessageSchema>;

/** The A2UI messages for one surface, in order. */
export const surfaceSchema = z.array(surfaceMessageSchema).max(1000);

const validationErrorCodes = ['VALIDATION_FAILED', 'UNALLOWED_PARENT', 'UNALLOWED_CHILD'] as const;

/** Messages a renderer sends to the agent. */
export const rendererMessageSchema = z.union([
  z.strictObject({
    version,
    action: z.looseObject({
      name: z.string().min(1).max(128),
      userMessage: z.string().max(2000).optional(),
      surfaceId: surfaceIdSchema,
      sourceComponentId: componentIdSchema,
      timestamp: z.iso.datetime({ offset: true }),
      context: z.record(z.string(), z.unknown()),
      metadata: metadataSchema.optional(),
    }),
  }),
  z.strictObject({
    version,
    callAgentFunction: z.strictObject({
      surfaceId: surfaceIdSchema,
      functionCallId: callIdSchema,
      callFunction: functionCallSchema,
    }),
  }),
  z.strictObject({ version, rendererFunctionResponse: functionResponseSchema }),
  z.strictObject({
    version,
    error: z.union([
      z.strictObject({
        code: z.enum(validationErrorCodes),
        surfaceId: surfaceIdSchema,
        path: z.string(),
        message: z.string(),
      }),
      z
        .looseObject({
          code: z
            .string()
            .min(1)
            .refine(code => !(validationErrorCodes as readonly string[]).includes(code)),
          message: z.string(),
          surfaceId: surfaceIdSchema.optional(),
          functionCallId: callIdSchema.optional(),
        })
        .refine(
          error => (error.surfaceId === undefined) !== (error.functionCallId === undefined),
          'Send exactly one of "surfaceId" and "functionCallId".',
        ),
    ]),
  }),
]);
export type RendererMessage = z.infer<typeof rendererMessageSchema>;

// --- The surface model -----------------------------------------------------

/** A surface after its messages are applied. */
export interface Surface {
  surfaceId: string;
  /** The default catalog for components without `@catalogId`. */
  catalogId: string | undefined;
  components: ReadonlyMap<string, A2uiComponent>;
  data: unknown;
  deleted: boolean;
  sendDataModel: boolean;
  metadata: z.infer<typeof metadataSchema> | undefined;
  /** Function calls from the agent, in order. */
  rendererCalls: readonly CallRendererFunction[];
  /** Results of calls the renderer sent to the agent, by call ID. */
  functionResponses: ReadonlyMap<string, FunctionResponse>;
}

const unescapeSegment = (segment: string) => segment.replace(/~1/g, '/').replace(/~0/g, '~');
const escapeSegment = (segment: string) => segment.replace(/~/g, '~0').replace(/\//g, '~1');

/** Splits a JSON Pointer. A pointer without a leading slash is relative to `scope`. */
export function pointer(path: string, scope = ''): string[] {
  const absolute = path.startsWith('/') ? path : `${scope}/${path}`;
  return absolute
    .split('/')
    .slice(1)
    .filter(segment => segment !== '')
    .map(unescapeSegment);
}

/** Reads the value at a JSON Pointer, or `undefined`. */
export function readPath(data: unknown, path: string, scope = ''): unknown {
  let value = data;
  for (const segment of pointer(path, scope)) {
    if (!own(value, segment)) return undefined;
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}

const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);

/** Returns a copy of `data` with `value` at `path`. `null` or `undefined` deletes it. */
export function writePath(data: unknown, path: string | undefined, value: unknown, scope = ''): unknown {
  const segments = pointer(path ?? '/', scope);
  if (segments.some(segment => unsafeKeys.has(segment))) return data;
  const remove = value === null || value === undefined;
  if (segments.length === 0) return remove ? {} : value;
  const copy = (node: unknown, index: number): unknown => {
    const segment = segments[index]!;
    const base: Record<string, unknown> | unknown[] = Array.isArray(node)
      ? [...node]
      : isObject(node)
        ? { ...node }
        : /^\d+$/.test(segment)
          ? []
          : {};
    const container = base as Record<string, unknown>;
    if (index === segments.length - 1) {
      if (!remove) container[segment] = value;
      else if (Array.isArray(base)) base.splice(Number(segment), 1);
      else delete container[segment];
    } else {
      const next = own(node, segment) ? (node as Record<string, unknown>)[segment] : undefined;
      container[segment] = copy(next, index + 1);
    }
    return base;
  };
  return copy(data, 0);
}

/**
 * Applies A2UI messages for one surface in order, leniently: unknown shapes
 * are skipped, so a surface can be drawn while it streams. Use `checkSurface`
 * for the strict check.
 */
export function readSurface(messages: readonly unknown[]): Surface | undefined {
  let surface:
    | (Omit<Surface, 'components' | 'rendererCalls' | 'functionResponses'> & {
        components: Map<string, A2uiComponent>;
        rendererCalls: CallRendererFunction[];
        functionResponses: Map<string, FunctionResponse>;
      })
    | undefined;
  const setComponents = (list: unknown) => {
    if (!surface || !Array.isArray(list)) return;
    for (const component of list)
      if (componentSchema.safeParse(component).success) surface.components.set(component.id, component);
  };
  const targets = (value: Record<string, any>) => surface && value.surfaceId === surface.surfaceId;
  for (const raw of messages) {
    if (!isObject(raw) || raw.version !== a2uiVersion) continue;
    const message = raw as Record<string, any>;
    if (isObject(message.createSurface) && typeof message.createSurface.surfaceId === 'string') {
      if (surface) continue;
      const create = message.createSurface as Record<string, any>;
      surface = {
        surfaceId: create.surfaceId as string,
        catalogId: typeof create.catalogId === 'string' ? create.catalogId : undefined,
        components: new Map(),
        data: isObject(create.dataModel) ? create.dataModel : {},
        deleted: false,
        sendDataModel: create.sendDataModel === true,
        metadata: isObject(create.metadata) ? create.metadata : undefined,
        rendererCalls: [],
        functionResponses: new Map(),
      };
      setComponents(create.components);
    } else if (isObject(message.updateComponents) && targets(message.updateComponents)) {
      setComponents(message.updateComponents.components);
    } else if (isObject(message.updateDataModel) && targets(message.updateDataModel)) {
      const { path, value } = message.updateDataModel;
      surface!.data = writePath(surface!.data, typeof path === 'string' ? path : undefined, value);
    } else if (isObject(message.deleteSurface) && targets(message.deleteSurface)) {
      surface!.deleted = true;
    } else if (surface && isObject(message.callRendererFunction)) {
      const call = callRendererFunctionSchema.safeParse(message.callRendererFunction);
      if (call.success && (call.data.surfaceId === undefined || call.data.surfaceId === surface.surfaceId))
        surface.rendererCalls.push(call.data);
    } else if (surface && isObject(message.agentFunctionResponse)) {
      const response = functionResponseSchema.safeParse(message.agentFunctionResponse);
      if (response.success) surface.functionResponses.set(response.data.functionCallId, response.data);
    }
  }
  return surface;
}

/** One expanded child: its ID, data scope and innermost template index. */
export type ExpandedChild = [id: string, scope: string, index: number | undefined];

/** Expands a child list. Templates repeat once per array item. */
export function expandChildren(
  data: unknown,
  ids: ChildList | string | undefined,
  scope = '',
  index?: number,
): ExpandedChild[] {
  if (ids === undefined) return [];
  if (typeof ids === 'string') return [[ids, scope, index]];
  if (Array.isArray(ids)) return ids.map(id => [id, scope, index]);
  const list = readPath(data, ids.path, scope);
  if (!Array.isArray(list)) return [];
  const base = pointer(ids.path, scope)
    .map(segment => `/${escapeSegment(segment)}`)
    .join('');
  return list.map((_, at) => [ids.componentId, `${base}/${at}`, at]);
}

/** A component's own props, without the envelope keys. */
export function componentProps(component: A2uiComponent): Record<string, unknown> {
  return Object.fromEntries(Object.entries(component).filter(([key]) => !envelopeKeys.has(key)));
}

/** The catalog ID a component resolves to: its `@catalogId`, then the surface's. Never a fallback. */
export const componentCatalogId = (component: A2uiComponent, surface: Pick<Surface, 'catalogId'>) =>
  component['@catalogId'] ?? surface.catalogId;

// --- Evaluation ------------------------------------------------------------

export type A2uiErrorCode =
  | 'VALIDATION_FAILED'
  | 'INVALID_RESERVED_KEY'
  | 'INVALID_FUNCTION_CALL'
  | 'EXPRESSION_ERROR'
  | 'EXECUTION_ERROR'
  | 'UNALLOWED_PARENT'
  | 'UNALLOWED_CHILD'
  | 'INTEGRITY_ERROR';

export type Evaluation =
  | { status: 'done'; value: unknown }
  | { status: 'pending' }
  | { status: 'error'; code: A2uiErrorCode; message: string };

/** A call that the renderer cannot finish synchronously. */
export interface PendingCall {
  /** Same catalog, name and arguments give the same key. */
  key: string;
  catalogId: string;
  name: string;
  args: Record<string, unknown>;
  /** The local implementation's promise. Without one, the call goes to the agent. */
  promise?: PromiseLike<unknown>;
  /** Actions always make a new call instead of sharing an earlier result. */
  fresh: boolean;
}

export interface EvaluateOptions {
  catalogs: readonly Catalog[];
  data: unknown;
  scope?: string;
  index?: number;
  /** The catalog for calls without `catalogId`: the component's catalog. */
  catalogId?: string;
  /** Implementations that add to or replace the catalogs' own. */
  functions?: RendererFunctions;
  userActivated?: boolean;
  fresh?: boolean;
  /** Resolves async and agent calls. Without it they stay pending. */
  call?: (request: PendingCall) => Evaluation;
  /** An earlier result for a call key, so a known call is not run again. */
  cached?: (key: string) => Evaluation | undefined;
}

/** Throw from a renderer function to fail with an A2UI error code. */
export class EvaluationError extends Error {
  constructor(
    readonly code: A2uiErrorCode,
    message: string,
  ) {
    super(message);
  }
}
const pendingSignal = Symbol('pending');

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  value !== null &&
  (typeof value === 'object' || typeof value === 'function') &&
  typeof (value as any).then === 'function';

/** Turns `@@key` back into `@key` in a literal object. */
export function unescapeLiteral(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(unescapeLiteral);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key.startsWith('@@') ? key.slice(1) : key, unescapeLiteral(item)]),
  );
}

export const callKey = (catalogId: string, name: string, args: unknown) => JSON.stringify([catalogId, name, args]);

function evaluateOrThrow(value: unknown, options: EvaluateOptions): unknown {
  if (isDataBinding(value)) return readPath(options.data, String(value['@path']), options.scope);
  if (isFunctionCall(value)) return callOrThrow(value, options);
  return unescapeLiteral(value);
}

const evaluateArgument = (value: unknown, options: EvaluateOptions): unknown =>
  Array.isArray(value) ? value.map(item => evaluateOrThrow(item, options)) : evaluateOrThrow(value, options);

const unwrap = (result: Evaluation) => {
  if (result.status === 'done') return result.value;
  if (result.status === 'pending') throw pendingSignal;
  throw new EvaluationError(result.code, result.message);
};

function callOrThrow(call: FunctionCall, options: EvaluateOptions): unknown {
  const name = String(call['@call']);
  const rawArgs = isObject(call.args) ? call.args : {};
  if (name === '@index') {
    if (options.index === undefined)
      throw new EvaluationError('EXPRESSION_ERROR', '@index is only available inside a template.');
    const offset = evaluateOrThrow(rawArgs.offset ?? 0, options);
    return options.index + (typeof offset === 'number' ? offset : 0);
  }
  const catalogId = typeof call.catalogId === 'string' ? call.catalogId : options.catalogId;
  const catalog = findCatalog(options.catalogs, catalogId);
  if (!catalog || !catalogId) throw new EvaluationError('EXPRESSION_ERROR', `Function "${name}" has no known catalog.`);
  const definition = Object.hasOwn(catalog.functions, name) ? catalog.functions[name] : undefined;
  if (!definition) throw new EvaluationError('EXPRESSION_ERROR', `Unknown function "${name}" in "${catalogId}".`);
  if (definition.allowedCallers === 'agentOnly')
    throw new EvaluationError('EXPRESSION_ERROR', `Function "${name}" can only be called by the agent.`);
  if (definition.requiresUserActivation && !options.userActivated)
    throw new EvaluationError('EXPRESSION_ERROR', `Function "${name}" runs only from a click or key press.`);
  const scoped = { ...options, catalogId };
  const args = Object.fromEntries(Object.entries(rawArgs).map(([key, item]) => [key, evaluateArgument(item, scoped)]));
  const key = callKey(catalogId, name, args);
  const fresh = options.fresh ?? false;
  const known = fresh ? undefined : options.cached?.(key);
  if (known) return unwrap(known);
  const implementation = options.functions?.[catalogId]?.[name] ?? definition.run;
  if (implementation) {
    const result = implementation(args, {
      catalogId,
      data: options.data,
      scope: options.scope ?? '',
      index: options.index,
      userActivated: options.userActivated ?? false,
      evaluate: item => evaluateOrThrow(item, scoped),
    });
    if (!isThenable(result)) return result;
    if (!options.call) throw pendingSignal;
    return unwrap(options.call({ key, catalogId, name, args, promise: result, fresh }));
  }
  const wire = Object.fromEntries(Object.entries(args).map(([item, value]) => [item, value ?? null]));
  if (definition.args && !definition.args.safeParse(wire).success)
    throw new EvaluationError('EXPRESSION_ERROR', `The arguments for "${name}" don't match its catalog.`);
  if (!options.call) throw pendingSignal;
  return unwrap(options.call({ key, catalogId, name, args: wire, fresh }));
}

/** Evaluates a literal, `{ "@path" }` binding or `{ "@call" }` function call. */
export function evaluate(value: unknown, options: EvaluateOptions): Evaluation {
  try {
    return { status: 'done', value: evaluateOrThrow(value, options) };
  } catch (error) {
    if (error === pendingSignal) return { status: 'pending' };
    if (error instanceof EvaluationError) return { status: 'error', code: error.code, message: error.message };
    return {
      status: 'error',
      code: 'EXPRESSION_ERROR',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Like `evaluate`, but returns `undefined` unless the value is ready. */
export function resolveValue<T>(value: DynamicValue<T> | undefined, options: EvaluateOptions): T | undefined {
  const result = evaluate(value, options);
  return result.status === 'done' ? (result.value as T) : undefined;
}

/** Reads values in a `formatString` template: `${/path}`, `${relative}`, `${fn(arg: 'x')}` and `\${`. */
export function interpolate(template: string, evaluateValue: (value: unknown) => unknown): string {
  let at = 0;
  const text = (value: unknown) =>
    value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  const fail = (message: string): never => {
    throw new EvaluationError('EXPRESSION_ERROR', `formatString: ${message}`);
  };
  const space = () => {
    while (/\s/.test(template[at] ?? '')) at++;
  };
  const expression = (): unknown => {
    // After `${`.
    space();
    const start = at;
    while (at < template.length && !/[\s(})]/.test(template[at]!)) at++;
    const head = template.slice(start, at);
    space();
    if (template[at] === '(') {
      at++;
      const args: Record<string, unknown> = {};
      space();
      while (template[at] !== ')') {
        space();
        const nameStart = at;
        while (at < template.length && /[\p{XID_Continue}]/u.test(template[at]!)) at++;
        const argName = template.slice(nameStart, at);
        space();
        if (!argName || template[at] !== ':') fail('expected name: value.');
        at++;
        space();
        args[argName] = argument();
        space();
        if (template[at] === ',') at++;
        else if (template[at] !== ')') fail('expected , or ).');
      }
      at++;
      space();
      if (template[at] !== '}') fail('expected }.');
      at++;
      return evaluateValue({ '@call': head, args });
    }
    if (template[at] !== '}' || !head) fail('expected a path or a function call.');
    at++;
    return evaluateValue({ '@path': head });
  };
  const argument = (): unknown => {
    const char = template[at];
    if (char === "'" || char === '"') {
      let value = '';
      at++;
      while (at < template.length && template[at] !== char) {
        if (template[at] === '\\') at++;
        value += template[at] ?? '';
        at++;
      }
      if (template[at] !== char) fail('unclosed string.');
      at++;
      return value;
    }
    if (template.startsWith('${', at)) {
      at += 2;
      return expression();
    }
    const match = /^(true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(template.slice(at));
    if (!match) return fail('arguments are quoted strings, numbers, booleans or ${...}.');
    at += match[0].length;
    return JSON.parse(match[0]);
  };
  let output = '';
  while (at < template.length) {
    if (template.startsWith('\\${', at)) {
      output += '${';
      at += 3;
    } else if (template.startsWith('${', at)) {
      at += 2;
      output += text(expression());
    } else output += template[at++];
  }
  return output;
}

// --- Checks ----------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  code?: string;
  message?: string;
  severity?: 'error' | 'warning' | 'info';
}

export const isValidationResult = (value: unknown): value is ValidationResult =>
  isObject(value) && typeof value.valid === 'boolean';

/** A2UI's boolean coercion: `"true"`/`"false"` strings, non-zero numbers and `ValidationResult.valid`. */
export function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0 && !Number.isNaN(value);
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  if (isValidationResult(value)) return value.valid;
  return false;
}

const defaultCheckMessages: Record<string, string> = {
  REQUIRED: 'This field is required.',
  PATTERN_MISMATCH: "This value doesn't match the expected format.",
  TOO_SHORT: 'This value is too short.',
  TOO_LONG: 'This value is too long.',
  NOT_A_NUMBER: 'Enter a number.',
  TOO_SMALL: 'This number is too small.',
  TOO_LARGE: 'This number is too large.',
  INVALID_EMAIL: 'Enter an email address.',
};

/**
 * A check's outcome as a `ValidationResult`. A failure's message is the
 * result's own, then the check's `message`, then a default for its code.
 */
export function toValidationResult(value: unknown, message?: string): ValidationResult {
  const result: ValidationResult = isValidationResult(value) ? value : { valid: toBoolean(value) };
  if (result.valid) return result;
  const text = result.message ?? message ?? defaultCheckMessages[result.code ?? ''] ?? "This value isn't valid.";
  return { ...result, message: text, severity: result.severity ?? 'error' };
}

export interface ChecksResult {
  /** True when every check has passed. */
  valid: boolean;
  /** True while a check is waiting for a result. */
  pending: boolean;
  /** The failed checks. */
  failures: ValidationResult[];
}

/** Runs a component's `@checks` rules. */
export function evaluateChecks(checks: readonly CheckRule[] | undefined, options: EvaluateOptions): ChecksResult {
  const failures: ValidationResult[] = [];
  let pending = false;
  for (const rule of checks ?? []) {
    const result = evaluate(rule.condition, options);
    if (result.status === 'pending') pending = true;
    else if (result.status === 'error')
      failures.push({ valid: false, code: result.code, message: rule.message ?? result.message, severity: 'error' });
    else {
      const outcome = toValidationResult(result.value, rule.message);
      if (!outcome.valid) failures.push(outcome);
    }
  }
  return { valid: !pending && failures.length === 0, pending, failures };
}

// --- Checking messages -----------------------------------------------------

/** An A2UI error, with a JSON Pointer into the checked messages. */
export interface SurfaceError {
  code: A2uiErrorCode;
  surfaceId: string;
  /** Such as `/1/updateComponents/components/3/rows`. */
  path: string;
  message: string;
}

/** The renderer `error` message for a check error. */
export function errorMessage(error: SurfaceError): RendererMessage {
  return { version: a2uiVersion, error: { ...error } } as RendererMessage;
}

const toPointer = (path: readonly PropertyKey[]) => path.map(segment => `/${escapeSegment(String(segment))}`).join('');

type Issue = { path: PropertyKey[]; message: string };
function flattenIssues(issues: readonly z.core.$ZodIssue[], base: readonly PropertyKey[] = []): Issue[] {
  return issues.flatMap(issue => {
    const path = [...base, ...issue.path];
    if (issue.code === 'invalid_union' && issue.errors.length) {
      // Report the branch that got furthest, which is usually the one the sender meant.
      const branches = issue.errors.map(branch => flattenIssues(branch, path));
      const depth = (list: Issue[]) => Math.max(...list.map(item => item.path.length));
      const best = branches.reduce((left, right) => (depth(right) > depth(left) ? right : left));
      if (depth(best) > path.length) return best;
    }
    return [{ path, message: issue.message }];
  });
}

export interface CheckMessageOptions {
  catalogs: readonly Catalog[];
  /** The surface's default catalog, from its `createSurface`. */
  catalogId?: string;
}

const conditionReturnTypes = new Set<FunctionReturnType>(['boolean', 'validationResult', 'any']);

interface CallSite {
  catalogId: string | undefined;
  /** A button's `functionCall` runs from a click; nothing else does. */
  userActivated: boolean;
  condition: boolean;
  /** `callRendererFunction` only checks the call's shape: the renderer answers rule violations at run time. */
  fromAgent: boolean;
  /** The path of the component the call belongs to. */
  componentPath?: string;
}

/** Shared state for one checking pass. */
interface Checker {
  catalogs: readonly Catalog[];
  fail(code: A2uiErrorCode, path: string, message: string): void;
  /** Component paths that use `@index`. */
  indexUsers: Set<string>;
  allowUrl?: (url: string, kind: UrlKind) => boolean;
}

function checkCall(call: Record<string, unknown>, path: string, site: CallSite, checker: Checker) {
  const shape = functionCallSchema.safeParse(call);
  if (!shape.success) {
    for (const issue of flattenIssues(shape.error.issues))
      checker.fail('INVALID_FUNCTION_CALL', `${path}${toPointer(issue.path)}`, issue.message);
    return;
  }
  const { '@call': name, args = {}, catalogId: explicit } = shape.data;
  const argsPath = `${path}/args`;
  if (name === '@index') {
    if (explicit !== undefined)
      checker.fail('INVALID_FUNCTION_CALL', `${path}/catalogId`, '@index belongs to no catalog.');
    const parsed = z.strictObject({ offset: dynamicNumberSchema.optional() }).safeParse(args);
    if (!parsed.success)
      for (const issue of flattenIssues(parsed.error.issues))
        checker.fail('INVALID_FUNCTION_CALL', `${argsPath}${toPointer(issue.path)}`, issue.message);
    if (site.condition) checker.fail('INVALID_FUNCTION_CALL', `${path}/@call`, '@index returns a number, not a check.');
    if (site.componentPath) checker.indexUsers.add(site.componentPath);
    walkDynamic(args, argsPath, site, checker);
    return;
  }
  if (name.startsWith('@'))
    return checker.fail('INVALID_FUNCTION_CALL', `${path}/@call`, `Unknown system function "${name}".`);
  if (!isIdentifier(name)) return checker.fail('INVALID_FUNCTION_CALL', `${path}/@call`, identifierMessage);
  const catalogId = explicit ?? site.catalogId;
  const catalog = findCatalog(checker.catalogs, catalogId);
  if (!catalog)
    return checker.fail(
      'INVALID_FUNCTION_CALL',
      explicit ? `${path}/catalogId` : `${path}/@call`,
      catalogId ? `Unknown catalog "${catalogId}".` : `Function "${name}" has no catalog: set catalogId.`,
    );
  const definition = Object.hasOwn(catalog.functions, name) ? catalog.functions[name]! : undefined;
  if (!definition)
    return checker.fail('INVALID_FUNCTION_CALL', `${path}/@call`, `Unknown function "${name}" in "${catalog.id}".`);
  if (!site.fromAgent) {
    if (definition.allowedCallers === 'agentOnly')
      checker.fail('INVALID_FUNCTION_CALL', `${path}/@call`, `Function "${name}" can only be called by the agent.`);
    if (definition.requiresUserActivation && !site.userActivated)
      checker.fail('EXPRESSION_ERROR', `${path}/@call`, `Function "${name}" runs only from a button's functionCall.`);
  }
  if (site.condition && !conditionReturnTypes.has(definition.returnType))
    checker.fail(
      'INVALID_FUNCTION_CALL',
      `${path}/@call`,
      `A check needs a boolean or ValidationResult; "${name}" returns ${definition.returnType}.`,
    );
  const parsed = (definition.args ?? z.strictObject({})).safeParse(args);
  if (!parsed.success)
    for (const issue of flattenIssues(parsed.error.issues))
      checker.fail('INVALID_FUNCTION_CALL', `${argsPath}${toPointer(issue.path)}`, issue.message);
  if (name === 'openUrl' && typeof args.url === 'string' && checker.allowUrl && !checker.allowUrl(args.url, 'link'))
    checker.fail('VALIDATION_FAILED', `${argsPath}/url`, `Link "${args.url.slice(0, 80)}" is not allowed.`);
  // Nested calls are evaluated by the renderer, never by a gesture.
  const nested = { ...site, catalogId, condition: false, userActivated: false };
  if (name === 'formatString' && typeof args.value === 'string')
    try {
      // Each `${...}` call is checked with bindings standing in for its values.
      interpolate(args.value, value => {
        if (isFunctionCall(value)) checkCall(value, `${argsPath}/value`, nested, checker);
        return isDataBinding(value) ? value : { '@path': '/' };
      });
    } catch (error) {
      checker.fail('EXPRESSION_ERROR', `${argsPath}/value`, error instanceof Error ? error.message : String(error));
    }
  for (const [key, value] of Object.entries(args))
    walkDynamic(value, `${argsPath}/${escapeSegment(key)}`, nested, checker);
}

/** Finds reserved keys and checks every function call inside a value. */
function walkDynamic(value: unknown, path: string, site: CallSite, checker: Checker) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkDynamic(item, `${path}/${index}`, site, checker));
    return;
  }
  if (!isObject(value) || isDataBinding(value)) return;
  if (isFunctionCall(value)) return checkCall(value, path, site, checker);
  for (const [key, item] of Object.entries(value)) {
    if (isReservedKey(key))
      checker.fail(
        'INVALID_RESERVED_KEY',
        `${path}/${escapeSegment(key)}`,
        `"${key}" is reserved. Escape a literal key that starts with @ as "@${key}".`,
      );
    walkDynamic(item, `${path}/${escapeSegment(key)}`, { ...site, condition: false }, checker);
  }
}

function checkComponent(
  raw: unknown,
  path: string,
  surfaceCatalogId: string | undefined,
  checker: Checker,
): { component: A2uiComponent; definition: CatalogComponent; catalogId: string; props: unknown } | undefined {
  const envelope = componentSchema.safeParse(raw);
  if (!envelope.success) {
    for (const issue of flattenIssues(envelope.error.issues))
      checker.fail('VALIDATION_FAILED', `${path}${toPointer(issue.path)}`, issue.message);
    return undefined;
  }
  const component = envelope.data;
  const catalogId = component['@catalogId'] ?? surfaceCatalogId;
  const site: CallSite = { catalogId, userActivated: false, condition: false, fromAgent: false, componentPath: path };
  const props = componentProps(component);
  const catalog = findCatalog(checker.catalogs, catalogId);
  if (!catalog) {
    checker.fail(
      'VALIDATION_FAILED',
      component['@catalogId'] ? `${path}/@catalogId` : `${path}/component`,
      catalogId
        ? `Unknown catalog "${catalogId}".`
        : 'This component has no catalog: set createSurface.catalogId or the component\'s "@catalogId".',
    );
    return undefined;
  }
  for (const [key, value] of Object.entries(props)) {
    if (isReservedKey(key))
      checker.fail(
        'INVALID_RESERVED_KEY',
        `${path}/${escapeSegment(key)}`,
        `"${key}" is not a component envelope key.`,
      );
    if (key === 'action' && isObject(value) && isObject(value.functionCall))
      checkCall(value.functionCall, `${path}/action/functionCall`, { ...site, userActivated: true }, checker);
    else if (key === 'action' && isObject(value) && isObject(value.event))
      walkDynamic(value.event, `${path}/action/event`, site, checker);
    else walkDynamic(value, `${path}/${escapeSegment(key)}`, site, checker);
  }
  const accessibility = component['@accessibility'];
  if (accessibility) walkDynamic(accessibility, `${path}/@accessibility`, site, checker);
  component['@checks']?.forEach((rule, index) => {
    const at = `${path}/@checks/${index}/condition`;
    if (isFunctionCall(rule.condition)) checkCall(rule.condition, at, { ...site, condition: true }, checker);
  });
  const definition = Object.hasOwn(catalog.components, component.component)
    ? catalog.components[component.component]
    : undefined;
  if (!definition) {
    checker.fail(
      'VALIDATION_FAILED',
      `${path}/component`,
      `Unknown component "${component.component}" in "${catalog.id}". Use one from the catalog.`,
    );
    return undefined;
  }
  if (component['@checks'] && !definition.checkable)
    checker.fail('VALIDATION_FAILED', `${path}/@checks`, `${component.component} does not accept @checks.`);
  const parsed = definition.props.safeParse(props);
  if (!parsed.success) {
    for (const issue of flattenIssues(parsed.error.issues).slice(0, 5))
      checker.fail('VALIDATION_FAILED', `${path}${toPointer(issue.path)}`, issue.message);
    return undefined;
  }
  return { component, definition, catalogId: catalog.id, props: parsed.data };
}

const newChecker = (catalogs: readonly Catalog[], surfaceId: () => string, errors: SurfaceError[]): Checker => ({
  catalogs,
  indexUsers: new Set(),
  fail: (code, path, message) => {
    if (!errors.some(error => error.path === path && error.message === message))
      errors.push({ code, surfaceId: surfaceId(), path, message });
  },
});

function checkOneMessage(message: unknown, path: string, options: CheckMessageOptions, checker: Checker) {
  const parsed = surfaceMessageSchema.safeParse(message);
  if (!parsed.success) {
    // Report component problems against the component, not the whole message.
    const body = isObject(message)
      ? ((message.createSurface ?? message.updateComponents) as Record<string, unknown> | undefined)
      : undefined;
    if (isObject(body) && Array.isArray(body.components)) {
      const key = message && isObject(message) && message.createSurface ? 'createSurface' : 'updateComponents';
      const catalogId =
        key === 'createSurface' && typeof body.catalogId === 'string' ? body.catalogId : options.catalogId;
      body.components.forEach((component, index) =>
        checkComponent(component, `${path}/${key}/components/${index}`, catalogId, checker),
      );
    }
    for (const issue of flattenIssues(parsed.error.issues))
      checker.fail('VALIDATION_FAILED', `${path}${toPointer(issue.path)}`, issue.message);
    return;
  }
  const data = parsed.data;
  if ('createSurface' in data)
    data.createSurface.components?.forEach((component, index) =>
      checkComponent(component, `${path}/createSurface/components/${index}`, data.createSurface.catalogId, checker),
    );
  if ('updateComponents' in data)
    data.updateComponents.components.forEach((component, index) =>
      checkComponent(component, `${path}/updateComponents/components/${index}`, options.catalogId, checker),
    );
  if ('callRendererFunction' in data)
    checkCall(
      data.callRendererFunction.callFunction,
      `${path}/callRendererFunction/callFunction`,
      { catalogId: undefined, userActivated: false, condition: false, fromAgent: true },
      checker,
    );
}

/**
 * Checks one agent-to-renderer message against the catalogs: its shape,
 * reserved keys, UAX #31 names, component props and function calls.
 */
export function checkMessage(message: unknown, options: CheckMessageOptions): SurfaceError[] {
  const errors: SurfaceError[] = [];
  const surfaceId = () => {
    if (!isObject(message)) return '';
    const body = Object.values(message).find(isObject);
    return typeof body?.surfaceId === 'string' ? body.surfaceId : '';
  };
  checkOneMessage(message, '', options, newChecker(options.catalogs, surfaceId, errors));
  return errors;
}

export interface CheckSurfaceOptions {
  /** Every catalog the surface may use. Components pick one with `@catalogId`. */
  catalogs: readonly Catalog[];
  limits?: Partial<SurfaceLimits>;
  allowUrl?: (url: string, kind: UrlKind) => boolean;
}

export type CheckSurfaceResult = { ok: true; surface: Surface } | { ok: false; errors: SurfaceError[] };

/**
 * Checks A2UI messages for one complete surface against its catalogs: message
 * shapes, known catalogs, components and props, reserved keys and names,
 * function calls, child references without cycles or orphans, composition
 * rules, limits, and link and image URLs.
 */
export function checkSurface(messages: unknown, options: CheckSurfaceOptions): CheckSurfaceResult {
  const limits = { ...defaultSurfaceLimits, ...options.limits };
  const allowUrl = options.allowUrl ?? defaultAllowUrl;
  const errors: SurfaceError[] = [];
  let surfaceId = '';
  const checker = { ...newChecker(options.catalogs, () => surfaceId, errors), allowUrl };
  const fail = (path: string, message: string, code: A2uiErrorCode = 'VALIDATION_FAILED') =>
    checker.fail(code, path, message);

  if (!Array.isArray(messages)) {
    fail('', 'Send a list of A2UI messages.');
    return { ok: false, errors };
  }
  if (messages.length > 1000) fail('', 'Send at most 1000 messages.');
  const first = messages[0];
  const create = isObject(first) && isObject(first.createSurface) ? first.createSurface : undefined;
  if (typeof create?.surfaceId === 'string') surfaceId = create.surfaceId;
  if (!create) {
    fail('/0', 'The first message must be createSurface.');
    return { ok: false, errors };
  }
  const catalogId = typeof create.catalogId === 'string' ? create.catalogId : undefined;
  messages.forEach((message, index) => {
    checkOneMessage(message, `/${index}`, { catalogs: options.catalogs, catalogId }, checker);
    if (!isObject(message)) return;
    const body = Object.entries(message).find(([key]) => key !== 'version');
    if (!body || !isObject(body[1])) return;
    const [kind, payload] = body;
    if (index > 0 && kind === 'createSurface')
      fail(
        `/${index}/createSurface/surfaceId`,
        `Surface "${String(payload.surfaceId)}" already exists.`,
        'INTEGRITY_ERROR',
      );
    else if (kind === 'deleteSurface') fail(`/${index}`, 'deleteSurface is not allowed here.');
    else if (typeof payload.surfaceId === 'string' && payload.surfaceId !== surfaceId)
      fail(`/${index}/${kind}/surfaceId`, `Every message must target surface "${surfaceId}".`);
  });
  if (errors.length) return { ok: false, errors };

  const where = new Map<string, string>();
  messages.forEach((message: Record<string, any>, index) => {
    const key = message.createSurface ? 'createSurface' : 'updateComponents';
    (message[key]?.components as A2uiComponent[] | undefined)?.forEach((component, at) => {
      const path = `/${index}/${key}/components/${at}`;
      if (where.has(component.id)) fail(`${path}/id`, `Component ID "${component.id}" is used twice.`);
      where.set(component.id, path);
    });
  });
  const bytes = new TextEncoder().encode(JSON.stringify(messages)).length;
  if (bytes > limits.bytes) fail('', `The surface is ${bytes} bytes; the limit is ${limits.bytes}.`);
  if (errors.length) return { ok: false, errors };

  const surface = readSurface(messages)!;
  if (surface.components.size > limits.components)
    fail('', `The surface has ${surface.components.size} components; the limit is ${limits.components}.`);
  if (!surface.components.has('root')) fail('', 'One component must have the ID "root".');

  const nodes = new Map<string, { definition: CatalogComponent; catalogId: string; props: unknown }>();
  for (const [id, component] of surface.components) {
    const catalogId = componentCatalogId(component, surface)!;
    const catalog = findCatalog(options.catalogs, catalogId)!;
    const definition = catalog.components[component.component]!;
    nodes.set(id, { definition, catalogId, props: definition.props.parse(componentProps(component)) });
  }

  let textLength = 0;
  const visit = (
    id: string,
    parent: string | undefined,
    path: string,
    scope: string,
    index: number | undefined,
    trail: readonly string[],
  ) => {
    const own = where.get(id)!;
    if (trail.includes(id)) return fail(own, `Component "${id}" contains itself.`);
    if (trail.length >= limits.depth) return fail(own, `The tree is deeper than ${limits.depth} levels.`);
    const component = surface.components.get(id)!;
    const { definition, catalogId, props } = nodes.get(id)!;
    const parentName = parent === undefined ? 'Surface' : surface.components.get(parent)!.component;
    if (definition.allowedParents && !definition.allowedParents.includes(parentName))
      fail(
        own,
        `Component '${component.component}' is not allowed ${parent === undefined ? 'at the root' : `as a child of '${parentName}'`}.`,
        'UNALLOWED_PARENT',
      );
    const parentDefinition = parent === undefined ? undefined : nodes.get(parent)!.definition;
    if (parentDefinition?.allowedChildren && !parentDefinition.allowedChildren.includes(component.component))
      fail(path, `Component '${component.component}' is not allowed inside '${parentName}'.`, 'UNALLOWED_CHILD');
    if (index === undefined && checker.indexUsers.has(own))
      fail(own, `Component "${id}" uses @index outside a template.`, 'EXPRESSION_ERROR');
    const resolve = <T>(value: DynamicValue<T> | undefined) =>
      resolveValue(value, { catalogs: options.catalogs, data: surface.data, scope, index, catalogId });
    definition.check?.(props, {
      resolve,
      limits,
      allowUrl,
      report: (prop, message) => fail(`${own}/${prop}`, message),
      countText: length => {
        textLength += length;
      },
    });
    for (const ref of definition.children?.(props) ?? []) {
      const refPath = `${own}/${ref.prop}`;
      if (!Array.isArray(ref.ids)) {
        if (!surface.components.has(ref.ids.componentId)) {
          fail(`${refPath}/componentId`, `Component "${ref.ids.componentId}" does not exist.`);
          continue;
        }
        if (!Array.isArray(readPath(surface.data, ref.ids.path, scope))) {
          fail(`${refPath}/path`, `"${ref.ids.path}" is not a list in the data model.`);
          continue;
        }
      }
      expandChildren(surface.data, ref.ids, scope, index).forEach(([child, childScope, childIndex], at) => {
        if (errors.length > 50) return;
        const childPath = Array.isArray(ref.ids) ? `${refPath}/${at}` : `${refPath}/componentId`;
        if (!surface.components.has(child)) fail(childPath, `Component "${child}" does not exist.`);
        else visit(child, id, childPath, childScope, childIndex, [...trail, id]);
      });
    }
  };
  if (surface.components.has('root')) visit('root', undefined, where.get('root')!, '', undefined, []);
  if (textLength > limits.textLength)
    fail('', `The surface has ${textLength} characters of text; the limit is ${limits.textLength}.`);
  // A template over an empty list is still part of the tree, so reachability ignores the data.
  const stack = surface.components.has('root') ? ['root'] : [];
  const linked = new Set(stack);
  while (stack.length) {
    const id = stack.pop()!;
    const { definition, props } = nodes.get(id)!;
    for (const ref of definition.children?.(props) ?? [])
      for (const child of Array.isArray(ref.ids) ? ref.ids : [ref.ids.componentId])
        if (surface.components.has(child) && !linked.has(child)) {
          linked.add(child);
          stack.push(child);
        }
  }
  for (const id of surface.components.keys())
    if (!linked.has(id)) fail(where.get(id)!, `Component "${id}" is not reachable from "root".`);

  return errors.length ? { ok: false, errors } : { ok: true, surface };
}

// --- Text ------------------------------------------------------------------

/**
 * The surface as plain text, in tree order: Markdown for text, tables as
 * Markdown tables and charts as data tables. Use it for copy, search and
 * model history.
 */
export function surfaceText(surface: Surface, catalogs: Catalog | readonly Catalog[]): string {
  const list = Array.isArray(catalogs) ? catalogs : [catalogs as Catalog];
  const open = new Set<string>();
  const render = (id: string, scope: string, index: number | undefined): string => {
    const key = `${id}@${scope}`;
    const component = surface.components.get(id);
    if (!component || open.has(key) || open.size > 64) return '';
    const catalogId = componentCatalogId(component, surface);
    const definition = findCatalog(list, catalogId)?.components[component.component];
    if (!definition) return '';
    const parsed = definition.props.safeParse(componentProps(component));
    if (!parsed.success) return '';
    open.add(key);
    const resolve = <T>(value: DynamicValue<T> | undefined) =>
      resolveValue(value, { catalogs: list, data: surface.data, scope, index, catalogId });
    const children = (ids: ChildList | string | undefined) =>
      expandChildren(surface.data, ids, scope, index)
        .map(([child, childScope, childIndex]) => render(child, childScope, childIndex))
        .filter(Boolean);
    const text = definition.text
      ? definition.text(parsed.data, { resolve, children })
      : (definition.children?.(parsed.data) ?? []).flatMap(ref => children(ref.ids)).join('\n\n');
    open.delete(key);
    return text.trim();
  };
  return render('root', '', undefined);
}

/** A Markdown table from rows. Pipes and newlines in cells are escaped. */
export function markdownTable(
  columns: readonly { key: string; label: string }[],
  rows: readonly Record<string, unknown>[],
): string {
  const cell = (value: unknown) =>
    value === null || value === undefined ? '' : String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  return [
    `| ${columns.map(column => cell(column.label)).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${columns.map(column => cell(row[column.key])).join(' | ')} |`),
  ].join('\n');
}

const markdownLinks = /(!?)\[[^\]]*\]\(\s*<?([^\s)>]+)|<([a-z][a-z0-9+.-]*:[^\s>]+)>/gi;

/** Every link target in a Markdown string, including image sources. */
export function markdownUrls(markdown: string): string[] {
  return markdownLinksWithKind(markdown).map(link => link.url);
}

/** Every link target in a Markdown string, with whether it is an image. */
export function markdownLinksWithKind(markdown: string): { url: string; kind: UrlKind }[] {
  return [...markdown.matchAll(markdownLinks)].map(match => ({
    url: (match[2] ?? match[3])!,
    kind: match[1] ? 'image' : 'link',
  }));
}

// --- Agent-facing descriptions ---------------------------------------------

const common = 'common_types.json#/$defs/';
const schemaRefs = new Map<z.ZodType, string>([
  [componentIdSchema, `${common}ComponentId`],
  [childListSchema, `${common}ChildList`],
  [dataBindingSchema, `${common}DataBinding`],
  [functionCallSchema, `${common}FunctionCall`],
  [dynamicValueSchema, `${common}DynamicValue`],
  [dynamicStringSchema, `${common}DynamicString`],
  [dynamicNumberSchema, `${common}DynamicNumber`],
  [dynamicBooleanSchema, `${common}DynamicBoolean`],
  [dynamicStringListSchema, `${common}DynamicStringList`],
  [actionSchema, `${common}Action`],
]);

const jsonSchemaFor = (schema: z.ZodType) =>
  z.toJSONSchema(schema, {
    unrepresentable: 'any',
    io: 'input',
    override: context => {
      const ref = schemaRefs.get(context.zodSchema as unknown as z.ZodType);
      if (!ref) return;
      const json = context.jsonSchema as Record<string, unknown>;
      for (const key of Object.keys(json)) delete json[key];
      json.$ref = ref;
    },
  }) as Record<string, any>;

const withoutMeta = ({ $schema: _schema, ...rest }: Record<string, any>) => rest;

/**
 * The catalog as an A2UI 1.0 catalog definition (`catalog_definition.json`),
 * with `$id` and `catalogId` both set to the catalog ID.
 */
export function catalogDefinition(catalog: Catalog): Record<string, unknown> {
  const components = Object.fromEntries(
    Object.entries(catalog.components).map(([name, definition]) => {
      const props = jsonSchemaFor(definition.props);
      return [
        name,
        {
          type: 'object',
          description: definition.description,
          allOf: [
            { $ref: `${common}ComponentCommon` },
            ...(definition.checkable ? [{ $ref: `${common}Checkable` }] : []),
            {
              type: 'object',
              properties: { component: { const: name }, ...props.properties },
              required: ['component', ...(props.required ?? [])],
            },
          ],
          unevaluatedProperties: false,
          ...(definition.allowedParents ? { allowedParents: [...definition.allowedParents] } : {}),
          ...(definition.allowedChildren ? { allowedChildren: [...definition.allowedChildren] } : {}),
        },
      ];
    }),
  );
  const functions = Object.fromEntries(
    Object.entries(catalog.functions).map(([name, definition]) => {
      const args = withoutMeta(jsonSchemaFor(definition.args ?? z.strictObject({})));
      const needsArgs = (args.required?.length ?? 0) > 0;
      return [
        name,
        {
          type: 'object',
          description: definition.description,
          returnType: definition.returnType,
          allowedCallers: definition.allowedCallers ?? 'rendererOnly',
          ...(definition.requiresUserActivation ? { requiresUserActivation: true } : {}),
          properties: { '@call': { const: name }, args: { ...args, unevaluatedProperties: false } },
          required: needsArgs ? ['@call', 'args'] : ['@call'],
          unevaluatedProperties: false,
        },
      ];
    }),
  );
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: catalog.id,
    catalogId: catalog.id,
    protocolVersion: catalog.protocolVersion,
    ...(catalog.title ? { title: catalog.title } : {}),
    ...(catalog.description ? { description: catalog.description } : {}),
    ...(catalog.instructions ? { instructions: catalog.instructions } : {}),
    components,
    functions,
    $defs: {
      anyComponent: {
        oneOf: Object.keys(components).map(name => ({ $ref: `#/components/${name}` })),
        discriminator: { propertyName: 'component' },
      },
      anyFunction: { oneOf: Object.keys(functions).map(name => ({ $ref: `#/functions/${name}` })) },
    },
  };
}

const refNames: Record<string, string> = {
  [`${common}ComponentId`]: 'id',
  [`${common}ChildList`]: 'id[] | {componentId, path}',
  [`${common}DynamicValue`]: 'any',
  [`${common}DynamicString`]: 'string*',
  [`${common}DynamicNumber`]: 'number*',
  [`${common}DynamicBoolean`]: 'boolean*',
  [`${common}DynamicStringList`]: 'string[]*',
  [`${common}Action`]: 'Action',
};

function typeText(schema: Record<string, any> | undefined, depth = 0): string {
  if (!schema) return 'any';
  if (schema.$ref) return refNames[schema.$ref] ?? 'any';
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map((value: unknown) => JSON.stringify(value)).join('|');
  const options: Record<string, any>[] | undefined = schema.anyOf ?? schema.oneOf;
  if (options) {
    const dynamicRefs = new Set([`${common}DataBinding`, `${common}FunctionCall`]);
    const literal = options.filter(option => !dynamicRefs.has(option.$ref));
    const text = literal.map(option => typeText(option, depth)).join(' | ');
    return literal.length < options.length ? (literal.length > 1 ? `(${text})*` : `${text}*`) : text;
  }
  if (schema.type === 'array') return `${typeText(schema.items, depth)}[]`;
  if (schema.type === 'object' && schema.properties) {
    if (depth > 2) return 'object';
    const required = new Set(schema.required ?? []);
    const fields = Object.entries(schema.properties).map(
      ([key, value]) => `${key}${required.has(key) ? '' : '?'}: ${typeText(value as Record<string, any>, depth + 1)}`,
    );
    return `{${fields.join(', ')}}`;
  }
  return schema.type ?? 'any';
}

/**
 * A compact description of the catalog for an agent's prompt: the message
 * format, one line per component and function, and the catalog's instructions.
 */
export function promptSnippet(catalog: Catalog): string {
  const functions = Object.entries(catalog.functions).filter(
    ([, definition]) => definition.allowedCallers !== 'agentOnly',
  );
  return [
    `A2UI ${a2uiVersion}, catalog "${catalog.id}". Send messages in order: createSurface {surfaceId, catalogId, components?, dataModel?}, then optional updateComponents {surfaceId, components} and updateDataModel {surfaceId, path, value}. Each message has "version": "${a2uiVersion}".`,
    'Components are a flat list. Each has "id", "component" and its props. IDs and names use letters, digits and _ (no hyphens). Exactly one component has the ID "root". Children are referenced by ID; a template {componentId, path} repeats a component for each item of a data list.',
    'Types marked * also accept {"@path": "/pointer"} to read the data model (inside a template, a path without a leading slash is relative to the item) or {"@call": "function", "args": {...}} to call a function below. Escape a literal key that starts with @ as @@.',
    'Any component may carry "@accessibility" {label, description, live, hidden}. Components marked checkable accept "@checks" [{condition, message}].',
    'You cannot set colors, fonts, spacing or class names.',
    'Components:',
    ...Object.entries(catalog.components).map(
      ([name, definition]) =>
        `- ${name}${definition.checkable ? ' (checkable)' : ''} ${typeText(jsonSchemaFor(definition.props))}: ${definition.description}`,
    ),
    ...(functions.length
      ? [
          'Functions:',
          ...functions.map(
            ([name, definition]) =>
              `- ${name}${typeText(withoutMeta(jsonSchemaFor(definition.args ?? z.strictObject({}))))} → ${definition.returnType}${definition.requiresUserActivation ? ' (button actions only)' : ''}: ${definition.description}`,
          ),
        ]
      : []),
    ...(catalog.instructions ? ['Instructions:', catalog.instructions] : []),
  ].join('\n');
}
