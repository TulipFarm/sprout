import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowUp } from 'reicon-react/icons/ArrowUp';
import { Check } from 'reicon-react/icons/Check';
import { Copy } from 'reicon-react/icons/Copy';
import { Danger } from 'reicon-react/icons/Danger';
import { Database } from 'reicon-react/icons/Database';
import { Plus } from 'reicon-react/icons/Plus';
import { Refresh } from 'reicon-react/icons/Refresh';
import { FileTypeIcon } from '@tulipfarm/sprout/attachment';
import { Avatar, AvatarFallback } from '@tulipfarm/sprout/avatar';
import { Badge } from '@tulipfarm/sprout/badge';
import { Button } from '@tulipfarm/sprout/button';
import {
  Message,
  MessageAvatar,
  MessageBubble,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
  MessageReactions,
  type MessageAlign,
  type MessageBubbleVariant,
  type MessageReactionsSide,
} from '@tulipfarm/sprout/message';
import { Spinner } from '@tulipfarm/sprout/spinner';
import { Textarea } from '@tulipfarm/sprout/textarea';
import { ToggleGroup, ToggleGroupItem } from '@tulipfarm/sprout/toggle-group';
import '../styles/message-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="message-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="message-demo-card-body">{children}</div>
    </section>
  );
}

/** A message row with no avatar or meta lines, for examples about the bubble itself. */
function Row({ align, children }: { align: MessageAlign; children: ReactNode }) {
  return (
    <Message align={align}>
      <MessageContent>{children}</MessageContent>
    </Message>
  );
}

function IncomingOutgoing() {
  return (
    <Example
      title="Incoming and outgoing"
      description='align="start" for others, align="end" for you. Bubbles follow the row, and consecutive bubbles from one sender share one MessageContent, 10px apart. The avatar sits beside the last bubble, above the footer.'
    >
      <MessageGroup data-testid="incoming-outgoing">
        <Message align="start" data-testid="message-start">
          <MessageAvatar>
            <Avatar>
              <AvatarFallback>AM</AvatarFallback>
            </Avatar>
          </MessageAvatar>
          <MessageContent>
            <MessageHeader>Alex Meadow · 10:30</MessageHeader>
            <MessageBubble variant="secondary">
              Can you help plan the spring planting for the Meadow project?
            </MessageBubble>
            <MessageFooter>Delivered</MessageFooter>
          </MessageContent>
        </Message>
        <Message align="end" data-testid="message-end">
          <MessageContent>
            <MessageHeader>Garden assistant</MessageHeader>
            <MessageBubble>Yes. Let’s start with the planting list.</MessageBubble>
            <MessageBubble>Tomatoes and basil go in the south bed. Lettuce goes in the shade.</MessageBubble>
            <MessageFooter>Read · 10:31</MessageFooter>
          </MessageContent>
        </Message>
      </MessageGroup>
    </Example>
  );
}

const variants: {
  variant: MessageBubbleVariant;
  align: MessageAlign;
  use: string;
  text: string;
}[] = [
  {
    variant: 'default',
    align: 'end',
    use: 'Your outgoing message',
    text: "Send the investor update to Priya once it's approved.",
  },
  {
    variant: 'secondary',
    align: 'end',
    use: 'Prompts sent to the agent',
    text: 'Create a Customers table with Name, Email, Company, Phone, and Status.',
  },
  {
    variant: 'muted',
    align: 'start',
    use: 'Quiet system notes',
    text: 'Plan only · no setup actions were taken.',
  },
  {
    variant: 'tinted',
    align: 'start',
    use: 'Highlighted suggestions, follows the brand',
    text: 'Tip: mention a table with @ to answer from its rows.',
  },
  {
    variant: 'outline',
    align: 'start',
    use: 'Quoted or forwarded text',
    text: 'Forwarded from #engineering: the deploy window moves to 4pm.',
  },
  {
    variant: 'ghost',
    align: 'start',
    use: 'Agent answers, full width without a fill',
    text: 'Here are the changes for your review. Name is required. Email, Company, and Phone are optional.',
  },
  {
    variant: 'destructive',
    align: 'end',
    use: 'A message that failed to send',
    text: "Couldn't send. Your message is saved as a draft.",
  },
];

