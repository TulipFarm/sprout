import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Slider } from "../../packages/sprout/src/components/slider.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("slider %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "inline-flex",
        gap: 32,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      <div style={{ display: "grid", gap: 24, width: 240 }}>
        <Slider aria-label="Volume" defaultValue={40} />
        <Slider aria-label="Range" defaultValue={[20, 75]} />
        <Slider aria-label="Disabled" defaultValue={65} disabled />
      </div>
      <div style={{ height: 96 }}>
        <Slider
          aria-label="Vertical volume"
          orientation="vertical"
          defaultValue={60}
        />
      </div>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`slider-${theme}-${mode}`);
});
