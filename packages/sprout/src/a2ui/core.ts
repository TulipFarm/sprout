import { z } from 'zod';

/** The A2UI protocol versions this module reads. */
export const a2uiVersions = ['v0.9', 'v0.9.1'] as const;
export type A2uiVersion = (typeof a2uiVersions)[number];

const pathSchema = z.strictObject({ path: z.string().min(1).max(512) });

/** A literal value, or `{ path }` bound to the surface's data model. */
export const dynamic = <T extends z.ZodType>(literal: T) => z.union([literal, pathSchema]);

/** The ID of another component in the same surface. */
export const componentIdSchema = z.string().min(1).max(128);

/** A list of child IDs, or a template repeated once per item of a data list. */
export const childListSchema = z.union([
  z.array(componentIdSchema).max(500),
  z.strictObject({ componentId: componentIdSchema, path: z.string().min(1).max(512) }),
]);

export type DynamicValue<T> = T | { path: string };
export type ChildList = string[] | { componentId: string; path: string };

/** A link from a component to its children, used to walk and check the tree. */
export type ChildRef = { prop: string; ids: ChildList };

export interface TextContext {
  /** Resolves a literal or `{ path }` value in the component's data scope. */
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
  /** The component's own props, without `id` and `component`. */
  props: z.ZodType<Props>;
  /** Every prop that points at other components. */
  children?: (props: Props) => ChildRef[];
  /** The component as plain text, for copy, search and model history. */
  text?: (props: Props, context: TextContext) => string;
  /** Checks that need the data model or options, such as row limits. */
  check?: (props: Props, context: CheckContext) => void;
}

export interface Catalog {
  id: string;
  components: Readonly<Record<string, CatalogComponent>>;
}

/** Typed helper for one catalog entry. */
export const defineComponent = <Props>(component: CatalogComponent<Props>): CatalogComponent<Props> => component;

/**
 * Builds a catalog, optionally on top of another one. An entry with the same
 * name as an inherited one replaces it.
 */
export function defineCatalog({
  id,
  extends: base,
  components,
}: {
  id: string;
  extends?: Catalog;
  components: Record<string, CatalogComponent>;
}): Catalog {
  for (const name of Object.keys(components))
    if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) throw new Error(`Catalog component names are PascalCase: ${name}`);
  return { id, components: Object.freeze({ ...base?.components, ...components }) };
}

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

const version = z.enum(a2uiVersions);
const surfaceIdSchema = z.string().min(1).max(128);

/** One component as sent: `id`, `component` and its own props, flat. */
export const componentSchema = z.looseObject({
  id: componentIdSchema,
  component: z.string().min(1).max(64),
});
export type A2uiComponent = z.infer<typeof componentSchema>;

export const surfaceMessageSchema = z.union([
  z.strictObject({
    version,
    createSurface: z.strictObject({
      surfaceId: surfaceIdSchema,
      catalogId: z.string().min(1).max(256),
      theme: z.record(z.string(), z.unknown()).optional(),
      sendDataModel: z.boolean().optional(),
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
      value: z.unknown().optional(),
    }),
  }),
  z.strictObject({ version, deleteSurface: z.strictObject({ surfaceId: surfaceIdSchema }) }),
]);
export type SurfaceMessage = z.infer<typeof surfaceMessageSchema>;

/** The A2UI messages for one surface, in order. */
export const surfaceSchema = z.array(surfaceMessageSchema).max(1000);

// --- The surface model -----------------------------------------------------

/** A surface after its messages are applied. */
export interface Surface {
  surfaceId: string;
  catalogId: string;
  components: ReadonlyMap<string, A2uiComponent>;
  data: unknown;
  deleted: boolean;
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

const own = (value: unknown, key: string) =>
  value !== null && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key);

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

