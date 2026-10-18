import { useId, useState, type ReactNode } from "react";
import { ArrowLeft } from "reicon-react/icons/ArrowLeft";
import { Check } from "reicon-react/icons/Check";
import { Eye } from "reicon-react/icons/Eye";
import { Filter } from "reicon-react/icons/Filter";
import { ShieldCheck } from "reicon-react/icons/ShieldCheck";
import { Users } from "reicon-react/icons/Users";
import { Badge } from "@tulipfarm/sprout/badge";
import { BrandIcon } from "@tulipfarm/sprout/brand-icon";
import { Button } from "@tulipfarm/sprout/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@tulipfarm/sprout/collapsible";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  sheetSideNames,
  sheetSizeNames,
  sheetTitleSizeNames,
  type SheetSide,
  type SheetSize,
  type SheetTitleSize,
} from "@tulipfarm/sprout/sheet";
import DocsSelect from "./DocsSelect";
import { Example, Row, TextAreaField } from "./dialog-demo-parts";
import "../styles/sheet-demo.css";

/* ------------------------------------------------------------------ */
/* Sample adapters                                                     */
/* ------------------------------------------------------------------ */

const pendingWork = [
  {
    title: "Approve Q3 vendor invoice",
    detail: "Finance approvals · due today",
    tag: "Approval",
  },
  {
    title: "Reply to Harbor Foods intake",
    detail: "Sales inbox · 2 days waiting",
    tag: "Task",
  },
  {
    title: "Review onboarding checklist",
    detail: "People ops · due Friday",
    tag: "Task",
  },
  {
    title: "Confirm field crew rota for the Northside greenhouse rebuild",
    detail: "Operations · due next Monday",
    tag: "Approval",
  },
];

