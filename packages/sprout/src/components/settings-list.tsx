import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../internal/classes.js';

export const settingsGroupHeadingNames = ['h2', 'h3', 'h4'] as const;
export type SettingsGroupHeading = (typeof settingsGroupHeadingNames)[number];

export interface SettingsGroupProps extends Omit<ComponentProps<'section'>, 'title'> {
  title: ReactNode;
  /** Id for the title. When set, the section is named by its title. */
  titleId?: string;
  heading?: SettingsGroupHeading;
}

/**
 * A titled panel of settings rows. Children are stacked with a divider
 * between them; rows, notes, forms, and alerts can sit side by side.
 */
export function SettingsGroup({
  title,
  titleId,
  heading: Heading = 'h2',
  className,
  children,
  ...props
}: SettingsGroupProps) {
  return (
    <section
      data-slot="settings-group"
      aria-labelledby={titleId}
      className={cn('sprout-settings-group', className)}
      {...props}
    >
      <Heading id={titleId} className="sprout-settings-group-title">
        {title}
      </Heading>
      <div data-slot="settings-group-content" className="sprout-settings-group-content">
        {children}
      </div>
    </section>
  );
}

export interface SettingsRowProps extends Omit<ComponentProps<'div'>, 'children'> {
  label: ReactNode;
  description?: ReactNode;
  /** Renders the label as a `<label>` for this control id. */
  htmlFor?: string;
  children?: ReactNode;
}

/**
 * One setting: a label and description, with its value or control beside
 * them from 36rem of group width and below them on narrower groups.
 */
export function SettingsRow({ label, description, htmlFor, className, children, ...props }: SettingsRowProps) {
  return (
    <div data-slot="settings-row" className={cn('sprout-settings-row', className)} {...props}>
      <div className="sprout-settings-row-text">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="sprout-settings-row-label">
            {label}
          </label>
        ) : (
          <p className="sprout-settings-row-label">{label}</p>
        )}
        {description != null && description !== false && description !== '' && (
          <div className="sprout-settings-row-description">{description}</div>
        )}
      </div>
      {children != null && children !== false && (
        <div data-slot="settings-row-control" className="sprout-settings-row-control">
          {children}
        </div>
      )}
    </div>
  );
}
