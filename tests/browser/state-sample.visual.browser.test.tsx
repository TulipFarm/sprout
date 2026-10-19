import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
  SampleBar,
  SampleIconTile,
  SampleList,
  SampleMark,
  SampleTable,
  SampleText,
  SampleWindow,
} from "../../packages/sprout/src/components/state-sample.js";
import { setTheme, settle, themes } from "./support.js";

const Glyph = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={size} height={size}>
    <rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" />
  </svg>
);

it.each(themes)("state-sample %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "grid",
        gap: 16,
        padding: 16,
        width: 520,
        background: "var(--sprout-canvas)",
      }}
    >
      <SampleWindow
        icon={Glyph}
        trail={["Workspace", "Workflows"]}
        tabs={["All", "Active"]}
      >
        <SampleTable
          columns={[
            { label: "Workflow", size: "wide" },
            { label: "Trigger" },
            { label: "Status", size: "narrow" },
          ]}
          rows={[
            [<SampleBar width="lg" />, <SampleBar />, <SampleBar width="sm" />],
            [
              <SampleText tone="strong">Restock tulips</SampleText>,
              <SampleText tone="mono">cron 0 9 * * 1</SampleText>,
              <SampleText tone="link">Active</SampleText>,
            ],
          ]}
        />
      </SampleWindow>
      <SampleWindow icon={Glyph} trail={["Chats"]}>
        <SampleList
          items={[
            {
              leading: <SampleIconTile icon={Glyph} />,
              title: "Spring planting plan",
              detail: "Updated 2 hours ago",
              trailing: <SampleMark tone="teal" size="md" />,
            },
            { leading: <SampleMark tone="violet" />, title: "Supplier sync" },
          ]}
        />
      </SampleWindow>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`state-sample-${theme}-${mode}`);
});
