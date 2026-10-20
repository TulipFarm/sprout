import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  ChoiceList,
  ChoiceSummary,
  type ChoiceListLayout,
  type ChoiceListProps,
} from '../../packages/sprout/src/components/choice-list.js';
import { axeViolations, parkPointer, setTheme, settle, themes } from './support.js';

const styles = [
  { id: 'short', label: 'Short answers' },
  { id: 'detailed', label: 'Detailed answers' },
  { id: 'bullets', label: 'Bullet points' },
];
const repos = [
  { id: 'web', label: 'tulipfarm/web (Recommended)' },
  { id: 'api', label: 'tulipfarm/api' },
  { id: 'infra', label: 'tulipfarm/infra' },
];
const channels = Array.from({ length: 12 }, (_, i) => ({
  id: `c${i}`,
  label: i === 0 ? '#product' : i === 1 ? '#support-escalations' : `#team-${i}`,
}));

function List({
  initial = [],
  text,
  ...props
}: Omit<ChoiceListProps, 'value' | 'onChange' | 'textOption'> & {
  initial?: string[];
  text?: { error?: string; active?: boolean };
}) {
  const [value, setValue] = useState(initial);
  const [typed, setTyped] = useState('');
  const [active, setActive] = useState(text?.active ?? false);
  return (
    <ChoiceList
      {...props}
      value={value}
      onChange={next => {
        setValue(next);
        setActive(false);
      }}
      textOption={
        text && {
          value: typed,
          active,
          onChange: setTyped,
          onFocus: () => {
            setActive(true);
            setValue([]);
          },
          error: typed ? null : (text.error ?? null),
        }
      }
    />
  );
}

function Gallery({ layout }: { layout?: ChoiceListLayout }) {
  return (
    <div style={{ display: 'grid', gap: 16, padding: 16, maxWidth: 560 }}>
      <List legend="Reply style" options={styles} initial={['short']} layout={layout} />
      <List legend="Channels" options={channels.slice(0, 5)} initial={['c1']} multiple layout={layout} />
      <List legend="Repository" options={repos} layout="compact" />
      <ChoiceSummary
        prompt="Which repository should the agent change for this request?"
        answer="tulipfarm/infra, with a very long typed answer that must wrap"
      />
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

const rowsOf = (root: Element, layout: string) => [
  ...root.querySelectorAll<HTMLElement>(`[data-layout="${layout}"] .sprout-choice-list-option`),
];

/** Tabs from the top of the page, whatever the previous test left focused. */
async function tabFromStart() {
  const start = document.createElement('button');
  document.body.prepend(start);
  start.focus();
  await userEvent.tab();
  start.remove();
}

/** Moves the pointer off the fixture; earlier files can leave it hovering here. */
describe('ChoiceList in a real browser', () => {
  it.each(themes)('%s %s passes axe and tints the checked row', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Gallery />);
    await parkPointer();
    await settle();
    const checked = screen.container.querySelector('[data-slot="choice-list-option"][data-checked]')!;
    expect(getComputedStyle(checked).backgroundColor).toBe(colorOf('--sprout-primary-subtle'));
    expect(getComputedStyle(checked.querySelector('.sprout-choice-list-mark')!).color).toBe(
      colorOf('--sprout-primary'),
    );
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('stacked rows are 44px+, compact rows 36px+, and checkbox marks are square', async () => {
    const screen = await render(<Gallery />);
    for (const row of rowsOf(screen.container, 'stacked'))
      expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    for (const row of rowsOf(screen.container, 'compact'))
      expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(36);
    const box = screen.container.querySelector('[data-multiple] .sprout-choice-list-mark')!;
    expect(getComputedStyle(box).borderRadius).toBe('4px');
    const marks = [...screen.container.querySelectorAll('[data-layout="compact"] .sprout-choice-list-mark')].map(
      mark => mark.textContent,
    );
    expect(marks).toEqual(['1', '2', '3']);
    await expect
      .element(screen.getByRole('radio', { name: /tulipfarm\/web/ }))
      .toHaveAccessibleName(/^tulipfarm\/web\s?Recommended$/);
  });

  it('a long compact list scrolls', async () => {
    const screen = await render(<List legend="Channels" options={channels} multiple layout="compact" />);
    const list = screen.container.querySelector('.sprout-choice-list-options')!;
    expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
  });

  it('keyboard moves through radios with a row focus ring and toggles checkboxes', async () => {
    const screen = await render(<Gallery />);
    await tabFromStart();
    const short = screen.getByRole('radio', { name: 'Short answers' });
    await expect.element(short).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    const detailed = screen.getByRole('radio', { name: 'Detailed answers' });
    await expect.element(detailed).toHaveFocus();
    await expect.element(detailed).toBeChecked();
    const row = detailed.element().closest('label')!;
    expect(row.getAttribute('data-checked')).toBe('true');
    expect(getComputedStyle(row).outlineStyle).toBe('solid');

    const product = screen.getByRole('checkbox', { name: '#product' });
    await userEvent.tab();
    await expect.element(product).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect.element(product).toBeChecked();
    await userEvent.tab();
    const escalations = screen.getByRole('checkbox', {
      name: '#support-escalations',
    });
    await expect.element(escalations).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect.element(escalations).not.toBeChecked();
  });

  it('the typed answer rings its row, not the textarea, and shows a danger border', async () => {
    const screen = await render(
      <List legend="Repository" options={repos} layout="stacked" text={{ error: 'Enter your answer.' }} />,
    );
    const answer = screen.getByRole('textbox', { name: 'Your answer' });
    await tabFromStart();
    await userEvent.tab();
    await expect.element(answer).toHaveFocus();
    const wrapper = screen.container.querySelector('[data-slot="choice-list-text"]')!;
    expect(getComputedStyle(answer.element()).outlineStyle).toBe('none');
    expect(getComputedStyle(wrapper).outlineStyle).toBe('solid');
    expect(getComputedStyle(wrapper).borderTopColor).toBe(colorOf('--sprout-danger'));
    await expect.element(answer).toHaveAttribute('aria-invalid', 'true');
    await userEvent.keyboard('tulipfarm/infra');
    await expect.element(answer).not.toHaveAttribute('aria-invalid');
    expect(wrapper.getAttribute('data-checked')).toBe('true');
  });

  it('disabled rows fade on the secondary surface', async () => {
    const screen = await render(<List legend="Locked" options={styles} initial={['short']} disabled />);
    const radio = screen.getByRole('radio', { name: 'Short answers' });
    await expect.element(radio).toBeDisabled();
    await expect.element(radio).toBeChecked();
    const row = radio.element().closest('label')!;
    expect(getComputedStyle(row).opacity).toBe('0.5');
    expect(getComputedStyle(row).backgroundColor).toBe(colorOf('--sprout-secondary'));
  });

  it('everything fits a 390px phone and summaries wrap', async () => {
    await page.viewport(390, 900);
    const screen = await render(<Gallery />);
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const node of screen.container.querySelectorAll(
      '.sprout-choice-list-option, .sprout-choice-list-text, .sprout-choice-summary',
    )) {
      expect(node.scrollWidth).toBeLessThanOrEqual(node.clientWidth + 1);
      expect(node.getBoundingClientRect().right).toBeLessThanOrEqual(390);
    }
    const summary = screen.container.querySelector('.sprout-choice-summary')!;
    expect(summary.getBoundingClientRect().height).toBeGreaterThan(30);
  });
});
