import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { Field } from "@base-ui/react/field";
import { ImageUp } from "reicon-react/icons/ImageUp";
import { Search3 as SearchIcon } from "reicon-react/icons/Search3";
import { Button } from "@tulipfarm/sprout/button";
import { Input, type InputScale } from "@tulipfarm/sprout/input";
import { Kbd } from "@tulipfarm/sprout/kbd";
import { SidebarInput } from "@tulipfarm/sprout/sidebar";
import "../styles/input-demo.css";

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
    <section className="input-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="input-demo-card-body">{children}</div>
    </section>
  );
}

/* A sample field built on Base UI Field. Sprout's own Field is a separate component. */
function DemoField({
  label,
  required = false,
  helper,
  error,
  counter,
  disabled,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: ReactNode;
  error?: string | undefined;
  counter?: string;
  disabled?: boolean;
  children: ReactElement;
}) {
  return (
    <Field.Root
      className="input-demo-field"
      invalid={Boolean(error)}
      disabled={disabled}
    >
      <div className="input-demo-field-head">
        <div className="input-demo-field-label">
          <Field.Label className="input-demo-label">{label}</Field.Label>
          {required ? (
            <span className="input-demo-requirement" aria-hidden="true">
              Required
            </span>
          ) : (
            <Field.Description className="input-demo-requirement">
              Optional
            </Field.Description>
          )}
        </div>
        {counter && (
          <Field.Description className="input-demo-counter">
            {counter}
          </Field.Description>
        )}
      </div>
      {children}
      {error ? (
        <Field.Error match className="input-demo-error">
          {error}
        </Field.Error>
      ) : helper ? (
        <Field.Description className="input-demo-helper">
          {helper}
        </Field.Description>
      ) : null}
    </Field.Root>
  );
}

const scales: Record<InputScale, { label: string; note: string }> = {
  default: { label: "Default", note: "32px · settings, dialogs, builders" },
  lg: { label: "Large", note: "44px · sign-in and onboarding" },
};

function ScaleSample({ scale }: { scale: InputScale }) {
  const [name, setName] = useState("Invoice follow-up");
  if (scale === "lg") {
    return (
      <div className="input-demo-grid">
        <DemoField label="Full name" required>
          <Input
            scale="lg"
            name="name"
            placeholder="Ada Lovelace"
            autoComplete="name"
            maxLength={80}
            required
          />
        </DemoField>
        <DemoField label="Work email" required>
          <Input
            scale="lg"
            name="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </DemoField>
      </div>
    );
  }
  return (
    <div className="input-demo-grid">
      <DemoField label="Agent name" required counter={`${name.length}/120`}>
        <Input
          value={name}
          maxLength={120}
          placeholder="People Ops helper"
          required
          onChange={(event) => setName(event.target.value)}
        />
      </DemoField>
      <DemoField label="Slack channel" helper="Channel ID, like C0123456789.">
        <Input placeholder="C0123456789" maxLength={64} />
      </DemoField>
    </div>
  );
}

export function InputScales() {
  return (
    <Example
      title="Scales"
      description="default fits dense forms. lg is for sign-in and onboarding. Each scale shows the fields Cloud uses it for."
    >
      <div className="input-demo-matrix">
        {(["default", "lg"] as const).map((scale) => (
          <div
            key={scale}
            className="input-demo-matrix-row"
            data-testid={`sample-${scale}`}
          >
            <div className="input-demo-matrix-label">
              <p>{scales[scale].label}</p>
              <span>{scales[scale].note}</span>
            </div>
            <ScaleSample scale={scale} />
          </div>
        ))}
      </div>
    </Example>
  );
}

