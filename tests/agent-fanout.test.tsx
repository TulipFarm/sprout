import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as sprout from '../packages/sprout/src/index.js';
import {
  AgentFanout,
  agentFanoutLayoutNames,
  agentFanoutStatusNames,
  type AgentFanoutAgent,
} from '../packages/sprout/src/components/agent-fanout.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const agent = (
  id: string,
  status: AgentFanoutAgent['status'],
  extra: Partial<AgentFanoutAgent> = {},
): AgentFanoutAgent => ({ id, name: id, task: `${id} task`, status, ...extra });

const run = agent('lead', 'running', {
  elapsed: 66_000,
  agents: [
    agent('writer', 'needs-you', { reason: 'Pick a plan name' }),
    agent('coder', 'running', {
      agents: [agent('tester', 'failed', { reason: 'Coupons fail' }), agent('linter', 'done')],
    }),
  ],
});

const live = (html: string) => html.match(/role="status"[^>]*>([^<]*)</)?.[1];

describe('AgentFanout', () => {
  it('is exported from the package root, subpath, CSS entry, and docs nav', () => {
    expect(sprout.AgentFanout).toBe(AgentFanout);
    expect(sprout.agentFanoutStatusNames).toBe(agentFanoutStatusNames);
    const manifest = JSON.parse(read('../packages/sprout/package.json'));
    expect(manifest.exports['./agent-fanout']).toEqual({
      types: './dist/components/agent-fanout.d.ts',
      import: './dist/components/agent-fanout.js',
    });
    expect(read('../packages/sprout/src/styles/index.css')).toContain("@import './agent-fanout.css';");
    expect(read('../apps/docs/src/data/nav.ts')).toMatch(/component\(\s*'Agent Fanout'/);
  });

  it('lists every status and layout', () => {
    expect(agentFanoutStatusNames).toEqual(['queued', 'running', 'needs-you', 'done', 'failed', 'stopped']);
    expect(agentFanoutLayoutNames).toEqual(['auto', 'tree', 'list']);
  });

  it('counts every agent, including the root, in the header and its live status', () => {
    const html = renderToString(<AgentFanout agent={run} />);
    expect(live(html)).toBe('5 agents, 2 running, 1 needs you, 1 failed');
    expect(html).toMatch(/data-slot="agent-fanout-issues"[^>]*data-kind="needs-you"/);
    expect(html).toMatch(/data-slot="agent-fanout-issues"[^>]*data-kind="failed"/);
    const quiet = renderToString(<AgentFanout agent={agent('solo', 'done')} />);
    expect(live(quiet)).toBe('1 agent');
    expect(quiet).not.toContain('running');
    expect(quiet).not.toContain('agent-fanout-issues');
  });

  it('renders a nested list labeled by who started each level', () => {
    const html = renderToString(<AgentFanout agent={run} />);
    expect(html).toContain('aria-label="Started by lead"');
    expect(html).toContain('aria-label="Started by coder"');
    expect(html.match(/data-slot="agent-fanout-card"/g)).toHaveLength(5);
    expect(html).toMatch(/data-agent="tester"[^>]*data-status="failed"/);
    expect(html).toMatch(/aria-label="Started by lead"[^>]*data-layout="row"/);
    expect(html).toMatch(/aria-label="Started by coder"[^>]*data-layout="stack"/);
  });

  it('wires each footer toggle to the list it shows or hides', () => {
    const html = renderToString(<AgentFanout agent={run} defaultCollapsed={['coder']} />);
    const open = html.match(/<button[^>]*aria-expanded="true"[^>]*aria-controls="([^"]+)"[^>]*>/);
    expect(open?.[0]).toContain('aria-label="Hide 2 agents started by lead"');
    expect(html).toContain(`id="${open?.[1]}"`);
    const closed = html.match(/<button[^>]*aria-expanded="false"[^>]*aria-controls="([^"]+)"[^>]*>/);
    expect(closed?.[0]).toContain('aria-label="Show 2 agents started by coder"');
    expect(html).toMatch(new RegExp(`id="${closed?.[1]}"[^>]*hidden`));
    expect(html).toContain('>+2<svg');
  });

  it('formats run time as a machine-readable time', () => {
    const at = (elapsed: number) => renderToString(<AgentFanout agent={agent('a', 'running', { elapsed })} />);
    expect(at(34_400)).toContain('<time dateTime="PT34S" class="sprout-agent-fanout-time">34s</time>');
    expect(at(66_000)).toContain('>1m 06s</time>');
    expect(at(3_720_000)).toContain('>1h 02m</time>');
    expect(renderToString(<AgentFanout agent={agent('a', 'queued')} />)).not.toContain('<time');
  });

  it('names the model from its brand and folds extra tools into a count', () => {
    const html = renderToString(
      <AgentFanout
        agent={agent('a', 'running', {
          brand: 'claude',
          tools: ['slack', 'notion', 'github', 'figma', 'linear'],
        })}
      />,
    );
    expect(html).toContain('sprout-agent-fanout-model">Claude<');
    expect(html).toContain('aria-label="Uses Slack, Notion, GitHub, Figma, Linear"');
    expect(html.match(/data-brand="(slack|notion|github|figma|linear)"/g)).toHaveLength(3);
    expect(html).toContain('>+<!-- -->2</span>');
    const named = renderToString(<AgentFanout agent={agent('a', 'done', { brand: 'claude', model: 'Opus 5.5' })} />);
    expect(named).toContain('sprout-agent-fanout-model">Opus 5.5<');
  });

  it('draws no lines and stays still until the client has measured', () => {
    const html = renderToString(<AgentFanout agent={run} />);
    expect(html).not.toContain('data-live');
    expect(html).not.toContain('agent-fanout-wires');
  });

  it('keeps motion behind reduced-motion and colors on tokens', () => {
    const css = read('../packages/sprout/src/styles/agent-fanout.css');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    const [still, moving] = css.split('@media (prefers-reduced-motion: no-preference)');
    expect(still).not.toMatch(/\b(animation|transition):/);
    expect(moving).toContain('@starting-style');
    expect(moving).toContain('[data-live]');
  });
});
