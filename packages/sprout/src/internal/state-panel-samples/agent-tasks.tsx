import { AgentAvatar } from '../../components/agent-avatar.js';
import { TasksIcon } from '../../components/icons.js';
import { SampleList, SampleWindow } from '../../components/state-sample.js';
import { badge, type StatePanelSampleProps } from './shared.js';

const agent = (id: string, name: string) => <AgentAvatar agentId={id} name={name} size="sm" />;

export function AgentTasksSample(props: StatePanelSampleProps) {
  return (
    <SampleWindow {...props} icon={TasksIcon} trail={['My agent tasks']}>
      <SampleList
        items={[
          {
            leading: agent('sample-collections', 'Collections assistant'),
            title: 'Send reminders for invoices past 30 days',
            detail: 'Collections assistant · Started 4m ago',
            trailing: badge('warning', 'Needs review'),
          },
          {
            leading: agent('sample-onboarding', 'Onboarding guide'),
            title: 'Book a kickoff with Contoso',
            detail: 'Onboarding guide · Started 1h ago',
            trailing: badge('success', 'Completed'),
          },
          {
            leading: agent('sample-inventory', 'Inventory watcher'),
            title: 'List products below reorder level',
            detail: 'Inventory watcher · Started today',
            trailing: badge('success', 'Completed'),
          },
          {
            leading: agent('sample-support', 'Support triage'),
            title: 'Tag this week’s billing tickets',
            detail: 'Support triage · Started yesterday',
            trailing: badge('secondary', 'Pending'),
          },
        ]}
      />
    </SampleWindow>
  );
}
