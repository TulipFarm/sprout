import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { Button } from "../../packages/sprout/src/components/button.js";
import {
  CanvasPanel,
  CanvasSection,
  CanvasToggle,
  ChatSplit,
  type CanvasTab,
} from "../../packages/sprout/src/components/canvas.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const Icon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <rect x="2" y="2" width="12" height="12" fill="currentColor" />
  </svg>
);

const allTabs: CanvasTab[] = [
  { id: "customers", title: "Customers", icon: Icon },
  { id: "calendar", title: "Calendar events", icon: Icon },
  { id: "pipeline", title: "Weekly pipeline", busy: true },
  { id: "checklist", title: "Launch checklist", icon: Icon },
];

let layouts = 0;

/** A chat with the canvas beside it, sized like a page's main column. */
function Playground({ width = "100%" }: { width?: number | string }) {
  const [open, setOpen] = useState(true);
  const [tabs, setTabs] = useState(allTabs);
  const [activeId, setActiveId] = useState<string | null>("customers");
  const [layoutId] = useState(() => `canvas-test-${layouts++}`);
  const active = tabs.find((tab) => tab.id === activeId);
  return (
    <div style={{ width, height: 560, display: "flex" }}>
      <ChatSplit
        open={open}
        onOpenChange={setOpen}
        layoutId={layoutId}
        chat={
          <div style={{ padding: 12 }}>
            <CanvasToggle
              open={open}
              count={tabs.length}
              onToggle={() => setOpen(!open)}
            />
            <p>Here are your customers.</p>
          </div>
        }
        canvas={
          <CanvasPanel
            tabs={tabs}
            activeId={activeId}
            onSelect={setActiveId}
            onCloseTab={(id) => {
              const next = tabs.filter((tab) => tab.id !== id);
              setTabs(next);
              if (id === activeId) setActiveId(next[0]?.id ?? null);
            }}
            onClose={() => setOpen(false)}
          >
            <CanvasSection
              title={active?.title ?? "Nothing open"}
              meta="Updated 2 minutes ago · 1,284 rows from the production workspace"
              actions={
                <>
                  <Button variant="outline" size="sm">
                    Export
                  </Button>
                  <Button size="sm">Open in sheet</Button>
                </>
              }
            >
              <p>Acme, Globex, and Initech renewed this quarter.</p>
            </CanvasSection>
          </CanvasPanel>
        }
      />
    </div>
  );
}

function colorOf(token: string) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

/** Tabs from the top of the page, whatever the previous test left focused. */
async function tabFromStart() {
  const start = document.createElement("button");
  document.body.prepend(start);
  start.focus();
  await userEvent.tab();
  start.remove();
}

const tab = (name: string) => page.getByRole("tab", { name, exact: true });
const css = (node: Element) => getComputedStyle(node);
const split = () => document.querySelector('[data-slot="chat-split"]')!;