function StateSamples({ scale }: { scale: InputScale }) {
  const lg = scale === "lg";
  return (
    <div className="input-demo-states" data-testid={`states-${scale}`}>
      <span className="input-demo-caption">{scales[scale].label}</span>
      <div className="input-demo-grid input-demo-grid-wide">
        <DemoField label={lg ? "Workspace name" : "Project name"}>
          <Input
            scale={scale}
            placeholder={lg ? "Acme, Inc." : "For example, Spring launch"}
          />
        </DemoField>
        <DemoField label={lg ? "Workspace URL" : "Event title"}>
          <Input
            scale={scale}
            defaultValue={lg ? "acme" : "Quarterly planning"}
          />
        </DemoField>
        <DemoField
          label={lg ? "Invitation link" : "Webhook key"}
          helper="Read-only. Select it to copy."
        >
          <Input
            scale={scale}
            readOnly
            spellCheck={false}
            value={lg ? "https://tulip.farm/i/7KQ2" : "whk_4f9c2a7d1e"}
            onFocus={(event) => event.target.select()}
          />
        </DemoField>
        <DemoField label={lg ? "Display name" : "Team name"} disabled>
          <Input scale={scale} defaultValue={lg ? "Locked" : "Unavailable"} />
        </DemoField>
        <DemoField
          label={lg ? "Profile email" : "Guest email"}
          error="Enter a full email address."
        >
          <Input scale={scale} type="email" defaultValue="alex@" />
        </DemoField>
      </div>
    </div>
  );
}

export function InputStates() {
  return (
    <Example
      title="States"
      description="Empty with a placeholder, filled, read-only, disabled, and invalid, at both scales. Field.Root passes disabled and invalid to the input."
    >
      <StateSamples scale="default" />
      <StateSamples scale="lg" />
    </Example>
  );
}

export function InputTypes() {
  const [from, setFrom] = useState("2026-09-01");
  const [to, setTo] = useState("2026-09-30");
  const [invites, setInvites] = useState<string[]>([]);
  return (
    <Example
      title="Types"
      description="Each native type Cloud uses. Date, time, and number inputs keep the browser picker and take min, max, and step."
    >
      <div className="input-demo-grid input-demo-grid-wide">
        <DemoField
          label="Invite by email"
          helper={
            invites.length
              ? `${invites.length} addresses pasted: ${invites.join(", ")}`
              : "Paste a comma-separated list to add many."
          }
        >
          <Input
            type="email"
            autoComplete="off"
            placeholder="teammate@example.com"
            onPaste={(event) => {
              const text = event.clipboardData.getData("text");
              if (/[,\n]/.test(text)) {
                event.preventDefault();
                setInvites(
                  text
                    .split(/[,\n]/)
                    .map((item) => item.trim())
                    .filter(Boolean),
                );
              }
            }}
          />
        </DemoField>
        <DemoField
          label="Integration token"
          required
          helper="Stored encrypted. You can rotate it later."
        >
          <Input
            type="password"
            autoComplete="new-password"
            maxLength={4096}
            required
            defaultValue="ghp_example_token"
          />
        </DemoField>
        <DemoField
          label="Check every"
          required
          helper="Minutes, from 1 to 1440."
        >
          <Input
            type="number"
            min={1}
            max={1440}
            step={1}
            required
            defaultValue={15}
          />
        </DemoField>
        <DemoField
          label="Compact at"
          helper="Tokens before older turns are summarised."
        >
          <Input inputMode="numeric" defaultValue="80000" />
        </DemoField>
        <DemoField label="MCP endpoint">
          <Input type="url" placeholder="https://mcp.example.com/mcp" />
        </DemoField>
        <DemoField
          label="Repository owner"
          required
          helper="Letters, numbers, and dashes."
        >
          <Input
            required
            pattern="[A-Za-z0-9][A-Za-z0-9-]*"
            maxLength={39}
            autoCapitalize="none"
            spellCheck={false}
            defaultValue="tulipfarm"
          />
        </DemoField>
        <div className="input-demo-pair">
          <DemoField label="Modified from">
            <Input
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
            />
          </DemoField>
          <DemoField label="Modified to">
            <Input
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
            />
          </DemoField>
        </div>
        <div className="input-demo-pair">
          <DemoField label="Starts at">
            <Input type="time" defaultValue="09:30" />
          </DemoField>
          <DemoField label="Ends at">
            <Input type="time" defaultValue="10:00" />
          </DemoField>
        </div>
        <DemoField label="Run once at" helper="Your time zone.">
          <Input type="datetime-local" defaultValue="2026-11-03T09:00" />
        </DemoField>
        <DemoField label="Attachment">
          <Input type="file" />
        </DemoField>
      </div>
    </Example>
  );
}

