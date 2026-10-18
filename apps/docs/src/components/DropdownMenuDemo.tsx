import { useRef, useState, type ReactNode } from "react";
import { Menubar } from "@base-ui/react/menubar";
import { Add } from "reicon-react/icons/Add";
import { Archive } from "reicon-react/icons/Archive";
import { ArrowUpRight } from "reicon-react/icons/ArrowUpRight";
import { Book } from "reicon-react/icons/Book";
import { Briefcase } from "reicon-react/icons/Briefcase";
import { ChatRound } from "reicon-react/icons/ChatRound";
import { Check } from "reicon-react/icons/Check";
import { ChevronDown } from "reicon-react/icons/ChevronDown";
import { Clock3 } from "reicon-react/icons/Clock3";
import { Copy } from "reicon-react/icons/Copy";
import { DocumentText } from "reicon-react/icons/DocumentText";
import { Download } from "reicon-react/icons/Download";
import { Edit } from "reicon-react/icons/Edit";
import { Eye } from "reicon-react/icons/Eye";
import { FolderMove } from "reicon-react/icons/FolderMove";
import { HelpCircle } from "reicon-react/icons/HelpCircle";
import { InfoCircle } from "reicon-react/icons/InfoCircle";
import { Link } from "reicon-react/icons/Link";
import { Logout } from "reicon-react/icons/Logout";
import { Monitor } from "reicon-react/icons/Monitor";
import { Moon } from "reicon-react/icons/Moon";
import { MoreH } from "reicon-react/icons/MoreH";
import { Paperclip } from "reicon-react/icons/Paperclip";
import { Plus } from "reicon-react/icons/Plus";
import { Refresh } from "reicon-react/icons/Refresh";
import { Search } from "reicon-react/icons/Search";
import { Setting2 } from "reicon-react/icons/Setting2";
import { Share } from "reicon-react/icons/Share";
import { Sun } from "reicon-react/icons/Sun";
import { Trash } from "reicon-react/icons/Trash";
import { Upload } from "reicon-react/icons/Upload";
import { UserAdd } from "reicon-react/icons/UserAdd";
import { UserCircle } from "reicon-react/icons/UserCircle";
import { EntityAvatar } from "@tulipfarm/sprout/avatar";
import { Badge } from "@tulipfarm/sprout/badge";
import { Button } from "@tulipfarm/sprout/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@tulipfarm/sprout/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  dropdownMenuContentSizeNames,
} from "@tulipfarm/sprout/dropdown-menu";
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarMenuButton,
} from "@tulipfarm/sprout/sidebar";
import { Example, Row, useLater } from "./dialog-demo-parts";
import "../styles/dropdown-menu-demo.css";

function Status({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="dropdown-demo-status">
      {children}
    </p>
  );
}

/* Playground: every part in both content sizes. */
export function DropdownMenuPlayground() {
  const [checked, setChecked] = useState(true);
  const [view, setView] = useState("list");
  const [result, setResult] = useState("No action selected.");
  return (
    <section
      className="dropdown-demo-playground"
      aria-label="Dropdown menu playground"
    >
      <div className="dropdown-demo-stage">
        {dropdownMenuContentSizeNames.map((size) => (
          <div
            key={size}
            className={size === "anchor" ? "dropdown-demo-anchor" : undefined}
          >
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>
                {size === "anchor" ? "Trigger-width menu" : "Fixed-width menu"}
              </DropdownMenuTrigger>
              <DropdownMenuContent size={size}>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Sample project</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setResult("New task selected locally.")}
                  >
                    <Plus size={14} aria-hidden="true" />
                    New task
                    <DropdownMenuShortcut>⌘ N</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    Unavailable action
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={checked}
                  onCheckedChange={setChecked}
                >
                  Show completed
                </DropdownMenuCheckboxItem>
                <DropdownMenuRadioGroup value={view} onValueChange={setView}>
                  <DropdownMenuRadioItem value="list">
                    List
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="grid">
                    Grid
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() =>
                        setResult("Archive sample selected locally.")
                      }
                    >
                      Archive sample
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    setResult(
                      "Delete sample selected locally. No data was deleted.",
                    )
                  }
                >
                  Delete sample
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
      <div className="dropdown-demo-readout">
        <p>
          Completed tasks: {checked ? "shown" : "hidden"} · View:{" "}
          {view === "list" ? "List" : "Grid"}
        </p>
        <Status>{result}</Status>
      </div>
    </section>
  );
}

