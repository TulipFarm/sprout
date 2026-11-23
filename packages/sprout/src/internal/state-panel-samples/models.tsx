import { CpuIcon } from '../../components/icons.js';
import { BrandIcon } from '../../components/brand-icon.js';
import { SampleList, SampleWindow } from '../../components/state-sample.js';
import { badge, type StatePanelSampleProps } from './shared.js';

export function ModelsSample(props: StatePanelSampleProps) {
  return (
    <SampleWindow {...props} icon={CpuIcon} trail={['Settings', 'Models']}>
      <SampleList
        items={[
          {
            leading: <BrandIcon brand="claude" size="sm" />,
            title: 'Claude',
            detail: 'Default for chat and agents',
            trailing: badge('success', 'Enabled'),
          },
          {
            leading: <BrandIcon brand="openai" size="sm" />,
            title: 'GPT',
            detail: 'Available to the Analytics team',
            trailing: badge('success', 'Enabled'),
          },
          {
            leading: <BrandIcon brand="deepseek" size="sm" />,
            title: 'DeepSeek',
            detail: 'Not available to any team',
            trailing: badge('secondary', 'Off'),
          },
          {
            leading: <BrandIcon brand="kimi" size="sm" />,
            title: 'Kimi',
            detail: 'Not available to any team',
            trailing: badge('secondary', 'Off'),
          },
        ]}
      />
    </SampleWindow>
  );
}
