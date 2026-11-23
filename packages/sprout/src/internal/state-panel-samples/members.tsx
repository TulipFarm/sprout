import { UserIcon } from '../../components/icons.js';
import { SampleTable, SampleWindow } from '../../components/state-sample.js';
import { badge, muted, named, type StatePanelSampleProps } from './shared.js';

export function MembersSample(props: StatePanelSampleProps) {
  const admin = badge('info', 'Admin');
  const member = badge('secondary', 'Member');
  return (
    <SampleWindow {...props} icon={UserIcon} trail={['Settings', 'Members']}>
      <SampleTable
        columns={[{ label: 'Member', size: 'lg' }, { label: 'Role', size: 'sm' }, { label: 'Teams' }]}
        rows={[
          [named('violet', 'Maya Chen'), admin, muted('Operations')],
          [named('orange', 'Leo Martins'), member, muted('Sales, Support')],
          [named('green', 'Priya Nair'), member, muted('Finance')],
          [named('blue', 'Sam Okafor'), member, muted('Support')],
          [named('red', 'Ines Duarte'), admin, muted('Operations')],
        ]}
      />
    </SampleWindow>
  );
}
