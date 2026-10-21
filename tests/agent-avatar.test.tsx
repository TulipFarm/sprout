import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  AgentAvatar,
  agentAvatar,
  agentAvatarArtwork,
  agentAvatarColors,
  agentAvatarObjects,
  agentAvatarSrc,
} from '../packages/sprout/src/components/agent-avatar.js';
// @ts-expect-error untyped build script
import { generate, output } from '../packages/sprout/scripts/agent-avatars.mjs';

// The order agents were assigned artwork in when it lived at avatars.tulipfarm.ai.
// prettier-ignore
const frozenObjects = [
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
];

const svgOf = (src: string) => decodeURIComponent(src.replace(/^data:image\/svg\+xml,/, ''));

describe('AgentAvatar', () => {
  it('keeps the frozen object and color order', () => {
    expect(agentAvatarObjects).toEqual(frozenObjects);
    expect(agentAvatarColors).toEqual(['pink', 'coral', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple']);
  });

  it('gives each agent the same artwork it had before', () => {
    expect(agentAvatar('sample-collections')).toMatchObject({ object: 'ruler', color: 'orange' });
    expect(agentAvatar('x')).toEqual(agentAvatar('x'));
    expect(agentAvatarSrc('x')).toBe(agentAvatar('x').src);
    const picked = new Set(Array.from({ length: 400 }, (_, i) => agentAvatar(`agent_${i}`).object));
    expect(picked.size).toBeGreaterThan(80);
  });

  it('builds a self-contained SVG for every object and color', () => {
    for (const object of agentAvatarObjects)
      for (const color of agentAvatarColors) {
        const src = agentAvatarArtwork(object, color);
        expect(src).toMatch(/^data:image\/svg\+xml,/);
        const svg = svgOf(src);
        expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 256 256"/);
        expect(svg).toContain('url(#tf-background-grain)');
        expect(svg).not.toMatch(/#0000a\d|\$|data-|href|<script|<title/);
      }
    expect(svgOf(agentAvatarArtwork('tulip', 'pink'))).toContain('#c5648b');
    expect(svgOf(agentAvatarArtwork('tulip', 'teal'))).toContain('#4b8c89');
    // @ts-expect-error unknown object
    expect(() => agentAvatarArtwork('dragon', 'pink')).toThrow(/Unknown agent avatar/);
  });

  it('renders the artwork on the server without a network request', () => {
    const html = renderToString(<AgentAvatar agentId="sample-collections" name="Collections" size="sm" />);
    expect(html).toContain('data-agent-avatar=""');
    expect(html).toContain('data-size="sm"');
    expect(html).toMatch(/<img[^>]+src="data:image\/svg\+xml,/);
    expect(html).toContain('alt=""');
    expect(html).not.toContain('avatars.tulipfarm.ai');
  });

  it('takes an object, a color, or custom artwork with an initial fallback', () => {
    const chosen = renderToString(<AgentAvatar agentId="x" name="X" object="tulip" color="blue" />);
    expect(chosen).toContain(agentAvatarArtwork('tulip', 'blue').replaceAll('&', '&amp;'));
    const custom = renderToString(<AgentAvatar agentId="x" name=" garden assistant" src="/missing.png" />);
    expect(custom).not.toContain('data:image');
    expect(custom).toContain('>G<');
  });

  it('ships generated artwork that matches the SVG sources', async () => {
    const committed = await readFile(output, 'utf8');
    await generate();
    expect(await readFile(output, 'utf8')).toBe(committed);
  });
});