const tables = [
  "Customers",
  "Invoices",
  "Purchase orders",
  "Suppliers",
  "Support tickets",
];

export function InputLabels() {
  const [site, setSite] = useState("acme-cloud");
  const [search, setSearch] = useState("");
  const siteInvalid = !/^[a-z0-9-]+$/.test(site);
  const shown = tables.filter((table) =>
    table.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <Example
      title="Labels without a field"
      description="Pair id with a label's htmlFor and point aria-describedby at help and error text. Inline searches use aria-label."
    >
      <div className="input-demo-grid input-demo-grid-wide">
        <div className="input-demo-field">
          <label className="input-demo-label" htmlFor="input-demo-site">
            Site ID
          </label>
          <Input
            id="input-demo-site"
            value={site}
            aria-invalid={siteInvalid}
            aria-describedby="input-demo-site-help input-demo-site-error"
            onChange={(event) => setSite(event.target.value)}
          />
          <p id="input-demo-site-help" className="input-demo-helper">
            The part before .atlassian.net.
          </p>
          {siteInvalid && (
            <p id="input-demo-site-error" className="input-demo-error">
              Use lowercase letters, numbers, and dashes.
            </p>
          )}
        </div>
        <div className="input-demo-field">
          <Input
            aria-label="Search tables"
            value={search}
            placeholder="Find a table by name"
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
          />
          <ul className="input-demo-list" aria-label="Tables">
            {shown.map((table) => (
              <li key={table}>{table}</li>
            ))}
          </ul>
          {shown.length === 0 && (
            <p className="input-demo-helper" role="status">
              No tables match “{search.trim()}”.
            </p>
          )}
        </div>
      </div>
    </Example>
  );
}

type FormState =
  { kind: "idle" } | { kind: "saving" } | { kind: "done"; url: string };

export function InputForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("acme");
  const [nameError, setNameError] = useState<string>();
  const [slugError, setSlugError] = useState<string>();
  const [state, setState] = useState<FormState>({ kind: "idle" });
  const nameRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (slugError) slugRef.current?.focus();
  }, [slugError]);
  const saving = state.kind === "saving";

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setNameError("Enter a workspace name.");
      nameRef.current?.focus();
      return;
    }
    setState({ kind: "saving" });
    timer.current = window.setTimeout(() => {
      if (slug === "acme") {
        setSlugError("That URL is taken. Try another.");
        setState({ kind: "idle" });
        return;
      }
      setState({ kind: "done", url: `tulip.farm/${slug}` });
    }, 700);
  }

  return (
    <Example
      title="Create workspace"
      description="Large inputs in a form. Submit empty to see a field error. The URL acme is taken, so the server error lands on the slug. Inputs are disabled while saving."
    >
      <form className="input-demo-panel" noValidate onSubmit={submit}>
        <DemoField label="Workspace name" required error={nameError}>
          <Input
            ref={nameRef}
            scale="lg"
            name="workspace-name"
            placeholder="Acme, Inc."
            autoComplete="organization"
            maxLength={80}
            required
            value={name}
            disabled={saving}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(undefined);
              setState({ kind: "idle" });
            }}
          />
        </DemoField>
        <DemoField
          label="Workspace URL"
          required
          counter={`${slug.length}/48`}
          error={slugError}
          helper={`tulip.farm/${slug || "…"}`}
        >
          <Input
            ref={slugRef}
            scale="lg"
            name="workspace-slug"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={48}
            required
            value={slug}
            disabled={saving}
            onChange={(event) => {
              setSlug(event.target.value.toLowerCase());
              setSlugError(undefined);
              setState({ kind: "idle" });
            }}
          />
        </DemoField>
        <div className="input-demo-row">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? "Creating…" : "Create workspace"}
          </Button>
          <span className="input-demo-muted" role="status">
            {saving
              ? "Creating workspace…"
              : state.kind === "done"
                ? `Created ${state.url}.`
                : ""}
          </span>
        </div>
      </form>
    </Example>
  );
}

