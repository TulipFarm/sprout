import { Fragment, useState, type MouseEvent, type ReactNode } from 'react';
import { Folder } from 'reicon-react/icons/Folder';
import { Home } from 'reicon-react/icons/Home';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@tulipfarm/sprout/breadcrumb';
import { Button } from '@tulipfarm/sprout/button';
import '../styles/breadcrumb-demo.css';
import DocsSelect from './DocsSelect';

const stay = (event: MouseEvent) => event.preventDefault();

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="breadcrumb-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="breadcrumb-demo-card-body">{children}</div>
    </section>
  );
}

function Hidden({ children }: { children: ReactNode }) {
  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbEllipsis />
        <span className="sr-only">{children}</span>
      </BreadcrumbItem>
    </>
  );
}

type Crumb = { id: string; name: string };

type Source = 'files' | 'drive';
const sources: { value: Source; label: string }[] = [
  { value: 'files', label: 'Workspace files' },
  { value: 'drive', label: 'Google Drive' },
];

type PathState = 'root' | 'nested' | 'restricted' | 'shared' | 'search' | 'loading' | 'error';
const pathStates: Record<Source, { value: PathState; label: string }[]> = {
  files: [
    { value: 'root', label: 'Root' },
    { value: 'nested', label: 'Nested folder' },
    { value: 'restricted', label: 'Folders you can’t open' },
    { value: 'search', label: 'Search results' },
  ],
  drive: [
    { value: 'root', label: 'Root' },
    { value: 'nested', label: 'Higher folders hidden' },
    { value: 'restricted', label: 'Folders you can’t open' },
    { value: 'shared', label: 'Shared with me' },
    { value: 'search', label: 'Search results' },
    { value: 'loading', label: 'Loading' },
    { value: 'error', label: 'Error' },
  ],
};

const library: Crumb[] = [
  { id: 'finance', name: 'Finance' },
  {
    id: 'board',
    name: 'Q3 board meeting — statements and supporting schedules',
  },
  { id: 'drafts', name: 'Drafts' },
];

