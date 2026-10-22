import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { TaskTree } from '../../packages/sprout/src/components/task-tree.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('task tree %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div data-testid="shot" style={{ width: 360, padding: 16, background: 'var(--sprout-canvas)' }}>
      <TaskTree
        tasks={[
          { id: 'scaffold', title: 'Scaffolding project', state: 'success', detail: '4s' },
          {
            id: 'build',
            title: 'Building app',
            children: [
              { id: 'web', title: 'Building web', state: 'success' },
              { id: 'api', title: 'Building API', state: 'running', value: 40 },
              { id: 'lint', title: 'Linting', state: 'warning' },
            ],
          },
          {
            id: 'test',
            title: 'Testing',
            state: 'error',
            children: [{ id: 'e2e', title: 'Running e2e', state: 'stopped' }],
          },
          { id: 'docs', title: 'Writing docs', state: 'skipped' },
          { id: 'deploy', title: 'Deploying', state: 'paused' },
          { id: 'notify', title: 'Notifying team' },
        ]}
      />
    </div>,
  );
  await expect.poll(() => screen.container.querySelector('.sprout-task-tree-flow[data-drawn]')).not.toBeNull();
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`task-tree-${theme}-${mode}`);
});
