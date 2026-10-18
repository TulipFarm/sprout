import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import {
  SettingsGroup,
  SettingsRow,
  settingsGroupHeadingNames,
} from "../packages/sprout/src/components/settings-list.js";
import * as sprout from "../packages/sprout/src/index.js";

const root = new URL("../packages/sprout/", import.meta.url);

describe("SettingsGroup", () => {
  it("names the section by its title when titleId is set", () => {
    const html = renderToString(
      <SettingsGroup title="Profile" titleId="profile-heading">
        <SettingsRow label="Email" />
      </SettingsGroup>,
    );
    expect(html).toMatch(
      /^<section data-slot="settings-group" aria-labelledby="profile-heading" class="sprout-settings-group"><h2 id="profile-heading" class="sprout-settings-group-title">Profile<\/h2><div data-slot="settings-group-content" class="sprout-settings-group-content"><div data-slot="settings-row"/,
    );
  });

  it("leaves repeated groups unnamed and supports nested headings", () => {
    const html = renderToString(
      <SettingsGroup
        title="Supplier contracts"
        heading="h3"
        className="mt-4"
        id="grants"
      >
        {false}
        {null}
        <SettingsRow label="Read rows" />
      </SettingsGroup>,
    );
    expect(html).not.toContain("aria-labelledby");
    expect(html).toContain(
      '<h3 class="sprout-settings-group-title">Supplier contracts</h3>',
    );
    expect(html).toContain('class="sprout-settings-group mt-4"');
    expect(html).toContain('id="grants"');
    expect(settingsGroupHeadingNames).toEqual(["h2", "h3", "h4"]);
  });
});

describe("SettingsRow", () => {
  it("renders a label paragraph, description, and control area", () => {
    const html = renderToString(
      <SettingsRow label="Role" description="Your role in this workspace.">
        <span>admin</span>
      </SettingsRow>,
    );
    expect(html).toBe(
      '<div data-slot="settings-row" class="sprout-settings-row"><div class="sprout-settings-row-text"><p class="sprout-settings-row-label">Role</p><div class="sprout-settings-row-description">Your role in this workspace.</div></div><div data-slot="settings-row-control" class="sprout-settings-row-control"><span>admin</span></div></div>',
    );
  });

  it("uses a real label with htmlFor and accepts node descriptions", () => {
    const html = renderToString(
      <SettingsRow
        label="Name"
        htmlFor="account-name"
        description={<span id="account-name-help">Up to 80 characters.</span>}
      >
        <input id="account-name" aria-describedby="account-name-help" />
      </SettingsRow>,
    );
    expect(html).toContain(
      '<label for="account-name" class="sprout-settings-row-label">Name</label>',
    );
    expect(html).toContain(
      '<span id="account-name-help">Up to 80 characters.</span>',
    );
  });

  it("omits the description and control areas when they are empty", () => {
    const ref = createRef<HTMLDivElement>();
    const html = renderToString(
      <SettingsRow
        ref={ref}
        label={<label htmlFor="read">Read rows</label>}
        description={undefined}
      />,
    );
    expect(html).toBe(
      '<div data-slot="settings-row" class="sprout-settings-row"><div class="sprout-settings-row-text"><p class="sprout-settings-row-label"><label for="read">Read rows</label></p></div></div>',
    );
    expect(
      renderToString(<SettingsRow label="Role" description="" />),
    ).not.toContain("settings-row-description");
    expect(
      renderToString(<SettingsRow label="Role">{false}</SettingsRow>),
    ).not.toContain("settings-row-control");
  });

  it("is exported from the root and its own subpath with CSS", () => {
    expect(sprout.SettingsGroup).toBe(SettingsGroup);
    expect(sprout.SettingsRow).toBe(SettingsRow);
    const manifest = JSON.parse(
      readFileSync(new URL("package.json", root), "utf8"),
    );
    expect(manifest.exports["./settings-list"]).toEqual({
      types: "./dist/components/settings-list.d.ts",
      import: "./dist/components/settings-list.js",
    });
    expect(
      readFileSync(new URL("src/styles/index.css", root), "utf8"),
    ).toContain('@import "./settings-list.css";');
    const css = readFileSync(
      new URL("src/styles/settings-list.css", root),
      "utf8",
    );
    expect(css).toContain("container: sprout-settings / inline-size");
    expect(css).toContain("@container sprout-settings (min-width: 36rem)");
    expect(css).toContain("max-width: 60%");
    expect(css).toContain("--sprout-settings-row-inline: 1rem");
  });
});
