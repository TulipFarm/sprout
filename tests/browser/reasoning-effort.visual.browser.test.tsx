import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { ReasoningEffort } from "../../packages/sprout/src/components/reasoning-effort.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("reasoning-effort %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "inline-grid",
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      <ReasoningEffort
        levels={["Quick", "Balanced", "Thorough", "Maximum"]}
        value={2}
        onValueChange={() => {}}
      />
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`reasoning-effort-${theme}-${mode}`);
});
