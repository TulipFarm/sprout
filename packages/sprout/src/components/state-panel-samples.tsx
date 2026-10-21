import type { ReactNode } from 'react';
import { BookOpen } from 'reicon-react/icons/BookOpen';
import { BranchDown } from 'reicon-react/icons/BranchDown';
import { ChatRound } from 'reicon-react/icons/ChatRound';
import { Checklist } from 'reicon-react/icons/Checklist';
import { Cpu } from 'reicon-react/icons/Cpu';
import { Database } from 'reicon-react/icons/Database';
import { Envelope } from 'reicon-react/icons/Envelope';
import { Files } from 'reicon-react/icons/Files';
import { Folder } from 'reicon-react/icons/Folder';
import { People } from 'reicon-react/icons/People';
import { Plug } from 'reicon-react/icons/Plug';
import { ShieldUser } from 'reicon-react/icons/ShieldUser';
import { User } from 'reicon-react/icons/User';
import { Users } from 'reicon-react/icons/Users';
import { FileTypeIcon } from './attachment.js';
import { AgentAvatar } from './agent-avatar.js';
import { Badge } from './badge.js';
import { BrandIcon } from './brand-icon.js';
import {
  SampleBar,
  SampleIconTile,
  SampleList,
  SampleMark,
  SampleTable,
  SampleText,
  SampleWindow,
  type SampleColumn,
  type SampleMarkTone,
  type SampleWindowProps,
} from './state-sample.js';

/** Pass-through props for the outer sample window. */
export type StatePanelSampleProps = Omit<SampleWindowProps, 'icon' | 'trail' | 'tabs' | 'children'>;

const muted = (text: string) => <SampleText tone="muted">{text}</SampleText>;
const strong = (text: string) => <SampleText tone="strong">{text}</SampleText>;
const named = (tone: SampleMarkTone, text: string) => (
  <>
    <SampleMark tone={tone} />
    {strong(text)}
  </>
);
const agent = (id: string, name: string) => <AgentAvatar agentId={id} name={name} size="sm" />;
const badge = (variant: 'success' | 'secondary' | 'warning' | 'info', text: ReactNode) => (
  <Badge variant={variant}>{text}</Badge>
);

