import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  popoverContentSizeNames,
} from '../packages/sprout/src/components/popover.js';
import { Button } from '../packages/sprout/src/components/button.js';

function tag(html: string, slot: string) {
  const match = html.match(new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`));
  expect(match, slot).toBeTruthy();
  return match![0];
}

describe('Popover', () => {
  it('lists every content size Cloud uses', () => {
    expect(popoverContentSizeNames).toEqual(['default', 'menu', 'picker', 'panel', 'work-list', 'app-actions', 'bud']);
  });

  it('renders a Button trigger with dialog semantics and no popup until opened', () => {
    const html = renderToString(
      <Popover>
        <PopoverTrigger render={<Button variant="secondary" size="icon-xs" aria-label="Source 2" />}>2</PopoverTrigger>
        <PopoverContent>
          <PopoverTitle>Pricing notes</PopoverTitle>
        </PopoverContent>
      </Popover>,
    );
    const trigger = tag(html, 'popover-trigger');
    expect(trigger).toMatch(/^<button /);
    expect(trigger).toContain('sprout-button-variant-secondary');
    expect(trigger).toContain('sprout-button-size-icon-xs');
    expect(trigger).toContain('aria-expanded="false"');
    expect(trigger).toContain('aria-label="Source 2"');
    expect(html).not.toContain('popover-content');
    expect(html).not.toContain('Pricing notes');
  });

  it('renders the destructive status trigger and a plain trigger with a custom class', () => {
    const html = renderToString(
      <>
        <Popover>
          <PopoverTrigger render={<Button variant="destructive" size="sm" />}>Sync failed</PopoverTrigger>
        </Popover>
        <Popover>
          <PopoverTrigger className="calendar-overlap-trigger" data-slot="overlap-trigger" aria-label="3 events">
            3 events
          </PopoverTrigger>
        </Popover>
      </>,
    );
    expect(tag(html, 'popover-trigger')).toContain('sprout-button-variant-destructive');
    const plain = tag(html, 'overlap-trigger');
    expect(plain).toContain('class="calendar-overlap-trigger"');
    expect(plain).toContain('aria-label="3 events"');
  });

  it('disables a hover trigger', () => {
    const html = renderToString(
      <Popover>
        <PopoverTrigger
          openOnHover
          delay={800}
          closeDelay={200}
          disabled
          render={<Button variant="ghost" size="icon" aria-label="GitHub actions" />}
        />
      </Popover>,
    );
    const trigger = tag(html, 'popover-trigger');
    expect(trigger).toContain('disabled');
    expect(trigger).toContain('sprout-button-variant-ghost');
  });

  it('renders header, title, and description with merged classes', () => {
    const html = renderToString(
      <Popover>
        <PopoverHeader className="extra-header">
          <PopoverTitle className={() => 'extra-title'}>Add filter</PopoverTitle>
          <PopoverDescription className="extra-description">Rows must match every rule.</PopoverDescription>
        </PopoverHeader>
      </Popover>,
    );
    expect(tag(html, 'popover-header')).toContain('class="sprout-popover-header extra-header"');
    const title = tag(html, 'popover-title');
    expect(title).toMatch(/^<h2 /);
    expect(title).toContain('sprout-popover-title extra-title');
    const description = tag(html, 'popover-description');
    expect(description).toMatch(/^<p /);
    expect(description).toContain('sprout-popover-description extra-description');
  });

  it('lets callers override data-slot', () => {
    const html = renderToString(
      <Popover>
        <PopoverHeader data-slot="bud-header">
          <PopoverTitle data-slot="bud-title">Bud</PopoverTitle>
        </PopoverHeader>
      </Popover>,
    );
    expect(html).toContain('data-slot="bud-header"');
    expect(html).toContain('data-slot="bud-title"');
    expect(html).not.toContain('data-slot="popover-header"');
  });
});
