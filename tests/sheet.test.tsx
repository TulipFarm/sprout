import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createRef, type CSSProperties } from 'react';
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  sheetSideNames,
  sheetSizeNames,
  sheetTitleSizeNames,
} from '../packages/sprout/src/components/sheet.js';
import * as sprout from '../packages/sprout/src/index.js';
import { Button } from '../packages/sprout/src/components/button.js';

function tag(html: string, slot: string) {
  const match = html.match(new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`));
  expect(match, slot).toBeTruthy();
  return match![0];
}

describe('Sheet', () => {
  it('lists every side, size, and title size Cloud uses', () => {
    expect(sheetSideNames).toEqual(['top', 'right', 'bottom', 'left']);
    expect(sheetSizeNames).toEqual(['default', 'lg', 'xl', 'full']);
    expect(sheetTitleSizeNames).toEqual(['default', 'lg']);
  });

  it('is exported from the package root with the eight Cloud parts', () => {
    for (const name of [
      'Sheet',
      'SheetClose',
      'SheetContent',
      'SheetDescription',
      'SheetFooter',
      'SheetHeader',
      'SheetTitle',
      'SheetTrigger',
    ])
      expect(sprout).toHaveProperty(name);
  });

  it('renders Button triggers in the sizes Cloud passes, with dialog semantics', () => {
    const html = renderToString(
      <>
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="sm" />}>Filters (2)</SheetTrigger>
          <SheetContent side="bottom">
            <SheetTitle>Filter and sort</SheetTitle>
          </SheetContent>
        </Sheet>
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="icon-sm" aria-label="Filter and sort" />} />
        </Sheet>
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>View agent</SheetTrigger>
        </Sheet>
      </>,
    );
    const triggers = html.match(/<button[^>]*data-slot="sheet-trigger"[^>]*>/g)!;
    expect(triggers).toHaveLength(3);
    expect(triggers[0]).toContain('sprout-button-size-sm');
    expect(triggers[1]).toContain('sprout-button-size-icon-sm');
    expect(triggers[1]).toContain('aria-label="Filter and sort"');
    expect(triggers[2]).toContain('sprout-button-size-md');
    for (const trigger of triggers) {
      expect(trigger).toContain('sprout-button-variant-outline');
      expect(trigger).toContain('aria-haspopup="dialog"');
      expect(trigger).toContain('aria-expanded="false"');
    }
    expect(html).not.toContain('sheet-content');
  });

  it('renders header, body, and footer parts with render and className', () => {
    const html = renderToString(
      <Sheet defaultOpen>
        <SheetHeader className="sr-only">
          <span>Workspace navigation</span>
        </SheetHeader>
        <SheetBody render={<form id="create-event" />} className="px-4">
          <input aria-label="Title" />
        </SheetBody>
        <SheetFooter>
          <Button>Show results</Button>
          <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
        </SheetFooter>
      </Sheet>,
    );
    expect(tag(html, 'sheet-header')).toContain('class="sprout-sheet-header sr-only"');
    const body = tag(html, 'sheet-body');
    expect(body).toMatch(/^<form /);
    expect(body).toContain('id="create-event"');
    expect(body).toContain('class="sprout-sheet-body px-4"');
    expect(tag(html, 'sheet-footer')).toContain('class="sprout-sheet-footer"');
    expect(tag(html, 'sheet-close')).toContain('sprout-button-variant-outline');
  });

  it('accepts every SheetContent prop combination Cloud passes', () => {
    const title = createRef<HTMLHeadingElement>();
    const trigger = createRef<HTMLButtonElement>();
    for (const side of sheetSideNames) {
      for (const size of sheetSizeNames) {
        for (const titleSize of sheetTitleSizeNames) {
          expect(() =>
            renderToString(
              <Sheet open onOpenChange={() => {}}>
                <SheetContent
                  side={side}
                  size={size}
                  showCloseButton={size !== 'full'}
                  closeLabel="Close panel"
                  keepMounted={size === 'full'}
                  initialFocus={title}
                  finalFocus={size === 'full' ? false : trigger}
                  dir="ltr"
                  data-slot="sidebar"
                  data-mobile="true"
                  style={{ '--sidebar-width': '18rem' } as CSSProperties}
                  className={state => (state.open ? 'is-open' : '')}
                >
                  <SheetHeader>
                    <SheetTitle ref={title} tabIndex={-1} size={titleSize}>
                      Slack
                    </SheetTitle>
                    <SheetDescription>Ask about conversations.</SheetDescription>
                  </SheetHeader>
                </SheetContent>
              </Sheet>,
            ),
          ).not.toThrow();
        }
      }
    }
  });
});
