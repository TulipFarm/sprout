import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "../../packages/sprout/src/components/input-group.js";
import { setTheme, settle, themes } from "./support.js";

const Search = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" />
  </svg>
);

it.each(themes)("input-group %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "grid",
        gap: 12,
        padding: 16,
        width: 360,
        background: "var(--sprout-canvas)",
      }}
    >
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput aria-label="Search" placeholder="Search chats" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>⌘ K</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup size="lg">
        <InputGroupAddon>
          <InputGroupText>sprout.dev/</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          aria-label="URL"
          defaultValue="Acme Corp"
          aria-invalid="true"
        />
      </InputGroup>
      <InputGroup>
        <InputGroupInput
          aria-label="Link"
          defaultValue="sprout.dev/j/4"
          disabled
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="sm" variant="secondary">
            Copy
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup variant="composer">
        <InputGroupTextarea
          aria-label="Message"
          defaultValue="Summarize the Q3 forecast."
        />
        <InputGroupAddon align="block-end">
          <InputGroupButton size="icon-sm" aria-label="Add a file">
            <Search />
          </InputGroupButton>
          <InputGroupButton size="icon-sm" variant="default" aria-label="Send">
            <Search />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`input-group-${theme}-${mode}`);
});