function FolderPath() {
  const [source, setSource] = useState<Source>('files');
  const [state, setState] = useState<PathState>('nested');
  const [depth, setDepth] = useState(library.length);
  const root = source === 'files' ? 'All files' : 'Google Drive';
  const atRoot = state === 'root' || (state === 'nested' && depth === 0);
  const trail = library.slice(0, depth);
  const go = (next: number) => (event: MouseEvent) => {
    event.preventDefault();
    if (next === 0) setState('root');
    else if (state === 'root') setState('nested');
    setDepth(next);
  };
  const crumbs = (items: Crumb[]) =>
    items.map((crumb, index) => (
      <Fragment key={crumb.id}>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {index === items.length - 1 ? (
            <BreadcrumbPage truncate>{crumb.name}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink truncate href={`#folder-${crumb.id}`} onClick={go(library.indexOf(crumb) + 1)}>
              {crumb.name}
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
      </Fragment>
    ));

  return (
    <>
      <div className="breadcrumb-demo-toolbar">
        <label>
          Source
          <DocsSelect<Source>
            label="Source"
            value={source}
            onValueChange={next => {
              setSource(next);
              setState('nested');
              setDepth(library.length);
            }}
            items={sources}
          />
        </label>
        <label>
          State
          <DocsSelect<PathState>
            label="Path state"
            value={state}
            onValueChange={next => {
              setState(next);
              setDepth(library.length);
            }}
            items={pathStates[source]}
          />
        </label>
      </div>
      <div className="breadcrumb-demo-files-bar">
        <Breadcrumb aria-label="Folder path">
          <BreadcrumbList>
            <BreadcrumbItem>
              {atRoot ? (
                <BreadcrumbPage>{root}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href="#files-root" onClick={go(0)}>
                  {root}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {state === 'search' ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage truncate>Search results</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : state === 'shared' ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage truncate>Shared with me</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : state === 'loading' ? (
              <Hidden>Loading folder path</Hidden>
            ) : state === 'error' ? (
              <Hidden>Folder path unavailable</Hidden>
            ) : state === 'restricted' ? (
              <>
                <Hidden>{source === 'files' ? 'Folders you cannot open' : 'Folders you can’t open'}</Hidden>
                {crumbs(trail.slice(1))}
              </>
            ) : (
              !atRoot && (
                <>
                  {source === 'drive' && <Hidden>Higher folders not shown</Hidden>}
                  {crumbs(trail)}
                </>
              )
            )}
          </BreadcrumbList>
        </Breadcrumb>
        <input
          type="search"
          className="breadcrumb-demo-search"
          aria-label={`Search ${root}`}
          placeholder={`Search ${root}`}
        />
      </div>
      {state === 'error' ? (
        <p className="breadcrumb-demo-note" role="alert">
          We couldn’t load this folder’s path. Its files are still listed below.
        </p>
      ) : state === 'loading' ? (
        <p className="breadcrumb-demo-note" role="status">
          Loading folder path…
        </p>
      ) : null}
    </>
  );
}

type Section = 'mine' | 'shared';
const sections: Record<Section, string> = {
  mine: 'My files',
  shared: 'Shared with me',
};
const folders: Record<string, Crumb[]> = {
  mine: [
    { id: 'clients', name: 'Clients' },
    { id: 'contracts', name: 'Contracts' },
  ],
  shared: [{ id: 'ops', name: 'Operations handbook and vendor onboarding' }],
  clients: [{ id: 'northwind', name: 'Northwind Traders — renewal 2027' }],
  northwind: [{ id: 'signed', name: 'Signed agreements' }],
  contracts: [],
  ops: [{ id: 'vendors', name: 'Vendors' }],
  vendors: [],
  signed: [],
};

function DestinationPicker() {
  const [section, setSection] = useState<Section>('mine');
  const [path, setPath] = useState<Crumb[]>([
    { id: 'clients', name: 'Clients' },
    { id: 'northwind', name: 'Northwind Traders — renewal 2027' },
  ]);
  const [moving, setMoving] = useState(false);
  const here = path.at(-1)?.id ?? section;
  const list = folders[here] ?? [];

  return (
    <div className="breadcrumb-demo-picker">
      <div role="group" aria-label="Location" className="breadcrumb-demo-row">
        {(['mine', 'shared'] as const).map(key => (
          <Button
            key={key}
            variant={section === key ? 'secondary' : 'ghost'}
            size="sm"
            disabled={moving}
            aria-pressed={section === key}
            onClick={() => {
              setSection(key);
              setPath([]);
            }}
          >
            {sections[key]}
          </Button>
        ))}
      </div>
      <Breadcrumb aria-label="Destination path" className="breadcrumb-demo-narrow">
        <BreadcrumbList>
          <BreadcrumbItem>
            {path.length === 0 ? (
              <BreadcrumbPage>{sections[section]}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink
                render={<Button variant="ghost" size="sm" disabled={moving} onClick={() => setPath([])} />}
              >
                {sections[section]}
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {path.map((crumb, index) => (
            <Fragment key={crumb.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {index === path.length - 1 ? (
                  <BreadcrumbPage truncate>{crumb.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    truncate
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={moving}
                        onClick={() => setPath(path.slice(0, index + 1))}
                      />
                    }
                  >
                    {crumb.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      {list.length ? (
        <ul aria-label="Folders" className="breadcrumb-demo-folders">
          {list.map(folder => (
            <li key={folder.id}>
              <Button variant="ghost" size="md" disabled={moving} onClick={() => setPath([...path, folder])}>
                <Folder size={16} aria-hidden="true" />
                <span className="breadcrumb-demo-folder-name" title={folder.name}>
                  {folder.name}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="breadcrumb-demo-note">No folders here.</p>
      )}
      <div className="breadcrumb-demo-row">
        <Button
          variant={moving ? 'outline' : 'default'}
          size="sm"
          aria-pressed={moving}
          onClick={() => setMoving(!moving)}
        >
          {moving ? 'Stop moving' : 'Move here'}
        </Button>
        {moving && (
          <span className="breadcrumb-demo-note" role="status">
            Moving 3 files… the path is locked.
          </span>
        )}
      </div>
    </div>
  );
}

function PageTrail({ title, chrome }: { title: string; chrome?: boolean }) {
  return (
    <Breadcrumb aria-label="Breadcrumb">
      <BreadcrumbList wrap={false}>
        <BreadcrumbItem>
          <BreadcrumbLink href="#automations" onClick={stay}>
            Automations
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem aria-current="page">
          <h4 className={chrome ? 'breadcrumb-demo-title breadcrumb-demo-title-chrome' : 'breadcrumb-demo-title'}>
            {title}
          </h4>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default function BreadcrumbDemo() {
  return (
    <div className="breadcrumb-demo" id="breadcrumb-demo">
      <Example
        title="Path with current page and overflow"
        description="Links, an icon link, collapsed middle folders, and the current page."
      >
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#home" onClick={stay}>
                <Home aria-hidden="true" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <Hidden>Higher folders not shown</Hidden>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#projects" onClick={stay}>
                Projects
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Meadow</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Example>

      <Example
        title="Page header trail"
        description="One line. The parent link stays whole and the page title shrinks."
      >
        <div className="breadcrumb-demo-page">
          <PageTrail title="Weekly revenue digest" />
        </div>
        <div className="breadcrumb-demo-chrome" aria-label="App header" role="group">
          <PageTrail chrome title="Weekly revenue digest for the finance and operations team" />
        </div>
      </Example>

      <Example
        title="Folder path"
        description="Files and Google Drive paths with hidden, loading, error, and search states."
      >
        <FolderPath />
      </Example>

      <Example
        title="Destination picker"
        description="Crumbs rendered as small ghost buttons. They lock while files move."
      >
        <DestinationPicker />
      </Example>

      <Example title="Direction" description="Separators point along the reading direction.">
        {(['ltr', 'rtl'] as const).map(dir => (
          <div key={dir} dir={dir} className="breadcrumb-demo-direction">
            <Breadcrumb aria-label={dir === 'rtl' ? 'مسار التنقل' : 'Breadcrumb, left to right'}>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#example" onClick={stay}>
                    {dir === 'rtl' ? 'المشاريع' : 'Projects'}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{dir === 'rtl' ? 'الحديقة' : 'Garden'}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        ))}
      </Example>
    </div>
  );
}
