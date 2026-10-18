import { useId, useState, type ReactNode } from "react";
import { Button } from "@tulipfarm/sprout/button";
import { ChoiceGroup } from "@tulipfarm/sprout/field";
import { Label } from "@tulipfarm/sprout/label";
import { RadioGroup, RadioGroupItem } from "@tulipfarm/sprout/radio-group";
import "../styles/radio-group-demo.css";

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
    <section className="radio-group-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="radio-group-demo-card-body">{children}</div>
    </section>
  );
}

type StateName =
  | "unchecked"
  | "checked"
  | "disabled"
  | "disabled-checked"
  | "invalid"
  | "invalid-checked";

/* One size and one look. Each state uses a label Cloud shows in that state. */
const states: {
  name: StateName;
  title: string;
  label: string;
  checked?: boolean;
  disabled?: boolean;
  invalid?: boolean;
}[] = [
  { name: "unchecked", title: "Unchecked", label: "Weekly" },
  { name: "checked", title: "Checked", label: "Daily", checked: true },
  {
    name: "disabled",
    title: "Disabled",
    label: "Unavailable",
    disabled: true,
  },
  {
    name: "disabled-checked",
    title: "Disabled checked",
    label: "Current caller",
    checked: true,
    disabled: true,
  },
  {
    name: "invalid",
    title: "Invalid",
    label: "Personal",
    invalid: true,
  },
  {
    name: "invalid-checked",
    title: "Invalid checked",
    label: "Business",
    checked: true,
    invalid: true,
  },
];

function StatesExample() {
  return (
    <Example
      title="States"
      description="One 16px size with a 40 × 32px hit area. Checked fills with the primary color."
    >
      <div className="radio-group-demo-states">
        {states.map((state) => (
          <div
            key={state.name}
            data-testid={`sample-${state.name}`}
            className="radio-group-demo-panel"
          >
            <p className="radio-group-demo-caption">{state.title}</p>
            <RadioGroup
              aria-label={`${state.title} sample`}
              defaultValue={state.checked ? state.name : undefined}
              disabled={state.disabled}
            >
              <Label>
                <RadioGroupItem
                  value={state.name}
                  aria-invalid={state.invalid || undefined}
                />
                {state.label}
              </Label>
            </RadioGroup>
          </div>
        ))}
      </div>
    </Example>
  );
}

function LabelExample() {
  return (
    <Example
      title="Labeled radios"
      description="Each radio sits inside a Label. The group starts on Weekly and keeps its own state. Arrow keys skip the disabled radio."
    >
      <div className="radio-group-demo-panel">
        <RadioGroup defaultValue="weekly" aria-label="Digest frequency">
          <Label>
            <RadioGroupItem value="daily" />
            Daily
          </Label>
          <Label>
            <RadioGroupItem value="weekly" />
            Weekly
          </Label>
          <Label>
            <RadioGroupItem value="never" disabled />
            Unavailable
          </Label>
        </RadioGroup>
      </div>
    </Example>
  );
}

const replyRules = [
  {
    value: "tag",
    label: "When mentioned",
    description: "Replies to a mention, then follows that thread.",
  },
  {
    value: "every-message",
    label: "Every channel message",
    description:
      "Starts a reply for each new message. Applies to all attached channels.",
  },
] as const;

type ReplyRule = (typeof replyRules)[number]["value"];

