import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen } from "reicon-react/icons/BookOpen";
import { BranchDown } from "reicon-react/icons/BranchDown";
import { Check } from "reicon-react/icons/Check";
import { Database } from "reicon-react/icons/Database";
import { FileText } from "reicon-react/icons/FileText";
import { Refresh } from "reicon-react/icons/Refresh";
import { ShieldUser } from "reicon-react/icons/ShieldUser";
import { Users } from "reicon-react/icons/Users";
import { Alert, AlertDescription } from "@tulipfarm/sprout/alert";
import { Badge } from "@tulipfarm/sprout/badge";
import { BrandStack, type Brand } from "@tulipfarm/sprout/brand-icon";
import { Button } from "@tulipfarm/sprout/button";
import { CodeBlock } from "@tulipfarm/sprout/code-block";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@tulipfarm/sprout/collapsible";
import { CheckboxField } from "@tulipfarm/sprout/field";
import {
  ReviewCard,
  ReviewRow,
  ReviewRows,
  ReviewSteps,
  ReviewValues,
  type ReviewCardBadge,
  type ReviewStep,
} from "@tulipfarm/sprout/review-card";
import { Spinner } from "@tulipfarm/sprout/spinner";
import DocsSelect from "./DocsSelect";
import "../styles/review-card-demo.css";

/* Shared frame -------------------------------------------------------------- */

function Frame({
  title,
  note,
  controls,
  children,
  id,
}: {
  title: string;
  note?: string;
  controls?: ReactNode;
  children: ReactNode;
  id: string;
}) {
  return (
    <section className="review-demo-frame" aria-label={title} data-recipe={id}>
      <div className="review-demo-bar">
        <div className="review-demo-bar-text">
          <span className="review-demo-bar-title">{title}</span>
          {note && <span className="review-demo-note">{note}</span>}
        </div>
        {controls && <div className="review-demo-controls">{controls}</div>}
      </div>
      <div className="review-demo-stage">{children}</div>
    </section>
  );
}

function Picker<Value extends string>({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: Value;
  values: readonly (readonly [Value, string])[];
  onChange: (value: Value) => void;
}) {
  return (
    <span className="review-demo-picker">
      {label}
      <DocsSelect<Value>
        label={label}
        value={value}
        onValueChange={onChange}
        items={values.map(([item, text]) => ({ value: item, label: text }))}
      />
    </span>
  );
}

