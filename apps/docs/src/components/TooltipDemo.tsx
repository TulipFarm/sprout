import { useRef, useState } from 'react';
import { Select } from '@base-ui/react/select';
import { ArrowUp } from 'reicon-react/icons/ArrowUp';
import { BookOpen } from 'reicon-react/icons/BookOpen';
import { ChatRound } from 'reicon-react/icons/ChatRound';
import { Check } from 'reicon-react/icons/Check';
import { Checklist } from 'reicon-react/icons/Checklist';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { Home } from 'reicon-react/icons/Home';
import { InfoCircle } from 'reicon-react/icons/InfoCircle';
import { Logout } from 'reicon-react/icons/Logout';
import { Paperclip } from 'reicon-react/icons/Paperclip';
import { Search3 } from 'reicon-react/icons/Search3';
import { Settings } from 'reicon-react/icons/Settings';
import { Stop3 } from 'reicon-react/icons/Stop3';
import { UserCircle } from 'reicon-react/icons/UserCircle';
import { BrandIcon, BrandStack, BrandTile, type Brand } from '@tulipfarm/sprout/brand-icon';
import { Button } from '@tulipfarm/sprout/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tulipfarm/sprout/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@tulipfarm/sprout/popover';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@tulipfarm/sprout/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@tulipfarm/sprout/tooltip';
import { Example } from './dialog-demo-parts';
import '../styles/tooltip-demo.css';

/* ------------------------------------------------------------------ */
/* Placement                                                           */
/* ------------------------------------------------------------------ */

const sides = ['top', 'right', 'bottom', 'left'] as const;
const aligns = ['start', 'center', 'end'] as const;

