import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { ArrowUp } from 'reicon-react/icons/ArrowUp';
import { BookOpen } from 'reicon-react/icons/BookOpen';
import { Check } from 'reicon-react/icons/Check';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { Copy } from 'reicon-react/icons/Copy';
import { Cpu } from 'reicon-react/icons/Cpu';
import { FileText } from 'reicon-react/icons/FileText';
import { Lightbulb } from 'reicon-react/icons/Lightbulb';
import { Paperclip } from 'reicon-react/icons/Paperclip';
import { Plus } from 'reicon-react/icons/Plus';
import { Search } from 'reicon-react/icons/Search';
import { Search3 } from 'reicon-react/icons/Search3';
import { Send } from 'reicon-react/icons/Send';
import { Sparkle } from 'reicon-react/icons/Sparkle';
import { Stop3 } from 'reicon-react/icons/Stop3';
import { X } from 'reicon-react/icons/X';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@tulipfarm/sprout/dropdown-menu';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@tulipfarm/sprout/input-group';
import { Button } from '@tulipfarm/sprout/button';
import { Kbd } from '@tulipfarm/sprout/kbd';
import { Label } from '@tulipfarm/sprout/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tulipfarm/sprout/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@tulipfarm/sprout/tooltip';
import '../styles/input-group-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="input-group-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="input-group-demo-card-body">{children}</div>
    </section>
  );
}

function Sample({ testId, note, children }: { testId: string; note: string; children: ReactNode }) {
  return (
    <div className="input-group-demo-sample" data-testid={testId}>
      {children}
      <p className="input-group-demo-note">{note}</p>
    </div>
  );
}

export function InputGroupSizes() {
  return (
    <Example
      title="Sizes and inline additions"
      description="Default is 32px with 14px text, for toolbars and lists. Large is 44px with 16px text, for onboarding forms. Additions sit before or after the input."
    >
      <div className="input-group-demo-grid">
        <Sample testId="size-default" note="default · leading icon · trailing shortcut">
          <InputGroup>
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput aria-label="Search chats" placeholder="Search chats…" />
            <InputGroupAddon align="inline-end">
              <InputGroupText>⌘ K</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </Sample>
        <Sample testId="size-lg" note="lg · leading icon · trailing shortcut">
          <InputGroup size="lg">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput aria-label="Search the workspace" placeholder="Search the workspace…" />
            <InputGroupAddon align="inline-end">
              <Kbd>⌘K</Kbd>
            </InputGroupAddon>
          </InputGroup>
        </Sample>
      </div>
    </Example>
  );
}

const chats = ['Q3 board deck review', 'Northwind renewal terms', 'Hiring plan for support', 'Weekly metrics digest'];

const agents = ['Invoice follow-up', 'People Ops helper', 'Renewal desk'];

export function InputGroupSearch() {
  const chatInput = useRef<HTMLInputElement>(null);
  const agentInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [agentQuery, setAgentQuery] = useState('Follow up with the Northwind procurement team about renewal terms');
  const shown = chats.filter(chat => chat.toLowerCase().includes(query.trim().toLowerCase()));
  const shownAgents = agents.filter(agent => agent.toLowerCase().includes(agentQuery.trim().toLowerCase()));
  return (
    <Example
      title="Search with a clear button"
      description="Chat and list searches put a magnifier first and an icon-xs clear button last. Clear empties the text and puts focus back in the input."
    >
      <div className="input-group-demo-grid">
        <Sample testId="search-chats" note="Chats · 14px icon · 640 characters">
          <InputGroup>
            <InputGroupAddon>
              <Search3 size={14} aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              ref={chatInput}
              id="chat-search"
              aria-label="Search chat titles"
              placeholder="Search chat titles"
              maxLength={640}
              value={query}
              onChange={event => setQuery(event.currentTarget.value)}
            />
            <InputGroupAddon align="inline-end">
              {query && (
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery('');
                    chatInput.current?.focus();
                  }}
                >
                  <X aria-hidden="true" />
                </InputGroupButton>
              )}
            </InputGroupAddon>
          </InputGroup>
          <ul className="input-group-demo-list" aria-label="Chats">
            {shown.map(chat => (
              <li key={chat}>{chat}</li>
            ))}
          </ul>
          {!shown.length && (
            <p role="status" className="input-group-demo-muted">
              No chats match “{query}”.
            </p>
          )}
        </Sample>
        <Sample testId="search-agents" note="Search field · long text · 120 characters">
          <InputGroup>
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              ref={agentInput}
              type="search"
              aria-label="Find agents"
              placeholder="Search agents"
              maxLength={120}
              value={agentQuery}
              onChange={event => setAgentQuery(event.currentTarget.value)}
            />
            {agentQuery && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Clear search"
                  onClick={() => {
                    setAgentQuery('');
                    agentInput.current?.focus();
                  }}
                >
                  <X aria-hidden="true" />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
          <p role="status" className="input-group-demo-muted">
            {shownAgents.length ? `${shownAgents.length} agents` : 'No agents match. Clear the search to see all.'}
          </p>
        </Sample>
      </div>
    </Example>
  );
}

