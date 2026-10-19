import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Calendar } from "../../packages/sprout/src/components/calendar.js";
import { setTheme, settle, themes } from "./support.js";

const day = (n: number) => new Date(2026, 9, n);

it.each(themes)("calendar %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "inline-flex",
        gap: 16,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      <Calendar
        mode="single"
        selected={day(12)}
        defaultMonth={day(1)}
        today={day(8)}
        disabled={{ dayOfWeek: [0, 6] }}
      />
      <Calendar
        mode="range"
        selected={{ from: day(12), to: day(16) }}
        defaultMonth={day(1)}
        today={day(8)}
      />
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`calendar-${theme}-${mode}`);
});
