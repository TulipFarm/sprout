import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Copy } from "reicon-react/icons/Copy";
import { Download } from "reicon-react/icons/Download";
import { Edit } from "reicon-react/icons/Edit";
import { FolderMove } from "reicon-react/icons/FolderMove";
import { Link } from "reicon-react/icons/Link";
import { MoreH } from "reicon-react/icons/MoreH";
import { Pin } from "reicon-react/icons/Pin";
import { Trash } from "reicon-react/icons/Trash";
import { Button } from "@tulipfarm/sprout/button";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@tulipfarm/sprout/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@tulipfarm/sprout/dropdown-menu";
import { Example } from "./dialog-demo-parts";
import "../styles/context-menu-demo.css";

function Status({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="context-demo-status">
      {children}
    </p>
  );
}

/**
 * Right-click has no keyboard equivalent in Base UI, so Shift + F10 and the
 * Menu key open a controlled dropdown with the same items, and focus
 * returns to the target when it closes.
 */
function useKeyboardMenu() {
  const [open, setOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  return {
    open,
    setOpen,
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      if (
        (event.shiftKey && event.key === "F10") ||
        event.key === "ContextMenu"
      ) {
        event.preventDefault();
        returnFocus.current = event.currentTarget;
        setOpen(true);
      }
    },
    onButtonClick() {
      returnFocus.current = null;
    },
    finalFocus: () => returnFocus.current ?? true,
  };
}

/* Cloud's playground: every part, with a keyboard fallback that shares the items. */
export function ContextMenuPlayground() {
  const [checked, setChecked] = useState(false);
  const [view, setView] = useState("list");
  const [result, setResult] = useState("No action selected.");
  const keyboard = useKeyboardMenu();
  const items = (
    <>
      <ContextMenuGroup>
        <ContextMenuLabel>Example actions</ContextMenuLabel>
        <ContextMenuItem onClick={() => setResult("Open selected locally.")}>
          Open
          <ContextMenuShortcut>Enter</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled>Unavailable</ContextMenuItem>
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>
        Favorite
      </ContextMenuCheckboxItem>
      <ContextMenuRadioGroup value={view} onValueChange={setView}>
        <ContextMenuRadioItem value="list">List</ContextMenuRadioItem>
        <ContextMenuRadioItem value="grid">Grid</ContextMenuRadioItem>
      </ContextMenuRadioGroup>
      <ContextMenuSub>
        <ContextMenuSubTrigger>Share</ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem
            onClick={() =>
              setResult(
                "Copy sample title selected locally. The clipboard was not changed.",
              )
            }
          >
            Copy sample title
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuItem
        variant="destructive"
        onClick={() =>
          setResult("Delete sample selected locally. No data was deleted.")
        }
      >
        Delete sample
      </ContextMenuItem>
    </>
  );
  return (
    <section
      className="context-demo-playground"
      aria-label="Context menu playground"
    >
      <div className="context-demo-stage">
        <ContextMenu>
          <ContextMenuTrigger
            className="context-demo-target"
            tabIndex={0}
            role="group"
            aria-label="Sample card actions"
            aria-describedby="context-menu-help"
            onKeyDown={keyboard.onKeyDown}
          >
            Right-click this sample card
            <span className="context-demo-target-hint">
              Long-press on touch · Shift + F10 with a keyboard
            </span>
          </ContextMenuTrigger>
          <ContextMenuContent>{items}</ContextMenuContent>
        </ContextMenu>
        <DropdownMenu open={keyboard.open} onOpenChange={keyboard.setOpen}>
          <DropdownMenuTrigger
            render={<Button variant="outline" />}
            onClick={keyboard.onButtonClick}
          >
            Open sample actions
          </DropdownMenuTrigger>
          <DropdownMenuContent size="menu" finalFocus={keyboard.finalFocus}>
            {items}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="context-demo-readout">
        <p id="context-menu-help">
          Favorite: {checked ? "on" : "off"} · View:{" "}
          {view === "list" ? "List" : "Grid"} · Local sample only
        </p>
        <Status>{result}</Status>
      </div>
    </section>
  );
}

const projects = [
  "Spring planting",
  "Orchard Lane Growers and Distribution Network",
  "Market stall",
];

