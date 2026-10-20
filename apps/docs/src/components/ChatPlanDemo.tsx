import { useState, type ReactNode } from 'react';
import { Button } from '@tulipfarm/sprout/button';
import { CanvasSection } from '@tulipfarm/sprout/canvas';
import { ChatPlan, type ChatPlanStep } from '@tulipfarm/sprout/chat-plan';
import DocsSelect from './DocsSelect';
import '../styles/chat-plan-demo.css';

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
    <section className="plan-demo-frame" aria-label={title} data-recipe={id}>
      <div className="plan-demo-bar">
        <div className="plan-demo-bar-text">
          <span className="plan-demo-bar-title">{title}</span>
          {note && <span className="plan-demo-note">{note}</span>}
        </div>
        {controls && <div className="plan-demo-controls">{controls}</div>}
      </div>
      <div className="plan-demo-stage">{children}</div>
    </section>
  );
}

/* Playground: a plan the agent works through -------------------------------- */

const cleanup = [
  {
    id: 'find',
    title: 'Find deliveries with no supplier',
    detail: 'Search the Supplier deliveries table for empty Supplier fields.',
  },
  { id: 'match', title: 'Match each delivery to a supplier by invoice number' },
  {
    id: 'review',
    title: 'Show the matches for review',
    detail: 'Nothing changes until you approve.',
  },
  { id: 'update', title: 'Update 42 delivery records' },
] as const;

type Progress = 'proposed' | 'first' | 'halfway' | 'failed' | 'done' | 'empty';

const progressChoices: [Progress, string][] = [
  ['proposed', 'Proposed'],
  ['first', 'First step running'],
  ['halfway', 'Halfway'],
  ['failed', 'Step failed'],
  ['done', 'Done'],
  ['empty', 'No steps yet'],
];

function stepsFor(progress: Progress): ChatPlanStep[] {
  if (progress === 'empty') return [];
  const done = { proposed: 0, first: 0, halfway: 2, failed: 1, done: 4 }[progress];
  return cleanup.map((step, index) => {
    if (index < done) return { ...step, state: 'complete' };
    if (index === done && progress === 'failed')
      return {
        ...step,
        detail: 'Twelve invoice numbers match more than one supplier. Ask me how to resolve them.',
        state: 'error',
      };
    if (index === done && (progress === 'first' || progress === 'halfway')) return { ...step, state: 'running' };
    return { ...step, state: 'pending' };
  });
}

const order: Progress[] = ['proposed', 'first', 'halfway', 'done'];

export function ChatPlanPlayground() {
  const [progress, setProgress] = useState<Progress>('halfway');
  const nextIndex = order.indexOf(progress) + 1;
  return (
    <section className="plan-demo-frame" aria-label="Chat plan playground">
      <div className="plan-demo-toolbar">
        <span className="plan-demo-picker">
          Progress
          <DocsSelect<Progress>
            label="Progress"
            value={progress}
            onValueChange={setProgress}
            items={progressChoices.map(([value, label]) => ({ value, label }))}
          />
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={nextIndex === 0 || nextIndex >= order.length}
          onClick={() => setProgress(order[nextIndex]!)}
        >
          Next step
        </Button>
      </div>
      <div className="plan-demo-stage">
        <div className="plan-demo-chat">
          <ChatPlan title="Fill in missing suppliers" steps={stepsFor(progress)} />
        </div>
      </div>
    </section>
  );
}

/* Every step state, as Cloud's playground shows them ------------------------ */

const gardenPlan: ChatPlanStep[] = [
  {
    id: 'one',
    title: 'Choose a patch',
    detail: 'A sunny place near water.',
    state: 'complete',
  },
  { id: 'two', title: 'Prepare the soil', state: 'running' },
  {
    id: 'three',
    title: 'Order bulbs',
    detail: 'The sample supplier is unavailable.',
    state: 'error',
  },
  { id: 'four', title: 'Plant the bulbs', state: 'pending' },
];

export function ChatPlanStates() {
  return (
    <Frame id="states" title="Step states" note="Complete, in progress, failed, and not started">
      <div className="plan-demo-chat">
        <ChatPlan title="Fictional garden plan" steps={gardenPlan} />
      </div>
    </Frame>
  );
}

export function ChatPlanEmpty() {
  return (
    <Frame id="empty" title="Empty plan" note="The agent has not proposed steps yet">
      <div className="plan-demo-chat">
        <ChatPlan title="New plan" steps={[]} />
      </div>
    </Frame>
  );
}

/* In the canvas: a to-do result beside the chat ----------------------------- */

const launch: ChatPlanStep[] = [
  {
    id: 'brief',
    title: 'Draft the launch brief',
    detail: 'Saved to Launch week › Brief.',
    state: 'complete',
  },
  {
    id: 'list',
    title: 'Pull the press contact list from Contacts',
    detail: '86 contacts tagged Press.',
    state: 'complete',
  },
  { id: 'emails', title: 'Write the announcement emails', state: 'running' },
  {
    id: 'schedule',
    title: 'Schedule sends for Tuesday 9:00',
    state: 'pending',
  },
  {
    id: 'report',
    title: 'Report opens and replies on Friday',
    state: 'pending',
  },
];

export function ChatPlanCanvas() {
  return (
    <Frame id="canvas" title="In the canvas" note="A to-do result, wrapped in Canvas Section">
      <div className="plan-demo-canvas" role="group" aria-label="Canvas">
        <div className="plan-demo-canvas-tab">Launch checklist</div>
        <CanvasSection>
          <ChatPlan title="Launch checklist" steps={launch} />
        </CanvasSection>
      </div>
    </Frame>
  );
}

/* Long content wraps --------------------------------------------------------- */

const longPlan: ChatPlanStep[] = [
  {
    id: 'export',
    title: 'Export https://files.example.com/workspaces/tulipfarm/exports/supplier-deliveries-2026-q3-final-v2.csv',
    detail: 'The export finished with 1,204 rows and 18 columns.',
    state: 'complete',
  },
  {
    id: 'import',
    title: 'Import the rows into Supplier deliveries',
    detail:
      'The column InvoiceReferenceNumberFromLegacyAccountingSystem has no matching field. Pick a field or skip the column.',
    state: 'error',
  },
  {
    id: 'notify',
    title: 'Tell the operations channel when the import is done',
    state: 'pending',
  },
];

export function ChatPlanLongContent() {
  return (
    <Frame id="long" title="Long content" note="Long titles, links, and details wrap inside a narrow chat">
      <div className="plan-demo-narrow">
        <ChatPlan title="Move supplier deliveries from the legacy accounting export" steps={longPlan} />
      </div>
    </Frame>
  );
}
