import { useState, type ReactNode } from "react";
import { ArrowLeft } from "reicon-react/icons/ArrowLeft";
import { Bell } from "reicon-react/icons/Bell";
import { FileText } from "reicon-react/icons/FileText";
import { Settings } from "reicon-react/icons/Settings";
import { UserCircle } from "reicon-react/icons/UserCircle";
import { Users } from "reicon-react/icons/Users";
import { Button } from "@tulipfarm/sprout/button";
import { Separator } from "@tulipfarm/sprout/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "@tulipfarm/sprout/sidebar";
import "../styles/separator-demo.css";
import DocsSelect from "./DocsSelect";

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
    <section className="separator-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="separator-demo-card-body">{children}</div>
    </section>
  );
}

function Orientations() {
  return (
    <Example
      title="Orientations"
      description="Horizontal splits stacked regions. Vertical splits items in a row and stretches to the row height."
    >
      <div className="separator-demo-orientations">
        <div className="separator-demo-panel">
          <p className="separator-demo-strong">Project details</p>
          <Separator />
          <p className="separator-demo-muted">
            Meadow is a shared workspace for the spring planting plan.
          </p>
        </div>
        <div className="separator-demo-meta" data-testid="meta-row">
          <span>Meadow</span>
          <Separator orientation="vertical" />
          <span>Updated today</span>
          <Separator orientation="vertical" />
          <span>3 members</span>
        </div>
      </div>
    </Example>
  );
}

function ButtonGroups() {
  const [pages, setPages] = useState({ horizontal: 1, vertical: 1 });
  return (
    <Example
      title="Button groups"
      description='tone="input" matches control borders. The separator runs across the group, so it is vertical in a row and horizontal in a column.'
    >
      <div className="separator-demo-groups">
        {(["horizontal", "vertical"] as const).map((orientation) => (
          <div key={orientation} className="separator-demo-group-wrap">
            <div
              role="group"
              aria-label={`${orientation === "horizontal" ? "Row" : "Column"} pages`}
              className="separator-demo-group"
              data-orientation={orientation}
            >
              <Button
                variant="ghost"
                size="sm"
                disabled={pages[orientation] === 1}
                onClick={() =>
                  setPages((current) => ({
                    ...current,
                    [orientation]: current[orientation] - 1,
                  }))
                }
              >
                Previous
              </Button>
              <Separator
                tone="input"
                orientation={
                  orientation === "horizontal" ? "vertical" : "horizontal"
                }
              />
              <Button
                variant="ghost"
                size="sm"
                disabled={pages[orientation] === 3}
                onClick={() =>
                  setPages((current) => ({
                    ...current,
                    [orientation]: current[orientation] + 1,
                  }))
                }
              >
                Next
              </Button>
            </div>
            <p role="status" className="separator-demo-muted">
              Page {pages[orientation]} of 3
            </p>
          </div>
        ))}
      </div>
    </Example>
  );
}

function FormSections() {
  const [reminders, setReminders] = useState(true);
  const [method, setMethod] = useState("None yet");
  return (
    <Example
      title="Form sections"
      description="Separator with children centers short text on the line. Children that render nothing keep the same spacing."
    >
      <div className="separator-demo-forms">
        <form
          className="separator-demo-form"
          aria-label="Sign in"
          onSubmit={(event) => {
            event.preventDefault();
            setMethod("Email");
          }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => setMethod("Single sign-on")}
          >
            Continue with single sign-on
          </Button>
          <div className="separator-demo-spaced">
            <Separator>or</Separator>
          </div>
          <label className="separator-demo-field">
            <span>Email</span>
            <input
              type="email"
              placeholder="maya@example.com"
              autoComplete="off"
            />
          </label>
          <Button type="submit">Continue with email</Button>
          <p role="status" className="separator-demo-muted">
            Chosen: {method}
          </p>
        </form>
        <form
          className="separator-demo-form"
          aria-label="Profile"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="separator-demo-field">
            <span>Name</span>
            <input defaultValue="Maya Patel" />
          </label>
          <Separator>Preferences</Separator>
          <label className="separator-demo-check">
            <input
              type="checkbox"
              checked={reminders}
              onChange={(event) => setReminders(event.target.checked)}
            />
            <span>Enable reminders</span>
          </label>
          <Separator data-testid="plain-labeled">{false}</Separator>
          <Separator className="separator-demo-narrow">
            Notification preferences for every shared workspace
          </Separator>
        </form>
      </div>
    </Example>
  );
}

