import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Globe } from 'reicon-react/icons/Globe';
import { Hashtag } from 'reicon-react/icons/Hashtag';
import { Loader } from 'reicon-react/icons/Loader';
import { Button } from '@tulipfarm/sprout/button';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from '@tulipfarm/sprout/combobox';
import { InputGroupAddon } from '@tulipfarm/sprout/input-group';
import '../styles/combobox-demo.css';

const fruits = ['Apple', 'Apricot', 'Blueberry', 'Cherry', 'Pear'];

interface Person {
  value: string;
  label: string;
  email: string;
}

const teammates: Person[] = [
  { value: 'dana', label: 'Dana Whitfield', email: 'dana@acme.com' },
  { value: 'priya', label: 'Priya Raman', email: 'priya@acme.com' },
  { value: 'marco', label: 'Marco Ilić', email: 'marco@acme.com' },
  { value: 'sam', label: 'Sam Okafor', email: 'sam@acme.com' },
  { value: 'lee', label: 'Lee Nakamura', email: 'lee@acme.com' },
  { value: 'ana', label: 'Ana Sofía Castellanos', email: 'ana@acme.com' },
];

const channels = [
  'general',
  'launches',
  'support-escalations',
  'sales-pipeline',
  'design-reviews',
  'customer-success-emea',
  'incidents',
];

const regions = [
  {
    value: 'Americas',
    items: ['America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York', 'America/Sao_Paulo'],
  },
  {
    value: 'Europe and Africa',
    items: ['Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Africa/Lagos', 'Africa/Johannesburg'],
  },
  {
    value: 'Asia and Pacific',
    items: ['Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'],
  },
];

const zones = regions.flatMap(region => region.items);

const personLabel = (person: Person | null) => person?.label ?? '';
const samePerson = (a: Person, b: Person) => a.value === b.value;

