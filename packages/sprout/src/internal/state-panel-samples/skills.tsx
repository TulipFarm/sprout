import { BookOpenIcon } from '../../components/icons.js';
import { SampleIconTile, SampleList, SampleWindow } from '../../components/state-sample.js';
import { badge, type StatePanelSampleProps } from './shared.js';

export function SkillsSample(props: StatePanelSampleProps) {
  const skill = <SampleIconTile icon={BookOpenIcon} />;
  return (
    <SampleWindow {...props} icon={BookOpenIcon} trail={['Skills']} tabs={['Workspace', 'Built-in']}>
      <SampleList
        items={[
          {
            leading: skill,
            title: 'Qualify an inbound lead',
            detail: 'Check budget, timeline, and decision maker',
            trailing: badge('success', 'Approved'),
          },
          {
            leading: skill,
            title: 'Prepare a quarterly review',
            detail: 'Pull revenue, churn, and open risks',
            trailing: badge('success', 'Approved'),
          },
          {
            leading: skill,
            title: 'Handle a refund request',
            detail: 'Verify the order, then propose a refund',
            trailing: badge('warning', 'In review'),
          },
          {
            leading: skill,
            title: 'Write a supplier follow-up',
            detail: 'Friendly tone, confirm delivery dates',
            trailing: badge('secondary', 'Draft'),
          },
        ]}
      />
    </SampleWindow>
  );
}
