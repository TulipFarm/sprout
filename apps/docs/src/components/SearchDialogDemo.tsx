import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Add } from 'reicon-react/icons/Add';
import { Calendar } from 'reicon-react/icons/Calendar';
import { CalendarDays } from 'reicon-react/icons/CalendarDays';
import { ChatRound } from 'reicon-react/icons/ChatRound';
import { CheckSquare } from 'reicon-react/icons/CheckSquare';
import { Command } from 'reicon-react/icons/Command';
import { Cpu } from 'reicon-react/icons/Cpu';
import { DocumentText } from 'reicon-react/icons/DocumentText';
import { Folder } from 'reicon-react/icons/Folder';
import { Hierarchy } from 'reicon-react/icons/Hierarchy';
import { Home } from 'reicon-react/icons/Home';
import { Inbox } from 'reicon-react/icons/Inbox';
import { Page } from 'reicon-react/icons/Page';
import { Search3 } from 'reicon-react/icons/Search3';
import { Setting2 } from 'reicon-react/icons/Setting2';
import { Users } from 'reicon-react/icons/Users';
import { Button } from '@tulipfarm/sprout/button';
import {
  SearchDialog,
  SearchEmpty,
  SearchFilter,
  SearchFilters,
  SearchFooter,
  SearchGroup,
  SearchHint,
  SearchInput,
  SearchItem,
  SearchItemIcon,
  SearchList,
} from '@tulipfarm/sprout/search-dialog';
import { Example, Row } from './dialog-demo-parts';
import '../styles/search-dialog-demo.css';

type Icon = typeof Add;

function Status({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="search-dialog-demo-status">
      {children}
    </p>
  );
}

const words = (query: string) => query.trim().toLowerCase().split(/\s+/).filter(Boolean);
const matchesAll = (text: string, terms: string[]) => terms.every(term => text.toLowerCase().includes(term));

/* ------------------------------------------------------------------ */
/* Workspace jump-to palette                                           */
/* ------------------------------------------------------------------ */

type Entry = { id: string; title: string; icon?: Icon | undefined };

const workspacePages: Entry[] = [
  { id: 'page-home', title: 'Home', icon: Home },
  { id: 'page-chats', title: 'Chats', icon: ChatRound },
  { id: 'page-inbox', title: 'Inbox', icon: Inbox },
  { id: 'page-agents', title: 'Agents', icon: Cpu },
  { id: 'page-workflows', title: 'Workflows', icon: Hierarchy },
  { id: 'page-tables', title: 'Tables' },
  { id: 'page-calendar', title: 'Calendar', icon: Calendar },
  { id: 'page-files', title: 'Files', icon: Folder },
  { id: 'page-members', title: 'Members', icon: Users },
  { id: 'page-settings', title: 'Workspace settings', icon: Setting2 },
];
const quickActions: Entry[] = [
  { id: 'action-chat', title: 'New chat', icon: Add },
  { id: 'action-agent', title: 'Create agent', icon: Add },
  { id: 'action-table', title: 'Create table', icon: Add },
];

function EntryMedia({ entry }: { entry: Entry }) {
  const Glyph = entry.icon ?? Page;
  return (
    <SearchItemIcon>
      <Glyph size={14} aria-hidden="true" />
    </SearchItemIcon>
  );
}

function useShortcut(match: (event: KeyboardEvent) => boolean, run: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!match(event)) return;
      event.preventDefault();
      run();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [match, run]);
}

