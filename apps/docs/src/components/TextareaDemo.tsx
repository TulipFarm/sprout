import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Plus } from 'reicon-react/icons/Plus';
import { Send } from 'reicon-react/icons/Send';
import { Button } from '@tulipfarm/sprout/button';
import { Checkbox } from '@tulipfarm/sprout/checkbox';
import { Field } from '@tulipfarm/sprout/field';
import { Kbd, KbdGroup } from '@tulipfarm/sprout/kbd';
import { Label } from '@tulipfarm/sprout/label';
import { Textarea, type TextareaVariant } from '@tulipfarm/sprout/textarea';
import '../styles/textarea-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="textarea-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="textarea-demo-card-body">{children}</div>
    </section>
  );
}

const count = (value: string, limit: number) =>
  `${value.length.toLocaleString('en-US')} / ${limit.toLocaleString('en-US')}`;

const variants: Record<TextareaVariant, { label: string; note: string }> = {
  default: { label: 'Default', note: 'Own border and ring · forms' },
  embedded: { label: 'Embedded', note: 'Group draws the frame · composers' },
};

function DefaultSample() {
  const [instructions, setInstructions] = useState(
    'Help teammates find People Ops policies. Cite the handbook, and ask when context is missing.',
  );
  return (
    <Field
      label="Instructions"
      required
      counter={count(instructions, 32000)}
      helper="Describe its role, tone, responsibilities, and when it should ask a person."
    >
      <Textarea
        rows={9}
        maxLength={32000}
        value={instructions}
        placeholder="Help teammates find People Ops policies. Cite the handbook, ask when context is missing, and send sensitive questions to a person."
        onChange={event => setInstructions(event.target.value)}
      />
    </Field>
  );
}

function EmbeddedSample() {
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="textarea-demo-field">
      <div
        className="textarea-demo-composer"
        role="group"
        aria-label="Message composer"
        data-testid="composer"
        onClick={event => {
          if (!(event.target as HTMLElement).closest('button')) area.current?.focus();
        }}
      >
        <span className="textarea-demo-composer-title">Draft message</span>
        <Textarea
          ref={area}
          variant="embedded"
          aria-label="Draft message"
          placeholder="Write something…"
          maxLength={8000}
          value={draft}
          onChange={event => {
            setDraft(event.target.value);
            setSent(false);
          }}
        />
        <div className="textarea-demo-composer-actions">
          <Button size="icon-xs" variant="ghost" aria-label="Add attachment">
            <Plus aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            disabled={!draft.trim()}
            onClick={() => {
              setDraft('');
              setSent(true);
            }}
          >
            Send
            <Send data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <p role="status" className="textarea-demo-helper">
        {sent ? 'Draft example sent locally.' : 'Nothing has been sent.'}
      </p>
    </div>
  );
}

export function TextareaVariants() {
  return (
    <Example
      title="Variants"
      description="default is the bordered form control. embedded drops its frame so a composer group draws the border and focus ring."
    >
      <div className="textarea-demo-matrix">
        {(['default', 'embedded'] as const).map(variant => (
          <div key={variant} className="textarea-demo-matrix-row" data-testid={`variant-${variant}`}>
            <div className="textarea-demo-matrix-label">
              <p>{variants[variant].label}</p>
              <span>{variants[variant].note}</span>
            </div>
            {variant === 'default' ? <DefaultSample /> : <EmbeddedSample />}
          </div>
        ))}
      </div>
    </Example>
  );
}

const rowSamples = [
  {
    rows: undefined,
    label: 'Notes',
    note: 'No rows · 96px floor',
    value: 'Bring the Q3 hiring plan. Dial-in is in the calendar invite.',
  },
  {
    rows: 3,
    label: 'Task prompt',
    note: 'rows={3} · 96px floor',
    value: 'Prepare the weekly People Ops update and list questions that need a decision.',
  },
  {
    rows: 5,
    label: 'Processing instructions',
    note: 'rows={5} · 118px',
    value:
      'Label invoices from vendors as Finance.\nArchive newsletters older than a week.\nFlag anything from legal@ for review.',
  },
  {
    rows: 9,
    label: 'Your preferences',
    note: 'rows={9} · 198px',
    value: 'Use short replies with emojis.\nGreet me for my time of day.\n\n- Prefer bullet lists\n- Link sources',
  },
  {
    rows: 10,
    label: 'Project instructions',
    note: 'rows={10} · 218px',
    value: 'Answer as the launch team. Use the launch brief for dates.',
  },
  {
    rows: 12,
    label: 'Agent instructions',
    note: 'rows={12} · 258px',
    value:
      'You review incoming vendor contracts.\n\n1. Summarize the term, renewal, and price.\n2. Compare against the standard template.\n3. Ask legal when an indemnity clause changes.',
  },
] as const;

