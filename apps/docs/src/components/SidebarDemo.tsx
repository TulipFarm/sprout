import { useEffect, useState } from "react";
import { ArrowLeft as ArrowLeftIcon } from "reicon-react/icons/ArrowLeft";
import { Bell as BellIcon } from "reicon-react/icons/Bell";
import { ChevronRight as ChevronRightIcon } from "reicon-react/icons/ChevronRight";
import { FileText as FileTextIcon } from "reicon-react/icons/FileText";
import { Folder as FolderIcon } from "reicon-react/icons/Folder";
import { Home as HomeIcon } from "reicon-react/icons/Home";
import { Search3 as SearchIcon } from "reicon-react/icons/Search3";
import { SidebarLeft as SidebarIcon } from "reicon-react/icons/SidebarLeft";
import { Settings as SettingsIcon } from "reicon-react/icons/Settings";
import { Users as UsersIcon } from "reicon-react/icons/Users";
import { UserCircle as UserCircleIcon } from "reicon-react/icons/UserCircle";
import { Grid as GridIcon } from "reicon-react/icons/Grid";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSection,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@tulipfarm/sprout/sidebar";
import "../styles/sidebar-demo.css";
import DocsSelect from "./DocsSelect";
import WorkspaceSwitcher, { type Workspace } from "./WorkspaceSwitcher";

type Scenario = "ready" | "loading" | "empty" | "error" | "long";
const scenarios: { value: Scenario; label: string }[] = [
  { value: "ready", label: "Ready" },
  { value: "loading", label: "Loading" },
  { value: "empty", label: "Empty" },
  { value: "error", label: "Error" },
  { value: "long", label: "Long names" },
];
const projects = ["Website refresh", "Autumn launch", "Customer research"];
const storageKey = "sprout-sidebar-preview-open";
const initialWorkspaces: Workspace[] = [
  { id: "studio", name: "Studio workspace", plan: "Team plan", icon: "team" },
  {
    id: "personal",
    name: "Personal workspace",
    plan: "Personal plan",
    icon: "personal",
  },
];

export default function SidebarDemo() {
  const [open, setOpen] = useState(true);
  const [storageError, setStorageError] = useState("");
  const [scenario, setScenario] = useState<Scenario>("ready");
  const [settings, setSettings] = useState(false);
  const [side, setSide] = useState<"left" | "right">("left");
  const [collapsible, setCollapsible] = useState<"icon" | "offcanvas" | "none">(
    "icon",
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "true" || saved === "false") setOpen(saved === "true");
    } catch (error) {
      console.warn("Could not restore the sidebar preview preference.", error);
      setStorageError("Your browser could not restore the sidebar preference.");
    }
  }, []);

  function updateOpen(value: boolean) {
    setOpen(value);
    try {
      localStorage.setItem(storageKey, String(value));
      setStorageError("");
    } catch (error) {
      console.warn("Could not save the sidebar preview preference.", error);
      setStorageError(
        "The sidebar works, but your browser could not save its preference.",
      );
    }
  }

  return (
    <section
      className="sidebar-demo"
      aria-label="Sidebar playground"
      id="sidebar-demo"
    >
      <div className="sidebar-demo-toolbar">
        <div className="sidebar-demo-tabs" aria-label="Navigation example">
          <button
            type="button"
            aria-pressed={!settings}
            onClick={() => setSettings(false)}
          >
            Workspace
          </button>
          <button
            type="button"
            aria-pressed={settings}
            onClick={() => setSettings(true)}
          >
            Settings
          </button>
        </div>
        <div className="sidebar-demo-options">
          <label>
            State
            <DocsSelect<Scenario>
              label="Example state"
              value={scenario}
              onValueChange={setScenario}
              items={scenarios}
            />
          </label>
          <label>
            Collapse
            <DocsSelect<"icon" | "offcanvas" | "none">
              label="Collapse behavior"
              value={collapsible}
              onValueChange={(value) => {
                setCollapsible(value);
                setOpen(true);
              }}
              items={[
                { value: "icon", label: "Icons" },
                { value: "offcanvas", label: "Hidden" },
                { value: "none", label: "Never" },
              ]}
            />
          </label>
          <label>
            Side
            <DocsSelect<"left" | "right">
              label="Sidebar side"
              value={side}
              onValueChange={setSide}
              items={[
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ]}
            />
          </label>
        </div>
      </div>
      <SidebarProvider
        open={open}
        onOpenChange={updateOpen}
        keyboardShortcut={collapsible !== "none"}
        className="sidebar-demo-frame"
      >
        <DemoNavigation
          settings={settings}
          setSettings={setSettings}
          scenario={scenario}
          retry={() => setScenario("ready")}
          side={side}
          collapsible={collapsible}
        />
      </SidebarProvider>
      <div className="sidebar-demo-caption">
        <span>Real navigation. Sample content.</span>
        <a href="/components/sidebar/">Sidebar documentation</a>
      </div>
      {storageError && (
        <p className="sidebar-demo-storage-error" role="alert">
          {storageError}
        </p>
      )}
    </section>
  );
}

