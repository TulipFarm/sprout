import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../packages/sprout/src/components/pagination.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('pagination %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'inline-grid',
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" disabled />
          </PaginationItem>
          {[1, 2, 3].map(n => (
            <PaginationItem key={n}>
              <PaginationLink href="#" isActive={n === 1}>
                {n}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`pagination-${theme}-${mode}`);
});
