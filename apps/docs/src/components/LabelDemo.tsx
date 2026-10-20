import { useId, useRef, useState, type ReactNode } from 'react';
import { Checkbox } from '@base-ui/react/checkbox';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Switch } from '@base-ui/react/switch';
import { Check } from 'reicon-react/icons/Check';
import { Minus } from 'reicon-react/icons/Minus';
import { Button } from '@tulipfarm/sprout/button';
import { Input } from '@tulipfarm/sprout/input';
import { Label } from '@tulipfarm/sprout/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tulipfarm/sprout/select';
import { Textarea } from '@tulipfarm/sprout/textarea';
import '../styles/label-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="label-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="label-demo-card-body">{children}</div>
    </section>
  );
}

/* Sample controls. The docs draw them with Base UI so Label has real
   checkboxes, switches, and radios to name. */
function DemoCheckbox(props: Checkbox.Root.Props) {
  return (
    <Checkbox.Root className="label-demo-checkbox" {...props}>
      <Checkbox.Indicator className="label-demo-checkbox-indicator">
        <Check aria-hidden="true" className="label-demo-check" />
        <Minus aria-hidden="true" className="label-demo-minus" />
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}

type SwitchSize = 'default' | 'sm';

function DemoSwitch({ size = 'default', ...props }: Switch.Root.Props & { size?: SwitchSize }) {
  return (
    <Switch.Root className="label-demo-switch" data-size={size} {...props}>
      <Switch.Thumb className="label-demo-switch-thumb" />
    </Switch.Root>
  );
}

function DemoRadio(props: Radio.Root.Props) {
  return (
    <Radio.Root className="label-demo-radio" {...props}>
      <Radio.Indicator className="label-demo-radio-indicator" />
    </Radio.Root>
  );
}

function Stack({ children }: { children: ReactNode }) {
  return <div className="label-demo-stack">{children}</div>;
}

const access = [
  { value: 'viewer', label: 'Can view' },
  { value: 'editor', label: 'Can edit' },
  { value: 'owner', label: 'Owner' },
];

function AboveControls() {
  const id = useId();
  const [slug, setSlug] = useState('tulipfarm');
  const [role, setRole] = useState('editor');
  const taken = slug.trim() === 'tulipfarm';
  return (
    <Example
      title="Above a control"
      description="htmlFor names an input, select, or textarea. A click on the label moves focus to the control."
    >
      <div className="label-demo-columns">
        <form className="label-demo-form" aria-label="Create workspace" onSubmit={event => event.preventDefault()}>
          <span className="label-demo-caption">Large input · onboarding</span>
          <Stack>
            <Label htmlFor={`${id}-workspace-name`}>Workspace name</Label>
            <Input
              id={`${id}-workspace-name`}
              scale="lg"
              defaultValue="TulipFarm Operations"
              autoComplete="organization"
            />
          </Stack>
          <Stack>
            <Label htmlFor={`${id}-workspace-slug`}>Workspace URL</Label>
            <Input
              id={`${id}-workspace-slug`}
              scale="lg"
              value={slug}
              aria-invalid={taken || undefined}
              aria-describedby={`${id}-workspace-slug-error`}
              onChange={event => setSlug(event.target.value)}
            />
            <p id={`${id}-workspace-slug-error`} className="label-demo-message" data-tone={taken ? 'danger' : 'muted'}>
              {taken ? 'This URL is taken. Try another.' : `app.tulipfarm.ai/${slug || '…'}`}
            </p>
          </Stack>
        </form>
        <form className="label-demo-form" aria-label="Share file" onSubmit={event => event.preventDefault()}>
          <span className="label-demo-caption">Default input · dialogs</span>
          <Stack>
            <Label htmlFor={`${id}-share-subject`}>Person or team</Label>
            <Input id={`${id}-share-subject`} placeholder="Name, email, or team" />
          </Stack>
          <Stack>
            <Label htmlFor={`${id}-share-role`}>Access</Label>
            <Select items={access} value={role} onValueChange={value => value && setRole(value)}>
              <SelectTrigger id={`${id}-share-role`} width="full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {access.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Stack>
          <Stack>
            <Label htmlFor={`${id}-instructions`}>Instructions</Label>
            <Textarea
              id={`${id}-instructions`}

              rows={3}
              defaultValue="Summarize open incidents every Monday and link the runbook."
            />
          </Stack>
          <Stack>
            <Label htmlFor={`${id}-team-name`}>Team name</Label>
            <Input id={`${id}-team-name`} defaultValue="Platform" disabled />
          </Stack>
        </form>
      </div>
    </Example>
  );
}

const filterOptions = {
  Type: ['Any type', 'Documents', 'Spreadsheets', 'Folders'],
  Owner: ['Anyone', 'Me', 'Not me'],
  Modified: ['Any time', 'Today', 'Last 7 days', 'Last 30 days'],
  Sort: ['Last modified', 'Name', 'Size'],
} as const;

function Filters() {
  const id = useId();
  const names = Object.keys(filterOptions) as (keyof typeof filterOptions)[];
  return (
    <Example title="Compact filters" description="The same label over 28px select triggers in a files toolbar.">
      <div className="label-demo-filters" role="group" aria-label="File filters">
        {names.map(name => {
          const items = filterOptions[name].map(label => ({
            value: label,
            label,
          }));
          return (
            <Stack key={name}>
              <Label htmlFor={`${id}-${name}`}>{name}</Label>
              <Select items={items} defaultValue={items[0]!.value}>
                <SelectTrigger id={`${id}-${name}`} size="sm" width="full">
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
            </Stack>
          );
        })}
      </div>
    </Example>
  );
}

const permissions = [
  { value: 'invoke', label: 'Run workflow' },
  { value: 'read', label: 'Read definition' },
  { value: 'manage', label: 'Manage and share' },
];

function WrappedCheckboxes() {
  const [granted, setGranted] = useState<string[]>(['invoke', 'read']);
  const [business, setBusiness] = useState(true);
  return (
    <Example
      title="Wrapping a checkbox"
      description="Put the checkbox first, then its text. The whole row toggles it, and the text dims when the checkbox is disabled."
    >
      <div className="label-demo-columns">
        <div className="label-demo-list" data-testid="checkbox-states">
          <span className="label-demo-caption">States</span>
          <Label>
            <DemoCheckbox />
            Unchecked
          </Label>
          <Label>
            <DemoCheckbox defaultChecked />
            Checked
          </Label>
          <Label>
            <DemoCheckbox indeterminate />
            Mixed
          </Label>
          <Label>
            <DemoCheckbox disabled />
            Disabled
          </Label>
          <Label>
            <DemoCheckbox disabled defaultChecked />
            Disabled checked
          </Label>
        </div>
        <div className="label-demo-list" data-testid="checkbox-grants">
          <span className="label-demo-caption">Workflow access for Maya Chen</span>
          {permissions.map(permission => (
            <Label key={permission.value}>
              <DemoCheckbox
                checked={granted.includes(permission.value)}
                onCheckedChange={checked =>
                  setGranted(previous =>
                    checked ? [...previous, permission.value] : previous.filter(item => item !== permission.value),
                  )
                }
              />
              {permission.label}
            </Label>
          ))}
          <Label>
            <DemoCheckbox checked={business} onCheckedChange={checked => setBusiness(checked)} />
            Shared business account
          </Label>
          <Label>
            <DemoCheckbox defaultChecked />
            Allow Platform Reliability and Incident Response to manage and share
          </Label>
          <Label>
            <DemoCheckbox disabled />
            <span className="label-demo-break">
              GitHub · ops-automation-bot@tulipfarm-production-integrations.example
            </span>
          </Label>
          <p className="label-demo-message" role="status">
            {granted.length} of {permissions.length} permissions granted
          </p>
        </div>
      </div>
    </Example>
  );
}

function WrappedSwitches() {
  const [paused, setPaused] = useState(false);
  const sizes: { size: SwitchSize; note: string }[] = [
    { size: 'default', note: '18px track · settings rows' },
    { size: 'sm', note: '14px track · dense lists' },
  ];
  return (
    <Example title="Wrapping a switch" description="Both switch sizes keep the 8px gap and the 14px label text.">
      {sizes.map(({ size, note }) => (
        <div key={size} className="label-demo-size" data-testid={`switch-${size}`}>
          <div className="label-demo-size-text">
            <code>{`size="${size}"`}</code>
            <span>{note}</span>
          </div>
          <div className="label-demo-row">
            <Label>
              <DemoSwitch size={size} />
              Off
            </Label>
            <Label>
              <DemoSwitch size={size} defaultChecked />
              On
            </Label>
            <Label>
              <DemoSwitch size={size} disabled />
              Disabled
            </Label>
            <Label>
              <DemoSwitch size={size} disabled defaultChecked />
              Disabled on
            </Label>
          </div>
        </div>
      ))}
      <Label>
        <DemoSwitch checked={paused} onCheckedChange={setPaused} />
        Pause motion
      </Label>
    </Example>
  );
}

function WrappedRadios() {
  return (
    <Example
      title="Wrapping a radio"
      description="Each option is a label around its radio. Arrow keys move between options."
    >
      <RadioGroup defaultValue="weekly" aria-label="Digest frequency" className="label-demo-row">
        <Label>
          <DemoRadio value="daily" />
          Daily
        </Label>
        <Label>
          <DemoRadio value="weekly" />
          Weekly
        </Label>
        <Label>
          <DemoRadio value="never" disabled />
          Unavailable
        </Label>
      </RadioGroup>
    </Example>
  );
}

function Confirmations() {
  const id = useId();
  const [retained, setRetained] = useState(false);
  return (
    <Example
      title="Checkbox before a label"
      description="For long confirmations, place the checkbox beside the label and point htmlFor at its id."
    >
      <div className="label-demo-list" data-testid="confirmations">
        <div className="label-demo-confirm">
          <DemoCheckbox id={`${id}-retained`} checked={retained} onCheckedChange={setRetained} />
          <Label htmlFor={`${id}-retained`}>I understand that workspace data is retained, not erased.</Label>
        </div>
        <div className="label-demo-confirm">
          <DemoCheckbox id={`${id}-move`} />
          <Label htmlFor={`${id}-move`}>
            I understand that every project member can read the full history of this chat, including earlier messages.
          </Label>
        </div>
        <div className="label-demo-confirm">
          <DemoCheckbox id={`${id}-delete`} disabled />
          <Label htmlFor={`${id}-delete`}>Delete this integration and stop future use. This cannot be undone.</Label>
        </div>
        <Button size="sm" disabled={!retained} className="label-demo-action">
          Close workspace
        </Button>
      </div>
    </Example>
  );
}

const people = [
  { id: 'maya', name: 'Maya Chen' },
  { id: 'jordan', name: 'Jordan Okafor' },
  { id: 'priya', name: 'Priya Raman-Lindqvist' },
];

function HiddenText() {
  return (
    <Example
      title="Visually hidden text"
      description="In a grid of checkboxes, the label can hold only the checkbox and hidden text that names the row."
    >
      <table className="label-demo-table">
        <thead>
          <tr>
            <th scope="col">Person</th>
            <th scope="col">Use</th>
            <th scope="col">Manage</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person, index) => (
            <tr key={person.id}>
              <th scope="row">{person.name}</th>
              {(['Use', 'Manage'] as const).map(kind => (
                <td key={kind}>
                  <Label>
                    <DemoCheckbox
                      defaultChecked={kind === 'Use' || index === 0}
                      disabled={kind === 'Manage' && index === 2}
                    />
                    <span className="label-demo-sr">
                      {kind} {person.name}
                    </span>
                  </Label>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Example>
  );
}

function WrappedText() {
  const [advanced, setAdvanced] = useState(false);
  const [text, setText] = useState('');
  return (
    <Example
      title="Wrapping a text control"
      description="A label around a textarea stacks the text above it, so no id is needed."
    >
      <div className="label-demo-columns">
        <div className="label-demo-list">
          <Label>
            {advanced ? 'Response JSON' : 'Decision or comment'}
            <Textarea
              rows={3}
              value={text}
              placeholder={advanced ? '{ "approved": true }' : 'Approved for Friday.'}
              onChange={event => setText(event.target.value)}
            />
          </Label>
          <div className="label-demo-row">
            <Button size="sm" disabled={!text.trim()}>
              Submit response
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdvanced(!advanced)}>
              {advanced ? 'Use plain text' : 'Use JSON'}
            </Button>
          </div>
        </div>
        <div className="label-demo-list" data-testid="closed-response">
          <Label>
            Decision or comment
            <Textarea rows={3} disabled defaultValue="This run finished. Responses are closed." />
          </Label>
        </div>
      </div>
    </Example>
  );
}

function CustomControl() {
  const id = useId();
  const editor = useRef<HTMLDivElement>(null);
  return (
    <Example
      title="Naming a custom control"
      description="When the control is not a form element, give the label an id and point aria-labelledby at it."
    >
      <Stack>
        <Label id={`${id}-message`} onClick={() => editor.current?.focus()}>
          Message text
        </Label>
        <div
          ref={editor}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={`${id}-message`}
          contentEditable
          suppressContentEditableWarning
          className="label-demo-editor"
        >
          New sign-up from <span className="label-demo-token">Form · Email</span>
        </div>
        <p className="label-demo-message">The value must be text, from 1 to 4,000 characters.</p>
      </Stack>
    </Example>
  );
}

function LockedFields() {
  const id = useId();
  const [saving, setSaving] = useState(true);
  return (
    <Example
      title="Inside a locked field"
      description='A field wrapper with data-slot="field" and data-disabled dims its labels and stops label clicks while a save runs.'
    >
      <Label>
        <DemoSwitch size="sm" checked={saving} onCheckedChange={setSaving} />
        Saving heartbeat settings
      </Label>
      <div className="label-demo-columns" data-testid="locked-fields">
        <div data-slot="field" data-disabled={saving || undefined}>
          <Stack>
            <Label htmlFor={`${id}-cadence`}>Check every, in minutes</Label>
            <Input id={`${id}-cadence`} inputMode="numeric" defaultValue="15" disabled={saving} />
          </Stack>
        </div>
        <div data-slot="field" data-disabled={saving || undefined}>
          <Stack>
            <Label htmlFor={`${id}-query`}>Gmail query</Label>
            <Input id={`${id}-query`} defaultValue="label:invoices is:unread" disabled={saving} />
          </Stack>
        </div>
      </div>
    </Example>
  );
}

export default function LabelDemo() {
  return (
    <div id="label-demo" className="label-demo">
      <AboveControls />
      <Filters />
      <WrappedCheckboxes />
      <WrappedSwitches />
      <WrappedRadios />
      <Confirmations />
      <HiddenText />
      <WrappedText />
      <CustomControl />
      <LockedFields />
    </div>
  );
}
