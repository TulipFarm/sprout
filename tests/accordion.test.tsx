import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  accordionTriggerVariantNames,
} from '../packages/sprout/src/components/accordion.js';
import * as sprout from '../packages/sprout/src/index.js';

function tags(html: string, slot: string) {
  return [...html.matchAll(new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`, 'g'))].map(match => match[0]);
}

function tag(html: string, slot: string) {
  const [first] = tags(html, slot);
  expect(first, slot).toBeTruthy();
  return first!;
}

describe('Accordion', () => {
  it('exports the four parts and both trigger variants Cloud uses', () => {
    expect(sprout.Accordion).toBe(Accordion);
    expect(sprout.AccordionItem).toBe(AccordionItem);
    expect(sprout.AccordionTrigger).toBe(AccordionTrigger);
    expect(sprout.AccordionContent).toBe(AccordionContent);
    expect(accordionTriggerVariantNames).toEqual(['default', 'quiet']);
  });

  it('renders a closed item without a value inside a heading', () => {
    const html = renderToString(
      <Accordion>
        <AccordionItem>
          <AccordionTrigger>Recover a saved proposal</AccordionTrigger>
          <AccordionContent>Recovery never resends an execution.</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    expect(tag(html, 'accordion')).toContain('sprout-accordion');
    expect(tag(html, 'accordion-item')).toContain('sprout-accordion-item');
    expect(tag(html, 'accordion-header')).toMatch(/^<h3/);
    const trigger = tag(html, 'accordion-trigger');
    expect(trigger).toMatch(/^<button/);
    expect(trigger).toContain('aria-expanded="false"');
    expect(trigger).toContain('data-variant="default"');
    expect(trigger).toContain('sprout-accordion-trigger-default');
    expect(tag(html, 'accordion-trigger-icon')).toContain('aria-hidden="true"');
    expect(html).not.toContain('Recovery never resends');
  });

  it('opens defaultValue items in single and multiple modes and disables items', () => {
    for (const multiple of [false, true]) {
      const html = renderToString(
        <Accordion multiple={multiple} defaultValue={['one']}>
          <AccordionItem value="one">
            <AccordionTrigger>What is this example?</AccordionTrigger>
            <AccordionContent>Sample data and local state.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="two">
            <AccordionTrigger>Can I open more than one?</AccordionTrigger>
            <AccordionContent>Yes.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="three" disabled>
            <AccordionTrigger>Disabled item</AccordionTrigger>
            <AccordionContent>Unavailable</AccordionContent>
          </AccordionItem>
        </Accordion>,
      );
      const [first, , third] = tags(html, 'accordion-trigger');
      expect(first).toContain('aria-expanded="true"');
      expect(first).toContain('data-panel-open');
      expect(third).toMatch(/\sdisabled(=""|\s|>)/);
      expect(tags(html, 'accordion-item')[2]).toContain('data-disabled');
      expect(html).toContain('Sample data and local state.');
      expect(html).not.toContain('Unavailable');
      expect(tag(html, 'accordion-content')).toContain('sprout-accordion-content');
    }
  });

  it('honours a controlled value', () => {
    for (const open of [true, false]) {
      const html = renderToString(
        <Accordion value={open ? ['settings'] : []} onValueChange={() => {}}>
          <AccordionItem value="settings">
            <AccordionTrigger>Import settings</AccordionTrigger>
            <AccordionContent>Content to import</AccordionContent>
          </AccordionItem>
        </Accordion>,
      );
      expect(tag(html, 'accordion-trigger')).toContain(`aria-expanded="${open}"`);
      expect(html.includes('Content to import')).toBe(open);
    }
  });

  it('renders quiet triggers with rich children and aria props', () => {
    const html = renderToString(
      <Accordion multiple defaultValue={['sources']}>
        <AccordionItem value="sources">
          <AccordionTrigger
            variant="quiet"
            aria-label="Google calendars"
            aria-describedby="calendar-source-summary"
            className="extra"
          >
            <span className="grid gap-1">
              <span>Google calendars</span>
              <span id="calendar-source-summary">2 of 3 shown</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="inner-extra">
            <a href="/integrations">Manage integrations</a>
          </AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const trigger = tag(html, 'accordion-trigger');
    expect(trigger).toContain('data-variant="quiet"');
    expect(trigger).toContain('sprout-accordion-trigger-quiet');
    expect(trigger).not.toContain('sprout-accordion-trigger-default');
    expect(trigger).toContain('aria-label="Google calendars"');
    expect(trigger).toContain('aria-describedby="calendar-source-summary"');
    expect(trigger).toContain('extra');
    expect(html).toContain('class="sprout-accordion-content-inner inner-extra"');
    expect(html).toContain('2 of 3 shown');
  });

  it('accepts className functions on the root, item, and trigger', () => {
    const html = renderToString(
      <Accordion defaultValue={['a']} className={state => (state.value.length ? 'has-open' : 'none-open')}>
        <AccordionItem value="a" className={state => (state.open ? 'item-open' : 'item-closed')}>
          <AccordionTrigger className={state => (state.open ? 'trigger-open' : '')}>Time zones</AccordionTrigger>
          <AccordionContent>London</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    expect(tag(html, 'accordion')).toContain('sprout-accordion has-open');
    expect(tag(html, 'accordion-item')).toContain('item-open');
    expect(tag(html, 'accordion-trigger')).toContain('trigger-open');
  });
});
