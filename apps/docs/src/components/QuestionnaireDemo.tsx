import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@tulipfarm/sprout/button';
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
  type QuestionnaireItemDefinition,
  type QuestionnaireItemStatus,
} from '@tulipfarm/sprout/questionnaire';
import '../styles/questionnaire-demo.css';

function Frame({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section className="questionnaire-demo-frame" aria-label={title} data-testid={id}>
      <div className="questionnaire-demo-bar">
        <span className="questionnaire-demo-bar-title">{title}</span>
        {note && <span className="questionnaire-demo-note">{note}</span>}
      </div>
      <div className="questionnaire-demo-stage">{children}</div>
    </section>
  );
}

function Panel({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="questionnaire-demo-panel">
      <p className="questionnaire-demo-caption">{caption}</p>
      {children}
    </div>
  );
}

function answersOf(event: FormEvent<HTMLFormElement>) {
  const data = new FormData(event.currentTarget);
  const answers: Record<string, string[]> = {};
  for (const [key, value] of data) (answers[key] ??= []).push(String(value));
  return answers;
}

function Answers({ answers }: { answers: Record<string, string[]> | null }) {
  if (!answers) return null;
  const entries = Object.entries(answers);
  return (
    <dl className="questionnaire-demo-answers" data-testid="answers">
      {entries.length === 0 ? (
        <div>
          <dt>Answers</dt>
          <dd>None. Every question was skipped.</dd>
        </div>
      ) : (
        entries.map(([key, values]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{values.join(', ')}</dd>
          </div>
        ))
      )}
    </dl>
  );
}

/* The internal playground composition: a required single choice with a
   description and custom error, an optional multiple choice, and a
   controlled note. Answers stay in the local form. */

const playgroundItems: QuestionnaireItemDefinition[] = [
  {
    name: 'style',
    required: true,
    choices: [{ value: 'short' }, { value: 'detailed' }],
  },
  { name: 'plants', choices: [{ value: 'tulips' }, { value: 'daisies' }] },
  { name: 'note' },
];

export function QuestionnairePlayground() {
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string[]> | null>(null);
  const [note, setNote] = useState('');
  return (
    <Frame
      id="questionnaire-playground"
      title="Multi-step questionnaire"
      note="Answers stay in the local form. Nothing is submitted to a service."
    >
      <div className="questionnaire-demo-card">
        <Questionnaire
          items={playgroundItems}
          onChange={() => setSubmitted(false)}
          onReset={() => {
            setSubmitted(false);
            setAnswers(null);
            setNote('');
          }}
          onSubmit={event => {
            event.preventDefault();
            setAnswers(answersOf(event));
            setSubmitted(true);
          }}
        >
          <QuestionnaireProgress />
          <QuestionnaireItem name="style" required>
            <QuestionnaireTitle>How should answers look?</QuestionnaireTitle>
            <QuestionnaireDescription>Pick one reply style.</QuestionnaireDescription>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="short">
                Short answers
                <QuestionnaireChoiceDescription>A quick summary.</QuestionnaireChoiceDescription>
              </QuestionnaireChoice>
              <QuestionnaireChoice value="detailed">Detailed answers</QuestionnaireChoice>
            </QuestionnaireChoices>
            <QuestionnaireError>Choose a reply style.</QuestionnaireError>
          </QuestionnaireItem>
          <QuestionnaireItem name="plants" multiple>
            <QuestionnaireTitle>Which plants do you like?</QuestionnaireTitle>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="tulips">Tulips</QuestionnaireChoice>
              <QuestionnaireChoice value="daisies">Daisies</QuestionnaireChoice>
            </QuestionnaireChoices>
          </QuestionnaireItem>
          <QuestionnaireItem name="note">
            <QuestionnaireTitle>Anything else?</QuestionnaireTitle>
            <QuestionnaireInput
              aria-label="Additional note"
              placeholder="Add a local note"
              value={note}
              onChange={event => setNote(event.target.value)}
            />
          </QuestionnaireItem>
          <QuestionnaireActions>
            <QuestionnairePrevious />
            <QuestionnaireSkip />
            <QuestionnaireNext />
            <QuestionnaireSubmit />
          </QuestionnaireActions>
          <div className="questionnaire-demo-footer">
            <p role="status" className="questionnaire-demo-status">
              {submitted ? 'Answers received locally.' : 'Complete the sample questions.'}
            </p>
            <Button type="reset" variant="outline">
              Restart sample
            </Button>
          </div>
        </Questionnaire>
        <Answers answers={submitted ? answers : null} />
      </div>
    </Frame>
  );
}