function writePath(data: unknown, path: string | undefined, value: unknown): unknown {
  const segments = pointer(path ?? '/');
  if (segments.some(segment => unsafeKeys.has(segment))) return data;
  if (segments.length === 0) return value;
  const copy = (node: unknown, index: number): unknown => {
    const segment = segments[index]!;
    const base: Record<string, unknown> | unknown[] = Array.isArray(node)
      ? [...node]
      : node !== null && typeof node === 'object'
        ? { ...(node as Record<string, unknown>) }
        : /^\d+$/.test(segment)
          ? []
          : {};
    const container = base as Record<string, unknown>;
    if (index === segments.length - 1) {
      if (value !== undefined) container[segment] = value;
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
 * Applies A2UI messages in order, leniently: unknown shapes are skipped, so a
 * surface can be drawn while it streams. Use `checkSurface` for the strict check.
 */
export function readSurface(messages: readonly unknown[]): Surface | undefined {
  let surface:
    | {
        surfaceId: string;
        catalogId: string;
        components: Map<string, A2uiComponent>;
        data: unknown;
        deleted: boolean;
      }
    | undefined;
  for (const raw of messages) {
    if (raw === null || typeof raw !== 'object') continue;
    const message = raw as Record<string, any>;
    if (message.createSurface && typeof message.createSurface.surfaceId === 'string') {
      surface = {
        surfaceId: message.createSurface.surfaceId,
        catalogId: String(message.createSurface.catalogId ?? ''),
        components: new Map(),
        data: undefined,
        deleted: false,
      };
    } else if (surface && Array.isArray(message.updateComponents?.components)) {
      for (const component of message.updateComponents.components)
        if (componentSchema.safeParse(component).success) surface.components.set(component.id, component);
    } else if (surface && message.updateDataModel && typeof message.updateDataModel === 'object') {
      const { path, value } = message.updateDataModel;
      surface.data = writePath(surface.data, typeof path === 'string' ? path : undefined, value);
    } else if (surface && message.deleteSurface) {
      surface.deleted = true;
    }
  }
  return surface;
}

const isPath = (value: unknown): value is { path: string } =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  typeof (value as { path?: unknown }).path === 'string' &&
  Object.keys(value).length === 1;

/** Resolves a literal or `{ path }` value against the data model. */
export function resolveValue<T>(data: unknown, value: DynamicValue<T> | undefined, scope = ''): T | undefined {
  return isPath(value) ? (readPath(data, value.path, scope) as T | undefined) : value;
}

/** Expands a child list into `[id, scope]` pairs. Templates repeat once per array item. */
export function expandChildren(
  data: unknown,
  ids: ChildList | string | undefined,
  scope = '',
): [id: string, scope: string][] {
  if (ids === undefined) return [];
  if (typeof ids === 'string') return [[ids, scope]];
  if (Array.isArray(ids)) return ids.map(id => [id, scope]);
  const list = readPath(data, ids.path, scope);
  if (!Array.isArray(list)) return [];
  const base = pointer(ids.path, scope)
    .map(segment => `/${escapeSegment(segment)}`)
    .join('');
  return list.map((_, index) => [ids.componentId, `${base}/${index}`]);
}

/** Splits a component into its own props. */
export function componentProps(component: A2uiComponent): Record<string, unknown> {
  const { id: _id, component: _name, ...props } = component;
  return props;
}

// --- Checking --------------------------------------------------------------

/** The A2UI standard validation error. */
export interface SurfaceError {
  code: 'VALIDATION_FAILED';
  surfaceId: string;
  /** JSON Pointer into the messages, such as `/1/updateComponents/components/3/rows`. */
  path: string;
  message: string;
}

export interface CheckSurfaceOptions {
  catalog: Catalog;
  limits?: Partial<SurfaceLimits>;
  allowUrl?: (url: string, kind: UrlKind) => boolean;
}

export type CheckSurfaceResult = { ok: true; surface: Surface } | { ok: false; errors: SurfaceError[] };

const toPointer = (path: readonly PropertyKey[]) => path.map(segment => `/${escapeSegment(String(segment))}`).join('');

/**
 * Checks A2UI messages for one complete surface against a catalog: message
 * shapes, known components and their props, child references without cycles
 * or orphans, limits, and link and image URLs.
 */
export function checkSurface(messages: unknown, options: CheckSurfaceOptions): CheckSurfaceResult {
  const limits = { ...defaultSurfaceLimits, ...options.limits };
  const allowUrl = options.allowUrl ?? defaultAllowUrl;
  const errors: SurfaceError[] = [];
  let surfaceId = '';
  const fail = (path: string, message: string) => {
    if (!errors.some(error => error.path === path && error.message === message))
      errors.push({ code: 'VALIDATION_FAILED', surfaceId, path, message });
  };

  const parsed = surfaceSchema.safeParse(messages);
  if (!parsed.success) {
    const first = Array.isArray(messages) ? messages[0]?.createSurface?.surfaceId : undefined;
    if (typeof first === 'string') surfaceId = first;
    for (const issue of parsed.error.issues.slice(0, 20)) fail(toPointer(issue.path), issue.message);
    return { ok: false, errors };
  }
  const list = parsed.data;
  const first = list[0];
  if (!first || !('createSurface' in first)) {
    fail('/0', 'The first message must be createSurface.');
    return { ok: false, errors };
  }
  surfaceId = first.createSurface.surfaceId;
  if (first.createSurface.catalogId !== options.catalog.id)
    fail('/0/createSurface/catalogId', `Use catalog "${options.catalog.id}".`);
  const bytes = new TextEncoder().encode(JSON.stringify(list)).length;
  if (bytes > limits.bytes) fail('', `The surface is ${bytes} bytes; the limit is ${limits.bytes}.`);

  const where = new Map<string, string>();
  list.forEach((message, index) => {
    if (index > 0 && 'createSurface' in message) fail(`/${index}`, 'Send createSurface only once, first.');
    if ('deleteSurface' in message) fail(`/${index}`, 'deleteSurface is not allowed here.');
    const target =
      'updateComponents' in message
        ? message.updateComponents.surfaceId
        : 'updateDataModel' in message
          ? message.updateDataModel.surfaceId
          : undefined;
    if (target !== undefined && target !== surfaceId)
      fail(`/${index}`, `Every message must target surface "${surfaceId}".`);
    if ('updateComponents' in message)
      message.updateComponents.components.forEach((component, at) => {
        const path = `/${index}/updateComponents/components/${at}`;
        if (where.has(component.id)) fail(`${path}/id`, `Component ID "${component.id}" is used twice.`);
        where.set(component.id, path);
      });
  });
  if (errors.length) return { ok: false, errors };

  const surface = readSurface(list)!;
  if (surface.components.size > limits.components)
    fail('', `The surface has ${surface.components.size} components; the limit is ${limits.components}.`);
  if (!surface.components.has('root')) fail('', 'One component must have the ID "root".');

  const props = new Map<string, unknown>();
  for (const [id, component] of surface.components) {
    const path = where.get(id)!;
    const definition = options.catalog.components[component.component];
    if (!definition) {
      fail(`${path}/component`, `Unknown component "${component.component}". Use one from the catalog.`);
      continue;
    }
    const result = definition.props.safeParse(componentProps(component));
    if (!result.success) {
      for (const issue of result.error.issues.slice(0, 5)) fail(`${path}${toPointer(issue.path)}`, issue.message);
      continue;
    }
    props.set(id, result.data);
  }
  if (errors.length) return { ok: false, errors };

  // Walk the expanded tree from the root: every reference must exist, without cycles.
  let textLength = 0;
  const walk = (id: string, scope: string, trail: readonly string[]) => {
    const path = where.get(id)!;
    if (trail.includes(id)) return fail(path, `Component "${id}" contains itself.`);
    if (trail.length >= limits.depth) return fail(path, `The tree is deeper than ${limits.depth} levels.`);
    const definition = options.catalog.components[surface.components.get(id)!.component]!;
    const own = props.get(id);
    const resolve = <T>(value: DynamicValue<T> | undefined) => resolveValue(surface.data, value, scope);
    definition.check?.(own, {
      resolve,
      limits,
      allowUrl,
      report: (prop, message) => fail(`${path}/${prop}`, message),
      countText: length => {
        textLength += length;
      },
    });
    for (const ref of definition.children?.(own) ?? []) {
      if (!Array.isArray(ref.ids)) {
        if (!surface.components.has(ref.ids.componentId)) {
          fail(`${path}/${ref.prop}/componentId`, `Component "${ref.ids.componentId}" does not exist.`);
          continue;
        }
        if (!Array.isArray(readPath(surface.data, ref.ids.path, scope))) {
          fail(`${path}/${ref.prop}/path`, `"${ref.ids.path}" is not a list in the data model.`);
          continue;
        }
      }
      for (const [child, childScope] of expandChildren(surface.data, ref.ids, scope)) {
        if (errors.length > 50) return;
        if (!surface.components.has(child)) fail(`${path}/${ref.prop}`, `Component "${child}" does not exist.`);
        else walk(child, childScope, [...trail, id]);
      }
    }
  };
  if (surface.components.has('root')) walk('root', '', []);
  if (textLength > limits.textLength)
    fail('', `The surface has ${textLength} characters of text; the limit is ${limits.textLength}.`);
  // A template over an empty list is still part of the tree, so reachability ignores the data.
  const stack = surface.components.has('root') ? ['root'] : [];
  const linked = new Set(stack);
  while (stack.length) {
    const id = stack.pop()!;
    const definition = options.catalog.components[surface.components.get(id)!.component]!;
    for (const ref of definition.children?.(props.get(id)) ?? [])
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
export function surfaceText(surface: Surface, catalog: Catalog): string {
  const open = new Set<string>();
  const render = (id: string, scope: string): string => {
    const key = `${id}@${scope}`;
    const component = surface.components.get(id);
    if (!component || open.has(key) || open.size > 64) return '';
    const definition = catalog.components[component.component];
    if (!definition) return '';
    const parsed = definition.props.safeParse(componentProps(component));
    if (!parsed.success) return '';
    open.add(key);
    const resolve = <T>(value: DynamicValue<T> | undefined) => resolveValue(surface.data, value, scope);
    const children = (ids: ChildList | string | undefined) =>
      expandChildren(surface.data, ids, scope)
        .map(([child, childScope]) => render(child, childScope))
        .filter(Boolean);
    const text = definition.text
      ? definition.text(parsed.data, { resolve, children })
      : (definition.children?.(parsed.data) ?? []).flatMap(ref => children(ref.ids)).join('\n\n');
    open.delete(key);
    return text.trim();
  };
  return render('root', '');
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

const markdownLinks = /\]\(\s*<?([^\s)>]+)|<([a-z][a-z0-9+.-]*:[^\s>]+)>/gi;

/** Every link target in a Markdown string, including image sources. */
export function markdownUrls(markdown: string): string[] {
  return [...markdown.matchAll(markdownLinks)].map(match => (match[1] ?? match[2])!);
}

// --- Agent-facing descriptions ---------------------------------------------

const replaceWithRef = (schema: Record<string, unknown>, ref: string) => {
  for (const key of Object.keys(schema)) delete schema[key];
  schema.$ref = ref;
};

const jsonSchemaFor = (schema: z.ZodType) =>
  z.toJSONSchema(schema, {
    unrepresentable: 'any',
    io: 'input',
    override: context => {
      const json = context.jsonSchema as Record<string, unknown>;
      if (context.zodSchema === componentIdSchema) replaceWithRef(json, 'common_types.json#/$defs/ComponentId');
      if (context.zodSchema === childListSchema) replaceWithRef(json, 'common_types.json#/$defs/ChildList');
    },
  }) as Record<string, any>;

/**
 * The catalog as an A2UI catalog definition (JSON Schema), with `$id` and
 * `catalogId` both set to the catalog ID.
 */
export function catalogDefinition(catalog: Catalog): Record<string, unknown> {
  const components = Object.fromEntries(
    Object.entries(catalog.components).map(([name, definition]) => {
      const props = jsonSchemaFor(definition.props);
      return [
        name,
        {
          description: definition.description,
          type: 'object',
          properties: {
            id: { $ref: 'common_types.json#/$defs/ComponentId' },
            component: { const: name },
            ...props.properties,
          },
          required: ['id', 'component', ...(props.required ?? [])],
          additionalProperties: false,
        },
      ];
    }),
  );
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: catalog.id,
    catalogId: catalog.id,
    components,
    $defs: {
      anyComponent: { oneOf: Object.keys(components).map(name => ({ $ref: `#/components/${name}` })) },
    },
  };
}

const isPathOption = (option: Record<string, any>) =>
  option.type === 'object' && option.properties?.path && Object.keys(option.properties).length === 1;

function typeText(schema: Record<string, any> | undefined, depth = 0): string {
  if (!schema) return 'any';
  if (schema.$ref === 'common_types.json#/$defs/ComponentId') return 'id';
  if (schema.$ref === 'common_types.json#/$defs/ChildList') return 'id[] | {componentId, path}';
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map((value: unknown) => JSON.stringify(value)).join('|');
  const options: Record<string, any>[] | undefined = schema.anyOf ?? schema.oneOf;
  if (options) {
    const literal = options.filter(option => !isPathOption(option));
    const text = literal.map(option => typeText(option, depth)).join(' | ');
    return literal.length < options.length ? `${text} (or {path})` : text;
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
 * format, then one line per component.
 */
export function promptSnippet(catalog: Catalog): string {
  const current = a2uiVersions.at(-1);
  return [
    `A2UI ${current}, catalog "${catalog.id}". Send messages in order: createSurface {surfaceId, catalogId}, then updateComponents {surfaceId, components}, then optional updateDataModel {surfaceId, path, value}. Each message has "version": "${current}".`,
    'Components are a flat list. Each has "id", "component" and its props. Exactly one component has the ID "root". Children are referenced by ID. Values marked (or {path}) can bind to the data model with a JSON Pointer; inside a template, paths without a leading slash are relative to the item.',
    'You cannot set colors, fonts, spacing or class names.',
    'Components:',
    ...Object.entries(catalog.components).map(
      ([name, definition]) => `- ${name} ${typeText(jsonSchemaFor(definition.props))}: ${definition.description}`,
    ),
  ].join('\n');
}
