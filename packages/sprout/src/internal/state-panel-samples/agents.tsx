import { AgentAvatar } from '../../components/agent-avatar.js';
import { UsersIcon } from '../../components/icons.js';
import { SampleList, SampleWindow } from '../../components/state-sample.js';
import { badge, type StatePanelSampleProps } from './shared.js';

const agent = (id: string, name: string) => <AgentAvatar agentId={id} name={name} size="sm" />;

export function AgentsSample(props: StatePanelSampleProps) {
  return (
    <SampleWindow {...props} icon={UsersIcon} trail={['Agents']}>
      <SampleList
        items={[
          {
            leading: agent('sample-collections', 'Collections assistant'),
            title: 'Collections assistant',
            detail: 'Follows up on overdue invoices',
            trailing: badge('success', 'Active'),
          },
          {
            leading: agent('sample-onboarding', 'Onboarding guide'),
            title: 'Onboarding guide',
            detail: 'Welcomes new customers and books kickoffs',
            trailing: badge('success', 'Active'),
          },
          {
            leading: agent('sample-inventory', 'Inventory watcher'),
            title: 'Inventory watcher',
            detail: 'Flags products below reorder level',
            trailing: badge('secondary', 'Draft'),
          },
          {
            leading: agent('sample-support', 'Support triage'),
            title: 'Support triage',
            detail: 'Routes new tickets to the right team',
            trailing: badge('success', 'Active'),
          },
          {
            leading: agent('sample-reports', 'Weekly reporter'),
            title: 'Weekly reporter',
            detail: 'Posts pipeline numbers every Monday',
            trailing: badge('secondary', 'Draft'),
          },
        ]}
      />
    </SampleWindow>
  );
}
