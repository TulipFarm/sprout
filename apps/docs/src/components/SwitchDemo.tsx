import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, AlertDescription } from '@tulipfarm/sprout/alert';
import { BrandIcon, type Brand } from '@tulipfarm/sprout/brand-icon';
import { Button } from '@tulipfarm/sprout/button';
import { Checkbox } from '@tulipfarm/sprout/checkbox';
import { Label } from '@tulipfarm/sprout/label';
import { SettingsGroup, SettingsRow } from '@tulipfarm/sprout/settings-list';
import { Switch, switchSizeNames, type SwitchSize } from '@tulipfarm/sprout/switch';
import { ToggleGroup, ToggleGroupItem } from '@tulipfarm/sprout/toggle-group';
import '../styles/switch-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="switch-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="switch-demo-card-body">{children}</div>
    </section>
  );
}

type StateName = 'off' | 'on' | 'disabled' | 'disabled-on' | 'invalid';

const states: { name: StateName; label: string }[] = [
  { name: 'off', label: 'Off' },
  { name: 'on', label: 'On' },
  { name: 'disabled', label: 'Disabled' },
  { name: 'disabled-on', label: 'Disabled on' },
  { name: 'invalid', label: 'Invalid' },
];

/* md sits in settings rows and the model access list. sm sits in dense
   control strips, such as the avatar studio's motion toggle. */
const samples: Record<SwitchSize, Record<StateName, string>> = {
  md: {
    off: 'Quiet hours',
    on: 'Email summaries',
    disabled: 'Allow Kimi K2',
    'disabled-on': 'Allow Claude Sonnet 4.5',
    invalid: 'Allow DeepSeek V3.2 as a fallback',
  },
  sm: {
    off: 'Pause motion',
    on: 'Auto compacted',
    disabled: 'Show fallback models',
    'disabled-on': 'Wrap long lines',
    invalid: 'Include archived chats',
  },
};

