import { useId, useState, type ReactNode } from 'react';
import { FileText } from 'reicon-react/icons/FileText';
import { Folder } from 'reicon-react/icons/Folder';
import { Alert, AlertDescription } from '@tulipfarm/sprout/alert';
import { Button } from '@tulipfarm/sprout/button';
import { Checkbox, checkboxVariantNames, type CheckboxVariant } from '@tulipfarm/sprout/checkbox';
import { CheckboxField, ChoiceGroup } from '@tulipfarm/sprout/field';
import { Input } from '@tulipfarm/sprout/input';
import { Label } from '@tulipfarm/sprout/label';
import { SettingsGroup, SettingsRow } from '@tulipfarm/sprout/settings-list';
import '../styles/checkbox-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="checkbox-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="checkbox-demo-card-body">{children}</div>
    </section>
  );
}

type StateName = 'unchecked' | 'checked' | 'mixed' | 'disabled' | 'disabled-checked' | 'invalid';

const states: { name: StateName; label: string }[] = [
  { name: 'unchecked', label: 'Unchecked' },
  { name: 'checked', label: 'Checked' },
  { name: 'mixed', label: 'Mixed' },
  { name: 'disabled', label: 'Disabled' },
  { name: 'disabled-checked', label: 'Disabled checked' },
  { name: 'invalid', label: 'Invalid' },
];

/* Each variant shows the labels Cloud pairs with it: primary boxes for
   settings and consent, neutral boxes for filter lists. */
const samples: Record<CheckboxVariant, Record<StateName, string>> = {
  default: {
    unchecked: 'Include child pages',
    checked: 'Enable Gmail heartbeat',
    mixed: 'Select all rows on this page',
    disabled: 'Shared business account',
    'disabled-checked': 'Enable reviewed tool search_issues',
    invalid: 'I understand that workspace data is retained, not erased.',
  },
  neutral: {
    unchecked: 'Archived tables',
    checked: 'Owned by me',
    mixed: 'All Slack channels',
    disabled: 'Deleted sources',
    'disabled-checked': 'Shared with me',
    invalid: 'Choose at least one source type',
  },
};

function StateSample({ variant, state }: { variant: CheckboxVariant; state: StateName }) {
  // A mixed box resolves to checked on click, as a "select all" box would.
  const [mixed, setMixed] = useState(state === 'mixed');
  return (
    <Label>
      <Checkbox
        variant={variant}
        defaultChecked={state === 'checked' || state === 'disabled-checked'}
        indeterminate={mixed}
        onCheckedChange={() => setMixed(false)}
        disabled={state === 'disabled' || state === 'disabled-checked'}
        aria-invalid={state === 'invalid' ? true : undefined}
      />
      {samples[variant][state]}
    </Label>
  );
}

