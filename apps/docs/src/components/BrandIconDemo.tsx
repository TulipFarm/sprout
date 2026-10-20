import { useState, type ReactNode } from 'react';
import { Popover } from '@base-ui/react/popover';
import { ArrowRight } from 'reicon-react/icons/ArrowRight';
import { Calendar } from 'reicon-react/icons/Calendar';
import { Check } from 'reicon-react/icons/Check';
import { Database } from 'reicon-react/icons/Database';
import { FilePdf } from 'reicon-react/icons/FilePdf';
import { Plug } from 'reicon-react/icons/Plug';
import { Sparkle } from 'reicon-react/icons/Sparkle';
import { Badge, type BadgeVariant } from '@tulipfarm/sprout/badge';
import {
  BrandIcon,
  BrandStack,
  BrandTile,
  brandIconSizeNames,
  brandNames,
  type Brand,
  type BrandIconSize,
  type BrandStackItem,
} from '@tulipfarm/sprout/brand-icon';
import { Button } from '@tulipfarm/sprout/button';
import DocsSelect from './DocsSelect';
import '../styles/brand-icon-demo.css';

const brands = Object.keys(brandNames) as Brand[];

function Frame({ title, children, label }: { title: string; children: ReactNode; label?: string }) {
  return (
    <section className="brand-demo-frame" aria-label={label ?? title}>
      <div className="brand-demo-bar">{title}</div>
      <div className="brand-demo-body">{children}</div>
    </section>
  );
}

export function BrandIconPlayground() {
  const [brand, setBrand] = useState<Brand>('google-calendar');
  const [size, setSize] = useState<BrandIconSize>('md');
  return (
    <section className="brand-demo-frame" aria-label="Brand icon playground">
      <div className="brand-demo-toolbar">
        <label>
          Brand
          <DocsSelect<Brand>
            label="Brand"
            value={brand}
            onValueChange={setBrand}
            items={brands.map(value => ({
              value,
              label: brandNames[value],
            }))}
          />
        </label>
        <label>
          Size
          <DocsSelect<BrandIconSize>
            label="Brand icon size"
            value={size}
            onValueChange={setSize}
            items={brandIconSizeNames.map(value => ({ value, label: value }))}
          />
        </label>
      </div>
      <div className="brand-demo-stage" data-testid="playground-stage">
        {size === 'fill' ? (
          <span className="brand-demo-fill-box">
            <BrandIcon brand={brand} size="fill" />
          </span>
        ) : (
          <BrandIcon brand={brand} size={size} />
        )}
        <span className="brand-demo-caption">
          {brandNames[brand]} · <code>{size}</code>
        </span>
      </div>
    </section>
  );
}

const sizeSamples: Record<BrandIconSize, ReactNode> = {
  inline: (
    <Button variant="outline" size="sm" aria-label="Join Design review">
      <BrandIcon brand="google-calendar" size="inline" />
      Join
    </Button>
  ),
  glyph: (
    <span className="brand-demo-chip">
      <BrandIcon brand="google-slides" size="glyph" />
      Q3 board deck
    </span>
  ),
  fill: (
    <BrandTile size="action" render={<Button variant="ghost" size="icon" />} aria-label="Slack actions">
      <BrandIcon brand="slack" size="fill" />
    </BrandTile>
  ),
  sm: (
    <span className="brand-demo-row-inline">
      <BrandIcon brand="github" size="sm" />
      <span>
        <strong>GitHub</strong>
        <small>Files issues for the product team</small>
      </span>
    </span>
  ),
  md: (
    <span className="brand-demo-row-inline">
      <BrandIcon brand="notion" />
      <span>
        <strong>Notion</strong>
        <small>Search pages and databases</small>
      </span>
    </span>
  ),
  lg: (
    <span className="brand-demo-row-inline">
      <BrandIcon brand="linear" size="lg" />
      <span>
        <strong>Linear</strong>
        <small>Coming soon</small>
      </span>
    </span>
  ),
  xl: (
    <span className="brand-demo-row-inline">
      <BrandIcon brand="hubspot" size="xl" />
      <span>
        <strong className="brand-demo-title-lg">HubSpot</strong>
        <small>By HubSpot, Inc.</small>
      </span>
    </span>
  ),
};

