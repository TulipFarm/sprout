import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
import { Input } from "../../packages/sprout/src/components/input.js";
import {
  SettingsGroup,
  SettingsRow,
} from "../../packages/sprout/src/components/settings-list.js";
import { Switch } from "../../packages/sprout/src/components/switch.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("settings-list %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{ width: 640, padding: 16, background: "var(--sprout-canvas)" }}
    >
      <SettingsGroup title="Profile" titleId="profile-heading">
        <SettingsRow label="Picture" description="Shown beside your name.">
          <Button variant="outline" size="sm">
            Upload image
          </Button>
        </SettingsRow>
        <SettingsRow
          label="Name"
          htmlFor="name"
          description="Up to 80 characters."
        >
          <Input id="name" defaultValue="Maya Chen" />
        </SettingsRow>
        <SettingsRow label="Role" description="Your role is team manager." />
        <SettingsRow label="Quiet hours" htmlFor="quiet">
          <Switch id="quiet" defaultChecked />
        </SettingsRow>
      </SettingsGroup>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`settings-list-${theme}-${mode}`);
});
