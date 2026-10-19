import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { MessageResponse } from "../../packages/sprout/src/components/message-response.js";
import { setTheme, settle, themes } from "./support.js";

const markdown = `## Checklist

Ask **Robin** about \`bulbs\` and read [the brief](https://example.com/brief).

- [x] Order bulbs
- [ ] Plant beds

> Check them twice.

| Item | Status | Price |
| :--- | :----: | ----: |
| Bulbs | Ready | $14.00 |`;

it.each(themes)("message-response %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "grid",
        width: 420,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      <MessageResponse>{markdown}</MessageResponse>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`message-response-${theme}-${mode}`);
});