const moreTrigger = (
  label: string,
  variant: "ghost" | "outline",
  size: "icon-sm" | "icon" | "calendar-icon",
) => <Button variant={variant} size={size} aria-label={label} />;

/* Row and page actions: icon triggers paired with each content size. */
export function DropdownMenuActions() {
  const [result, setResult] = useState("");
  const [pinned, setPinned] = useState(false);
  const [archived, setArchived] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const driveTrigger = useRef<HTMLButtonElement>(null);
  const done = (text: string) => () => setResult(text);
  return (
    <Example
      title="Row and page actions"
      description="A More button opens actions for one row or page. Icon triggers align the menu to their end."
    >
      <Row
        label="Table row"
        note="ghost icon-sm · anchor · group, separator, destructive"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={moreTrigger("Actions for row 1042", "ghost", "icon-sm")}
          >
            <MoreH size={16} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={done("Edit row 1042.")}>
                Edit row
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={done("Profile and photo for Ama Owusu.")}
              >
                Profile and photo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={done("History for row 1042.")}>
                History
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={done("Delete row 1042 confirmation would open.")}
            >
              Delete row
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
      <Row label="Table options" note="outline icon-sm · anchor">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={moreTrigger("More table options", "outline", "icon-sm")}
          >
            <MoreH size={16} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={done("Deleted rows panel would open.")}
              >
                Deleted rows
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={done("Schema history panel would open.")}
              >
                Schema history
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
      <Row label="File page" note="outline icon · menu · icon items">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={moreTrigger("File actions", "outline", "icon")}
          >
            <MoreH size={16} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" size="menu">
            <DropdownMenuItem onClick={done("Use Q3 budget.xlsx in chat.")}>
              <ChatRound size={14} aria-hidden="true" />
              Use in chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={done("Downloading Q3 budget.xlsx.")}>
              <Download size={14} aria-hidden="true" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={done("Add to Knowledge would open.")}>
              <Book size={14} aria-hidden="true" />
              Add to Knowledge
            </DropdownMenuItem>
            <DropdownMenuItem onClick={done("Add to project would open.")}>
              <Briefcase size={14} aria-hidden="true" />
              Add to project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={done("Details would open.")}>
              <InfoCircle size={14} aria-hidden="true" />
              Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={done("Link copied.")}>
              <Link size={14} aria-hidden="true" />
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={done("Share would open.")}>
              <Share size={14} aria-hidden="true" />
              Share
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
      <Row
        label="Files row"
        note="ghost icon-sm · menu · two separators · busy row disables the trigger"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={moreTrigger(
              "More actions for Field notes.pdf",
              "ghost",
              "icon-sm",
            )}
          >
            <MoreH size={16} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" size="menu">
            <DropdownMenuItem onClick={done("Use Field notes.pdf in chat.")}>
              <ChatRound size={14} aria-hidden="true" />
              Use in chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={done("Add to Knowledge would open.")}>
              <Book size={14} aria-hidden="true" />
              Add to Knowledge
            </DropdownMenuItem>
            <DropdownMenuItem onClick={done("Add to project would open.")}>
              <Briefcase size={14} aria-hidden="true" />
              Add to project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={done("Details would open.")}>
              <InfoCircle size={14} aria-hidden="true" />
              Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={done("Link copied.")}>
              <Link size={14} aria-hidden="true" />
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={done("Share would open.")}>
              <Share size={14} aria-hidden="true" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={done("Rename would open.")}>
              <Edit size={14} aria-hidden="true" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={done("Move would open.")}>
              <FolderMove size={14} aria-hidden="true" />
              Move
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={done("Field notes.pdf moved to trash.")}
            >
              <Trash size={14} aria-hidden="true" />
              Move to trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled
            render={moreTrigger(
              "More actions for Contracts",
              "ghost",
              "icon-sm",
            )}
          >
            <MoreH size={16} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" size="menu">
            <DropdownMenuItem>Details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
      <Row
        label="Project files"
        note="ghost sm Add · ghost icon-sm row · disabled item"
      >
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
            <Add size={16} aria-hidden="true" />
            Add
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" size="menu">
            <DropdownMenuItem onClick={done("File picker would open.")}>
              <Upload size={14} aria-hidden="true" />
              Upload files
            </DropdownMenuItem>
            <DropdownMenuItem onClick={done("Paste text would open.")}>
              <DocumentText size={14} aria-hidden="true" />
              Paste text
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={moreTrigger(
              "Actions for Planting calendar",
              "ghost",
              "icon-sm",
            )}
          >
            <MoreH size={16} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" size="menu">
            <DropdownMenuItem disabled>View text</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setPinned(!pinned);
                setResult(
                  pinned
                    ? "Planting calendar unpinned."
                    : "Planting calendar pinned to top.",
                );
              }}
            >
              {pinned ? "Unpin" : "Pin to top"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={done("Planting calendar removed from the project.")}
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
      <Row
        label="Chat list row"
        note="ghost icon-sm · menu · label changes with state"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={moreTrigger(
              "More actions for Seed order follow-up",
              "ghost",
              "icon-sm",
            )}
          >
            <MoreH size={16} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" size="menu">
            <DropdownMenuItem onClick={done("Rename Seed order follow-up.")}>
              <Edit size={14} aria-hidden="true" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setArchived(!archived);
                setResult(archived ? "Chat restored." : "Chat archived.");
              }}
            >
              <Archive size={14} aria-hidden="true" />
              {archived ? "Restore" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={done("Delete chat confirmation would open.")}
            >
              <Trash size={14} aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
      <Row label="Calendar" note="ghost calendar-icon · menu">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={moreTrigger(
              "More calendar actions",
              "ghost",
              "calendar-icon",
            )}
          >
            <MoreH size={16} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent size="menu" align="end">
            <DropdownMenuItem onClick={done("Calendar search would open.")}>
              <Search size={14} aria-hidden="true" />
              Search calendar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={done("Find time panel would open.")}>
              <Clock3 size={14} aria-hidden="true" />
              Find time
            </DropdownMenuItem>
            <DropdownMenuItem onClick={done("Calendar refreshed.")}>
              <Refresh size={14} aria-hidden="true" />
              Refresh calendar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
      <Row
        label="Google Drive"
        note="Trigger ref returns focus after the dialog · link item"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            ref={driveTrigger}
            render={moreTrigger(
              "More actions for Harvest plan",
              "ghost",
              "icon-sm",
            )}
          >
            <MoreH size={16} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" size="menu">
            <DropdownMenuItem
              onClick={done("Use Harvest plan in chat would open.")}
            >
              <ChatRound size={14} aria-hidden="true" />
              Use in chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCopyOpen(true)}>
              <Copy size={14} aria-hidden="true" />
              Save a copy to TulipFarm
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={moreTrigger("Google file actions", "outline", "icon")}
          >
            <MoreH size={16} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" size="menu">
            <DropdownMenuItem
              onClick={done("Use Harvest plan in chat would open.")}
            >
              <ChatRound size={14} aria-hidden="true" />
              Use in chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCopyOpen(true)}>
              <Copy size={14} aria-hidden="true" />
              Save a copy
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <a
                  href="https://drive.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <ArrowUpRight size={14} aria-hidden="true" />
              Open in Google
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Refresh size={14} aria-hidden="true" />
              Refreshing…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
          <DialogContent finalFocus={driveTrigger}>
            <DialogHeader>
              <DialogTitle>Save a copy to TulipFarm?</DialogTitle>
              <DialogDescription>
                Harvest plan is copied into Files. The Google original stays as
                it is.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCopyOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setCopyOpen(false);
                  setResult("Copy of Harvest plan saved.");
                }}
              >
                Save copy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Row>
      <Status>{result}</Status>
    </Example>
  );
}

