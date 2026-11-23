import { PlugIcon } from '../../components/icons.js';
import { BrandIcon } from '../../components/brand-icon.js';
import { SampleList, SampleWindow } from '../../components/state-sample.js';
import { badge, type StatePanelSampleProps } from './shared.js';

export function IntegrationsSample(props: StatePanelSampleProps) {
  const connected = badge('success', 'Connected');
  return (
    <SampleWindow {...props} icon={PlugIcon} trail={['Integrations']} tabs={['Connected', 'All']}>
      <SampleList
        items={[
          {
            leading: <BrandIcon brand="slack" size="sm" />,
            title: 'Slack',
            detail: 'Agents reply in #sales and #support',
            trailing: connected,
          },
          {
            leading: <BrandIcon brand="gmail" size="sm" />,
            title: 'Gmail',
            detail: 'Reads new mail for heartbeat answers',
            trailing: connected,
          },
          {
            leading: <BrandIcon brand="google-calendar" size="sm" />,
            title: 'Google Calendar',
            detail: 'Books meetings after your approval',
            trailing: connected,
          },
          {
            leading: <BrandIcon brand="github" size="sm" />,
            title: 'GitHub',
            detail: 'Files issues for the product team',
            trailing: connected,
          },
          {
            leading: <BrandIcon brand="jira" size="sm" />,
            title: 'Jira',
            detail: 'Searches the Support board',
            trailing: badge('warning', 'Needs attention'),
          },
        ]}
      />
    </SampleWindow>
  );
}
