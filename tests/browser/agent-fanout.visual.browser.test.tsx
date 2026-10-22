import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { AgentFanout, type AgentFanoutAgent } from '../../packages/sprout/src/components/agent-fanout.js';
import { emulate, setTheme, settle, themes } from './support.js';

const agent = (
  id: string,
  status: AgentFanoutAgent['status'],
  task: string,
  extra: Partial<AgentFanoutAgent> = {},
): AgentFanoutAgent => ({ id, name: id, model: 'Haiku 4.5', brand: 'claude', task, status, ...extra });

const run = agent('Orchestrator', 'running', 'Launch the new pricing page by Friday', {
  model: 'Opus 5.5',
  tools: ['slack', 'notion', 'github'],
  elapsed: 66_000,
  agents: [
    agent('Researcher', 'done', 'Compare the pricing of five competitors', {
      model: 'Sonnet 5.5',
      tools: ['notion', 'slack'],
      elapsed: 34_000,
      agents: [
        agent('Scraper', 'done', 'Pull plan prices', {
          model: 'DeepSeek V4',
          brand: 'deepseek',
          tools: ['google-sheets'],
          elapsed: 9_000,
        }),
        agent('Analyst', 'needs-you', 'Chart where our plans land', { elapsed: 21_000 }),
      ],
    }),
    agent('Builder', 'running', 'Ship the page behind a flag', {
      model: 'GPT-5.5',
      brand: 'openai',
      tools: ['github', 'linear'],
      elapsed: 48_000,
      agents: [
        agent('Tester', 'failed', 'Run the checkout tests', {
          model: 'Grok 5',
          brand: 'grok',
          tools: ['github'],
          elapsed: 12_000,
        }),
        agent('Linter', 'stopped', 'Lint the new routes', { elapsed: 4_000 }),
        agent('Reviewer', 'queued', 'Review the diff'),
      ],
    }),
  ],
});

it.each(themes)('agent-fanout %s %s', async (theme, mode) => {
  await page.viewport(1280, 1100);
  await emulate({ reducedMotion: true });
  setTheme(theme, mode);
  const screen = await render(
    <div data-testid="shot" style={{ width: 760, padding: 16, background: 'var(--sprout-canvas)' }}>
      <AgentFanout agent={run} />
    </div>,
  );
  await expect.poll(() => document.querySelectorAll('.sprout-agent-fanout-wire').length).toBe(7);
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`agent-fanout-${theme}-${mode}`);
});
