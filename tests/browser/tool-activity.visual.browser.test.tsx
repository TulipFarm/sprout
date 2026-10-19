import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
  ToolActivity,
  toolActivityStatusNames,
} from "../../packages/sprout/src/components/tool-activity.js";
import { setTheme, settle, themes } from "./support.js";

const icon = (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const items = toolActivityStatusNames.map((status) => ({
  id: status,
  label: `Step ${status}`,
  status,
  visual: icon,
  detail: status === "failed" ? "The request timed out." : undefined,
}));

it.each(themes)("tool-activity %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{ width: 360, padding: 16, background: "var(--sprout-canvas)" }}
    >
      <ToolActivity items={items} />
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`tool-activity-${theme}-${mode}`);
});