type Scenario = "ready" | "loading" | "empty";
const scenarios: { value: Scenario; label: string }[] = [
  { value: "ready", label: "Ready" },
  { value: "loading", label: "Loading" },
  { value: "empty", label: "Empty" },
];

const files = [
  { name: "Planting schedule.pdf", detail: "Updated today by Maya" },
  { name: "Seed order.csv", detail: "Updated yesterday by Leo" },
  {
    name: "Greenhouse watering rotation and volunteer handbook.docx",
    detail: "Updated last week by Priya",
  },
];

function ItemList() {
  const [scenario, setScenario] = useState<Scenario>("ready");
  return (
    <Example
      title="Item lists"
      description="Separators go between rows only, so loading and empty lists never show a stray line."
    >
      <div className="separator-demo-toolbar">
        <span>List state</span>
        <DocsSelect<Scenario>
          label="List state"
          value={scenario}
          onValueChange={setScenario}
          items={scenarios}
        />
      </div>
      <div className="separator-demo-list" aria-label="Files" role="list">
        {scenario === "empty" ? (
          <p role="listitem" className="separator-demo-muted">
            No files yet. Upload a file to share it with the workspace.
          </p>
        ) : scenario === "loading" ? (
          <div role="listitem" aria-busy="true">
            <span className="sr-only">Loading files</span>
            {[0, 1, 2].map((index) => (
              <div key={index}>
                {index > 0 && <Separator className="separator-demo-item-gap" />}
                <div className="separator-demo-skeleton" aria-hidden="true" />
              </div>
            ))}
          </div>
        ) : (
          files.map((file, index) => (
            <div key={file.name} role="listitem">
              {index > 0 && <Separator className="separator-demo-item-gap" />}
              <div className="separator-demo-item">
                <FileText size={16} aria-hidden="true" />
                <div className="separator-demo-item-text">
                  <p title={file.name}>{file.name}</p>
                  <p>{file.detail}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Example>
  );
}

function SidebarExample() {
  const [active, setActive] = useState("Profile");
  const item = (label: string, icon: ReactNode) => (
    <SidebarMenuItem>
      <SidebarMenuButton
        icon={icon}
        isActive={active === label}
        onClick={() => setActive(label)}
      >
        {label}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
  return (
    <Example
      title="Sidebar"
      description="SidebarSeparator insets the line to the menu edges."
    >
      <div className="separator-demo-sidebar">
        <SidebarProvider keyboardShortcut={false}>
          <Sidebar collapsible="none" label="Settings navigation">
            <SidebarContent>
              <SidebarGroup>
                <SidebarMenu>
                  {item("Back to workspace", <ArrowLeft />)}
                </SidebarMenu>
              </SidebarGroup>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Personal</SidebarGroupLabel>
                <SidebarMenu>
                  {item("Profile", <UserCircle />)}
                  {item("Notifications", <Bell />)}
                </SidebarMenu>
              </SidebarGroup>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                <SidebarMenu>{item("Members", <Users />)}</SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>{item("Preferences", <Settings />)}</SidebarMenu>
            </SidebarFooter>
          </Sidebar>
          <div className="separator-demo-sidebar-main">
            <p className="separator-demo-strong">{active}</p>
            <p className="separator-demo-muted">Settings page preview</p>
          </div>
        </SidebarProvider>
      </div>
    </Example>
  );
}

export default function SeparatorDemo() {
  return (
    <div id="separator-demo" className="separator-demo">
      <Orientations />
      <ButtonGroups />
      <FormSections />
      <ItemList />
      <SidebarExample />
    </div>
  );
}
