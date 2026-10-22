import { useState, type ReactNode } from 'react';
import { ArrowUp } from 'reicon-react/icons/ArrowUp';
import { ModelSelector, type ModelSelectorModel } from '@tulipfarm/sprout/model-selector';
import '../styles/model-selector-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="model-selector-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="model-selector-demo-card-body">{children}</div>
    </section>
  );
}

/** Sample numbers: output tokens per second, a 0–100 eval score, and dollars per million output tokens. */
export const demoModels: ModelSelectorModel[] = [
  {
    id: 'claude-opus',
    label: 'Claude Opus 5.5',
    description: 'Hardest problems',
    brand: 'claude',
    speed: 45,
    quality: 92,
    cost: 75,
  },
  {
    id: 'claude-sonnet',
    label: 'Claude Sonnet 5.5',
    description: 'Everyday work',
    brand: 'claude',
    speed: 80,
    quality: 86,
    cost: 15,
  },
  {
    id: 'gpt',
    label: 'GPT-5.5',
    description: 'Writing and analysis',
    brand: 'openai',
    speed: 70,
    quality: 90,
    cost: 30,
  },
  {
    id: 'grok',
    label: 'Grok 5',
    description: 'Fast answers with live search',
    brand: 'grok',
    speed: 110,
    quality: 84,
    cost: 15,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek V4',
    description: 'Cheap and capable',
    brand: 'deepseek',
    speed: 60,
    quality: 82,
    cost: 1.1,
  },
  {
    id: 'claude-haiku',
    label: 'Claude Haiku 5.5',
    description: 'Quick and light',
    brand: 'claude',
    speed: 160,
    quality: 74,
    cost: 4,
  },
];

export function ModelSelectorPlayground() {
  const [model, setModel] = useState('claude-sonnet');
  const current = demoModels.find(item => item.id === model)!;
  return (
    <Example
      title="In a composer"
      description="Speed, quality, and cost are rated 1 to 5 against the other models in the list."
    >
      <div className="model-selector-demo-composer" data-testid="model-selector-playground">
        <p className="model-selector-demo-placeholder">Ask anything…</p>
        <div className="model-selector-demo-bar">
          <ModelSelector models={demoModels} value={model} onValueChange={setModel} side="top" />
          <span className="model-selector-demo-send" aria-hidden="true">
            <ArrowUp size={16} />
          </span>
        </div>
      </div>
      <p role="status" className="model-selector-demo-status">
        Using <strong>{current.label}</strong>
      </p>
    </Example>
  );
}

const plainModels: ModelSelectorModel[] = [
  { id: 'opus', label: 'Claude Opus 5.5', brand: 'claude', description: 'Hardest problems' },
  { id: 'gpt', label: 'GPT-5.5', brand: 'openai', description: 'Writing and analysis' },
  { id: 'grok', label: 'Grok 5', brand: 'grok', description: 'Live search' },
  { id: 'deepseek', label: 'DeepSeek V4', brand: 'deepseek', description: 'Cheap and capable' },
];

export function ModelSelectorPlain() {
  const [model, setModel] = useState('opus');
  return (
    <Example
      title="Without numbers"
      description="Leave out speed, quality, and cost and the meters go away. Logos and search stay."
    >
      <div data-testid="model-selector-plain">
        <ModelSelector models={plainModels} value={model} onValueChange={setModel} />
      </div>
    </Example>
  );
}

export default function ModelSelectorDemo() {
  return (
    <div id="model-selector-demo" className="model-selector-demo">
      <ModelSelectorPlayground />
      <ModelSelectorPlain />
    </div>
  );
}
