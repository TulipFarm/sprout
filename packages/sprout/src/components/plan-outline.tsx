'use client';

import { Collapsible } from '@base-ui/react/collapsible';
import { createContext, useContext, useId, type ComponentProps, type ReactNode } from 'react';
import { Ban } from 'reicon-react/icons/Ban';
import { Check } from 'reicon-react/icons/Check';
import { ChevronRight } from 'reicon-react/icons/ChevronRight';
import { Clock } from 'reicon-react/icons/Clock';
import { HelpCircle } from 'reicon-react/icons/HelpCircle';
import { Lock } from 'reicon-react/icons/Lock';
import { User } from 'reicon-react/icons/User';
import { Warning } from 'reicon-react/icons/Warning';
import { cn } from '../internal/classes.js';
import { Badge, type BadgeVariant } from './badge.js';
import { Spinner } from './spinner.js';

export const planOutlineMarkNames = [
  'pending',
  'running',
  'attention',
  'blocked',
  'done',
  'failed',
  'cancelled',
] as const;

/** How a task row is marked. Every mark is paired with a text label; color is never the only signal. */
export type PlanOutlineMark = (typeof planOutlineMarkNames)[number];

export const planOutlineToneNames = ['active', 'attention', 'done', 'failed', 'neutral'] as const;

/** The color of the plan's status badge. */
export type PlanOutlineTone = (typeof planOutlineToneNames)[number];

export type PlanOutlineDependency = {
  /** The `id` of the task this one waits for. The title links to its row. */
  id: string;
  title: string;
  /** That task's state in words, such as “Done” or “Working”. */
  label: string;
};

export type PlanOutlineTask = {
  id: string;
  title: string;
  mark: PlanOutlineMark;
  /** The state in words, shown at the end of the row. */
  label: string;
  /** Who does the task. Shown under the title with a person icon. */
  assignee?: string | undefined;
  /** What the task is about. Groups show it above their tasks. */
  brief?: string | undefined;
  /** Shown as “Done when”. */
  criteria?: readonly string[] | undefined;
  /** Shown as “Starts after”, each linking to its row. */
  dependencies?: readonly PlanOutlineDependency[] | undefined;
  /** Why the task is blocked or failed. Failed reasons use the danger color. */
  reason?: string | undefined;
  /** Buttons or extra content at the end of the task's details. */
  action?: ReactNode;
  /** Makes the row a group. Groups start open and list these tasks. */
  children?: readonly PlanOutlineTask[] | undefined;
};

export interface PlanOutlineProps extends Omit<ComponentProps<'section'>, 'title' | 'children'> {
  /** The plan name. It names the section and shows as an `h3`. */
  title: string;
  /** One paragraph under the title. */
  brief?: string | undefined;
  /** The plan's state in words, shown in a badge. */
  status: string;
  /** The badge color for `status`. */
  tone: PlanOutlineTone;
  /** Progress in words under the bar, such as “3 of 8 done · 1 working”. */
  progress: string;
  /** Alerts or sections under the progress, such as why the plan paused. */
  notice?: ReactNode;
  /** Tasks and groups, in order. With none, the outline says so. */
  tasks: readonly PlanOutlineTask[];
  /** A note that the plan shown is out of date, under the notice. */
  stale?: ReactNode;
}

const markIcons: Record<Exclude<PlanOutlineMark, 'running'>, ReactNode> = {
  pending: <Clock size={14} />,
  attention: <HelpCircle size={14} />,
  blocked: <Lock size={14} />,
  done: <Check size={14} />,
  failed: <Warning size={14} />,
  cancelled: <Ban size={14} />,
};

const toneBadges: Record<PlanOutlineTone, BadgeVariant> = {
  active: 'info',
  attention: 'warning',
  done: 'success',
  failed: 'destructive',
  neutral: 'secondary',
};

function leaves(tasks: readonly PlanOutlineTask[]): PlanOutlineTask[] {
  return tasks.flatMap(task => (task.children ? leaves(task.children) : task.mark === 'cancelled' ? [] : [task]));
}

const Scope = createContext('plan');

function useTaskId() {
  const scope = useContext(Scope);
  return (id: string) => `${scope}-task-${id}`;
}

/**
 * A read-only task outline for an agent's plan. People can expand rows and
 * follow links; they cannot tick, edit, reorder, or assign tasks. Groups list
 * their tasks and start open; tasks reveal their brief, completion criteria,
 * dependencies, reason, and actions on demand.
 */
