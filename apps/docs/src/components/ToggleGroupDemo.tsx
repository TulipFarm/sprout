import { useState, type ReactNode } from 'react';
import { Bold } from 'reicon-react/icons/Bold';
import { ChartBar } from 'reicon-react/icons/ChartBar';
import { Download } from 'reicon-react/icons/Download';
import { Grid } from 'reicon-react/icons/Grid';
import { Italic } from 'reicon-react/icons/Italic';
import { Kanban } from 'reicon-react/icons/Kanban';
import { List } from 'reicon-react/icons/List';
import { Monitor } from 'reicon-react/icons/Monitor';
import { Moon } from 'reicon-react/icons/Moon';
import { Search } from 'reicon-react/icons/Search';
import { Sun } from 'reicon-react/icons/Sun';
import { Underline } from 'reicon-react/icons/Underline';
import { Button } from '@tulipfarm/sprout/button';
import { SettingsGroup, SettingsRow } from '@tulipfarm/sprout/settings-list';
import {
  ToggleGroup,
  ToggleGroupItem,
  toggleGroupVariantNames,
  type ToggleGroupSize,
  type ToggleGroupVariant,
} from '@tulipfarm/sprout/toggle-group';
import DocsSelect from './DocsSelect';
import '../styles/toggle-group-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="toggle-group-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="toggle-group-demo-card-body">{children}</div>
    </section>
  );
}

const layouts = [
  { value: 'table', label: 'Table', icon: Grid },
  { value: 'board', label: 'Board', icon: Kanban },
  { value: 'list', label: 'List', icon: List },
] as const;
type Layout = (typeof layouts)[number]['value'];

