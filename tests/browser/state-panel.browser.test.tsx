import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import { FilesSample, StatePanel, statePanelKindNames } from '../../packages/sprout/src/components/state-panel.js';
import { axeViolations, emulate, setTheme, settle, size, themes } from './support.js';

function Kinds() {
  return (
    <div style={{ display: 'grid', gap: 16, padding: 16 }}>
      {statePanelKindNames.map(kind => (
        <div key={kind} data-testid={kind}>
          {kind === 'error' ? (
            <StatePanel
              kind="error"
              heading="h3"
              title="Could not open this file"
              description="The file moved or you lost access."
            >
              <Button variant="outline">Try again</Button>
            </StatePanel>
          ) : (
            <StatePanel
              kind={kind}
              heading="h3"
              title={`The ${kind} state`}
              description="Something useful to say about it."
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Sampled({ width }: { width: number }) {
  return (
    <div style={{ width }} data-testid="frame">
      <StatePanel
        kind="empty"
        heading="h3"
        title="No files yet"
        description="Upload files to use them in chats."
        sample={<FilesSample />}
      >
        <Button>Upload files</Button>
        <Button variant="outline">Try again</Button>
      </StatePanel>
    </div>
  );
}

function colorOf(token: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

const part = (root: Element, selector: string) => root.querySelector<HTMLElement>(selector)!;

describe('StatePanel in a real browser', () => {
  it.each(themes)('%s %s passes axe in every layout', async (theme, mode) => {
    setTheme(theme, mode);
    await emulate({ reducedMotion: true });
    const screen = await render(
      <>
        <Kinds />
        <Sampled width={900} />
      </>,
    );
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('every kind draws a square media tile and errors use the danger color', async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Kinds />);
    for (const kind of statePanelKindNames) {
      const media = part(screen.getByTestId(kind).element(), '[data-slot="state-panel-media"]');
      const [width, height] = size(media);
      expect(width).toBe(height);
    }
    const warning = part(screen.container, '.sprout-state-panel-danger');
    expect(getComputedStyle(warning).color).toBe(colorOf('--sprout-danger'));
    const description = part(screen.container, '.sprout-state-panel-description');
    expect(getComputedStyle(description).color).toBe(colorOf('--sprout-muted'));
  });

  it('the sample layout responds to its container, not the viewport', async () => {
    await page.viewport(1440, 900);
    await emulate({ reducedMotion: true });
    const screen = await render(<Sampled width={320} />);
    const root = screen.container;
    const preview = part(root, '[data-slot="state-panel-sample"]');
    const actions = part(root, '[data-slot="state-panel-actions"]');
    const card = part(root, '.sprout-state-panel-card');
    const columns = () => getComputedStyle(card).gridTemplateColumns.split(' ').length;

    expect(preview).not.toBeVisible();
    expect(getComputedStyle(actions).flexDirection).toBe('column');

    await screen.rerender(<Sampled width={560} />);
    expect(preview).toBeVisible();
    expect(getComputedStyle(actions).flexDirection).toBe('row');
    expect(columns()).toBe(1);
    expect(getComputedStyle(preview).borderTopWidth).toBe('1px');

    await screen.rerender(<Sampled width={900} />);
    expect(columns()).toBe(2);
    expect(getComputedStyle(preview).borderLeftWidth).toBe('1px');
    expect(getComputedStyle(preview).borderTopWidth).toBe('0px');
  });

  it('keyboard skips the inert sample and shows a focus ring', async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(
      <>
        <button type="button">Before</button>
        <Sampled width={900} />
      </>,
    );
    screen.getByRole('button', { name: 'Before' }).element().focus();
    await userEvent.tab();
    const upload = screen.getByRole('button', { name: 'Upload files' });
    await expect.element(upload).toHaveFocus();
    expect(getComputedStyle(upload.element()).outlineStyle).toBe('solid');
    await userEvent.tab();
    await expect.element(screen.getByRole('button', { name: 'Try again' })).toHaveFocus();
    await userEvent.tab();
    expect(document.activeElement).toBe(document.body);
  });

  it('enters with motion, and reduced motion stops it and the spinner', async () => {
    const screen = await render(<Kinds />);
    const panel = part(screen.getByTestId('loading').element(), '[data-slot="state-panel"]');
    const spinner = part(panel, '[data-slot="spinner"]');
    expect(getComputedStyle(panel).animationName).toBe('sprout-state-panel-in');
    expect(getComputedStyle(panel).animationDuration).toBe('0.18s');
    expect(getComputedStyle(spinner).animationName).toBe('sprout-spinner-spin');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(panel).animationName).toBe('none');
    expect(getComputedStyle(spinner).animationName).toBe('none');
  });

  it('the sample layout fits a 390px phone without horizontal overflow', async () => {
    await page.viewport(390, 900);
    await emulate({ reducedMotion: true });
    await render(
      <>
        <div style={{ padding: 16 }}>
          <StatePanel
            kind="empty"
            heading="h3"
            title="No files yet"
            description="Upload files to use them in chats."
            sample={<FilesSample />}
          >
            <Button>Upload files</Button>
          </StatePanel>
        </div>
      </>,
    );
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });
});
