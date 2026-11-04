import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft } from 'reicon-react/icons/ArrowLeft';
import { Database } from 'reicon-react/icons/Database';
import { FileText } from 'reicon-react/icons/FileText';
import { Globe } from 'reicon-react/icons/Globe';
import { Laptop } from 'reicon-react/icons/Laptop';
import { MoreH } from 'reicon-react/icons/MoreH';
import { Plus } from 'reicon-react/icons/Plus';
import { AgentAvatar } from '@tulipfarm/sprout/agent-avatar';
import { FileAttachment, type AttachmentFile } from '@tulipfarm/sprout/attachment';
import { BrandIcon } from '@tulipfarm/sprout/brand-icon';
import { Button } from '@tulipfarm/sprout/button';
import { ChatInput, type ChatInputStatus } from '@tulipfarm/sprout/chat-input';
import { ChatPlan, type ChatPlanStep } from '@tulipfarm/sprout/chat-plan';
import { ChatSources, InlineCitation, type ChatSource } from '@tulipfarm/sprout/chat-sources';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tulipfarm/sprout/dropdown-menu';
import { Message, MessageBubble, MessageContent } from '@tulipfarm/sprout/message';
import { MessageActions, type MessageActionsStats, type MessageFeedback } from '@tulipfarm/sprout/message-actions';
import { MessageResponse } from '@tulipfarm/sprout/message-response';
import { MessageRichText, type MessageRichTextReference } from '@tulipfarm/sprout/message-rich-text';
import { FileRenderersProvider } from '@tulipfarm/sprout/file-viewer';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@tulipfarm/sprout/message-scroller';
import { PromptList } from '@tulipfarm/sprout/prompt-list';
import { keywordAccounts, type RichTextKeyword, type RichTextValue } from '@tulipfarm/sprout/rich-text-editor';
import { ToolActivity, type ToolActivityItem } from '@tulipfarm/sprout/tool-activity';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@tulipfarm/sprout/tooltip';
import { agents, fileSuggestions, icon, models, modes, ready, search, skills, useIntegrations } from './ChatInputDemo';
import { renderers } from './FileViewerDemo';
import HeaderTools from './HeaderTools';
import '../styles/chat-page-demo.css';

type Node = NonNullable<RichTextValue['content']>[number];

const referenceChars: Record<string, string> = { agent: '@', skill: '/', file: '#' };

const emptyDoc = (): RichTextValue => ({ type: 'doc', content: [{ type: 'paragraph' }] });
const text = (value: string): Node => ({ type: 'text', text: value });
const referenceSources = { agent: agents, skill: skills, file: fileSuggestions };
const suggestionFor = (kind: string, id: string) =>
  referenceSources[kind as keyof typeof referenceSources]?.find(item => item.id === id);
const resolveReference = ({ kind, id }: MessageRichTextReference) => suggestionFor(kind, id);
const reference = (kind: 'agent' | 'skill' | 'file', id: string, label: string): Node => ({
  type: 'chatReference',
  attrs: { kind, id, label, description: suggestionFor(kind, id)?.description ?? null },
});
const paragraph = (...content: Node[]): RichTextValue => ({ type: 'doc', content: [{ type: 'paragraph', content }] });

const forecastFile: AttachmentFile = {
  ...ready('Q3-forecast.csv', 'text/csv', '1 KB'),
  url: '/file-viewer-samples/q3-forecast.csv',
};

// The message as plain text, for copying.
function plainText(node: Node | RichTextValue): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'chatReference') {
    const attrs = node.attrs as { kind: string; label: string };
    return `${referenceChars[attrs.kind] ?? ''}${attrs.label}`;
  }
  if (node.type === 'hardBreak') return '\n';
  const inner = (node.content ?? []).map(plainText);
  return node.type === 'doc' ? inner.join('\n') : inner.join('');
}

interface HumanTurn {
  id: string;
  author: 'human';
  value: RichTextValue;
  /** The account each mentioned integration used when sent. */
  accounts?: Record<string, string>;
  attachments: AttachmentFile[];
  createdAt: string;
}

interface AssistantTurn {
  id: string;
  author: 'assistant';
  text: string;
  tools?: ToolActivityItem[];
  plan?: { title: string; steps: ChatPlanStep[] };
  sources?: ChatSource[];
  streaming?: boolean;
  createdAt: string;
  stats?: MessageActionsStats;
}

type Turn = HumanTurn | AssistantTurn;

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const sources: ChatSource[] = [
  {
    id: 'slack-ops',
    title: '#ops thread: Q3 forecast',
    location: 'Slack · #ops · Yesterday',
    excerpt: 'Harbor Glass pushed the October batch by two weeks. That moves about $48k of revenue into Q4.',
    href: 'https://slack.com/',
  },
  {
    id: 'github-212',
    title: 'Forecast model double-counts returns',
    location: 'GitHub · finance-models#212',
    excerpt: 'Returns are subtracted in both the weekly rollup and the quarterly view, so Q3 looks 3% low.',
    href: 'https://github.com/',
  },
];

