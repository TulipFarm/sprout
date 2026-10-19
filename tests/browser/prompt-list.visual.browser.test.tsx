import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { PromptList } from "../../packages/sprout/src/components/prompt-list.js";
import { setTheme, settle, themes } from "./support.js";

const Dot = () => (
  <svg viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="5" fill="currentColor" />
  </svg>
);

it.each(themes)("prompt-list %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "grid",
        gap: 16,
        padding: 16,
        width: 420,
        background: "var(--sprout-canvas)",
      }}
    >
      <PromptList
        title="Start with a task"
        onSelect={() => {}}
        items={[
          {
            id: "meetings",
            label: "Prepare me for tomorrow's meetings",
            icon: <Dot />,
          },
          {
            id: "emails",
            label:
              "Draft replies to recent customer emails about delayed spring bulb orders",
            icon: <Dot />,
          },
        ]}
      />
      <PromptList
        title="Unavailable"
        disabled
        onSelect={() => {}}
        items={[
          { id: "standup", label: "Write the standup summary", icon: <Dot /> },
        ]}
      />
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`prompt-list-${theme}-${mode}`);
});
