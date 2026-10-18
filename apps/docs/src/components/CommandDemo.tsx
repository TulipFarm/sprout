import { useEffect, useRef, useState, type ReactNode } from "react";
import { Add } from "reicon-react/icons/Add";
import { ArrowUp } from "reicon-react/icons/ArrowUp";
import { Calendar } from "reicon-react/icons/Calendar";
import { ChatRound } from "reicon-react/icons/ChatRound";
import { ChevronDown } from "reicon-react/icons/ChevronDown";
import { DocumentText } from "reicon-react/icons/DocumentText";
import { Flash } from "reicon-react/icons/Flash";
import { Folder } from "reicon-react/icons/Folder";
import { Home } from "reicon-react/icons/Home";
import { Lock } from "reicon-react/icons/Lock";
import { Monitor } from "reicon-react/icons/Monitor";
import { Moon } from "reicon-react/icons/Moon";
import { Plus } from "reicon-react/icons/Plus";
import { Search } from "reicon-react/icons/Search";
import { Setting2 } from "reicon-react/icons/Setting2";
import { Sparkle } from "reicon-react/icons/Sparkle";
import { Sun } from "reicon-react/icons/Sun";
import { UserAdd } from "reicon-react/icons/UserAdd";
import { BrandIcon, type Brand } from "@tulipfarm/sprout/brand-icon";
import { Button } from "@tulipfarm/sprout/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@tulipfarm/sprout/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@tulipfarm/sprout/popover";
import { ToggleGroup, ToggleGroupItem } from "@tulipfarm/sprout/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@tulipfarm/sprout/tooltip";
import { Example, Row, useLater } from "./dialog-demo-parts";
import "../styles/command-demo.css";

function Status({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="command-demo-status">
      {children}
    </p>
  );
}

