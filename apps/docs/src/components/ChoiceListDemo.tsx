import { useEffect, useId, useState, type ReactNode } from 'react';
import { Badge } from '@tulipfarm/sprout/badge';
import { Button } from '@tulipfarm/sprout/button';
import { ChoiceList, ChoiceSummary, type ChoiceListOption } from '@tulipfarm/sprout/choice-list';
import { Field } from '@tulipfarm/sprout/field';
import { Form, FormFooter } from '@tulipfarm/sprout/form';
import { Textarea } from '@tulipfarm/sprout/textarea';
import '../styles/choice-list-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="choice-list-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="choice-list-demo-card-body">{children}</div>
    </section>
  );
}

function Panel({ caption, testId, children }: { caption: string; testId?: string; children: ReactNode }) {
  return (
    <div className="choice-list-demo-panel" data-testid={testId}>
      <p className="choice-list-demo-caption">{caption}</p>
      {children}
    </div>
  );
}

/* Sample data mirrors what Cloud passes in. Agent questions arrive with
   "(Recommended)" in the label; Bud reply styles carry an extra value. */
const replyStyles = [
  {
    id: 'short',
    label: 'Short answers',
    value: 'Keep replies short and direct. Lead with the answer.',
  },
  {
    id: 'detailed',
    label: 'Detailed answers',
    value: 'Give detailed replies with clear explanations and useful examples.',
  },
  { id: 'custom', label: 'Custom', value: '' },
];
const repositories: ChoiceListOption[] = [
  { id: 'web', label: 'tulipfarm/web (Recommended)' },
  { id: 'api', label: 'tulipfarm/api' },
  { id: 'docs', label: 'tulipfarm/docs' },
];
const channels: ChoiceListOption[] = [
  { id: 'product', label: '#product' },
  { id: 'support', label: '#support-escalations' },
  { id: 'releases', label: '#eng-releases' },
  { id: 'design', label: '#design-reviews' },
  { id: 'incidents', label: '#incidents' },
  { id: 'sales', label: '#sales-wins' },
  { id: 'random', label: '#random' },
];
const fruits = ['Apple', 'Apricot', 'Blueberry', 'Cherry', 'Pear'];

function LayoutPairs() {
  const [style, setStyle] = useState<string[]>(['short']);
  const [fruit, setFruit] = useState<string[]>(['Apple', 'Cherry']);
  const [repo, setRepo] = useState<string[]>([]);
  const [watch, setWatch] = useState<string[]>(['support']);
  return (
    <div className="choice-list-demo-grid">
      <Panel caption="Stacked · single (radio)" testId="layout-stacked-single">
        <ChoiceList legend="Reply style" options={replyStyles} value={style} onChange={setStyle} />
      </Panel>
      <Panel caption="Stacked · multiple (checkbox)" testId="layout-stacked-multiple">
        <ChoiceList
          legend="Multiple choices"
          multiple
          options={fruits.map(id => ({ id, label: id }))}
          value={fruit}
          onChange={setFruit}
        />
      </Panel>
      <Panel caption="Compact · single (radio)" testId="layout-compact-single">
        <p className="choice-list-demo-prompt">Which repository should I open the issue in?</p>
        <ChoiceList
          layout="compact"
          legend="Choose one answer"
          options={repositories}
          value={repo}
          onChange={setRepo}
        />
      </Panel>
      <Panel caption="Compact · multiple (checkbox), scrolls past ~6 rows" testId="layout-compact-multiple">
        <p className="choice-list-demo-prompt">Which Slack channels should I summarize each morning?</p>
        <ChoiceList
          layout="compact"
          multiple
          legend="Choose one or more answers"
          options={channels}
          value={watch}
          onChange={setWatch}
        />
      </Panel>
    </div>
  );
}

type PreferenceState = 'asking' | 'saving' | 'saved';

