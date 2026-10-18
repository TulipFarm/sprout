import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  selectTriggerSizeNames,
  selectTriggerWidthNames,
} from "../packages/sprout/src/components/select.js";
import * as sprout from "../packages/sprout/src/index.js";

function tag(html: string, slot: string) {
  const match = html.match(
    new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`),
  );
  expect(match, slot).toBeTruthy();
  return match![0];
}

const roles = { viewer: "Can view", editor: "Can edit", manager: "Can manage" };

describe("Select", () => {
  it("lists every trigger size and width Cloud uses", () => {
    expect(selectTriggerSizeNames).toEqual(["default", "sm", "calendar"]);
    expect(selectTriggerWidthNames).toEqual(["fit", "full"]);
  });

  it("exports every Cloud part from the package root", () => {
    for (const name of [
      "Select",
      "SelectContent",
      "SelectGroup",
      "SelectItem",
      "SelectLabel",
      "SelectScrollDownButton",
      "SelectScrollUpButton",
      "SelectSeparator",
      "SelectTrigger",
      "SelectValue",
    ]) {
      expect(sprout, name).toHaveProperty(name);
    }
    expect(sprout.SelectScrollUpButton).toBe(SelectScrollUpButton);
    expect(sprout.SelectScrollDownButton).toBe(SelectScrollDownButton);
  });

  it("renders a default fit combobox trigger with the item label and a chevron", () => {
    const html = renderToString(
      <Select items={roles} value="editor">
        <SelectTrigger aria-label="Access for Priya Raman">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="viewer">Can view</SelectItem>
          <SelectItem value="editor">Can edit</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = tag(html, "select-trigger");
    expect(trigger).toMatch(/^<button /);
    expect(trigger).toContain('role="combobox"');
    expect(trigger).toContain('aria-expanded="false"');
    expect(trigger).toContain('data-size="default"');
    expect(trigger).toContain('data-width="fit"');
    expect(trigger).toContain("sprout-select-trigger-default");
    expect(trigger).toContain("sprout-select-trigger-fit");
    expect(trigger).toContain('aria-label="Access for Priya Raman"');
    expect(html).toContain("Can edit");
    expect(html).toContain("sprout-select-icon");
    expect(html).not.toContain('data-slot="select-content"');
    expect(html).not.toContain("<select");
  });

  it.each([
    ["sm", "full"],
    ["calendar", "fit"],
    ["default", "full"],
  ] as const)("renders size %s with width %s", (size, width) => {
    const html = renderToString(
      <Select value={25}>
        <SelectTrigger size={size} width={width} id="page-size">
          <SelectValue />
        </SelectTrigger>
      </Select>,
    );
    const trigger = tag(html, "select-trigger");
    expect(trigger).toContain(`data-size="${size}"`);
    expect(trigger).toContain(`sprout-select-trigger-${size}`);
    expect(trigger).toContain(`sprout-select-trigger-${width}`);
    expect(trigger).toContain('id="page-size"');
    expect(html).toContain(">25<");
  });

  it("shows the placeholder for null and keeps empty string as a real value", () => {
    const empty = renderToString(
      <Select value={null}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a Slack channel" />
        </SelectTrigger>
      </Select>,
    );
    expect(empty).toContain("Choose a Slack channel");
    expect(tag(empty, "select-trigger")).toContain("data-placeholder");

    const workspaceDefault = renderToString(
      <Select
        items={[
          { value: "", label: "Workspace default" },
          { value: "gpt-5", label: "GPT-5" },
        ]}
        value=""
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
      </Select>,
    );
    expect(workspaceDefault).toContain("Workspace default");
  });

  it("lets children replace the label", () => {
    const html = renderToString(
      <Select value="u_81">
        <SelectTrigger>
          <SelectValue placeholder="Select a member">
            Dana Whitfield
          </SelectValue>
        </SelectTrigger>
      </Select>,
    );
    expect(tag(html, "select-value")).toBeTruthy();
    expect(html).toContain("Dana Whitfield");
    expect(html).not.toContain("u_81<");
  });

  it("passes field ARIA, busy, and disabled state to the trigger", () => {
    const html = renderToString(
      <Select value={null} disabled>
        <SelectTrigger
          id="source"
          width="full"
          aria-invalid="true"
          aria-required="true"
          aria-describedby="source-error"
          aria-busy="true"
        >
          <SelectValue placeholder="Loading tables…" />
        </SelectTrigger>
      </Select>,
    );
    const trigger = tag(html, "select-trigger");
    expect(trigger).toContain('id="source"');
    expect(trigger).toContain('aria-invalid="true"');
    expect(trigger).toContain('aria-required="true"');
    expect(trigger).toContain('aria-describedby="source-error"');
    expect(trigger).toContain('aria-busy="true"');
    expect(trigger).toContain("data-disabled");
    expect(trigger).toMatch(/\sdisabled=""/);
  });

  it("renders the hidden input for required named form values", () => {
    const html = renderToString(
      <form>
        <Select name="access" required defaultValue="read">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
        </Select>
      </form>,
    );
    expect(html).toMatch(/<input[^>]*name="access"/);
    expect(html).toMatch(/<input[^>]*required/);
  });

  it("keeps consumer classes on every part", () => {
    const html = renderToString(
      <Select value="daily">
        <SelectTrigger className="extra-trigger">
          <SelectValue className="extra-value" />
        </SelectTrigger>
      </Select>,
    );
    expect(tag(html, "select-trigger")).toContain("extra-trigger");
    expect(tag(html, "select-value")).toContain("extra-value");
    expect(SelectGroup).toBeTypeOf("function");
    expect(SelectLabel).toBeTypeOf("function");
    expect(SelectSeparator).toBeTypeOf("function");
  });
});
