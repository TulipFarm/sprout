import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as sprout from '../packages/sprout/src/index.js';
import {
  ChatConfirmation,
  chatConfirmationStateNames,
  type ConfirmationState,
} from '../packages/sprout/src/components/chat-confirmation.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const details = [
  { label: 'Action', value: 'Change table schema' },
  { label: 'Effect', value: 'Remove field values' },
  { label: 'Affected rows', value: '128' },
];

const render = (state: ConfirmationState, disabled?: boolean) =>
  renderToString(
    <ChatConfirmation
      title="Remove the Notes field from Supplier deliveries"
      description="Review these changes before approving."
      details={details}
      state={state}
      disabled={disabled}
      onDecision={() => undefined}
    />,
  );

const buttons = (html: string) =>
  html.match(/<button[^>]*>/g)?.filter(tag => !tag.includes('sprout-review-card-trigger')) ?? [];

describe('ChatConfirmation', () => {
  it('is exported from the package root, subpath, and CSS entry', () => {
    expect(sprout.ChatConfirmation).toBe(ChatConfirmation);
    expect(sprout.chatConfirmationStateNames).toBe(chatConfirmationStateNames);
    const manifest = JSON.parse(read('../packages/sprout/package.json'));
    expect(manifest.exports['./chat-confirmation']).toEqual({
      types: './dist/components/chat-confirmation.d.ts',
      import: './dist/components/chat-confirmation.js',
    });
    expect(read('../packages/sprout/src/styles/index.css')).toContain("@import './chat-confirmation.css';");
    expect(read('../apps/docs/src/data/nav.ts')).toMatch(/component\(\s*'Chat Confirmation'/);
  });

  it('lists every Cloud state', () => {
    expect(chatConfirmationStateNames).toEqual([
      'pending',
      'submitting',
      'approved',
      'rejected',
      'expired',
      'cancelled',
      'error',
    ]);
  });

  it('renders a pending card with title, description, rows, and both buttons', () => {
    const html = render({ kind: 'pending' });
    expect(html).toMatch(/^<div[^>]*data-slot="chat-confirmation"/);
    expect(html).toContain('data-state="pending"');
    expect(html).toContain('data-slot="review-card"');
    expect(html).toContain('Remove the Notes field from Supplier deliveries');
    expect(html).toContain('Review these changes before approving.');
    expect(html).toContain('Approval required');
    expect(html).toContain('sprout-badge-warning');
    for (const { label, value } of details) {
      expect(html).toContain(`>${label}</dt>`);
      expect(html).toContain(value);
    }
    expect(html).toContain('Approve action');
    expect(html).toContain('Decline');
    expect(buttons(html).some(tag => tag.includes('disabled'))).toBe(false);
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('role="alert"');
  });

  it('locks both buttons when disabled', () => {
    const tags = buttons(render({ kind: 'pending' }, true));
    expect(tags).toHaveLength(2);
    expect(tags.every(tag => tag.includes('disabled'))).toBe(true);
  });

  it.each(['approve', 'reject'] as const)('disables both buttons and marks %s busy while submitting', decision => {
    const html = render({ kind: 'submitting', decision });
    const tags = buttons(html);
    expect(tags.every(tag => tag.includes('disabled'))).toBe(true);
    const [approve, decline] = tags;
    expect(approve).toContain(`aria-busy="${decision === 'approve'}"`);
    expect(decline).toContain(`aria-busy="${decision === 'reject'}"`);
    expect(html.match(/data-slot="spinner"/g)).toHaveLength(1);
    expect(html).toContain('Approval required');
  });

  it('shows an error alert while keeping the decision buttons', () => {
    const html = render({
      kind: 'error',
      message: 'This fictional approval could not be saved. Try again.',
    });
    expect(html).toContain('role="alert"');
    expect(html).toContain('This fictional approval could not be saved. Try again.');
    expect(html).toContain('Approve action');
    expect(html).toContain('Approval required');
  });

  it.each([
    ['approved', 'Approved', 'info', 'Approval recorded. This does not confirm the action has completed.'],
    ['rejected', 'Declined', 'secondary', 'The proposed action was declined.'],
    ['expired', 'Expired', 'secondary', 'This approval expired. No approval was granted.'],
    ['cancelled', 'Cancelled', 'secondary', 'This approval was cancelled. No approval was granted.'],
  ] as const)('settles %s with its badge and outcome, folded and without actions', (kind, label, variant, outcome) => {
    const html = render({ kind });
    expect(html).toContain(`data-state="${kind}"`);
    expect(html).toContain('data-settled="true"');
    expect(html).not.toContain('data-open');
    expect(html).toContain(`>${label}</`);
    expect(html).toContain(`sprout-badge-${variant}`);
    expect(html).toContain(outcome);
    expect(html).toMatch(/<p tabindex="-1" role="status"/);
    expect(html).not.toContain('Approve action');
  });

  it('names the approve button with approveLabel', () => {
    const html = renderToString(
      <ChatConfirmation
        title="T"
        description="D"
        details={[]}
        state={{ kind: 'submitting', decision: 'approve' }}
        approveLabel="Approve 3 drafts"
        onDecision={() => undefined}
      />,
    );
    const [approve] = buttons(html);
    expect(approve).toContain('aria-busy="true"');
    expect(html).toContain('Approve 3 drafts');
    expect(html).not.toContain('Approve action');
    expect(html.match(/data-slot="spinner"/g)).toHaveLength(1);
  });

  it('passes through className and attributes', () => {
    const html = renderToString(
      <ChatConfirmation
        className="custom"
        id="approval"
        title="T"
        description="D"
        details={[]}
        state={{ kind: 'pending' }}
        onDecision={() => undefined}
      />,
    );
    expect(html).toContain('id="approval"');
    expect(html).toContain('class="sprout-chat-confirmation custom"');
  });
});