function DemoField({
  id,
  label,
  helper,
  error,
  children,
}: {
  id: string;
  label: string;
  helper?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="combobox-demo-field">
      <label htmlFor={id} className="combobox-demo-label">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="combobox-demo-error">
          {error}
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className="combobox-demo-helper">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function Row({ name, note, children }: { name: ReactNode; note: string; children: ReactNode }) {
  return (
    <div className="combobox-demo-row">
      <div className="combobox-demo-meta">
        <code>{name}</code>
        <span>{note}</span>
      </div>
      <div className="combobox-demo-control">{children}</div>
    </div>
  );
}

function PersonItem({ person }: { person: Person }) {
  return (
    <ComboboxItem value={person}>
      <span className="combobox-demo-person">
        <span>{person.label}</span>
        <span>{person.email}</span>
      </span>
    </ComboboxItem>
  );
}

export function ComboboxPlayground() {
  const id = useId();
  const anchor = useComboboxAnchor();
  const [owner, setOwner] = useState<Person | null>(teammates[1]!);
  const [notify, setNotify] = useState<string[]>(['launches', 'support-escalations']);
  return (
    <div className="combobox-demo-panel" data-demo="combobox-playground">
      <div className="combobox-demo-stage">
        <form className="combobox-demo-form" aria-label="Route requests" onSubmit={event => event.preventDefault()}>
          <DemoField id={`${id}-owner`} label="Owner" helper="Gets every new request first.">
            <Combobox
              items={teammates}
              value={owner}
              onValueChange={setOwner}
              itemToStringLabel={personLabel}
              isItemEqualToValue={samePerson}
            >
              <ComboboxInput
                id={`${id}-owner`}
                placeholder="Search teammates"
                aria-describedby={`${id}-owner-helper`}
                showClear
              />
              <ComboboxContent>
                <ComboboxEmpty>No teammate found.</ComboboxEmpty>
                <ComboboxList>{(person: Person) => <PersonItem key={person.value} person={person} />}</ComboboxList>
              </ComboboxContent>
            </Combobox>
          </DemoField>
          <DemoField id={`${id}-notify`} label="Post updates to">
            <Combobox items={channels} multiple value={notify} onValueChange={setNotify}>
              <ComboboxChips ref={anchor}>
                <ComboboxValue>
                  {(values: string[]) => values.map(value => <ComboboxChip key={value}>{`#${value}`}</ComboboxChip>)}
                </ComboboxValue>
                <ComboboxChipsInput
                  id={`${id}-notify`}
                  placeholder={notify.length ? 'Add channel' : 'Choose channels'}
                />
              </ComboboxChips>
              <ComboboxContent anchor={anchor}>
                <ComboboxEmpty>No channel found.</ComboboxEmpty>
                <ComboboxList>
                  {(channel: string) => (
                    <ComboboxItem key={channel} value={channel}>
                      <Hashtag aria-hidden="true" />
                      {channel}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </DemoField>
        </form>
      </div>
      <p className="combobox-demo-readout" aria-live="polite">
        {owner ? owner.label : 'No owner'} ·{' '}
        {notify.length ? notify.map(channel => `#${channel}`).join(', ') : 'No channels'}
      </p>
    </div>
  );
}

export function ComboboxBasics() {
  return (
    <div className="combobox-demo-panel" data-demo="combobox-basics">
      <Row name="items + showClear" note="Searchable single choice">
        <Combobox items={fruits}>
          <ComboboxInput aria-label="Choose a fruit" placeholder="Choose a fruit" showClear />
          <ComboboxContent>
            <ComboboxEmpty>No fruit found.</ComboboxEmpty>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Row>
      <Row name="multiple + defaultValue" note="Multiple choices as chips">
        <Combobox items={fruits} multiple defaultValue={['Apple']}>
          <ComboboxChips>
            <ComboboxValue>
              {(values: string[]) => values.map(value => <ComboboxChip key={value}>{value}</ComboboxChip>)}
            </ComboboxValue>
            <ComboboxChipsInput aria-label="Add fruit" placeholder="Add fruit" />
          </ComboboxChips>
          <ComboboxContent>
            <ComboboxEmpty>No fruit found.</ComboboxEmpty>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Row>
      <Row name="disabled" note="Can’t be focused or opened">
        <Combobox items={fruits} disabled>
          <ComboboxInput aria-label="Disabled fruit choice" placeholder="Disabled" />
        </Combobox>
      </Row>
    </div>
  );
}

function ZoneList() {
  return (
    <ComboboxList>
      {(zone: string) => (
        <ComboboxItem key={zone} value={zone}>
          {zone.replace('_', ' ')}
        </ComboboxItem>
      )}
    </ComboboxList>
  );
}

export function ComboboxInputOptions() {
  return (
    <div className="combobox-demo-panel" data-demo="combobox-input-options">
      <Row name="showTrigger (default)" note="Chevron opens the full list">
        <Combobox items={zones}>
          <ComboboxInput aria-label="Workspace time zone" placeholder="Search time zones" />
          <ComboboxContent>
            <ComboboxEmpty>No time zone found.</ComboboxEmpty>
            <ZoneList />
          </ComboboxContent>
        </Combobox>
      </Row>
      <Row name="showTrigger={false}" note="Type or press ↓ to open">
        <Combobox items={zones}>
          <ComboboxInput aria-label="Meeting time zone" placeholder="Type a city" showTrigger={false} />
          <ComboboxContent>
            <ComboboxEmpty>No time zone found.</ComboboxEmpty>
            <ZoneList />
          </ComboboxContent>
        </Combobox>
      </Row>
      <Row name="showClear" note="Clear replaces the chevron once chosen">
        <Combobox items={zones} defaultValue="Europe/Berlin">
          <ComboboxInput aria-label="Report time zone" placeholder="Search time zones" showClear />
          <ComboboxContent>
            <ComboboxEmpty>No time zone found.</ComboboxEmpty>
            <ZoneList />
          </ComboboxContent>
        </Combobox>
      </Row>
      <Row name="children" note="Extra addon, such as a leading icon">
        <Combobox items={zones} defaultValue="America/New_York">
          <ComboboxInput aria-label="Billing time zone" placeholder="Search time zones" showClear>
            <InputGroupAddon align="inline-start">
              <Globe aria-hidden="true" />
            </InputGroupAddon>
          </ComboboxInput>
          <ComboboxContent>
            <ComboboxEmpty>No time zone found.</ComboboxEmpty>
            <ZoneList />
          </ComboboxContent>
        </Combobox>
      </Row>
    </div>
  );
}

function ChannelItems() {
  return (
    <>
      <ComboboxEmpty>No channel found.</ComboboxEmpty>
      <ComboboxList>
        {(channel: string) => (
          <ComboboxItem key={channel} value={channel}>
            <Hashtag aria-hidden="true" />
            {channel}
          </ComboboxItem>
        )}
      </ComboboxList>
    </>
  );
}

export function ComboboxMultiple() {
  const anchor = useComboboxAnchor();
  const wideAnchor = useComboboxAnchor();
  return (
    <div className="combobox-demo-panel" data-demo="combobox-multiple">
      <Row name="anchor={useComboboxAnchor()}" note="List lines up with the whole field">
        <Combobox items={channels} multiple defaultValue={['launches', 'incidents']}>
          <ComboboxChips ref={anchor}>
            <ComboboxValue>
              {(values: string[]) => values.map(value => <ComboboxChip key={value}>{value}</ComboboxChip>)}
            </ComboboxValue>
            <ComboboxChipsInput aria-label="Alert channels" placeholder="Add channel" />
          </ComboboxChips>
          <ComboboxContent anchor={anchor}>
            <ChannelItems />
          </ComboboxContent>
        </Combobox>
      </Row>
      <Row name="showRemove={false}" note="A chip that must stay">
        <Combobox items={channels} multiple defaultValue={['general', 'design-reviews']}>
          <ComboboxChips>
            <ComboboxValue>
              {(values: string[]) =>
                values.map(value => (
                  <ComboboxChip key={value} showRemove={value !== 'general'}>
                    {value}
                  </ComboboxChip>
                ))
              }
            </ComboboxValue>
            <ComboboxChipsInput aria-label="Announcement channels" placeholder="Add channel" />
          </ComboboxChips>
          <ComboboxContent>
            <ChannelItems />
          </ComboboxContent>
        </Combobox>
      </Row>
      <Row name="many chips" note="Chips wrap onto new rows">
        <Combobox
          items={teammates}
          multiple
          defaultValue={teammates.slice(0, 5)}
          itemToStringLabel={personLabel}
          isItemEqualToValue={samePerson}
        >
          <ComboboxChips ref={wideAnchor}>
            <ComboboxValue>
              {(values: Person[]) =>
                values.map(person => <ComboboxChip key={person.value}>{person.label}</ComboboxChip>)
              }
            </ComboboxValue>
            <ComboboxChipsInput aria-label="Reviewers" placeholder="Add reviewer" />
          </ComboboxChips>
          <ComboboxContent anchor={wideAnchor}>
            <ComboboxEmpty>No teammate found.</ComboboxEmpty>
            <ComboboxList>{(person: Person) => <PersonItem key={person.value} person={person} />}</ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Row>
    </div>
  );
}

export function ComboboxTriggerPicker() {
  const [zone, setZone] = useState<string | null>('Asia/Kolkata');
  return (
    <div className="combobox-demo-panel" data-demo="combobox-trigger">
      <Row name="ComboboxTrigger + ComboboxValue" note="Search sits inside the list">
        <Combobox items={zones} value={zone} onValueChange={setZone}>
          <ComboboxTrigger
            render={<Button variant="outline" className="combobox-demo-trigger" />}
            aria-label="Digest time zone"
          >
            <Globe aria-hidden="true" />
            <ComboboxValue placeholder="Choose time zone">
              {(value: string | null) => value?.replace('_', ' ') ?? 'Choose time zone'}
            </ComboboxValue>
          </ComboboxTrigger>
          <ComboboxContent>
            <ComboboxInput aria-label="Search time zones" placeholder="Search" showTrigger={false} />
            <ComboboxEmpty>No time zone found.</ComboboxEmpty>
            <ZoneList />
          </ComboboxContent>
        </Combobox>
      </Row>
      <Row name="ComboboxTrigger (icon)" note="Named “Show options” when it has no children">
        <div className="combobox-demo-inline">
          <span id="combobox-demo-assignee">Assign to</span>
          <Combobox
            items={teammates}
            defaultValue={teammates[3]!}
            itemToStringLabel={personLabel}
            isItemEqualToValue={samePerson}
          >
            <span className="combobox-demo-value">
              <ComboboxValue>{(person: Person | null) => person?.label ?? 'Nobody'}</ComboboxValue>
            </span>
            <ComboboxTrigger
              render={<Button variant="ghost" size="icon-xs" />}
              aria-labelledby="combobox-demo-assignee"
            />
            <ComboboxContent>
              <ComboboxInput aria-label="Search teammates" placeholder="Search" showTrigger={false} />
              <ComboboxEmpty>No teammate found.</ComboboxEmpty>
              <ComboboxList>{(person: Person) => <PersonItem key={person.value} person={person} />}</ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
      </Row>
    </div>
  );
}

export function ComboboxGroups() {
  return (
    <div className="combobox-demo-panel" data-demo="combobox-groups">
      <Row name="ComboboxGroup + ComboboxCollection" note="Labels and separators between regions">
        <Combobox items={regions}>
          <ComboboxInput aria-label="Office time zone" placeholder="Search time zones" />
          <ComboboxContent>
            <ComboboxEmpty>No time zone found.</ComboboxEmpty>
            <ComboboxList>
              {(region: (typeof regions)[number], index: number) => (
                <ComboboxGroup key={region.value} items={region.items}>
                  {index > 0 && <ComboboxSeparator />}
                  <ComboboxLabel>{region.value}</ComboboxLabel>
                  <ComboboxCollection>
                    {(zone: string) => (
                      <ComboboxItem key={zone} value={zone}>
                        {zone.replace('_', ' ')}
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                </ComboboxGroup>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Row>
    </div>
  );
}

const tables = ['Leads', 'Invoices', 'Support tickets', 'Renewals'];

export function ComboboxStates() {
  const id = useId();
  const [table, setTable] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const invalid = submitted && !table;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }
  return (
    <div className="combobox-demo-panel" data-demo="combobox-states">
      <div className="combobox-demo-grid">
        <DemoField id={`${id}-loading`} label="Source table" helper="Loading tables…">
          <Combobox items={[] as string[]}>
            <ComboboxInput
              id={`${id}-loading`}
              placeholder="Loading tables…"
              aria-busy="true"
              aria-describedby={`${id}-loading-helper`}
            />
            <ComboboxContent>
              <ComboboxEmpty>
                <span className="combobox-demo-loading">
                  <Loader aria-hidden="true" />
                  Loading tables…
                </span>
              </ComboboxEmpty>
              <ComboboxList />
            </ComboboxContent>
          </Combobox>
        </DemoField>
        <DemoField id={`${id}-empty`} label="Destination table" helper="No tables yet. Create one in Tables first.">
          <Combobox items={[] as string[]}>
            <ComboboxInput
              id={`${id}-empty`}
              placeholder="No tables available"
              aria-describedby={`${id}-empty-helper`}
            />
            <ComboboxContent>
              <ComboboxEmpty>No tables yet.</ComboboxEmpty>
              <ComboboxList />
            </ComboboxContent>
          </Combobox>
        </DemoField>
        <form className="combobox-demo-field" onSubmit={submit} noValidate>
          <DemoField id={`${id}-sync`} label="Sync into" error={invalid ? 'Choose a table to sync into.' : undefined}>
            <Combobox items={tables} value={table} onValueChange={setTable} name="table">
              <ComboboxInput
                id={`${id}-sync`}
                placeholder="Choose a table"
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? `${id}-sync-error` : undefined}
                showClear
              />
              <ComboboxContent>
                <ComboboxEmpty>No table found.</ComboboxEmpty>
                <ComboboxList>
                  {(item: string) => (
                    <ComboboxItem key={item} value={item} disabled={item === 'Renewals'}>
                      {item}
                      {item === 'Renewals' && <span className="combobox-demo-hint">Read-only</span>}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </DemoField>
          <Button type="submit" variant="outline" size="sm" className="combobox-demo-submit">
            Start sync
          </Button>
        </form>
        <DemoField id={`${id}-disabled`} label="Alert channels" helper="Locked while the workflow runs.">
          <Combobox items={channels} multiple defaultValue={['launches']} disabled>
            <ComboboxChips>
              <ComboboxValue>
                {(values: string[]) => values.map(value => <ComboboxChip key={value}>{value}</ComboboxChip>)}
              </ComboboxValue>
              <ComboboxChipsInput id={`${id}-disabled`} aria-describedby={`${id}-disabled-helper`} disabled />
            </ComboboxChips>
          </Combobox>
        </DemoField>
      </div>
    </div>
  );
}
