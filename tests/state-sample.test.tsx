import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  SampleBar,
  SampleIconTile,
  SampleList,
  SampleMark,
  SampleTable,
  SampleText,
  SampleWindow,
  sampleBarWidthNames,
  sampleColumnSizeNames,
  sampleMarkSizeNames,
  sampleMarkToneNames,
  sampleTextToneNames,
} from "../packages/sprout/src/components/state-sample.js";

function Glyph({ size }: { size?: number }) {
  return <svg data-glyph={size} />;
}

describe("State sample", () => {
  it("lists every Cloud variant name", () => {
    expect(sampleColumnSizeNames).toEqual(["wide", "default", "narrow"]);
    expect(sampleTextToneNames).toEqual([
      "default",
      "strong",
      "muted",
      "link",
      "mono",
    ]);
    expect(sampleMarkToneNames).toEqual([
      "red",
      "orange",
      "green",
      "blue",
      "violet",
      "teal",
    ]);
    expect(sampleMarkSizeNames).toEqual(["sm", "md"]);
    expect(sampleBarWidthNames).toEqual(["sm", "md", "lg"]);
  });

  it("draws the window bar, current crumb, label, and first selected tab", () => {
    const html = renderToString(
      <SampleWindow
        icon={Glyph}
        trail={["Settings", "Members", "Invitations"]}
        tabs={["Sales", "Finance", "Support"]}
        className="extra"
        data-testid="win"
      >
        <p>Body</p>
      </SampleWindow>,
    );
    expect(html).toMatch(/^<div data-slot="state-sample"/);
    expect(html).toContain('class="sprout-state-sample extra"');
    expect(html).toContain('data-testid="win"');
    expect(html).toContain('data-glyph="14"');
    expect(html.match(/sprout-state-sample-crumb/g)).toHaveLength(3);
    expect(html).toContain(
      '<span class="sprout-state-sample-crumb" data-current="">Invitations</span>',
    );
    expect(html.match(/aria-hidden="true">\/</g)).toHaveLength(2);
    expect(html).toContain(
      '<span class="sprout-state-sample-label">Example</span>',
    );
    expect(html.match(/sprout-state-sample-tab"/g)).toHaveLength(3);
    expect(html).toContain(
      '<span class="sprout-state-sample-tab" data-selected="">Sales</span>',
    );
    expect(html).toContain("<p>Body</p>");
  });

  it("omits the tab row without tabs and allows a custom label", () => {
    const html = renderToString(
      <SampleWindow icon={Glyph} trail={["Chats"]} label="Preview">
        x
      </SampleWindow>,
    );
    expect(html).not.toContain("sprout-state-sample-tabs");
    expect(html).toContain(">Preview</span>");
    expect(html).not.toContain(">/</span>");
  });

  it("sizes table cells from their column, defaulting to default", () => {
    const html = renderToString(
      <SampleTable
        columns={[
          { label: "Table", size: "wide" },
          { label: "Trigger" },
          { label: "Rows", size: "narrow" },
        ]}
        rows={[
          [
            <>
              <SampleMark tone="blue" />
              <SampleText tone="strong">Customers</SampleText>
            </>,
            "Deal won",
            <SampleText>1,248</SampleText>,
          ],
        ]}
      />,
    );
    expect(html.match(/data-size="wide"/g)).toHaveLength(2);
    expect(html.match(/data-size="default"/g)).toHaveLength(2);
    expect(html.match(/data-size="narrow"/g)).toHaveLength(2);
    expect(html.match(/sprout-state-sample-check/g)).toHaveLength(2);
    expect(html).toContain("Deal won");
  });

  it("renders list items with and without optional slots", () => {
    const html = renderToString(
      <SampleList
        items={[
          {
            leading: <SampleIconTile icon={Glyph} />,
            title: "Slack",
            detail: "Agents reply in #sales",
            trailing: <span>Connected</span>,
          },
          { title: "Spring launch" },
        ]}
      />,
    );
    expect(html.match(/sprout-state-sample-item/g)).toHaveLength(2);
    expect(html.match(/sprout-state-sample-leading/g)).toHaveLength(1);
    expect(html.match(/sprout-state-sample-trailing/g)).toHaveLength(1);
    expect(html.match(/sprout-state-sample-detail/g)).toHaveLength(1);
    expect(html).toContain(
      'data-slot="state-sample-icon-tile" aria-hidden="true"',
    );
  });

  it("maps primitive props to data attributes", () => {
    expect(renderToString(<SampleText>1</SampleText>)).toContain(
      'data-tone="default"',
    );
    expect(renderToString(<SampleText tone="link">a</SampleText>)).toContain(
      'data-tone="link"',
    );
    const mark = renderToString(<SampleMark tone="teal" />);
    expect(mark).toContain('data-tone="teal"');
    expect(mark).toContain('data-size="sm"');
    expect(mark).toContain('aria-hidden="true"');
    expect(renderToString(<SampleMark tone="red" size="md" />)).toContain(
      'data-size="md"',
    );
    expect(renderToString(<SampleBar />)).toContain('data-width="md"');
    expect(renderToString(<SampleBar width="lg" />)).toContain(
      'data-width="lg"',
    );
  });
});
