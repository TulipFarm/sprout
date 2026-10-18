import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupOrientationNames,
  buttonGroupVariants,
} from "../packages/sprout/src/components/button-group.js";
import { Button } from "../packages/sprout/src/components/button.js";
import * as sprout from "../packages/sprout/src/index.js";

describe("Button Group", () => {
  it("is exported from the package root", () => {
    for (const name of [
      "ButtonGroup",
      "ButtonGroupSeparator",
      "ButtonGroupText",
      "buttonGroupOrientationNames",
      "buttonGroupVariants",
    ])
      expect(sprout).toHaveProperty(name);
    expect(buttonGroupOrientationNames).toEqual(["horizontal", "vertical"]);
  });

  it("builds orientation classes", () => {
    expect(buttonGroupVariants()).toBe(
      "sprout-button-group sprout-button-group-horizontal",
    );
    expect(
      buttonGroupVariants({ orientation: "vertical", className: "x" }),
    ).toBe("sprout-button-group sprout-button-group-vertical x");
    expect(buttonGroupVariants({ orientation: null })).toContain(
      "sprout-button-group-horizontal",
    );
  });

  it("renders a labelled group for every orientation", () => {
    for (const orientation of buttonGroupOrientationNames) {
      const html = renderToString(
        <ButtonGroup
          orientation={orientation}
          aria-label={`${orientation} pages`}
        >
          <Button variant="outline">Previous</Button>
          <Button variant="outline">Next</Button>
        </ButtonGroup>,
      );
      expect(html).toContain('role="group"');
      expect(html).toContain('data-slot="button-group"');
      expect(html).toContain(`data-orientation="${orientation}"`);
      expect(html).toContain(`aria-label="${orientation} pages"`);
      expect(html).toContain(`sprout-button-group-${orientation}`);
    }
    expect(renderToString(<ButtonGroup />)).toContain(
      'data-orientation="horizontal"',
    );
  });

  it("renders text as a div or a custom element with merged classes", () => {
    const text = renderToString(
      <ButtonGroupText className="wide" id="qty">
        Quantity: 0
      </ButtonGroupText>,
    );
    expect(text).toBe(
      '<div data-slot="button-group-text" class="sprout-button-group-text wide" id="qty">Quantity: 0</div>',
    );
    const output = renderToString(
      <ButtonGroupText render={<output aria-live="polite" />}>
        3 seats
      </ButtonGroupText>,
    );
    expect(output).toMatch(/^<output/);
    expect(output).toContain('aria-live="polite"');
    expect(output).toContain('data-slot="button-group-text"');
    expect(output).toContain(">3 seats</output>");
  });

  it("renders separators across the group with the input tone", () => {
    const vertical = renderToString(<ButtonGroupSeparator />);
    expect(vertical).toContain('data-slot="button-group-separator"');
    expect(vertical).toContain('data-orientation="vertical"');
    expect(vertical).toContain('data-tone="input"');
    expect(vertical).toContain(
      "sprout-separator sprout-button-group-separator",
    );
    const horizontal = renderToString(
      <ButtonGroupSeparator orientation="horizontal" className="extra" />,
    );
    expect(horizontal).toContain('data-orientation="horizontal"');
    expect(horizontal).toContain("extra");
  });

  it("composes the Cloud playground pager and quantity groups", () => {
    for (const orientation of buttonGroupOrientationNames) {
      const html = renderToString(
        <>
          <ButtonGroup
            orientation={orientation}
            aria-label={`${orientation} pages`}
          >
            <Button variant="outline" disabled>
              Previous
            </Button>
            <ButtonGroupSeparator
              orientation={
                orientation === "horizontal" ? "vertical" : "horizontal"
              }
            />
            <Button variant="outline">Next</Button>
          </ButtonGroup>
          <ButtonGroup
            orientation={orientation}
            aria-label={`${orientation} quantity`}
          >
            <ButtonGroupText>Quantity: 0</ButtonGroupText>
            <Button variant="outline" aria-label="Add one">
              <svg aria-hidden="true" />
            </Button>
          </ButtonGroup>
        </>,
      );
      expect(html).toContain("disabled");
      expect(html).toContain(
        `data-orientation="${orientation === "horizontal" ? "vertical" : "horizontal"}"`,
      );
      expect(html).toContain("Quantity: 0");
      expect(html).toContain('aria-label="Add one"');
    }
  });

  it("nests groups", () => {
    const html = renderToString(
      <ButtonGroup aria-label="Toolbar">
        <ButtonGroup aria-label="Week">
          <Button>Today</Button>
        </ButtonGroup>
      </ButtonGroup>,
    );
    expect(html.match(/data-slot="button-group"/g)).toHaveLength(2);
  });
});
