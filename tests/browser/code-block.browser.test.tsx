import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';
import { CodeBlock } from '../../packages/sprout/src/components/code-block.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const python =
  'score = 0\nif lead["replied"]:\n    score += 40\nscore += min(lead["seats"], 50)\nreturn {"score": score}';
const stages = Array.from({ length: 31 }, (_, i) => `{ "stage": ${i + 1}, "name": "Stage ${i + 1}" },`).join('\n');
const curl = `curl -X POST 'https://hooks.example.com/v1/workflows/wf_8c2d1e/trigger?source=docs&retry=3' -H 'Authorization: Bearer $TULIPFARM_WEBHOOK_KEY' -d '{"lead":"northwind"}'`;

const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
/** Replaces `navigator.clipboard` for one test; `afterEach` restores it. */
function stubClipboard(value: Partial<Clipboard> | undefined) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value });
}
afterEach(() => {
  if (original) Object.defineProperty(navigator, 'clipboard', original);
  else delete (navigator as { clipboard?: Clipboard }).clipboard;
});

const highlighted = (node: Element) =>
  expect
    .poll(() => node.closest('[data-slot="code-block"]')!.hasAttribute('data-highlighted'), { timeout: 5000 })
    .toBe(true);

describe('CodeBlock in a real browser', () => {
  it.each(themes)('%s %s passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(
      <div style={{ width: 480 }}>
        <CodeBlock code={python} filename="score_lead.py" />
        <CodeBlock code="plain words" language="text" variant="preview" />
      </div>,
    );
    await highlighted(screen.getByRole('region').element());
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('syntax colors follow the theme tokens and plain text stays plain', async () => {
    const screen = await render(
      <>
        <CodeBlock code={python} filename="score_lead.py" data-testid="py" />
        <CodeBlock code="Just notes" lineNumbers={false} data-testid="txt" />
      </>,
    );
    const block = screen.getByTestId('py').element() as HTMLElement;
    await highlighted(block);
    const keyword = block.querySelector('.sprout-syntax-keyword')!;
    const light = getComputedStyle(keyword).color;
    setTheme('neutral', 'dark');
    expect(getComputedStyle(keyword).color).not.toBe(light);
    const plain = screen.getByTestId('txt').element();
    expect(plain.querySelectorAll('pre code span')).toHaveLength(0);
    expect(plain.querySelector('.sprout-code-block-gutter')).toBeNull();
  });

  it('copy works from the keyboard, keeps focus and announces', async () => {
    const written: string[] = [];
    stubClipboard({ writeText: async text => void written.push(text) });
    const screen = await render(<CodeBlock code={python} filename="score_lead.py" />);
    const button = screen.getByRole('button', { name: 'Copy score_lead.py' });
    (button.element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(button).toHaveTextContent('Copied');
    await expect.element(button).toHaveFocus();
    await expect.element(screen.getByRole('status')).toHaveTextContent('Code copied to clipboard.');
    expect(written).toEqual([python]);
  });

  it('a blocked clipboard shows an alert that fades in, and retry stays possible', async () => {
    stubClipboard({
      writeText: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
    });
    const screen = await render(<CodeBlock code={python} filename="lead-score.ts" />);
    const button = screen.getByRole('button', { name: 'Copy lead-score.ts' });
    await button.click();
    const alert = screen.getByRole('alert');
    await expect
      .element(alert)
      .toHaveTextContent('Clipboard unavailable. Select the code to copy it, or try Copy again.');
    await expect.element(button).toHaveTextContent('Copy');
    await expect.element(button).toBeEnabled();
    const probe = document.createElement('span');
    probe.style.color = 'var(--sprout-danger)';
    document.body.append(probe);
    expect(getComputedStyle(alert.element()).color).toBe(getComputedStyle(probe).color);
    probe.remove();
    expect(getComputedStyle(alert.element()).animationName).toBe('sprout-code-block-in');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(alert.element()).animationName).toBe('none');
  });

  it('a missing clipboard API reports an error', async () => {
    stubClipboard(undefined);
    const screen = await render(<CodeBlock code={curl} filename="curl" />);
    await screen.getByRole('button', { name: 'Copy curl' }).click();
    await expect.element(screen.getByRole('alert')).toBeVisible();
  });

  it('inline regions cap their height, show focus and scroll with the keyboard', async () => {
    const screen = await render(<CodeBlock code={stages} language="json" filename="Funnel stages" />);
    const region = screen.getByRole('region', { name: 'Funnel stages' });
    const el = region.element() as HTMLElement;
    expect(getComputedStyle(el).maxHeight).toBe('384px');
    await userEvent.tab();
    await userEvent.tab();
    await expect.element(region).toHaveFocus();
    expect(getComputedStyle(el).outlineStyle).toBe('solid');
    await userEvent.keyboard('{PageDown}');
    await expect.poll(() => el.scrollTop).toBeGreaterThan(0);
    const gutter = el.querySelector('.sprout-code-block-gutter')!;
    expect(gutter.getAttribute('aria-hidden')).toBe('true');
    expect(gutter.textContent).toContain('31');
  });

  it('long lines scroll sideways on a phone without widening the page', async () => {
    await page.viewport(390, 844);
    const screen = await render(
      <div style={{ padding: 16 }}>
        <CodeBlock code={curl} language="bash" filename="curl example" lineNumbers={false} />
      </div>,
    );
    const region = screen.getByRole('region', { name: 'curl example' });
    const el = region.element() as HTMLElement;
    expect(getComputedStyle(el.querySelector('pre')!).overflowX).toBe('visible');
    expect(getComputedStyle(el).overflowX).toBe('auto');
    expect(el.scrollWidth).toBeGreaterThan(el.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    el.focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    await expect.poll(() => el.scrollLeft).toBeGreaterThan(0);
    expect(el.querySelector('.sprout-code-block-gutter')).toBeNull();
  });

  it('file variant fills its parent and truncates a long path', async () => {
    const long = 'memory/customers/enterprise/renewal-playbooks/northwind-traders-q4.md';
    const screen = await render(
      <div style={{ height: 300, width: 320, display: 'flex' }}>
        <CodeBlock code="Renewal owner: Priya" filename={long} variant="file" data-testid="file" />
      </div>,
    );
    const block = screen.getByTestId('file').element();
    expect(block.getBoundingClientRect().height).toBeCloseTo(300, 0);
    const label = block.querySelector('.sprout-code-block-label')!;
    expect(getComputedStyle(label).textOverflow).toBe('ellipsis');
    expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
    const header = block.querySelector('.sprout-code-block-header')!;
    expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth + 1);
    expect(block.getBoundingClientRect().right).toBeLessThanOrEqual(321);
  });
});
