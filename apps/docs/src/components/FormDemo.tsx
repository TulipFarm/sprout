import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Plus } from "reicon-react/icons/Plus";
import { Refresh } from "reicon-react/icons/Refresh";
import { Send } from "reicon-react/icons/Send";
import { X } from "reicon-react/icons/X";
import { Alert, AlertDescription } from "@tulipfarm/sprout/alert";
import { Button } from "@tulipfarm/sprout/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@tulipfarm/sprout/dialog";
import {
  CheckboxField,
  ChoiceGroup,
  Field,
  useFieldControl,
} from "@tulipfarm/sprout/field";
import {
  Form,
  FormFooter,
  FormSection,
  formFooterLayoutNames,
  type FormActionState,
  type FormCancel,
  type FormFooterLayout,
} from "@tulipfarm/sprout/form";
import { Input } from "@tulipfarm/sprout/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tulipfarm/sprout/select";
import { StatePanel } from "@tulipfarm/sprout/state-panel";
import DocsSelect from "./DocsSelect";
import "../styles/form-demo.css";

/* Sample adapters. Saving, routing, and data are docs-only stand-ins for the
   Cloud write hooks and router links. Sprout has no Textarea yet, so a
   docs-only textarea reads the Field through useFieldControl. */

function SampleTextarea(props: ComponentProps<"textarea">) {
  const field = useFieldControl(props);
  return <textarea rows={3} {...field} className="form-demo-textarea" />;
}

function useSampleSave(ms = 900) {
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return {
    busy,
    run(done: () => void) {
      setBusy(true);
      timer.current = setTimeout(() => {
        setBusy(false);
        done();
      }, ms);
    },
  };
}

function Status({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="form-demo-status">
      {children}
    </p>
  );
}

function Frame({
  title,
  example,
  wide,
  children,
}: {
  title: string;
  example?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className="form-demo-frame"
      aria-label={title}
      data-example={example}
      data-wide={wide || undefined}
    >
      <div className="form-demo-frame-bar">{title}</div>
      <div className="form-demo-frame-body">{children}</div>
    </section>
  );
}

function Toggle({
  pressed,
  onPressedChange,
  children,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="form-demo-toggle"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
    >
      {children}
    </button>
  );
}

const teams = [
  { value: "operations", label: "Operations" },
  { value: "finance", label: "Finance" },
  { value: "support", label: "Customer support" },
];

