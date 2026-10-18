import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  collapsibleContentVariantNames,
} from "../packages/sprout/src/components/collapsible.js";
import { Button } from "../packages/sprout/src/components/button.js";
import * as sprout from "../packages/sprout/src/index.js";

function tag(html: string, slot: string) {
  const match = html.match(
    new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`),
  );
  expect(match, slot).toBeTruthy();
  return match![0];
}

describe("Collapsible", () => {
  it("exports the three parts and every content variant Cloud uses", () => {
    expect(sprout.Collapsible).toBe(Collapsible);
    expect(sprout.CollapsibleTrigger).toBe(CollapsibleTrigger);
    expect(sprout.CollapsibleContent).toBe(CollapsibleContent);
    expect(collapsibleContentVariantNames).toEqual([
      "default",
      "sidebar",
      "card",
    ]);
  });

  it("renders closed by default with no content and a collapsed trigger", () => {
    const html = renderToString(
      <Collapsible>
        <CollapsibleTrigger>Approval details</CollapsibleTrigger>
        <CollapsibleContent>
          Only the listed changes are approved.
        </CollapsibleContent>
      </Collapsible>,
    );
    const root = tag(html, "collapsible");
    expect(root).toContain("sprout-collapsible");
    expect(root).toContain("data-closed");
    const trigger = tag(html, "collapsible-trigger");
    expect(trigger).toMatch(/^<button/);
    expect(trigger).toContain('aria-expanded="false"');
    expect(trigger).toContain("sprout-collapsible-trigger");
    expect(html).not.toContain("Only the listed changes");
  });

  it("opens with defaultOpen and controlled open", () => {
    for (const props of [
      { defaultOpen: true },
      { open: true, onOpenChange: () => {} },
    ]) {
      const html = renderToString(
        <Collapsible {...props}>
          <CollapsibleTrigger>Details</CollapsibleTrigger>
          <CollapsibleContent>Read-only configuration.</CollapsibleContent>
        </Collapsible>,
      );
      expect(tag(html, "collapsible")).toContain("data-open");
      expect(tag(html, "collapsible-trigger")).toContain(
        'aria-expanded="true"',
      );
      expect(tag(html, "collapsible-trigger")).toContain("data-panel-open");
      const content = tag(html, "collapsible-content");
      expect(content).toContain('data-variant="default"');
      expect(content).toContain("sprout-collapsible-content-default");
      expect(html).toContain("Read-only configuration.");
    }
  });

  it("keeps closed content mounted and hidden with keepMounted", () => {
    const html = renderToString(
      <Collapsible>
        <CollapsibleTrigger>Knowledge</CollapsibleTrigger>
        <CollapsibleContent keepMounted>2 Drive folders</CollapsibleContent>
      </Collapsible>,
    );
    expect(tag(html, "collapsible-content")).toContain("hidden");
    expect(html).toContain("2 Drive folders");
  });

  it("applies sidebar and card motion variants and merges classes", () => {
    for (const variant of ["sidebar", "card"] as const) {
      const html = renderToString(
        <Collapsible defaultOpen>
          <CollapsibleTrigger>Recent chats</CollapsibleTrigger>
          <CollapsibleContent variant={variant} className="extra">
            Q3 launch plan
          </CollapsibleContent>
        </Collapsible>,
      );
      const content = tag(html, "collapsible-content");
      expect(content).toContain(`sprout-collapsible-content-${variant}`);
      expect(content).toContain(`data-variant="${variant}"`);
      expect(content).toContain("extra");
    }
  });

  it("accepts className functions, data-slot overrides, and region roles", () => {
    const html = renderToString(
      <Collapsible
        open
        data-slot="activity-panel"
        role="region"
        aria-label="Chat activity"
        className={(state) => (state.open ? "is-open" : "is-closed")}
      >
        <CollapsibleTrigger aria-label="Worked">Worked</CollapsibleTrigger>
        <CollapsibleContent
          className={(state) => (state.open ? "panel-open" : "")}
        >
          Timeline
        </CollapsibleContent>
      </Collapsible>,
    );
    const root = tag(html, "activity-panel");
    expect(root).toContain('role="region"');
    expect(root).toContain('aria-label="Chat activity"');
    expect(root).toContain("sprout-collapsible is-open");
    expect(tag(html, "collapsible-content")).toContain("panel-open");
  });

  it("renders a Sprout Button trigger and disables it with the root", () => {
    const html = renderToString(
      <Collapsible disabled>
        <CollapsibleTrigger
          aria-describedby="reason"
          render={<Button variant="outline" />}
        >
          Show unavailable details
        </CollapsibleTrigger>
        <CollapsibleContent>Unavailable</CollapsibleContent>
      </Collapsible>,
    );
    const trigger = tag(html, "collapsible-trigger");
    expect(trigger).toContain("sprout-button-variant-outline");
    expect(trigger).toContain("sprout-collapsible-trigger");
    expect(trigger).toContain('aria-describedby="reason"');
    expect(trigger).toMatch(/\sdisabled(=""|\s|>)/);
    expect(trigger).toContain("data-disabled");
  });

  it("lets content render before the trigger", () => {
    const html = renderToString(
      <Collapsible defaultOpen>
        <CollapsibleContent>More tasks</CollapsibleContent>
        <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
          Fewer tasks
        </CollapsibleTrigger>
      </Collapsible>,
    );
    expect(html.indexOf("More tasks")).toBeLessThan(
      html.indexOf("Fewer tasks"),
    );
    expect(tag(html, "collapsible-trigger")).toContain("sprout-button-size-sm");
  });
});
