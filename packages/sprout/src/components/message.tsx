import type { ComponentProps, ReactNode } from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '../internal/classes.js';

export const messageAlignNames = ['start', 'end'] as const;
export const messageBubbleVariantNames = [
  'default',
  'secondary',
  'muted',
  'tinted',
  'outline',
  'ghost',
  'destructive',
] as const;
export const messageReactionsSideNames = ['top', 'bottom'] as const;

export type MessageAlign = (typeof messageAlignNames)[number];
export type MessageBubbleVariant = (typeof messageBubbleVariantNames)[number];
export type MessageReactionsSide = (typeof messageReactionsSideNames)[number];

export type MessageGroupProps = ComponentProps<'div'>;

/** Stacks messages 8px apart. */
export function MessageGroup({ className, ...props }: MessageGroupProps) {
  return <div data-slot="message-group" className={cn('sprout-message-group', className)} {...props} />;
}

export interface MessageProps extends ComponentProps<'div'> {
  /** `"end"` puts the message on the trailing side, for your own messages. */
  align?: MessageAlign;
}

/** One chat message: an optional avatar beside its content. */
export function Message({ align = 'start', className, ...props }: MessageProps) {
  return <div data-slot="message" data-align={align} className={cn('sprout-message', className)} {...props} />;
}

export type MessageAvatarProps = ComponentProps<'div'>;

/** Holds an avatar at the bottom of the message, beside the last bubble. */
export function MessageAvatar({ className, ...props }: MessageAvatarProps) {
  return <div data-slot="message-avatar" className={cn('sprout-message-avatar', className)} {...props} />;
}

export type MessageContentProps = ComponentProps<'div'>;

/** The column of header, bubbles, cards, and footer. Slotted children follow `align`. */
export function MessageContent({ className, ...props }: MessageContentProps) {
  return <div data-slot="message-content" className={cn('sprout-message-content', className)} {...props} />;
}

export type MessageHeaderProps = ComponentProps<'div'>;

/** A small muted line above the content, such as a name and time. */
export function MessageHeader({ className, ...props }: MessageHeaderProps) {
  return <div data-slot="message-header" className={cn('sprout-message-header', className)} {...props} />;
}

export type MessageFooterProps = ComponentProps<'div'>;

/** A small muted line below the content, such as delivery or reply status. */
export function MessageFooter({ className, ...props }: MessageFooterProps) {
  return <div data-slot="message-footer" className={cn('sprout-message-footer', className)} {...props} />;
}

export interface MessageBubbleState extends Record<string, unknown> {
  slot: 'message-bubble';
  variant: MessageBubbleVariant;
}

export type MessageBubbleProps = useRender.ComponentProps<'div', MessageBubbleState> & {
  /** Fill. `"ghost"` drops the fill and padding and may span the full width. */
  variant?: MessageBubbleVariant | undefined;
  /** A `MessageReactions` pill pinned over the bubble's edge. */
  reactions?: ReactNode;
};

/** A filled chat bubble. Use `render` for a `button` or `a` to make the whole bubble act. */
export function MessageBubble({
  variant = 'default',
  reactions,
  className,
  render,
  ref,
  ...props
}: MessageBubbleProps) {
  const bubble = useRender({
    defaultTagName: 'div',
    ref,
    render,
    props: mergeProps<'div'>(
      {
        className: cn('sprout-message-bubble', `sprout-message-bubble-${variant}`, className),
      },
      props,
    ),
    state: { slot: 'message-bubble', variant },
  });
  if (reactions == null || reactions === false) return bubble;
  // Reactions often hold buttons, which can't sit inside a bubble rendered as a button or link.
  return (
    <div data-slot="message-bubble-frame" data-variant={variant} className="sprout-message-bubble-frame">
      {bubble}
      {reactions}
    </div>
  );
}

export interface MessageReactionsProps extends ComponentProps<'div'> {
  /** Edge of the bubble the pill overlaps. */
  side?: MessageReactionsSide | undefined;
  /** Corner of that edge, 12px in from the bubble's side. */
  align?: MessageAlign | undefined;
}

/** A small pill of reactions for the `reactions` prop of `MessageBubble`. */
export function MessageReactions({ side = 'bottom', align = 'end', className, ...props }: MessageReactionsProps) {
  return (
    <div
      data-slot="message-reactions"
      data-align={align}
      data-side={side}
      className={cn('sprout-message-reactions', className)}
      {...props}
    />
  );
}
