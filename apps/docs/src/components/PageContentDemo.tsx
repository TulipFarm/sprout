import { useRef, useState, type ReactNode } from "react";
import { Add } from "reicon-react/icons/Add";
import { ArrowUpRight } from "reicon-react/icons/ArrowUpRight";
import { ChatRound } from "reicon-react/icons/ChatRound";
import { ChevronLeft } from "reicon-react/icons/ChevronLeft";
import { FileText } from "reicon-react/icons/FileText";
import { FolderAdd } from "reicon-react/icons/FolderAdd";
import { Repeat } from "reicon-react/icons/Repeat";
import { Upload } from "reicon-react/icons/Upload";
import { Alert, AlertDescription } from "@tulipfarm/sprout/alert";
import { Badge } from "@tulipfarm/sprout/badge";
import { Button } from "@tulipfarm/sprout/button";
import { PageContent } from "@tulipfarm/sprout/page-content";
import { PageHeader } from "@tulipfarm/sprout/page-header";
import { StatePanel } from "@tulipfarm/sprout/state-panel";
import DocsSelect from "./DocsSelect";
import "../styles/page-content-demo.css";

function Frame({
  title,
  example,
  children,
}: {
  title: string;
  example: string;
  children: ReactNode;
}) {
  return (
    <section
      className="page-content-demo-frame"
      aria-label={title}
      data-example={example}
    >
      <div className="page-content-demo-frame-bar">{title}</div>
      {children}
    </section>
  );
}

const files = [
  ["Q3 board deck.pdf", "Maya Chen", "2.4 MB"],
  ["Supplier contracts", "Folder", "18 items"],
  ["Customer interviews – October.docx", "Arjun Rao", "312 KB"],
  ["Launch checklist.xlsx", "You", "48 KB"],
  ["Brand guidelines v4 final final.pdf", "Lena Ortiz", "9.1 MB"],
] as const;

