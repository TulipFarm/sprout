import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Filter } from "reicon-react/icons/Filter";
import { Hashtag } from "reicon-react/icons/Hashtag";
import { BrandIcon, type Brand } from "@tulipfarm/sprout/brand-icon";
import { Button } from "@tulipfarm/sprout/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@tulipfarm/sprout/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  type SelectTriggerSize,
} from "@tulipfarm/sprout/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@tulipfarm/sprout/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@tulipfarm/sprout/tooltip";
import "../styles/select-demo.css";

const durations = [
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "90 minutes" },
];

const repeats = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Every week" },
];

const timeZones = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Stockholm",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const calendars = [
  { value: "primary", label: "dana@acme.com" },
  { value: "team", label: "Customer success" },
  { value: "launches", label: "Launch calendar" },
];

function DemoField({
  id,
  label,
  marker,
  helper,
  error,
  srOnlyLabel = false,
  children,
}: {
  id: string;
  label: string;
  marker?: "required" | "optional";
  helper?: ReactNode;
  error?: ReactNode;
  srOnlyLabel?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="select-demo-field" data-invalid={error ? "" : undefined}>
      <label
        htmlFor={id}
        className={srOnlyLabel ? "select-demo-sr-only" : "select-demo-label"}
      >
        {label}
        {marker === "required" && (
          <span className="select-demo-marker">Required</span>
        )}
        {marker === "optional" && (
          <span className="select-demo-marker">Optional</span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="select-demo-error">
          {error}
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className="select-demo-helper">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export function SelectPlayground() {
  const id = useId();
  const [calendar, setCalendar] = useState("primary");
  const [duration, setDuration] = useState("30");
  const [repeat, setRepeat] = useState("none");
  const [zone, setZone] = useState("America/Los_Angeles");
  return (
    <div className="select-demo-panel" data-demo="select-playground">
      <div className="select-demo-stage">
        <form
          className="select-demo-form"
          aria-label="New event"
          onSubmit={(event) => event.preventDefault()}
        >
          <DemoField id={`${id}-calendar`} label="Calendar">
            <Select
              items={calendars}
              value={calendar}
              onValueChange={(value) => value && setCalendar(value)}
            >
              <SelectTrigger id={`${id}-calendar`} width="full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {calendars.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DemoField>
          <div className="select-demo-row">
            <DemoField id={`${id}-duration`} label="Duration">
              <Select
                items={durations}
                value={duration}
                onValueChange={(value) => value && setDuration(value)}
              >
                <SelectTrigger id={`${id}-duration`} width="full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durations.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DemoField>
            <DemoField id={`${id}-repeat`} label="Repeat">
              <Select
                items={repeats}
                value={repeat}
                onValueChange={(value) => value && setRepeat(value)}
              >
                <SelectTrigger id={`${id}-repeat`} width="full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {repeats.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DemoField>
          </div>
          <DemoField
            id={`${id}-zone`}
            label="Time zone"
            helper="Guests see the time in their own zone."
          >
            <Select
              value={zone}
              onValueChange={(value) => value && setZone(value)}
            >
              <SelectTrigger
                id={`${id}-zone`}
                width="full"
                aria-describedby={`${id}-zone-helper`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeZones.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DemoField>
        </form>
      </div>
      <p className="select-demo-readout" aria-live="polite">
        {calendars.find((item) => item.value === calendar)?.label} ·{" "}
        {durations.find((item) => item.value === duration)?.label} ·{" "}
        {repeats.find((item) => item.value === repeat)?.label} · {zone}
      </p>
    </div>
  );
}

const teams = [
  { value: "", label: "Select a team" },
  { value: "support", label: "Support" },
  { value: "revenue", label: "Revenue operations" },
  { value: "platform", label: "Platform engineering" },
];

const roleLabels = {
  viewer: "Can view",
  editor: "Can edit",
  manager: "Can manage",
};

const pageSizes = [10, 25, 50, 100];

const proposals = [
  { value: "p1", label: "Send renewal reminder to Acme Corp" },
  { value: "p2", label: "Update the Q3 forecast sheet" },
  { value: "p3", label: "Post the launch summary in #launches" },
];

const viewLabels = {
  day: "Day",
  week: "Week",
  month: "Month",
  agenda: "Agenda",
};

function SizeRow({
  size,
  width,
  note,
  children,
}: {
  size: SelectTriggerSize;
  width: "fit" | "full";
  note: string;
  children: ReactNode;
}) {
  return (
    <div className="select-demo-size-row" data-size-row={`${size}-${width}`}>
      <div className="select-demo-size-meta">
        <code>
          size="{size}" width="{width}"
        </code>
        <span>{note}</span>
      </div>
      <div className="select-demo-size-control">{children}</div>
    </div>
  );
}

export function SelectSizes() {
  const id = useId();
  const [team, setTeam] = useState("");
  const [role, setRole] = useState<keyof typeof roleLabels>("viewer");
  const [pageSize, setPageSize] = useState(25);
  const [proposal, setProposal] = useState("p1");
  const [view, setView] = useState<keyof typeof viewLabels>("week");
  return (
    <div className="select-demo-panel" data-demo="select-sizes">
      <div className="select-demo-sizes">
        <SizeRow size="default" width="full" note="Form fields">
          <DemoField
            id={`${id}-team`}
            label="Owning team"
            marker="required"
            helper="The team that maintains this agent."
          >
            <Select
              items={teams}
              value={team}
              onValueChange={(value) => setTeam(value ?? "")}
            >
              <SelectTrigger
                id={`${id}-team`}
                width="full"
                aria-required="true"
                aria-describedby={`${id}-team-helper`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teams.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DemoField>
        </SizeRow>
        <SizeRow size="default" width="fit" note="Access rows">
          <div className="select-demo-person">
            <span className="select-demo-person-name">
              Priya Raman
              <span>priya@acme.com</span>
            </span>
            <Select
              items={roleLabels}
              value={role}
              onValueChange={(value) => value && setRole(value)}
            >
              <SelectTrigger aria-label="Access for Priya Raman">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SizeRow>
        <SizeRow size="sm" width="fit" note="Pagination and toolbars">
          <div className="select-demo-pagination">
            <label htmlFor={`${id}-page-size`}>Rows per page</label>
            <Select
              value={pageSize}
              onValueChange={(value) => value !== null && setPageSize(value)}
            >
              <SelectTrigger id={`${id}-page-size`} size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizes.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>1–{pageSize} of 214</span>
          </div>
        </SizeRow>
        <SizeRow size="sm" width="full" note="Compact docks">
          <div className="select-demo-dock">
            <span className="select-demo-dock-title">
              3 proposals need approval
            </span>
            <Select
              items={proposals}
              value={proposal}
              onValueChange={(value) => value && setProposal(value)}
            >
              <SelectTrigger
                size="sm"
                width="full"
                aria-label="Choose proposal"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {proposals.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SizeRow>
        <SizeRow size="calendar" width="fit" note="Calendar header">
          <div className="select-demo-calendar-bar">
            <Button size="sm" variant="outline">
              Today
            </Button>
            <strong>June 9 – 15, 2025</strong>
            <Select
              items={viewLabels}
              value={view}
              onValueChange={(value) => value && setView(value)}
            >
              <SelectTrigger size="calendar" aria-label="Calendar view">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(viewLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SizeRow>
      </div>
    </div>
  );
}

const typeLabels = {
  "": "Any type",
  folder: "Folders",
  document: "Documents",
  spreadsheet: "Spreadsheets",
  presentation: "Presentations",
  pdf: "PDFs",
  image: "Images",
  other: "Other files",
};

const members = [
  { id: "u_81", name: "Dana Whitfield" },
  { id: "u_92", name: "Marcus Lee" },
  { id: "u_17", name: "Priya Raman" },
];

const slackChannels = [
  { id: "C014", name: "launches" },
  { id: "C022", name: "support-escalations" },
  { id: "C031", name: "revenue-ops" },
];

export function SelectValues() {
  const id = useId();
  const [type, setType] = useState("");
  const [member, setMember] = useState<string | null>(null);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channel, setChannel] = useState<string | null>(null);
  const memberName = members.find((item) => item.id === member)?.name;
  return (
    <div className="select-demo-panel" data-demo="select-values">
      <div className="select-demo-grid">
        <DemoField
          id={`${id}-type`}
          label="Type"
          helper={<>Empty string is a real value: “Any type”.</>}
        >
          <Select
            items={typeLabels}
            value={type}
            onValueChange={(value) => setType(value ?? "")}
          >
            <SelectTrigger id={`${id}-type`} width="full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(typeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DemoField>
        <DemoField
          id={`${id}-member`}
          label="Assignee"
          marker="optional"
          helper="Children map the stored id to a name."
        >
          <Select value={member} onValueChange={setMember}>
            <SelectTrigger id={`${id}-member`} width="full">
              <SelectValue placeholder="Select a member">
                {memberName}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {members.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DemoField>
        <DemoField
          id={`${id}-channel`}
          label="Slack channel"
          helper={
            <button
              type="button"
              className="select-demo-link"
              onClick={() => setChannelsLoading((value) => !value)}
            >
              {channelsLoading ? "Finish loading" : "Reload channels"}
            </button>
          }
        >
          <Select
            value={channel}
            onValueChange={setChannel}
            disabled={channelsLoading}
          >
            <SelectTrigger
              id={`${id}-channel`}
              width="full"
              aria-busy={channelsLoading || undefined}
            >
              <SelectValue
                placeholder={
                  channelsLoading
                    ? "Checking channel…"
                    : "Choose a Slack channel"
                }
              >
                {channel
                  ? `#${slackChannels.find((item) => item.id === channel)?.name}`
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {slackChannels.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  #{item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DemoField>
      </div>
    </div>
  );
}

const people = [
  { value: "user:dana", label: "Dana Whitfield" },
  { value: "user:marcus", label: "Marcus Lee" },
];
const shareTeams = [
  { value: "team:support", label: "Support" },
  { value: "team:finance", label: "Finance" },
];

export function SelectGroups() {
  const id = useId();
  const [target, setTarget] = useState<string | null>(null);
  const [frequency, setFrequency] = useState("weekly");
  const targetLabel = [...people, ...shareTeams].find(
    (item) => item.value === target,
  )?.label;
  return (
    <div className="select-demo-panel" data-demo="select-groups">
      <div className="select-demo-grid">
        <DemoField id={`${id}-share`} label="Share with">
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger id={`${id}-share`} width="full">
              <SelectValue placeholder="Choose a person or team">
                {targetLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>People</SelectLabel>
                {people.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Teams</SelectLabel>
                {shareTeams.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </DemoField>
        <DemoField id={`${id}-frequency`} label="Digest frequency">
          <Select
            defaultValue="weekly"
            onValueChange={(value) => value && setFrequency(value)}
          >
            <SelectTrigger id={`${id}-frequency`} width="full">
              <SelectValue>
                {frequency === "daily" ? "Daily" : "Weekly"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Frequency</SelectLabel>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectItem value="monthly" disabled>
                Monthly (unavailable)
              </SelectItem>
            </SelectContent>
          </Select>
        </DemoField>
      </div>
    </div>
  );
}

type ModelFamily = {
  id: string;
  name: string;
  brand: Brand;
  input: string;
  output: string;
  available: boolean;
};

const modelFamilies: ModelFamily[] = [
  {
    id: "claude-sonnet",
    name: "Claude Sonnet",
    brand: "claude",
    input: "300",
    output: "1,500",
    available: true,
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    brand: "openai",
    input: "125",
    output: "1,000",
    available: true,
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    brand: "google",
    input: "125",
    output: "1,000",
    available: true,
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    brand: "deepseek",
    input: "55",
    output: "219",
    available: false,
  },
];

function ModelOption({
  family,
  details = false,
}: {
  family: ModelFamily;
  details?: boolean;
}) {
  return (
    <span className="select-demo-model">
      <BrandIcon brand={family.brand} size="inline" />
      <span className="select-demo-model-text">
        <span className="select-demo-model-name">
          {family.name}
          {!family.available && " (unavailable)"}
        </span>
        {details && (
          <span className="select-demo-model-details">
            {family.input} input / {family.output} output Credits per 1M tokens
          </span>
        )}
      </span>
    </span>
  );
}

export function SelectRichItems() {
  const id = useId();
  const [channel, setChannel] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const added = new Set(["C014"]);
  const selected = modelFamilies.find((family) => family.id === model);
  return (
    <div className="select-demo-panel" data-demo="select-rich">
      <div className="select-demo-grid">
        <DemoField
          id={`${id}-slack`}
          label="Add a channel"
          helper="Channels already posting here are disabled."
        >
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger id={`${id}-slack`} width="full">
              <SelectValue placeholder="Choose a Slack channel">
                {channel
                  ? slackChannels.find((item) => item.id === channel)?.name
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {slackChannels.map((item) => (
                <SelectItem
                  key={item.id}
                  value={item.id}
                  disabled={added.has(item.id)}
                >
                  <Hashtag size={16} aria-hidden="true" />
                  {item.name}
                  {added.has(item.id) && " (already added)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DemoField>
        <DemoField
          id={`${id}-model`}
          label="Preferred model family"
          marker="optional"
          helper="Leave empty to let the workspace choose."
        >
          <Select
            value={model}
            onValueChange={(value) => setModel(value ?? "")}
          >
            <SelectTrigger id={`${id}-model`} width="full">
              <SelectValue>
                {selected ? (
                  <ModelOption family={selected} />
                ) : (
                  "Workspace default"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Workspace default</SelectItem>
              {modelFamilies.map((family) => (
                <SelectItem
                  key={family.id}
                  value={family.id}
                  disabled={!family.available}
                >
                  <ModelOption family={family} details />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DemoField>
      </div>
    </div>
  );
}

const tables = [
  { value: "tbl_accounts", label: "Accounts" },
  { value: "tbl_renewals", label: "Renewals" },
];

export function SelectStates() {
  const id = useId();
  const [source, setSource] = useState<string | null>(null);
  const [touched, setTouched] = useState(true);
  const [locked, setLocked] = useState(false);
  const [saved, setSaved] = useState("");
  const invalid = touched && !source;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaved(`Saved with access “${String(data.get("access"))}”.`);
  }
  return (
    <div className="select-demo-panel" data-demo="select-states">
      <div className="select-demo-grid">
        <DemoField
          id={`${id}-disabled`}
          label="Sender"
          helper="Locked while the workflow is running."
        >
          <Select
            value="app"
            disabled
            items={{ app: "TulipFarm app", user: "My Slack account" }}
          >
            <SelectTrigger id={`${id}-disabled`} width="full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="app">TulipFarm app</SelectItem>
              <SelectItem value="user">My Slack account</SelectItem>
            </SelectContent>
          </Select>
        </DemoField>
        <DemoField id={`${id}-loading`} label="Table" helper="Loading tables…">
          <Select value={null} disabled>
            <SelectTrigger
              id={`${id}-loading`}
              width="full"
              aria-busy="true"
              aria-describedby={`${id}-loading-helper`}
            >
              <SelectValue placeholder="Loading tables…" />
            </SelectTrigger>
            <SelectContent>
              {tables.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DemoField>
        <DemoField
          id={`${id}-empty`}
          label="Destination table"
          helper="No tables yet. Create one in Tables first."
        >
          <Select value={null} disabled={[].length === 0}>
            <SelectTrigger
              id={`${id}-empty`}
              width="full"
              aria-describedby={`${id}-empty-helper`}
            >
              <SelectValue placeholder="No tables available" />
            </SelectTrigger>
            <SelectContent />
          </Select>
        </DemoField>
        <DemoField
          id={`${id}-fallback`}
          label="Fallback for Claude Sonnet"
          srOnlyLabel
          helper="Saving fallback…"
        >
          <Select value="" items={{ "": "No fallback", "gpt-5": "GPT-5" }}>
            <SelectTrigger
              id={`${id}-fallback`}
              width="full"
              disabled
              aria-busy="true"
              aria-describedby={`${id}-fallback-helper`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No fallback</SelectItem>
              <SelectItem value="gpt-5">GPT-5</SelectItem>
            </SelectContent>
          </Select>
        </DemoField>
        <DemoField
          id={`${id}-invalid`}
          label="Source"
          marker="required"
          error={invalid ? "Choose a source to continue." : undefined}
          helper="Pick the space this knowledge comes from."
        >
          <Select
            value={source}
            onValueChange={(value) => {
              setSource(value);
              setTouched(true);
            }}
          >
            <SelectTrigger
              id={`${id}-invalid`}
              width="full"
              aria-required="true"
              aria-invalid={invalid || undefined}
              aria-describedby={
                invalid ? `${id}-invalid-error` : `${id}-invalid-helper`
              }
            >
              <SelectValue placeholder="Choose a Confluence space">
                {source === "ENG"
                  ? "Engineering (ENG)"
                  : source === "CS"
                    ? "Customer success (CS)"
                    : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ENG">Engineering (ENG)</SelectItem>
              <SelectItem value="CS">Customer success (CS)</SelectItem>
            </SelectContent>
          </Select>
        </DemoField>
      </div>
      <form
        className="select-demo-required"
        onSubmit={submit}
        aria-label="Integration access"
      >
        <fieldset disabled={locked}>
          <DemoField id={`${id}-access`} label="Access" marker="required">
            <Select
              name="access"
              required
              items={{ read: "Read only", write: "Read and write" }}
            >
              <SelectTrigger id={`${id}-access`} width="full">
                <SelectValue placeholder="Choose access" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">Read only</SelectItem>
                <SelectItem value="write">Read and write</SelectItem>
              </SelectContent>
            </Select>
          </DemoField>
          <div className="select-demo-actions">
            <Button type="submit" size="sm">
              Save access
            </Button>
          </div>
        </fieldset>
        <label className="select-demo-check">
          <input
            type="checkbox"
            checked={locked}
            onChange={(event) => setLocked(event.currentTarget.checked)}
          />
          Lock the form (fieldset disabled)
        </label>
        <p className="select-demo-status" role="status">
          {saved}
        </p>
      </form>
    </div>
  );
}

const runStatusLabel = {
  "": "All runs",
  queued: "Queued",
  running: "Running workflow",
  waiting: "Waiting to continue",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
  denied: "Access denied",
  skipped: "Skipped",
};

const modifiedPresets = {
  "": "Any time",
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  year: "This year",
  custom: "Custom range",
};

const sorts = {
  "name-asc": "Name, A to Z",
  "name-desc": "Name, Z to A",
  "modified-desc": "Modified, newest first",
  "modified-asc": "Modified, oldest first",
};

function SmallSelect<T extends Record<string, string>>({
  id,
  label,
  items,
  value,
  onChange,
}: {
  id: string;
  label: string;
  items: T;
  value: keyof T & string;
  onChange: (value: keyof T & string) => void;
}) {
  return (
    <div className="select-demo-filter">
      <label htmlFor={id}>{label}</label>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => onChange((next ?? "") as keyof T & string)}
      >
        <SelectTrigger id={id} size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([key, text]) => (
            <SelectItem key={key} value={key}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const metricLabels = {
  count: "Count",
  sum: "Sum",
  avg: "Average",
  min: "Minimum",
  max: "Maximum",
};

const comparisonWords = {
  eq: "is",
  neq: "is not",
  lt: "is less than",
  lte: "is at most",
  gt: "is greater than",
  gte: "is at least",
  empty: "is empty",
  notEmpty: "is not empty",
};

export function SelectCompositions() {
  const id = useId();
  const [type, setType] = useState<keyof typeof typeLabels>("");
  const [modified, setModified] = useState<keyof typeof modifiedPresets>("7d");
  const [sort, setSort] = useState<keyof typeof sorts>("modified-desc");
  const [status, setStatus] = useState<keyof typeof runStatusLabel>("");
  const [match, setMatch] = useState<"all" | "any">("all");
  const [comparison, setComparison] = useState<
    keyof typeof comparisonWords | ""
  >("");
  const [metric, setMetric] = useState<keyof typeof metricLabels>("count");
  const [mode, setMode] = useState<"normal" | "plan">("normal");
  const [zone, setZone] = useState("Europe/London");
  return (
    <div className="select-demo-panel" data-demo="select-compositions">
      <div className="select-demo-compositions">
        <section aria-label="File filters" className="select-demo-toolbar">
          <SmallSelect
            id={`${id}-type`}
            label="Type"
            items={typeLabels}
            value={type}
            onChange={setType}
          />
          <SmallSelect
            id={`${id}-modified`}
            label="Modified"
            items={modifiedPresets}
            value={modified}
            onChange={setModified}
          />
          <SmallSelect
            id={`${id}-sort`}
            label="Sort"
            items={sorts}
            value={sort}
            onChange={setSort}
          />
          <SmallSelect
            id={`${id}-status`}
            label="Status"
            items={runStatusLabel}
            value={status}
            onChange={setStatus}
          />
        </section>
        <div className="select-demo-inline-row">
          <Popover>
            <PopoverTrigger render={<Button size="sm" variant="outline" />}>
              <Filter size={14} aria-hidden="true" />
              Filter
            </PopoverTrigger>
            <PopoverContent size="picker" aria-label="Filter rows">
              <div className="select-demo-query">
                <p className="select-demo-sentence">
                  Match
                  <Select
                    items={{ all: "all conditions", any: "any condition" }}
                    value={match}
                    onValueChange={(value) =>
                      value && setMatch(value as "all" | "any")
                    }
                  >
                    <SelectTrigger size="sm" aria-label="Condition match">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">all conditions</SelectItem>
                      <SelectItem value="any">any condition</SelectItem>
                    </SelectContent>
                  </Select>
                </p>
                <div className="select-demo-condition">
                  <span>Amount</span>
                  <Select
                    items={comparisonWords}
                    value={comparison || null}
                    onValueChange={(value) => setComparison(value ?? "")}
                  >
                    <SelectTrigger
                      size="sm"
                      aria-label="Comparison for Amount"
                      aria-invalid={!comparison || undefined}
                    >
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(comparisonWords).map(([key, word]) => (
                        <SelectItem key={key} value={key}>
                          {word}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="select-demo-condition">
                  <span>Summarize by</span>
                  <Select
                    items={metricLabels}
                    value={metric}
                    onValueChange={(value) =>
                      value && setMetric(value as keyof typeof metricLabels)
                    }
                  >
                    <SelectTrigger size="sm" aria-label="Metric">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(metricLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <div
            className="select-demo-composer"
            aria-label="Composer controls"
            role="group"
          >
            <Select
              value={mode}
              onValueChange={(value) => {
                if (value === "normal" || value === "plan") setMode(value);
              }}
            >
              <Tooltip>
                <TooltipTrigger
                  render={<SelectTrigger size="sm" aria-label="Chat mode" />}
                >
                  <SelectValue>
                    {mode === "plan" ? "Plan" : "Normal"}
                  </SelectValue>
                </TooltipTrigger>
                <TooltipContent>
                  Normal acts on your request. Plan only proposes steps first.
                </TooltipContent>
              </Tooltip>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="plan">Plan only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Sheet>
            <SheetTrigger render={<Button size="sm" variant="outline" />}>
              Event details
            </SheetTrigger>
            <SheetContent>
              <div className="select-demo-sheet">
                <SheetTitle>Product review</SheetTitle>
                <SheetDescription>Thu, June 12 · 10:00–10:30</SheetDescription>
                <div className="select-demo-filter select-demo-filter-stack">
                  <label htmlFor={`${id}-sheet-zone`}>Shown in</label>
                  <Select
                    value={zone}
                    onValueChange={(value) => value && setZone(value)}
                  >
                    <SelectTrigger
                      id={`${id}-sheet-zone`}
                      size="sm"
                      width="full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeZones.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
