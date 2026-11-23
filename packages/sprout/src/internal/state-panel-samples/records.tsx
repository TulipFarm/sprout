import { DatabaseIcon } from '../../components/icons.js';
import { SampleBar, SampleMark, SampleTable, SampleWindow, type SampleColumn } from '../../components/state-sample.js';
import { type StatePanelSampleProps } from './shared.js';

export interface RecordsSampleProps extends StatePanelSampleProps {
  /** Table name, shown as the current crumb. */
  table: string;
  /** Field labels. The first three become columns; none falls back to “Row”. */
  fields: readonly string[];
}

const recordRows = [
  ['blue', 'lg', 'md'],
  ['green', 'md', 'sm'],
  ['orange', 'sm', 'lg'],
  ['violet', 'md', 'md'],
  ['red', 'lg', 'sm'],
  ['teal', 'sm', 'md'],
] as const;

export function RecordsSample({ table, fields, ...props }: RecordsSampleProps) {
  const shown = fields.slice(0, 3);
  const columns: SampleColumn[] = shown.length
    ? shown.map((label, index) => ({
        label,
        size: index === 0 ? 'lg' : 'md',
      }))
    : [{ label: 'Row', size: 'lg' }];
  return (
    <SampleWindow {...props} icon={DatabaseIcon} trail={['Tables', table]}>
      <SampleTable
        columns={columns}
        rows={recordRows.map(([tone, first, rest]) =>
          columns.map((_, column) =>
            column === 0 ? (
              <>
                <SampleMark tone={tone} />
                <SampleBar width={first} />
              </>
            ) : (
              <SampleBar width={column % 2 ? rest : first} />
            ),
          ),
        )}
      />
    </SampleWindow>
  );
}
