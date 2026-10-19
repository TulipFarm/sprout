import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  SqlViewer,
  type SqlViewerTable,
} from "../../packages/sprout/src/components/sql-viewer.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const link = (
  id: string,
  label: string,
  targetTableId: string,
  cardinality: "one" | "many" = "one",
) =>
  ({
    id,
    label,
    required: true,
    kind: "relationship",
    targetTableId,
    cardinality,
    inverseCardinality: "many",
  }) as const;

const tables: SqlViewerTable[] = [
  {
    id: "customers",
    label: "Customers",
    owningTeamId: "sales",
    fields: [
      {
        id: "name",
        label: "name",
        required: true,
        kind: "text",
        maxLength: 200,
      },
      {
        id: "email",
        label: "email",
        required: true,
        kind: "text",
        maxLength: 320,
      },
    ],
    uniqueKeys: [{ id: "email-key", fieldIds: ["email"] }],
  },
  {
    id: "deals",
    label: "Deals",
    owningTeamId: "sales",
    fields: [
      {
        id: "title",
        label: "title",
        required: true,
        kind: "text",
        maxLength: 200,
      },
      link("customer", "customer_id", "customers"),
      {
        id: "amount",
        label: "amount",
        required: false,
        kind: "numeric",
        precision: 12,
        scale: 2,
      },
    ],
    uniqueKeys: [{ id: "deal-key", fieldIds: ["customer", "title"] }],
  },
  {
    id: "invoices",
    label: "Invoices",
    owningTeamId: "billing",
    fields: [
      link("deal", "deal_id", "deals"),
      link("lines", "line_ids", "line_items", "many"),
    ],
  },
  {
    id: "line_items",
    label: "Line items",
    owningTeamId: "billing",
    fields: [link("product", "product_id", "products")],
  },
  { id: "products", label: "Products", owningTeamId: "billing", fields: [] },
  {
    id: "payments",
    label: "Payments",
    owningTeamId: "billing",
    fields: [link("invoice", "invoice_id", "invoices")],
  },
];
const groups = { sales: "Sales", billing: "Billing" };

function Viewer({ count = tables.length }: { count?: number }) {
  return (
    <div style={{ height: 520, padding: 8 }}>
      <SqlViewer
        tables={tables.slice(0, count)}
        groups={groups}
        label="Sales and billing tables"
      />
    </div>
  );
}

const viewer = () =>
  document.querySelector<HTMLElement>('[data-slot="sql-viewer"]')!;
const flow = () =>
  document.querySelector<HTMLElement>('[data-slot="sql-viewer-viewport"]')!;
const transform = () =>
  document.querySelector<HTMLElement>(".react-flow__viewport")!.style.transform;
