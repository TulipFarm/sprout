import { expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  ViewSwitcher,
  type ViewSwitcherOption,
  type ViewSwitcherView,
} from '../../packages/sprout/src/components/view-switcher.js';
import { setTheme, settle, themes } from './support.js';

const glyph = (path: string) =>
  function Glyph({ size = 16 }: { size?: number }) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d={path} />
      </svg>
    );
  };

const options: ViewSwitcherOption[] = [
  { id: 'table', label: 'Table', icon: glyph('M2 2h12v12H2zM2 6h12M6 2v12'), description: 'Rows and columns.' },
  {
    id: 'list',
    label: 'List',
    icon: glyph('M2 4h12M2 8h12M2 12h12'),
    description: 'One item per row.',
    closable: true,
  },
  {
    id: 'board',
    label: 'Board',
    icon: glyph('M2 2h3v12H2zM7 2h3v8H7zM12 2h2v5h-2z'),
    description: 'Cards in lanes by stage.',
    unavailable: 'Needs a single-select field.',
  },
  { id: 'chart', label: 'Chart', icon: glyph('M3 14V8M8 14V3M13 14v-5'), description: 'Totals by group.' },
  { id: 'timeline', label: 'Timeline', icon: glyph('M2 4h7M5 8h8M3 12h6'), description: 'Rows on dates.' },
];

const views: ViewSwitcherView[] = options
  .filter(option => ['table', 'list', 'chart'].includes(option.id))
  .map(({ description: _description, unavailable: _unavailable, ...view }) => ({ ...view, closable: true }));

function Shot({ width }: { width: number }) {
  return (
    <div data-testid="shot" style={{ width, padding: 16, background: 'var(--sprout-canvas)' }}>
      <ViewSwitcher
        views={views}
        value="list"
        onValueChange={() => {}}
        onClose={() => {}}
        options={options}
        actions={<Button variant="outline">Share</Button>}
      />
    </div>
  );
}

it.each(themes)('view-switcher %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(<Shot width={720} />);
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`view-switcher-${theme}-${mode}`);
  await userEvent.click(page.getByRole('button', { name: 'Add view' }));
  await settle();
  await expect.element(page.getByRole('menu')).toMatchScreenshot(`view-switcher-menu-${theme}-${mode}`);
});

it('view-switcher narrow', async () => {
  await page.viewport(390, 844);
  const screen = await render(<Shot width={358} />);
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot('view-switcher-narrow');
});
