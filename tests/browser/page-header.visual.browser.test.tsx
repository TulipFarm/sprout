import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Badge } from '../../packages/sprout/src/components/badge.js';
import { Button } from '../../packages/sprout/src/components/button.js';
import { PageHeader } from '../../packages/sprout/src/components/page-header.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('page-header %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        gap: 32,
        padding: 16,
        width: 560,
        background: 'var(--sprout-canvas)',
      }}
    >
      <PageHeader
        title="Usage"
        description="Credits used by every workspace this month."
        actions={<Button>New workflow</Button>}
      />
      <PageHeader
        title="Customer accounts"
        back={{ label: 'Back to examples', link: <a href="#examples" /> }}
        parent={{ label: 'Tables', link: <a href="#tables" /> }}
        actions={<Badge>Active</Badge>}
      />
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`page-header-${theme}-${mode}`);
});
