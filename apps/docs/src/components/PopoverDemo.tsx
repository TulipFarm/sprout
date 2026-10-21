import { useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { Tooltip } from '@base-ui/react/tooltip';
import { Add } from 'reicon-react/icons/Add';
import { ArrowUp } from 'reicon-react/icons/ArrowUp';
import { Calendar } from 'reicon-react/icons/Calendar';
import { ChatRound } from 'reicon-react/icons/ChatRound';
import { Check } from 'reicon-react/icons/Check';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { ChevronLeft } from 'reicon-react/icons/ChevronLeft';
import { ChevronRight } from 'reicon-react/icons/ChevronRight';
import { DocumentText } from 'reicon-react/icons/DocumentText';
import { Flash } from 'reicon-react/icons/Flash';
import { Folder } from 'reicon-react/icons/Folder';
import { Inbox } from 'reicon-react/icons/Inbox';
import { Lock } from 'reicon-react/icons/Lock';
import { Maximize2 } from 'reicon-react/icons/Maximize2';
import { Minus } from 'reicon-react/icons/Minus';
import { Plug } from 'reicon-react/icons/Plug';
import { Search } from 'reicon-react/icons/Search';
import { SliderHorizontal } from 'reicon-react/icons/SliderHorizontal';
import { Sparkle } from 'reicon-react/icons/Sparkle';
import { Badge } from '@tulipfarm/sprout/badge';
import { BrandIcon, BrandTile, type Brand } from '@tulipfarm/sprout/brand-icon';
import { Button } from '@tulipfarm/sprout/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  type PopoverContentProps,
} from '@tulipfarm/sprout/popover';
import { ToolbarStatus } from '@tulipfarm/sprout/toolbar-status';
import DocsSelect from './DocsSelect';
import { Example, Row, Spinner, useLater } from './dialog-demo-parts';
import { Input } from '@tulipfarm/sprout/input';
import { Textarea } from '@tulipfarm/sprout/textarea';
import '../styles/popover-demo.css';

/* ------------------------------------------------------------------ */
/* Sample adapters                                                     */
/* ------------------------------------------------------------------ */

