import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { ResultCard } from "../../packages/sprout/src/components/result-card.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("result card %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "grid",
        gap: 12,
        width: 480,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      <ResultCard
        title="Weekly team update"
        kind="Workflow"
        apps={[
          { brand: "slack", name: "Slack", actions: [] },
          { brand: "google-slides", name: "Google Slides", actions: [] },
          { brand: "github", name: "GitHub", actions: [] },
          { brand: "gmail", name: "Gmail", actions: [] },
        ]}
        status="Sent"
        state="success"
        action={{ label: "View slides", onClick: () => undefined }}
      />
      <ResultCard
        title="Quarterly plan"
        kind="Plan"
        apps={[{ brand: "google-docs", name: "Google Docs", actions: [] }]}
        status="Could not save"
        state="error"
        action={{ label: "Retry", onClick: () => undefined }}
      >
        <p>The document was locked by another editor.</p>
      </ResultCard>
      <div style={{ width: 300 }}>
        <ResultCard
          title="Customer table"
          kind="Table"
          apps={[{ brand: null, name: "Warehouse", actions: [] }]}
          status="Running"
          state="running"
          action={{ label: "Open table", onClick: () => undefined }}
        />
      </div>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`result-card-${theme}-${mode}`);
});
