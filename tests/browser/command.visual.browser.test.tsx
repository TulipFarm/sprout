import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "../../packages/sprout/src/components/command.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("command %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{ width: 360, padding: 16, background: "var(--sprout-canvas)" }}
    >
      <Command label="Search sample commands">
        <CommandInput placeholder="Search sample commands…" />
        <CommandList>
          <CommandEmpty>No matching commands.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              New draft
              <CommandShortcut>⌘ N</CommandShortcut>
            </CommandItem>
            <CommandItem>Open folder</CommandItem>
            <CommandItem disabled>Unavailable action</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem>Preferences</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>,
  );
  await screen.getByRole("combobox").click();
  await userEvent.keyboard("{ArrowDown}");
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`command-${theme}-${mode}`);
});