const zoom = () => Number(/scale\(([\d.]+)\)/.exec(transform())?.[1]);
const cards = () => document.querySelectorAll('[data-slot="sql-table"]');
const node = (id: string) =>
  document.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`)!;
const joinBar = () =>
  document.querySelector<HTMLElement>('[data-slot="sql-viewer-joins"]');

/** Waits for xyflow to measure the cards, draw the joins, and run its first fit. */
async function ready(count: number) {
  await expect.poll(() => cards().length).toBe(count);
  await expect
    .poll(() =>
      [...document.querySelectorAll<HTMLElement>(".react-flow__node")].every(
        (item) => getComputedStyle(item).visibility === "visible",
      ),
    )
    .toBe(true);
  await expect
    .poll(() => document.querySelectorAll(".sprout-sql-join").length)
    .toBeGreaterThan(0);
  await settle();
  await settle();
}

describe("SqlViewer in a real browser", () => {
  it("fits four tables and a +N card inside the frame", async () => {
    await page.viewport(1440, 720);
    await render(<Viewer />);
    await ready(4);
    expect(viewer()).toHaveAttribute("data-layout", "horizontal");
    const frame = viewer().getBoundingClientRect();
    for (const item of document.querySelectorAll(
      '[data-slot="sql-table"], [data-slot="sql-more"]',
    )) {
      const rect = item.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(frame.left - 1);
      expect(rect.top).toBeGreaterThanOrEqual(frame.top - 1);
      expect(rect.right).toBeLessThanOrEqual(frame.right + 1);
      expect(rect.bottom).toBeLessThanOrEqual(frame.bottom + 1);
    }
    expect(document.querySelectorAll('[data-slot="sql-group"]')).toHaveLength(
      2,
    );
    expect(
      page.getByRole("button", { name: /^Show 2 more tables: Products/ }),
    ).toBeInTheDocument();
  });

  it("traces a join on hover and pins it on click", async () => {
    await render(<Viewer count={4} />);
    await ready(4);
    expect(joinBar()).toBeNull();

    await userEvent.hover(
      page.elementLocator(node("deals")).getByText("customer_id"),
    );
    await expect.poll(joinBar).not.toBeNull();
    expect(joinBar()!.textContent).toBe("Deals.customer_id = Customers.id");
    await settle();
    const stroke = (selector: string) =>
      getComputedStyle(document.querySelector(selector)!).stroke;
    expect(stroke(".sprout-sql-join[data-active]")).not.toBe(
      stroke(".sprout-sql-join[data-dimmed]"),
    );
    expect(
      Number(getComputedStyle(node("line_items").firstElementChild!).opacity),
    ).toBeLessThan(1);
    const bar = joinBar()!.getBoundingClientRect();
    const controls = document
      .querySelector('[data-slot="sql-viewer-controls"]')!
      .getBoundingClientRect();
    expect(bar.right).toBeLessThanOrEqual(controls.left);

    await userEvent.click(
      page.elementLocator(node("invoices")).getByRole("heading"),
    );
    await userEvent.hover(page.elementLocator(document.body), {
      position: { x: 1, y: 1 },
    });
    await expect
      .poll(() => joinBar()?.textContent)
      .toBe(
        "Invoices.deal_id = Deals.idLine items.id = ANY(Invoices.line_ids)",
      );
    await userEvent.keyboard("{Escape}");
    await expect.poll(joinBar).toBeNull();
  });

  it("expands hidden tables and collapses them again", async () => {
    await render(<Viewer />);
    await ready(4);
    await page.getByRole("button", { name: /^Show 2 more tables/ }).click();
    await ready(tables.length);
    expect(document.querySelector('[data-slot="sql-more"]')).toBeNull();
    await page.getByRole("button", { name: "Show 4 tables" }).click();
    await ready(4);
    expect(document.querySelector('[data-slot="sql-more"]')).not.toBeNull();
  });

  it("pans, zooms, fits, and pins from the keyboard", async () => {
    await emulate({ reducedMotion: true });
    await render(<Viewer count={4} />);
    await ready(4);
    flow().focus();
    const fitted = transform();
    await userEvent.keyboard("{ArrowLeft}");
    await expect.poll(transform).not.toBe(fitted);
    const before = zoom();
    await userEvent.keyboard("+");
    await expect.poll(zoom).toBeGreaterThan(before);
    await userEvent.keyboard("0");
    await expect.poll(transform).toBe(fitted);

    await userEvent.tab();
    const card = document.querySelector<HTMLElement>(
      ".react-flow__node-table",
    )!;
    await expect.element(page.elementLocator(card)).toHaveFocus();
    expect(card).toHaveAttribute("aria-roledescription", "table card");
    await userEvent.keyboard("{Enter}");
    flow().focus();
    expect(card.querySelector('[data-slot="sql-table"]')).toHaveAttribute(
      "data-active",
    );
    await userEvent.keyboard("{Escape}");
    await expect
      .poll(() =>
        card
          .querySelector('[data-slot="sql-table"]')!
          .hasAttribute("data-active"),
      )
      .toBe(false);

    const zoomIn = page.getByRole("button", { name: "Zoom in" });
    for (
      let i = 0;
      i < 12 && !(zoomIn.element() as HTMLButtonElement).disabled;
      i++
    )
      await zoomIn.click();
    await expect.element(zoomIn).toBeDisabled();
    await page.getByRole("button", { name: "Fit to view" }).click();
    await expect.poll(transform).toBe(fitted);
  });

  it("stacks tables with controls at the top on a phone", async () => {
    await page.viewport(390, 800);
    await render(<Viewer count={4} />);
    await ready(4);
    expect(viewer()).toHaveAttribute("data-layout", "vertical");
    const xs = [
      ...document.querySelectorAll<HTMLElement>(".react-flow__node-group"),
    ].map((item) => /translate\(([-\d.]+)px/.exec(item.style.transform)?.[1]);
    expect(new Set(xs).size).toBe(1);
    const controls = page
      .getByRole("toolbar", { name: "Diagram view" })
      .element()
      .getBoundingClientRect();
    const box = viewer().getBoundingClientRect();
    expect(controls.top - box.top).toBeLessThan(box.height / 2);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Viewer />);
    await ready(4);
    expect(await axeViolations(screen.container)).toEqual([]);
  });
});
