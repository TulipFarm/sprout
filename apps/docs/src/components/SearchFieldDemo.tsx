import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Cpu } from 'reicon-react/icons/Cpu';
import { Users } from 'reicon-react/icons/Users';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@tulipfarm/sprout/breadcrumb';
import { Button } from '@tulipfarm/sprout/button';
import { PageHeader } from '@tulipfarm/sprout/page-header';
import { Popover, PopoverContent, PopoverTrigger } from '@tulipfarm/sprout/popover';
import { SearchField } from '@tulipfarm/sprout/search-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tulipfarm/sprout/select';
import { StatePanel } from '@tulipfarm/sprout/state-panel';
import '../styles/search-field-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="search-field-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="search-field-demo-card-body">{children}</div>
    </section>
  );
}

const matches = (text: string, query: string) => text.toLowerCase().includes(query.trim().toLowerCase());

function Sample({ testId, note, children }: { testId: string; note: string; children: ReactNode }) {
  return (
    <div className="search-field-demo-sample" data-testid={testId}>
      {children}
      <p className="search-field-demo-note">{note}</p>
    </div>
  );
}

export function SearchFieldStates() {
  const [models, setModels] = useState('');
  const [agents, setAgents] = useState('');
  const [drive, setDrive] = useState('Q3 board deck');
  const [chats, setChats] = useState(
    'Follow up with the Northwind procurement team about the renewal terms we discussed last Thursday',
  );
  const [invites, setInvites] = useState('');
  const [apps, setApps] = useState('Slack');
  return (
    <Example
      title="States"
      description="Placeholder falls back to the label. The clear button appears once there is text. Long text stays on one line."
    >
      <div className="search-field-demo-grid">
        <Sample testId="state-label-placeholder" note="No placeholder · no limit">
          <SearchField label="Search models" value={models} onChange={setModels} />
        </Sample>
        <Sample testId="state-placeholder" note="Custom placeholder · 120 characters">
          <SearchField
            id="state-agent-search"
            label="Find agents"
            placeholder="Search agents"
            maxLength={120}
            value={agents}
            onChange={setAgents}
          />
        </Sample>
        <Sample testId="state-filled" note="Filled · 500 characters">
          <SearchField label="Search Google Drive" value={drive} maxLength={500} onChange={setDrive} />
        </Sample>
        <Sample testId="state-long" note="Long text · 640 characters">
          <SearchField label="Search chats" value={chats} maxLength={640} onChange={setChats} />
        </Sample>
        <Sample testId="state-invitations" note="Long placeholder · 254 characters">
          <SearchField
            id="invitation-search"
            label="Search invitations"
            placeholder="Search email, validity, or delivery"
            maxLength={254}
            value={invites}
            onChange={setInvites}
          />
        </Sample>
        <Sample testId="state-disabled" note="Inside a disabled fieldset">
          <fieldset disabled className="search-field-demo-fieldset">
            <legend className="search-field-demo-sr-only">Apps</legend>
            <SearchField label="Search apps" placeholder="Search apps" value={apps} onChange={setApps} />
          </fieldset>
        </Sample>
      </div>
    </Example>
  );
}

const agentRows = [
  { name: 'Invoice follow-up', detail: 'Chases unpaid invoices every Monday' },
  { name: 'People Ops helper', detail: 'Answers leave and benefits questions' },
  { name: 'Renewal desk', detail: 'Drafts renewal quotes from the CRM' },
  { name: 'Support triage', detail: 'Labels and routes new tickets' },
];

