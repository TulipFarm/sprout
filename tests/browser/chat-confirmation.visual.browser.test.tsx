import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { ChatConfirmation } from "../../packages/sprout/src/components/chat-confirmation.js";
import { setTheme, settle, themes } from "./support.js";

const details = [
  { label: "Table", value: "Supplier deliveries" },
  { label: "Affected rows", value: "1,284 rows" },
];

it.each(themes)("chat-confirmation %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "grid",
        gap: 12,
        padding: 16,
        width: 420,
        background: "var(--sprout-canvas)",
      }}
    >
      <ChatConfirmation
        title="Remove the Notes field"
        description="Review these changes before approving."
        details={details}
        state={{
          kind: "error",
          message: "Your decision could not be recorded. Try again.",
        }}
        onDecision={() => {}}
      />
      <ChatConfirmation
        title="Send a reminder"
        description="Review before approving."
        details={details}
        state={{ kind: "approved" }}
        onDecision={() => {}}
      />
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`chat-confirmation-${theme}-${mode}`);
});