/* Shortcuts: letters follow Root.items order; numbers follow the rendered
   order when there is no items list. */

const modelItems: QuestionnaireItemDefinition[] = [
  {
    name: 'model',
    required: true,
    choices: [{ value: 'fast' }, { value: 'balanced' }, { value: 'deep', disabled: true }, { value: 'custom' }],
  },
  {
    name: 'sources',
    choices: [{ value: 'drive' }, { value: 'tables' }, { value: 'web' }],
  },
];

export function QuestionnaireShortcuts() {
  const [lettersAnswers, setLettersAnswers] = useState<Record<string, string[]> | null>(null);
  const [numbersAnswers, setNumbersAnswers] = useState<Record<string, string[]> | null>(null);
  return (
    <Frame
      id="questionnaire-shortcuts"
      title="Keyboard shortcuts"
      note="Press a key to pick a choice. Enter moves on once answered."
    >
      <div className="questionnaire-demo-grid">
        <Panel caption='shortcuts="letters" with items'>
          <Questionnaire
            data-testid="shortcuts-letters"
            shortcuts="letters"
            items={modelItems}
            onSubmit={event => {
              event.preventDefault();
              setLettersAnswers(answersOf(event));
            }}
          >
            <QuestionnaireProgress />
            <QuestionnaireItem name="model" required>
              <QuestionnaireTitle>Which model should draft the reply?</QuestionnaireTitle>
              <QuestionnaireChoices>
                <QuestionnaireChoice value="fast">
                  Fast
                  <QuestionnaireChoiceDescription>Replies in a few seconds.</QuestionnaireChoiceDescription>
                </QuestionnaireChoice>
                <QuestionnaireChoice value="balanced" defaultChecked>
                  Balanced
                  <QuestionnaireChoiceDescription>Good for most garden plans.</QuestionnaireChoiceDescription>
                </QuestionnaireChoice>
                <QuestionnaireChoice value="deep" disabled>
                  Deep research
                  <QuestionnaireChoiceDescription>Not on this workspace’s plan.</QuestionnaireChoiceDescription>
                </QuestionnaireChoice>
                <QuestionnaireChoice value="custom">Custom model</QuestionnaireChoice>
              </QuestionnaireChoices>
              <QuestionnaireError />
            </QuestionnaireItem>
            <QuestionnaireItem name="sources" multiple>
              <QuestionnaireTitle>Which sources can it read?</QuestionnaireTitle>
              <QuestionnaireDescription>Choose any. Skip to use none.</QuestionnaireDescription>
              <QuestionnaireChoices>
                <QuestionnaireChoice value="drive">Shared drive</QuestionnaireChoice>
                <QuestionnaireChoice value="tables">Supplier tables</QuestionnaireChoice>
                <QuestionnaireChoice value="web">The web</QuestionnaireChoice>
              </QuestionnaireChoices>
              <QuestionnaireError />
            </QuestionnaireItem>
            <QuestionnaireActions>
              <QuestionnairePrevious />
              <QuestionnaireSkip />
              <QuestionnaireNext />
              <QuestionnaireSubmit>Save setup</QuestionnaireSubmit>
            </QuestionnaireActions>
          </Questionnaire>
          <Answers answers={lettersAnswers} />
        </Panel>
        <Panel caption='shortcuts="numbers" in rendered order'>
          <Questionnaire
            data-testid="shortcuts-numbers"
            shortcuts="numbers"
            onSubmit={event => {
              event.preventDefault();
              setNumbersAnswers(answersOf(event));
            }}
          >
            <QuestionnaireProgress />
            <QuestionnaireItem name="season" required>
              <QuestionnaireTitle>When should planting start?</QuestionnaireTitle>
              <QuestionnaireChoices>
                <QuestionnaireChoice value="spring">Spring</QuestionnaireChoice>
                <QuestionnaireChoice value="summer">Summer</QuestionnaireChoice>
                <QuestionnaireChoice value="autumn">Autumn</QuestionnaireChoice>
              </QuestionnaireChoices>
              <QuestionnaireError />
            </QuestionnaireItem>
            <QuestionnaireActions>
              <QuestionnairePrevious />
              <QuestionnaireSkip />
              <QuestionnaireNext />
              <QuestionnaireSubmit />
            </QuestionnaireActions>
          </Questionnaire>
          <Answers answers={numbersAnswers} />
        </Panel>
      </div>
    </Frame>
  );
}

