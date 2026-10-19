import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Label } from "../../packages/sprout/src/components/label.js";
import {
  RadioGroup,
  RadioGroupItem,
} from "../../packages/sprout/src/components/radio-group.js";
import { setTheme, settle, themes } from "./support.js";

const states = [
  { name: "Off" },
  { name: "On", checked: true },
  { name: "Disabled", disabled: true },
  { name: "Disabled on", disabled: true, checked: true },
  { name: "Invalid", invalid: true },
  { name: "Invalid on", invalid: true, checked: true },
];

it.each(themes)("radio-group %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "inline-grid",
        gridTemplateColumns: "repeat(3, auto)",
        gap: 12,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      {states.map((state) => (
        <RadioGroup
          key={state.name}
          aria-label={state.name}
          defaultValue={state.checked ? state.name : undefined}
          disabled={state.disabled}
        >
          <Label>
            <RadioGroupItem
              value={state.name}
              aria-invalid={state.invalid || undefined}
            />
            {state.name}
          </Label>
        </RadioGroup>
      ))}
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`radio-group-${theme}-${mode}`);
});
