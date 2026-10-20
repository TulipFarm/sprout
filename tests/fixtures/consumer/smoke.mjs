import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { Sidebar, SidebarProvider } from '@tulipfarm/sprout/sidebar';
import { Alert, AlertDescription } from '@tulipfarm/sprout/alert';
import { EntityAvatar } from '@tulipfarm/sprout/avatar';
import { Badge } from '@tulipfarm/sprout/badge';
import { BrandIcon } from '@tulipfarm/sprout/brand-icon';
import { Button, buttonVariants } from '@tulipfarm/sprout/button';
import { Card, CardContent } from '@tulipfarm/sprout/card';
import { StatePanel } from '@tulipfarm/sprout/state-panel';
import { PageHeader } from '@tulipfarm/sprout/page-header';
import { PageContent } from '@tulipfarm/sprout/page-content';

assert.match(
  renderToString(createElement(Card, { size: 'sm', surface: 'raised' }, createElement(CardContent, {}, 'Packed card'))),
  /data-slot="card"[^>]*data-size="sm"[^>]*data-surface="raised"[\s\S]*Packed card/,
);

assert.match(
  renderToString(createElement(PageContent, {}, 'Packed content')),
  /data-slot="page-content"[^>]*>Packed content/,
);

assert.match(
  renderToString(createElement(PageHeader, { title: 'Packed page' })),
  /data-slot="page-header"[\s\S]*Packed page/,
);

assert.match(
  renderToString(
    createElement(StatePanel, {
      kind: 'empty',
      title: 'Packed state',
      description: 'Packed description',
    }),
  ),
  /data-slot="state-panel"[\s\S]*Packed state/,
);

assert.match(
  renderToString(createElement(SidebarProvider, {}, createElement(Sidebar, {}, 'Packed sidebar'))),
  /Packed sidebar/,
);
assert.match(
  renderToString(createElement(Button, { variant: 'outline' }, 'Packed button')),
  /data-slot="button"[^>]*>Packed button/,
);
assert.match(buttonVariants({ size: 'sm' }), /sprout-button-size-sm/);
assert.match(
  renderToString(createElement(Badge, { variant: 'success' }, 'Packed badge')),
  /data-slot="badge"[^>]*>Packed badge/,
);
assert.match(
  renderToString(createElement(Alert, { variant: 'destructive' }, createElement(AlertDescription, {}, 'Packed alert'))),
  /data-variant="destructive"[\s\S]*Packed alert/,
);
assert.match(
  renderToString(createElement(EntityAvatar, { seed: 'packed', name: 'Packed' })),
  /data-slot="entity-avatar"/,
);
assert.match(
  renderToString(createElement(BrandIcon, { brand: 'slack', size: 'sm' })),
  /data-slot="brand-tile"[\s\S]*data-brand="slack"|data-brand="slack"[\s\S]*data-slot="brand-tile"/,
);
