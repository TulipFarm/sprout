import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { ChatPlan } from "../../packages/sprout/src/components/chat-plan.js";
import { emulate, setTheme, settle, themes } from "./support.js";

it.each(themes)("chat-plan %s %s", async (theme, mode) => {
  await emulate({ reducedMotion: true });
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "grid",
        gap: 12,
        width: 360,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      <ChatPlan
        title="Fictional garden plan"
        steps={[
          { id: "patch", title: "Choose a patch", state: "complete" },
          { id: "soil", title: "Prepare the soil", state: "pending" },
          {
            id: "bulbs",
            title: "Order bulbs",
            detail: "The sample supplier is unavailable.",
            state: "error",
          },
        ]}
      />
      <ChatPlan title="New plan" steps={[]} />
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`chat-plan-${theme}-${mode}`);
});
