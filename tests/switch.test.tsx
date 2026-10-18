import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import {
  Switch,
  switchSizeNames,
} from "../packages/sprout/src/components/switch.js";
import * as sprout from "../packages/sprout/src/index.js";

const css = readFileSync(
  new URL("../packages/sprout/src/styles/switch.css", import.meta.url),
  "utf8",
);

describe("Switch", () => {
  it("is exported from the package root, its subpath, and the CSS entry", () => {
    expect(sprout).toHaveProperty("Switch");
    expect(sprout).toHaveProperty("switchSizeNames");
    expect(switchSizeNames).toEqual(["default", "sm"]);
    const pkg = JSON.parse(
      readFileSync(
        new URL("../packages/sprout/package.json", import.meta.url),
        "utf8",
      ),
    );
    expect(pkg.exports["./switch"]).toEqual({
      types: "./dist/components/switch.d.ts",
      import: "./dist/components/switch.js",
    });
    const entry = readFileSync(
      new URL("../packages/sprout/src/styles/index.css", import.meta.url),
      "utf8",
    );
    expect(entry).toContain('@import "./switch.css";');
  });

  it("renders an off Base UI switch with the default size and a thumb", () => {
    const html = renderToString(<Switch aria-label="Allow GPT-5" />);
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain('aria-label="Allow GPT-5"');
    expect(html).toContain('data-slot="switch"');
    expect(html).toContain('data-size="default"');
    expect(html).toContain('class="sprout-switch sprout-switch-size-default"');
    expect(html).toContain("data-unchecked");
    expect(html).toContain('data-slot="switch-thumb"');
    expect(html).toContain('class="sprout-switch-thumb"');
    expect(html).toContain('type="checkbox"');
  });

  it("renders every size on, disabled, invalid, and busy", () => {
    for (const size of switchSizeNames) {
      const html = renderToString(
        <Switch
          size={size}
          defaultChecked
          disabled
          aria-invalid
          aria-busy
          aria-label="Allow Claude Sonnet 4.5"
        />,
      );
      expect(html).toContain(`data-size="${size}"`);
      expect(html).toContain(`sprout-switch-size-${size}`);
      expect(html).toContain('aria-checked="true"');
      expect(html).toContain("data-checked");
      expect(html).toContain("data-disabled");
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain('aria-busy="true"');
    }
  });

  it("passes id, name, value, required, readOnly, and className through", () => {
    const html = renderToString(
      <Switch
        id="example-summary"
        name="summary"
        value="on"
        required
        readOnly
        className="ml-auto"
      />,
    );
    expect(html).toContain('name="summary"');
    expect(html).toContain('aria-required="true"');
    expect(html).toContain('aria-readonly="true"');
    expect(html).toContain("data-readonly");
    expect(html).toContain("sprout-switch-size-default ml-auto");
    expect(html).toMatch(/id="example-summary"/);
    const fn = renderToString(
      <Switch
        defaultChecked
        className={(state) => (state.checked ? "is-on" : "is-off")}
      />,
    );
    expect(fn).toContain("sprout-switch sprout-switch-size-default is-on");
  });

  it("styles sizes and states with tokens, a hit area, reduced motion, RTL, and forced colors", () => {
    expect(css).toContain("width: 32px");
    expect(css).toContain("height: 18px");
    expect(css).toContain("width: 24px");
    expect(css).toContain("height: 14px");
    expect(css).toContain("inset: -8px -12px");
    expect(css).toContain("var(--sprout-muted)");
    expect(css).toContain("var(--sprout-primary)");
    expect(css).toContain("var(--sprout-on-primary)");
    expect(css).toContain("var(--sprout-danger)");
    expect(css).toContain("var(--sprout-focus)");
    expect(css).toContain(":dir(rtl)");
    expect(css).toContain('[aria-busy="true"]');
    expect(css).toContain("prefers-reduced-motion: no-preference");
    expect(css).toContain("forced-colors: active");
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });
});