const slugPattern = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;

export function InputGroupWorkspaceUrl() {
  const [slug, setSlug] = useState('acme');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const error = touched && !slugPattern.test(slug) ? 'Use 3 to 48 lowercase letters, numbers, or hyphens.' : '';
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!slugPattern.test(slug)) return;
    setSaving(true);
    timer.current = setTimeout(() => setSaving(false), 1500);
  };
  return (
    <Example
      title="Workspace URL"
      description="Large group with a text prefix. Invalid input turns the whole group red, and the field is locked while the workspace saves."
    >
      <div className="input-group-demo-grid">
        <form className="input-group-demo-sample" data-testid="workspace-url" onSubmit={submit}>
          <Label htmlFor="workspace-slug">Workspace URL</Label>
          <InputGroup size="lg">
            <InputGroupAddon>
              <InputGroupText>app.tulipfarm.ai/</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              id="workspace-slug"
              name="workspace-slug"
              placeholder="acme"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={48}
              required
              value={slug}
              disabled={saving}
              aria-invalid={Boolean(error)}
              aria-describedby="workspace-slug-hint"
              onChange={event => setSlug(event.currentTarget.value)}
              onBlur={() => setTouched(true)}
            />
          </InputGroup>
          <p
            id="workspace-slug-hint"
            aria-live="polite"
            className={error ? 'input-group-demo-danger' : 'input-group-demo-muted'}
          >
            {error ||
              (saving ? 'Creating workspace…' : 'Choose carefully. This address cannot be changed after creation.')}
          </p>
          <div>
            <Button
              type="submit"

              disabled={saving}
            >
              {saving ? 'Creating…' : 'Create workspace'}
            </Button>
          </div>
        </form>
        <div className="input-group-demo-stack">
          <Sample testId="workspace-url-invalid" note="Invalid · aria-invalid on the input">
            <InputGroup size="lg">
              <InputGroupAddon>
                <InputGroupText>app.tulipfarm.ai/</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Workspace URL with an error"
                defaultValue="Acme Corp!"
                aria-invalid
                aria-describedby="workspace-slug-error"
              />
            </InputGroup>
            <p id="workspace-slug-error" className="input-group-demo-danger">
              Use 3 to 48 lowercase letters, numbers, or hyphens.
            </p>
          </Sample>
          <Sample testId="workspace-url-disabled" note="Disabled while saving">
            <InputGroup size="lg">
              <InputGroupAddon>
                <InputGroupText>app.tulipfarm.ai/</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput aria-label="Workspace URL while saving" defaultValue="northwind-traders" disabled />
            </InputGroup>
          </Sample>
        </div>
      </div>
    </Example>
  );
}

const fruits = ['Apple', 'Banana', 'Blueberry', 'Cherry', 'Grape', 'Mango', 'Orange', 'Pear'];

