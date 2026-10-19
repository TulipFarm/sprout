import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ChoiceGroup } from "../../packages/sprout/src/components/field.js";
import { Label } from "../../packages/sprout/src/components/label.js";
import {
  RadioGroup,
  RadioGroupItem,
} from "../../packages/sprout/src/components/radio-group.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

function colorOf(value: string) {
  const probe = document.createElement("span");
  probe.style.color = value;
  document.body.append(probe);
  const result = getComputedStyle(probe).color;
  probe.remove();
  return result;
}

function Digest() {
  return (
    <RadioGroup defaultValue="weekly" aria-label="Digest frequency">
      <Label>
        <RadioGroupItem value="daily" />
        Daily
      </Label>
      <Label>
        <RadioGroupItem value="weekly" />
        Weekly
      </Label>
      <Label>
        <RadioGroupItem value="never" disabled />
        Unavailable
      </Label>
    </RadioGroup>
  );
}

const states = [
  { name: "unchecked" },
  { name: "checked", checked: true },
  { name: "disabled", disabled: true },
  { name: "disabled-checked", disabled: true, checked: true },
  { name: "invalid", invalid: true },
  { name: "invalid-checked", invalid: true, checked: true },
];

function States() {
  return (
    <div style={{ display: "flex", gap: 16, padding: 16 }}>
      {states.map((state) => (
        <RadioGroup
          key={state.name}
          aria-label={state.name}
          data-testid={state.name}
          defaultValue={state.checked ? state.name : undefined}
          disabled={state.disabled}
        >
          <Label>
            <RadioGroupItem
              value={state.name}
              aria-invalid={state.invalid || undefined}
            />
            {state.name}
          </Label>
        </RadioGroup>
      ))}
    </div>
  );
}

function Workspace() {
  const [value, setValue] = useState<"personal" | "business">("business");
  return (
    <ChoiceGroup
      type="radio"
      legend="Workspace type"
      layout="columns"
      value={value}
      onValueChange={setValue}
      options={[
        { value: "personal", label: "Personal" },
        {
          value: "business",
          label:
            "https://github.com/tulipfarm/skills/tree/main/packages/people-ops-weekly-update",
        },
      ]}
    />
  );
}

