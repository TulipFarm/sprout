import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  tabsListVariantNames,
  tabsListVariants,
} from "../packages/sprout/src/components/tabs.js";
import * as sprout from "../packages/sprout/src/index.js";

function tag(html: string, slot: string, nth = 0) {
  const matches = [
    ...html.matchAll(
      new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`, "g"),
    ),
  ];
  expect(matches[nth], `${slot} #${nth}`).toBeTruthy();
  return matches[nth]![0];
}

describe("Tabs", () => {
  it("exports the Cloud parts and every list variant", () => {
    expect(sprout.Tabs).toBe(Tabs);
    expect(sprout.TabsList).toBe(TabsList);
    expect(sprout.TabsTrigger).toBe(TabsTrigger);
    expect(sprout.TabsContent).toBe(TabsContent);
    expect(sprout.tabsListVariants).toBe(tabsListVariants);
    expect(tabsListVariantNames).toEqual(["default", "line", "steps"]);
  });

  it("returns list classes for each variant and merges custom classes", () => {
    expect(tabsListVariants()).toBe(
      "sprout-tabs-list sprout-tabs-list-default",
    );
    for (const variant of tabsListVariantNames) {
      expect(tabsListVariants({ variant })).toContain(
        `sprout-tabs-list-${variant}`,
      );
    }
    expect(tabsListVariants({ variant: "line", className: "w-full" })).toBe(
      "sprout-tabs-list sprout-tabs-list-line w-full",
    );
  });

  it("renders roles, slots, and the default variant with an uncontrolled value", () => {
    const html = renderToString(
      <Tabs defaultValue="members">
        <TabsList aria-label="Members settings">
          <TabsTrigger value="members">Members (12)</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>
        <TabsContent value="members">Member rows</TabsContent>
        <TabsContent value="invitations">Pending invitations</TabsContent>
      </Tabs>,
    );
    const root = tag(html, "tabs");
    expect(root).toContain("sprout-tabs");
    expect(root).toContain('data-orientation="horizontal"');
    const list = tag(html, "tabs-list");
    expect(list).toContain('role="tablist"');
    expect(list).toContain('data-variant="default"');
    expect(list).toContain('aria-label="Members settings"');
    const first = tag(html, "tabs-trigger", 0);
    expect(first).toMatch(/^<button/);
    expect(first).toContain('role="tab"');
    expect(first).toContain('aria-selected="true"');
    expect(first).toContain("data-active");
    expect(tag(html, "tabs-trigger", 1)).toContain('aria-selected="false"');
    expect(tag(html, "tabs-content", 0)).toContain('role="tabpanel"');
    expect(html).toContain("Member rows");
    expect(html).not.toContain("Pending invitations");
  });

  it("keeps inactive panels mounted and hidden with keepMounted", () => {
    const html = renderToString(
      <Tabs value="summary" onValueChange={() => {}}>
        <TabsList variant="line" aria-label="Agent views">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="test">Test chat</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" keepMounted>
          Draft summary
        </TabsContent>
        <TabsContent value="test" keepMounted>
          Test messages
        </TabsContent>
      </Tabs>,
    );
    expect(tag(html, "tabs-list")).toContain("sprout-tabs-list-line");
    expect(html).toContain("Test messages");
    expect(tag(html, "tabs-content", 1)).toContain("hidden");
  });

  it("supports steps, disabled triggers, vertical orientation, and function classes", () => {
    const html = renderToString(
      <Tabs
        defaultValue="one"
        orientation="vertical"
        className={() => "custom-root"}
      >
        <TabsList variant="steps" className={() => "custom-list"}>
          <TabsTrigger
            value="one"
            className={(state) => (state.active ? "is-on" : "is-off")}
          >
            First
          </TabsTrigger>
          <TabsTrigger value="two" disabled>
            Disabled
          </TabsTrigger>
        </TabsList>
        <TabsContent value="one" className="custom-panel">
          First panel
        </TabsContent>
      </Tabs>,
    );
    const root = tag(html, "tabs");
    expect(root).toContain('data-orientation="vertical"');
    expect(root).toContain("custom-root");
    const list = tag(html, "tabs-list");
    expect(list).toContain("sprout-tabs-list-steps");
    expect(list).toContain("custom-list");
    expect(list).toContain('aria-orientation="vertical"');
    expect(tag(html, "tabs-trigger", 0)).toContain("is-on");
    const disabled = tag(html, "tabs-trigger", 1);
    expect(disabled).toContain("data-disabled");
    expect(tag(html, "tabs-content")).toContain("custom-panel");
  });
});
