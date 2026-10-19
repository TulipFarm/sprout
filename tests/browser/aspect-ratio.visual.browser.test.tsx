import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { AspectRatio } from "../../packages/sprout/src/components/aspect-ratio.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("aspect-ratio %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "inline-grid",
        gridTemplateColumns: "repeat(3, 120px)",
        alignItems: "start",
        gap: 12,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      {[16 / 9, 4 / 3, 1].map((ratio) => (
        <AspectRatio
          key={ratio}
          ratio={ratio}
          style={{
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid var(--sprout-border)",
            background: "var(--sprout-surface)",
            display: "grid",
            placeItems: "center",
            color: "var(--sprout-muted)",
            fontSize: 12,
          }}
        >
          Ratio {ratio.toFixed(2)}
        </AspectRatio>
      ))}
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`aspect-ratio-${theme}-${mode}`);
});
