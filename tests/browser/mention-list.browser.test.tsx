import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';
import {
  MentionGroup,
  MentionList,
  MentionOption,
  MentionStatus,
} from '../../packages/sprout/src/components/mention-list.js';
import { axeViolations, emulate, setTheme, settle, themes } from './support.js';

const File = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <rect x="3" y="2" width="10" height="12" fill="none" stroke="currentColor" />
  </svg>
);

const files = [
  'Q3 revenue forecast.xlsx',
  'Storefront hero.png',
  'Retro notes',
  'Customer interviews — spring cohort, all regions, with follow-up notes.docx',
  'Board deck — Q3 review',
  'Revenue model.pdf',
  'Launch brief.pdf',
  'Roadmap 2026',
  'Hiring plan',
  'Vendor list',
];

/** A minimal composer: the textarea keeps focus and owns the arrow keys. */
function Composer({ onRetry, count = files.length }: { onRetry?: () => void; count?: number }) {
  const shown = files.slice(0, count);
  const [active, setActive] = useState(0);
  const [added, setAdded] = useState<string[]>([]);
  const add = (name: string) => setAdded(list => [...list, name]);
  return (
    <div style={{ display: 'grid', gap: 8, padding: 16, maxWidth: 420 }}>
      <MentionList
        id="files"
        label="Files you can add"
        announcement={`${shown.length} files you can add.`}
        status={
          <>
            <MentionStatus tone="empty">No Drive files match “re”.</MentionStatus>
            <MentionStatus tone="error" action={onRetry && { label: 'Retry search', onAction: onRetry }}>
              Couldn’t search Files.
            </MentionStatus>
          </>
        }
      >
        <MentionGroup label="Files">
          {shown.slice(0, 4).map((name, index) => (
            <MentionOption
              key={name}
              id={`file-${index}`}
              active={active === index}
              media={<File />}
              title={name}
              description="48 KB"
              onSelect={() => add(name)}
            />
          ))}
        </MentionGroup>
        {shown.length > 4 && (
          <MentionGroup label="Google Drive">
            {shown.slice(4).map((name, index) => (
              <MentionOption
                key={name}
                id={`file-${index + 4}`}
                active={active === index + 4}
                title={name}
                onSelect={() => add(name)}
              />
            ))}
          </MentionGroup>
        )}
      </MentionList>
      <textarea
        aria-label="Message with file mentions"
        aria-controls="files"
        aria-activedescendant={`file-${active}`}
        defaultValue="Compare the forecast with @re"
        onKeyDown={event => {
          if (event.key === 'ArrowDown') setActive(i => (i + 1) % shown.length);
          else if (event.key === 'ArrowUp') setActive(i => (i - 1 + shown.length) % shown.length);
          else return;
          event.preventDefault();
        }}
      />
      <p role="group" aria-label="Added files">
        {added.join(', ')}
      </p>
    </div>
  );
}

const box = () => page.getByRole('textbox', { name: 'Message with file mentions' });
const options = () => document.querySelector('[role="listbox"]')!;

describe('MentionList in a real browser', () => {
  it.each(themes)('%s %s passes axe and tones errors apart from empty', async (theme, mode) => {
    setTheme(theme, mode);
    // A short list doesn't scroll, as on the docs page. A scrolling one trips
    // scrollable-region-focusable because focus stays in the textarea.
    const screen = await render(<Composer onRetry={() => {}} count={3} />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
    const tone = (name: string) =>
      getComputedStyle(document.querySelector(`[data-tone="${name}"] .sprout-mention-status-text`)!).color;
    expect(tone('error')).not.toBe(tone('empty'));
  });

  it('the active option scrolls into view inside the capped panel', async () => {
    await render(<Composer />);
    const list = options();
    expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
    (box().element() as HTMLElement).focus();
    for (let step = 0; step < 9; step++) await userEvent.keyboard('{ArrowDown}');
    await expect.element(page.getByRole('option', { name: /Vendor list/ })).toHaveAttribute('aria-selected', 'true');
    await expect.element(page.getByRole('option', { name: /Vendor list/ })).toBeInViewport();
    expect(list.scrollTop).toBeGreaterThan(0);
    await userEvent.keyboard('{ArrowDown}');
    const first = document.getElementById('file-0')!;
    await expect
      .poll(() => first.getBoundingClientRect().top - list.getBoundingClientRect().top)
      .toBeGreaterThanOrEqual(0);
    expect(list.scrollTop).toBeLessThan(first.offsetHeight);
  });

  it('clicking an option or Retry keeps focus in the message', async () => {
    let retried = 0;
    await render(<Composer onRetry={() => retried++} />);
    (box().element() as HTMLElement).focus();
    await page.getByRole('option', { name: /Storefront hero/ }).click();
    await expect.element(box()).toHaveFocus();
    await expect.element(page.getByRole('group', { name: 'Added files' })).toHaveTextContent('Storefront hero.png');
    await page.getByRole('button', { name: 'Retry search' }).click();
    expect(retried).toBe(1);
    await expect.element(box()).toHaveFocus();
  });

  it('long titles truncate and rows meet target sizes', async () => {
    await render(<Composer />);
    const long = [...document.querySelectorAll('.sprout-mention-option-title')].find(node =>
      node.textContent!.startsWith('Customer interviews'),
    )!;
    expect(long.scrollWidth).toBeGreaterThan(long.clientWidth);
    expect(getComputedStyle(long).textOverflow).toBe('ellipsis');
    const option = document.querySelector('[data-slot="mention-option"]')!;
    expect(option.getBoundingClientRect().height).toBeGreaterThanOrEqual(36);
    const status = document.querySelector('[data-slot="mention-status"]')!;
    expect(status.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });

  it('the panel rises in over 120ms and reduced motion removes it', async () => {
    await render(<Composer />);
    const panel = document.querySelector('[data-slot="mention-list"]')!;
    const option = document.querySelector('[data-slot="mention-option"]')!;
    expect(getComputedStyle(panel).animationName).toBe('sprout-mention-list-in');
    expect(getComputedStyle(panel).animationDuration).toBe('0.12s');
    expect(getComputedStyle(option).transitionDuration).toBe('0.12s');
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(panel).animationName).toBe('none');
    expect(getComputedStyle(option).transitionDuration).toBe('0s');
  });
});