export function TextareaRows() {
  return (
    <Example
      title="Rows and growth"
      description="Every row count Cloud uses. rows sets the starting height; the field then grows with its content."
    >
      <div className="textarea-demo-grid textarea-demo-grid-wide">
        {rowSamples.map(sample => (
          <div key={sample.label} className="textarea-demo-field" data-testid={`rows-${sample.rows ?? 'auto'}`}>
            <span className="textarea-demo-caption">{sample.note}</span>
            <Field label={sample.label} optional>
              <Textarea rows={sample.rows} defaultValue={sample.value} />
            </Field>
          </div>
        ))}
      </div>
    </Example>
  );
}

export function TextareaStates() {
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState(
    'Owns onboarding, benefits, and policy questions for the EMEA offices.',
  );
  const instructions =
    'Create an OAuth app named TulipFarm Workflows with the read:jira-work scope, then send the client ID to your workspace owner.';
  return (
    <Example
      title="States"
      description="Empty with a placeholder, filled, read-only, read-only while saving, disabled, and invalid."
    >
      <div className="textarea-demo-grid textarea-demo-grid-wide" data-testid="states">
        <div className="textarea-demo-field">
          <Label htmlFor="textarea-answer">Your answer</Label>
          <Textarea
            id="textarea-answer"
            placeholder="Type your answer…"
            value={answer}
            onChange={event => setAnswer(event.target.value)}
          />
        </div>
        <Field label="Notes" optional helper="Only stored in this example.">
          <Textarea maxLength={10000} defaultValue="Agenda: hiring plan, offsite dates, and the benefits survey." />
        </Field>
        <div className="textarea-demo-field">
          <Label htmlFor="provider-instructions">Instructions to send your administrator</Label>
          <Textarea
            id="provider-instructions"
            value={instructions}
            readOnly
            rows={5}
            onFocus={event => event.target.select()}
          />
        </div>
        <div className="textarea-demo-field">
          <Label htmlFor="team-description">Description (optional)</Label>
          <Textarea
            id="team-description"
            maxLength={1000}
            value={description}
            readOnly={saving}
            aria-busy={saving || undefined}
            aria-describedby="team-description-help"
            onChange={event => setDescription(event.target.value)}
          />
          <div className="textarea-demo-row">
            <p id="team-description-help" className="textarea-demo-helper">
              {saving ? 'Saving… the text stays selectable.' : 'Up to 1,000 characters.'}
            </p>
            <Button size="xs" variant="outline" aria-pressed={saving} onClick={() => setSaving(!saving)}>
              {saving ? 'Finish saving' : 'Simulate saving'}
            </Button>
          </div>
        </div>
        <Field label="Processing instructions" optional disabled helper="Connect Gmail to edit these.">
          <Textarea rows={5} defaultValue="Label invoices from vendors as Finance." />
        </Field>
        <Field label="Request" required error="Enter a request.">
          <Textarea maxLength={8000} />
        </Field>
      </div>
    </Example>
  );
}

export function TextareaLabelling() {
  const [summary, setSummary] = useState('');
  const [canRun, setCanRun] = useState(false);
  const [included, setIncluded] = useState(true);
  const [comment, setComment] = useState('');
  const summaryError = summary.trim() ? undefined : 'Enter a summary.';
  return (
    <Example
      title="Labels and descriptions"
      description="A Sprõut Field, a label with htmlFor and aria-describedby, a label that wraps the textarea, and a disabled fieldset."
    >
      <div className="textarea-demo-grid">
        <div className="textarea-demo-field" data-testid="described">
          <Label htmlFor="operation-description">Issue description</Label>
          <Label className="textarea-demo-check">
            <Checkbox checked={included} onCheckedChange={checked => setIncluded(checked === true)} />
            Include issue description
          </Label>
          <Textarea
            id="operation-description"
            value={summary}
            disabled={!included}
            aria-invalid={included && Boolean(summaryError)}
            aria-describedby="operation-description-help operation-description-error"
            onChange={event => setSummary(event.target.value)}
          />
          <p id="operation-description-help" className="textarea-demo-helper">
            Plain text. Jira converts line breaks.
          </p>
          <p id="operation-description-error" className="textarea-demo-error">
            {included ? summaryError : undefined}
          </p>
        </div>
        <div className="textarea-demo-field" data-testid="wrapped">
          <Label className="textarea-demo-wrap">
            Decision or comment
            <Textarea value={comment} onChange={event => setComment(event.target.value)} />
          </Label>
          <div className="textarea-demo-row">
            <Button size="sm">Approve request</Button>
            <Button size="sm" variant="outline">
              Decline request
            </Button>
          </div>
        </div>
        <fieldset className="textarea-demo-fieldset" disabled={!canRun} data-testid="fieldset">
          <legend>Run manually</legend>
          {!canRun && <p className="textarea-demo-helper">Ask a manager for run permission to start runs.</p>}
          <Label htmlFor="run-input">Request to review</Label>
          <Textarea id="run-input" defaultValue="Renew the Figma contract for 40 seats." />
        </fieldset>
        <div className="textarea-demo-row">
          <Button size="sm" variant="outline" aria-pressed={canRun} onClick={() => setCanRun(!canRun)}>
            {canRun ? 'Remove run permission' : 'Grant run permission'}
          </Button>
        </div>
      </div>
    </Example>
  );
}

