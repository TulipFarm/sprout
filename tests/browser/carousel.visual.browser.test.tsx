import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../../packages/sprout/src/components/carousel.js';
import { emulate, setTheme, settle, themes } from './support.js';

const steps = ['Prepare soil', 'Plant seeds', 'Water daily'];

it.each(themes)('carousel %s %s', async (theme, mode) => {
  await emulate({ reducedMotion: true });
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        boxSizing: 'border-box',
        width: 400,
        padding: '16px 56px',
        background: 'var(--sprout-canvas)',
      }}
    >
      <Carousel aria-label="Growing steps">
        <CarouselContent>
          {steps.map((label, index) => (
            <CarouselItem key={label} aria-label={`${index + 1} of 3`}>
              <div
                style={{
                  boxSizing: 'border-box',
                  display: 'grid',
                  placeItems: 'center',
                  height: 120,
                  border: '1px solid var(--sprout-line)',
                  borderRadius: 12,
                  color: 'var(--sprout-text)',
                }}
              >
                {index + 1}. {label}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`carousel-${theme}-${mode}`);
});
