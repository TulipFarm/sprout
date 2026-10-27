import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft } from 'reicon-react/icons/ArrowLeft';
import { Copy } from 'reicon-react/icons/Copy';
import { Link } from 'reicon-react/icons/Link';
import { Refresh } from 'reicon-react/icons/Refresh';
import { Upload } from 'reicon-react/icons/Upload';
import { BrandIcon, brandNames, type Brand } from '@tulipfarm/sprout/brand-icon';
import { Button } from '@tulipfarm/sprout/button';
import {
  KnowledgeBase,
  KnowledgeBaseActivity,
  KnowledgeBaseDiagram,
  KnowledgeBaseFooter,
  KnowledgeBaseHeader,
  KnowledgeBaseSources,
  KnowledgeBaseSummary,
  type KnowledgeBaseSource,
} from '@tulipfarm/sprout/knowledge-base';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tulipfarm/sprout/select';
import { SettingsGroup, SettingsRow } from '@tulipfarm/sprout/settings-list';
import { Switch } from '@tulipfarm/sprout/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tulipfarm/sprout/tabs';
import { ToggleGroup, ToggleGroupItem } from '@tulipfarm/sprout/toggle-group';
import { TulipFarmMark } from './TulipFarmMark';
import '../styles/knowledge-base-demo.css';

interface Integration {
  brand: Brand;
  detail: string;
  total: number;
  scope: string;
  steps: string[];
}

const integrations: Record<string, Integration> = {
  slack: {
    brand: 'slack',
    detail: '#support, #eng · live',
    total: 1284,
    scope: 'channels:history, channels:read, files:read',
    steps: ['Open the link as a Slack workspace admin.', 'Pick the channels to index.', 'Approve read-only access.'],
  },
  github: {
    brand: 'github',
    detail: 'acme/platform · README and /docs',
    total: 962,
    scope: 'contents:read, issues:read, metadata:read',
    steps: ['Install the TulipFarm GitHub App.', 'Choose the repositories to index.', 'Confirm read-only access.'],
  },
  jira: {
    brand: 'jira',
    detail: 'SUP and ENG projects · hourly',
    total: 1748,
    scope: 'read:jira-work, read:jira-user',
    steps: ['Sign in to Atlassian as a site admin.', 'Pick the projects to index.', 'Accept the read scopes.'],
  },
  notion: {
    brand: 'notion',
    detail: 'Engineering wiki · on publish',
    total: 818,
    scope: 'Read content',
    steps: ['Open the link and choose a Notion workspace.', 'Select the pages to share.', 'Allow access.'],
  },
  confluence: {
    brand: 'confluence',
    detail: 'ENG and HR spaces · daily',
    total: 2210,
    scope: 'read:confluence-content.all',
    steps: ['Sign in to Atlassian.', 'Choose the spaces to index.', 'Accept the read scope.'],
  },
  'google-drive': {
    brand: 'google-drive',
    detail: 'Shared drive “Policies” · hourly',
    total: 540,
    scope: 'drive.readonly',
    steps: ['Sign in with Google Workspace.', 'Pick the shared drives to index.', 'Allow read-only access.'],
  },
};

const source = (id: string, change: Partial<KnowledgeBaseSource>): KnowledgeBaseSource => ({
  id,
  name: brandNames[integrations[id]!.brand],
  brand: integrations[id]!.brand,
  detail: integrations[id]!.detail,
  status: 'available',
  ...change,
});

