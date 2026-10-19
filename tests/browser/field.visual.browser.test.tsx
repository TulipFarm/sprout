import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
  CheckboxField,
  ChoiceGroup,
  Field,
} from "../../packages/sprout/src/components/field.js";
import { Input } from "../../packages/sprout/src/components/input.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("field %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "grid",
        gap: 16,
        padding: 16,
        width: 560,
        background: "var(--sprout-canvas)",
      }}
    >
      <Field label="Name" required error="Enter a name for this agent.">
        <Input />
      </Field>
      <Field
        label="Instructions"
        optional
        counter="120 / 8,000"
        helper="Shown to every member."
      >
        <Input defaultValue="Answer billing questions" />
      </Field>
      <ChoiceGroup
        type="radio"
        legend="Reply mode"
        required
        layout="columns"
        options={[
          {
            value: "thread",
            label: "Reply in thread",
            description: "Keeps the channel tidy.",
          },
          { value: "channel", label: "Reply in channel" },
          { value: "dm", label: "Direct message", disabled: true },
        ]}
        value="thread"
        onValueChange={() => {}}
      />
      <ChoiceGroup
        type="checkbox"
        legend="Tools"
        optional
        warning="Changes data"
        options={[
          { value: "search", label: "Search tickets" },
          {
            value: "email",
            label: "Send email replies",
            description: "Sends from support@meadow.dev.",
          },
        ]}
        value={["search"]}
        onValueChange={() => {}}
      />
      <CheckboxField
        label="Team calendar"
        variant="neutral"
        checked
        onCheckedChange={() => {}}
      />
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`field-${theme}-${mode}`);
});