describe("Canvas in a real browser", () => {
  it.each(themes)("%s %s passes axe beside the chat", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Playground />);
    await settle();
    expect(split().getAttribute("data-layout")).toBe("split");
    expect(await axeViolations(screen.container)).toEqual([]);
    const customers = tab("Customers").element();
    expect(css(customers).backgroundColor).toBe(colorOf("--sprout-hover"));
    expect(css(customers).color).toBe(colorOf("--sprout-text"));
    expect(css(tab("Calendar events").element()).color).toBe(
      colorOf("--sprout-muted"),
    );
  });

  it("keeps the header and tabs on their compact rhythm", async () => {
    await render(<Playground />);
    await settle();
    const header = document.querySelector(".sprout-canvas-header")!;
    expect(header.getBoundingClientRect().height).toBe(44);
    const customers = tab("Customers").element();
    expect(customers.getBoundingClientRect().height).toBe(32);
    const close = page.getByRole("button", { name: "Close Customers" });
    expect(close.element().getBoundingClientRect().width).toBe(28);
    expect(
      Math.abs(
        close.element().getBoundingClientRect().left -
          customers.getBoundingClientRect().right,
      ),
    ).toBeLessThan(1);
    expect(css(close.element().querySelector("svg")!).opacity).toBe("1");
    const idle = page.getByRole("button", { name: "Close Calendar events" });
    expect(css(idle.element().querySelector("svg")!).opacity).toBe("0");
    await tab("Calendar events").hover();
    await settle();
    expect(css(idle.element().querySelector("svg")!).opacity).toBe("1");
  });

  it("tabs move with arrows, Home and End, and close with Delete", async () => {
    await render(<Playground />);
    const customers = tab("Customers");
    await tabFromStart();
    await expect
      .element(page.getByRole("button", { name: "Hide canvas" }))
      .toHaveFocus();
    await userEvent.tab();
    await expect
      .element(page.getByRole("separator", { name: "Resize canvas" }))
      .toHaveFocus();
    await userEvent.tab();
    await expect.element(customers).toHaveFocus();
    expect(css(customers.element()).outlineStyle).toBe("solid");
    expect(css(customers.element()).outlineWidth).toBe("1px");
    await userEvent.keyboard("{ArrowRight}");
    await expect.element(tab("Calendar events")).toHaveFocus();
    await expect
      .element(tab("Calendar events"))
      .toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{End}");
    await expect.element(tab("Launch checklist")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect.element(customers).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    await expect.element(tab("Launch checklist")).toHaveFocus();
    await userEvent.keyboard("{Home}");
    await expect.element(customers).toHaveFocus();

    // The selected tab's close button is the only one in the tab order.
    await userEvent.tab();
    const close = page.getByRole("button", { name: "Close Customers" });
    await expect.element(close).toHaveFocus();
    expect(css(close.element()).outlineStyle).toBe("solid");
    await userEvent.tab({ shift: true });
    await userEvent.keyboard("{Delete}");
    await expect.element(customers).not.toBeInTheDocument();
    await expect.element(tab("Calendar events")).toHaveFocus();
    await expect
      .element(page.getByRole("button", { name: "Hide canvas" }))
      .toHaveAttribute("aria-pressed", "true");
    await userEvent.keyboard("{Escape}");
    await expect
      .element(page.getByRole("region", { name: "Canvas" }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "Show canvas, 3 open" }))
      .toHaveAttribute("aria-pressed", "false");
  });

  it("the resize handle widens the canvas from the keyboard", async () => {
    await render(<Playground />);
    await settle();
    const canvas = page.getByRole("region", { name: "Canvas" });
    const before = canvas.element().getBoundingClientRect().width;
    const handle = page.getByRole("separator", { name: "Resize canvas" });
    (handle.element() as HTMLElement).focus();
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    await expect
      .poll(() => canvas.element().getBoundingClientRect().width)
      .toBeGreaterThan(before);
  });

  it("a split narrower than 720px opens the canvas as a sheet", async () => {
    await render(<Playground width={600} />);
    await expect.poll(() => split().getAttribute("data-layout")).toBe("sheet");
    const sheet = page.getByRole("dialog", { name: "Canvas" });
    await expect.element(sheet).toBeVisible();
    await expect
      .element(sheet.getByRole("tab", { name: "Customers" }))
      .toHaveAttribute("aria-selected", "true");
    await expect
      .element(sheet.getByRole("button", { name: "Back to chat" }))
      .toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(sheet).not.toBeInTheDocument();
  });

  it.each(themes)(
    "%s %s on a 390px phone uses the sheet and fits",
    async (theme, mode) => {
      setTheme(theme, mode);
      await page.viewport(390, 760);
      const screen = await render(<Playground />);
      await expect
        .poll(() => split().getAttribute("data-layout"))
        .toBe("sheet");
      const sheet = page.getByRole("dialog", { name: "Canvas" });
      await expect.element(sheet).toBeVisible();
      await expect
        .element(sheet.getByRole("button", { name: "Close canvas" }))
        .not.toBeInTheDocument();
      await settle();
      const node = sheet.element();
      expect(node.scrollWidth).toBeLessThanOrEqual(node.clientWidth + 1);
      for (const section of node.querySelectorAll(
        '[data-slot="canvas-section"]',
      ))
        expect(section.scrollWidth).toBeLessThanOrEqual(
          section.clientWidth + 1,
        );
      expect(await axeViolations(document.body)).toEqual([]);
      await sheet.getByRole("button", { name: "Back to chat" }).click();
      await expect.element(sheet).not.toBeInTheDocument();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      const label = screen.container.querySelector(
        ".sprout-canvas-toggle-label",
      )!;
      expect(label.getBoundingClientRect().width).toBeLessThanOrEqual(1);
    },
  );

  it("reduced motion removes the tab transitions", async () => {
    await render(<Playground />);
    const customers = tab("Customers").element();
    expect(css(customers).transitionDuration).toMatch(/^0\.12s/);
    await emulate({ reducedMotion: true });
    expect(css(customers).transitionDuration).toBe("0s");
    const close = page
      .getByRole("button", { name: "Close Customers" })
      .element();
    expect(css(close.querySelector("svg")!).transitionDuration).toBe("0s");
  });
});
