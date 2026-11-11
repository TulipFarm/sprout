'use client';

import { useEffect, useRef, type CSSProperties, type HTMLAttributes } from 'react';
import { hash } from '../internal/hash.js';
import {
  bodies,
  bodyGeometry,
  bodyTexture,
  colors,
  defaultHand,
  earParts,
  ears,
  eyeParts,
  eyes,
  hatParts,
  hats,
  ink,
  itemParts,
  items,
  mouthParts,
  mouths,
  palettes,
  patterns,
  type MonsterBody,
  type MonsterColor,
  type MonsterEars,
  type MonsterEyes,
  type MonsterHat,
  type MonsterItem,
  type MonsterMouth,
  type MonsterPattern,
} from '../internal/monster-avatar-parts.js';
import { presets } from '../internal/monster-avatar-presets.js';
import { cn } from '../internal/classes.js';

export type {
  MonsterBody,
  MonsterColor,
  MonsterEars,
  MonsterEyes,
  MonsterHat,
  MonsterItem,
  MonsterMouth,
  MonsterPattern,
};

export interface MonsterAvatarConfig {
  body: MonsterBody;
  color: MonsterColor;
  pattern: MonsterPattern;
  ears: MonsterEars;
  eyes: MonsterEyes;
  mouth: MonsterMouth;
  hat: MonsterHat;
  item: MonsterItem;
}

export const monsterAvatarParts = {
  body: bodies,
  color: colors,
  pattern: patterns,
  ears,
  eyes,
  mouth: mouths,
  hat: hats,
  item: items,
} as const;

/** Ready-made characters, one per kind of agent. */
export const monsterAvatarPresets: readonly { name: string; config: MonsterAvatarConfig }[] = presets;

const pick = <T,>(list: readonly T[], value: number) => list[value % list.length]!;

/** A stable character for an agent id. */
export function monsterAvatar(agentId: string): MonsterAvatarConfig {
  const h = hash(agentId);
  const h2 = hash(`${agentId}:monster`);
  return {
    body: pick(bodies, h),
    color: pick(colors, h >>> 4),
    pattern: pick(patterns, h2 >>> 23),
    ears: pick(ears, h >>> 9),
    eyes: pick(eyes, h >>> 14),
    mouth: pick(mouths, h >>> 19),
    // Most monsters go bareheaded, so hats stay special.
    hat: h2 % 3 === 0 ? pick(hats, h2 >>> 3) : 'none',
    item: pick(items.slice(1), h2 >>> 11),
  };
}

// The view box leaves room for tall hats and long items around the 128 grid.
const box = { x: -4, y: -8, size: 136 };
const percent = (value: number, start: number) => `${Math.round(((value - start) / box.size) * 1000) / 10}%`;
const origin = (x: number, y: number) => `${percent(x, box.x)} ${percent(y, box.y)}`;
const strokes = `stroke="${ink}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;

interface Layers {
  back: string;
  body: string;
  eyes: string;
  hat: string;
  item: string;
  wave: string;
  waveOrigin: string;
  eyeOrigin: string;
  hatOrigin: string;
  itemOrigin: string;
  hatSway: boolean;
  itemMotion: string;
}

const cache = new Map<string, Layers>();

function layers(config: MonsterAvatarConfig): Layers {
  const key = Object.values(config).join('/');
  let result = cache.get(key);
  if (result) return result;
  const palette = palettes[config.color];
  const body = bodyGeometry(config.body);
  if (!palette || !(config.ears in earParts) || !(config.eyes in eyeParts) || !(config.mouth in mouthParts)) {
    throw new Error(`Unknown monster avatar: ${key}`);
  }
  const hat = hatParts[config.hat];
  const item = itemParts[config.item];
  if (!hat || !item) throw new Error(`Unknown monster avatar: ${key}`);
  // Hats and ears sit on the head; the face sits a little lower.
  const dy = body.top - 30;
  const [fx, fy] = body.face;
  const head = `transform="translate(${body.cx} ${dy}) scale(${body.sx} 1) translate(-64 0)"`;
  const face = `transform="translate(${fx} ${fy})"`;
  const holding = config.item !== 'none';
  const [ix, iy] = body.item;
  const paw = (x: number, y: number) =>
    `<ellipse cx="${x}" cy="${y}" rx="5.5" ry="5" fill="${palette.body}"/>` +
    `<path d="M${x - 1.8} ${y + 1.6}v2.2M${x + 1.6} ${y + 1.6}v2.2" stroke-width="1.5"/>`;
  const hand = item.hand ?? defaultHand;
  const motion = item.motion ?? 'bob';

  result = {
    back:
      `<g ${head}>${earParts[config.ears](palette)}</g>` + (body.wave && !holding ? body.armRight(palette.body) : ''),
    wave: body.wave ? body.wave.art(palette.body) : '',
    waveOrigin: body.wave ? origin(...body.wave.shoulder) : '',
    body:
      `<path d="${body.path}" fill="${palette.body}" stroke-width="3"/>` +
      body.toes +
      bodyTexture(config.body, config.pattern, palette.shade) +
      body.arm(palette.body) +
      (body.wave || holding ? '' : body.armRight(palette.body)) +
      `<g transform="translate(${fx} ${fy + 2})">${mouthParts[config.mouth](palette)}</g>`,
    eyes: `<g ${face}>${eyeParts[config.eyes](palette)}</g>`,
    hat: `<g ${head}>${hat.art(palette)}</g>`,
    item: holding
      ? `<g transform="translate(${ix} ${iy})">${item.art}${body.paw ? paw(hand[0], hand[1]) : ''}</g>`
      : '',
    eyeOrigin: origin(64 + fx, 60 + fy),
    hatOrigin: origin(body.cx, body.top),
    itemOrigin: motion === 'pulse' || !body.paw ? origin(ix + 20, iy + 20) : origin(ix + hand[0], iy + hand[1]),
    hatSway: hat.sway === true,
    itemMotion: motion,
  };
  cache.set(key, result);
  return result;
}

const svg = (content: string, attributes = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.size} ${box.size}"${attributes}><g ${strokes}>${content}</g></svg>`;

