import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Checkbox } from "../../packages/sprout/src/components/checkbox.js";
import { Input } from "../../packages/sprout/src/components/input.js";
import { Label } from "../../packages/sprout/src/components/label.js";
import {
  RadioGroup,
  RadioGroupItem,
} from "../../packages/sprout/src/components/radio-group.js";
import { Switch } from "../../packages/sprout/src/components/switch.js";
import { Textarea } from "../../packages/sprout/src/components/textarea.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

function colorOf(value: string) {
  const probe = document.createElement("span");
  probe.style.color = value;
  document.body.append(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

const longName =
  "Allow Platform Reliability and Incident Response to manage and share";

function Gallery() {
  return (
    <div style={{ display: "grid", gap: 12, padding: 16, maxWidth: 420 }}>
      <Label htmlFor="workspace">Workspace name</Label>
      <Input id="workspace" defaultValue="Meadow" />
      <Label data-testid="stacked">
        Instructions
        <Textarea defaultValue="Be brief." />
      </Label>
      <Label data-testid="run">
        <Checkbox defaultChecked />
        Run workflow
      </Label>
      <Label>
        <Checkbox />
        Read definition
      </Label>
      <Label data-testid="long">
        <Checkbox />
        {longName}
      </Label>
      <Label data-testid="disabled">
        <Checkbox disabled />
        Disabled
      </Label>
      <Label>
        <Switch />
        Pause motion
      </Label>
      <Label data-testid="sm-switch">
        <Switch size="sm" disabled defaultChecked />
        Disabled on
      </Label>
      <RadioGroup aria-label="Cadence" defaultValue="weekly">
        <Label>
          <RadioGroupItem value="daily" />
          Daily
        </Label>
        <Label>
          <RadioGroupItem value="weekly" />
          Weekly
        </Label>
      </RadioGroup>
    </div>
  );
}

describe("Label in a real browser", () => {
  it.each(themes)(
    "%s %s colors labels by state and passes axe",
    async (theme, mode) => {
      setTheme(theme, mode);
      const screen = await render(<Gallery />);
      await settle();
      expect(getComputedStyle(screen.getByTestId("run").element()).color).toBe(
        colorOf("var(--sprout-text)"),
      );
      for (const id of ["disabled", "sm-switch"])
        expect(getComputedStyle(screen.getByTestId(id).element()).color).toBe(
          colorOf("var(--sprout-muted)"),
        );
      expect(await axeViolations(screen.container)).toEqual([]);
    },
  );

  it("labels keep compact type and spacing", async () => {
    const screen = await render(<Gallery />);
    await settle();
    const plain = getComputedStyle(
      screen.getByText("Workspace name").element(),
    );
    expect(plain.fontSize).toBe("14px");
    expect(plain.fontWeight).toBe("500");
    expect(plain.lineHeight).toBe("16px");
    expect(plain.userSelect).toBe("none");
    expect(plain.cursor).toBe("default");
    const row = screen.getByTestId("run").element();
    const css = getComputedStyle(row);
    expect(css.display).toBe("flex");
    expect(css.columnGap).toBe("8px");
    expect(css.lineHeight).toBe("20px");
    expect(css.cursor).toBe("pointer");
    const box = row.querySelector('[role="checkbox"]')!.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(row.lastChild!);
    expect(Math.round(range.getBoundingClientRect().left - box.right)).toBe(8);
    const stacked = screen.getByTestId("stacked").element();
    expect(getComputedStyle(stacked).flexDirection).toBe("column");
    expect(getComputedStyle(stacked).rowGap).toBe("6px");
    const area = stacked.querySelector("textarea")!;
    expect(Math.round(area.getBoundingClientRect().width)).toBe(
      Math.round(stacked.getBoundingClientRect().width),
    );
    expect(getComputedStyle(area).fontWeight).toBe("400");
  });

  it("clicking a label focuses or toggles its control", async () => {
    const screen = await render(<Gallery />);
    await screen.getByText("Workspace name").click();
    await expect.element(screen.getByLabelText("Workspace name")).toHaveFocus();
    await screen.getByTestId("stacked").click({ position: { x: 4, y: 4 } });
    expect(document.activeElement).toBe(
      screen.getByTestId("stacked").element().querySelector("textarea"),
    );
    const read = screen.getByRole("checkbox", { name: "Read definition" });
    await screen.getByText("Read definition").click();
    await expect.element(read).toBeChecked();
    await userEvent.keyboard(" ");
    await expect.element(read).not.toBeChecked();
    await screen.getByText("Pause motion").click();
    await expect
      .element(screen.getByRole("switch", { name: "Pause motion" }))
      .toBeChecked();
    await screen.getByText("Daily").click();
    await expect
      .element(screen.getByRole("radio", { name: "Daily" }))
      .toBeChecked();
    await userEvent.keyboard("{ArrowDown}");
    await expect
      .element(screen.getByRole("radio", { name: "Weekly" }))
      .toBeChecked();
  });

  it("labels stay out of the tab order", async () => {
    const screen = await render(<Gallery />);
    (
      screen
        .getByRole("checkbox", { name: "Run workflow" })
        .element() as HTMLElement
    ).focus();
    await userEvent.tab();
    await expect
      .element(screen.getByRole("checkbox", { name: "Read definition" }))
      .toHaveFocus();
    for (const label of screen.container.querySelectorAll(
      '[data-slot="label"]',
    ))
      expect((label as HTMLElement).tabIndex).toBe(-1);
  });

  it("disabled controls mute and lock their labels", async () => {
    const screen = await render(
      <>
        <Gallery />
        <div style={{ display: "flex", gap: 8 }}>
          <Checkbox disabled id="locked" />
          <Label htmlFor="locked" data-testid="sibling">
            Delete this integration
          </Label>
        </div>
      </>,
    );
    const disabled = screen.getByTestId("disabled");
    const css = getComputedStyle(disabled.element());
    expect(css.cursor).toBe("not-allowed");
    expect(css.opacity).toBe("1");
    await disabled.click({ force: true });
    await expect
      .element(screen.getByRole("checkbox", { name: "Disabled" }))
      .not.toBeChecked();
    const sibling = getComputedStyle(screen.getByTestId("sibling").element());
    expect(sibling.opacity).toBe("0.5");
    expect(sibling.cursor).toBe("not-allowed");
  });

  it("a locked field dims its label and ignores clicks until unlocked", async () => {
    function Locked() {
      const [saving, setSaving] = useState(true);
      return (
        <>
          <Label>
            <Switch checked={saving} onCheckedChange={setSaving} />
            Saving
          </Label>
          <div data-slot="field" data-disabled={saving || undefined}>
            <Label htmlFor="cadence">Check every, in minutes</Label>
            <Input id="cadence" defaultValue="15" disabled={saving} />
          </div>
        </>
      );
    }
    const screen = await render(<Locked />);
    const cadence = screen.getByText("Check every, in minutes");
    expect(getComputedStyle(cadence.element()).opacity).toBe("0.5");
    expect(getComputedStyle(cadence.element()).pointerEvents).toBe("none");
    await screen.getByText("Saving").click();
    await expect.element(cadence).not.toHaveStyle({ opacity: "0.5" });
    expect(getComputedStyle(cadence.element()).pointerEvents).toBe("auto");
    await cadence.click();
    await expect
      .element(screen.getByLabelText("Check every, in minutes"))
      .toHaveFocus();
  });

  it("long names wrap inside a 320px screen", async () => {
    await page.viewport(320, 900);
    const screen = await render(<Gallery />);
    await settle();
    const label = screen.getByTestId("long").element().getBoundingClientRect();
    expect(label.right).toBeLessThanOrEqual(320);
    expect(label.height).toBeGreaterThan(20);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });

  it("color and opacity transitions respect reduced motion", async () => {
    const screen = await render(<Label>Plain</Label>);
    const label = screen.getByText("Plain").element();
    expect(getComputedStyle(label).transitionDuration).toBe("0.12s, 0.12s");
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(label).transitionDuration).toBe("0s");
  });
});