/* States ---------------------------------------------------------------------- */

export function QuestionnaireStates() {
  const [status, setStatus] = useState<QuestionnaireItemStatus>('unanswered');
  const [serverError, setServerError] = useState(true);
  return (
    <Frame
      id="questionnaire-states"
      title="States"
      note="Errors, disabled items and choices, a typed email, and a single question."
    >
      <div className="questionnaire-demo-grid">
        <Panel caption="Required, shown invalid until fixed">
          <Questionnaire data-testid="state-invalid" onSubmit={event => event.preventDefault()}>
            <QuestionnaireItem name="supplier" required invalid={serverError}>
              <QuestionnaireTitle>Who supplies the bulbs?</QuestionnaireTitle>
              <QuestionnaireDescription>The table check found a closed supplier.</QuestionnaireDescription>
              <QuestionnaireChoices>
                <QuestionnaireChoice value="meadow" defaultChecked onChange={() => setServerError(false)}>
                  Meadow Bulbs Co.
                  <QuestionnaireChoiceDescription>Closed since March.</QuestionnaireChoiceDescription>
                </QuestionnaireChoice>
                <QuestionnaireChoice value="field" onChange={() => setServerError(false)}>
                  Field &amp; Stem
                </QuestionnaireChoice>
              </QuestionnaireChoices>
              <QuestionnaireError>Pick a supplier that is still open.</QuestionnaireError>
            </QuestionnaireItem>
            <QuestionnaireActions>
              <QuestionnaireSubmit>Save supplier</QuestionnaireSubmit>
            </QuestionnaireActions>
          </Questionnaire>
        </Panel>
        <Panel caption="Disabled item is left out of the steps">
          <Questionnaire data-testid="state-disabled" onSubmit={event => event.preventDefault()}>
            <QuestionnaireProgress />
            <QuestionnaireItem name="beds" onStatusChange={setStatus}>
              <QuestionnaireTitle>How many beds?</QuestionnaireTitle>
              <QuestionnaireChoices>
                <QuestionnaireChoice value="one">One raised bed</QuestionnaireChoice>
                <QuestionnaireChoice value="many">Several beds</QuestionnaireChoice>
              </QuestionnaireChoices>
            </QuestionnaireItem>
            <QuestionnaireItem name="greenhouse" disabled>
              <QuestionnaireTitle>Greenhouse size</QuestionnaireTitle>
              <QuestionnaireChoices>
                <QuestionnaireChoice value="small">Small</QuestionnaireChoice>
              </QuestionnaireChoices>
            </QuestionnaireItem>
            <QuestionnaireItem name="email" required>
              <QuestionnaireTitle>Where should we send the plan?</QuestionnaireTitle>
              <QuestionnaireInput type="email" aria-label="Email" placeholder="you@example.com" autoComplete="off" />
              <QuestionnaireError>Enter an email to continue.</QuestionnaireError>
            </QuestionnaireItem>
            <QuestionnaireActions>
              <QuestionnairePrevious />
              <QuestionnaireSkip />
              <QuestionnaireNext />
              <QuestionnaireSubmit />
            </QuestionnaireActions>
            <p className="questionnaire-demo-status" data-testid="bed-status">
              First item: {status}
            </p>
          </Questionnaire>
        </Panel>
        <Panel caption="One optional question">
          <Questionnaire data-testid="state-single" onSubmit={event => event.preventDefault()}>
            <QuestionnaireProgress />
            <QuestionnaireItem name="reminder">
              <QuestionnaireTitle>Remind you to water?</QuestionnaireTitle>
              <QuestionnaireChoices>
                <QuestionnaireChoice value="daily">Every morning</QuestionnaireChoice>
                <QuestionnaireChoice value="weekly">Once a week</QuestionnaireChoice>
              </QuestionnaireChoices>
            </QuestionnaireItem>
            <QuestionnaireActions>
              <QuestionnaireSkip>No reminders</QuestionnaireSkip>
              <QuestionnaireSubmit>Set reminder</QuestionnaireSubmit>
            </QuestionnaireActions>
          </Questionnaire>
        </Panel>
      </div>
    </Frame>
  );
}

