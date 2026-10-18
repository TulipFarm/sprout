import { useState, type ComponentType, type ReactNode } from "react";
import { Add } from "reicon-react/icons/Add";
import { BookOpen } from "reicon-react/icons/BookOpen";
import { BranchDown } from "reicon-react/icons/BranchDown";
import { ChatRound } from "reicon-react/icons/ChatRound";
import { Checklist } from "reicon-react/icons/Checklist";
import { Cpu } from "reicon-react/icons/Cpu";
import { Database } from "reicon-react/icons/Database";
import { Envelope } from "reicon-react/icons/Envelope";
import { Files } from "reicon-react/icons/Files";
import { Folder } from "reicon-react/icons/Folder";
import { FolderAdd } from "reicon-react/icons/FolderAdd";
import { People } from "reicon-react/icons/People";
import { Plug } from "reicon-react/icons/Plug";
import { ShieldUser } from "reicon-react/icons/ShieldUser";
import { Upload } from "reicon-react/icons/Upload";
import { User } from "reicon-react/icons/User";
import { Users } from "reicon-react/icons/Users";
import { Button } from "@tulipfarm/sprout/button";
import {
  AgentTasksSample,
  AgentsSample,
  ChatsSample,
  CreateInChatSample,
  FilesSample,
  GrantsSample,
  IntegrationsSample,
  InvitationsSample,
  MembersSample,
  ModelsSample,
  ProjectsSample,
  RecordsSample,
  SkillsSample,
  StatePanel,
  TablesSample,
  TeamsSample,
  WorkflowsSample,
} from "@tulipfarm/sprout/state-panel";
import { ToggleGroup, ToggleGroupItem } from "@tulipfarm/sprout/toggle-group";
import DocsSelect from "./DocsSelect";
import "../styles/state-panel-samples-demo.css";

type Icon = ComponentType<{ size?: number }>;

// Sample adapter: a table definition like the one the Rows page receives.
const suppliers = {
  label: "Suppliers",
  fields: ["Name", "Contact email", "Payment terms", "Region"],
};

const add = <Add size={16} aria-hidden="true" />;

interface Variant {
  label: string;
  heading?: "h2" | "h3";
  icon: Icon;
  title: string;
  description: string;
  sample?: ReactNode;
  actions?: ReactNode;
}

interface Scene {
  label: string;
  source: string;
  sample: string;
  parts: string;
  variants: readonly Variant[];
}