const firstReply = `Here's where the **Q3 forecast** stands. Two things moved it this week.

### What changed

1. **Harbor Glass slipped two weeks.** About $48k of October revenue moves into Q4 [1](#source-1).
2. **The model double-counts returns.** Returns are subtracted twice, so Q3 reads about 3% low [2](#source-2).

| Line | Forecast | Adjusted | Change |
| --- | ---: | ---: | ---: |
| Wholesale | $412k | $364k | −$48k |
| Retail | $286k | $295k | +$9k |
| **Total** | **$698k** | **$659k** | **−$39k** |

The fix for the returns bug is a one-line change in \`rollup.sql\`:

\`\`\`sql
-- Count returns once, in the weekly rollup only
select week, sum(amount) - sum(returns) as net
from orders
group by week;
\`\`\`

Want me to draft a note for the #ops channel?`;

const planReply = `I'll turn this into a short plan. Nothing is posted until you approve the draft.`;

const initialTurns: Turn[] = [
  {
    id: 'h1',
    author: 'human',
    value: paragraph(
      reference('agent', 'researcher', 'Researcher'),
      text(
        ' what changed in the Q3 forecast this week? Check the Slack #ops channel and the GitHub issues, and compare against ',
      ),
      reference('file', 'Q3-forecast.csv', 'Q3-forecast.csv'),
      text('.'),
    ),
    attachments: [forecastFile],
    createdAt: minutesAgo(14),
  },
  {
    id: 'a1',
    author: 'assistant',
    text: firstReply,
    tools: [
      {
        id: 'slack',
        label: 'Searched Slack #ops',
        status: 'completed',
        visual: <BrandIcon brand="slack" size="inline" />,
      },
      {
        id: 'github',
        label: 'Read 3 GitHub issues',
        status: 'completed',
        visual: <BrandIcon brand="github" size="inline" />,
      },
      {
        id: 'sheet',
        label: 'Read Q3-forecast.csv',
        status: 'completed',
        visual: <Database size={14} />,
      },
    ],
    sources,
    createdAt: minutesAgo(13),
    stats: {
      model: 'Claude Opus 5.5',
      firstTokenMs: 2140,
      durationMs: 9820,
      inputTokens: 18_432,
      outputTokens: 412,
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    },
  },
  {
    id: 'h2',
    author: 'human',
    value: paragraph(
      reference('skill', 'prd', 'prd'),
      text(' turn this into a short plan, then draft the note for Slack. Keep it under 5 lines.'),
    ),
    attachments: [],
    createdAt: minutesAgo(9),
  },
  {
    id: 'a2',
    author: 'assistant',
    text: planReply,
    plan: {
      title: 'Update the Q3 forecast',
      steps: [
        { id: 'fix', title: 'Fix the returns double-count in rollup.sql', state: 'complete' },
        { id: 'move', title: 'Move the Harbor Glass batch to Q4', state: 'complete' },
        { id: 'draft', title: 'Draft the #ops note', state: 'running' },
        { id: 'post', title: 'Post to Slack after you approve', state: 'pending' },
      ],
    },
    createdAt: minutesAgo(8),
    stats: {
      model: 'Claude Opus 5.5',
      firstTokenMs: 1480,
      durationMs: 6310,
      inputTokens: 19_105,
      outputTokens: 286,
      traceId: '00f067aa0ba902b7c4e1f9a3d2b8e615',
    },
  },
];

const cannedReply = `This is a demo, so nothing was searched. A real reply streams here word by word, with **bold**, \`code\`, and lists:

- One point
- Another point`;

const suggestions = [
  { id: 'note', label: 'Draft the #ops note now', icon: <FileText size={16} aria-hidden="true" /> },
  { id: 'web', label: 'Check supplier news on the web', icon: <Globe size={16} aria-hidden="true" /> },
];

const history = [
  { id: 'q3', title: 'Q3 forecast changes', when: 'Today' },
  { id: 'late', title: 'Late supplier deliveries', when: 'Today' },
  { id: 'hire', title: 'Interview guide for ops lead', when: 'Yesterday' },
  { id: 'pricing', title: 'Pricing page review', when: 'Mon' },
  { id: 'okrs', title: 'Draft Q4 OKRs', when: 'Last week' },
];

function citationLink(turnSources: ChatSource[] | undefined) {
  return (href: string, children: ReactNode) => {
    const match = /^#source-(\d+)$/.exec(href);
    const source = match && turnSources?.[Number(match[1]) - 1];
    if (source) return <InlineCitation source={source} number={Number(match[1])} />;
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  };
}