function BudPreference() {
  const id = useId();
  const [style, setStyle] = useState<string[]>([]);
  const [answer, setAnswer] = useState('');
  const [state, setState] = useState<PreferenceState>('asking');
  const custom = style[0] === 'custom';
  const value = custom ? answer.trim() : (replyStyles.find(item => item.id === style[0])?.value ?? '');
  const busy = state === 'saving';
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setState('saved'), 1200);
    return () => clearTimeout(timer);
  }, [busy]);
  return (
    <section aria-label="Personal preference" className="choice-list-demo-preference" data-testid="bud-preference">
      {state === 'saved' ? (
        <>
          <p role="status">Remembered for this workspace</p>
          <p>{value}</p>
          <div>
            <Button size="sm" variant="outline" onClick={() => setState('asking')}>
              Undo
            </Button>
          </div>
        </>
      ) : (
        <>
          <p>How should I write my replies to you?</p>
          <Form
            label="Answer Bud's preference question"
            disabled={busy}
            onSubmit={() => {
              if (value) setState('saving');
            }}
          >
            <ChoiceList legend="Reply style" options={replyStyles} value={style} onChange={setStyle} disabled={busy} />
            {custom && (
              <Field
                id={`${id}-answer`}
                label="Your preference"
                required
                helper="Saved for this workspace. You can undo it."
              >
                <Textarea value={answer} maxLength={2000} onChange={event => setAnswer(event.target.value)} />
              </Field>
            )}
            <FormFooter
              layout="compact"
              dirty={!!value}
              submit={{
                label: 'Save answer',
                pendingLabel: 'Saving answer...',
                state: busy
                  ? { kind: 'busy' }
                  : value
                    ? { kind: 'ready' }
                    : { kind: 'blocked', reason: 'Choose a reply style.' },
              }}
            >
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setStyle([]);
                  setAnswer('');
                }}
              >
                Skip
              </Button>
            </FormFooter>
          </Form>
        </>
      )}
    </section>
  );
}

type QuestionStatus = 'pending' | 'answered' | 'cancelled';

function textError(text: string) {
  return text.length > 2000 ? 'Keep your answer under 2,000 characters.' : null;
}

