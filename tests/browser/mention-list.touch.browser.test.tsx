import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import {
  MentionGroup,
  MentionList,
  MentionOption,
  MentionStatus,
} from '../../packages/sprout/src/components/mention-list.js';
import { settle } from './support.js';

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

describe('MentionList on a touch screen', () => {
  it('coarse pointers get 44px rows and the panel fits a phone', async () => {
    await page.viewport(390, 844);
    await render(<Composer onRetry={() => {}} />);
    await settle();
    const option = document.querySelector('[data-slot="mention-option"]')!;
    expect(option.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    const panel = document.querySelector('[data-slot="mention-list"]')!;
    const outer = panel.getBoundingClientRect();
    expect(outer.left).toBeGreaterThanOrEqual(0);
    expect(outer.right).toBeLessThanOrEqual(390.5);
    expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth + 1);
    for (const child of panel.querySelectorAll('*')) {
      const rect = child.getBoundingClientRect();
      if (rect.width) expect(rect.right).toBeLessThanOrEqual(outer.right + 1);
    }
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });
});
