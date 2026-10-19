import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "../../packages/sprout/src/components/progress.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("progress %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "grid",
        gap: 16,
        width: 280,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      {([0, 40, 100, null] as const).map((value) => (
        <Progress key={String(value)} value={value}>
          <ProgressLabel>
            {value === null ? "Waiting" : "Progress"}
          </ProgressLabel>
          <ProgressValue />
        </Progress>
      ))}
      <Progress value={32} aria-label="Workspace storage used" />
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`progress-${theme}-${mode}`);
});
