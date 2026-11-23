import { DatabaseIcon } from '../../components/icons.js';
import { SampleTable, SampleText, SampleWindow } from '../../components/state-sample.js';
import { named, type StatePanelSampleProps } from './shared.js';

export function TablesSample(props: StatePanelSampleProps) {
  const rows = [
    ['blue', 'Customers', '12', '1,248'],
    ['green', 'Invoices', '9', '3,902'],
    ['orange', 'Orders', '14', '8,417'],
    ['violet', 'Products', '8', '326'],
    ['red', 'Suppliers', '7', '58'],
    ['teal', 'Support tickets', '10', '2,031'],
  ] as const;
  return (
    <SampleWindow {...props} icon={DatabaseIcon} trail={['Tables']}>
      <SampleTable
        columns={[
          { label: 'Table', size: 'lg' },
          { label: 'Fields', size: 'sm' },
          { label: 'Rows', size: 'sm' },
        ]}
        rows={rows.map(([tone, name, fields, count]) => [
          named(tone, name),
          <SampleText>{fields}</SampleText>,
          <SampleText>{count}</SampleText>,
        ])}
      />
    </SampleWindow>
  );
}
