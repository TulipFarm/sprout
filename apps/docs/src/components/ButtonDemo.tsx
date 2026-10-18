import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { Tooltip } from "@base-ui/react/tooltip";
import { ArrowDown as ArrowDownIcon } from "reicon-react/icons/ArrowDown";
import { ArrowUp as ArrowUpIcon } from "reicon-react/icons/ArrowUp";
import { ArrowUpRight as ArrowUpRightIcon } from "reicon-react/icons/ArrowUpRight";
import { Bold as BoldIcon } from "reicon-react/icons/Bold";
import { ChevronDown as ChevronDownIcon } from "reicon-react/icons/ChevronDown";
import { ChevronLeft as ChevronLeftIcon } from "reicon-react/icons/ChevronLeft";
import { ChevronRight as ChevronRightIcon } from "reicon-react/icons/ChevronRight";
import { Download as DownloadIcon } from "reicon-react/icons/Download";
import { FileText as FileTextIcon } from "reicon-react/icons/FileText";
import { Folder as FolderIcon } from "reicon-react/icons/Folder";
import { Italic as ItalicIcon } from "reicon-react/icons/Italic";
import { Loader as LoaderIcon } from "reicon-react/icons/Loader";
import { Plus as PlusIcon } from "reicon-react/icons/Plus";
import { Send as SendIcon } from "reicon-react/icons/Send";
import { Sparkle as SparkleIcon } from "reicon-react/icons/Sparkle";
import { Trash as TrashIcon } from "reicon-react/icons/Trash";
import { X as XIcon } from "reicon-react/icons/X";
import {
  ActionGroup,
  Button,
  buttonSizeNames,
  buttonVariantNames,
  buttonVariants,
  type ButtonSize,
  type ButtonState,
  type ButtonVariant,
} from "@tulipfarm/sprout/button";
import "../styles/button-demo.css";
import DocsSelect from "./DocsSelect";

type PlaygroundState = "ready" | "disabled" | "busy" | "invalid" | "expanded";
const states: { value: PlaygroundState; label: string }[] = [
  { value: "ready", label: "Ready" },
  { value: "disabled", label: "Disabled" },
  { value: "busy", label: "Busy" },
  { value: "invalid", label: "Invalid" },
  { value: "expanded", label: "Expanded" },
];
const standardSizes = [
  "default",
  "xs",
  "sm",
  "lg",
  "icon",
  "icon-xs",
  "icon-sm",
  "icon-lg",
] as const satisfies readonly ButtonSize[];
const patternSizes = buttonSizeNames.filter(
  (size) => !(standardSizes as readonly string[]).includes(size),
);
const iconOnly = (size: ButtonSize) =>
  size.startsWith("icon") || size === "bud" || size === "calendar-icon";

const patternUsage: Partial<Record<ButtonSize, string>> = {
  back: "Return to the previous page",
  onboarding: "Full-width auth and setup actions",
  bud: "Draggable assistant launcher",
  "bud-labeled": "Launcher with a name",
  "chat-row": "Chat and project list rows",
  "task-link": "Inline links that may wrap",
  "card-title": "Clickable card headings",
  "result-card": "Actions inside result cards",
  "calendar-title": "Month picker heading",
  calendar: "Calendar toolbar actions",
  "calendar-icon": "Previous and next period",
  nav: "Tree and side navigation items",
  "column-header": "Sortable table column",
  "column-header-end": "Sortable numeric column",
  "table-link": "Links inside table cells",
  badge: "Filter and scope chips",
};

