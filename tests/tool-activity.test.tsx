import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as sprout from '../packages/sprout/src/index.js';
import {
  ActivityPanel,
  ToolActivity,
  toolActivityStatusNames,
  toolActivityVariantNames,
  type ToolActivityItem,
  type ToolActivityStatus,
} from '../packages/sprout/src/components/tool-activity.js';

const item = (id: string, status: ToolActivityStatus, extra: Partial<ToolActivityItem> = {}): ToolActivityItem => ({
  id,
  label: `Step ${id}`,
  status,
  ...extra,
});

const decode = (html: string) => html.replaceAll('&#x27;', "'").replaceAll('&amp;', '&');

function title(html: string) {
  return decode(html.match(/class="sprout-tool-activity-title"[^>]*>([^<]*)</)?.[1] ?? '');
}

describe('ToolActivity', () => {
  it('is exported from the package root', () => {
    expect(sprout.ToolActivity).toBe(ToolActivity);
    expect(sprout.ActivityPanel).toBe(ActivityPanel);
  });

  it('lists every Cloud status and variant', () => {
    expect(toolActivityStatusNames).toEqual([
      'queued',
      'running',
      'waiting',
      'completed',
      'blocked',
      'failed',
      'cancelled',
      'unknown',
    ]);
    expect(toolActivityVariantNames).toEqual(['collapsible', 'stepper', 'transcript']);
  });

  it('summarizes the collapsible trigger like Cloud', () => {
    expect(title(renderToString(<ToolActivity items={[item('1', 'running')]} />))).toBe('Using 1 tool');
    expect(title(renderToString(<ToolActivity items={[item('1', 'waiting')]} />))).toBe('1 tool waiting');
    expect(title(renderToString(<ToolActivity items={[item('1', 'completed'), item('2', 'failed')]} />))).toBe(
      'Used 2 tools · 1 needs attention',
    );
    expect(
      title(
        renderToString(<ToolActivity items={[item('1', 'blocked'), item('2', 'unknown'), item('3', 'cancelled')]} />),
      ),
    ).toBe('3 tools waiting · 2 need attention');
    expect(title(renderToString(<ToolActivity active items={[item('1', 'completed')]} />))).toBe('Using 1 tool');
  });

  it('opens while pending and closes once settled', () => {
    const pending = renderToString(<ToolActivity items={[item('1', 'queued')]} />);
    expect(pending).toContain('aria-expanded="true"');
    const settled = renderToString(<ToolActivity items={[item('1', 'completed')]} />);
    expect(settled).toContain('aria-expanded="false"');
  });

  it('titles the transcript with activity and attention', () => {
    const tools = [item('1', 'running', { label: 'Searching the web' })];
    expect(title(renderToString(<ToolActivity variant="transcript" items={tools} />))).toBe(
      'Working… Searching the web',
    );
    expect(
      title(renderToString(<ToolActivity variant="transcript" active activityLabel="Reading 3 pages" items={tools} />)),
    ).toBe('Working… Reading 3 pages');
    expect(title(renderToString(<ToolActivity variant="transcript" items={[item('1', 'waiting')]} />))).toBe(
      'Work pending · Waiting for input',
    );
    expect(
      title(
        renderToString(<ToolActivity variant="transcript" items={[item('1', 'completed'), item('2', 'blocked')]} />),
      ),
    ).toBe('Tool activity · 2 tools · Access denied');
    expect(
      title(renderToString(<ToolActivity variant="transcript" items={[item('1', 'failed'), item('2', 'unknown')]} />)),
    ).toBe('Work pending · Outcome unconfirmed');
    expect(title(renderToString(<ToolActivity variant="transcript" items={[item('1', 'cancelled')]} />))).toBe(
      'Tool activity · 1 tool · Work cancelled',
    );
    expect(title(renderToString(<ToolActivity variant="transcript" items={[item('1', 'failed')]} />))).toBe(
      'Tool activity · 1 tool · Some work failed',
    );
    const html = renderToString(<ToolActivity variant="transcript" items={tools} />);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('data-variant="transcript"');
  });

  it('renders the stepper open, oldest first, with no trigger', () => {
    const html = renderToString(
      <ToolActivity variant="stepper" items={[item('new', 'running'), item('old', 'completed')]} />,
    );
    expect(html).not.toContain('sprout-tool-activity-trigger');
    expect(html.indexOf('data-tool-id="old"')).toBeLessThan(html.indexOf('data-tool-id="new"'));
    expect(html.split('data-slot="timeline-connector"').length - 1).toBe(1);
    expect(html).toContain('role="status"');
  });

  it('shows older-load progress, errors, and the sentinel only on the stepper', () => {
    const loading = renderToString(
      <ToolActivity variant="stepper" hasOlder loadingOlder items={[item('1', 'completed')]} />,
    );
    expect(loading).toContain('Loading earlier activity…');
    expect(loading).toContain('sprout-tool-activity-sentinel');
    const failed = renderToString(
      <ToolActivity variant="stepper" hasOlder olderError onRetryOlder={() => {}} items={[item('1', 'completed')]} />,
    );
    expect(failed).toContain('role="alert"');
    expect(decode(failed)).toContain('Earlier activity didn’t load.');
    expect(failed).toContain('Retry loading');
    const plain = renderToString(<ToolActivity hasOlder loadingOlder olderError items={[item('1', 'completed')]} />);
    expect(plain).not.toContain('Loading earlier activity');
    expect(plain).not.toContain('sentinel');
  });

  it('handles empty items', () => {
    expect(renderToString(<ToolActivity items={[]} />)).toBe('');
    expect(renderToString(<ToolActivity variant="stepper" active items={[]} />)).toBe('');
    expect(renderToString(<ToolActivity variant="transcript" items={[]} />)).toBe('');
    const thinking = renderToString(<ToolActivity variant="transcript" active items={[]} />);
    expect(thinking).toContain('data-slot="reply-progress"');
    expect(thinking).toContain('Thinking…');
    expect(
      renderToString(<ToolActivity variant="transcript" active activityLabel="Planning the reply" items={[]} />),
    ).toContain('Planning the reply');
  });

  it('speaks each status and marks failed details as danger', () => {
    const html = renderToString(
      <ToolActivity
        items={toolActivityStatusNames.map(status =>
          item(status, status, {
            detail: `${status} detail`,
            details: status === 'failed' ? <button>Retry</button> : undefined,
          }),
        )}
      />,
    );
    for (const text of [
      'Pending',
      'In progress',
      'Waiting',
      'Completed',
      'Access denied',
      'Failed',
      'Cancelled',
      'Outcome unknown',
    ])
      expect(html).toContain(`>${text}<`);
    expect(html).toMatch(/data-tone="danger"[^>]*>failed detail/);
    expect(html).toMatch(/data-tone="danger"[^>]*>blocked detail/);
    expect(html).not.toMatch(/data-tone="danger"[^>]*>completed detail/);
    expect(html).toContain('data-slot="tool-details"');
    expect(html).toContain('<button>Retry</button>');
    expect(html).toContain('aria-label="Tool activity"');
    expect(
      renderToString(<ToolActivity variant="stepper" label="Agent steps" items={[item('1', 'completed')]} />),
    ).toContain('aria-label="Agent steps"');
  });

  it('announces the summary from a live region outside the trigger button', () => {
    for (const html of [
      renderToString(<ToolActivity active items={[item('a', 'running')]} />),
      renderToString(
        <ActivityPanel working activityLabel="Reading">
          <p>Body</p>
        </ActivityPanel>,
      ),
    ]) {
      const button = html.match(/<button[\s\S]*?<\/button>/)?.[0] ?? '';
      expect(button).not.toContain('role="status"');
      expect(html.replace(button, '')).toMatch(
        /role="status" class="sprout-tool-activity-sr-only">(Using 1 tool|Working…)</,
      );
    }
  });

  it('puts a row action on the label line', () => {
    const html = renderToString(
      <ToolActivity
        variant="stepper"
        items={[item('a', 'failed', { action: <button aria-label="Retry">R</button> })]}
      />,
    );
    expect(html).toMatch(
      /class="sprout-tool-activity-head">[\s\S]*data-slot="tool-action"[^>]*><button aria-label="Retry">R<\/button><\/span><\/div>/,
    );
  });

  it('renders web search query and source chips', () => {
    const urls = [
      'https://www.a.test/1',
      'https://b.test/2',
      'https://c.test/3',
      'https://d.test/4',
      'https://e.test/5',
    ];
    const html = decode(
      renderToString(
        <ToolActivity
          variant="stepper"
          items={[
            item('web', 'completed', {
              query: 'services inflation',
              urls,
              failedUrls: ['https://f.test/6', 'https://b.test/2'],
              sources: [{ url: 'https://www.a.test/1', title: ' ONS inflation ' }],
            }),
          ]}
          sourceIcon={url => `data:image/png;base64,${url.length}`}
        />,
      ),
    );
    expect(html).toContain('data-slot="web-search-query"');
    expect(html).toContain('services inflation');
    expect(html).toContain('aria-label="Web sources"');
    expect(html.split('data-slot="source-chip"').length - 1).toBe(4);
    expect(html.match(/data-slot="source-chip"[^>]*data-size="sm"/g)).toHaveLength(4);
    expect(html).toContain('2 more');
    expect(html).toContain('>ONS inflation<');
    expect(html).toContain('>b.test/2<');
    expect(html).toContain('Page unavailable. Retry or paste the text.');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('data:image/png;base64');
    expect(html).toContain('crossorigin="anonymous"');
    expect(html).toContain('referrerPolicy="no-referrer"');
  });

  it('only links http sources', () => {
    const html = renderToString(
      <ToolActivity variant="stepper" items={[item('web', 'completed', { urls: ['javascript:alert(1)'] })]} />,
    );
    expect(html).not.toContain('href=');
    expect(html).toContain('data-slot="source-chip"');
    expect(html).toContain('data-status="failed"');
  });
});

describe('ActivityPanel', () => {
  it('names the region and status', () => {
    const html = decode(
      renderToString(
        <ActivityPanel working activityLabel="Reading invoices" hasResult>
          <ToolActivity variant="stepper" items={[item('1', 'running')]} />
        </ActivityPanel>,
      ),
    );
    expect(html).toContain('aria-label="Chat activity"');
    expect(html).toContain('aria-label="Activity timeline"');
    expect(html).toContain('data-has-result="true"');
    expect(html).toContain('Reading invoices');
    expect(html).toContain('data-slot="activity-viewport"');
  });

  it('reads Worked when idle', () => {
    const html = renderToString(
      <ActivityPanel working={false}>
        <ToolActivity variant="stepper" items={[item('1', 'completed')]} />
      </ActivityPanel>,
    );
    expect(html).not.toContain('data-has-result');
    expect(html).toContain('>Worked<');
    expect(html).toContain('aria-label="Worked"');
  });
});
