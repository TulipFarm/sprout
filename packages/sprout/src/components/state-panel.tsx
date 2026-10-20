import type { ComponentType, HTMLAttributes, ReactNode } from 'react';
import { Check } from 'reicon-react/icons/Check';
import { Inbox } from 'reicon-react/icons/Inbox';
import { Warning } from 'reicon-react/icons/Warning';
import { cn } from '../internal/classes.js';
import { Spinner } from './spinner.js';

export const statePanelKindNames = ['empty', 'loading', 'success', 'unavailable', 'error'] as const;

export type StatePanelKind = (typeof statePanelKindNames)[number];
export type StatePanelHeading = 'h1' | 'h2' | 'h3' | 'h4';
export type StatePanelIcon = ComponentType<{ size?: number }>;

interface StatePanelBaseProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'children' | 'role'> {
  title: ReactNode;
  description: ReactNode;
  /** Heading element for `title`. Match the surrounding document outline. */
  heading?: StatePanelHeading | undefined;
  /**
   * Icon for `empty` and `unavailable`. Pass `null` to show no icon.
   * Other kinds use a fixed icon.
   */
  icon?: StatePanelIcon | null | undefined;
  /** Actions or guidance shown below the description. */
  children?: ReactNode;
}

export type StatePanelProps = StatePanelBaseProps &
  (
    | {
        kind: 'empty';
        /** Decorative preview of the filled state. Switches to the split layout. */
        sample?: ReactNode;
      }
    | {
        kind: 'loading' | 'success' | 'unavailable';
        sample?: never;
      }
    | {
        kind: 'error';
        /** Errors always offer a recovery action or guidance. */
        children: ReactNode;
        sample?: never;
      }
  );

const roles: Partial<Record<StatePanelKind, 'alert' | 'status'>> = {
  error: 'alert',
  loading: 'status',
  success: 'status',
};

function Media({ kind, Icon }: { kind: StatePanelKind; Icon: StatePanelIcon }) {
  return (
    <div data-slot="state-panel-media" className="sprout-state-panel-media" aria-hidden="true">
      {kind === 'loading' ? (
        <Spinner aria-hidden="true" />
      ) : kind === 'success' ? (
        <Check size={20} />
      ) : kind === 'error' ? (
        <Warning size={20} className="sprout-state-panel-danger" />
      ) : (
        <Icon size={20} />
      )}
    </div>
  );
}

export function StatePanel({
  kind,
  title,
  description,
  heading: Heading = 'h2',
  icon = Inbox,
  children,
  sample,
  className,
  ...props
}: StatePanelProps) {
  const media =
    icon === null && (kind === 'empty' || kind === 'unavailable') ? null : <Media kind={kind} Icon={icon ?? Inbox} />;
  const hasActions = children !== undefined && children !== null && children !== false;

  if (sample)
    return (
      <section
        data-slot="state-panel"
        data-kind={kind}
        data-layout="sample"
        {...props}
        className={cn('sprout-state-panel', className)}
      >
        <div className="sprout-state-panel-card">
          <div className="sprout-state-panel-copy">
            {media}
            <div className="sprout-state-panel-text">
              <Heading className="sprout-state-panel-title">{title}</Heading>
              <p className="sprout-state-panel-description">{description}</p>
            </div>
            {hasActions && (
              <div data-slot="state-panel-actions" className="sprout-state-panel-actions">
                {children}
              </div>
            )}
          </div>
          <div data-slot="state-panel-sample" className="sprout-state-panel-sample" aria-hidden="true" inert>
            <div className="sprout-state-panel-sample-window">{sample}</div>
          </div>
        </div>
      </section>
    );

  return (
    <div
      data-slot="state-panel"
      data-kind={kind}
      data-layout="centered"
      {...props}
      className={cn('sprout-state-panel', className)}
    >
      {media}
      <div role={roles[kind]} aria-atomic="true" className="sprout-state-panel-text">
        <Heading className="sprout-state-panel-title">{title}</Heading>
        <p className="sprout-state-panel-description">{description}</p>
      </div>
      {hasActions && (
        <div data-slot="state-panel-actions" className="sprout-state-panel-actions">
          {children}
        </div>
      )}
    </div>
  );
}

export * from './state-panel-samples.js';