export function SearchFieldListFilter() {
  const [search, setSearch] = useState('');
  const shown = agentRows.filter(row => matches(`${row.name} ${row.detail}`, search));
  return (
    <Example
      title="Filter a page list"
      description="Agents, skills, tasks, tables, members, and models search their list like this. No match shows an empty state with a way back."
    >
      <div className="search-field-demo-page" data-testid="list-filter">
        <PageHeader
          title="Agents"
          description="Private instructions you can share with people and teams."
          actions={<Button>New agent</Button>}
        />
        <SearchField
          id="agent-search"
          label="Find agents"
          placeholder="Search agents"
          maxLength={120}
          value={search}
          onChange={setSearch}
        />
        {search && shown.length > 0 && (
          <p className="search-field-demo-muted" role="status">
            {shown.length} matching {shown.length === 1 ? 'agent' : 'agents'}
          </p>
        )}
        {shown.length ? (
          <ul className="search-field-demo-rows" aria-label="Agents">
            {shown.map(row => (
              <li key={row.name}>
                <span>{row.name}</span>
                <span className="search-field-demo-muted">{row.detail}</span>
              </li>
            ))}
          </ul>
        ) : (
          <StatePanel
            kind="empty"
            heading="h3"
            icon={Cpu}
            title={`No agents match “${search}”`}
            description="Try another name or clear the search."
          >
            <Button variant="outline" onClick={() => setSearch('')}>
              Clear search
            </Button>
          </StatePanel>
        )}
      </div>
    </Example>
  );
}

const projects = {
  active: ['Q4 launch plan', 'Customer onboarding', 'Security review 2026'],
  archived: ['Q2 launch plan', 'Website refresh'],
};

const workflows = ['Weekly pipeline digest', 'New lead routing', 'Invoice reminders'];