function TechnicalDetails({ items }: { items: readonly [string, string][] }) {
  return (
    <Collapsible>
      <CollapsibleTrigger render={<Button variant="outline" />}>
        Technical details
      </CollapsibleTrigger>
      <CollapsibleContent keepMounted>
        <dl aria-label="Technical details" className="review-demo-technical">
          {items.map(([term, value]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="review-demo-fine">{children}</p>;
}

function useFocusOnSettle(settled: boolean) {
  const result = useRef<HTMLDivElement>(null);
  const submitted = useRef(false);
  useEffect(() => {
    if (settled && submitted.current) {
      result.current?.focus();
      submitted.current = false;
    }
  }, [settled]);
  return { result, submitted };
}

/* Playground: a row change -------------------------------------------------- */

type DraftStatus =
  "pending" | "preparing" | "saved" | "dismissed" | "stale" | "failed";
type RowKind = "create" | "update" | "delete";

const draftStatuses = [
  ["pending", "Pending"],
  ["preparing", "Preparing"],
  ["saved", "Saved"],
  ["dismissed", "Dismissed"],
  ["stale", "Stale"],
  ["failed", "Failed"],
] as const;

const rowBadges: Record<DraftStatus, ReviewCardBadge> = {
  pending: { label: "Needs approval", variant: "warning" },
  preparing: { label: "Applying", variant: "secondary" },
  saved: { label: "Applied", variant: "info" },
  dismissed: { label: "Dismissed", variant: "secondary" },
  stale: { label: "Out of date", variant: "warning" },
  failed: { label: "Not applied", variant: "destructive" },
};

const rowVerbs = { create: "Add", update: "Update", delete: "Delete" } as const;

const supplierRow = [
  {
    field: "Supplier",
    value: "Northwind Traders",
    current: "Northwind Traders",
  },
  { field: "Delivery date", value: "14 Nov 2026", current: "7 Nov 2026" },
  { field: "Status", value: "Delayed", current: "On track" },
  {
    field: "Notes",
    value: "Carrier confirmed a one-week delay on the October order.",
    current: "—",
  },
];

export function ReviewCardPlayground() {
  const [kind, setKind] = useState<RowKind>("update");
  const [status, setStatus] = useState<DraftStatus>("pending");
  const [values, setValues] = useState<"filled" | "empty">("filled");
  const settled =
    status === "saved" || status === "dismissed" || status === "failed";
  const { result, submitted } = useFocusOnSettle(settled);
  useEffect(() => {
    if (status !== "preparing" || !submitted.current) return;
    const timer = setTimeout(() => setStatus("saved"), 600);
    return () => clearTimeout(timer);
  }, [status, submitted]);
  const decide = (next: "save" | "dismiss") => {
    submitted.current = true;
    setStatus(next === "save" ? "preparing" : "dismissed");
  };
  const shown = values === "filled" ? supplierRow : [];
  return (
    <section className="review-demo-frame" aria-label="Review card playground">
      <div className="review-demo-toolbar">
        <Picker
          label="Change"
          value={kind}
          onChange={setKind}
          values={[
            ["create", "Add a row"],
            ["update", "Update a row"],
            ["delete", "Delete a row"],
          ]}
        />
        <Picker
          label="Draft status"
          value={status}
          onChange={setStatus}
          values={draftStatuses}
        />
        <Picker
          label="Values"
          value={values}
          onChange={setValues}
          values={[
            ["filled", "With values"],
            ["empty", "Empty"],
          ]}
        />
      </div>
      <div className="review-demo-stage">
        <div className="review-demo-chat">
          <ReviewCard
            label="Review row change"
            icon={<Database size={16} />}
            title={`${rowVerbs[kind]} a row in Supplier deliveries`}
            badge={rowBadges[status]}
            settled={settled}
            actions={
              status === "pending" ? (
                <>
                  <Button
                    variant={kind === "delete" ? "destructive" : "default"}
                    onClick={() => decide("save")}
                  >
                    {kind === "delete" ? "Approve deletion" : "Approve change"}
                  </Button>
                  <Button variant="ghost" onClick={() => decide("dismiss")}>
                    Dismiss
                  </Button>
                </>
              ) : undefined
            }
            status={
              <div ref={result} tabIndex={-1} className="review-demo-result">
                {status === "stale" && (
                  <div className="review-demo-stack">
                    <p role="status">
                      The table or row changed after this draft. Nothing was
                      changed. Ask chat for a fresh draft and review it again.
                    </p>
                    <Button variant="ghost" onClick={() => decide("dismiss")}>
                      Dismiss draft
                    </Button>
                  </div>
                )}
                {status === "failed" && (
                  <p role="status">
                    The row could not be changed. Ask chat for a fresh draft.
                  </p>
                )}
                {status === "preparing" && (
                  <p role="status">
                    Your approval is recorded. The row is being changed.
                  </p>
                )}
                {status === "saved" && (
                  <p role="status">
                    {kind === "create"
                      ? "Row added."
                      : kind === "update"
                        ? "Row updated."
                        : "Row deleted."}
                  </p>
                )}
                {status === "dismissed" && (
                  <p role="status">Draft dismissed. No row was changed.</p>
                )}
              </div>
            }
          >
            <ReviewRows>
              <ReviewRow label="Change">
                {kind === "create"
                  ? "Adds a new row"
                  : kind === "update"
                    ? "Updates an existing row"
                    : "Deletes an existing row"}
              </ReviewRow>
              <ReviewRow label="Table">Supplier deliveries</ReviewRow>
            </ReviewRows>
            {shown.length > 0 ? (
              <ReviewRows>
                {shown.map((row) => (
                  <ReviewRow key={row.field} label={row.field}>
                    <div className="review-demo-value">
                      <span>{kind === "delete" ? row.current : row.value}</span>
                      {kind === "update" && (
                        <span className="review-demo-current">
                          Currently {row.current}
                        </span>
                      )}
                    </div>
                  </ReviewRow>
                ))}
              </ReviewRows>
            ) : (
              <p className="review-demo-muted">
                {kind === "delete"
                  ? "Current row values are unavailable. See technical details."
                  : "No field values set."}
              </p>
            )}
            <Note>
              This chat used content from outside your tables, such as web
              pages, knowledge, files or connected apps, so the change waits for
              your approval. Approving makes this exact change with your table
              access.
            </Note>
            <TechnicalDetails
              items={[
                ["Table ID", "tbl_7d1c4e2a9b"],
                ...(kind === "create"
                  ? []
                  : [["Row ID", "rec_0f9e81c4d2"] as [string, string]]),
                ["Applied revision", "42"],
                ["Draft ID", "drf_5b2a7c19e0"],
                [
                  "SHA-256",
                  "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
                ],
              ]}
            />
            <div>
              <Button size="sm" variant="ghost" onClick={() => undefined}>
                Check draft status
              </Button>
            </div>
          </ReviewCard>
        </div>
      </div>
    </section>
  );
}

/* Badge variants ------------------------------------------------------------ */

const badgeSamples: {
  badge: ReviewCardBadge;
  title: string;
  icon: ReactNode;
}[] = [
  {
    badge: { label: "Needs approval", variant: "warning" },
    title: "Update a row in Supplier deliveries",
    icon: <Database size={16} />,
  },
  {
    badge: { label: "Awaiting your review", variant: "info" },
    title: "Add a Priority field to Customer accounts",
    icon: <Database size={14} />,
  },
  {
    badge: { label: "Active", variant: "success" },
    title: "Supplier follow-up",
    icon: <Users size={16} />,
  },
  {
    badge: { label: "Draft", variant: "secondary" },
    title: "Summarize meeting notes",
    icon: <BookOpen size={16} />,
  },
  {
    badge: { label: "Not applied", variant: "destructive" },
    title: "Delete a row in Supplier deliveries",
    icon: <Database size={16} />,
  },
  {
    badge: { label: "Ready for your approval", variant: "default" },
    title: "Weekly team update",
    icon: <BranchDown size={16} />,
  },
  {
    badge: { label: "Partially completed", variant: "outline" },
    title:
      "Import 1,284 rows into Customer accounts and update the matching invoices",
    icon: <Database size={14} />,
  },
];

export function ReviewCardBadges() {
  return (
    <Frame
      id="badges"
      title="Badge variants"
      note="Each card starts folded; click a header to open it"
    >
      <div className="review-demo-list">
        {badgeSamples.map((sample) => (
          <div
            key={sample.badge.variant}
            data-badge-variant={sample.badge.variant}
          >
            <ReviewCard
              icon={sample.icon}
              title={sample.title}
              badge={sample.badge}
              settled
            >
              <p className="review-demo-muted">
                Sample details for the {sample.badge.label.toLowerCase()}{" "}
                review.
              </p>
            </ReviewCard>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* Chat confirmation --------------------------------------------------------- */

type ConfirmationState =
  | { kind: "pending" }
  | { kind: "submitting"; decision: "approve" | "reject" }
  | { kind: "approved" }
  | { kind: "rejected" }
  | { kind: "expired" }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

const confirmationKinds = [
  ["pending", "Pending"],
  ["submitting", "Submitting"],
  ["approved", "Approved"],
  ["rejected", "Declined"],
  ["expired", "Expired"],
  ["cancelled", "Cancelled"],
  ["error", "Error"],
] as const;

function toConfirmation(kind: ConfirmationState["kind"]): ConfirmationState {
  if (kind === "error")
    return { kind, message: "Your decision could not be recorded. Try again." };
  if (kind === "submitting") return { kind, decision: "approve" };
  return { kind };
}

function ChatConfirmationSample({
  state,
  onDecision,
  disabled = false,
}: {
  state: ConfirmationState;
  onDecision: (decision: "approve" | "reject") => void;
  disabled?: boolean;
}) {
  const done =
    state.kind === "approved" ||
    state.kind === "rejected" ||
    state.kind === "expired" ||
    state.kind === "cancelled";
  const section = useRef<HTMLDivElement>(null);
  const result = useRef<HTMLParagraphElement>(null);
  const submittedHere = useRef(false);
  useEffect(() => {
    if (state.kind === "submitting")
      submittedHere.current =
        section.current?.contains(document.activeElement) ?? false;
    if (done && submittedHere.current) {
      result.current?.focus();
      submittedHere.current = false;
    }
  }, [done, state.kind]);
  const badge: ReviewCardBadge =
    state.kind === "approved"
      ? { label: "Approved", variant: "info" }
      : state.kind === "rejected"
        ? { label: "Declined", variant: "secondary" }
        : state.kind === "expired"
          ? { label: "Expired", variant: "secondary" }
          : state.kind === "cancelled"
            ? { label: "Cancelled", variant: "secondary" }
            : { label: "Approval required", variant: "warning" };
  const busy = (decision: "approve" | "reject") =>
    state.kind === "submitting" && state.decision === decision;
  return (
    <div ref={section} data-slot="chat-confirmation">
      <ReviewCard
        icon={<ShieldUser size={16} />}
        title="Reply in #supplier-updates"
        badge={badge}
        settled={done}
        status={
          state.kind === "error" || done ? (
            <>
              {state.kind === "error" && (
                <p role="alert" className="review-demo-error">
                  {state.message}
                </p>
              )}
              {done && (
                <p
                  ref={result}
                  tabIndex={-1}
                  role="status"
                  className="review-demo-muted review-demo-result"
                >
                  {state.kind === "approved"
                    ? "Approval recorded. This does not confirm the action has completed."
                    : state.kind === "rejected"
                      ? "The proposed action was declined."
                      : state.kind === "expired"
                        ? "This approval expired. No approval was granted."
                        : "This approval was cancelled. No approval was granted."}
                </p>
              )}
            </>
          ) : undefined
        }
        actions={
          done ? undefined : (
            <>
              <Button
                disabled={disabled || state.kind === "submitting"}
                aria-busy={busy("approve")}
                onClick={() => onDecision("approve")}
              >
                {busy("approve") && <Spinner aria-hidden="true" />}Approve
                action
              </Button>
              <Button
                variant="ghost"
                disabled={disabled || state.kind === "submitting"}
                aria-busy={busy("reject")}
                onClick={() => onDecision("reject")}
              >
                {busy("reject") && <Spinner aria-hidden="true" />}Decline
              </Button>
            </>
          )
        }
      >
        <p className="review-demo-muted">
          The agent wants to post this reply with your Slack account.
        </p>
        <ReviewRows>
          <ReviewRow label="App">Slack</ReviewRow>
          <ReviewRow label="Channel">#supplier-updates</ReviewRow>
          <ReviewRow label="Posts as">Your Slack account</ReviewRow>
          <ReviewRow label="Message">
            Thanks, Northwind. We’ve moved the October delivery to 14 November
            and updated the tracker.
          </ReviewRow>
        </ReviewRows>
      </ReviewCard>
    </div>
  );
}

export function ReviewCardConfirmation() {
  const [kind, setKind] = useState<ConfirmationState["kind"]>("pending");
  const [state, setState] = useState<ConfirmationState>({ kind: "pending" });
  const [disabled, setDisabled] = useState<"no" | "yes">("no");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const pick = (next: ConfirmationState["kind"]) => {
    clearTimeout(timer.current);
    setKind(next);
    setState(toConfirmation(next));
  };
  return (
    <Frame
      id="confirmation"
      title="Approval"
      note="Approve or decline changes local state only"
      controls={
        <>
          <Picker
            label="Approval state"
            value={kind}
            onChange={pick}
            values={confirmationKinds}
          />
          <Picker
            label="Locked"
            value={disabled}
            onChange={setDisabled}
            values={[
              ["no", "No"],
              ["yes", "Yes"],
            ]}
          />
        </>
      }
    >
      <div className="review-demo-chat">
        <ChatConfirmationSample
          state={state}
          disabled={disabled === "yes"}
          onDecision={(decision) => {
            setState({ kind: "submitting", decision });
            timer.current = setTimeout(() => {
              const next = decision === "approve" ? "approved" : "rejected";
              setKind(next);
              setState({ kind: next });
            }, 600);
          }}
        />
      </div>
    </Frame>
  );
}

/* Authoring drafts ---------------------------------------------------------- */

type DraftKind = "workflow" | "agent-create" | "agent-update" | "skill";
type Feedback =
  "none" | "sending" | "uncertain" | "rejected" | "refresh-error" | "delayed";

const authoringBadges: Record<DraftStatus, ReviewCardBadge> = {
  pending: { label: "Draft", variant: "secondary" },
  preparing: { label: "Saving", variant: "secondary" },
  saved: { label: "Saved", variant: "info" },
  dismissed: { label: "Dismissed", variant: "secondary" },
  stale: { label: "Out of date", variant: "warning" },
  failed: { label: "Not saved", variant: "destructive" },
};

const agentTools: { label: string; changes: boolean }[] = [
  { label: "Read Gmail", changes: false },
  { label: "Send Gmail", changes: true },
  { label: "Read Slack", changes: false },
  { label: "Post to Slack", changes: true },
  { label: "Read GitHub issues", changes: false },
];

const agentBrands: { brand: Brand; name: string }[] = [
  { brand: "google", name: "Google Workspace" },
  { brand: "slack", name: "Slack" },
  { brand: "github", name: "GitHub" },
];

function DraftFeedback({ feedback }: { feedback: Feedback }) {
  if (feedback === "refresh-error")
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Could not refresh this draft. Check its status before deciding.
        </AlertDescription>
      </Alert>
    );
  if (feedback === "sending")
    return <p role="status">Recording your decision…</p>;
  if (feedback === "uncertain")
    return (
      <div className="review-demo-stack">
        <Alert variant="destructive">
          <AlertDescription>
            The outcome is uncertain. Retry the exact decision without creating
            another save.
          </AlertDescription>
        </Alert>
        <div>
          <Button variant="outline">Retry same decision</Button>
        </div>
      </div>
    );
  if (feedback === "rejected")
    return (
      <Alert variant="destructive">
        <AlertDescription>
          You no longer have access to save this draft.
        </AlertDescription>
      </Alert>
    );
  if (feedback === "delayed")
    return (
      <p className="review-demo-muted">
        Automatic checks stopped after a minute. Check draft status for an
        update.
      </p>
    );
  return null;
}

export function ReviewCardAuthoring() {
  const [kind, setKind] = useState<DraftKind>("agent-update");
  const [status, setStatus] = useState<DraftStatus>("pending");
  const [feedback, setFeedback] = useState<Feedback>("none");
  const settled =
    status === "saved" || status === "dismissed" || status === "failed";
  const { result, submitted } = useFocusOnSettle(settled);
  const workflow = kind === "workflow";
  const agent = kind === "agent-create" || kind === "agent-update";
  const updating = kind === "agent-update";
  const locked = feedback === "sending" || feedback === "uncertain";
  const noun = workflow ? "workflow" : agent ? "agent" : "skill";
  const decide = (next: "save" | "dismiss") => {
    if (locked) return;
    submitted.current = true;
    setStatus(next === "save" ? "saved" : "dismissed");
  };
  const changing = agentTools.filter((tool) => tool.changes).length;
  return (
    <Frame
      id="authoring"
      title="Workflow, agent, and skill drafts"
      note="Decisions change local state only"
      controls={
        <>
          <Picker
            label="Draft"
            value={kind}
            onChange={setKind}
            values={[
              ["workflow", "Workflow"],
              ["agent-create", "New agent"],
              ["agent-update", "Agent update"],
              ["skill", "Skill"],
            ]}
          />
          <Picker
            label="Authoring status"
            value={status}
            onChange={setStatus}
            values={draftStatuses}
          />
          <Picker
            label="Feedback"
            value={feedback}
            onChange={setFeedback}
            values={[
              ["none", "None"],
              ["sending", "Sending"],
              ["uncertain", "Uncertain"],
              ["rejected", "Rejected"],
              ["refresh-error", "Refresh failed"],
              ["delayed", "Checks stopped"],
            ]}
          />
        </>
      }
    >
      <div className="review-demo-chat">
        <ReviewCard
          label={`Review ${noun} draft`}
          icon={
            workflow ? (
              <BranchDown size={16} />
            ) : agent ? (
              <Users size={16} />
            ) : (
              <BookOpen size={16} />
            )
          }
          title={
            workflow
              ? "Weekly team update"
              : agent
                ? "Supplier follow-up"
                : "Summarize meeting notes"
          }
          badge={authoringBadges[status]}
          settled={settled}
          actions={
            status === "pending" ? (
              <>
                <Button
                  disabled={locked}
                  aria-busy={feedback === "sending"}
                  onClick={() => decide("save")}
                >
                  {workflow
                    ? "Save and activate"
                    : agent
                      ? "Save agent"
                      : "Save skill"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={locked}
                  onClick={() => decide("dismiss")}
                >
                  Not now
                </Button>
              </>
            ) : undefined
          }
          status={
            <>
              <div ref={result} tabIndex={-1} className="review-demo-result">
                {status === "stale" && (
                  <div className="review-demo-stack">
                    <p role="status">
                      The target or workspace definition changed. Ask chat for a
                      fresh draft and review it again.
                    </p>
                    <div>
                      <Button
                        variant="ghost"
                        disabled={locked}
                        onClick={() => decide("dismiss")}
                      >
                        Dismiss draft
                      </Button>
                    </div>
                  </div>
                )}
                {status === "failed" && (
                  <p role="status">
                    The definition could not be saved. Ask chat for a fresh
                    draft.
                  </p>
                )}
                {status === "preparing" && (
                  <p role="status">
                    Your review is recorded. The definition is being saved. You
                    can leave this chat and return later.
                  </p>
                )}
                {status === "saved" && (
                  <p role="status">
                    {workflow
                      ? "Workflow active. Next run Monday, 19 October 2026 at 9:00 GMT+5:30."
                      : agent
                        ? updating
                          ? "Agent saved. These changes stay inactive until an agent manager activates this revision."
                          : "Agent saved. It stays off until an agent manager activates this revision."
                        : "Skill saved. Agents use it only after a skill manager reviews this revision."}
                  </p>
                )}
                {status === "dismissed" && (
                  <p role="status">
                    {workflow
                      ? "Draft dismissed. Nothing was saved or activated."
                      : "Draft dismissed. No definition was saved."}
                  </p>
                )}
              </div>
              <DraftFeedback feedback={feedback} />
            </>
          }
        >
          {agent && (
            <ReviewRows>
              <ReviewRow label="Change">
                {updating ? (
                  <span>Updates existing agent “Supplier follow-up”</span>
                ) : (
                  <span>Creates a new agent</span>
                )}
              </ReviewRow>
              {updating && (
                <ReviewRow label="Changed fields">
                  <span>Instructions, Tools, Model family</span>
                </ReviewRow>
              )}
            </ReviewRows>
          )}
          {workflow ? (
            <div className="review-demo-stack">
              <p>
                Saves a new revision of an existing workflow and activates it
              </p>
              <p>3 steps. Next run Monday, 19 October 2026 at 9:00 GMT+5:30.</p>
              <div className="review-demo-row">
                <Button variant="outline">View workflow draft</Button>
                {status === "saved" && (
                  <Button variant="outline">View saved workflow</Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {kind === "skill" && (
                <p>
                  Turns raw meeting notes into decisions, owners, and dates.
                </p>
              )}
              <p className="review-demo-pre">
                {agent
                  ? "Each Monday, check the Supplier deliveries table for late orders.\nEmail each late supplier a polite reminder and post a summary in #supplier-updates."
                  : "Read the notes.\nList each decision, then each action with its owner and due date.\nKeep it under 200 words."}
              </p>
            </>
          )}
          {agent && (
            <ReviewRows>
              <ReviewRow label="Team">Operations</ReviewRow>
              <ReviewRow label="Model">Claude Sonnet</ReviewRow>
              <ReviewRow label="Actions">
                <div className="review-demo-actions">
                  <BrandStack brands={agentBrands} />
                  <ul
                    aria-label="Actions this agent may take"
                    className="review-demo-badges"
                  >
                    {agentTools.map((tool) => (
                      <li key={tool.label}>
                        <Badge variant={tool.changes ? "warning" : "secondary"}>
                          {tool.label}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  <p className="review-demo-fine">
                    {changing} actions change data.
                  </p>
                </div>
              </ReviewRow>
              <ReviewRow label="Skills">
                <ul aria-label="Pinned skills" className="review-demo-skills">
                  <li>Summarize meeting notes</li>
                  <li>Built-in skill: web-research</li>
                </ul>
              </ReviewRow>
            </ReviewRows>
          )}
          <Note>
            {workflow
              ? "Scheduled, record-date and webhook runs start without you and run with your access as the sponsor. Webhook keys are created only on the Workflows page."
              : agent
                ? updating
                  ? "Saving does not activate these changes. An agent manager must activate the exact saved revision separately."
                  : "Saving does not activate this agent. An agent manager must turn on execution and activate its exact saved revision separately."
                : "Saving creates a workspace skill draft. A skill manager must review its exact revision separately. Skills grant no authority."}
          </Note>
          <TechnicalDetails
            items={[
              ...(updating
                ? [["Agent ID", "agt_3c9e10f2b7"] as [string, string]]
                : []),
              ...(agent
                ? ([
                    ["Team ID", "team_8a71c0"],
                    [
                      "Tool IDs",
                      "google.gmail.read, google.gmail.send, slack.read, slack.post, github.issues.read",
                    ],
                  ] as [string, string][])
                : []),
              ...(workflow
                ? [["Workflow ID", "wfl_19ab2cd7e4"] as [string, string]]
                : []),
              ["Draft ID", "drf_4e8c2a9d71"],
              [
                "SHA-256",
                "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
              ],
            ]}
          />
          <div>
            <Button size="sm" variant="ghost" disabled={feedback === "sending"}>
              Check draft status
            </Button>
          </div>
        </ReviewCard>
      </div>
    </Frame>
  );
}

/* Agent setup --------------------------------------------------------------- */

type SetupStatus =
  | "pending"
  | "preparing"
  | "active"
  | "saved"
  | "blocked"
  | "stale"
  | "failed"
  | "dismissed";

const setupBadges: Record<SetupStatus, ReviewCardBadge> = {
  pending: { label: "Draft", variant: "secondary" },
  preparing: { label: "Saving", variant: "secondary" },
  active: { label: "Active", variant: "success" },
  saved: { label: "Saved draft", variant: "secondary" },
  blocked: { label: "Setup incomplete", variant: "warning" },
  stale: { label: "Needs review", variant: "secondary" },
  failed: { label: "Needs review", variant: "secondary" },
  dismissed: { label: "Dismissed", variant: "secondary" },
};

const setupMessages: Partial<Record<SetupStatus, string>> = {
  preparing:
    "Your review is recorded. Setup is being saved. You can return to this chat later.",
  active: "Agent active. Its reviewed access and triggers are now in place.",
  saved:
    "Draft saved. No new triggers were started. Any earlier active revision is unchanged.",
  blocked:
    "Instructions saved, but setup is incomplete. No new triggers were started. Continue in the builder to fix or retry this setup.",
  stale:
    "This proposal is out of date. Ask chat for a fresh draft before approving changes.",
  failed: "Setup did not finish. Check its status before trying again.",
  dismissed: "Draft dismissed. Nothing was saved or activated.",
};

export function ReviewCardAgentSetup() {
  const [status, setStatus] = useState<SetupStatus>("pending");
  const [sponsor, setSponsor] = useState(false);
  const [replace, setReplace] = useState(false);
  const settled = !["pending", "preparing"].includes(status);
  const { result, submitted } = useFocusOnSettle(settled);
  const ready = sponsor && replace;
  const decide = (next: SetupStatus) => {
    submitted.current = true;
    setStatus(next);
  };
  const receipt =
    status === "active" || status === "saved" || status === "blocked";
  return (
    <Frame
      id="agent-setup"
      title="Agent setup"
      note="Activation waits for both consent boxes"
      controls={
        <Picker
          label="Setup status"
          value={status}
          onChange={setStatus}
          values={[
            ["pending", "Pending"],
            ["preparing", "Preparing"],
            ["active", "Active"],
            ["saved", "Saved draft"],
            ["blocked", "Setup incomplete"],
            ["stale", "Stale"],
            ["failed", "Failed"],
            ["dismissed", "Dismissed"],
          ]}
        />
      }
    >
      <div className="review-demo-chat">
        <ReviewCard
          label="Review agent draft"
          icon={<Users size={16} />}
          title="Supplier follow-up"
          badge={setupBadges[status]}
          settled={settled}
          actions={
            status === "pending" ? (
              <>
                <Button disabled={!ready} onClick={() => decide("active")}>
                  Save and activate
                </Button>
                <Button variant="outline" onClick={() => decide("saved")}>
                  Save draft
                </Button>
                <Button variant="ghost" onClick={() => decide("dismissed")}>
                  Not now
                </Button>
              </>
            ) : undefined
          }
          status={
            <div ref={result} tabIndex={-1} className="review-demo-result">
              {setupMessages[status] && (
                <p role="status">{setupMessages[status]}</p>
              )}
            </div>
          }
        >
          <p>
            Updates the existing agent. The earlier active setup remains until
            this replacement succeeds.
          </p>
          <ReviewRows>
            <ReviewRow label="Team">Operations</ReviewRow>
            <ReviewRow label="Schedule 1">
              Every Monday at 9:00 (Asia/Kolkata)
            </ReviewRow>
            <ReviewRow label="Schedule 2">
              Every day at 17:30 (Europe/London)
            </ReviewRow>
            <ReviewRow label="Slack channel 1">#supplier-updates</ReviewRow>
          </ReviewRows>
          {status === "pending" && (
            <fieldset className="review-demo-consent">
              <legend className="review-demo-sr-only">
                Activation consent
              </legend>
              <CheckboxField
                id="setup-schedule-1"
                label="I sponsor schedule 1: Every Monday at 9:00 (Asia/Kolkata)"
                helper="Runs use your current permissions and create private tasks."
                checked={sponsor}
                onCheckedChange={setSponsor}
              />
              <Alert variant="destructive">
                <AlertDescription>
                  Schedule 2 names another sponsor. Edit in the builder and
                  choose to sponsor it yourself before activating.
                </AlertDescription>
              </Alert>
              <CheckboxField
                id="setup-channel-1"
                label="Replace the existing agent in channel 1"
                helper="Existing threads keep their original agent. Check the channel identity in Setup details."
                checked={replace}
                onCheckedChange={setReplace}
              />
            </fieldset>
          )}
          {(status === "pending" || status === "preparing" || receipt) && (
            <div>
              <Button variant="outline" disabled={status === "preparing"}>
                {receipt ? "Continue setup" : "Edit in builder"}
              </Button>
            </div>
          )}
          <Note>
            Only this review action can save or activate the setup. Chat text is
            not approval.
          </Note>
          <div>
            <Button size="sm" variant="ghost">
              Check draft status
            </Button>
          </div>
        </ReviewCard>
      </div>
    </Frame>
  );
}

/* Workflow details ---------------------------------------------------------- */

type TriggerKind = "cron" | "webhook" | "row" | "record" | "manual";

const triggerRows: Record<
  TriggerKind,
  { trigger: string; extra: [string, string][]; next: string }
> = {
  cron: {
    trigger: "Schedule “0 9 * * 1” in Asia/Kolkata",
    extra: [],
    next: "Monday, 19 October 2026 at 9:00 GMT+5:30",
  },
  webhook: {
    trigger:
      "Webhook request. Run input is { body, headers } with the raw JSON body and copied headers. Create its key on the Workflows page.",
    extra: [
      [
        "Duplicate check",
        "Header “Idempotency-Key”. A repeat returns the first run, and a changed body is rejected.",
      ],
      ["Copied headers", "x-shop-id, x-event-type"],
    ],
    next: "No scheduled run",
  },
  row: {
    trigger:
      "When a row of “Supplier deliveries” is updated. Run input holds the row ID and its values before and after the change",
    extra: [
      ["Watched fields", "“Status”, “Delivery date”"],
      ["Only rows where", "“Status” is “Delayed”"],
    ],
    next: "Within about a minute of each matching change",
  },
  record: {
    trigger:
      "On each row’s “Renewal date”, once for each row of “Customer accounts”. Run input holds the row ID and values",
    extra: [
      ["Only rows where", "“Plan” is not “Free”. Rows with no Plan also run."],
    ],
    next: "Each row’s own date. Upcoming dates appear on the Workflows page once it is active.",
  },
  manual: { trigger: "Started manually", extra: [], next: "No scheduled run" },
};

const workflowSteps: ReviewStep[] = [
  {
    summary:
      "find late: find up to 50 rows in “Supplier deliveries” matching 2 conditions",
    detail: (
      <ReviewValues
        values={[
          { name: "“Status”", value: "is “Delayed”" },
          { name: "“Delivery date”", value: "before {{ trigger.date }}" },
        ]}
      />
    ),
  },
  {
    summary:
      "check count: check whether {{ steps.find_late.count }} is greater than 0",
    detail: (
      <ReviewValues
        values={[
          { name: "If it holds", value: "run draft reply, post summary" },
          { name: "Otherwise", value: "skip draft reply, post summary" },
        ]}
      />
    ),
  },
  {
    summary:
      "draft reply: ask Supplier follow-up to write a reminder for each late supplier",
    detail: <p>Limits: 40 tool calls, 120 seconds, 25 Credits.</p>,
  },
  {
    summary: "shape: set subject, owner",
    detail: (
      <ReviewValues
        values={[
          { name: "subject", value: "Delivery reminder: {{ row.supplier }}" },
          { name: "owner", value: "{{ trigger.requester }}" },
        ]}
      />
    ),
  },
  {
    summary: "notify api: send POST to https://hooks.example.com/suppliers",
    detail: (
      <ReviewValues
        values={[
          { name: "content-type", value: "application/json" },
          { name: "x-shop-id", value: "northwind-eu" },
          {
            name: "Body",
            value:
              '{\n  "supplier": "{{ row.supplier }}",\n  "status": "delayed"\n}',
          },
        ]}
      />
    ),
  },
  {
    summary: "score: run JavaScript code with {{ steps.find_late.rows }}",
    detail: (
      <CodeBlock
        code={
          "export default (rows) =>\n  rows.filter((row) => row.daysLate > 3).length;"
        }
        language="javascript"
        filename="score.js"
      />
    ),
  },
  {
    summary: "log result: add a row to “Follow-up log”, writing 2 fields",
    detail: (
      <ReviewValues
        values={[
          { name: "“Supplier”", value: "{{ row.supplier }}" },
          { name: "“Sent at”", value: "{{ now }}" },
        ]}
      />
    ),
  },
  {
    summary:
      "mark sent: update the row in {{ trigger.row }} in “Supplier deliveries”, writing 1 field",
    detail: (
      <ReviewValues
        values={[
          { name: "unavailable field (fld_93a1)", value: "Reminder sent" },
        ]}
      />
    ),
  },
  {
    summary:
      "approve: ask for a response. “Should we escalate suppliers more than two weeks late?”",
  },
  { summary: "pause: wait 3600 seconds" },
  {
    summary:
      "follow up: wait until the time in {{ trigger.row.delivery_date }}",
  },
  {
    summary: "post summary: send a Slack message",
    detail: (
      <>
        <section
          aria-label="Verified Slack destination"
          className="review-demo-stack"
        >
          <p className="review-demo-strong">
            #supplier-updates · Slack workspace T024BE7LD
          </p>
          <p className="review-demo-muted">Channel C061EG9SL</p>
          <p className="review-demo-fine">Destination ID: dst_6f2b91e0</p>
        </section>
        <ReviewValues
          values={[
            {
              name: "Message",
              value:
                "{{ steps.find_late.count }} suppliers are late this week.",
            },
            { name: "Posts as", value: "TulipFarm app" },
          ]}
        />
        <p>
          Saving this workflow does not approve a send. Each run asks its
          requester or sponsor to approve the exact message. Approval expires
          after 24 hours.
        </p>
      </>
    ),
  },
];

export function ReviewCardWorkflow() {
  const [trigger, setTrigger] = useState<TriggerKind>("row");
  const rows = triggerRows[trigger];
  return (
    <Frame
      id="workflow"
      title="Workflow details"
      note="Trigger rows, then every step kind"
      controls={
        <Picker
          label="Trigger"
          value={trigger}
          onChange={setTrigger}
          values={[
            ["cron", "Schedule"],
            ["webhook", "Webhook"],
            ["row", "Row change"],
            ["record", "Record date"],
            ["manual", "Manual"],
          ]}
        />
      }
    >
      <div className="review-demo-chat">
        <ReviewCard
          label="Review workflow draft"
          icon={<BranchDown size={16} />}
          title="Late supplier follow-up"
          badge={{ label: "Draft", variant: "secondary" }}
          actions={
            <>
              <Button>Save workflow</Button>
              <Button variant="ghost">Not now</Button>
            </>
          }
        >
          <ReviewRows>
            <ReviewRow label="Change">
              <span>Creates a new workflow. It stays inactive.</span>
            </ReviewRow>
            <ReviewRow label="Trigger">
              <span>{rows.trigger}</span>
            </ReviewRow>
            {rows.extra.map(([label, value]) => (
              <ReviewRow key={label} label={label}>
                <span>{value}</span>
              </ReviewRow>
            ))}
            <ReviewRow label="Next run">
              <span>{rows.next}</span>
            </ReviewRow>
          </ReviewRows>
          <ReviewSteps
            title={`${workflowSteps.length} steps`}
            steps={workflowSteps}
          />
        </ReviewCard>
      </div>
    </Frame>
  );
}

/* Table proposal (redacted) ------------------------------------------------- */

type ProposalStatus =
  | "pending"
  | "approved"
  | "running"
  | "rejected"
  | "cancelled"
  | "expired"
  | "partial"
  | "failed"
  | "completed";

const proposalLabels: Record<ProposalStatus, string> = {
  pending: "Awaiting your review",
  approved: "Approved, waiting to start",
  running: "Applying changes",
  rejected: "Rejected",
  cancelled: "Cancelled at a safe checkpoint",
  expired: "Expired",
  partial: "Partially completed",
  failed: "Execution failed",
  completed: "Completed",
};

const proposalVariant = (status: ProposalStatus): ReviewCardBadge["variant"] =>
  status === "completed"
    ? "success"
    : status === "pending"
      ? "info"
      : status === "failed" || status === "rejected"
        ? "destructive"
        : status === "approved"
          ? "secondary"
          : "warning";

export function ReviewCardTableProposal() {
  const [status, setStatus] = useState<ProposalStatus>("partial");
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    if (!refreshing) return;
    const timer = setTimeout(() => setRefreshing(false), 600);
    return () => clearTimeout(timer);
  }, [refreshing]);
  return (
    <Frame
      id="table-proposal"
      title="Expired table proposal"
      note="Bounded to 16rem and scrolls inside chat"
      controls={
        <Picker
          label="Proposal status"
          value={status}
          onChange={setStatus}
          values={Object.entries(proposalLabels) as [ProposalStatus, string][]}
        />
      }
    >
      <div className="review-demo-chat">
        <div
          className="review-demo-bounded"
          tabIndex={0}
          aria-label="Table change proposal"
        >
          <ReviewCard
            icon={<Database size={14} />}
            title="Table changes"
            badge={{
              label: proposalLabels[status],
              variant: proposalVariant(status),
            }}
            status={
              <>
                {refreshing && (
                  <p role="status" className="review-demo-muted">
                    Checking proposal status…
                  </p>
                )}
                <div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Check proposal status"
                    aria-label="Check proposal status"
                    aria-busy={refreshing}
                    disabled={refreshing}
                    onClick={() => setRefreshing(true)}
                  >
                    <Refresh size={16} aria-hidden="true" />
                  </Button>
                </div>
              </>
            }
          >
            <p role="status">
              History values expired. Proposal values were permanently removed
              on 2 October 2026, 18:42.
            </p>
            <p className="review-demo-muted">
              The original digest and execution outcomes remain available. Ask
              for a new proposal to make further changes.
            </p>
            <ul className="review-demo-plain-list">
              <li>
                Table 1: completed. 1,284 of 1,500 rows imported. 216 not yet
                imported.
              </li>
              <li>Table 2: Not completed</li>
            </ul>
            <p className="review-demo-digest">
              e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
            </p>
          </ReviewCard>
        </div>
      </div>
    </Frame>
  );
}

/* Generic composition ------------------------------------------------------- */

export function ReviewCardComposition() {
  const [decision, setDecision] = useState("No review action taken.");
  return (
    <Frame
      id="composition"
      title="Rows, steps, and values"
      note="The plain parts together, open and settled"
    >
      <div className="review-demo-chat review-demo-stack-lg">
        <ReviewCard
          icon={<FileText size={16} />}
          title="Review garden plan"
          badge={{ label: "Needs review", variant: "warning" }}
          actions={
            <>
              <Button
                onClick={() => setDecision("Garden plan accepted locally.")}
              >
                Accept
              </Button>
              <Button
                variant="outline"
                onClick={() => setDecision("Changes requested locally.")}
              >
                Request changes
              </Button>
            </>
          }
        >
          <ReviewRows>
            <ReviewRow label="Owner">Alex Meadow</ReviewRow>
            <ReviewRow label="Status">
              <Badge variant="info">Draft</Badge>
            </ReviewRow>
          </ReviewRows>
          <ReviewSteps
            title="Changes"
            steps={[
              {
                summary: "Create a planting list",
                detail: (
                  <ReviewValues
                    values={[
                      { name: "Plant", value: "Tulip" },
                      { name: "Quantity", value: "12" },
                    ]}
                  />
                ),
              },
              { summary: "Assign watering to Robin" },
            ]}
          />
        </ReviewCard>
        <p role="status" className="review-demo-muted">
          {decision}
        </p>
        <ReviewCard
          icon={<Check size={16} />}
          title="Reviewed garden plan"
          badge={{ label: "Accepted", variant: "success" }}
          settled
          status={<p>Accepted. No action was executed.</p>}
        >
          <p>Open to inspect the plan details.</p>
        </ReviewCard>
      </div>
    </Frame>
  );
}
