import { ShieldUserIcon } from '../../components/icons.js';
import { SampleTable, SampleWindow } from '../../components/state-sample.js';
import { badge, muted, named, type StatePanelSampleProps } from './shared.js';

export function GrantsSample(props: StatePanelSampleProps) {
  const granted = badge('success', 'Granted');
  const none = muted('None');
  return (
    <SampleWindow
      {...props}
      icon={ShieldUserIcon}
      trail={['Settings', 'Table access']}
      tabs={['Sales', 'Finance', 'Support']}
    >
      <SampleTable
        columns={[
          { label: 'Table', size: 'lg' },
          { label: 'Read', size: 'sm' },
          { label: 'Edit', size: 'sm' },
        ]}
        rows={[
          [named('blue', 'Customers'), granted, granted],
          [named('green', 'Invoices'), granted, none],
          [named('orange', 'Orders'), granted, granted],
          [named('violet', 'Products'), granted, none],
          [named('red', 'Suppliers'), none, none],
        ]}
      />
    </SampleWindow>
  );
}