function Variants() {
  return (
    <Example
      title="Bubble variants"
      description="Seven fills in one size. Each is shown on the side it is used: prompts and your messages on the end, notes and answers on the start."
    >
      <div className="message-demo-variants">
        {variants.map(({ variant, align, use, text }) => (
          <div key={variant} className="message-demo-variant" data-testid={`variant-${variant}`}>
            <div className="message-demo-variant-text">
              <code>{`variant="${variant}"`}</code>
              <span>{use}</span>
            </div>
            <div className="message-demo-thread">
              <Row align={align}>
                <MessageBubble variant={variant}>{text}</MessageBubble>
              </Row>
            </div>
          </div>
        ))}
      </div>
    </Example>
  );
}

const placements: {
  side: MessageReactionsSide;
  align: MessageAlign;
  variant: MessageBubbleVariant;
  text: string;
  reaction: string;
}[] = [
  {
    side: 'bottom',
    align: 'start',
    variant: 'secondary',
    text: 'Hello from Alex. The beds are ready for planting.',
    reaction: '🌱 2',
  },
  {
    side: 'top',
    align: 'end',
    variant: 'default',
    text: 'The garden plan is ready.',
    reaction: '✓ 1',
  },
  {
    side: 'top',
    align: 'start',
    variant: 'muted',
    text: 'Weekly digest sent to 14 people.',
    reaction: '👀 4',
  },
  {
    side: 'bottom',
    align: 'end',
    variant: 'tinted',
    text: 'Approved. Ship the Customers table.',
    reaction: '🎉 3',
  },
];

const initialReactions = [
  { emoji: '👍', label: 'Thumbs up', count: 3, pressed: true },
  { emoji: '🎉', label: 'Party', count: 1, pressed: false },
];

