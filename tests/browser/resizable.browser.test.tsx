import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type ResizableLayout,
  type ResizableOrientation,
} from "../../packages/sprout/src/components/resizable.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

function Split({
  orientation = "horizontal",
  withHandle = false,
}: {
  orientation?: ResizableOrientation;
  withHandle?: boolean;
}) {
  const [layout, setLayout] = useState<ResizableLayout>({});
  const horizontal = orientation === "horizontal";
  return (
    <div style={{ padding: 16 }}>
      <div
        data-testid={`${orientation}-frame`}
        style={{
          width: horizontal ? 600 : 300,
          height: horizontal ? 160 : 300,
          border: "1px solid var(--sprout-line)",
        }}
      >
        <ResizablePanelGroup
          orientation={orientation}
          onLayoutChange={setLayout}
        >
          <ResizablePanel
            id={`${orientation}-a`}
            defaultSize="40%"
            minSize="20%"
            maxSize="80%"
          >
            {horizontal ? "Runs" : "Prompt"}
          </ResizablePanel>
          <ResizableHandle
            withHandle={withHandle}
            aria-label={`Resize ${orientation} panels`}
          />
          <ResizablePanel id={`${orientation}-b`}>Details</ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <p data-testid={`${orientation}-sizes`}>
        {Object.values(layout)
          .map((size) => `${Math.round(size)}%`)
          .join(" · ")}
      </p>
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

const separator = (orientation: ResizableOrientation = "horizontal") =>
  page.getByRole("separator", { name: `Resize ${orientation} panels` });
const width = (node: Element) => node.getBoundingClientRect().width;

describe("Resizable in a real browser", () => {
  it.each(themes)(
    "%s %s draws a 1px line and passes axe",
    async (theme, mode) => {
      setTheme(theme, mode);
      const screen = await render(
        <>
          <Split withHandle />
          <Split orientation="vertical" />
        </>,
      );
      await settle();
      const line = getComputedStyle(separator().element());
      expect(line.backgroundColor).toBe(colorOf("--sprout-line"));
      expect(line.width).toBe("1px");
      expect(getComputedStyle(separator("vertical").element()).height).toBe(
        "1px",
      );
      expect(await axeViolations(screen.container)).toEqual([]);
    },
  );

  for (const [orientation, grow, shrink] of [
    ["horizontal", "{ArrowRight}", "{ArrowLeft}"],
    ["vertical", "{ArrowDown}", "{ArrowUp}"],
  ] as const)
    it(`${orientation} resizes from the keyboard within its limits`, async () => {
      const screen = await render(<Split orientation={orientation} />);
      const handle = separator(orientation);
      const sizes = screen.getByTestId(`${orientation}-sizes`);
      const first = screen.container.querySelector<HTMLElement>(
        `[data-panel-id="${orientation}-a"]`,
      )!;
      const extent = () =>
        orientation === "horizontal"
          ? width(first)
          : first.getBoundingClientRect().height;
      await expect.element(sizes).toHaveTextContent("40% · 60%");
      const start = extent();
      (handle.element() as HTMLElement).focus();
      await userEvent.keyboard(grow);
      await expect.element(sizes).toHaveTextContent("45% · 55%");
      expect(extent()).toBeGreaterThan(start);
      await userEvent.keyboard(`${shrink}${shrink}`);
      await expect.element(sizes).toHaveTextContent("35% · 65%");
      await userEvent.keyboard("{Home}");
      await expect.element(sizes).toHaveTextContent("20% · 80%");
      await userEvent.keyboard(shrink);
      await expect.element(sizes).toHaveTextContent("20% · 80%");
      await userEvent.keyboard("{End}");
      await expect.element(sizes).toHaveTextContent("80% · 20%");
      await userEvent.keyboard(grow);
      await expect.element(sizes).toHaveTextContent("80% · 20%");
    });

  it("dragging moves the split, clamps at the minimum, and restores the cursor", async () => {
    const screen = await render(
      <>
        <Split />
        <div style={{ position: "relative", width: 632, height: 24 }}>
          {[
            ["half", 16 + 1 + 300],
            ["edge", 4],
          ].map(([id, left]) => (
            <span
              key={id}
              data-testid={id}
              style={{
                position: "absolute",
                left: left as number,
                width: 2,
                height: 2,
              }}
            />
          ))}
        </div>
      </>,
    );
    const handle = separator();
    const sizes = screen.getByTestId("horizontal-sizes");
    await userEvent.dragAndDrop(handle, screen.getByTestId("half"));
    await expect.element(sizes).toHaveTextContent("50% · 50%");
    await expect.element(handle).toHaveFocus();
    await expect.element(handle).not.toHaveAttribute("data-dragging");
    expect(document.documentElement.style.cursor).toBe("");
    await userEvent.dragAndDrop(handle, screen.getByTestId("edge"));
    await expect.element(sizes).toHaveTextContent("20% · 80%");
  });

  it("pixel minimums hold as the group narrows", async () => {
    function Explorer() {
      const [wide, setWide] = useState(true);
      return (
        <>
          <button onClick={() => setWide(false)}>Narrow</button>
          <div style={{ width: wide ? 1000 : 700, height: 200 }}>
            <ResizablePanelGroup>
              <ResizablePanel
                id="tree"
                defaultSize="28%"
                minSize="220px"
                maxSize="65%"
              >
                Tree
              </ResizablePanel>
              <ResizableHandle aria-label="Resize file tree" />
              <ResizablePanel id="file" minSize="35%">
                File
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </>
      );
    }
    const screen = await render(<Explorer />);
    const tree = screen.container.querySelector('[data-panel-id="tree"]')!;
    const handle = page.getByRole("separator", { name: "Resize file tree" });
    (handle.element() as HTMLElement).focus();
    await userEvent.keyboard("{Home}");
    await expect.poll(() => Math.round(width(tree))).toBe(220);
    await userEvent.keyboard("{End}");
    await expect.element(handle).toHaveAttribute("aria-valuenow", "65");
    await userEvent.keyboard("{Home}");
    await screen.getByRole("button", { name: "Narrow" }).click();
    await expect.poll(() => Math.round(width(tree))).toBe(220);
    await expect.element(handle).toHaveAttribute("aria-valuenow", "31");
  });

  it("handles show grip, hover and focus states with short transitions", async () => {
    const screen = await render(
      <>
        <button>Before</button>
        <Split withHandle />
      </>,
    );
    const handle = separator();
    const grip = handle
      .element()
      .querySelector('[data-slot="resizable-handle-grip"]')!;
    expect(getComputedStyle(grip).width).toBe("6px");
    expect(getComputedStyle(grip).height).toBe("24px");
    expect(grip.getAttribute("aria-hidden")).toBe("true");
    expect(getComputedStyle(handle.element()).transitionDuration).toMatch(
      /0\.12s/,
    );
    await handle.hover();
    await expect
      .poll(() => getComputedStyle(handle.element()).backgroundColor)
      .toBe(colorOf("--sprout-border"));
    await screen.getByRole("button", { name: "Before" }).hover();
    (screen.getByRole("button").element() as HTMLElement).focus();
    await userEvent.tab();
    await expect.element(handle).toHaveFocus();
    await expect
      .poll(() => getComputedStyle(handle.element()).backgroundColor)
      .toBe(colorOf("--sprout-focus"));
    expect(getComputedStyle(handle.element()).boxShadow).not.toBe("none");
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(handle.element()).transitionDuration).toBe("0s");
  });

  it("coarse pointers widen the hit area to 24px", async () => {
    await render(<Split />);
    const hit = () => getComputedStyle(separator().element(), "::after").width;
    expect(hit()).toBe("9px");
    await emulate({ coarse: true });
    expect(hit()).toBe("24px");
  });
});
