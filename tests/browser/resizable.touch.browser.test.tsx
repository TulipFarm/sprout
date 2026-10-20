import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type ResizableLayout,
  type ResizableOrientation,
} from '../../packages/sprout/src/components/resizable.js';

function Split({
  orientation = 'horizontal',
  withHandle = false,
}: {
  orientation?: ResizableOrientation;
  withHandle?: boolean;
}) {
  const [layout, setLayout] = useState<ResizableLayout>({});
  const horizontal = orientation === 'horizontal';
  return (
    <div style={{ padding: 16 }}>
      <div
        data-testid={`${orientation}-frame`}
        style={{
          width: horizontal ? 600 : 300,
          height: horizontal ? 160 : 300,
          border: '1px solid var(--sprout-line)',
        }}
      >
        <ResizablePanelGroup orientation={orientation} onLayoutChange={setLayout}>
          <ResizablePanel id={`${orientation}-a`} defaultSize="40%" minSize="20%" maxSize="80%">
            {horizontal ? 'Runs' : 'Prompt'}
          </ResizablePanel>
          <ResizableHandle withHandle={withHandle} aria-label={`Resize ${orientation} panels`} />
          <ResizablePanel id={`${orientation}-b`}>Details</ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <p data-testid={`${orientation}-sizes`}>
        {Object.values(layout)
          .map(size => `${Math.round(size)}%`)
          .join(' · ')}
      </p>
    </div>
  );
}

const separator = (orientation: ResizableOrientation = 'horizontal') =>
  page.getByRole('separator', { name: `Resize ${orientation} panels` });

describe('Resizable on a touch screen', () => {
  it('coarse pointers widen the hit area to 24px', async () => {
    await render(<Split />);
    const hit = () => getComputedStyle(separator().element(), '::after').width;
    expect(hit()).toBe('24px');
  });
});