export function CheckboxVariants() {
  return (
    <Example
      title="Variants and states"
      description="default fills with the primary color. neutral fills with the text color for filter lists. Checkbox has one 16px size."
    >
      <div className="checkbox-demo-matrix">
        {states.map(state => (
          <div key={state.name} className="checkbox-demo-matrix-row">
            <p className="checkbox-demo-matrix-label">{state.label}</p>
            {checkboxVariantNames.map(variant => (
              <div key={variant} className="checkbox-demo-matrix-cell" data-testid={`sample-${variant}-${state.name}`}>
                <span className="checkbox-demo-caption">{variant}</span>
                <StateSample variant={variant} state={state.name} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Example>
  );
}

export function CheckboxLabels() {
  const [business, setBusiness] = useState(false);
  const [shared, setShared] = useState(true);
  const [moveConfirmed, setMoveConfirmed] = useState(false);
  const [use, setUse] = useState(true);
  return (
    <Example
      title="Naming"
      description="Wrap the box in a Label, point a Label at its id, hide the text with an sr-only span, or use aria-label when a row already says what it is."
    >
      <div className="checkbox-demo-panel">
        <span className="checkbox-demo-caption">Wrapping Label</span>
        <Label>
          <Checkbox checked={business} onCheckedChange={checked => setBusiness(checked)} />
          Shared business account
        </Label>
        <span className="checkbox-demo-caption">Label htmlFor</span>
        <div className="checkbox-demo-inline checkbox-demo-inline-start">
          <Checkbox
            className="checkbox-demo-first-line"
            id="checkbox-demo-share"
            checked={shared}
            onCheckedChange={setShared}
          />
          <Label htmlFor="checkbox-demo-share">Share with selected workspace members</Label>
        </div>
        <span className="checkbox-demo-caption">Long label, aligned to the first line</span>
        <div className="checkbox-demo-inline checkbox-demo-inline-start">
          <Checkbox
            id="checkbox-demo-move"
            className="checkbox-demo-first-line"
            checked={moveConfirmed}
            onCheckedChange={setMoveConfirmed}
          />
          <Label htmlFor="checkbox-demo-move">
            I understand that every project member can read the full history of this chat, including earlier messages.
          </Label>
        </div>
        <span className="checkbox-demo-caption">Screen reader label</span>
        <div className="checkbox-demo-person">
          <span>Priya Raman</span>
          <Label>
            <Checkbox checked={use} onCheckedChange={setUse} />
            <span className="checkbox-demo-sr-only">Use Priya Raman</span>
          </Label>
        </div>
      </div>
    </Example>
  );
}

export function CheckboxConfirm() {
  const [confirmed, setConfirmed] = useState(false);
  const [state, setState] = useState<'idle' | 'checking' | 'approved'>('idle');
  const blocked = state === 'approved';
  const checking = state === 'checking';
  return (
    <Example
      title="Confirm before acting"
      description="The action stays disabled until the box is checked. The box locks while the request runs and after it is approved."
    >
      <div className="checkbox-demo-panel">
        <p className="checkbox-demo-text">
          Upload <strong>q3-board-summary.pdf</strong> to the Finance shared drive.
        </p>
        <Label>
          <Checkbox checked={confirmed} onCheckedChange={setConfirmed} disabled={blocked || checking} />
          I reviewed the file and Details and authorize this exact change
        </Label>
        <div className="checkbox-demo-row">
          <Button
            disabled={blocked || checking || !confirmed}
            aria-busy={checking}
            onClick={() => {
              setState('checking');
              window.setTimeout(() => setState('approved'), 900);
            }}
          >
            {checking ? 'Approving…' : 'Approve'}
          </Button>
          <Button
            variant="outline"
            disabled={checking}
            onClick={() => {
              setState('idle');
              setConfirmed(false);
            }}
          >
            Reset sample
          </Button>
        </div>
        <p role="status" className="checkbox-demo-muted">
          {state === 'approved'
            ? 'Approved. The sample is locked.'
            : checking
              ? 'Approving the sample action…'
              : confirmed
                ? 'Ready to approve.'
                : 'Check the box to enable Approve.'}
        </p>
      </div>
    </Example>
  );
}

type Permission = 'read' | 'use' | 'manage';
const permissionLabels: Record<Permission, string> = {
  read: 'Read metadata',
  use: 'Use integration',
  manage: 'Manage integration',
};
const teams = [
  { id: 'platform', name: 'Platform' },
  { id: 'support', name: 'Customer support' },
];

export function CheckboxGrants() {
  const [locked, setLocked] = useState(false);
  const [grants, setGrants] = useState<Record<string, Permission[]>>({
    platform: ['read', 'use'],
    support: ['use'],
  });
  const invalid = Object.values(grants).some(permissions => permissions.length > 0 && !permissions.includes('read'));
  return (
    <Example
      title="Permission grid"
      description="One box per team and permission inside a fieldset. Disabling the fieldset locks every box while a save runs."
    >
      <div className="checkbox-demo-panel">
        <Label>
          <Checkbox variant="neutral" checked={locked} onCheckedChange={setLocked} />
          Simulate a save in progress
        </Label>
        <fieldset disabled={locked} className="checkbox-demo-fieldset">
          <legend className="checkbox-demo-sr-only">Team grants</legend>
          {teams.map(team => (
            <fieldset key={team.id} className="checkbox-demo-team">
              <legend>{team.name}</legend>
              <div className="checkbox-demo-wrap">
                {(Object.keys(permissionLabels) as Permission[]).map(permission => {
                  const id = `checkbox-demo-${team.id}-${permission}`;
                  const current = grants[team.id] ?? [];
                  const missingRead = permission === 'read' && current.length > 0 && !current.includes('read');
                  return (
                    <div key={permission} className="checkbox-demo-inline">
                      <Checkbox
                        id={id}
                        checked={current.includes(permission)}
                        aria-invalid={missingRead || undefined}
                        aria-describedby={missingRead ? 'checkbox-demo-grants-error' : undefined}
                        onCheckedChange={checked =>
                          setGrants({
                            ...grants,
                            [team.id]: checked ? [...current, permission] : current.filter(item => item !== permission),
                          })
                        }
                      />
                      <Label htmlFor={id}>{permissionLabels[permission]}</Label>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </fieldset>
        {invalid && (
          <Alert variant="destructive" id="checkbox-demo-grants-error">
            <AlertDescription>Select Read metadata explicitly for every team receiving Use or Manage.</AlertDescription>
          </Alert>
        )}
      </div>
    </Example>
  );
}

const spaces = [
  { key: 'ENG', title: 'Engineering handbook' },
  { key: 'OPS', title: 'Operations runbooks' },
  { key: 'SUP', title: 'Support playbooks' },
  { key: 'FIN', title: 'Finance policies' },
  { key: 'MKT', title: 'Marketing launches' },
];
const limit = 3;

export function CheckboxLimit() {
  const [selected, setSelected] = useState<string[]>(['ENG', 'OPS']);
  const [descendants, setDescendants] = useState(true);
  return (
    <Example
      title="Selection limit"
      description="Unchecked boxes disable once the limit is reached, so a checked box can still be cleared. The count is announced as a status."
    >
      <div className="checkbox-demo-panel">
        <fieldset className="checkbox-demo-fieldset">
          <legend className="checkbox-demo-legend">Confluence spaces (up to {limit})</legend>
          <ul className="checkbox-demo-list">
            {spaces.map(space => {
              const checked = selected.includes(space.key);
              const id = `checkbox-demo-space-${space.key}`;
              return (
                <li key={space.key} className="checkbox-demo-inline">
                  <Checkbox
                    id={id}
                    checked={checked}
                    disabled={!checked && selected.length >= limit}
                    onCheckedChange={value =>
                      setSelected(value ? [...selected, space.key] : selected.filter(key => key !== space.key))
                    }
                  />
                  <Label htmlFor={id}>
                    {space.title} ({space.key})
                  </Label>
                </li>
              );
            })}
          </ul>
        </fieldset>
        <div className="checkbox-demo-inline">
          <Checkbox id="checkbox-demo-descendants" checked={descendants} onCheckedChange={setDescendants} />
          <Label htmlFor="checkbox-demo-descendants">Include child pages</Label>
        </div>
        <p role="status" className="checkbox-demo-muted">
          {selected.length} {selected.length === 1 ? 'item' : 'items'} selected.
        </p>
      </div>
    </Example>
  );
}

const rows = [
  { id: '4f0c2a91', name: 'Acme Corp', owner: 'Dana Whitfield' },
  { id: '9b7e13d0', name: 'Globex', owner: 'Priya Raman' },
  { id: 'c2d84e57', name: 'Initech', owner: 'Sam Okafor' },
];

export function CheckboxTable() {
  const [selected, setSelected] = useState<string[]>([rows[1]!.id]);
  const [editing, setEditing] = useState(false);
  const all = selected.length === rows.length;
  const some = selected.length > 0 && !all;
  return (
    <Example
      title="Row selection"
      description="A header box selects every row and shows mixed when some are selected. Row boxes use aria-label because the row already shows its content."
    >
      <div className="checkbox-demo-panel">
        <div className="checkbox-demo-table-wrap">
          <table className="checkbox-demo-table">
            <thead>
              <tr>
                <th scope="col" className="checkbox-demo-select-cell">
                  <Checkbox
                    aria-label="Select all rows on this page"
                    checked={all}
                    indeterminate={some}
                    disabled={editing}
                    onCheckedChange={checked => setSelected(checked ? rows.map(row => row.id) : [])}
                  />
                </th>
                <th scope="col">Account</th>
                <th scope="col">Owner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} data-selected={selected.includes(row.id) || undefined}>
                  <td className="checkbox-demo-select-cell">
                    <Checkbox
                      aria-label={`Select row ${row.id}`}
                      checked={selected.includes(row.id)}
                      disabled={editing}
                      onCheckedChange={checked =>
                        setSelected(checked ? [...selected, row.id] : selected.filter(id => id !== row.id))
                      }
                    />
                  </td>
                  <td>{row.name}</td>
                  <td>{row.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="checkbox-demo-row">
          <p role="status" className="checkbox-demo-muted">
            {selected.length} of {rows.length} rows selected.
          </p>
          <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? 'Stop editing' : 'Edit a cell'}
          </Button>
        </div>
      </div>
    </Example>
  );
}

const files = [
  { id: 'contracts', name: 'Contracts', kind: 'folder' as const },
  { id: 'brief', name: 'Launch brief.docx', kind: 'file' as const },
  {
    id: 'notes',
    name: '2026-10-14 customer interview notes with Globex procurement.md',
    kind: 'file' as const,
  },
];

export function CheckboxFiles() {
  const [selected, setSelected] = useState<string[]>(['brief']);
  return (
    <Example
      title="File list"
      description="Managers get a box in a fixed 16px column before the icon. Long names wrap without pushing the box."
    >
      <ul className="checkbox-demo-files" aria-label="Files">
        {files.map(item => {
          const checked = selected.includes(item.id);
          const Icon = item.kind === 'folder' ? Folder : FileText;
          return (
            <li key={item.id} className="checkbox-demo-file" data-selected={checked || undefined}>
              <span className="checkbox-demo-file-select">
                <Checkbox
                  checked={checked}
                  aria-label={`Select ${item.name}`}
                  onCheckedChange={value =>
                    setSelected(value ? [...selected, item.id] : selected.filter(id => id !== item.id))
                  }
                />
              </span>
              <Icon aria-hidden="true" className="checkbox-demo-file-icon" />
              <span className="checkbox-demo-file-name">{item.name}</span>
            </li>
          );
        })}
      </ul>
    </Example>
  );
}

export function CheckboxOptionalInput() {
  const [included, setIncluded] = useState(false);
  const [raw, setRaw] = useState(true);
  const descriptionId = useId();
  return (
    <Example title="Turn on more input" description="A box can enable an optional input or reveal follow-up settings.">
      <div className="checkbox-demo-panel">
        <div className="checkbox-demo-field">
          <Label>
            <Checkbox checked={included} onCheckedChange={setIncluded} />
            Include description
          </Label>
          <Label htmlFor={descriptionId}>Description</Label>
          <Input id={descriptionId} disabled={!included} placeholder="Summarize the change for reviewers" />
        </div>
        <div className="checkbox-demo-inline checkbox-demo-inline-start">
          <Checkbox
            className="checkbox-demo-first-line"
            id="checkbox-demo-webhook-raw"
            checked={raw}
            onCheckedChange={setRaw}
          />
          <Label htmlFor="checkbox-demo-webhook-raw">Use the provider payload as the workflow input</Label>
        </div>
        {raw && <p className="checkbox-demo-muted">Duplicate deliveries are skipped by payload hash.</p>}
      </div>
    </Example>
  );
}

export function CheckboxSettings() {
  const [grants, setGrants] = useState<string[]>(['create-platform']);
  const toggle = (key: string, value: boolean) =>
    setGrants(value ? [...grants, key] : grants.filter(item => item !== key));
  return (
    <Example
      title="In settings rows"
      description="SettingsRow names the box with htmlFor and places it beside the label from 36rem of group width."
    >
      <SettingsGroup title="Create tables" heading="h4">
        {teams.map(team => (
          <SettingsRow key={team.id} htmlFor={`checkbox-demo-create-${team.id}`} label={team.name}>
            <Checkbox
              id={`checkbox-demo-create-${team.id}`}
              checked={grants.includes(`create-${team.id}`)}
              onCheckedChange={value => toggle(`create-${team.id}`, value)}
            />
          </SettingsRow>
        ))}
        <SettingsRow
          htmlFor="checkbox-demo-schema"
          label="Manage schema"
          description="Schema authority does not grant row reads or data changes."
        >
          <Checkbox
            id="checkbox-demo-schema"
            checked={grants.includes('schema')}
            onCheckedChange={value => toggle('schema', value)}
          />
        </SettingsRow>
      </SettingsGroup>
    </Example>
  );
}

const sources = [
  { value: 'drive', label: 'Google Drive' },
  { value: 'slack', label: 'Slack channels' },
  {
    value: 'confluence',
    label: 'Confluence',
    description: 'Only spaces your Atlassian account can read.',
  },
] as const;

export function CheckboxInFields() {
  const [reminders, setReminders] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [filters, setFilters] = useState(false);
  const [picked, setPicked] = useState<string[]>(['drive']);
  return (
    <Example
      title="In fields"
      description="CheckboxField and ChoiceGroup from Field wrap the same box with a label, helper, and error line."
    >
      <div className="checkbox-demo-panel">
        <CheckboxField
          label="Enable reminders"
          helper="A local toggle only."
          checked={reminders}
          onCheckedChange={setReminders}
        />
        <CheckboxField
          label="Confirm the sample details"
          checked={confirmed}
          onCheckedChange={setConfirmed}
          error={confirmed ? undefined : 'Confirm the sample details before continuing.'}
        />
        <CheckboxField
          variant="neutral"
          label="Show only sources I own"
          checked={filters}
          onCheckedChange={setFilters}
        />
        <ChoiceGroup
          type="checkbox"
          optional
          legend="Knowledge sources"
          options={sources}
          value={picked}
          onValueChange={setPicked}
          error={picked.length ? undefined : 'Choose at least one source.'}
        />
      </div>
    </Example>
  );
}

export default function CheckboxDemo() {
  return (
    <div id="checkbox-demo" className="checkbox-demo">
      <CheckboxVariants />
      <CheckboxLabels />
      <CheckboxConfirm />
      <CheckboxGrants />
      <CheckboxLimit />
      <CheckboxTable />
      <CheckboxFiles />
      <CheckboxOptionalInput />
      <CheckboxSettings />
      <CheckboxInFields />
    </div>
  );
}
