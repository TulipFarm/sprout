import { BranchIcon } from '../../components/icons.js';
import { SampleTable, SampleWindow } from '../../components/state-sample.js';
import { badge, muted, named, type StatePanelSampleProps } from './shared.js';

export function WorkflowsSample(props: StatePanelSampleProps) {
  const active = badge('success', 'Active');
  const draft = badge('secondary', 'Draft');
  return (
    <SampleWindow {...props} icon={BranchIcon} trail={['Workflows']}>
      <SampleTable
        columns={[{ label: 'Workflow', size: 'lg' }, { label: 'Trigger' }, { label: 'Status', size: 'sm' }]}
        rows={[
          [named('green', 'Approve large discounts'), muted('New quote'), active],
          [named('blue', 'Onboard a new customer'), muted('Deal won'), active],
          [named('orange', 'Reorder low stock'), muted('Daily, 8:00'), draft],
          [named('violet', 'Escalate urgent tickets'), muted('New ticket'), active],
          [named('red', 'Chase unsigned contracts'), muted('Weekly, Mon'), draft],
        ]}
      />
    </SampleWindow>
  );
}
