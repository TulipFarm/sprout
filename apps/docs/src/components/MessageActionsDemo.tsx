import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@tulipfarm/sprout/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@tulipfarm/sprout/dialog';
import { Message, MessageBubble, MessageContent, MessageGroup } from '@tulipfarm/sprout/message';
import {
  MessageActions,
  MessageBranch,
  type MessageActionsAuthor,
  type MessageFeedback,
} from '@tulipfarm/sprout/message-actions';
import { MessageResponse } from '@tulipfarm/sprout/message-response';
import { Switch } from '@tulipfarm/sprout/switch';
import { ToggleGroup, ToggleGroupItem } from '@tulipfarm/sprout/toggle-group';
import '../styles/message-actions-demo.css';

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
    <section className="ma-demo-frame" aria-label={title} data-recipe={id}>
      <div className="ma-demo-bar">
        <div className="ma-demo-bar-text">
          <span className="ma-demo-bar-title">{title}</span>
          {note && <span className="ma-demo-note">{note}</span>}
        </div>
        {controls && <div className="ma-demo-controls">{controls}</div>}
      </div>
      <div className="ma-demo-body">{children}</div>
    </section>
  );
}

function Segmented<Value extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: Value;
  items: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <ToggleGroup
      aria-label={label}
      size="sm"
      variant="outline"
      value={[value]}
      onValueChange={next => {
        const picked = items.find(item => item.value === next[0]);
        if (picked) onChange(picked.value);
      }}
    >
      {items.map(item => (
        <ToggleGroupItem key={item.value} value={item.value}>
          {item.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="ma-demo-switch">
      <Switch size="sm" aria-label={label} checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}

/* Sample data ---------------------------------------------------------------- */

function at(daysAgo: number, hour: number, minute: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour, minute).toISOString();
}

const ordersQuestion = 'Which March orders are missing from the warehouse export?';

const ordersReply = `Three of the **1,284** March orders are missing from the warehouse export:

- \`SO-1042\` — Northwind, $2,140
- \`SO-1077\` — Meadow Supply, $860
- \`SO-1103\` — Alder & Co, $1,315

All three were created on March 28, after the export ran. See [the reconciliation sheet](https://example.com/sheets/march-recon) for the full match.`;

const versions = [
  ordersReply,
  `I matched the March orders against the warehouse export. **3** orders are missing: \`SO-1042\`, \`SO-1077\`, and \`SO-1103\`. Each was created after the March 28 export, so they should appear in the April file.`,
  `Short answer: \`SO-1042\`, \`SO-1077\`, and \`SO-1103\`. Every other March order (1,281 of 1,284) is in the export.`,
];

const handoff = `## Handoff

**Goal:** reconcile March orders with the warehouse export.

- 1,284 orders matched; **3** are missing from the warehouse.
- Missing: \`SO-1042\`, \`SO-1077\`, \`SO-1103\`.

Next: ask Robin whether the three were cancelled. Notes are in [the reconciliation sheet](https://example.com/sheets/march-recon).`;

function feedbackLabel(feedback: MessageFeedback | null) {
  return feedback === 'up' ? 'Rated helpful.' : feedback === 'down' ? 'Rated unhelpful.' : 'No rating yet.';
}

/** A ghost bubble with the Markdown reply, as Cloud renders assistant text. */
function AssistantText({ text }: { text: string }) {
  return (
    <MessageBubble variant="ghost">
      <MessageResponse>{text}</MessageResponse>
    </MessageBubble>
  );
}

function HumanText({ text }: { text: string }) {
  return (
    <MessageBubble variant="secondary">
      <p className="ma-demo-plain">{text}</p>
    </MessageBubble>
  );
}

/** Reads the rendered bubbles, so pasting into a doc keeps bold, code, and links. */
function bubbleHtml(entry: HTMLElement | null) {
  const parts = entry?.querySelectorAll('[data-slot=message-bubble]');
  return parts?.length ? [...parts].map(part => part.innerHTML).join('') : undefined;
}

/* Playground ----------------------------------------------------------------- */

export function MessageActionsPlayground() {
  const [author, setAuthor] = useState<MessageActionsAuthor>('assistant');
  const [time, setTime] = useState(true);
  const [rating, setRating] = useState(true);
  const [regenerate, setRegenerate] = useState(true);
  const [hover, setHover] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [feedback, setFeedback] = useState<MessageFeedback | null>(null);
  const [status, setStatus] = useState('No action yet.');
  const assistant = author === 'assistant';
  return (
    <Frame
      id="playground"
      title="Playground"
      note="Each option maps to one prop. Copy writes this sample text to your clipboard."
      controls={
        <>
          <Segmented
            label="Author"
            value={author}
            items={[
              { value: 'assistant', label: 'Assistant' },
              { value: 'human', label: 'Human' },
            ]}
            onChange={setAuthor}
          />
          <Toggle label="Time" checked={time} onChange={setTime} />
          {assistant && <Toggle label="Feedback" checked={rating} onChange={setRating} />}
          {assistant && <Toggle label="Regenerate" checked={regenerate} onChange={setRegenerate} />}
          <Toggle label="Reveal on hover" checked={hover} onChange={setHover} />
          <Toggle label="Disabled" checked={disabled} onChange={setDisabled} />
        </>
      }
    >
      <div className="ma-demo-chat" data-testid="playground">
        <Message align={assistant ? 'start' : 'end'}>
          <MessageContent>
            {assistant ? <AssistantText text={ordersReply} /> : <HumanText text={ordersQuestion} />}
            <MessageActions
              key={author}
              text={assistant ? ordersReply : ordersQuestion}
              author={author}
              createdAt={time ? at(0, 9, 41) : undefined}
              hover={hover}
              disabled={disabled}
              feedback={feedback}
              onFeedback={
                assistant && rating
                  ? next => {
                      setFeedback(next);
                      setStatus(feedbackLabel(next));
                    }
                  : undefined
              }
              onRetry={assistant && regenerate ? () => setStatus('Regenerate requested.') : undefined}
            />
          </MessageContent>
        </Message>
        <p className="ma-demo-status" role="status" data-testid="playground-status">
          {status}
        </p>
      </div>
    </Frame>
  );
}

/* Private conversation ------------------------------------------------------- */

export function MessageActionsConversation() {
  const human = useRef<HTMLDivElement>(null);
  const assistant = useRef<HTMLDivElement>(null);
  return (
    <Frame
      id="conversation"
      title="Conversation"
      note="Actions appear when you hover a message or tab into it. Copy keeps the formatting from the bubble."
    >
      <div className="ma-demo-chat" data-testid="conversation">
        <MessageGroup>
          <Message align="end">
            <MessageContent ref={human}>
              <HumanText text={ordersQuestion} />
              <MessageActions
                text={ordersQuestion}
                author="human"
                createdAt={at(0, 9, 40)}
                hover
                html={() => bubbleHtml(human.current)}
              />
            </MessageContent>
          </Message>
          <Message align="start">
            <MessageContent ref={assistant}>
              <span className="ma-demo-sr-only">TulipFarm said</span>
              <AssistantText text={ordersReply} />
              <MessageActions
                text={ordersReply}
                author="assistant"
                createdAt={at(0, 9, 41)}
                hover
                html={() => bubbleHtml(assistant.current)}
              />
            </MessageContent>
          </Message>
        </MessageGroup>
      </div>
    </Frame>
  );
}

/* Times ---------------------------------------------------------------------- */

export function MessageActionsTimes() {
  const now = new Date();
  const rows = [
    {
      label: 'Today',
      text: 'Sent the April forecast to Robin.',
      createdAt: at(0, 8, 5),
    },
    {
      label: 'Yesterday',
      text: 'Can you draft the supplier email?',
      createdAt: at(1, 16, 30),
    },
    {
      label: 'This year',
      text: 'Pull last quarter’s refunds by region.',
      createdAt: new Date(now.getFullYear(), 0, 3, 11, 20).toISOString(),
    },
    {
      label: 'Earlier year',
      text: 'Summarize the onboarding survey.',
      createdAt: new Date(now.getFullYear() - 1, 10, 18, 14, 5).toISOString(),
    },
  ];
  return (
    <Frame
      id="times"
      title="Send time"
      note="Today shows the time, then Yesterday, then the date. Hover a time for the full date."
    >
      <dl className="ma-demo-times" data-testid="times">
        {rows.map(row => (
          <div key={row.label} className="ma-demo-time-row">
            <dt>{row.label}</dt>
            <dd>
              <MessageActions text={row.text} author="human" createdAt={row.createdAt} />
            </dd>
          </div>
        ))}
      </dl>
    </Frame>
  );
}

/* Versions ------------------------------------------------------------------- */

export function MessageActionsVersions() {
  const [count, setCount] = useState(2);
  const [index, setIndex] = useState(1);
  const [ratings, setRatings] = useState<(MessageFeedback | null)[]>([null, 'up', null]);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      setCount(value => Math.min(value + 1, versions.length));
      setIndex(Math.min(count, versions.length - 1));
      setPending(false);
    }, 900);
    return () => clearTimeout(timer);
  }, [pending, count]);
  const text = versions[index]!;
  return (
    <Frame
      id="versions"
      title="Regenerate and versions"
      note="Regenerate writes another version. Step between them; each keeps its own rating."
    >
      <div className="ma-demo-chat" data-testid="versions">
        <Message align="start">
          <MessageContent>
            <AssistantText text={pending ? 'Writing another version…' : text} />
            <div className="ma-demo-version-row">
              <MessageBranch index={index} total={count} onChange={setIndex} />
              <MessageActions
                key={index}
                text={text}
                createdAt={at(0, 9, 41 + index)}
                disabled={pending}
                feedback={ratings[index] ?? null}
                onFeedback={next => setRatings(all => all.map((value, i) => (i === index ? next : value)))}
                onRetry={count < versions.length ? () => setPending(true) : undefined}
              />
            </div>
          </MessageContent>
        </Message>
      </div>
    </Frame>
  );
}

