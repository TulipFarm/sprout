import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
import {
  CanvasPanel,
  CanvasSection,
  CanvasToggle,
} from "../../packages/sprout/src/components/canvas.js";
import { setTheme, settle, themes } from "./support.js";

const Icon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <rect x="2" y="2" width="12" height="12" fill="currentColor" />
  </svg>
);

it.each(themes)("canvas %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{ display: "flex", gap: 16, padding: 16, width: 760 }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <CanvasToggle open={false} count={3} onToggle={() => {}} />
        <CanvasToggle open count={3} onToggle={() => {}} />
      </div>
      <div style={{ width: 560, height: 300, display: "flex" }}>
        <CanvasPanel
          tabs={[
            { id: "customers", title: "Customers", icon: Icon },
            { id: "calendar", title: "Calendar events", icon: Icon },
            { id: "checklist", title: "Launch checklist" },
          ]}
          activeId="customers"
          onSelect={() => {}}
          onCloseTab={() => {}}
          onClose={() => {}}
        >
          <CanvasSection
            title="Customers"
            meta="Updated 2 minutes ago · 1,284 rows"
            actions={
              <>
                <Button variant="outline" size="sm">
                  Export
                </Button>
                <Button size="sm">Open</Button>
              </>
            }
          >
            <p style={{ margin: 0 }}>
              Acme, Globex, and Initech renewed this quarter.
            </p>
          </CanvasSection>
        </CanvasPanel>
      </div>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`canvas-${theme}-${mode}`);
});
