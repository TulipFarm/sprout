import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { useState } from "react";
import {
  CheckboxField,
  ChoiceGroup,
  Field,
} from "../../packages/sprout/src/components/field.js";
import { Input } from "../../packages/sprout/src/components/input.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

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

/** Nodes whose content is wider than their box. */
function overflowing(root: Element) {
  return [
    ...root.querySelectorAll(".sprout-choice-option, .sprout-checkbox-field"),
  ]
    .filter((node) => node.scrollWidth > node.clientWidth + 1)
    .map((node) => node.textContent);
}

const columns = (root: Element) =>
  getComputedStyle(
    root.querySelector('[data-layout="columns"]')!,
  ).gridTemplateColumns.split(" ").length;

describe("Field in a real browser", () => {
  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Form />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it("columns split from 640px, and nothing spills on a phone", async () => {
    const screen = await render(<Form />);
    expect(columns(screen.container)).toBe(2);
    expect(overflowing(screen.container)).toEqual([]);
    await page.viewport(390, 844);
    expect(columns(screen.container)).toBe(1);
    expect(overflowing(screen.container)).toEqual([]);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("screen-reader labels stay out of sight", async () => {
    const screen = await render(<Form />);
    await expect
      .element(screen.getByRole("textbox", { name: "Email 1" }))
      .toBeVisible();
    const label = screen.getByText("Email 1", { exact: true }).element();
    expect(label.getBoundingClientRect().width).toBeLessThanOrEqual(1);
  });

  it("radio groups move by arrow keys", async () => {
    const screen = await render(<Form />);
    const thread = screen.getByRole("radio", { name: "Reply in thread" });
    await thread.click();
    await userEvent.keyboard("{ArrowDown}");
    const channel = screen.getByRole("radio", { name: "Reply in channel" });
    await expect.element(channel).toBeChecked();
    await expect.element(channel).toHaveFocus();
    await expect
      .element(screen.getByRole("radio", { name: "Direct message" }))
      .toBeDisabled();
  });

  it("checkbox rows toggle by keyboard with a ring, and by their description", async () => {
    const screen = await render(<Form />);
    const search = screen.getByRole("checkbox", { name: "Search tickets" });
    (search.element() as HTMLElement).focus();
    await userEvent.keyboard(" ");
    await expect.element(search).not.toBeChecked();
    await userEvent.keyboard(" ");
    await expect.element(search).toBeChecked();
    // Focus from a key press keeps :focus-visible.
    expect(getComputedStyle(search.element()).outlineStyle).toBe("solid");
    await screen
      .getByText("Sends from support@meadow.dev.")
      .click({ force: true });
    await expect
      .element(screen.getByRole("checkbox", { name: "Send email replies" }))
      .toBeChecked();
    await screen.getByText("All day", { exact: true }).click();
    await expect
      .element(screen.getByRole("checkbox", { name: "All day" }))
      .toBeChecked();
  });

  it("a neutral checkbox field fills with the text color", async () => {
    const screen = await render(<Form />);
    await settle();
    const team = screen
      .getByRole("checkbox", { name: "Team calendar" })
      .element();
    expect(getComputedStyle(team).backgroundColor).toBe(
      getComputedStyle(team.closest(".sprout-checkbox-field")!).color,
    );
  });

  it("checkbox motion is 120ms and stops for reduced motion", async () => {
    const screen = await render(<Form />);
    const box = screen.getByRole("checkbox", { name: "All day" }).element();
    expect(getComputedStyle(box).transitionDuration).toMatch(/0\.12s/);
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(box).transitionDuration).toBe("0s");
  });

  it("options and checkbox fields grow to 44px on touch screens", async () => {
    await emulate({ coarse: true });
    await page.viewport(390, 844);
    const screen = await render(<Form />);
    for (const row of screen.container.querySelectorAll(
      ".sprout-choice-option, .sprout-checkbox-field-label",
    ))
      expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });
});
