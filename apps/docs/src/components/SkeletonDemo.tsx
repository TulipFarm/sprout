import { useState, type CSSProperties, type ReactNode } from "react";
import { Calendar } from "reicon-react/icons/Calendar";
import { Chat } from "reicon-react/icons/Chat";
import { Edit } from "reicon-react/icons/Edit";
import { Folder } from "reicon-react/icons/Folder";
import { Home } from "reicon-react/icons/Home";
import { Inbox } from "reicon-react/icons/Inbox";
import { Trash } from "reicon-react/icons/Trash";
import { Button } from "@tulipfarm/sprout/button";
import {
  Skeleton,
  SkeletonGroup,
  skeletonShapeNames,
  type SkeletonShape,
} from "@tulipfarm/sprout/skeleton";
import { StatePanel } from "@tulipfarm/sprout/state-panel";
import { Switch } from "@tulipfarm/sprout/switch";
import { ToggleGroup, ToggleGroupItem } from "@tulipfarm/sprout/toggle-group";
import "../styles/skeleton-demo.css";

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
    <section className="skeleton-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="skeleton-demo-card-body">{children}</div>
    </section>
  );
}

const shapeNotes: Record<SkeletonShape, { size: string; usedFor: string }> = {
  line: {
    size: "16px tall, full width",
    usedFor: "Chat, file, and project rows",
  },
  title: {
    size: "24px tall, two thirds wide",
    usedFor: "Plan and canvas headings",
  },
  avatar: { size: "32px circle", usedFor: "Member and account pictures" },
  panel: {
    size: "128px tall, full width",
    usedFor: "Workflow diagrams and invitations",
  },
  checkbox: { size: "16px box", usedFor: "Table row selection" },
  action: { size: "28px square", usedFor: "Row edit and delete buttons" },
};

function Shapes() {
  return (
    <Example
      title="Shapes"
      description="Six footprints, each the size of the content it stands in for. Line is the default."
    >
      <div className="skeleton-demo-shapes">
        {skeletonShapeNames.map((shape) => (
          <div
            key={shape}
            className="skeleton-demo-shape"
            data-testid={`shape-${shape}`}
          >
            <div className="skeleton-demo-shape-text">
              <code>{`shape="${shape}"`}</code>
              <span>
                {shapeNotes[shape].size}. {shapeNotes[shape].usedFor}.
              </span>
            </div>
            <div className="skeleton-demo-shape-preview">
              <Skeleton shape={shape} />
            </div>
          </div>
        ))}
      </div>
    </Example>
  );
}

function Lists() {
  return (
    <Example
      title="Loading lists"
      description="SkeletonGroup is a status region. Its label names what is loading and is read as hidden text. Gap is 8, 12, or 16px."
    >
      <div className="skeleton-demo-grid">
        <div className="skeleton-demo-pane" data-testid="gap-sm">
          <code>{`gap="sm"`}</code>
          <SkeletonGroup label="Checking what will be deleted" gap="sm">
            <Skeleton />
            <Skeleton />
          </SkeletonGroup>
        </div>
        <div className="skeleton-demo-pane" data-testid="gap-md">
          <code>{`gap="md"`}</code>
          <SkeletonGroup label="Loading access" className="skeleton-demo-py">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </SkeletonGroup>
        </div>
        <div className="skeleton-demo-pane" data-testid="gap-lg">
          <code>{`gap="lg"`}</code>
          <SkeletonGroup label="Loading Google Drive files" gap="lg">
            <Skeleton />
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </SkeletonGroup>
        </div>
      </div>
    </Example>
  );
}

function Canvases() {
  return (
    <Example
      title="Canvases and details"
      description="Title, line, and panel shapes build the outline of a canvas or a diagram before it loads."
    >
      <div className="skeleton-demo-grid">
        <div className="skeleton-demo-pane">
          <span className="skeleton-demo-caption">Plan</span>
          <SkeletonGroup label="Loading Spring launch plan" gap="lg">
            <Skeleton shape="title" />
            <Skeleton />
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </SkeletonGroup>
        </div>
        <div className="skeleton-demo-pane">
          <span className="skeleton-demo-caption">Canvas item</span>
          <SkeletonGroup label="Loading Reschedule design review">
            <Skeleton shape="title" />
            <Skeleton />
            <Skeleton />
            <Skeleton shape="panel" />
          </SkeletonGroup>
        </div>
        <div className="skeleton-demo-pane">
          <span className="skeleton-demo-caption">Workflow diagram</span>
          <SkeletonGroup
            label="Loading workflow diagram"
            className="skeleton-demo-p"
          >
            <Skeleton shape="title" />
            <Skeleton shape="panel" />
          </SkeletonGroup>
        </div>
        <div className="skeleton-demo-pane">
          <span className="skeleton-demo-caption">Slack destinations</span>
          <SkeletonGroup label="Loading Slack destinations">
            <Skeleton shape="panel" />
            <Skeleton shape="panel" />
          </SkeletonGroup>
        </div>
      </div>
    </Example>
  );
}

