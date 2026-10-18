import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft } from "reicon-react/icons/ArrowLeft";
import { FileText } from "reicon-react/icons/FileText";
import { Refresh } from "reicon-react/icons/Refresh";
import { SidebarRight } from "reicon-react/icons/SidebarRight";
import { Button } from "@tulipfarm/sprout/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  useResizableLayout,
  type ResizableLayout,
  type ResizableOrientation,
} from "@tulipfarm/sprout/resizable";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@tulipfarm/sprout/sheet";
import { StatePanel } from "@tulipfarm/sprout/state-panel";
import { ToggleGroup, ToggleGroupItem } from "@tulipfarm/sprout/toggle-group";
import "../styles/resizable-demo.css";

function Example({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="resizable-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="resizable-demo-card-body">{children}</div>
    </section>
  );
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

const sizes = (layout: ResizableLayout) =>
  Object.values(layout)
    .map((size) => `${Math.round(size)}%`)
    .join(" · ");

const splits: Record<
  ResizableOrientation,
  { label: string; first: ReactNode; second: ReactNode }
> = {
  horizontal: {
    label: "Side by side",
    first: (
      <div className="resizable-demo-pane">
        <p className="resizable-demo-eyebrow">Runs</p>
        <ul className="resizable-demo-list">
          <li>Weekly digest</li>
          <li>Invoice follow-up</li>
          <li>Lead scoring</li>
        </ul>
      </div>
    ),
    second: (
      <div className="resizable-demo-pane">
        <p className="resizable-demo-eyebrow">Run details</p>
        <p className="resizable-demo-strong">Weekly digest</p>
        <p className="resizable-demo-muted">
          Finished in 42 seconds. Sent to 18 people in the Growth workspace.
        </p>
      </div>
    ),
  },
  vertical: {
    label: "Stacked",
    first: (
      <div className="resizable-demo-pane">
        <p className="resizable-demo-eyebrow">Prompt</p>
        <p className="resizable-demo-muted">
          Summarise the open invoices older than 30 days.
        </p>
      </div>
    ),
    second: (
      <div className="resizable-demo-pane">
        <p className="resizable-demo-eyebrow">Response</p>
        <p className="resizable-demo-muted">
          Four invoices are overdue, totalling $12,480. Northwind Ltd has the
          oldest, at 47 days.
        </p>
      </div>
    ),
  },
};

function Orientations() {
  const [layouts, setLayouts] = useState<Record<ResizableOrientation, string>>({
    horizontal: "40% · 60%",
    vertical: "40% · 60%",
  });
  return (
    <Example
      title="Orientations"
      description="Drag the divider, or focus it and use the arrow keys. Home and End jump to the first panel's limits."
    >
      <div className="resizable-demo-orientations">
        {(["horizontal", "vertical"] as const).map((orientation) => (
          <div key={orientation} className="resizable-demo-stack">
            <div
              className="resizable-demo-frame"
              data-testid={`${orientation}-frame`}
            >
              <ResizablePanelGroup
                orientation={orientation}
                onLayoutChange={(layout) =>
                  setLayouts((current) => ({
                    ...current,
                    [orientation]: sizes(layout),
                  }))
                }
              >
                <ResizablePanel defaultSize="40%" minSize="20%">
                  {splits[orientation].first}
                </ResizablePanel>
                <ResizableHandle
                  withHandle
                  aria-label={`Resize ${orientation} panels`}
                />
                <ResizablePanel defaultSize="60%" minSize="20%">
                  {splits[orientation].second}
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
            <p className="resizable-demo-muted">
              {splits[orientation].label}:{" "}
              <span data-testid={`${orientation}-sizes`}>
                {layouts[orientation]}
              </span>
            </p>
          </div>
        ))}
      </div>
    </Example>
  );
}

const canvasSplitMinWidth = 720;
const chatLayoutId = "sprout-docs:chat-canvas";

function CanvasBody() {
  return (
    <div className="resizable-demo-canvas">
      <p className="resizable-demo-strong">Overdue invoices</p>
      <table className="resizable-demo-table">
        <thead>
          <tr>
            <th scope="col">Customer</th>
            <th scope="col">Days</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Northwind Ltd</td>
            <td>47</td>
            <td>$5,200</td>
          </tr>
          <tr>
            <td>Bloom &amp; Co</td>
            <td>38</td>
            <td>$3,180</td>
          </tr>
          <tr>
            <td>Juniper Studio</td>
            <td>31</td>
            <td>$4,100</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ChatCanvas() {
  const [choice, setOpen] = useState<boolean | null>(null);
  const [reset, setReset] = useState(0);
  const [ref, width] = useWidth();
  const mobile = width !== null && width < canvasSplitMinWidth;
  // Open beside the chat by default, but never cover a narrow page with the sheet on load.
  const open = choice ?? !mobile;
  const split = open && !mobile;
  return (
    <Example
      title="Chat and canvas"
      description="The canvas opens beside the chat with a grip. Sizes you choose are saved per panel set. Below 720px the canvas moves into a sheet."
    >
      <div className="resizable-demo-toolbar">
        <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
          <SidebarRight size={14} aria-hidden="true" />
          {open ? "Close canvas" : "Open canvas"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            for (const key of Object.keys(localStorage))
              if (key.startsWith(`sprout-resizable:${chatLayoutId}`))
                localStorage.removeItem(key);
            setReset((value) => value + 1);
          }}
        >
          Reset saved size
        </Button>
      </div>
      <div
        ref={ref}
        className="resizable-demo-chat-frame"
        data-testid="chat-frame"
      >
        <ChatSplit key={reset} open={open} split={split} />
      </div>
      <Sheet open={open && mobile} onOpenChange={setOpen}>
        <SheetContent side="right" size="full">
          <SheetHeader>
            <SheetTitle>Canvas</SheetTitle>
            <SheetDescription>
              Detailed result. Close it to return to the chat.
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <CanvasBody />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </Example>
  );
}

function ChatSplit({ open, split }: { open: boolean; split: boolean }) {
  const layout = useResizableLayout({
    id: chatLayoutId,
    panelIds: split ? ["docs-chat", "docs-canvas"] : ["docs-chat"],
    onlySaveAfterUserInteractions: true,
  });
  return (
    <ResizablePanelGroup
      orientation="horizontal"
      defaultLayout={layout.defaultLayout}
      onLayoutChanged={layout.onLayoutChanged}
    >
      <ResizablePanel
        id="docs-chat"
        minSize="40%"
        defaultSize={split ? "55%" : "100%"}
      >
        <div className="resizable-demo-chat">
          <p className="resizable-demo-bubble" data-from="user">
            Which invoices are overdue?
          </p>
          <p className="resizable-demo-bubble">
            Three customers are more than 30 days late. I opened the details in
            the canvas.
          </p>
          <p className="resizable-demo-muted">
            {open ? "Canvas is open." : "Canvas is closed."}
          </p>
        </div>
      </ResizablePanel>
      {split && (
        <>
          <ResizableHandle withHandle aria-label="Resize canvas" />
          <ResizablePanel id="docs-canvas" minSize="320px" defaultSize="45%">
            <CanvasBody />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}

const files: Record<string, string> = {
  "soul/identity.md":
    "# Identity\n\nTulip helps the Growth team keep\nfollow-ups short and kind.",
  "soul/tone.md":
    "# Tone\n\n- Plain words\n- One idea per sentence\n- No exclamation marks",
  "soul/memory/customers.md":
    "# Customers\n\nNorthwind Ltd prefers email.\nBloom & Co pays on the 5th.",
};

type ExplorerState = "ready" | "loading" | "error";

function FileExplorer() {
  const [state, setState] = useState<ExplorerState>("ready");
  const [selected, setSelected] = useState<string | null>(null);
  const [ref, width] = useWidth();
  const mobile = width !== null && width < 560;
  const tree = (
    <div className="resizable-demo-tree">
      <p className="resizable-demo-eyebrow" id="soul-files-label">
        Soul files
      </p>
      <ul aria-labelledby="soul-files-label">
        {Object.keys(files).map((path) => (
          <li key={path}>
            <button
              type="button"
              aria-current={selected === path ? "true" : undefined}
              onClick={() => setSelected(path)}
            >
              <FileText size={14} aria-hidden="true" />
              <span>{path}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
  const file = selected ? (
    <div className="resizable-demo-file">
      <p className="resizable-demo-strong">{selected}</p>
      <pre>{files[selected]}</pre>
    </div>
  ) : (
    <StatePanel
      kind="empty"
      heading="h4"
      title="Select a file"
      description="Open a file from the tree to read its saved contents. Files cannot be edited here."
    />
  );
  return (
    <Example
      title="File explorer"
      description="A plain divider splits a file tree from the open file. The tree keeps at least 220px and the file at least 35%. Narrow screens show one pane at a time."
    >
      <ToggleGroup
        aria-label="Explorer state"
        size="sm"
        variant="outline"
        spacing={0}
        value={[state]}
        onValueChange={(value) => {
          if (value[0]) setState(value[0] as ExplorerState);
        }}
      >
        <ToggleGroupItem value="ready">Files</ToggleGroupItem>
        <ToggleGroupItem value="loading">Loading</ToggleGroupItem>
        <ToggleGroupItem value="error">Error</ToggleGroupItem>
      </ToggleGroup>
      <div className="resizable-demo-explorer">
        <div className="resizable-demo-explorer-bar">
          <span className="resizable-demo-muted">
            Accepted revision <code>9f3c2a71be04</code>
          </span>
          <div className="resizable-demo-explorer-actions">
            {mobile && selected && state === "ready" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(null)}
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Back
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setState("ready")}
            >
              <Refresh size={14} aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </div>
        <div
          ref={ref}
          className="resizable-demo-explorer-body"
          data-testid="explorer-body"
        >
          {state === "loading" ? (
            <StatePanel
              kind="loading"
              heading="h4"
              title="Loading Soul"
              description="Checking access and reading the saved files."
            />
          ) : state === "error" ? (
            <StatePanel
              kind="error"
              heading="h4"
              title="Soul could not be read"
              description="The saved files did not load. Try again in a moment."
            >
              <Button size="sm" onClick={() => setState("ready")}>
                <Refresh size={14} aria-hidden="true" />
                Try again
              </Button>
            </StatePanel>
          ) : mobile ? (
            <div className="resizable-demo-scroll">
              {selected ? file : tree}
            </div>
          ) : (
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel defaultSize="28%" minSize="220px">
                <div className="resizable-demo-scroll" data-tone="muted">
                  {tree}
                </div>
              </ResizablePanel>
              <ResizableHandle aria-label="Resize file tree" />
              <ResizablePanel minSize="35%">
                <div className="resizable-demo-scroll">{file}</div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
      </div>
    </Example>
  );
}

export default function ResizableDemo() {
  return (
    <div id="resizable-demo" className="resizable-demo">
      <Orientations />
      <ChatCanvas />
      <FileExplorer />
    </div>
  );
}
