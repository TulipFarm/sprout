'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Check } from 'reicon-react/icons/Check';
import { Danger } from 'reicon-react/icons/Danger';
import { Plug } from 'reicon-react/icons/Plug';
import { cn } from '../internal/classes.js';
import { BrandIcon, BrandTile, type Brand } from './brand-icon.js';
import { Button } from './button.js';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from './popover.js';
import { Spinner } from './spinner.js';

export const resultCardKindNames = [
  'File',
  'Plan',
  'Workflow',
  'Action',
  'Calendar',
  'Table',
  'Activity',
  'Agent',
  'Skill',
] as const;

export const resultCardStateNames = ['default', 'loading', 'running', 'disabled', 'error', 'success'] as const;

export const resultAppActionStateNames = [
  'completed',
  'pending',
  'running',
  'failed',
  'unknown',
  'blocked',
  'cancelled',
  'skipped',
] as const;

export type ResultCardKind = (typeof resultCardKindNames)[number];
export type ResultCardState = (typeof resultCardStateNames)[number];
export type ResultAppActionState = (typeof resultAppActionStateNames)[number];

export type ResultAppAction = { label: string; state: ResultAppActionState };

/**
 * One app that took part in a result. `brand: null` shows `icon`, or a
 * generic plug when no icon is given.
 */
export type ResultApp = {
  brand: Brand | null;
  name: string;
  /** Shown when `brand` is null, such as a table icon for your own data. */
  icon?: ReactNode;
  actions: readonly ResultAppAction[];
};

export type ResultCardAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean | undefined;
};

export interface ResultCardProps extends Omit<ComponentProps<'section'>, 'title' | 'children'> {
  title: string;
  kind: ResultCardKind;
  /** Apps used. Repeated brands merge; two tiles show, the rest fold into “+N”. */
  apps: readonly ResultApp[];
  status: string;
  /**
   * `loading` and `running` show a spinner and set `aria-busy`; `loading`
   * also disables the action. `disabled` disables the action and app tiles.
   * `success` and `error` tint the status and add a check or warning icon.
   */
  state?: ResultCardState | undefined;
  /** One outline button, beside the text from 28rem wide and below it under. */
  action?: ResultCardAction | undefined;
  /** Shown in a tile when no app is listed. */
  icon?: ReactNode;
  /** Extra content below the header, such as progress or controls. */
  children?: ReactNode;
}

const actionPrefixes: Record<Exclude<ResultAppActionState, 'completed'>, string> = {
  failed: 'Failed:',
  unknown: 'Unconfirmed:',
  pending: 'Pending:',
  running: 'In progress:',
  blocked: 'Blocked:',
  cancelled: 'Cancelled:',
  skipped: 'Skipped:',
};

function mergeApps(apps: readonly ResultApp[]) {
  const byKey = new Map<string, ResultApp>();
  for (const app of apps) {
    const key = app.brand ?? app.name;
    const existing = byKey.get(key);
    byKey.set(key, existing ? { ...existing, actions: [...existing.actions, ...app.actions] } : app);
  }
  return [...byKey.values()];
}

/**
 * A compact card for something an agent made or did: a file, plan, workflow,
 * action, calendar read, or table result. It names the apps used, shows a
 * live status, and offers one action such as “Open in Canvas”.
 */
