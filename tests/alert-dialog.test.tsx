import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
  alertDialogSizeNames,
} from '../packages/sprout/src/components/alert-dialog.js';
import * as sprout from '../packages/sprout/src/index.js';
import { Button } from '../packages/sprout/src/components/button.js';

function tag(html: string, slot: string) {
  const match = html.match(new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`));
  expect(match, slot).toBeTruthy();
  return match![0];
}

describe('AlertDialog', () => {
  it('lists the sizes Cloud uses and is exported from the package root', () => {
    expect(alertDialogSizeNames).toEqual(['md', 'sm']);
    for (const name of [
      'AlertDialog',
      'AlertDialogAction',
      'AlertDialogCancel',
      'AlertDialogContent',
      'AlertDialogDescription',
      'AlertDialogFooter',
      'AlertDialogHeader',
      'AlertDialogMedia',
      'AlertDialogOverlay',
      'AlertDialogPortal',
      'AlertDialogTitle',
      'AlertDialogTrigger',
    ])
      expect(sprout).toHaveProperty(name);
    expect([AlertDialogOverlay, AlertDialogPortal].every(Boolean)).toBe(true);
  });

  it('renders a destructive Button trigger with dialog semantics and no popup until opened', () => {
    const html = renderToString(
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" />}>Delete sample · sm</AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogTitle>Delete the sample folder?</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const trigger = tag(html, 'alert-dialog-trigger');
    expect(trigger).toMatch(/^<button /);
    expect(trigger).toContain('sprout-button-variant-destructive');
    expect(trigger).toContain('aria-haspopup="dialog"');
    expect(trigger).toContain('aria-expanded="false"');
    expect(html).not.toContain('alert-dialog-content');
  });

  it('renders header, media, and footer parts with className and render', () => {
    const html = renderToString(
      <AlertDialog defaultOpen>
        <AlertDialogHeader className="extra">
          <AlertDialogMedia>
            <svg />
          </AlertDialogMedia>
        </AlertDialogHeader>
        <AlertDialogFooter render={<footer />}>
          <AlertDialogCancel>Keep agent</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Delete saved agent</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>,
    );
    expect(tag(html, 'alert-dialog-header')).toContain('class="sprout-alert-dialog-header extra"');
    expect(tag(html, 'alert-dialog-media')).toContain('class="sprout-alert-dialog-media"');
    const footer = tag(html, 'alert-dialog-footer');
    expect(footer).toMatch(/^<footer /);
    expect(footer).toContain('sprout-alert-dialog-footer');
    const cancel = tag(html, 'alert-dialog-cancel');
    expect(cancel).toMatch(/^<button /);
    expect(cancel).toContain('sprout-button-variant-outline');
    expect(cancel).toContain('sprout-button-size-md');
    const action = tag(html, 'alert-dialog-action');
    expect(action).toContain('sprout-button-variant-destructive');
    expect(html).not.toContain('data-slot="button"');
  });

  it('passes Button state props to the action and close props to cancel', () => {
    const html = renderToString(
      <AlertDialog defaultOpen>
        <AlertDialogCancel disabled variant="ghost" size="sm" className="mine">
          Keep running
        </AlertDialogCancel>
        <AlertDialogAction disabled aria-busy onClick={event => event.preventDefault()}>
          Stopping…
        </AlertDialogAction>
      </AlertDialog>,
    );
    const cancel = tag(html, 'alert-dialog-cancel');
    expect(cancel).toContain('sprout-button-variant-ghost');
    expect(cancel).toContain('sprout-button-size-sm');
    expect(cancel).toContain('mine');
    expect(cancel).toContain('disabled');
    const action = tag(html, 'alert-dialog-action');
    expect(action).toContain('sprout-button-variant-default');
    expect(action).toContain('aria-busy="true"');
    expect(action).toContain('disabled');
  });

  it('accepts every AlertDialogContent prop combination Cloud passes', () => {
    for (const size of [...alertDialogSizeNames, undefined]) {
      expect(() =>
        renderToString(
          <AlertDialog open onOpenChange={() => {}}>
            <AlertDialogContent size={size} finalFocus={() => false} className={state => (state.open ? 'is-open' : '')}>
              <AlertDialogHeader>
                <AlertDialogMedia>
                  <svg />
                </AlertDialogMedia>
                <AlertDialogTitle>Discard team edits?</AlertDialogTitle>
                <AlertDialogDescription>Saved team changes remain.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {}}>Keep editing</AlertDialogCancel>
                <AlertDialogAction variant={size === 'sm' ? 'destructive' : 'default'}>Discard edits</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>,
        ),
      ).not.toThrow();
    }
  });
});
