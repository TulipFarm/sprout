import { useEffect, useRef, useState, type ReactNode } from "react";
import { Add } from "reicon-react/icons/Add";
import { ArrowLeft } from "reicon-react/icons/ArrowLeft";
import { BranchDown } from "reicon-react/icons/BranchDown";
import { ChatRound } from "reicon-react/icons/ChatRound";
import { Cpu } from "reicon-react/icons/Cpu";
import { Database } from "reicon-react/icons/Database";
import { Files } from "reicon-react/icons/Files";
import { Folder } from "reicon-react/icons/Folder";
import { Inbox } from "reicon-react/icons/Inbox";
import { Loader } from "reicon-react/icons/Loader";
import { Plug } from "reicon-react/icons/Plug";
import { Button } from "@tulipfarm/sprout/button";
import { Toggle } from "@tulipfarm/sprout/toggle";
import {
  StatePanel,
  statePanelKindNames,
  type StatePanelHeading,
  type StatePanelIcon,
  type StatePanelKind,
} from "@tulipfarm/sprout/state-panel";
import DocsSelect from "./DocsSelect";
import "../styles/state-panel-demo.css";

function Frame({
  title,
  children,
  wide,
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section
      className="state-demo-frame"
      data-wide={wide || undefined}
      aria-label={title}
    >
      <div className="state-demo-frame-bar">{title}</div>
      <div className="state-demo-frame-body">{children}</div>
    </section>
  );
}

// Sample adapter: a brand glyph supplied by the application.
function DriveGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.2 3h7.6l6.2 10.8-3.8 6.6L12 9.6z" fill="#1fa463" />
      <path d="M8.2 3 2 13.8l3.8 6.6L12 9.6z" fill="#4285f4" />
      <path d="M5.8 20.4h12.4l3.8-6.6H9.6z" fill="#ffba00" />
    </svg>
  );
}

const icons = {
  inbox: { label: "Inbox (default)", icon: Inbox },
  files: { label: "Files", icon: Files },
  database: { label: "Database", icon: Database },
  folder: { label: "Folder", icon: Folder },
  glyph: { label: "Custom glyph", icon: DriveGlyph },
} satisfies Record<string, { label: string; icon: StatePanelIcon }>;
type IconName = keyof typeof icons;

const copy: Record<StatePanelKind, { title: string; description: string }> = {
  empty: {
    title: "No files yet",
    description:
      "Upload the documents your work depends on, like price lists and contracts.",
  },
  loading: {
    title: "Opening file",
    description: "Preparing the document viewer.",
  },
  success: {
    title: "Slack is connected",
    description: "Agents can now post to the channels you choose.",
  },
  unavailable: {
    title: "This format cannot be displayed",
    description:
      "Download the original file to open it in a compatible application.",
  },
  error: {
    title: "Could not open this file",
    description: "The connection dropped while loading. Try again.",
  },
};

type ActionMode = "buttons" | "link" | "guidance" | "none";

