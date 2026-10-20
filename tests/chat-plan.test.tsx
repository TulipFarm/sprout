import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as sprout from '../packages/sprout/src/index.js';
import { ChatPlan, chatPlanStepStateNames, type ChatPlanStep } from '../packages/sprout/src/components/chat-plan.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const garden: ChatPlanStep[] = [
  {
    id: 'one',
    title: 'Choose a patch',
    detail: 'A sunny place near water.',
    state: 'complete',
  },
  { id: 'two', title: 'Prepare the soil', state: 'running' },
  {
    id: 'three',
    title: 'Order bulbs',
    detail: 'The sample supplier is unavailable.',
    state: 'error',
  },
  { id: 'four', title: 'Plant the bulbs', state: 'pending' },
];

const steps = (html: string) => html.match(/<li[^>]*data-slot="chat-plan-step"[^>]*>[\s\S]*?<\/li>/g) ?? [];

describe('ChatPlan', () => {
  it('is exported from the package root, subpath, CSS entry, and docs nav', () => {
    expect(sprout.ChatPlan).toBe(ChatPlan);
    expect(sprout.chatPlanStepStateNames).toBe(chatPlanStepStateNames);
    const manifest = JSON.parse(read('../packages/sprout/package.json'));
    expect(manifest.exports['./chat-plan']).toEqual({
      types: './dist/components/chat-plan.d.ts',
      import: './dist/components/chat-plan.js',
    });
    expect(read('../packages/sprout/src/styles/index.css')).toContain('@import "./chat-plan.css";');
    expect(read('../apps/docs/src/data/nav.ts')).toMatch(/component\(\s*"Chat Plan"/);
  });

  it('lists every Cloud step state', () => {
    expect(chatPlanStepStateNames).toEqual(['pending', 'running', 'complete', 'error']);
  });

  it('renders a named section with a heading, count, and ordered steps', () => {
    const html = renderToString(<ChatPlan title="Fictional garden plan" steps={garden} />);
    expect(html).toMatch(/^<section[^>]*data-slot="chat-plan"/);
    expect(html).toContain('aria-label="Fictional garden plan"');
    expect(html).toMatch(/<h4[^>]*>Fictional garden plan<\/h4>/);
    expect(html).toContain('1<!-- --> of <!-- -->4<!-- --> complete');
    expect(html).toContain('<ol');
    const items = steps(html);
    expect(items).toHaveLength(4);
    expect(items.map(item => item.match(/data-state="([a-z]+)"/)![1])).toEqual([
      'complete',
      'running',
      'error',
      'pending',
    ]);
  });

  it("shows each state's icon and hidden state text", () => {
    const [complete, running, error, pending] = steps(
      renderToString(<ChatPlan title="Fictional garden plan" steps={garden} />),
    );
    expect(complete).toContain('A sunny place near water.');
    expect(complete).toContain('Complete');
    expect(running).toContain('data-slot="spinner"');
    expect(running).toContain('aria-hidden="true"');
    expect(running).not.toContain('role="status"');
    expect(running).toContain('In progress');
    expect(error).toContain('The sample supplier is unavailable.');
    expect(error).toContain('Failed');
    expect(pending).toContain('Not started');
    expect(pending).not.toContain('sprout-chat-plan-detail');
    for (const item of [complete, error, pending]) expect(item).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it('renders the empty plan', () => {
    const html = renderToString(<ChatPlan title="New plan" steps={[]} />);
    expect(html).toContain('0<!-- --> of <!-- -->0<!-- --> complete');
    expect(html).toContain('No steps have been proposed yet.');
    expect(html).not.toContain('<ol');
  });

  it('forwards section props and merges class names', () => {
    const html = renderToString(
      <ChatPlan title="Launch checklist" steps={garden} id="plan" className="extra" data-test="x" />,
    );
    expect(html).toContain('id="plan"');
    expect(html).toContain('class="sprout-chat-plan extra"');
    expect(html).toContain('data-test="x"');
  });

  it('styles states with theme tokens and respects reduced motion', () => {
    const css = read('../packages/sprout/src/styles/chat-plan.css');
    expect(css).toContain('var(--sprout-success)');
    expect(css).toContain('var(--sprout-danger)');
    expect(css).toContain('var(--sprout-muted)');
    expect(css).toMatch(/prefers-reduced-motion: no-preference[\s\S]*animation/);
  });
});
