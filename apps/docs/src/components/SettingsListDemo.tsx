import { useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from 'react';
import { Checkbox } from '@base-ui/react/checkbox';
import { Switch } from '@base-ui/react/switch';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { Check } from 'reicon-react/icons/Check';
import { Monitor } from 'reicon-react/icons/Monitor';
import { Moon } from 'reicon-react/icons/Moon';
import { Sun } from 'reicon-react/icons/Sun';
import { Alert, AlertDescription } from '@tulipfarm/sprout/alert';
import { EntityAvatar } from '@tulipfarm/sprout/avatar';
import { Badge } from '@tulipfarm/sprout/badge';
import { Button } from '@tulipfarm/sprout/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@tulipfarm/sprout/dialog';
import { SettingsGroup, SettingsRow } from '@tulipfarm/sprout/settings-list';
import DocsSelect from './DocsSelect';
import '../styles/settings-list-demo.css';

/* Sample adapters. Sprout has no Switch, Checkbox, Input, or Toggle Group yet,
   so these docs-only stand-ins play the controls Cloud puts in rows. */

function SampleSwitch(props: Switch.Root.Props) {
  return (
    <Switch.Root className="settings-list-demo-switch" {...props}>
      <Switch.Thumb className="settings-list-demo-switch-thumb" />
    </Switch.Root>
  );
}

function SampleCheckbox(props: Checkbox.Root.Props) {
  return (
    <Checkbox.Root className="settings-list-demo-checkbox" {...props}>
      <Checkbox.Indicator className="settings-list-demo-checkbox-indicator">
        <Check size={12} aria-hidden="true" />
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}

function SampleInput(props: ComponentProps<'input'>) {
  return (
    <div className="settings-list-demo-field">
      <input className="settings-list-demo-input" {...props} />
    </div>
  );
}

function Note({ tone = 'muted', children }: { tone?: 'muted' | 'danger'; children: ReactNode }) {
  return (
    <p role={tone === 'danger' ? 'alert' : 'status'} className="settings-list-demo-note" data-tone={tone}>
      {children}
    </p>
  );
}

function ImagePicker({
  seed,
  name,
  shape,
  disabled,
  label,
}: {
  seed: string;
  name: string;
  shape: 'circle' | 'square';
  disabled?: boolean;
  label: string;
}) {
  const chooser = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [problem, setProblem] = useState('');
  const [saved, setSaved] = useState('');
  function choose(file: File | undefined) {
    if (!file) return;
    setProblem('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setProblem('Choose a PNG, JPEG, or WebP image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProblem('This image is larger than 2 MB. Choose a smaller one.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
      setSaved(`${label} saved.`);
    };
    reader.readAsDataURL(file);
  }
  return (
    <div className="settings-list-demo-picker">
      <EntityAvatar seed={seed} name={name} image={image} size="xl" shape={shape} />
      <input
        ref={chooser}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        tabIndex={-1}
        aria-hidden="true"
        data-testid={`${seed}-file`}
        onChange={event => {
          choose(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => chooser.current?.click()}>
        {image ? 'Change image' : 'Upload image'}
      </Button>
      {image && (
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => {
            setProblem('');
            setImage(null);
            setSaved(`${label} removed.`);
          }}
        >
          Remove
        </Button>
      )}
      {problem && (
        <p role="alert" className="settings-list-demo-problem">
          {problem}
        </p>
      )}
      <span role="status" className="sr-only">
        {saved}
      </span>
    </div>
  );
}

function Confirmation({
  label,
  title,
  description,
  busy,
}: {
  label: string;
  title: string;
  description: string;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" disabled={busy} />}>{label}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => setOpen(false)}>
            Confirm {label.toLowerCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SignIn = 'ready' | 'loading' | 'error';

function SignInMethods({ state, retry }: { state: SignIn; retry: () => void }) {
  return (
    <SettingsRow
      label="Sign-in methods"
      description="Private to your account. Available ways to sign in, not a record of past logins."
    >
      <div className="settings-list-demo-stack">
        {state === 'loading' && (
          <p role="status" className="settings-list-demo-muted">
            Loading sign-in methods…
          </p>
        )}
        {state === 'ready' && <p>Google · Email link</p>}
        {state === 'error' && (
          <>
            <p role="alert" className="settings-list-demo-danger">
              Could not check your sign-in methods.
            </p>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry sign-in methods
            </Button>
          </>
        )}
      </div>
    </SettingsRow>
  );
}

type Theme = 'system' | 'light' | 'dark';
const themes: Record<Theme, { label: string; icon: typeof Sun }> = {
  system: { label: 'System', icon: Monitor },
  light: { label: 'Light', icon: Sun },
  dark: { label: 'Dark', icon: Moon },
};

function NameForm({
  id,
  label,
  initial,
  help,
  autoComplete,
  savedLabel,
}: {
  id: string;
  label: string;
  initial: string;
  help: string;
  autoComplete?: string;
  savedLabel: string;
}) {
  const [saved, setSaved] = useState(initial);
  const [name, setName] = useState(initial);
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const trimmed = name.trim();
  const valid = trimmed.length > 0 && trimmed.length <= 80;
  const dirty = trimmed !== saved;
  const saving = state === 'saving';
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || !dirty || saving) return;
    setState('saving');
    window.setTimeout(() => {
      setSaved(trimmed);
      setName(trimmed);
      setState('saved');
    }, 400);
  }
  return (
    <form onSubmit={submit}>
      <SettingsRow
        label={label}
        htmlFor={id}
        description={<span id={`${id}-help`}>{valid ? help : 'Enter a name of 1 to 80 characters.'}</span>}
      >
        <SampleInput
          id={id}
          value={name}
          maxLength={80}
          required
          autoComplete={autoComplete}
          readOnly={saving}
          aria-invalid={!valid}
          aria-describedby={`${id}-help`}
          onChange={event => {
            setName(event.target.value);
            if (!saving) setState('idle');
          }}
        />
      </SettingsRow>
      {dirty && (
        <div className="settings-list-demo-actions">
          <p className="settings-list-demo-muted">Current saved name: {saved}</p>
          <Button type="submit" disabled={!valid || saving} aria-busy={saving}>
            {saving ? 'Saving name…' : 'Save name'}
          </Button>
          <Button
            variant="ghost"
            type="button"
            disabled={saving}
            onClick={() => {
              setName(saved);
              setState('idle');
            }}
          >
            Reset name
          </Button>
        </div>
      )}
      {state === 'saved' && !dirty && <Note>{savedLabel}</Note>}
    </form>
  );
}

function AccountPage() {
  const [theme, setTheme] = useState<Theme>('system');
  const [signIn, setSignIn] = useState<SignIn>('ready');
  return (
    <>
      <SettingsGroup title="Profile" titleId="sample-profile-heading">
        <SettingsRow
          label="Picture"
          description="Shown beside your name in every workspace. PNG, JPEG, or WebP, up to 2 MB. It is resized to 128 px. Without one, a colored initial is shown."
        >
          <ImagePicker seed="user-maya" name="Maya Chen" shape="circle" label="Profile picture" />
        </SettingsRow>
        <NameForm
          id="sample-account-name"
          label="Name"
          initial="Maya Chen"
          autoComplete="name"
          help="Shown to people in your workspaces. Up to 80 characters."
          savedLabel="Name saved."
        />
        <SettingsRow label="Email" description="Used to sign in.">
          <span className="settings-list-demo-break">maya.chen@northwind-logistics.example.com</span>
        </SettingsRow>
        <SignInMethods
          state={signIn}
          retry={() => {
            setSignIn('loading');
            window.setTimeout(() => setSignIn('ready'), 500);
          }}
        />
      </SettingsGroup>
      <SettingsGroup title="Preferences" titleId="sample-preferences-heading">
        <SettingsRow label="Theme" description="System follows your device. Saved in this browser.">
          <ToggleGroup
            aria-label="Theme"
            className="settings-list-demo-toggles"
            value={[theme]}
            onValueChange={value => {
              const next = value[0] as Theme | undefined;
              if (next) setTheme(next);
            }}
          >
            {(Object.keys(themes) as Theme[]).map(value => {
              const { label, icon: Icon } = themes[value];
              return (
                <Toggle key={value} value={value} className="settings-list-demo-toggle">
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </Toggle>
              );
            })}
          </ToggleGroup>
        </SettingsRow>
        <SettingsRow label="Analytics" description="Review or change optional analytics for this browser.">
          <Button variant="outline">Analytics preferences</Button>
        </SettingsRow>
      </SettingsGroup>
      <div className="settings-list-demo-toolbar-inline">
        <span>Sign-in methods state</span>
        <DocsSelect
          label="Sign-in methods state"
          value={signIn}
          items={[
            { value: 'ready', label: 'Ready' },
            { value: 'loading', label: 'Loading' },
            { value: 'error', label: 'Error' },
          ]}
          onValueChange={setSignIn}
        />
      </div>
    </>
  );
}

const workspace = {
  id: 'ws_01J9Z6Q8T4K2M7N3P5R8S1V0XB',
  name: 'Northwind Logistics',
  slug: 'northwind-logistics',
};
const origin = 'https://app.tulipfarm.example';

function IdentityValues() {
  return (
    <>
      <SettingsRow label="Workspace URL" description="Permanent address. This cannot be edited.">
        <code className="settings-list-demo-code">{`${origin}/${workspace.slug}`}</code>
      </SettingsRow>
      <SettingsRow label="Workspace ID" description="Use this identifier when contacting support.">
        <code className="settings-list-demo-code">{workspace.id}</code>
      </SettingsRow>
    </>
  );
}

function WorkspaceAdminPage() {
  const [conflict, setConflict] = useState(false);
  return (
    <>
      <SettingsGroup title="Workspace identity" titleId="sample-identity-heading">
        <SettingsRow
          label="Workspace icon"
          description="Shown in the sidebar and workspace menu. PNG, JPEG, or WebP, up to 2 MB. It is resized to 128 px. Without one, a colored initial is shown."
        >
          <ImagePicker
            seed={workspace.id}
            name={workspace.name}
            shape="square"
            disabled={conflict}
            label="Workspace icon"
          />
        </SettingsRow>
        <NameForm
          id="sample-workspace-name"
          label="Workspace name"
          initial={workspace.name}
          help="Use a name of up to 80 characters. Renaming does not change the workspace URL."
          savedLabel="Workspace name saved."
        />
        {conflict && (
          <div className="settings-list-demo-block">
            <Alert variant="destructive">
              <AlertDescription>
                Workspace settings changed. Your draft is retained. Reload the latest settings, review the saved name,
                then save deliberately.
              </AlertDescription>
            </Alert>
            <Button variant="outline" onClick={() => setConflict(false)}>
              Reload latest settings
            </Button>
          </div>
        )}
        <IdentityValues />
      </SettingsGroup>
      <SettingsGroup title="Your membership" titleId="sample-membership-heading">
        <SettingsRow label="Role" description="Your role in this workspace.">
          <Badge variant="secondary">admin</Badge>
        </SettingsRow>
        <SettingsRow
          label="Leave workspace"
          description="You are the last admin. Invite a member and promote them to admin before leaving."
        >
          <Confirmation
            label="Leave workspace"
            title="Leave this workspace?"
            description="You will lose workspace access and all team memberships. Only an admin can invite you back. Your account and other workspaces remain available."
            busy
          />
        </SettingsRow>
        <SettingsRow label="Members" description="Invite people and manage roles.">
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href="#members" onClick={event => event.preventDefault()} />}
          >
            Manage members
          </Button>
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title="Soul repository" titleId="sample-soul-heading">
        <SettingsRow
          label="Saved files"
          description="Browse the current saved Soul files. Read-only; existing content access rules still apply."
        >
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href="#soul" onClick={event => event.preventDefault()} />}
          >
            Open Soul
          </Button>
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title="Close workspace" titleId="sample-delete-heading">
        <SettingsRow
          label="Close this workspace"
          description="Access ends for everyone. Rows, files, and backups stay stored. Closing does not erase them."
        >
          <Button variant="destructive" disabled={conflict}>
            Close workspace
          </Button>
        </SettingsRow>
      </SettingsGroup>
      <div className="settings-list-demo-toolbar-inline">
        <Button variant="ghost" size="sm" onClick={() => setConflict(true)} disabled={conflict}>
          Simulate a conflicting edit
        </Button>
      </div>
    </>
  );
}

function WorkspaceMemberPage() {
  return (
    <>
      <SettingsGroup title="Workspace identity" titleId="sample-identity-heading">
        <p className="settings-list-demo-plain">Only workspace admins can rename or close this workspace.</p>
        <SettingsRow label="Workspace icon">
          <EntityAvatar seed={workspace.id} name={workspace.name} size="lg" shape="square" />
        </SettingsRow>
        <SettingsRow label="Workspace name">
          <p className="settings-list-demo-words">{workspace.name}</p>
        </SettingsRow>
        <IdentityValues />
      </SettingsGroup>
      <SettingsGroup title="Your membership" titleId="sample-membership-heading">
        <SettingsRow label="Role" description="Your role in this workspace.">
          <Badge variant="secondary">member</Badge>
        </SettingsRow>
        <SettingsRow
          label="Leave workspace"
          description="Leaving removes your membership and team access. Your account and other workspaces remain available."
        >
          <Confirmation
            label="Leave workspace"
            title="Leave this workspace?"
            description="You will lose workspace access and all team memberships. Only an admin can invite you back. Your account and other workspaces remain available."
            busy={false}
          />
        </SettingsRow>
        <SettingsRow label="Members" description="Invite people and manage roles.">
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href="#members" onClick={event => event.preventDefault()} />}
          >
            Manage members
          </Button>
        </SettingsRow>
      </SettingsGroup>
    </>
  );
}

const directory = [
  ['Maya Chen', 'maya.chen@northwind.example'],
  ['Arjun Rao', 'arjun.rao@northwind.example'],
  ['Lena Ortiz', 'lena.ortiz@northwind.example'],
  ['Kwame Mensah-Bonsu', 'kwame.mensah-bonsu.operations@northwind.example'],
] as const;

function MembersPage() {
  const [canLeave, setCanLeave] = useState(false);
  return (
    <>
      <SettingsGroup title="My membership" titleId="sample-my-membership-heading">
        <SettingsRow label="Role" description="Your role is team manager." />
        <SettingsRow
          label="Leave workspace"
          description={
            canLeave ? (
              'Leaving removes your membership and team access in this workspace. Your account and other workspaces remain available.'
            ) : (
              <span role="status">Hand off your last team manager or workspace admin role before leaving.</span>
            )
          }
        >
          <Confirmation
            label="Leave workspace"
            title="Leave this workspace?"
            description="You will lose workspace access and all team memberships. Your account and other workspaces remain available."
            busy={!canLeave}
          />
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title="Workspace directory">
        {directory.map(([name, email]) => (
          <SettingsRow key={email} label={name} description={email} />
        ))}
      </SettingsGroup>
      <div className="settings-list-demo-toolbar-inline">
        <Button variant="ghost" size="sm" onClick={() => setCanLeave(value => !value)}>
          {canLeave ? 'Make me the last team manager' : 'Hand off my team manager role'}
        </Button>
      </div>
    </>
  );
}

const teams = [
  ['team-ops', 'Operations'],
  ['team-finance', 'Finance and procurement'],
] as const;
const tables = [
  ['tbl-suppliers', 'Supplier contracts'],
  ['tbl-invoices', 'October invoices'],
] as const;
const permissions = [
  ['table.read', 'Read rows'],
  ['table.write', 'Change rows'],
  ['table.schema.manage', 'Manage schema'],
] as const;

function TableGrantsPage() {
  const [grants, setGrants] = useState<Set<string>>(
    () => new Set(['team-ops:table.create', 'tbl-suppliers:table.read']),
  );
  const [state, setState] = useState<'idle' | 'sending' | 'accepted'>('idle');
  const locked = state === 'sending';
  function toggle(key: string, granted: boolean) {
    setState('sending');
    window.setTimeout(() => {
      setGrants(current => {
        const next = new Set(current);
        if (granted) next.add(key);
        else next.delete(key);
        return next;
      });
      setState('accepted');
    }, 350);
  }
  const box = (key: string) => (
    <SampleCheckbox
      id={`sample-person-${key}`}
      checked={grants.has(key)}
      disabled={locked}
      onCheckedChange={value => toggle(key, value)}
    />
  );
  return (
    <section className="settings-list-demo-grants" aria-labelledby="sample-grants-heading">
      <h2 id="sample-grants-heading">Individual table grants</h2>
      <p className="settings-list-demo-muted">
        Direct grants add to team permissions. Removing one grant does not remove access supplied by another team or
        grant.
      </p>
      <p className="settings-list-demo-body">
        Person receiving access: <strong>Arjun Rao (arjun.rao@northwind.example)</strong>
      </p>
      <SettingsGroup title="Create tables for a team" heading="h3">
        {teams.map(([id, name]) => {
          const key = `${id}:table.create`;
          return (
            <SettingsRow key={id} label={<label htmlFor={`sample-person-${key}`}>{name}</label>}>
              {box(key)}
            </SettingsRow>
          );
        })}
      </SettingsGroup>
      {tables.map(([id, name]) => (
        <SettingsGroup key={id} title={name} heading="h3">
          {permissions.map(([permission, label]) => {
            const key = `${id}:${permission}`;
            return (
              <SettingsRow
                key={permission}
                label={<label htmlFor={`sample-person-${key}`}>{label}</label>}
                description={
                  permission === 'table.schema.manage'
                    ? 'Schema authority does not grant row reads or data changes.'
                    : undefined
                }
              >
                {box(key)}
              </SettingsRow>
            );
          })}
        </SettingsGroup>
      ))}
      <p role="status" className="settings-list-demo-body">
        {state === 'sending' ? 'Saving grant…' : state === 'accepted' ? 'Individual grant saved.' : ''}
      </p>
    </section>
  );
}

function PreferencesPage() {
  return (
    <SettingsGroup title="Local preferences">
      <SettingsRow label="Email summaries" description="This toggle never sends email." htmlFor="sample-summary">
        <SampleSwitch id="sample-summary" defaultChecked />
      </SettingsRow>
      <SettingsRow label="Quiet hours" description="Pause fictional notifications." htmlFor="sample-quiet">
        <SampleSwitch id="sample-quiet" />
      </SettingsRow>
      <SettingsRow label="Project name">
        <span>Meadow</span>
      </SettingsRow>
    </SettingsGroup>
  );
}

type Sample = 'account' | 'admin' | 'member' | 'members' | 'grants' | 'preferences';

const samples: Record<Sample, { label: string; page: () => ReactNode }> = {
  account: { label: 'Account', page: AccountPage },
  admin: { label: 'Workspace – admin', page: WorkspaceAdminPage },
  member: { label: 'Workspace – member', page: WorkspaceMemberPage },
  members: { label: 'Members', page: MembersPage },
  grants: { label: 'Table grants', page: TableGrantsPage },
  preferences: { label: 'Local preferences', page: PreferencesPage },
};

export function SettingsListPlayground() {
  const [sample, setSample] = useState<Sample>('account');
  const Page = samples[sample].page;
  return (
    <section className="settings-list-demo-frame" aria-label="Settings list playground" data-example="playground">
      <div className="settings-list-demo-toolbar">
        <label>
          Page
          <DocsSelect
            label="Page"
            value={sample}
            items={(Object.keys(samples) as Sample[]).map(value => ({
              value,
              label: samples[value].label,
            }))}
            onValueChange={setSample}
          />
        </label>
      </div>
      <div className="settings-list-demo-canvas" key={sample}>
        <Page />
      </div>
    </section>
  );
}

function Frame({ title, example, children }: { title: string; example: string; children: ReactNode }) {
  return (
    <section className="settings-list-demo-frame" aria-label={title} data-example={example}>
      <div className="settings-list-demo-frame-bar">{title}</div>
      <div className="settings-list-demo-canvas">{children}</div>
    </section>
  );
}

export function SettingsListRows() {
  return (
    <div className="settings-list-demo-grid">
      <Frame title="Row content" example="rows">
        <SettingsGroup title="Workspace identity" titleId="rows-identity-heading">
          <SettingsRow label="Role" description="Your role is workspace admin." />
          <SettingsRow label="Workspace name">
            <p className="settings-list-demo-words">Northwind Logistics</p>
          </SettingsRow>
          <SettingsRow label="Role" description="Your role in this workspace.">
            <Badge variant="secondary">admin</Badge>
          </SettingsRow>
          <SettingsRow label="Workspace URL" description="Permanent address. This cannot be edited.">
            <code className="settings-list-demo-code">
              https://app.tulipfarm.example/northwind-logistics-international-operations
            </code>
          </SettingsRow>
          <SettingsRow
            label="Name"
            htmlFor="rows-name"
            description={<span id="rows-name-help">Shown to people in your workspaces. Up to 80 characters.</span>}
          >
            <SampleInput id="rows-name" defaultValue="Maya Chen" aria-describedby="rows-name-help" />
          </SettingsRow>
          <SettingsRow label={<label htmlFor="rows-read">Read rows</label>}>
            <SampleCheckbox id="rows-read" defaultChecked />
          </SettingsRow>
          <SettingsRow label="Quiet hours" description="Pause fictional notifications." htmlFor="rows-quiet">
            <SampleSwitch id="rows-quiet" />
          </SettingsRow>
        </SettingsGroup>
      </Frame>
      <Frame title="Groups without a named title" example="untitled">
        <SettingsGroup title="Workspace directory">
          {directory.slice(0, 2).map(([name, email]) => (
            <SettingsRow key={email} label={name} description={email} />
          ))}
        </SettingsGroup>
      </Frame>
    </div>
  );
}
