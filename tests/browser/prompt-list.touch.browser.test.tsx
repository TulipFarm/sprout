import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { PromptList, type PromptListItem } from '../../packages/sprout/src/components/prompt-list.js';

const Dot = () => (
  <svg viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="5" fill="currentColor" />
  </svg>
);

const tasks: PromptListItem[] = [
  {
    id: 'meetings',
    label: "Prepare me for tomorrow's meetings",
    icon: <Dot />,
  },
  {
    id: 'emails',
    label: 'Draft replies to recent customer emails',
    icon: <Dot />,
    brands: [{ brand: 'gmail', name: 'Gmail' }],
  },
  {
    id: 'standup',
    label: 'Write the standup summary',
    icon: <Dot />,
    brands: [
      { brand: 'github', name: 'GitHub' },
      { brand: 'slack', name: 'Slack' },
      { brand: 'google-calendar', name: 'Google Calendar' },
    ],
  },
];

const rows = () => [...document.querySelectorAll('[data-slot="prompt-list-item"]')];

describe('PromptList on a touch screen', () => {
  it('rows grow to 44px for coarse pointers', async () => {
    await page.viewport(390, 844);
    await render(<PromptList title="Start with a task" items={tasks} onSelect={() => {}} />);
    for (const row of rows()) expect(Math.round(row.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  });
});
