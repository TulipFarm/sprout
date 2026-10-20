import { useId, useState, type ComponentProps, type FormEvent, type ReactNode } from 'react';
import { Key } from 'reicon-react/icons/Key';
import { Button } from '@tulipfarm/sprout/button';
import {
  CheckboxField,
  ChoiceGroup,
  Field,
  FieldSeparator,
  FieldsDisabled,
  useFieldControl,
  type FieldControlProps,
} from '@tulipfarm/sprout/field';
import { Input } from '@tulipfarm/sprout/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tulipfarm/sprout/select';
import '../styles/field-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="field-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="field-demo-card-body">{children}</div>
    </section>
  );
}

/** Sample Textarea: Sprout has no Textarea yet, so the docs wire one with useFieldControl. */
function DemoTextarea({ className, ...rest }: ComponentProps<'textarea'>) {
  const props = useFieldControl(rest);
  return (
    <textarea
      data-slot="textarea"
      {...props}
      className={['field-demo-textarea', className].filter(Boolean).join(' ')}
    />
  );
}

interface Option {
  value: string;
  label: string;
}

function DemoSelect({
  items,
  value,
  onValueChange,
  placeholder,
  width = 'full',
  triggerId,
}: {
  items: readonly Option[];
  value: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  width?: 'fit' | 'full';
  triggerId?: string;
}) {
  const all = placeholder ? [{ value: null, label: placeholder }, ...items] : items;
  return (
    <Select items={all} value={value} onValueChange={next => next !== null && onValueChange(next)}>
      <SelectTrigger id={triggerId} width={width}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map(item => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const count = (value: string, max: number) =>
  `${value.length.toLocaleString('en-US')} / ${max.toLocaleString('en-US')}`;

// Moves focus to the first invalid control after a failed submit.
function focusFirstInvalid(form: HTMLFormElement) {
  requestAnimationFrame(() => {
    const target = form.querySelector<HTMLElement>(
      '[aria-invalid="true"]:not([role="radiogroup"]), [role="radiogroup"][aria-invalid="true"] [role="radio"]',
    );
    target?.focus();
  });
}

const models = [
  { value: 'default', label: 'Workspace default' },
  { value: 'sonnet', label: 'Claude Sonnet' },
  { value: 'gpt', label: 'GPT-5' },
];

function AgentDetails() {
  const id = useId();
  const [name, setName] = useState('');
  const [model, setModel] = useState('default');
  const [instructions, setInstructions] = useState(
    'Summarize new support tickets every morning and flag anything urgent.',
  );
  const [maxSteps, setMaxSteps] = useState('12');
  const [submitted, setSubmitted] = useState(false);
  const errors = {
    name: name.trim() ? undefined : 'Enter a name for this agent.',
    maxSteps: Number(maxSteps) >= 1 && Number(maxSteps) <= 50 ? undefined : 'Use a number from 1 to 50.',
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (errors.name || errors.maxSteps) focusFirstInvalid(event.currentTarget);
  };
  return (
    <Example
      title="Agent details"
      description="Required and optional markers, a helper, a counter, a Select, and errors that appear after submit and move focus to the first problem."
    >
      <form className="field-demo-form" aria-label="Agent details" noValidate onSubmit={submit}>
        <Field id={`${id}-name`} label="Name" required error={submitted ? errors.name : undefined}>
          <Input value={name} placeholder="Support triage" onChange={event => setName(event.target.value)} />
        </Field>
        <Field id={`${id}-model`} label="Model" optional helper="Agents use the workspace default unless you pick one.">
          <DemoSelect items={models} value={model} onValueChange={setModel} />
        </Field>
        <Field
          id={`${id}-instructions`}
          label="Instructions"
          required
          counter={count(instructions, 8000)}
          helper="Tell the agent what to do and when to ask for help."
        >
          <DemoTextarea
            rows={4}
            maxLength={8000}
            value={instructions}
            onChange={event => setInstructions(event.target.value)}
          />
        </Field>
        <Field
          id={`${id}-steps`}
          label="Max tool calls per run"
          required
          error={submitted ? errors.maxSteps : undefined}
          helper="Stops a run that loops."
        >
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            value={maxSteps}
            onChange={event => setMaxSteps(event.target.value)}
          />
        </Field>
        <div className="field-demo-actions">
          <Button type="submit">Save agent</Button>
        </div>
      </form>
    </Example>
  );
}

const replyModes = [
  {
    value: 'thread',
    label: 'Reply in thread',
    description: 'Keeps the channel tidy. Best for busy channels.',
  },
  {
    value: 'channel',
    label: 'Reply in channel',
    description: 'Everyone in #support-escalations sees every reply.',
  },
  {
    value: 'dm',
    label: 'Direct message',
    description: 'Only the person who asked sees the reply.',
    disabled: true,
  },
] as const;

const repeats = [
  { value: 'daily', label: 'Every day', description: 'Runs at 9:00 AM' },
  { value: 'weekdays', label: 'Weekdays', description: 'Monday to Friday' },
  { value: 'weekly', label: 'Every week', description: 'On the same weekday' },
  { value: 'monthly', label: 'Every month', description: 'On the same date' },
] as const;

const tools = [
  {
    value: 'search',
    label: 'Search tickets',
    description: 'Read ticket titles, bodies, and tags.',
  },
  {
    value: 'update',
    label: 'Update tickets',
    description: 'Change status, priority, and assignee.',
  },
  {
    value: 'delete',
    label: 'Delete tickets',
    description: 'Only admins can grant this tool.',
    disabled: true,
  },
  {
    value: 'email',
    label: 'Send email replies',
    description: 'Sends from support@meadow.dev.',
  },
] as const;

const skills = [
  {
    value: 'triage',
    label: 'Ticket triage',
    description: 'skills/triage/SKILL.md',
  },
  {
    value: 'release-notes',
    label: 'Release notes writer with a long name that wraps on phones',
    description: 'skills/release-notes/SKILL.md',
  },
  {
    value: 'standup',
    label: 'Daily standup',
    description: 'skills/standup/SKILL.md',
  },
] as const;

const days = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
] as const;

function ChoiceGroups() {
  const id = useId();
  const [reply, setReply] = useState<string>('thread');
  const [repeat, setRepeat] = useState<string>('weekdays');
  const [enabled, setEnabled] = useState<string[]>(['search', 'update']);
  const [picked, setPicked] = useState<string[]>([]);
  const [runDays, setRunDays] = useState<string[]>(['mon', 'wed', 'fri']);
  const writes = enabled.includes('update') || enabled.includes('email');
  return (
    <Example
      title="Choice groups"
      description="Radios pick one value and checkboxes pick many, in a list or two columns from 640px. Options can carry descriptions and be disabled one at a time."
    >
      <div className="field-demo-grid">
        <ChoiceGroup
          id={`${id}-reply`}
          type="radio"
          legend="Reply mode"
          required
          options={replyModes}
          value={reply}
          onValueChange={setReply}
        />
        <ChoiceGroup
          type="radio"
          legend="Repeat"
          required
          layout="columns"
          options={repeats}
          value={repeat}
          onValueChange={setRepeat}
        />
        <ChoiceGroup
          type="checkbox"
          legend="Tools"
          optional
          layout="columns"
          warning={writes ? 'Changes data' : undefined}
          helper="The agent can only use the tools you turn on."
          error={enabled.length === 0 ? 'Turn on at least one tool.' : undefined}
          options={tools}
          value={enabled}
          onValueChange={setEnabled}
        />
        <ChoiceGroup
          type="checkbox"
          legend="Skills to import"
          required
          helper="Found 3 skills in tulipfarm/agent-skills."
          error={picked.length === 0 ? 'Pick at least one skill.' : undefined}
          options={skills}
          value={picked}
          onValueChange={setPicked}
        />
        <ChoiceGroup
          type="checkbox"
          legend="Run on"
          optional
          layout="columns"
          options={days}
          value={runDays}
          onValueChange={setRunDays}
        />
      </div>
    </Example>
  );
}

const calendars = [
  { id: 'team', label: 'Team calendar', checked: true },
  { id: 'launches', label: 'Product launches', checked: true },
  { id: 'holidays', label: 'Public holidays', checked: false },
];

function CheckboxFields() {
  const id = useId();
  const [filters, setFilters] = useState(Object.fromEntries(calendars.map(item => [item.id, item.checked])));
  const [allDay, setAllDay] = useState(false);
  const [notify, setNotify] = useState(true);
  const [consent, setConsent] = useState(false);
  return (
    <Example
      title="Checkbox fields"
      description="One checkbox with its label and a helper or error line. The neutral variant fills with the text color for filter lists."
    >
      <div className="field-demo-split">
        <div className="field-demo-stack" data-testid="checkbox-defaults">
          <CheckboxField label="All day" checked={allDay} onCheckedChange={setAllDay} />
          <CheckboxField
            id={`${id}-notify`}
            label="Notify me when it runs"
            helper="Sends a Slack message to you after each run."
            checked={notify}
            onCheckedChange={setNotify}
          />
          <CheckboxField
            id={`${id}-consent`}
            label="I authorize TulipFarm to call this provider with my workspace credentials and store the refresh token."
            error={consent ? undefined : 'Accept to connect the provider.'}
            checked={consent}
            onCheckedChange={setConsent}
          />
          <CheckboxField
            label="Share with the whole workspace"
            helper="Only admins can change sharing."
            disabled
            checked={false}
            onCheckedChange={() => {}}
          />
        </div>
        <div className="field-demo-stack" role="group" aria-label="Calendars" data-testid="checkbox-neutral">
          <p className="field-demo-eyebrow">Calendars</p>
          {calendars.map(item => (
            <CheckboxField
              key={item.id}
              variant="neutral"
              label={item.label}
              checked={filters[item.id] === true}
              onCheckedChange={next => setFilters(current => ({ ...current, [item.id]: next }))}
            />
          ))}
          <CheckboxField variant="neutral" label="Archived calendar" disabled checked onCheckedChange={() => {}} />
        </div>
      </div>
    </Example>
  );
}

function SignIn() {
  const id = useId();
  const [email, setEmail] = useState('sam@meadow');
  const [password, setPassword] = useState('');
  return (
    <Example
      title="Sign in"
      description='Large inputs for auth and onboarding, with a "or" separator before the other sign-in option.'
    >
      <form
        className="field-demo-form field-demo-narrow"
        aria-label="Sign in"
        noValidate
        onSubmit={event => event.preventDefault()}
      >
        <Field
          id={`${id}-email`}
          label="Work email"
          required
          error={email.includes('.') ? undefined : 'Enter a full email address.'}
        >
          <Input
            scale="lg"
            type="email"
            autoComplete="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
        </Field>
        <Field id={`${id}-password`} label="Password" required>
          <Input
            scale="lg"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
        </Field>
        <Button type="submit" size="lg">
          Continue
        </Button>
        <FieldSeparator>or</FieldSeparator>
        <Button type="button" variant="outline" size="lg">
          Continue with Google
        </Button>
      </form>
    </Example>
  );
}

const providers = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
];

function Locked() {
  const id = useId();
  const [saving, setSaving] = useState(true);
  const [provider, setProvider] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<string>('private');
  const [pin, setPin] = useState(true);
  return (
    <Example
      title="Disabled and locked"
      description="FieldsDisabled locks every field below it while a form saves. A single Field can also be disabled with a reason in its helper."
    >
      <div className="field-demo-toolbar">
        <Button type="button" variant="outline" aria-pressed={saving} onClick={() => setSaving(value => !value)}>
          {saving ? 'Stop saving' : 'Simulate saving'}
        </Button>
      </div>
      <FieldsDisabled value={saving}>
        <form
          className="field-demo-form"
          aria-label="Workspace model"
          aria-busy={saving}
          noValidate
          onSubmit={event => event.preventDefault()}
        >
          <Field id={`${id}-provider`} label="Provider" required>
            <DemoSelect
              items={providers}
              value={provider}
              placeholder="Choose a provider"
              onValueChange={setProvider}
            />
          </Field>
          <Field
            id={`${id}-model`}
            label="Model"
            optional
            disabled={provider === null}
            helper={provider === null ? 'Pick a provider first.' : 'Leave empty to use the provider default.'}
          >
            <Input placeholder="claude-sonnet-4" />
          </Field>
          <Field id={`${id}-notes`} label="Notes" optional>
            <DemoTextarea rows={2} defaultValue="Used by the support agents." />
          </Field>
          <ChoiceGroup
            type="radio"
            legend="Visibility"
            required
            layout="columns"
            options={[
              { value: 'private', label: 'Only me' },
              { value: 'workspace', label: 'Whole workspace' },
            ]}
            value={visibility}
            onValueChange={setVisibility}
          />
          <CheckboxField label="Pin to the model list" checked={pin} onCheckedChange={setPin} />
        </form>
      </FieldsDisabled>
    </Example>
  );
}

const repositories = [
  { value: 'sprout', label: 'tulipfarm/sprout' },
  { value: 'cloud', label: 'tulipfarm/cloud' },
  { value: 'docs', label: 'tulipfarm/docs' },
];

const owners = [
  { value: 'tulipfarm', label: 'tulipfarm' },
  { value: 'sam', label: 'sam-rivera' },
];

function HiddenLabels() {
  const id = useId();
  const [emails, setEmails] = useState(['ada@meadow.dev', 'grace@meadow']);
  const [owner, setOwner] = useState('tulipfarm');
  const [repos, setRepos] = useState<string[]>(['sprout']);
  return (
    <Example
      title="Screen reader labels"
      description="When a nearby heading already names the rows, labels and legends can be read by screen readers only. The required or optional marker stays in the description."
    >
      <div className="field-demo-split">
        <div className="field-demo-stack">
          <p className="field-demo-eyebrow" id={`${id}-invite`}>
            Invite by email
          </p>
          {emails.map((email, index) => (
            <Field
              key={index}
              id={`${id}-email-${index}`}
              label={`Email ${index + 1}`}
              labelVisibility="screen-reader"
              required
              error={email.includes('.') ? undefined : `Email ${index + 1} needs a full domain.`}
            >
              <Input
                type="email"
                value={email}
                onChange={event =>
                  setEmails(current => current.map((item, at) => (at === index ? event.target.value : item)))
                }
              />
            </Field>
          ))}
        </div>
        <div className="field-demo-stack">
          <p className="field-demo-eyebrow">GitHub knowledge</p>
          <Field id={`${id}-owner`} label="Repository owner" labelVisibility="screen-reader" required>
            <DemoSelect items={owners} value={owner} width="fit" onValueChange={setOwner} />
          </Field>
          <ChoiceGroup
            type="checkbox"
            legend="Repositories"
            legendVisibility="screen-reader"
            required
            options={repositories}
            value={repos}
            onValueChange={setRepos}
          />
        </div>
      </div>
    </Example>
  );
}

function CredentialControl({
  value,
  onChoose,
  ...rest
}: FieldControlProps & {
  value: string | null;
  onChoose: () => void;
}) {
  // A button cannot carry aria-required; the visible marker still says Required.
  const { 'aria-required': _required, ...props } = useFieldControl(rest);
  return (
    <Button type="button" variant="outline" className="field-demo-credential" {...props} onClick={onChoose}>
      <Key aria-hidden="true" />
      <span>{value ?? 'Choose a credential'}</span>
    </Button>
  );
}

const operators = [
  { value: 'equals', label: 'equals' },
  { value: 'contains', label: 'contains' },
  { value: 'greater', label: 'is greater than' },
];

function CustomControls() {
  const id = useId();
  const [query, setQuery] = useState('status = "open" AND priority >= 2 ORDER BY updated_at DESC');
  const [credential, setCredential] = useState<string | null>(null);
  const [operator, setOperator] = useState('equals');
  const [date, setDate] = useState('2025-05-12');
  return (
    <Example
      title="Custom and wrapped controls"
      description="Any control that calls useFieldControl joins the field, even inside a wrapper. Fields without an id generate one."
    >
      <div className="field-demo-grid">
        <Field
          id={`${id}-query`}
          label="Filter"
          optional
          counter={count(query, 2000)}
          helper="Use AND and OR. Strings need double quotes."
          error={query.length > 2000 ? 'Shorten the filter.' : undefined}
        >
          <div className="field-demo-mono">
            <DemoTextarea rows={2} value={query} onChange={event => setQuery(event.target.value)} />
          </div>
        </Field>
        <Field
          id={`${id}-credential`}
          label="Credential"
          required
          helper="Sent as a bearer token on every request."
          error={credential ? undefined : 'Choose a credential to continue.'}
        >
          <CredentialControl
            value={credential}
            onChoose={() => setCredential(value => (value ? null : 'Zendesk API key'))}
          />
        </Field>
        <Field id={`${id}-operator`} label="Condition" required>
          <DemoSelect triggerId={`${id}-operator`} items={operators} value={operator} onValueChange={setOperator} />
        </Field>
        <Field label="Starts on" required>
          <Input
            type="date"
            value={date}
            min="2025-01-01"
            max="2025-12-31"
            onChange={event => setDate(event.target.value)}
          />
        </Field>
        <Field label="Run at" optional helper="In your time zone, UTC+2.">
          <Input type="time" defaultValue="09:00" />
        </Field>
        <Field label="Run once on" optional>
          <Input type="datetime-local" defaultValue="2025-05-12T09:30" />
        </Field>
        <Field label="Attachment" optional>
          <Input type="file" />
        </Field>
        <Field
          label="What Bud remembers"
          optional
          counter="182 / 2,000"
          helper="Read only. Ask Bud to forget something to change it."
        >
          <DemoTextarea
            rows={3}
            readOnly
            value="Prefers short replies. Works in Berlin. Owns the billing and onboarding workflows."
          />
        </Field>
      </div>
      <div className="field-demo-separators">
        <FieldSeparator>Preferences</FieldSeparator>
        <FieldSeparator />
      </div>
    </Example>
  );
}

export default function FieldDemo() {
  return (
    <div id="field-demo" className="field-demo">
      <AgentDetails />
      <ChoiceGroups />
      <CheckboxFields />
      <SignIn />
      <Locked />
      <HiddenLabels />
      <CustomControls />
    </div>
  );
}
