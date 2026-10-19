import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Field } from "../../packages/sprout/src/components/field.js";
import { Textarea } from "../../packages/sprout/src/components/textarea.js";
import { axeViolations, emulate, setTheme, themes } from "./support.js";

function colorOf(value: string) {
  const probe = document.createElement("span");
  probe.style.color = value;
  document.body.append(probe);
  const result = getComputedStyle(probe).color;
  probe.remove();
  return result;
}

const style = (name: string) =>
  getComputedStyle(page.getByLabelText(name, { exact: true }).element());
const area = (name: string) =>
  page.getByLabelText(name, { exact: true }).element() as HTMLTextAreaElement;
const height = (el: Element) => Math.round(el.getBoundingClientRect().height);

function Variants() {
  return (
    <div style={{ display: "grid", gap: 16, width: 360, maxWidth: "100%" }}>
      <Field
        label="Instructions"
        required
        helper="Describe its role and tone."
        counter="0 / 32,000"
      >
        <Textarea maxLength={32000} />
      </Field>
      <Textarea aria-label="Draft message" variant="embedded" />
      <Textarea aria-label="Your answer" placeholder="Type your answer…" />
      <Textarea aria-label="Read only" readOnly defaultValue="Locked text" />
      <Textarea aria-label="Processing instructions" disabled />
      <Field label="Request" required error="Enter a request.">
        <Textarea />
      </Field>
    </div>
  );
}

describe("Textarea in a real browser", () => {
  it.each(themes)(
    "%s %s uses surface, input, and text tokens",
    async (theme, mode) => {
      await emulate({ reducedMotion: true });
      setTheme(theme, mode);
      await render(<Variants />);
      const filled = style("Instructions");
      expect(filled.backgroundColor).toBe(colorOf("var(--sprout-surface)"));
      expect(filled.borderTopColor).toBe(colorOf("var(--sprout-input)"));
      expect(filled.color).toBe(colorOf("var(--sprout-text)"));
    },
  );

  it("default and embedded variants render at Cloud dimensions", async () => {
    await render(<Variants />);
    const filled = style("Instructions");
    expect(filled.fontSize).toBe("14px");
    expect(filled.lineHeight).toBe("20px");
    expect(filled.paddingTop).toBe("8px");
    expect(filled.paddingLeft).toBe("10px");
    expect(filled.borderTopWidth).toBe("1px");
    expect(filled.resize).toBe("vertical");
    expect(area("Instructions")).toHaveAttribute("aria-required", "true");
    expect(area("Instructions")).toHaveAccessibleDescription(
      /Describe its role/,
    );

    const draft = style("Draft message");
    expect(draft.borderTopColor).toBe("rgba(0, 0, 0, 0)");
    expect(draft.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(draft.resize).toBe("none");
    expect(draft.paddingLeft).toBe("10px");
    area("Draft message").focus();
    await userEvent.keyboard("Hi");
    expect(style("Draft message").outlineWidth).toBe("0px");
  });

  it("rows set the starting height and content grows and shrinks it", async () => {
    await render(
      <div style={{ width: 360 }}>
        <Textarea aria-label="auto" />
        {[3, 5, 9, 10, 12].map((rows) => (
          <Textarea key={rows} aria-label={`rows ${rows}`} rows={rows} />
        ))}
      </div>,
    );
    expect(height(area("auto"))).toBe(96);
    for (const [rows, px] of [
      [3, 96],
      [5, 118],
      [9, 198],
      [10, 218],
      [12, 258],
    ])
      expect(height(area(`rows ${rows}`))).toBe(px);
    const notes = page.getByLabelText("auto", { exact: true });
    await notes.fill(
      Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`).join("\n"),
    );
    // Ten 20px lines plus 16px padding and 2px border.
    expect(height(area("auto"))).toBe(218);
    await notes.fill("Short");
    expect(height(area("auto"))).toBe(96);
    await notes.fill("x".repeat(400));
    expect(area("auto").scrollWidth).toBeLessThanOrEqual(
      area("auto").clientWidth,
    );
  });

  it("styles placeholder, read-only, disabled, and invalid states", async () => {
    await emulate({ reducedMotion: true });
    await render(<Variants />);
    expect(style("Your answer").color).toBe(colorOf("var(--sprout-text)"));

    const readOnly = area("Read only");
    readOnly.focus();
    readOnly.setSelectionRange(readOnly.value.length, readOnly.value.length);
    await userEvent.keyboard("x");
    expect(readOnly.value).toBe("Locked text");

    expect(area("Processing instructions")).toBeDisabled();
    const disabled = style("Processing instructions");
    expect(disabled.opacity).toBe("0.5");
    expect(disabled.cursor).toBe("not-allowed");
    expect(disabled.backgroundColor).toBe(colorOf("var(--sprout-hover)"));

    expect(area("Request")).toHaveAttribute("aria-invalid", "true");
    expect(area("Request")).toHaveAccessibleDescription("Enter a request.");
    expect(style("Request").borderTopColor).toBe(
      colorOf("var(--sprout-danger)"),
    );
    area("Processing instructions").blur();
    area("Read only").focus();
    await userEvent.tab();
    await userEvent.tab({ shift: true });
    await userEvent.tab();
    await expect
      .element(page.getByLabelText("Request", { exact: true }))
      .toHaveFocus();
    expect(style("Request").outlineColor).toBe(colorOf("var(--sprout-danger)"));
  });

  it("shows a 1px focus outline from Tab and keeps Enter for new lines", async () => {
    await emulate({ reducedMotion: true });
    await render(
      <form onSubmit={(event) => event.preventDefault()}>
        <button type="button">Before</button>
        <Textarea
          aria-label="Query"
          spellCheck={false}
          defaultValue="status==Open"
        />
      </form>,
    );
    page.getByRole("button", { name: "Before" }).element().focus();
    await userEvent.tab();
    await expect.element(page.getByLabelText("Query")).toHaveFocus();
    const focused = style("Query");
    expect(focused.outlineWidth).toBe("1px");
    expect(focused.outlineOffset).toBe("0px");
    expect(focused.borderTopColor).toBe(colorOf("var(--sprout-border)"));
    const query = area("Query");
    query.setSelectionRange(query.value.length, query.value.length);
    await userEvent.keyboard("{Enter}and team==Ops");
    expect(query.value).toBe("status==Open\nand team==Ops");
  });

  it("joins native form validation when required", async () => {
    await render(
      <form>
        <Field label="Text" required>
          <Textarea rows={10} required />
        </Field>
      </form>,
    );
    expect(height(area("Text"))).toBe(218);
    expect(area("Text").validity.valueMissing).toBe(true);
    await page
      .getByLabelText("Text", { exact: true })
      .fill("Launch is October 30.");
    expect(area("Text").validity.valueMissing).toBe(false);
  });

  it("stays inside a phone viewport and wraps long words", async () => {
    await page.viewport(320, 640);
    await render(<Variants />);
    for (const el of document.querySelectorAll("textarea")) {
      const rect = el.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(320);
    }
    await page.getByLabelText("Your answer").fill("y".repeat(300));
    expect(area("Your answer").scrollWidth).toBeLessThanOrEqual(
      area("Your answer").clientWidth,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });

  it("transitions colors in 0.12s and drops it under reduced motion", async () => {
    await render(<Variants />);
    expect(style("Your answer").transitionDuration).toMatch(/^0\.12s/);
    await emulate({ reducedMotion: true });
    expect(style("Your answer").transitionDuration).toBe("0s");
  });

  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Variants />);
    expect(await axeViolations(screen.container)).toEqual([]);
  });
});