/* Handoff -------------------------------------------------------------------- */

function HandoffBody() {
  return (
    <section aria-label="Handoff" className="ma-demo-stack">
      <div className="ma-demo-panel">
        <MessageResponse>{handoff}</MessageResponse>
      </div>
      <MessageActions text={handoff} />
      <p className="ma-demo-hint">Instructions: Keep it short and list the open order numbers.</p>
    </section>
  );
}

export function MessageActionsHandoff() {
  const [open, setOpen] = useState(false);
  return (
    <Frame
      id="handoff"
      title="Compaction handoff"
      note="Copy only, with no time or rating, under a written handoff."
      controls={
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Open handoff
        </Button>
      }
    >
      <div data-testid="handoff">
        <HandoffBody />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="form">
          <DialogHeader>
            <DialogTitle>Conversation handoff</DialogTitle>
            <DialogDescription>
              A summary to continue this work elsewhere. The model keeps its own working summary.
            </DialogDescription>
          </DialogHeader>
          <div className="ma-demo-dialog-body">
            <HandoffBody />
          </div>
        </DialogContent>
      </Dialog>
    </Frame>
  );
}

/* States --------------------------------------------------------------------- */

/** Sample adapter: makes the browser clipboard refuse writes while chosen. */
function useBlockedClipboard(blocked: boolean) {
  useEffect(() => {
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
    if (!blocked || !clipboard) return;
    const refuse = () => Promise.reject(new DOMException('Clipboard blocked', 'NotAllowedError'));
    Object.defineProperty(clipboard, 'write', {
      value: refuse,
      configurable: true,
    });
    Object.defineProperty(clipboard, 'writeText', {
      value: refuse,
      configurable: true,
    });
    return () => {
      delete (clipboard as unknown as Record<string, unknown>).write;
      delete (clipboard as unknown as Record<string, unknown>).writeText;
    };
  }, [blocked]);
}