function DemoNavigation({
  settings,
  setSettings,
  scenario,
  retry,
  side,
  collapsible,
}: {
  settings: boolean;
  setSettings: (value: boolean) => void;
  scenario: Scenario;
  retry: () => void;
  side: "left" | "right";
  collapsible: "icon" | "offcanvas" | "none";
}) {
  const { setOpenMobile } = useSidebar();
  const [active, setActive] = useState("Overview");
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [workspace, setWorkspace] = useState(initialWorkspaces[0]);
  const [query, setQuery] = useState("");
  const [projectsOpen, setProjectsOpen] = useState(true);

  function navigate(page: string) {
    setActive(page);
    setOpenMobile(false);
  }

  function navItem(label: string, icon: React.ReactNode, disabled = false) {
    return (
      <SidebarMenuItem key={label}>
        <SidebarMenuButton
          icon={icon}
          isActive={active === label}
          disabled={disabled}
          nativeButton={false}
          render={<a href="#sidebar-demo" />}
          onClick={(event) => {
            event.preventDefault();
            navigate(label);
          }}
          badge={label === "Inbox" ? "4" : undefined}
        >
          {label}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const panel = (
    <Sidebar side={side} collapsible={collapsible} label="Workspace navigation">
      <SidebarHeader>
        <WorkspaceSwitcher
          workspace={workspace}
          workspaces={workspaces}
          side={side}
          onSelect={(value) => {
            setWorkspace(value);
            setActive("Overview");
          }}
          onCreate={(name) => {
            const next: Workspace = {
              id: crypto.randomUUID(),
              name,
              plan: "Preview workspace",
              icon: "team",
            };
            setWorkspaces((current) => [...current, next]);
            setWorkspace(next);
            setActive("Overview");
          }}
        />
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label={settings ? "Settings navigation" : "Workspace pages"}>
          {settings ? (
            <>
              <SidebarGroup>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      icon={<ArrowLeftIcon />}
                      onClick={() => {
                        setSettings(false);
                        navigate("Overview");
                      }}
                    >
                      Back to workspace
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Personal</SidebarGroupLabel>
                <SidebarMenu>
                  {navItem("Profile", <UserCircleIcon />)}
                  {navItem("Notifications", <BellIcon />)}
                </SidebarMenu>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                <SidebarMenu>
                  {navItem("General", <SettingsIcon />)}
                  {navItem("Members", <UsersIcon />)}
                </SidebarMenu>
              </SidebarGroup>
            </>
          ) : (
            <>
              <SidebarGroup>
                <div className="sidebar-demo-search">
                  <SearchIcon size={16} aria-hidden="true" />
                  <label className="sr-only" htmlFor="sidebar-demo-filter">
                    Filter navigation
                  </label>
                  <input
                    id="sidebar-demo-filter"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Find a page..."
                  />
                </div>
                <SidebarMenu>
                  {["Overview", "Inbox"]
                    .filter((label) =>
                      label.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((label) =>
                      navItem(
                        label,
                        label === "Overview" ? <HomeIcon /> : <BellIcon />,
                      ),
                    )}
                </SidebarMenu>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                <SidebarMenu>
                  {"projects".includes(query.toLowerCase()) && (
                    <SidebarSection
                      label="Projects"
                      icon={<FolderIcon />}
                      open={projectsOpen}
                      onOpenChange={setProjectsOpen}
                      isActive={active === "Projects"}
                      nativeButton={false}
                      render={<a href="#sidebar-demo" />}
                      onClick={(event) => {
                        event.preventDefault();
                        navigate("Projects");
                      }}
                    >
                      {scenario === "loading" ? (
                        <SidebarMenuSubItem>
                          <div
                            role="status"
                            aria-label="Loading recent projects"
                          >
                            <span className="sr-only">
                              Loading recent projects
                            </span>
                            <SidebarMenuSkeleton />
                            <SidebarMenuSkeleton />
                            <SidebarMenuSkeleton />
                          </div>
                        </SidebarMenuSubItem>
                      ) : scenario === "empty" ? (
                        <SidebarMenuSubItem>
                          <p className="sidebar-demo-message">
                            No projects yet. Open Projects to get started.
                          </p>
                        </SidebarMenuSubItem>
                      ) : scenario === "error" ? (
                        <SidebarMenuSubItem>
                          <p role="alert" className="sidebar-demo-message">
                            Could not load projects.
                          </p>
                          <button
                            type="button"
                            className="sidebar-demo-retry"
                            onClick={retry}
                          >
                            Try again
                          </button>
                        </SidebarMenuSubItem>
                      ) : (
                        projects.map((name, index) => {
                          const label =
                            scenario === "long" && index === 0
                              ? "Website refresh and the complete design system documentation"
                              : name;
                          return (
                            <SidebarMenuSubItem key={name}>
                              <SidebarMenuSubButton
                                nativeButton={false}
                                render={<a href="#sidebar-demo" />}
                                isActive={active === label}
                                title={label}
                                onClick={(event) => {
                                  event.preventDefault();
                                  navigate(label);
                                }}
                              >
                                {label}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })
                      )}
                    </SidebarSection>
                  )}
                  {"files".includes(query.toLowerCase()) &&
                    navItem("Files", <FileTextIcon />)}
                  {"members".includes(query.toLowerCase()) &&
                    navItem("Members", <UsersIcon />)}
                  {"integrations".includes(query.toLowerCase()) &&
                    navItem("Integrations", <GridIcon />, true)}
                </SidebarMenu>
                {![
                  "overview",
                  "inbox",
                  "projects",
                  "files",
                  "members",
                  "integrations",
                ].some((name) => name.includes(query.toLowerCase())) && (
                  <p role="status" className="sidebar-demo-message">
                    No matching pages.
                  </p>
                )}
              </SidebarGroup>
            </>
          )}
        </nav>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              icon={<SettingsIcon />}
              isActive={settings}
              onClick={() => {
                setSettings(!settings);
                navigate(settings ? "Overview" : "General");
              }}
            >
              Settings
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              icon={<UserCircleIcon />}
              onClick={() => {
                setSettings(true);
                navigate("Profile");
              }}
            >
              Your account
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
  return (
    <>
      {side === "left" && panel}
      <div className="sidebar-demo-main">
        <header className="sidebar-demo-page-header">
          {collapsible !== "none" && (
            <SidebarTrigger>
              <SidebarIcon size={18} aria-hidden="true" />
            </SidebarTrigger>
          )}
          <span className="sidebar-demo-breadcrumb">
            {workspace.name}
            <ChevronRightIcon size={12} aria-hidden="true" />
            <span>{settings ? "Settings" : active}</span>
          </span>
          <span className="sidebar-demo-preview-label">Preview</span>
        </header>
        <section
          className="sidebar-demo-page-content"
          aria-label="Selected page"
          aria-live="polite"
        >
          <div className="sidebar-demo-page-symbol" aria-hidden="true">
            {settings ? <SettingsIcon size={26} /> : <FolderIcon size={26} />}
          </div>
          <p className="sidebar-demo-selected">{workspace.name}</p>
          <h2>{active}</h2>
          <p>
            One place to find your way.
            <br />
            Try a page, open a group, or collapse the sidebar.
          </p>
          <a href="/components/sidebar/" className="sidebar-demo-usage-link">
            Explore the Sidebar API{" "}
            <ChevronRightIcon size={14} aria-hidden="true" />
          </a>
        </section>
        <div className="sidebar-demo-page-footer">
          <span>Your content goes here.</span>
          <span className="sidebar-demo-shortcut">
            <kbd>⌘ / Ctrl B</kbd> Toggle sidebar
          </span>
        </div>
      </div>
      {side === "right" && panel}
    </>
  );
}