function Reactions() {
  const [reactions, setReactions] = useState(initialReactions);
  return (
    <Example
      title="Reactions"
      description="Reactions sit on the top or bottom edge, 12px in from the start or end corner. Buttons inside become toggles. The ring matches this card's background through --sprout-message-reactions-ring."
    >
      <div className="message-demo-reactions">
        {placements.map(item => (
          <div
            key={`${item.side}-${item.align}`}
            className="message-demo-thread"
            data-testid={`reaction-${item.side}-${item.align}`}
          >
            <code className="message-demo-code">{`side="${item.side}" align="${item.align}"`}</code>
            <Row align={item.align}>
              <MessageBubble
                variant={item.variant}
                reactions={
                  <MessageReactions side={item.side} align={item.align}>
                    {item.reaction}
                  </MessageReactions>
                }
              >
                {item.text}
              </MessageBubble>
            </Row>
          </div>
        ))}
        <div className="message-demo-thread" data-testid="reaction-buttons">
          <code className="message-demo-code">Reaction toggles</code>
          <Row align="start">
            <MessageBubble
              variant="secondary"
              reactions={
                <MessageReactions align="start">
                  {reactions.map((reaction, index) => (
                    <button
                      key={reaction.emoji}
                      type="button"
                      aria-pressed={reaction.pressed}
                      aria-label={`${reaction.label}, ${reaction.count}`}
                      onClick={() =>
                        setReactions(items =>
                          items.map((item, at) =>
                            at === index
                              ? {
                                  ...item,
                                  pressed: !item.pressed,
                                  count: item.count + (item.pressed ? -1 : 1),
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      <span aria-hidden="true">{reaction.emoji}</span>
                      <span aria-hidden="true">{reaction.count}</span>
                    </button>
                  ))}
                </MessageReactions>
              }
            >
              Status can be Prospect, Active, or Inactive. Should I add Churned?
            </MessageBubble>
          </Row>
        </div>
      </div>
    </Example>
  );
}

function LinksAndButtons() {
  const [failed, setFailed] = useState(true);
  const [picked, setPicked] = useState(false);
  return (
    <Example
      title="Links and buttons"
      description="render turns the bubble into a link or button. It keeps the fill, darkens on hover, and shows a focus ring for the keyboard."
    >
      <div className="message-demo-thread" data-testid="interactive">
        <Row align="start">
          <MessageBubble variant="outline" render={<a href="#investor-update" />}>
            Open result · Investor update draft
          </MessageBubble>
          <MessageBubble
            variant="tinted"
            render={<button type="button" />}
            aria-pressed={picked}
            onClick={() => setPicked(value => !value)}
          >
            {picked ? '✓ Showing overdue tasks' : 'Suggested: show overdue tasks'}
          </MessageBubble>
        </Row>
        <Row align="end">
          {failed ? (
            <MessageBubble variant="destructive" render={<button type="button" />} onClick={() => setFailed(false)}>
              <span className="message-demo-inline">
                <Refresh aria-hidden="true" />
                Couldn't send "Notify #engineering". Retry
              </span>
            </MessageBubble>
          ) : (
            <MessageBubble variant="secondary">Notify #engineering whenever a pull request is opened.</MessageBubble>
          )}
        </Row>
      </div>
    </Example>
  );
}

type Turn = { kind: 'prompt'; text: string } | { kind: 'answer'; text: string };

const opening: Turn[] = [
  {
    kind: 'prompt',
    text: 'Create a Customers table with Name, Email, Company, Phone, and Status.',
  },
  {
    kind: 'answer',
    text: 'Here are the changes for your review. Name is required. Email, Company, and Phone are optional. Status can be Prospect, Active, or Inactive.',
  },
];

function Conversation() {
  const [turns, setTurns] = useState<Turn[]>(opening);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const timeline = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      setTurns(items => [
        ...items,
        { kind: 'prompt', text: pending },
        {
          kind: 'answer',
          text: "Done. I updated the plan. Review the changes when you're ready.",
        },
      ]);
      setPending(null);
    }, 700);
    return () => clearTimeout(timer);
  }, [pending]);

  useEffect(() => {
    const node = timeline.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [turns, pending]);

  function send(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;
    setPending(text);
    setDraft('');
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  const groups: Turn[][] = [];
  for (const turn of turns) {
    const last = groups.at(-1);
    if (last && last[0]!.kind === turn.kind) last.push(turn);
    else groups.push([turn]);
  }

  return (
    <Example
      title="Conversation"
      description="Prompts are secondary bubbles on the end. Answers are ghost bubbles on the start, with cards and actions beside them. Consecutive prompts share one MessageContent. Enter sends, Shift+Enter adds a line."
    >
      <div className="message-demo-chat">
        <div
          ref={timeline}
          role="region"
          aria-label="Conversation"
          tabIndex={0}
          className="message-demo-timeline"
          data-testid="conversation"
        >
          {turns.length === 0 && !pending ? (
            <p className="message-demo-empty">No messages yet. Ask about a table, a file, or a workflow.</p>
          ) : (
            <ol className="message-demo-turns">
              {groups.map((group, index) => (
                <li key={index}>
                  {group[0]!.kind === 'prompt' ? (
                    <Row align="end">
                      {group.map((turn, at) => (
                        <MessageBubble key={at} variant="secondary">
                          <p className="message-demo-prose">{turn.text}</p>
                        </MessageBubble>
                      ))}
                    </Row>
                  ) : (
                    group.map((turn, at) => (
                      <Message key={at} align="start">
                        <MessageContent>
                          <span className="message-demo-sr">TulipFarm said</span>
                          <MessageBubble variant="ghost">
                            <p className="message-demo-prose">{turn.text}</p>
                          </MessageBubble>
                          {index === 1 && at === 0 && (
                            <div className="message-demo-change">
                              <Database size={18} aria-hidden="true" />
                              <div>
                                <p className="message-demo-change-title">Customers</p>
                                <p className="message-demo-change-meta">1 new table · No rows added</p>
                              </div>
                              <Button variant="outline" size="sm">
                                Review changes
                              </Button>
                            </div>
                          )}
                        </MessageContent>
                      </Message>
                    ))
                  )}
                </li>
              ))}
              {pending && (
                <li aria-busy="true" className="message-demo-pending">
                  <Row align="end">
                    <MessageBubble variant="secondary">
                      <p className="message-demo-prose">{pending}</p>
                    </MessageBubble>
                  </Row>
                  <p className="message-demo-thinking" role="status">
                    <Spinner size="sm" aria-hidden="true" />
                    Thinking…
                  </p>
                </li>
              )}
            </ol>
          )}
        </div>
        <form className="message-demo-composer" onSubmit={send}>
          <Textarea
            aria-label="Message"
            placeholder="Ask for a change…"
            rows={1}
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={keyDown}
          />
          <div className="message-demo-composer-actions">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!turns.length || !!pending}
              onClick={() => setTurns([])}
            >
              Clear
            </Button>
            <Button type="submit" size="icon-sm" aria-label="Send message" disabled={!draft.trim() || !!pending}>
              <ArrowUp aria-hidden="true" />
            </Button>
          </div>
        </form>
      </div>
    </Example>
  );
}

function FileReference({ name, mediaType }: { name: string; mediaType: string }) {
  return (
    <a className="message-demo-file" href={`#${name}`}>
      <FileTypeIcon name={name} mediaType={mediaType} />
      <span>{name}</span>
    </a>
  );
}

function RichMessages() {
  const entry = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    const parts = entry.current?.querySelectorAll('[data-slot="message-bubble"]');
    const text = [...(parts ?? [])].map(part => (part as HTMLElement).innerText.trim()).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
  }

  return (
    <Example
      title="Rich messages"
      description="Bubbles hold any content: a skill chip above, file references inline, multi-line text that keeps its breaks, and long links that wrap instead of overflowing."
    >
      <div className="message-demo-rich">
        <Message align="end">
          <MessageContent>
            <Badge variant="secondary">/weekly-report</Badge>
            <MessageBubble variant="secondary">
              <p className="message-demo-prose">
                {'Summarise '}
                <FileReference
                  name="Q3 pipeline.xlsx"
                  mediaType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                />
                {
                  ' for the team.\nKeep it under 200 words.\nhttps://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0'
                }
              </p>
            </MessageBubble>
          </MessageContent>
        </Message>
        <Message align="start">
          <MessageContent ref={entry} data-testid="rich-answer">
            <span className="message-demo-sr">TulipFarm said</span>
            <MessageBubble variant="ghost">
              <div className="message-demo-markdown">
                <p>
                  <strong>Q3 pipeline</strong> closed at $1.2M across 38 deals.
                </p>
                <ul>
                  <li>Enterprise grew 22%, led by Northwind and Contoso.</li>
                  <li>
                    Two deals slipped to Q4; see <code>stage = "Negotiation"</code>.
                  </li>
                </ul>
                <p>Want me to post this to #sales?</p>
              </div>
            </MessageBubble>
            <p className="message-demo-footnote">Plan only · no setup actions</p>
            <div className="message-demo-copy">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={copied === 'copied' ? 'Copied' : 'Copy message'}
                onClick={copy}
              >
                {copied === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              </Button>
              <span role="status" className="message-demo-footnote">
                {copied === 'copied' ? 'Copied' : copied === 'failed' ? "Couldn't copy" : ''}
              </span>
            </div>
          </MessageContent>
        </Message>
      </div>
    </Example>
  );
}

const onboarding = [
  {
    role: 'assistant',
    content: 'Hi! What should we call your workspace?',
  },
  { role: 'user', content: 'Meadow Growers' },
  {
    role: 'assistant',
    content: 'Nice. What will your team use TulipFarm for first?',
  },
  {
    role: 'user',
    content:
      'Tracking our wholesale orders and keeping the greenhouse schedule in one place.\nWe also want reminders before deliveries.',
  },
] as const;

function OnboardingHistory() {
  return (
    <Example
      title="Saved onboarding chat"
      description="A header names each speaker. Plain content without a slot keeps its own width, so the user's text can span the row."
    >
      <MessageGroup data-testid="onboarding">
        {onboarding.map((message, index) => (
          <Message key={index} align={message.role === 'user' ? 'end' : 'start'}>
            <MessageContent>
              <MessageHeader>{message.role === 'user' ? 'You' : 'TulipFarm guide'}</MessageHeader>
              <div
                className={message.role === 'user' ? 'message-demo-onboarding-user' : 'message-demo-onboarding-guide'}
              >
                <p>{message.content}</p>
              </div>
            </MessageContent>
          </Message>
        ))}
        <Message>
          <MessageContent>
            <MessageHeader>TulipFarm guide</MessageHeader>
            <p className="message-demo-onboarding-close">You are signed in. Let’s finish setting up Meadow Growers.</p>
          </MessageContent>
        </Message>
      </MessageGroup>
    </Example>
  );
}

function GhostContent() {
  return (
    <Example
      title="Ghost bubbles"
      description='When content holds a direct child with data-variant="ghost", the header and footer drop their 12px inset to line up with the text.'
    >
      <div className="message-demo-ghost">
        <Message data-testid="ghost-message">
          <MessageContent>
            <MessageHeader>TulipFarm · Ghost</MessageHeader>
            <MessageBubble variant="ghost">
              Your three greenhouse beds are booked for Tuesday. I moved the tulip delivery to Wednesday morning.
            </MessageBubble>
            <MessageFooter>Answered in 4s</MessageFooter>
          </MessageContent>
        </Message>
        <Message data-testid="filled-message">
          <MessageContent>
            <MessageHeader>TulipFarm · Secondary</MessageHeader>
            <MessageBubble variant="secondary">Your three greenhouse beds are booked for Tuesday.</MessageBubble>
            <MessageFooter>Answered in 2s</MessageFooter>
          </MessageContent>
        </Message>
      </div>
    </Example>
  );
}

type ReplyStatus = 'queued' | 'working' | 'failed';

const replyLabels: Record<ReplyStatus, string> = {
  queued: 'Queued',
  working: 'Writing a reply…',
  failed: 'The reply didn’t finish.',
};

function ReplyStatusDemo() {
  const [status, setStatus] = useState<ReplyStatus>('failed');
  const [note, setNote] = useState('');
  return (
    <Example
      title="Reply status"
      description="The footer carries the reply state: queued, working with aria-busy, or failed with a reason and buttons."
    >
      <ToggleGroup
        aria-label="Reply status"
        size="sm"
        variant="outline"
        spacing={0}
        value={[status]}
        onValueChange={next => next[0] && setStatus(next[0] as ReplyStatus)}
      >
        <ToggleGroupItem value="queued">Queued</ToggleGroupItem>
        <ToggleGroupItem value="working">Working</ToggleGroupItem>
        <ToggleGroupItem value="failed">Failed</ToggleGroupItem>
      </ToggleGroup>
      <div className="message-demo-transcript" data-testid="reply-status">
        <Message align="end">
          <MessageContent>
            <MessageBubble variant="secondary">Summarise this week’s wholesale orders by customer.</MessageBubble>
            <MessageFooter>
              <div className="message-demo-footer-stack">
                {status === 'failed' ? (
                  <p role="status" className="message-demo-failed">
                    <Danger size={14} aria-hidden="true" />
                    {replyLabels.failed}
                  </p>
                ) : (
                  <p role="status">{replyLabels[status]}</p>
                )}
                {status === 'failed' && (
                  <>
                    <p role="alert" className="message-demo-reason">
                      The model provider could not complete the reply. Retry uses the original model.
                    </p>
                    <div className="message-demo-actions">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setStatus('working');
                          setNote('Retry requested.');
                        }}
                      >
                        Retry reply
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setNote('Reply cancelled.')}>
                        Cancel reply
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </MessageFooter>
          </MessageContent>
        </Message>
        {status === 'working' && (
          <Message align="start" aria-busy="true" data-testid="busy-message">
            <MessageContent>
              <span className="message-demo-sr">TulipFarm said</span>
              <p className="message-demo-prose message-demo-streaming">
                <Spinner size="sm" />
                Reading 42 orders from the Orders table…
              </p>
            </MessageContent>
          </Message>
        )}
      </div>
      <p className="message-demo-note" aria-live="polite">
        {note}
      </p>
    </Example>
  );
}

