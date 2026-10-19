import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Input } from "../../packages/sprout/src/components/input.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("input %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "inline-grid",
        gridTemplateColumns: "200px 200px",
        gap: 8,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      <Input aria-label="Filled" defaultValue="Spring launch" />
      <Input aria-label="Empty" placeholder="For example, Spring launch" />
      <Input aria-label="Read only" readOnly defaultValue="whk_123" />
      <Input aria-label="Disabled" disabled defaultValue="Growth" />
      <Input aria-label="Invalid" aria-invalid="true" defaultValue="ana@" />
      <Input aria-label="Attachment" type="file" />
      <Input aria-label="Large" scale="lg" defaultValue="Acme, Inc." />
      <Input
        aria-label="Large empty"
        scale="lg"
        placeholder="you@company.com"
      />
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`input-${theme}-${mode}`);
});
