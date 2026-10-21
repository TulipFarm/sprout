import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle } from 'reicon-react/icons/CheckCircle';
import { Pause } from 'reicon-react/icons/Pause';
import { Play } from 'reicon-react/icons/Play';
import { AgentAvatar } from '@tulipfarm/sprout/agent-avatar';
import { BrandIcon, type Brand } from '@tulipfarm/sprout/brand-icon';
import { Button } from '@tulipfarm/sprout/button';
import {
  GradientBanner,
  GradientBannerBadge,
  GradientBannerPanel,
  GradientBannerProgress,
  gradientBannerPanelToneNames,
  gradientBannerSizeNames,
  gradientBannerVariantNames,
  type GradientBannerPanelTone,
  type GradientBannerSize,
  type GradientBannerVariant,
} from '@tulipfarm/sprout/gradient-banner';
import { Spinner } from '@tulipfarm/sprout/spinner';
import DocsSelect from './DocsSelect';
import '../styles/gradient-banner-demo.css';

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="gradient-demo-frame" aria-label={title}>
      <div className="gradient-demo-frame-bar">{title}</div>
      <div className="gradient-demo-frame-body">{children}</div>
    </section>
  );
}

type Content = 'none' | 'text' | 'panel' | 'prompt';

export function GradientBannerPlayground() {
  const [variant, setVariant] = useState<GradientBannerVariant>('aurora');
  const [size, setSize] = useState<GradientBannerSize>('lg');
  const [tone, setTone] = useState<GradientBannerPanelTone>('light');
  const [content, setContent] = useState<Content>('panel');
  const [texture, setTexture] = useState(true);
  return (
    <section className="gradient-demo-playground" aria-label="Gradient banner playground">
      <div className="gradient-demo-toolbar">
        <label>
          Variant
          <DocsSelect
            label="Variant"
            value={variant}
            items={gradientBannerVariantNames.map(value => ({
              value,
              label: value === 'aurora' ? 'aurora (default)' : value,
            }))}
            onValueChange={setVariant}
          />
        </label>
        <label>
          Size
          <DocsSelect
            label="Size"
            value={size}
            items={gradientBannerSizeNames.map(value => ({
              value,
              label: value === 'lg' ? 'lg (default)' : value,
            }))}
            onValueChange={setSize}
          />
        </label>
        <label>
          Content
          <DocsSelect
            label="Content"
            value={content}
            items={[
              { value: 'panel', label: 'Panel with badge' },
              { value: 'prompt', label: 'Prompt panel' },
              { value: 'text', label: 'Text on art' },
              { value: 'none', label: 'Art only' },
            ]}
            onValueChange={setContent}
          />
        </label>
        <label>
          Panel tone
          <DocsSelect
            label="Panel tone"
            value={tone}
            items={gradientBannerPanelToneNames.map(value => ({
              value,
              label: value === 'light' ? 'light (default)' : value,
            }))}
            onValueChange={setTone}
          />
        </label>
        <button
          type="button"
          className="gradient-demo-toggle"
          aria-pressed={texture}
          onClick={() => setTexture(value => !value)}
        >
          Texture
        </button>
      </div>
      <div className="gradient-demo-stage">
        <GradientBanner variant={variant} size={size} texture={texture}>
          {content === 'panel' && (
            <GradientBannerPanel tone={tone}>
              <GradientBannerBadge>Example</GradientBannerBadge>
              <span>How agents work in TulipFarm</span>
            </GradientBannerPanel>
          )}
          {content === 'prompt' && (
            <GradientBannerPanel tone={tone}>
              <BrandIcon brand="slack" size="glyph" />
              <span>Post the weekly update in #team</span>
            </GradientBannerPanel>
          )}
          {content === 'text' && <p className="gradient-demo-art-text">{variant}</p>}
        </GradientBanner>
      </div>
      <p className="gradient-demo-foot" aria-live="polite">
        {variant} · {size} · {texture ? 'texture' : 'no texture'}
        {content === 'panel' || content === 'prompt' ? ` · ${tone} panel` : ''}
      </p>
    </section>
  );
}

export function GradientBannerVariants() {
  return (
    <div className="gradient-demo-grid" data-demo="variants">
      {gradientBannerVariantNames.map(variant => (
        <GradientBanner key={variant} variant={variant} size="md">
          <p className="gradient-demo-art-text">{variant}</p>
        </GradientBanner>
      ))}
    </div>
  );
}

export function GradientBannerSizes() {
  return (
    <div className="gradient-demo-grid" data-demo="sizes">
      {gradientBannerSizeNames.map(size => (
        <GradientBanner key={size} size={size} texture={false}>
          <p>{size} · no texture</p>
        </GradientBanner>
      ))}
    </div>
  );
}