function FilesPage() {
  return (
    <>
      <input type="file" multiple hidden tabIndex={-1} aria-hidden="true" />
      <PageHeader
        title="Files"
        description="Find, open, and organize workspace files. Sharing a file never changes who owns it."
        actions={
          <>
            <Button variant="outline">
              <FolderAdd aria-hidden="true" />
              New folder
            </Button>
            <Button>
              <Upload aria-hidden="true" />
              Upload
            </Button>
          </>
        }
      />
      <Alert>
        <AlertDescription>
          Folder “Supplier contracts” created.
        </AlertDescription>
      </Alert>
      <ul className="page-content-demo-list" aria-label="My files">
        {files.map(([name, owner, size]) => (
          <li key={name}>
            <FileText size={16} aria-hidden="true" />
            <span className="page-content-demo-name">{name}</span>
            <span className="page-content-demo-meta">{owner}</span>
            <span className="page-content-demo-meta">{size}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

const help = [
  [
    "An agent cannot start",
    "Check that its instructions are activated and that you can invoke it. The setup checklist names the next step and who must take it.",
  ],
  [
    "Credits or models are unavailable",
    "Ask an admin to check workspace credits on Usage and the allowed models on Models.",
  ],
  [
    "A submitted change is unconfirmed",
    "Use the status or recovery action shown next to it. Check the current state before you try again.",
  ],
  [
    "Files and integrations",
    "Personal chat files are stored for download and are not added to workspace knowledge unless you add them.",
  ],
] as const;

function HelpPage() {
  return (
    <>
      <PageHeader
        title="Help and support"
        description="Find the next step when your work is blocked."
      />
      {help.map(([title, body]) => (
        <section key={title} className="page-content-demo-help">
          <h2>{title}</h2>
          <p>{body}</p>
        </section>
      ))}
    </>
  );
}

function TaskPage() {
  return (
    <>
      <nav className="page-content-demo-nav" aria-label="Task">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <a href="#tasks" onClick={(event) => event.preventDefault()} />
          }
        >
          <ChevronLeft aria-hidden="true" />
          Back to my tasks
        </Button>
      </nav>
      <PageHeader
        title="Reconcile October supplier invoices"
        description="Started by you 12 minutes ago with the Finance assistant."
        actions={<Badge variant="info">Running</Badge>}
      />
      <p role="status" className="page-content-demo-muted">
        Automatic refresh is slower than usual. The task is still running.
      </p>
      <div>
        <Button variant="outline">Pause task</Button>
      </div>
      <section className="page-content-demo-card" aria-label="Task actions">
        <h2>Task actions</h2>
        <p>Read 42 invoice rows. Matched 39 to purchase orders.</p>
      </section>
    </>
  );
}

const workflowsHeader = (
  <PageHeader
    title="Workflows"
    description="See how repeatable work runs. Create and edit workflows in chat."
    actions={
      <Button>
        <Add aria-hidden="true" />
        New workflow
      </Button>
    }
  />
);

type Sample = "files" | "help" | "task" | "loading" | "empty" | "error";

const samples: Record<Sample, { label: string; page: () => ReactNode }> = {
  files: { label: "Files", page: FilesPage },
  help: { label: "Help and support", page: HelpPage },
  task: { label: "Agent task", page: TaskPage },
  loading: {
    label: "Workflows – loading",
    page: () => (
      <>
        {workflowsHeader}
        <StatePanel
          kind="loading"
          title="Loading workflows"
          description="Checking your workspace access."
        />
      </>
    ),
  },
  empty: {
    label: "Workflows – empty",
    page: () => (
      <>
        {workflowsHeader}
        <StatePanel
          kind="empty"
          icon={Repeat}
          title="No workflows yet"
          description="Describe repeatable work in chat. Your assistant drafts the steps for you to review."
        >
          <Button variant="outline">Open chat</Button>
        </StatePanel>
      </>
    ),
  },
  error: {
    label: "Workflows – error",
    page: () => (
      <>
        {workflowsHeader}
        <StatePanel
          kind="error"
          title="Could not load workflows"
          description="The request failed. Your workflows are unchanged."
        >
          <Button variant="outline">Try again</Button>
        </StatePanel>
      </>
    ),
  },
};

export function PageContentPlayground() {
  const [sample, setSample] = useState<Sample>("files");
  const Page = samples[sample].page;
  return (
    <section
      className="page-content-demo-frame"
      aria-label="Page content playground"
      data-example="playground"
    >
      <div className="page-content-demo-toolbar">
        <label>
          Page
          <DocsSelect
            label="Page"
            value={sample}
            items={(Object.keys(samples) as Sample[]).map((value) => ({
              value,
              label: samples[value].label,
            }))}
            onValueChange={setSample}
          />
        </label>
      </div>
      <div className="page-content-demo-app">
        <div className="page-content-demo-appbar" aria-hidden="true">
          Northwind
        </div>
        <div
          className="page-content-demo-scroll"
          role="region"
          aria-label={`${samples[sample].label} page`}
          tabIndex={0}
        >
          <PageContent>
            <Page />
          </PageContent>
        </div>
      </div>
    </section>
  );
}

const chats = [
  ["Draft the Q4 hiring plan", "Today", "9:41 AM"],
  [
    "Summarize supplier contract renewals for the operations review",
    "Today",
    "8:02 AM",
  ],
  ["Compare churn by plan tier", "Yesterday", "4:15 PM"],
  ["Prepare onboarding email for Lisbon office", "Yesterday", "11:30 AM"],
  ["Clean up duplicate customer rows", "Mon", "2:47 PM"],
  ["Weekly metrics digest", "Mon", "9:00 AM"],
  ["Translate pricing page into Portuguese", "Oct 9", "3:12 PM"],
] as const;

function ChatList() {
  return (
    <div className="page-content-demo-composer-host">
      <div
        role="region"
        aria-label="Chat list"
        tabIndex={0}
        className="page-content-demo-scroll page-content-demo-scroll-room"
      >
        <PageContent>
          <PageHeader
            title="Chats"
            description="Only you can see these chats. Most recently active first."
            actions={
              <Button>
                <ChatRound aria-hidden="true" />
                New chat
              </Button>
            }
          />
          <ul className="page-content-demo-list" aria-label="Chats">
            {chats.map(([title, day, time]) => (
              <li key={title}>
                <span className="page-content-demo-name">{title}</span>
                <span className="page-content-demo-meta">
                  {day} {time}
                </span>
              </li>
            ))}
          </ul>
          <Button variant="outline">Load more chats</Button>
        </PageContent>
      </div>
      <div className="page-content-demo-composer">Ask Northwind anything…</div>
    </div>
  );
}

function RestoredScroll() {
  const scroller = useRef<HTMLDivElement>(null);
  const saved = useRef(0);
  const [away, setAway] = useState(false);
  const [note, setNote] = useState(
    "Scroll the list, then open a file and go back.",
  );
  const leave = () => {
    saved.current = Math.round(scroller.current?.scrollTop ?? 0);
    setAway(true);
    setNote(`Saved ${saved.current}px.`);
  };
  const back = () => {
    setAway(false);
    requestAnimationFrame(() => {
      if (scroller.current) scroller.current.scrollTop = saved.current;
      setNote(`Restored ${saved.current}px.`);
    });
  };
  return (
    <div className="page-content-demo-restore">
      <div className="page-content-demo-restore-bar">
        <Button variant="outline" size="sm" onClick={away ? back : leave}>
          {away ? "Back to files" : "Open Q3 board deck.pdf"}
        </Button>
        <p role="status" className="page-content-demo-muted">
          {note}
        </p>
      </div>
      {away ? (
        <div className="page-content-demo-scroll page-content-demo-short">
          <PageContent>
            <PageHeader
              title="Q3 board deck.pdf"
              description="Shared by Maya Chen · 2.4 MB"
              back={{
                label: "Back to files",
                link: (
                  <a
                    href="#files"
                    onClick={(event) => {
                      event.preventDefault();
                      back();
                    }}
                  />
                ),
              }}
            />
          </PageContent>
        </div>
      ) : (
        <div
          ref={scroller}
          data-scroll-restoration-id="files-library"
          className="page-content-demo-scroll page-content-demo-short"
          role="region"
          aria-label="Files library"
          tabIndex={0}
        >
          <PageContent>
            <FilesPage />
          </PageContent>
        </div>
      )}
    </div>
  );
}

const apps = ["Slack", "Google Drive", "GitHub", "Linear", "Notion", "HubSpot"];
const rails = [
  "All",
  "Connected",
  "Communication",
  "Documents",
  "Engineering",
  "Sales",
];

export function PageContentExamples() {
  const [rail, setRail] = useState("All");
  return (
    <div className="page-content-demo-grid">
      <Frame
        title="Scroll region with room for a composer"
        example="scroll-room"
      >
        <ChatList />
      </Frame>
      <Frame title="Scroll restoration with a ref" example="restoration">
        <RestoredScroll />
      </Frame>
      <Frame title="Without a scroll region" example="surface">
        <PageContent>
          <PageHeader
            title="Workflows"
            actions={
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <a href="#chat" onClick={(event) => event.preventDefault()} />
                }
              >
                Open in chat
                <ArrowUpRight aria-hidden="true" />
              </Button>
            }
          />
          <Alert>
            <AlertDescription>
              Sample task: the operations assistant is preparing a purchase
              recommendation.
            </AlertDescription>
          </Alert>
          <div className="page-content-demo-card">
            <h2>Weekly supplier check</h2>
            <p>Every Monday at 9:00 · 4 steps · Last run succeeded</p>
          </div>
        </PageContent>
      </Frame>
      <Frame title="Edge-to-edge rail on small screens" example="bleed">
        <div className="page-content-demo-scroll page-content-demo-short">
          <PageContent>
            <PageHeader
              title="Integrations"
              description="Connect the apps your agents work in."
            />
            <div className="page-content-demo-split">
              <nav aria-label="Filter apps" className="page-content-demo-rail">
                {rails.map((name) => (
                  <Button
                    key={name}
                    size="sm"
                    variant={rail === name ? "secondary" : "ghost"}
                    aria-pressed={rail === name}
                    onClick={() => setRail(name)}
                  >
                    {name}
                  </Button>
                ))}
              </nav>
              <ul className="page-content-demo-apps" aria-label="Apps">
                {apps.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          </PageContent>
        </div>
      </Frame>
      <Frame title="Clipped preview" example="preview">
        <div className="page-content-demo-clip">
          <PageContent>
            <p className="page-content-demo-body">
              This is the real shared page content region.
            </p>
            <div className="page-content-demo-card">
              <h2>Garden notes</h2>
              <p>Nested content inherits the standard page spacing.</p>
            </div>
          </PageContent>
        </div>
      </Frame>
    </div>
  );
}
