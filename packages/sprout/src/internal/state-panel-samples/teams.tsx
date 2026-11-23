import { UsersIcon } from '../../components/icons.js';
import { SampleList, SampleMark, SampleWindow } from '../../components/state-sample.js';
import { type StatePanelSampleProps } from './shared.js';

export function TeamsSample(props: StatePanelSampleProps) {
  return (
    <SampleWindow {...props} icon={UsersIcon} trail={['Settings', 'Teams']}>
      <SampleList
        items={[
          {
            leading: <SampleMark tone="blue" size="md" />,
            title: 'Sales',
            detail: 'Pipeline, quotes, and renewals · 8 members',
          },
          {
            leading: <SampleMark tone="green" size="md" />,
            title: 'Finance',
            detail: 'Invoices and collections · 3 members',
          },
          {
            leading: <SampleMark tone="orange" size="md" />,
            title: 'Support',
            detail: 'Tickets and refunds · 6 members',
          },
          {
            leading: <SampleMark tone="violet" size="md" />,
            title: 'Operations',
            detail: 'Inventory and suppliers · 4 members',
          },
        ]}
      />
    </SampleWindow>
  );
}