function TeamSelect({
  value,
  onValueChange,
  placeholder = "Choose a team",
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Select
      items={teams}
      value={value || null}
      onValueChange={(next) => onValueChange(next ?? "")}
    >
      <SelectTrigger width="full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {teams.map((team) => (
          <SelectItem key={team.value} value={team.value}>
            {team.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* Playground */

type PlaygroundState =
  "ready" | "busy" | "blocked" | "jump" | "action" | "link";
type PlaygroundCancel = "none" | "reset" | "leave";

const layoutCopy: Record<
  FormFooterLayout,
  {
    label: string;
    pending: string;
    secondary: string;
    note: string;
    error: string;
    reason: string;
  }
> = {
  bar: {
    label: "Save sharing",
    pending: "Saving sharing…",
    secondary: "Save draft",
    note: "Runs keep using the active version until a manager activates this one.",
    error: "Fix 1 field to save sharing.",
    reason: "Choose which settings to keep above first.",
  },
  stack: {
    label: "Email me a sign-in link",
    pending: "Sending email…",
    secondary: "Continue with a passkey",
    note: "Sign-in links expire after 15 minutes.",
    error: "Enter a valid work email.",
    reason: "Complete verification to continue.",
  },
  compact: {
    label: "Save answer",
    pending: "Saving answer...",
    secondary: "Save for later",
    note: "Saved for this workspace. You can undo it.",
    error: "Choose or enter an answer to continue.",
    reason: "Choose a reply style.",
  },
};

const stateItems = [
  { value: "ready", label: "Ready" },
  { value: "busy", label: "Busy" },
  { value: "blocked", label: "Blocked" },
  { value: "jump", label: "Blocked, jump fix" },
  { value: "action", label: "Blocked, action fix" },
  { value: "link", label: "Blocked, link fix" },
] as const;

export function FormPlayground() {
  const id = useId();
  const [layout, setLayout] = useState<FormFooterLayout>("bar");
  const [kind, setKind] = useState<PlaygroundState>("ready");
  const [cancelKind, setCancelKind] = useState<PlaygroundCancel>("reset");
  const [dirty, setDirty] = useState(true);
  const [secondary, setSecondary] = useState(false);
  const [note, setNote] = useState(true);
  const [error, setError] = useState(false);
  const [locked, setLocked] = useState(false);
  const [team, setTeam] = useState("operations");
  const [email, setEmail] = useState("ada@tulipfarm.app");
  const [style, setStyle] = useState("short");
  const [message, setMessage] = useState("");
  const copy = layoutCopy[layout];
  const target = `${id}-target`;
  const state: FormActionState =
    kind === "ready"
      ? { kind: "ready" }
      : kind === "busy"
        ? { kind: "busy" }
        : kind === "blocked"
          ? { kind: "blocked", reason: copy.reason }
          : kind === "jump"
            ? {
                kind: "blocked",
                reason: copy.reason,
                fix: { kind: "jump", label: "Go to the field", target },
              }
            : kind === "action"
              ? {
                  kind: "blocked",
                  reason: "Settings could not refresh.",
                  fix: {
                    kind: "action",
                    label: "Try again",
                    onClick: () => setKind("ready"),
                  },
                }
              : {
                  kind: "blocked",
                  reason: "Restore the original Google integration.",
                  fix: {
                    kind: "link",
                    label: "Open integrations",
                    link: <a href="#form-integrations" />,
                  },
                };
  const cancel: FormCancel | undefined =
    cancelKind === "reset"
      ? {
          kind: "reset",
          label: "Discard changes",
          onReset: () => {
            setDirty(false);
            setMessage("Changes discarded.");
          },
        }
      : cancelKind === "leave"
        ? { kind: "leave", label: "Cancel", link: <a href="#form-usage" /> }
        : undefined;
  const footer = (
    <FormFooter
      layout={layout}
      dirty={dirty}
      submit={{ label: copy.label, pendingLabel: copy.pending, state }}
      secondarySubmit={
        secondary
          ? {
              label: copy.secondary,
              disabled: kind !== "ready",
              onSelect: () => setMessage(`${copy.secondary} selected.`),
            }
          : undefined
      }
      cancel={cancel}
      note={note ? copy.note : undefined}
      error={error ? copy.error : undefined}
    >
      {layout === "compact" ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={kind === "busy"}
          onClick={() => setMessage("Question skipped.")}
        >
          Skip
        </Button>
      ) : (
        message && <Status>{message}</Status>
      )}
    </FormFooter>
  );
  return (
    <div className="form-demo-playground" data-example="playground">
      <div className="form-demo-toolbar">
        <label>
          Layout
          <DocsSelect
            label="Footer layout"
            value={layout}
            items={formFooterLayoutNames.map((value) => ({
              value,
              label: value[0]!.toUpperCase() + value.slice(1),
            }))}
            onValueChange={setLayout}
          />
        </label>
        <label>
          Submit
          <DocsSelect
            label="Submit state"
            value={kind}
            items={stateItems}
            onValueChange={setKind}
          />
        </label>
        <label>
          Cancel
          <DocsSelect
            label="Cancel kind"
            value={cancelKind}
            items={[
              { value: "none", label: "None" },
              { value: "reset", label: "Reset" },
              { value: "leave", label: "Leave link" },
            ]}
            onValueChange={setCancelKind}
          />
        </label>
        <div
          className="form-demo-segments"
          role="group"
          aria-label="Footer options"
        >
          <Toggle pressed={dirty} onPressedChange={setDirty}>
            Dirty
          </Toggle>
          <Toggle pressed={secondary} onPressedChange={setSecondary}>
            Secondary submit
          </Toggle>
          <Toggle pressed={note} onPressedChange={setNote}>
            Note
          </Toggle>
          <Toggle pressed={error} onPressedChange={setError}>
            Error
          </Toggle>
          <Toggle pressed={locked} onPressedChange={setLocked}>
            Form disabled
          </Toggle>
        </div>
      </div>
      <div className="form-demo-stage" data-layout={layout}>
        <Form
          label={
            layout === "bar"
              ? "Placement and sharing"
              : layout === "stack"
                ? "Sign in"
                : "Answer Bud's preference question"
          }
          disabled={locked || kind === "busy"}
          onSubmit={() => {
            setMessage(`${copy.label} submitted in this example only.`);
            setDirty(false);
          }}
        >
          {layout === "bar" ? (
            <FormSection
              title="Placement and sharing"
              description="Where this agent is listed and who can use or manage it."
            >
              <Field
                id={target}
                label="Owning team"
                required
                helper="Its managers can edit this agent."
              >
                <TeamSelect
                  value={team}
                  onValueChange={(value) => {
                    setTeam(value);
                    setDirty(true);
                  }}
                />
              </Field>
              {footer}
            </FormSection>
          ) : layout === "stack" ? (
            <div className="form-demo-auth">
              <Field
                id={target}
                label="Email"
                required
                error={error ? copy.error : undefined}
              >
                <Input
                  type="email"
                  scale="lg"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
              {footer}
              {message && <Status>{message}</Status>}
            </div>
          ) : (
            <div className="form-demo-card">
              <p className="form-demo-card-text">
                How should Bud format replies for you?
              </p>
              <ChoiceGroup
                id={target}
                type="radio"
                legend="Reply style"
                required
                value={style}
                onValueChange={(value) => {
                  setStyle(value);
                  setDirty(true);
                }}
                options={[
                  { value: "short", label: "Short and direct" },
                  { value: "detailed", label: "Detailed with context" },
                  { value: "bullets", label: "Bulleted summaries" },
                ]}
              />
              {footer}
              {message && <Status>{message}</Status>}
            </div>
          )}
        </Form>
      </div>
    </div>
  );
}

/* Validation and recovery (compaction policy) */

export function FormValidation() {
  const saved = { threshold: "80", keep: "12" };
  const [draft, setDraft] = useState(saved);
  const [base, setBase] = useState(saved);
  const [showErrors, setShowErrors] = useState(false);
  const [done, setDone] = useState(false);
  const save = useSampleSave();
  const threshold = Number(draft.threshold);
  const keep = Number(draft.keep);
  const errors = {
    threshold:
      draft.threshold.trim() && threshold >= 50 && threshold <= 95
        ? undefined
        : "Enter a percent from 50 to 95.",
    keep:
      draft.keep.trim() && keep >= 2 && keep <= 40
        ? undefined
        : "Enter a number from 2 to 40.",
  };
  const invalidCount = Object.values(errors).filter(Boolean).length;
  const dirty = draft.threshold !== base.threshold || draft.keep !== base.keep;
  return (
    <Frame title="Workspace settings · Models" example="validation">
      <Form
        label="Conversation compaction"
        disabled={save.busy}
        onSubmit={() => {
          if (invalidCount) {
            setShowErrors(true);
            return "invalid";
          }
          setDone(false);
          save.run(() => {
            setBase(draft);
            setDone(true);
          });
        }}
      >
        <FormSection
          title="Conversation compaction"
          description="Keeps long chats within the model context by summarizing earlier messages. Applies to every chat in this workspace."
        >
          <div className="form-demo-grid">
            <Field
              id="compaction-threshold"
              label="Start compacting at"
              required
              helper="Percent of the model context, 50 to 95."
              error={showErrors ? errors.threshold : undefined}
            >
              <Input
                type="number"
                inputMode="numeric"
                value={draft.threshold}
                onChange={(event) => {
                  setDraft({ ...draft, threshold: event.target.value });
                  setDone(false);
                }}
              />
            </Field>
            <Field
              id="compaction-keep"
              label="Recent messages to keep"
              required
              helper="Kept word for word, 2 to 40."
              error={showErrors ? errors.keep : undefined}
            >
              <Input
                type="number"
                inputMode="numeric"
                value={draft.keep}
                onChange={(event) => {
                  setDraft({ ...draft, keep: event.target.value });
                  setDone(false);
                }}
              />
            </Field>
          </div>
        </FormSection>
        <FormFooter
          dirty={dirty}
          note="Summaries use only approved budget models and never switch to a larger model."
          submit={{
            label: "Save compaction settings",
            pendingLabel: "Saving compaction settings…",
            state: save.busy ? { kind: "busy" } : { kind: "ready" },
          }}
          cancel={{
            kind: "reset",
            label: "Discard changes",
            onReset: () => {
              setDraft(base);
              setShowErrors(false);
            },
          }}
          error={
            showErrors && invalidCount
              ? `Fix ${invalidCount} ${invalidCount === 1 ? "field" : "fields"} to save compaction settings.`
              : undefined
          }
        >
          {done && <Status>Compaction settings saved.</Status>}
        </FormFooter>
      </Form>
    </Frame>
  );
}

/* Footer layouts */

function IntervalForm() {
  const [saved, setSaved] = useState("60");
  const [minutes, setMinutes] = useState("30");
  const [checked, setChecked] = useState(false);
  const save = useSampleSave();
  const value = Number(minutes);
  const error =
    minutes.trim() && value >= 15 && value <= 1440
      ? undefined
      : "Enter 15 to 1,440 minutes.";
  return (
    <Form
      label="Change interval"
      disabled={save.busy}
      onSubmit={() => {
        if (error) {
          setChecked(true);
          return "invalid";
        }
        save.run(() => setSaved(minutes));
      }}
    >
      <div className="form-demo-stack">
        <Field
          id="schedule-interval"
          label="Run every"
          required
          helper="Minutes between runs."
          error={checked ? error : undefined}
        >
          <Input
            type="number"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
        </Field>
        <FormFooter
          dirty={minutes !== saved}
          note="Saving makes you the sponsor. The next run moves to match the new interval."
          error={
            checked && error ? "Fix 1 field to change the interval." : undefined
          }
          submit={{
            label: "Save interval",
            pendingLabel: "Saving interval…",
            state: save.busy ? { kind: "busy" } : { kind: "ready" },
          }}
          cancel={{
            kind: "reset",
            label: "Discard changes",
            onReset: () => {
              setMinutes(saved);
              setChecked(false);
            },
          }}
        />
      </div>
    </Form>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const save = useSampleSave();
  return (
    <Form
      disabled={save.busy}
      onSubmit={() => {
        if (!/^\S+@\S+\.\S+$/.test(email)) {
          setError("Enter a valid email address.");
          return "invalid";
        }
        setError(undefined);
        save.run(() => setSent(true));
      }}
    >
      <div className="form-demo-auth">
        <Field id="sign-in-email" label="Email" required error={error}>
          <Input
            name="email"
            type="email"
            scale="lg"
            placeholder="you@company.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <CheckboxField
          label="Verification passed (sample challenge)"
          checked={verified}
          onCheckedChange={setVerified}
        />
        <FormFooter
          dirty={false}
          layout="stack"
          error={error ? "Check the email address and try again." : undefined}
          submit={{
            label: "Email me a sign-in link",
            pendingLabel: "Sending email…",
            state: save.busy
              ? { kind: "busy" }
              : !verified
                ? {
                    kind: "blocked",
                    reason: "Complete verification to continue.",
                  }
                : { kind: "ready" },
          }}
        />
        {sent && <Status>Check your inbox for the sign-in link.</Status>}
      </div>
    </Form>
  );
}

function BudPreferenceForm() {
  const [style, setStyle] = useState("");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState("");
  const save = useSampleSave();
  const value = style === "custom" ? answer.trim() : style;
  if (result)
    return (
      <div className="form-demo-card">
        <Status>{result}</Status>
        <div>
          <Button size="sm" variant="outline" onClick={() => setResult("")}>
            Undo
          </Button>
        </div>
      </div>
    );
  return (
    <div className="form-demo-card">
      <p className="form-demo-card-text">How long should my replies be?</p>
      <Form
        label="Answer Bud's preference question"
        disabled={save.busy}
        onSubmit={() => {
          if (value)
            save.run(() => setResult("Saved. Bud will keep replies short."));
        }}
      >
        <div className="form-demo-stack">
          <ChoiceGroup
            type="radio"
            legend="Reply style"
            required
            value={style}
            onValueChange={setStyle}
            options={[
              { value: "short", label: "Short and direct" },
              { value: "detailed", label: "Detailed with context" },
              { value: "custom", label: "Something else" },
            ]}
          />
          {style === "custom" && (
            <Field
              id="bud-answer"
              label="Your preference"
              required
              helper="Saved for this workspace. You can undo it."
            >
              <SampleTextarea
                value={answer}
                maxLength={2000}
                onChange={(event) => setAnswer(event.target.value)}
              />
            </Field>
          )}
          <FormFooter
            layout="compact"
            dirty={!!value}
            submit={{
              label: "Save answer",
              pendingLabel: "Saving answer...",
              state: save.busy
                ? { kind: "busy" }
                : value
                  ? { kind: "ready" }
                  : {
                      kind: "blocked",
                      reason:
                        style === "custom"
                          ? "Enter your preference."
                          : "Choose a reply style.",
                    },
            }}
          >
            <Button
              size="sm"
              variant="ghost"
              disabled={save.busy}
              onClick={() => setResult("Skipped. Bud will not ask again.")}
            >
              Skip
            </Button>
          </FormFooter>
        </div>
      </Form>
    </div>
  );
}

export function FormLayouts() {
  return (
    <div className="form-demo-grid-3" data-example="layouts">
      <Frame title="Bar · Agent schedule">
        <IntervalForm />
      </Frame>
      <Frame title="Stack · Sign in">
        <SignInForm />
      </Frame>
      <Frame title="Compact · Chat card">
        <BudPreferenceForm />
      </Frame>
    </div>
  );
}

/* Submit states */

function DestinationForm() {
  const [team, setTeam] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const save = useSampleSave();
  const state: FormActionState = save.busy
    ? { kind: "busy" }
    : team
      ? { kind: "ready" }
      : {
          kind: "blocked",
          reason: "Choose a destination team below first.",
          fix: {
            kind: "jump",
            label: "Choose a team",
            target: "slack-destination-team",
          },
        };
  return (
    <Form
      disabled={save.busy}
      onSubmit={() => {
        if (team) save.run(() => setDone(true));
      }}
    >
      <div className="form-demo-stack">
        <Field id="slack-destination-name" label="Display name" optional>
          <Input
            value={name}
            placeholder="#ops-alerts"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field id="slack-destination-team" label="Destination team" required>
          <TeamSelect value={team} onValueChange={setTeam} />
        </Field>
        <FormFooter
          dirty={!!(team || name)}
          submit={{
            label: "Add Slack destination",
            pendingLabel: "Adding Slack destination…",
            state,
          }}
        >
          {done && <Status>Slack destination added.</Status>}
        </FormFooter>
      </div>
    </Form>
  );
}

function SponsorForm() {
  const [loaded, setLoaded] = useState(false);
  return (
    <Form onSubmit={() => undefined}>
      <FormFooter
        dirty
        note="Schedules stay off until activation."
        submit={{
          label: "Create schedule",
          pendingLabel: "Creating schedule…",
          state: loaded
            ? { kind: "ready" }
            : {
                kind: "blocked",
                reason: "Your sponsor details could not load.",
                fix: {
                  kind: "action",
                  label: "Try again",
                  onClick: () => setLoaded(true),
                },
              },
        }}
      />
    </Form>
  );
}

export function FormSubmitStates() {
  return (
    <div className="form-demo-grid-2" data-example="states">
      <Frame title="Ready, clean">
        <FormFooter
          dirty={false}
          submit={{
            label: "Save Slack sharing",
            pendingLabel: "Saving Slack sharing…",
            state: { kind: "ready" },
          }}
          cancel={{
            kind: "reset",
            label: "Discard changes",
            onReset: () => undefined,
          }}
        />
      </Frame>
      <Frame title="Ready, unsaved changes">
        <FormFooter
          dirty
          submit={{
            label: "Save MCP allowlist",
            pendingLabel: "Saving MCP allowlist…",
            state: { kind: "ready" },
          }}
          cancel={{
            kind: "reset",
            label: "Discard changes",
            onReset: () => undefined,
          }}
          note="Runs use these tools after a manager activates the new version."
        />
      </Frame>
      <Frame title="Busy">
        <FormFooter
          dirty
          submit={{
            label: "Save investigation permissions",
            pendingLabel: "Saving permissions…",
            state: { kind: "busy" },
          }}
          cancel={{
            kind: "reset",
            label: "Discard changes",
            onReset: () => undefined,
          }}
        />
      </Frame>
      <Frame title="Blocked with a reason">
        <FormFooter
          dirty={false}
          submit={{
            label: "Save investigation permissions",
            pendingLabel: "Saving permissions…",
            state: {
              kind: "blocked",
              reason:
                "Choose a person or team and repository, then change a read permission.",
            },
          }}
        />
      </Frame>
      <Frame title="Blocked, jump to the field">
        <DestinationForm />
      </Frame>
      <Frame title="Blocked, retry action">
        <SponsorForm />
      </Frame>
      <Frame title="Blocked, link fix">
        <FormFooter
          dirty
          submit={{
            label: "Review event",
            pendingLabel: "Preparing event…",
            state: {
              kind: "blocked",
              reason: "Restore the original Google integration.",
              fix: {
                kind: "link",
                label: "Open integrations",
                link: <a href="#form-integrations" />,
              },
            },
          }}
          note="Review the exact event before it is sent to Google."
        />
      </Frame>
      <Frame title="Error">
        <FormFooter
          dirty
          submit={{
            label: "Review event",
            pendingLabel: "Preparing event…",
            state: { kind: "ready" },
          }}
          error="Fix the marked fields."
          note="Review the exact event before it is sent to Google."
        />
      </Frame>
      <Frame title="Loading: form locked while refreshing">
        <Form
          label="Conversation compaction (refreshing)"
          disabled
          onSubmit={() => undefined}
        >
          <div className="form-demo-stack">
            <Field id="compaction-loading" label="Start compacting at" required>
              <Input value="80" readOnly />
            </Field>
            <FormFooter
              dirty={false}
              submit={{
                label: "Save compaction settings",
                pendingLabel: "Saving compaction settings…",
                state: {
                  kind: "blocked",
                  reason: "Wait for compaction settings to finish refreshing.",
                },
              }}
            />
          </div>
        </Form>
      </Frame>
      <Frame title="Empty: no form to show">
        <StatePanel
          kind="empty"
          heading="h3"
          title="No GitHub source available"
          description="Connect a personal account, or ask a team integration manager for integration use and repository read permissions."
        />
      </Frame>
    </div>
  );
}

/* Sections */

const tools = [
  {
    id: "read",
    label: "Read rows",
    helper: "Reads rows in the tables you allow.",
  },
  { id: "create", label: "Create rows", helper: "Adds rows. Changes data." },
  {
    id: "slack",
    label: "Post to Slack",
    helper: "Posts to attached channels.",
  },
];

export function FormSections() {
  const [granted, setGranted] = useState(["read", "slack", "create"]);
  return (
    <div className="form-demo-sections" data-example="sections">
      <FormSection
        title="What it can do"
        description="Choose actions by app. Skills guide the work; these choices grant the capability."
        meta={`${granted.length} / 20`}
      >
        {tools.map((tool) => (
          <CheckboxField
            key={tool.id}
            label={tool.label}
            helper={tool.helper}
            checked={granted.includes(tool.id)}
            onCheckedChange={(checked) =>
              setGranted((current) =>
                checked
                  ? [...current, tool.id]
                  : current.filter((item) => item !== tool.id),
              )
            }
          />
        ))}
      </FormSection>
      <FormSection
        title="Schedules"
        description="Give each recurring run its own task. Schedules stay off until activation."
        meta="2 added"
      >
        <ul className="form-demo-list">
          <li>Weekday supplier digest · every day at 08:00</li>
          <li>Stock check · every 60 minutes</li>
        </ul>
      </FormSection>
      <FormSection
        id="agent-activations"
        title="Activate instructions"
        label="Agent activations"
        description="Runs use the version you activate. Activate again after you change the instructions."
      >
        <p className="form-demo-text">Read rows, Post to Slack</p>
        <div>
          <Button>Activate saved instructions</Button>
        </div>
      </FormSection>
      <FormSection
        title="Placement and sharing"
        description="Where this agent is listed and who can use or manage it."
      >
        <FormSection
          level={3}
          title="Team grants"
          meta="1 of 8"
          description="Teams that can use this agent. Managers can also edit it."
        >
          <p className="form-demo-text">Operations · can use</p>
        </FormSection>
      </FormSection>
      <FormSection
        title="Delete agent"
        description="Removes the agent and stops its active versions."
      >
        <div>
          <Button variant="destructive">Delete agent</Button>
        </div>
      </FormSection>
    </div>
  );
}

/* Compositions */

const steps = ["Basics", "Access", "Triggers", "Schedules", "Review"] as const;

function BuilderComposition() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [job, setJob] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [result, setResult] = useState("");
  const intent = useRef<"save" | "continue">("continue");
  const save = useSampleSave();
  const problems = [
    !name.trim() && "Enter a name.",
    !job.trim() && "Describe the job.",
  ].filter(Boolean) as string[];
  const review = step === steps.length - 1;
  return (
    <Form
      label="Agent setup"
      disabled={save.busy}
      onSubmit={() => {
        if (problems.length) {
          setShowErrors(true);
          setStep(0);
          intent.current = "continue";
          return "invalid";
        }
        setShowErrors(false);
        if (intent.current === "save") {
          intent.current = "continue";
          save.run(() => setResult("Draft saved. New triggers stay off."));
          return;
        }
        if (review) save.run(() => setResult("Agent created and activated."));
        else setStep(step + 1);
      }}
    >
      <div className="form-demo-stack">
        <ol className="form-demo-steps" aria-label="Setup progress">
          {steps.map((item, index) => (
            <li key={item} aria-current={index === step ? "step" : undefined}>
              {index + 1}. {item}
            </li>
          ))}
        </ol>
        {review ? (
          <FormSection
            title="Review your agent"
            description="Create and activate approves this exact setup. Save draft keeps new triggers off."
          >
            <p className="form-demo-text">
              {name} · {job}
            </p>
          </FormSection>
        ) : (
          <FormSection
            title={step === 0 ? "Identity" : steps[step]}
            description={
              step === 0
                ? "Start with the name and the job. Everything else is optional."
                : "Optional in this example. Continue to the next section."
            }
          >
            {step === 0 ? (
              <>
                <Field
                  id="agent-name"
                  label="Name"
                  required
                  counter={`${name.length} / 80`}
                  error={
                    showErrors && !name.trim() ? "Enter a name." : undefined
                  }
                >
                  <Input
                    value={name}
                    maxLength={80}
                    placeholder="Supplier follow-up"
                    onChange={(event) => setName(event.target.value)}
                  />
                </Field>
                <Field
                  id="agent-job"
                  label="Job"
                  required
                  error={
                    showErrors && !job.trim() ? "Describe the job." : undefined
                  }
                >
                  <SampleTextarea
                    value={job}
                    placeholder="Chase suppliers whose deliveries are late and log their replies."
                    onChange={(event) => setJob(event.target.value)}
                  />
                </Field>
              </>
            ) : (
              <p className="form-demo-text">
                No extra settings in this sample step.
              </p>
            )}
          </FormSection>
        )}
        <FormFooter
          dirty={!!(name || job) && !result}
          submit={{
            label: review
              ? "Create and activate"
              : step === 3
                ? "Review agent"
                : "Continue",
            pendingLabel: "Saving setup…",
            state: save.busy ? { kind: "busy" } : { kind: "ready" },
          }}
          secondarySubmit={{
            label: "Save draft",
            disabled: save.busy,
            onSelect: () => {
              intent.current = "save";
            },
          }}
          error={showErrors && problems.length ? problems.join(" ") : undefined}
          note={
            review
              ? "Nothing new runs unless activation completes."
              : "Move between sections freely. Your choices stay here."
          }
        >
          {result && <Status>{result}</Status>}
        </FormFooter>
      </div>
    </Form>
  );
}

const repositories = [
  "tulipfarm/supplier-portal",
  "tulipfarm/warehouse-scanner",
  "tulipfarm/pricing-rules",
  "tulipfarm/handbook",
];

function KnowledgeSelection() {
  const formId = useId();
  const [selected, setSelected] = useState<string[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [closed, setClosed] = useState(false);
  const [done, setDone] = useState(false);
  const save = useSampleSave();
  if (closed || done)
    return (
      <div className="form-demo-stack">
        <Status>
          {done
            ? `${selected.length} repositories added to Knowledge.`
            : "Selection cancelled."}
        </Status>
        <div>
          <Button
            variant="outline"
            onClick={() => {
              setClosed(false);
              setDone(false);
              setSelected([]);
              setAttempted(false);
            }}
          >
            Choose repositories again
          </Button>
        </div>
      </div>
    );
  return (
    <div className="form-demo-stack">
      <FormFooter
        form={formId}
        layout="compact"
        dirty={selected.length > 0}
        summary={
          <p role="status" className="form-demo-summary">
            {selected.length} / 20 selected
          </p>
        }
        submit={{
          label: "Add to Knowledge",
          pendingLabel: "Adding to Knowledge…",
          state: save.busy ? { kind: "busy" } : { kind: "ready" },
        }}
        error={
          attempted && !selected.length
            ? "Review the highlighted choices before adding to Knowledge."
            : undefined
        }
      >
        <Button
          variant="ghost"
          aria-label="Cancel selection"
          disabled={save.busy}
          onClick={() => setClosed(true)}
        >
          Cancel
        </Button>
      </FormFooter>
      <Form
        id={formId}
        label="Add repositories to Knowledge"
        disabled={save.busy}
        onSubmit={() => {
          if (!selected.length) {
            setAttempted(true);
            return "invalid";
          }
          save.run(() => setDone(true));
        }}
      >
        <ChoiceGroup
          type="checkbox"
          legend="Repositories"
          required
          error={
            attempted && !selected.length
              ? "Choose at least one repository."
              : undefined
          }
          value={selected}
          onValueChange={setSelected}
          options={repositories.map((repo) => ({ value: repo, label: repo }))}
        />
      </Form>
    </div>
  );
}

function InteractionCard() {
  const id = useId();
  const [choice, setChoice] = useState("");
  const [typed, setTyped] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  const [result, setResult] = useState("");
  const save = useSampleSave();
  if (result) return <Status>{result}</Status>;
  return (
    <div className="form-demo-card">
      <p className="form-demo-card-text">
        Which supplier should I contact first?
      </p>
      <Form
        disabled={save.busy}
        onSubmit={() => {
          if (typed ? !text.trim() : !choice) {
            setError(true);
            return "invalid";
          }
          setError(false);
          save.run(() => setResult("Response saved. The task continues."));
        }}
      >
        <div className="form-demo-stack">
          {typed ? (
            <Field
              id={`${id}-custom`}
              label="Your answer"
              required
              error={error ? "Enter an answer." : undefined}
            >
              <SampleTextarea
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </Field>
          ) : (
            <ChoiceGroup
              type="radio"
              legend="Answer"
              legendVisibility="screen-reader"
              required
              error={error ? "Choose an answer." : undefined}
              value={choice}
              onValueChange={setChoice}
              options={[
                {
                  value: "greenleaf",
                  label: "Greenleaf Growers",
                  description: "3 late deliveries",
                },
                {
                  value: "northfield",
                  label: "Northfield Bulbs",
                  description: "1 late delivery",
                },
              ]}
            />
          )}
          <FormFooter
            layout="compact"
            summary={
              <div className="form-demo-summary-actions">
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={save.busy}
                  aria-expanded={typed}
                  aria-controls={`${id}-custom`}
                  onClick={() => setTyped(!typed)}
                >
                  {typed ? "Use a listed answer" : "Other answer"}
                </Button>
              </div>
            }
            dirty={!!text || !!choice}
            submit={{
              label: "Continue",
              pendingLabel: "Saving response…",
              state: save.busy ? { kind: "busy" } : { kind: "ready" },
            }}
            error={error ? "Choose or enter an answer to continue." : undefined}
          >
            <Button
              variant="ghost"
              size="xs"
              disabled={save.busy}
              onClick={() => setResult("Question skipped.")}
            >
              Skip
            </Button>
          </FormFooter>
        </div>
      </Form>
    </div>
  );
}

function TestChat() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const send = useSampleSave(700);
  return (
    <div className="form-demo-stack">
      {messages.length > 0 && (
        <ol className="form-demo-list" aria-label="Test messages">
          {messages.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ol>
      )}
      <Form
        label="Agent test chat"
        disabled={send.busy}
        onSubmit={() => {
          const sent = text.trim();
          if (!sent) return;
          send.run(() => {
            setMessages((current) => [
              ...current,
              `You: ${sent}`,
              "Agent: I would check the supplier table first.",
            ]);
            setText("");
          });
        }}
      >
        <div className="form-demo-stack">
          <Field id="agent-test-question" label="Sample message" required>
            <SampleTextarea
              value={text}
              placeholder="How should I request time off?"
              onChange={(event) => setText(event.target.value)}
            />
          </Field>
          <div className="form-demo-row">
            <Button type="submit" disabled={send.busy || !text.trim()}>
              <Send aria-hidden="true" />
              {send.busy ? "Testing…" : "Send test"}
            </Button>
            {messages.length > 0 && !send.busy && (
              <Button variant="ghost" onClick={() => setMessages([])}>
                <Refresh aria-hidden="true" />
                Reset test
              </Button>
            )}
          </div>
        </div>
      </Form>
      {send.busy && <Status>Generating a tool-free reply…</Status>}
    </div>
  );
}

function RecordEditor() {
  const [supplier, setSupplier] = useState("");
  const [quantity, setQuantity] = useState("");
  const [checked, setChecked] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = useSampleSave();
  const errors = [!supplier.trim(), !(Number(quantity) > 0)].filter(
    Boolean,
  ).length;
  return (
    <Form
      label="Add row"
      disabled={save.busy}
      onSubmit={() => {
        if (errors) {
          setChecked(true);
          return "invalid";
        }
        save.run(() => setSaved(true));
      }}
    >
      <div className="form-demo-stack">
        <Field
          id="row-supplier"
          label="Supplier"
          required
          error={checked && !supplier.trim() ? "Enter a supplier." : undefined}
        >
          <Input
            value={supplier}
            onChange={(event) => setSupplier(event.target.value)}
          />
        </Field>
        <Field
          id="row-quantity"
          label="Quantity"
          required
          error={
            checked && !(Number(quantity) > 0)
              ? "Enter a quantity above 0."
              : undefined
          }
        >
          <Input
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </Field>
        <CheckboxField
          label="Simulate a newer saved definition"
          checked={conflict}
          onCheckedChange={setConflict}
        />
        <FormFooter
          dirty={!!(supplier || quantity) && !saved}
          error={
            checked && errors
              ? `Fix ${errors} ${errors === 1 ? "field" : "fields"} to save the row.`
              : undefined
          }
          submit={{
            label: "Save new row",
            pendingLabel: "Saving new row…",
            state: save.busy
              ? { kind: "busy" }
              : conflict
                ? {
                    kind: "blocked",
                    reason: "Review the changed fields before saving.",
                  }
                : { kind: "ready" },
          }}
        >
          {saved && <Status>Row saved.</Status>}
          {conflict && (
            <Alert>
              <AlertDescription>
                A newer definition was saved. Your edits are retained. Reload
                the table, then choose which revision to edit.
              </AlertDescription>
            </Alert>
          )}
          <div className="form-demo-row">
            {conflict && (
              <Button variant="outline" onClick={() => setConflict(false)}>
                Reload table
              </Button>
            )}
            <Button
              variant="outline"
              disabled={save.busy}
              onClick={() => {
                setSupplier("");
                setQuantity("");
                setChecked(false);
                setSaved(false);
              }}
            >
              Discard new row
            </Button>
          </div>
        </FormFooter>
      </div>
    </Form>
  );
}

function InviteMembersDialog() {
  const [open, setOpen] = useState(false);
  const [addresses, setAddresses] = useState([""]);
  const [validated, setValidated] = useState(false);
  const [sent, setSent] = useState("");
  const save = useSampleSave();
  const valid = (email: string) => /^\S+@\S+\.\S+$/.test(email.trim());
  const filled = addresses.filter((email) => email.trim());
  const invalid = !filled.length || filled.some((email) => !valid(email));
  return (
    <div className="form-demo-stack">
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setAddresses([""]);
            setValidated(false);
          }
        }}
      >
        <div>
          <DialogTrigger render={<Button />}>
            <Plus aria-hidden="true" />
            Invite members
          </DialogTrigger>
        </div>
        <DialogContent size="form">
          <DialogHeader>
            <DialogTitle>Invite members</DialogTitle>
            <DialogDescription>
              Invitations expire after 7 days.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Form
              label="Invite members"
              disabled={save.busy}
              onSubmit={() => {
                if (invalid) {
                  setValidated(true);
                  return "invalid";
                }
                save.run(() => {
                  setSent(
                    `${filled.length} ${filled.length === 1 ? "invitation" : "invitations"} sent.`,
                  );
                  setOpen(false);
                });
              }}
            >
              <div className="form-demo-stack">
                <fieldset className="form-demo-fieldset">
                  <legend>Email addresses</legend>
                  {addresses.map((email, index) => (
                    <div key={index} className="form-demo-invite-row">
                      <Field
                        id={`invitation-email-${index}`}
                        label={`Email ${index + 1}`}
                        labelVisibility="screen-reader"
                        required
                        className="form-demo-grow"
                        error={
                          validated &&
                          ((email.trim() && !valid(email)) ||
                            (!filled.length && index === 0))
                            ? "Enter a valid email address."
                            : undefined
                        }
                      >
                        <Input
                          type="email"
                          autoComplete="off"
                          placeholder="teammate@example.com"
                          value={email}
                          onChange={(event) =>
                            setAddresses((current) =>
                              current.map((item, at) =>
                                at === index ? event.target.value : item,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={
                          save.busy || (addresses.length === 1 && !email)
                        }
                        aria-label={`Remove email ${index + 1}`}
                        onClick={() =>
                          setAddresses((current) =>
                            current.length === 1
                              ? [""]
                              : current.filter((_, at) => at !== index),
                          )
                        }
                      >
                        <X size={16} aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </fieldset>
                <div>
                  <Button
                    variant="ghost"
                    disabled={save.busy}
                    onClick={() => {
                      setAddresses((current) => [...current, ""]);
                      requestAnimationFrame(() =>
                        document
                          .getElementById(
                            `invitation-email-${addresses.length}`,
                          )
                          ?.focus(),
                      );
                    }}
                  >
                    <Plus size={16} aria-hidden="true" />
                    Add another
                  </Button>
                </div>
                <FormFooter
                  dirty={false}
                  layout="stack"
                  note="Drafts stay here until you leave Members. Sending is subject to hourly limits."
                  error={
                    validated && invalid
                      ? "Check each email address and select its workspace member."
                      : undefined
                  }
                  submit={{
                    label: "Send invitations",
                    pendingLabel: "Sending invitations…",
                    state: save.busy ? { kind: "busy" } : { kind: "ready" },
                  }}
                >
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Not now
                  </Button>
                </FormFooter>
              </div>
            </Form>
          </DialogBody>
        </DialogContent>
      </Dialog>
      {sent && <Status>{sent}</Status>}
    </div>
  );
}

function PolicySections() {
  const base = { owner: "operations", enrollment: ["operations"] };
  const [owner, setOwner] = useState(base.owner);
  const [savedOwner, setSavedOwner] = useState(base.owner);
  const [enrollment, setEnrollment] = useState(base.enrollment);
  const [savedEnrollment, setSavedEnrollment] = useState(base.enrollment);
  const [feedback, setFeedback] = useState<"policy" | "enrollment" | null>(
    null,
  );
  const [submitted, setSubmitted] = useState<"policy" | "enrollment" | null>(
    null,
  );
  const save = useSampleSave();
  const state: FormActionState = save.busy
    ? { kind: "busy" }
    : { kind: "ready" };
  const button = (
    section: "policy" | "enrollment",
    label: string,
    pending: string,
  ) => ({
    label,
    pendingLabel: submitted === section ? pending : label,
    state,
  });
  const enrollmentDirty = enrollment.join() !== savedEnrollment.join();
  return (
    <div className="form-demo-sections">
      <FormSection
        id="agent-ownership"
        title="Placement and sharing"
        description="Where this agent is listed and who can use or manage it."
      >
        <Form
          disabled={save.busy}
          onSubmit={() => {
            setSubmitted("policy");
            save.run(() => {
              setSavedOwner(owner);
              setFeedback("policy");
            });
          }}
        >
          <div className="form-demo-stack">
            <Field id="agent-owner" label="Owning team" required>
              <TeamSelect value={owner} onValueChange={setOwner} />
            </Field>
            <FormFooter
              dirty={owner !== savedOwner}
              cancel={{
                kind: "reset",
                label: "Discard changes",
                onReset: () => setOwner(savedOwner),
              }}
              submit={button("policy", "Save sharing", "Saving sharing…")}
            >
              {feedback === "policy" && <Status>Sharing saved.</Status>}
            </FormFooter>
          </div>
        </Form>
      </FormSection>
      <FormSection
        id="agent-enrollment"
        title="Team enrollment"
        description="Teams whose permissions this agent uses when it runs."
      >
        <Form
          disabled={save.busy}
          onSubmit={() => {
            setSubmitted("enrollment");
            save.run(() => {
              setSavedEnrollment(enrollment);
              setFeedback("enrollment");
            });
          }}
        >
          <div className="form-demo-stack">
            <ChoiceGroup
              type="checkbox"
              legend="Enrolled teams"
              optional
              layout="columns"
              value={enrollment}
              onValueChange={setEnrollment}
              options={teams}
            />
            <FormFooter
              dirty={enrollmentDirty}
              cancel={{
                kind: "reset",
                label: "Discard changes",
                onReset: () => setEnrollment(savedEnrollment),
              }}
              submit={button(
                "enrollment",
                "Save enrollment",
                "Saving enrollment…",
              )}
            >
              {feedback === "enrollment" && <Status>Enrollment saved.</Status>}
            </FormFooter>
          </div>
        </Form>
      </FormSection>
    </div>
  );
}

function EditorCreate() {
  const [role, setRole] = useState("");
  const [checked, setChecked] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = useSampleSave();
  return (
    <Form
      disabled={save.busy}
      onSubmit={() => {
        if (!role.trim()) {
          setChecked(true);
          return "invalid";
        }
        save.run(() => setSaved(true));
      }}
    >
      <div className="form-demo-stack">
        <FormSection
          title="Role"
          description="Who this agent is and the job it does."
        >
          <Field
            id="editor-role"
            label="Instructions"
            required
            error={checked && !role.trim() ? "Enter instructions." : undefined}
          >
            <SampleTextarea
              value={role}
              onChange={(event) => setRole(event.target.value)}
            />
          </Field>
        </FormSection>
        <FormFooter
          layout="stack"
          dirty={!!role && !saved}
          error={
            checked && !role.trim()
              ? "Fix 1 field to save the agent."
              : undefined
          }
          submit={{
            label: "Save agent",
            pendingLabel: "Saving agent…",
            state: save.busy
              ? { kind: "busy" }
              : saved
                ? {
                    kind: "blocked",
                    reason: "Your changes are saved.",
                    fix: {
                      kind: "action",
                      label: "Continue editing",
                      onClick: () => setSaved(false),
                    },
                  }
                : { kind: "ready" },
          }}
          note="Saving keeps the agent off until a manager configures access and activates it."
          cancel={{
            kind: "leave",
            label: "Cancel",
            link: <a href="#form-compositions" />,
          }}
        />
      </div>
    </Form>
  );
}

export function FormCompositions() {
  return (
    <div className="form-demo-compositions" data-example="compositions">
      <Frame
        title="Agent builder · steps, Save draft secondary submit"
        example="builder"
        wide
      >
        <BuilderComposition />
      </Frame>
      <Frame
        title="Agent administration · one form per section"
        example="policy"
        wide
      >
        <PolicySections />
      </Frame>
      <div className="form-demo-grid-2">
        <Frame title="New agent · stack footer, leave link" example="editor">
          <EditorCreate />
        </Frame>
        <Frame
          title="GitHub Knowledge · footer outside the form"
          example="knowledge"
        >
          <KnowledgeSelection />
        </Frame>
        <Frame
          title="Chat question · compact summary actions"
          example="interaction"
        >
          <InteractionCard />
        </Frame>
        <Frame
          title="Agent test chat · form without a footer"
          example="test-chat"
        >
          <TestChat />
        </Frame>
        <Frame title="Table row · footer feedback and actions" example="record">
          <RecordEditor />
        </Frame>
        <Frame title="Members · stack footer in a dialog" example="invite">
          <InviteMembersDialog />
        </Frame>
      </div>
    </div>
  );
}
