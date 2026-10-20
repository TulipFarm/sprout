import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Badge } from '../../packages/sprout/src/components/badge.js';
import { Button } from '../../packages/sprout/src/components/button.js';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../packages/sprout/src/components/card.js';
import { setTheme, settle, themes } from './support.js';

it.each(themes)('card %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 260px)',
        gap: 16,
        padding: 16,
        width: 'fit-content',
        background: 'var(--sprout-canvas)',
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Meadow project</CardTitle>
          <CardDescription>A fictional garden project</CardDescription>
          <CardAction>
            <Badge variant="success">Active</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>Three tasks are ready to review.</CardContent>
        <CardFooter>
          <Button variant="outline">Review</Button>
        </CardFooter>
      </Card>
      <Card size="sm" surface="raised">
        <CardHeader>
          <CardTitle>Seed order</CardTitle>
          <CardDescription>Due Friday · 4 suppliers</CardDescription>
          <CardAction>
            <Badge variant="warning">Needs input</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>Two suppliers replied with new prices.</CardContent>
        <CardFooter>
          <Button variant="outline" size="sm">
            Compare prices
          </Button>
        </CardFooter>
      </Card>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`card-${theme}-${mode}`);
});