const sizedExamples: Record<GradientBannerSize, { variant: GradientBannerVariant; body: ReactNode }> = {
  sm: {
    variant: 'citrus',
    body: (
      <GradientBannerPanel>
        <BrandIcon brand="gmail" size="glyph" />
        <span>Label every invoice email</span>
      </GradientBannerPanel>
    ),
  },
  md: {
    variant: 'lagoon',
    body: (
      <GradientBannerPanel>
        <BrandIcon brand="google-drive" size="glyph" />
        <span>Find the latest pricing sheet</span>
      </GradientBannerPanel>
    ),
  },
  lg: {
    variant: 'mint',
    body: (
      <GradientBannerPanel tone="dark">
        <GradientBannerBadge>Example</GradientBannerBadge>
        <span>How agents work in TulipFarm</span>
      </GradientBannerPanel>
    ),
  },
};

export function GradientBannerSizesInContext() {
  return (
    <div className="gradient-demo-stack" data-demo="sizes-in-context">
      {gradientBannerSizeNames.map(size => (
        <Frame key={size} title={`${size} · ${sizedExamples[size].variant}`}>
          <GradientBanner variant={sizedExamples[size].variant} size={size}>
            {sizedExamples[size].body}
          </GradientBanner>
        </Frame>
      ))}
    </div>
  );
}

export function GradientBannerPanels() {
  return (
    <div className="gradient-demo-grid" data-demo="panels">
      <Frame title="Light panel">
        <GradientBanner variant="cobalt" size="md">
          <GradientBannerPanel>
            <GradientBannerBadge>Working</GradientBannerBadge>
            <span>Qualify new leads</span>
          </GradientBannerPanel>
        </GradientBanner>
      </Frame>
      <Frame title="Dark panel">
        <GradientBanner variant="aurora" size="md">
          <GradientBannerPanel tone="dark">
            <GradientBannerBadge>Example</GradientBannerBadge>
            <span>How agents work in TulipFarm</span>
          </GradientBannerPanel>
        </GradientBanner>
      </Frame>
      <Frame title="Long content">
        <GradientBanner variant="citrus" size="md">
          <GradientBannerPanel>
            <BrandIcon brand="github" size="glyph" />
            <span>
              Investigate this bug across related repositories and summarize_the_failing_checkout_timeout_trace
            </span>
          </GradientBannerPanel>
        </GradientBanner>
      </Frame>
    </div>
  );
}

const progressStates = [
  { label: 'Not started', value: 0, badge: 'Queued' },
  { label: 'Working', value: 37.5, badge: 'Working' },
  { label: 'Done', value: 100, badge: 'Done' },
  { label: 'Out of range', value: 140, badge: 'Clamped to 100' },
];

export function GradientBannerProgressStates() {
  return (
    <div className="gradient-demo-grid" data-demo="progress">
      {progressStates.map(({ label, value, badge }, index) => (
        <Frame key={label} title={`${label} · value ${value}`}>
          <GradientBanner variant={index % 2 ? 'iris' : 'lagoon'} size="md" texture={false}>
            <GradientBannerPanel tone={index === 3 ? 'dark' : 'light'} className="gradient-demo-progress-panel">
              <div className="gradient-demo-progress-head">
                <span>Spring launch email</span>
                <GradientBannerBadge>{badge}</GradientBannerBadge>
              </div>
              <GradientBannerProgress value={value} aria-label={`Spring launch email, ${label.toLowerCase()}`} />
            </GradientBannerPanel>
          </GradientBanner>
        </Frame>
      ))}
    </div>
  );
}

// Sample adapter: integration catalog entries with prompts to try.
const apps = [
  {
    id: 'gmail',
    name: 'Gmail',
    brand: 'gmail',
    prompts: [
      'Draft follow-ups to last week’s leads',
      'Sum up unread mail from customers',
      'Label every invoice email',
    ],
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    brand: 'google-calendar',
    prompts: ['Find 30 minutes with Sam next week', 'What does my Thursday look like?', 'Move my 3 pm call to Friday'],
  },
  {
    id: 'slack',
    name: 'Slack',
    brand: 'slack',
    prompts: ['Post the weekly update in #team', 'Answer questions in #support', 'DM me when a big order lands'],
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    brand: 'google-drive',
    prompts: ['Find the latest pricing sheet', 'Pull the Q3 report into chat', 'Tidy the Clients folder'],
  },
  {
    id: 'github',
    name: 'GitHub team',
    brand: 'github',
    prompts: [
      'Investigate this bug across related repositories',
      'Read this issue using my team integration',
      'Explain this failed Actions run',
    ],
  },
] satisfies { id: string; name: string; brand: Brand; prompts: string[] }[];

const tones = ['aurora', 'citrus', 'lagoon', 'iris', 'mint', 'cobalt'] as const;
const toneStart = (id: string) => [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);

export function GradientBannerPrompts() {
  const [appId, setAppId] = useState('slack');
  const app = apps.find(item => item.id === appId)!;
  const start = toneStart(app.id);
  return (
    <Frame title="Integration sheet">
      <div className="gradient-demo-toolbar gradient-demo-toolbar-inset">
        <label>
          App
          <DocsSelect
            label="App"
            value={appId}
            items={apps.map(item => ({ value: item.id, label: item.name }))}
            onValueChange={setAppId}
          />
        </label>
      </div>
      <section aria-label={`Things to ask with ${app.name}`} className="gradient-demo-prompts">
        <ul tabIndex={0} className="gradient-demo-prompt-list">
          {app.prompts.map((prompt, index) => (
            <li key={prompt}>
              <GradientBanner variant={tones[(start + index) % tones.length]!} size="md">
                <GradientBannerPanel>
                  <BrandIcon brand={app.brand} size="glyph" />
                  <span>{prompt}</span>
                </GradientBannerPanel>
              </GradientBanner>
            </li>
          ))}
        </ul>
      </section>
    </Frame>
  );
}

