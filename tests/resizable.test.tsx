import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  resizableOrientationNames,
  useResizableLayout,
  type ResizableLayoutStore,
} from "../packages/sprout/src/components/resizable.js";
import * as sprout from "../packages/sprout/src/index.js";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe("Resizable", () => {
  it("is exported from the package root", () => {
    for (const name of [
      "ResizableHandle",
      "ResizablePanel",
      "ResizablePanelGroup",
      "resizableOrientationNames",
      "useResizableLayout",
    ]) {
      expect(sprout).toHaveProperty(name);
    }
    expect(resizableOrientationNames).toEqual(["horizontal", "vertical"]);
  });

  it("renders every orientation with a perpendicular separator line", () => {
    for (const orientation of resizableOrientationNames) {
      const html = renderToString(
        <ResizablePanelGroup orientation={orientation} className="h-64">
          <ResizablePanel defaultSize="40%" minSize="20%">
            First
          </ResizablePanel>
          <ResizableHandle withHandle aria-label="Resize panels" />
          <ResizablePanel defaultSize="60%" minSize="20%">
            Second
          </ResizablePanel>
        </ResizablePanelGroup>,
      );
      const line = orientation === "horizontal" ? "vertical" : "horizontal";
      expect(html).toContain('data-slot="resizable-panel-group"');
      expect(html).toContain(`data-orientation="${orientation}"`);
      expect(html).toContain('class="sprout-resizable-group h-64"');
      expect(html).toContain('role="separator"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain(`aria-orientation="${line}"`);
      expect(html).toContain('aria-label="Resize panels"');
      expect(html).toContain('data-slot="resizable-handle-grip"');
      expect(html).toContain("flex-grow:40");
      expect(html).toContain("flex-grow:60");
    }
  });

  it("omits the grip by default", () => {
    const html = renderToString(
      <ResizablePanelGroup>
        <ResizablePanel>Tree</ResizablePanel>
        <ResizableHandle aria-label="Resize file tree" />
        <ResizablePanel>File</ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(html).not.toContain("resizable-handle-grip");
    expect(html).not.toContain("data-with-handle");
    expect(html).toContain('data-orientation="horizontal"');
  });

  it("shares the remaining space with panels that have no static default", () => {
    const html = renderToString(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="28%" minSize="220px">
          Tree
        </ResizablePanel>
        <ResizableHandle aria-label="Resize file tree" />
        <ResizablePanel minSize="35%">File</ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(html).toContain("flex-grow:28");
    expect(html).toContain("flex-grow:72");
  });

  it("finds panels inside fragments, as conditional splits render them", () => {
    const html = renderToString(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel id="chat" minSize="40%" defaultSize="55%">
          Chat
        </ResizablePanel>
        <>
          <ResizableHandle withHandle aria-label="Resize canvas" />
          <ResizablePanel id="canvas" minSize="320px">
            Canvas
          </ResizablePanel>
        </>
      </ResizablePanelGroup>,
    );
    expect(html).toContain('id="chat"');
    expect(html).toContain('data-panel-id="canvas"');
    expect(html).toContain("flex-grow:55");
    expect(html).toContain("flex-grow:45");
  });

  it("treats unitless strings as percent and keeps class names and props", () => {
    const html = renderToString(
      <ResizablePanelGroup id="split" data-x="1">
        <ResizablePanel
          defaultSize="30"
          className="p-2"
          style={{ overflow: "auto" }}
        >
          A
        </ResizablePanel>
        <ResizableHandle className="custom" />
        <ResizablePanel defaultSize="70">B</ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(html).toContain('id="split"');
    expect(html).toContain('data-x="1"');
    expect(html).toContain('class="sprout-resizable-panel p-2"');
    expect(html).toContain("overflow:auto");
    expect(html).toContain("flex-grow:30");
    expect(html).toContain('class="sprout-resizable-handle custom"');
  });

  it("requires a group around panels and handles", () => {
    expect(() => renderToString(<ResizablePanel />)).toThrow(
      "ResizablePanel must be used inside ResizablePanelGroup.",
    );
    expect(() => renderToString(<ResizableHandle />)).toThrow(
      "ResizableHandle must be used inside ResizablePanelGroup.",
    );
  });

  it("keeps saved layouts out of server markup and saves per panel set", () => {
    const storage = memoryStorage({
      "sprout-resizable:chat:chat,canvas": JSON.stringify({
        chat: 60,
        canvas: 40,
      }),
    });
    let store: ResizableLayoutStore | undefined;
    function Probe({ only }: { only: boolean }) {
      store = useResizableLayout({
        id: "chat",
        panelIds: ["chat", "canvas"],
        onlySaveAfterUserInteractions: only,
        storage,
      });
      return null;
    }
    renderToString(<Probe only />);
    expect(store!.defaultLayout).toBeUndefined();
    store!.onLayoutChanged(
      { chat: 55, canvas: 45 },
      { isUserInteraction: false },
    );
    expect(storage.values.get("sprout-resizable:chat:chat,canvas")).toBe(
      JSON.stringify({ chat: 60, canvas: 40 }),
    );
    store!.onLayoutChanged(
      { chat: 50, canvas: 50 },
      { isUserInteraction: true },
    );
    expect(storage.values.get("sprout-resizable:chat:chat,canvas")).toBe(
      JSON.stringify({ chat: 50, canvas: 50 }),
    );
    renderToString(<Probe only={false} />);
    store!.onLayoutChanged(
      { chat: 70, canvas: 30 },
      { isUserInteraction: false },
    );
    expect(storage.values.get("sprout-resizable:chat:chat,canvas")).toBe(
      JSON.stringify({ chat: 70, canvas: 30 }),
    );
  });
});