type File = { name: string; meta: string; syncing?: boolean };
const files: File[] = [
  { name: "Q3 budget.xlsx", meta: "Spreadsheet · 48 KB" },
  {
    name: "Field notes from the north greenhouse, week 14.pdf",
    meta: "PDF · 2.1 MB",
  },
  { name: "Contracts", meta: "Folder · Syncing…", syncing: true },
];

function FileRow({
  file,
  onResult,
}: {
  file: File;
  onResult: (text: string) => void;
}) {
  const [pinned, setPinned] = useState(false);
  const keyboard = useKeyboardMenu();
  const done = (text: string) => () => onResult(text);
  const locked = file.syncing;
  const items = (
    <>
      <ContextMenuGroup>
        <ContextMenuLabel inset>{file.name}</ContextMenuLabel>
        <ContextMenuItem
          disabled={locked}
          onClick={done(`Opened ${file.name}.`)}
        >
          <Download size={14} aria-hidden="true" />
          Download
          <ContextMenuShortcut>⌘ D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={done(`Link to ${file.name} copied.`)}>
          <Link size={14} aria-hidden="true" />
          Copy link
          <ContextMenuShortcut>⌘ L</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            setPinned(!pinned);
            onResult(
              pinned ? `${file.name} unpinned.` : `${file.name} pinned to top.`,
            );
          }}
        >
          <Pin size={14} aria-hidden="true" />
          {pinned ? "Unpin" : "Pin to top"}
        </ContextMenuItem>
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuItem
        disabled={locked}
        onClick={done(`Rename ${file.name} would open.`)}
      >
        <Edit size={14} aria-hidden="true" />
        Rename
        <ContextMenuShortcut>F2</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem
        disabled={locked}
        onClick={done(`Copy of ${file.name} created.`)}
      >
        <Copy size={14} aria-hidden="true" />
        Make a copy
      </ContextMenuItem>
      <ContextMenuSub>
        <ContextMenuSubTrigger disabled={locked}>
          <FolderMove size={14} aria-hidden="true" />
          Move to
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="context-demo-move-menu">
          <ContextMenuGroup>
            <ContextMenuLabel>Projects</ContextMenuLabel>
            {projects.map((project) => (
              <ContextMenuItem
                key={project}
                onClick={done(`${file.name} moved to ${project}.`)}
              >
                <span className="context-demo-truncate">{project}</span>
              </ContextMenuItem>
            ))}
          </ContextMenuGroup>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSeparator />
      <ContextMenuItem
        variant="destructive"
        disabled={locked}
        onClick={done(`${file.name} moved to trash.`)}
      >
        <Trash size={14} aria-hidden="true" />
        Move to trash
        <ContextMenuShortcut>⌫</ContextMenuShortcut>
      </ContextMenuItem>
    </>
  );
  return (
    <li className="context-demo-file">
      <ContextMenu>
        <ContextMenuTrigger
          className="context-demo-file-target"
          tabIndex={0}
          role="group"
          aria-label={file.name}
          aria-busy={locked || undefined}
          onKeyDown={keyboard.onKeyDown}
        >
          <span className="context-demo-file-name">
            {pinned && <Pin size={12} aria-hidden="true" />}
            <span className="context-demo-truncate">{file.name}</span>
          </span>
          <span className="context-demo-file-meta">
            {pinned ? `Pinned · ${file.meta}` : file.meta}
          </span>
        </ContextMenuTrigger>
        <ContextMenuContent className="context-demo-file-menu">
          {items}
        </ContextMenuContent>
      </ContextMenu>
      <DropdownMenu open={keyboard.open} onOpenChange={keyboard.setOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`More actions for ${file.name}`}
            />
          }
          onClick={keyboard.onButtonClick}
        >
          <MoreH size={16} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          size="menu"
          finalFocus={keyboard.finalFocus}
        >
          {items}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

/* Icon items, inset label, shortcuts, a submenu, a destructive item, and a locked row. */
export function ContextMenuFiles() {
  const [result, setResult] = useState("");
  return (
    <Example
      title="File rows"
      description="Right-click a row, or use its More button. While Contracts syncs, edits and trash are disabled but links still work."
    >
      <ul className="context-demo-files" aria-label="Files">
        {files.map((file) => (
          <FileRow key={file.name} file={file} onResult={setResult} />
        ))}
      </ul>
      <Status>{result}</Status>
    </Example>
  );
}

