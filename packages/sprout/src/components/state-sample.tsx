import { Fragment, type ComponentType, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../internal/classes.js';

export type SampleIcon = ComponentType<{ size?: number }>;

export interface SampleWindowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Page icon at the start of the title bar. */
  icon: SampleIcon;
  /** Breadcrumb parts. The last part is the current page. */
  trail: readonly string[];
  /** Tab labels. The first tab is shown as selected. */
  tabs?: readonly string[] | undefined;
  /** Chip at the end of the title bar. */
  label?: ReactNode;
  children: ReactNode;
}

export function SampleWindow({
  icon: Icon,
  trail,
  tabs,
  label = 'Example',
  children,
  className,
  ...props
}: SampleWindowProps) {
  return (
    <div data-slot="state-sample" {...props} className={cn('sprout-state-sample', className)}>
      <div className="sprout-state-sample-bar">
        <span className="sprout-state-sample-icon" aria-hidden="true">
          <Icon size={14} />
        </span>
        {trail.map((part, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <span className="sprout-state-sample-faint" aria-hidden="true">
                /
              </span>
            )}
            <span className="sprout-state-sample-crumb" data-current={index === trail.length - 1 ? '' : undefined}>
              {part}
            </span>
          </Fragment>
        ))}
        <span className="sprout-state-sample-faint" aria-hidden="true">
          ···
        </span>
        <span className="sprout-state-sample-label">{label}</span>
      </div>
      {tabs && tabs.length > 0 && (
        <div className="sprout-state-sample-tabs">
          {tabs.map((tab, index) => (
            <span key={index} className="sprout-state-sample-tab" data-selected={index === 0 ? '' : undefined}>
              {tab}
            </span>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

export const sampleColumnSizeNames = ['lg', 'md', 'sm'] as const;
export type SampleColumnSize = (typeof sampleColumnSizeNames)[number];
export type SampleColumn = { label: string; size?: SampleColumnSize };

export interface SampleTableProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  columns: readonly SampleColumn[];
  rows: readonly (readonly ReactNode[])[];
}

export function SampleTable({ columns, rows, className, ...props }: SampleTableProps) {
  return (
    <div data-slot="state-sample-table" {...props} className={cn('sprout-state-sample-table', className)}>
      <div className="sprout-state-sample-head">
        <span className="sprout-state-sample-check" aria-hidden="true" />
        {columns.map((column, index) => (
          <span key={index} className="sprout-state-sample-cell" data-size={column.size ?? 'md'}>
            {column.label}
          </span>
        ))}
      </div>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="sprout-state-sample-row">
          <span className="sprout-state-sample-check" aria-hidden="true" />
          {row.map((cell, cellIndex) => (
            <span key={cellIndex} className="sprout-state-sample-cell" data-size={columns[cellIndex]?.size ?? 'md'}>
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export type SampleListItem = {
  leading?: ReactNode;
  title: string;
  detail?: string;
  trailing?: ReactNode;
};

export interface SampleListProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  items: readonly SampleListItem[];
}

export function SampleList({ items, className, ...props }: SampleListProps) {
  return (
    <div data-slot="state-sample-list" {...props} className={cn('sprout-state-sample-list', className)}>
      {items.map((item, index) => (
        <div key={index} className="sprout-state-sample-item">
          {item.leading && <span className="sprout-state-sample-leading">{item.leading}</span>}
          <span className="sprout-state-sample-copy">
            <span className="sprout-state-sample-title">{item.title}</span>
            {item.detail && <span className="sprout-state-sample-detail">{item.detail}</span>}
          </span>
          {item.trailing && <span className="sprout-state-sample-trailing">{item.trailing}</span>}
        </div>
      ))}
    </div>
  );
}

export const sampleTextToneNames = ['default', 'strong', 'muted', 'link', 'mono'] as const;
export type SampleTextTone = (typeof sampleTextToneNames)[number];

export interface SampleTextProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: SampleTextTone | undefined;
  children: ReactNode;
}

export function SampleText({ tone = 'default', className, ...props }: SampleTextProps) {
  return (
    <span
      data-slot="state-sample-text"
      data-tone={tone}
      {...props}
      className={cn('sprout-state-sample-text', className)}
    />
  );
}

export const sampleMarkToneNames = ['red', 'orange', 'green', 'blue', 'violet', 'teal'] as const;
export type SampleMarkTone = (typeof sampleMarkToneNames)[number];
export const sampleMarkSizeNames = ['sm', 'md'] as const;
export type SampleMarkSize = (typeof sampleMarkSizeNames)[number];

export interface SampleMarkProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  tone: SampleMarkTone;
  size?: SampleMarkSize | undefined;
}

export function SampleMark({ tone, size = 'sm', className, ...props }: SampleMarkProps) {
  return (
    <span
      data-slot="state-sample-mark"
      data-tone={tone}
      data-size={size}
      aria-hidden="true"
      {...props}
      className={cn('sprout-state-sample-mark', className)}
    />
  );
}

export const sampleBarWidthNames = ['sm', 'md', 'lg'] as const;
export type SampleBarWidth = (typeof sampleBarWidthNames)[number];

export interface SampleBarProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  width?: SampleBarWidth | undefined;
}

export function SampleBar({ width = 'md', className, ...props }: SampleBarProps) {
  return (
    <span
      data-slot="state-sample-bar"
      data-width={width}
      aria-hidden="true"
      {...props}
      className={cn('sprout-state-sample-placeholder', className)}
    />
  );
}

export interface SampleIconTileProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  icon: SampleIcon;
}

export function SampleIconTile({ icon: Icon, className, ...props }: SampleIconTileProps) {
  return (
    <span
      data-slot="state-sample-icon-tile"
      aria-hidden="true"
      {...props}
      className={cn('sprout-state-sample-icon-tile', className)}
    >
      <Icon size={14} />
    </span>
  );
}