function HumanMessage({ turn, keywords }: { turn: HumanTurn; keywords: readonly RichTextKeyword[] }) {
  const message = plainText(turn.value);
  return (
    <Message align="end">
      <MessageContent>
        {turn.attachments.map(file => (
          <FileAttachment key={file.id} file={file} variant="chip" viewable />
        ))}
        <MessageBubble variant="secondary">
          <MessageRichText
            value={turn.value}
            keywords={keywords}
            accounts={turn.accounts}
            resolveReference={resolveReference}
          />
        </MessageBubble>
        <MessageActions text={message} author="human" createdAt={turn.createdAt} hover />
      </MessageContent>
    </Message>
  );
}

function AssistantMessage({
  turn,
  feedback,
  onFeedback,
  onRetry,
}: {
  turn: AssistantTurn;
  feedback: MessageFeedback | null;
  onFeedback: (value: MessageFeedback | null) => void;
  onRetry: () => void;
}) {
  return (
    <Message>
      <MessageContent>
        {turn.tools && <ToolActivity items={turn.tools} active={turn.streaming} variant="transcript" />}
        {turn.plan && <ChatPlan title={turn.plan.title} steps={turn.plan.steps} />}
        {turn.text && (
          <MessageResponse streaming={turn.streaming} renderLink={citationLink(turn.sources)}>
            {turn.text}
          </MessageResponse>
        )}
        {turn.sources && <ChatSources sources={turn.sources} />}
        {!turn.streaming && (
          <MessageActions
            text={turn.text}
            createdAt={turn.createdAt}
            stats={turn.stats}
            feedback={feedback}
            onFeedback={onFeedback}
            onRetry={onRetry}
          />
        )}
      </MessageContent>
    </Message>
  );
}