const scenes = {
  chats: {
    label: "Chats",
    source: "pages/workspace-chats.tsx",
    sample: "ChatsSample",
    parts: "List · icon tiles · Active and Archived tabs · muted times",
    variants: [
      {
        label: "Personal chats",
        icon: ChatRound,
        title: "No chats yet",
        description:
          "Ask about your customers, orders, or invoices in plain language. Every private conversation is saved here so you can pick it up later.",
        sample: <ChatsSample />,
        actions: <Button>{add}Start a chat</Button>,
      },
    ],
  },
  files: {
    label: "Files",
    source: "pages/files.tsx",
    sample: "FilesSample",
    parts: "List · folder tiles and file-type icons · two-part trail",
    variants: [
      {
        label: "My files",
        icon: Files,
        title: "No files yet",
        description:
          "Upload the documents your work depends on, like price lists, contracts, and policies. Files stay private until you share them.",
        sample: <FilesSample />,
        actions: (
          <>
            <Button>
              <Upload size={16} aria-hidden="true" />
              Upload
            </Button>
            <Button variant="outline">
              <FolderAdd size={16} aria-hidden="true" />
              New folder
            </Button>
          </>
        ),
      },
    ],
  },
  agents: {
    label: "Agents",
    source: "pages/agents.tsx",
    sample: "AgentsSample",
    parts: "List · small agent avatars · Active and Draft badges",
    variants: [
      {
        label: "No agents",
        icon: Users,
        title: "No agents yet",
        description:
          "Describe the agent's job in chat, or configure it manually above. Review its tools and access before activation.",
        sample: <AgentsSample />,
        actions: <Button>{add}Create in chat</Button>,
      },
    ],
  },
  projects: {
    label: "Projects",
    source: "pages/projects.tsx",
    sample: "ProjectsSample",
    parts: "Two grouped lists · text-only rows · one Archived badge",
    variants: [
      {
        label: "No projects",
        icon: Folder,
        title: "No projects yet",
        description:
          "Create a project for work that several people share, like a product launch. Add the people, files, and instructions every chat in it should use.",
        sample: <ProjectsSample />,
        actions: <Button>{add}New project</Button>,
      },
    ],
  },
  tasks: {
    label: "Agent tasks",
    source: "pages/agent-tasks.tsx",
    sample: "AgentTasksSample",
    parts: "List · agent avatars · Needs review, Completed, and Pending badges",
    variants: [
      {
        label: "No tasks",
        icon: Checklist,
        title: "No agent tasks yet",
        description:
          "Hand a piece of work to an activated agent and follow it here. You review every proposed row change before it runs.",
        sample: <AgentTasksSample />,
        actions: <Button>Choose an agent</Button>,
      },
    ],
  },
  skills: {
    label: "Skills",
    source: "pages/skills.tsx",
    sample: "SkillsSample",
    parts: "List · icon tiles · Workspace and Built-in tabs · review badges",
    variants: [
      {
        label: "Workspace skills",
        heading: "h3",
        icon: BookOpen,
        title: "No workspace skills yet",
        description:
          "Import a skill, or ask chat to make one for a task you repeat. Review it once to save and enable it privately.",
        sample: <SkillsSample />,
        actions: <Button>{add}Import skill</Button>,
      },
    ],
  },
  workflows: {
    label: "Workflows",
    source: "pages/workflows.tsx",
    sample: "WorkflowsSample",
    parts:
      "Table · wide, default, and narrow columns · marks · no sample when archived",
    variants: [
      {
        label: "Current",
        icon: BranchDown,
        title: "No workflows yet",
        description:
          "Describe the work in chat, review its diagram, then save and activate it.",
        sample: <WorkflowsSample />,
        actions: <Button variant="outline">New workflow</Button>,
      },
      {
        label: "Archived",
        icon: BranchDown,
        title: "No archived workflows",
        description: "Archived workflows keep their run history here.",
        actions: <Button variant="outline">Show current workflows</Button>,
      },
    ],
  },
  tables: {
    label: "Tables",
    source: "features/tables/tables.tsx",
    sample: "TablesSample",
    parts: "Table · one wide and two narrow columns · default-tone counts",
    variants: [
      {
        label: "No tables",
        icon: Database,
        title: "No tables yet",
        description:
          "A table holds one kind of business row, such as customers or invoices. Describe the fields in chat, and the table appears here after it is created. Ask an administrator if you need read access.",
        sample: <TablesSample />,
        actions: <Button>{add}Create table in chat</Button>,
      },
    ],
  },
  records: {
    label: "Rows",
    source: "features/tables/tables.tsx",
    sample: "RecordsSample",
    parts:
      "Table · columns from the first three field names · bar placeholders",
    variants: [
      {
        label: "Can add rows",
        heading: "h3",
        icon: Database,
        title: "No rows yet",
        description: `${suppliers.label} is ready for its first row. Add one here, or ask the assistant to add rows or import a file.`,
        sample: (
          <RecordsSample table={suppliers.label} fields={suppliers.fields} />
        ),
        actions: (
          <>
            <Button>{add}Add row</Button>
            <Button variant="outline">Add rows in chat</Button>
          </>
        ),
      },
      {
        label: "Chat only",
        heading: "h3",
        icon: Database,
        title: "No rows yet",
        description: `${suppliers.label} is ready for its first row. Ask the assistant to add rows or import a file. You review the exact changes before approval.`,
        sample: (
          <RecordsSample table={suppliers.label} fields={suppliers.fields} />
        ),
        actions: <Button>{add}Add rows in chat</Button>,
      },
    ],
  },
  create: {
    label: "Create in chat",
    source: "pages/tables.tsx",
    sample: "CreateInChatSample",
    parts: "Free content · request bubble · reply · nested schema table",
    variants: [
      {
        label: "Create table",
        icon: ChatRound,
        title: "Build tables in chat",
        description:
          "Describe the fields and changes you need to the built-in assistant. Review the exact schema and row effects in your chat before approving execution.",
        sample: <CreateInChatSample />,
        actions: (
          <Button>
            <ChatRound size={16} aria-hidden="true" />
            Create table in chat
          </Button>
        ),
      },
      {
        label: "Change fields",
        icon: ChatRound,
        title: "Build tables in chat",
        description:
          "Describe the fields and changes you need to the built-in assistant. Review the exact schema and row effects in your chat before approving execution.",
        sample: <CreateInChatSample />,
        actions: (
          <Button>
            <ChatRound size={16} aria-hidden="true" />
            Change fields in chat
          </Button>
        ),
      },
    ],
  },
  integrations: {
    label: "Integrations",
    source: "pages/integrations.tsx",
    sample: "IntegrationsSample",
    parts: "List · small brand icons · Connected and All tabs · warning badge",
    variants: [
      {
        label: "Nothing connected",
        heading: "h3",
        icon: Plug,
        title: "Nothing connected yet",
        description:
          "Connect the apps your team already uses, like Slack, Gmail, or GitHub. Agents can then read and act there, always within the access you approve.",
        sample: <IntegrationsSample />,
        actions: <Button>{add}Browse apps</Button>,
      },
    ],
  },
  models: {
    label: "Models",
    source: "pages/models.tsx",
    sample: "ModelsSample",
    parts: "List · model brand icons · Enabled and Off badges · no action",
    variants: [
      {
        label: "No models",
        icon: Cpu,
        title: "No models configured yet",
        description:
          "Once your operator configures model providers, each model family appears here. Admins then choose which teams can use it and pick a fallback if it becomes unavailable.",
        sample: <ModelsSample />,
      },
    ],
  },
  members: {
    label: "Members",
    source: "pages/member-administration.tsx",
    sample: "MembersSample",
    parts: "Table · Admin and Member badges · muted teams · no action",
    variants: [
      {
        label: "No members",
        icon: User,
        title: "No members yet",
        description:
          "Invite the people you work with. Each member gets a role, joins teams, and sees only what those teams can access.",
        sample: <MembersSample />,
      },
    ],
  },
  teams: {
    label: "Teams",
    source: "pages/team-administration.tsx",
    sample: "TeamsSample",
    parts: "List · medium marks · no trailing slot",
    variants: [
      {
        label: "No teams",
        icon: People,
        title: "No teams yet",
        description:
          "Create a team to collaborate and share access. A team manager can also add you to an existing team.",
        sample: <TeamsSample />,
        actions: <Button>{add}Create a team</Button>,
      },
    ],
  },
  invitations: {
    label: "Invitations",
    source: "pages/invitation-list.tsx",
    sample: "InvitationsSample",
    parts: "Table · link-tone emails · three-part trail",
    variants: [
      {
        label: "Admin",
        heading: "h3",
        icon: Envelope,
        title: "No invitations yet",
        description:
          "Send each teammate a personal link to join this workspace. You can track whether the email arrived, resend it, or revoke it here.",
        sample: <InvitationsSample />,
        actions: <Button>{add}Invite members</Button>,
      },
      {
        label: "Read only",
        heading: "h3",
        icon: Envelope,
        title: "No invitations yet",
        description:
          "Send each teammate a personal link to join this workspace. You can track whether the email arrived, resend it, or revoke it here.",
        sample: <InvitationsSample />,
      },
    ],
  },
  grants: {
    label: "Team grants",
    source: "pages/governance.tsx",
    sample: "GrantsSample",
    parts: "Table · Sales, Finance, and Support tabs · two narrow columns",
    variants: [
      {
        label: "No teams",
        heading: "h3",
        icon: ShieldUser,
        title: "No team grants yet",
        description:
          "Team grants give everyone in a team the same table access. Create a team to grant access to several people at once, or give one person access in Individual table grants below.",
        sample: <GrantsSample />,
        actions: (
          <Button>
            <People size={16} aria-hidden="true" />
            Go to Teams
          </Button>
        ),
      },
    ],
  },
} satisfies Record<string, Scene>;

