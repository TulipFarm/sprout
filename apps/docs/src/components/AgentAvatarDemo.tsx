import { useState, type ReactNode } from 'react';
import {
  AgentAvatar,
  agentAvatarColors,
  agentAvatarObjects,
  type AgentAvatarColor,
} from '@tulipfarm/sprout/agent-avatar';
import type { AvatarSize } from '@tulipfarm/sprout/avatar';
import '../styles/avatar-demo.css';

const sizes: AvatarSize[] = ['sm', 'md', 'lg'];

function Frame({ title, children, foot }: { title: string; children: ReactNode; foot?: ReactNode }) {
  return (
    <section className="avatar-frame" aria-label={title}>
      <div className="avatar-frame-bar">{title}</div>
      <div className="avatar-frame-body">{children}</div>
      {foot && <div className="avatar-frame-foot">{foot}</div>}
    </section>
  );
}

const label = (object: string) => object.charAt(0).toUpperCase() + object.slice(1).replaceAll('-', ' ');

export function AgentAvatarSizes() {
  return (
    <Frame
      title="Agent avatars"
      foot="Artwork is chosen from the agent id. The last example uses its own src, which fails, so it shows the first letter."
    >
      <div className="avatar-row">
        {sizes.map(size => (
          <div key={size} className="avatar-cell">
            <AgentAvatar agentId="docs-garden-example" name="Garden assistant" size={size} />
            <span>{size}</span>
          </div>
        ))}
        <div className="avatar-cell">
          <AgentAvatar agentId="docs-other-example" name="Orchard helper" />
          <span>other id</span>
        </div>
        <div className="avatar-cell">
          <AgentAvatar agentId="docs-missing-art" name="Weekly reporter" src="/avatar-samples/missing.svg" />
          <span>fallback</span>
        </div>
      </div>
    </Frame>
  );
}

export function AgentAvatarGallery() {
  const [color, setColor] = useState<AgentAvatarColor | 'agent'>('agent');
  return (
    <Frame
      title={`All ${agentAvatarObjects.length} objects`}
      foot={
        <div className="agent-avatar-colors" role="group" aria-label="Color">
          {(['agent', ...agentAvatarColors] as const).map(option => (
            <button
              key={option}
              type="button"
              className="agent-avatar-color"
              aria-pressed={color === option}
              onClick={() => setColor(option)}
            >
              {option === 'agent' ? 'Mixed' : label(option)}
            </button>
          ))}
        </div>
      }
    >
      <ul className="agent-avatar-gallery">
        {agentAvatarObjects.map((object, index) => (
          <li key={object} className="avatar-cell">
            <AgentAvatar
              agentId={object}
              name={label(object)}
              object={object}
              color={color === 'agent' ? agentAvatarColors[index % agentAvatarColors.length] : color}
              size="lg"
            />
            <span>{label(object)}</span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}