/* Chat header and composer. */
export function DropdownMenuChat() {
  const [result, setResult] = useState("");
  const [locked, setLocked] = useState(false);
  const [archived, setArchived] = useState(false);
  const files = [
    [
      "Let the assistant read a file",
      "Type @ and pick a saved file. The assistant reads it with your message.",
    ],
    [
      "Store a private file",
      "Saved for download. This chat doesn’t read it. Up to 5 files, 10 MiB each.",
    ],
    [
      "Add a file to Knowledge",
      "Opens Files. Your chats and agents can search Knowledge; other people can’t.",
    ],
  ] as const;
  return (
    <Example
      title="Chat"
      description="The composer opens upward with two-line choices. The header menu disables actions while a reply is sending."
    >
      <Row label="Composer files" note="ghost sm · menu · side top · label">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="sm" variant="ghost" aria-label="Add a file" />
            }
          >
            <Paperclip size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Files</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent size="menu" side="top">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                What should happen to the file?
              </DropdownMenuLabel>
              {files.map(([title, detail]) => (
                <DropdownMenuItem
                  key={title}
                  onClick={() => setResult(`${title}.`)}
                >
                  <span className="flex flex-col gap-0.5 py-0.5">
                    <span>{title}</span>
                    <span className="text-sprout-xs text-sprout-muted">
                      {detail}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
      <Row
        label="Chat header"
        note="ghost icon-sm · menu · disabled while sending"
      >
        <Button
          variant="outline"
          size="sm"
          aria-pressed={locked}
          onClick={() => setLocked(!locked)}
        >
          Reply sending
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Chat actions"
                title="Chat actions"
              />
            }
          >
            <ChevronDown size={16} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent size="menu" align="end">
            <DropdownMenuItem
              disabled={locked}
              onClick={() => setResult("Edit title form opened.")}
            >
              Edit title
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={locked}
              onClick={() => {
                setArchived(!archived);
                setResult(archived ? "Chat restored." : "Chat archived.");
              }}
            >
              {archived ? "Restore chat" : "Archive chat"}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={locked}
              onClick={() => setResult("Move to project would open.")}
            >
              Move to project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
      <Status>{result}</Status>
    </Example>
  );
}

/* Selection toolbars: loading, outcome, and disabled items. */
export function DropdownMenuSelection() {
  const later = useLater();
  const [exporting, setExporting] = useState(false);
  const [outcome, setOutcome] = useState(false);
  const [moving, setMoving] = useState(false);
  const [result, setResult] = useState("");
  const exportRows = () => {
    setExporting(true);
    later(() => {
      setExporting(false);
      setOutcome(true);
      setResult("Exported 3 rows to CSV.");
    });
  };
  const trash = () => {
    setMoving(true);
    later(() => {
      setMoving(false);
      setResult("2 items moved to trash.");
    });
  };
  return (
    <Example
      title="Selection actions"
      description="Narrow toolbars fold bulk actions into one menu. The trigger shows progress and turns busy while work runs."
    >
      <Row
        label="3 rows selected"
        note="outline sm · anchor · loading, then an outcome menu"
      >
        {outcome ? (
          <>
            <span className="dropdown-demo-outcome">Exported 3 rows.</span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="sm" />}
              >
                Actions
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() =>
                      setResult("Delete 3 rows confirmation would open.")
                    }
                  >
                    Delete selected
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exporting}
                  aria-busy={exporting}
                />
              }
            >
              {exporting ? "Exporting..." : "Selected actions"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={exportRows}>
                  Export selected
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    setResult("Delete 3 rows confirmation would open.")
                  }
                >
                  Delete selected
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={exporting}
          onClick={() => {
            setOutcome(false);
            setResult("Selection cleared.");
          }}
        >
          Clear
        </Button>
      </Row>
      <Row
        label="2 files selected"
        note="outline sm · anchor · items disabled while moving"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                disabled={moving}
                aria-busy={moving}
              />
            }
          >
            {moving ? "Moving…" : "Selected actions"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={moving}
              onClick={() => setResult("Use 2 files in chat would open.")}
            >
              Use in chat
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={moving}
              onClick={() => setResult("Add to Knowledge would open.")}
            >
              Add to Knowledge
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={moving}
              onClick={() => setResult("Add to project would open.")}
            >
              Add to project
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={moving}
              onClick={() => setResult("Move would open.")}
            >
              Move
            </DropdownMenuItem>
            <DropdownMenuItem disabled={moving} onClick={trash}>
              Move to trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
      <Status>{result}</Status>
    </Example>
  );
}