export function PendingWork() {
  return (
    <ul className="sheet-demo-list">
      {pendingWork.map((item) => (
        <li key={item.title} className="sheet-demo-item">
          <div className="sheet-demo-item-text">
            <span className="sheet-demo-item-title">{item.title}</span>
            <span className="sheet-demo-muted">{item.detail}</span>
          </div>
          <Badge variant={item.tag === "Approval" ? "info" : "secondary"}>
            {item.tag}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

const workflows = [
  { name: "Weekly payroll export", schedule: "Mondays at 08:00" },
  { name: "Invoice reminders", schedule: "Daily at 17:30" },
  { name: "Greenhouse sensor digest", schedule: "Every 6 hours" },
];

function FollowWorkflows() {
  const [following, setFollowing] = useState<string[]>(["Invoice reminders"]);
  return (
    <ul className="sheet-demo-list">
      {workflows.map((workflow) => {
        const on = following.includes(workflow.name);
        return (
          <li key={workflow.name} className="sheet-demo-item">
            <div className="sheet-demo-item-text">
              <span className="sheet-demo-item-title">{workflow.name}</span>
              <span className="sheet-demo-muted">{workflow.schedule}</span>
            </div>
            <Button
              variant={on ? "secondary" : "outline"}
              size="sm"
              aria-pressed={on}
              onClick={() =>
                setFollowing((list) =>
                  on
                    ? list.filter((name) => name !== workflow.name)
                    : [...list, workflow.name],
                )
              }
            >
              {on && <Check size={14} aria-hidden="true" />}
              {on ? "Following" : "Follow"}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

/** A visible label above a Base UI select, like Cloud's filter fields. */
export function SelectField<Value extends string>({
  label,
  value,
  items,
  onValueChange,
}: {
  label: string;
  value: Value;
  items: readonly { value: Value; label: string }[];
  onValueChange: (value: Value) => void;
}) {
  return (
    <div className="sheet-demo-field">
      <span className="sheet-demo-field-label" aria-hidden="true">
        {label}
      </span>
      <DocsSelect
        label={label}
        value={value}
        items={items}
        onValueChange={onValueChange}
        className="sheet-demo-select"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Playground                                                          */
/* ------------------------------------------------------------------ */

export function SheetPlayground() {
  const [side, setSide] = useState<SheetSide>("right");
  const [size, setSize] = useState<SheetSize>("lg");
  const [titleSize, setTitleSize] = useState<SheetTitleSize>("default");
  const [corner, setCorner] = useState(true);
  return (
    <section className="dialog-demo-playground" aria-label="Sheet playground">
      <div className="dialog-demo-controls">
        <DocsSelect
          label="Side"
          value={side}
          items={sheetSideNames.map((value) => ({ value, label: value }))}
          onValueChange={setSide}
        />
        <DocsSelect
          label="Size"
          value={size}
          items={sheetSizeNames.map((value) => ({ value, label: value }))}
          onValueChange={setSize}
        />
        <DocsSelect
          label="Title size"
          value={titleSize}
          items={sheetTitleSizeNames.map((value) => ({
            value,
            label: `title ${value}`,
          }))}
          onValueChange={setTitleSize}
        />
        <Button
          variant="outline"
          size="sm"
          aria-pressed={corner}
          onClick={() => setCorner(!corner)}
        >
          Corner close
        </Button>
      </div>
      <div className="dialog-demo-stage">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>
            Open {side} {size} sheet
          </SheetTrigger>
          <SheetContent side={side} size={size} showCloseButton={corner}>
            <SheetHeader>
              <SheetTitle size={titleSize}>Pending work</SheetTitle>
              <SheetDescription>
                Tasks and approvals that need your attention.
              </SheetDescription>
            </SheetHeader>
            <SheetBody>
              <PendingWork />
            </SheetBody>
            <SheetFooter>
              <SheetClose render={<Button variant="outline" />}>
                Done
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sides                                                               */
/* ------------------------------------------------------------------ */

const fileTypes = [
  { value: "any", label: "Any type" },
  { value: "documents", label: "Documents" },
  { value: "spreadsheets", label: "Spreadsheets" },
  { value: "images", label: "Images" },
] as const;
const owners = [
  { value: "anyone", label: "Anyone" },
  { value: "me", label: "Owned by me" },
  { value: "amara", label: "Amara Osei" },
] as const;
const sorts = [
  { value: "updated", label: "Last updated" },
  { value: "name", label: "Name A–Z" },
  { value: "size", label: "Largest first" },
] as const;

type FileType = (typeof fileTypes)[number]["value"];
type Owner = (typeof owners)[number]["value"];
type SortKey = (typeof sorts)[number]["value"];

/** Files filter bar: a labelled trigger on phones, an icon trigger in compact toolbars. */
export function FilesFilters({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FileType>("documents");
  const [owner, setOwner] = useState<Owner>("me");
  const [sort, setSort] = useState<SortKey>("updated");
  const count = Number(type !== "any") + Number(owner !== "anyone");
  const reset = count > 0 && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        setType("any");
        setOwner("anyone");
      }}
    >
      Clear filters
    </Button>
  );
  return (
    <div
      role="group"
      aria-label={compact ? "Selection filter and sort" : "Filter and sort"}
      className="sheet-demo-inline"
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="outline"
              size={compact ? "icon-sm" : "sm"}
              aria-label={compact ? "Filter and sort" : undefined}
            />
          }
        >
          <Filter size={14} aria-hidden="true" />
          {!compact && (count ? `Filters (${count})` : "Filter and sort")}
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Filter and sort</SheetTitle>
            <SheetDescription>Results update as you choose.</SheetDescription>
          </SheetHeader>
          <div className="sheet-demo-fields">
            <SelectField
              label="Type"
              value={type}
              items={fileTypes}
              onValueChange={setType}
            />
            <SelectField
              label="Owner"
              value={owner}
              items={owners}
              onValueChange={setOwner}
            />
            <SelectField
              label="Sort by"
              value={sort}
              items={sorts}
              onValueChange={setSort}
            />
          </div>
          <SheetFooter>
            <Button onClick={() => setOpen(false)}>Show results</Button>
            {reset}
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {!open && !compact && reset}
    </div>
  );
}

const calendars = ["Work", "Personal", "Team on-call", "Holidays in Ghana"];

export function CalendarFilters() {
  const [shown, setShown] = useState(["Work", "Team on-call"]);
  const [zone, setZone] = useState("Europe/London");
  return (
    <>
      <fieldset className="sheet-demo-fieldset">
        <legend>Calendars</legend>
        {calendars.map((name) => {
          const id = `calendar-${name.replace(/\W+/g, "-").toLowerCase()}`;
          return (
            <div key={name} className="dialog-demo-check">
              <input
                id={id}
                type="checkbox"
                checked={shown.includes(name)}
                onChange={(event) =>
                  setShown((list) =>
                    event.target.checked
                      ? [...list, name]
                      : list.filter((item) => item !== name),
                  )
                }
              />
              <label htmlFor={id}>{name}</label>
            </div>
          );
        })}
      </fieldset>
      <SelectField
        label="Second time zone"
        value={zone}
        items={[
          { value: "Europe/London", label: "London (GMT+1)" },
          { value: "Africa/Accra", label: "Accra (GMT)" },
          { value: "America/New_York", label: "New York (GMT−4)" },
        ]}
        onValueChange={setZone}
      />
    </>
  );
}

export function SheetSides() {
  return (
    <Example
      title="Sides"
      description="Each side as Cloud opens it. Escape, the overlay, or a close button dismisses the sheet; nothing is saved."
    >
      <Row label="Top" note="Notice · default · SheetClose in footer">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>
            Maintenance notice
          </SheetTrigger>
          <SheetContent side="top">
            <SheetHeader>
              <SheetTitle>Scheduled maintenance</SheetTitle>
              <SheetDescription>
                Sync pauses on Sunday from 02:00 to 02:30 UTC. Drafts stay on
                this device.
              </SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <SheetClose render={<Button variant="outline" />}>
                Got it
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </Row>
      <Row label="Right" note="Calendar pending work · default">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>
            Pending work
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Pending work</SheetTitle>
              <SheetDescription>
                Tasks and approvals that need your attention.
              </SheetDescription>
            </SheetHeader>
            <SheetBody>
              <PendingWork />
            </SheetBody>
          </SheetContent>
        </Sheet>
      </Row>
      <Row
        label="Bottom"
        note="Files filters · sm trigger with count, icon-sm compact trigger"
      >
        <FilesFilters />
        <FilesFilters compact />
      </Row>
      <Row label="Left" note="Calendar filters · lg">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>
            Calendar filters
          </SheetTrigger>
          <SheetContent side="left" size="lg">
            <SheetHeader>
              <SheetTitle>Calendar filters</SheetTitle>
              <SheetDescription>
                Choose which events and time zones to show.
              </SheetDescription>
            </SheetHeader>
            <SheetBody>
              <CalendarFilters />
            </SheetBody>
          </SheetContent>
        </Sheet>
      </Row>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Sizes                                                               */
/* ------------------------------------------------------------------ */

const permissions = [
  { text: "Read messages in channels you choose", asksFirst: false },
  { text: "Post messages as you", asksFirst: true },
  { text: "Create channels", asksFirst: true },
];

function Panel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Collapsible className="sheet-demo-panel">
      <CollapsibleTrigger className="sheet-demo-panel-trigger">
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent keepMounted>
        <div className="sheet-demo-panel-body">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Cloud's integration detail: breadcrumb bar, large title, scrolling sections. */
export function SlackIntegration() {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        Slack integration
      </SheetTrigger>
      <SheetContent size="xl">
        <div className="sheet-demo-bar">
          <span>Integrations</span>
          <span aria-hidden="true">/</span>
          <span className="sheet-demo-bar-current">Slack</span>
        </div>
        <div className="sheet-demo-scroll">
          <SheetHeader>
            <div className="sheet-demo-hero">
              <BrandIcon brand="slack" size="xl" />
              <div className="sheet-demo-hero-text">
                <SheetTitle size="lg">Slack</SheetTitle>
                <p className="sheet-demo-muted sheet-demo-truncate">
                  By Slack Technologies
                </p>
              </div>
              <Button>Connect</Button>
            </div>
            <div className="sheet-demo-badges">
              <Badge variant="secondary">Not connected</Badge>
              <Badge variant="outline">Communication</Badge>
            </div>
            <SheetDescription className="sheet-demo-blurb">
              Ask about conversations, summarize channels, and draft replies.
              Messages are only sent after you approve them.
            </SheetDescription>
          </SheetHeader>
          <section className="sheet-demo-section" aria-labelledby="slack-can">
            <h3 id="slack-can">What it can do</h3>
            <ul className="sheet-demo-can">
              {permissions.map((item) => (
                <li key={item.text}>
                  <span>{item.text}</span>
                  {item.asksFirst && (
                    <Badge variant="info">
                      <ShieldCheck aria-hidden="true" />
                      Asks first
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
            <p className="sheet-demo-audience">
              <Users size={16} aria-hidden="true" />
              Only you can use your connection.
            </p>
          </section>
          <Panel label="Your account">
            <p className="sheet-demo-muted">
              No Slack account is connected yet.
            </p>
          </Panel>
          <Panel label="Settings">
            <p className="sheet-demo-muted">
              Admins choose which channels can be searched.
            </p>
          </Panel>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Mobile canvas: full screen, no corner close, kept mounted so the draft survives. */
export function CanvasSheet() {
  const [open, setOpen] = useState(false);
  const draft = useId();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" />}>
        Open canvas
      </SheetTrigger>
      <SheetContent
        side="right"
        size="full"
        showCloseButton={false}
        keepMounted
        finalFocus={!open}
      >
        <div className="sr-only">
          <SheetTitle>Canvas</SheetTitle>
          <SheetDescription>
            Detailed result. Return to chat to continue the conversation.
          </SheetDescription>
        </div>
        <div className="sheet-demo-canvas-bar">
          <SheetClose render={<Button variant="ghost" size="sm" />}>
            <ArrowLeft size={14} aria-hidden="true" />
            Back to chat
          </SheetClose>
          <span className="sheet-demo-truncate">Harbor Foods proposal</span>
        </div>
        <SheetBody className="sheet-demo-canvas-body">
          <TextAreaField
            id={draft}
            label="Proposal draft"
            rows={8}
            defaultValue={
              "Harbor Foods — supply proposal\n\nWeekly delivery of 120 crates from the Northside greenhouse, starting 4 November."
            }
          />
          <p className="sheet-demo-muted">
            Edits stay here when you return to chat and reopen the canvas.
          </p>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export function AgentView() {
  return (
    <div
      className="sheet-demo-chat"
      aria-label="Test chat preview"
      role="group"
    >
      <p className="sheet-demo-bubble sheet-demo-bubble-user">
        Which invoices are overdue?
      </p>
      <p className="sheet-demo-bubble">
        Three invoices are overdue: Harbor Foods (£1,240), Meadow Co-op (£860),
        and Northside Florists (£410). In test chat I can’t send reminders.
      </p>
    </div>
  );
}

export function SheetSizes() {
  return (
    <Example
      title="Sizes"
      description="default 24rem, lg 32rem, xl 42rem, and full screen. Below 640px side sheets take 75% of the width, and lg and xl take all of it."
    >
      <Row label="default" note="Follow workflows · title default">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>
            Follow workflows
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Follow workflows</SheetTitle>
              <SheetDescription>
                Follow a workflow to see its schedule. Following does not grant
                access.
              </SheetDescription>
            </SheetHeader>
            <SheetBody>
              <FollowWorkflows />
            </SheetBody>
          </SheetContent>
        </Sheet>
      </Row>
      <Row
        label="lg"
        note="Agent builder preview · icon trigger · title default"
      >
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>
            <Eye size={16} aria-hidden="true" />
            View agent
          </SheetTrigger>
          <SheetContent size="lg">
            <SheetHeader>
              <SheetTitle>Agent view</SheetTitle>
              <SheetDescription>
                Changes follow your draft. Test chat cannot take actions.
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="sheet-demo-pad">
              <AgentView />
            </SheetBody>
          </SheetContent>
        </Sheet>
      </Row>
      <Row label="xl" note="Integration detail · title lg · custom top bar">
        <SlackIntegration />
      </Row>
      <Row label="full" note="Mobile canvas · no corner close · keepMounted">
        <CanvasSheet />
      </Row>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Swipe to close                                                      */
/* ------------------------------------------------------------------ */

const stockFilters = ["In stock", "Low stock", "Out of stock", "Discontinued"];

function MobileFilters() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(["In stock", "Low stock"]);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" />}>
        Stock filters
      </SheetTrigger>
      <SheetContent side="bottom" showSwipeHandle>
        <SheetHeader>
          <SheetTitle>Stock filters</SheetTitle>
          <SheetDescription>
            Swipe down or press Show results to close.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <fieldset className="sheet-demo-fieldset">
            <legend>Stock level</legend>
            {stockFilters.map((name) => {
              const id = `stock-${name.replace(/\W+/g, "-").toLowerCase()}`;
              return (
                <div key={name} className="dialog-demo-check">
                  <input
                    id={id}
                    type="checkbox"
                    checked={shown.includes(name)}
                    onChange={(event) =>
                      setShown((list) =>
                        event.target.checked
                          ? [...list, name]
                          : list.filter((item) => item !== name),
                      )
                    }
                  />
                  <label htmlFor={id}>{name}</label>
                </div>
              );
            })}
          </fieldset>
        </SheetBody>
        <SheetFooter>
          <Button onClick={() => setOpen(false)}>Show results</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function RecordNotes() {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        Record notes
      </SheetTrigger>
      <SheetContent showSwipeHandle>
        <SheetHeader>
          <SheetTitle>Record notes</SheetTitle>
          <SheetDescription>
            Swipe right on a touch screen to close.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <p className="sheet-demo-muted">
            Harbor Foods asked for a revised delivery window. The crew lead
            confirmed two drivers for Thursday morning.
          </p>
          <TextAreaField
            id="record-notes-draft"
            label="Note"
            defaultValue="Call Harbor Foods before Thursday to confirm the new window."
            rows={4}
          />
        </SheetBody>
        <SheetFooter>
          <SheetClose render={<Button variant="outline" />}>Done</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function SheetSwipe() {
  return (
    <Example
      title="Swipe to close"
      description="Swipe toward the edge on a touch screen. A short swipe springs back."
    >
      <Row
        label="Bottom with handle"
        note="Mobile filters · showSwipeHandle · swipe down"
      >
        <MobileFilters />
      </Row>
      <Row
        label="Right with handle"
        note="Notes form · swipe right · mouse selects text"
      >
        <RecordNotes />
      </Row>
    </Example>
  );
}