function ControlledExample() {
  const id = useId();
  const [rule, setRule] = useState<ReplyRule>("tag");
  const [invalid, setInvalid] = useState(false);
  const legendId = `${id}-legend`;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  return (
    <Example
      title="Legend, helper, and descriptions"
      description="A controlled group named by a visible legend. The legend, helper, and error sit inside the group, and each radio is described by its own text."
    >
      <div className="radio-group-demo-panel">
        <RadioGroup<ReplyRule>
          id={`${id}-group`}
          data-slot="choice-group"
          className="radio-group-demo-legend-group"
          value={rule}
          onValueChange={(next) => {
            setRule(next);
            setInvalid(false);
          }}
          aria-required
          aria-invalid={invalid || undefined}
          aria-labelledby={legendId}
          aria-describedby={[helperId, invalid ? errorId : null]
            .filter(Boolean)
            .join(" ")}
        >
          <p id={legendId} className="radio-group-demo-legend">
            When should it reply?
          </p>
          <p id={helperId} className="radio-group-demo-helper">
            Slack starts this agent from its attached channels.
          </p>
          {replyRules.map((option) => (
            <div key={option.value} className="radio-group-demo-option">
              <Label>
                <RadioGroupItem
                  className="radio-group-demo-offset"
                  value={option.value}
                  aria-invalid={invalid || undefined}
                  aria-describedby={`${id}-${option.value}-description`}
                />
                {option.label}
              </Label>
              <p
                id={`${id}-${option.value}-description`}
                className="radio-group-demo-description"
              >
                {option.description}
              </p>
            </div>
          ))}
          {invalid && (
            <p id={errorId} className="radio-group-demo-error">
              Choose when this agent replies.
            </p>
          )}
        </RadioGroup>
        <p className="radio-group-demo-caption" data-testid="reply-rule-value">
          Value: {rule}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setInvalid((value) => !value)}
        >
          {invalid ? "Clear error" : "Show error"}
        </Button>
      </div>
    </Example>
  );
}

const frequency = [
  { value: "daily", label: "Daily", description: "Each morning" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly", disabled: true },
] as const;

type Frequency = (typeof frequency)[number]["value"];

function ChoiceGroupExample() {
  const [list, setList] = useState<Frequency>("weekly");
  const [workspace, setWorkspace] = useState<"personal" | "business">(
    "business",
  );
  const [cadence, setCadence] = useState<"cron" | "interval">("cron");
  const [sender, setSender] = useState<"user" | "app">("user");
  const [link, setLink] = useState("");
  return (
    <Example
      title="Choice rows"
      description="Field's ChoiceGroup draws RadioGroup as bordered rows. Lists stack; columns split into two from 640px."
    >
      <div className="radio-group-demo-grid">
        <div className="radio-group-demo-panel">
          <ChoiceGroup
            type="radio"
            required
            legend="List layout frequency"
            layout="list"
            value={list}
            onValueChange={setList}
            options={frequency}
          />
        </div>
        <div className="radio-group-demo-panel">
          <ChoiceGroup
            type="radio"
            required
            legend="Workspace type"
            layout="columns"
            value={workspace}
            onValueChange={setWorkspace}
            options={[
              { value: "personal", label: "Personal" },
              { value: "business", label: "Business" },
            ]}
          />
          <ChoiceGroup
            type="radio"
            required
            legend="Repeat"
            layout="columns"
            value={cadence}
            onValueChange={setCadence}
            options={[
              { value: "cron", label: "Days and time" },
              { value: "interval", label: "Time interval" },
            ]}
          />
        </div>
        <div className="radio-group-demo-panel" data-testid="locked-group">
          <ChoiceGroup
            type="radio"
            optional
            disabled
            legend="Outgoing Slack identity"
            helper="Only workspace admins can change this."
            value={sender}
            onValueChange={setSender}
            options={[
              {
                value: "user",
                label: "Current caller",
                description: "Use the caller’s authorized Slack integration.",
              },
              {
                value: "app",
                label: "Workspace app",
                description: "Requires an authorized workspace Slack app.",
              },
            ]}
          />
        </div>
        <div className="radio-group-demo-panel" data-testid="error-group">
          <ChoiceGroup
            type="radio"
            required
            legend="Choose a published package link"
            error={link ? undefined : "Choose a package link to import."}
            value={link}
            onValueChange={setLink}
            options={[
              {
                value:
                  "https://github.com/tulipfarm/skills/tree/main/packages/people-ops-weekly-update",
                label:
                  "https://github.com/tulipfarm/skills/tree/main/packages/people-ops-weekly-update",
              },
              {
                value: "https://skills.tulipfarm.example/p/support-triage",
                label: "https://skills.tulipfarm.example/p/support-triage",
              },
            ]}
          />
        </div>
      </div>
    </Example>
  );
}

export default function RadioGroupDemo() {
  return (
    <div id="radio-group-demo" className="radio-group-demo">
      <StatesExample />
      <LabelExample />
      <ControlledExample />
      <ChoiceGroupExample />
    </div>
  );
}