export function TextareaKeyboard() {
  const [query, setQuery] = useState('status==Open and priority=in=(High,Urgent)');
  const [applied, setApplied] = useState<string>();
  const [prompt, setPrompt] = useState('');
  const [building, setBuilding] = useState(false);
  const [built, setBuilt] = useState<string>();
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const build = () => {
    if (!prompt.trim() || building) return;
    setBuilding(true);
    setBuilt(undefined);
    timer.current = window.setTimeout(() => {
      setBuilding(false);
      setBuilt(prompt.trim());
    }, 1500);
  };
  const submitOnModEnter = (action: () => void) => (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      action();
    }
  };
  return (
    <Example
      title="Keyboard submit and loading"
      description="⌘ Enter or Ctrl Enter submits; Enter adds a line. The RSQL field inherits a monospace font. Building a search disables the field."
    >
      <div className="textarea-demo-grid">
        <div className="textarea-demo-field" data-testid="rsql">
          <Field
            label="RSQL query"
            optional
            helper="A field name, an operator, and a value. Applied filters appear as chips."
          >
            <div className="textarea-demo-mono">
              <Textarea
                value={query}
                spellCheck={false}
                placeholder="status==Open and priority=in=(High,Urgent)"
                onChange={event => setQuery(event.target.value)}
                onKeyDown={submitOnModEnter(() => setApplied(query.trim()))}
              />
            </div>
          </Field>
          <div className="textarea-demo-row">
            <Button size="sm" onClick={() => setApplied(query.trim())}>
              Apply RSQL
            </Button>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>Enter</Kbd>
            </KbdGroup>
          </div>
          <p role="status" className="textarea-demo-helper">
            {applied ? `Applied: ${applied}` : 'No filter applied.'}
          </p>
        </div>
        <div className="textarea-demo-field" data-testid="ai-search">
          <Field
            label="Describe the rows you want"
            optional
            counter={`${prompt.length}/2000`}
            helper="For example: open urgent tickets from last week, newest first."
          >
            <Textarea
              value={prompt}
              maxLength={2000}
              disabled={building}
              onChange={event => setPrompt(event.target.value)}
              onKeyDown={submitOnModEnter(build)}
            />
          </Field>
          <div className="textarea-demo-row">
            {building ? (
              <>
                <Button size="sm" disabled aria-busy="true">
                  Building search…
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.clearTimeout(timer.current);
                    setBuilding(false);
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" disabled={!prompt.trim()} onClick={build}>
                Build search
              </Button>
            )}
          </div>
          <p role="status" className="textarea-demo-helper">
            {built ? `Applied: ${built}` : building ? 'Building search…' : 'No search built.'}
          </p>
        </div>
      </div>
    </Example>
  );
}

export function TextareaForm() {
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    timer.current = window.setTimeout(() => {
      setBusy(false);
      setSaved(true);
      setContent('');
    }, 800);
  };
  return (
    <Example
      title="Form submission"
      description="A required textarea joins native form validation. It is disabled while the form saves."
    >
      <form className="textarea-demo-panel" onSubmit={submit} data-testid="knowledge-form">
        <div className="textarea-demo-field">
          <Label htmlFor="knowledge-content">Text</Label>
          <Textarea
            id="knowledge-content"
            value={content}
            rows={10}
            maxLength={1048576}
            required
            disabled={busy}
            placeholder="Paste the launch brief or FAQ text."
            onChange={event => setContent(event.target.value)}
          />
        </div>
        <div className="textarea-demo-row">
          <Button type="submit" size="sm" disabled={busy} aria-busy={busy || undefined}>
            {busy ? 'Adding…' : 'Add text'}
          </Button>
          <span role="status" className="textarea-demo-helper">
            {saved ? 'Added to project knowledge.' : ''}
          </span>
        </div>
      </form>
    </Example>
  );
}

export default function TextareaDemo() {
  return (
    <div id="textarea-demo" className="textarea-demo">
      <TextareaVariants />
      <TextareaRows />
      <TextareaStates />
      <TextareaLabelling />
      <TextareaKeyboard />
      <TextareaForm />
    </div>
  );
}
