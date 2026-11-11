import { useEffect, useState, type ReactNode } from 'react';
import {
  MonsterAvatar,
  monsterAvatarParts,
  monsterAvatarPresets,
  type MonsterAvatarConfig,
} from '@tulipfarm/sprout/monster-avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tulipfarm/sprout/select';
import '../styles/avatar-demo.css';
import '../styles/monster-avatar-demo.css';

function Frame({ title, children, foot }: { title: string; children: ReactNode; foot?: ReactNode }) {
  return (
    <section className="avatar-frame" aria-label={title}>
      <div className="avatar-frame-bar">{title}</div>
      <div className="avatar-frame-body">{children}</div>
      {foot && <div className="avatar-frame-foot">{foot}</div>}
    </section>
  );
}

const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replaceAll('-', ' ');

type Part = keyof MonsterAvatarConfig;
const order: Part[] = ['color', 'body', 'pattern', 'ears', 'eyes', 'mouth', 'hat', 'item'];

const any = (part: Part) => {
  const list = monsterAvatarParts[part] as readonly string[];
  return list[Math.floor(Math.random() * list.length)]!;
};

function randomMonster(): MonsterAvatarConfig {
  const config = Object.fromEntries(order.map(part => [part, any(part)])) as unknown as MonsterAvatarConfig;
  // Hats look best now and then, like in the presets.
  if (Math.random() < 0.5) config.hat = 'none';
  return config;
}

const sizes = [24, 32, 48, 64, 96, 128];

export function MonsterAvatarSizes() {
  // Picked after hydration so the server and the browser render the same markup.
  const [config, setConfig] = useState<MonsterAvatarConfig>();
  useEffect(() => setConfig(randomMonster()), []);
  const cell = (size: number, animated = true) =>
    config ? (
      <MonsterAvatar config={config} size={size} animated={animated} />
    ) : (
      <span style={{ display: 'inline-block', width: size, height: size }} />
    );
  return (
    <Frame
      title="Monster avatars"
      foot={
        <div className="monster-foot">
          <span>A new monster on every visit.</span>
          <button type="button" className="agent-avatar-color" onClick={() => setConfig(randomMonster())}>
            Shuffle
          </button>
        </div>
      }
    >
      <div className="avatar-row">
        {sizes.map(size => (
          <div key={size} className="avatar-cell">
            {cell(size)}
            <span>{size}px</span>
          </div>
        ))}
        <div className="avatar-cell">
          {cell(64, false)}
          <span>still</span>
        </div>
      </div>
    </Frame>
  );
}

const motions: { name: string; note: string; config: Partial<MonsterAvatarConfig> }[] = [
  { name: 'Breathe', note: 'Every body, always', config: { item: 'none', eyes: 'content' } },
  { name: 'Blink', note: 'Open eyes, every few seconds', config: { item: 'none', eyes: 'wide' } },
  { name: 'Bob', note: 'Laptop, email, chart…', config: { item: 'laptop' } },
  { name: 'Sway', note: 'Magnifier, globe, plant…', config: { item: 'magnifier' } },
  { name: 'Float', note: 'Rocket, plane, cloud…', config: { item: 'rocket' } },
  { name: 'Pulse', note: 'Heart, shield, bulb…', config: { item: 'heart' } },
  { name: 'Ring', note: 'Bell, megaphone, gift', config: { item: 'bell' } },
  { name: 'Wave', note: 'Cheer body', config: { body: 'cheer', item: 'chat' } },
  { name: 'Typing', note: 'Chat bubble dots', config: { item: 'chat' } },
  { name: 'Steam', note: 'Coffee', config: { item: 'coffee' } },
  { name: 'Hat sway', note: 'Sprout, tulip, halo', config: { hat: 'sprout', item: 'none' } },
  { name: 'Still', note: 'animated={false} or reduced motion', config: { item: 'laptop' } },
];

const base: MonsterAvatarConfig = {
  body: 'blob',
  color: 'yellow',
  pattern: 'plain',
  ears: 'cat',
  eyes: 'round',
  mouth: 'smile',
  hat: 'none',
  item: 'none',
};
const tints: MonsterAvatarConfig['color'][] = ['yellow', 'blue', 'pink', 'green', 'purple', 'teal'];

export function MonsterAvatarMotions() {
  return (
    <Frame title="Animations">
      <ul className="monster-gallery" style={{ '--monster-cell': '128px' } as React.CSSProperties}>
        {motions.map((motion, index) => (
          <li key={motion.name} className="avatar-cell monster-motion">
            <MonsterAvatar
              config={{ ...base, color: tints[index % tints.length]!, ...motion.config }}
              size={88}
              animated={motion.name !== 'Still'}
            />
            <strong>{motion.name}</strong>
            <span>{motion.note}</span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

export function MonsterAvatarGallery() {
  const [size, setSize] = useState(72);
  return (
    <Frame
      title={`${monsterAvatarPresets.length} presets`}
      foot={
        <div className="agent-avatar-colors" role="group" aria-label="Size">
          {[40, 72, 112].map(option => (
            <button
              key={option}
              type="button"
              className="agent-avatar-color"
              aria-pressed={size === option}
              onClick={() => setSize(option)}
            >
              {option}px
            </button>
          ))}
        </div>
      }
    >
      <ul className="monster-gallery" style={{ '--monster-cell': `${size + 24}px` } as React.CSSProperties}>
        {monsterAvatarPresets.map(preset => (
          <li key={preset.name} className="avatar-cell">
            <MonsterAvatar config={preset.config} size={size} />
            <span>{preset.name}</span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

export function MonsterAvatarBuilder() {
  const [config, setConfig] = useState<MonsterAvatarConfig>({
    body: 'blob',
    color: 'yellow',
    pattern: 'fur',
    ears: 'cat',
    eyes: 'round',
    mouth: 'smile',
    hat: 'headphones',
    item: 'email',
  });
  const shuffle = () => setConfig(randomMonster());
  const code = `<MonsterAvatar ${order.map(part => `${part}="${config[part]}"`).join(' ')} />`;
  return (
    <Frame title="Mix your own" foot={<code className="monster-code">{code}</code>}>
      <div className="monster-builder">
        <div className="monster-stage">
          <MonsterAvatar {...config} size={176} label="Your monster" />
          <button type="button" className="agent-avatar-color" onClick={shuffle}>
            Shuffle
          </button>
        </div>
        <div className="monster-controls">
          {order.map(part => (
            <div key={part} className="monster-control">
              <span id={`monster-${part}`}>{label(part)}</span>
              <Select
                items={(monsterAvatarParts[part] as readonly string[]).map(value => ({ value, label: label(value) }))}
                value={config[part]}
                onValueChange={value => value && setConfig({ ...config, [part]: value })}
              >
                <SelectTrigger aria-labelledby={`monster-${part}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(monsterAvatarParts[part] as readonly string[]).map(option => (
                    <SelectItem key={option} value={option}>
                      {label(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}
