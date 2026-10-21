'use client';

import { artwork, colors, objects, palettes } from '../internal/agent-avatar-artwork.js';
import { hash } from '../internal/hash.js';
import { Avatar, AvatarFallback, AvatarImage, type AvatarProps } from './avatar.js';

export type AgentAvatarObject = (typeof objects)[number];
export type AgentAvatarColor = (typeof colors)[number];

export const agentAvatarObjects: readonly AgentAvatarObject[] = objects;
export const agentAvatarColors: readonly AgentAvatarColor[] = colors;

function grain(seed: number) {
  let state = seed;
  const coordinate = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return ((state / 2 ** 32) * 31).toFixed(2);
  };
  return Array.from({ length: 96 }, () => `M${coordinate()} ${coordinate()}h.55v.55h-.55z`).join('');
}

let finish: string | undefined;

// The circle with a faint diagonal wash and fixed-seed grain, shared by every object.
function background() {
  const circle = '<circle cx="128" cy="128" r="120"';
  finish ??=
    '<defs><linearGradient id="tf-background-wash" x2="1" y2="1">' +
    '<stop stop-color="#0000a5" stop-opacity=".08"/><stop offset="1" stop-color="#0000a2" stop-opacity=".08"/>' +
    '</linearGradient><pattern id="tf-background-grain" width="32" height="32" patternUnits="userSpaceOnUse">' +
    `<path d="${grain(19)}" fill="#0000a2" opacity=".1"/><path d="${grain(73)}" fill="#0000a5" opacity=".09"/>` +
    `</pattern></defs>${circle} fill="#0000a1"/>${circle} fill="url(#tf-background-wash)"/>` +
    `${circle} fill="url(#tf-background-grain)"/>`;
  return finish;
}

const cache = new Map<string, string>();

/** A `data:` URL for one object in one color. Needs no network. */
export function agentAvatarArtwork(object: AgentAvatarObject, color: AgentAvatarColor) {
  const key = `${object}/${color}`;
  let src = cache.get(key);
  if (src === undefined) {
    const index = objects.indexOf(object);
    const palette = palettes[colors.indexOf(color)];
    if (index < 0 || palette === undefined) throw new Error(`Unknown agent avatar: ${key}`);
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">' +
      artwork[index]!.replace('$', background()).replace(/#0000a([1-7])/g, (_, role) => palette[Number(role) - 1]!) +
      '</svg>';
    src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    cache.set(key, src);
  }
  return src;
}

/** The stable object and color for an agent, and its artwork. */
export function agentAvatar(agentId: string) {
  const h = hash(agentId);
  const object = objects[h % objects.length]!;
  const color = colors[(h >>> 16) % colors.length]!;
  return { object, color, src: agentAvatarArtwork(object, color) };
}

export function agentAvatarSrc(agentId: string) {
  return agentAvatar(agentId).src;
}

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export interface AgentAvatarProps extends Omit<AvatarProps, 'children'> {
  agentId: string;
  /** The agent's name. Its first letter shows if a custom `src` fails. */
  name: string;
  /** Overrides the object derived from `agentId`. */
  object?: AgentAvatarObject | undefined;
  /** Overrides the color derived from `agentId`. */
  color?: AgentAvatarColor | undefined;
  /** Your own artwork instead of the built-in collection. */
  src?: string | undefined;
}

export function AgentAvatar({ agentId, name, object, color, src, ...props }: AgentAvatarProps) {
  let art: string | undefined;
  if (src === undefined) {
    const derived = agentAvatar(agentId);
    art = agentAvatarArtwork(object ?? derived.object, color ?? derived.color);
  }
  return (
    <Avatar data-agent-avatar="" {...props}>
      {art === undefined ? (
        <>
          <AvatarImage src={src} alt="" />
          <AvatarFallback>{initial(name)}</AvatarFallback>
        </>
      ) : (
        <img data-slot="avatar-image" className="sprout-avatar-image" src={art} alt="" draggable={false} />
      )}
    </Avatar>
  );
}