/* Each size shows the content Cloud pairs with it. */
function SizeSample({ variant, size }: { variant: ToggleGroupVariant; size: ToggleGroupSize }) {
  if (size === 'sm')
    return (
      <ToggleGroup aria-label={`${variant} small split usage by`} variant={variant} size="sm" defaultValue={['model']}>
        <ToggleGroupItem value="model">Model</ToggleGroupItem>
        <ToggleGroupItem value="agent">Agent</ToggleGroupItem>
        <ToggleGroupItem value="activity">Activity</ToggleGroupItem>
      </ToggleGroup>
    );
  if (size === 'lg')
    return (
      <ToggleGroup aria-label={`${variant} large layout`} variant={variant} size="lg" defaultValue={['board']}>
        {layouts.map(({ value, label, icon: Icon }) => (
          <ToggleGroupItem key={value} value={value}>
            <Icon size={16} aria-hidden="true" />
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  return (
    <ToggleGroup aria-label={`${variant} default text format`} variant={variant} defaultValue={['bold']}>
      <ToggleGroupItem value="bold" aria-label="Bold">
        <Bold aria-hidden="true" />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <Italic aria-hidden="true" />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline" disabled>
        <Underline aria-hidden="true" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

const sizes: { size: ToggleGroupSize; label: string; note: string }[] = [
  { size: 'sm', label: 'Small', note: '28px · split by' },
  { size: 'md', label: 'Default', note: '32px · icon only, one disabled' },
  { size: 'lg', label: 'Large', note: '36px · icon and label' },
];

export function ToggleGroupVariants() {
  return (
    <Example
      title="Variants and sizes"
      description="default is borderless, outline draws a control border on each item. Items sit 8px apart by default."
    >
      <div className="toggle-group-demo-matrix">
        {sizes.map(({ size, label, note }) => (
          <div key={size} className="toggle-group-demo-matrix-row">
            <div className="toggle-group-demo-matrix-label">
              <p>{label}</p>
              <span>{note}</span>
            </div>
            {toggleGroupVariantNames.map(variant => (
              <div key={variant} className="toggle-group-demo-matrix-cell" data-testid={`sample-${variant}-${size}`}>
                <span className="toggle-group-demo-caption">{variant}</span>
                <SizeSample variant={variant} size={size} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Example>
  );
}

type Split = 'model' | 'agent' | 'activity';
const splits: { value: Split; label: string }[] = [
  { value: 'model', label: 'Model' },
  { value: 'agent', label: 'Agent' },
  { value: 'activity', label: 'Activity' },
];
const ranges = [7, 30] as const;
const usage: Record<Split, { label: string; credits: number }[]> = {
  model: [
    { label: 'claude-sonnet-4', credits: 182.4 },
    { label: 'gpt-4.1-mini', credits: 64.15 },
    { label: 'text-embedding-3-large', credits: 9.8 },
  ],
  agent: [
    { label: 'Default assistant', credits: 141.2 },
    { label: 'Release notes writer', credits: 88.6 },
    { label: 'Other agents', credits: 26.55 },
  ],
  activity: [
    { label: 'Normal chat', credits: 141.2 },
    { label: 'Agent', credits: 88.6 },
    { label: 'Knowledge', credits: 26.55 },
  ],
};

export function ToggleGroupSegmented() {
  const [split, setSplit] = useState<Split>('model');
  const [range, setRange] = useState<number>(30);
  const rows = range === 7 ? [] : usage[split];
  const splitLabel = splits.find(item => item.value === split)!.label;
  return (
    <Example
      title="Segmented controls"
      description="spacing={0} joins outline items into one control. Value is controlled and always keeps one choice: pressing the active item again changes nothing."
    >
      <div className="toggle-group-demo-panel">
        <div className="toggle-group-demo-usage-head">
          <div>
            <p className="toggle-group-demo-strong">Usage</p>
            <p className="toggle-group-demo-muted">Credits in the last {range} days · UTC</p>
          </div>
          <div className="toggle-group-demo-wrap">
            <ToggleGroup<Split>
              aria-label="Split usage by"
              variant="outline"
              size="sm"
              spacing={0}
              value={[split]}
              onValueChange={value => {
                if (value[0]) setSplit(value[0]);
              }}
            >
              {splits.map(item => (
                <ToggleGroupItem key={item.value} value={item.value}>
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ToggleGroup
              aria-label="Time range"
              variant="outline"
              size="sm"
              spacing={0}
              value={[String(range)]}
              onValueChange={value => {
                if (value[0]) setRange(Number(value[0]));
              }}
            >
              {ranges.map(days => (
                <ToggleGroupItem key={days} value={String(days)}>
                  {days}d
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="toggle-group-demo-empty" role="status">
            <ChartBar size={20} aria-hidden="true" />
            <p className="toggle-group-demo-strong">No usage in the last {range} days</p>
            <p className="toggle-group-demo-muted">Model calls from chats, agents, and knowledge appear here by day.</p>
          </div>
        ) : (
          <table className="toggle-group-demo-table">
            <caption>
              Usage by {splitLabel.toLowerCase()} · Last {range} days
            </caption>
            <thead>
              <tr>
                <th scope="col">{splitLabel}</th>
                <th scope="col">Credits</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.credits.toLocaleString('en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Example>
  );
}

type Scenario = 'ready' | 'loading' | 'empty' | 'error';
const scenarios: { value: Scenario; label: string }[] = [
  { value: 'ready', label: 'Ready' },
  { value: 'loading', label: 'Loading' },
  { value: 'empty', label: 'Empty' },
  { value: 'error', label: 'Error' },
];
const tasks = [
  { name: 'Order seed trays', status: 'To do' },
  { name: 'Repot the greenhouse basil', status: 'In progress' },
  { name: 'Write the volunteer watering rotation', status: 'Done' },
];

export function ToggleGroupToolbar() {
  const [layout, setLayout] = useState<Layout>('table');
  const [scenario, setScenario] = useState<Scenario>('ready');
  const disabled = scenario === 'loading';
  return (
    <Example
      title="Table toolbar"
      description="Icon and label items pick the layout. The whole group is disabled while rows load, and the toolbar stacks on narrow widths."
    >
      <div className="toggle-group-demo-toolbar-controls">
        <span>Rows</span>
        <DocsSelect<Scenario> label="Rows state" value={scenario} onValueChange={setScenario} items={scenarios} />
      </div>
      <div className="toggle-group-demo-panel toggle-group-demo-query">
        <div className="toggle-group-demo-query-bar">
          <ToggleGroup<Layout>
            aria-label="Layout"
            variant="outline"
            size="sm"
            spacing={0}
            value={[layout]}
            disabled={disabled}
            onValueChange={value => {
              const next = layouts.find(item => item.value === value[0]);
              if (next) setLayout(next.value);
            }}
          >
            {layouts.map(({ value, label, icon: Icon }) => (
              <ToggleGroupItem key={value} value={value}>
                <Icon size={14} aria-hidden="true" />
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <fieldset disabled={disabled} aria-label="Table tools" className="toggle-group-demo-tools">
            <Button variant="outline" size="sm">
              <Search size={14} aria-hidden="true" />
              Search
            </Button>
            <Button variant="outline" size="sm">
              <Download size={14} aria-hidden="true" />
              Export
            </Button>
          </fieldset>
        </div>
        <div
          className="toggle-group-demo-rows"
          data-layout={layout}
          aria-busy={disabled || undefined}
          aria-label={`Tasks as ${layout}`}
          role="region"
        >
          {scenario === 'loading' ? (
            <>
              <span className="sr-only">Loading rows</span>
              {[0, 1, 2].map(index => (
                <div key={index} className="toggle-group-demo-skeleton" aria-hidden="true" />
              ))}
            </>
          ) : scenario === 'empty' ? (
            <p className="toggle-group-demo-muted" role="status">
              No rows yet. Add a row to start this table.
            </p>
          ) : scenario === 'error' ? (
            <p className="toggle-group-demo-error" role="alert">
              Rows could not load. Check your connection and try again.
            </p>
          ) : (
            tasks.map(task => (
              <div key={task.name} className="toggle-group-demo-row">
                <span title={task.name}>{task.name}</span>
                <span>{task.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </Example>
  );
}

const themes = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const;
type Theme = (typeof themes)[number]['value'];

export function ToggleGroupSettings() {
  const [theme, setTheme] = useState<Theme>('system');
  return (
    <Example
      title="Settings row"
      description="A small segmented control as the value of a settings row. This sample keeps the choice in local state."
    >
      <SettingsGroup title="Preferences" titleId="toggle-group-preferences">
        <SettingsRow label="Theme" description="System follows your device. Saved in this browser.">
          <ToggleGroup<Theme>
            aria-label="Theme"
            variant="outline"
            size="sm"
            spacing={0}
            value={[theme]}
            onValueChange={value => {
              const next = themes.find(item => item.value === value[0]);
              if (next) setTheme(next.value);
            }}
          >
            {themes.map(({ value, label, icon: Icon }) => (
              <ToggleGroupItem key={value} value={value}>
                <Icon size={14} aria-hidden="true" />
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </SettingsRow>
      </SettingsGroup>
      <p className="toggle-group-demo-muted" role="status">
        Sample theme: {themes.find(item => item.value === theme)!.label}
      </p>
    </Example>
  );
}

export function ToggleGroupVertical() {
  const [formats, setFormats] = useState<string[]>(['bold', 'italic']);
  return (
    <Example
      title="Vertical and multiple"
      description="multiple lets several items stay pressed. orientation='vertical' stacks items; Up and Down arrows move focus."
    >
      <div className="toggle-group-demo-vertical">
        <div className="toggle-group-demo-stack">
          <span className="toggle-group-demo-caption">default · spacing 2</span>
          <ToggleGroup
            aria-label="Text style"
            orientation="vertical"
            multiple
            value={formats}
            onValueChange={setFormats}
          >
            <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
            <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
            <ToggleGroupItem value="underline">Underline</ToggleGroupItem>
          </ToggleGroup>
          <p className="toggle-group-demo-muted" role="status">
            {formats.length ? `Applied: ${formats.join(', ')}` : 'No style'}
          </p>
        </div>
        <div className="toggle-group-demo-stack">
          <span className="toggle-group-demo-caption">outline · spacing 0</span>
          <ToggleGroup
            aria-label="Visible columns"
            orientation="vertical"
            variant="outline"
            size="sm"
            spacing={0}
            multiple
            defaultValue={['name', 'status']}
          >
            <ToggleGroupItem value="name">Name</ToggleGroupItem>
            <ToggleGroupItem value="status">Status</ToggleGroupItem>
            <ToggleGroupItem value="owner">Owner</ToggleGroupItem>
            <ToggleGroupItem value="due" disabled>
              Due date
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </Example>
  );
}

export default function ToggleGroupDemo() {
  return (
    <div id="toggle-group-demo" className="toggle-group-demo">
      <ToggleGroupVariants />
      <ToggleGroupSegmented />
      <ToggleGroupToolbar />
      <ToggleGroupSettings />
      <ToggleGroupVertical />
    </div>
  );
}
