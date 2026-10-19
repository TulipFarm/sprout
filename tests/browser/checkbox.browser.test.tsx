import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { useState } from "react";
import {
  Checkbox,
  checkboxVariantNames,
} from "../../packages/sprout/src/components/checkbox.js";
import { Label } from "../../packages/sprout/src/components/label.js";
import {
  axeViolations,
  emulate,
  setTheme,
  settle,
  size,
  themes,
} from "./support.js";

function colorOf(token: string) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

const states = {
  unchecked: {},
  checked: { defaultChecked: true },
  mixed: { indeterminate: true },
  disabled: { disabled: true },
  "disabled-checked": { disabled: true, defaultChecked: true },
  invalid: { "aria-invalid": true },
} as const;

function Gallery() {
  return (
    <div style={{ display: "grid", gap: 12, padding: 16 }}>
      {checkboxVariantNames.map((variant) => (
        <div key={variant} style={{ display: "flex", gap: 24 }}>
          {Object.entries(states).map(([state, props]) => (
            <Label key={state}>
              <Checkbox
                variant={variant}
                data-testid={`${variant}-${state}`}
                {...props}
              />
              {variant} {state}
            </Label>
          ))}
        </div>
      ))}
    </div>
  );
}

describe("Checkbox in a real browser", () => {
  it.each(themes)(
    "%s %s passes axe and fills with the variant color",
    async (theme, mode) => {
      setTheme(theme, mode);
      const screen = await render(<Gallery />);
      await settle();
      const fill = (id: string) =>
        getComputedStyle(screen.getByTestId(id).element()).backgroundColor;
      expect(fill("default-checked")).toBe(colorOf("--sprout-primary"));
      expect(fill("neutral-checked")).toBe(colorOf("--sprout-text"));
      expect(await axeViolations(screen.container)).toEqual([]);
    },
  );

  it("variants and states render Cloud's look", async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Gallery />);
    const css = (id: string) =>
      getComputedStyle(screen.getByTestId(id).element());
    for (const variant of checkboxVariantNames) {
      const off = screen.getByTestId(`${variant}-unchecked`).element();
      expect(size(off)).toEqual([16, 16]);
      expect(css(`${variant}-unchecked`).borderTopColor).toBe(
        colorOf("--sprout-border"),
      );
      expect(css(`${variant}-unchecked`).borderRadius).toBe("4px");
      const check = screen
        .getByTestId(`${variant}-checked`)
        .element()
        .querySelector("svg")!;
      expect(getComputedStyle(check).width).toBe("14px");
      expect(css(`${variant}-mixed`).backgroundColor).toBe(
        colorOf(variant === "neutral" ? "--sprout-text" : "--sprout-primary"),
      );
      for (const state of ["disabled", "disabled-checked"]) {
        expect(css(`${variant}-${state}`).opacity).toBe("0.5");
        expect(css(`${variant}-${state}`).cursor).toBe("not-allowed");
      }
      expect(css(`${variant}-invalid`).borderTopColor).toBe(
        colorOf("--sprout-danger"),
      );
    }
    const disabled = screen.getByTestId("default-disabled");
    await disabled.click({ force: true });
    await expect.element(disabled).toHaveAttribute("aria-checked", "false");
  });

  it("clicking a wrapping label's text toggles the box", async () => {
    const screen = await render(
      <Label>
        <Checkbox />
        Shared business account
      </Label>,
    );
    const business = screen.getByRole("checkbox", {
      name: "Shared business account",
    });
    await screen.getByText("Shared business account").click();
    await expect.element(business).toHaveAttribute("aria-checked", "true");
  });

  it("the hit area extends past the 16px box", async () => {
    const screen = await render(
      <div style={{ padding: 40 }}>
        <Checkbox aria-label="Select row 4f0c2a91" />
      </div>,
    );
    const box = screen.getByRole("checkbox");
    const rect = box.element().getBoundingClientRect();
    await userEvent.click(document.body, {
      position: { x: rect.right + 8, y: rect.top + rect.height / 2 },
    });
    await expect.element(box).toHaveAttribute("aria-checked", "true");
  });

  it("keyboard focus and Space toggle with a visible ring", async () => {
    const screen = await render(
      <>
        <Label>
          <Checkbox />
          Shared business account
        </Label>
        <Label>
          <Checkbox defaultChecked />
          Share with members
        </Label>
      </>,
    );
    const business = screen.getByRole("checkbox", {
      name: "Shared business account",
    });
    await userEvent.tab();
    await expect.element(business).toHaveFocus();
    const ring = getComputedStyle(business.element());
    expect(ring.outlineStyle).toBe("solid");
    expect(ring.outlineWidth).toBe("1px");
    expect(ring.outlineColor).toBe(colorOf("--sprout-focus-ring"));
    await userEvent.keyboard(" ");
    await expect.element(business).toHaveAttribute("aria-checked", "true");
    await userEvent.tab();
    const share = screen.getByRole("checkbox", { name: "Share with members" });
    await expect.element(share).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect.element(share).toHaveAttribute("aria-checked", "false");
  });

  it("a disabled fieldset locks every box", async () => {
    function Grants() {
      const [saving, setSaving] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setSaving(!saving)}>
            Toggle saving
          </button>
          <fieldset disabled={saving}>
            <Label>
              <Checkbox />
              Read metadata
            </Label>
          </fieldset>
        </>
      );
    }
    const screen = await render(<Grants />);
    const read = screen.getByRole("checkbox", { name: "Read metadata" });
    await screen.getByRole("button").click();
    await expect.element(read).toHaveAttribute("aria-disabled", "true");
    await expect.element(read).toHaveAttribute("tabindex", "-1");
    await settle();
    expect(getComputedStyle(read.element()).opacity).toBe("0.5");
    await read.click({ force: true });
    await expect.element(read).toHaveAttribute("aria-checked", "false");
    await screen.getByRole("button").click();
    await expect.element(read).not.toHaveAttribute("aria-disabled");
    await read.click();
    await expect.element(read).toHaveAttribute("aria-checked", "true");
  });

  it("long labels wrap beside a fixed box at 390px", async () => {
    await page.viewport(390, 844);
    const screen = await render(
      <div style={{ padding: 16 }}>
        <Gallery />
        <Label>
          <Checkbox />
          customer interview transcript 2026-10-12 final revised
          with-annotations-and-highlights.docx
        </Label>
      </div>,
    );
    const box = screen.getByRole("checkbox", { name: /customer interview/ });
    expect(size(box.element())).toEqual([16, 16]);
    expect(
      screen
        .getByText(/customer interview/)
        .element()
        .getBoundingClientRect().height,
    ).toBeGreaterThan(20);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("motion is 120ms and stops for reduced motion", async () => {
    const screen = await render(<Checkbox aria-label="Box" />);
    const box = screen.getByRole("checkbox").element();
    expect(getComputedStyle(box).transitionDuration).toMatch(/^0\.12s/);
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(box).transitionDuration).toBe("0s");
  });
});
