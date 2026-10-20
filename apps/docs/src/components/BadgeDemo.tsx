import { useState, type ReactNode } from 'react';
import { AddCircle } from 'reicon-react/icons/AddCircle';
import { ArrowUpRight } from 'reicon-react/icons/ArrowUpRight';
import { Bell } from 'reicon-react/icons/Bell';
import { BellOff } from 'reicon-react/icons/BellOff';
import { BookOpen } from 'reicon-react/icons/BookOpen';
import { Calendar } from 'reicon-react/icons/Calendar';
import { Check } from 'reicon-react/icons/Check';
import { Edit2 } from 'reicon-react/icons/Edit2';
import { Eye } from 'reicon-react/icons/Eye';
import { Loader } from 'reicon-react/icons/Loader';
import { Repeat } from 'reicon-react/icons/Repeat';
import { Trash } from 'reicon-react/icons/Trash';
import { Video } from 'reicon-react/icons/Video';
import { X } from 'reicon-react/icons/X';
import {
  Badge,
  badgeSizeNames,
  badgeVariantNames,
  badgeVariants,
  type BadgeSize,
  type BadgeVariant,
} from '@tulipfarm/sprout/badge';
import { Button } from '@tulipfarm/sprout/button';
import '../styles/badge-demo.css';
import DocsSelect from './DocsSelect';

type Scenario = 'ready' | 'loading' | 'empty' | 'error';
const scenarios: { value: Scenario; label: string }[] = [
  { value: 'ready', label: 'Ready' },
  { value: 'loading', label: 'Loading' },
  { value: 'empty', label: 'Empty' },
  { value: 'error', label: 'Error' },
];

type ConnectionState = 'connected' | 'installed' | 'attention' | 'unavailable' | 'soon' | 'off';

const integrations: {
  name: string;
  detail: string;
  state: ConnectionState;
}[] = [
  { name: 'Chat', detail: 'Replies in two channels', state: 'connected' },
  { name: 'Mail', detail: 'Reads new mail', state: 'installed' },
  { name: 'Tracker', detail: 'Searches one board', state: 'attention' },
  { name: 'Drive', detail: 'Waiting for an administrator', state: 'off' },
  {
    name: 'Docs',
    detail: 'Not supported in this region',
    state: 'unavailable',
  },
  { name: 'Forms', detail: 'Planned integration', state: 'soon' },
];

function ConnectionBadge({ state }: { state: ConnectionState }) {
  switch (state) {
    case 'connected':
      return (
        <Badge variant="success">
          <Check aria-hidden="true" />
          Connected
        </Badge>
      );
    case 'installed':
      return <Badge variant="secondary">Installed</Badge>;
    case 'attention':
      return <Badge variant="warning">Needs attention</Badge>;
    case 'off':
      return <Badge variant="outline">Not granted</Badge>;
    case 'unavailable':
      return <Badge variant="outline">Unavailable</Badge>;
    case 'soon':
      return <Badge variant="outline">Coming soon</Badge>;
  }
}

const tasks: {
  title: string;
  owner: string;
  started: string;
  status: string;
  variant: BadgeVariant;
}[] = [
  {
    title: 'Send reminders for invoices past 30 days',
    owner: 'Collections assistant',
    started: '4m ago',
    status: 'Needs review',
    variant: 'warning',
  },
  {
    title: 'Book a kickoff with a new customer',
    owner: 'Onboarding guide',
    started: '1h ago',
    status: 'Completed',
    variant: 'success',
  },
  {
    title: "Tag this week's billing tickets",
    owner: 'Support triage',
    started: 'Yesterday',
    status: 'Pending',
    variant: 'secondary',
  },
  {
    title: 'Import supplier price list',
    owner: 'Inventory watcher',
    started: 'Today',
    status: 'Failed',
    variant: 'destructive',
  },
  {
    title: 'Draft quarterly review',
    owner: 'Weekly reporter',
    started: 'Today',
    status: 'In progress',
    variant: 'info',
  },
];

const attendees: {
  name: string;
  email: string;
  response?: string;
  change: 'kept' | 'added' | 'removed';
}[] = [
  {
    name: 'Maya Chen',
    email: 'maya@example.com',
    response: 'accepted',
    change: 'kept',
  },
  { name: 'Leo Martins', email: 'leo@example.com', change: 'added' },
  {
    name: 'Priya Nair',
    email: 'priya.nair@example.com',
    response: 'declined',
    change: 'removed',
  },
];

