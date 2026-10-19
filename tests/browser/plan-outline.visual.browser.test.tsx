import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
  PlanOutline,
  planOutlineMarkNames,
  type PlanOutlineTask,
} from "../../packages/sprout/src/components/plan-outline.js";
import { setTheme, settle, themes } from "./support.js";

const tasks: PlanOutlineTask[] = planOutlineMarkNames.map((mark, index) => ({
  id: mark,
  title: `${index + 1}. ${mark} task`,
  mark,
  label: mark,
  ...(mark === "failed" && {
    reason: "Two suppliers did not reply.",
    criteria: ["Both suppliers confirm stock."],
  }),
}));

it.each(themes)("plan-outline %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{ width: 400, padding: 16, background: "var(--sprout-canvas)" }}
    >
      <PlanOutline
        title="Meadow garden plan"
        brief="Plant a spring bed by the shed."
        status="Running"
        tone="active"
        progress="1 of 6 done · 1 working"
        tasks={tasks}
      />
    </div>,
  );
  await screen.getByRole("button", { name: /failed task/ }).click();
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`plan-outline-${theme}-${mode}`);
});
