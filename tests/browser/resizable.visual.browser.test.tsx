import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../../packages/sprout/src/components/resizable.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("resizable %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{ padding: 16, background: "var(--sprout-canvas)", width: 360 }}
    >
      <div
        style={{
          height: 180,
          border: "1px solid var(--sprout-line)",
          borderRadius: 8,
          background: "var(--sprout-surface)",
        }}
      >
        <ResizablePanelGroup>
          <ResizablePanel id="runs" defaultSize="40%" style={{ padding: 12 }}>
            Runs
          </ResizablePanel>
          <ResizableHandle withHandle aria-label="Resize runs" />
          <ResizablePanel id="detail">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel
                id="top"
                defaultSize="50%"
                style={{ padding: 12 }}
              >
                Prompt
              </ResizablePanel>
              <ResizableHandle aria-label="Resize prompt" />
              <ResizablePanel id="bottom" style={{ padding: 12 }}>
                Output
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`resizable-${theme}-${mode}`);
});
