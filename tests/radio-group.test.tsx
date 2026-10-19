import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import {
  RadioGroup,
  RadioGroupItem,
} from "../packages/sprout/src/components/radio-group.js";
import { ChoiceGroup } from "../packages/sprout/src/components/field.js";
import { Label } from "../packages/sprout/src/components/label.js";
import * as sprout from "../packages/sprout/src/index.js";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("../packages/sprout/src/styles/radio-group.css");

describe("RadioGroup", () => {
  it("is exported from the package root, its subpath, and the CSS entry", () => {
    expect(sprout).toHaveProperty("RadioGroup");
    expect(sprout).toHaveProperty("RadioGroupItem");
    const pkg = JSON.parse(read("../packages/sprout/package.json"));
    expect(pkg.exports["./radio-group"]).toEqual({
      types: "./dist/components/radio-group.d.ts",
      import: "./dist/components/radio-group.js",
    });
    expect(read("../packages/sprout/src/styles/index.css")).toContain(
      '@import "./radio-group.css";',
    );
    expect(read("../apps/docs/src/data/nav.ts")).toContain('"Radio Group"');
  });

  it("renders a labeled group with Cloud's slots and an uncontrolled value", () => {
    const html = renderToString(
      <RadioGroup defaultValue="weekly" aria-label="Digest frequency">
        <Label>
          <RadioGroupItem value="daily" />
          Daily
        </Label>
        <Label>
          <RadioGroupItem value="weekly" />
          Weekly
        </Label>
        <Label>
          <RadioGroupItem value="never" disabled />
          Unavailable
        </Label>
      </RadioGroup>,
    );
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Digest frequency"');
    expect(html).toContain('data-slot="radio-group"');
    expect(html).toContain('class="sprout-radio-group"');
    expect(html.match(/role="radio"/g)).toHaveLength(3);
    expect(html.match(/data-slot="radio-group-item"/g)).toHaveLength(3);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toMatch(
      /aria-checked="true"[^>]*data-slot="radio-group-item"|data-slot="radio-group-item"[^>]*aria-checked="true"/,
    );
    // Only the checked radio mounts its dot.
    expect(html.match(/data-slot="radio-group-indicator"/g)).toHaveLength(1);
    expect(html).toContain('class="sprout-radio-group-indicator"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('type="radio"');
  });

  it("lets callers override the slot and merge classes, and forwards ARIA", () => {
    const html = renderToString(
      <RadioGroup
        id="reply"
        data-slot="choice-group"
        className="custom-group"
        value="tag"
        disabled
        aria-required
        aria-invalid
        aria-labelledby="reply-legend"
        aria-describedby="reply-helper"
      >
        <p id="reply-legend">When should it reply?</p>
        <RadioGroupItem
          className="mt-0.5"
          value="tag"
          aria-invalid
          aria-describedby="tag-description"
        />
      </RadioGroup>,
    );
    expect(html).toContain('data-slot="choice-group"');
    expect(html).not.toContain('data-slot="radio-group"');
    expect(html).toContain('class="sprout-radio-group custom-group"');
    expect(html).toContain('id="reply"');
    expect(html).toContain('aria-required="true"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-labelledby="reply-legend"');
    expect(html).toContain('aria-describedby="reply-helper"');
    expect(html).toContain("When should it reply?");
    expect(html).toContain('class="sprout-radio-group-item mt-0.5"');
    expect(html).toContain('aria-describedby="tag-description"');
    expect(html).toContain("data-disabled");
  });

  it("accepts state functions for className", () => {
    const html = renderToString(
      <RadioGroup
        defaultValue="a"
        aria-label="State classes"
        className={(state) => (state.disabled ? "off" : "on")}
      >
        <RadioGroupItem
          value="a"
          aria-label="A"
          className={(state) => (state.checked ? "is-on" : "is-off")}
        />
      </RadioGroup>,
    );
    expect(html).toContain('class="sprout-radio-group on"');
    expect(html).toContain('class="sprout-radio-group-item is-on"');
  });

  it("powers Field's radio ChoiceGroup", () => {
    const html = renderToString(
      <ChoiceGroup
        type="radio"
        required
        layout="columns"
        legend="Workspace type"
        value="business"
        onValueChange={() => {}}
        options={[
          { value: "personal", label: "Personal", description: "Just you" },
          { value: "business", label: "Business", disabled: true },
        ]}
      />,
    );
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('data-slot="choice-group"');
    expect(html).toContain('class="sprout-radio-group sprout-choice-group"');
    expect(html).toContain('aria-required="true"');
    expect(html).toContain(
      'class="sprout-radio-group-item sprout-field-radio"',
    );
    expect(html).toContain('data-slot="radio-group-indicator"');
  });

  it("styles states, motion, and forced colors with Sprout tokens", () => {
    expect(css).toContain("@layer components");
    expect(css).toMatch(/\.sprout-radio-group-item \{[^}]*width: 16px;/);
    expect(css).toMatch(
      /\.sprout-radio-group-item \{[^}]*border-radius: 999px;/,
    );
    expect(css).toContain("inset: -8px -12px;");
    expect(css).toContain("var(--sprout-primary)");
    expect(css).toContain("var(--sprout-danger)");
    expect(css).toContain("var(--sprout-focus-ring)");
    expect(css).toContain("prefers-reduced-motion: no-preference");
    expect(css).toContain("forced-colors: active");
    expect(css).toMatch(/\.sprout-radio-group-indicator \{[^}]*width: 8px;/);
    // Field offsets the dot by 2px; this file must not reset its margin.
    expect(css).not.toMatch(/margin:/);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
