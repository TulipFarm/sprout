import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as sprout from "../packages/sprout/src/index.js";
import {
  SchemaDiagram,
  SchemaLegend,
  schemaChangeNames,
  schemaDiagramLayoutNames,
  schemaTableStateNames,
  type SchemaLink,
  type SchemaTable,
} from "../packages/sprout/src/components/schema-diagram.js";

const tables: SchemaTable[] = [
  {
    id: "deals",
    label: "Deals",
    state: "new",
    fields: [
      { id: "customer", label: "Customer", type: "link", required: true },
    ],
  },
  { id: "customers", label: "Linked table", state: "linked", fields: [] },
];
const links: SchemaLink[] = [
  {
    id: "customer",
    source: "deals",
    field: "customer",
    target: "customers",
    label: "N:1",
  },
];

describe("Schema Diagram", () => {
  it("is exported from the package root", () => {
    for (const name of [
      "SchemaDiagram",
      "SchemaLegend",
      "schemaChangeNames",
      "schemaDiagramLayoutNames",
      "schemaTableStateNames",
    ]) {
      expect(sprout).toHaveProperty(name);
    }
  });

  it("lists every table state, field change, and layout", () => {
    expect(schemaTableStateNames).toEqual([
      "new",
      "changed",
      "unchanged",
      "linked",
    ]);
    expect(schemaChangeNames).toEqual(["added", "changed", "removed"]);
    expect(schemaDiagramLayoutNames).toEqual([
      "auto",
      "horizontal",
      "vertical",
    ]);
  });

  it("renders a labelled figure with a keyboard hint and layout hook", () => {
    const html = renderToString(
      <SchemaDiagram
        tables={tables}
        links={links}
        label="Schema diagram for Sales pipeline"
        className="h-128"
        data-testid="schema"
      />,
    );
    expect(html).toContain('role="figure"');
    expect(html).toContain('aria-label="Schema diagram for Sales pipeline"');
    expect(html).toContain('data-slot="schema-diagram"');
    expect(html).toContain('data-layout="horizontal"');
    expect(html).toContain('data-testid="schema"');
    expect(html).toMatch(/class="sprout-schema-diagram h-128"/);
    expect(html).toContain(
      "Arrow keys pan, plus and minus zoom, and 0 fits the diagram.",
    );
  });

  it("honors a fixed vertical layout on the server", () => {
    const html = renderToString(
      <SchemaDiagram
        tables={tables}
        links={links}
        label="Stacked"
        layout="vertical"
      />,
    );
    expect(html).toContain('data-layout="vertical"');
  });

  it("explains every change, the unique key, and the required mark", () => {
    const html = renderToString(<SchemaLegend className="mb-2" id="legend" />);
    expect(html).toContain('aria-label="Legend"');
    expect(html).toContain('data-slot="schema-legend"');
    expect(html).toContain('id="legend"');
    expect(html).toMatch(/class="sprout-schema-legend mb-2"/);
    for (const change of schemaChangeNames)
      expect(html).toContain(`data-change="${change}"`);
    for (const text of ["Added", "Changed", "Removed", "Unique", "* Required"])
      expect(html).toContain(text);
  });
});