function AgentQuestion({
  prompt,
  options,
  multiple = false,
  allowText = false,
  locked = false,
  testId,
}: {
  prompt: string;
  options: ChoiceListOption[];
  multiple?: boolean;
  allowText?: boolean;
  locked?: boolean;
  testId: string;
}) {
  const id = useId();
  const [text, setText] = useState('');
  const [choices, setChoices] = useState<string[]>([]);
  const [typed, setTyped] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<QuestionStatus>('pending');
  const [recorded, setRecorded] = useState<string | undefined>();
  const validation = typed ? textError(text) : choices.length ? null : 'Choose an answer.';
  const blankText = typed && !text.trim();
  const error = attempted ? (blankText ? 'Enter your answer.' : validation) : null;
  const labels = new Map(options.map(choice => [choice.id, choice.label]));
  const reset = () => {
    setStatus('pending');
    setChoices([]);
    setText('');
    setTyped(false);
    setAttempted(false);
    setRecorded(undefined);
  };
  if (status !== 'pending')
    return (
      <section aria-labelledby={`${id}-title`} className="choice-list-demo-answered" data-testid={testId}>
        <h4 id={`${id}-title`} className="choice-list-demo-sr-only">
          {prompt}
        </h4>
        <ChoiceSummary prompt={prompt} answer={recorded} />
        <p role="status" className="choice-list-demo-status">
          {status === 'answered' ? 'Your answer was recorded.' : 'This request was cancelled without an answer.'}
        </p>
        <div className="choice-list-demo-status">
          <Button size="sm" variant="ghost" onClick={reset}>
            Ask again
          </Button>
        </div>
      </section>
    );
  return (
    <section aria-labelledby={`${id}-title`} className="choice-list-demo-question" data-testid={testId}>
      <h4 id={`${id}-title`} className="choice-list-demo-question-title">
        {prompt}
      </h4>
      <Form
        disabled={locked}
        onSubmit={() => {
          if (locked) return;
          setAttempted(true);
          if (validation || blankText) return 'invalid';
          setRecorded(typed ? text : choices.map(choice => labels.get(choice) ?? 'Unavailable choice').join(', '));
          setStatus('answered');
        }}
      >
        <ChoiceList
          layout="compact"
          legend={multiple ? 'Choose one or more answers' : 'Choose one answer'}
          multiple={multiple}
          options={options}
          value={typed ? [] : choices}
          disabled={locked}
          error={!typed ? (error ?? undefined) : undefined}
          onChange={value => {
            setChoices(value);
            setTyped(false);
          }}
          textOption={
            allowText
              ? {
                  id: `${id}-custom`,
                  value: text,
                  active: typed,
                  onChange: value => {
                    setText(value);
                    setTyped(true);
                  },
                  onFocus: () => setTyped(true),
                  error: typed ? error : null,
                }
              : undefined
          }
        />
        <FormFooter
          layout="compact"
          summary={
            allowText ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={locked}
                aria-expanded={typed}
                aria-controls={`${id}-custom`}
                onClick={() => setTyped(!typed)}
              >
                {typed ? 'Use a listed answer' : 'Other answer'}
              </Button>
            ) : undefined
          }
          dirty={!!text || choices.length > 0}
          submit={{
            label: 'Continue',
            pendingLabel: 'Saving response…',
            state: locked ? { kind: 'blocked', reason: 'Wait for Bud to finish replying.' } : { kind: 'ready' },
          }}
          error={error ? 'Choose or enter an answer to continue.' : undefined}
        >
          <Button variant="ghost" size="sm" disabled={locked} onClick={() => setStatus('cancelled')}>
            Skip
          </Button>
        </FormFooter>
      </Form>
    </section>
  );
}

function RecommendedCustom() {
  const [value, setValue] = useState<string[]>(['short']);
  const [text, setText] = useState('');
  const [custom, setCustom] = useState(false);
  const labels: Record<string, string> = {
    short: 'Short answers',
    detail: 'Detailed answers',
  };
  return (
    <div className="choice-list-demo-stack" data-testid="recommended-custom">
      <ChoiceList
        legend="Reply style"
        options={[
          { id: 'short', label: 'Short answers (Recommended)' },
          { id: 'detail', label: 'Detailed answers' },
        ]}
        value={custom ? [] : value}
        onChange={next => {
          setValue(next);
          setCustom(false);
        }}
        textOption={{
          value: text,
          active: custom,
          onChange: setText,
          onFocus: () => setCustom(true),
          error: null,
        }}
      />
      <ChoiceSummary prompt="Reply style" answer={custom ? text : value.map(id => labels[id]).join(', ')} />
    </div>
  );
}

function StatesExample() {
  const [style, setStyle] = useState<string[]>([]);
  const [repo, setRepo] = useState<string[]>([]);
  const [text, setText] = useState('');
  return (
    <div className="choice-list-demo-grid">
      <Panel caption="Preselected and disabled" testId="state-disabled">
        <ChoiceList
          legend="Preselected and disabled"
          disabled
          options={[{ id: 'short', label: 'Short answers' }]}
          value={['short']}
          onChange={() => {}}
        />
        <ChoiceList
          legend="Saving answer (busy)"
          disabled
          options={replyStyles}
          value={['detailed']}
          onChange={() => {}}
        />
      </Panel>
      <Panel caption="Stacked error" testId="state-stacked-error">
        <ChoiceList
          legend="Reply style"
          options={replyStyles}
          value={style}
          onChange={setStyle}
          error={style.length ? undefined : 'Choose a reply style.'}
        />
      </Panel>
      <Panel caption="Compact error" testId="state-compact-error">
        <ChoiceList
          layout="compact"
          legend="Choose one answer"
          options={repositories}
          value={repo}
          onChange={setRepo}
          error={repo.length ? undefined : 'Choose an answer.'}
        />
      </Panel>
      <Panel caption="Typed answer error" testId="state-text-error">
        <ChoiceList
          legend="Reply style"
          options={replyStyles.slice(0, 2)}
          value={[]}
          onChange={() => {}}
          textOption={{
            value: text,
            active: true,
            onChange: setText,
            onFocus: () => {},
            error: text.trim() ? null : 'Enter your answer.',
            id: 'choice-list-demo-text-error',
          }}
        />
      </Panel>
    </div>
  );
}

