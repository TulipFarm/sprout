import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  SchemaDiagram,
  SchemaLegend,
  type SchemaLink,
  type SchemaTable,
} from "../../packages/sprout/src/components/schema-diagram.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const tables: SchemaTable[] = [
  {
    id: "projects",
    label: "Projects",
    state: "new",
    fields: [
      { id: "name", label: "Name", type: "text", required: true, unique: true },
      {
        id: "status",
        label: "Status",
        type: "select",
        required: false,
        detail: "Planned · In progress · Done",
      },
    ],
  },
  {
    id: "tasks",
    label: "Tasks",
    state: "changed",
    fields: [
      {
        id: "title",
        label: "Title",
        type: "text",
        required: true,
        change: "changed",
      },
      {
        id: "due",
        label: "Due",
        type: "date",
        required: false,
        change: "added",
      },
      {
        id: "note",
        label: "Old note",
        type: "text",
        required: false,
        change: "removed",
      },
      { id: "project", label: "Project", type: "link", required: true },
    ],
  },
  { id: "members", label: "Team members", state: "linked", fields: [] },
  {
    id: "renewals",
    label: "Quarterly enterprise renewal opportunities and follow-ups",
    state: "unchanged",
    fields: [
      {
        id: "owner",
        label: "Account_manager_responsible_for_the_renewal",
        type: "link",
        required: false,
        detail: "https://example.com/a/very/long/detail/that/should/not/spill",
      },
    ],
  },
];

const links: SchemaLink[] = [
  {
    id: "l1",
    source: "tasks",
    field: "project",
    target: "projects",
    label: "N:1",
  },
  {
    id: "l2",
    source: "renewals",
    field: "owner",
    target: "members",
    label: "N:N",
  },
];

function Diagram() {
  return (
    <div style={{ height: 480, padding: 8 }}>
      <SchemaDiagram
        tables={tables}
        links={links}
        label="Project tracker schema"
      />
    </div>
  );
}

const diagram = () =>
  document.querySelector<HTMLElement>('[data-slot="schema-diagram"]')!;
const flow = () =>
  document.querySelector<HTMLElement>('[data-slot="schema-diagram-viewport"]')!;
const transform = () =>
  document.querySelector<HTMLElement>(".react-flow__viewport")!.style.transform;
const zoom = () => Number(/scale\(([\d.]+)\)/.exec(transform())?.[1]);

/** Waits for xyflow to measure the cards and run its first fit. */
async function ready() {
  await expect
    .poll(() => document.querySelectorAll('[data-slot="schema-table"]').length)
    .toBe(tables.length);
  await expect
    .poll(
      () =>
        getComputedStyle(document.querySelector(".react-flow__node")!)
          .visibility,
    )
    .toBe("visible");
  await settle();
  await settle();
}