function Choice<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <ToggleGroup<Value>
      aria-label={label}
      variant="outline"
      size="sm"
      spacing={0}
      value={[value]}
      onValueChange={(next) => {
        if (next[0]) onChange(next[0]);
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/* ------------------------------------------------------------------ */
/* Playground: inline command list (internal playground)              */
/* ------------------------------------------------------------------ */

export function CommandPlayground() {
  const [selected, setSelected] = useState("Nothing selected");
  return (
    <Example
      title="Command playground"
      description="Filter and select commands inline. Type to filter; arrow keys, Home, End, and Enter work from the search field."
    >
      <div className="command-demo-stage">
        <div className="command-demo-inline">
          <Command label="Search sample commands">
            <CommandInput placeholder="Search sample commands…" />
            <CommandList>
              <CommandEmpty>No matching commands.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                <CommandItem onSelect={() => setSelected("New draft")}>
                  <Plus size={16} aria-hidden="true" />
                  New draft
                  <CommandShortcut>⌘ N</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => setSelected("Open folder")}>
                  <Folder size={16} aria-hidden="true" />
                  Open folder
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Settings">
                <CommandItem onSelect={() => setSelected("Preferences")}>
                  <Setting2 size={16} aria-hidden="true" />
                  Preferences
                </CommandItem>
                <CommandItem disabled>Unavailable action</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </div>
      <Status>Chosen: {selected}</Status>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Command palette (CommandDialog)                                     */
/* ------------------------------------------------------------------ */

type Theme = "system" | "light" | "dark";

function Palette({
  open,
  onOpenChange,
  onRun,
  closeButton,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRun: (action: string) => void;
  closeButton?: boolean;
}) {
  const [theme, setTheme] = useState<Theme>("system");
  const run = (action: string) => {
    onRun(action);
    onOpenChange(false);
  };
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      showCloseButton={closeButton}
      title={closeButton ? "Workspace commands" : undefined}
      description={closeButton ? "Jump to a page or run an action." : undefined}
    >
      <Command label="Search commands">
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No commands found.</CommandEmpty>
          <CommandGroup heading="Go to">
            <CommandItem onSelect={() => run("Opened Home")}>
              <Home size={16} aria-hidden="true" />
              Home
              <CommandShortcut>G H</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => run("Opened Chats")}>
              <ChatRound size={16} aria-hidden="true" />
              Chats
              <CommandShortcut>G C</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => run("Opened Calendar")}
              keywords={["schedule", "events"]}
            >
              <Calendar size={16} aria-hidden="true" />
              Calendar
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Create">
            <CommandItem onSelect={() => run("Started a new chat")}>
              <Plus size={16} aria-hidden="true" />
              New chat
              <CommandShortcut>⌘ N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => run("Started a new project")}>
              <Folder size={16} aria-hidden="true" />
              New project
            </CommandItem>
            <CommandItem disabled>
              <UserAdd size={16} aria-hidden="true" />
              Invite teammate (admins only)
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Appearance">
            {(
              [
                ["system", "Match system", Monitor],
                ["light", "Light theme", Sun],
                ["dark", "Dark theme", Moon],
              ] as const
            ).map(([value, label, Icon]) => (
              <CommandItem
                key={value}
                data-checked={theme === value}
                onSelect={() => {
                  setTheme(value);
                  onRun(`Theme: ${label}`);
                }}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState<"default" | "close" | null>(null);
  const [last, setLast] = useState("Nothing run yet");
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => (current ? null : "default"));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <Example
      title="Command palette"
      description="CommandDialog pins a Command near the top of the screen. Its title and description are visually hidden; Escape closes it."
    >
      <Row label="Default" note="no close button · ⌘K or Ctrl+K toggles it">
        <Button variant="outline" size="sm" onClick={() => setOpen("default")}>
          <Search size={16} aria-hidden="true" />
          Search commands
          <kbd className="command-demo-kbd">⌘K</kbd>
        </Button>
      </Row>
      <Row
        label="With close button"
        note="showCloseButton · custom title and description"
      >
        <Button variant="outline" size="sm" onClick={() => setOpen("close")}>
          Open workspace commands
        </Button>
      </Row>
      <Status>Last command: {last}</Status>
      <Palette
        open={open === "default"}
        onOpenChange={(next) => setOpen(next ? "default" : null)}
        onRun={setLast}
      />
      <Palette
        closeButton
        open={open === "close"}
        onOpenChange={(next) => setOpen(next ? "close" : null)}
        onRun={setLast}
      />
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Composer pickers (popover menu and picker sizes)                    */
/* ------------------------------------------------------------------ */

interface Persona {
  id: string;
  kind: "mode" | "agent";
  label: string;
  description: string;
  icon: typeof Sparkle;
  tone?: string;
}

const modes: readonly Persona[] = [
  {
    id: "ask",
    kind: "mode",
    label: "Ask",
    description: "Answers from your workspace",
    icon: ChatRound,
    tone: "command-demo-tone-info",
  },
  {
    id: "research",
    kind: "mode",
    label: "Research",
    description: "Reads widely and cites every source",
    icon: Search,
    tone: "command-demo-tone-success",
  },
  {
    id: "quick",
    kind: "mode",
    label: "Quick",
    description: "Short answers, no tools",
    icon: Flash,
    tone: "command-demo-tone-warning",
  },
];
const agents: readonly Persona[] = [
  {
    id: "recruiter",
    kind: "agent",
    label: "Recruiting coordinator",
    description: "Schedules interviews and drafts offers",
    icon: Sparkle,
  },
  {
    id: "finance",
    kind: "agent",
    label: "Expense reviewer",
    description: "Checks receipts against the travel policy",
    icon: DocumentText,
  },
];
const personaKey = (persona: Persona) => `${persona.kind}:${persona.id}`;

function PersonaPicker() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Persona | null>(null);
  const selected = value ? personaKey(value) : null;
  const pick = (next: Persona) => {
    setValue(personaKey(next) === selected ? null : next);
    setOpen(false);
  };
  const Icon = value?.icon ?? Sparkle;
  const label = value?.label ?? "Mode";
  const item = (persona: Persona) => (
    <CommandItem
      key={persona.id}
      value={`${persona.label} ${persona.description}`}
      data-checked={selected === personaKey(persona)}
      onSelect={() => pick(persona)}
    >
      <span className={`command-demo-icon ${persona.tone ?? ""}`}>
        <persona.icon size={16} aria-hidden="true" />
      </span>
      <span className="command-demo-nowrap">{persona.label}</span>
      <span className="command-demo-truncate command-demo-muted">
        {persona.description}
      </span>
    </CommandItem>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Mode or agent: ${label}`}
          />
        }
      >
        <span className={`command-demo-icon ${value?.tone ?? ""}`}>
          <Icon size={16} aria-hidden="true" />
        </span>
        {label}
        <ChevronDown size={12} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent size="menu" side="top" align="start" sideOffset={8}>
        <Command>
          <CommandInput
            aria-label="Search modes and agents"
            placeholder="Search modes and agents…"
          />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup heading="Modes">{modes.map(item)}</CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Agents">{agents.map(item)}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const efforts = { low: "Low", medium: "Medium", high: "High" } as const;
type Effort = keyof typeof efforts;

const models: readonly {
  id: string;
  label: string;
  brand: Brand;
  efforts: readonly Effort[];
  disabled?: boolean;
  unavailableReason?: string;
}[] = [
  {
    id: "claude",
    label: "Claude Sonnet 4.5",
    brand: "claude",
    efforts: ["low", "medium", "high"],
  },
  { id: "gpt", label: "GPT-5 mini", brand: "openai", efforts: [] },
  {
    id: "deepseek",
    label: "DeepSeek R2",
    brand: "deepseek",
    efforts: ["low", "high"],
  },
  {
    id: "grok",
    label: "Grok 4",
    brand: "grok",
    efforts: [],
    disabled: true,
    unavailableReason: "needs an admin to enable",
  },
];

function ModelPicker() {
  const [open, setOpen] = useState(false);
  const [modelId, setModelId] = useState("claude");
  const [effort, setEffort] = useState<Effort>("medium");
  const model = models.find((candidate) => candidate.id === modelId)!;
  const showEffort = model.efforts.length > 0;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Model: ${model.label}${showEffort ? `, ${efforts[effort]} effort` : ""}`}
                />
              }
            />
          }
        >
          <BrandIcon brand={model.brand} size="inline" />
          <span className="command-demo-truncate command-demo-max-32">
            {model.label}
          </span>
          <ChevronDown size={12} aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>AI model that writes replies</TooltipContent>
      </Tooltip>
      <PopoverContent size="picker" side="top" align="end" sideOffset={8}>
        <Command>
          <CommandInput
            aria-label="Search models"
            placeholder="Search models…"
          />
          <CommandList>
            <CommandEmpty>No models found.</CommandEmpty>
            <CommandGroup heading="Model">
              {models.map((candidate) => (
                <CommandItem
                  key={candidate.id}
                  value={candidate.label}
                  data-checked={candidate.id === modelId}
                  disabled={!!candidate.disabled}
                  onSelect={() => {
                    setModelId(candidate.id);
                    if (
                      candidate.efforts.length &&
                      !candidate.efforts.includes(effort)
                    )
                      setEffort(candidate.efforts.at(-1)!);
                    if (!candidate.efforts.length) setOpen(false);
                  }}
                >
                  <BrandIcon brand={candidate.brand} size="inline" />
                  <span>
                    {candidate.label}
                    {candidate.disabled
                      ? ` (${candidate.unavailableReason ?? "unavailable"})`
                      : ""}
                  </span>
                  {candidate.id === modelId && (
                    <span className="command-demo-sr-only">Current model</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {showEffort && (
          <div className="command-demo-effort">
            <div className="command-demo-effort-head">
              <span className="command-demo-muted">Effort</span>
              <span className="command-demo-strong">{efforts[effort]}</span>
            </div>
            <Choice
              label={`${model.label} reasoning effort`}
              value={effort}
              onChange={setEffort}
              options={model.efforts.map((level) => ({
                value: level,
                label: efforts[level],
              }))}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function CommandComposer() {
  return (
    <Example
      title="Composer pickers"
      description="A Command inside a menu-size (24rem) and a picker-size (18rem) popover above the chat composer. The trailing check marks the current choice."
    >
      <Row
        label="Mode or agent"
        note="menu · two headed groups and a separator · label with a truncated description"
      >
        <span className="command-demo-hint">
          Pick the same one again to clear it.
        </span>
      </Row>
      <Row
        label="Model"
        note="picker · brand logos · disabled with a reason · effort footer below the list"
      >
        <span className="command-demo-hint">
          Models with effort levels keep the picker open.
        </span>
      </Row>
      <div
        className="command-demo-composer"
        role="group"
        aria-label="Sample message composer"
      >
        <p className="command-demo-muted">Ask about your workspace…</p>
        <div className="command-demo-composer-bar">
          <PersonaPicker />
          <span className="command-demo-spacer" />
          <ModelPicker />
          <Button size="icon-sm" aria-label="Send message" disabled>
            <ArrowUp size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Project scope picker                                                */
/* ------------------------------------------------------------------ */

interface Project {
  id: string;
  name: string;
  archived?: boolean;
}

const sampleProjects: readonly Project[] = [
  { id: "prj_lisbon", name: "Lisbon office launch" },
  { id: "prj_hiring", name: "Q4 hiring plan" },
  { id: "prj_vendor", name: "Vendor renewals" },
  {
    id: "prj_archive",
    name: "Customer research archive 2024 — interviews, surveys, and synthesis",
    archived: true,
  },
];

type ListState = "ready" | "loading" | "failed" | "stale" | "none";

interface ProjectScopeProps {
  label: string;
  appearance: "field" | "badge" | "private";
  state: ListState;
  refreshing: boolean;
  onRetry: () => void;
  onNewProject?: () => void;
  includeArchived?: boolean;
  disabled?: boolean;
  initial?: string | null;
}

function ProjectScope({
  label,
  appearance,
  state,
  refreshing,
  onRetry,
  onNewProject,
  includeArchived = false,
  disabled = false,
  initial = null,
}: ProjectScopeProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [value, setValue] = useState<string | null>(initial);
  const searchInput = useRef<HTMLInputElement>(null);
  const projects = state === "ready" || state === "stale" ? sampleProjects : [];
  const choices = projects.filter(
    (project) => includeArchived || !project.archived || project.id === value,
  );
  const selected = projects.find((project) => project.id === value);
  const name = value
    ? selected
      ? `${selected.name}${selected.archived ? " (archived)" : ""}`
      : state === "loading"
        ? "Loading project…"
        : "Project unavailable"
    : "Personal chats";
  const badge = appearance !== "field";
  const privateBadge = appearance === "private" && !value;
  const failed = state === "failed" || state === "stale";
  const Icon = value ? Folder : Lock;
  const pick = (projectId: string | null) => {
    setOpen(false);
    setValue(projectId);
  };
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant={privateBadge ? "ghost" : badge ? "scope" : "outline"}
            size={badge ? "badge" : "default"}
            aria-label={`${label}: ${name}`}
            title={
              privateBadge
                ? "Personal chat. Choose a project to share it."
                : name
            }
            disabled={disabled}
          />
        }
      >
        <Icon size={16} aria-hidden="true" />
        <span className="command-demo-truncate">
          {privateBadge ? "Personal chat" : name}
        </span>
        <ChevronDown size={12} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        size="picker"
        side={badge ? "top" : "bottom"}
        align="start"
        sideOffset={8}
      >
        <Command>
          <CommandInput
            ref={searchInput}
            aria-label="Search projects"
            placeholder="Search projects…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList aria-label="Chat projects">
            {(state === "ready" || state === "none") && (
              <CommandEmpty>
                <span>No matching projects.</span>
                <div className="command-demo-empty-action">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      searchInput.current?.focus();
                    }}
                  >
                    Clear search
                  </Button>
                </div>
              </CommandEmpty>
            )}
            <CommandGroup>
              <CommandItem
                value="private"
                keywords={["Personal chats"]}
                data-checked={!value}
                onSelect={() => pick(null)}
              >
                <Lock size={16} aria-hidden="true" />
                Personal chats
              </CommandItem>
            </CommandGroup>
            {choices.length > 0 && (
              <CommandGroup heading="Projects">
                {choices.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={project.id}
                    keywords={[project.name]}
                    data-checked={project.id === value}
                    onSelect={() => pick(project.id)}
                  >
                    <Folder size={16} aria-hidden="true" />
                    <span className="command-demo-break">
                      {project.name}
                      {project.archived ? " (archived)" : ""}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          {state === "loading" && (
            <p role="status" className="command-demo-note command-demo-muted">
              Loading projects…
            </p>
          )}
          {failed && (
            <div className="command-demo-note command-demo-stack">
              <p role="alert" className="command-demo-error">
                Could not load projects.
                {projects.length > 0
                  ? " Showing the last loaded projects."
                  : ""}
              </p>
              <div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={refreshing}
                  onClick={onRetry}
                >
                  Retry loading projects
                </Button>
              </div>
            </div>
          )}
          {state === "none" && !search && (
            <p className="command-demo-note command-demo-muted">
              No active projects yet. Create one for shared chats.
            </p>
          )}
        </Command>
        {onNewProject && (
          <div className="command-demo-footer">
            <Button
              type="button"
              variant="ghost"
              size="nav"
              onClick={() => {
                setOpen(false);
                onNewProject();
              }}
            >
              <Add size={16} aria-hidden="true" />
              New project
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function CommandProjects() {
  const [state, setState] = useState<ListState>("ready");
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("No action yet");
  const later = useLater();
  const retry = () => {
    setRefreshing(true);
    later(() => {
      setRefreshing(false);
      setState("ready");
    }, 700);
  };
  const shared = { state, refreshing, onRetry: retry };
  return (
    <Example
      title="Project scope"
      description="A picker-size Command with a controlled search, an unlabeled first group, ids as values with names as keywords, and a recovery action when nothing matches."
    >
      <Row
        label="Chat project"
        note="outline field opens below · scope and ghost badges open above"
      >
        <div className="command-demo-triggers">
          <ProjectScope
            {...shared}
            label="Project"
            appearance="field"
            includeArchived
            onNewProject={() =>
              setMessage("New project: the create dialog would open here.")
            }
          />
          <ProjectScope
            {...shared}
            label="Chat project"
            appearance="badge"
            initial="prj_hiring"
          />
          <ProjectScope {...shared} label="Chat project" appearance="private" />
        </div>
      </Row>
      <Row label="Disabled" note="while a reply is streaming">
        <ProjectScope
          {...shared}
          label="Locked project"
          appearance="field"
          disabled
        />
      </Row>
      <Row
        label="Project list state"
        note="ready · loading · failed · refresh failed with last loaded projects · no projects"
      >
        <Choice
          label="Project list state"
          value={state}
          onChange={setState}
          options={[
            { value: "ready", label: "Ready" },
            { value: "loading", label: "Loading" },
            { value: "failed", label: "Failed" },
            { value: "stale", label: "Refresh failed" },
            { value: "none", label: "No projects" },
          ]}
        />
      </Row>
      <Status>{message}</Status>
    </Example>
  );
}