type SceneName = keyof typeof scenes;
const sceneNames = Object.keys(scenes) as SceneName[];

function Panel({ variant }: { variant: Variant }) {
  return (
    <StatePanel
      kind="empty"
      heading={variant.heading ?? "h2"}
      icon={variant.icon}
      title={variant.title}
      description={variant.description}
      sample={variant.sample}
    >
      {variant.actions}
    </StatePanel>
  );
}

export function SamplePresetsPlayground() {
  const [name, setName] = useState<SceneName>("files");
  const [index, setIndex] = useState(0);
  const [frame, setFrame] = useState<"panel" | "window">("panel");
  const scene: Scene = scenes[name];
  const variant = scene.variants[index] ?? scene.variants[0]!;
  return (
    <section
      className="state-panel-samples-demo-playground"
      aria-label="Sample presets playground"
    >
      <div className="state-panel-samples-demo-toolbar">
        <label>
          Page
          <DocsSelect
            label="Page"
            value={name}
            items={sceneNames.map((value) => ({
              value,
              label: scenes[value].label,
            }))}
            onValueChange={(value) => {
              setName(value);
              setIndex(0);
            }}
          />
        </label>
        {scene.variants.length > 1 && (
          <ToggleGroup
            aria-label="State"
            variant="outline"
            size="sm"
            spacing={0}
            value={[String(index)]}
            onValueChange={(value) => {
              if (value[0]) setIndex(Number(value[0]));
            }}
          >
            {scene.variants.map((item, i) => (
              <ToggleGroupItem key={item.label} value={String(i)}>
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        <ToggleGroup
          aria-label="Frame"
          variant="outline"
          size="sm"
          spacing={0}
          value={[frame]}
          onValueChange={(value) => {
            if (value[0]) setFrame(value[0] as "panel" | "window");
          }}
        >
          <ToggleGroupItem value="panel">In a state panel</ToggleGroupItem>
          <ToggleGroupItem value="window">Window only</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div
        className="state-panel-samples-demo-stage"
        data-frame={frame}
        data-scene-stage={name}
      >
        {frame === "panel" ? (
          <Panel key={`${name}-${index}`} variant={variant} />
        ) : variant.sample ? (
          <div
            key={`${name}-${index}`}
            className="state-panel-samples-demo-window"
          >
            {variant.sample}
          </div>
        ) : (
          <p className="state-panel-samples-demo-none">
            This state has no sample. The panel shows only its icon, text, and
            action.
          </p>
        )}
      </div>
      <p className="state-panel-samples-demo-foot">
        <code>{`<${scene.sample} />`}</code> · {scene.parts} ·{" "}
        <span>{scene.source}</span>
      </p>
    </section>
  );
}

export function SamplePresetsGallery() {
  return (
    <div className="state-panel-samples-demo-gallery">
      {sceneNames.map((name) => {
        const scene: Scene = scenes[name];
        return (
          <figure
            key={name}
            className="state-panel-samples-demo-card"
            data-scene={name}
          >
            <figcaption>
              <strong>
                <code>{scene.sample}</code>
              </strong>
              <span>
                {scene.label} · {scene.source}
              </span>
            </figcaption>
            <div className="state-panel-samples-demo-window">
              {scene.variants[0]!.sample}
            </div>
          </figure>
        );
      })}
    </div>
  );
}

const fieldSets = [
  {
    name: "four",
    title: "Four fields, first three shown",
    table: "Suppliers",
    fields: ["Name", "Contact email", "Payment terms", "Region"],
  },
  {
    name: "two",
    title: "Two fields",
    table: "Support tickets",
    fields: ["Subject", "Priority"],
  },
  {
    name: "one",
    title: "One field",
    table: "Regions",
    fields: ["Region"],
  },
  {
    name: "none",
    title: "No fields, falls back to “Row”",
    table: "Untitled table",
    fields: [],
  },
] as const;

export function SamplePresetsRecords() {
  return (
    <div className="state-panel-samples-demo-gallery">
      {fieldSets.map((set) => (
        <figure
          key={set.name}
          className="state-panel-samples-demo-card"
          data-records={set.name}
        >
          <figcaption>
            <strong>{set.title}</strong>
            <span>
              table="{set.table}" · {set.fields.length} fields
            </span>
          </figcaption>
          <div className="state-panel-samples-demo-window">
            <RecordsSample table={set.table} fields={set.fields} />
          </div>
        </figure>
      ))}
    </div>
  );
}

export function SamplePresetsProps() {
  return (
    <div className="state-panel-samples-demo-gallery">
      <figure className="state-panel-samples-demo-card" data-props="label">
        <figcaption>
          <strong>Custom chip</strong>
          <span>label="Preview"</span>
        </figcaption>
        <div className="state-panel-samples-demo-window">
          <ModelsSample label="Preview" />
        </div>
      </figure>
      <figure className="state-panel-samples-demo-card" data-props="narrow">
        <figcaption>
          <strong>Narrow container</strong>
          <span>Long titles and crumbs truncate</span>
        </figcaption>
        <div className="state-panel-samples-demo-window state-panel-samples-demo-narrow">
          <RecordsSample
            table="Quarterly supplier performance review"
            fields={["Supplier name", "Primary contact email", "Payment terms"]}
          />
        </div>
      </figure>
    </div>
  );
}