const tags = [
  'Urgent',
  'Billing and invoicing enquiries from enterprise accounts',
  'Waiting on customer',
  'Resolved',
  'Follow up',
];
const tagTone = (label: string): BadgeVariant =>
  /urgent|failed|blocked/i.test(label)
    ? 'destructive'
    : /resolved|done/i.test(label)
      ? 'success'
      : /waiting|pending/i.test(label)
        ? 'warning'
        : 'secondary';

const runSteps: { label: string; variant: BadgeVariant }[] = [
  { label: 'Not yet applied', variant: 'info' },
  { label: 'In progress', variant: 'info' },
  { label: 'Created', variant: 'success' },
  { label: 'Failed', variant: 'destructive' },
  { label: 'Rejected', variant: 'secondary' },
];

const matrix: Record<BadgeSize, Record<BadgeVariant, ReactNode>> = {
  default: {
    default: 'Pinned',
    success: (
      <>
        <Check aria-hidden="true" />
        Connected
      </>
    ),
    warning: 'Needs review',
    info: 'Recommended',
    secondary: 'Draft',
    destructive: (
      <>
        <Trash aria-hidden="true" />
        Will be deleted
      </>
    ),
    outline: 'Coming soon',
    ghost: 'No status',
    link: (
      <>
        View workflow
        <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
      </>
    ),
  },
  chip: {
    default: 'Pinned · Brand guidelines 2026.pdf',
    success: (
      <>
        <AddCircle aria-hidden="true" />
        Leo Martins · leo@example.com
      </>
    ),
    warning: 'Needs your input · Approve a refund over $500',
    info: (
      <>
        <Calendar aria-hidden="true" />
        team-planning@group.calendar.example.com
      </>
    ),
    secondary: (
      <>
        <BookOpen aria-hidden="true" />
        Qualify an inbound lead
      </>
    ),
    destructive: (
      <>
        <Trash aria-hidden="true" />
        Priya Nair · priya.nair@example.com · declined
      </>
    ),
    outline: 'Maya Chen · maya@example.com · accepted',
    ghost: 'No status',
    link: (
      <>
        billing-runbook.md
        <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
      </>
    ),
  },
};

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="badge-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="badge-demo-card-body">{children}</div>
    </section>
  );
}

