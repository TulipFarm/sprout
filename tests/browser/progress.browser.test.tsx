import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Progress, ProgressLabel, ProgressValue } from '../../packages/sprout/src/components/progress.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

function colorOf(token: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function Bar({ id, value, label = 'Progress' }: { id: string; value: number | null; label?: string }) {
  return (
    <Progress value={value} data-testid={id}>
      <ProgressLabel>{label}</ProgressLabel>
      <ProgressValue />
    </Progress>
  );
}

function States() {
  return (
    <div style={{ display: 'grid', gap: 16, padding: 16, width: 320 }}>
      <Bar id="empty" value={0} />
      <Bar id="partial" value={40} />
      <Bar id="complete" value={100} label="Complete" />
      <Bar id="waiting" value={null} label="Waiting" />
    </div>
  );
}

const part = (id: string, slot: string) =>
  page.getByTestId(id).element().querySelector(`[data-slot="progress-${slot}"]`)!;
const fill = (id: string) =>
  part(id, 'indicator').getBoundingClientRect().width / part(id, 'track').getBoundingClientRect().width;

describe('Progress in a real browser', () => {
  it.each(themes)('%s %s passes axe and fills with the primary color', async (theme, mode) => {
    await emulate({ reducedMotion: true });
    setTheme(theme, mode);
    const screen = await render(<States />);
    await settle();
    expect(getComputedStyle(part('complete', 'indicator')).backgroundColor).toBe(colorOf('--sprout-primary'));
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('fills to the value with the label and value on one row above a 4px track', async () => {
    await emulate({ reducedMotion: true });
    await render(<States />);
    expect(fill('empty')).toBe(0);
    expect(fill('partial')).toBeCloseTo(0.4, 2);
    expect(fill('complete')).toBeCloseTo(1, 2);
    const label = part('partial', 'label').getBoundingClientRect();
    const value = part('partial', 'value').getBoundingClientRect();
    const track = part('partial', 'track').getBoundingClientRect();
    expect(Math.round(label.top)).toBe(Math.round(value.top));
    expect(Math.round(value.right)).toBe(Math.round(track.right));
    expect(Math.round(track.height)).toBe(4);
    expect(Math.round(track.top - label.bottom)).toBe(8);
  });

  it('a new value eases the width over 180ms', async () => {
    const screen = await render(<Bar id="partial" value={40} />);
    const indicator = part('partial', 'indicator');
    expect(getComputedStyle(indicator).transitionProperty).toBe('width');
    expect(getComputedStyle(indicator).transitionDuration).toBe('0.18s');
    await screen.rerender(<Bar id="partial" value={60} />);
    await settle();
    expect(fill('partial')).toBeCloseTo(0.6, 2);
  });

  it('the waiting bar slides, and reduced motion holds it full and faint', async () => {
    await render(<States />);
    const waiting = part('waiting', 'indicator');
    expect(getComputedStyle(waiting).animationName).toBe('sprout-progress-slide');
    expect(getComputedStyle(waiting).animationIterationCount).toBe('infinite');
    expect(fill('waiting')).toBeCloseTo(0.4, 2);
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(waiting).animationName).toBe('none');
    expect(getComputedStyle(waiting).opacity).toBe('0.4');
    expect(fill('waiting')).toBeCloseTo(1, 2);
    expect(getComputedStyle(part('partial', 'indicator')).transitionDuration).toBe('0s');
  });

  it('fits a phone with a long label', async () => {
    await emulate({ reducedMotion: true });
    await page.viewport(320, 640);
    await render(
      <div style={{ padding: 16 }}>
        <Bar id="long" value={36} label="Uploading Team offsite photos – Lisbon 2026 – final selects.zip" />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
    const root = page.getByTestId('long').element();
    expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
  });
});