function FruitCombobox({
  label,
  showTrigger = true,
  showClear = false,
  disabled = false,
  defaultValue = null,
}: {
  label: string;
  showTrigger?: boolean;
  showClear?: boolean;
  disabled?: boolean;
  defaultValue?: string | null;
}) {
  return (
    <Combobox.Root items={fruits} disabled={disabled} defaultValue={defaultValue}>
      <InputGroup className="input-group-demo-combobox">
        <Combobox.Input
          render={<InputGroupInput disabled={disabled} />}
          aria-label={label}
          placeholder={disabled ? 'Disabled' : 'Choose a fruit'}
        />
        <InputGroupAddon align="inline-end">
          {showTrigger && (
            <InputGroupButton
              size="icon-xs"
              variant="ghost"
              render={<Combobox.Trigger />}
              data-slot="input-group-button"
              aria-label="Show fruits"
              className="input-group-demo-combobox-trigger"
              disabled={disabled}
            >
              <ChevronDown aria-hidden="true" />
            </InputGroupButton>
          )}
          {showClear && (
            <Combobox.Clear
              data-slot="combobox-clear"
              aria-label="Clear selection"
              render={<InputGroupButton variant="ghost" size="icon-xs" />}
              disabled={disabled}
            >
              <X aria-hidden="true" />
            </Combobox.Clear>
          )}
        </InputGroupAddon>
      </InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} className="input-group-demo-positioner">
          <Combobox.Popup data-slot="combobox-content" className="input-group-demo-popup">
            <Combobox.Empty className="input-group-demo-empty">No fruit found.</Combobox.Empty>
            <Combobox.List className="input-group-demo-options">
              {(item: string) => (
                <Combobox.Item key={item} value={item} className="input-group-demo-option">
                  {item}
                  <Combobox.ItemIndicator className="input-group-demo-option-check">
                    <Check size={14} aria-hidden="true" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

export function InputGroupCombobox() {
  return (
    <Example
      title="Combobox input"
      description="A Base UI Combobox renders its input and buttons through the group. The trigger and clear buttons are icon-xs; once there is a choice the clear button replaces the trigger."
    >
      <div className="input-group-demo-grid">
        <Sample testId="combobox-trigger" note="Trigger · type or press ↓ to open">
          <FruitCombobox label="Choose a fruit" />
        </Sample>
        <Sample testId="combobox-clear" note="Trigger and clear · chosen value">
          <FruitCombobox label="Favourite fruit" showClear defaultValue="Mango" />
        </Sample>
        <Sample testId="combobox-disabled" note="Disabled">
          <FruitCombobox label="Disabled fruit choice" disabled />
        </Sample>
      </div>
    </Example>
  );
}

const personas = [
  { id: 'research', label: 'Research', detail: 'Searches and cites sources' },
  { id: 'writer', label: 'Writer', detail: 'Drafts and edits long text' },
  { id: 'invoice', label: 'Invoice follow-up', detail: 'Agent · Finance' },
  { id: 'renewal', label: 'Renewal desk', detail: 'Agent · Sales' },
];

export function InputGroupCommandSearch() {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState('Research');
  const shown = personas.filter(persona =>
    `${persona.label} ${persona.detail}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <Example
      title="Command search"
      description="Pickers put a quiet, filled group at the top of their list. The input is any element; the leading icon can follow it in markup."
    >
      <div className="input-group-demo-panel" data-testid="command-search">
        <div className="input-group-demo-command-input">
          <InputGroup className="input-group-demo-command">
            <input
              data-slot="command-input"
              className="input-group-demo-command-control"
              aria-label="Search modes and agents"
              aria-controls="input-group-demo-personas"
              placeholder="Search modes and agents…"
              value={query}
              onChange={event => setQuery(event.currentTarget.value)}
            />
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <ul id="input-group-demo-personas" className="input-group-demo-command-list" aria-label="Modes and agents">
          {shown.map(persona => (
            <li key={persona.id}>
              <button type="button" aria-pressed={picked === persona.label} onClick={() => setPicked(persona.label)}>
                <span>{persona.label}</span>
                <span className="input-group-demo-note">{persona.detail}</span>
              </button>
            </li>
          ))}
        </ul>
        {!shown.length && (
          <p role="status" className="input-group-demo-empty">
            No modes or agents found.
          </p>
        )}
      </div>
    </Example>
  );
}

const models = [
  { id: 'gpt', label: 'GPT-5.4' },
  { id: 'claude', label: 'Claude Sonnet 5 with extended reasoning' },
  { id: 'gemini', label: 'Gemini 3 Flash' },
];

type Phase = 'idle' | 'sending' | 'replying';

function FilesMenu({ disabled, onPick }: { disabled: boolean; onPick: (name: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<InputGroupButton size="sm" variant="ghost" aria-label="Add a file" disabled={disabled} />}
      >
        <Paperclip size={16} aria-hidden="true" />
        <span className="input-group-demo-wide-only">Files</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent size="menu" side="top">
        <DropdownMenuGroup>
          <DropdownMenuLabel>What should happen to the file?</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onPick('pricing-2026.pdf')}>
            <span className="input-group-demo-menu-copy">
              <span>Read in this chat</span>
              <span className="input-group-demo-note">The agent reads it once.</span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPick('brand-guide.pdf')}>
            <span className="input-group-demo-menu-copy">
              <span>Add to knowledge</span>
              <span className="input-group-demo-note">Every chat can search it.</span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PersonaPicker({ disabled }: { disabled: boolean }) {
  const [value, setValue] = useState<string | null>(null);
  const label = value ?? 'Mode';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <InputGroupButton size="sm" variant="ghost" disabled={disabled} aria-label={`Mode or agent: ${label}`} />
        }
      >
        <Sparkle size={16} aria-hidden="true" />
        {label}
        <ChevronDown size={12} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent size="menu" side="top" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Modes and agents</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={value ?? ''}
            onValueChange={next => setValue(next === value || !next ? null : String(next))}
          >
            {personas.map(persona => (
              <DropdownMenuRadioItem key={persona.id} value={persona.label} closeOnClick>
                <span className="input-group-demo-option-text">
                  <span>{persona.label}</span>
                  <span className="input-group-demo-note">{persona.detail}</span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ModelPicker({ disabled }: { disabled: boolean }) {
  const [model, setModel] = useState(models[1]!);
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <InputGroupButton size="sm" variant="ghost" disabled={disabled} aria-label={`Model: ${model.label}`} />
              }
            />
          }
        >
          <Cpu size={16} aria-hidden="true" />
          <span className="input-group-demo-truncate">{model.label}</span>
          <ChevronDown size={12} aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>AI model that writes replies</TooltipContent>
      </Tooltip>
      <DropdownMenuContent size="menu" side="top" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Models</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={model.id}
            onValueChange={next => setModel(models.find(item => item.id === next) ?? model)}
          >
            {models.map(candidate => (
              <DropdownMenuRadioItem key={candidate.id} value={candidate.id} closeOnClick>
                {candidate.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const draftLimit = 400;

export function InputGroupComposer() {
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<string[]>(['Q3-forecast.xlsx']);
  const [mode, setMode] = useState<'normal' | 'plan'>('normal');
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState('Nothing has been sent.');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const tooLong = draft.length > draftLimit;
  const canSend = draft.trim().length > 0 && !tooLong;
  const sending = phase === 'sending';
  const stop = () => {
    timers.current.forEach(clearTimeout);
    setPhase('idle');
    setStatus('Reply stopped.');
  };
  const send = (event: FormEvent) => {
    event.preventDefault();
    if (!canSend || phase !== 'idle') return;
    setPhase('sending');
    setStatus('Sending…');
    timers.current = [
      setTimeout(() => {
        setDraft('');
        setFiles([]);
        setPhase('replying');
        setStatus('The agent is replying. Stop ends the reply.');
      }, 600),
      setTimeout(() => {
        setPhase('idle');
        setStatus('Reply finished. Nothing left this page.');
      }, 4000),
    ];
  };
  return (
    <Example
      title="Message composer"
      description="The composer variant stacks attachments, the message, and a toolbar. Toolbar buttons are sm with a label or icon-sm; send turns from secondary to default once there is text."
    >
      <form className="input-group-demo-sample" data-testid="composer" onSubmit={send}>
        <InputGroup variant="composer">
          {files.length > 0 && (
            <InputGroupAddon align="block-start">
              {files.map(file => (
                <span key={file} className="input-group-demo-chip">
                  <FileText size={14} aria-hidden="true" />
                  <span className="input-group-demo-truncate">{file}</span>
                  <InputGroupButton
                    size="icon-xs"
                    aria-label={`Remove ${file}`}
                    disabled={sending}
                    onClick={() => setFiles(files.filter(name => name !== file))}
                  >
                    <X aria-hidden="true" />
                  </InputGroupButton>
                </span>
              ))}
            </InputGroupAddon>
          )}
          <InputGroupTextarea
            aria-label="Message"
            placeholder="Ask anything…"
            rows={2}
            value={draft}
            disabled={sending}
            aria-invalid={tooLong || undefined}
            aria-describedby={tooLong ? 'composer-error' : undefined}
            onChange={event => setDraft(event.currentTarget.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) send(event);
            }}
          />
          <InputGroupAddon align="block-end" className="border-t">
            <FilesMenu disabled={sending} onPick={name => setFiles(current => [...new Set([...current, name])])} />
            <Tooltip>
              <TooltipTrigger
                render={
                  <InputGroupButton
                    size="sm"
                    variant="ghost"
                    aria-label="Use a skill"
                    disabled={sending}
                    onClick={() => setDraft(text => (text ? text : '/'))}
                  />
                }
              >
                <BookOpen size={16} aria-hidden="true" />
                <span className="input-group-demo-wide-only">Skills</span>
              </TooltipTrigger>
              <TooltipContent>Skills are saved procedures the agent follows · /</TooltipContent>
            </Tooltip>
            <Select
              value={mode}
              disabled={sending}
              onValueChange={value => {
                if (value === 'normal' || value === 'plan') setMode(value);
              }}
            >
              <SelectTrigger size="sm" aria-label="Chat mode">
                <SelectValue>{mode === 'plan' ? 'Plan' : 'Normal'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="plan">Plan only</SelectItem>
              </SelectContent>
            </Select>
            <PersonaPicker disabled={sending} />
            <div className="input-group-demo-toolbar-end">
              <ModelPicker disabled={sending} />
              {phase === 'replying' ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <InputGroupButton size="icon-sm" variant="default" aria-label="Stop reply" onClick={stop} />
                    }
                  >
                    <Stop3 size={16} aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent>Stop reply</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <InputGroupButton
                        type="submit"
                        size="icon-sm"
                        variant={canSend ? 'default' : 'secondary'}
                        aria-label="Send message"
                        aria-busy={sending}
                        disabled={sending || !canSend}
                      />
                    }
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent>Send · Enter</TooltipContent>
                </Tooltip>
              )}
            </div>
          </InputGroupAddon>
        </InputGroup>
        {tooLong && (
          <p id="composer-error" role="alert" className="input-group-demo-danger">
            Shorten your message to {draftLimit} characters. It has {draft.length}.
          </p>
        )}
        <p role="status" className="input-group-demo-note">
          {status}
        </p>
      </form>
    </Example>
  );
}

export function InputGroupQuestionComposer() {
  const editor = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <Example
      title="Question composer and custom controls"
      description="While an agent waits on a question, the composer border goes quiet. Any element marked data-slot input-group-control, like this rich text box, drives the group's focus and invalid states."
    >
      <div className="input-group-demo-grid">
        <div className="input-group-demo-sample" data-testid="question-composer">
          <p className="input-group-demo-question">
            <Lightbulb size={14} aria-hidden="true" />
            The agent asked: Which region should the Q3 report cover?
          </p>
          <InputGroup variant="question-composer">
            <div
              ref={editor}
              role="textbox"
              aria-multiline="true"
              aria-label="Message"
              aria-placeholder="Send a separate message…"
              contentEditable="plaintext-only"
              suppressContentEditableWarning
              tabIndex={0}
              data-slot="input-group-control"
              data-empty={text ? undefined : ''}
              className="input-group-demo-rich-text"
              onInput={event => {
                setText(event.currentTarget.textContent ?? '');
                setSent(false);
              }}
            />
            <InputGroupAddon align="block-end">
              <Tooltip>
                <TooltipTrigger render={<InputGroupButton size="icon-sm" variant="ghost" aria-label="Attach files" />}>
                  <Paperclip size={16} aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>Attach files from your device</TooltipContent>
              </Tooltip>
              <div className="input-group-demo-toolbar-end">
                <InputGroupButton
                  size="icon-sm"
                  variant={text.trim() ? 'default' : 'secondary'}
                  aria-label="Send message"
                  disabled={!text.trim()}
                  onClick={() => {
                    if (editor.current) editor.current.textContent = '';
                    setText('');
                    setSent(true);
                    editor.current?.focus();
                  }}
                >
                  <ArrowUp size={16} aria-hidden="true" />
                </InputGroupButton>
              </div>
            </InputGroupAddon>
          </InputGroup>
          <p role="status" className="input-group-demo-note">
            {sent ? 'Message sent locally.' : 'question-composer · rich text control'}
          </p>
        </div>
        <Sample testId="composer-disabled" note="composer · disabled while read-only">
          <InputGroup variant="composer">
            <InputGroupTextarea aria-label="Read-only chat message" placeholder="This chat is read-only" disabled />
            <InputGroupAddon align="block-end">
              <InputGroupButton size="icon-sm" variant="ghost" aria-label="Attach files" disabled>
                <Paperclip size={16} aria-hidden="true" />
              </InputGroupButton>
              <div className="input-group-demo-toolbar-end">
                <InputGroupButton size="icon-sm" variant="secondary" aria-label="Send message" disabled>
                  <ArrowUp size={16} aria-hidden="true" />
                </InputGroupButton>
              </div>
            </InputGroupAddon>
          </InputGroup>
        </Sample>
      </div>
    </Example>
  );
}

export function InputGroupDraft() {
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <Example
      title="Block additions"
      description="Block additions span a row above or below a textarea. Here a label sits on top and an icon-xs button and an sm default button sit underneath."
    >
      <div className="input-group-demo-sample" data-testid="draft">
        <InputGroup variant="composer">
          <InputGroupAddon align="block-start">
            <InputGroupText>Draft message</InputGroupText>
          </InputGroupAddon>
          <InputGroupTextarea
            aria-label="Draft message"
            placeholder="Write something…"
            value={draft}
            onChange={event => {
              setDraft(event.currentTarget.value);
              setSent(false);
            }}
          />
          <InputGroupAddon align="block-end">
            <InputGroupButton size="icon-xs" aria-label="Add attachment">
              <Plus aria-hidden="true" />
            </InputGroupButton>
            <InputGroupButton
              size="sm"
              variant="default"
              disabled={!draft.trim()}
              onClick={() => {
                setDraft('');
                setSent(true);
              }}
            >
              Send
              <Send aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <p role="status" className="input-group-demo-note">
          {sent ? 'Draft example sent locally.' : 'Nothing has been sent.'}
        </p>
      </div>
    </Example>
  );
}

export function InputGroupButtons() {
  const [copied, setCopied] = useState('');
  return (
    <Example
      title="Button sizes"
      description="xs and sm fit a short label; icon-xs and icon-sm are square. Buttons are ghost and type button unless you say otherwise."
    >
      <div className="input-group-demo-grid">
        <Sample testId="button-xs" note="xs · ghost · label">
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText>https://</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Invite link"
              readOnly
              value="app.tulipfarm.ai/invite/7Qx2-northwind-traders-renewal"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                onClick={() => setCopied('Copy pressed for the invite link. This sample copies nothing.')}
              >
                Copy
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Sample>
        <Sample testId="button-sm" note="sm · secondary · icon and label">
          <InputGroup>
            <InputGroupInput aria-label="Invite by email" placeholder="name@company.com" type="email" />
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="sm" variant="secondary" onClick={() => setCopied('Invitation queued locally.')}>
                <Send aria-hidden="true" />
                Invite
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Sample>
        <Sample testId="button-icon-xs" note="icon-xs · ghost">
          <InputGroup>
            <InputGroupInput aria-label="Webhook secret" readOnly value="whsec_4f9c2a7e1b" />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="Copy webhook secret"
                onClick={() => setCopied('Copy pressed for the webhook secret. This sample copies nothing.')}
              >
                <Copy aria-hidden="true" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Sample>
        <Sample testId="button-icon-sm" note="lg · icon-sm · outline">
          <InputGroup size="lg">
            <InputGroupInput aria-label="Project name" defaultValue="Q3 board pack" />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-sm"
                variant="outline"
                aria-label="Copy project name"
                onClick={() => setCopied('Copy pressed for the project name. This sample copies nothing.')}
              >
                <Copy aria-hidden="true" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Sample>
      </div>
      <p role="status" className="input-group-demo-note">
        {copied || 'No button pressed yet.'}
      </p>
    </Example>
  );
}

export default function InputGroupDemo() {
  return (
    <div id="input-group-demo" className="input-group-demo">
      <InputGroupSizes />
      <InputGroupSearch />
      <InputGroupWorkspaceUrl />
      <InputGroupButtons />
      <InputGroupCombobox />
      <InputGroupCommandSearch />
      <InputGroupComposer />
      <InputGroupQuestionComposer />
      <InputGroupDraft />
    </div>
  );
}
