import { FolderIcon } from '../../components/icons.js';
import { SampleList, SampleWindow } from '../../components/state-sample.js';
import { badge, type StatePanelSampleProps } from './shared.js';

export function ProjectsSample(props: StatePanelSampleProps) {
  return (
    <SampleWindow {...props} icon={FolderIcon} trail={['Projects']}>
      <p className="sprout-state-panel-samples-group">Active projects</p>
      <SampleList
        items={[
          {
            title: 'Spring launch',
            detail: 'Use the launch brief for dates and messaging.',
          },
          {
            title: 'Customer onboarding',
            detail: 'Keep kickoff notes and customer setup guides here.',
          },
          {
            title: 'Supplier review',
            detail: 'Compare quotes against our purchasing guidelines.',
          },
        ]}
      />
      <p className="sprout-state-panel-samples-group">Archived projects</p>
      <SampleList
        items={[
          {
            title: 'Summer catalogue',
            detail: 'Use the approved product descriptions.',
            trailing: badge('secondary', 'Archived'),
          },
        ]}
      />
    </SampleWindow>
  );
}
