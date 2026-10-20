import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as sprout from '../packages/sprout/src/index.js';
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  Toaster,
  createToastManager,
  toast,
  toastTypeNames,
  useToastManager,
} from '../packages/sprout/src/components/toast.js';

function tag(html: string, slot: string) {
  const match = html.match(new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`));
  expect(match, slot).toBeTruthy();
  return match![0];
}

function renderToast(item: Parameters<typeof Toast>[0]['toast'], extra?: ReactNode) {
  return renderToString(
    <ToastProvider toastManager={createToastManager()}>
      <ToastViewport className="viewport-extra">
        <Toast toast={item} className="toast-extra">
          <ToastContent>
            <ToastTitle />
            <ToastDescription />
            <ToastAction />
            {extra}
            <ToastClose />
          </ToastContent>
        </Toast>
      </ToastViewport>
    </ToastProvider>,
  );
}

describe('Toast', () => {
  it('is exported from the package root', () => {
    expect(sprout.Toast).toBe(Toast);
    expect(sprout.ToastAction).toBe(ToastAction);
    expect(sprout.ToastClose).toBe(ToastClose);
    expect(sprout.ToastContent).toBe(ToastContent);
    expect(sprout.ToastDescription).toBe(ToastDescription);
    expect(sprout.ToastPortal).toBe(ToastPortal);
    expect(sprout.ToastProvider).toBe(ToastProvider);
    expect(sprout.ToastTitle).toBe(ToastTitle);
    expect(sprout.ToastViewport).toBe(ToastViewport);
    expect(sprout.Toaster).toBe(Toaster);
    expect(sprout.createToastManager).toBe(createToastManager);
    expect(sprout.toast).toBe(toast);
    expect(sprout.useToastManager).toBe(useToastManager);
  });

  it('lists every type Cloud shows an icon for', () => {
    expect(toastTypeNames).toEqual(['success', 'error', 'warning', 'info', 'loading']);
  });

  it('shares one manager and creates isolated ones on demand', () => {
    for (const method of ['add', 'close', 'update', 'promise'] as const) {
      expect(typeof toast[method]).toBe('function');
    }
    const a = createToastManager();
    const b = createToastManager();
    expect(a).not.toBe(b);
    expect(a).not.toBe(toast);
  });

  it('renders Toaster children on the server without a viewport', () => {
    const html = renderToString(
      <Toaster toastManager={createToastManager()}>
        <button type="button">Save sample</button>
      </Toaster>,
    );
    expect(html).toContain('Save sample');
    expect(html).not.toContain('toast-viewport');
  });

  it('composes the parts with their slots, classes, and labels', () => {
    const html = renderToast({
      id: 'invite',
      title: 'Invite sent',
      description: 'Ana Ruiz can now join the Meadow workspace.',
      type: 'success',
    });
    const viewport = tag(html, 'toast-viewport');
    expect(viewport).toMatch(/class="[^"]*sprout-toast-viewport[^"]*viewport-extra/);
    const root = tag(html, 'toast');
    expect(root).toMatch(/class="[^"]*sprout-toast toast-extra/);
    expect(root).toContain('data-type="success"');
    expect(root).toContain('role="dialog"');
    expect(tag(html, 'toast-content')).toContain('sprout-toast-content');
    expect(tag(html, 'toast-title')).toContain('sprout-toast-title');
    expect(html).toContain('Invite sent');
    expect(tag(html, 'toast-description')).toContain('sprout-toast-description');
    expect(html).toContain('Ana Ruiz can now join the Meadow workspace.');

    const close = tag(html, 'toast-close');
    expect(close).toMatch(/^<button/);
    expect(close).toContain('aria-label="Close toast"');
    expect(close).toContain('sprout-toast-close');
    expect(close).toContain('sprout-button-variant-ghost');
    expect(close).toContain('sprout-button-size-icon-sm');
    expect(html).toMatch(/data-slot="toast-close"[^>]*>.*<svg[^>]*aria-hidden="true"/);
  });

  it('hides the action until the toast has a label', () => {
    expect(renderToast({ id: 'plain', title: 'Draft saved' })).not.toContain('toast-action');
    const html = renderToast({
      id: 'undo',
      title: 'Sample saved',
      description: 'Changes exist only in this example.',
      actionProps: { children: 'Undo' },
    });
    const action = tag(html, 'toast-action');
    expect(action).toMatch(/^<button/);
    expect(action).toContain('sprout-toast-action');
    expect(action).toContain('sprout-button-variant-outline');
    expect(action).toContain('sprout-button-size-sm');
    expect(html).toMatch(/data-slot="toast-action"[^>]*>Undo</);
  });

  it('omits the description when the toast has none', () => {
    const html = renderToast({
      id: 'undone',
      title: 'Sample undone',
      type: 'info',
    });
    expect(html).toContain('Sample undone');
    expect(html).not.toContain('data-slot="toast-description"');
  });

  it('lets a custom list label its own action and swap the close button', () => {
    const html = renderToString(
      <ToastProvider toastManager={createToastManager()}>
        <ToastViewport>
          <Toast toast={{ id: 'file', title: 'harvest-photos.zip', type: 'error' }} swipeDirection="right">
            <ToastContent>
              <ToastTitle />
              <ToastAction>Retry</ToastAction>
              <ToastClose render={<button type="button" className="plain" />}>Dismiss</ToastClose>
            </ToastContent>
          </Toast>
        </ToastViewport>
      </ToastProvider>,
    );
    expect(html).toMatch(/data-slot="toast-action"[^>]*>Retry</);
    const close = tag(html, 'toast-close');
    expect(close).toContain('plain');
    expect(close).not.toContain('sprout-button');
    expect(html).toMatch(/data-slot="toast-close"[^>]*>Dismiss</);
  });
});
