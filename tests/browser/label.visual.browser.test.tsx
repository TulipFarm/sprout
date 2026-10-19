import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Checkbox } from "../../packages/sprout/src/components/checkbox.js";
import { Input } from "../../packages/sprout/src/components/input.js";
import { Label } from "../../packages/sprout/src/components/label.js";
import { Switch } from "../../packages/sprout/src/components/switch.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("label %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "grid",
        gap: 12,
        width: 280,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      <Label htmlFor="workspace">Workspace name</Label>
      <Input id="workspace" defaultValue="Meadow" />
      <Label>
        <Checkbox defaultChecked />
        Run workflow
      </Label>
      <Label>
        <Checkbox disabled />
        Disabled
      </Label>
      <Label>
        <Switch size="sm" defaultChecked />
        Pause motion
      </Label>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`label-${theme}-${mode}`);
});
