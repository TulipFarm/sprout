import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  MonsterAvatar,
  monsterAvatar,
  monsterAvatarParts,
  monsterAvatarPresets,
  monsterAvatarSrc,
  monsterAvatarSvg,
  type MonsterAvatarConfig,
} from '../packages/sprout/src/components/monster-avatar.js';

const base = monsterAvatarPresets[0]!.config;

describe('MonsterAvatar', () => {
  it('gives each agent a stable character made of known parts', () => {
    expect(monsterAvatar('agent_1')).toEqual(monsterAvatar('agent_1'));
    const picked = Array.from({ length: 300 }, (_, i) => monsterAvatar(`agent_${i}`));
    for (const config of picked)
      for (const [part, value] of Object.entries(config))
        expect(monsterAvatarParts[part as keyof MonsterAvatarConfig]).toContain(value);
    expect(new Set(picked.map(config => config.body)).size).toBe(monsterAvatarParts.body.length);
    expect(picked.every(config => config.item !== 'none')).toBe(true);
  });

  it('builds a self-contained SVG for every part', () => {
    for (const [part, values] of Object.entries(monsterAvatarParts))
      for (const body of monsterAvatarParts.body)
        for (const value of values) {
          const svg = monsterAvatarSvg({ ...base, body, [part]: value });
          expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[^"]+"/);
          expect(svg).not.toMatch(/undefined|NaN|<script|href/);
        }
    expect(monsterAvatarSrc(base)).toBe(`data:image/svg+xml,${encodeURIComponent(monsterAvatarSvg(base))}`);
  });

  it('ships uniquely named presets made of known parts', () => {
    expect(monsterAvatarPresets.length).toBeGreaterThanOrEqual(50);
    expect(new Set(monsterAvatarPresets.map(preset => preset.name)).size).toBe(monsterAvatarPresets.length);
    for (const { config } of monsterAvatarPresets)
      for (const [part, value] of Object.entries(config))
        expect(monsterAvatarParts[part as keyof MonsterAvatarConfig]).toContain(value);
  });

  it('lets part props override a character', () => {
    const html = renderToString(<MonsterAvatar config={base} item="coffee" size={40} />);
    expect(html).toContain('--sprout-monster-size:40px');
    expect(html).toContain('sm-steam');
    expect(renderToString(<MonsterAvatar config={{ ...base, item: 'coffee' }} size={40} />)).toBe(html);
  });

  it('is decorative unless labelled and can stay still', () => {
    const decorative = renderToString(<MonsterAvatar agentId="a" />);
    expect(decorative).toContain('aria-hidden="true"');
    expect(decorative).toContain('data-animated=""');
    const labelled = renderToString(<MonsterAvatar agentId="a" label="Research agent" animated={false} />);
    expect(labelled).toContain('role="img"');
    expect(labelled).toContain('aria-label="Research agent"');
    expect(labelled).not.toContain('data-animated');
  });
});
