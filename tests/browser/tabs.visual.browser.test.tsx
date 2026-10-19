import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../packages/sprout/src/components/tabs.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("tabs %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "grid",
        gap: 20,
        width: 420,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      {(["default", "line", "steps"] as const).map((variant) => (
        <Tabs key={variant} defaultValue="overview">
          <TabsList variant={variant} aria-label={`${variant} tabs`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="disabled" disabled>
              Disabled
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview">Project summary.</TabsContent>
        </Tabs>
      ))}
      <Tabs defaultValue="members" orientation="vertical">
        <TabsList aria-label="Vertical tabs">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invites">Invitations</TabsTrigger>
        </TabsList>
        <TabsContent value="members">Three members.</TabsContent>
      </Tabs>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`tabs-${theme}-${mode}`);
});
