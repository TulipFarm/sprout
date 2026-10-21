import { useState, type ReactNode } from 'react';
import { Add } from 'reicon-react/icons/Add';
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
import { AgentAvatar } from '@tulipfarm/sprout/agent-avatar';
import { Badge } from '@tulipfarm/sprout/badge';
import { BrandIcon } from '@tulipfarm/sprout/brand-icon';
import { Button } from '@tulipfarm/sprout/button';
import {
  SampleBar,
  SampleIconTile,
  SampleList,
  SampleMark,
  SampleTable,
  SampleText,
  SampleWindow,
  sampleBarWidthNames,
  sampleMarkSizeNames,
  sampleMarkToneNames,
  sampleTextToneNames,
  type SampleColumn,
  type SampleIcon,
} from '@tulipfarm/sprout/state-sample';
import { StatePanel } from '@tulipfarm/sprout/state-panel';
import { ToggleGroup, ToggleGroupItem } from '@tulipfarm/sprout/toggle-group';
import DocsSelect from './DocsSelect';
import '../styles/state-sample-demo.css';

// Sample adapter: stands in for the application's file-type glyph.
const fileTint = { sheet: '#1f8f4a', pdf: '#e2463f', document: '#2b67d1' };
function FileGlyph({ name, kind }: { name: string; kind: keyof typeof fileTint }) {
  const label = (name.split('.').at(-1) ?? '').toUpperCase().slice(0, 4);
  const width = label.length > 3 ? 13 : 11;
  return (
    <svg viewBox="0 0 20 24" aria-hidden="true" className="state-sample-demo-file">
      <path
        d="M3.5 1.5h9l4.5 4.5v16a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-20a.5.5 0 0 1 .5-.5Z"
        className="state-sample-demo-file-paper"
        strokeLinejoin="round"
      />
      <path d="M12.5 1.5v4a.5.5 0 0 0 .5.5h4" className="state-sample-demo-file-edge" strokeLinejoin="round" />
      <path d="M6 15h8M6 17.5h8M6 20h5" className="state-sample-demo-file-edge" strokeLinecap="round" />
      <rect x="1" y="6" width={width} height="6" rx="1.5" fill={fileTint[kind]} />
      <text x={1 + width / 2} y="10.4" textAnchor="middle" fontSize="4.2" fontWeight="700" fill="#fff">
        {label}
      </text>
    </svg>
  );
}

const muted = (text: string) => <SampleText tone="muted">{text}</SampleText>;
const named = (tone: Parameters<typeof SampleMark>[0]['tone'], text: string) => (
  <>
    <SampleMark tone={tone} />
    <SampleText tone="strong">{text}</SampleText>
  </>
);

function ChatsSample() {
  return (
    <SampleWindow icon={ChatRound} trail={['Chats']} tabs={['Active', 'Archived']}>
      <SampleList
        items={[
          {
            leading: <SampleIconTile icon={ChatRound} />,
            title: 'Which invoices are overdue this week?',
            detail: 'Found 7 invoices across 4 customers',
            trailing: muted('2m ago'),
          },
          {
            leading: <SampleIconTile icon={ChatRound} />,
            title: 'Draft a follow-up for Northwind',
            detail: 'Draft ready for your review',
            trailing: muted('1h ago'),
          },
          {
            leading: <SampleIconTile icon={ChatRound} />,
            title: 'Add a Suppliers table',
            detail: 'Name, contact, payment terms, region',
            trailing: muted('Yesterday'),
          },
          {
            leading: <SampleIconTile icon={ChatRound} />,
            title: 'Summarize last month’s orders',
            detail: '312 orders, up 18% on September',
            trailing: muted('Sep 30'),
          },
          {
            leading: <SampleIconTile icon={ChatRound} />,
            title: 'Who owns the Acme renewal?',
            detail: 'Assigned to the Sales team',
            trailing: muted('Sep 28'),
          },
        ]}
      />
    </SampleWindow>
  );
}