// Context sizes are designed for one pairing in Cloud; show each in its real context.
function sizeSample(size: ButtonSize): {
  variant: ButtonVariant;
  content: ReactNode;
} {
  if (iconOnly(size)) {
    return {
      variant: size === "bud" ? "secondary" : "outline",
      content: size === "calendar-icon" ? <ChevronRightIcon /> : <PlusIcon />,
    };
  }
  switch (size) {
    case "back":
      return {
        variant: "ghost",
        content: (
          <>
            <ChevronLeftIcon data-icon="inline-start" />
            <span className="button-demo-back-label">Back</span>
          </>
        ),
      };
    case "onboarding":
      return { variant: "default", content: "Continue" };
    case "bud-labeled":
      return {
        variant: "secondary",
        content: (
          <>
            <span className="button-demo-bud" aria-hidden="true">
              <SparkleIcon />
            </span>
            Research bud
          </>
        ),
      };
    case "chat-row":
      return {
        variant: "ghost",
        content: (
          <>
            <span>Weekly planning</span>
            <span className="button-demo-meta">2h</span>
          </>
        ),
      };
    case "task-link":
      return { variant: "link", content: "Review launch notes" };
    case "card-title":
      return { variant: "ghost", content: "Prepare launch notes" };
    case "result-card":
      return { variant: "outline", content: "Open result" };
    case "calendar-title":
      return {
        variant: "ghost",
        content: (
          <>
            October 2026
            <ChevronDownIcon data-icon="inline-end" />
          </>
        ),
      };
    case "calendar":
      return { variant: "outline", content: "Today" };
    case "nav":
      return {
        variant: "ghost",
        content: (
          <>
            <FolderIcon data-icon="inline-start" />
            Projects
          </>
        ),
      };
    case "column-header":
      return {
        variant: "ghost",
        content: (
          <>
            Name
            <ArrowUpIcon />
          </>
        ),
      };
    case "column-header-end":
      return {
        variant: "ghost",
        content: (
          <>
            Size
            <ArrowDownIcon />
          </>
        ),
      };
    case "table-link":
      return { variant: "link", content: "invoices.csv" };
    case "badge":
      return { variant: "secondary", content: "Marketing" };
    default:
      return { variant: "outline", content: "Button" };
  }
}

function Spinner({ still = false }: { still?: boolean }) {
  return (
    <LoaderIcon
      className={still ? undefined : "button-demo-spinner"}
      aria-hidden="true"
    />
  );
}

function Preview({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="button-demo-card" aria-labelledby={`${id}-title`}>
      <header>
        <h2 id={`${id}-title`}>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      <div className="button-demo-body">{children}</div>
    </section>
  );
}

function Playground() {
  const [variant, setVariant] = useState<ButtonVariant>("default");
  const [size, setSize] = useState<ButtonSize>("default");
  const [state, setState] = useState<PlaygroundState>("ready");
  const [clicks, setClicks] = useState(0);
  const [theme, setTheme] = useState("neutral");
  const icon = iconOnly(size);
  return (
    <section className="button-demo-playground" aria-label="Button playground">
      <div className="button-demo-toolbar">
        {(
          [
            ["Variant", variant, setVariant, buttonVariantNames],
            ["Size", size, setSize, buttonSizeNames],
          ] as const
        ).map(([label, value, set, names]) => (
          <label key={label}>
            {label}
            <DocsSelect<string>
              label={label}
              value={value}
              onValueChange={(next) => (set as (v: string) => void)(next)}
              items={names.map((name) => ({ value: name, label: name }))}
            />
          </label>
        ))}
        <label>
          State
          <DocsSelect<PlaygroundState>
            label="State"
            value={state}
            onValueChange={setState}
            items={states}
          />
        </label>
        <label>
          Theme
          <DocsSelect
            label="Theme"
            value={theme}
            onValueChange={(value) => {
              setTheme(value);
              document.documentElement.dataset.sproutTheme = value;
            }}
            items={[
              { value: "neutral", label: "Neutral" },
              { value: "tulipfarm", label: "TulipFarm" },
            ]}
          />
        </label>
      </div>
      <div className="button-demo-stage">
        <Button
          variant={variant}
          size={size}
          disabled={state === "disabled" || state === "busy"}
          aria-busy={state === "busy" || undefined}
          aria-invalid={state === "invalid" || undefined}
          aria-describedby={
            state === "invalid" ? "button-playground-error" : undefined
          }
          aria-expanded={state === "expanded" ? true : undefined}
          aria-label={icon ? "Add item" : undefined}
          onClick={() => setClicks((count) => count + 1)}
        >
          {state === "busy" ? (
            <Spinner />
          ) : (
            <PlusIcon data-icon={icon ? undefined : "inline-start"} />
          )}
          {!icon && (state === "busy" ? "Saving…" : "Add item")}
        </Button>
        {state === "invalid" && (
          <p id="button-playground-error" className="button-demo-error">
            Choose an owner before saving.
          </p>
        )}
        <p role="status" className="button-demo-note">
          Clicked {clicks} {clicks === 1 ? "time" : "times"}
        </p>
      </div>
    </section>
  );
}

