import { z } from 'zod';
import {
  childListSchema,
  componentIdSchema,
  defineCatalog,
  defineComponent,
  dynamic,
  dynamicBooleanSchema,
  dynamicNumberSchema,
  dynamicStringListSchema,
  markdownLinksWithKind,
  markdownTable,
  actionSchema,
  type CheckContext,
  type TextContext,
  type DynamicValue,
} from './core.js';
import { basicFunctions } from './functions.js';

export * from './core.js';
export { basicFunctions, compileRegex, formatDate, openLink } from './functions.js';

const text = (max: number) => dynamic(z.string().max(max));
const label = text(200);
const record = z.record(z.string().max(64), z.unknown());
const rowsSchema = dynamic(z.array(record).max(10_000));

const gapNames = ['small', 'medium', 'large'] as const;
const alignNames = ['start', 'center', 'end', 'stretch'] as const;

/** Tones shared by Badge and Callout. */
export const a2uiToneNames = ['neutral', 'info', 'success', 'warning', 'error'] as const;
export type A2uiTone = (typeof a2uiToneNames)[number];

export const chartTypeNames = ['line', 'area', 'bar', 'pie', 'donut'] as const;
export type ChartType = (typeof chartTypeNames)[number];

const textLength = (value: unknown) => (typeof value === 'string' ? value.length : 0);

function checkMarkdown(prop: string, value: unknown, context: CheckContext) {
  if (typeof value !== 'string') return;
  context.countText(value.length);
  for (const { url, kind } of markdownLinksWithKind(value))
    if (!context.allowUrl(url, kind))
      context.report(prop, `${kind === 'image' ? 'Image' : 'Link'} "${url.slice(0, 80)}" is not allowed.`);
}

function checkRows(rows: DynamicValue<unknown>, context: CheckContext): Record<string, unknown>[] | undefined {
  const value = context.resolve(rows);
  if (!Array.isArray(value)) {
    context.report('rows', 'rows must be a list of objects.');
    return undefined;
  }
  if (value.some(row => row === null || typeof row !== 'object' || Array.isArray(row))) {
    context.report('rows', 'Every row must be an object.');
    return undefined;
  }
  return value as Record<string, unknown>[];
}

const asRows = (value: unknown) =>
  Array.isArray(value)
    ? (value.filter(row => row !== null && typeof row === 'object') as Record<string, unknown>[])
    : [];
const asText = (value: unknown) =>
  value === undefined || value === null ? '' : typeof value === 'string' ? value : String(value);

const children = z.strictObject({ children: childListSchema });

// Where blocks may go. Components without allowedParents may go anywhere.
const blocks = ['Surface', 'Column', 'Section', 'Card', 'Tabs', 'Details'] as const;
const inline = [...blocks, 'Row', 'List'] as const;

const fieldLabel = text(200);
const fieldText = (props: { label: DynamicValue<string>; value: unknown }, { resolve }: TextContext) =>
  `${asText(resolve(props.label))}: ${asText(resolve(props.value as DynamicValue<unknown>))}`;
const choiceOption = z.strictObject({ label: text(200), value: z.string().min(1).max(200) });
const choiceOptions = z.array(z.strictObject({ label: z.unknown(), value: z.string() }));

const tableColumn = z.strictObject({
  key: z.string().min(1).max(64),
  label: z.string().max(100),
  align: z.enum(['start', 'end']).optional(),
});

const chartSeries = z.strictObject({ key: z.string().min(1).max(64), label: z.string().max(100) });

