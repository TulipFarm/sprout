import { MailIcon } from '../../components/icons.js';
import { SampleTable, SampleText, SampleWindow } from '../../components/state-sample.js';
import { badge, muted, type StatePanelSampleProps } from './shared.js';

export function InvitationsSample(props: StatePanelSampleProps) {
  const link = (email: string) => <SampleText tone="link">{email}</SampleText>;
  return (
    <SampleWindow {...props} icon={MailIcon} trail={['Settings', 'Members', 'Invitations']}>
      <SampleTable
        columns={[{ label: 'Email', size: 'lg' }, { label: 'Status', size: 'sm' }, { label: 'Email delivery' }]}
        rows={[
          [link('maya@northwind.co'), badge('info', 'active'), muted('Delivered')],
          [link('leo@northwind.co'), badge('secondary', 'Accepted'), muted('Delivered')],
          [link('priya@northwind.co'), badge('info', 'active'), muted('Sent')],
          [link('sam@northwind.co'), badge('secondary', 'expired'), muted('Delivered')],
        ]}
      />
    </SampleWindow>
  );
}