describe("SchemaDiagram in a real browser", () => {
  for (const mode of ["light", "dark"] as const)
    it(`${mode}: columns fit inside the frame with controls at the bottom`, async () => {
      setTheme("neutral", mode);
      await page.viewport(1440, 720);
      await render(<Diagram />);
      await ready();
      expect(diagram()).toHaveAttribute("data-layout", "horizontal");
      expect(
        document.querySelector('[data-slot="schema-diagram-controls"]'),
      ).toHaveClass("bottom");
      const frame = diagram().getBoundingClientRect();
      for (const card of document.querySelectorAll(
        '[data-slot="schema-table"]',
      )) {
        const rect = card.getBoundingClientRect();
        expect(rect.left).toBeGreaterThanOrEqual(frame.left - 1);
        expect(rect.top).toBeGreaterThanOrEqual(frame.top - 1);
        expect(rect.right).toBeLessThanOrEqual(frame.right + 1);
        expect(rect.bottom).toBeLessThanOrEqual(frame.bottom + 1);
      }
      for (const header of document.querySelectorAll(
        ".sprout-schema-table-header",
      ))
        expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth + 1);
    });

  it("tints changed fields and truncates long names inside their card", async () => {
    await render(<Diagram />);
    await ready();
    for (const change of ["added", "changed", "removed"])
      expect(
        getComputedStyle(
          document.querySelector(
            `[data-slot="schema-field"][data-change="${change}"]`,
          )!,
        ).backgroundColor,
      ).not.toBe("rgba(0, 0, 0, 0)");
    const title = [
      ...document.querySelectorAll(".sprout-schema-table-title"),
    ].find((el) => el.textContent!.startsWith("Quarterly"))!;
    expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    for (const node of document.querySelectorAll(
      ".sprout-schema-field-name, .sprout-schema-field-detail",
    )) {
      const card = node
        .closest('[data-slot="schema-table"]')!
        .getBoundingClientRect();
      expect(node.getBoundingClientRect().right).toBeLessThanOrEqual(
        card.right + 0.5,
      );
    }
  });

  it("pans, zooms, and fits from the keyboard and the zoom controls", async () => {
    await emulate({ reducedMotion: true });
    await render(<Diagram />);
    await ready();
    flow().focus();
    const fitted = transform();
    await userEvent.keyboard("{ArrowLeft}");
    await expect.poll(transform).not.toBe(fitted);
    const panned = transform();
    await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}");
    await expect.poll(transform).not.toBe(panned);
    const before = zoom();
    await userEvent.keyboard("+");
    await expect.poll(zoom).toBeGreaterThan(before);
    await userEvent.keyboard("--");
    await expect.poll(zoom).toBeLessThan(before);
    await userEvent.keyboard("0");
    await expect.poll(transform).toBe(fitted);

    await userEvent.tab();
    const card = document.querySelector<HTMLElement>(".react-flow__node")!;
    await expect.element(page.elementLocator(card)).toHaveFocus();
    expect(card).toHaveAttribute("aria-roledescription", "table card");
    expect(getComputedStyle(card).outlineStyle).toBe("solid");
    await settle();
    const atCard = transform();
    await userEvent.keyboard("{ArrowDown}");
    await expect.poll(transform).not.toBe(atCard);

    const zoomIn = page.getByRole("button", { name: "Zoom in" });
    const zoomOut = page.getByRole("button", { name: "Zoom out" });
    for (
      let i = 0;
      i < 12 && !(zoomIn.element() as HTMLButtonElement).disabled;
      i++
    )
      await zoomIn.click();
    await expect.element(zoomIn).toBeDisabled();
    await expect.poll(zoom).toBeCloseTo(1.5, 2);
    for (
      let i = 0;
      i < 20 && !(zoomOut.element() as HTMLButtonElement).disabled;
      i++
    )
      await zoomOut.click();
    await expect.element(zoomOut).toBeDisabled();
    await expect.poll(zoom).toBeCloseTo(0.2, 2);
    await page.getByRole("button", { name: "Fit to view" }).click();
    await expect.poll(transform).toBe(fitted);
    await expect.element(zoomIn).toBeEnabled();
  });

  it("stacks tables with controls at the top on a phone", async () => {
    await page.viewport(390, 800);
    await render(<Diagram />);
    await ready();
    expect(diagram()).toHaveAttribute("data-layout", "vertical");
    const xs = [
      ...document.querySelectorAll<HTMLElement>(".react-flow__node"),
    ].map((node) => /translate\(([-\d.]+)px/.exec(node.style.transform)?.[1]);
    expect(new Set(xs).size).toBe(1);
    const controls = page
      .getByRole("toolbar", { name: "Diagram view" })
      .element()
      .getBoundingClientRect();
    const box = diagram().getBoundingClientRect();
    expect(controls.top - box.top).toBeLessThan(box.height / 2);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(
      <>
        <SchemaLegend />
        <Diagram />
      </>,
    );
    await ready();
    expect(await axeViolations(screen.container)).toEqual([]);
  });
});