export function InputRename() {
  const [title, setTitle] = useState("Q3 supplier review");
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const invalid = draft !== null && !draft.trim();

  return (
    <Example
      title="Inline rename"
      description="autoFocus and aria-label for a title edited in place. Enter saves and Escape cancels. The input is read-only while it saves, so focus stays put."
    >
      <div className="input-demo-panel">
        {draft === null ? (
          <div className="input-demo-row">
            <span className="input-demo-title">{title}</span>
            <Button variant="outline" size="sm" onClick={() => setDraft(title)}>
              Rename
            </Button>
          </div>
        ) : (
          <div className="input-demo-field">
            <Input
              autoFocus
              aria-label="Chat title"
              value={draft}
              maxLength={640}
              readOnly={saving}
              aria-busy={saving || undefined}
              aria-invalid={invalid}
              aria-describedby={invalid ? "input-demo-title-error" : undefined}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setDraft(null);
                if (event.key === "Enter" && !invalid && !saving) {
                  setSaving(true);
                  timer.current = window.setTimeout(() => {
                    setTitle(draft.trim());
                    setDraft(null);
                    setSaving(false);
                  }, 500);
                }
              }}
            />
            {invalid ? (
              <p id="input-demo-title-error" className="input-demo-error">
                Enter a title.
              </p>
            ) : (
              <p className="input-demo-helper" role="status">
                {saving ? "Saving…" : "Enter to save, Escape to cancel."}
              </p>
            )}
          </div>
        )}
      </div>
    </Example>
  );
}

export function InputFileChooser() {
  const chooser = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<string>();
  return (
    <Example
      title="Hidden file chooser"
      description="A hidden file input with a ref, opened by a button. tabIndex={-1} and aria-hidden keep it out of focus and the accessibility tree."
    >
      <div className="input-demo-row">
        <Button
          variant="outline"
          size="sm"
          onClick={() => chooser.current?.click()}
        >
          <ImageUp data-icon="inline-start" aria-hidden="true" />
          Upload image
        </Button>
        <Input
          ref={chooser}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          tabIndex={-1}
          aria-hidden
          data-testid="avatar-chooser"
          onChange={(event) => {
            setFile(event.target.files?.[0]?.name);
            event.target.value = "";
          }}
        />
        <span className="input-demo-muted" role="status">
          {file ? `Chosen: ${file}` : "PNG, JPEG, or WebP"}
        </span>
      </div>
    </Example>
  );
}

const pages = [
  "Overview",
  "Agents",
  "Workflows",
  "Tables",
  "Files",
  "Settings",
];

export function InputCompositions() {
  const [filter, setFilter] = useState("");
  const shown = pages.filter((page) =>
    page.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  const search = useRef<HTMLInputElement>(null);
  return (
    <Example
      title="Compositions"
      description="SidebarInput is the sidebar search field. Override data-slot and className to set an Input inside your own bordered group."
    >
      <div className="input-demo-grid input-demo-grid-wide">
        <div className="input-demo-sidebar" data-testid="sidebar-sample">
          <SidebarInput
            aria-label="Search sample sidebar"
            placeholder="Search locally…"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <ul className="input-demo-list" aria-label="Sample pages">
            {shown.map((page) => (
              <li key={page}>{page}</li>
            ))}
          </ul>
          {shown.length === 0 && (
            <p className="input-demo-helper">No pages found.</p>
          )}
        </div>
        <div className="input-demo-field">
          <div
            className="input-demo-group"
            role="group"
            data-testid="group-sample"
            onClick={() => search.current?.focus()}
          >
            <SearchIcon size={16} aria-hidden="true" />
            <Input
              ref={search}
              data-slot="input-group-control"
              className="input-demo-bare"
              aria-label="Search paths"
              placeholder="Search paths"
              maxLength={120}
            />
            <Kbd>/</Kbd>
          </div>
          <p className="input-demo-helper">
            The group draws the border and focus ring.
          </p>
        </div>
      </div>
    </Example>
  );
}

export default function InputDemo() {
  return (
    <div id="input-demo" className="input-demo">
      <InputScales />
      <InputStates />
      <InputTypes />
      <InputLabels />
      <InputForm />
      <InputRename />
      <InputFileChooser />
      <InputCompositions />
    </div>
  );
}