export function PlanOutline({
  title,
  brief,
  status,
  tone,
  progress,
  notice,
  tasks,
  stale,
  className,
  ...props
}: PlanOutlineProps) {
  const scope = `plan-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const work = leaves(tasks);
  return (
    <Scope value={scope}>
      <section data-slot="plan-outline" aria-label={title} {...props} className={cn('sprout-plan-outline', className)}>
        <header className="sprout-plan-outline-header">
          <div className="sprout-plan-outline-heading">
            <h3 className="sprout-plan-outline-title">{title}</h3>
            <Badge variant={toneBadges[tone]} data-tone={tone} className="sprout-plan-outline-status">
              {status}
            </Badge>
          </div>
          {brief && <p className="sprout-plan-outline-brief">{brief}</p>}
          <div className="sprout-plan-outline-progress">
            {work.length > 0 && (
              <div aria-hidden="true" data-slot="plan-outline-rail" className="sprout-plan-outline-rail">
                {work.map(task => (
                  <span key={task.id} data-mark={task.mark} className="sprout-plan-outline-segment" />
                ))}
              </div>
            )}
            <p className="sprout-plan-outline-progress-text">{progress}</p>
          </div>
          {notice}
          {stale}
        </header>
        {tasks.length === 0 ? (
          <p className="sprout-plan-outline-empty">No tasks have been added yet.</p>
        ) : (
          <TaskList tasks={tasks} label="Tasks" level={0} />
        )}
      </section>
    </Scope>
  );
}

function TaskList({ tasks, label, level }: { tasks: readonly PlanOutlineTask[]; label: string; level: number }) {
  return (
    <ol
      aria-label={label}
      data-level={level}
      className={level === 0 ? 'sprout-plan-outline-list' : 'sprout-plan-outline-list sprout-plan-outline-sublist'}
    >
      {tasks.map(task => (
        <TaskRow key={task.id} task={task} level={level} />
      ))}
    </ol>
  );
}

function Mark({ mark }: { mark: PlanOutlineMark }) {
  return (
    <span aria-hidden="true" className="sprout-plan-outline-mark">
      {mark === 'running' ? <Spinner aria-hidden="true" /> : markIcons[mark]}
    </span>
  );
}

function TaskRow({ task, level }: { task: PlanOutlineTask; level: number }) {
  const taskId = useTaskId();
  const group = !!task.children;
  const hasDetail =
    group || !!(task.brief || task.criteria?.length || task.dependencies?.length || task.reason || task.action);
  const head = (
    <>
      <Mark mark={task.mark} />
      <span className="sprout-plan-outline-text">
        <span className="sprout-plan-outline-task-title">{task.title}</span>
        {task.assignee && (
          <span className="sprout-plan-outline-assignee">
            <User size={12} aria-hidden="true" />
            <span>{task.assignee}</span>
          </span>
        )}
      </span>
      <span className="sprout-plan-outline-label">{task.label}</span>
      {hasDetail && <ChevronRight size={14} aria-hidden="true" className="sprout-plan-outline-chevron" />}
    </>
  );
  const rowProps = {
    id: taskId(task.id),
    tabIndex: -1,
    'data-slot': 'plan-outline-task',
    'data-kind': group ? 'group' : 'task',
    'data-mark': task.mark,
    'data-level': level,
    className: 'sprout-plan-outline-task',
  } as const;
  if (!hasDetail)
    return (
      <li {...rowProps}>
        <div className="sprout-plan-outline-row">{head}</div>
      </li>
    );
  return (
    <Collapsible.Root defaultOpen={group} render={<li {...rowProps} />}>
      <Collapsible.Trigger className="sprout-plan-outline-row sprout-plan-outline-trigger">{head}</Collapsible.Trigger>
      <Collapsible.Panel hiddenUntilFound={group} data-slot="plan-outline-panel" className="sprout-plan-outline-panel">
        {group ? (
          <>
            {task.brief && <p className="sprout-plan-outline-group-brief">{task.brief}</p>}
            {task.children!.length ? (
              <TaskList tasks={task.children!} label={`${task.title} tasks`} level={level + 1} />
            ) : (
              <p className="sprout-plan-outline-group-empty">This group has no tasks yet.</p>
            )}
          </>
        ) : (
          <TaskDetail task={task} />
        )}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

// The browser follows the link, which also opens a closed group; then focus moves to the row.
function followDependency(target: string) {
  requestAnimationFrame(() => document.getElementById(target)?.focus({ preventScroll: true }));
}

function TaskDetail({ task }: { task: PlanOutlineTask }) {
  const taskId = useTaskId();
  return (
    <div data-slot="plan-outline-detail" className="sprout-plan-outline-detail">
      {task.reason && <p className="sprout-plan-outline-reason">{task.reason}</p>}
      {task.brief && <p className="sprout-plan-outline-task-brief">{task.brief}</p>}
      {!!task.criteria?.length && (
        <div className="sprout-plan-outline-field">
          <p className="sprout-plan-outline-field-title">Done when</p>
          <ul className="sprout-plan-outline-criteria">
            {task.criteria.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {!!task.dependencies?.length && (
        <div className="sprout-plan-outline-field">
          <p className="sprout-plan-outline-field-title">Starts after</p>
          <ul className="sprout-plan-outline-dependencies">
            {task.dependencies.map(dependency => (
              <li key={dependency.id}>
                <a
                  href={`#${taskId(dependency.id)}`}
                  onClick={() => followDependency(taskId(dependency.id))}
                  className="sprout-plan-outline-link"
                >
                  {dependency.title}
                </a>
                <span className="sprout-plan-outline-dependency-label">{dependency.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {task.action && <div className="sprout-plan-outline-action">{task.action}</div>}
    </div>
  );
}