function Summaries() {
  return (
    <div className="choice-list-demo-summaries" data-testid="summaries">
      <div>
        <ChoiceSummary prompt="Which repository should I open the issue in?" answer="tulipfarm/web (Recommended)" />
        <p className="choice-list-demo-status">Your answer was recorded.</p>
      </div>
      <div>
        <ChoiceSummary
          prompt="Which Slack channels should I summarize each morning?"
          answer="#support-escalations, #eng-releases, #incidents"
        />
        <p className="choice-list-demo-status">Your answer was recorded.</p>
      </div>
      <div>
        <ChoiceSummary
          prompt="Anything I should know before drafting the launch note?"
          answer={'Mention the pricing change first.\nKeep the tone calm — this ships to every workspace on Monday.'}
        />
        <p className="choice-list-demo-status">Your answer was recorded.</p>
      </div>
      <div>
        <ChoiceSummary prompt="Should I archive last quarter's planning docs?" />
        <p className="choice-list-demo-status">This request expired without an answer.</p>
      </div>
      <div>
        <ChoiceSummary prompt="Which repository should I open the issue in?" />
        <p className="choice-list-demo-status">This request was cancelled without an answer.</p>
      </div>
      <div>
        <ChoiceSummary prompt="Reply style" answer="Short answers">
          <Badge variant="secondary">Saved</Badge>
        </ChoiceSummary>
      </div>
    </div>
  );
}

export default function ChoiceListDemo() {
  return (
    <div id="choice-list-demo" className="choice-list-demo">
      <Example
        title="Layouts"
        description="Stacked rows for forms and settings. Compact, numbered rows for questions inside a chat. Each works as a single (radio) or multiple (checkbox) list."
      >
        <LayoutPairs />
      </Example>
      <Example
        title="Bud preference"
        description="A stacked reply-style list inside a form. Custom reveals a text field. Saving locks the list."
      >
        <BudPreference />
      </Example>
      <Example
        title="Agent question"
        description="Compact lists inside a question card. Other answer opens a typed answer. Continue with nothing chosen shows an error; Continue or Skip shows the summary."
      >
        <div className="choice-list-demo-grid">
          <AgentQuestion
            prompt="Which repository should I open the issue in?"
            options={repositories}
            allowText
            testId="question-single"
          />
          <AgentQuestion
            prompt="Which Slack channels should I summarize each morning?"
            options={channels}
            multiple
            testId="question-multiple"
          />
          <AgentQuestion
            prompt="Should I send the weekly digest now?"
            options={[
              { id: 'now', label: 'Send it now (Recommended)' },
              { id: 'monday', label: 'Wait until Monday' },
            ]}
            locked
            testId="question-locked"
          />
        </div>
      </Example>
      <Example
        title="Recommended choice and custom answer"
        description="A label ending in (Recommended) gets a badge. A stacked list can always show a typed answer after its options."
      >
        <RecommendedCustom />
      </Example>
      <Example title="States" description="Disabled, busy, and error states for both layouts and the typed answer.">
        <StatesExample />
      </Example>
      <Example
        title="Choice summary"
        description="The answered, expired, and cancelled lines a question collapses into. Long and multi-line answers wrap."
      >
        <Summaries />
      </Example>
    </div>
  );
}
