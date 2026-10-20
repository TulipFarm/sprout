import { useId, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Edit } from 'reicon-react/icons/Edit';
import { MoreH } from 'reicon-react/icons/MoreH';
import { Badge } from '@tulipfarm/sprout/badge';
import { Button } from '@tulipfarm/sprout/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tulipfarm/sprout/dropdown-menu';
import { Field } from '@tulipfarm/sprout/field';
import { Input } from '@tulipfarm/sprout/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@tulipfarm/sprout/pagination';
import {
  RecordList,
  type RecordListHandle,
  type RecordListItem,
  type RecordListValue,
} from '@tulipfarm/sprout/record-list';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tulipfarm/sprout/select';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@tulipfarm/sprout/sheet';
import { ToggleGroup, ToggleGroupItem } from '@tulipfarm/sprout/toggle-group';
import '../styles/record-list-demo.css';

type Status = 'Open' | 'In progress' | 'Blocked' | 'Done';
type Priority = 'Urgent' | 'High' | 'Normal' | 'Low';

interface Ticket extends RecordListItem {
  key: string;
  status: Status;
  priority: Priority | null;
  assignee: string | null;
  due: string | null;
  points: number | null;
  requester: string;
  site: string;
}

const statusBadge = { Open: 'info', 'In progress': 'warning', Blocked: 'destructive', Done: 'success' } as const;
const priorityBadge = { Urgent: 'destructive', High: 'warning', Normal: 'secondary', Low: 'outline' } as const;

const titles = [
  'Seed tray leaks onto the potting bench',
  'Order compost for the north beds',
  'Fix the greenhouse vent motor that stops halfway open on cold mornings after the frost alert runs',
  'Frost alert texts arrive late',
  'Label printer jams on seed packets',
  'Update the spring market price list',
  'Irrigation timer skips bed 12',
  'Wholesale invoice shows the wrong tax rate',
  'Replace torn shade cloth',
  'Harvest report export is missing dates',
  'Onboarding guide for seasonal staff',
  'Compost temperature log has gaps',
  'Map of the north field beds',
  'Supplier contact sheet is out of date',
  'Archive 2024 field notes',
  'Repair the cold frame hinge',
  'Water pressure drops in row 4',
  'Order tulip bulbs for autumn',
  'Clean the propagation heat mats',
  'Fence gap by the east gate',
  'Tool shed lock sticks',
  'Count pots before the market',
  'Retire the old pH meter',
];
const statuses: Status[] = ['Open', 'In progress', 'Blocked', 'Done'];
const priorities: (Priority | null)[] = ['Urgent', 'High', 'Normal', 'Low', null];
const people = ['Ana Ruiz', 'Ben Okafor', 'Chen Wei', 'Dara Singh', null];
const sites = ['North greenhouse', 'Market stall', 'Packing shed', 'East field'];

const seedTickets: Ticket[] = titles.map((title, index) => ({
  id: `ticket-${index + 101}`,
  key: `TF-${index + 101}`,
  title,
  status: statuses[index % statuses.length]!,
  priority: priorities[(index * 3) % priorities.length]!,
  assignee: people[(index * 2) % people.length]!,
  due: index % 4 === 3 ? null : `Oct ${String(((index * 7) % 28) + 1).padStart(2, '0')}`,
  points: index % 5 === 4 ? null : ((index * 5) % 13) + 1,
  requester: index === 2 ? 'Greenhouse operations team, north site, weekend shift' : 'Robin Hale',
  site: sites[index % sites.length]!,
}));

const PAGE_SIZE = 6;

type Shown = 'rows' | 'loading' | 'empty' | 'error';
const shownLabels: Record<Shown, string> = { rows: 'Rows', loading: 'Loading', empty: 'Empty', error: 'Error' };

interface TicketActionHandlers {
  onEdit: (ticket: Ticket, opener: HTMLElement) => void;
  onDuplicate: (ticket: Ticket) => void;
  onDelete: (ticket: Ticket) => void;
  onHistory: (ticket: Ticket) => void;
}

