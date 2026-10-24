import { useEffect, useRef, useState } from 'react';
import { Laptop } from 'reicon-react/icons/Laptop';
import { Database } from 'reicon-react/icons/Database';
import { CalendarSearch } from 'reicon-react/icons/CalendarSearch';
import { FileText } from 'reicon-react/icons/FileText';
import { MoreH } from 'reicon-react/icons/MoreH';
import { AgentAvatar } from '@tulipfarm/sprout/agent-avatar';
import { BrandIcon } from '@tulipfarm/sprout/brand-icon';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@tulipfarm/sprout/breadcrumb';
import { Button } from '@tulipfarm/sprout/button';
import { ChatInput, type ChatInputStatus } from '@tulipfarm/sprout/chat-input';
import type { AttachmentFile } from '@tulipfarm/sprout/attachment';
import {
  ChatWindow,
  ChatWindowActions,
  ChatWindowBody,
  ChatWindowClose,
  ChatWindowContent,
  ChatWindowFooter,
  ChatWindowHeader,
  ChatWindowLauncher,
  ChatWindowLayoutMenu,
  ChatWindowTitle,
  chatWindowCornerNames,
  type ChatWindowCorner,
  type ChatWindowLayout,
} from '@tulipfarm/sprout/chat-window';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tulipfarm/sprout/dropdown-menu';
import { Message, MessageBubble, MessageContent } from '@tulipfarm/sprout/message';
import { MessageActions } from '@tulipfarm/sprout/message-actions';
import { MessageResponse } from '@tulipfarm/sprout/message-response';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@tulipfarm/sprout/message-scroller';
import { PromptList } from '@tulipfarm/sprout/prompt-list';
import { ToolActivity } from '@tulipfarm/sprout/tool-activity';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@tulipfarm/sprout/tooltip';
import type { RichTextValue } from '@tulipfarm/sprout/rich-text-editor';
import { agents, fileSuggestions, icon, models, modes, ready, search, skills, useIntegrations } from './ChatInputDemo';
import DocsSelect from './DocsSelect';
import '../styles/chat-window-demo.css';

const emptyDoc = (): RichTextValue => ({ type: 'doc', content: [{ type: 'paragraph' }] });
const textOf = (value: RichTextValue): string =>
  (value.content ?? [])
    .map(node => (node.content ?? []).map(child => child.text ?? '').join(''))
    .join('\n')
    .trim();

interface Turn {
  id: string;
  author: 'human' | 'assistant';
  text: string;
}

const firstTurns: Turn[] = [
  { id: 'q1', author: 'human', text: 'Which supplier deliveries are late this week?' },
  {
    id: 'a1',
    author: 'assistant',
    text: 'Two deliveries are late. **Northwind Paper** is 3 days behind on order 4471, and **Harbor Glass** missed Tuesday’s slot for order 4480. Both suppliers have replied in Gmail with new dates.',
  },
];

const suggestions = [
  { id: 'follow-up', label: 'Draft a follow-up to Harbor Glass', icon: <FileText size={16} aria-hidden="true" /> },
  {
    id: 'calendar',
    label: 'Move Friday’s stock check to Monday',
    icon: <CalendarSearch size={16} aria-hidden="true" />,
  },
];

const cornerLabels: Record<ChatWindowCorner, string> = {
  'bottom-right': 'Bottom right',
  'bottom-left': 'Bottom left',
  'top-right': 'Top right',
  'top-left': 'Top left',
};

