import { useMemo, useState } from 'react';
import { EntityAvatar } from '@tulipfarm/sprout/avatar';
import { Badge } from '@tulipfarm/sprout/badge';
import { Board, type BoardColumn, type BoardItem, type BoardLane } from '@tulipfarm/sprout/board';
import {
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@tulipfarm/sprout/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@tulipfarm/sprout/tooltip';

type Priority = 'Urgent' | 'High' | 'Normal' | 'Low';

interface Task extends BoardItem {
  assignee: string;
  priority: Priority;
  points: number;
}

const people = ['Ana Ruiz', 'Ben Okafor', 'Chen Wei', 'Dara Singh'];
const priorities: Priority[] = ['Urgent', 'High', 'Normal', 'Low'];
const priorityBadge = {
  Urgent: 'destructive',
  High: 'warning',
  Normal: 'info',
  Low: 'outline',
} as const;
const priorityColor = {
  Urgent: 'var(--sprout-danger)',
  High: 'var(--sprout-warning)',
  Normal: 'var(--sprout-info)',
  Low: 'var(--sprout-border)',
};

const initialColumns: BoardColumn[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'ready', title: 'Ready', limit: 4 },
  { id: 'doing', title: 'In progress', limit: 3 },
  { id: 'review', title: 'Review', limit: 2 },
  { id: 'done', title: 'Done' },
];

const titles = [
  "Import last season's seed orders",
  'Greenhouse sensor dashboard',
  'Fix duplicate invoices for wholesale buyers',
  'Watering schedule by bed',
  'Export harvest report to CSV',
  'Supplier contact sheet',
  'Frost alert text messages',
  'Label printer for seed packets',
  'Archive 2024 field notes',
  'Price list for the spring market',
  'Map of north field beds',
  'Onboarding guide for seasonal staff',
  'Compost temperature log',
  'Bulk edit plant varieties',
  'Delivery route for Saturday',
  'Soil test results by bed',
];

const initialTasks: Task[] = titles.map((title, index) => ({
  id: `t${index + 1}`,
  title,
  columnId: initialColumns[index % initialColumns.length]!.id,
  assignee: people[(index * 3) % people.length]!,
  priority: priorities[(index * 7) % priorities.length]!,
  points: [1, 2, 3, 5, 8][index % 5]!,
}));

function Assignee({ name, className }: { name: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<EntityAvatar size="sm" seed={name} name={name} role="img" aria-label={name} className={className} />}
      />
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}

type SetTasks = (update: (list: Task[]) => Task[]) => void;