export function ChatsSample(props: StatePanelSampleProps) {
  const chat = <SampleIconTile icon={ChatRound} />;
  return (
    <SampleWindow {...props} icon={ChatRound} trail={['Chats']} tabs={['Active', 'Archived']}>
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

const file = (name: string, mediaType: string) => <FileTypeIcon name={name} mediaType={mediaType} />;

export function FilesSample(props: StatePanelSampleProps) {
  const folder = <SampleIconTile icon={Folder} />;
  return (
    <SampleWindow {...props} icon={Files} trail={['Files', 'My files']}>
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

export function AgentsSample(props: StatePanelSampleProps) {
  return (
    <SampleWindow {...props} icon={Users} trail={['Agents']}>
      <SampleList
        items={[
          {
            leading: agent('sample-collections', 'Collections assistant'),
            title: 'Collections assistant',
            detail: 'Follows up on overdue invoices',
            trailing: badge('success', 'Active'),
          },
          {
            leading: agent('sample-onboarding', 'Onboarding guide'),
            title: 'Onboarding guide',
            detail: 'Welcomes new customers and books kickoffs',
            trailing: badge('success', 'Active'),
          },
          {
            leading: agent('sample-inventory', 'Inventory watcher'),
            title: 'Inventory watcher',
            detail: 'Flags products below reorder level',
            trailing: badge('secondary', 'Draft'),
          },
          {
            leading: agent('sample-support', 'Support triage'),
            title: 'Support triage',
            detail: 'Routes new tickets to the right team',
            trailing: badge('success', 'Active'),
          },
          {
            leading: agent('sample-reports', 'Weekly reporter'),
            title: 'Weekly reporter',
            detail: 'Posts pipeline numbers every Monday',
            trailing: badge('secondary', 'Draft'),
          },
        ]}
      />
    </SampleWindow>
  );
}

export function ProjectsSample(props: StatePanelSampleProps) {
  return (
    <SampleWindow {...props} icon={Folder} trail={['Projects']}>
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

export function AgentTasksSample(props: StatePanelSampleProps) {
  return (
    <SampleWindow {...props} icon={Checklist} trail={['My agent tasks']}>
      <SampleList
        items={[
          {
            leading: agent('sample-collections', 'Collections assistant'),
            title: 'Send reminders for invoices past 30 days',
            detail: 'Collections assistant · Started 4m ago',
            trailing: badge('warning', 'Needs review'),
          },
          {
            leading: agent('sample-onboarding', 'Onboarding guide'),
            title: 'Book a kickoff with Contoso',
            detail: 'Onboarding guide · Started 1h ago',
            trailing: badge('success', 'Completed'),
          },
          {
            leading: agent('sample-inventory', 'Inventory watcher'),
            title: 'List products below reorder level',
            detail: 'Inventory watcher · Started today',
            trailing: badge('success', 'Completed'),
          },
          {
            leading: agent('sample-support', 'Support triage'),
            title: 'Tag this week’s billing tickets',
            detail: 'Support triage · Started yesterday',
            trailing: badge('secondary', 'Pending'),
          },
        ]}
      />
    </SampleWindow>
  );
}

export function SkillsSample(props: StatePanelSampleProps) {
  const skill = <SampleIconTile icon={BookOpen} />;
  return (
    <SampleWindow {...props} icon={BookOpen} trail={['Skills']} tabs={['Workspace', 'Built-in']}>
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

export function WorkflowsSample(props: StatePanelSampleProps) {
  const active = badge('success', 'Active');
  const draft = badge('secondary', 'Draft');
  return (
    <SampleWindow {...props} icon={BranchDown} trail={['Workflows']}>
      <SampleTable
        columns={[{ label: 'Workflow', size: 'lg' }, { label: 'Trigger' }, { label: 'Status', size: 'sm' }]}
        rows={[
          [named('green', 'Approve large discounts'), muted('New quote'), active],
          [named('blue', 'Onboard a new customer'), muted('Deal won'), active],
          [named('orange', 'Reorder low stock'), muted('Daily, 8:00'), draft],
          [named('violet', 'Escalate urgent tickets'), muted('New ticket'), active],
          [named('red', 'Chase unsigned contracts'), muted('Weekly, Mon'), draft],
        ]}
      />
    </SampleWindow>
  );
}

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
    <SampleWindow {...props} icon={Database} trail={['Tables']}>
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
    <SampleWindow {...props} icon={Database} trail={['Tables', table]}>
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

export function CreateInChatSample(props: StatePanelSampleProps) {
  return (
    <SampleWindow {...props} icon={ChatRound} trail={['New chat']}>
      <div className="sprout-state-panel-samples-chat">
        <p className="sprout-state-panel-samples-bubble">
          Track our suppliers with a name, contact email, payment terms, and region.
        </p>
        <p className="sprout-state-panel-samples-reply">
          I’ll create a <strong>Suppliers</strong> table with these fields. Review the schema before approving.
        </p>
        <div className="sprout-state-panel-samples-schema">
          <SampleTable
            columns={[{ label: 'Field', size: 'lg' }, { label: 'Type' }]}
            rows={[
              [strong('Name'), muted('Text')],
              [strong('Contact email'), muted('Email')],
              [strong('Payment terms'), muted('Choice')],
              [strong('Region'), muted('Choice')],
            ]}
          />
        </div>
      </div>
    </SampleWindow>
  );
}

export function IntegrationsSample(props: StatePanelSampleProps) {
  const connected = badge('success', 'Connected');
  return (
    <SampleWindow {...props} icon={Plug} trail={['Integrations']} tabs={['Connected', 'All']}>
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

export function ModelsSample(props: StatePanelSampleProps) {
  return (
    <SampleWindow {...props} icon={Cpu} trail={['Settings', 'Models']}>
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

export function MembersSample(props: StatePanelSampleProps) {
  const admin = badge('info', 'Admin');
  const member = badge('secondary', 'Member');
  return (
    <SampleWindow {...props} icon={User} trail={['Settings', 'Members']}>
      <SampleTable
        columns={[{ label: 'Member', size: 'lg' }, { label: 'Role', size: 'sm' }, { label: 'Teams' }]}
        rows={[
          [named('violet', 'Maya Chen'), admin, muted('Operations')],
          [named('orange', 'Leo Martins'), member, muted('Sales, Support')],
          [named('green', 'Priya Nair'), member, muted('Finance')],
          [named('blue', 'Sam Okafor'), member, muted('Support')],
          [named('red', 'Ines Duarte'), admin, muted('Operations')],
        ]}
      />
    </SampleWindow>
  );
}

export function TeamsSample(props: StatePanelSampleProps) {
  return (
    <SampleWindow {...props} icon={People} trail={['Settings', 'Teams']}>
      <SampleList
        items={[
          {
            leading: <SampleMark tone="blue" size="md" />,
            title: 'Sales',
            detail: 'Pipeline, quotes, and renewals · 8 members',
          },
          {
            leading: <SampleMark tone="green" size="md" />,
            title: 'Finance',
            detail: 'Invoices and collections · 3 members',
          },
          {
            leading: <SampleMark tone="orange" size="md" />,
            title: 'Support',
            detail: 'Tickets and refunds · 6 members',
          },
          {
            leading: <SampleMark tone="violet" size="md" />,
            title: 'Operations',
            detail: 'Inventory and suppliers · 4 members',
          },
        ]}
      />
    </SampleWindow>
  );
}

export function InvitationsSample(props: StatePanelSampleProps) {
  const link = (email: string) => <SampleText tone="link">{email}</SampleText>;
  return (
    <SampleWindow {...props} icon={Envelope} trail={['Settings', 'Members', 'Invitations']}>
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

export function GrantsSample(props: StatePanelSampleProps) {
  const granted = badge('success', 'Granted');
  const none = muted('None');
  return (
    <SampleWindow
      {...props}
      icon={ShieldUser}
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
