import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { ArrowUpRight } from "reicon-react/icons/ArrowUpRight";
import { Calendar } from "reicon-react/icons/Calendar";
import { Menu } from "reicon-react/icons/Menu";
import { MoreH } from "reicon-react/icons/MoreH";
import { Alert, AlertDescription } from "@tulipfarm/sprout/alert";
import { Badge } from "@tulipfarm/sprout/badge";
import { BrandIcon } from "@tulipfarm/sprout/brand-icon";
import { Button } from "@tulipfarm/sprout/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@tulipfarm/sprout/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@tulipfarm/sprout/dropdown-menu";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  type SheetSide,
} from "@tulipfarm/sprout/sheet";
import { StatePanel } from "@tulipfarm/sprout/state-panel";
import {
  Example,
  Row,
  Skeleton,
  Spinner,
  TextField,
  useLater,
} from "./dialog-demo-parts";
import { CalendarFilters, PendingWork, SelectField } from "./SheetDemo";

/* ------------------------------------------------------------------ */
/* Workspace navigation (sidebar mobile drawer)                        */
/* ------------------------------------------------------------------ */

const navItems = [
  "Home",
  "Chats",
  "Calendar",
  "Tables",
  "Files",
  "Integrations",
];

function NavigationDrawer({
  side,
}: {
  side: Extract<SheetSide, "left" | "right">;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("Calendar");
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        ref={trigger}
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Open navigation on the ${side}`}
          />
        }
      >
        <Menu size={16} aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        side={side}
        data-mobile="true"
        className="sheet-demo-nav"
        style={{ "--sheet-demo-nav-width": "18rem" } as CSSProperties}
        finalFocus={trigger}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Workspace navigation</SheetTitle>
          <SheetDescription>
            Switch workspaces or open a workspace page.
          </SheetDescription>
        </SheetHeader>
        <div className="sheet-demo-nav-inner">
          <p className="sheet-demo-nav-workspace">Meadow Co-op</p>
          <nav aria-label="Workspace">
            <ul>
              {navItems.map((item) => (
                <li key={item}>
                  <a
                    href={`#${item.toLowerCase()}`}
                    aria-current={item === current ? "page" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrent(item);
                      setOpen(false);
                    }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Table more menu                                                     */
/* ------------------------------------------------------------------ */

const deletedRows = [
  {
    label: "Harbor Foods — weekly order",
    when: "Deleted 3 days ago by Amara Osei",
  },
  { label: "Northside Florists — trial", when: "Deleted 12 days ago by you" },
];
const schemaHistory = [
  { change: "Added field “Delivery day”", when: "Revision 7 · yesterday" },
  {
    change: "Renamed “Client” to “Customer”",
    when: "Revision 6 · 2 weeks ago",
  },
  { change: "Made “Email” unique", when: "Revision 5 · last month" },
];

function TableMore() {
  const [panel, setPanel] = useState<"deleted" | "schema" | null>(null);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="More table options"
            />
          }
        >
          <MoreH size={16} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" size="menu">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setPanel("deleted")}>
              Deleted rows
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPanel("schema")}>
              Schema history
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Sheet
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <SheetContent size="xl">
          <SheetHeader>
            <SheetTitle>
              {panel === "deleted" ? "Deleted rows" : "Schema history"}
            </SheetTitle>
            <SheetDescription>
              {panel === "deleted"
                ? "Deleted rows stay recoverable for 30 days."
                : "Field definitions and the changes that produced them."}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <ul className="sheet-demo-list">
              {(panel === "deleted"
                ? deletedRows.map((row) => [row.label, row.when] as const)
                : schemaHistory.map((row) => [row.change, row.when] as const)
              ).map(([label, when]) => (
                <li key={label} className="sheet-demo-item">
                  <div className="sheet-demo-item-text">
                    <span className="sheet-demo-item-title">{label}</span>
                    <span className="sheet-demo-muted">{when}</span>
                  </div>
                  {panel === "deleted" && (
                    <Button variant="outline" size="sm">
                      Restore
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Import skills (agent builder)                                       */
/* ------------------------------------------------------------------ */

function ImportSkills() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tries, setTries] = useState(0);
  const field = useId();
  const later = useLater();
  function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    later(() => {
      setBusy(false);
      if (tries === 0)
        setError(
          "Could not read meadow/skills. Check the address and try again.",
        );
      else setOpen(false);
      setTries((value) => value + 1);
    });
  }
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setTries(0);
          setError("");
          setOpen(true);
        }}
      >
        Import skills
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent size="lg">
          <SheetHeader>
            <SheetTitle>Import skills for this agent</SheetTitle>
            <SheetDescription>
              Review before installing. Installed skills stay in your workspace
              even if you discard the agent draft.
            </SheetDescription>
          </SheetHeader>
          <SheetBody
            render={<form onSubmit={submit} />}
            className="sheet-demo-pad"
          >
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <TextField
              id={field}
              label="Repository"
              defaultValue="meadow/skills"
              required
            />
            <div className="sheet-demo-row-end">
              <Button type="submit" disabled={busy} aria-busy={busy}>
                {busy && <Spinner />}
                {busy ? "Reading repository…" : "Review skills"}
              </Button>
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* GitHub integration: initialFocus on the title                       */
/* ------------------------------------------------------------------ */

function GitHubIntegration() {
  const title = useRef<HTMLHeadingElement>(null);
  const [repos, setRepos] = useState<string[]>(["meadow/web"]);
  const all = [
    "meadow/web",
    "meadow/api",
    "meadow/greenhouse-sensors",
    "meadow/docs",
  ];
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        <BrandIcon brand="github" size="inline" />
        GitHub
      </SheetTrigger>
      <SheetContent size="xl" initialFocus={title}>
        <div className="sheet-demo-bar">
          <BrandIcon brand="github" size="sm" />
          <SheetTitle ref={title} tabIndex={-1}>
            GitHub
          </SheetTitle>
          <div className="sr-only">
            <SheetDescription>
              Connect your GitHub account and import repositories into
              Knowledge.
            </SheetDescription>
          </div>
        </div>
        <div className="sheet-demo-scroll sheet-demo-pad">
          <p className="sheet-demo-muted">
            Ask about repositories, issues and pull requests in your personal
            chats. Supported changes need your approval.
          </p>
          <fieldset className="sheet-demo-fieldset">
            <legend>Repositories to import</legend>
            {all.map((repo) => {
              const id = `repo-${repo.replace(/\W+/g, "-")}`;
              return (
                <div key={repo} className="dialog-demo-check">
                  <input
                    id={id}
                    type="checkbox"
                    checked={repos.includes(repo)}
                    onChange={(event) =>
                      setRepos((list) =>
                        event.target.checked
                          ? [...list, repo]
                          : list.filter((item) => item !== repo),
                      )
                    }
                  />
                  <label htmlFor={id}>{repo}</label>
                </div>
              );
            })}
          </fieldset>
        </div>
        <SheetFooter className="sheet-demo-footer-bar">
          <p className="sheet-demo-muted">{repos.length} selected</p>
          <Button disabled={!repos.length}>Import into Knowledge</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

type CalendarPanel = "filters" | "tasks" | "follow" | "find";

const panelTitles: Record<CalendarPanel, string> = {
  filters: "Calendar filters",
  tasks: "Pending work",
  follow: "Follow workflows",
  find: "Find free time",
};
const panelDescriptions: Record<CalendarPanel, string> = {
  filters: "Choose which events and time zones to show.",
  tasks: "Tasks and approvals that need your attention.",
  follow:
    "Follow a workflow to see its schedule. Following does not grant access.",
  find: "Your connected calendars only. This does not check guests’ availability.",
};

function CalendarPanels() {
  const [panel, setPanel] = useState<CalendarPanel | null>(null);
  const [shown, setShown] = useState<CalendarPanel>("filters");
  const open = (next: CalendarPanel) => {
    setShown(next);
    setPanel(next);
  };
  return (
    <>
      {(Object.keys(panelTitles) as CalendarPanel[]).map((key) => (
        <Button key={key} variant="outline" size="sm" onClick={() => open(key)}>
          {panelTitles[key]}
        </Button>
      ))}
      <Sheet
        open={panel !== null}
        onOpenChange={(next) => {
          if (!next) setPanel(null);
        }}
      >
        <SheetContent size="lg" side={shown === "filters" ? "left" : "right"}>
          <SheetHeader>
            <SheetTitle>{panelTitles[shown]}</SheetTitle>
            <SheetDescription>{panelDescriptions[shown]}</SheetDescription>
          </SheetHeader>
          <SheetBody>
            {shown === "filters" && <CalendarFilters />}
            {shown === "tasks" && <PendingWork />}
            {shown === "follow" && (
              <p className="sheet-demo-muted">
                You follow 1 workflow. Its runs appear on your calendar.
              </p>
            )}
            {shown === "find" && (
              <ul className="sheet-demo-list">
                {[
                  "Tue 22 Oct · 10:00–11:30",
                  "Tue 22 Oct · 14:00–15:00",
                  "Wed 23 Oct · 09:00–12:00",
                ].map((slot) => (
                  <li key={slot} className="sheet-demo-item">
                    <span className="sheet-demo-item-title">{slot}</span>
                    <Button variant="outline" size="sm">
                      Hold
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}

function CalendarEvent() {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        <Calendar size={16} aria-hidden="true" />
        Supplier sync
      </SheetTrigger>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>Supplier sync with Harbor Foods</SheetTitle>
          <SheetDescription>
            Tue 22 Oct, 14:00–14:45 (Europe/London)
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="sheet-demo-badges">
            <Badge variant="secondary">confirmed</Badge>
            <Badge variant="outline">customers</Badge>
            <Badge variant="outline">weekly</Badge>
          </div>
          <dl className="sheet-demo-dl">
            <dt>Calendar</dt>
            <dd>Work · amara@meadow.example</dd>
            <dt>Time zone</dt>
            <dd>Europe London</dd>
            <dt>Location</dt>
            <dd>Northside greenhouse, meeting room 2</dd>
          </dl>
          <div className="sheet-demo-inline">
            <Button
              nativeButton={false}
              render={
                <a
                  href="#join-meeting"
                  onClick={(event) => event.preventDefault()}
                />
              }
            >
              Join meeting
              <ArrowUpRight size={14} aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <a
                  href="#open-original"
                  onClick={(event) => event.preventDefault()}
                />
              }
            >
              Open original
              <ArrowUpRight size={14} aria-hidden="true" />
            </Button>
          </div>
          <p className="sheet-demo-note">Blocks your personal free time.</p>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function CreateEvent() {
  const [open, setOpen] = useState(false);
  const title = useId();
  const date = useId();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button />}>Create event</SheetTrigger>
      <SheetContent size="lg" keepMounted>
        <SheetHeader>
          <SheetTitle>Create event</SheetTitle>
          <SheetDescription>
            A meeting, focus block, or time to work on a task. Closing keeps
            your draft on this page.
          </SheetDescription>
        </SheetHeader>
        <SheetBody
          render={
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setOpen(false);
              }}
            />
          }
        >
          <TextField
            id={title}
            label="Title"
            placeholder="Planning with the field crew"
          />
          <TextField id={date} label="Date" defaultValue="Tue 22 Oct, 09:00" />
          <div className="sheet-demo-row-end">
            <Button type="submit">Create event</Button>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Member profile: locked while a save runs                            */
/* ------------------------------------------------------------------ */

function MemberProfile() {
  const [mounted, setMounted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [notice, setNotice] = useState("");
  const later = useLater();
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setNotice("");
          setMounted(true);
        }}
      >
        Profile and photo
      </Button>
      {mounted && (
        <Sheet
          open
          onOpenChange={(open) => {
            if (!open && !locked) setMounted(false);
          }}
        >
          <SheetContent size="lg" showCloseButton={!locked}>
            <SheetHeader>
              <SheetTitle>Member profile</SheetTitle>
              <SheetDescription>
                Kofi Mensah · kofi@meadow.example
              </SheetDescription>
            </SheetHeader>
            <SheetBody>
              <p className="sheet-demo-muted">
                This person has no active account link. An editor can manage
                their name and photo here. This does not grant workspace access.
              </p>
              <section aria-label="Member photo" className="sheet-demo-photo">
                <h3>Photo</h3>
                <div className="sheet-demo-inline">
                  <span className="sheet-demo-avatar" aria-hidden="true">
                    KM
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={locked}
                    aria-busy={locked}
                    onClick={() => {
                      setLocked(true);
                      setNotice("");
                      later(() => {
                        setLocked(false);
                        setNotice("Member photo saved.");
                      }, 1400);
                    }}
                  >
                    {locked && <Spinner />}
                    {locked ? "Saving photo…" : "Replace photo"}
                  </Button>
                </div>
                <p className="sheet-demo-muted">
                  PNG, JPEG, or WebP, up to 2 MB. While it saves, Escape and the
                  close button are turned off.
                </p>
              </section>
              <p role="status" className="sheet-demo-status">
                {notice}
              </p>
            </SheetBody>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Record editor: sticky footer, confirm before leaving                */
/* ------------------------------------------------------------------ */

function RecordEditor({
  title = "Edit row",
  description = "Customers: Harbor Foods",
  onClose,
}: {
  title?: string;
  description?: string;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    name: "Harbor Foods",
    email: "orders@harbor.example",
    day: "tue",
  });
  const [dirty, setDirty] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const later = useLater();
  const ids = { name: useId(), email: useId() };
  function requestClose() {
    if (sending) return;
    if (dirty) setConfirm(true);
    else onClose();
  }
  function change(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <SheetContent size="lg" showCloseButton={!sending}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <SheetBody
          className="sheet-demo-editor"
          render={
            <form
              aria-label={title}
              onSubmit={(event) => {
                event.preventDefault();
                setSending(true);
                later(() => {
                  setSending(false);
                  setDirty(false);
                  onClose();
                }, 1200);
              }}
            />
          }
        >
          <fieldset disabled={sending} className="sheet-demo-editor-fields">
            <TextField
              id={ids.name}
              label="Customer"
              value={values.name}
              onChange={(event) => change("name", event.target.value)}
              required
            />
            <TextField
              id={ids.email}
              label="Order email"
              type="email"
              value={values.email}
              onChange={(event) => change("email", event.target.value)}
            />
            <SelectField
              label="Delivery day"
              value={values.day}
              items={[
                { value: "mon", label: "Monday" },
                { value: "tue", label: "Tuesday" },
                { value: "thu", label: "Thursday" },
              ]}
              onValueChange={(value) => change("day", value)}
            />
            <p className="sheet-demo-muted">
              Must be unique: Customer + Order email.
            </p>
          </fieldset>
          <div className="sheet-demo-sticky">
            {dirty && !sending && (
              <p className="sheet-demo-muted">Unsaved changes</p>
            )}
            <Button variant="outline" disabled={sending} onClick={onClose}>
              Discard edits
            </Button>
            <Button type="submit" disabled={sending} aria-busy={sending}>
              {sending && <Spinner />}
              {sending ? "Saving row…" : "Save row"}
            </Button>
          </div>
        </SheetBody>
        <Dialog open={confirm} onOpenChange={setConfirm}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Leave these edits?</DialogTitle>
              <DialogDescription>
                Your unsaved row changes will be lost.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Keep editing
              </DialogClose>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirm(false);
                  onClose();
                }}
              >
                Leave editor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function EditRow() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Edit row
      </Button>
      {open && <RecordEditor onClose={() => setOpen(false)} />}
    </>
  );
}

export function SheetPatterns() {
  return (
    <Example
      title="Cloud patterns"
      description="Compositions from TulipFarm Cloud with sample data. Nothing leaves this page."
    >
      <Row
        label="Workspace navigation"
        note="Sidebar on phones · left or right · custom width · finalFocus"
      >
        <NavigationDrawer side="left" />
        <NavigationDrawer side="right" />
      </Row>
      <Row label="Table options" note="Menu item opens xl sheet">
        <TableMore />
      </Row>
      <Row label="Import skills" note="lg · controlled · inline error">
        <ImportSkills />
      </Row>
      <Row label="GitHub" note="xl · initialFocus on title · footer bar">
        <GitHubIntegration />
      </Row>
      <Row
        label="Calendar panels"
        note="One sheet · filters from the left, others from the right"
      >
        <CalendarPanels />
      </Row>
      <Row label="Calendar event" note="lg · badges, details, link buttons">
        <CalendarEvent />
      </Row>
      <Row label="Create event" note="lg · keepMounted keeps the draft">
        <CreateEvent />
      </Row>
      <Row label="Member profile" note="lg · close button hidden while saving">
        <MemberProfile />
      </Row>
      <Row label="Edit row" note="lg · sticky actions · confirm before leaving">
        <EditRow />
      </Row>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* States: member profile status                                       */
/* ------------------------------------------------------------------ */

type Result = "loading" | "error" | "empty" | "ready";

function MemberStatus({
  result,
  onClose,
}: {
  result: Result;
  onClose: () => void;
}) {
  const [repair, setRepair] = useState(false);
  const [state, setState] = useState<Result>(result);
  const later = useLater();
  function check() {
    setState("loading");
    later(() => setState(result === "error" ? "ready" : result));
  }
  return (
    <>
      <Sheet
        open
        onOpenChange={(open) => {
          if (!open && !repair) onClose();
        }}
      >
        <SheetContent size="lg">
          <SheetHeader>
            <SheetTitle>Member profile status</SheetTitle>
            <SheetDescription>
              Pending updates are not missing people. Check status after a sync,
              or complete a member whose access was removed before setup
              finished.
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            {state === "loading" && (
              <div
                role="status"
                aria-label="Loading member profiles"
                className="sheet-demo-skeletons"
              >
                <Skeleton />
                <Skeleton />
                <Skeleton />
              </div>
            )}
            {state === "error" && (
              <StatePanel
                kind="error"
                heading="h3"
                title="Could not load member profiles"
                description="Check your connection, then try again."
              >
                <Button variant="outline" onClick={check}>
                  Try again
                </Button>
              </StatePanel>
            )}
            {state === "empty" && (
              <>
                <p>0 pending · 0 need retry · 0 need setup</p>
                <p className="sheet-demo-muted">
                  No member profiles need attention right now.
                </p>
              </>
            )}
            {state === "ready" && (
              <>
                <p>1 pending · 0 need retry · 1 need setup</p>
                <ul className="sheet-demo-list">
                  <li className="sheet-demo-member">
                    <p className="sheet-demo-item-title">Ama Boateng</p>
                    <Badge variant="warning">Needs setup</Badge>
                    <p className="sheet-demo-muted">
                      Access was removed before this profile was ready. Enter
                      the person’s business details to keep the same member
                      identity. This does not restore access.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRepair(true)}
                    >
                      Complete member
                    </Button>
                  </li>
                  <li className="sheet-demo-member">
                    <p className="sheet-demo-item-title">Yaw Darko</p>
                    <Badge variant="secondary">Update pending</Badge>
                  </li>
                </ul>
              </>
            )}
            {state !== "loading" && state !== "error" && (
              <div>
                <Button variant="outline" onClick={check}>
                  Check profile status
                </Button>
              </div>
            )}
          </SheetBody>
          {repair && (
            <RecordEditor
              title="Complete member"
              description="Members: create a person without sending an invitation or granting access."
              onClose={() => setRepair(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export function SheetStates() {
  const [result, setResult] = useState<Result>("ready");
  const [open, setOpen] = useState(false);
  return (
    <Example
      title="States"
      description="Loading, error, empty, and a list with a nested editor. The status sheet stays open while the editor on top is open."
    >
      <Row label="Member profile status" note="Pick a result, then open">
        <SelectField
          label="Result"
          value={result}
          items={[
            { value: "ready", label: "Needs attention" },
            { value: "loading", label: "Loading" },
            { value: "error", label: "Error" },
            { value: "empty", label: "Empty" },
          ]}
          onValueChange={setResult}
        />
        <Button variant="outline" onClick={() => setOpen(true)}>
          Check status
        </Button>
        {open && (
          <MemberStatus
            key={result}
            result={result}
            onClose={() => setOpen(false)}
          />
        )}
      </Row>
    </Example>
  );
}
