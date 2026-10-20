import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  carouselAlignNames,
  carouselOrientationNames,
  useCarousel,
} from '../packages/sprout/src/components/carousel.js';
import * as sprout from '../packages/sprout/src/index.js';

const steps = ['Plant', 'Water', 'Grow'];

function Steps({ orientation }: { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <Carousel orientation={orientation} aria-label="Growing steps">
      <CarouselContent>
        {steps.map((label, index) => (
          <CarouselItem key={label}>
            {index + 1}. {label}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}

describe('Carousel', () => {
  it('is exported from the package root', () => {
    expect(sprout).toHaveProperty('Carousel', Carousel);
    expect(sprout).toHaveProperty('CarouselContent', CarouselContent);
    expect(sprout).toHaveProperty('CarouselItem', CarouselItem);
    expect(sprout).toHaveProperty('CarouselNext', CarouselNext);
    expect(sprout).toHaveProperty('CarouselPrevious', CarouselPrevious);
    expect(sprout).toHaveProperty('useCarousel', useCarousel);
    expect(carouselOrientationNames).toEqual(['horizontal', 'vertical']);
    expect(carouselAlignNames).toEqual(['start', 'center', 'end']);
  });

  it('renders a named carousel region with slide groups', () => {
    const html = renderToString(<Steps />);
    expect(html).toMatch(
      /^<div role="region" aria-roledescription="carousel" data-slot="carousel" data-orientation="horizontal" class="sprout-carousel" aria-label="Growing steps"/,
    );
    expect(html).toContain('data-slot="carousel-content"');
    expect(html).toContain('class="sprout-carousel-content"');
    expect(html).toContain('data-slot="carousel-track" class="sprout-carousel-track"');
    expect(html.match(/role="group" aria-roledescription="slide"/g)).toHaveLength(3);
    for (const label of steps) expect(html).toContain(label);
  });

  it('renders the vertical orientation on every part', () => {
    const html = renderToString(<Steps orientation="vertical" />);
    expect(html.match(/data-orientation="vertical"/g)!.length).toBe(1 + 1 + 3 + 2);
    expect(html).not.toContain('data-orientation="horizontal"');
  });

  it('renders secondary icon arrows that start turned off but focusable', () => {
    const html = renderToString(<Steps />);
    for (const [slot, label] of [
      ['carousel-previous', 'Previous slide'],
      ['carousel-next', 'Next slide'],
    ]) {
      const button = html.match(new RegExp(`<button[^>]*data-slot="${slot}"[^>]*>`))![0];
      expect(button).toContain(`aria-label="${label}"`);
      expect(button).toContain('data-variant="secondary"');
      expect(button).toContain('data-size="icon"');
      expect(button).toContain('sprout-button-variant-secondary');
      expect(button).toContain('sprout-button-size-icon');
      expect(button).toContain('sprout-carousel-control');
      expect(button).toContain('aria-disabled="true"');
      expect(button).not.toMatch(/\sdisabled=""/);
    }
    expect(html).toContain('sprout-carousel-previous');
    expect(html).toContain('sprout-carousel-next');
    expect(html.match(/<svg[^>]*aria-hidden="true"/g)).toHaveLength(2);
  });

  it('lets arrows take another Button variant, size, label, and icon', () => {
    const html = renderToString(
      <Carousel>
        <CarouselContent />
        <CarouselPrevious variant="outline" size="icon-sm" aria-label="Earlier files" />
        <CarouselNext variant="ghost" size="icon-lg">
          <span>→</span>
        </CarouselNext>
      </Carousel>,
    );
    expect(html).toContain('data-variant="outline"');
    expect(html).toContain('data-size="icon-sm"');
    expect(html).toContain('aria-label="Earlier files"');
    expect(html).toContain('data-variant="ghost"');
    expect(html).toContain('data-size="icon-lg"');
    expect(html).toContain('<span>→</span>');
  });

  it('renders the attachment row composition: align start, drag free, auto slides, custom slot', () => {
    function Arrows() {
      const { canScrollPrev, canScrollNext, scrollPrev, scrollNext } = useCarousel();
      return (
        <span data-prev={String(canScrollPrev)} data-next={String(canScrollNext)}>
          {`${typeof scrollPrev}-${typeof scrollNext}`}
        </span>
      );
    }
    const html = renderToString(
      <Carousel
        data-slot="attachment-group"
        opts={{ align: 'start', dragFree: true }}
        className="group/attachments min-w-0"
        aria-label="Attached files"
      >
        <CarouselContent className="py-1">
          <CarouselItem className="basis-auto">Price list 2026.xlsx</CarouselItem>
          <CarouselItem className="basis-auto">Returns policy.pdf</CarouselItem>
        </CarouselContent>
        <Arrows />
      </Carousel>,
    );
    expect(html).toContain('data-slot="attachment-group"');
    expect(html).not.toContain('data-slot="carousel"');
    expect(html).toContain('class="sprout-carousel group/attachments min-w-0"');
    expect(html).toContain('data-align="start"');
    expect(html).toContain('data-drag-free');
    expect(html).toContain('class="sprout-carousel-track py-1"');
    expect(html).toContain('class="sprout-carousel-item basis-auto"');
    expect(html).toContain('data-prev="false" data-next="false"');
    expect(html).toContain('function-function');
  });

  it('marks center and end alignment and omits drag free by default', () => {
    for (const align of ['center', 'end'] as const) {
      const html = renderToString(
        <Carousel opts={{ align, loop: true }}>
          <CarouselContent />
        </Carousel>,
      );
      expect(html).toContain(`data-align="${align}"`);
      expect(html).not.toContain('data-drag-free');
    }
  });

  it('exposes state and the API through useCarousel', () => {
    let seen: ReturnType<typeof useCarousel> | undefined;
    function Probe() {
      seen = useCarousel();
      return null;
    }
    renderToString(
      <Carousel orientation="vertical" opts={{ loop: true }}>
        <Probe />
      </Carousel>,
    );
    expect(seen!.orientation).toBe('vertical');
    expect(seen!.opts).toEqual({ loop: true });
    expect(seen!.selectedIndex).toBe(0);
    expect(seen!.snapCount).toBe(0);
    for (const method of [
      'scrollPrev',
      'scrollNext',
      'scrollTo',
      'canScrollPrev',
      'canScrollNext',
      'selectedScrollSnap',
      'scrollSnapList',
      'slideNodes',
      'on',
      'off',
    ])
      expect(typeof seen!.api[method as keyof typeof seen.api]).toBe('function');
    expect(seen!.api.scrollSnapList()).toEqual([]);
    expect(seen!.api.canScrollNext()).toBe(false);
    const listener = () => {};
    expect(seen!.api.on('select', listener)).toBe(seen!.api);
    expect(seen!.api.off('select', listener)).toBe(seen!.api);
  });

  it('throws when a part is used outside a carousel', () => {
    expect(() => renderToString(<CarouselItem />)).toThrow('useCarousel must be used within a <Carousel />');
  });
});
