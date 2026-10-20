import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { CodeBlock } from '../../packages/sprout/src/components/code-block.js';
import { setTheme, settle, themes } from './support.js';

const python = 'score = 0\nif lead["replied"]:\n    score += 40\nreturn {"score": score}';

it.each(themes)('code-block %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        width: 420,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      <CodeBlock code={python} filename="score_lead.py" />
    </div>,
  );
  await expect
    .poll(() => document.querySelector('[data-slot="code-block"]')!.hasAttribute('data-highlighted'), { timeout: 5000 })
    .toBe(true);
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`code-block-${theme}-${mode}`);
});
