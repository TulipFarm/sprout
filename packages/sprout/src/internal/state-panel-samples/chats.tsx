import { ChatIcon } from '../../components/icons.js';
import { SampleIconTile, SampleList, SampleWindow } from '../../components/state-sample.js';
import { muted, type StatePanelSampleProps } from './shared.js';

export function ChatsSample(props: StatePanelSampleProps) {
  const chat = <SampleIconTile icon={ChatIcon} />;
  return (
    <SampleWindow {...props} icon={ChatIcon} trail={['Chats']} tabs={['Active', 'Archived']}>
      <SampleList
        items={[
          {
            leading: chat,
            title: 'Which invoices are overdue this week?',
            detail: 'Found 7 invoices across 4 customers',
            trailing: muted('2m ago'),
          },
          {
            leading: chat,
            title: 'Draft a follow-up for Northwind',
            detail: 'Draft ready for your review',
            trailing: muted('1h ago'),
          },
          {
            leading: chat,
            title: 'Add a Suppliers table',
            detail: 'Name, contact, payment terms, region',
            trailing: muted('Yesterday'),
          },
          {
            leading: chat,
            title: 'Summarize last month’s orders',
            detail: '312 orders, up 18% on September',
            trailing: muted('Sep 30'),
          },
          {
            leading: chat,
            title: 'Who owns the Acme renewal?',
            detail: 'Assigned to the Sales team',
            trailing: muted('Sep 28'),
          },
        ]}
      />
    </SampleWindow>
  );
}