const isModK = (event: KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k';

export function SearchDialogPlayground() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [opened, setOpened] = useState('Nothing opened yet');
  const toggle = useCallback(() => setOpen(current => !current), []);
  useShortcut(isModK, toggle);
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const entries = [...workspacePages, ...quickActions];
  const terms = words(query);
  const matches = (entry: Entry) => matchesAll(entry.title, terms);
  const recent = terms.length
    ? []
    : recentIds
        .map(id => entries.find(entry => entry.id === id))
        .filter(entry => entry !== undefined)
        .slice(0, 3);
  const groups = [
    { heading: 'Recent', items: recent },
    { heading: 'Pages', items: workspacePages.filter(matches) },
    { heading: 'Quick actions', items: quickActions.filter(matches) },
  ].filter(group => group.items.length);

  const select = (entry: Entry) => {
    setRecentIds(ids => [entry.id, ...ids.filter(id => id !== entry.id)].slice(0, 3));
    setOpen(false);
    setOpened(`Opened ${entry.title}`);
  };

  return (
    <Example
      id="search-dialog-workspace"
      title="Jump to a page or action"
      description="The workspace palette: Recent, Pages, and Quick actions groups with icon tiles, a Clear search recovery, and footer hints. ⌘K or Ctrl+K toggles it."
    >
      <Row label="Workspace search" note="title only · SearchItemIcon media · recents after you open something">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Search3 size={16} aria-hidden="true" />
          Search
          <kbd className="search-dialog-demo-kbd">⌘K</kbd>
        </Button>
      </Row>
      <Status>{opened}</Status>
      <SearchDialog
        open={open}
        onOpenChange={setOpen}
        title="Jump to…"
        description="Find workspace pages and quick actions. This does not search chat messages, agents, workflows, or files."
      >
        <SearchInput
          ref={inputRef}
          value={query}
          onValueChange={setQuery}
          placeholder="Find a page or action…"
          label="Find a page or action"
        />
        <SearchList label="Pages and actions">
          {groups.length ? (
            groups.map(group => (
              <SearchGroup key={group.heading} heading={group.heading} count={group.items.length}>
                {group.items.map(entry => (
                  <SearchItem
                    key={`${group.heading}-${entry.id}`}
                    value={`${group.heading}-${entry.id}`}
                    onSelect={() => select(entry)}
                    media={<EntryMedia entry={entry} />}
                    title={entry.title}
                  />
                ))}
              </SearchGroup>
            ))
          ) : (
            <SearchEmpty
              title="No pages or actions found"
              description="Try another page or action name. To find a saved chat by title, open Chats."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                >
                  Clear search
                </Button>
              }
            />
          )}
        </SearchList>
        <SearchFooter>
          <SearchHint keys="↑↓">Select</SearchHint>
          <SearchHint keys="↵">Open</SearchHint>
          <SearchHint keys="Esc">Close</SearchHint>
        </SearchFooter>
      </SearchDialog>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar commands                                                   */
/* ------------------------------------------------------------------ */

type Kind = 'meeting' | 'task' | 'agent' | 'workflow';
const kindIcons: Record<Kind, Icon> = {
  meeting: CalendarDays,
  task: CheckSquare,
  agent: Cpu,
  workflow: Hierarchy,
};

const calendarEvents: {
  id: string;
  title: string;
  kind: Kind;
  time: string;
}[] = [
  {
    id: 'ev-standup',
    title: 'Design standup',
    kind: 'meeting',
    time: '9:30 AM – 9:45 AM',
  },
  {
    id: 'ev-invoices',
    title: 'Send April invoices',
    kind: 'task',
    time: 'All day',
  },
  {
    id: 'ev-digest',
    title: 'Morning research digest',
    kind: 'agent',
    time: '8:00 AM',
  },
  {
    id: 'ev-sync',
    title: 'Nightly CRM sync',
    kind: 'workflow',
    time: '11:00 PM',
  },
  {
    id: 'ev-review',
    title: 'Quarterly roadmap review with the platform, growth, and partnerships teams',
    kind: 'meeting',
    time: '2:00 PM – 3:30 PM',
  },
];

const views = ['day', 'week', 'month', 'agenda'] as const;

export function SearchDialogCalendar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [last, setLast] = useState('No command run yet');
  const openCommands = useCallback(() => setOpen(true), []);
  const isSlash = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable='true']");
      return event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !typing && !open;
    },
    [open],
  );
  useShortcut(isSlash, openCommands);
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const run = (label: string) => () => setLast(label);
  const commands = [
    { id: 'today', title: 'Go to today', key: 'T', run: run('Went to today') },
    {
      id: 'create',
      title: 'Create event',
      key: 'C',
      run: run('Opened Create event'),
    },
    {
      id: 'find',
      title: 'Find free time',
      key: '',
      run: run('Opened Find free time'),
    },
    {
      id: 'follow',
      title: 'Follow workflows',
      key: '',
      run: run('Opened Follow workflows'),
    },
    { id: 'now', title: 'Go to now', key: '', run: run('Scrolled to now') },
    ...views.map(view => ({
      id: view,
      title: `${view[0]!.toUpperCase()}${view.slice(1)} view`,
      key: view[0]!.toUpperCase(),
      run: run(`Switched to ${view} view`),
    })),
  ];
  const terms = words(query);
  const commandOptions = commands.filter(option => matchesAll(option.title, terms));
  const matchingItems = calendarEvents.filter(event => matchesAll(event.title, terms));

  return (
    <Example
      id="search-dialog-calendar"
      title="Calendar commands"
      description="Commands with trailing shortcut keys and events with kind icons and times. The Enter hint replaces the shortcut on the active row. Press / to open."
    >
      <Row label="Calendar search" note="trailing keys · raw icon media · detail line · empty with media">
        <Button
          variant="ghost"
          size="calendar"
          aria-label="Calendar commands"
          title="Search events and commands (/)"
          onClick={() => setOpen(true)}
        >
          <Search3 size={14} aria-hidden="true" />
          Search
        </Button>
      </Row>
      <Status>{last}</Status>
      <SearchDialog
        open={open}
        onOpenChange={setOpen}
        title="Calendar commands"
        description="Find an event or use a calendar shortcut."
      >
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Find an event or command…"
          label="Search calendar"
        />
        <SearchList label="Calendar results">
          <SearchGroup heading="Commands" count={commandOptions.length}>
            {commandOptions.map(option => (
              <SearchItem
                key={option.id}
                value={option.id}
                title={option.title}
                media={<Command size={16} aria-hidden="true" />}
                trailing={option.key}
                onSelect={() => {
                  setOpen(false);
                  option.run();
                }}
              />
            ))}
          </SearchGroup>
          <SearchGroup heading="Events in this view" count={matchingItems.length}>
            {matchingItems.map(event => {
              const Glyph = kindIcons[event.kind];
              return (
                <SearchItem
                  key={event.id}
                  value={event.id}
                  title={event.title}
                  media={<Glyph size={14} aria-hidden="true" />}
                  detail={event.time}
                  onSelect={() => {
                    setOpen(false);
                    setLast(`Selected ${event.title}`);
                  }}
                />
              );
            })}
          </SearchGroup>
          {!commandOptions.length && !matchingItems.length && (
            <SearchEmpty
              media={<Search3 aria-hidden="true" />}
              title="No matches"
              description="Try another title or calendar command."
            />
          )}
        </SearchList>
        <SearchFooter>
          <SearchHint keys="/">Open commands</SearchHint>
          <SearchHint keys="[ ]">Previous / next</SearchHint>
          <SearchHint keys="Esc">Close</SearchHint>
        </SearchFooter>
      </SearchDialog>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Filtered records                                                    */
/* ------------------------------------------------------------------ */

type RecordKind = 'Document' | 'Project';
const records: {
  id: string;
  title: string;
  kind: RecordKind;
  detail: string;
  shared: boolean;
}[] = [
  {
    id: 'garden-notes',
    title: 'Garden notes',
    kind: 'Document',
    detail: 'Edited 2 hours ago · Notes',
    shared: false,
  },
  {
    id: 'meadow',
    title: 'Meadow project',
    kind: 'Project',
    detail: '4 open tasks · Planning',
    shared: true,
  },
  {
    id: 'seed-catalog',
    title: 'Seed catalog 2026',
    kind: 'Document',
    detail: 'Edited yesterday · Shared drive',
    shared: true,
  },
  {
    id: 'greenhouse',
    title: 'Greenhouse retrofit',
    kind: 'Project',
    detail: 'Due next Friday · Operations',
    shared: false,
  },
  {
    id: 'irrigation',
    title: 'Irrigation schedule for the north and south beds after the spring rewiring',
    kind: 'Document',
    detail: 'Edited 3 days ago · Field operations / Irrigation / Archive',
    shared: true,
  },
];

export function SearchDialogRecords() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [onlyDocs, setOnlyDocs] = useState(false);
  const [onlyShared, setOnlyShared] = useState(false);
  const [selected, setSelected] = useState('Nothing selected');
  const clear = () => {
    setQuery('');
    setOnlyDocs(false);
    setOnlyShared(false);
  };
  const terms = words(query);
  const matches = records.filter(
    record =>
      matchesAll(record.title, terms) && (!onlyDocs || record.kind === 'Document') && (!onlyShared || record.shared),
  );

  return (
    <Example
      id="search-dialog-records"
      title="Filters, meta, and detail"
      description="Toggle filters under the input, a meta label after each title, a second detail line, and an empty state with fanned icon tiles and a Clear filters action."
    >
      <Row label="Record search" note="SearchFilters · meta · detail · empty with three tiles">
        <Button variant="outline" onClick={() => setOpen(true)}>
          Open search
        </Button>
      </Row>
      <Status>{selected}</Status>
      <SearchDialog
        open={open}
        onOpenChange={setOpen}
        title="Search records"
        description="Search fictional notes and projects."
      >
        <SearchInput
          label="Search records"
          value={query}
          onValueChange={setQuery}
          placeholder="Search notes or projects…"
        />
        <SearchFilters label="Record type">
          <SearchFilter pressed={onlyDocs} onPressedChange={setOnlyDocs} icon={<DocumentText aria-hidden="true" />}>
            Documents only
          </SearchFilter>
          <SearchFilter pressed={onlyShared} onPressedChange={setOnlyShared} icon={<Users aria-hidden="true" />}>
            Shared with me
          </SearchFilter>
        </SearchFilters>
        <SearchList label="Results">
          {matches.length ? (
            <SearchGroup heading="Records" count={matches.length}>
              {matches.map(record => {
                const Glyph = record.kind === 'Document' ? DocumentText : Folder;
                return (
                  <SearchItem
                    key={record.id}
                    value={record.id}
                    title={record.title}
                    meta={record.kind}
                    detail={record.detail}
                    media={
                      <SearchItemIcon>
                        <Glyph size={14} aria-hidden="true" />
                      </SearchItemIcon>
                    }
                    onSelect={() => {
                      setSelected(`Selected ${record.title}`);
                      setOpen(false);
                    }}
                  />
                );
              })}
            </SearchGroup>
          ) : (
            <SearchEmpty
              media={
                <>
                  <DocumentText aria-hidden="true" />
                  <Search3 aria-hidden="true" />
                  <Folder aria-hidden="true" />
                </>
              }
              title="No matches"
              description="Try another term or clear the filters."
              action={
                <Button variant="outline" onClick={clear}>
                  Clear filters
                </Button>
              }
            />
          )}
        </SearchList>
        <SearchFooter>
          <SearchHint keys="↑ ↓">Navigate</SearchHint>
          <SearchHint keys="↵">Choose</SearchHint>
        </SearchFooter>
      </SearchDialog>
    </Example>
  );
}
