import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
  type CarouselOrientation,
} from '../../packages/sprout/src/components/carousel.js';
import { emulate } from './support.js';

const steps = ['Plant', 'Water', 'Grow'];

function Position() {
  const { selectedIndex, snapCount } = useCarousel();
  return (
    <p data-testid="position" aria-live="polite">
      Slide {selectedIndex + 1} of {Math.max(snapCount, 1)}
    </p>
  );
}

function Steps({ orientation = 'horizontal' }: { orientation?: CarouselOrientation }) {
  const vertical = orientation === 'vertical';
  const content = (
    <CarouselContent>
      {steps.map((label, index) => (
        <CarouselItem key={label} aria-label={`${index + 1} of 3`}>
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              boxSizing: 'border-box',
              height: 160,
              border: '1px solid var(--sprout-line)',
              borderRadius: 12,
              userSelect: 'none',
            }}
          >
            {index + 1}. {label}
          </div>
        </CarouselItem>
      ))}
    </CarouselContent>
  );
  return (
    <div
      data-testid="frame"
      style={{
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: vertical ? 320 : 480,
        padding: vertical ? '48px 0' : '0 48px',
      }}
    >
      <Carousel orientation={orientation} aria-label={`Growing steps, ${orientation}`}>
        {vertical ? <div style={{ display: 'flex', flexDirection: 'column', height: 160 }}>{content}</div> : content}
        <CarouselPrevious />
        <CarouselNext />
        <Position />
      </Carousel>
    </div>
  );
}
const status = () => page.getByTestId('position');

describe('Carousel on a touch screen', () => {
  it('touch screens get 44px arrows that fit a phone', async () => {
    await emulate({ reducedMotion: true });
    await page.viewport(390, 844);
    await render(
      <div style={{ width: '100%', maxWidth: 390 }}>
        <Steps />
      </div>,
    );
    const next = page.getByRole('button', { name: 'Next slide' });
    const box = next.element().getBoundingClientRect();
    expect([Math.round(box.width), Math.round(box.height)]).toEqual([44, 44]);
    await next.click();
    await expect.element(status()).toHaveTextContent('Slide 2 of 3');
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });
});
