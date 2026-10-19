import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
import { Checkbox } from "../../packages/sprout/src/components/checkbox.js";
import { Input } from "../../packages/sprout/src/components/input.js";
import { SelectionSlot } from "../../packages/sprout/src/components/selection-slot.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const people = ["Amara Osei", "Lukas Brandt", "Priya Natarajan"];

function Rows({ initial = [] as string[] }) {
  const [selected, setSelected] = useState(initial);
  const [tall, setTall] = useState(false);
  return (
    <div style={{ display: "grid", gap: 8, padding: 16, maxWidth: 640 }}>
      <style>{`
        .narrow-only { display: none; }
        [data-testid="table"] td { height: 32px; }
        @container sprout-selection (max-width: 400px) {
          .wide-only { display: none; }
          .narrow-only { display: inline-flex; }
        }
      `}</style>
      <SelectionSlot
        active={selected.length > 0}
        selection={
          <div
            role="group"
            aria-label="Selected row actions"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span role="status">{selected.length} selected</span>
            <Button variant="outline" className="wide-only">
              Export selected
            </Button>
            <Button variant="outline" className="narrow-only">
              Selected actions
            </Button>
            <Button variant="ghost" onClick={() => setSelected([])}>
              Clear selection
            </Button>
          </div>
        }
      >
        <div
          role="group"
          aria-label="Table tools"
          style={{ display: "flex", gap: 8, height: tall ? 64 : undefined }}
        >
          <Input aria-label="Search" placeholder="Search" />
          <Button variant="outline" onClick={() => setSelected([people[0]])}>
            Select first
          </Button>
          <Button variant="outline" onClick={() => setTall(!tall)}>
            Columns
          </Button>
        </div>
      </SelectionSlot>
      <table data-testid="table">
        <tbody>
          {people.map((name) => (
            <tr key={name}>
              <td>
                <Checkbox
                  aria-label={`Select ${name}`}
                  checked={selected.includes(name)}
                  onCheckedChange={(checked) =>
                    setSelected((current) =>
                      checked
                        ? [...current, name]
                        : current.filter((n) => n !== name),
                    )
                  }
                />
              </td>
              <td>{name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tools = (container: HTMLElement) =>
  container.querySelector('[data-slot="selection-slot-default"]')!;

describe("SelectionSlot in a real browser", () => {
  it.each(themes)("%s %s passes axe idle and selected", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Rows />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
    await screen.getByRole("checkbox", { name: "Select Amara Osei" }).click();
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it("swaps in place without moving the table and keeps focus on the row", async () => {
    const screen = await render(<Rows />);
    await settle();
    const table = screen.getByTestId("table").element();
    const before = table.getBoundingClientRect().top;
    const row = screen.getByRole("checkbox", { name: "Select Lukas Brandt" });
    row.element().focus();
    await userEvent.keyboard(" ");
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent("1 selected");
    await expect.element(row).toHaveFocus();
    expect(getComputedStyle(tools(screen.container)).visibility).toBe("hidden");
    await settle();
    expect(Math.abs(table.getBoundingClientRect().top - before)).toBeLessThan(
      1,
    );
    const [hidden, shown] = screen.container.querySelectorAll(
      ".sprout-selection-slot-layer",
    );
    const middle = (node: Element) => {
      const box = node.getBoundingClientRect();
      return box.top + box.height / 2;
    };
    expect(middle(hidden)).toBeCloseTo(middle(shown), 0);

    screen.getByRole("button", { name: "Clear selection" }).element().focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(row).toHaveFocus();
    expect(getComputedStyle(tools(screen.container)).visibility).toBe(
      "visible",
    );
  });

  it("keeps the taller layer's height so nothing below moves", async () => {
    const screen = await render(<Rows />);
    await screen.getByRole("button", { name: "Columns" }).click();
    const slot = screen.container.querySelector(
      '[data-slot="selection-slot"]',
    )!;
    expect(slot.getBoundingClientRect().height).toBe(64);
    await screen.getByRole("checkbox", { name: "Select Amara Osei" }).click();
    expect(slot.getBoundingClientRect().height).toBe(64);
  });

  it("opening from the tools moves focus in, and clearing returns it", async () => {
    const screen = await render(<Rows />);
    const open = screen.getByRole("button", { name: "Select first" });
    open.element().focus();
    await userEvent.keyboard("{Enter}");
    const export_ = screen.getByRole("button", { name: "Export selected" });
    await expect.element(export_).toHaveFocus();
    await userEvent.tab();
    await expect
      .element(screen.getByRole("button", { name: "Clear selection" }))
      .toHaveFocus();
    await userEvent.keyboard(" ");
    await expect.element(open).toHaveFocus();
  });

  it("the named container lets selection tools fold when narrow", async () => {
    await page.viewport(390, 800);
    const screen = await render(<Rows initial={["Amara Osei"]} />);
    await expect
      .element(screen.getByRole("button", { name: "Selected actions" }))
      .toBeVisible();
    expect(
      getComputedStyle(screen.container.querySelector(".wide-only")!).display,
    ).toBe("none");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    const slot = screen.container.querySelector(
      '[data-slot="selection-slot"]',
    )!;
    expect(slot.scrollWidth).toBeLessThanOrEqual(slot.clientWidth + 1);
  });

  it("selection fades in briefly and not at all with reduced motion", async () => {
    const screen = await render(<Rows />);
    const row = screen.getByRole("checkbox", { name: "Select Amara Osei" });
    await row.click();
    const layer = () =>
      screen.container.querySelector('[data-slot="selection-slot-selection"]')!;
    expect(getComputedStyle(layer()).animationName).toBe(
      "sprout-selection-slot-in",
    );
    expect(getComputedStyle(layer()).animationDuration).toBe("0.18s");
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(layer()).animationName).toBe("none");
  });
});
