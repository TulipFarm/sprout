import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { ToolActivity, type ToolActivityItem } from '../../packages/sprout/src/components/tool-activity.js';

const icon = (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const search: ToolActivityItem[] = [
  {
    id: 'web',
    label: 'Searched the web',
    status: 'completed',
    visual: icon,
    query: 'UK services inflation September 2026',
    urls: [
      'https://www.ons.gov.uk/a',
      'https://www.bankofengland.co.uk/b',
      'https://www.ft.com/c',
      'https://www.bbc.co.uk/d',
      'https://www.reuters.com/markets/e',
    ],
    failedUrls: ['https://example.com/down'],
    sources: [{ url: 'https://www.ons.gov.uk/a', title: 'ONS inflation' }],
  },
  { id: 'read', label: 'Read the brief', status: 'completed', visual: icon },
];

const trigger = () => document.querySelector<HTMLElement>('.sprout-tool-activity-trigger')!;

describe('ToolActivity on a touch screen', () => {
  it('gives touch screens 44px targets', async () => {
    await render(<ToolActivity items={search} variant="transcript" />);
    expect(trigger().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });
});