function FilesSample() {
  return (
    <SampleWindow icon={Files} trail={['Files', 'My files']}>
      <SampleList
        items={[
          {
            leading: <SampleIconTile icon={Folder} />,
            title: 'Supplier contracts',
            detail: 'Folder · Shared with Purchasing',
            trailing: muted('You'),
          },
          {
            leading: <SampleIconTile icon={Folder} />,
            title: 'Month-end close',
            detail: 'Folder',
            trailing: muted('You'),
          },
          {
            leading: <FileGlyph name="Price list 2026.xlsx" kind="sheet" />,
            title: 'Price list 2026.xlsx',
            detail: 'Spreadsheet · 48 KB',
            trailing: muted('You'),
          },
          {
            leading: <FileGlyph name="Returns policy.pdf" kind="pdf" />,
            title: 'Returns policy.pdf',
            detail: 'PDF · 212 KB',
            trailing: muted('You'),
          },
          {
            leading: <FileGlyph name="Onboarding checklist.docx" kind="document" />,
            title: 'Onboarding checklist.docx',
            detail: 'Document · 31 KB',
            trailing: muted('You'),
          },
        ]}
      />
    </SampleWindow>
  );
}

const agent = (id: string, name: string) => <AgentAvatar agentId={id} name={name} size="sm" />;

function AgentsSample() {
  return (
    <SampleWindow icon={Users} trail={['Agents']}>
      <SampleList
        items={[
          {
            leading: agent('sample-collections', 'Collections assistant'),
            title: 'Collections assistant',
            detail: 'Follows up on overdue invoices',
            trailing: <Badge variant="success">Active</Badge>,
          },
          {
            leading: agent('sample-onboarding', 'Onboarding guide'),
            title: 'Onboarding guide',
            detail: 'Welcomes new customers and books kickoffs',
            trailing: <Badge variant="success">Active</Badge>,
          },
          {
            leading: agent('sample-inventory', 'Inventory watcher'),
            title: 'Inventory watcher',
            detail: 'Flags products below reorder level',
            trailing: <Badge variant="secondary">Draft</Badge>,
          },
          {
            leading: agent('sample-support', 'Support triage'),
            title: 'Support triage',
            detail: 'Routes new tickets to the right team',
            trailing: <Badge variant="success">Active</Badge>,
          },
          {
            leading: agent('sample-reports', 'Weekly reporter'),
            title: 'Weekly reporter',
            detail: 'Posts pipeline numbers every Monday',
            trailing: <Badge variant="secondary">Draft</Badge>,
          },
        ]}
      />
    </SampleWindow>
  );
}

function ProjectsSample() {
  return (
    <SampleWindow icon={Folder} trail={['Projects']}>
      <p className="state-sample-demo-group">Active projects</p>
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
      <p className="state-sample-demo-group">Archived projects</p>
      <SampleList
        items={[
          {
            title: 'Summer catalogue',
            detail: 'Use the approved product descriptions.',
            trailing: <Badge variant="secondary">Archived</Badge>,
          },
        ]}
      />
    </SampleWindow>
  );
}

function AgentTasksSample() {
  return (
    <SampleWindow icon={Checklist} trail={['My agent tasks']}>
      <SampleList
        items={[
          {
            leading: agent('sample-collections', 'Collections assistant'),
            title: 'Send reminders for invoices past 30 days',
            detail: 'Collections assistant · Started 4m ago',
            trailing: <Badge variant="warning">Needs review</Badge>,
          },
          {
            leading: agent('sample-onboarding', 'Onboarding guide'),
            title: 'Book a kickoff with Contoso',
            detail: 'Onboarding guide · Started 1h ago',
            trailing: <Badge variant="success">Completed</Badge>,
          },
          {
            leading: agent('sample-inventory', 'Inventory watcher'),
            title: 'List products below reorder level',
            detail: 'Inventory watcher · Started today',
            trailing: <Badge variant="success">Completed</Badge>,
          },
          {
            leading: agent('sample-support', 'Support triage'),
            title: 'Tag this week’s billing tickets',
            detail: 'Support triage · Started yesterday',
            trailing: <Badge variant="secondary">Pending</Badge>,
          },
        ]}
      />
    </SampleWindow>
  );
}

