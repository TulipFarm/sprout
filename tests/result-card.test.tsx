import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import * as sprout from "../packages/sprout/src/index.js";
import {
  ResultAppActions,
  ResultCard,
  resultAppActionStateNames,
  resultCardKindNames,
  resultCardStateNames,
  type ResultApp,
} from "../packages/sprout/src/components/result-card.js";

const slides: ResultApp = {
  brand: "google-slides",
  name: "Google Slides",
  actions: [
    { label: "Created the investor pitch presentation", state: "completed" },
  ],
};

function count(html: string, text: string) {
  return html.split(text).length - 1;
}

describe("ResultCard", () => {
  it("is exported from the package root", () => {
    expect(sprout.ResultCard).toBe(ResultCard);
    expect(sprout.ResultAppActions).toBe(ResultAppActions);
  });

  it("lists every Cloud kind, state, and app action state", () => {
    expect(resultCardKindNames).toEqual([
      "File",
      "Plan",
      "Workflow",
      "Action",
      "Calendar",
      "Table",
      "Activity",
      "Agent",
      "Skill",
    ]);
    expect(resultCardStateNames).toEqual([
      "default",
      "loading",
      "running",
      "disabled",
      "error",
      "success",
    ]);
    expect(resultAppActionStateNames).toEqual([
      "completed",
      "pending",
      "running",
      "failed",
      "unknown",
      "blocked",
      "cancelled",
      "skipped",
    ]);
  });

  it("renders a named section with title, kind, status, and action", () => {
    const html = renderToString(
      <ResultCard
        id="google-proposal:1"
        title="Investor pitch"
        kind="File"
        apps={[slides]}
        status="Saved in Google Slides"
        state="success"
        action={{ label: "View slides", onClick: () => {} }}
      />,
    );
    expect(html).toMatch(/^<section/);
    expect(html).toContain('id="google-proposal:1"');
    expect(html).toContain('aria-label="File: Investor pitch"');
    expect(html).toContain('aria-busy="false"');
    expect(html).toContain('data-state="success"');
    expect(html).toContain(
      '<h3 class="sprout-result-card-title">Investor pitch</h3>',
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('data-tone="success"');
    expect(html).toContain("Saved in Google Slides");
    expect(html).toContain("View slides");
    expect(html).toContain('aria-label="Google Slides actions"');
    expect(html).toContain('data-result-app="google-slides"');
    expect(html).toContain('role="group" aria-label="Apps used"');
  });

  it("merges repeated brands and folds apps after two into an overflow tile", () => {
    const html = renderToString(
      <ResultCard
        title="Weekly team update"
        kind="Workflow"
        status="Update posted"
        apps={[
          {
            brand: "slack",
            name: "Slack",
            actions: [{ label: "Posted", state: "completed" }],
          },
          {
            brand: "slack",
            name: "Slack",
            actions: [{ label: "Replied", state: "completed" }],
          },
          { brand: "google-sheets", name: "Google Sheets", actions: [] },
          { brand: "github", name: "GitHub", actions: [] },
          { brand: null, name: "Connected apps", actions: [] },
          { brand: "gmail", name: "Gmail", actions: [] },
        ]}
      />,
    );
    expect(count(html, 'data-result-app="slack"')).toBe(1);
    expect(html).toContain('data-result-app="google-sheets"');
    expect(html).toContain('data-result-overflow="3"');
    expect(html).toContain('aria-label="3 more apps"');
    expect(html).toContain("+<!-- -->3");
    expect(html).not.toContain('data-result-app="github"');
  });

  it("uses a plug for unbranded apps and the singular overflow label", () => {
    const html = renderToString(
      <ResultCard
        title="Recorded activity"
        kind="Activity"
        status="Actions in progress"
        state="running"
        apps={[
          { brand: null, name: "Connected apps", actions: [] },
          { brand: "gmail", name: "Gmail", actions: [] },
          { brand: null, name: "Atlassian", actions: [] },
        ]}
      />,
    );
    expect(html).toContain('data-result-app="connected-app"');
    expect(html).toContain('aria-label="1 more app"');
  });

  it("shows an unbranded app's icon in place of the plug", () => {
    const plug = 'class="reicon';
    const pipeline: ResultApp = {
      brand: null,
      name: "Pipeline",
      icon: <svg data-icon="table" />,
      actions: [],
    };
    const card = renderToString(
      <ResultCard title="Q4" kind="Table" apps={[pipeline]} status="Ready" />,
    );
    expect(card).toContain('data-icon="table"');
    expect(card).toContain("sprout-result-app-icon");
    expect(card).not.toContain(plug);
    const actions = renderToString(<ResultAppActions apps={[pipeline]} />);
    expect(actions).toContain('data-icon="table"');
    expect(actions).not.toContain(plug);

    const plain = { ...pipeline, icon: undefined };
    expect(
      renderToString(
        <ResultCard title="Q4" kind="Table" apps={[plain]} status="Ready" />,
      ),
    ).toContain(plug);
    expect(renderToString(<ResultAppActions apps={[plain]} />)).toContain(plug);
  });

  it("shows the icon tile only when no apps are listed", () => {
    const icon = <svg data-icon="table" />;
    const none = renderToString(
      <ResultCard
        title="Q4"
        kind="Table"
        apps={[]}
        icon={icon}
        status="12 rows returned."
        state="success"
      />,
    );
    expect(none).toContain('data-icon="table"');
    expect(none).toContain("sprout-result-card-icon");
    expect(none).not.toContain("Apps used");
    const withApps = renderToString(
      <ResultCard
        title="Q4"
        kind="Table"
        apps={[slides]}
        icon={icon}
        status="Ready"
      />,
    );
    expect(withApps).not.toContain('data-icon="table"');
    const bare = renderToString(
      <ResultCard title="Q4" kind="Table" apps={[]} status="Ready" />,
    );
    expect(bare).not.toContain("sprout-result-card-icon");
    expect(bare).not.toContain("<button");
  });

  it("marks busy states and disables the action while loading or disabled", () => {
    const action = { label: "Open in Canvas", onClick: () => {} };
    const loading = renderToString(
      <ResultCard
        title="T"
        kind="File"
        apps={[slides]}
        status="Checking"
        state="loading"
        action={action}
      />,
    );
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('data-slot="spinner"');
    expect(loading).toMatch(/<button[^>]*disabled=""[^>]*>Open in Canvas/);
    const running = renderToString(
      <ResultCard
        title="T"
        kind="File"
        apps={[slides]}
        status="Saving"
        state="running"
        action={action}
      />,
    );
    expect(running).toContain('aria-busy="true"');
    expect(running).not.toMatch(/<button[^>]*disabled=""[^>]*>Open in Canvas/);
    const disabled = renderToString(
      <ResultCard
        title="T"
        kind="File"
        apps={[slides]}
        status="Access unavailable"
        state="disabled"
        action={action}
      />,
    );
    expect(count(disabled, ' disabled=""')).toBe(2);
    const off = renderToString(
      <ResultCard
        title="T"
        kind="File"
        apps={[]}
        status="Ready"
        action={{ ...action, disabled: true }}
      />,
    );
    expect(off).toMatch(/<button[^>]*disabled=""[^>]*>Open in Canvas/);
  });

  it("tints error status and renders children below the header", () => {
    const html = renderToString(
      <ResultCard
        title="Board summary"
        kind="Plan"
        apps={[]}
        status="Stopped"
        state="error"
      >
        <p>3 of 4 tasks done</p>
      </ResultCard>,
    );
    expect(html).toContain('data-tone="error"');
    expect(html).toContain(
      '<div class="sprout-result-card-body"><p>3 of 4 tasks done</p></div>',
    );
  });
});

describe("ResultAppActions", () => {
  it("groups actions by app and spells out every non-completed state", () => {
    const html = renderToString(
      <ResultAppActions
        apps={[
          {
            brand: "google-slides",
            name: "Google Slides",
            actions: resultAppActionStateNames.map((state) => ({
              state,
              label: `${state} action`,
            })),
          },
          { brand: null, name: "Connected apps", actions: [] },
        ]}
      />,
    );
    expect(html).toContain('aria-label="Google Slides"');
    expect(html).toContain("<h4>Google Slides</h4>");
    expect(html).toContain("<h4>Connected apps</h4>");
    for (const prefix of [
      "Completed:",
      "Failed:",
      "Unconfirmed:",
      "Pending:",
      "In progress:",
      "Blocked:",
      "Cancelled:",
      "Skipped:",
    ])
      expect(html).toContain(prefix);
    expect(html).toContain('data-state="failed"');
    expect(html).toContain("No action details were recorded.");
  });

  it("hides app names when asked", () => {
    const html = renderToString(
      <ResultAppActions apps={[slides]} showAppNames={false} />,
    );
    expect(html).not.toContain("<h4>");
    expect(html).toContain("Created the investor pitch presentation");
  });
});