function TicketActions({
  ticket,
  onEdit,
  onDuplicate,
  onDelete,
  onHistory,
}: { ticket: Ticket } & TicketActionHandlers) {
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${ticket.key}`}
        onClick={event => onEdit(ticket, event.currentTarget)}
      >
        <Edit size={16} aria-hidden="true" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`More actions for ${ticket.key}`} />}
        >
          <MoreH size={16} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onHistory(ticket)}>History</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate(ticket)}>Duplicate</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(ticket)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

const NONE = 'none';
const statusItems = statuses.map(value => ({ value, label: value }));
const priorityItems = [
  { value: NONE, label: 'No priority' },
  ...(['Urgent', 'High', 'Normal', 'Low'] as const).map(value => ({ value, label: value })),
];
const assigneeItems = [
  { value: NONE, label: 'Unassigned' },
  ...people.filter(person => person !== null).map(value => ({ value, label: value })),
];

function ChoiceSelect({
  items,
  value,
  onValueChange,
}: {
  items: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select items={items} value={value} onValueChange={next => next !== null && onValueChange(next)}>
      <SelectTrigger width="full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map(item => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface Draft {
  title: string;
  status: Status;
  priority: string;
  assignee: string;
}

const draftOf = (ticket: Ticket): Draft => ({
  title: ticket.title,
  status: ticket.status,
  priority: ticket.priority ?? NONE,
  assignee: ticket.assignee ?? NONE,
});

function TicketEditor({
  ticket,
  open,
  onOpenChange,
  onSave,
  finalFocus,
}: {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (ticket: Ticket, draft: Draft) => void;
  finalFocus: () => HTMLElement | null;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [shownFor, setShownFor] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const formId = useId();
  if (ticket && ticket.id !== shownFor) {
    setShownFor(ticket.id);
    setDraft(draftOf(ticket));
    setError(undefined);
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ticket || !draft) return;
    if (!draft.title.trim()) {
      setError('Give the ticket a title.');
      return;
    }
    onSave(ticket, { ...draft, title: draft.title.trim() });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={next => {
        onOpenChange(next);
        if (!next) setShownFor(null);
      }}
    >
      <SheetContent finalFocus={finalFocus}>
        {ticket && draft && (
          <>
            <SheetHeader>
              <SheetTitle>Edit {ticket.key}</SheetTitle>
              <SheetDescription>Changes show in the list when you save.</SheetDescription>
            </SheetHeader>
            <SheetBody render={<form id={formId} onSubmit={submit} noValidate />}>
              <Field label="Title" required error={error}>
                <Input
                  value={draft.title}
                  onChange={event => {
                    setDraft({ ...draft, title: event.target.value });
                    if (error) setError(undefined);
                  }}
                />
              </Field>
              <Field label="Status" required>
                <ChoiceSelect
                  items={statusItems}
                  value={draft.status}
                  onValueChange={value => setDraft({ ...draft, status: value as Status })}
                />
              </Field>
              <Field label="Priority" optional>
                <ChoiceSelect
                  items={priorityItems}
                  value={draft.priority}
                  onValueChange={value => setDraft({ ...draft, priority: value })}
                />
              </Field>
              <Field label="Assignee" optional>
                <ChoiceSelect
                  items={assigneeItems}
                  value={draft.assignee}
                  onValueChange={value => setDraft({ ...draft, assignee: value })}
                />
              </Field>
            </SheetBody>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" form={formId}>
                Save
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function RecordListPlayground() {
  const list = useRef<RecordListHandle>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [page, setPage] = useState(1);
  const [paging, setPaging] = useState(false);
  const [shown, setShown] = useState<Shown>('rows');
  const [density, setDensity] = useState<'default' | 'compact'>('default');
  const [log, setLog] = useState('Click a row, or focus the list and press Enter, to edit it.');
  const [tickets, setTickets] = useState(seedTickets);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const nextKey = useRef(seedTickets.length + 101);

  const pageCount = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE));
  const editing = tickets.find(ticket => ticket.id === editingId) ?? null;
  const items = shown === 'empty' || shown === 'loading' ? [] : tickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const edit = (ticket: Ticket, from: HTMLElement | null) => {
    opener.current = from;
    setEditingId(ticket.id);
    setEditorOpen(true);
  };

  const save = (ticket: Ticket, draft: Draft) => {
    setTickets(current =>
      current.map(row =>
        row.id === ticket.id
          ? {
              ...row,
              title: draft.title,
              status: draft.status,
              priority: draft.priority === NONE ? null : (draft.priority as Priority),
              assignee: draft.assignee === NONE ? null : draft.assignee,
            }
          : row,
      ),
    );
    setEditorOpen(false);
    setLog(`Saved ${ticket.key}.`);
  };

  const duplicate = (ticket: Ticket) => {
    const number = nextKey.current++;
    const copy: Ticket = { ...ticket, id: `ticket-${number}`, key: `TF-${number}`, title: `${ticket.title} (copy)` };
    setTickets(current => {
      const index = current.findIndex(row => row.id === ticket.id);
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
    setLog(`Duplicated ${ticket.key} as ${copy.key}.`);
  };

  const remove = (ticket: Ticket) => {
    const remaining = tickets.filter(row => row.id !== ticket.id);
    setTickets(remaining);
    setPage(current => Math.min(current, Math.max(1, Math.ceil(remaining.length / PAGE_SIZE))));
    setLog(`Deleted ${ticket.key}.`);
    // The row and its menu button are gone, so keep focus in the list.
    requestAnimationFrame(() => list.current?.focusFirst());
  };
  const status = shown === 'error' ? 'error' : shown === 'loading' || paging ? 'loading' : 'ready';

  const go = (next: number) => (event: MouseEvent) => {
    event.preventDefault();
    if (next < 1 || next > pageCount || next === page || paging) return;
    setPaging(true);
    list.current?.focusFirst();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPage(next);
      setPaging(false);
    }, 700);
  };

  return (
    <div className="record-list-demo">
      <div className="record-list-demo-controls">
        <ToggleGroup
          aria-label="State"
          size="sm"
          variant="outline"
          spacing={0}
          value={[shown]}
          onValueChange={next => next[0] && setShown(next[0] as Shown)}
        >
          {(Object.keys(shownLabels) as Shown[]).map(value => (
            <ToggleGroupItem key={value} value={value}>
              {shownLabels[value]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          aria-label="Density"
          size="sm"
          variant="outline"
          spacing={0}
          value={[density]}
          onValueChange={next => next[0] && setDensity(next[0] as 'default' | 'compact')}
        >
          <ToggleGroupItem value="default">Default</ToggleGroupItem>
          <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <RecordList
        ref={list}
        label="Tickets"
        items={items}
        density={density}
        status={status}
        error="The ticket service did not answer. Your rows are safe."
        onRetry={() => setShown('rows')}
        renderTitle={ticket => (
          <>
            <span className="record-list-demo-key">{ticket.key}</span>
            {ticket.title}
          </>
        )}
        values={ticket => {
          const values: (RecordListValue | null)[] = [
            ticket.assignee ? { label: 'Assignee', value: ticket.assignee } : null,
            ticket.due ? { label: 'Due', value: ticket.due } : null,
            ticket.points === null ? null : { label: 'Points', value: ticket.points },
            { label: 'Requester', value: ticket.requester },
            { label: 'Site', value: ticket.site },
          ];
          return values.filter(value => value !== null);
        }}
        badges={ticket => (
          <>
            <Badge variant={statusBadge[ticket.status]}>{ticket.status}</Badge>
            {ticket.priority && <Badge variant={priorityBadge[ticket.priority]}>{ticket.priority}</Badge>}
          </>
        )}
        renderActions={ticket => (
          <TicketActions
            ticket={ticket}
            onEdit={edit}
            onDuplicate={duplicate}
            onDelete={remove}
            onHistory={row => setLog(`History of ${row.key} would open here.`)}
          />
        )}
        onItemOpen={ticket => edit(ticket, document.activeElement as HTMLElement | null)}
        footer={
          shown === 'rows' && (
            <Pagination aria-label="Ticket pages">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={`#page-${page - 1}`}
                    disabled={paging || page === 1}
                    onClick={go(page - 1)}
                  />
                </PaginationItem>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map(number => (
                  <PaginationItem key={number}>
                    <PaginationLink
                      href={`#page-${number}`}
                      aria-label={`Page ${number}`}
                      isActive={number === page}
                      disabled={paging}
                      onClick={go(number)}
                    >
                      {number}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href={`#page-${page + 1}`}
                    disabled={paging || page === pageCount}
                    onClick={go(page + 1)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )
        }
      />
      <p role="status" className="record-list-demo-log">
        {log}
      </p>
      <TicketEditor
        ticket={editing}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={save}
        finalFocus={() => (opener.current?.isConnected ? opener.current : null)}
      />
    </div>
  );
}