const scenarios = {
  indexing: () => [
    source('slack', { status: 'connected', chunks: 1284, newChunks: 36 }),
    source('github', { status: 'connected', chunks: 962, newChunks: 12 }),
    source('jira', { status: 'syncing', progress: 38, chunks: 664 }),
    source('notion', { status: 'connected', chunks: 818 }),
    source('confluence', {}),
    source('google-drive', {}),
  ],
  live: () => [
    source('slack', { status: 'connected', chunks: 1284, newChunks: 36 }),
    source('github', { status: 'connected', chunks: 962 }),
    source('jira', { status: 'connected', chunks: 1748 }),
    source('notion', { status: 'connected', chunks: 818 }),
    source('confluence', { status: 'connected', chunks: 2210 }),
    source('google-drive', {}),
  ],
  error: () => [
    source('slack', { status: 'connected', chunks: 1284 }),
    source('github', { status: 'connected', chunks: 962 }),
    source('jira', { status: 'error', progress: 64, chunks: 1118, error: 'Token expired. Reconnect to resume.' }),
    source('notion', { status: 'connected', chunks: 818 }),
    source('confluence', {}),
    source('google-drive', {}),
  ],
  paused: () => [
    source('slack', { status: 'connected', chunks: 1284 }),
    source('github', { status: 'paused', chunks: 962 }),
    source('jira', { status: 'connected', chunks: 1748 }),
    source('notion', { status: 'paused', chunks: 818 }),
    source('confluence', {}),
    source('google-drive', {}),
  ],
  empty: () => Object.keys(integrations).map(id => source(id, {})),
} satisfies Record<string, () => KnowledgeBaseSource[]>;

type Scenario = keyof typeof scenarios;

const scenarioLabels: Record<Scenario, string> = {
  indexing: 'Indexing',
  live: 'Live',
  error: 'Error',
  paused: 'Paused',
  empty: 'Empty',
};

const integrationHash = (id: string) => `#integrations/${id}`;