function BudChat() {
  const [turns, setTurns] = useState(firstTurns);
  const [value, setValue] = useState<RichTextValue>(emptyDoc);
  const [model, setModel] = useState('claude-opus');
  const [mode, setMode] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [status, setStatus] = useState<ChatInputStatus>('idle');
  const integrations = useIntegrations(false);
  const picker = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const add = (file: AttachmentFile) => setAttachments(current => [...current, file]);
  const send = (text: string) => {
    if (!text) return;
    setAttachments([]);
    setStatus('streaming');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus('idle'), 1200);
    setTurns(current => [
      ...current,
      { id: `q${current.length}`, author: 'human', text },
      { id: `a${current.length}`, author: 'assistant', text: 'This is a docs demo, so Bud can’t reply here.' },
    ]);
    setValue(emptyDoc());
  };
  return (
    <>
      <ChatWindowBody>
        <MessageScrollerProvider>
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent className="chat-window-demo-thread">
                {turns.map((turn, index) => (
                  <MessageScrollerItem key={turn.id} messageId={turn.id} scrollAnchor={index === turns.length - 1}>
                    {turn.author === 'human' ? (
                      <Message align="end">
                        <MessageContent>
                          <MessageBubble variant="secondary">{turn.text}</MessageBubble>
                        </MessageContent>
                      </Message>
                    ) : (
                      <Message>
                        <MessageContent>
                          {index === 1 && (
                            <ToolActivity
                              items={[
                                {
                                  id: 'gmail',
                                  label: 'Searched the inbox',
                                  status: 'completed',
                                  visual: <BrandIcon brand="gmail" size="inline" />,
                                },
                                {
                                  id: 'orders',
                                  label: 'Read the Orders table',
                                  status: 'completed',
                                  visual: <Database size={14} />,
                                },
                                {
                                  id: 'suppliers',
                                  label: 'Read the Suppliers table',
                                  status: 'completed',
                                  visual: <Database size={14} />,
                                },
                              ]}
                            />
                          )}
                          <MessageResponse>{turn.text}</MessageResponse>
                          <MessageActions text={turn.text} />
                        </MessageContent>
                      </Message>
                    )}
                  </MessageScrollerItem>
                ))}
                <PromptList
                  title="Suggestions"
                  items={suggestions}
                  onSelect={id => send(suggestions.find(item => item.id === id)?.label ?? '')}
                />
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton aria-label="Scroll to newest message" />
          </MessageScroller>
        </MessageScrollerProvider>
      </ChatWindowBody>
      <ChatWindowFooter>
        <input
          ref={picker}
          type="file"
          multiple
          hidden
          onChange={event => {
            for (const file of event.currentTarget.files ?? [])
              add({
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
          onSend={() => send(textOf(value))}
          onStop={() => {
            clearTimeout(timer.current);
            setStatus('idle');
          }}
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
                add(ready('Supplier contracts.gdoc', 'application/vnd.google-apps.document', 'Google Drive')),
            },
          ]}
          modes={modes}
          mode={mode}
          onModeChange={setMode}
          models={models}
          model={model}
          onModelChange={setModel}
        />
      </ChatWindowFooter>
    </>
  );
}

function BudHeader() {
  return (
    <ChatWindowHeader>
      <Breadcrumb>
        <BreadcrumbList wrap={false}>
          <BreadcrumbItem>
            <BreadcrumbLink href="#chat-window-demo">Bud</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage truncate>
              <ChatWindowTitle render={<span />}>Late supplier deliveries</ChatWindowTitle>
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <ChatWindowActions>
        <ChatWindowLayoutMenu />
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
        <ChatWindowClose />
      </ChatWindowActions>
    </ChatWindowHeader>
  );
}

export function ChatWindowPlayground() {
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(true);
  const [layout, setLayout] = useState<ChatWindowLayout>('window');
  const [corner, setCorner] = useState<ChatWindowCorner>('bottom-right');
  return (
    <TooltipProvider>
      <div className="chat-window-demo">
        <div className="chat-window-demo-controls">
          <DocsSelect
            label="Corner"
            value={corner}
            items={chatWindowCornerNames.map(value => ({ value, label: cornerLabels[value] }))}
            onValueChange={setCorner}
          />
          <p className="chat-window-demo-state" aria-live="polite">
            {open
              ? `Open as ${layout === 'page' ? 'full page' : layout === 'drawer' ? 'side drawer' : 'window'}`
              : 'Minimized'}
          </p>
        </div>
        <div ref={setStage} className="chat-window-demo-stage" data-testid="chat-window-stage">
          <div className="chat-window-demo-page" aria-hidden={layout === 'page' && open ? true : undefined}>
            <p className="chat-window-demo-eyebrow">Operations</p>
            <h3>Good morning</h3>
            <p>Three orders ship today. Bud keeps one private chat you can open from any page.</p>
            <div className="chat-window-demo-rows">
              {['Order 4471 · Northwind Paper', 'Order 4480 · Harbor Glass', 'Order 4492 · Fern & Co'].map(row => (
                <div key={row}>{row}</div>
              ))}
            </div>
          </div>
          {stage && (
            <ChatWindow open={open} onOpenChange={setOpen} layout={layout} onLayoutChange={setLayout} corner={corner}>
              <ChatWindowLauncher>
                <AgentAvatar agentId="bud" name="Bud" size="sm" />
                Bud
              </ChatWindowLauncher>
              <ChatWindowContent container={stage}>
                <BudHeader />
                <BudChat />
              </ChatWindowContent>
            </ChatWindow>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