export function ResultCard({
  title,
  kind,
  apps,
  status,
  state = 'default',
  action,
  icon,
  children,
  className,
  ...props
}: ResultCardProps) {
  const unique = mergeApps(apps);
  const visible = unique.slice(0, 2);
  const hidden = unique.slice(2);
  const busy = state === 'loading' || state === 'running';
  const disabled = state === 'disabled';
  return (
    <section
      data-slot="result-card"
      data-state={state}
      data-kind={kind}
      aria-label={`${kind}: ${title}`}
      aria-busy={busy}
      {...props}
      className={cn('sprout-result-card', className)}
    >
      <div className="sprout-result-card-header">
        {visible.length > 0 ? (
          <div role="group" aria-label="Apps used" className="sprout-result-card-apps">
            {visible.map(app => (
              <span
                key={app.brand ?? app.name}
                data-result-app={app.brand ?? 'connected-app'}
                className="sprout-result-card-app"
              >
                <AppActionsPopover apps={[app]} disabled={disabled} />
              </span>
            ))}
            {hidden.length > 0 && (
              <span data-result-overflow={hidden.length} className="sprout-result-card-app">
                <AppActionsPopover apps={hidden} overflow disabled={disabled} />
              </span>
            )}
          </div>
        ) : (
          icon && (
            <BrandTile aria-hidden="true" className="sprout-result-card-icon">
              {icon}
            </BrandTile>
          )
        )}
        <div className="sprout-result-card-main">
          <div className="sprout-result-card-text">
            <h3 className="sprout-result-card-title">{title}</h3>
            <div className="sprout-result-card-meta">
              <span>{kind}</span>
              <span aria-hidden="true">·</span>
              <span
                role="status"
                data-tone={state === 'success' || state === 'error' ? state : undefined}
                className="sprout-result-card-status"
              >
                {busy ? (
                  <Spinner aria-hidden="true" />
                ) : state === 'success' ? (
                  <Check size={14} aria-hidden="true" />
                ) : state === 'error' ? (
                  <Danger size={14} aria-hidden="true" />
                ) : null}
                {status}
              </span>
            </div>
          </div>
          {action && (
            <div className="sprout-result-card-action">
              <Button
                variant="outline"
                size="result-card"
                disabled={state === 'loading' || disabled || action.disabled === true}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            </div>
          )}
        </div>
      </div>
      {children && <div className="sprout-result-card-body">{children}</div>}
    </section>
  );
}

function AppActionsPopover({
  apps,
  overflow = false,
  disabled,
}: {
  apps: readonly ResultApp[];
  overflow?: boolean;
  disabled: boolean;
}) {
  const first = apps[0];
  if (!first) return null;
  const title = overflow ? `${apps.length} more ${apps.length === 1 ? 'app' : 'apps'}` : `${first.name} actions`;
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
          <span className="sprout-result-card-overflow">+{apps.length}</span>
        ) : first.brand ? (
          <BrandIcon brand={first.brand} size="fill" />
        ) : first.icon ? (
          <span aria-hidden="true" className="sprout-result-app-icon">
            {first.icon}
          </span>
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
        <ResultAppActions apps={apps} showAppNames={overflow} />
      </PopoverContent>
    </Popover>
  );
}

export interface ResultAppActionsProps extends Omit<ComponentProps<'div'>, 'children'> {
  apps: readonly ResultApp[];
  /** Show each app’s icon and name above its actions. Defaults to `true`. */
  showAppNames?: boolean | undefined;
}

/**
 * The actions each app took, grouped by app. A check marks completed
 * actions; every other state is spelled out, such as “Unconfirmed:”.
 */
export function ResultAppActions({ apps, showAppNames = true, className, ...props }: ResultAppActionsProps) {
  return (
    <div data-slot="result-app-actions" {...props} className={cn('sprout-result-app-actions', className)}>
      {apps.map(app => (
        <section key={app.brand ?? app.name} aria-label={app.name} className="sprout-result-app">
          {showAppNames && (
            <div className="sprout-result-app-name">
              {app.brand ? (
                <BrandIcon brand={app.brand} size="glyph" />
              ) : app.icon ? (
                <span aria-hidden="true" className="sprout-result-app-icon">
                  {app.icon}
                </span>
              ) : (
                <Plug size={20} aria-hidden="true" />
              )}
              <h4>{app.name}</h4>
            </div>
          )}
          {app.actions.length === 0 ? (
            <p className="sprout-result-app-empty">No action details were recorded.</p>
          ) : (
            <ul className="sprout-result-app-list">
              {app.actions.map((action, index) => (
                <li key={`${action.label}:${index}`} data-state={action.state} className="sprout-result-app-action">
                  {action.state === 'completed' ? (
                    <span className="sprout-result-app-check">
                      <Check size={16} aria-hidden="true" />
                      <span className="sprout-result-sr-only">Completed:</span>
                    </span>
                  ) : (
                    <span className="sprout-result-app-prefix">{actionPrefixes[action.state]}</span>
                  )}
                  <span className="sprout-result-app-label">{action.label}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
