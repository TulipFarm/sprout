import { useState, type ReactNode } from 'react';
import { FileText } from 'reicon-react/icons/FileText';
import { Plus } from 'reicon-react/icons/Plus';
import { BrandIcon, type Brand } from '@tulipfarm/sprout/brand-icon';
import { GlassBanner, GlassChip } from '@tulipfarm/sprout/glass-banner';
import { SearchField } from '@tulipfarm/sprout/search-field';
import DocsSelect from './DocsSelect';
import '../styles/glass-banner-demo.css';

// Sample data. The package draws the banner and chips only.
const activity: { brand: Brand; text: string }[] = [
  { brand: 'gmail', text: 'Drafted 3 follow-ups' },
  { brand: 'slack', text: 'Answered in #support' },
  { brand: 'jira', text: 'Triaged 5 new issues' },
];

function Frame({ title, demo, children }: { title: string; demo?: string; children: ReactNode }) {
  return (
    <section className="glass-demo-frame" aria-label={title} data-demo={demo}>
      <div className="glass-demo-frame-bar">{title}</div>
      <div className="glass-demo-frame-body">{children}</div>
    </section>
  );
}

type Content = 'activity' | 'starters';
type Width = 'wide' | 'narrow';

function ActivityChips({ icons }: { icons: boolean }) {
  return activity.map(item => (
    <GlassChip key={item.text} icon={icons ? <BrandIcon brand={item.brand} size="glyph" /> : undefined}>
      {item.text}
    </GlassChip>
  ));
}

function StarterChips({ icons }: { icons: boolean }) {
  return (
    <>
      <GlassChip icon={icons ? <FileText size={16} aria-hidden="true" /> : undefined}>Garden notes</GlassChip>
      <GlassChip icon={icons ? <Plus size={16} aria-hidden="true" /> : undefined}>Plan a project</GlassChip>
      <GlassChip>Try a new workflow</GlassChip>
    </>
  );
}

export function GlassBannerPlayground() {
  const [content, setContent] = useState<Content>('activity');
  const [width, setWidth] = useState<Width>('wide');
  const [caption, setCaption] = useState(true);
  const [icons, setIcons] = useState(true);
  const copy =
    content === 'activity'
      ? {
          title: 'Connect once. Your agents work there.',
          caption: 'Example activity',
        }
      : { title: 'Grow your next idea', caption: 'Fictional project starters' };
  return (
    <section className="glass-demo-playground" aria-label="Glass banner playground">
      <div className="glass-demo-toolbar">
        <label>
          Content
          <DocsSelect
            label="Content"
            value={content}
            items={[
              { value: 'activity', label: 'App activity' },
              { value: 'starters', label: 'Project starters' },
            ]}
            onValueChange={setContent}
          />
        </label>
        <label>
          Width
          <DocsSelect
            label="Width"
            value={width}
            items={[
              { value: 'wide', label: 'Wide (scattered chips)' },
              { value: 'narrow', label: 'Narrow (wrapped chips)' },
            ]}
            onValueChange={setWidth}
          />
        </label>
        <button
          type="button"
          className="glass-demo-toggle"
          aria-pressed={caption}
          onClick={() => setCaption(value => !value)}
        >
          Caption
        </button>
        <button
          type="button"
          className="glass-demo-toggle"
          aria-pressed={icons}
          onClick={() => setIcons(value => !value)}
        >
          Icons
        </button>
      </div>
      <div className="glass-demo-stage" data-width={width}>
        <GlassBanner title={copy.title} caption={caption ? copy.caption : undefined}>
          {content === 'activity' ? <ActivityChips icons={icons} /> : <StarterChips icons={icons} />}
        </GlassBanner>
      </div>
      <p className="glass-demo-foot" aria-live="polite">
        {content === 'activity' ? 'App activity' : 'Project starters'} · {width}
        {caption ? ' · caption' : ' · no caption'}
        {icons ? ' · icons' : ' · no icons'}
      </p>
    </section>
  );
}

export function GlassBannerStarters() {
  return (
    <Frame title="Interactive glass chips" demo="starters">
      <GlassBanner title="Grow your next idea" caption="Fictional project starters">
        <StarterChips icons />
      </GlassBanner>
    </Frame>
  );
}

export function GlassBannerLayouts() {
  return (
    <div className="glass-demo-layouts" data-demo="layouts">
      <Frame title="Wide · chips float over the art">
        <GlassBanner title="Connect once. Your agents work there." caption="Example activity">
          <ActivityChips icons />
        </GlassBanner>
      </Frame>
      <div className="glass-demo-layouts-row">
        <Frame title="Narrow · chips wrap below the title">
          <GlassBanner title="Connect once. Your agents work there." caption="Example activity">
            <ActivityChips icons />
          </GlassBanner>
        </Frame>
        <Frame title="No caption · list named by the title">
          <GlassBanner title="Grow your next idea">
            <GlassChip>Try a new workflow</GlassChip>
            <GlassChip icon={<FileText size={16} aria-hidden="true" />}>
              Summarize the quarterly garden-planning notes for the whole team
            </GlassChip>
          </GlassBanner>
        </Frame>
      </div>
    </div>
  );
}

const apps: {
  brand: Brand;
  name: string;
  category: string;
  connected: boolean;
}[] = [
  { brand: 'gmail', name: 'Gmail', category: 'Communication', connected: true },
  { brand: 'slack', name: 'Slack', category: 'Communication', connected: true },
  {
    brand: 'jira',
    name: 'Jira',
    category: 'Project management',
    connected: false,
  },
  {
    brand: 'github',
    name: 'GitHub',
    category: 'Engineering',
    connected: false,
  },
];
const filters = ['All', 'Connected', 'Communication'] as const;
type Filter = (typeof filters)[number];

export function GlassBannerIntegrations() {
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = apps.filter(app =>
    needle
      ? app.name.toLowerCase().includes(needle)
      : filter === 'All' || (filter === 'Connected' ? app.connected : app.category === filter),
  );
  return (
    <Frame title="Integrations page" demo="integrations">
      <div className="glass-demo-page">
        <div className="glass-demo-page-head">
          <h3>Integrations</h3>
          <p>Connect the apps your agents work in.</p>
        </div>
        <SearchField label="Search apps" value={query} onChange={setQuery} />
        <div className="glass-demo-page-body">
          <nav aria-label="Filter apps" className="glass-demo-rail">
            {filters.map(name => (
              <button
                key={name}
                type="button"
                aria-current={filter === name && !query ? 'page' : undefined}
                onClick={() => {
                  setFilter(name);
                  setQuery('');
                }}
              >
                {name}
              </button>
            ))}
          </nav>
          <div className="glass-demo-page-main">
            {filter === 'All' && !query && (
              <GlassBanner title="Connect once. Your agents work there." caption="Example activity">
                <ActivityChips icons />
              </GlassBanner>
            )}
            {shown.length ? (
              <ul className="glass-demo-apps" aria-label="Apps">
                {shown.map(app => (
                  <li key={app.name}>
                    <BrandIcon brand={app.brand} size="sm" />
                    <span>{app.name}</span>
                    <span className="glass-demo-app-meta">{app.connected ? 'Connected' : app.category}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="glass-demo-empty">No apps match “{query.trim()}”. Try another name or clear your search.</p>
            )}
          </div>
        </div>
      </div>
    </Frame>
  );
}
