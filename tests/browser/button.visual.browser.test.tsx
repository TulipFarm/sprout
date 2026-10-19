import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
  Button,
  buttonVariantNames,
} from "../../packages/sprout/src/components/button.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("button %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        gap: 8,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      {buttonVariantNames.map((variant) => (
        <Button key={variant} variant={variant}>
          {variant}
        </Button>
      ))}
      <Button disabled>Disabled</Button>
      <Button state={{ kind: "busy" }} pendingLabel="Saving…">
        Save
      </Button>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`button-${theme}-${mode}`);
});
