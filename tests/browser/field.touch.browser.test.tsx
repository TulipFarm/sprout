import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import {
  CheckboxField,
  ChoiceGroup,
  Field,
} from "../../packages/sprout/src/components/field.js";
import { Input } from "../../packages/sprout/src/components/input.js";

const replies = [
  {
    value: "thread",
    label: "Reply in thread",
    description: "Keeps the channel tidy. Best for busy channels.",
  },
  { value: "channel", label: "Reply in channel" },
  { value: "dm", label: "Direct message", disabled: true },
] as const;

const tools = [
  { value: "search", label: "Search tickets" },
  {
    value: "email",
    label: "Send email replies",
    description: "Sends from support@meadow.dev.",
  },
  { value: "delete", label: "Delete tickets", disabled: true },
] as const;

type Reply = (typeof replies)[number]["value"];
type Tool = (typeof tools)[number]["value"];

function Form() {
  const [reply, setReply] = useState<Reply>("thread");
  const [picked, setPicked] = useState<Tool[]>(["search"]);
  const [allDay, setAllDay] = useState(false);
  const [team, setTeam] = useState(true);
  return (
    <div
      style={{ display: "grid", gap: 16, padding: 16, maxWidth: 640 }}
      data-testid="form"
    >
      <Field label="Name" required error="Enter a name for this agent.">
        <Input />
      </Field>
      <Field label="Email 1" labelVisibility="screen-reader" optional>
        <Input />
      </Field>
      <ChoiceGroup
        type="radio"
        legend="Reply mode"
        required
        layout="columns"
        options={replies}
        value={reply}
        onValueChange={setReply}
      />
      <ChoiceGroup
        type="checkbox"
        legend="Tools"
        optional
        warning="Changes data"
        options={tools}
        value={picked}
        onValueChange={setPicked}
      />
      <CheckboxField
        label="All day"
        checked={allDay}
        onCheckedChange={setAllDay}
      />
      <CheckboxField
        label="Team calendar"
        variant="neutral"
        checked={team}
        onCheckedChange={setTeam}
      />
    </div>
  );
}

describe("Field on a touch screen", () => {
  it("options and checkbox fields grow to 44px on touch screens", async () => {
    await page.viewport(390, 844);
    const screen = await render(<Form />);
    for (const row of screen.container.querySelectorAll(
      ".sprout-choice-option, .sprout-checkbox-field-label",
    ))
      expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });
});
