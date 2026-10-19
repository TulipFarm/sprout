import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { SearchField } from "../../packages/sprout/src/components/search-field.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("search field %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "grid",
        gap: 12,
        width: 360,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      <SearchField label="Search models" value="" onChange={() => undefined} />
      <SearchField
        label="Search Google Drive"
        value="Board deck"
        onChange={() => undefined}
      />
      <fieldset disabled style={{ border: 0, padding: 0, margin: 0 }}>
        <SearchField
          label="Search apps"
          value="Slack"
          onChange={() => undefined}
        />
      </fieldset>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`search-field-${theme}-${mode}`);
});
