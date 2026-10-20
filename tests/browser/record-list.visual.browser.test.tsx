import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Badge } from '../../packages/sprout/src/components/badge.js';
import { Button } from '../../packages/sprout/src/components/button.js';
import { RecordList } from '../../packages/sprout/src/components/record-list.js';
import { setTheme, settle, themes } from './support.js';

const tickets = [
  { id: 'TF-101', title: 'Seed tray leaks in bay 3', status: 'Open', priority: 'High', owner: 'Ana Ruiz', points: 3 },
  {
    id: 'TF-102',
    title: 'Vent motor stops halfway open on cold mornings after the frost alert runs in the north bays',
    status: 'Blocked',
    priority: 'Urgent',
    owner: 'Greenhouse operations, north site',
    points: 13,
  },
  { id: 'TF-103', title: 'Order compost', status: 'Done', priority: 'Low', owner: 'Ben Okafor', points: 1 },
];

it.each(themes)('record-list %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div data-testid="shot" style={{ display: 'grid', width: 720, padding: 16, background: 'var(--sprout-canvas)' }}>
      <RecordList
        label="Tickets"
        items={tickets}
        onItemOpen={() => {}}
        values={ticket => [
          { label: 'ID', value: ticket.id },
          { label: 'Owner', value: ticket.owner },
          { label: 'Points', value: ticket.points },
        ]}
        badges={ticket => (
          <>
            <Badge
              variant={ticket.status === 'Done' ? 'success' : ticket.status === 'Blocked' ? 'destructive' : 'info'}
            >
              {ticket.status}
            </Badge>
            <Badge variant="outline">{ticket.priority}</Badge>
          </>
        )}
        renderActions={ticket => (
          <Button variant="ghost" size="sm" aria-label={`Edit ${ticket.id}`}>
            Edit
          </Button>
        )}
        footer={<p style={{ margin: 0, fontSize: 12, color: 'var(--sprout-muted)' }}>Page 1 of 4</p>}
      />
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`record-list-${theme}-${mode}`);
});
