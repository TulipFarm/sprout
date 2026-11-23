import { FilesIcon, FolderIcon } from '../../components/icons.js';
import { FileTypeIcon } from '../../components/attachment.js';
import { SampleIconTile, SampleList, SampleWindow } from '../../components/state-sample.js';
import { muted, type StatePanelSampleProps } from './shared.js';

const file = (name: string, mediaType: string) => <FileTypeIcon name={name} mediaType={mediaType} />;

export function FilesSample(props: StatePanelSampleProps) {
  const folder = <SampleIconTile icon={FolderIcon} />;
  return (
    <SampleWindow {...props} icon={FilesIcon} trail={['Files', 'My files']}>
      <SampleList
        items={[
          {
            leading: folder,
            title: 'Supplier contracts',
            detail: 'Folder · Shared with Purchasing',
            trailing: muted('You'),
          },
          {
            leading: folder,
            title: 'Month-end close',
            detail: 'Folder',
            trailing: muted('You'),
          },
          {
            leading: file('Price list 2026.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
            title: 'Price list 2026.xlsx',
            detail: 'Spreadsheet · 48 KB',
            trailing: muted('You'),
          },
          {
            leading: file('Returns policy.pdf', 'application/pdf'),
            title: 'Returns policy.pdf',
            detail: 'PDF · 212 KB',
            trailing: muted('You'),
          },
          {
            leading: file(
              'Onboarding checklist.docx',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ),
            title: 'Onboarding checklist.docx',
            detail: 'Document · 31 KB',
            trailing: muted('You'),
          },
        ]}
      />
    </SampleWindow>
  );
}