/** The whole character as one still SVG string, for images and exports. */
export function monsterAvatarSvg(config: MonsterAvatarConfig) {
  const l = layers(config);
  return svg(l.back + l.wave + l.body + l.eyes + l.hat + l.item);
}

/** A still `data:` URL of the character. Needs no network. */
export function monsterAvatarSrc(config: MonsterAvatarConfig) {
  return `data:image/svg+xml,${encodeURIComponent(monsterAvatarSvg(config))}`;
}

let observer: IntersectionObserver | undefined;

// One observer for every avatar pauses animation while it is off screen.
function watch(element: Element) {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  observer ??= new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.toggleAttribute('data-offscreen', !entry.isIntersecting);
  });
  observer.observe(element);
  return () => observer?.unobserve(element);
}

export interface MonsterAvatarProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'color'>, Partial<MonsterAvatarConfig> {
  /** Picks a stable character. Part props override it. */
  agentId?: string | undefined;
  /** Starts from a full character, such as one of `monsterAvatarPresets`. */
  config?: MonsterAvatarConfig | undefined;
  /** Width and height in pixels. */
  size?: number | undefined;
  /** Breathing, blinking and item motion. Off for reduced motion. */
  animated?: boolean | undefined;
  /** Accessible name. Without it the avatar is decorative. */
  label?: string | undefined;
}

const layerClass = 'sprout-monster-layer';

export function MonsterAvatar({
  agentId,
  config,
  body,
  color,
  pattern,
  ears: earsProp,
  eyes: eyesProp,
  mouth,
  hat,
  item,
  size = 64,
  animated = true,
  label,
  className,
  style,
  ...props
}: MonsterAvatarProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => (animated && ref.current ? watch(ref.current) : undefined), [animated]);

  const base = config ?? monsterAvatar(agentId ?? 'monster');
  const resolved: MonsterAvatarConfig = {
    body: body ?? base.body,
    color: color ?? base.color,
    pattern: pattern ?? base.pattern,
    ears: earsProp ?? base.ears,
    eyes: eyesProp ?? base.eyes,
    mouth: mouth ?? base.mouth,
    hat: hat ?? base.hat,
    item: item ?? base.item,
  };
  const l = layers(resolved);
  const seed = hash(agentId ?? Object.values(resolved).join('/'));
  const layer = (content: string, extra?: { className?: string; style?: CSSProperties; motion?: string }) =>
    content && (
      <svg
        className={cn(layerClass, extra?.className)}
        viewBox={`${box.x} ${box.y} ${box.size} ${box.size}`}
        style={extra?.style}
        data-motion={extra?.motion}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: `<g ${strokes}>${content}</g>` }}
      />
    );

  return (
    <span
      ref={ref}
      data-slot="monster-avatar"
      data-animated={animated ? '' : undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('sprout-monster', className)}
      style={
        {
          '--sprout-monster-size': `${size}px`,
          '--sm-delay': `-${(seed % 5000) / 1000}s`,
          '--sm-blink': `${4 + ((seed >>> 13) % 30) / 10}s`,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <span className="sprout-monster-figure">
        {layer(l.back)}
        {layer(l.wave, { motion: 'wave', style: { transformOrigin: l.waveOrigin } })}
        {layer(l.body)}
        {layer(l.eyes, { className: 'sprout-monster-eyes', style: { transformOrigin: l.eyeOrigin } })}
        {layer(l.hat, { motion: l.hatSway ? 'sway' : undefined, style: { transformOrigin: l.hatOrigin } })}
        {layer(l.item, {
          className: 'sprout-monster-item',
          motion: l.itemMotion,
          style: { transformOrigin: l.itemOrigin },
        })}
      </span>
    </span>
  );
}