export function MessageActionsStates() {
  const [clipboard, setClipboard] = useState<'allowed' | 'blocked'>('allowed');
  const [attempt, setAttempt] = useState(0);
  useBlockedClipboard(clipboard === 'blocked');
  return (
    <Frame
      id="states"
      title="States"
      note="Disabled while a reply is running, and the message shown when the clipboard refuses a copy."
      controls={
        <Segmented
          label="Clipboard"
          value={clipboard}
          items={[
            { value: 'allowed', label: 'Allowed' },
            { value: 'blocked', label: 'Blocked' },
          ]}
          onChange={next => {
            setClipboard(next);
            setAttempt(value => value + 1);
          }}
        />
      }
    >
      <div className="ma-demo-states">
        <div className="ma-demo-state" data-testid="state-disabled">
          <span className="ma-demo-state-label">Reply running</span>
          <MessageActions
            text={ordersReply}
            createdAt={at(0, 9, 41)}
            disabled
            feedback="up"
            onFeedback={() => {}}
            onRetry={() => {}}
          />
        </div>
        <div className="ma-demo-state" data-testid="state-disabled-copy">
          <span className="ma-demo-state-label">Copy only, disabled</span>
          <MessageActions text={handoff} disabled />
        </div>
        <div className="ma-demo-state" data-testid="state-copy">
          <span className="ma-demo-state-label">{clipboard === 'blocked' ? 'Clipboard blocked' : 'Copy'}</span>
          <MessageActions key={attempt} text={ordersReply} createdAt={at(0, 9, 41)} />
        </div>
      </div>
    </Frame>
  );
}