function SkillsSample() {
  return (
    <SampleWindow icon={BookOpen} trail={['Skills']} tabs={['Workspace', 'Built-in']}>
      <SampleList
        items={[
          {
            leading: <SampleIconTile icon={BookOpen} />,
            title: 'Qualify an inbound lead',
            detail: 'Check budget, timeline, and decision maker',
            trailing: <Badge variant="success">Approved</Badge>,
          },
          {
            leading: <SampleIconTile icon={BookOpen} />,
            title: 'Prepare a quarterly review',
            detail: 'Pull revenue, churn, and open risks',
            trailing: <Badge variant="success">Approved</Badge>,
          },
          {
            leading: <SampleIconTile icon={BookOpen} />,
            title: 'Handle a refund request',
            detail: 'Verify the order, then propose a refund',
            trailing: <Badge variant="warning">In review</Badge>,
          },
          {
            leading: <SampleIconTile icon={BookOpen} />,
            title: 'Write a supplier follow-up',
            detail: 'Friendly tone, confirm delivery dates',
            trailing: <Badge variant="secondary">Draft</Badge>,
          },
        ]}
      />
    </SampleWindow>
  );
}

function WorkflowsSample() {
  return (
    <SampleWindow icon={BranchDown} trail={['Workflows']}>
      <SampleTable
        columns={[{ label: 'Workflow', size: 'wide' }, { label: 'Trigger' }, { label: 'Status', size: 'narrow' }]}
        rows={[
          [named('green', 'Approve large discounts'), muted('New quote'), <Badge variant="success">Active</Badge>],
          [named('blue', 'Onboard a new customer'), muted('Deal won'), <Badge variant="success">Active</Badge>],
          [named('orange', 'Reorder low stock'), muted('Daily, 8:00'), <Badge variant="secondary">Draft</Badge>],
          [named('violet', 'Escalate urgent tickets'), muted('New ticket'), <Badge variant="success">Active</Badge>],
          [named('red', 'Chase unsigned contracts'), muted('Weekly, Mon'), <Badge variant="secondary">Draft</Badge>],
        ]}
      />
    </SampleWindow>
  );
}

