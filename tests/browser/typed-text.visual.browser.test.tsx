import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { TypedText } from "../../packages/sprout/src/components/typed-text.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("typed text %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "grid",
        gap: 8,
        width: 320,
        padding: 16,
        background: "var(--sprout-canvas)",
        color: "var(--sprout-text)",
      }}
    >
      <h4
        style={{
          margin: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        <TypedText text="Compare Q3 vendor contracts for the Lisbon and Porto warehouse expansion" />
      </h4>
      <p style={{ margin: 0, color: "var(--sprout-muted)" }}>
        <TypedText text="Crew booked for Café Søndergård" />
      </p>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`typed-text-${theme}-${mode}`);
});
