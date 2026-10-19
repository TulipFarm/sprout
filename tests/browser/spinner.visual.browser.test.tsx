import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Badge } from "../../packages/sprout/src/components/badge.js";
import { Button } from "../../packages/sprout/src/components/button.js";
import { Spinner } from "../../packages/sprout/src/components/spinner.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("spinner %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      <Spinner size="sm" />
      <Spinner />
      <Spinner size="lg" />
      <Button disabled aria-busy="true">
        <Spinner aria-hidden="true" />
        Opening sign-in…
      </Button>
      <Badge>
        <Spinner aria-hidden="true" />
        Uploading
      </Badge>
      <span style={{ color: "var(--sprout-info)" }}>
        <Spinner aria-label="Running" />
      </span>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`spinner-${theme}-${mode}`);
});