export function BrandIconSizes() {
  return (
    <Frame title="Sizes">
      <ul className="brand-demo-size-list">
        {brandIconSizeNames.map(size => (
          <li key={size} data-size-sample={size}>
            <code>{size}</code>
            <div>{sizeSamples[size]}</div>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

export function BrandCatalog() {
  return (
    <Frame title={`Brand catalog · ${brands.length} brands`}>
      <ul className="brand-demo-catalog" aria-label="Brand catalog">
        {brands.map(brand => (
          <li key={brand} data-catalog-brand={brand}>
            <BrandIcon brand={brand} />
            <span>{brandNames[brand]}</span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

const models: { brand: Brand; name: string; detail: string }[] = [
  { brand: 'claude', name: 'Claude Sonnet 4.5', detail: 'Default' },
  { brand: 'openai', name: 'GPT-5', detail: 'Analytics team' },
  { brand: 'deepseek', name: 'DeepSeek V3', detail: 'Off' },
  { brand: 'grok', name: 'Grok 4', detail: 'Off' },
  { brand: 'kimi', name: 'Kimi K2', detail: 'Off' },
  { brand: 'google', name: 'Gemini 2.5 Pro', detail: 'Engineering' },
];

const toolRows: { brand: Brand | null; label: string }[] = [
  { brand: 'google-sheets', label: 'Read the Pipeline sheet' },
  { brand: 'gmail', label: 'Searched the inbox for invoices' },
  { brand: 'slack', label: 'Posted in #support' },
  { brand: 'github', label: 'Opened issue #482' },
  { brand: 'confluence', label: 'Read the Onboarding page' },
  { brand: 'jira', label: 'Searched the Support board' },
  { brand: null, label: 'Updated the Leads table' },
];

export function InlineCompositions() {
  return (
    <div className="brand-demo-grid">
      <Frame title="Calendar events">
        <ul className="brand-demo-list">
          <li>
            <span className="brand-demo-text">
              <strong>Design review</strong>
              <small>10:00 – 10:45 · Meet link</small>
            </span>
            <Button variant="outline" size="sm" aria-label="Join Design review">
              <BrandIcon brand="google-calendar" size="inline" />
              Join
            </Button>
          </li>
          <li>
            <span className="brand-demo-text">
              <strong>Quarterly planning with the leadership team</strong>
              <small>13:00 – 15:00 · No call link</small>
            </span>
            <Button variant="ghost" size="sm" aria-label="Open Quarterly planning in Google Calendar">
              <BrandIcon brand="google-calendar" size="inline" />
              Open
            </Button>
          </li>
          <li>
            <span className="brand-demo-text">
              <strong>Focus time</strong>
              <small>All day · Private</small>
            </span>
            <BrandIcon brand="google-calendar" size="inline" />
          </li>
        </ul>
      </Frame>
      <Frame title="Model picker">
        <ul className="brand-demo-list" aria-label="Models">
          {models.map(model => (
            <li key={model.brand} className="brand-demo-option">
              <BrandIcon brand={model.brand} size="inline" />
              <span className="brand-demo-truncate">{model.name}</span>
              <small>{model.detail}</small>
            </li>
          ))}
        </ul>
      </Frame>
      <Frame title="Tool activity">
        <ul className="brand-demo-list" aria-label="Tool activity">
          {toolRows.map(row => (
            <li key={row.label} className="brand-demo-option">
              {row.brand ? <BrandIcon brand={row.brand} size="inline" /> : <Database size={14} aria-hidden="true" />}
              <span className="brand-demo-truncate">{row.label}</span>
            </li>
          ))}
        </ul>
      </Frame>
      <Frame title="Agent channels and Drive files">
        <p className="brand-demo-note">
          <BrandIcon brand="slack" size="inline" />
          <span>Linked workspace members can talk to this agent in these channels.</span>
        </p>
        <p className="brand-demo-note brand-demo-muted">
          <BrandIcon brand="google-drive" size="inline" />
          <span className="brand-demo-truncate">
            Live from Google Drive ·{' '}
            <span className="brand-demo-strong">alex.meadow@northwind-landscaping.example</span>
          </span>
        </p>
        <p className="brand-demo-note">
          <span className="brand-demo-tool-chips">
            <span className="brand-demo-chip">
              <BrandIcon brand="google" size="inline" />
              Google Workspace
            </span>
            <span className="brand-demo-chip">
              <BrandIcon brand="slack" size="inline" />
              Slack
            </span>
            <span className="brand-demo-chip">
              <BrandIcon brand="github" size="inline" />
              GitHub
            </span>
          </span>
        </p>
      </Frame>
    </div>
  );
}

const driveFiles: { brand: Brand | null; name: string }[] = [
  { brand: 'google-docs', name: 'Customer onboarding playbook' },
  { brand: 'google-sheets', name: 'FY26 pipeline forecast' },
  { brand: 'google-slides', name: 'Q3 board deck' },
  { brand: 'google-forms', name: 'Event RSVP form' },
  { brand: null, name: 'Signed MSA – Northwind.pdf' },
];

const workflowSteps: { brand: Brand; title: string }[] = [
  { brand: 'gmail', title: 'When a new invoice email arrives' },
  { brand: 'google-sheets', title: 'Add a row to Accounts payable' },
  { brand: 'slack', title: 'Post a summary in #finance' },
];

export function GlyphCompositions() {
  return (
    <div className="brand-demo-grid">
      <Frame title="File mentions">
        <ul className="brand-demo-list" aria-label="Google Drive files">
          {driveFiles.map(file => (
            <li key={file.name} className="brand-demo-option">
              {file.brand ? <BrandIcon brand={file.brand} size="glyph" /> : <FilePdf size={20} aria-hidden="true" />}
              <span className="brand-demo-truncate">{file.name}</span>
            </li>
          ))}
        </ul>
      </Frame>
      <Frame title="Workflow steps">
        <ol className="brand-demo-steps">
          {workflowSteps.map(step => (
            <li key={step.title}>
              <span className="brand-demo-step-identity" aria-hidden="true">
                <BrandIcon brand={step.brand} size="glyph" />
              </span>
              <span className="brand-demo-truncate">{step.title}</span>
            </li>
          ))}
        </ol>
      </Frame>
      <Frame title="Integration highlights">
        <div className="brand-demo-chips">
          <span className="brand-demo-glass">
            <BrandIcon brand="gmail" size="glyph" />
            Drafted 3 follow-ups
          </span>
          <span className="brand-demo-glass">
            <BrandIcon brand="slack" size="glyph" />
            Answered in #support
          </span>
          <span className="brand-demo-glass">
            <BrandIcon brand="jira" size="glyph" />
            Triaged 5 new issues
          </span>
        </div>
        <ul className="brand-demo-banners" aria-label="Things to ask with Jira">
          <li className="brand-demo-banner" data-tone="a">
            <BrandIcon brand="jira" size="glyph" />
            <span>Which bugs are blocking the 4.2 release?</span>
          </li>
          <li className="brand-demo-banner" data-tone="b">
            <BrandIcon brand="jira" size="glyph" />
            <span>Summarize what the Support team closed this week</span>
          </li>
        </ul>
      </Frame>
      <Frame title="Drive recovery">
        <div className="brand-demo-recovery">
          <BrandIcon brand="google-drive" size="glyph" />
          <span className="brand-demo-text">
            <strong>Google Drive needs to reconnect</strong>
            <small>Files you mentioned stay in this chat. Reconnect to read them again.</small>
          </span>
          <Button variant="outline" size="sm">
            Reconnect
          </Button>
        </div>
      </Frame>
    </div>
  );
}

const connectedApps: {
  brand: Brand;
  title: string;
  detail: string;
  status: [BadgeVariant, string];
}[] = [
  {
    brand: 'slack',
    title: 'Slack',
    detail: 'Agents reply in #sales and #support',
    status: ['success', 'Connected'],
  },
  {
    brand: 'gmail',
    title: 'Gmail',
    detail: 'Reads new mail for heartbeat answers',
    status: ['success', 'Connected'],
  },
  {
    brand: 'google-calendar',
    title: 'Google Calendar',
    detail: 'Books meetings after your approval',
    status: ['success', 'Connected'],
  },
  {
    brand: 'jira',
    title: 'Jira',
    detail: 'Searches the Support board',
    status: ['warning', 'Needs attention'],
  },
  {
    brand: 'deepseek',
    title: 'DeepSeek',
    detail: 'Not available to any team',
    status: ['secondary', 'Off'],
  },
];

const knowledgeSources: {
  brand: Brand;
  title: string;
  detail: string;
  status: [BadgeVariant, string];
}[] = [
  {
    brand: 'github',
    title: 'northwind/storefront-and-checkout-monorepo',
    detail: 'Issues, Pull requests · activity after 2026-01-01 UTC',
    status: ['secondary', 'Synced'],
  },
  {
    brand: 'slack',
    title: '#customer-escalations',
    detail: 'Messages and threads · 3 selected members',
    status: ['secondary', 'Syncing'],
  },
  {
    brand: 'confluence',
    title: 'Support handbook',
    detail: '12 pages · 1 failed',
    status: ['warning', 'Needs attention'],
  },
  {
    brand: 'gmail',
    title: 'Invoices label',
    detail: 'Mail after 2026-03-01',
    status: ['secondary', 'Synced'],
  },
];

const directory: { brand: Brand; blurb: string; action?: string }[] = [
  { brand: 'google', blurb: 'Gmail, Calendar, Drive, Docs, and Sheets' },
  {
    brand: 'slack',
    blurb: 'Let agents answer in channels you choose',
    action: 'Settings',
  },
  { brand: 'microsoft', blurb: 'Outlook, Teams, and OneDrive' },
];

export function TileCompositions() {
  return (
    <div className="brand-demo-grid">
      <Frame title="Connected apps · sm">
        <ul className="brand-demo-list brand-demo-rows">
          {connectedApps.map(app => (
            <li key={app.brand}>
              <BrandIcon brand={app.brand} size="sm" />
              <span className="brand-demo-text">
                <strong>{app.title}</strong>
                <small>{app.detail}</small>
              </span>
              <Badge variant={app.status[0]}>{app.status[1]}</Badge>
            </li>
          ))}
        </ul>
      </Frame>
      <Frame title="Knowledge sources · sm">
        <ul className="brand-demo-list brand-demo-rows">
          {knowledgeSources.map(source => (
            <li key={source.title} aria-label={source.title}>
              <BrandIcon brand={source.brand} size="sm" />
              <span className="brand-demo-text">
                <strong className="brand-demo-break">{source.title}</strong>
                <small>{source.detail}</small>
              </span>
              <Badge variant={source.status[0]}>{source.status[1]}</Badge>
            </li>
          ))}
        </ul>
      </Frame>
      <Frame title="Integrations directory · md">
        <ul className="brand-demo-list brand-demo-rows">
          {directory.map(app => (
            <li key={app.brand}>
              <BrandIcon brand={app.brand} />
              <span className="brand-demo-text">
                <strong>{brandNames[app.brand]}</strong>
                <small>{app.blurb}</small>
              </span>
              <Button variant="outline" size="sm" aria-label={`${app.action ?? 'Connect'} ${brandNames[app.brand]}`}>
                {app.action ?? 'Connect'}
              </Button>
            </li>
          ))}
        </ul>
      </Frame>
      <Frame title="Integration sheet · sm header, xl hero">
        <div className="brand-demo-sheet-head">
          <BrandIcon brand="github" size="sm" />
          <strong>GitHub</strong>
        </div>
        <div className="brand-demo-hero">
          <BrandIcon brand="google-drive" size="xl" />
          <span className="brand-demo-text">
            <strong className="brand-demo-title-lg">Google Drive</strong>
            <small>Connected as alex.meadow@northwind-landscaping.example</small>
          </span>
          <Button>Settings</Button>
        </div>
      </Frame>
    </div>
  );
}

type ActionState = 'completed' | 'running' | 'failed' | 'pending';
interface ResultApp {
  brand: Brand | null;
  name: string;
  actions: { label: string; state: ActionState }[];
}

const stateLabels: Record<Exclude<ActionState, 'completed'>, string> = {
  failed: 'Failed:',
  running: 'In progress:',
  pending: 'Pending:',
};

function AppActions({ apps, showNames }: { apps: ResultApp[]; showNames: boolean }) {
  return (
    <div className="brand-demo-actions">
      {apps.map(app => (
        <section key={app.brand ?? app.name} aria-label={app.name}>
          {showNames && (
            <div className="brand-demo-actions-head">
              {app.brand ? <BrandIcon brand={app.brand} size="glyph" /> : <Plug size={20} aria-hidden="true" />}
              <h4>{app.name}</h4>
            </div>
          )}
          <ul>
            {app.actions.map(action => (
              <li key={action.label} data-state={action.state}>
                {action.state === 'completed' ? (
                  <span className="brand-demo-done">
                    <Check size={16} aria-hidden="true" />
                    <span className="sr-only">Completed:</span>
                  </span>
                ) : (
                  <span className="brand-demo-state">{stateLabels[action.state]}</span>
                )}
                <span>{action.label}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function AppTile({
  apps,
  overflow = false,
  disabled = false,
}: {
  apps: ResultApp[];
  overflow?: boolean;
  disabled?: boolean;
}) {
  const first = apps[0]!;
  const title = overflow ? `${apps.length} more ${apps.length === 1 ? 'app' : 'apps'}` : `${first.name} actions`;
  return (
    <span className="brand-demo-overlap-item">
      <Popover.Root>
        <Popover.Trigger
          openOnHover
          delay={800}
          closeDelay={200}
          aria-label={title}
          render={<BrandTile size="action" render={<Button variant="ghost" size="icon" disabled={disabled} />} />}
        >
          {overflow ? (
            <span className="brand-demo-overflow">+{apps.length}</span>
          ) : first.brand ? (
            <BrandIcon brand={first.brand} size="fill" />
          ) : (
            <Plug size={18} aria-hidden="true" />
          )}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner align="start" sideOffset={8} className="brand-demo-popover-positioner">
            <Popover.Popup className="brand-demo-popover" initialFocus={type => type !== 'mouse'}>
              <Popover.Title className="brand-demo-popover-title">{title}</Popover.Title>
              <AppActions apps={apps} showNames={overflow} />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </span>
  );
}

function ResultCard({
  title,
  kind,
  status,
  apps,
  icon,
  disabled,
}: {
  title: string;
  kind: string;
  status: string;
  apps: ResultApp[];
  icon?: ReactNode;
  disabled?: boolean;
}) {
  const visible = apps.slice(0, 2);
  const hidden = apps.slice(2);
  return (
    <section className="brand-demo-result" aria-label={`${kind}: ${title}`}>
      {visible.length > 0 && (
        <div role="group" aria-label="Apps used" className="brand-demo-overlap">
          {visible.map(app => (
            <AppTile key={app.brand ?? app.name} apps={[app]} disabled={disabled} />
          ))}
          {hidden.length > 0 && <AppTile apps={hidden} overflow disabled={disabled} />}
        </div>
      )}
      {!visible.length && icon && <BrandTile>{icon}</BrandTile>}
      <div className="brand-demo-text">
        <strong>{title}</strong>
        <small>
          {kind} · {status}
        </small>
      </div>
    </section>
  );
}

const workflowApps: ResultApp[] = [
  {
    brand: 'gmail',
    name: 'Gmail',
    actions: [
      { label: 'Found 4 unpaid invoices', state: 'completed' },
      { label: 'Drafted reminders', state: 'running' },
    ],
  },
  {
    brand: 'google-sheets',
    name: 'Google Sheets',
    actions: [{ label: 'Updated Accounts payable', state: 'completed' }],
  },
  {
    brand: 'slack',
    name: brandNames.slack,
    actions: [{ label: 'Post summary in #finance', state: 'pending' }],
  },
  {
    brand: null,
    name: 'Connected apps',
    actions: [{ label: 'Call the billing webhook', state: 'failed' }],
  },
];

export function ResultCardCompositions() {
  return (
    <Frame title="Result cards · action tiles">
      <div className="brand-demo-results">
        <ResultCard title="Chase unpaid invoices" kind="Workflow" status="Running" apps={workflowApps} />
        <ResultCard title="Webhook sync" kind="Action" status="Waiting for a connection" apps={[workflowApps[3]!]} />
        <ResultCard
          title="Weekly pipeline report"
          kind="Activity"
          status="Disabled while the workspace refreshes"
          apps={workflowApps.slice(0, 2)}
          disabled
        />
        <ResultCard
          title="Team offsite agenda"
          kind="Calendar"
          status="Ready"
          apps={[]}
          icon={<Calendar size={18} aria-hidden="true" />}
        />
      </div>
    </Frame>
  );
}

const toolBrands: BrandStackItem[] = [
  { brand: 'google', name: 'Google Workspace' },
  { brand: 'slack', name: 'Slack' },
  { brand: 'github', name: 'GitHub' },
  { brand: 'jira', name: 'Atlassian' },
];

const prompts: { label: string; brands?: BrandStackItem[] }[] = [
  {
    label: 'Summarize unread email and draft replies',
    brands: [
      { brand: 'gmail', name: 'Gmail' },
      { brand: 'google-calendar', name: 'Google Calendar' },
    ],
  },
  {
    label: 'Find open bugs mentioned in #support this week',
    brands: [
      { brand: 'slack', name: 'Slack' },
      { brand: 'jira', name: 'Jira' },
      { brand: 'github', name: 'GitHub' },
    ],
  },
  { label: 'Plan my week from the team roadmap' },
];

export function StackCompositions() {
  return (
    <div className="brand-demo-grid">
      <Frame title="Prompt list">
        <ul className="brand-demo-prompts" aria-label="Suggested prompts">
          {prompts.map(prompt => (
            <li key={prompt.label}>
              <Sparkle size={16} aria-hidden="true" />
              <button type="button" title={prompt.label}>
                {prompt.label}
              </button>
              {prompt.brands && (
                <span className="brand-demo-prompt-stack">
                  <BrandStack brands={prompt.brands} />
                </span>
              )}
              <ArrowRight size={14} aria-hidden="true" />
            </li>
          ))}
        </ul>
      </Frame>
      <Frame title="Agent draft">
        <dl className="brand-demo-review">
          <div>
            <dt>Team</dt>
            <dd>Customer Success</dd>
          </div>
          <div>
            <dt>Actions</dt>
            <dd>
              <BrandStack brands={toolBrands} data-testid="draft-stack" />
              <span className="brand-demo-badges">
                <Badge variant="secondary">Read email</Badge>
                <Badge variant="warning">Post messages</Badge>
                <Badge variant="secondary">Search issues</Badge>
              </span>
            </dd>
          </div>
          <div>
            <dt>Empty</dt>
            <dd data-testid="empty-stack">
              <BrandStack brands={[]} />
              <span>No actions selected.</span>
            </dd>
          </div>
          <div>
            <dt>Labelled</dt>
            <dd>
              <BrandStack
                brands={[
                  { brand: 'slack', name: 'Slack' },
                  { brand: 'notion', name: 'Notion' },
                  { brand: 'github', name: 'GitHub' },
                ]}
                label="Example integrations"
              />
            </dd>
          </div>
        </dl>
      </Frame>
    </div>
  );
}

const activity: { tool: string; brand: Brand | null }[] = [
  { tool: 'google.gmail.search', brand: 'gmail' },
  { tool: 'github.issues.create', brand: 'github' },
  { tool: 'atlassian.jira.search', brand: null },
  { tool: 'web.fetch', brand: null },
];

export function BrandNameCompositions() {
  return (
    <Frame title="brandNames">
      <ul className="brand-demo-list" aria-label="Activity sources">
        {activity.map(item => {
          const name = item.brand
            ? brandNames[item.brand]
            : item.tool.startsWith('atlassian.')
              ? 'Atlassian'
              : 'Connected apps';
          return (
            <li key={item.tool} className="brand-demo-option">
              <code>{item.tool}</code>
              <span aria-hidden="true">→</span>
              <span data-testid="activity-name">Used {name}</span>
            </li>
          );
        })}
      </ul>
    </Frame>
  );
}
