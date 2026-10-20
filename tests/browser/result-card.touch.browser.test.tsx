import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { ResultCard, type ResultApp, type ResultCardState } from '../../packages/sprout/src/components/result-card.js';

const apps: ResultApp[] = [
  {
    brand: 'slack',
    name: 'Slack',
    actions: [
      { label: 'Posted the weekly update', state: 'completed' },
      { label: 'Pinned the summary', state: 'unknown' },
    ],
  },
  {
    brand: 'google-slides',
    name: 'Google Slides',
    actions: [
      { label: 'Opened the deck', state: 'completed' },
      { label: 'Added the chart', state: 'completed' },
    ],
  },
  {
    brand: 'github',
    name: 'GitHub',
    actions: [{ label: 'Read open issues', state: 'completed' }],
  },
  {
    brand: 'gmail',
    name: 'Gmail',
    actions: [{ label: 'Drafted the email', state: 'pending' }],
  },
  { brand: 'jira', name: 'Jira', actions: [] },
];

function Workflow({ width = 560, state = 'default' }: { width?: number; state?: ResultCardState }) {
  return (
    <div style={{ width, maxWidth: '100%' }}>
      <ResultCard
        title="Weekly team update"
        kind="Workflow"
        apps={apps}
        status={state === 'default' ? 'Ready' : state}
        state={state}
        action={{ label: 'View slides', onClick: () => undefined }}
      />
    </div>
  );
}

describe('ResultCard on a touch screen', () => {
  it('coarse pointers get a 44px action', async () => {
    const screen = await render(<Workflow />);
    const action = screen.getByRole('button', { name: 'View slides' });
    expect(getComputedStyle(action.element()).height).toBe('44px');
  });
});