const fields = [
  { id: "name", label: "Name" },
  { id: "status", label: "Status" },
  { id: "owner", label: "Owner" },
  { id: "due", label: "Due date" },
  { id: "notes", label: "Notes" },
];
const statusOptions = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress" },
  { id: "blocked", label: "Blocked" },
  { id: "done", label: "Done" },
];

/* Checkbox menus stay open while people toggle several options. */
export function DropdownMenuChecks() {
  const [values, setValues] = useState<string[]>(["todo", "doing"]);
  const [shown, setShown] = useState<string[]>(["name", "status", "owner"]);
  const name = (id: string) =>
    statusOptions.find((option) => option.id === id)?.label ?? id;
  return (
    <Example
      title="Checkbox menus"
      description="Filters and column pickers keep the menu open with closeOnClick={false}. The last visible column can’t be hidden."
    >
      <Row
        label="Status filter"
        note="outline sm · anchor · invalid when empty"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                aria-invalid={values.length === 0}
              />
            }
          >
            {values.length ? values.map(name).join(", ") : "Choose options"}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              {statusOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.id}
                  checked={values.includes(option.id)}
                  closeOnClick={false}
                  onCheckedChange={(checked) =>
                    setValues(
                      checked
                        ? [...values, option.id]
                        : values.filter((id) => id !== option.id),
                    )
                  }
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
      <Row label="Columns" note="outline sm with icon and count badge · label">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <Eye size={14} aria-hidden="true" />
            Columns
            {shown.length < fields.length && (
              <Badge variant="secondary">
                {shown.length}/{fields.length}
              </Badge>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              {fields.map((field) => (
                <DropdownMenuCheckboxItem
                  key={field.id}
                  checked={shown.includes(field.id)}
                  disabled={shown.length === 1 && shown.includes(field.id)}
                  closeOnClick={false}
                  onCheckedChange={(checked) =>
                    setShown(
                      checked
                        ? [...shown, field.id]
                        : shown.filter((id) => id !== field.id),
                    )
                  }
                >
                  {field.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
    </Example>
  );
}

const workspaces = [
  { id: "ws-meadow", slug: "meadow", name: "Meadow Farm Cooperative" },
  {
    id: "ws-orchard",
    slug: "orchard",
    name: "Orchard Lane Growers and Distribution Network",
  },
  { id: "ws-kofi", slug: "kofi", name: "Kofi’s workspace" },
];
const themes = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

/* Sidebar workspace and account menus. Links stay on this page. */
export function DropdownMenuSidebar() {
  const [current, setCurrent] = useState(workspaces[0]);
  const [theme, setTheme] = useState("system");
  const [result, setResult] = useState("");
  const link = (text: string) => ({
    render: <a href="#sidebar-menus" />,
    onClick: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      setResult(text);
    },
  });
  return (
    <Example
      title="Sidebar menus"
      description="The workspace menu opens below with a switcher submenu. The account menu opens upward with a theme submenu. Items are links."
    >
      <SidebarProvider
        keyboardShortcut={false}
        className="dropdown-demo-sidebar"
      >
        <Sidebar collapsible="none" label="Sample navigation">
          <SidebarHeader>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Workspace menu, ${current.name}`}
                render={
                  <SidebarMenuButton className="dropdown-demo-workspace" />
                }
              >
                <EntityAvatar
                  seed={current.id}
                  name={current.name}
                  size="xs"
                  shape="square"
                />
                <span className="truncate">{current.name}</span>
                <ChevronDown size={12} aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent size="menu">
                <DropdownMenuItem {...link("Settings link chosen.")}>
                  <Setting2 size={14} aria-hidden="true" />
                  Settings
                  <DropdownMenuShortcut>G then S</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem {...link("Members link chosen.")}>
                  <UserAdd size={14} aria-hidden="true" />
                  Invite and manage members
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    Switch workspace
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {workspaces.map((item) => (
                      <DropdownMenuItem
                        key={item.slug}
                        render={<a href="#sidebar-menus" />}
                        onClick={(event) => {
                          event.preventDefault();
                          setCurrent(item);
                          setResult(`Switched to ${item.name}.`);
                        }}
                      >
                        <EntityAvatar
                          seed={item.id}
                          name={item.name}
                          size="xs"
                          shape="square"
                        />
                        <span className="dropdown-demo-workspace-name">
                          {item.name}
                        </span>
                        {item.slug === current.slug && (
                          <Check size={14} aria-label="Current workspace" />
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      {...link("Create workspace link chosen.")}
                    >
                      <Add size={14} aria-hidden="true" />
                      Create workspace
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarHeader>
          <SidebarFooter>
            <DropdownMenu onOpenChange={(open) => open && setResult("")}>
              <DropdownMenuTrigger
                aria-label="Account menu"
                render={<SidebarMenuButton tooltip="Account" />}
              >
                <EntityAvatar seed="user-ama" name="Ama Owusu" size="xs" />
                <span className="truncate">Ama Owusu</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent size="menu" side="top">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <span className="block truncate">
                      ama.owusu@meadow-farm-cooperative.example
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuItem {...link("Account settings link chosen.")}>
                    <UserCircle size={14} aria-hidden="true" />
                    Account settings
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem {...link("Help link chosen.")}>
                  <HelpCircle size={14} aria-hidden="true" />
                  Help and support
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Monitor size={14} aria-hidden="true" />
                    Theme
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={theme}
                      onValueChange={(value: string) => {
                        setTheme(value);
                        setResult(
                          `Theme preference: ${value}. The docs page is not changed.`,
                        );
                      }}
                    >
                      {themes.map(({ value, label, icon: Icon }) => (
                        <DropdownMenuRadioItem key={value} value={value}>
                          <Icon size={14} aria-hidden="true" />
                          {label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem {...link("Log out link chosen.")}>
                  <Logout size={14} aria-hidden="true" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
      </SidebarProvider>
      <Status>{result}</Status>
    </Example>
  );
}

/* Controlled open state with a keyboard shortcut and custom final focus. */
export function DropdownMenuControlled() {
  const [open, setOpen] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [view, setView] = useState("list");
  const [result, setResult] = useState("No action selected.");
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Example
      title="Controlled"
      description="Focus the card and press Shift + F10 or the Menu key. The menu opens through open and onOpenChange, then finalFocus returns to the card."
    >
      <div
        className="dropdown-demo-card"
        tabIndex={0}
        role="group"
        aria-label="Sample card"
        aria-describedby="dropdown-controlled-help"
        onKeyDown={(event) => {
          if (
            (event.shiftKey && event.key === "F10") ||
            event.key === "ContextMenu"
          ) {
            event.preventDefault();
            returnFocus.current = event.currentTarget;
            setOpen(true);
          }
        }}
      >
        Sample card
      </div>
      <div>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger
            render={<Button variant="outline" />}
            onClick={() => (returnFocus.current = null)}
          >
            Open sample actions
          </DropdownMenuTrigger>
          <DropdownMenuContent
            size="menu"
            finalFocus={() => returnFocus.current ?? true}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>Example actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setResult("Open selected locally.")}
              >
                Open
                <DropdownMenuShortcut>Enter</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>Unavailable</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={favorite}
              onCheckedChange={setFavorite}
            >
              Favorite
            </DropdownMenuCheckboxItem>
            <DropdownMenuRadioGroup value={view} onValueChange={setView}>
              <DropdownMenuRadioItem value="list">List</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="grid">Grid</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={() =>
                    setResult("Copy sample title selected locally.")
                  }
                >
                  Copy sample title
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setResult("Delete sample selected locally.")}
            >
              Delete sample
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p id="dropdown-controlled-help" className="dropdown-demo-help">
        Favorite: {favorite ? "on" : "off"} · View:{" "}
        {view === "list" ? "List" : "Grid"}
      </p>
      <Status>{result}</Status>
    </Example>
  );
}

/* The parts compose inside a Base UI Menubar, as Cloud's Menubar does. */
export function DropdownMenuMenubar() {
  const [layout, setLayout] = useState("board");
  const [result, setResult] = useState("");
  const content = {
    align: "start",
    alignOffset: -4,
    sideOffset: 8,
    className: "min-w-48",
  } as const;
  return (
    <Example
      title="Menubar"
      description="Each menu is a DropdownMenu inside Base UI’s Menubar. Arrow keys move between menus; inset aligns text with icon rows."
    >
      <Menubar className="dropdown-demo-menubar" aria-label="Sample editor">
        <DropdownMenu>
          <DropdownMenuTrigger className="dropdown-demo-menubar-trigger">
            File
          </DropdownMenuTrigger>
          <DropdownMenuContent {...content}>
            <DropdownMenuItem onClick={() => setResult("New task.")}>
              <Plus size={14} aria-hidden="true" />
              New task
              <DropdownMenuShortcut>⌘ N</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem inset onClick={() => setResult("Duplicate.")}>
              Duplicate
              <DropdownMenuShortcut>⌘ D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger inset>Share</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-32">
                <DropdownMenuItem onClick={() => setResult("Link copied.")}>
                  Copy link
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setResult("Email draft opened.")}
                >
                  Email link
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              inset
              onClick={() => setResult("Moved to trash.")}
            >
              Move to trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger className="dropdown-demo-menubar-trigger">
            View
          </DropdownMenuTrigger>
          <DropdownMenuContent {...content}>
            <DropdownMenuGroup>
              <DropdownMenuLabel inset>Layout</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={layout} onValueChange={setLayout}>
                <DropdownMenuRadioItem inset value="board">
                  Board
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem inset value="table">
                  Table
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger className="dropdown-demo-menubar-trigger">
            Help
          </DropdownMenuTrigger>
          <DropdownMenuContent {...content}>
            <DropdownMenuItem onClick={() => setResult("Shortcuts opened.")}>
              Keyboard shortcuts
              <DropdownMenuShortcut>?</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Menubar>
      <p className="dropdown-demo-help">
        Layout: {layout === "board" ? "Board" : "Table"}
      </p>
      <Status>{result}</Status>
    </Example>
  );
}