function SaveFlow() {
  const [phase, setPhase] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [fail, setFail] = useState(true);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function save() {
    setPhase("saving");
    timer.current = window.setTimeout(() => {
      setPhase(fail ? "error" : "saved");
      setFail(false);
    }, 700);
  }
  const saving = phase === "saving";
  return (
    <div className="button-demo-stack" data-testid="save-flow">
      <div className="button-demo-row">
        <Button
          disabled={saving}
          aria-busy={saving || undefined}
          onClick={save}
        >
          {saving && <Spinner />}
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button
          variant={fail ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={fail}
          disabled={saving}
          onClick={() => setFail((value) => !value)}
        >
          Fail next save
        </Button>
      </div>
      {phase === "error" ? (
        <div role="alert" className="button-demo-alert">
          <span>The sample save failed. Nothing was sent.</span>
          <Button variant="outline" size="xs" onClick={save}>
            Retry
          </Button>
        </div>
      ) : (
        <p role="status" className="button-demo-note">
          {phase === "saved"
            ? "Saved locally."
            : saving
              ? "Saving sample changes…"
              : "No changes saved yet."}
        </p>
      )}
    </div>
  );
}

function useLater() {
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (ms: number, done: () => void) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(done, ms);
  };
}

const ready: ButtonState = { kind: "ready" };
const busy: ButtonState = { kind: "busy" };

