import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import {
  actionSchema,
  basicFunctions,
  checkMessage,
  childListSchema,
  componentIdSchema,
  defineCatalog,
  defineComponent,
  defineFunction,
  dynamicBooleanSchema,
  dynamicNumberSchema,
  dynamicStringListSchema,
  dynamicStringSchema,
  dynamicValueSchema,
  rendererMessageSchema,
} from '../packages/sprout/src/a2ui/catalog.js';

type Case = { description: string; valid: boolean; data: unknown };
const cases = (name: string): Case[] =>
  JSON.parse(readFileSync(new URL(`./fixtures/a2ui-conformance/${name}.json`, import.meta.url), 'utf8')).tests;

const basicId = 'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json';
const testingId = 'https://a2ui.org/specification/v1_0/testing_catalog.json';

// The upstream testing catalog: a component that takes any dynamic value, and two functions.
const testingParts = {
  components: {
    Text: defineComponent({ description: 'Text.', props: z.strictObject({ text: dynamicStringSchema }) }),
    TestComponent: defineComponent({ description: 'Any value.', props: z.strictObject({ value: dynamicValueSchema }) }),
  },
  functions: {
    openUrl: defineFunction({
      description: 'Opens a URL.',
      args: z.strictObject({ url: z.url() }),
      returnType: 'void',
    }),
    pingAgent: defineFunction({ description: 'Pings.', returnType: 'void' }),
  },
};
const testing = [defineCatalog({ id: testingId, ...testingParts }), defineCatalog({ id: basicId, ...testingParts })];

// The parts of A2UI's basic catalog that the cases use.
const label = dynamicStringSchema;
const basic = defineCatalog({
  id: basicId,
  components: {
    Text: defineComponent({
      description: 'Text.',
      props: z.strictObject({ text: dynamicStringSchema, variant: z.string().optional() }),
    }),
    Column: defineComponent({ description: 'Column.', props: z.strictObject({ children: childListSchema }) }),
    List: defineComponent({ description: 'List.', props: z.strictObject({ children: childListSchema }) }),
    Button: defineComponent({
      description: 'Button.',
      props: z.strictObject({
        child: componentIdSchema,
        action: actionSchema,
        variant: z.enum(['default', 'primary', 'borderless']).optional(),
      }),
      checkable: true,
      children: props => [{ prop: 'child', ids: [props.child] }],
    }),
    TextField: defineComponent({
      description: 'Text field.',
      props: z.strictObject({
        label,
        value: dynamicStringSchema,
        placeholder: dynamicStringSchema.optional(),
        variant: z.enum(['longText', 'number', 'shortText', 'obscured']).optional(),
      }),
      checkable: true,
    }),
    CheckBox: defineComponent({
      description: 'Checkbox.',
      props: z.strictObject({ label, value: dynamicBooleanSchema }),
      checkable: true,
    }),
    ChoicePicker: defineComponent({
      description: 'Choices.',
      props: z.strictObject({
        label: label.optional(),
        variant: z.enum(['multipleSelection', 'mutuallyExclusive']).optional(),
        options: z.array(z.strictObject({ label, value: z.string() })),
        value: dynamicStringListSchema,
      }),
      checkable: true,
    }),
    Slider: defineComponent({
      description: 'Slider.',
      props: z.strictObject({
        label: label.optional(),
        min: z.number().optional(),
        max: z.number(),
        value: dynamicNumberSchema,
        steps: z.number().int().min(1).optional(),
      }),
      checkable: true,
    }),
    DateTimeInput: defineComponent({
      description: 'Date and time.',
      props: z.strictObject({
        label: label.optional(),
        value: dynamicStringSchema,
        enableDate: z.boolean().optional(),
        enableTime: z.boolean().optional(),
      }),
      checkable: true,
    }),
  },
  functions: basicFunctions,
});

// The cases check message shapes only. Sprout also resolves every component to
// a catalog, with no fallback, so give surfaces without one the case's catalog.
function withCatalog(data: unknown, catalogId: string) {
  const message = data as { createSurface?: Record<string, unknown> };
  if (!message?.createSurface || 'catalogId' in message.createSurface) return data;
  const components = message.createSurface.components as Record<string, unknown>[] | undefined;
  if (components?.some(component => component && '@catalogId' in component)) return data;
  return { ...message, createSurface: { ...message.createSurface, catalogId } };
}

describe('A2UI 1.0 conformance cases', () => {
  const rendererCases = ['renderer_messages', 'function_response', 'call_agent_function_message'];
  for (const name of rendererCases)
    describe(name, () => {
      for (const test of cases(name))
        it(test.description, () => expect(rendererMessageSchema.safeParse(test.data).success).toBe(test.valid));
    });

  const agentCases: [string, typeof testing][] = [
    ['dynamic_value_validation', testing],
    ['call_function_message', testing],
    ['initial_state_validation', [basic]],
    ['function_catalog_validation', [basic]],
    ['button_checks', [basic]],
    ['checkable_components', [basic]],
  ];
  for (const [name, catalogs] of agentCases)
    describe(name, () => {
      for (const test of cases(name))
        it(test.description, () => {
          const errors = checkMessage(withCatalog(test.data, catalogs[0]!.id), {
            catalogs,
            catalogId: catalogs[0]!.id,
          });
          expect(errors.length === 0, JSON.stringify(errors)).toBe(test.valid);
        });
    });
});
