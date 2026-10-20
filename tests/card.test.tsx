import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardSizeNames,
  cardSurfaceNames,
  cardVariants,
} from '../packages/sprout/src/components/card.js';
import * as sprout from '../packages/sprout/src/index.js';

function tag(html: string, slot: string) {
  const match = html.match(new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`));
  expect(match, slot).not.toBeNull();
  return match![0];
}

describe('Card', () => {
  it('is exported from the package root', () => {
    for (const name of [
      'Card',
      'CardAction',
      'CardContent',
      'CardDescription',
      'CardFooter',
      'CardHeader',
      'CardTitle',
      'cardSizeNames',
      'cardSurfaceNames',
      'cardVariants',
    ]) {
      expect(sprout).toHaveProperty(name);
    }
    expect(cardSizeNames).toEqual(['default', 'sm']);
    expect(cardSurfaceNames).toEqual(['default', 'raised']);
  });

  it('renders a default card with every part and slot', () => {
    const html = renderToString(
      <Card>
        <CardHeader>
          <CardTitle>Meadow project</CardTitle>
          <CardDescription>A fictional garden project</CardDescription>
          <CardAction>Active</CardAction>
        </CardHeader>
        <CardContent>Three tasks are ready to review.</CardContent>
        <CardFooter>Review example</CardFooter>
      </Card>,
    );
    const root = tag(html, 'card');
    expect(root).toMatch(/^<div/);
    expect(root).toContain('class="sprout-card"');
    expect(root).toContain('data-size="default"');
    expect(root).toContain('data-surface="default"');
    expect(root).not.toContain('role=');
    for (const [slot, className] of [
      ['card-header', 'sprout-card-header'],
      ['card-title', 'sprout-card-title'],
      ['card-description', 'sprout-card-description'],
      ['card-action', 'sprout-card-action'],
      ['card-content', 'sprout-card-content'],
      ['card-footer', 'sprout-card-footer'],
    ]) {
      const part = tag(html, slot);
      expect(part).toMatch(/^<div/);
      expect(part).toContain(`class="${className}"`);
    }
    expect(html).toContain('Meadow project');
  });

  it('supports every size and surface combination', () => {
    for (const size of cardSizeNames) {
      for (const surface of cardSurfaceNames) {
        const root = tag(
          renderToString(
            <Card size={size} surface={surface}>
              <CardContent>Body</CardContent>
            </Card>,
          ),
          'card',
        );
        expect(root).toContain(`data-size="${size}"`);
        expect(root).toContain(`data-surface="${surface}"`);
        expect(root.includes('sprout-card-sm')).toBe(size === 'sm');
        expect(root.includes('sprout-card-raised')).toBe(surface === 'raised');
      }
    }
    expect(cardVariants()).toBe('sprout-card');
    expect(cardVariants({ size: 'sm', surface: 'raised', className: 'w-full' })).toBe(
      'sprout-card sprout-card-sm sprout-card-raised w-full',
    );
  });

  it('merges classes, passes props, and swaps elements with render', () => {
    const html = renderToString(
      <Card className="max-w-sm" id="project" aria-label="Meadow project" data-testid="card" render={<article />}>
        <CardHeader className="border-b">
          <CardTitle render={<h3 />}>Meadow project</CardTitle>
        </CardHeader>
        <CardContent className="text-xs">Body</CardContent>
      </Card>,
    );
    const root = tag(html, 'card');
    expect(root).toMatch(/^<article/);
    expect(root).toContain('class="sprout-card max-w-sm"');
    expect(root).toContain('id="project"');
    expect(root).toContain('aria-label="Meadow project"');
    expect(root).toContain('data-testid="card"');
    expect(tag(html, 'card-header')).toContain('class="sprout-card-header border-b"');
    expect(tag(html, 'card-title')).toMatch(/^<h3[^>]*class="sprout-card-title"/);
    expect(tag(html, 'card-content')).toContain('class="sprout-card-content text-xs"');
  });

  it('supports a raised content-only panel and a wrapped footer', () => {
    const raised = renderToString(
      <Card surface="raised">
        <CardContent>Accounts</CardContent>
      </Card>,
    );
    expect(raised).not.toContain('data-slot="card-header"');
    expect(raised).not.toContain('data-slot="card-footer"');
    const wrapped = renderToString(
      <Card size="sm">
        <CardHeader>
          <a href="#task">Draft volunteer rota</a>
        </CardHeader>
        <div className="mt-auto">
          <CardFooter>Reserve time</CardFooter>
        </div>
      </Card>,
    );
    expect(wrapped).toMatch(/<div class="mt-auto"><div[^>]*data-slot="card-footer"/);
  });
});
