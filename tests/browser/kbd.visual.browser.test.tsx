import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Kbd, KbdGroup } from "../../packages/sprout/src/components/kbd.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("kbd %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "inline-grid",
        gap: 12,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <Kbd>⌘</Kbd>
        <Kbd>/</Kbd>
        <Kbd>Enter</Kbd>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Kbd variant="outline">↑↓</Kbd>
        <Kbd variant="outline">↵</Kbd>
        <Kbd variant="outline">Esc</Kbd>
      </div>
      <p style={{ margin: 0 }}>
        Press <Kbd>Esc</Kbd> to close.
      </p>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`kbd-${theme}-${mode}`);
});