export function SearchFieldShelves() {
  const [archived, setArchived] = useState(false);
  const [draft, setDraft] = useState('');
  const list = projects[archived ? 'archived' : 'active'].filter(name => matches(name, draft));
  const [shelf, setShelf] = useState<'current' | 'archived'>('current');
  const [flow, setFlow] = useState('');
  const shelfFlows = shelf === 'current' ? workflows : [];
  return (
    <Example
      title="Search with a shelf filter"
      description="Projects and skills put Active and Archived next to the search. The placeholder names the shelf. Workflows hide the search when a shelf is empty."
    >
      <div className="search-field-demo-stack" data-testid="projects">
        <div className="search-field-demo-toolbar">
          <div className="search-field-demo-grow">
            <SearchField
              id="project-search"
              label="Search projects"
              placeholder={archived ? 'Search archived projects' : 'Search active projects'}
              maxLength={255}
              value={draft}
              onChange={setDraft}
            />
          </div>
          <div role="group" aria-label="Project status" className="search-field-demo-buttons">
            <Button
              variant={archived ? 'ghost' : 'secondary'}
              aria-pressed={!archived}
              onClick={() => setArchived(false)}
            >
              Active
            </Button>
            <Button
              variant={archived ? 'secondary' : 'ghost'}
              aria-pressed={archived}
              onClick={() => setArchived(true)}
            >
              Archived
            </Button>
          </div>
        </div>
        {draft && list.length > 0 && (
          <p role="status" className="search-field-demo-muted">
            {list.length === 1 ? '1 project matches' : `${list.length} projects match`} “{draft}”.
          </p>
        )}
        <ul className="search-field-demo-rows" aria-label="Projects">
          {list.map(name => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
      <div className="search-field-demo-stack" data-testid="workflows">
        <div role="group" aria-label="Workflow filter" className="search-field-demo-buttons">
          <Button
            variant={shelf === 'current' ? 'secondary' : 'ghost'}
            aria-pressed={shelf === 'current'}
            onClick={() => setShelf('current')}
          >
            Current workflows
          </Button>
          <Button
            variant={shelf === 'archived' ? 'secondary' : 'ghost'}
            aria-pressed={shelf === 'archived'}
            onClick={() => setShelf('archived')}
          >
            Archived workflows
          </Button>
        </div>
        {(shelfFlows.length > 0 || flow) && (
          <SearchField
            id="workflow-search"
            label="Find workflows"
            placeholder={shelf === 'archived' ? 'Search archived workflows' : 'Search current workflows'}
            value={flow}
            onChange={setFlow}
          />
        )}
        {shelfFlows.length ? (
          <ul className="search-field-demo-rows" aria-label="Workflows">
            {shelfFlows
              .filter(name => matches(name, flow))
              .map(name => (
                <li key={name}>{name}</li>
              ))}
          </ul>
        ) : (
          <p className="search-field-demo-muted">No archived workflows.</p>
        )}
      </div>
    </Example>
  );
}

const registry = [
  { name: 'Linear', endpoint: 'https://mcp.linear.app/sse' },
  { name: 'Notion', endpoint: 'https://mcp.notion.com/mcp' },
  { name: 'Sentry', endpoint: 'https://mcp.sentry.dev/mcp' },
];

const owners = [
  { value: '__all__', label: 'All owners' },
  { value: 'tulipfarm', label: 'tulipfarm' },
  { value: 'northwind', label: 'northwind' },
];

const repositories = [
  { owner: 'tulipfarm', name: 'tulipfarm/handbook' },
  { owner: 'tulipfarm', name: 'tulipfarm/runbooks' },
  { owner: 'northwind', name: 'northwind/pricing-api' },
];

export function SearchFieldActions() {
  const [skill, setSkill] = useState('');
  const [imported, setImported] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const results = registry.filter(entry => matches(entry.name, search));
  const [repo, setRepo] = useState('');
  const [owner, setOwner] = useState('__all__');
  const repos = repositories.filter(item => (owner === '__all__' || item.owner === owner) && matches(item.name, repo));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSearch(query.trim());
  };
  return (
    <Example
      title="Search with an action"
      description="The skill picker keeps an import button beside the search. The MCP catalog searches on submit. GitHub filters repositories by owner too."
    >
      <div className="search-field-demo-stack" data-testid="skill-picker">
        <div className="search-field-demo-toolbar search-field-demo-toolbar-end">
          <div className="search-field-demo-fill">
            <SearchField
              id="agent-skill-search"
              label="Find skills"
              placeholder="Search skills"
              maxLength={120}
              value={skill}
              onChange={setSkill}
            />
          </div>
          <Button variant="outline" onClick={() => setImported(true)}>
            Import skill
          </Button>
        </div>
        {imported && (
          <p role="status" className="search-field-demo-muted">
            Import opens here.
          </p>
        )}
      </div>
      <form className="search-field-demo-form" data-testid="mcp-catalog" onSubmit={submit}>
        <SearchField
          label="Search MCP Registry"
          placeholder="Search remote MCP servers"
          value={query}
          onChange={value => {
            setQuery(value);
            if (!value) setSearch('');
          }}
        />
        <Button type="submit" variant="outline">
          Search catalog
        </Button>
      </form>
      <ul className="search-field-demo-rows" aria-label="MCP catalog results">
        {results.map(entry => (
          <li key={entry.name}>
            <span>{entry.name}</span>
            <span className="search-field-demo-muted search-field-demo-break">{entry.endpoint}</span>
          </li>
        ))}
        {!results.length && <li className="search-field-demo-muted">No servers match “{search}”.</li>}
      </ul>
      <div className="search-field-demo-toolbar search-field-demo-toolbar-end" data-testid="github-repos">
        <div className="search-field-demo-basis-56">
          <SearchField
            label="Find repositories"
            placeholder="Search all repositories…"
            value={repo}
            onChange={setRepo}
          />
        </div>
        <div className="search-field-demo-basis-40">
          <Select items={owners} value={owner} onValueChange={value => setOwner(value ?? '__all__')}>
            <SelectTrigger width="full" aria-label="Repository owner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {owners.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <ul className="search-field-demo-rows" aria-label="Repositories">
        {repos.map(item => (
          <li key={item.name}>{item.name}</li>
        ))}
        {!repos.length && <li className="search-field-demo-muted">No repositories match.</li>}
      </ul>
    </Example>
  );
}

const files = ['Board deck Q3.pdf', 'Pricing 2026.xlsx', 'Hiring plan.docx', 'Launch brief.md'];

export function SearchFieldHeaders() {
  const [draft, setDraft] = useState('');
  const [drive, setDrive] = useState('');
  return (
    <Example
      title="Beside breadcrumbs"
      description="Files and Google Drive put the search at the end of the folder path. It wraps under the path on narrow screens."
    >
      <div className="search-field-demo-stack" data-testid="files-header">
        <div className="search-field-demo-header">
          <Breadcrumb aria-label="Folder path">
            <BreadcrumbList>
              <BreadcrumbItem>
                {draft ? (
                  <BreadcrumbLink
                    href="#files"
                    onClick={event => {
                      event.preventDefault();
                      setDraft('');
                    }}
                  >
                    My files
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>My files</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {draft && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Search results</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          <SearchField label="Search My files" value={draft} maxLength={255} onChange={setDraft} />
        </div>
        <ul className="search-field-demo-rows" aria-label="My files">
          {files
            .filter(name => matches(name, draft))
            .map(name => (
              <li key={name}>{name}</li>
            ))}
        </ul>
      </div>
      <div className="search-field-demo-stack" data-testid="all-sources">
        <div className="search-field-demo-header">
          <h4 className="search-field-demo-heading">Search results from all sources</h4>
          <SearchField label="Search all sources" value={drive} maxLength={255} onChange={setDrive} />
        </div>
        <div className="search-field-demo-header">
          <Breadcrumb aria-label="Drive path">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#drive">Google Drive</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Finance</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <SearchField label="Search Google Drive" value={drive} maxLength={500} onChange={setDrive} />
        </div>
      </div>
    </Example>
  );
}

type Read = 'loading' | 'ready' | 'error';

/* A sample adapter: pretends to load rows for a search term after a short delay. */
function useSampleRead<T>(term: string, load: (term: string) => T[], mode: Read) {
  const [state, setState] = useState<{ kind: Read; items: T[] }>({
    kind: 'loading',
    items: [],
  });
  useEffect(() => {
    setState({ kind: 'loading', items: [] });
    if (mode === 'loading') return;
    const timer = setTimeout(
      () => setState(mode === 'error' ? { kind: 'error', items: [] } : { kind: 'ready', items: load(term) }),
      250,
    );
    return () => clearTimeout(timer);
  }, [term, mode, load]);
  return state;
}

const customers = ['Acme Robotics', 'Northwind Traders', 'Globex', 'Initech', 'Umbrella Health'];
const loadCustomers = (term: string) => customers.filter(name => matches(name, term));

const modes: { value: Read; label: string }[] = [
  { value: 'ready', label: 'Results' },
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: 'Error' },
];

export function SearchFieldPopover() {
  const [term, setTerm] = useState('');
  const [values, setValues] = useState<string[]>(['Globex']);
  const [mode, setMode] = useState<Read>('ready');
  const read = useSampleRead(term, loadCustomers, mode);
  const [rows, setRows] = useState('');
  return (
    <Example
      title="In a popover and a query bar"
      description="Table filters search linked rows inside a picker popover. The first Escape clears the text; the next closes the popover."
    >
      <div className="search-field-demo-toolbar">
        <Popover>
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            {values.length ? values.join(', ') : 'Choose customer'}
          </PopoverTrigger>
          <PopoverContent size="picker">
            <div className="search-field-demo-picker">
              <SearchField id="ref-customer" label="Search Customer" value={term} maxLength={255} onChange={setTerm} />
              {read.kind === 'error' ? (
                <p role="alert" className="search-field-demo-danger">
                  Couldn’t load linked rows. Try another search.
                </p>
              ) : read.kind === 'loading' ? (
                <p role="status" className="search-field-demo-muted">
                  Loading rows…
                </p>
              ) : !read.items.length ? (
                <p className="search-field-demo-muted">No rows match.</p>
              ) : (
                <ul className="search-field-demo-choices" aria-label="Customers">
                  {read.items.map(name => (
                    <li key={name}>
                      <Button
                        variant={values.includes(name) ? 'secondary' : 'ghost'}
                        size="sm"
                        aria-pressed={values.includes(name)}
                        onClick={() =>
                          setValues(values.includes(name) ? values.filter(v => v !== name) : [...values, name])
                        }
                      >
                        {name}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <div role="group" aria-label="Sample load state" className="search-field-demo-buttons">
          {modes.map(item => (
            <Button
              key={item.value}
              size="sm"
              variant={mode === item.value ? 'secondary' : 'ghost'}
              aria-pressed={mode === item.value}
              onClick={() => setMode(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="search-field-demo-stack" data-testid="rows-search">
        <SearchField
          id="rows-search"
          label="Search rows"
          placeholder="Search text fields"
          maxLength={255}
          value={rows}
          onChange={setRows}
        />
        <p className="search-field-demo-muted">
          Finds rows whose text fields contain these words. Filters still apply.
        </p>
      </div>
    </Example>
  );
}

const members = [
  { name: 'Ada Lovelace', email: 'ada@northwind.example' },
  { name: 'Grace Hopper', email: 'grace@northwind.example' },
  { name: 'Katherine Johnson', email: 'katherine@northwind.example' },
];
const loadFiles = (term: string) => files.filter(name => matches(name, term));

export function SearchFieldPickers() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Read>('ready');
  const read = useSampleRead(query, loadFiles, mode);
  const [readers, setReaders] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const visible = members.filter(m => matches(`${m.name} ${m.email}`, readers));
  return (
    <Example
      title="Pickers in forms"
      description="File and member pickers search inline. Results load below with a status, an error with retry, or a no-match message."
    >
      <div className="search-field-demo-grid">
        <div className="search-field-demo-stack" data-testid="file-picker">
          <SearchField
            id="contract-files-search"
            label="Search files for Contract"
            placeholder="Search your files"
            value={query}
            maxLength={255}
            onChange={setQuery}
          />
          {read.kind === 'loading' && (
            <p role="status" className="search-field-demo-muted">
              Searching files…
            </p>
          )}
          {read.kind === 'error' && (
            <div className="search-field-demo-stack">
              <p role="alert" className="search-field-demo-danger">
                Couldn’t search files. The file service timed out.
              </p>
              <div>
                <Button variant="outline" size="sm" onClick={() => setMode('ready')}>
                  Retry file search
                </Button>
              </div>
            </div>
          )}
          {read.kind === 'ready' && (
            <ul className="search-field-demo-rows" aria-label="Matching files">
              {read.items.map(name => (
                <li key={name}>{name}</li>
              ))}
              {!read.items.length && <li className="search-field-demo-muted">No files match.</li>}
            </ul>
          )}
          <div role="group" aria-label="File search state" className="search-field-demo-buttons">
            {modes.map(item => (
              <Button
                key={item.value}
                size="xs"
                variant={mode === item.value ? 'secondary' : 'ghost'}
                aria-pressed={mode === item.value}
                onClick={() => setMode(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="search-field-demo-stack" data-testid="reader-picker">
          <SearchField label="Find source readers" value={readers} onChange={setReaders} />
          {visible.length ? (
            <ul className="search-field-demo-choices" aria-label="Readers">
              {visible.map(member => (
                <li key={member.email}>
                  <Button
                    size="sm"
                    variant={picked.includes(member.email) ? 'secondary' : 'ghost'}
                    aria-pressed={picked.includes(member.email)}
                    onClick={() =>
                      setPicked(
                        picked.includes(member.email)
                          ? picked.filter(e => e !== member.email)
                          : [...picked, member.email],
                      )
                    }
                  >
                    {member.name} ({member.email})
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <StatePanel
              kind="empty"
              heading="h4"
              icon={Users}
              title="No members match"
              description="Try another name or email."
            >
              <Button variant="outline" onClick={() => setReaders('')}>
                Clear member search
              </Button>
            </StatePanel>
          )}
          <p className="search-field-demo-muted">{picked.length} readers selected, plus you.</p>
        </div>
      </div>
    </Example>
  );
}

export default function SearchFieldDemo() {
  return (
    <div id="search-field-demo" className="search-field-demo">
      <SearchFieldStates />
      <SearchFieldListFilter />
      <SearchFieldShelves />
      <SearchFieldActions />
      <SearchFieldHeaders />
      <SearchFieldPopover />
      <SearchFieldPickers />
    </div>
  );
}