// Sample adapter: scripted agent runs for the sign-in page.
const agents = [
  {
    id: 'agent-marketing',
    name: 'Marketing agent',
    task: 'Spring launch email',
    steps: [
      'Reading last campaign results',
      'Writing three subject lines',
      'Checking brand voice',
      'Proposing a Tuesday morning send',
    ],
    result: 'Email ready for your approval',
  },
  {
    id: 'leads_agent',
    name: 'Leads agent',
    task: 'Qualify new leads',
    steps: [
      'Enriching company data',
      'Scoring against ideal customer profile',
      'Drafting follow-ups for the best fits',
      'Proposing lead row updates',
    ],
    result: 'Lead shortlist ready for review',
  },
  {
    id: 'agent_engineering',
    name: 'Engineering agent',
    task: 'Fix checkout timeout',
    steps: [
      'Reproducing the timeout',
      'Tracing a slow database query',
      'Drafting a missing index',
      'Preparing the change for review',
    ],
    result: 'Fix ready for review',
  },
];

const ticksPerStep = 4;
const holdTicks = 6;
const work = ticksPerStep * 4;
const run = work + holdTicks;

export function GradientBannerAgentActivity() {
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    setPlaying(!matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setTick(value => value + 1), 700);
    return () => window.clearInterval(id);
  }, [playing]);

  const active = Math.floor(tick / run) % agents.length;
  const agent = agents[active]!;
  const elapsed = tick % run;
  const done = elapsed >= work;
  const current = Math.min(Math.floor(elapsed / ticksPerStep), agent.steps.length);

  return (
    <Frame title="Sign-in page">
      <div className="gradient-demo-toolbar gradient-demo-toolbar-inset">
        <Button variant="outline" size="sm" aria-pressed={!playing} onClick={() => setPlaying(value => !value)}>
          {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          {playing ? 'Pause' : 'Play'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setTick(value => value + 1)}>
          Step
        </Button>
        <span className="gradient-demo-meta">
          {agent.name} · {done ? 'done' : `step ${current + 1} of 4`}
        </span>
      </div>
      <div className="gradient-demo-auth">
        <GradientBanner variant="iris" size="lg" data-demo="agent-activity">
          <div className="gradient-demo-agent">
            <div className="gradient-demo-center">
              <GradientBannerPanel tone="dark">
                <GradientBannerBadge>Example</GradientBannerBadge>
                <span>How agents work in TulipFarm</span>
              </GradientBannerPanel>
            </div>
            <div key={agent.id} className="gradient-demo-agent-card">
              <GradientBannerPanel>
                <div className="gradient-demo-agent-body">
                  <div className="gradient-demo-agent-head">
                    <AgentAvatar agentId={agent.id} name={agent.name} size="lg" />
                    <div className="gradient-demo-agent-copy">
                      <p>{agent.name}</p>
                      <p>{agent.task}</p>
                    </div>
                    <GradientBannerBadge>{done ? 'Done' : 'Working'}</GradientBannerBadge>
                  </div>
                  <GradientBannerProgress
                    value={Math.min((elapsed / work) * 100, 100)}
                    aria-label={`${agent.name} progress`}
                  />
                  <ol className="gradient-demo-steps">
                    {agent.steps.map((step, index) => (
                      <li
                        key={step}
                        data-shown={index <= current || undefined}
                        aria-hidden={index > current || undefined}
                      >
                        {index < current ? (
                          <CheckCircle size={16} aria-hidden="true" />
                        ) : (
                          <Spinner aria-hidden="true" />
                        )}
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="gradient-demo-result" data-shown={done || undefined} aria-hidden={!done || undefined}>
                    <GradientBannerBadge>
                      <CheckCircle size={14} aria-hidden="true" />
                      {agent.result}
                    </GradientBannerBadge>
                  </div>
                </div>
              </GradientBannerPanel>
            </div>
            <div className="gradient-demo-center gradient-demo-roster">
              {agents.map((item, index) => (
                <span key={item.id} data-active={index === active || undefined}>
                  <AgentAvatar agentId={item.id} name={item.name} size="sm" />
                </span>
              ))}
            </div>
          </div>
        </GradientBanner>
      </div>
    </Frame>
  );
}

export function GradientBannerArtOnly() {
  return (
    <div className="gradient-demo-grid" data-demo="art-only">
      <Frame title="Art only · texture">
        <GradientBanner variant="lagoon" size="sm" />
      </Frame>
      <Frame title="Art only · no texture">
        <GradientBanner variant="mint" size="sm" texture={false} />
      </Frame>
    </div>
  );
}