/** A knowledge base with live sources, an integrations page behind Connect, and settings. */
export function KnowledgeBasePlayground() {
  const [scenario, setScenario] = useState<Scenario>('indexing');
  const [sources, setSources] = useState<KnowledgeBaseSource[]>(scenarios.indexing);
  const choose = (next: Scenario) => {
    setScenario(next);
    setSources(scenarios[next]());
  };
  const [route, setRoute] = useState<string | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const read = () => {
      const match = /^#integrations\/(.+)$/.exec(window.location.hash);
      setRoute(match && integrations[match[1]!] ? match[1]! : null);
    };
    // Astro's router moves to same-page hashes with pushState, which fires no hashchange.
    const afterClick = () => window.setTimeout(read);
    read();
    window.addEventListener('hashchange', read);
    window.addEventListener('popstate', read);
    document.addEventListener('click', afterClick);
    return () => {
      window.removeEventListener('hashchange', read);
      window.removeEventListener('popstate', read);
      document.removeEventListener('click', afterClick);
    };
  }, []);

  useEffect(() => {
    if (route) panel.current?.scrollIntoView({ block: 'nearest' });
  }, [route]);

  // Syncs advance; connected sources keep receiving a trickle of new chunks.
  useEffect(() => {
    let beat = 0;
    const timer = window.setInterval(() => {
      beat += 1;
      setSources(current =>
        current.map(item => {
          if (item.status === 'syncing') {
            const total = integrations[item.id]?.total ?? item.chunks ?? 200;
            const progress = Math.min(100, (item.progress ?? 0) + 3);
            const chunks = Math.round((total * progress) / 100);
            return progress >= 100
              ? { ...item, status: 'connected', progress: null, chunks, newChunks: chunks }
              : { ...item, progress, chunks };
          }
          if (item.status === 'connected' && beat % 6 === item.id.length % 6) {
            const added = 3 + ((beat * 7 + item.id.length) % 14);
            return { ...item, chunks: (item.chunks ?? 0) + added, newChunks: (item.newChunks ?? 0) + added };
          }
          return item;
        }),
      );
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  const set = (id: string, change: Partial<KnowledgeBaseSource>) =>
    setSources(current => current.map(item => (item.id === id ? { ...item, ...change } : item)));

  const onUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    const id = `upload-${Date.now()}`;
    const name = files.length === 1 ? files[0]!.name : `${files.length} uploaded files`;
    setSources(current => [
      ...current,
      {
        id,
        name,
        icon: <Upload aria-hidden="true" />,
        detail: 'Uploaded files',
        status: 'syncing',
        progress: 0,
        chunks: 0,
      },
    ]);
    event.target.value = '';
  };

  const firstAvailable = sources.find(item => item.status === 'available');

  return (
    <div ref={panel} className="knowledge-base-demo">
      {!route && (
        <ToggleGroup
          aria-label="Demo state"
          size="sm"
          variant="outline"
          spacing={0}
          className="knowledge-base-demo-states"
          value={[scenario]}
          onValueChange={next => next[0] && choose(next[0] as Scenario)}
        >
          {(Object.keys(scenarios) as Scenario[]).map(key => (
            <ToggleGroupItem key={key} value={key}>
              {scenarioLabels[key]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
      {route ? (
        <IntegrationPage
          id={route}
          connected={sources.find(item => item.id === route)?.status !== 'available'}
          onAuthorize={() => {
            set(route, { status: 'syncing', progress: 0, chunks: 0, newChunks: null });
            window.location.hash = 'knowledge-base';
            setRoute(null);
          }}
        />
      ) : (
        <KnowledgeBase sources={sources} className="knowledge-base-demo-panel">
          <KnowledgeBaseHeader subtitle="Acme Assist" />
          <KnowledgeBaseDiagram mark={<TulipFarmMark />} className="knowledge-base-demo-diagram">
            <KnowledgeBaseActivity />
          </KnowledgeBaseDiagram>
          <KnowledgeBaseSummary>
            <Button size="sm" nativeButton={false} render={<a href={integrationHash(firstAvailable?.id ?? 'slack')} />}>
              <Link data-icon="inline-start" aria-hidden="true" />
              Connect source
            </Button>
            <Button variant="outline" size="sm" onClick={() => upload.current?.click()}>
              <Upload data-icon="inline-start" aria-hidden="true" />
              Upload files
            </Button>
            <input
              ref={upload}
              type="file"
              multiple
              hidden
              accept=".pdf,.md,.txt,.docx,.html,.csv"
              onChange={onUpload}
            />
          </KnowledgeBaseSummary>
          <Tabs defaultValue="sources" className="knowledge-base-demo-tabs">
            <TabsList variant="line" className="knowledge-base-demo-tablist">
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="sources">
              <KnowledgeBaseSources
                connectHref={item => integrationHash(item.id)}
                onRetry={item => set(item.id, { status: 'syncing', error: undefined })}
                onCancelSync={item =>
                  set(
                    item.id,
                    item.chunks ? { status: 'paused', progress: null } : { status: 'available', progress: null },
                  )
                }
                onSync={item => set(item.id, { status: 'syncing', progress: 0, newChunks: null })}
                onPauseSync={item => set(item.id, { status: 'paused', newChunks: null })}
                onResumeSync={item => set(item.id, { status: 'connected' })}
                onSettings={item => (window.location.hash = integrationHash(item.id))}
                onDisconnect={item =>
                  item.id.startsWith('upload-')
                    ? setSources(current => current.filter(other => other.id !== item.id))
                    : set(item.id, {
                        status: 'available',
                        chunks: null,
                        newChunks: null,
                        progress: null,
                        error: undefined,
                      })
                }
              />
            </TabsContent>
            <TabsContent value="settings">
              <IndexSettings
                onReindex={() =>
                  setSources(current =>
                    current.map(item =>
                      item.status === 'connected' ? { ...item, status: 'syncing', progress: 0, newChunks: null } : item,
                    ),
                  )
                }
              />
            </TabsContent>
          </Tabs>
          <KnowledgeBaseFooter>
            <Button variant="ghost" size="sm" onClick={() => choose(scenario)}>
              <Refresh data-icon="inline-start" aria-hidden="true" />
              Reset demo
            </Button>
          </KnowledgeBaseFooter>
        </KnowledgeBase>
      )}
    </div>
  );
}

function Choice({ id, value, items }: { id: string; value: string; items: { value: string; label: string }[] }) {
  const [current, setCurrent] = useState(value);
  return (
    <Select items={items} value={current} onValueChange={next => next !== null && setCurrent(next)}>
      <SelectTrigger id={id} size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map(item => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function IndexSettings({ onReindex }: { onReindex: () => void }) {
  return (
    <div className="knowledge-base-demo-settings">
      <SettingsGroup title="Syncing" heading="h3">
        <SettingsRow
          label="Sync frequency"
          description="How often connected sources are checked for changes."
          htmlFor="kb-frequency"
        >
          <Choice
            id="kb-frequency"
            value="live"
            items={[
              { value: 'live', label: 'As it changes' },
              { value: 'hourly', label: 'Every hour' },
              { value: 'daily', label: 'Once a day' },
            ]}
          />
        </SettingsRow>
        <SettingsRow
          label="Index new channels and spaces"
          description="Add new Slack channels, repos, and spaces as they appear."
          htmlFor="kb-auto"
        >
          <Switch id="kb-auto" defaultChecked />
        </SettingsRow>
        <SettingsRow
          label="Index attachments"
          description="Read PDFs, docs, and images attached to messages and tickets."
          htmlFor="kb-attachments"
        >
          <Switch id="kb-attachments" defaultChecked />
        </SettingsRow>
        <SettingsRow
          label="Include private content"
          description="Answers only cite private content to people who can already see it."
          htmlFor="kb-private"
        >
          <Switch id="kb-private" />
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title="Indexing" heading="h3">
        <SettingsRow
          label="Chunk size"
          description="Smaller chunks cite more precisely; larger ones keep more context."
          htmlFor="kb-chunk"
        >
          <Choice
            id="kb-chunk"
            value="512"
            items={[
              { value: '256', label: '256 tokens' },
              { value: '512', label: '512 tokens' },
              { value: '1024', label: '1,024 tokens' },
            ]}
          />
        </SettingsRow>
        <SettingsRow
          label="Keep history"
          description="Content older than this is dropped from the index."
          htmlFor="kb-retention"
        >
          <Choice
            id="kb-retention"
            value="2y"
            items={[
              { value: '90d', label: '90 days' },
              { value: '1y', label: '1 year' },
              { value: '2y', label: '2 years' },
              { value: 'all', label: 'Everything' },
            ]}
          />
        </SettingsRow>
        <SettingsRow
          label="Rebuild index"
          description="Re-read every connected source. Answers keep working meanwhile."
        >
          <Button variant="outline" size="sm" onClick={onReindex}>
            Re-index all
          </Button>
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
}

function IntegrationPage({ id, connected, onAuthorize }: { id: string; connected: boolean; onAuthorize: () => void }) {
  const integration = integrations[id]!;
  const name = brandNames[integration.brand];
  const link = `https://app.tulipfarm.ai/integrations/${id}/authorize?workspace=acme`;
  const [copied, setCopied] = useState(false);
  return (
    <section className="knowledge-base-demo-integrations" aria-labelledby="kb-integration-title">
      <header className="knowledge-base-demo-integrations-header">
        <Button variant="ghost" size="sm" nativeButton={false} render={<a href="#knowledge-base" />}>
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Knowledge base
        </Button>
        <span className="knowledge-base-demo-crumb">Integrations</span>
      </header>
      <div className="knowledge-base-demo-integration">
        <BrandIcon brand={integration.brand} size="lg" aria-hidden="true" />
        <div>
          <h2 id="kb-integration-title" className="knowledge-base-demo-integration-title">
            Connect {name}
          </h2>
          <p className="knowledge-base-demo-integration-lead">
            TulipFarm reads {name} with read-only access, then chunks and embeds it so answers can cite it.
          </p>
        </div>
      </div>
      <ol className="knowledge-base-demo-steps">
        {integration.steps.map(step => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="knowledge-base-demo-link">
        <label htmlFor="kb-connect-link" className="knowledge-base-demo-link-label">
          Connection link
        </label>
        <p className="knowledge-base-demo-link-hint">
          Open it yourself, or send it to the {name} admin who can approve access.
        </p>
        <div className="knowledge-base-demo-link-row">
          <input
            id="kb-connect-link"
            readOnly
            value={link}
            className="knowledge-base-demo-link-input"
            onFocus={event => event.currentTarget.select()}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard?.writeText(link);
              setCopied(true);
            }}
          >
            <Copy data-icon="inline-start" aria-hidden="true" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <p className="knowledge-base-demo-scope">Requested access: {integration.scope}</p>
      </div>
      <div className="knowledge-base-demo-integration-actions">
        {connected ? (
          <p className="knowledge-base-demo-scope">{name} is already connected.</p>
        ) : (
          <Button onClick={onAuthorize}>Authorize {name}</Button>
        )}
        <Button variant="ghost" nativeButton={false} render={<a href="#knowledge-base" />}>
          Cancel
        </Button>
      </div>
    </section>
  );
}