describe("RadioGroup in a real browser", () => {
  it("states use Sprout's colors, sizes, and dimming", async () => {
    const screen = await render(<States />);
    const radio = (name: string) =>
      screen.getByTestId(name).getByRole("radio").element();
    const off = getComputedStyle(radio("unchecked"));
    expect(off.borderRadius).toBe("999px");
    expect(off.borderTopColor).toBe(colorOf("var(--sprout-border)"));
    expect(off.backgroundColor).toBe(colorOf("var(--sprout-surface)"));
    for (const name of states.map((s) => s.name))
      expect(radio(name).getBoundingClientRect()).toMatchObject({
        width: 16,
        height: 16,
      });
    const on = radio("checked");
    expect(getComputedStyle(on).backgroundColor).toBe(
      colorOf("var(--sprout-primary)"),
    );
    const dot = on.querySelector('[data-slot="radio-group-indicator"]')!;
    expect(getComputedStyle(dot).backgroundColor).toBe(
      colorOf("var(--sprout-on-primary)"),
    );
    expect(dot.getBoundingClientRect()).toMatchObject({ width: 8, height: 8 });
    for (const name of ["disabled", "disabled-checked"]) {
      expect(getComputedStyle(radio(name)).opacity).toBe("0.5");
      expect(getComputedStyle(radio(name)).cursor).toBe("not-allowed");
    }
    await page.elementLocator(radio("disabled")).click({ force: true });
    expect(radio("disabled")).toHaveAttribute("aria-checked", "false");
    expect(getComputedStyle(radio("invalid")).borderTopColor).toBe(
      colorOf("var(--sprout-danger)"),
    );
    expect(getComputedStyle(radio("invalid")).boxShadow).not.toBe("none");
    expect(getComputedStyle(radio("invalid-checked")).borderTopColor).toBe(
      colorOf("var(--sprout-primary)"),
    );
    expect(getComputedStyle(radio("invalid-checked")).boxShadow).not.toBe(
      "none",
    );
  });

  it("labels select their radio and the hit area extends past the dot", async () => {
    const screen = await render(
      <div style={{ padding: 24 }}>
        <Digest />
      </div>,
    );
    const daily = screen.getByRole("radio", { name: "Daily" });
    const weekly = screen.getByRole("radio", { name: "Weekly" });
    await screen.getByText("Daily").click();
    await expect.element(daily).toHaveAttribute("aria-checked", "true");
    await expect.element(weekly).toHaveAttribute("aria-checked", "false");
    const dot = weekly.element().getBoundingClientRect();
    await page.elementLocator(document.body).click({
      position: { x: dot.left - 8, y: dot.top + dot.height / 2 },
    });
    await expect.element(weekly).toHaveAttribute("aria-checked", "true");
    await screen.getByText("Unavailable").click({ force: true });
    await expect
      .element(screen.getByRole("radio", { name: "Unavailable" }))
      .toHaveAttribute("aria-checked", "false");
  });

  it("keyboard roves, selects, skips disabled, and shows a focus ring", async () => {
    const screen = await render(
      <>
        <Digest />
        <button>After</button>
      </>,
    );
    const daily = screen.getByRole("radio", { name: "Daily" });
    const weekly = screen.getByRole("radio", { name: "Weekly" });
    await userEvent.tab();
    await expect.element(weekly).toHaveFocus();
    const ring = getComputedStyle(weekly.element());
    expect(ring.outlineStyle).toBe("solid");
    expect(ring.outlineWidth).toBe("1px");
    expect(ring.outlineColor).toBe(colorOf("var(--sprout-focus-ring)"));
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(daily).toHaveFocus();
    await expect.element(daily).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard("{ArrowUp}");
    await expect.element(weekly).toHaveFocus();
    await expect.element(weekly).toHaveAttribute("aria-checked", "true");
    await userEvent.tab();
    await expect
      .element(screen.getByRole("button", { name: "After" }))
      .toHaveFocus();
  });

  it("a top-aligned dot sits on the first 20px line of a wrapping label", async () => {
    const screen = await render(
      <RadioGroup aria-label="Reply rule" style={{ width: 200 }}>
        <Label style={{ alignItems: "flex-start", lineHeight: "20px" }}>
          <RadioGroupItem value="tag" style={{ marginTop: 2 }} />
          <span>When mentioned in any attached channel thread</span>
        </Label>
      </RadioGroup>,
    );
    const dot = screen.getByRole("radio").element().getBoundingClientRect();
    const text = screen.container.querySelector("label > span:last-child")!;
    const line = text.getClientRects()[0]!;
    expect(Math.abs(dot.top + 8 - (line.top + 10))).toBeLessThanOrEqual(1.5);
  });

  it("ChoiceGroup columns sit side by side, stack on a phone, and arrows move", async () => {
    const screen = await render(<Workspace />);
    const rows = () =>
      [...screen.container.querySelectorAll('[data-slot="choice-option"]')].map(
        (row) => row.getBoundingClientRect(),
      );
    expect(Math.abs(rows()[0]!.top - rows()[1]!.top)).toBeLessThanOrEqual(1);
    (screen.getByRole("radio").nth(1).element() as HTMLElement).focus();
    await userEvent.keyboard("{ArrowLeft}");
    await expect
      .element(screen.getByRole("radio", { name: "Personal" }))
      .toHaveAttribute("aria-checked", "true");

    await page.viewport(390, 800);
    await settle();
    expect(rows()[1]!.top).toBeGreaterThan(rows()[0]!.bottom - 1);
    for (const row of rows()) expect(row.right).toBeLessThanOrEqual(390);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("the dot animates in and stops for reduced motion", async () => {
    const screen = await render(<Digest />);
    const radio = screen.getByRole("radio", { name: "Daily" }).element();
    expect(getComputedStyle(radio).transitionDuration).toMatch(/0\.12s/);
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(radio).transitionDuration).toBe("0s");
  });

  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(
      <>
        <States />
        <Digest />
        <Workspace />
      </>,
    );
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });
});