function StateFlow() {
  const [owner, setOwner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const later = useLater();
  const state: ButtonState = saving
    ? busy
    : owner
      ? ready
      : {
          kind: "blocked",
          reason: "Choose an owner first.",
          fix: {
            kind: "action",
            label: "Choose owner",
            onClick: () => setOwner(true),
          },
        };
  return (
    <div className="button-demo-stack" data-testid="state-flow">
      <Button
        state={state}
        pendingLabel="Saving…"
        onClick={() => {
          setSaving(true);
          later(1200, () => {
            setSaving(false);
            setSaved(true);
          });
        }}
      >
        Save draft
      </Button>
      <p role="status" className="button-demo-note">
        {saved ? "Saved in this example only." : "Not saved yet."}
      </p>
    </div>
  );
}

function JumpFix() {
  const [table, setTable] = useState("");
  return (
    <div className="button-demo-stack">
      <Button
        variant="outline"
        state={
          table
            ? ready
            : {
                kind: "blocked",
                reason: "Name a table to inspect first.",
                fix: {
                  kind: "jump",
                  label: "Name a table",
                  target: "button-jump-table",
                },
              }
        }
      >
        Activate saved revision for inspection
      </Button>
      <label className="button-demo-field">
        Table
        <input
          id="button-jump-table"
          value={table}
          onChange={(event) => setTable(event.target.value)}
        />
      </label>
    </div>
  );
}

const pendingSamples = [
  ["default", "default", "Install and enable", "Installing…"],
  ["outline", "sm", "Revoke schedule", "Revoking…"],
  ["destructive", "lg", "Delete agent", "Deleting agent…"],
] as const satisfies readonly (readonly [
  ButtonVariant,
  ButtonSize,
  string,
  string,
])[];

function PendingLabels() {
  const [pending, setPending] = useState<string | null>(null);
  const later = useLater();
  return (
    <div className="button-demo-row">
      {pendingSamples.map(([variant, size, label, pendingLabel]) => (
        <Button
          key={label}
          variant={variant}
          size={size}
          state={pending === label ? busy : ready}
          pendingLabel={pendingLabel}
          onClick={() => {
            setPending(label);
            later(1400, () => setPending(null));
          }}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}

function ReviewChoice() {
  const [step, setStep] = useState<"stale" | "loading" | "fresh">("stale");
  const [message, setMessage] = useState("");
  const later = useLater();
  const run = (done: string) => {
    setStep("loading");
    later(1100, () => {
      setStep("stale");
      setMessage(done);
    });
  };
  const state: ButtonState =
    step === "loading"
      ? busy
      : step === "fresh"
        ? ready
        : {
            kind: "blocked",
            reason: "Refresh administration to load the latest settings.",
            fix: {
              kind: "action",
              label: "Refresh administration",
              onClick: () => {
                setStep("loading");
                later(900, () => setStep("fresh"));
              },
            },
          };
  return (
    <div className="button-demo-stack">
      <p className="button-demo-note">
        Someone changed execution settings while you edited them.
      </p>
      <ActionGroup
        state={state}
        actions={[
          {
            label: "Keep my draft against this version",
            variant: "outline",
            onClick: () => run("Kept your draft in this example only."),
          },
          {
            label: "Use current administration",
            variant: "outline",
            onClick: () => run("Loaded current settings in this example only."),
          },
        ]}
      />
      {message && (
        <p role="status" className="button-demo-note">
          {message}
        </p>
      )}
    </div>
  );
}

function FileList() {
  const [files, setFiles] = useState<string[]>([]);
  const add = useRef<HTMLButtonElement>(null);
  return (
    <div className="button-demo-stack" data-testid="file-list">
      {files.length === 0 ? (
        <p className="button-demo-empty">No sample files yet.</p>
      ) : (
        <ul className="button-demo-files" aria-label="Sample files">
          {files.map((file) => (
            <li key={file}>
              <FileTextIcon aria-hidden="true" size={14} />
              <span>{file}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${file}`}
                title={`Delete ${file}`}
                onClick={() => {
                  setFiles((list) => list.filter((name) => name !== file));
                  add.current?.focus();
                }}
              >
                <TrashIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button
        ref={add}
        variant="outline"
        size="sm"
        onClick={() =>
          setFiles((list) => [...list, `Brief ${list.length + 1}.pdf`])
        }
      >
        <PlusIcon data-icon="inline-start" />
        Add sample file
      </Button>
    </div>
  );
}

function SortTable() {
  const [sort, setSort] = useState<{ key: "name" | "size"; asc: boolean }>({
    key: "name",
    asc: true,
  });
  const rows = [
    { name: "Launch plan", size: 42 },
    { name: "Customer notes", size: 7 },
    { name: "Roadmap", size: 128 },
  ].sort((a, b) => {
    const order =
      sort.key === "name" ? a.name.localeCompare(b.name) : a.size - b.size;
    return sort.asc ? order : -order;
  });
  const header = (key: "name" | "size", label: string) => {
    const active = sort.key === key;
    const Icon = active && !sort.asc ? ArrowDownIcon : ArrowUpIcon;
    return (
      <th
        aria-sort={active ? (sort.asc ? "ascending" : "descending") : "none"}
        className={key === "size" ? "button-demo-end" : undefined}
      >
        <Button
          variant={active ? "secondary" : "ghost"}
          size={key === "size" ? "column-header-end" : "column-header"}
          onClick={() => setSort({ key, asc: active ? !sort.asc : true })}
        >
          {label}
          <Icon
            aria-hidden="true"
            className={active ? "" : "button-demo-faint"}
          />
        </Button>
      </th>
    );
  };
  return (
    <table className="button-demo-table">
      <caption className="sr-only">Sample files sorted by column</caption>
      <thead>
        <tr>
          {header("name", "Name")}
          {header("size", "Size")}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <td>
              <Button
                variant="link"
                size="table-link"
                nativeButton={false}
                render={
                  <a href={`#${row.name.toLowerCase().replace(" ", "-")}`} />
                }
              >
                {row.name}
              </Button>
            </td>
            <td className="button-demo-end">{row.size} KB</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface TreeNode {
  path: string;
  children?: TreeNode[];
}
const tree: TreeNode[] = [
  {
    path: "notes",
    children: [{ path: "notes/today.md" }, { path: "notes/ideas.md" }],
  },
  { path: "readme.md" },
];

function Tree() {
  const [open, setOpen] = useState<string[]>(["notes"]);
  const [selected, setSelected] = useState("readme.md");
  function keys(event: KeyboardEvent<HTMLUListElement>) {
    const target = event.target as HTMLElement;
    if (target.getAttribute("role") !== "treeitem") return;
    const items = [
      ...event.currentTarget.querySelectorAll<HTMLElement>('[role="treeitem"]'),
    ];
    const index = items.indexOf(target);
    const path = target.dataset.path ?? "";
    if (event.key === "ArrowDown") items[index + 1]?.focus();
    else if (event.key === "ArrowUp") items[index - 1]?.focus();
    else if (event.key === "ArrowRight" && target.hasAttribute("aria-expanded"))
      setOpen((list) => [...new Set([...list, path])]);
    else if (event.key === "ArrowLeft" && target.hasAttribute("aria-expanded"))
      setOpen((list) => list.filter((entry) => entry !== path));
    else return;
    event.preventDefault();
  }
  function render(nodes: TreeNode[], level: number) {
    return nodes.map((node) => {
      const folder = Boolean(node.children);
      const expanded = open.includes(node.path);
      return (
        <li role="none" key={node.path}>
          <Button
            variant={selected === node.path ? "secondary" : "ghost"}
            size="nav"
            role="treeitem"
            aria-level={level}
            aria-selected={selected === node.path}
            aria-expanded={folder ? expanded : undefined}
            data-path={node.path}
            onClick={() =>
              folder
                ? setOpen((list) =>
                    expanded
                      ? list.filter((entry) => entry !== node.path)
                      : [...list, node.path],
                  )
                : setSelected(node.path)
            }
          >
            {folder ? (
              <>
                {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                <FolderIcon />
              </>
            ) : (
              <FileTextIcon />
            )}
            <span className="button-demo-truncate">
              {node.path.split("/").at(-1)}
            </span>
          </Button>
          {folder && expanded && (
            <ul role="group" className="button-demo-subtree">
              {render(node.children ?? [], level + 1)}
            </ul>
          )}
        </li>
      );
    });
  }
  return (
    <div className="button-demo-stack">
      <ul
        role="tree"
        aria-label="Sample files"
        className="button-demo-tree"
        onKeyDown={keys}
      >
        {render(tree, 1)}
      </ul>
      <p role="status" className="button-demo-note">
        Selected {selected}
      </p>
    </div>
  );
}

const corners = ["top-left", "top-right", "bottom-right", "bottom-left"];

function DraggableAssistant() {
  const [corner, setCorner] = useState(2);
  const [open, setOpen] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean }>(
    null,
  );
  const suppress = useRef(false);
  return (
    <div className="button-demo-dock" data-testid="assistant-dock">
      <div className="button-demo-dock-anchor" data-corner={corners[corner]}>
        <Button
          variant="outline"
          size="bud-labeled"
          aria-haspopup="dialog"
          aria-expanded={open}
          title="Sample assistant. Drag to move to another corner."
          onPointerDown={(event) => {
            if (event.button !== 0 || !event.isPrimary) return;
            suppress.current = false;
            drag.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              moved: false,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const state = drag.current;
            if (!state || state.id !== event.pointerId) return;
            if (
              Math.hypot(event.clientX - state.x, event.clientY - state.y) > 8
            )
              state.moved = true;
          }}
          onPointerUp={(event) => {
            const state = drag.current;
            drag.current = null;
            if (!state?.moved) return;
            suppress.current = true;
            const box = event.currentTarget
              .closest(".button-demo-dock")!
              .getBoundingClientRect();
            const right = event.clientX > box.left + box.width / 2;
            const bottom = event.clientY > box.top + box.height / 2;
            setCorner(bottom ? (right ? 2 : 3) : right ? 1 : 0);
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onClick={() => {
            if (suppress.current) {
              suppress.current = false;
              return;
            }
            setOpen((value) => !value);
          }}
        >
          <span className="button-demo-avatar" aria-hidden="true">
            <SparkleIcon />
          </span>
          {open ? "Minimize assistant" : "Open assistant"}
        </Button>
      </div>
      <p role="status" className="button-demo-note">
        Assistant {open ? "open" : "closed"},{" "}
        {corners[corner]?.replace("-", " ")}
      </p>
    </div>
  );
}

function Overlays() {
  const [menuChoice, setMenuChoice] = useState("None");
  const [deleted, setDeleted] = useState(false);
  return (
    <div className="button-demo-row">
      <Menu.Root>
        <Menu.Trigger render={<Button variant="outline" size="sm" />}>
          Sort
          <ChevronDownIcon data-icon="inline-end" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={6} className="button-demo-positioner">
            <Menu.Popup className="button-demo-popup">
              {["Newest", "Oldest", "Name"].map((item) => (
                <Menu.Item
                  key={item}
                  className="button-demo-menu-item"
                  onClick={() => setMenuChoice(item)}
                >
                  {item}
                </Menu.Item>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <Popover.Root>
        <Popover.Trigger render={<Button variant="ghost" size="sm" />}>
          Details
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={6} className="button-demo-positioner">
            <Popover.Popup className="button-demo-popup button-demo-popover">
              <Popover.Title className="button-demo-popup-title">
                Sample details
              </Popover.Title>
              <Popover.Description>
                Updated two minutes ago.
              </Popover.Description>
              <Popover.Close render={<Button variant="outline" size="xs" />}>
                Close
              </Popover.Close>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <Tooltip.Provider delay={200}>
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Download sample"
              />
            }
          >
            <DownloadIcon />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              sideOffset={6}
              className="button-demo-positioner"
            >
              <Tooltip.Popup className="button-demo-tooltip">
                Download sample
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
      <Dialog.Root>
        <Dialog.Trigger
          render={<Button variant="destructive" size="sm" disabled={deleted} />}
        >
          <TrashIcon data-icon="inline-start" />
          Delete draft
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className="button-demo-backdrop" />
          <Dialog.Popup className="button-demo-dialog">
            <Dialog.Title className="button-demo-popup-title">
              Delete sample draft?
            </Dialog.Title>
            <Dialog.Description>
              This only changes the preview.
            </Dialog.Description>
            <div className="button-demo-row button-demo-actions">
              <Dialog.Close render={<Button variant="outline" />}>
                Cancel
              </Dialog.Close>
              <Dialog.Close
                render={<Button variant="destructive" autoFocus />}
                onClick={() => setDeleted(true)}
              >
                Delete
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <p role="status" className="button-demo-note">
        Sort: {menuChoice}. {deleted ? "Draft deleted." : "Draft kept."}
      </p>
    </div>
  );
}

export default function ButtonDemo() {
  const [view, setView] = useState<"list" | "board">("list");
  const [marks, setMarks] = useState({ bold: false, italic: false });
  const [scopeAll, setScopeAll] = useState(false);
  const [month, setMonth] = useState(9);
  const [submitted, setSubmitted] = useState("Nothing submitted.");
  const [details, setDetails] = useState(false);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return (
    <div className="button-demo" id="button-demo">
      <Playground />

      <Preview id="variants" title="Variants">
        <div className="button-demo-row">
          {buttonVariantNames.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
      </Preview>

      <Preview
        id="sizes"
        title="Sizes"
        description="Text, icon, and pattern sizes. Touch screens get 44px targets."
      >
        <div className="button-demo-sizes">
          {(
            [
              ["Text", ["xs", "sm", "default", "lg"]],
              ["Icon", ["icon-xs", "icon-sm", "icon", "icon-lg"]],
            ] as const satisfies readonly (readonly [
              string,
              readonly ButtonSize[],
            ])[]
          ).map(([group, sizes]) => (
            <section
              key={group}
              className="button-demo-scale"
              aria-label={`${group} sizes`}
            >
              <h3>{group}</h3>
              <div className="button-demo-scale-row">
                {sizes.map((size) => {
                  const sample = sizeSample(size);
                  return (
                    <figure key={size}>
                      <div className="button-demo-scale-stage">
                        <Button
                          variant={sample.variant}
                          size={size}
                          aria-label={
                            iconOnly(size) ? `${size} example` : undefined
                          }
                        >
                          {sample.content}
                        </Button>
                      </div>
                      <figcaption>{size}</figcaption>
                    </figure>
                  );
                })}
              </div>
            </section>
          ))}
          <section
            className="button-demo-pattern-sizes"
            aria-label="Pattern sizes"
          >
            <h3>Patterns</h3>
            <dl>
              {patternSizes.map((size) => {
                const sample = sizeSample(size);
                return (
                  <div key={size} className="button-demo-pattern">
                    <dt>
                      <code>{size}</code>
                      <span>{patternUsage[size]}</span>
                    </dt>
                    <dd>
                      <Button
                        variant={sample.variant}
                        size={size}
                        aria-label={
                          iconOnly(size) ? `${size} example` : undefined
                        }
                      >
                        {sample.content}
                      </Button>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        </div>
      </Preview>

      <Preview
        id="states"
        title="States"
        description="Disabled, busy, invalid, pressed, expanded, and inline icons."
      >
        <div className="button-demo-row">
          <Button disabled>Disabled</Button>
          <Button disabled aria-busy="true">
            <Spinner still />
            Saving…
          </Button>
          <Button
            variant="outline"
            aria-invalid="true"
            aria-describedby="button-states-error"
          >
            Invalid
          </Button>
          <Button
            variant={details ? "secondary" : "outline"}
            aria-expanded={details}
            aria-controls="button-states-details"
            onClick={() => setDetails((value) => !value)}
          >
            Details
            <ChevronDownIcon data-icon="inline-end" />
          </Button>
          <Button variant="secondary">
            <SendIcon data-icon="inline-start" />
            Send
          </Button>
        </div>
        <p id="button-states-error" className="button-demo-error">
          Choose an owner before saving.
        </p>
        <p
          id="button-states-details"
          hidden={!details}
          className="button-demo-note"
        >
          Sample details are visible.
        </p>
      </Preview>

      <Preview
        id="action-states"
        title="Action states"
        description="Pass state to show progress or say why a button cannot run. Busy and blocked buttons stay focusable."
      >
        <div className="button-demo-patterns">
          <div className="button-demo-panel">
            <h3>Blocked, ready, busy</h3>
            <StateFlow />
          </div>
          <div className="button-demo-panel">
            <h3>Jump fix</h3>
            <JumpFix />
          </div>
          <div className="button-demo-panel">
            <h3>Link fix</h3>
            <Button
              state={{
                kind: "blocked",
                reason: "An agent manager must activate this agent first.",
                fix: {
                  kind: "link",
                  label: "See setup steps",
                  link: <a href="#links-title" />,
                },
              }}
            >
              Start task
            </Button>
          </div>
          <div className="button-demo-panel">
            <h3>Pending labels</h3>
            <PendingLabels />
          </div>
        </div>
      </Preview>

      <Preview
        id="action-groups"
        title="Action groups"
        description="Several actions share one state and one reason."
      >
        <ReviewChoice />
      </Preview>

      <Preview
        id="async"
        title="Loading, error, and empty"
        description="Busy buttons stay disabled. Errors offer a retry. Focus returns after deletes."
      >
        <div className="button-demo-split">
          <SaveFlow />
          <FileList />
        </div>
      </Preview>

      <Preview
        id="toggles"
        title="Toggles and toolbars"
        description="Selected options swap variants and set aria-pressed."
      >
        <div className="button-demo-row">
          <div className="button-demo-segment" role="group" aria-label="View">
            {(["list", "board"] as const).map((option) => (
              <Button
                key={option}
                size="sm"
                variant={view === option ? "secondary" : "ghost"}
                aria-pressed={view === option}
                onClick={() => setView(option)}
              >
                {option === "list" ? "List" : "Board"}
              </Button>
            ))}
          </div>
          <div
            className="button-demo-row"
            role="toolbar"
            aria-label="Formatting"
          >
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Bold"
              aria-pressed={marks.bold}
              onClick={() => setMarks((m) => ({ ...m, bold: !m.bold }))}
            >
              <BoldIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Italic"
              aria-pressed={marks.italic}
              onClick={() => setMarks((m) => ({ ...m, italic: !m.italic }))}
            >
              <ItalicIcon />
            </Button>
          </div>
          <Button
            size="badge"
            variant={scopeAll ? "ghost" : "scope"}
            aria-pressed={!scopeAll}
            onClick={() => setScopeAll((value) => !value)}
          >
            <span className="button-demo-truncate">
              {scopeAll ? "All projects" : "Project: Website refresh"}
            </span>
            {!scopeAll && <XIcon data-icon="inline-end" />}
          </Button>
        </div>
        <p role="status" className="button-demo-note">
          {view === "list" ? "List" : "Board"} view
          {marks.bold ? ", bold" : ""}
          {marks.italic ? ", italic" : ""}
        </p>
      </Preview>

      <Preview
        id="links"
        title="Links"
        description="Use nativeButton={false} and render for router or anchor links."
      >
        <div className="button-demo-row">
          <Button
            variant="ghost"
            size="back"
            nativeButton={false}
            render={<a href="#button-demo" />}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            <span className="button-demo-back-label">All files</span>
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href="#variants-title" />}
          >
            Open table
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a
                href="https://github.com/TulipFarm/sprout"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            Open on GitHub
            <ArrowUpRightIcon data-icon="inline-end" />
          </Button>
          <Button
            variant="ghost"
            nativeButton={false}
            render={
              <a href="data:text/plain,Sprout%20sample" download="sample.txt" />
            }
          >
            <DownloadIcon data-icon="inline-start" />
            Download
          </Button>
          <Button
            variant="link"
            size="xs"
            nativeButton={false}
            render={<a href="mailto:hello@example.com" />}
          >
            Email support
          </Button>
          <Button
            variant="outline"
            disabled
            nativeButton={false}
            render={<a href="#links-title" />}
          >
            Unavailable link
          </Button>
        </div>
        <div className="button-demo-narrow">
          <Button
            variant="link"
            size="task-link"
            nativeButton={false}
            render={<a href="#links-title" />}
          >
            Review the quarterly customer research summary and draft follow-up
            questions
          </Button>
        </div>
      </Preview>

      <Preview
        id="compositions"
        title="Base UI triggers"
        description="Menus, popovers, tooltips, and dialogs render Button through their render prop."
      >
        <Overlays />
        <Collapsible.Root className="button-demo-stack">
          <Collapsible.Trigger render={<Button variant="ghost" size="sm" />}>
            <ChevronRightIcon
              data-icon="inline-start"
              className="button-demo-chevron"
            />
            Advanced options
          </Collapsible.Trigger>
          <Collapsible.Panel className="button-demo-note">
            Sample advanced options.
          </Collapsible.Panel>
        </Collapsible.Root>
      </Preview>

      <Preview
        id="class-only"
        title="Class-only styling"
        description="buttonVariants() styles elements that are not Button, and utilities override it."
      >
        <div className="button-demo-row">
          <a
            className={buttonVariants({ variant: "outline", size: "sm" })}
            href="#class-only-title"
            aria-label="Join sample meeting"
          >
            Join
          </a>
          <a
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            href="#class-only-title"
          >
            Open in calendar
          </a>
          <button
            type="button"
            aria-label="Previous sample month"
            className={buttonVariants({
              variant: "ghost",
              className: "size-8 p-0",
            })}
          >
            <ChevronLeftIcon />
          </button>
        </div>
      </Preview>

      <Preview
        id="forms"
        title="Forms"
        description="Submit, reset, and an external submit using the form attribute."
      >
        <form
          id="button-demo-form"
          className="button-demo-row"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setSubmitted(
              `Submitted ${String(data.get("title") || "untitled")}.`,
            );
          }}
          onReset={() => setSubmitted("Form reset.")}
        >
          <label className="button-demo-field">
            Title
            <input name="title" defaultValue="Weekly notes" />
          </label>
          <Button type="submit">Save</Button>
          <Button type="reset" variant="ghost">
            Reset
          </Button>
        </form>
        <div className="button-demo-row">
          <Button
            type="submit"
            form="button-demo-form"
            variant="outline"
            size="sm"
          >
            Save from outside
          </Button>
          <p role="status" className="button-demo-note">
            {submitted}
          </p>
        </div>
      </Preview>

      <Preview
        id="patterns"
        title="Application patterns"
        description="Sample data only. Sizes that fit common rows, cards, calendars, and trees."
      >
        <div className="button-demo-patterns">
          <div className="button-demo-panel">
            <h3>Table</h3>
            <SortTable />
          </div>
          <div className="button-demo-panel">
            <h3>Calendar header</h3>
            <div className="button-demo-row">
              <Button
                variant="ghost"
                size="calendar-icon"
                aria-label="Previous month"
                onClick={() => setMonth((m) => (m + 11) % 12)}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="ghost"
                size="calendar-title"
                onClick={() => setMonth(9)}
              >
                {months[month]} 2026
              </Button>
              <Button
                variant="ghost"
                size="calendar-icon"
                aria-label="Next month"
                onClick={() => setMonth((m) => (m + 1) % 12)}
              >
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                size="calendar"
                onClick={() => setMonth(9)}
              >
                Today
              </Button>
            </div>
          </div>
          <div className="button-demo-panel">
            <h3>Rows and cards</h3>
            <div className="button-demo-stack">
              {[
                ["Launch checklist", "2m"],
                ["Customer interview notes", "1h"],
              ].map(([title, time]) => (
                <Button key={title} variant="ghost" size="chat-row">
                  <span className="button-demo-truncate">{title}</span>
                  <span className="button-demo-faint">{time}</span>
                </Button>
              ))}
              <Button variant="ghost" size="card-title">
                <FileTextIcon />
                Quarterly planning document with a long wrapping title
              </Button>
              <div className="button-demo-row">
                <Button variant="outline" size="result-card">
                  Open record
                </Button>
                <Button variant="outline" size="icon" aria-label="Add record">
                  <PlusIcon />
                </Button>
              </div>
            </div>
          </div>
          <div className="button-demo-panel">
            <h3>Tree</h3>
            <Tree />
          </div>
          <div className="button-demo-panel">
            <h3>Onboarding</h3>
            <div className="button-demo-stack">
              <Button size="onboarding">Continue</Button>
              <Button size="onboarding" variant="outline">
                Skip for now
              </Button>
            </div>
          </div>
          <div className="button-demo-panel">
            <h3>Floating assistant</h3>
            <DraggableAssistant />
            <Button
              variant="outline"
              size="bud"
              aria-label="Open compact assistant"
            >
              <SparkleIcon />
            </Button>
          </div>
        </div>
      </Preview>
    </div>
  );
}
