import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  MentionGroup,
  MentionList,
  MentionOption,
  MentionStatus,
  mentionStatusToneNames,
} from "../packages/sprout/src/components/mention-list.js";
import * as sprout from "../packages/sprout/src/index.js";

function tag(html: string, slot: string) {
  const match = html.match(
    new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`),
  );
  expect(match, slot).toBeTruthy();
  return match![0];
}

const noop = () => undefined;

describe("MentionList", () => {
  it("is exported from the package root", () => {
    expect(sprout.MentionList).toBe(MentionList);
    expect(sprout.MentionOption).toBe(MentionOption);
    expect(sprout.MentionGroup).toBe(MentionGroup);
    expect(sprout.MentionStatus).toBe(MentionStatus);
    expect(mentionStatusToneNames).toEqual(["loading", "empty", "error"]);
  });

  it("renders a named listbox, status rows, and a live announcement", () => {
    const html = renderToString(
      <MentionList
        id="files"
        label="Files you can add"
        status={
          <MentionStatus tone="loading">Searching Google Drive…</MentionStatus>
        }
        announcement="1 file you can add. Use Up and Down to choose, Enter to add, Escape to close."
      >
        <MentionOption
          id="files-option-0"
          active
          onSelect={noop}
          media={<svg />}
          title="Launch brief.pdf"
          description="1.2 MB"
        />
      </MentionList>,
    );
    expect(tag(html, "mention-list")).toContain("sprout-mention-list");
    expect(html).toContain(
      '<ul id="files" role="listbox" aria-label="Files you can add"',
    );
    expect(html).toMatch(
      /<p role="status" class="sprout-mention-list-announcement">1 file you can add\./,
    );
    expect(html.indexOf('role="listbox"')).toBeLessThan(
      html.indexOf('data-slot="mention-status"'),
    );
  });

  it("marks the active option and keeps media and description optional", () => {
    const html = renderToString(
      <ul>
        <MentionOption
          id="a"
          active
          onSelect={noop}
          media={<svg data-testid="icon" />}
          title="Q3 revenue forecast.xlsx"
          description="48 KB"
        />
        <MentionOption
          id="b"
          active={false}
          onSelect={noop}
          title="Retro notes"
        />
      </ul>,
    );
    const [first, second] = html.match(
      /<li[^>]*data-slot="mention-option"[^>]*>/g,
    )!;
    expect(first).toContain('role="option"');
    expect(first).toContain('aria-selected="true"');
    expect(first).toContain("data-active");
    expect(second).toContain('aria-selected="false"');
    expect(second).not.toContain("data-active");
    expect(html).toContain('title="Q3 revenue forecast.xlsx"');
    expect(html).toContain("48 KB");
    expect(html.match(/data-slot="mention-option-media"/g)).toHaveLength(1);
    expect(html.match(/mention-option-description/g)).toHaveLength(1);
  });

  it("groups options under a hidden label that names the group", () => {
    const html = renderToString(
      <MentionList id="m" label="Files you can add">
        <MentionGroup label="Files">
          <MentionOption
            id="m-0"
            active
            onSelect={noop}
            title="Launch brief.pdf"
          />
        </MentionGroup>
        <MentionGroup label="Google Drive">
          <MentionOption
            id="m-1"
            active={false}
            onSelect={noop}
            title="Roadmap 2026"
          />
        </MentionGroup>
      </MentionList>,
    );
    const groups = html.match(
      /<li role="presentation" data-slot="mention-group"/g,
    )!;
    expect(groups).toHaveLength(2);
    const label = html.match(
      /<span id="([^"]+)" aria-hidden="true" class="sprout-mention-group-label">Files<\/span>/,
    )!;
    expect(html).toContain(`<ul role="group" aria-labelledby="${label[1]}"`);
  });

  it("renders each status tone with the right role, spinner, and optional action", () => {
    const loading = renderToString(
      <MentionStatus tone="loading">Loading skills…</MentionStatus>,
    );
    expect(tag(loading, "mention-status")).toContain('role="status"');
    expect(tag(loading, "mention-status")).toContain('data-tone="loading"');
    expect(loading).toContain('data-slot="spinner"');
    expect(loading).toContain('aria-hidden="true"');

    const empty = renderToString(
      <MentionStatus tone="empty">No reviewed skills match.</MentionStatus>,
    );
    expect(tag(empty, "mention-status")).toContain('role="status"');
    expect(empty).not.toContain("spinner");
    expect(empty).not.toContain("<button");

    const error = renderToString(
      <MentionStatus
        tone="error"
        action={{ label: "Retry skills", onAction: noop }}
      >
        Couldn’t load skills. Check your connection, then retry.
      </MentionStatus>,
    );
    expect(tag(error, "mention-status")).toContain('role="alert"');
    const button = error.match(/<button[^>]*>/)![0];
    expect(button).toContain("sprout-button-variant-outline");
    expect(button).toContain("sprout-button-size-sm");
    expect(error).toContain("Retry skills");

    const blocked = renderToString(
      <MentionStatus tone="error">
        Google Drive needs reconnecting.
      </MentionStatus>,
    );
    expect(tag(blocked, "mention-status")).toContain('role="alert"');
    expect(blocked).not.toContain("<button");
  });

  it("stacks several status rows and renders a status-only panel", () => {
    const html = renderToString(
      <MentionList
        id="both"
        label="Files you can add"
        status={
          <>
            <MentionStatus
              tone="error"
              action={{ label: "Retry search", onAction: noop }}
            >
              Couldn’t search Files.
            </MentionStatus>
            <MentionStatus tone="error">
              Couldn’t search Google Drive.
            </MentionStatus>
          </>
        }
      />,
    );
    expect(html.match(/data-slot="mention-status"/g)).toHaveLength(2);
    expect(html).toContain(
      '<ul id="both" role="listbox" aria-label="Files you can add" class="sprout-mention-list-options"></ul>',
    );
    expect(html).toMatch(
      /<p role="status" class="sprout-mention-list-announcement"><\/p>/,
    );
  });

  it("passes className and extra attributes to the panel and options", () => {
    const html = renderToString(
      <MentionList
        id="x"
        label="People"
        className="custom-panel"
        data-testid="panel"
      >
        <MentionOption
          id="x-0"
          active={false}
          onSelect={noop}
          title="Alex Meadow"
          className="custom-option"
        />
      </MentionList>,
    );
    expect(tag(html, "mention-list")).toContain(
      "sprout-mention-list custom-panel",
    );
    expect(tag(html, "mention-list")).toContain('data-testid="panel"');
    expect(tag(html, "mention-option")).toContain(
      "sprout-mention-option custom-option",
    );
  });
});
