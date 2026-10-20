'use client';

import type { ComponentProps, ReactNode } from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { Separator as BaseSeparator } from '@base-ui/react/separator';
import { useRender } from '@base-ui/react/use-render';
import { cn, stateClassName } from '../internal/classes.js';

export const separatorVariantNames = ['line', 'fade', 'marker', 'marker-border'] as const;
export const separatorOrientationNames = ['horizontal', 'vertical'] as const;
export const separatorToneNames = ['default', 'input'] as const;

export type SeparatorVariant = (typeof separatorVariantNames)[number];
export type SeparatorOrientation = (typeof separatorOrientationNames)[number];
export type SeparatorTone = (typeof separatorToneNames)[number];

/** A bare 1px rule, horizontal or vertical. */
export interface SeparatorLineProps extends Omit<BaseSeparator.Props, 'children'> {
  variant?: 'line' | undefined;
  /** `"input"` matches control borders, for dividers inside grouped buttons. */
  tone?: SeparatorTone | undefined;
  children?: undefined;
}

/** A horizontal rule with centered content, such as "or". */
export interface SeparatorLabelProps extends Omit<ComponentProps<'div'>, 'children'> {
  variant?: 'line' | undefined;
  /**
   * Short content centered on the line. Content that renders nothing, such
   * as `false`, leaves a spaced plain line.
   */
  children: ReactNode;
}

/** A horizontal rule with faded ends and a centered text label. */
export interface SeparatorFadeProps extends Omit<BaseSeparator.Props, 'children' | 'orientation'> {
  variant: 'fade';
  /** The label. It also names the separator for assistive technology. */
  children: string;
}

export interface SeparatorMarkerState extends Record<string, unknown> {
  slot: 'separator';
  variant: 'marker' | 'marker-border';
}

/** A quiet, full-width timeline note, such as "Used skill" or "Today". */
export interface SeparatorMarkerProps extends useRender.ComponentProps<'div', SeparatorMarkerState> {
  /** `"marker-border"` adds a line under the row. */
  variant: 'marker' | 'marker-border';
}

export type SeparatorProps = SeparatorLineProps | SeparatorLabelProps | SeparatorFadeProps | SeparatorMarkerProps;

export function Separator(props: SeparatorProps) {
  if (props.variant === 'fade') return <Fade {...props} />;
  if (props.variant === 'marker' || props.variant === 'marker-border') return <Marker {...props} />;
  if (props.children !== undefined) return <Labeled {...(props as SeparatorLabelProps)} />;
  return <Line {...(props as SeparatorLineProps)} />;
}

function Line({
  className,
  orientation = 'horizontal',
  tone = 'default',
  variant: _variant,
  ...props
}: SeparatorLineProps) {
  return (
    <BaseSeparator
      data-slot="separator"
      data-variant="line"
      data-tone={tone}
      orientation={orientation}
      className={stateClassName<BaseSeparator.State>('sprout-separator', className)}
      {...props}
    />
  );
}

function Labeled({ children, className, variant: _variant, ...props }: SeparatorLabelProps) {
  const content = children !== null && children !== false && children !== '';
  return (
    <div
      data-slot="separator"
      data-variant="label"
      data-content={content}
      className={cn('sprout-separator-label', className)}
      {...props}
    >
      <Line className="sprout-separator-label-line" />
      {content && (
        <>
          <span data-slot="separator-label-content" className="sprout-separator-label-content">
            {children}
          </span>
          <span
            aria-hidden="true"
            className="sprout-separator sprout-separator-label-line"
            data-orientation="horizontal"
          />
        </>
      )}
    </div>
  );
}

function Fade({ children, className, variant: _variant, ...props }: SeparatorFadeProps) {
  return (
    <BaseSeparator
      aria-label={children}
      data-slot="separator"
      data-variant="fade"
      orientation="horizontal"
      className={stateClassName<BaseSeparator.State>('sprout-separator-fade', className)}
      {...props}
    >
      <span className="sprout-separator-fade-label">{children}</span>
      <span aria-hidden="true" className="sprout-separator-fade-shine">
        <span className="sprout-separator-fade-label">{children}</span>
      </span>
    </BaseSeparator>
  );
}

function Marker({ className, variant, render, ref, ...props }: SeparatorMarkerProps) {
  return useRender({
    defaultTagName: 'div',
    ref,
    render,
    props: mergeProps<'div'>(
      {
        'data-slot': 'separator',
        'data-variant': variant,
        className: cn(
          'sprout-separator-marker',
          variant === 'marker-border' && 'sprout-separator-marker-border',
          className,
        ),
      } as ComponentProps<'div'>,
      props,
    ),
    state: { slot: 'separator', variant },
  });
}

export type SeparatorIconProps = ComponentProps<'span'>;

/** A 16px decorative icon slot. It is hidden from assistive technology. */
export function SeparatorIcon({ className, ...props }: SeparatorIconProps) {
  return (
    <span data-slot="separator-icon" aria-hidden="true" className={cn('sprout-separator-icon', className)} {...props} />
  );
}

export type SeparatorContentProps = ComponentProps<'span'>;

/** Marker text. Long words wrap instead of overflowing. */
export function SeparatorContent({ className, ...props }: SeparatorContentProps) {
  return <span data-slot="separator-content" className={cn('sprout-separator-content', className)} {...props} />;
}