export function TooltipPlayground() {
  const [align, setAlign] = useState<(typeof aligns)[number]>('center');
  return (
    <section className="tooltip-demo-stage" aria-label="Tooltip playground">
      <div className="tooltip-demo-toolbar">
        <span className="tooltip-demo-caption">Hover or focus</span>
        <div role="group" aria-label="Alignment" className="tooltip-demo-segmented">
          {aligns.map(value => (
            <Button
              key={value}
              size="sm"
              variant={value === align ? 'secondary' : 'ghost'}
              aria-pressed={value === align}
              onClick={() => setAlign(value)}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      <TooltipProvider>
        <div className="tooltip-demo-sides">
          {sides.map(side => (
            <Tooltip key={side}>
              <TooltipTrigger render={<Button variant="outline" />}>{side}</TooltipTrigger>
              <TooltipContent side={side} align={align}>
                Helpful information on the {side}.
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Composer toolbar                                                    */
/* ------------------------------------------------------------------ */

const modes = [
  { value: 'normal', label: 'Normal' },
  { value: 'plan', label: 'Plan only' },
] as const;
type Mode = (typeof modes)[number]['value'];

const models: { id: string; label: string; brand: Brand }[] = [
  { id: 'claude', label: 'Claude Sonnet', brand: 'claude' },
  { id: 'gpt', label: 'GPT-5 mini', brand: 'openai' },
  { id: 'deepseek', label: 'DeepSeek R2', brand: 'deepseek' },
];

function ModeSelect({
  value,
  disabled,
  onChange,
}: {
  value: Mode;
  disabled: boolean;
  onChange: (value: Mode) => void;
}) {
  return (
    <Select.Root<Mode>
      items={modes}
      value={value}
      disabled={disabled}
      onValueChange={next => {
        if (next) onChange(next);
      }}
    >
      <Tooltip>
        <TooltipTrigger render={<Select.Trigger aria-label="Chat mode" className="tooltip-demo-select" />}>
          <Select.Value>{(current: Mode) => (current === 'plan' ? 'Plan' : 'Normal')}</Select.Value>
          <ChevronDown size={12} aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>Normal acts on your request. Plan only proposes steps first.</TooltipContent>
      </Tooltip>
      <Select.Portal>
        <Select.Positioner
          className="tooltip-demo-select-positioner"
          side="top"
          sideOffset={6}
          align="start"
          alignItemWithTrigger={false}
        >
          <Select.Popup className="tooltip-demo-select-popup">
            <Select.List aria-label="Chat mode">
              {modes.map(mode => (
                <Select.Item key={mode.value} value={mode.value} className="tooltip-demo-select-item">
                  <Select.ItemText>{mode.label}</Select.ItemText>
                  <Select.ItemIndicator className="tooltip-demo-select-check">
                    <Check size={14} aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function ModelPicker({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [modelId, setModelId] = useState('claude');
  const model = models.find(item => item.id === modelId)!;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={<Button size="sm" variant="ghost" disabled={disabled} aria-label={`Model: ${model.label}`} />}
            />
          }
        >
          <BrandIcon brand={model.brand} size="inline" />
          <span className="tooltip-demo-truncate">{model.label}</span>
          <ChevronDown size={12} aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>AI model that writes replies</TooltipContent>
      </Tooltip>
      <PopoverContent size="picker" side="top" align="end" sideOffset={8} aria-label="Models">
        <div className="tooltip-demo-models" role="group" aria-label="Models">
          {models.map(item => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              aria-pressed={item.id === modelId}
              className="tooltip-demo-model"
              onClick={() => {
                setModelId(item.id);
                setOpen(false);
              }}
            >
              <BrandIcon brand={item.brand} size="inline" />
              <span className="tooltip-demo-truncate">{item.label}</span>
              {item.id === modelId && <Check size={14} aria-hidden="true" />}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TooltipComposer() {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<Mode>('normal');
  const [files, setFiles] = useState(0);
  const [log, setLog] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const canSend = draft.trim().length > 0;

  function send() {
    if (!canSend || sending) return;
    setSending(true);
    setLog('Sending…');
    timer.current = setTimeout(() => {
      setSending(false);
      setDraft('');
      setLog('Reply finished.');
    }, 4000);
  }

  return (
    <Example
      title="Composer toolbar"
      description="Icon buttons, a labelled skills button, a mode select, and a model picker each explain themselves. One provider makes neighbours open instantly."
    >
      <TooltipProvider>
        <form
          className="tooltip-demo-composer"
          aria-label="Message composer"
          onSubmit={event => {
            event.preventDefault();
            send();
          }}
        >
          <label className="sr-only" htmlFor="tooltip-demo-draft">
            Message
          </label>
          <textarea
            id="tooltip-demo-draft"
            rows={2}
            value={draft}
            disabled={sending}
            placeholder="Ask anything…"
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
          />
          <div className="tooltip-demo-composer-bar">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Attach files"
                    disabled={sending}
                    onClick={() => setFiles(count => count + 1)}
                  />
                }
              >
                <Paperclip size={16} aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>Attach files from your device</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Use a skill"
                    disabled={sending}
                    onClick={() => setDraft(value => value || '/')}
                  />
                }
              >
                <BookOpen size={16} aria-hidden="true" />
                <span className="tooltip-demo-wide-only">Skills</span>
              </TooltipTrigger>
              <TooltipContent>Skills are saved procedures the agent follows · /</TooltipContent>
            </Tooltip>
            <ModeSelect value={mode} disabled={sending} onChange={setMode} />
            <div className="tooltip-demo-composer-end">
              <ModelPicker disabled={sending} />
              {/* Keyed so React swaps the node instead of turning Stop into a submit mid-click. */}
              {sending ? (
                <Tooltip key="stop">
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        size="icon-sm"
                        aria-label="Stop reply"
                        onClick={() => {
                          clearTimeout(timer.current);
                          setSending(false);
                          setLog('Reply stopped.');
                        }}
                      />
                    }
                  >
                    <Stop3 size={16} aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent>Stop reply</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip key="send">
                  <TooltipTrigger
                    render={
                      <Button
                        type="submit"
                        size="icon-sm"
                        variant={canSend ? 'default' : 'secondary'}
                        aria-label="Send message"
                        aria-busy={sending}
                        disabled={!canSend}
                      />
                    }
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent>Send · Enter</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </form>
      </TooltipProvider>
      <p className="tooltip-demo-note" role="status">
        {[files ? `${files} file${files === 1 ? '' : 's'} attached.` : '', mode === 'plan' ? 'Plan only.' : '', log]
          .filter(Boolean)
          .join(' ') || 'Type a message to enable Send.'}
      </p>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Column hints                                                        */
/* ------------------------------------------------------------------ */

const headings: (string | { label: string; hint: string })[] = [
  'Model',
  { label: 'Rates', hint: 'Credits per 1M input / output tokens.' },
  {
    label: 'Fallback',
    hint: 'If a model is unavailable, chats switch to its fallback.',
  },
  {
    label: 'Access',
    hint: "Turned-off models can't be picked or used as a fallback.",
  },
];

const rows: {
  brand: Brand;
  name: string;
  rates: string;
  fallback: string;
  access: string;
}[] = [
  {
    brand: 'claude',
    name: 'Claude Sonnet',
    rates: '3 / 15',
    fallback: 'GPT-5 mini',
    access: 'On',
  },
  {
    brand: 'openai',
    name: 'GPT-5 mini',
    rates: '0.25 / 2',
    fallback: 'None',
    access: 'On',
  },
  {
    brand: 'grok',
    name: 'Grok 4',
    rates: '3 / 15',
    fallback: 'Claude Sonnet',
    access: 'Off',
  },
];

export function TooltipColumnHints() {
  return (
    <Example
      title="Column hints"
      description="A small info button beside a column heading explains the column. The button is named after its column."
    >
      <div className="tooltip-demo-list" role="table" aria-label="Models">
        <div role="rowgroup">
          <div role="row" className="tooltip-demo-list-head">
            <TooltipProvider>
              {headings.map(heading =>
                typeof heading === 'string' ? (
                  <div key={heading} role="columnheader">
                    {heading}
                  </div>
                ) : (
                  <div key={heading.label} role="columnheader" className="tooltip-demo-hinted">
                    {heading.label}
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button type="button" aria-label={`About ${heading.label}`} className="tooltip-demo-hint" />
                        }
                      >
                        <InfoCircle size={14} aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent>{heading.hint}</TooltipContent>
                    </Tooltip>
                  </div>
                ),
              )}
            </TooltipProvider>
          </div>
        </div>
        <div role="rowgroup">
          {rows.map(row => (
            <div key={row.name} role="row" className="tooltip-demo-list-row">
              <div role="cell" className="tooltip-demo-list-name">
                <BrandIcon brand={row.brand} size="inline" />
                <span className="tooltip-demo-truncate">{row.name}</span>
              </div>
              <div role="cell">{row.rates}</div>
              <div role="cell" className="tooltip-demo-truncate">
                {row.fallback}
              </div>
              <div role="cell">{row.access}</div>
            </div>
          ))}
        </div>
      </div>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Brand stacks                                                        */
/* ------------------------------------------------------------------ */

const prompts: { title: string; brands: { brand: Brand; name: string }[] }[] = [
  {
    title: "Summarize this week's launches",
    brands: [
      { brand: 'slack', name: 'Slack' },
      { brand: 'notion', name: 'Notion' },
      { brand: 'github', name: 'GitHub' },
    ],
  },
  {
    title: 'Draft replies to unread customer email',
    brands: [
      { brand: 'gmail', name: 'Gmail' },
      { brand: 'google-calendar', name: 'Google Calendar' },
    ],
  },
];

export function TooltipBrands() {
  return (
    <Example
      title="App tiles"
      description="Each overlapping tile names its app on hover. A single tile can be a tooltip trigger too."
    >
      <ul className="tooltip-demo-prompts">
        {prompts.map(prompt => (
          <li key={prompt.title}>
            <span className="tooltip-demo-truncate">{prompt.title}</span>
            <BrandStack brands={prompt.brands} />
          </li>
        ))}
        <li>
          <span className="tooltip-demo-truncate">Linear is connected</span>
          <Tooltip>
            <TooltipTrigger render={<BrandTile size="sm" render={<button type="button" />} />} aria-label="Linear">
              <BrandIcon brand="linear" size="fill" />
            </TooltipTrigger>
            <TooltipContent>Linear · Synced 2 minutes ago</TooltipContent>
          </Tooltip>
        </li>
      </ul>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Collapsed sidebar                                                   */
/* ------------------------------------------------------------------ */

const pages = [
  { label: 'Home', icon: <Home size={16} aria-hidden="true" /> },
  { label: 'Chats', icon: <ChatRound size={16} aria-hidden="true" /> },
  { label: 'Tasks', icon: <Checklist size={16} aria-hidden="true" /> },
];

function RailNavigation({ settings, onSettings }: { settings: boolean; onSettings: (value: boolean) => void }) {
  const [active, setActive] = useState('Home');
  const [searches, setSearches] = useState(0);
  const { state } = useSidebar();
  return (
    <>
      <Sidebar label="Workspace navigation" collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {settings ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Back to app"
                    icon={<Home size={16} aria-hidden="true" />}
                    nativeButton={false}
                    render={<a href="#tooltip-sidebar" />}
                    onClick={event => {
                      event.preventDefault();
                      onSettings(false);
                    }}
                  >
                    Back to app
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                pages.map(page => (
                  <SidebarMenuItem key={page.label}>
                    <SidebarMenuButton
                      tooltip={page.label}
                      icon={page.icon}
                      isActive={active === page.label}
                      aria-current={active === page.label ? 'page' : undefined}
                      nativeButton={false}
                      render={<a href="#tooltip-sidebar" />}
                      onClick={event => {
                        event.preventDefault();
                        setActive(page.label);
                      }}
                    >
                      {page.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={{
                    children: 'Jump to… ⌘K',
                    className: 'tooltip-demo-jump',
                  }}
                  aria-label="Jump to…"
                  aria-keyshortcuts="Meta+K Control+K"
                  icon={<Search3 size={16} aria-hidden="true" />}
                  onClick={() => setSearches(count => count + 1)}
                >
                  Jump to…
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Account menu"
                  render={<SidebarMenuButton tooltip="Account" icon={<UserCircle size={16} aria-hidden="true" />} />}
                >
                  Priya Raman
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end">
                  <DropdownMenuItem onClick={() => onSettings(true)}>
                    <Settings size={16} aria-hidden="true" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Logout size={16} aria-hidden="true" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <div className="tooltip-demo-rail-main">
        <SidebarTrigger
          className="tooltip-demo-rail-toggle"
          aria-label={state === 'collapsed' ? 'Show labels' : 'Hide labels'}
        >
          {state === 'collapsed' ? 'Show labels' : 'Hide labels'}
        </SidebarTrigger>
        <p>
          {settings ? 'Settings' : active}
          {searches ? ` · Jump to opened ${searches}×` : ''}
        </p>
        <p className="tooltip-demo-caption">
          {state === 'collapsed'
            ? 'Hover or focus an icon to see its label.'
            : 'Labels are visible, so tooltips stay hidden.'}
        </p>
      </div>
    </>
  );
}

export function TooltipSidebar() {
  const [settings, setSettings] = useState(false);
  return (
    <Example
      id="tooltip-sidebar"
      title="Collapsed sidebar"
      description="SidebarMenuButton tooltip shows the label beside the icon rail and hides while the sidebar is expanded or on mobile."
    >
      <SidebarProvider defaultOpen={false} keyboardShortcut={false} className="tooltip-demo-rail">
        <RailNavigation settings={settings} onSettings={setSettings} />
      </SidebarProvider>
    </Example>
  );
}
