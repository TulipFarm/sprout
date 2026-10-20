import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as sprout from '../packages/sprout/src/index.js';
import {
  ReviewCard,
  ReviewRow,
  ReviewRows,
  ReviewSteps,
  ReviewValues,
  reviewCardBadgeVariantNames,
} from '../packages/sprout/src/components/review-card.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const icon = <svg data-testid="icon" />;

describe('ReviewCard', () => {
  it('is exported from the package root and subpath', () => {
    expect(sprout.ReviewCard).toBe(ReviewCard);
    expect(sprout.ReviewRow).toBe(ReviewRow);
    expect(sprout.ReviewRows).toBe(ReviewRows);
    expect(sprout.ReviewSteps).toBe(ReviewSteps);
    expect(sprout.ReviewValues).toBe(ReviewValues);
    const manifest = JSON.parse(read('../packages/sprout/package.json'));
    expect(manifest.exports['./review-card']).toEqual({
      types: './dist/components/review-card.d.ts',
      import: './dist/components/review-card.js',
    });
    expect(read('../packages/sprout/src/styles/index.css')).toContain("@import './review-card.css';");
  });

  it('lists every Cloud badge variant', () => {
    expect(reviewCardBadgeVariantNames).toEqual([
      'default',
      'success',
      'warning',
      'info',
      'secondary',
      'destructive',
      'outline',
    ]);
  });

  it('renders an open card with header, badge, body, status, and actions', () => {
    const html = renderToString(
      <ReviewCard
        icon={icon}
        title="Update a row in Supplier deliveries"
        badge={{ label: 'Needs approval', variant: 'warning' }}
        label="Review row change"
        status={<p role="status">Waiting</p>}
        actions={<button type="button">Approve change</button>}
      >
        <p>Body copy</p>
      </ReviewCard>,
    );
    expect(html).toMatch(/^<section/);
    expect(html).toContain('data-slot="review-card"');
    expect(html).toContain('data-open="true"');
    expect(html).not.toContain('data-settled');
    expect(html).toContain('aria-label="Review row change"');
    expect(html).not.toContain('aria-labelledby');
    expect(html).toContain('<h4');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('sprout-badge-warning');
    expect(html).toContain('Needs approval');
    expect(html).toContain('Body copy');
    expect(html).toContain('Waiting');
    expect(html).toContain('Approve change');
    expect(html).toContain('data-slot="collapsible-indicator"');
  });

  it('is named by its title when no label is given', () => {
    const html = renderToString(
      <ReviewCard icon={icon} title="Create a table" badge={{ label: 'Ready', variant: 'info' }} />,
    );
    const id = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`id="${id}"`);
    expect(html).not.toContain('sprout-review-card-footer');
  });

  it('folds settled cards, hiding actions but keeping the status', () => {
    const html = renderToString(
      <ReviewCard
        settled
        icon={icon}
        title="Row change"
        badge={{ label: 'Approved', variant: 'success' }}
        status={<p>Row updated.</p>}
        actions={<button type="button">Approve change</button>}
      >
        <p>Body</p>
      </ReviewCard>,
    );
    expect(html).toContain('data-settled="true"');
    expect(html).not.toContain('data-open');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('Row updated.');
    expect(html).not.toContain('Approve change');
  });

  it('renders rows, numbered steps, and exact values', () => {
    const html = renderToString(
      <>
        <ReviewRows>
          <ReviewRow label="Table">Supplier deliveries</ReviewRow>
        </ReviewRows>
        <ReviewSteps
          title="2 steps"
          steps={[
            {
              summary: 'Send a request',
              detail: <ReviewValues values={[{ name: 'content-type', value: 'application/json' }]} />,
            },
            { summary: 'Wait an hour' },
          ]}
        />
      </>,
    );
    expect(html).toContain('<dl data-slot="review-rows"');
    expect(html).toMatch(
      /<dt class="sprout-review-row-label">Table<\/dt><dd class="sprout-review-row-value">Supplier deliveries<\/dd>/,
    );
    expect(html).toContain('<h5');
    expect(html).toContain('2 steps');
    expect(html).toContain('<ol');
    expect(html).toMatch(/aria-hidden="true" class="sprout-review-step-number">2</);
    expect(html).toContain('data-slot="review-values"');
    expect(html).toContain('content-type');
    expect(html).toContain('application/json');
  });

  it('is documented in the agent patterns navigation', () => {
    expect(read('../apps/docs/src/data/nav.ts')).toMatch(/component\(\s*'Review Card'/);
    expect(read('../apps/docs/src/pages/components/review-card.astro')).toContain('ReviewCardPlayground');
  });
});