export function SwitchSizes() {
  return (
    <Example
      title="Sizes and states"
      description="md is a 32 × 18px track for settings rows. sm is a 24 × 14px track for dense control strips."
    >
      <div className="switch-demo-matrix">
        {states.map(state => (
          <div key={state.name} className="switch-demo-matrix-row">
            <p className="switch-demo-matrix-label">{state.label}</p>
            {switchSizeNames.map(size => (
              <div key={size} className="switch-demo-matrix-cell" data-testid={`sample-${size}-${state.name}`}>
                <span className="switch-demo-caption">{size}</span>
                <Label>
                  <Switch
                    size={size}
                    defaultChecked={state.name === 'on' || state.name === 'disabled-on'}
                    disabled={state.name === 'disabled' || state.name === 'disabled-on'}
                    aria-invalid={state.name === 'invalid' ? true : undefined}
                  />
                  {samples[size][state.name]}
                </Label>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Example>
  );
}

export function SwitchMotion() {
  const [paused, setPaused] = useState(false);
  return (
    <Example
      title="Controlled with a label"
      description="Wrap the switch in a Label and pass a state setter to onCheckedChange. Clicking the text toggles it."
    >
      <div className="switch-demo-studio">
        <div className="switch-demo-studio-controls">
          <Label>
            <Switch checked={paused} onCheckedChange={setPaused} />
            Pause motion
          </Label>
        </div>
        <div className="switch-demo-bud" data-paused={paused ? '' : undefined} aria-hidden="true">
          <span />
        </div>
        <p role="status" className="switch-demo-muted">
          {paused ? 'Motion paused.' : 'Bud is idling.'}
        </p>
      </div>
    </Example>
  );
}

export function SwitchSettings() {
  return (
    <Example
      title="In settings rows"
      description="Give the switch an id and pass the same id to SettingsRow htmlFor, so the row label names and toggles it."
    >
      <SettingsGroup title="Local preferences" titleId="switch-demo-local-preferences" heading="h4">
        <SettingsRow label="Email summaries" description="This toggle never sends email." htmlFor="switch-demo-summary">
          <Switch id="switch-demo-summary" defaultChecked />
        </SettingsRow>
        <SettingsRow label="Quiet hours" description="Pause fictional notifications." htmlFor="switch-demo-quiet">
          <Switch id="switch-demo-quiet" />
        </SettingsRow>
        <SettingsRow label="Project name">
          <span className="switch-demo-text">Meadow</span>
        </SettingsRow>
      </SettingsGroup>
    </Example>
  );
}

/* Sample adapter for Cloud's model access list. It fakes the save command,
   a conflicting edit from another admin, and a reload. Nothing is sent. */
interface ModelRow {
  id: string;
  name: string;
  brand: Brand;
  rates: string;
  enabled: boolean;
  revision: number;
}

interface Draft {
  id: string;
  enabled: boolean;
  expectedRevision: number;
}

type Command = { kind: 'idle' } | { kind: 'sending'; draft: Draft } | { kind: 'saved' } | { kind: 'conflict' };

const initialModels: ModelRow[] = [
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet 4.5',
    brand: 'claude',
    rates: '3 / 15',
    enabled: true,
    revision: 4,
  },
  {
    id: 'gpt',
    name: 'GPT-5',
    brand: 'openai',
    rates: '1.25 / 10',
    enabled: true,
    revision: 2,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek V3.2',
    brand: 'deepseek',
    rates: '0.28 / 0.42',
    enabled: false,
    revision: 1,
  },
  {
    id: 'kimi',
    name: 'Kimi K2 Thinking with extended reasoning',
    brand: 'kimi',
    rates: '0.6 / 2.5',
    enabled: true,
    revision: 3,
  },
  {
    id: 'grok',
    name: 'Grok 4',
    brand: 'grok',
    rates: 'Unknown / Unknown',
    enabled: true,
    revision: 1,
  },
];

const saveDelay = 700;

export function SwitchModelAccess() {
  const [role, setRole] = useState<'admin' | 'member'>('admin');
  const [models, setModels] = useState(initialModels);
  const remote = useRef(initialModels);
  const [command, setCommand] = useState<Command>({ kind: 'idle' });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [conflictNext, setConflictNext] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (run: () => void, ms: number) => {
    timers.current.push(window.setTimeout(run, ms));
  };

  const admin = role === 'admin';
  const blocked = !admin || refreshing;
  const unresolved = command.kind === 'sending';
  const conflict = command.kind === 'conflict';

  const submit = (input: Draft) => {
    setDraft(input);
    setCommand({ kind: 'sending', draft: input });
    later(() => {
      const current = remote.current.find(row => row.id === input.id)!;
      if (conflictNext) {
        setConflictNext(false);
        remote.current = remote.current.map(row =>
          row.id === input.id ? { ...row, revision: row.revision + 1 } : row,
        );
        setCommand({ kind: 'conflict' });
        return;
      }
      if (current.revision !== input.expectedRevision) {
        setCommand({ kind: 'conflict' });
        return;
      }
      remote.current = remote.current.map(row =>
        row.id === input.id ? { ...row, enabled: input.enabled, revision: row.revision + 1 } : row,
      );
      setModels(remote.current);
      setDraft(null);
      setCommand({ kind: 'saved' });
    }, saveDelay);
  };

  const reload = () => {
    setRefreshing(true);
    later(() => {
      setModels(remote.current);
      setRefreshing(false);
    }, 500);
  };

  const draftRow = draft && models.find(row => row.id === draft.id);

  return (
    <Example
      title="Model access"
      description="Each row names its switch with aria-label. While a save runs, the row says Saving… and its switch is aria-busy. Every switch is disabled while a save, reload, or conflict is unresolved."
    >
      <div className="switch-demo-toolbar">
        <ToggleGroup
          aria-label="Viewing as"
          variant="outline"
          size="sm"
          spacing={0}
          value={[role]}
          onValueChange={value => {
            const next = value[0];
            if (next === 'admin' || next === 'member') setRole(next);
          }}
        >
          <ToggleGroupItem value="admin">Admin</ToggleGroupItem>
          <ToggleGroupItem value="member">Member</ToggleGroupItem>
        </ToggleGroup>
        <Label>
          <Checkbox checked={conflictNext} onCheckedChange={setConflictNext} disabled={!admin} />
          Next save conflicts with another admin
        </Label>
      </div>
      {models.every(row => !row.enabled) && (
        <Alert>
          <AlertDescription>
            All model families are disabled. Model execution is unavailable until an admin enables an available family.
            Your saved preferences remain unchanged.
          </AlertDescription>
        </Alert>
      )}
      <div className="switch-demo-models">
        <div className="switch-demo-models-head" aria-hidden="true">
          <span>Model</span>
          <span>Rates</span>
          <span>Access</span>
        </div>
        <ul aria-label="Models" aria-busy={refreshing || undefined}>
          {models.map(row => {
            const pending = command.kind === 'sending' && command.draft.id === row.id;
            return (
              <li key={row.id} className="switch-demo-model">
                <div className="switch-demo-model-name">
                  <BrandIcon brand={row.brand} size="sm" />
                  <span className="switch-demo-model-label">{row.name}</span>
                  {pending && <span className="switch-demo-model-note">Saving…</span>}
                </div>
                <span className="switch-demo-model-rates">
                  <span className="switch-demo-sr-only">Credits per 1M input / output tokens: </span>
                  {row.rates}
                </span>
                <div className="switch-demo-model-control">
                  {admin ? (
                    <Switch
                      aria-label={`Allow ${row.name}`}
                      checked={row.enabled}
                      disabled={blocked || unresolved || conflict}
                      aria-busy={pending}
                      onCheckedChange={enabled =>
                        submit({
                          id: row.id,
                          enabled,
                          expectedRevision: row.revision,
                        })
                      }
                    />
                  ) : (
                    <span className="switch-demo-text">{row.enabled ? 'On' : 'Off'}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {admin && conflict && draft && (
        <div className="switch-demo-conflict">
          <Alert variant="destructive">
            <AlertDescription>
              Another admin changed model access. Your intended change is retained. Reload model access, review the
              current state, then apply your change deliberately.
            </AlertDescription>
          </Alert>
          <p className="switch-demo-text">
            Requested change: {draft.enabled ? 'enable' : 'disable'} {draftRow?.name ?? draft.id}.
          </p>
          <div className="switch-demo-actions">
            <Button variant="outline" disabled={refreshing} onClick={reload}>
              Reload model access
            </Button>
            <Button
              disabled={refreshing || !draftRow || draftRow.revision === draft.expectedRevision}
              onClick={() => draftRow && submit({ ...draft, expectedRevision: draftRow.revision })}
            >
              Apply retained change
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(null);
                setCommand({ kind: 'idle' });
              }}
            >
              Discard change
            </Button>
          </div>
        </div>
      )}
      <p role="status" className="switch-demo-muted">
        {refreshing ? 'Reloading model access…' : command.kind === 'saved' ? 'Model access saved.' : ''}
      </p>
    </Example>
  );
}

export default function SwitchDemo() {
  return (
    <div id="switch-demo" className="switch-demo">
      <SwitchSizes />
      <SwitchMotion />
      <SwitchSettings />
      <SwitchModelAccess />
    </div>
  );
}