export default function BadgeDemo() {
  const [scenario, setScenario] = useState<Scenario>('ready');
  const [filters, setFilters] = useState(2);
  const [run, setRun] = useState(0);
  const [skills, setSkills] = useState([
    { id: 'a1b2c3d4e5', name: 'Qualify an inbound lead' },
    {
      id: 'f6a7b8c9d0',
      name: 'Prepare a quarterly review with revenue, churn, and open risks',
    },
  ]);
  const step = runSteps[run] ?? runSteps[0]!;

  return (
    <div className="badge-demo" id="badge-demo">
      <Example title="Variants and sizes" description="Nine variants in the default pill and the wrapping chip size.">
        <div className="badge-demo-matrix">
          {badgeSizeNames.map(size => (
            <div key={size} className="badge-demo-row" aria-label={`${size} size`} role="group">
              <span className="badge-demo-label">{size}</span>
              <div className="badge-demo-wrap">
                {badgeVariantNames.map(variant => (
                  <Badge key={variant} variant={variant} size={size} title={variant}>
                    {matrix[size][variant]}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Example>

      <Example
        title="Status in lists"
        description="Trailing status badges, with loading, empty, and error states supplied by the app."
      >
        <div className="badge-demo-toolbar">
          <label>
            State
            <DocsSelect<Scenario>
              label="Integration state"
              value={scenario}
              onValueChange={setScenario}
              items={scenarios}
            />
          </label>
        </div>
        {scenario === 'empty' ? (
          <p className="badge-demo-empty">No integrations yet.</p>
        ) : (
          <ul className="badge-demo-list" aria-label="Integrations" aria-busy={scenario === 'loading'}>
            {integrations.map(item => (
              <li key={item.name}>
                <span className="badge-demo-mark" aria-hidden="true">
                  {item.name.slice(0, 1)}
                </span>
                <span className="badge-demo-text">
                  <strong>{item.name}</strong>
                  <span>{item.detail}</span>
                </span>
                {scenario === 'loading' ? (
                  <Badge variant="secondary">
                    <Loader aria-hidden="true" className="badge-demo-spin" />
                    Checking
                  </Badge>
                ) : scenario === 'error' ? (
                  <Badge variant="destructive">Couldn’t check</Badge>
                ) : (
                  <ConnectionBadge state={item.state} />
                )}
              </li>
            ))}
          </ul>
        )}
        <table className="badge-demo-table">
          <caption className="sr-only">Agent tasks</caption>
          <thead>
            <tr>
              <th scope="col">Task</th>
              <th scope="col">Status</th>
              <th scope="col">Started</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <tr key={task.title}>
                <td>
                  <strong>{task.title}</strong>
                  <span>{task.owner}</span>
                </td>
                <td>
                  <Badge variant={task.variant}>{task.status}</Badge>
                </td>
                <td>{task.started}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Example>

      <Example
        title="Icons and counts"
        description="Leading icons, counts inside controls, and an inline-end icon slot."
      >
        <ul className="badge-demo-wrap" aria-label="Proposed changes">
          <li>
            <Badge variant="success">
              <AddCircle aria-hidden="true" />3 added
            </Badge>
          </li>
          <li>
            <Badge variant="info">
              <Edit2 aria-hidden="true" />2 updated
            </Badge>
          </li>
          <li>
            <Badge variant="destructive">
              <Trash aria-hidden="true" />
              Will be deleted
            </Badge>
          </li>
          <li>
            <Badge variant="info">
              <Video aria-hidden="true" />
              Adds video call
            </Badge>
          </li>
          <li>
            <Badge variant="secondary">
              <Bell aria-hidden="true" />
              Notify guests
            </Badge>
          </li>
          <li>
            <Badge variant="secondary">
              <BellOff aria-hidden="true" />
              Don’t notify
            </Badge>
          </li>
          <li>
            <Badge variant="secondary">
              <Repeat aria-hidden="true" />
              Repeats
            </Badge>
          </li>
          <li>
            <Badge variant="secondary">
              <Eye aria-hidden="true" />
              Private
            </Badge>
          </li>
          <li>
            <Badge variant="outline">
              Open
              <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
            </Badge>
          </li>
        </ul>
        <div className="badge-demo-wrap">
          <Button
            variant="outline"

            onClick={() => setFilters(value => (value + 1) % 4)}
          >
            Filters
            {filters > 0 && <Badge variant="secondary">{filters}</Badge>}
          </Button>
          <Button variant="outline">
            Columns
            <Badge variant="secondary">3/8</Badge>
          </Button>
          <Button variant="outline">
            Pending work
            <Badge variant="warning">4 waiting</Badge>
          </Button>
        </div>
      </Example>

      <Example title="Chips" description="Chips wrap long values and hold avatars or removable content.">
        <ul className="badge-demo-wrap" aria-label="Attendees">
          {attendees.map(person => (
            <li key={person.email} className="badge-demo-chip-item">
              <Badge
                size="chip"
                variant={
                  person.change === 'added' ? 'success' : person.change === 'removed' ? 'destructive' : 'outline'
                }
              >
                <span className="badge-demo-avatar" aria-hidden="true">
                  {person.name.slice(0, 1)}
                </span>
                <span
                  className={person.change === 'removed' ? 'badge-demo-break badge-demo-strike' : 'badge-demo-break'}
                >
                  {person.change === 'added' && <span className="sr-only">Adds </span>}
                  {person.change === 'removed' && <span className="sr-only">Removes </span>}
                  {person.name} · {person.email}
                  {person.response ? ` · ${person.response}` : ''}
                </span>
              </Badge>
            </li>
          ))}
        </ul>
        <ul className="badge-demo-wrap" aria-label="Selected skills">
          {skills.length === 0 && <li className="badge-demo-empty">No skills selected.</li>}
          {skills.map(skill => (
            <li key={skill.id} className="badge-demo-chip-item badge-demo-removable">
              <Badge variant="secondary" size="chip" title={skill.name}>
                <BookOpen aria-hidden="true" />
                {skill.name}
              </Badge>
              <Button
                variant="ghost"
                size="icon-xs"

                aria-label={`Remove skill ${skill.name}`}
                onClick={() => setSkills(list => list.filter(item => item.id !== skill.id))}
              >
                <X size={14} aria-hidden="true" />
              </Button>
            </li>
          ))}
          <li>
            <Badge
              variant="secondary"
              size="chip"
              role="img"
              aria-label="Skill Handle a refund request, version 9f8e7d6c"
            >
              <BookOpen aria-hidden="true" />
              Handle a refund request
            </Badge>
          </li>
        </ul>
        <div className="badge-demo-narrow">
          <Badge variant="secondary" size="chip">
            <Calendar aria-hidden="true" />
            <span className="badge-demo-break">c_9f3a1e0b7d2c4a58b6e1f0d9a7c3b2e1@group.calendar.example.com</span>
          </Badge>
        </div>
      </Example>

      <Example title="Overflow" description="Inner truncation in tight cells, with an outline count for hidden values.">
        <div className="badge-demo-cell" title={tags.join(', ')}>
          {tags.slice(0, 3).map(tag => (
            <span key={tag} className={tag.length > 12 ? 'badge-demo-shrink' : 'badge-demo-shrink badge-demo-keep'}>
              <Badge variant={tagTone(tag)}>
                <span className="badge-demo-truncate">{tag}</span>
              </Badge>
            </span>
          ))}
          <Badge variant="outline">+{tags.length - 3}</Badge>
        </div>
        <div className="badge-demo-lanes">
          {[
            {
              label: 'Billing and invoicing enquiries',
              variant: 'warning' as const,
            },
            { label: 'No status', variant: 'ghost' as const },
          ].map(lane => (
            <header key={lane.label} className="badge-demo-lane">
              <span className="badge-demo-shrink" title={lane.label}>
                <Badge variant={lane.variant}>
                  <span className="badge-demo-truncate">{lane.label}</span>
                </Badge>
              </span>
              <span className="badge-demo-count">12</span>
            </header>
          ))}
        </div>
      </Example>

      <Example
        title="In headings and status regions"
        description="Badges next to titles, in labels, and inside live status regions."
      >
        <div className="badge-demo-stack">
          <p className="badge-demo-title">
            <span className="badge-demo-truncate">Brand guidelines 2026.pdf</span>
            <Badge>Pinned</Badge>
          </p>
          <p className="badge-demo-title">
            Contact details
            <Badge variant="secondary">Optional</Badge>
            <Badge variant="warning">Shared with guests</Badge>
          </p>
          <p className="badge-demo-choice">
            Send a reminder after three days
            <span className="badge-demo-inline">
              <Badge variant="info">Recommended</Badge>
            </span>
          </p>
          <div className="badge-demo-wrap">
            <div role="status" aria-label="Proposal status">
              <Badge variant={step.variant}>{step.label}</Badge>
            </div>
            <Button
              variant="outline"

              onClick={() => setRun(value => (value + 1) % runSteps.length)}
            >
              Next status
            </Button>
          </div>
        </div>
      </Example>

      <Example
        title="Rendered as links and buttons"
        description="The render prop swaps the element while keeping badge styles and focus."
      >
        <div className="badge-demo-wrap">
          <Badge variant="link" render={<a href="#badge-api" />}>
            View workflow
            <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
          </Badge>
          <Badge variant="outline" render={<a href="#badge-api" />}>
            Outline link
          </Badge>
          <Badge variant="secondary" render={<a href="#badge-api" />}>
            Secondary link
          </Badge>
          <Badge variant="ghost" render={<button type="button" />}>
            Ghost button
          </Badge>
          <Badge variant="default" render={<a href="#badge-api" />}>
            Default link
          </Badge>
          <Badge variant="destructive" render={<a href="#badge-api" />}>
            Destructive link
          </Badge>
          <a href="#badge-api" className={badgeVariants({ variant: 'info' })}>
            badgeVariants()
          </a>
          <Badge variant="outline" aria-invalid="true">
            Invalid value
          </Badge>
        </div>
      </Example>
    </div>
  );
}
