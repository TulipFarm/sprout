'use client';

import type { ComponentProps, CSSProperties } from 'react';
import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import { cn, stateClassName } from '../internal/classes.js';
import { hash } from '../internal/hash.js';

export type AvatarSize = 'sm' | 'md' | 'lg';
export type EntityAvatarSize = AvatarSize;
export type EntityAvatarShape = 'circle' | 'square';

export interface AvatarProps extends AvatarPrimitive.Root.Props {
  size?: AvatarSize;
}

export function Avatar({ className, size = 'md', ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      {...props}
      className={stateClassName<AvatarPrimitive.Root.State>('sprout-avatar', className)}
    />
  );
}

export type AvatarImageProps = AvatarPrimitive.Image.Props;

export function AvatarImage({ className, ...props }: AvatarImageProps) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      {...props}
      className={stateClassName<AvatarPrimitive.Image.State>('sprout-avatar-image', className)}
    />
  );
}

export type AvatarFallbackProps = AvatarPrimitive.Fallback.Props;

export function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      {...props}
      className={stateClassName<AvatarPrimitive.Fallback.State>('sprout-avatar-fallback', className)}
    />
  );
}

export function AvatarBadge({ className, ...props }: ComponentProps<'span'>) {
  return <span data-slot="avatar-badge" {...props} className={cn('sprout-avatar-badge', className)} />;
}

export function AvatarGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="avatar-group" {...props} className={cn('sprout-avatar-group', className)} />;
}

export function AvatarGroupCount({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="avatar-group-count" {...props} className={cn('sprout-avatar-group-count', className)} />;
}

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

// Same seed, same gradient: the fallback never changes between visits.
function gradientFor(seed: string) {
  const h = hash(seed);
  const from = h % 360;
  const to = (from + 40 + ((h >>> 9) % 60)) % 360;
  return `linear-gradient(135deg, oklch(0.62 0.15 ${from}), oklch(0.5 0.15 ${to}))`;
}

export interface EntityAvatarProps extends Omit<AvatarPrimitive.Root.Props, 'children'> {
  seed: string;
  name: string;
  image?: string | null | undefined;
  size?: EntityAvatarSize;
  shape?: EntityAvatarShape;
}

export function EntityAvatar({
  seed,
  name,
  image,
  size = 'md',
  shape = 'circle',
  className,
  ...props
}: EntityAvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="entity-avatar"
      data-size={size}
      data-shape={shape}
      {...props}
      className={stateClassName<AvatarPrimitive.Root.State>('sprout-entity-avatar', className)}
    >
      {image && (
        <AvatarPrimitive.Image src={image} alt="" referrerPolicy="no-referrer" className="sprout-avatar-image" />
      )}
      <AvatarPrimitive.Fallback
        className="sprout-entity-avatar-fallback"
        style={{ backgroundImage: gradientFor(seed) } as CSSProperties}
      >
        {initial(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
