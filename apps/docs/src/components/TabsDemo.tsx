import { useId, useRef, useState, type ReactNode } from "react";
import { Add } from "reicon-react/icons/Add";
import { AlertCircle } from "reicon-react/icons/AlertCircle";
import { Calendar } from "reicon-react/icons/Calendar";
import { Check } from "reicon-react/icons/Check";
import { Cpu } from "reicon-react/icons/Cpu";
import { Message } from "reicon-react/icons/Message";
import { Scroll } from "reicon-react/icons/Scroll";
import { Search } from "reicon-react/icons/Search";
import { Setting } from "reicon-react/icons/Setting";
import { ShieldCheck } from "reicon-react/icons/ShieldCheck";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  tabsListVariantNames,
  type TabsListVariant,
} from "@tulipfarm/sprout/tabs";
import { AgentAvatar } from "@tulipfarm/sprout/avatar";
import { Badge, type BadgeVariant } from "@tulipfarm/sprout/badge";
import { Button } from "@tulipfarm/sprout/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@tulipfarm/sprout/popover";
import { StatePanel } from "@tulipfarm/sprout/state-panel";
import DocsSelect from "./DocsSelect";
import {
  CheckField,
  TextAreaField,
  TextField,
  useLater,
} from "./dialog-demo-parts";
import "../styles/tabs-demo.css";

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
    <section className="tabs-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="tabs-demo-card-body">{children}</div>
    </section>
  );
}

