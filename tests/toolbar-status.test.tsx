import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ToolbarStatus } from '../packages/sprout/src/components/toolbar-status.js';
import { Button } from '../packages/sprout/src/components/button.js';
import * as sprout from '../packages/sprout/src/index.js';

function tag(html: string, slot: string) {
  const match = html.match(new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`));
  expect(match, slot).toBeTruthy();
  return match![0];
}

describe('ToolbarStatus', () => {
  it('is exported from the package root', () => {
    expect(sprout.ToolbarStatus).toBe(ToolbarStatus);
  });

  it('renders a polite status and an outline sm trigger for success', () => {
    const html = renderToString(<ToolbarStatus label="Exported" message="Exported 3 selected rows." />);
    const message = tag(html, 'toolbar-status-message');
    expect(message).toContain('role="status"');
    expect(message).toContain('sprout-toolbar-status-message');
    expect(html).toContain('Exported 3 selected rows.');
    const trigger = tag(html, 'toolbar-status-trigger');
    expect(trigger).toMatch(/^<button /);
    expect(trigger).toContain('sprout-button-variant-outline');
    expect(trigger).toContain('sprout-button-size-sm');
    expect(trigger).toContain('data-status="success"');
    expect(trigger).toContain('aria-expanded="false"');
    expect(trigger).toContain('aria-haspopup="dialog"');
    expect(html).toContain('<span class="sprout-toolbar-status-label">Exported</span>');
    expect(html).not.toContain('toolbar-status-content');
  });

  it('renders an alert and a destructive trigger for errors', () => {
    const html = renderToString(
      <ToolbarStatus error label="Export failed" message="Export failed. Check your connection and try again.">
        <Button variant="outline" size="sm">
          Retry export
        </Button>
      </ToolbarStatus>,
    );
    expect(tag(html, 'toolbar-status-message')).toContain('role="alert"');
    const trigger = tag(html, 'toolbar-status-trigger');
    expect(trigger).toContain('sprout-button-variant-destructive');
    expect(trigger).toContain('sprout-button-size-sm');
    expect(trigger).toContain('data-status="error"');
    expect(html).not.toContain('Retry export');
  });

  it('puts the live message before the trigger so it is outside the popover', () => {
    const html = renderToString(<ToolbarStatus label="Export result" message="Export cancelled." />);
    expect(html.indexOf('toolbar-status-message')).toBeLessThan(html.indexOf('toolbar-status-trigger'));
  });
});