const columns = ["Name", "Status", "Owner", "Due date", "Priority"] as const;
const tasks: Record<(typeof columns)[number], string>[] = [
  {
    Name: "Order seed trays",
    Status: "To do",
    Owner: "Ama Owusu",
    "Due date": "Apr 12",
    Priority: "High",
  },
  {
    Name: "Repair greenhouse vent",
    Status: "In progress",
    Owner: "Kofi Mensah",
    "Due date": "Apr 15",
    Priority: "Medium",
  },
];

/* A table header menu: checkboxes stay open, radios pick one, the last column can't be hidden. */
export function ContextMenuColumns() {
  const [shown, setShown] = useState<string[]>([
    "Name",
    "Status",
    "Owner",
    "Due date",
  ]);
  const [density, setDensity] = useState("comfortable");
  const [sort, setSort] = useState("due");
  const keyboard = useKeyboardMenu();
  const toggle = (column: string, on: boolean) =>
    setShown((current) =>
      on ? [...current, column] : current.filter((name) => name !== column),
    );
  const items = (
    <>
      <ContextMenuGroup>
        <ContextMenuLabel>Show columns</ContextMenuLabel>
        {columns.map((column) => {
          const checked = shown.includes(column);
          return (
            <ContextMenuCheckboxItem
              key={column}
              checked={checked}
              closeOnClick={false}
              disabled={checked && shown.length === 1}
              onCheckedChange={(on) => toggle(column, on)}
            >
              {column}
            </ContextMenuCheckboxItem>
          );
        })}
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuLabel>Row height</ContextMenuLabel>
        <ContextMenuRadioGroup value={density} onValueChange={setDensity}>
          <ContextMenuRadioItem value="compact" closeOnClick>
            Compact
          </ContextMenuRadioItem>
          <ContextMenuRadioItem value="comfortable" closeOnClick>
            Comfortable
          </ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuSub>
        <ContextMenuSubTrigger>Sort by</ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuRadioGroup value={sort} onValueChange={setSort}>
            <ContextMenuRadioItem value="due">Due date</ContextMenuRadioItem>
            <ContextMenuRadioItem value="priority">
              Priority
            </ContextMenuRadioItem>
            <ContextMenuRadioItem value="updated">
              Last updated
            </ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuItem inset onClick={() => setShown([...columns])}>
        Reset columns
      </ContextMenuItem>
    </>
  );
  const sortLabel = {
    due: "Due date",
    priority: "Priority",
    updated: "Last updated",
  }[sort];
  return (
    <Example
      title="Table header"
      description="Right-click the header to choose columns. Shift + F10 opens the same menu from the keyboard."
    >
      <div
        className="context-demo-table"
        style={{ "--context-demo-columns": shown.length } as CSSProperties}
      >
        <div className="context-demo-toolbar">
          <DropdownMenu open={keyboard.open} onOpenChange={keyboard.setOpen}>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" />}
              onClick={keyboard.onButtonClick}
            >
              Columns {shown.length}/{columns.length}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" finalFocus={keyboard.finalFocus}>
              {items}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ContextMenu>
          <ContextMenuTrigger
            className="context-demo-header"
            data-density={density}
            tabIndex={0}
            role="group"
            aria-label="Task table header"
            aria-describedby="context-columns-help"
            onKeyDown={keyboard.onKeyDown}
          >
            {columns
              .filter((column) => shown.includes(column))
              .map((column) => (
                <span key={column}>{column}</span>
              ))}
          </ContextMenuTrigger>
          <ContextMenuContent>{items}</ContextMenuContent>
        </ContextMenu>
        {tasks.map((task) => (
          <div
            key={task.Name}
            className="context-demo-row"
            data-density={density}
          >
            {columns
              .filter((column) => shown.includes(column))
              .map((column) => (
                <span key={column} className="context-demo-truncate">
                  {task[column]}
                </span>
              ))}
          </div>
        ))}
      </div>
      <p id="context-columns-help" className="context-demo-help">
        Row height: {density === "compact" ? "Compact" : "Comfortable"} · Sort:{" "}
        {sortLabel}
      </p>
    </Example>
  );
}