function ChatHeader() {
  return (
    <header className="chat-page-header">
      <div className="chat-page-header-title">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                nativeButton={false}
                render={<a href="/" />}
                aria-label="Back to the docs"
              />
            }
          >
            <ArrowLeft size={16} aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="bottom">Back to the docs</TooltipContent>
        </Tooltip>
        <AgentAvatar agentId="bud" name="Bud" size="sm" />
        <h1>Q3 forecast changes</h1>
      </div>
      <div className="chat-page-header-actions">
        <HeaderTools />
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon-sm" aria-label="More chat actions" />}
                />
              }
            >
              <MoreH size={16} aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent side="bottom">More</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" size="menu">
            <DropdownMenuItem>Rename chat</DropdownMenuItem>
            <DropdownMenuItem>Copy link</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Delete chat</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function ChatHistory({ onNewChat }: { onNewChat: () => void }) {
  return (
    <nav className="chat-page-history" aria-label="Chats">
      <Button variant="outline" size="sm" onClick={onNewChat}>
        <Plus size={16} aria-hidden="true" />
        New chat
      </Button>
      <ul>
        {history.map((chat, index) => (
          <li key={chat.id}>
            <button type="button" aria-current={index === 0 ? 'page' : undefined}>
              <span>{chat.title}</span>
              <span className="chat-page-history-when">{chat.when}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ChatPageDemo() {
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [value, setValue] = useState<RichTextValue>(emptyDoc);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [status, setStatus] = useState<ChatInputStatus>('idle');
  const [model, setModel] = useState('claude-opus');
  const [mode, setMode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, MessageFeedback | null>>({});
  const integrations = useIntegrations(false);
  const picker = useRef<HTMLInputElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = () => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const updateLast = (change: (turn: AssistantTurn) => AssistantTurn) =>
    setTurns(current => {
      const last = current.at(-1);
      if (last?.author !== 'assistant') return current;
      return [...current.slice(0, -1), change(last)];
    });

  const reply = () => {
    const id = `a${Date.now()}`;
    const started = performance.now();
    const label = models.find(option => option.id === model)?.label ?? model;
    setStatus('streaming');
    setTurns(current => [
      ...current,
      {
        id,
        author: 'assistant',
        text: '',
        streaming: true,
        createdAt: new Date().toISOString(),
        tools: [{ id: 'think', label: 'Reading the chat', status: 'running', visual: <Database size={14} /> }],
      },
    ]);
    const words = cannedReply.split(/(?<=\s)/);
    timers.current.push(
      setTimeout(() => {
        updateLast(turn => ({ ...turn, tools: turn.tools?.map(tool => ({ ...tool, status: 'completed' })) }));
        words.forEach((_, index) =>
          timers.current.push(
            setTimeout(() => updateLast(turn => ({ ...turn, text: words.slice(0, index + 1).join('') })), index * 40),
          ),
        );
        timers.current.push(
          setTimeout(() => {
            const durationMs = Math.round(performance.now() - started);
            updateLast(turn => ({
              ...turn,
              streaming: false,
              stats: {
                model: label,
                firstTokenMs: 900,
                durationMs,
                inputTokens: 19_870,
                outputTokens: Math.round(words.length * 1.3),
                traceId: crypto.randomUUID().replaceAll('-', ''),
              },
            }));
            setStatus('idle');
          }, words.length * 40),
        );
      }, 900),
    );
  };

  const send = (sent: RichTextValue) => {
    if (!plainText(sent).trim() && attachments.length === 0) return;
    setTurns(current => [
      ...current,
      {
        id: `h${Date.now()}`,
        author: 'human',
        value: sent,
        accounts: keywordAccounts(sent, integrations.list),
        attachments,
        createdAt: new Date().toISOString(),
      },
    ]);
    setAttachments([]);
    setValue(emptyDoc());
    reply();
  };

  const stop = () => {
    clearTimers();
    updateLast(turn => ({
      ...turn,
      streaming: false,
      tools: turn.tools?.map(tool => (tool.status === 'running' ? { ...tool, status: 'cancelled' } : tool)),
    }));
    setStatus('idle');
  };

  const newChat = () => {
    stop();
    setTurns([]);
  };

  const addAttachment = (file: AttachmentFile) => setAttachments(current => [...current, file]);

  const lastHuman = turns.findLastIndex(turn => turn.author === 'human');
  return (
    <FileRenderersProvider renderers={renderers}>
      <TooltipProvider>
        <div className="chat-page">
          <ChatHistory onNewChat={newChat} />
          <main className="chat-page-main">
            <ChatHeader />
            <MessageScrollerProvider>
              <MessageScroller className="chat-page-scroller">
                <MessageScrollerViewport>
                  <MessageScrollerContent className="chat-page-thread">
                    {turns.length === 0 && (
                      <div className="chat-page-empty">
                        <AgentAvatar agentId="bud" name="Bud" size="lg" />
                        <h2>What should we work on?</h2>
                      </div>
                    )}
                    {turns.map((turn, index) => (
                      <MessageScrollerItem key={turn.id} messageId={turn.id} scrollAnchor={index === lastHuman}>
                        {turn.author === 'human' ? (
                          <HumanMessage turn={turn} keywords={integrations.list} />
                        ) : (
                          <AssistantMessage
                            turn={turn}
                            feedback={feedback[turn.id] ?? null}
                            onFeedback={next => setFeedback(current => ({ ...current, [turn.id]: next }))}
                            onRetry={() => {
                              setTurns(current => current.filter(item => item.id !== turn.id));
                              reply();
                            }}
                          />
                        )}
                      </MessageScrollerItem>
                    ))}
                    {status === 'idle' && turns.length > 0 && (
                      <PromptList
                        title="Suggestions"
                        items={suggestions}
                        onSelect={id => {
                          const label = suggestions.find(item => item.id === id)?.label;
                          if (label) send(paragraph(text(label)));
                        }}
                      />
                    )}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton aria-label="Scroll to newest message" />
              </MessageScroller>
            </MessageScrollerProvider>
            <div className="chat-page-composer">
              <input
                ref={picker}
                type="file"
                multiple
                hidden
                onChange={event => {
                  for (const file of event.currentTarget.files ?? [])
                    addAttachment({
                      ...ready(file.name, file.type, `${Math.ceil(file.size / 1024)} KB`),
                      source: { kind: 'local', file },
                    });
                  event.currentTarget.value = '';
                }}
              />
              <ChatInput
                label="Message Bud"
                placeholder="Ask Bud anything…"
                value={value}
                onValueChange={setValue}
                onSend={() => send(value)}
                onStop={stop}
                status={status}
                agents={search(agents)}
                skills={search(skills)}
                files={search(fileSuggestions)}
                integrations={integrations.list}
                onConnectIntegration={integrations.connect}
                onIntegrationAccountChange={integrations.choose}
                attachments={attachments}
                onRemoveAttachment={id => setAttachments(current => current.filter(file => file.id !== id))}
                attachActions={[
                  {
                    id: 'computer',
                    label: 'Upload from computer',
                    description: 'Files and images from this device',
                    icon: icon(Laptop),
                    onSelect: () => picker.current?.click(),
                  },
                  {
                    id: 'drive',
                    label: 'Add from Google Drive',
                    description: 'Docs, sheets, and slides',
                    icon: <BrandIcon brand="google-drive" size="inline" />,
                    onSelect: () =>
                      addAttachment(
                        ready('Supplier contracts.gdoc', 'application/vnd.google-apps.document', 'Google Drive'),
                      ),
                  },
                ]}
                modes={modes}
                mode={mode}
                onModeChange={setMode}
                models={models}
                model={model}
                onModelChange={setModel}
              />
            </div>
          </main>
        </div>
      </TooltipProvider>
    </FileRenderersProvider>
  );
}