function TablesSample() {
  const rows = [
    ['blue', 'Customers', '12', '1,248'],
    ['green', 'Invoices', '9', '3,902'],
    ['orange', 'Orders', '14', '8,417'],
    ['violet', 'Products', '8', '326'],
    ['red', 'Suppliers', '7', '58'],
    ['teal', 'Support tickets', '10', '2,031'],
  ] as const;
  return (
    <SampleWindow icon={Database} trail={['Tables']}>
      <SampleTable
        columns={[
          { label: 'Table', size: 'wide' },
          { label: 'Fields', size: 'narrow' },
          { label: 'Rows', size: 'narrow' },
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

function RecordsSample({ table, fields }: { table: string; fields: readonly string[] }) {
  const shown = fields.slice(0, 3);
  const columns: SampleColumn[] = shown.length
    ? shown.map((label, index) => ({
        label,
        size: index === 0 ? 'wide' : 'default',
      }))
    : [{ label: 'Row', size: 'wide' }];
  const rows = [
    ['blue', 'lg', 'md'],
    ['green', 'md', 'sm'],
    ['orange', 'sm', 'lg'],
    ['violet', 'md', 'md'],
    ['red', 'lg', 'sm'],
    ['teal', 'sm', 'md'],
  ] as const;
  return (
    <SampleWindow icon={Database} trail={['Tables', table]}>
      <SampleTable
        columns={columns}
        rows={rows.map(([tone, first, rest]) =>
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

function CreateInChatSample() {
  return (
    <SampleWindow icon={ChatRound} trail={['New chat']}>
      <div className="state-sample-demo-chat">
        <p className="state-sample-demo-bubble">
          Track our suppliers with a name, contact email, payment terms, and region.
        </p>
        <p className="state-sample-demo-reply">
          I’ll create a <strong>Suppliers</strong> table with these fields. Review the schema before approving.
        </p>
        <div className="state-sample-demo-schema">
          <SampleTable
            columns={[{ label: 'Field', size: 'wide' }, { label: 'Type' }]}
            rows={[
              [<SampleText tone="strong">Name</SampleText>, muted('Text')],
              [<SampleText tone="strong">Contact email</SampleText>, muted('Email')],
              [<SampleText tone="strong">Payment terms</SampleText>, muted('Choice')],
              [<SampleText tone="strong">Region</SampleText>, muted('Choice')],
            ]}
          />
        </div>
      </div>
    </SampleWindow>
  );
}

function IntegrationsSample() {
  return (
    <SampleWindow icon={Plug} trail={['Integrations']} tabs={['Connected', 'All']}>
      <SampleList
        items={[
          {
            leading: <BrandIcon brand="slack" size="sm" />,
            title: 'Slack',
            detail: 'Agents reply in #sales and #support',
            trailing: <Badge variant="success">Connected</Badge>,
          },
          {
            leading: <BrandIcon brand="gmail" size="sm" />,
            title: 'Gmail',
            detail: 'Reads new mail for heartbeat answers',
            trailing: <Badge variant="success">Connected</Badge>,
          },
          {
            leading: <BrandIcon brand="google-calendar" size="sm" />,
            title: 'Google Calendar',
            detail: 'Books meetings after your approval',
            trailing: <Badge variant="success">Connected</Badge>,
          },
          {
            leading: <BrandIcon brand="github" size="sm" />,
            title: 'GitHub',
            detail: 'Files issues for the product team',
            trailing: <Badge variant="success">Connected</Badge>,
          },
          {
            leading: <BrandIcon brand="jira" size="sm" />,
            title: 'Jira',
            detail: 'Searches the Support board',
            trailing: <Badge variant="warning">Needs attention</Badge>,
          },
        ]}
      />
    </SampleWindow>
  );
}

function ModelsSample() {
  return (
    <SampleWindow icon={Cpu} trail={['Settings', 'Models']}>
      <SampleList
        items={[
          {
            leading: <BrandIcon brand="claude" size="sm" />,
            title: 'Claude',
            detail: 'Default for chat and agents',
            trailing: <Badge variant="success">Enabled</Badge>,
          },
          {
            leading: <BrandIcon brand="openai" size="sm" />,
            title: 'GPT',
            detail: 'Available to the Analytics team',
            trailing: <Badge variant="success">Enabled</Badge>,
          },
          {
            leading: <BrandIcon brand="deepseek" size="sm" />,
            title: 'DeepSeek',
            detail: 'Not available to any team',
            trailing: <Badge variant="secondary">Off</Badge>,
          },
          {
            leading: <BrandIcon brand="kimi" size="sm" />,
            title: 'Kimi',
            detail: 'Not available to any team',
            trailing: <Badge variant="secondary">Off</Badge>,
          },
        ]}
      />
    </SampleWindow>
  );
}

function MembersSample() {
  return (
    <SampleWindow icon={User} trail={['Settings', 'Members']}>
      <SampleTable
        columns={[{ label: 'Member', size: 'wide' }, { label: 'Role', size: 'narrow' }, { label: 'Teams' }]}
        rows={[
          [named('violet', 'Maya Chen'), <Badge variant="info">Admin</Badge>, muted('Operations')],
          [named('orange', 'Leo Martins'), <Badge variant="secondary">Member</Badge>, muted('Sales, Support')],
          [named('green', 'Priya Nair'), <Badge variant="secondary">Member</Badge>, muted('Finance')],
          [named('blue', 'Sam Okafor'), <Badge variant="secondary">Member</Badge>, muted('Support')],
          [named('red', 'Ines Duarte'), <Badge variant="info">Admin</Badge>, muted('Operations')],
        ]}
      />
    </SampleWindow>
  );
}

function TeamsSample() {
  return (
    <SampleWindow icon={People} trail={['Settings', 'Teams']}>
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

function InvitationsSample() {
  const link = (email: string) => <SampleText tone="link">{email}</SampleText>;
  return (
    <SampleWindow icon={Envelope} trail={['Settings', 'Members', 'Invitations']}>
      <SampleTable
        columns={[{ label: 'Email', size: 'wide' }, { label: 'Status', size: 'narrow' }, { label: 'Email delivery' }]}
        rows={[
          [link('maya@northwind.co'), <Badge variant="info">active</Badge>, muted('Delivered')],
          [link('leo@northwind.co'), <Badge variant="secondary">Accepted</Badge>, muted('Delivered')],
          [link('priya@northwind.co'), <Badge variant="info">active</Badge>, muted('Sent')],
          [link('sam@northwind.co'), <Badge variant="secondary">expired</Badge>, muted('Delivered')],
        ]}
      />
    </SampleWindow>
  );
}

function GrantsSample() {
  const granted = <Badge variant="success">Granted</Badge>;
  return (
    <SampleWindow icon={ShieldUser} trail={['Settings', 'Table access']} tabs={['Sales', 'Finance', 'Support']}>
      <SampleTable
        columns={[
          { label: 'Table', size: 'wide' },
          { label: 'Read', size: 'narrow' },
          { label: 'Edit', size: 'narrow' },
        ]}
        rows={[
          [named('blue', 'Customers'), granted, granted],
          [named('green', 'Invoices'), granted, muted('None')],
          [named('orange', 'Orders'), granted, granted],
          [named('violet', 'Products'), granted, muted('None')],
          [named('red', 'Suppliers'), muted('None'), muted('None')],
        ]}
      />
    </SampleWindow>
  );
}

interface Scene {
  label: string;
  icon: SampleIcon;
  parts: string;
  title: string;
  description: string;
  action?: string;
  sample: () => ReactNode;
}

const scenes = {
  chats: {
    label: 'Chats',
    icon: ChatRound,
    parts: 'List · icon tiles · two tabs · muted times',
    title: 'No chats yet',
    description:
      'Ask about your customers, orders, or invoices in plain language. Every private conversation is saved here so you can pick it up later.',
    action: 'Start a chat',
    sample: ChatsSample,
  },
  files: {
    label: 'Files',
    icon: Files,
    parts: 'List · folder tiles and file glyphs · two-part trail',
    title: 'No files yet',
    description:
      'Upload the documents your work depends on, like price lists, contracts, and policies. Files stay private until you share them.',
    action: 'Upload files',
    sample: FilesSample,
  },
  agents: {
    label: 'Agents',
    icon: Users,
    parts: 'List · agent avatars · status badges',
    title: 'No agents yet',
    description:
      "Describe the agent's job in chat, or configure it manually above. Review its tools and access before activation.",
    action: 'Create in chat',
    sample: AgentsSample,
  },
  projects: {
    label: 'Projects',
    icon: Folder,
    parts: 'Grouped lists · text-only rows · one trailing badge',
    title: 'No projects yet',
    description:
      'Create a project for work that several people share, like a product launch. Add the people, files, and instructions every chat in it should use.',
    action: 'New project',
    sample: ProjectsSample,
  },
  tasks: {
    label: 'Agent tasks',
    icon: Checklist,
    parts: 'List · agent avatars · warning, success, and pending badges',
    title: 'No agent tasks yet',
    description:
      'Hand a piece of work to an activated agent and follow it here. You review every proposed row change before it runs.',
    action: 'Choose an agent',
    sample: AgentTasksSample,
  },
  skills: {
    label: 'Skills',
    icon: BookOpen,
    parts: 'List · icon tiles · two tabs · review badges',
    title: 'No workspace skills yet',
    description:
      'Import a skill, or ask chat to make one for a task you repeat. Review it once to save and enable it privately.',
    action: 'Import skill',
    sample: SkillsSample,
  },
  workflows: {
    label: 'Workflows',
    icon: BranchDown,
    parts: 'Table · wide, default, and narrow columns · marks',
    title: 'No workflows yet',
    description: 'Describe the work in chat, review its diagram, then save and activate it.',
    action: 'New workflow',
    sample: WorkflowsSample,
  },
  tables: {
    label: 'Tables',
    icon: Database,
    parts: 'Table · one wide and two narrow columns · default text',
    title: 'No tables yet',
    description:
      'A table holds one kind of business row, such as customers or invoices. Describe the fields in chat, and the table appears here after it is created.',
    action: 'Create table in chat',
    sample: TablesSample,
  },
  records: {
    label: 'Rows',
    icon: Database,
    parts: 'Table · columns from field names · bar placeholders',
    title: 'No rows yet',
    description:
      'Suppliers is ready for its first row. Ask the assistant to add rows or import a file. You review the exact changes before approval.',
    action: 'Add rows in chat',
    sample: () => <RecordsSample table="Suppliers" fields={['Name', 'Contact email', 'Payment terms', 'Region']} />,
  },
  create: {
    label: 'Create in chat',
    icon: ChatRound,
    parts: 'Free content · chat bubbles · nested table',
    title: 'Build tables in chat',
    description:
      'Describe the fields and changes you need to the built-in assistant. Review the exact schema and row effects in your chat before approving execution.',
    action: 'Create table in chat',
    sample: CreateInChatSample,
  },
  integrations: {
    label: 'Integrations',
    icon: Plug,
    parts: 'List · brand icons · two tabs',
    title: 'Nothing connected yet',
    description:
      'Connect the apps your team already uses, like Slack, Gmail, or GitHub. Agents can then read and act there, always within the access you approve.',
    action: 'Browse apps',
    sample: IntegrationsSample,
  },
  models: {
    label: 'Models',
    icon: Cpu,
    parts: 'List · model brand icons · enabled and off badges · no action',
    title: 'No models configured yet',
    description:
      'Once your operator configures model providers, each model family appears here. Admins then choose which teams can use it.',
    sample: ModelsSample,
  },
  members: {
    label: 'Members',
    icon: User,
    parts: 'Table · role badges · muted teams · no action',
    title: 'No members yet',
    description:
      'Invite the people you work with. Each member gets a role, joins teams, and sees only what those teams can access.',
    sample: MembersSample,
  },
  teams: {
    label: 'Teams',
    icon: People,
    parts: 'List · medium marks · no trailing slot',
    title: 'No teams yet',
    description: 'Create a team to collaborate and share access. A team manager can also add you to an existing team.',
    action: 'Create a team',
    sample: TeamsSample,
  },
  invitations: {
    label: 'Invitations',
    icon: Envelope,
    parts: 'Table · link text · three-part trail',
    title: 'No invitations yet',
    description:
      'Send each teammate a personal link to join this workspace. You can track whether the email arrived, resend it, or revoke it here.',
    action: 'Invite people',
    sample: InvitationsSample,
  },
  grants: {
    label: 'Team grants',
    icon: ShieldUser,
    parts: 'Table · three tabs · two narrow columns',
    title: 'No team grants yet',
    description:
      'Team grants give everyone in a team the same table access. Create a team to grant access to several people at once.',
    action: 'Go to Teams',
    sample: GrantsSample,
  },
} satisfies Record<string, Scene>;

type SceneName = keyof typeof scenes;
const sceneNames = Object.keys(scenes) as SceneName[];

function Panel({ name }: { name: SceneName }) {
  const scene: Scene = scenes[name];
  const Sample = scene.sample;
  return (
    <StatePanel
      kind="empty"
      heading="h3"
      icon={scene.icon}
      title={scene.title}
      description={scene.description}
      sample={<Sample />}
    >
      {scene.action && (
        <Button>
          <Add size={16} aria-hidden="true" />
          {scene.action}
        </Button>
      )}
    </StatePanel>
  );
}

export function StateSamplePlayground() {
  const [name, setName] = useState<SceneName>('files');
  const [frame, setFrame] = useState<'panel' | 'window'>('panel');
  const Sample = scenes[name].sample;
  return (
    <section className="state-sample-demo-playground" aria-label="State sample playground">
      <div className="state-sample-demo-toolbar">
        <label>
          Sample
          <DocsSelect
            label="Sample"
            value={name}
            items={sceneNames.map(value => ({
              value,
              label: scenes[value].label,
            }))}
            onValueChange={setName}
          />
        </label>
        <ToggleGroup
          aria-label="Frame"
          variant="outline"
          size="sm"
          spacing={0}
          value={[frame]}
          onValueChange={value => {
            if (value[0]) setFrame(value[0] as 'panel' | 'window');
          }}
        >
          <ToggleGroupItem value="panel">In a state panel</ToggleGroupItem>
          <ToggleGroupItem value="window">Window only</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="state-sample-demo-stage" data-frame={frame}>
        {frame === 'panel' ? (
          <Panel name={name} />
        ) : (
          <div className="state-sample-demo-window">
            <Sample />
          </div>
        )}
      </div>
      <p className="state-sample-demo-foot">{scenes[name].parts}</p>
    </section>
  );
}

export function StateSampleGallery() {
  return (
    <div className="state-sample-demo-gallery">
      {sceneNames.map(name => {
        const Sample = scenes[name].sample;
        return (
          <figure key={name} className="state-sample-demo-card" data-scene={name}>
            <figcaption>
              <strong>{scenes[name].label}</strong>
              <span>{scenes[name].parts}</span>
            </figcaption>
            <div className="state-sample-demo-window">
              <Sample />
            </div>
          </figure>
        );
      })}
      <figure className="state-sample-demo-card" data-scene="records-empty">
        <figcaption>
          <strong>Rows, table without fields</strong>
          <span>Table · falls back to one wide “Row” column</span>
        </figcaption>
        <div className="state-sample-demo-window">
          <RecordsSample table="Untitled table" fields={[]} />
        </div>
      </figure>
    </div>
  );
}

function Example({ title, children }: { title: string; children: ReactNode }) {
  return (
    <figure className="state-sample-demo-card">
      <figcaption>
        <strong>{title}</strong>
      </figcaption>
      <div className="state-sample-demo-body">{children}</div>
    </figure>
  );
}

export function StateSampleWindows() {
  return (
    <div className="state-sample-demo-gallery" data-testid="windows">
      <Example title="One-part trail, two tabs">
        <div className="state-sample-demo-window">
          <SampleWindow icon={ChatRound} trail={['Chats']} tabs={['Active', 'Archived']}>
            <SampleList
              items={[
                {
                  leading: <SampleIconTile icon={ChatRound} />,
                  title: 'Draft a follow-up for Northwind',
                  detail: 'Draft ready for your review',
                  trailing: muted('1h ago'),
                },
              ]}
            />
          </SampleWindow>
        </div>
      </Example>
      <Example title="Two-part trail, no tabs">
        <div className="state-sample-demo-window">
          <SampleWindow icon={Cpu} trail={['Settings', 'Models']}>
            <SampleList
              items={[
                {
                  leading: <BrandIcon brand="claude" size="sm" />,
                  title: 'Claude',
                  detail: 'Default for chat and agents',
                  trailing: <Badge variant="success">Enabled</Badge>,
                },
              ]}
            />
          </SampleWindow>
        </div>
      </Example>
      <Example title="Three-part trail, three tabs">
        <div className="state-sample-demo-window">
          <SampleWindow
            icon={Envelope}
            trail={['Settings', 'Members', 'Invitations']}
            tabs={['Sales', 'Finance', 'Support']}
          >
            <SampleTable
              columns={[
                { label: 'Email', size: 'wide' },
                { label: 'Status', size: 'narrow' },
              ]}
              rows={[[<SampleText tone="link">maya@northwind.co</SampleText>, <Badge variant="info">active</Badge>]]}
            />
          </SampleWindow>
        </div>
      </Example>
      <Example title="Long names truncate">
        <div className="state-sample-demo-window state-sample-demo-narrow">
          <SampleWindow
            icon={Database}
            trail={['Tables', 'Quarterly supplier performance review']}
            tabs={['Workspace', 'Built-in', 'Archived', 'Shared with me']}
          >
            <SampleList
              items={[
                {
                  leading: <SampleIconTile icon={BookOpen} />,
                  title: 'Prepare a quarterly review for every regional supplier',
                  detail: 'Pull revenue, churn, open risks, and delivery delays',
                  trailing: <Badge variant="warning">Needs attention</Badge>,
                },
              ]}
            />
          </SampleWindow>
        </div>
      </Example>
    </div>
  );
}

export function StateSampleParts() {
  return (
    <div className="state-sample-demo-gallery" data-testid="parts">
      <Example title="Text tones">
        <div className="state-sample-demo-rows">
          {sampleTextToneNames.map(tone => (
            <div key={tone} className="state-sample-demo-row" data-tone-sample={tone}>
              <code>{tone}</code>
              <SampleText tone={tone}>
                {
                  {
                    default: '1,248',
                    strong: 'Customers',
                    muted: 'Delivered',
                    link: 'maya@northwind.co',
                    mono: 'INV-2041',
                  }[tone]
                }
              </SampleText>
            </div>
          ))}
        </div>
      </Example>
      <Example title="Marks: six tones, two sizes">
        <div className="state-sample-demo-rows">
          {sampleMarkSizeNames.map(size => (
            <div key={size} className="state-sample-demo-row">
              <code>{size}</code>
              <span className="state-sample-demo-inline">
                {sampleMarkToneNames.map(tone => (
                  <SampleMark key={tone} tone={tone} size={size} data-mark-sample={`${tone}-${size}`} />
                ))}
              </span>
            </div>
          ))}
        </div>
      </Example>
      <Example title="Bars: three widths">
        <div className="state-sample-demo-rows">
          {sampleBarWidthNames.map(width => (
            <div key={width} className="state-sample-demo-row" data-bar-sample={width}>
              <code>{width}</code>
              <span className="state-sample-demo-track">
                <SampleBar width={width} />
              </span>
            </div>
          ))}
        </div>
      </Example>
      <Example title="Leading slots">
        <div className="state-sample-demo-rows">
          <div className="state-sample-demo-row">
            <code>SampleIconTile</code>
            <SampleIconTile icon={Folder} />
          </div>
          <div className="state-sample-demo-row">
            <code>SampleMark md</code>
            <SampleMark tone="blue" size="md" />
          </div>
          <div className="state-sample-demo-row">
            <code>BrandIcon sm</code>
            <BrandIcon brand="slack" size="sm" />
          </div>
          <div className="state-sample-demo-row">
            <code>AgentAvatar sm</code>
            {agent('sample-collections', 'Collections assistant')}
          </div>
          <div className="state-sample-demo-row">
            <code>File glyph</code>
            <FileGlyph name="Returns policy.pdf" kind="pdf" />
          </div>
        </div>
      </Example>
    </div>
  );
}