/* Button sizes ------------------------------------------------------------------ */

function SizedQuestionnaire({ size, testId }: { size: 'default' | 'sm'; testId: string }) {
  return (
    <Questionnaire data-testid={testId} onSubmit={event => event.preventDefault()}>
      <QuestionnaireProgress />
      <QuestionnaireItem name="tone">
        <QuestionnaireTitle>Which tone fits the reply?</QuestionnaireTitle>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="friendly">Friendly</QuestionnaireChoice>
          <QuestionnaireChoice value="formal">Formal</QuestionnaireChoice>
        </QuestionnaireChoices>
      </QuestionnaireItem>
      <QuestionnaireItem name="length">
        <QuestionnaireTitle>How long?</QuestionnaireTitle>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="brief">A few lines</QuestionnaireChoice>
          <QuestionnaireChoice value="full">A full page</QuestionnaireChoice>
        </QuestionnaireChoices>
      </QuestionnaireItem>
      <QuestionnaireActions>
        <QuestionnairePrevious size={size} variant={size === 'sm' ? 'ghost' : 'outline'} />
        <QuestionnaireSkip size={size} variant={size === 'sm' ? 'ghost' : 'outline'} />
        <QuestionnaireNext size={size} />
        <QuestionnaireSubmit size={size} />
      </QuestionnaireActions>
    </Questionnaire>
  );
}

export function QuestionnaireSizes() {
  return (
    <Frame id="questionnaire-sizes" title="Action sizes" note="Navigation buttons take Button size and variant.">
      <div className="questionnaire-demo-grid">
        <Panel caption="default size: outline back and skip, default next">
          <SizedQuestionnaire size="default" testId="size-default" />
        </Panel>
        <Panel caption="sm size: ghost back and skip, for chat replies">
          <SizedQuestionnaire size="sm" testId="size-sm" />
        </Panel>
      </div>
    </Frame>
  );
}

/* Controlled step ---------------------------------------------------------------- */

const stepItems: QuestionnaireItemDefinition[] = [
  {
    name: 'goal',
    required: true,
    choices: [{ value: 'harvest' }, { value: 'flowers' }],
  },
  { name: 'space', choices: [{ value: 'balcony' }, { value: 'yard' }] },
];

export function QuestionnaireControlled() {
  const [step, setStep] = useState('goal');
  return (
    <Frame
      id="questionnaire-controlled"
      title="Controlled step"
      note="item and onItemChange keep the step in your state."
    >
      <div className="questionnaire-demo-card">
        <p className="questionnaire-demo-status" data-testid="current-step">
          Current step: {step}
        </p>
        <Questionnaire item={step} onItemChange={setStep} items={stepItems} onSubmit={event => event.preventDefault()}>
          <QuestionnaireItem name="goal" required>
            <QuestionnaireTitle>What is the garden for?</QuestionnaireTitle>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="harvest">Vegetables to harvest</QuestionnaireChoice>
              <QuestionnaireChoice value="flowers">Cut flowers</QuestionnaireChoice>
            </QuestionnaireChoices>
            <QuestionnaireError />
          </QuestionnaireItem>
          <QuestionnaireItem name="space">
            <QuestionnaireTitle>How much space is there?</QuestionnaireTitle>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="balcony">A balcony</QuestionnaireChoice>
              <QuestionnaireChoice value="yard">A yard</QuestionnaireChoice>
            </QuestionnaireChoices>
          </QuestionnaireItem>
          <QuestionnaireActions>
            <QuestionnairePrevious />
            <QuestionnaireSkip />
            <QuestionnaireNext />
            <QuestionnaireSubmit />
          </QuestionnaireActions>
        </Questionnaire>
        <div className="questionnaire-demo-jump">
          <Button size="sm" variant="outline" onClick={() => setStep('space')}>
            Jump to space
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setStep('goal')}>
            Back to goal
          </Button>
        </div>
      </div>
    </Frame>
  );
}