function TaskActions({ task, setTasks }: { task: Task; setTasks: SetTasks }) {
  const patch = (change: Partial<Task>) =>
    setTasks(list => list.map(t => (t.id === task.id ? { ...t, ...change } : t)));
  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Priority</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup value={task.priority} onValueChange={value => patch({ priority: value as Priority })}>
            {priorities.map(priority => (
              <DropdownMenuRadioItem key={priority} value={priority} closeOnClick>
                {priority}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Assignee</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup value={task.assignee} onValueChange={value => patch({ assignee: value as string })}>
            {people.map(person => (
              <DropdownMenuRadioItem key={person} value={person} closeOnClick>
                {person}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={() => setTasks(list => list.filter(t => t.id !== task.id))}>
        Delete card
      </DropdownMenuItem>
    </>
  );
}

function TaskBody({ task, assignee = true }: { task: Task; assignee?: boolean }) {
  return (
    <>
      <Badge variant={priorityBadge[task.priority]}>{task.priority}</Badge>
      <span>{task.points} pt</span>
      {assignee && <Assignee name={task.assignee} className="ms-auto" />}
    </>
  );
}

type GroupBy = 'assignee' | 'priority';

export function BoardPlayground() {
  const [columns, setColumns] = useState(initialColumns);
  const [tasks, setTasks] = useState(initialTasks);
  const [groupBy, setGroupBy] = useState<GroupBy>('assignee');
  const [opened, setOpened] = useState<string | null>(null);

  const lanes: BoardLane[] = (groupBy === 'assignee' ? people : priorities).map(value => ({ id: value, title: value }));
  const items = tasks.map(task => ({ ...task, laneId: task[groupBy] }));

  return (
    <div>
      <Board
        label="Product team board"
        columns={columns}
        lanes={lanes}
        items={items}
        onItemsChange={next =>
          setTasks(
            next.map(({ laneId, ...task }) => ({
              ...task,
              [groupBy]: laneId,
            })) as Task[],
          )
        }
        onColumnsChange={setColumns}
        onItemAdd={({ title, columnId, laneId }) =>
          setTasks(list => [
            ...list,
            {
              id: `t${Date.now()}`,
              title,
              columnId,
              assignee: groupBy === 'assignee' ? laneId! : people[0]!,
              priority: groupBy === 'priority' ? (laneId as Priority) : 'Normal',
              points: 1,
            },
          ])
        }
        onColumnAdd={title => setColumns(list => [...list, { id: `c${Date.now()}`, title }])}
        onItemOpen={task => setOpened(task.title)}
        renderTitle={task => (
          <>
            <span className="me-1.5 font-mono text-xs text-[var(--sprout-muted)]">{task.id.toUpperCase()}</span>
            {task.title}
          </>
        )}
        renderBody={task => <TaskBody task={task} assignee={groupBy !== 'assignee'} />}
        itemActions={task => (
          <>
            <DropdownMenuItem onClick={() => setOpened(task.title)}>Open</DropdownMenuItem>
            <TaskActions task={task} setTasks={setTasks} />
          </>
        )}
        searchable
        searchText={task => `${task.assignee} ${task.priority}`}
        laneBy={{
          value: groupBy,
          options: [
            { value: 'assignee', label: 'Assignee' },
            { value: 'priority', label: 'Priority' },
          ],
          onChange: value => setGroupBy(value as GroupBy),
        }}
      />
      <p className="mt-3 text-sm text-[var(--sprout-muted)]" role="status">
        {opened ? `Opened “${opened}”.` : 'Click a card to open it.'}
      </p>
    </div>
  );
}

export function BoardPlain() {
  const [columns, setColumns] = useState(initialColumns.slice(0, 4));
  const [tasks, setTasks] = useState(initialTasks.slice(0, 10));
  return (
    <Board
      label="Release board"
      columns={columns}
      items={tasks}
      onItemsChange={setTasks}
      onColumnsChange={setColumns}
      onItemAdd={({ title, columnId }) =>
        setTasks(list => [
          ...list,
          {
            id: `p${Date.now()}`,
            title,
            columnId,
            assignee: people[0]!,
            priority: 'Normal',
            points: 1,
          },
        ])
      }
      renderBody={task => <TaskBody task={task} />}
      itemActions={task => <TaskActions task={task} setTasks={setTasks} />}
      className="[--sprout-board-height:28rem]"
    />
  );
}

export function BoardCustom() {
  const [tasks, setTasks] = useState(initialTasks.slice(0, 8));
  return (
    <Board
      label="Custom cards"
      columns={initialColumns.slice(0, 3)}
      items={tasks}
      onItemsChange={setTasks}
      renderCard={(task, parts) => (
        <div
          className="flex gap-3 rounded-lg border border-[var(--sprout-line)] bg-[var(--sprout-card-raised)] p-2"
          style={{
            borderInlineStartColor: priorityColor[task.priority],
            borderInlineStartWidth: 3,
          }}
        >
          <Assignee name={task.assignee} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-start gap-1">
              {parts.title}
              {parts.menu}
            </div>
            <span className="text-xs text-[var(--sprout-muted)]">
              {task.assignee} · {task.points} pt
            </span>
          </div>
        </div>
      )}
      itemActions={task => <TaskActions task={task} setTasks={setTasks} />}
      className="[--sprout-board-height:26rem]"
    />
  );
}

export function BoardLarge() {
  const columns = useMemo<BoardColumn[]>(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        id: `c${i}`,
        title: `Stage ${i + 1}`,
      })),
    [],
  );
  const lanes = useMemo<BoardLane[]>(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: `l${i}`,
        title: `Team ${i + 1}`,
      })),
    [],
  );
  const [items, setItems] = useState<BoardItem[]>(() =>
    Array.from({ length: 10_000 }, (_, i) => ({
      id: `x${i}`,
      title: `Card ${i + 1}`,
      columnId: `c${(i * 7) % 50}`,
      laneId: `l${(i * 13) % 20}`,
    })),
  );
  return (
    <Board label="Large board" columns={columns} lanes={lanes} items={items} onItemsChange={setItems} searchable />
  );
}