function SampleRows({
  rows,
  icon: Icon,
}: {
  rows: [string, string, string][];
  icon: StatePanelIcon;
}) {
  return (
    <div className="state-demo-sample">
      <div className="state-demo-sample-bar">
        <Icon size={14} />
        <span>Files</span>
        <span aria-hidden="true">/</span>
        <span>My files</span>
      </div>
      <ul>
        {rows.map(([title, detail, trailing]) => (
          <li key={title}>
            <span className="state-demo-sample-tile">
              <Icon size={14} />
            </span>
            <span className="state-demo-sample-copy">
              <strong>{title}</strong>
              <span>{detail}</span>
            </span>
            <span className="state-demo-sample-trailing">{trailing}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const fileRows: [string, string, string][] = [
  ["Supplier contracts", "Folder · Shared with Purchasing", "You"],
  ["Month-end close", "Folder", "You"],
  ["Price list 2026.xlsx", "Spreadsheet · 48 KB", "You"],
  ["Returns policy.pdf", "PDF · 212 KB", "You"],
  ["Onboarding checklist.docx", "Document · 31 KB", "You"],
];

function FilesSample() {
  return <SampleRows rows={fileRows} icon={Files} />;
}

function PlaygroundPanel({
  kind,
  heading,
  icon,
  actions,
  sample,
}: {
  kind: StatePanelKind;
  heading: StatePanelHeading;
  icon: StatePanelIcon;
  actions: ActionMode;
  sample: boolean;
}) {
  const { title, description } = copy[kind];
  const children =
    actions === "buttons" ? (
      <>
        <Button>
          <Add aria-hidden="true" />
          Upload files
        </Button>
        <Button variant="outline">Try again</Button>
      </>
    ) : actions === "link" ? (
      <Button nativeButton={false} render={<a href="#state-panel-actions" />}>
        Read about actions
      </Button>
    ) : actions === "guidance" ? (
      <p>Ask again in the chat.</p>
    ) : undefined;
  const shared = { title, description, heading, icon };
  if (kind === "error")
    return (
      <StatePanel kind="error" {...shared}>
        {children ?? <p>Ask again in the chat.</p>}
      </StatePanel>
    );
  if (kind === "empty")
    return (
      <StatePanel
        kind="empty"
        {...shared}
        sample={sample ? <FilesSample /> : undefined}
      >
        {children}
      </StatePanel>
    );
  return (
    <StatePanel kind={kind} {...shared}>
      {children}
    </StatePanel>
  );
}

export function StatePanelPlayground() {
  const [kind, setKind] = useState<StatePanelKind>("empty");
  const [heading, setHeading] = useState<StatePanelHeading>("h3");
  const [icon, setIcon] = useState<IconName>("inbox");
  const [actions, setActions] = useState<ActionMode>("buttons");
  const [sample, setSample] = useState(false);
  const iconUsed = kind === "empty" || kind === "unavailable";
  return (
    <section
      className="state-demo-playground"
      aria-label="State panel playground"
    >
      <div className="state-demo-toolbar">
        <label>
          Kind
          <DocsSelect
            label="Kind"
            value={kind}
            items={statePanelKindNames.map((value) => ({
              value,
              label: value,
            }))}
            onValueChange={setKind}
          />
        </label>
        <label>
          Heading
          <DocsSelect
            label="Heading"
            value={heading}
            items={(["h1", "h2", "h3", "h4"] as const).map((value) => ({
              value,
              label: value === "h2" ? "h2 (default)" : value,
            }))}
            onValueChange={setHeading}
          />
        </label>
        <label>
          Icon
          <DocsSelect
            label="Icon"
            value={icon}
            items={Object.entries(icons).map(([value, item]) => ({
              value: value as IconName,
              label: item.label,
            }))}
            onValueChange={setIcon}
          />
        </label>
        <label>
          Actions
          <DocsSelect
            label="Actions"
            value={actions}
            items={[
              { value: "buttons", label: "Buttons" },
              { value: "link", label: "Link" },
              { value: "guidance", label: "Guidance text" },
              { value: "none", label: "None" },
            ]}
            onValueChange={setActions}
          />
        </label>
        <Toggle
          variant="outline"
          size="sm"

          pressed={sample && kind === "empty"}
          disabled={kind !== "empty"}
          onClick={() => setSample((value) => !value)}
        >
          Sample preview
        </Toggle>
      </div>
      <div
        className="state-demo-stage"
        data-sample={sample && kind === "empty" ? "" : undefined}
      >
        <PlaygroundPanel
          kind={kind}
          heading={heading}
          icon={icons[icon].icon}
          actions={actions}
          sample={sample}
        />
      </div>
      <p className="state-demo-foot">
        {!iconUsed ? `${kind} uses a fixed icon. ` : ""}
        {kind === "error" && actions === "none"
          ? "Errors always need recovery, so guidance text stays. "
          : ""}
        {kind !== "empty" ? "Sample previews are for empty states only." : ""}
      </p>
    </section>
  );
}

export function StatePanelKinds() {
  return (
    <div className="state-demo-grid">
      {statePanelKindNames.map((kind) => (
        <Frame key={kind} title={kind}>
          <div data-kind-sample={kind}>
            {kind === "error" ? (
              <StatePanel kind="error" heading="h3" {...copy.error}>
                <Button variant="outline">Try again</Button>
              </StatePanel>
            ) : (
              <StatePanel kind={kind} heading="h3" {...copy[kind]} />
            )}
          </div>
        </Frame>
      ))}
    </div>
  );
}

const widths = [
  { value: "narrow", label: "Narrow", px: 340 },
  { value: "medium", label: "Medium", px: 600 },
  { value: "wide", label: "Wide", px: null },
] as const;

export function StatePanelSamples() {
  const [width, setWidth] = useState<(typeof widths)[number]["value"]>("wide");
  const [shelf, setShelf] = useState<"current" | "archived">("current");
  const px = widths.find((item) => item.value === width)?.px;
  return (
    <div className="state-demo-stack">
      <section className="state-demo-playground" aria-label="Sample layout">
        <div className="state-demo-toolbar">
          <div
            role="group"
            aria-label="Container width"
            className="state-demo-segments"
          >
            {widths.map((item) => (
              <Toggle
                variant="outline"
                size="sm"
                key={item.value}

                pressed={width === item.value}
                onClick={() => setWidth(item.value)}
              >
                {item.label}
              </Toggle>
            ))}
          </div>
        </div>
        <div className="state-demo-stage">
          <div
            className="state-demo-resize"
            data-width={width}
            style={px ? { maxWidth: px } : undefined}
          >
            <StatePanel
              kind="empty"
              heading="h3"
              icon={Files}
              title="No files yet"
              description="Upload the documents your work depends on, like price lists, contracts, and policies. Files stay private until you share them."
              sample={<FilesSample />}
            >
              <Button>
                <Add aria-hidden="true" />
                Upload files
              </Button>
              <Button variant="outline">
                <Folder aria-hidden="true" />
                New folder
              </Button>
            </StatePanel>
          </div>
        </div>
      </section>
      <div className="state-demo-grid">
        <Frame title="Sample without actions">
          <StatePanel
            kind="empty"
            heading="h3"
            icon={Cpu}
            title="No models configured yet"
            description="Once your operator configures model providers, each model family appears here."
            sample={
              <SampleRows
                icon={Cpu}
                rows={[
                  ["Fast model", "General chat and drafting", "Default"],
                  ["Reasoning model", "Planning and analysis", "Enabled"],
                  ["Vision model", "Images and documents", "Enabled"],
                ]}
              />
            }
          />
        </Frame>
        <Frame title="Optional sample">
          <div
            className="state-demo-segments"
            role="group"
            aria-label="Workflow shelf"
          >
            {(["current", "archived"] as const).map((value) => (
              <Toggle
                variant="outline"
                size="sm"
                key={value}

                pressed={shelf === value}
                onClick={() => setShelf(value)}
              >
                {value === "current" ? "Current" : "Archived"}
              </Toggle>
            ))}
          </div>
          <StatePanel
            kind="empty"
            heading="h3"
            icon={BranchDown}
            title={
              shelf === "archived"
                ? "No archived workflows"
                : "No workflows yet"
            }
            description={
              shelf === "archived"
                ? "Archived workflows keep their run history here."
                : "Describe the steps once, then run them on a schedule."
            }
            sample={
              shelf === "current" ? (
                <SampleRows
                  icon={BranchDown}
                  rows={[
                    ["Invoice reminders", "Every weekday at 9:00", "Active"],
                    ["New customer kickoff", "When a deal closes", "Active"],
                  ]}
                />
              ) : undefined
            }
          >
            <Button
              variant="outline"
              onClick={() =>
                setShelf(shelf === "current" ? "archived" : "current")
              }
            >
              {shelf === "current" ? "View archived" : "Show current workflows"}
            </Button>
          </StatePanel>
        </Frame>
      </div>
    </div>
  );
}

type Outcome = "success" | "error" | "empty" | "unavailable";
type FlowState = { kind: "idle" } | { kind: "loading" } | { kind: Outcome };

// Sample adapter: stands in for an application request.
function useSampleRequest(next: Outcome) {
  const [state, setState] = useState<FlowState>({ kind: "loading" });
  const timer = useRef<number | undefined>(undefined);
  const run = () => {
    window.clearTimeout(timer.current);
    setState({ kind: "loading" });
    timer.current = window.setTimeout(() => setState({ kind: next }), 900);
  };
  useEffect(() => {
    timer.current = window.setTimeout(() => setState({ kind: "error" }), 900);
    return () => window.clearTimeout(timer.current);
  }, []);
  return [state, run] as const;
}

export function StatePanelFlow() {
  const [next, setNext] = useState<Outcome>("success");
  const [state, run] = useSampleRequest(next);
  const stage = useRef<HTMLDivElement>(null);
  const retry = () => {
    stage.current?.focus();
    run();
  };
  const kind = state.kind === "idle" ? "loading" : state.kind;
  return (
    <section className="state-demo-playground" aria-label="Recovery flow">
      <div className="state-demo-toolbar">
        <label>
          Next result
          <DocsSelect
            label="Next result"
            value={next}
            items={[
              { value: "success", label: "Success" },
              { value: "error", label: "Error" },
              { value: "empty", label: "Empty" },
              { value: "unavailable", label: "Unavailable" },
            ]}
            onValueChange={setNext}
          />
        </label>
        <Button
          variant="outline"
          size="sm"
          onClick={retry}
          disabled={kind === "loading"}
        >
          Reload
        </Button>
      </div>
      <div
        ref={stage}
        tabIndex={-1}
        className="state-demo-stage state-demo-flow"
        aria-label="Request result"
        data-state={kind}
      >
        {kind === "error" ? (
          <StatePanel
            kind="error"
            heading="h3"
            title="Could not load Google Drive"
            description="Google did not respond. Your files are unaffected."
          >
            <Button variant="outline" onClick={retry}>
              Retry loading Google Drive
            </Button>
          </StatePanel>
        ) : kind === "empty" ? (
          <StatePanel
            kind="empty"
            heading="h3"
            icon={DriveGlyph}
            title="This folder is empty"
            description="Files you add in Google Drive appear here."
          >
            <Button variant="outline" onClick={retry}>
              Check again
            </Button>
          </StatePanel>
        ) : (
          <StatePanel
            kind={kind}
            heading="h3"
            icon={DriveGlyph}
            title={
              kind === "loading"
                ? "Loading Google Drive"
                : kind === "success"
                  ? "Google Drive is ready"
                  : "Allow Google Drive access"
            }
            description={
              kind === "loading"
                ? "Checking your connection and files."
                : kind === "success"
                  ? "Browse and open your Drive files here."
                  : "Google access expired or changed. Reconnect to keep browsing."
            }
          >
            {kind === "loading" ? null : (
              <Button
                variant={kind === "success" ? "outline" : "default"}
                onClick={retry}
              >
                {kind === "success" ? "Refresh" : "Check access again"}
              </Button>
            )}
          </StatePanel>
        )}
      </div>
    </section>
  );
}

function BusyAction() {
  const [state, setState] = useState<"idle" | "pending" | "done">("idle");
  useEffect(() => {
    if (state !== "pending") return;
    const timer = window.setTimeout(() => setState("done"), 900);
    return () => window.clearTimeout(timer);
  }, [state]);
  if (state === "done")
    return (
      <StatePanel
        kind="success"
        heading="h3"
        title="Default knowledge is on"
        description="New chats can read the shared drive."
      >
        <Button variant="outline" onClick={() => setState("idle")}>
          Reset example
        </Button>
      </StatePanel>
    );
  return (
    <StatePanel
      kind="unavailable"
      heading="h3"
      icon={Plug}
      title="No default knowledge"
      description="Choose a shared drive that every new chat can read."
    >
      <Button
        disabled={state === "pending"}
        aria-busy={state === "pending" || undefined}
        onClick={() => setState("pending")}
      >
        {state === "pending" && (
          <Loader aria-hidden="true" className="state-demo-spin" />
        )}
        {state === "pending" ? "Turning on" : "Use as default"}
      </Button>
    </StatePanel>
  );
}

export function StatePanelCompositions() {
  const [synced, setSynced] = useState(false);
  return (
    <div className="state-demo-grid">
      <Frame title="Retry">
        <StatePanel
          kind="error"
          heading="h3"
          title="Could not open this file"
          description="The download stopped before it finished."
        >
          <Button variant="outline">Try again</Button>
        </StatePanel>
      </Frame>
      <Frame title="Primary and link">
        <StatePanel
          kind="unavailable"
          heading="h3"
          title="Workspace access changed"
          description="Check your workspace access before continuing."
        >
          <Button>Check workspace access again</Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href="#main" />}
          >
            Back to overview
          </Button>
        </StatePanel>
      </Frame>
      <Frame title="Action row">
        <StatePanel
          kind="unavailable"
          heading="h3"
          icon={Inbox}
          title="Inbox isn’t available yet"
          description="Tasks waiting for you are in Tasks, and your conversations are in Chats."
        >
          <div className="state-demo-row">
            <Button nativeButton={false} render={<a href="#main" />}>
              Open tasks
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href="#main" />}
            >
              <ChatRound aria-hidden="true" />
              Open chats
            </Button>
          </div>
        </StatePanel>
      </Frame>
      <Frame title="Guidance text">
        <StatePanel
          kind="error"
          heading="h3"
          title="Calendar did not load"
          description="This item could not be refreshed."
        >
          <p>Ask again in the chat.</p>
        </StatePanel>
      </Frame>
      <Frame title="Inline alert">
        <StatePanel
          kind="empty"
          heading="h3"
          icon={Plug}
          title="Slack isn’t connected"
          description="Connect Slack so agents can read and post in channels."
        >
          <p role="alert">Slack status could not refresh.</p>
          <Button>Connect Slack</Button>
        </StatePanel>
      </Frame>
      <Frame title="Busy action">
        <BusyAction />
      </Frame>
      <Frame title="Back and retry">
        <StatePanel
          kind="unavailable"
          heading="h4"
          icon={DriveGlyph}
          title="You can’t open this folder"
          description="Ask the owner to share it with you."
        >
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href="#main" />}
          >
            <ArrowLeft aria-hidden="true" />
            Back to My Drive
          </Button>
          <Button variant="ghost">Check access again</Button>
        </StatePanel>
      </Frame>
      <Frame title="Success with action">
        <StatePanel
          kind="success"
          heading="h3"
          title="Copied to your Drive"
          description="The copy is ready to edit in Google Sheets."
        >
          <Button nativeButton={false} render={<a href="#main" />}>
            Open copy
          </Button>
        </StatePanel>
      </Frame>
      <Frame title="Loading with action">
        <StatePanel
          kind="loading"
          heading="h3"
          title="Waiting for Slack"
          description="Finish signing in on the Slack tab."
        >
          <Button variant="outline">Cancel</Button>
        </StatePanel>
      </Frame>
      <Frame title="Conditional action">
        <StatePanel
          kind="unavailable"
          heading="h3"
          icon={Database}
          title="Channels are still syncing"
          description="Slack channels appear once the first sync finishes."
        >
          {synced && <Button variant="outline">Retry channel list</Button>}
        </StatePanel>
        <div className="state-demo-foot-inline">
          <Toggle
            variant="outline"
            size="sm"

            pressed={synced}
            onClick={() => setSynced((value) => !value)}
          >
            Sync finished
          </Toggle>
        </div>
      </Frame>
    </div>
  );
}