function LongContent() {
  return (
    <Example title="Long content" description="Bubbles wrap long words and links instead of widening the row.">
      <MessageGroup data-testid="long-content">
        <Message align="end">
          <MessageContent>
            <MessageHeader>You</MessageHeader>
            <MessageBubble variant="secondary">
              Use the export at
              https://files.example.com/meadow-growers/exports/wholesale-orders-2026-10-12-final-reviewed.csv for the
              October report.
            </MessageBubble>
          </MessageContent>
        </Message>
        <Message align="start">
          <MessageAvatar>
            <Avatar>
              <AvatarFallback>TF</AvatarFallback>
            </Avatar>
          </MessageAvatar>
          <MessageContent>
            <MessageHeader>
              <span className="message-demo-truncate">
                TulipFarm · Wholesale orders assistant for Meadow Growers greenhouse operations
              </span>
            </MessageHeader>
            <MessageBubble variant="secondary">
              Done. wholesale-orders-2026-10-12-final-reviewed.csv has 128 rows across 14 customers.
            </MessageBubble>
          </MessageContent>
        </Message>
      </MessageGroup>
    </Example>
  );
}

function ScrollableHistory() {
  const [count, setCount] = useState(6);
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = viewport.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [count]);
  return (
    <Example
      title="Scrollable history"
      description="Put messages in your own scroll region. Default and secondary bubbles alternate, and adding one keeps the newest in view."
    >
      <div className="message-demo-history-tools">
        <Button variant="outline" size="sm" onClick={() => setCount(count + 1)}>
          <Plus aria-hidden="true" />
          Add message
        </Button>
        <span className="message-demo-footnote">{count} messages</span>
      </div>
      <div
        ref={viewport}
        role="region"
        aria-label="Message history"
        tabIndex={0}
        className="message-demo-scroller"
        data-testid="history"
      >
        <MessageGroup>
          {Array.from({ length: count }, (_, index) => (
            <Message key={index} align={index % 2 ? 'end' : 'start'}>
              <MessageContent>
                <MessageHeader>{index % 2 ? 'You' : 'Alex Meadow'}</MessageHeader>
                <MessageBubble variant={index % 2 ? 'default' : 'secondary'}>
                  {index % 2 ? `Moved bed ${index + 1} to the shade list.` : `Bed ${index + 1} gets six hours of sun.`}
                </MessageBubble>
                <MessageFooter>{`10:${String(30 + index).padStart(2, '0')}`}</MessageFooter>
              </MessageContent>
            </Message>
          ))}
        </MessageGroup>
      </div>
    </Example>
  );
}

export default function MessageDemo() {
  return (
    <div id="message-demo" className="message-demo">
      <IncomingOutgoing />
      <Variants />
      <Reactions />
      <LinksAndButtons />
      <Conversation />
      <RichMessages />
      <OnboardingHistory />
      <GhostContent />
      <ReplyStatusDemo />
      <LongContent />
      <ScrollableHistory />
    </div>
  );
}
