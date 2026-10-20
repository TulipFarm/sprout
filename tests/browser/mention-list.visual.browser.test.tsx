import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  MentionGroup,
  MentionList,
  MentionOption,
  MentionStatus,
} from '../../packages/sprout/src/components/mention-list.js';
import { setTheme, settle, themes } from './support.js';

const File = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <rect x="3" y="2" width="10" height="12" fill="none" stroke="currentColor" />
  </svg>
);

it.each(themes)('mention-list %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div data-testid="shot" style={{ width: 340, padding: 16, background: 'var(--sprout-canvas)' }}>
      <MentionList
        id="files"
        label="Files you can add"
        status={
          <>
            <MentionStatus tone="loading">Searching Google Drive…</MentionStatus>
            <MentionStatus tone="error" action={{ label: 'Retry', onAction: () => {} }}>
              Couldn’t search Files.
            </MentionStatus>
          </>
        }
      >
        <MentionGroup label="Files">
          <MentionOption
            id="a"
            active
            media={<File />}
            title="Q3 revenue forecast.xlsx"
            description="48 KB"
            onSelect={() => {}}
          />
          <MentionOption
            id="b"
            active={false}
            media={<File />}
            title="Customer interviews — spring cohort, all regions, with follow-up notes.docx"
            description="2.9 MB"
            onSelect={() => {}}
          />
        </MentionGroup>
        <MentionGroup label="Google Drive">
          <MentionOption id="c" active={false} title="Revenue model.pdf" description="PDF" onSelect={() => {}} />
        </MentionGroup>
      </MentionList>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`mention-list-${theme}-${mode}`);
});