function Segmented<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <div role="group" aria-label={label} className="popover-demo-segmented">
      {options.map(option => (
        <Button
          key={option.value}
          size="sm"
          variant={option.value === value ? 'secondary' : 'ghost'}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

function SearchInput({
  label,
  placeholder,
  value,
  onChange,
  inputRef,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="popover-demo-search">
      <Search size={16} aria-hidden="true" />
      <input
        ref={inputRef}
        aria-label={label}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={event => onChange(event.target.value)}
      />
    </div>
  );
}

interface Choice {
  value: string;
  label: string;
  detail?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

/** Moves focus between enabled choices with the arrow keys. */
function arrowFocus(event: KeyboardEvent<HTMLElement>) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const buttons = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>('button.popover-demo-choice:not(:disabled)'),
  ];
  if (!buttons.length) return;
  event.preventDefault();
  const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : event.key === 'ArrowDown'
          ? Math.min(at + 1, buttons.length - 1)
          : Math.max(at - 1, 0);
  buttons[next]?.focus();
}

/** A search box over grouped choices. Stands in for Cloud's Command list. */
function ChoiceList({
  label,
  placeholder,
  groups,
  selected,
  onPick,
  empty,
  search,
  onSearch,
  inputRef,
  children,
}: {
  label: string;
  placeholder: string;
  groups: readonly { heading?: string; choices: readonly Choice[] }[];
  selected: string | null;
  onPick: (value: string) => void;
  empty: ReactNode;
  search: string;
  onSearch: (value: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  children?: ReactNode;
}) {
  const term = search.trim().toLowerCase();
  const visible = groups
    .map(group => ({
      ...group,
      choices: group.choices.filter(choice => `${choice.label} ${choice.detail ?? ''}`.toLowerCase().includes(term)),
    }))
    .filter(group => group.choices.length);
  return (
    <div className="popover-demo-command" onKeyDown={arrowFocus}>
      <SearchInput label={label} placeholder={placeholder} value={search} onChange={onSearch} inputRef={inputRef} />
      <div className="popover-demo-command-list" role="group" aria-label={label.replace(/^Search /, '')}>
        {visible.length === 0 ? (
          <div className="popover-demo-command-empty">{empty}</div>
        ) : (
          visible.map((group, index) => (
            <div
              key={group.heading ?? index}
              role="group"
              aria-label={group.heading}
              className="popover-demo-command-group"
            >
              {group.heading && (
                <p className="popover-demo-command-heading" aria-hidden="true">
                  {group.heading}
                </p>
              )}
              {group.choices.map(choice => (
                <button
                  key={choice.value}
                  type="button"
                  className="popover-demo-choice"
                  aria-pressed={choice.value === selected}
                  disabled={choice.disabled}
                  onClick={() => onPick(choice.value)}
                >
                  {choice.icon}
                  <span className="popover-demo-choice-text">
                    <span>{choice.label}</span>
                    {choice.detail && <span className="popover-demo-muted">{choice.detail}</span>}
                  </span>
                  {choice.value === selected && (
                    <Check size={16} aria-hidden="true" className="popover-demo-choice-check" />
                  )}
                </button>
              ))}
            </div>
          ))
        )}
        {children}
      </div>
    </div>
  );
}

function Status({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="popover-demo-status">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Shared content used by the playground and the sections               */
/* ------------------------------------------------------------------ */

const people: readonly Choice[] = [
  { value: 'ama', label: 'Ama Owusu' },
  { value: 'jonas', label: 'Jonas Lindqvist' },
  { value: 'priya', label: 'Priya Raman' },
  { value: 'mateo', label: 'Mateo García Fernández de Córdoba' },
  { value: 'li', label: 'Li Wei' },
  { value: 'noor', label: 'Noor Haddad' },
];

type LoadState = 'ready' | 'loading' | 'error' | 'empty';

/** query-bar's linked-row picker: search, then loading, error, empty, or a list. */
function ReferencePicker({ state, label = 'Owner' }: { state: LoadState; label?: string }) {
  const id = useId();
  const [term, setTerm] = useState('');
  const [values, setValues] = useState<string[]>(['priya']);
  const choices =
    state === 'empty' ? [] : people.filter(p => p.label.toLowerCase().includes(term.trim().toLowerCase()));
  const name = (value: string) => people.find(p => p.value === value)?.label ?? value;
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <span className="popover-demo-truncate">
          {values.length ? values.map(name).join(', ') : `Choose ${label.toLowerCase()}`}
        </span>
      </PopoverTrigger>
      <PopoverContent size="picker">
        <div className="popover-demo-stack popover-demo-p3">
          <div className="popover-demo-field">
            <label htmlFor={id}>Search {label}</label>
            <Input
              id={id}

              value={term}
              maxLength={255}
              autoComplete="off"
              onChange={event => setTerm(event.target.value)}
            />
          </div>
          {state === 'error' ? (
            <p className="popover-demo-error">Couldn’t load linked rows. Try another search.</p>
          ) : state === 'loading' ? (
            <p role="status" className="popover-demo-inline">
              <Spinner />
              Loading rows…
            </p>
          ) : !choices.length ? (
            <p className="popover-demo-muted">No rows match.</p>
          ) : (
            <ul className="popover-demo-rows">
              {choices.map(choice => {
                const on = values.includes(choice.value);
                return (
                  <li key={choice.value}>
                    <Button
                      variant={on ? 'secondary' : 'ghost'}
                      size="sm"
                      aria-pressed={on}
                      onClick={() => setValues(on ? values.filter(v => v !== choice.value) : [...values, choice.value])}
                    >
                      {choice.label}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type PendingState = 'ready' | 'loading' | 'failed' | 'empty';

const pendingWork = [
  {
    id: 't1',
    kind: 'Task',
    title: 'Draft the Q4 hiring plan',
    meta: 'Due Friday · Priya Raman',
  },
  {
    id: 'a1',
    kind: 'Approval',
    title: 'Approve vendor contract: Northwind Logistics',
    meta: 'Requested by Jonas Lindqvist',
  },
  {
    id: 't2',
    kind: 'Task',
    title: 'Review onboarding checklist for the Lisbon office',
    meta: 'No due date',
  },
  {
    id: 't3',
    kind: 'Task',
    title: 'Reconcile September card expenses',
    meta: 'Due Oct 24 · Finance',
  },
];

/** calendar.tsx's Pending work trigger and work-list panel. */
function PendingWork({
  state,
  onRetry,
  onViewAll,
}: {
  state: PendingState;
  onRetry?: () => void;
  onViewAll?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const count = state === 'ready' ? pendingWork.length : state === 'empty' ? 0 : null;
  const label = state === 'failed' ? '!' : count === null ? '…' : String(count);
  const description =
    state === 'failed'
      ? 'Some pending work could not load. Open to retry.'
      : count === null
        ? 'Loading pending work'
        : `${label} tasks and approvals without a scheduled time`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="md" aria-label="Pending work" title={description} />}>
        <Inbox size={14} aria-hidden="true" />
        <span className="popover-demo-pending-label">Pending work</span>
        <Badge
          variant={
            state === 'failed' ? 'destructive' : count === 0 ? 'secondary' : count === null ? 'secondary' : 'warning'
          }
        >
          {label}
        </Badge>
        <ChevronDown size={14} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent size="work-list" align="start" aria-label="Pending work">
        <div className="popover-demo-work-header">
          <PopoverHeader>
            <PopoverTitle>Pending work</PopoverTitle>
            <PopoverDescription>Tasks and approvals without a scheduled time.</PopoverDescription>
          </PopoverHeader>
        </div>
        <div role="region" aria-label="Unscheduled tasks and approvals" tabIndex={0} className="popover-demo-work-body">
          {state === 'loading' && (
            <p role="status" className="popover-demo-inline">
              <Spinner />
              Loading pending work…
            </p>
          )}
          {state === 'failed' && (
            <div className="popover-demo-stack">
              <p role="alert" className="popover-demo-error">
                Some pending work could not load.
              </p>
              <div>
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Retry loading pending work
                </Button>
              </div>
            </div>
          )}
          {state === 'ready' && (
            <div className="popover-demo-work-items">
              {pendingWork.map(item => (
                <article key={item.id} className="popover-demo-work-item">
                  <Badge variant={item.kind === 'Approval' ? 'info' : 'secondary'}>{item.kind}</Badge>
                  <p className="popover-demo-work-title">{item.title}</p>
                  <p className="popover-demo-muted">{item.meta}</p>
                </article>
              ))}
            </div>
          )}
          {state === 'empty' && <p className="popover-demo-muted popover-demo-py3">You’re all caught up.</p>}
        </div>
        <footer className="popover-demo-work-footer">
          <Button
            variant="ghost"
            size="sm"
            aria-label="View all pending work"
            onClick={() => {
              setOpen(false);
              onViewAll?.();
            }}
          >
            View all
            <ChevronRight size={14} aria-hidden="true" />
          </Button>
        </footer>
      </PopoverContent>
    </Popover>
  );
}

interface AppAction {
  label: string;
}
interface ResultApp {
  name: string;
  brand?: Brand;
  actions: readonly AppAction[];
}

const slackApp: ResultApp = {
  name: 'Slack',
  brand: 'slack',
  actions: [{ label: 'Post summary to #ops-weekly' }, { label: 'Send as a direct message' }],
};
const resultApps: readonly ResultApp[] = [
  slackApp,
  {
    name: 'Google Sheets',
    brand: 'google-sheets',
    actions: [{ label: 'Append rows to Q4 forecast' }],
  },
  {
    name: 'Linear',
    brand: 'linear',
    actions: [{ label: 'Create issue in Platform' }, { label: 'Link to an existing issue' }],
  },
  { name: 'Internal CRM', actions: [{ label: 'Update the account record' }] },
];

/** result-card's app tile: opens on hover after 800ms, and on click or keyboard. */
function AppActions({
  apps,
  disabled,
  onAction,
}: {
  apps: readonly ResultApp[];
  disabled?: boolean;
  onAction?: (text: string) => void;
}) {
  const first = apps[0]!;
  const overflow = apps.length > 1;
  const title = overflow ? `Send to ${apps.length} apps` : `Send to ${first.name}`;
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={800}
        closeDelay={200}
        render={<BrandTile size="action" render={<Button variant="ghost" size="icon" disabled={disabled} />} />}
        aria-label={title}
      >
        {overflow ? (
          <span className="popover-demo-overflow">+{apps.length}</span>
        ) : first.brand ? (
          <BrandIcon brand={first.brand} size="fill" />
        ) : (
          <Plug size={18} aria-hidden="true" />
        )}
      </PopoverTrigger>
      <PopoverContent
        size="app-actions"
        align="start"
        sideOffset={8}
        initialFocus={interaction => interaction !== 'mouse'}
      >
        <PopoverTitle>{title}</PopoverTitle>
        <div className="popover-demo-apps">
          {apps.map(app => (
            <section key={app.brand ?? app.name} aria-label={app.name} className="popover-demo-stack-sm">
              {overflow && (
                <div className="popover-demo-app-name">
                  {app.brand ? <BrandIcon brand={app.brand} size="glyph" /> : <Plug size={20} aria-hidden="true" />}
                  <h4>{app.name}</h4>
                </div>
              )}
              <div className="popover-demo-app-actions">
                {app.actions.map(action => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    onClick={() => onAction?.(`${app.name}: ${action.label} (sample, nothing sent).`)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/* Playground                                                          */
/* ------------------------------------------------------------------ */

export function PopoverPlayground() {
  const [result, setResult] = useState('Open a size. Nothing here is saved.');
  const [budOpen, setBudOpen] = useState(false);
  return (
    <section className="popover-demo-playground" aria-label="Popover playground">
      <div className="popover-demo-stage">
        <div className="popover-demo-size" data-size="default">
          <span className="popover-demo-size-name">default</span>
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>Saved</PopoverTrigger>
            <PopoverContent align="end">
              <PopoverTitle>Saved</PopoverTitle>
              <PopoverDescription>All changes to “Q4 hiring plan” were saved at 14:32.</PopoverDescription>
            </PopoverContent>
          </Popover>
        </div>
        <div className="popover-demo-size" data-size="menu">
          <span className="popover-demo-size-name">menu</span>
          <SummaryMenu />
        </div>
        <div className="popover-demo-size" data-size="picker">
          <span className="popover-demo-size-name">picker</span>
          <ReferencePicker state="ready" />
        </div>
        <div className="popover-demo-size" data-size="panel">
          <span className="popover-demo-size-name">panel</span>
          <SearchPanel searchable />
        </div>
        <div className="popover-demo-size" data-size="work-list">
          <span className="popover-demo-size-name">work-list</span>
          <PendingWork state="ready" onViewAll={() => setResult('All pending work would open in the side panel.')} />
        </div>
        <div className="popover-demo-size" data-size="app-actions">
          <span className="popover-demo-size-name">app-actions</span>
          <AppActions apps={[slackApp]} onAction={setResult} />
        </div>
        <div className="popover-demo-size" data-size="bud">
          <span className="popover-demo-size-name">bud</span>
          <Popover open={budOpen} onOpenChange={setBudOpen}>
            <PopoverTrigger render={<Button variant="outline" size="lg" aria-label="Open Bud quick chat" />}>
              <span className="popover-demo-bud-face" aria-hidden="true">
                <Sparkle size={16} />
              </span>
              Bud
            </PopoverTrigger>
            <PopoverContent size="bud" side="top" align="end" sideOffset={8}>
              <BudWindow onMinimize={() => setBudOpen(false)} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="popover-demo-readout">
        <Status>{result}</Status>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sources, status, and help (default size)                            */
/* ------------------------------------------------------------------ */

type Citation =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; title: string; location: string; excerpt: string }
  | { kind: 'unavailable'; message: string }
  | { kind: 'error'; message: string };

function CitationLink({ label, outcome }: { label: string; outcome: 'ready' | 'unavailable' | 'error' }) {
  const [state, setState] = useState<Citation>({ kind: 'idle' });
  const later = useLater();
  const load = (failOnce: boolean) => {
    setState({ kind: 'loading' });
    later(() => {
      if (outcome === 'unavailable')
        setState({
          kind: 'unavailable',
          message: 'You no longer have access to this file. Ask its owner to share it again.',
        });
      else if (outcome === 'error' && failOnce)
        setState({
          kind: 'error',
          message: 'The source didn’t respond. Check your connection and try again.',
        });
      else
        setState({
          kind: 'ready',
          title: label,
          location: 'Google Drive › Planning › 2026',
          excerpt: 'Hiring stays flat in Q4. Two backfills for support are approved; new roles move to Q1 review.',
        });
    });
  };
  return (
    <Popover
      onOpenChange={open => {
        if (open && (state.kind === 'idle' || state.kind === 'error')) load(state.kind === 'idle');
      }}
    >
      <PopoverTrigger render={<Button variant="link" size="md" aria-label={`Source: ${label}`} />}>
        {label}
      </PopoverTrigger>
      <PopoverContent>
        {state.kind === 'idle' || state.kind === 'loading' ? (
          <p role="status" className="popover-demo-inline popover-demo-muted">
            <Spinner />
            Checking access to this source…
          </p>
        ) : state.kind === 'ready' ? (
          <div className="popover-demo-stack popover-demo-source">
            <p className="popover-demo-strong">{state.title}</p>
            <p className="popover-demo-xs popover-demo-muted">{state.location}</p>
            <p className="popover-demo-muted popover-demo-pre">{state.excerpt}</p>
          </div>
        ) : (
          <div className="popover-demo-stack">
            <p className="popover-demo-strong">
              {state.kind === 'unavailable' ? 'Source unavailable' : 'Couldn’t load this source'}
            </p>
            <p role="alert" className="popover-demo-muted">
              {state.message}
            </p>
            {state.kind === 'error' && (
              <div>
                <Button variant="outline" size="sm" onClick={() => load(false)}>
                  Load source again
                </Button>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

const sources = [
  {
    title: 'Q4 hiring plan.docx',
    url: 'drive.google.com/…/q4-hiring-plan',
    snippet: 'Two support backfills approved; engineering roles move to the Q1 review.',
  },
  {
    title: 'Weekly ops sync — Oct 14',
    url: 'notion.so/ops/weekly-sync-oct-14',
    snippet: 'Action: Jonas confirms Northwind contract terms before Friday.',
  },
];

export function PopoverSources() {
  return (
    <Example
      title="Sources and help"
      description="Default size: an 18rem padded panel for short text, centered under its trigger."
    >
      <Row label="Chat citation" note="secondary icon-xs · default · center">
        <p className="popover-demo-sentence">
          Support backfills are approved
          {sources.map((source, index) => (
            <Popover key={source.title}>
              <PopoverTrigger
                render={
                  <Button variant="secondary" size="icon-xs" aria-label={`Source ${index + 1}: ${source.title}`} />
                }
              >
                {index + 1}
              </PopoverTrigger>
              <PopoverContent>
                <div className="popover-demo-stack-sm popover-demo-source">
                  <p className="popover-demo-strong">{source.title}</p>
                  <p className="popover-demo-xs popover-demo-muted">{source.url}</p>
                  <p className="popover-demo-muted">{source.snippet}</p>
                </div>
              </PopoverContent>
            </Popover>
          ))}
        </p>
      </Row>
      <Row label="Source links" note="link task-link · loads on open · ready, unavailable, error and retry">
        <CitationLink label="Q4 hiring plan.docx" outcome="ready" />
        <CitationLink label="Board deck — October" outcome="unavailable" />
        <CitationLink label="Vendor pricing sheet" outcome="error" />
      </Row>
      <Row label="Integration help" note="ghost xs · default · align end · external link">
        <Popover>
          <PopoverTrigger render={<Button variant="ghost" size="sm" />}>Missing a repository?</PopoverTrigger>
          <PopoverContent align="end">
            <p>
              Your GitHub login includes repositories you own and those shared with you. Organizations may require owner
              approval or SSO authorization.
            </p>
            <p>
              Check organization access in{' '}
              <a
                className="popover-demo-link"
                href="https://github.com/settings/applications"
                target="_blank"
                rel="noreferrer"
              >
                GitHub Settings → Applications → Authorized OAuth Apps
              </a>
              , then reopen this picker.
            </p>
          </PopoverContent>
        </Popover>
      </Row>
      <Row label="Project sharing" note="scope badge · default · side top, align start · archived note and link">
        <ProjectSharing name="Lisbon office launch" />
        <ProjectSharing name="Customer research archive 2024" archived />
      </Row>
    </Example>
  );
}

function ProjectSharing({ name, archived }: { name: string; archived?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="scope"
            size="sm"
            aria-label={`Project sharing details: ${name}`}
            title="Project sharing details"
          />
        }
      >
        <Folder size={16} aria-hidden="true" />
        <span className="popover-demo-ellipsis">
          {name}
          {archived ? ' (archived)' : ''}
        </span>
      </PopoverTrigger>
      <PopoverContent side="top" align="start">
        <PopoverTitle>Shared in this project</PopoverTitle>
        <p className="popover-demo-muted">Project members can read this chat.</p>
        {archived && <p className="popover-demo-muted">The project is archived, so this chat is read-only.</p>}
        <Button variant="link" size="md" nativeButton={false} render={<a href="#popover-sources" />}>
          {name}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function PopoverStatus() {
  const [shown, setShown] = useState(0);
  const [retried, setRetried] = useState(false);
  return (
    <Example
      title="Toolbar status"
      description="A status button announces changes and opens details. Errors use the destructive button."
    >
      <Row label="Saved" note="outline sm · default · align end">
        <ToolbarStatus label="Saved" message="All changes to “Q4 hiring plan” were saved at 14:32." />
      </Row>
      <Row label="Sync failed" note="destructive sm · role alert · action inside">
        <ToolbarStatus
          label={retried ? 'Syncing…' : 'Sync failed'}
          error={!retried}
          message={
            retried
              ? 'Trying again. Keep this tab open.'
              : 'Google Calendar didn’t accept 3 changes. Your edits are kept on this device.'
          }
        >
          {!retried && (
            <div>
              <Button variant="outline" size="sm" onClick={() => setRetried(true)}>
                Try sync again
              </Button>
            </div>
          )}
        </ToolbarStatus>
      </Row>
      <Row label="Open on load" note="defaultOpen · shows details once, then stays closed">
        {shown > 0 ? (
          <ToolbarStatus
            key={shown}
            defaultOpen
            label="Offline"
            message="You’re offline. Changes save when the connection returns."
          />
        ) : (
          <span className="popover-demo-muted">Not mounted</span>
        )}
        <Button variant="ghost" size="sm" onClick={() => setShown(n => n + 1)}>
          Mount with defaultOpen
        </Button>
      </Row>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Pickers (menu and picker sizes)                                     */
/* ------------------------------------------------------------------ */

const modes: readonly Choice[] = [
  {
    value: 'mode:ask',
    label: 'Ask',
    detail: 'Answers from your workspace',
    icon: <ChatRound size={16} aria-hidden="true" />,
  },
  {
    value: 'mode:research',
    label: 'Research',
    detail: 'Reads widely, cites every source',
    icon: <Search size={16} aria-hidden="true" />,
  },
  {
    value: 'mode:quick',
    label: 'Quick',
    detail: 'Short answers, no tools',
    icon: <Flash size={16} aria-hidden="true" />,
  },
];
const agents: readonly Choice[] = [
  {
    value: 'agent:recruiter',
    label: 'Recruiting coordinator',
    detail: 'Schedules interviews and drafts offers',
    icon: <Sparkle size={16} aria-hidden="true" />,
  },
  {
    value: 'agent:finance',
    label: 'Expense reviewer',
    detail: 'Checks receipts against the travel policy',
    icon: <DocumentText size={16} aria-hidden="true" />,
  },
];

function PersonaPicker() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const all = [...modes, ...agents];
  const value = all.find(choice => choice.value === selected);
  const label = value?.label ?? 'Mode';
  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <PopoverTrigger render={<Button size="sm" variant="ghost" aria-label={`Mode or agent: ${label}`} />}>
        {value?.icon ?? <Sparkle size={16} aria-hidden="true" />}
        {label}
        <ChevronDown size={12} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent size="menu" side="top" align="start" sideOffset={8}>
        <ChoiceList
          label="Search modes and agents"
          placeholder="Search modes and agents…"
          search={search}
          onSearch={setSearch}
          groups={[
            { heading: 'Modes', choices: modes },
            { heading: 'Agents', choices: agents },
          ]}
          selected={selected}
          onPick={next => {
            setSelected(next === selected ? null : next);
            setOpen(false);
          }}
          empty="No matches."
        />
      </PopoverContent>
    </Popover>
  );
}

const models: readonly (Choice & { efforts: readonly string[] })[] = [
  {
    value: 'claude',
    label: 'Claude Sonnet',
    efforts: ['Low', 'Medium', 'High'],
    icon: <BrandIcon brand="claude" size="inline" />,
  },
  {
    value: 'openai',
    label: 'GPT-5 mini',
    efforts: [],
    icon: <BrandIcon brand="openai" size="inline" />,
  },
  {
    value: 'deepseek',
    label: 'DeepSeek R2',
    efforts: ['Low', 'High'],
    icon: <BrandIcon brand="deepseek" size="inline" />,
  },
  {
    value: 'grok',
    label: 'Grok 4 (needs an admin to enable)',
    efforts: [],
    disabled: true,
    icon: <BrandIcon brand="grok" size="inline" />,
  },
];

function ModelPicker() {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState('claude');
  const [effort, setEffort] = useState('Medium');
  const [search, setSearch] = useState('');
  const current = models.find(m => m.value === model)!;
  const showEffort = current.efforts.length > 0;
  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <Tooltip.Provider delay={300}>
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <PopoverTrigger
                render={
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Model: ${current.label}${showEffort ? `, ${effort} effort` : ''}`}
                  />
                }
              />
            }
          >
            {current.icon}
            <span className="popover-demo-truncate popover-demo-max-32">{current.label}</span>
            <ChevronDown size={12} aria-hidden="true" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner sideOffset={6} className="popover-demo-tooltip-positioner">
              <Tooltip.Popup className="popover-demo-tooltip">AI model that writes replies</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
      <PopoverContent size="picker" side="top" align="end" sideOffset={8}>
        <ChoiceList
          label="Search models"
          placeholder="Search models…"
          search={search}
          onSearch={setSearch}
          groups={[{ heading: 'Model', choices: models }]}
          selected={model}
          onPick={next => {
            setModel(next);
            const picked = models.find(m => m.value === next)!;
            if (picked.efforts.length && !picked.efforts.includes(effort)) setEffort(picked.efforts.at(-1)!);
            if (!picked.efforts.length) setOpen(false);
          }}
          empty="No models found."
        />
        {showEffort && (
          <div className="popover-demo-effort">
            <div className="popover-demo-effort-head">
              <span className="popover-demo-muted">Effort</span>
              <span className="popover-demo-strong">{effort}</span>
            </div>
            <Segmented
              label={`${current.label} reasoning effort`}
              value={effort}
              options={current.efforts.map(level => ({
                value: level,
                label: level,
              }))}
              onChange={setEffort}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

const projects = [
  { id: 'p1', name: 'Lisbon office launch' },
  { id: 'p2', name: 'Q4 hiring plan' },
  {
    id: 'p3',
    name: 'Customer research archive 2024 — interviews, surveys, and synthesis',
    archived: true,
  },
];

type ProjectState = 'ready' | 'loading' | 'failed' | 'none';

/** project-scope: outline field, scope badge, or ghost "Personal chat" badge. */
function ProjectScope({
  appearance,
  state,
  onRetry,
}: {
  appearance: 'field' | 'badge' | 'private';
  state: ProjectState;
  onRetry: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | null>(appearance === 'badge' ? 'p1' : null);
  const [search, setSearch] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const list = state === 'ready' ? projects : [];
  const name = value ? (projects.find(p => p.id === value)?.name ?? 'Project') : 'Personal chats';
  const badge = appearance !== 'field';
  const privateBadge = appearance === 'private' && !value;
  const Icon = value ? Folder : Lock;
  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant={privateBadge ? 'ghost' : badge ? 'scope' : 'outline'}
            size={badge ? 'sm' : 'md'}
            aria-label={`Project: ${privateBadge ? 'Personal chat' : name}`}
            title={privateBadge ? 'Personal chat. Choose a project to share it.' : name}
          />
        }
      >
        <Icon size={16} aria-hidden="true" />
        <span className="popover-demo-ellipsis">{privateBadge ? 'Personal chat' : name}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent size="picker" side={badge ? 'top' : 'bottom'} align="start" sideOffset={8}>
        <ChoiceList
          label="Search projects"
          placeholder="Search projects…"
          inputRef={input}
          search={search}
          onSearch={setSearch}
          groups={[
            {
              choices: [
                {
                  value: 'private',
                  label: 'Personal chats',
                  icon: <Lock size={16} aria-hidden="true" />,
                },
              ],
            },
            {
              heading: 'Projects',
              choices: list.map(p => ({
                value: p.id,
                label: `${p.name}${p.archived ? ' (archived)' : ''}`,
                icon: <Folder size={16} aria-hidden="true" />,
              })),
            },
          ]}
          selected={value ?? 'private'}
          onPick={next => {
            setValue(next === 'private' ? null : next);
            setOpen(false);
          }}
          empty={
            <div className="popover-demo-stack-sm">
              <span>No matching projects.</span>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    input.current?.focus();
                  }}
                >
                  Clear search
                </Button>
              </div>
            </div>
          }
        />
        {state === 'loading' && (
          <p role="status" className="popover-demo-note">
            Loading projects…
          </p>
        )}
        {state === 'failed' && (
          <div className="popover-demo-note popover-demo-stack-sm">
            <p role="alert" className="popover-demo-error">
              Could not load projects.
            </p>
            <div>
              <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                Retry loading projects
              </Button>
            </div>
          </div>
        )}
        {state === 'none' && !search && (
          <p className="popover-demo-note popover-demo-muted">No active projects yet. Create one for shared chats.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function PopoverPickers() {
  const [projectState, setProjectState] = useState<ProjectState>('ready');
  const [rowsState, setRowsState] = useState<LoadState>('ready');
  return (
    <Example
      title="Pickers"
      description="Menu (24rem) and picker (18rem) sizes have no padding, so a search list can run edge to edge. Composer pickers open above."
    >
      <Row
        label="Chat composer"
        note="ghost sm · menu side top, align start · picker side top, align end · tooltip on trigger"
      >
        <div className="popover-demo-composer" role="group" aria-label="Sample message composer">
          <p className="popover-demo-muted">Ask about your workspace…</p>
          <div className="popover-demo-composer-bar">
            <PersonaPicker />
            <ModelPicker />
            <Button size="icon-sm" aria-label="Send message" disabled>
              <ArrowUp size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Row>
      <Row label="Chat project" note="outline default (below) · scope badge and ghost badge (above) · picker">
        <ProjectScope appearance="field" state={projectState} onRetry={() => setProjectState('ready')} />
        <ProjectScope appearance="badge" state={projectState} onRetry={() => setProjectState('ready')} />
        <ProjectScope appearance="private" state={projectState} onRetry={() => setProjectState('ready')} />
      </Row>
      <Row label="Project list state" note="ready, loading, failed with retry, no projects">
        <Segmented
          label="Project list state"
          value={projectState}
          onChange={setProjectState}
          options={[
            { value: 'ready', label: 'Ready' },
            { value: 'loading', label: 'Loading' },
            { value: 'failed', label: 'Failed' },
            { value: 'none', label: 'No projects' },
          ]}
        />
      </Row>
      <Row label="Linked rows" note="outline sm · picker · multi-select with aria-pressed">
        <ReferencePicker state={rowsState} />
        <Segmented
          label="Linked rows state"
          value={rowsState}
          onChange={setRowsState}
          options={[
            { value: 'ready', label: 'Ready' },
            { value: 'loading', label: 'Loading' },
            { value: 'error', label: 'Error' },
            { value: 'empty', label: 'Empty' },
          ]}
        />
      </Row>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Panels (panel and menu sizes)                                       */
/* ------------------------------------------------------------------ */

function SearchPanel({ searchable = true }: { searchable?: boolean }) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [tab, setTab] = useState(searchable ? 'text' : 'ai');
  const [rsql, setRsql] = useState('status==open;owner==priya');
  const [asking, setAsking] = useState(false);
  const later = useLater();
  const id = useId();
  return (
    <Popover>
      <PopoverTrigger render={<Button variant={query ? 'secondary' : 'outline'} size="sm" />}>
        <Search size={14} aria-hidden="true" />
        {query ? (
          <span title={query} className="popover-demo-truncate popover-demo-max-40">
            “{query}”
          </span>
        ) : (
          'Search'
        )}
      </PopoverTrigger>
      <PopoverContent size="panel" align="end">
        <Tabs.Root value={tab} onValueChange={value => setTab(String(value))}>
          <div className="popover-demo-tabs-bar">
            <Tabs.List className="popover-demo-tabs">
              {searchable && (
                <Tabs.Tab value="text" className="popover-demo-tab">
                  Text
                </Tabs.Tab>
              )}
              <Tabs.Tab value="ai" className="popover-demo-tab">
                Ask AI
              </Tabs.Tab>
              <Tabs.Tab value="rsql" className="popover-demo-tab">
                RSQL
              </Tabs.Tab>
            </Tabs.List>
          </div>
          {searchable && (
            <Tabs.Panel value="text" className="popover-demo-p4">
              <form
                className="popover-demo-stack"
                onSubmit={event => {
                  event.preventDefault();
                  setQuery(draft.trim());
                }}
              >
                <div className="popover-demo-field">
                  <label htmlFor={`${id}-text`}>Search rows</label>
                  <div className="popover-demo-inline">
                    <Input
                      id={`${id}-text`}

                      placeholder="Search text fields"
                      value={draft}
                      maxLength={200}
                      onChange={event => setDraft(event.target.value)}
                    />
                    <Button type="submit" size="sm">
                      Search
                    </Button>
                  </div>
                </div>
                <p className="popover-demo-muted">
                  Finds rows whose text fields contain these words. Filters still apply.
                </p>
              </form>
            </Tabs.Panel>
          )}
          <Tabs.Panel value="ai" className="popover-demo-p4">
            <div className="popover-demo-stack">
              <div className="popover-demo-field">
                <label htmlFor={`${id}-ai`}>Describe the rows you want</label>
                <Textarea
                  id={`${id}-ai`}

                  defaultValue="Open candidates in Lisbon with an interview this week"
                />
              </div>
              <div>
                <Button
                  size="sm"
                  disabled={asking}
                  aria-busy={asking}
                  onClick={() => {
                    setAsking(true);
                    later(() => {
                      setAsking(false);
                      setQuery('Lisbon interviews this week');
                    });
                  }}
                >
                  {asking ? 'Asking…' : 'Ask AI'}
                </Button>
              </div>
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="rsql" className="popover-demo-p4">
            <div className="popover-demo-stack">
              <div className="popover-demo-field">
                <label htmlFor={`${id}-rsql`}>RSQL filter</label>
                <Input
                  className="popover-demo-mono"
                  id={`${id}-rsql`}

                  value={rsql}
                  onChange={event => setRsql(event.target.value)}
                  aria-describedby={`${id}-rsql-help`}
                />
              </div>
              <p id={`${id}-rsql-help`} className="popover-demo-muted">
                Use <code>==</code>, <code>!=</code>, and <code>;</code> for AND.
              </p>
              <div>
                <Button size="sm" variant="outline" onClick={() => setQuery(rsql)}>
                  Apply filter
                </Button>
              </div>
            </div>
          </Tabs.Panel>
        </Tabs.Root>
      </PopoverContent>
    </Popover>
  );
}

const fieldItems = [
  { value: 'status', label: 'Status' },
  { value: 'owner', label: 'Owner' },
  { value: 'due', label: 'Due date' },
] as const;
const operatorItems = [
  { value: 'is', label: 'is' },
  { value: 'not', label: 'is not' },
  { value: 'contains', label: 'contains' },
] as const;
type FieldId = (typeof fieldItems)[number]['value'];
type OperatorId = (typeof operatorItems)[number]['value'];
interface Rule {
  field: FieldId;
  operator: OperatorId;
  value: string;
}
const ruleLabel = (rule: Rule) =>
  `${fieldItems.find(f => f.value === rule.field)!.label} ${operatorItems.find(o => o.value === rule.operator)!.label} ${rule.value}`;

function FilterEditor({
  rule,
  onSave,
  onRemove,
}: {
  rule?: Rule;
  onSave: (rule: Rule) => void;
  onRemove?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Rule>(rule ?? { field: 'status', operator: 'is', value: '' });
  const [problem, setProblem] = useState<string>();
  const id = useId();
  const label = rule ? ruleLabel(rule) : '';
  const commit = () => {
    if (!draft.value.trim()) {
      setProblem('Enter a value to filter by.');
      return;
    }
    onSave({ ...draft, value: draft.value.trim() });
    setOpen(false);
  };
  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (next) {
          setDraft(rule ?? { field: 'status', operator: 'is', value: '' });
          setProblem(undefined);
        }
      }}
    >
      <PopoverTrigger
        render={
          rule ? (
            <Button variant="outline" size="sm" aria-label={`Edit filter: ${label}`} />
          ) : (
            <Button variant="ghost" size="sm" />
          )
        }
      >
        {rule ? (
          <span title={label} className="popover-demo-truncate popover-demo-max-64">
            {label}
          </span>
        ) : (
          <>
            <Add size={14} aria-hidden="true" />
            Add filter
          </>
        )}
      </PopoverTrigger>
      <PopoverContent size="panel" align="start">
        <div className="popover-demo-stack popover-demo-p4">
          <PopoverHeader>
            <PopoverTitle>{rule ? 'Edit filter' : 'Add filter'}</PopoverTitle>
          </PopoverHeader>
          <div className="popover-demo-rule">
            <DocsSelect
              label="Filter field"
              value={draft.field}
              items={fieldItems}
              onValueChange={field => setDraft({ ...draft, field })}
            />
            <DocsSelect
              label="Filter operator"
              value={draft.operator}
              items={operatorItems}
              onValueChange={operator => setDraft({ ...draft, operator })}
            />
            <Input
              id={id}
              aria-label="Filter value"
              aria-invalid={problem ? true : undefined}
              aria-describedby={problem ? `${id}-problem` : undefined}

              placeholder="Value"
              value={draft.value}
              onChange={event => {
                setDraft({ ...draft, value: event.target.value });
                setProblem(undefined);
              }}
            />
          </div>
          {problem && (
            <p id={`${id}-problem`} role="alert" className="popover-demo-error">
              {problem}
            </p>
          )}
          <div className="popover-demo-actions">
            <Button size="sm" onClick={commit}>
              {rule ? 'Apply' : 'Add filter'}
            </Button>
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onRemove();
                  setOpen(false);
                }}
              >
                Remove filter
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const groupFields = [
  { value: 'status', label: 'Status' },
  { value: 'owner', label: 'Owner' },
  { value: 'office', label: 'Office' },
] as const;
const metricItems = [
  { value: 'count', label: 'Count' },
  { value: 'sum', label: 'Sum of salary band' },
  { value: 'avg', label: 'Average of days open' },
] as const;
type GroupField = (typeof groupFields)[number]['value'];
type Metric = (typeof metricItems)[number]['value'];

/** query-bar's "Group and calculate": menu size with a header and rows of selects. */
function SummaryMenu() {
  const [groups, setGroups] = useState<GroupField[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const summarized = groups.length > 0 || metrics.length > 0;
  const label = summarized
    ? `Grouped${groups.length ? ` by ${groups.map(g => groupFields.find(f => f.value === g)!.label).join(', ')}` : ''}`
    : 'Customize';
  return (
    <Popover>
      <PopoverTrigger render={<Button variant={summarized ? 'secondary' : 'outline'} size="sm" />}>
        <SliderHorizontal size={14} aria-hidden="true" />
        <span className="popover-demo-truncate popover-demo-max-40">{label}</span>
      </PopoverTrigger>
      <PopoverContent size="menu">
        <div className="popover-demo-stack-lg popover-demo-p4">
          <PopoverHeader>
            <PopoverTitle>Group and calculate</PopoverTitle>
            <PopoverDescription>
              Summaries replace the row list. Remove every group and calculation to see rows again.
            </PopoverDescription>
          </PopoverHeader>
          <div className="popover-demo-stack-sm">
            <p className="popover-demo-strong">Group by</p>
            {groups.map((group, index) => (
              <div key={group} className="popover-demo-actions">
                <DocsSelect
                  label={`Group field ${index + 1}`}
                  value={group}
                  items={groupFields.filter(f => f.value === group || !groups.includes(f.value))}
                  onValueChange={value => setGroups(groups.map((g, at) => (at === index ? value : g)))}
                />
                <Button variant="ghost" size="sm" onClick={() => setGroups(groups.filter((_, at) => at !== index))}>
                  Remove
                </Button>
              </div>
            ))}
            {groups.length < groupFields.length && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGroups([...groups, groupFields.find(f => !groups.includes(f.value))!.value]);
                    if (!metrics.length) setMetrics(['count']);
                  }}
                >
                  <Add size={14} aria-hidden="true" />
                  Add group
                </Button>
              </div>
            )}
          </div>
          <div className="popover-demo-stack-sm">
            <p className="popover-demo-strong">Calculate</p>
            {metrics.map((metric, index) => (
              <div key={`${metric}.${index}`} className="popover-demo-actions">
                <DocsSelect
                  label={`Calculation ${index + 1}`}
                  value={metric}
                  items={metricItems}
                  onValueChange={value => setMetrics(metrics.map((m, at) => (at === index ? value : m)))}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${metricItems.find(m => m.value === metric)!.label}`}
                  onClick={() => setMetrics(metrics.filter((_, at) => at !== index))}
                >
                  Remove
                </Button>
              </div>
            ))}
            {metrics.length < 3 && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMetrics([...metrics, metrics.includes('count') ? 'sum' : 'count'])}
                >
                  <Add size={14} aria-hidden="true" />
                  Add calculation
                </Button>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function PopoverPanels() {
  const [rules, setRules] = useState<Rule[]>([
    {
      field: 'status',
      operator: 'is',
      value: 'Open, In review, or Waiting on candidate',
    },
  ]);
  return (
    <Example
      title="Table query bar"
      description="Panel size (32rem, never wider than the screen) holds forms and tabs. Search aligns to the end; filters align to the start."
    >
      <Row label="Search" note="outline sm, or secondary sm with the query · panel · align end · tabs">
        <SearchPanel />
      </Row>
      <Row label="Filters" note="outline sm (edit, truncated) and ghost sm (add) · panel · controlled · validation">
        {rules.map((rule, index) => (
          <FilterEditor
            key={index}
            rule={rule}
            onSave={next => setRules(rules.map((r, at) => (at === index ? next : r)))}
            onRemove={() => setRules(rules.filter((_, at) => at !== index))}
          />
        ))}
        <FilterEditor onSave={next => setRules([...rules, next])} />
      </Row>
      <Row label="Summaries" note="outline sm, or secondary sm when grouped · menu · header and description">
        <SummaryMenu />
      </Row>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar (work-list and default sizes)                               */
/* ------------------------------------------------------------------ */

const overlapping = [
  { id: 'e1', time: '09:00 – 09:30', title: 'Standup: Platform' },
  {
    id: 'e2',
    time: '09:00 – 10:00',
    title: 'Interview: Senior designer (Lisbon)',
  },
  {
    id: 'e3',
    time: '09:15 – 09:45',
    title: 'Vendor call: Northwind Logistics contract renewal and pricing review',
  },
];

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function MonthGrid({ selected, onSelect }: { selected: Date; onSelect: (date: Date) => void }) {
  const [month, setMonth] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));
  const first = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const title = month.toLocaleDateString('en', {
    month: 'long',
    year: 'numeric',
  });
  const move = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  return (
    <div className="popover-demo-month">
      <div className="popover-demo-month-head">
        <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => move(-1)}>
          <ChevronLeft size={16} aria-hidden="true" />
        </Button>
        <p aria-live="polite" className="popover-demo-strong">
          {title}
        </p>
        <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => move(1)}>
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
      <div className="popover-demo-month-grid" role="group" aria-label={title}>
        {weekdays.map(day => (
          <span key={day} className="popover-demo-weekday" aria-hidden="true">
            {day.slice(0, 2)}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const on = date.toDateString() === selected.toDateString();
          return (
            <button
              key={day}
              type="button"
              className="popover-demo-day"
              aria-pressed={on}
              aria-label={date.toLocaleDateString('en', { dateStyle: 'full' })}
              onClick={() => onSelect(date)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DatePicker() {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(new Date(2026, 9, 19));
  const title = `Week of ${day.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <h2 className="popover-demo-calendar-title" aria-label={title}>
        <PopoverTrigger render={<Button variant="ghost" size="md" aria-label="Choose date" />}>
          <span>{title}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </PopoverTrigger>
      </h2>
      <PopoverContent align="start" aria-label="Choose a calendar date">
        <MonthGrid
          selected={day}
          onSelect={date => {
            setDay(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function OverlapEvents() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="popover-demo-overlap-trigger"
        aria-label={`View all ${overlapping.length} events on Monday, October 19, 2026`}
      >
        <span className="popover-demo-overlap-count">
          {overlapping.length} events
          <ChevronDown size={12} aria-hidden="true" />
        </span>
        <span className="popover-demo-overlap-titles">
          {overlapping.slice(0, 2).map(event => (
            <span key={event.id}>
              {event.time.split(' ')[0]} · {event.title}
            </span>
          ))}
        </span>
      </PopoverTrigger>
      <PopoverContent size="work-list" align="start">
        <header className="popover-demo-work-header">
          <PopoverTitle>Events at this time</PopoverTitle>
          <PopoverDescription>Monday, October 19, 2026</PopoverDescription>
        </header>
        <div className="popover-demo-work-body">
          {overlapping.map(event => (
            <button key={event.id} type="button" className="popover-demo-event" onClick={() => setOpen(false)}>
              <Calendar size={14} aria-hidden="true" />
              <span className="popover-demo-choice-text">
                <span>{event.title}</span>
                <span className="popover-demo-muted">{event.time}</span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function PopoverCalendar() {
  const [state, setState] = useState<PendingState>('ready');
  const [result, setResult] = useState('');
  return (
    <Example
      title="Calendar"
      description="Work lists cap their height at 36rem or the space left, and scroll only the list between a fixed header and footer."
    >
      <Row label="Date title" note="ghost calendar-title inside an h2 · default · align start · labelled content">
        <DatePicker />
      </Row>
      <Row
        label="Pending work"
        note="outline calendar with badge · work-list · align start · header, scroll region, footer"
      >
        <PendingWork
          state={state}
          onRetry={() => setState('ready')}
          onViewAll={() => setResult('All pending work would open in the side panel.')}
        />
        <Segmented
          label="Pending work state"
          value={state}
          onChange={setState}
          options={[
            { value: 'ready', label: 'Ready' },
            { value: 'loading', label: 'Loading' },
            { value: 'failed', label: 'Failed' },
            { value: 'empty', label: 'Empty' },
          ]}
        />
      </Row>
      <Row label="Overlapping events" note="custom trigger class · work-list · align start · controlled">
        <OverlapEvents />
      </Row>
      <Status>{result}</Status>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Hover cards (app-actions)                                           */
/* ------------------------------------------------------------------ */

export function PopoverHoverCards() {
  const [result, setResult] = useState('');
  return (
    <Example
      title="App actions"
      description="Hover a tile for 800ms, or click or press Enter. Keyboard opens move focus inside; mouse opens keep it on the tile."
    >
      <Row label="One app" note="BrandTile action + ghost icon · app-actions · align start, sideOffset 8">
        <AppActions apps={[slackApp]} onAction={setResult} />
        <AppActions apps={[resultApps[3]!]} onAction={setResult} />
      </Row>
      <Row label="Several apps" note="overflow count · app names and icons · scrolls when tall">
        <AppActions apps={resultApps} onAction={setResult} />
      </Row>
      <Row label="Disabled" note="disabled tile never opens">
        <AppActions apps={[slackApp]} disabled />
      </Row>
      <Status>{result}</Status>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Anchored quick chat (bud)                                           */
/* ------------------------------------------------------------------ */

function BudWindow({
  onMinimize,
  onOpenFull,
  failure,
  onReload,
  positionError,
  onSavePosition,
}: {
  onMinimize: () => void;
  onOpenFull?: () => void;
  failure?: boolean;
  onReload?: () => void;
  positionError?: boolean;
  onSavePosition?: () => void;
}) {
  const id = useId();
  return (
    <>
      <header className="popover-demo-bud-header">
        <div>
          <PopoverTitle>Bud quick chat</PopoverTitle>
          <PopoverDescription>Your separate private chat</PopoverDescription>
        </div>
        <div className="popover-demo-actions-tight">
          {onOpenFull && !failure && (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Open full chat"
              title="Open full chat"
              onClick={onOpenFull}
            >
              <Maximize2 size={16} aria-hidden="true" />
            </Button>
          )}
          <Button size="icon-sm" variant="ghost" aria-label="Minimize chat" title="Minimize chat" onClick={onMinimize}>
            <Minus size={16} aria-hidden="true" />
          </Button>
        </div>
      </header>
      {failure ? (
        <div role="alert" className="popover-demo-bud-failure">
          <p>Bud couldn’t start a chat. Your workspace is fine; try again.</p>
          <div>
            <Button size="sm" variant="ghost" onClick={onReload}>
              Reload Bud
            </Button>
          </div>
        </div>
      ) : (
        <div className="popover-demo-bud-body">
          <ol className="popover-demo-bud-messages" aria-label="Messages">
            <li data-from="user">What’s on my plate before Friday?</li>
            <li data-from="bud">
              Three things: approve the Northwind contract, review the Lisbon onboarding checklist, and reconcile
              September card expenses.
            </li>
            <li data-from="user">Draft a reply to Jonas about Northwind.</li>
          </ol>
          <form className="popover-demo-bud-composer" onSubmit={event => event.preventDefault()}>
            <label htmlFor={id} className="sr-only">
              Message Bud
            </label>
            <Input
              id={id}

              placeholder="Message Bud…"
              autoComplete="off"
            />
            <Button type="submit" size="icon-sm" aria-label="Send message">
              <ArrowUp size={16} aria-hidden="true" />
            </Button>
          </form>
        </div>
      )}
      {positionError && (
        <div role="alert" className="popover-demo-bud-position">
          <p>Couldn’t save where Bud sits.</p>
          <Button size="sm" variant="ghost" onClick={onSavePosition}>
            Save position again
          </Button>
        </div>
      )}
    </>
  );
}

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export function PopoverQuickChat() {
  const launcher = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [corner, setCorner] = useState<Corner>('bottom-right');
  const [failure, setFailure] = useState(false);
  const [positionError, setPositionError] = useState(false);
  const [result, setResult] = useState('');
  const top = corner.startsWith('top');
  const left = corner.endsWith('left');
  return (
    <Example
      title="Anchored quick chat"
      description="No trigger: the bud size anchors to a launcher, stays mounted while closed, and doesn’t trap the page."
    >
      <div className="popover-demo-bud-stage" data-corner={corner}>
        <Button
          ref={launcher}
          size="lg"
          variant="outline"
          aria-label={open ? 'Hide Bud quick chat' : 'Open Bud quick chat'}
          aria-expanded={open}
          onClick={() => setOpen(value => !value)}
          className="popover-demo-launcher"
        >
          <span className="popover-demo-bud-face" aria-hidden="true">
            <Sparkle size={16} />
          </span>
          Bud
        </Button>
      </div>
      <Popover
        open={open}
        modal={false}
        onOpenChange={(next, details) => {
          if (
            !next &&
            details.reason === 'outside-press' &&
            details.event.target instanceof Node &&
            launcher.current?.contains(details.event.target)
          ) {
            details.cancel();
            return;
          }
          setOpen(next);
        }}
      >
        <PopoverContent
          size="bud"
          keepMounted
          anchor={launcher}
          finalFocus={launcher}
          side={top ? 'bottom' : 'top'}
          align={left ? 'start' : 'end'}
          sideOffset={8}
        >
          <BudWindow
            onMinimize={() => setOpen(false)}
            onOpenFull={() => setResult('The full chat page would open. Nothing was sent.')}
            failure={failure}
            onReload={() => setFailure(false)}
            positionError={positionError}
            onSavePosition={() => setPositionError(false)}
          />
        </PopoverContent>
      </Popover>
      <Row label="Launcher corner" note="side and align follow the corner">
        <Segmented
          label="Launcher corner"
          value={corner}
          onChange={setCorner}
          options={[
            { value: 'top-left', label: 'Top left' },
            { value: 'top-right', label: 'Top right' },
            { value: 'bottom-left', label: 'Bottom left' },
            { value: 'bottom-right', label: 'Bottom right' },
          ]}
        />
      </Row>
      <Row label="Errors" note="load failure and position failure, each with a retry">
        <Button variant="ghost" size="sm" aria-pressed={failure} onClick={() => setFailure(v => !v)}>
          Chat failed to load
        </Button>
        <Button variant="ghost" size="sm" aria-pressed={positionError} onClick={() => setPositionError(v => !v)}>
          Position not saved
        </Button>
      </Row>
      <Status>{result}</Status>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Placement                                                           */
/* ------------------------------------------------------------------ */

const sides = ['top', 'right', 'bottom', 'left'] as const;
const aligns = ['start', 'center', 'end'] as const;

export function PopoverPlacement() {
  const [align, setAlign] = useState<NonNullable<PopoverContentProps['align']>>('center');
  return (
    <Example
      title="Placement"
      description="Pick a preferred side and alignment. The panel flips or shifts to stay on screen."
    >
      <Row label="Alignment" note="start, center (default), end">
        <Segmented
          label="Alignment"
          value={align}
          onChange={setAlign}
          options={aligns.map(value => ({
            value,
            label: value[0]!.toUpperCase() + value.slice(1),
          }))}
        />
      </Row>
      <div className="popover-demo-placement" role="group" aria-label="Sides">
        {sides.map(side => (
          <Popover key={side}>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
              {side[0]!.toUpperCase() + side.slice(1)}
            </PopoverTrigger>
            <PopoverContent side={side} align={align}>
              <PopoverHeader>
                <PopoverTitle>Opens {side}</PopoverTitle>
                <PopoverDescription>Aligned to the {align} of the trigger, 4px away.</PopoverDescription>
              </PopoverHeader>
            </PopoverContent>
          </Popover>
        ))}
      </div>
    </Example>
  );
}