/** Every component in `sprout/basic@2`, by name. */
export const sproutComponents = {
  Text: defineComponent({
    description: 'Markdown text: paragraphs, emphasis, links, inline code and short lists.',
    props: z.strictObject({ text: text(20_000), variant: z.enum(['body', 'caption']).optional() }),
    text: (props, { resolve }) => asText(resolve(props.text)),
    check: (props, context) => checkMarkdown('text', context.resolve(props.text), context),
  }),
  Heading: defineComponent({
    description: 'A heading. Level 1 is the largest.',
    props: z.strictObject({ text: text(300), level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional() }),
    text: (props, { resolve }) => `${'#'.repeat((props.level ?? 2) + 1)} ${asText(resolve(props.text))}`,
    check: (props, context) => context.countText(textLength(context.resolve(props.text))),
  }),
  Section: defineComponent({
    description: 'A titled group of components, for the parts of a report.',
    props: z.strictObject({ title: label.optional(), children: childListSchema }),
    allowedParents: ['Surface', 'Column', 'Section', 'Tabs', 'Details'],
    children: props => [{ prop: 'children', ids: props.children }],
    text: (props, context) =>
      [props.title ? `### ${asText(context.resolve(props.title))}` : '', ...context.children(props.children)]
        .filter(Boolean)
        .join('\n\n'),
  }),
  Row: defineComponent({
    description: 'Children side by side; wraps on narrow screens. Use for a few metrics or cards.',
    props: children.extend({ gap: z.enum(gapNames).optional(), align: z.enum(alignNames).optional() }),
    children: props => [{ prop: 'children', ids: props.children }],
  }),
  Column: defineComponent({
    description: 'Children stacked vertically.',
    props: children.extend({ gap: z.enum(gapNames).optional(), align: z.enum(alignNames).optional() }),
    children: props => [{ prop: 'children', ids: props.children }],
  }),
  Card: defineComponent({
    description: 'A bordered container with an optional title and description.',
    props: z.strictObject({ title: label.optional(), description: text(500).optional(), children: childListSchema }),
    children: props => [{ prop: 'children', ids: props.children }],
    text: (props, context) =>
      [
        props.title ? `**${asText(context.resolve(props.title))}**` : '',
        asText(context.resolve(props.description)),
        ...context.children(props.children),
      ]
        .filter(Boolean)
        .join('\n\n'),
  }),
  Divider: defineComponent({
    description: 'A horizontal rule between groups.',
    props: z.strictObject({}),
    allowedParents: ['Column', 'Section', 'Card'],
    text: () => '---',
  }),
  Tabs: defineComponent({
    description: 'Tabs; each tab shows one child component.',
    allowedParents: ['Surface', 'Column', 'Section', 'Card'],
    props: z.strictObject({
      tabs: z
        .array(z.strictObject({ label: z.string().min(1).max(60), child: componentIdSchema }))
        .min(1)
        .max(12),
    }),
    children: props => props.tabs.map((tab, index) => ({ prop: `tabs/${index}/child`, ids: [tab.child] })),
    text: (props, context) =>
      props.tabs.map(tab => [`### ${tab.label}`, ...context.children(tab.child)].join('\n\n')).join('\n\n'),
  }),
  Details: defineComponent({
    description: 'Collapsible sections; each item shows one child component when opened.',
    props: z.strictObject({
      items: z
        .array(z.strictObject({ title: z.string().min(1).max(200), child: componentIdSchema }))
        .min(1)
        .max(50),
    }),
    children: props => props.items.map((item, index) => ({ prop: `items/${index}/child`, ids: [item.child] })),
    text: (props, context) =>
      props.items.map(item => [`**${item.title}**`, ...context.children(item.child)].join('\n\n')).join('\n\n'),
  }),
  Metric: defineComponent({
    description: 'One key number with a label, an optional change and an optional small trend line.',
    props: z.strictObject({
      label,
      value: dynamic(z.union([z.string().max(60), z.number()])),
      change: z
        .strictObject({
          value: z.string().max(40),
          direction: z.enum(['up', 'down', 'flat']),
          tone: z.enum(['positive', 'negative', 'neutral']).optional(),
          label: z.string().max(80).optional(),
        })
        .optional(),
      caption: text(200).optional(),
      trend: dynamic(z.array(z.number()).max(500)).optional(),
    }),
    text: (props, { resolve }) =>
      [
        `${asText(resolve(props.label))}: ${asText(resolve(props.value))}`,
        props.change
          ? `(${props.change.direction} ${props.change.value}${props.change.label ? ` ${props.change.label}` : ''})`
          : '',
        asText(resolve(props.caption)),
      ]
        .filter(Boolean)
        .join(' '),
    check: (props, context) => {
      const trend = context.resolve(props.trend);
      if (trend !== undefined && (!Array.isArray(trend) || trend.some(point => typeof point !== 'number')))
        context.report('trend', 'trend must be a list of numbers.');
      else if (Array.isArray(trend) && trend.length > context.limits.chartPoints)
        context.report('trend', `trend has more than ${context.limits.chartPoints} points.`);
    },
  }),
  Badge: defineComponent({
    description: 'A short status label. The tone is never the only signal, so the text must say it.',
    props: z.strictObject({ text: text(60), tone: z.enum(a2uiToneNames).optional() }),
    text: (props, { resolve }) => `[${asText(resolve(props.text))}]`,
  }),
  List: defineComponent({
    description: 'A bulleted or numbered list of child components. Use a template to repeat over data.',
    props: children.extend({ ordered: z.boolean().optional() }),
    children: props => [{ prop: 'children', ids: props.children }],
    text: (props, context) =>
      context
        .children(props.children)
        .map((child, index) => `${props.ordered ? `${index + 1}.` : '-'} ${child.replace(/\n/g, '\n  ')}`)
        .join('\n'),
  }),
  Table: defineComponent({
    description: 'A table of rows. Each column reads row[key]. Bind rows to the data model for long tables.',
    props: z.strictObject({
      label: z.string().min(1).max(200),
      columns: z.array(tableColumn).min(1).max(20),
      rows: rowsSchema,
      caption: text(300).optional(),
    }),
    text: (props, { resolve }) =>
      [asText(resolve(props.caption)), markdownTable(props.columns, asRows(resolve(props.rows)))]
        .filter(Boolean)
        .join('\n\n'),
    check: (props, context) => {
      const rows = checkRows(props.rows, context);
      if (rows && rows.length > context.limits.tableRows)
        context.report('rows', `The table has ${rows.length} rows; the limit is ${context.limits.tableRows}.`);
    },
  }),
  Chart: defineComponent({
    description:
      'A chart. line, area and bar plot each series against the category; pie and donut use the first series. Rows hold the category and one number per series key. Set max to the top of a fixed scale, such as 10 for scores out of 10 or 100 for percentages.',
    props: z.strictObject({
      type: z.enum(chartTypeNames),
      title: z.string().min(1).max(200),
      category: z.string().min(1).max(64),
      series: z.array(chartSeries).min(1).max(8),
      rows: rowsSchema,
      stack: z.boolean().optional(),
      horizontal: z.boolean().optional(),
      unit: z.string().max(20).optional(),
      max: z.number().positive().optional(),
    }),
    text: (props, { resolve }) =>
      [
        `**${props.title}**`,
        markdownTable([{ key: props.category, label: props.category }, ...props.series], asRows(resolve(props.rows))),
      ].join('\n\n'),
    check: (props, context) => {
      const rows = checkRows(props.rows, context);
      if (!rows) return;
      const points = rows.length * props.series.length;
      if (points > context.limits.chartPoints)
        context.report('rows', `The chart has ${points} points; the limit is ${context.limits.chartPoints}.`);
      if ((props.type === 'pie' || props.type === 'donut') && props.series.length !== 1)
        context.report('series', `A ${props.type} chart has exactly one series.`);
      if (rows.some(row => !(props.category in row)))
        context.report('category', `Every row needs the category key "${props.category}"; keys are case-sensitive.`);
      if (rows.some(row => props.series.some(series => typeof row[series.key] !== 'number')))
        context.report('rows', 'Every row needs a number for each series key.');
    },
  }),
  Progress: defineComponent({
    description: 'Progress toward a goal, as a percentage from 0 to 100.',
    props: z.strictObject({ label, value: dynamic(z.number().min(0).max(100)) }),
    text: (props, { resolve }) => `${asText(resolve(props.label))}: ${asText(resolve(props.value))}%`,
    check: (props, context) => {
      const value = context.resolve(props.value);
      if (typeof value !== 'number' || value < 0 || value > 100)
        context.report('value', 'value must be a number from 0 to 100.');
    },
  }),
  Callout: defineComponent({
    description: 'A highlighted note, warning or error. The title or text must say what kind it is.',
    props: z.strictObject({ tone: z.enum(a2uiToneNames), title: label.optional(), text: text(2000) }),
    text: (props, { resolve }) =>
      [props.title ? `**${asText(resolve(props.title))}**` : '', asText(resolve(props.text))].filter(Boolean).join(' '),
    check: (props, context) => checkMarkdown('text', context.resolve(props.text), context),
  }),
  Code: defineComponent({
    description: 'A block of code with syntax highlighting.',
    props: z.strictObject({ code: text(20_000), language: z.string().max(32).optional() }),
    text: (props, { resolve }) => `\`\`\`${props.language ?? ''}\n${asText(resolve(props.code))}\n\`\`\``,
    check: (props, context) => context.countText(textLength(context.resolve(props.code))),
  }),
  Button: defineComponent({
    description:
      "A button. Its action sends an event, with userMessage shown as the person's message and context holding the values to send.",
    props: z.strictObject({
      label: z.string().min(1).max(60),
      action: actionSchema,
      variant: z.enum(['default', 'primary', 'borderless']).optional(),
    }),
    allowedParents: inline,
    checkable: true,
    text: () => '',
  }),
  TextField: defineComponent({
    description: 'A text input with a visible label. Bind value to the data model.',
    props: z.strictObject({
      label: fieldLabel,
      value: text(20_000),
      placeholder: text(200).optional(),
      variant: z.enum(['shortText', 'longText', 'number']).optional(),
    }),
    allowedParents: inline,
    checkable: true,
    text: fieldText,
  }),
  CheckBox: defineComponent({
    description: 'A checkbox with a visible label. Bind value to a boolean in the data model.',
    props: z.strictObject({ label: fieldLabel, value: dynamicBooleanSchema }),
    allowedParents: inline,
    checkable: true,
    text: (props, { resolve }) => `[${resolve(props.value) === true ? 'x' : ' '}] ${asText(resolve(props.label))}`,
  }),
  ChoicePicker: defineComponent({
    description:
      'Choose one option (mutuallyExclusive) or several (multipleSelection). value is a list of the chosen option values. options may come from a function call.',
    props: z.strictObject({
      label: fieldLabel,
      variant: z.enum(['mutuallyExclusive', 'multipleSelection']).optional(),
      options: dynamic(z.array(choiceOption).min(1).max(200)),
      value: dynamicStringListSchema,
      displayStyle: z.enum(['checkbox', 'chips']).optional(),
      filterable: z.boolean().optional(),
    }),
    allowedParents: inline,
    checkable: true,
    text: (props, { resolve }) => {
      const chosen = resolve(props.value);
      return `${asText(resolve(props.label))}: ${Array.isArray(chosen) ? chosen.join(', ') : ''}`;
    },
    check: (props, context) => {
      const options = context.resolve(props.options);
      if (options !== undefined && !choiceOptions.safeParse(options).success)
        context.report('options', 'options must be a list of { label, value }.');
    },
  }),
  Slider: defineComponent({
    description: 'A number picked on a range from min (default 0) to max. steps snaps to that many divisions.',
    props: z.strictObject({
      label: fieldLabel,
      min: z.number().optional(),
      max: z.number(),
      value: dynamicNumberSchema,
      steps: z.number().int().min(1).max(1000).optional(),
    }),
    allowedParents: inline,
    checkable: true,
    text: fieldText,
    check: (props, context) => {
      if ((props.min ?? 0) >= props.max) context.report('max', 'max must be greater than min.');
    },
  }),
  DateTimeInput: defineComponent({
    description: 'A date and/or time input. value is ISO 8601, or "" when empty. Set enableDate, enableTime or both.',
    props: z.strictObject({
      label: fieldLabel,
      value: text(40),
      enableDate: z.boolean().optional(),
      enableTime: z.boolean().optional(),
      min: text(40).optional(),
      max: text(40).optional(),
    }),
    allowedParents: inline,
    checkable: true,
    text: fieldText,
    check: (props, context) => {
      if (!props.enableDate && !props.enableTime) context.report('enableDate', 'Set enableDate, enableTime or both.');
    },
  }),
};

const instructions = `Build the reply from the root component "root"; component IDs use letters, digits and _.
Bind values with {"@path": "/key"} and put shared data in the data model. Inside a template, paths without a leading / are relative to the item.
Use Section and Heading for the parts of a report; Row for a few metrics or cards side by side.
Tables and charts take rows from the data model. Colors, fonts and spacing come from the theme.
Every form field has a visible label and binds value to the data model. Never ask for passwords, API keys, one-time codes or card numbers.
Add @checks to fields and to the button that sends them; the button stays disabled until they pass. Checks are advice, not security.
A button's action.event names the action, its userMessage is shown as the person's message and its context lists the values to send.`;

/** Sprout's catalog, `sprout/basic@2`: report components, form fields and A2UI's basic functions. */
export const sproutCatalog = defineCatalog({
  id: 'sprout/basic@2',
  title: 'Sprout',
  description: "Reports, data views and simple forms drawn with Sprout's components.",
  instructions,
  components: sproutComponents,
  functions: basicFunctions,
});

export type SproutComponentName = keyof typeof sproutComponents;
export type SproutComponentProps<Name extends SproutComponentName> = z.output<(typeof sproutComponents)[Name]['props']>;
