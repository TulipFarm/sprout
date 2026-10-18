import { useEffect, useRef, useState, type ReactNode } from "react";
import { Refresh } from "reicon-react/icons/Refresh";
import { Alert, AlertDescription } from "@tulipfarm/sprout/alert";
import { Button } from "@tulipfarm/sprout/button";
import {
  ChatConfirmation,
  type ChatConfirmationDecision,
  type ChatConfirmationDetail,
  type ConfirmationState,
} from "@tulipfarm/sprout/chat-confirmation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@tulipfarm/sprout/collapsible";
import DocsSelect from "./DocsSelect";
import "../styles/chat-confirmation-demo.css";

/* Shared frame -------------------------------------------------------------- */

function Frame({
  id,
  title,
  note,
  controls,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="confirm-demo-frame" aria-label={title} data-recipe={id}>
      <div className="confirm-demo-bar">
        <div className="confirm-demo-bar-text">
          <span className="confirm-demo-bar-title">{title}</span>
          {note && <span className="confirm-demo-note">{note}</span>}
        </div>
        {controls && <div className="confirm-demo-controls">{controls}</div>}
      </div>
      <div className="confirm-demo-stage">{children}</div>
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
    <span className="confirm-demo-picker">
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

/* Sample data: table schema approvals, as Cloud's chat sends them ----------- */

type Effect = "drop-field" | "convert" | "delete-rows" | "unavailable";

const effects = [
  ["drop-field", "Remove a field"],
  ["convert", "Convert a field"],
  ["delete-rows", "Remove rows"],
  ["unavailable", "Effect unknown"],
] as const;

const approvals: Record<
  Effect,
  { title: string; details: ChatConfirmationDetail[] }
> = {
  "drop-field": {
    title: "Remove the Notes field from Supplier deliveries",
    details: [
      { label: "Action", value: "Change table schema" },
      { label: "Table", value: "tbl_7d1c4e2a9b" },
      { label: "Proposal", value: "mig_3f8a21c6d0" },
      {
        label: "Plan digest",
        value:
          "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      },
      { label: "Applied revision", value: "42" },
      { label: "Effect", value: "Remove field values" },
      { label: "Affected rows", value: "128" },
      { label: "Field", value: "fld_notes_91ce" },
    ],
  },
  convert: {
    title: "Change Delivery date from text to a date field",
    details: [
      { label: "Action", value: "Change table schema" },
      { label: "Table", value: "tbl_7d1c4e2a9b" },
      { label: "Proposal", value: "mig_8b14e07a52" },
      {
        label: "Plan digest",
        value:
          "sha256:2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
      },
      { label: "Applied revision", value: "43" },
      { label: "Effect", value: "Convert field values" },
      { label: "Affected rows", value: "1204" },
      { label: "Field", value: "fld_delivery_date_4a" },
    ],
  },
  "delete-rows": {
    title: "Remove cancelled orders from Purchase orders",
    details: [
      { label: "Action", value: "Change table schema" },
      { label: "Table", value: "tbl_purchase_orders" },
      { label: "Proposal", value: "mig_c9d2f6e113" },
      {
        label: "Plan digest",
        value:
          "sha256:fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9",
      },
      { label: "Applied revision", value: "No applied revision" },
      { label: "Effect", value: "Remove table rows" },
      { label: "Affected rows", value: "37" },
    ],
  },
  unavailable: {
    title: "Rename the Status field in Support tickets",
    details: [
      { label: "Action", value: "Change table schema" },
      { label: "Table", value: "tbl_support_tickets" },
      { label: "Proposal", value: "mig_5e0b7d4a88" },
      {
        label: "Plan digest",
        value:
          "sha256:ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
      },
      { label: "Applied revision", value: "7" },
      {
        label: "Effect",
        value:
          "Effect details unavailable. Do not approve an action you cannot verify.",
      },
    ],
  },
};

const reviewChanges = "Review these changes before approving.";

const reminder: {
  title: string;
  description: string;
  details: ChatConfirmationDetail[];
} = {
  title: "Send a fictional reminder",
  description: "Ask for permission before the sample action.",
  details: [
    { label: "Recipient", value: "alex@example.com" },
    { label: "Message", value: "Please water the garden." },
  ],
};

type StateChoice = ConfirmationState["kind"] | "submitting-reject";

const stateChoices = [
  ["pending", "Pending"],
  ["submitting", "Submitting approval"],
  ["submitting-reject", "Submitting decline"],
  ["approved", "Approved"],
  ["rejected", "Declined"],
  ["expired", "Expired"],
  ["cancelled", "Cancelled"],
  ["error", "Error"],
] as const satisfies readonly (readonly [StateChoice, string])[];

function toState(choice: StateChoice, message: string): ConfirmationState {
  if (choice === "error") return { kind: "error", message };
  if (choice === "submitting")
    return { kind: "submitting", decision: "approve" };
  if (choice === "submitting-reject")
    return { kind: "submitting", decision: "reject" };
  return { kind: choice };
}

function useDecision(initial: ConfirmationState, delay = 600) {
  const [state, setState] = useState<ConfirmationState>(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const decide = (decision: ChatConfirmationDecision) => {
    clearTimeout(timer.current);
    setState({ kind: "submitting", decision });
    timer.current = setTimeout(
      () =>
        setState({ kind: decision === "approve" ? "approved" : "rejected" }),
      delay,
    );
  };
  const set = (next: ConfirmationState) => {
    clearTimeout(timer.current);
    setState(next);
  };
  return { state, decide, set };
}

/* Playground ---------------------------------------------------------------- */

export function ChatConfirmationPlayground() {
  const [effect, setEffect] = useState<Effect>("drop-field");
  const [locked, setLocked] = useState<"no" | "yes">("no");
  const { state, decide, set } = useDecision({ kind: "pending" });
  const choice: StateChoice =
    state.kind === "submitting" && state.decision === "reject"
      ? "submitting-reject"
      : state.kind;
  const approval = approvals[effect];
  return (
    <section
      className="confirm-demo-frame"
      aria-label="Chat confirmation playground"
    >
      <div className="confirm-demo-toolbar">
        <Picker
          label="Change"
          value={effect}
          values={effects}
          onChange={setEffect}
        />
        <Picker
          label="State"
          value={choice}
          values={stateChoices}
          onChange={(next) =>
            set(
              toState(next, "Your decision could not be recorded. Try again."),
            )
          }
        />
        <Picker
          label="Locked"
          value={locked}
          values={[
            ["no", "No"],
            ["yes", "Yes"],
          ]}
          onChange={setLocked}
        />
      </div>
      <div className="confirm-demo-stage">
        <div className="confirm-demo-chat">
          <ChatConfirmation
            title={approval.title}
            description={reviewChanges}
            details={approval.details}
            state={state}
            disabled={locked === "yes" || effect === "unavailable"}
            onDecision={decide}
          />
        </div>
      </div>
    </section>
  );
}

/* Every state, each with its own request ------------------------------------ */

const stateSamples: {
  state: ConfirmationState;
  title: string;
  description: string;
  details: ChatConfirmationDetail[];
}[] = [
  {
    state: { kind: "pending" },
    title: approvals["drop-field"].title,
    description: reviewChanges,
    details: approvals["drop-field"].details
      .slice(0, 2)
      .concat(approvals["drop-field"].details.slice(5)),
  },
  {
    state: { kind: "submitting", decision: "approve" },
    title: approvals.convert.title,
    description: reviewChanges,
    details: [
      approvals.convert.details[0]!,
      ...approvals.convert.details.slice(5),
    ],
  },
  {
    state: { kind: "submitting", decision: "reject" },
    title: approvals["delete-rows"].title,
    description: reviewChanges,
    details: [
      approvals["delete-rows"].details[0]!,
      ...approvals["delete-rows"].details.slice(5),
    ],
  },
  {
    state: {
      kind: "error",
      message: "This fictional approval could not be saved. Try again.",
    },
    title: reminder.title,
    description: reminder.description,
    details: reminder.details,
  },
  {
    state: { kind: "approved" },
    title: "Add a Priority field to Support tickets",
    description: reviewChanges,
    details: [
      { label: "Action", value: "Change table schema" },
      { label: "Effect", value: "Convert field values" },
      { label: "Affected rows", value: "512" },
    ],
  },
  {
    state: { kind: "rejected" },
    title: "Remove archived rows from Supplier deliveries",
    description: reviewChanges,
    details: [
      { label: "Action", value: "Change table schema" },
      { label: "Effect", value: "Remove table rows" },
      { label: "Affected rows", value: "86" },
    ],
  },
  {
    state: { kind: "expired" },
    title: "Remove the Fax field from Vendors",
    description: reviewChanges,
    details: [
      { label: "Action", value: "Change table schema" },
      { label: "Effect", value: "Remove field values" },
      { label: "Affected rows", value: "19" },
    ],
  },
  {
    state: { kind: "cancelled" },
    title: "Send a reminder to the garden crew",
    description: "Ask for permission before the sample action.",
    details: [
      { label: "Recipient", value: "crew@example.com" },
      { label: "Message", value: "Harvest starts Friday at 7am." },
    ],
  },
];

export function ChatConfirmationStates() {
  return (
    <Frame
      id="states"
      title="Every state"
      note="Pending, submitting, error, and the four settled outcomes"
    >
      <div className="confirm-demo-chat confirm-demo-list">
        {stateSamples.map((sample) => (
          <ChatConfirmation
            key={sample.title}
            title={sample.title}
            description={sample.description}
            details={sample.details}
            state={sample.state}
            onDecision={() => undefined}
          />
        ))}
      </div>
    </Frame>
  );
}

/* Table approval in chat: the card plus its request status ------------------ */

type RequestStatus = "ready" | "refresh-error";

export function ChatConfirmationTableApproval() {
  const [effect, setEffect] = useState<Effect>("drop-field");
  const [request, setRequest] = useState<RequestStatus>("ready");
  const [checking, setChecking] = useState(false);
  const { state, decide, set } = useDecision({ kind: "pending" }, 700);
  const approval = approvals[effect];
  const pending =
    state.kind === "pending" ||
    state.kind === "submitting" ||
    state.kind === "error";
  const refreshFailed = request === "refresh-error";
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const checkStatus = () => {
    setChecking(true);
    timer.current = setTimeout(() => {
      setChecking(false);
      setRequest("ready");
    }, 500);
  };
  const check = (
    <Button
      size="sm"
      variant="ghost"
      aria-label="Check request status"
      aria-busy={checking}
      disabled={checking || state.kind === "submitting"}
      onClick={checkStatus}
    >
      <Refresh size={14} aria-hidden="true" />
      Check status
    </Button>
  );
  return (
    <Frame
      id="table-approval"
      title="Table approval in chat"
      note="Approve and decline change local state only"
      controls={
        <>
          <Picker
            label="Effect"
            value={effect}
            values={effects}
            onChange={(next) => {
              setEffect(next);
              set({ kind: "pending" });
            }}
          />
          <Picker
            label="Request"
            value={request}
            values={[
              ["ready", "Up to date"],
              ["refresh-error", "Refresh failed"],
            ]}
            onChange={setRequest}
          />
        </>
      }
    >
      <div
        role="group"
        aria-label="Table approval"
        className="confirm-demo-chat confirm-demo-stack"
      >
        <ChatConfirmation
          title={approval.title}
          description={reviewChanges}
          details={approval.details}
          state={state}
          disabled={refreshFailed || checking || effect === "unavailable"}
          onDecision={decide}
        />
        {refreshFailed && (
          <Alert variant="destructive">
            <AlertDescription>
              Could not refresh this request. Your input is retained. Check its
              status before submitting.
            </AlertDescription>
          </Alert>
        )}
        <div data-slot="request-status" className="confirm-demo-status">
          {pending && (
            <div className="confirm-demo-details">
              <Collapsible>
                <CollapsibleTrigger
                  render={<Button variant="ghost" size="xs" />}
                >
                  Details
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="confirm-demo-fine">
                    Request revision 3. Expires 18 Oct 2026, 15:30.
                  </p>
                  <p className="confirm-demo-fine">
                    Only this card records your approval. Your current
                    permission is checked when you decide.
                  </p>
                  {!refreshFailed && check}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
          {refreshFailed && pending && (
            <span role="status" className="confirm-demo-flex">
              Request status needs a check
            </span>
          )}
          {(refreshFailed || !pending) && check}
        </div>
      </div>
    </Frame>
  );
}

/* Internal playground: a fictional reminder --------------------------------- */

export function ChatConfirmationReminder() {
  const [choice, setChoice] = useState<StateChoice>("pending");
  const state = toState(
    choice,
    "This fictional approval could not be saved. Try again.",
  );
  return (
    <Frame
      id="reminder"
      title="Approval states"
      note="Decisions settle at once, with no submitting step"
      controls={
        <Picker
          label="Reminder state"
          value={choice}
          values={stateChoices}
          onChange={setChoice}
        />
      }
    >
      <div className="confirm-demo-chat">
        <ChatConfirmation
          title={reminder.title}
          description={reminder.description}
          details={reminder.details}
          state={state}
          onDecision={(decision) =>
            setChoice(decision === "approve" ? "approved" : "rejected")
          }
        />
      </div>
    </Frame>
  );
}
