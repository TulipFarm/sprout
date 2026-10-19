import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { TablesSample } from "../../packages/sprout/src/components/state-panel-samples.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("state-panel-samples %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "grid",
        width: 480,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      <TablesSample />
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`state-panel-samples-${theme}-${mode}`);
});
