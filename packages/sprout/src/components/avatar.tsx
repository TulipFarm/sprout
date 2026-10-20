'use client';

import type { ComponentProps, CSSProperties } from 'react';
import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import { cn, stateClassName } from '../internal/classes.js';

export type AvatarSize = 'xs' | 'sm' | 'default' | 'lg';
export type EntityAvatarSize = AvatarSize | 'xl';
export type EntityAvatarShape = 'circle' | 'square';

export interface AvatarProps extends AvatarPrimitive.Root.Props {
  size?: AvatarSize;
}

export function Avatar({ className, size = 'default', ...props }: AvatarProps) {
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

// FNV-1a: small, stable, and spreads similar ids apart.
function hash(value: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Frozen order: any edit, even appending, changes existing agent avatars.
// prettier-ignore
const agentObjects = [
  "tulip", "tulip-bouquet", "cactus", "sunflower", "daisy", "sprout", "bonsai", "monstera", "fern",
  "lavender", "rose", "poppy", "daffodil", "lily", "bellflower", "eucalyptus", "ivy", "succulent",
  "acorn", "pinecone", "watering-can", "hand-trowel", "garden-fork", "pruning-shears",
  "gardening-gloves", "rain-boots", "wheelbarrow", "seed-packet", "flower-pot", "plant-mister",
  "spade", "rake", "hoe", "garden-hose", "seed-tray", "garden-apron", "plant-label", "twine-spool",
  "compost-bin", "pruning-saw", "mushroom", "strawberry", "carrot", "pumpkin", "apple", "pear",
  "lemon", "corn-cob", "honey-jar", "harvest-basket", "windmill", "barn", "tractor", "wheat",
  "pea-pod", "beetroot", "radish", "eggplant", "cherries", "hay-bale", "umbrella", "mug", "teapot",
  "moka-pot", "lantern", "candle", "picnic-basket", "straw-hat", "vase", "jam-jar", "birdhouse",
  "rocking-chair", "kettle", "bread-loaf", "croissant", "milk-bottle", "cookie", "oven-mitt",
  "thermos", "yarn-ball", "notebook", "pencil", "paintbrush", "paint-palette", "fountain-pen",
  "camera", "headphones", "desk-lamp", "book-stack", "alarm-clock", "scissors", "ruler", "stapler",
  "paperclip", "binder-clip", "tape-dispenser", "magnifying-glass", "envelope", "typewriter",
  "globe",
] as const;
// prettier-ignore
const agentColors = ["pink", "coral", "orange", "yellow", "green", "teal", "blue", "purple"] as const;

export function agentAvatarSrc(agentId: string, baseUrl = 'https://avatars.tulipfarm.ai/avatar') {
  const h = hash(agentId);
  const object = agentObjects[h % agentObjects.length];
  const color = agentColors[(h >>> 16) % agentColors.length];
  return `${baseUrl}/${object}/${color}.svg`;
}

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export interface AgentAvatarProps extends Omit<AvatarProps, 'children'> {
  agentId: string;
  name: string;
  /** Overrides the artwork derived from `agentId`. */
  src?: string | undefined;
}

export function AgentAvatar({ agentId, name, src, ...props }: AgentAvatarProps) {
  return (
    <Avatar data-agent-avatar="" {...props}>
      <AvatarImage src={src ?? agentAvatarSrc(agentId)} alt="" />
      <AvatarFallback>{initial(name)}</AvatarFallback>
    </Avatar>
  );
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
  size = 'default',
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