const columns = ["Crop", "Bed", "Sown", "Harvest"];

function TableRows() {
  const [canEdit, setCanEdit] = useState(true);
  return (
    <Example
      title="Table rows"
      description="Checkbox and action shapes hold the selection and button cells. Hide an action skeleton when the person cannot use that action."
    >
      <label className="skeleton-demo-switch">
        <Switch size="sm" checked={canEdit} onCheckedChange={setCanEdit} />
        Can edit rows
      </label>
      <div
        className="skeleton-demo-table-scroll"
        role="region"
        aria-label="Planting log, scrolls sideways"
        tabIndex={0}
      >
        <table className="skeleton-demo-table" aria-label="Planting log">
          <thead>
            <tr>
              <th scope="col">
                <span className="skeleton-demo-sr">Select</span>
              </th>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
              <th scope="col">
                <span className="skeleton-demo-sr">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody aria-busy="true">
            {[0, 1, 2].map((row) => (
              <tr key={row} data-testid="table-skeleton-row">
                <td>
                  <div className="skeleton-demo-center">
                    <Skeleton shape="checkbox" />
                  </div>
                </td>
                {columns.map((column) => (
                  <td key={column}>
                    <div className="skeleton-demo-cell">
                      <Skeleton />
                    </div>
                  </td>
                ))}
                <td>
                  <div className="skeleton-demo-actions">
                    {canEdit && <Skeleton shape="action" />}
                    <Skeleton shape="action" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Example>
  );
}

function StatusText() {
  return (
    <Example
      title="With visible status text"
      description="When the wait needs words, show them. Leave the group without a label and put the sentence inside it."
    >
      <div className="skeleton-demo-grid">
        <div className="skeleton-demo-pane">
          <SkeletonGroup gap="sm">
            <p className="skeleton-demo-status">Loading GitHub accounts…</p>
            <Skeleton />
            <Skeleton />
          </SkeletonGroup>
        </div>
        <div className="skeleton-demo-pane">
          <SkeletonGroup className="skeleton-demo-py">
            <p className="skeleton-demo-status">
              Checking who in “Greenhouse rotation” can open them…
            </p>
            <Skeleton />
            <Skeleton />
          </SkeletonGroup>
        </div>
        <div className="skeleton-demo-pane">
          <div className="skeleton-demo-stack-sm">
            <p role="status" className="skeleton-demo-status">
              Loading deliveries…
            </p>
            <div aria-hidden="true" className="skeleton-demo-stack-sm">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          </div>
        </div>
      </div>
    </Example>
  );
}

function Cards() {
  return (
    <Example
      title="In cards and rows"
      description="Skeletons fill the body of a bordered card, or sit beside an icon in an event row."
    >
      <div className="skeleton-demo-grid">
        <SkeletonGroup
          label="Loading upcoming meetings"
          className="skeleton-demo-bordered"
        >
          <Skeleton shape="line" />
          <Skeleton shape="line" />
          <Skeleton shape="line" />
        </SkeletonGroup>
        <div className="skeleton-demo-event">
          <span className="skeleton-demo-event-icon" aria-hidden="true">
            <Calendar size={16} />
          </span>
          <SkeletonGroup
            label="Loading event details"
            gap="sm"
            className="skeleton-demo-grow"
          >
            <Skeleton />
            <Skeleton />
          </SkeletonGroup>
        </div>
        <div className="skeleton-demo-member">
          <Skeleton shape="avatar" />
          <SkeletonGroup
            label="Loading member"
            gap="sm"
            className="skeleton-demo-grow"
          >
            <Skeleton className="skeleton-demo-w-name" />
            <Skeleton className="skeleton-demo-w-email" />
          </SkeletonGroup>
        </div>
      </div>
    </Example>
  );
}

const menuWidths = ["72%", "56%", "84%", "64%"];
const menuIcons = [Home, Chat, Folder, Inbox];

function MenuRows() {
  const [showIcon, setShowIcon] = useState(true);
  return (
    <Example
      title="Sidebar menu rows"
      description="className and style pass through. A small icon square and a text bar capped by a width variable stand in for each menu row."
    >
      <label className="skeleton-demo-switch">
        <Switch size="sm" checked={showIcon} onCheckedChange={setShowIcon} />
        Show icon
      </label>
      <div className="skeleton-demo-menus">
        <SkeletonGroup
          label="Loading chats"
          gap="sm"
          className="skeleton-demo-menu"
        >
          {menuWidths.map((width) => (
            <div key={width} className="skeleton-demo-menu-row">
              {showIcon && (
                <Skeleton
                  className="skeleton-demo-menu-icon"
                  data-sidebar="menu-skeleton-icon"
                />
              )}
              <Skeleton
                className="skeleton-demo-menu-text"
                data-sidebar="menu-skeleton-text"
                style={{ "--skeleton-width": width } as CSSProperties}
              />
            </div>
          ))}
        </SkeletonGroup>
        <ul className="skeleton-demo-menu" aria-label="Loaded chats">
          {["Weekly harvest", "Seed order", "Shared files", "Inbox"].map(
            (label, index) => {
              const Icon = menuIcons[index]!;
              return (
                <li key={label} className="skeleton-demo-menu-row">
                  {showIcon && <Icon size={16} aria-hidden="true" />}
                  <span>{label}</span>
                </li>
              );
            },
          )}
        </ul>
      </div>
    </Example>
  );
}

type Phase = "loading" | "ready" | "empty" | "error";

const projects = [
  { name: "Spring launch", detail: "12 files · 4 members" },
  { name: "Greenhouse rotation", detail: "7 files · 2 members" },
  { name: "Seed catalog 2027", detail: "31 files · 6 members" },
];

function LoadStates() {
  const [phase, setPhase] = useState<Phase>("loading");
  return (
    <Example
      title="Load states"
      description="The skeleton keeps the list height while it loads, then gives way to rows, an empty state, or an error with a retry."
    >
      <ToggleGroup
        aria-label="Sample load state"
        variant="outline"
        size="sm"
        spacing={0}
        value={[phase]}
        onValueChange={(value) => {
          if (value[0]) setPhase(value[0] as Phase);
        }}
      >
        <ToggleGroupItem value="loading">Loading</ToggleGroupItem>
        <ToggleGroupItem value="ready">Loaded</ToggleGroupItem>
        <ToggleGroupItem value="empty">Empty</ToggleGroupItem>
        <ToggleGroupItem value="error">Error</ToggleGroupItem>
      </ToggleGroup>
      <div className="skeleton-demo-load" data-phase={phase}>
        {phase === "loading" ? (
          <SkeletonGroup
            label="Loading projects"
            gap="lg"
            className="skeleton-demo-py"
          >
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </SkeletonGroup>
        ) : phase === "ready" ? (
          <ul className="skeleton-demo-projects" aria-label="Projects">
            {projects.map((project) => (
              <li key={project.name}>
                <span className="skeleton-demo-project-text">
                  <span>{project.name}</span>
                  <span className="skeleton-demo-muted">{project.detail}</span>
                </span>
                <span className="skeleton-demo-row-actions">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Rename ${project.name}`}
                  >
                    <Edit size={16} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${project.name}`}
                  >
                    <Trash size={16} aria-hidden="true" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        ) : phase === "empty" ? (
          <StatePanel
            kind="empty"
            heading="h4"
            title="No projects yet"
            description="Projects group files, chats, and people."
          />
        ) : (
          <StatePanel
            kind="error"
            heading="h4"
            title="Could not load projects"
            description="Check your connection and try again."
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPhase("loading")}
            >
              Retry
            </Button>
          </StatePanel>
        )}
      </div>
    </Example>
  );
}

export default function SkeletonDemo() {
  return (
    <div id="skeleton-demo" className="skeleton-demo">
      <Shapes />
      <Lists />
      <Canvases />
      <TableRows />
      <StatusText />
      <Cards />
      <MenuRows />
      <LoadStates />
    </div>
  );
}
