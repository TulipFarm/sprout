import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { ChoiceList, ChoiceSummary } from '../../packages/sprout/src/components/choice-list.js';
import { setTheme, settle, themes } from './support.js';

const styles = [
  { id: 'short', label: 'Short answers' },
  { id: 'detailed', label: 'Detailed answers (Recommended)' },
];

it.each(themes)('choice-list %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        gap: 16,
        padding: 16,
        width: 360,
        background: 'var(--sprout-canvas)',
      }}
    >
      <ChoiceList
        legend="Reply style"
        options={styles}
        value={['short']}
        onChange={() => {}}
        error="Choose a reply style."
      />
      <ChoiceList
        legend="Channels"
        options={[
          { id: 'product', label: '#product' },
          { id: 'incidents', label: '#incidents' },
        ]}
        value={['incidents']}
        onChange={() => {}}
        multiple
        layout="compact"
      />
      <ChoiceList legend="Locked" options={styles} value={['short']} onChange={() => {}} disabled />
      <ChoiceSummary prompt="Which repository?" answer="tulipfarm/api" />
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`choice-list-${theme}-${mode}`);
});