function Controls({ children }: { children: ReactNode }) {
  return <div className="tabs-demo-controls">{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Playground: Cloud's internal playground, one variant at a time      */
/* ------------------------------------------------------------------ */

const variantLabels: Record<TabsListVariant, string> = {
  default: "Default",
  line: "Line",
  steps: "Steps",
};

export function TabsHero() {
  const [variant, setVariant] = useState<TabsListVariant>("default");
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">(
    "horizontal",
  );
  return (
    <Example
      title="Tabs playground"
      description="Fictional project tabs. The third tab is disabled and has no panel."
    >
      <Controls>
        <DocsSelect
          label="Variant"
          value={variant}
          items={tabsListVariantNames.map((value) => ({
            value,
            label: variantLabels[value],
          }))}
          onValueChange={setVariant}
        />
        <DocsSelect
          label="Orientation"
          value={orientation}
          items={[
            { value: "horizontal", label: "Horizontal" },
            { value: "vertical", label: "Vertical" },
          ]}
          onValueChange={setOrientation}
        />
      </Controls>
      <div className="tabs-demo-stage">
        <Tabs defaultValue="overview" orientation={orientation}>
          <TabsList variant={variant} aria-label="Project">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="disabled" disabled>
              Disabled
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <p className="tabs-demo-panel-text">Fictional project overview.</p>
          </TabsContent>
          <TabsContent value="tasks">
            <p className="tabs-demo-panel-text">Three sample tasks.</p>
          </TabsContent>
        </Tabs>
      </div>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Default: workspace members settings                                 */
/* ------------------------------------------------------------------ */

const sampleMembers = [
  { name: "Priya Raman", email: "priya@meadow.example", role: "Admin" },
  { name: "Alex Meadow", email: "alex@meadow.example", role: "Member" },
  { name: "Robin Field", email: "robin@meadow.example", role: "Member" },
];

export function TabsMembers() {
  const [tab, setTab] = useState("members");
  const [invites, setInvites] = useState<string[]>([]);
  return (
    <Example
      title="Members settings"
      description="Default tabs with a count in the label. Both panels stay mounted."
    >
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (typeof value === "string") setTab(value);
        }}
      >
        <TabsList aria-label="Members settings">
          <TabsTrigger value="members">
            Members ({sampleMembers.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>
        <TabsContent value="members" keepMounted>
          <ul className="tabs-demo-list" aria-label="Members">
            {sampleMembers.map((member) => (
              <li key={member.email}>
                <span className="tabs-demo-list-main">
                  <span>{member.name}</span>
                  <span className="tabs-demo-muted">{member.email}</span>
                </span>
                <Badge
                  variant={member.role === "Admin" ? "default" : "secondary"}
                >
                  {member.role}
                </Badge>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="invitations" keepMounted>
          <div className="tabs-demo-stack">
            {invites.length ? (
              <ul className="tabs-demo-list" aria-label="Pending invitations">
                {invites.map((email) => (
                  <li key={email}>
                    <span className="tabs-demo-list-main">{email}</span>
                    <Badge variant="warning">Pending</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tabs-demo-muted">No pending invitations.</p>
            )}
            <div>
              <Button
                onClick={() =>
                  setInvites((current) => [
                    ...current,
                    `guest${current.length + 1}@meadow.example`,
                  ])
                }
              >
                <Add size={16} aria-hidden="true" />
                Invite members
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Line: model settings, controlled by the address                     */
/* ------------------------------------------------------------------ */

type ModelState = "ready" | "loading" | "empty" | "error";

const families = [
  {
    name: "Claude",
    teams: "Research, Support",
    status: "Available",
    tone: "success",
  },
  { name: "GPT", teams: "All teams", status: "Available", tone: "success" },
  {
    name: "Gemini",
    teams: "No teams yet",
    status: "Fallback: Claude",
    tone: "warning",
  },
] as const satisfies readonly {
  name: string;
  teams: string;
  status: string;
  tone: BadgeVariant;
}[];

export function TabsModels() {
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [state, setState] = useState<ModelState>("ready");
  const tab = search ?? "access";
  return (
    <Example
      title="Model settings"
      description="Line tabs read and write the address. Compaction stays empty until access loads."
    >
      <Controls>
        <DocsSelect
          label="Access state"
          value={state}
          items={[
            { value: "ready", label: "Ready" },
            { value: "loading", label: "Loading" },
            { value: "empty", label: "Empty" },
            { value: "error", label: "Error" },
          ]}
          onValueChange={setState}
        />
        <code className="tabs-demo-address" aria-label="Address">
          /meadow/models{search ? `?tab=${search}` : ""}
        </code>
      </Controls>
      <Tabs
        value={tab}
        onValueChange={(value) =>
          setSearch(value === "access" ? undefined : String(value))
        }
      >
        <div className="tabs-demo-scroll">
          <TabsList variant="line" aria-label="Model settings">
            <TabsTrigger value="access">Access</TabsTrigger>
            <TabsTrigger value="compaction">Compaction</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="access" keepMounted>
          <div className="tabs-demo-pt-2">
            {state === "ready" ? (
              <ul className="tabs-demo-list" aria-label="Model families">
                {families.map((family) => (
                  <li key={family.name}>
                    <span className="tabs-demo-list-main">
                      <span>{family.name}</span>
                      <span className="tabs-demo-muted">{family.teams}</span>
                    </span>
                    <Badge variant={family.tone}>{family.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : state === "loading" ? (
              <StatePanel
                kind="loading"
                heading="h4"
                title="Loading model access"
                description="Checking which teams can use each model family."
              />
            ) : state === "empty" ? (
              <StatePanel
                kind="empty"
                heading="h4"
                icon={Cpu}
                title="No models configured yet"
                description="Once your operator configures model providers, each model family appears here."
              />
            ) : (
              <StatePanel
                kind="error"
                heading="h4"
                title="Model access did not load"
                description="Nothing changed. Try again in a moment."
              >
                <Button variant="outline" onClick={() => setState("ready")}>
                  Try again
                </Button>
              </StatePanel>
            )}
          </div>
        </TabsContent>
        <TabsContent value="compaction" keepMounted>
          {state === "ready" && (
            <div className="tabs-demo-pt-2 tabs-demo-stack">
              <p>
                Summarize long conversations after 80% of the context window.
              </p>
              <p className="tabs-demo-muted">
                Applies to new tasks in every team. Earlier tasks keep their
                policy.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Steps: agent builder with a line-tab preview card                   */
/* ------------------------------------------------------------------ */

const builderSteps = [
  { id: "basics", label: "Basics" },
  { id: "skills", label: "Skills" },
  { id: "access", label: "Access" },
  { id: "triggers", label: "Triggers" },
  { id: "review", label: "Review" },
] as const;
type BuilderStep = (typeof builderSteps)[number]["id"];

const skillOptions = [
  "Weekly report",
  "Triage support inbox",
  "Draft release notes",
];
const actionOptions = ["Read tables", "Update rows", "Send Slack messages"];

export function TabsBuilder() {
  const id = useId();
  const [step, setStep] = useState<BuilderStep>("basics");
  const [previewTab, setPreviewTab] = useState<"summary" | "test">("summary");
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [slack, setSlack] = useState(false);
  const [checked, setChecked] = useState(false);
  const choose = (value: unknown) => {
    const next = builderSteps.find((item) => item.id === value);
    if (next) setStep(next.id);
  };
  const toggle = (list: string[], value: string, on: boolean) =>
    on ? [...list, value] : list.filter((item) => item !== value);
  const completed = new Set<BuilderStep>([
    ...(name.trim() ? (["basics"] as const) : []),
    ...(skills.length ? (["skills"] as const) : []),
    ...(actions.length ? (["access"] as const) : []),
    ...(slack ? (["triggers"] as const) : []),
  ]);
  const errors = new Set<BuilderStep>(
    checked && !name.trim() ? ["basics"] : [],
  );
  const index = builderSteps.findIndex((item) => item.id === step);
  const panels: Record<BuilderStep, ReactNode> = {
    basics: (
      <>
        <TextField
          id={`${id}-name`}
          label="Agent name"
          value={name}
          placeholder="Weekly report writer"
          aria-invalid={errors.has("basics") || undefined}
          onChange={(event) => setName(event.target.value)}
        />
        {errors.has("basics") && (
          <p className="tabs-demo-error">Name the agent before you continue.</p>
        )}
        <TextAreaField
          id={`${id}-instructions`}
          label="Instructions"
          value={instructions}
          rows={3}
          placeholder="Summarize last week's closed tasks for the team."
          onChange={(event) => setInstructions(event.target.value)}
        />
      </>
    ),
    skills: skillOptions.map((skill) => (
      <CheckField
        key={skill}
        id={`${id}-skill-${skill}`}
        checked={skills.includes(skill)}
        onChange={(on) => setSkills((list) => toggle(list, skill, on))}
      >
        {skill}
      </CheckField>
    )),
    access: actionOptions.map((action) => (
      <CheckField
        key={action}
        id={`${id}-action-${action}`}
        checked={actions.includes(action)}
        onChange={(on) => setActions((list) => toggle(list, action, on))}
      >
        {action}
      </CheckField>
    )),
    triggers: (
      <CheckField id={`${id}-slack`} checked={slack} onChange={setSlack}>
        Answer in #weekly-reports
      </CheckField>
    ),
    review: (
      <p className="tabs-demo-muted">
        Check the summary, then save. Nothing runs until you review and
        activate.
      </p>
    ),
  };
  const summary = (
    <ul className="tabs-demo-summary" aria-label="Draft summary">
      {(
        [
          {
            edit: "skills",
            Icon: Scroll,
            term: "Skills",
            value: skills.length
              ? `${skills.length} procedure${skills.length === 1 ? "" : "s"}`
              : "No skills selected",
          },
          {
            edit: "access",
            Icon: Setting,
            term: "Actions",
            value: actions.length
              ? `${actions.length} permitted action${actions.length === 1 ? "" : "s"}`
              : "No actions selected",
          },
          {
            edit: "basics",
            Icon: ShieldCheck,
            term: "Team placement",
            value: "Personal agent",
          },
          {
            edit: "triggers",
            Icon: Message,
            term: "Slack",
            value: slack ? "#weekly-reports" : "Not attached",
          },
          {
            edit: "triggers",
            Icon: Calendar,
            term: "Schedules",
            value: "Manual use only",
          },
        ] as const
      ).map(({ edit, Icon, term, value }) => (
        <li key={term}>
          <Icon size={16} aria-hidden="true" className="tabs-demo-muted" />
          <span className="tabs-demo-list-main">
            <span className="tabs-demo-muted">{term}</span>
            <span>{value}</span>
          </span>
          <Button
            variant="ghost"
            size="xs"
            aria-label={`Edit ${term.toLowerCase()}`}
            onClick={() => setStep(edit)}
          >
            Edit
          </Button>
        </li>
      ))}
    </ul>
  );
  return (
    <Example
      title="Agent setup"
      description="Steps tabs mark finished and invalid sections. Below 640px a select replaces them. Panels stay mounted, so drafts survive."
    >
      <div className="tabs-demo-builder">
        <div className="tabs-demo-builder-main">
          <Tabs value={step} onValueChange={choose}>
            <div className="tabs-demo-steps-wide">
              <TabsList variant="steps" aria-label="Agent setup sections">
                {builderSteps.map((item, position) => (
                  <TabsTrigger key={item.id} value={item.id}>
                    <span aria-hidden="true" className="tabs-demo-step-marker">
                      {errors.has(item.id) ? (
                        <AlertCircle className="size-4 tabs-demo-danger" />
                      ) : completed.has(item.id) ? (
                        <Check className="size-4" />
                      ) : (
                        position + 1
                      )}
                    </span>
                    {item.label}
                    {errors.has(item.id) && (
                      <span className="sr-only">, needs attention</span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="tabs-demo-steps-narrow">
              <DocsSelect
                label="Setup section"
                value={step}
                items={builderSteps.map((item, position) => ({
                  value: item.id,
                  label: `${position + 1}. ${item.label}`,
                }))}
                onValueChange={setStep}
              />
            </div>
            <form
              aria-label="Agent setup"
              className="tabs-demo-stack tabs-demo-gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                setChecked(true);
                if (!name.trim()) setStep("basics");
              }}
            >
              {builderSteps.map((item) => (
                <TabsContent key={item.id} value={item.id} keepMounted>
                  <div className="tabs-demo-stack tabs-demo-gap-4">
                    {panels[item.id]}
                  </div>
                </TabsContent>
              ))}
              <div className="tabs-demo-footer">
                <Button
                  type="button"
                  variant="outline"
                  disabled={index === 0}
                  onClick={() => setStep(builderSteps[index - 1]!.id)}
                >
                  Back
                </Button>
                {index < builderSteps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={() => setStep(builderSteps[index + 1]!.id)}
                  >
                    Next
                  </Button>
                ) : (
                  <Button type="submit">Save agent</Button>
                )}
              </div>
            </form>
          </Tabs>
        </div>
        <section aria-label="Draft agent" className="tabs-demo-preview">
          <div className="tabs-demo-preview-head">
            <AgentAvatar
              agentId="weekly-report"
              name={name.trim() || "New agent"}
              size="lg"
            />
            <span className="tabs-demo-list-main">
              <h4>{name.trim() || "Your new agent"}</h4>
              <span className="tabs-demo-muted">Personal agent</span>
            </span>
            <Badge variant="secondary">Draft</Badge>
          </div>
          <Tabs
            value={previewTab}
            onValueChange={(value) => {
              if (value === "summary" || value === "test") setPreviewTab(value);
            }}
          >
            <TabsList variant="line" aria-label="Agent views">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="test">Test chat</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" keepMounted>
              <div className="tabs-demo-pt-4">{summary}</div>
            </TabsContent>
            <TabsContent value="test" keepMounted>
              <div className="tabs-demo-pt-4">
                <TestChat />
              </div>
            </TabsContent>
          </Tabs>
          <p className="tabs-demo-preview-note">
            Nothing runs until you review and activate.
          </p>
        </section>
      </div>
    </Example>
  );
}

function TestChat() {
  const id = useId();
  const [draft, setDraft] = useState("");
  return (
    <div className="tabs-demo-stack">
      <p className="tabs-demo-muted">
        Try the draft with a private message. Nothing is sent.
      </p>
      <TextField
        id={`${id}-message`}
        label="Test message"
        value={draft}
        placeholder="What closed last week?"
        onChange={(event) => setDraft(event.target.value)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agent detail page: capability-filtered line tabs                    */
/* ------------------------------------------------------------------ */

type AgentTab =
  | "overview"
  | "instructions"
  | "access"
  | "execution"
  | "slack"
  | "schedules"
  | "settings";
type Role = "viewer" | "editor" | "manager";

const agentTabs: readonly {
  value: AgentTab;
  label: string;
  description: string;
  requires: "edit" | "manage" | "invoke" | null;
}[] = [
  {
    value: "overview",
    label: "Overview",
    description: "Check setup, then start a task with this agent.",
    requires: null,
  },
  {
    value: "instructions",
    label: "Instructions",
    description: "The role, model, skills, and actions this agent may use.",
    requires: "edit",
  },
  {
    value: "access",
    label: "Access",
    description:
      "Who can use or manage this agent, and whose team permissions it runs with.",
    requires: "manage",
  },
  {
    value: "execution",
    label: "Execution",
    description:
      "Turn execution on, limit the tables and Slack channels it may use, then activate the saved instructions.",
    requires: "manage",
  },
  {
    value: "slack",
    label: "Slack",
    description:
      "Attach this agent to a Slack channel so people can ask it there.",
    requires: "invoke",
  },
  {
    value: "schedules",
    label: "Triggers",
    description: "Choose how this agent starts, including repeating schedules.",
    requires: "manage",
  },
  {
    value: "settings",
    label: "Settings",
    description: "Technical details and deletion.",
    requires: null,
  },
];

const capabilities: Record<Role, readonly string[]> = {
  viewer: ["invoke"],
  editor: ["invoke", "edit"],
  manager: ["invoke", "edit", "manage"],
};

const panelBodies: Record<AgentTab, string> = {
  overview: "Weekly report writer is ready. Start a private task to try it.",
  instructions: "Summarize last week's closed tasks. Preferred model: Claude.",
  access: "Research team members can use this agent. Priya Raman manages it.",
  execution: "Execution is off. Two tables and one Slack channel are allowed.",
  slack: "Not attached to a Slack channel.",
  schedules: "Runs every Monday at 09:00.",
  settings: "Agent ID agt_8f21c. Deleting revokes every activation.",
};

export function TabsAgentPage() {
  const root = useRef<HTMLDivElement>(null);
  const [role, setRole] = useState<Role>("manager");
  const [tab, setTab] = useState<AgentTab>("overview");
  const tabs = agentTabs.filter(
    (item) =>
      item.requires === null || capabilities[role].includes(item.requires),
  );
  const active = tabs.some((item) => item.value === tab) ? tab : "overview";
  const open = (next: AgentTab) => {
    setTab(next);
    requestAnimationFrame(() =>
      root.current
        ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
        ?.focus(),
    );
  };
  return (
    <Example
      title="Agent page"
      description="Line tabs filtered by the person's capabilities. The list scrolls sideways on small screens."
    >
      <Controls>
        <DocsSelect
          label="Viewing as"
          value={role}
          items={[
            { value: "viewer", label: "Viewer" },
            { value: "editor", label: "Editor" },
            { value: "manager", label: "Manager" },
          ]}
          onValueChange={setRole}
        />
      </Controls>
      <div ref={root}>
        <Tabs
          value={active}
          onValueChange={(value) => {
            const next = tabs.find((item) => item.value === value);
            if (next) setTab(next.value);
          }}
        >
          <div className="tabs-demo-scroll">
            <TabsList variant="line" aria-label="Agent sections">
              {tabs.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {tabs.map((item) => (
            <TabsContent key={item.value} value={item.value} keepMounted>
              <div className="tabs-demo-stack tabs-demo-gap-4 tabs-demo-pt-2">
                <p className="tabs-demo-muted">{item.description}</p>
                <p>{panelBodies[item.value]}</p>
                {item.value === "overview" && role === "manager" && (
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => open("execution")}
                    >
                      Turn on execution
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Table search popover: line tabs in a panel, conditional tab         */
/* ------------------------------------------------------------------ */

type SearchMode = "text" | "ai" | "rsql";

export function TabsSearchPopover() {
  const id = useId();
  const later = useLater();
  const [searchable, setSearchable] = useState(true);
  const [mode, setMode] = useState<SearchMode | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState<string | undefined>(undefined);
  const [question, setQuestion] = useState("");
  const [translating, setTranslating] = useState(false);
  const [where, setWhere] = useState("status==open");
  const tab =
    mode === "text" && !searchable
      ? "rsql"
      : (mode ?? (searchable ? "text" : "rsql"));
  return (
    <Example
      title="Table search"
      description="Line tabs inside a panel popover. Tables without text fields hide the Text tab."
    >
      <Controls>
        <CheckField
          id={`${id}-searchable`}
          checked={searchable}
          onChange={setSearchable}
        >
          Table has text fields
        </CheckField>
      </Controls>
      <div>
        <Popover>
          <PopoverTrigger
            render={
              <Button variant={applied ? "secondary" : "outline"} size="sm" />
            }
          >
            <Search size={14} aria-hidden="true" />
            {applied ? (
              <span title={applied} className="tabs-demo-truncate">
                “{applied}”
              </span>
            ) : (
              "Search"
            )}
          </PopoverTrigger>
          <PopoverContent size="panel" align="start">
            <Tabs
              value={tab}
              onValueChange={(value) => setMode(value as SearchMode)}
            >
              <div className="tabs-demo-popover-tabs">
                <TabsList variant="line">
                  {searchable && <TabsTrigger value="text">Text</TabsTrigger>}
                  <TabsTrigger value="ai">Ask AI</TabsTrigger>
                  <TabsTrigger value="rsql">RSQL</TabsTrigger>
                </TabsList>
              </div>
              {searchable && (
                <TabsContent value="text">
                  <div className="tabs-demo-p-4 tabs-demo-stack">
                    <TextField
                      id={`${id}-search`}
                      label="Search rows"
                      value={search}
                      placeholder="Search text fields"
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setApplied(event.target.value.trim() || undefined);
                      }}
                    />
                    <p className="tabs-demo-muted">
                      Finds rows whose text fields contain these words. Filters
                      still apply.
                    </p>
                  </div>
                </TabsContent>
              )}
              <TabsContent value="ai">
                <div className="tabs-demo-p-4 tabs-demo-stack">
                  <TextAreaField
                    id={`${id}-ask`}
                    label="Describe the rows you want"
                    value={question}
                    rows={2}
                    placeholder="Open tickets from enterprise customers"
                    onChange={(event) => setQuestion(event.target.value)}
                  />
                  <div>
                    <Button
                      size="sm"
                      disabled={!question.trim() || translating}
                      aria-busy={translating || undefined}
                      onClick={() => {
                        setTranslating(true);
                        later(() => {
                          setTranslating(false);
                          setWhere("status==open;plan==enterprise");
                          setMode("rsql");
                        });
                      }}
                    >
                      {translating ? "Translating…" : "Translate to RSQL"}
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="rsql">
                <div className="tabs-demo-p-4 tabs-demo-stack">
                  <TextField
                    id={`${id}-rsql`}
                    label="RSQL filter"
                    value={where}
                    spellCheck={false}
                    onChange={(event) => setWhere(event.target.value)}
                  />
                  <p className="tabs-demo-muted">
                    Use field==value and join conditions with ; for AND.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>
      </div>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Variants side by side, each with its Cloud content                  */
/* ------------------------------------------------------------------ */

export function TabsVariants() {
  return (
    <div className="tabs-demo-variants" role="group" aria-label="Variants">
      <div
        className="tabs-demo-variant"
        role="group"
        aria-label="Default variant"
      >
        <span className="tabs-demo-label">default</span>
        <Tabs defaultValue="members">
          <TabsList aria-label="Members settings">
            <TabsTrigger value="members">Members (3)</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="tabs-demo-variant" role="group" aria-label="Line variant">
        <span className="tabs-demo-label">line</span>
        <Tabs defaultValue="summary">
          <TabsList variant="line" aria-label="Agent views">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="test">Test chat</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div
        className="tabs-demo-variant"
        role="group"
        aria-label="Steps variant"
      >
        <span className="tabs-demo-label">steps</span>
        <Tabs defaultValue="skills" className="tabs-demo-scroll">
          <TabsList
            variant="steps"
            aria-label="Agent setup sections"
            className="tabs-demo-steps-min"
          >
            {builderSteps.map((item, position) => (
              <TabsTrigger key={item.id} value={item.id}>
                <span aria-hidden="true" className="tabs-demo-step-marker">
                  {position === 0 ? <Check className="size-4" /> : position + 1}
                </span>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
