import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  CanvasPanel,
  CanvasSection,
  CanvasToggle,
  ChatSplit,
  type CanvasTab,
} from '../../packages/sprout/src/components/canvas.js';
import { settle } from './support.js';

const Icon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <rect x="2" y="2" width="12" height="12" fill="currentColor" />
  </svg>
);

const allTabs: CanvasTab[] = [
  { id: 'customers', title: 'Customers', icon: Icon },
  { id: 'calendar', title: 'Calendar events', icon: Icon },
  { id: 'pipeline', title: 'Weekly pipeline', busy: true },
  { id: 'checklist', title: 'Launch checklist', icon: Icon },
];

let layouts = 0;

/** A chat with the canvas beside it, sized like a page's main column. */
function Playground({ width = '100%' }: { width?: number | string }) {
  const [open, setOpen] = useState(true);
  const [tabs, setTabs] = useState(allTabs);
  const [activeId, setActiveId] = useState<string | null>('customers');
  const [layoutId] = useState(() => `canvas-test-${layouts++}`);
  const active = tabs.find(tab => tab.id === activeId);
  return (
    <div style={{ width, height: 560, display: 'flex' }}>
      <ChatSplit
        open={open}
        onOpenChange={setOpen}
        layoutId={layoutId}
        chat={
          <div style={{ padding: 12 }}>
            <CanvasToggle open={open} count={tabs.length} onToggle={() => setOpen(!open)} />
            <p>Here are your customers.</p>
          </div>
        }
        canvas={
          <CanvasPanel
            tabs={tabs}
            activeId={activeId}
            onSelect={setActiveId}
            onCloseTab={id => {
              const next = tabs.filter(tab => tab.id !== id);
              setTabs(next);
              if (id === activeId) setActiveId(next[0]?.id ?? null);
            }}
            onClose={() => setOpen(false)}
          >
            <CanvasSection
              title={active?.title ?? 'Nothing open'}
              meta="Updated 2 minutes ago · 1,284 rows from the production workspace"
              actions={
                <>
                  <Button variant="outline" size="sm">
                    Export
                  </Button>
                  <Button size="sm">Open in sheet</Button>
                </>
              }
            >
              <p>Acme, Globex, and Initech renewed this quarter.</p>
            </CanvasSection>
          </CanvasPanel>
        }
      />
    </div>
  );
}
const css = (node: Element) => getComputedStyle(node);

describe('Canvas on a touch screen', () => {
  it('coarse pointers get wider close buttons with visible icons', async () => {
    await render(<Playground />);
    await settle();
    const close = page.getByRole('button', { name: 'Close Calendar events' }).element();
    expect(close.getBoundingClientRect().width).toBe(32);
    expect(css(close.querySelector('svg')!).opacity).toBe('1');
  });
});
