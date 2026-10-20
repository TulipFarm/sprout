import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ArrowUpRight } from 'reicon-react/icons/ArrowUpRight';
import { Command } from 'reicon-react/icons/Command';
import { FileText } from 'reicon-react/icons/FileText';
import { Folder } from 'reicon-react/icons/Folder';
import { MessageCircle } from 'reicon-react/icons/MessageCircle';
import { Plus } from 'reicon-react/icons/Plus';
import { Search3 } from 'reicon-react/icons/Search3';
import { Settings } from 'reicon-react/icons/Settings';
import { Users } from 'reicon-react/icons/Users';
import { X } from 'reicon-react/icons/X';
import { Alert, AlertDescription } from '@tulipfarm/sprout/alert';
import { EntityAvatar } from '@tulipfarm/sprout/avatar';
import { Button } from '@tulipfarm/sprout/button';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  dialogPlacementNames,
  dialogSizeNames,
  type DialogPlacement,
  type DialogSize,
} from '@tulipfarm/sprout/dialog';
import DocsSelect from './DocsSelect';
import { Actions, Example, Row, TextAreaField, TextField, plural, useLater } from './dialog-demo-parts';

export function DialogPlayground() {
  const [size, setSize] = useState<DialogSize>('form');
  const [placement, setPlacement] = useState<DialogPlacement>('center');
  const [corner, setCorner] = useState(true);
  const [footerClose, setFooterClose] = useState(true);
  const [mounted, setMounted] = useState(0);
  const field = useId();
  return (
    <section className="dialog-demo-playground" aria-label="Dialog playground">
      <div className="dialog-demo-controls">
        <DocsSelect
          label="Size"
          value={size}
          items={dialogSizeNames.map(value => ({ value, label: value }))}
          onValueChange={setSize}
        />
        <DocsSelect
          label="Placement"
          value={placement}
          items={dialogPlacementNames.map(value => ({ value, label: value }))}
          onValueChange={setPlacement}
        />
        <Button variant="outline" size="sm" aria-pressed={corner} onClick={() => setCorner(!corner)}>
          Corner close
        </Button>
        <Button variant="outline" size="sm" aria-pressed={footerClose} onClick={() => setFooterClose(!footerClose)}>
          Footer close
        </Button>
      </div>
      <div className="dialog-demo-stage">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>Open {size} dialog</DialogTrigger>
          <DialogContent size={size} placement={placement} showCloseButton={corner}>
            <DialogHeader>
              <DialogTitle>Example {size} dialog</DialogTitle>
              <DialogDescription>This dialog contains only a local, unsaved field.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <TextField id={field} label="Project name" defaultValue="Meadow project" />
            </DialogBody>
            <DialogFooter showCloseButton={footerClose}>
              <DialogClose render={<Button />}>Done</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button variant="ghost" onClick={() => setMounted(value => value + 1)}>
          Mount with defaultOpen
        </Button>
        {mounted > 0 && (
          <Dialog key={mounted} defaultOpen>
            <DialogContent size="default">
              <DialogHeader>
                <DialogTitle>Opened on mount</DialogTitle>
                <DialogDescription>
                  An uncontrolled dialog with <code>defaultOpen</code>. It closes itself; nothing outside tracks its
                  state.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  );
}

function NewTeamDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState('');
  const later = useLater();
  return (
    <>
      <Dialog open={open} onOpenChange={next => !busy && setOpen(next)}>
        <DialogTrigger render={<Button />}>New team</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New team</DialogTitle>
            <DialogDescription>
              You become this team's first manager. Add workspace members and appoint other managers after creating it.
            </DialogDescription>
          </DialogHeader>
          <form
            className="dialog-demo-form"
            onSubmit={event => {
              event.preventDefault();
              setBusy(true);
              later(() => {
                setBusy(false);
                setCreated(`${name.trim()} created.`);
                setName('');
                setDescription('');
                setOpen(false);
              });
            }}
          >
            <TextField
              id="new-team-name"
              label="Name"
              value={name}
              required
              disabled={busy}
              maxLength={80}
              placeholder="For example, Field operations"
              onChange={event => setName(event.target.value)}
            />
            <TextAreaField
              id="new-team-description"
              label="Description"
              rows={3}
              value={description}
              disabled={busy}
              onChange={event => setDescription(event.target.value)}
            />
            <div>
              <Button type="submit" disabled={busy || !name.trim()} aria-busy={busy}>
                {busy ? 'Creating team…' : 'Create team'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <p role="status" className="dialog-demo-status">
        {created}
      </p>
    </>
  );
}

function RenameDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Q3 supplier contracts.pdf');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const opener = useRef<HTMLButtonElement>(null);
  const later = useLater();
  const trimmed = name.trim();
  return (
    <>
      <Button ref={opener} variant="outline" onClick={() => setOpen(true)}>
        Rename file
      </Button>
      <Dialog open={open} onOpenChange={next => !busy && setOpen(next)}>
        <DialogContent size="form" finalFocus={() => opener.current}>
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>Links and sharing stay the same after renaming.</DialogDescription>
          </DialogHeader>
          <form
            className="dialog-demo-form"
            onSubmit={event => {
              event.preventDefault();
              if (!trimmed) return;
              setBusy(true);
              later(() => {
                setBusy(false);
                setSaved(`Renamed to ${trimmed}.`);
                setOpen(false);
              });
            }}
          >
            <TextField
              id="rename-file"
              label="Name"
              autoFocus
              value={name}
              maxLength={255}
              required
              disabled={busy}
              onChange={event => setName(event.target.value)}
            />
            <Actions>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !trimmed} aria-busy={busy}>
                {busy ? 'Renaming…' : 'Rename'}
              </Button>
            </Actions>
          </form>
        </DialogContent>
      </Dialog>
      <p role="status" className="dialog-demo-status">
        {saved}
      </p>
    </>
  );
}

const members = [
  { id: 'm1', name: 'Ana Ruiz', email: 'ana@meadow.example' },
  { id: 'm2', name: 'Kofi Mensah', email: 'kofi@meadow.example' },
  {
    id: 'm3',
    name: 'Priya Natarajan',
    email: 'priya.natarajan@meadow.example',
  },
];

function InviteMembersDialog() {
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState(['kofi@meadow.example', '']);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string[]>([]);
  const later = useLater();
  const recipients = emails.map(email => email.trim()).filter(Boolean);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Invite members</DialogTrigger>
      <DialogContent size="split">
        <div className="dialog-demo-split">
          <div className="dialog-demo-split-main">
            <DialogHeader>
              <DialogTitle>Invite members</DialogTitle>
              <DialogDescription>
                Grant access to an existing workspace member. Select each person, then enter the email for their
                invitation. Links last seven days.
              </DialogDescription>
            </DialogHeader>
            <form
              className="dialog-demo-form"
              onSubmit={event => {
                event.preventDefault();
                setBusy(true);
                later(() => {
                  setBusy(false);
                  setSent(recipients);
                });
              }}
            >
              <fieldset className="dialog-demo-fieldset">
                <legend>Email addresses</legend>
                {emails.map((email, index) => (
                  <div key={index} className="dialog-demo-inline">
                    <input
                      id={`invitation-email-${index}`}
                      aria-label={`Email ${index + 1}`}
                      type="email"
                      className="dialog-demo-input"
                      placeholder="teammate@example.com"
                      value={email}
                      disabled={busy}
                      onChange={event =>
                        setEmails(emails.map((value, at) => (at === index ? event.target.value : value)))
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove email ${index + 1}`}
                      disabled={busy || (emails.length === 1 && !email)}
                      onClick={() => setEmails(emails.length === 1 ? [''] : emails.filter((_, at) => at !== index))}
                    >
                      <X size={16} aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </fieldset>
              <div>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setEmails([...emails, '']);
                    requestAnimationFrame(() => document.getElementById(`invitation-email-${emails.length}`)?.focus());
                  }}
                >
                  <Plus size={16} aria-hidden="true" />
                  Add another
                </Button>
              </div>
              <p className="dialog-demo-muted dialog-demo-xs">
                Paste a list with commas or newlines. Everyone joins as a member; team access is added later.
              </p>
              <Actions>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Not now
                </Button>
                <Button type="submit" disabled={busy || !recipients.length} aria-busy={busy}>
                  {busy ? 'Sending invitations…' : 'Send invitations'}
                </Button>
              </Actions>
            </form>
            {sent.length > 0 && (
              <section aria-label="Invitation results" className="dialog-demo-results">
                <h3>Invitation results</h3>
                <p role="status">
                  {sent.length} of {sent.length} recipients confirmed. Email delivery is tracked separately in
                  Invitations.
                </p>
              </section>
            )}
          </div>
          <aside className="dialog-demo-split-canvas" aria-label="Workspace members">
            <p className="dialog-demo-overline">Workspace members</p>
            <ul>
              {members.map(member => (
                <li key={member.id}>
                  <EntityAvatar seed={member.id} name={member.name} size="sm" />
                  <span>
                    <strong>{member.name}</strong>
                    <span>{member.email}</span>
                  </span>
                  {recipients.includes(member.email) && <span className="dialog-demo-tag">Invited</span>}
                </li>
              ))}
            </ul>
            <p className="dialog-demo-muted">{plural(recipients.length, 'recipient')} selected.</p>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const viewerFiles = {
  local: {
    name: 'Spring launch – supplier onboarding checklist and contract review notes (final, v7).docx',
    detail: 'Local file · Not uploaded',
    google: null,
  },
  google: {
    name: 'Field operations weekly plan',
    detail: 'Google document',
    google: 'https://docs.google.com/document/d/example',
  },
} as const;

function FileViewerDialog({ kind }: { kind: keyof typeof viewerFiles }) {
  const [open, setOpen] = useState(false);
  const file = viewerFiles[kind];
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {kind === 'google' ? 'View Google document' : 'View local file'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="fullscreen" showCloseButton={false}>
          <header className="dialog-demo-viewer-header">
            <div className="dialog-demo-viewer-title">
              <DialogTitle>
                <span className="dialog-demo-truncate" title={file.name}>
                  {file.name}
                </span>
              </DialogTitle>
              <DialogDescription>
                <span className="dialog-demo-truncate">{file.detail}</span>
              </DialogDescription>
            </div>
            {file.google && (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<a href={file.google} target="_blank" rel="noopener noreferrer" />}
              >
                <ArrowUpRight size={16} aria-hidden="true" />
                Open in Google
              </Button>
            )}
            <DialogClose render={<Button variant="ghost" size="icon" aria-label="Close file viewer" />}>
              <X size={20} aria-hidden="true" />
            </DialogClose>
          </header>
          <div className="dialog-demo-viewer-body">
            <article className="dialog-demo-page" aria-label="File preview">
              <h3>Supplier onboarding</h3>
              <p>
                Confirm insurance certificates, payment terms, and delivery windows before the first purchase order.
                Each supplier gets a named owner on the field operations team.
              </p>
              <ol>
                <li>Collect signed master agreement.</li>
                <li>Verify bank details with a call-back.</li>
                <li>Schedule the first site visit.</li>
              </ol>
            </article>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DialogSizes() {
  return (
    <Example
      title="Sizes"
      description="Each size with the content it is used for. Default fits short forms and confirmations, form scrolls its middle, split holds two panes, and fullscreen covers the viewport."
    >
      <Row label="default" note="Create a team: short form, inline submit">
        <NewTeamDialog />
      </Row>
      <Row label="form" note="Rename a file: opened from a menu, focus returns to it">
        <RenameDialog />
      </Row>
      <Row label="split" note="Invite members: form beside a live canvas">
        <InviteMembersDialog />
      </Row>
      <Row label="fullscreen" note="File viewer: custom header and close button">
        <FileViewerDialog kind="local" />
        <FileViewerDialog kind="google" />
      </Row>
    </Example>
  );
}

type MemberAction = 'remove' | 'admin' | 'member';

function MemberActionDialog({
  action,
  email,
  onDone,
  disabled,
  gone,
}: {
  action: MemberAction;
  email: string;
  onDone: (message: string) => void;
  disabled?: boolean;
  /** The row left the list, so the trigger unmounts and focus falls back to the heading. */
  gone?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const later = useLater();
  const label = action === 'remove' ? 'Remove member' : action === 'admin' ? 'Make admin' : 'Remove admin';
  return (
    <Dialog open={open} onOpenChange={value => !pending && setOpen(value)}>
      {!gone && (
        <DialogTrigger
          ref={trigger}
          disabled={disabled}
          render={<Button variant={action === 'remove' ? 'destructive' : 'outline'} size="sm" />}
        >
          {label}
        </DialogTrigger>
      )}
      <DialogContent
        finalFocus={() =>
          trigger.current?.isConnected ? trigger.current : document.getElementById('governance-heading')
        }
      >
        <DialogHeader>
          <DialogTitle>{label}?</DialogTitle>
          <DialogDescription>
            {action === 'remove'
              ? `${email} will lose workspace access and all team memberships. Their account and other workspaces remain. Returning requires a new invitation.`
              : action === 'admin'
                ? `${email} will be able to invite, remove, and change access for workspace members.`
                : `${email} will lose admin authority. Their team memberships remain.`}
          </DialogDescription>
        </DialogHeader>
        <Actions>
          <Button variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={action === 'remove' ? 'destructive' : 'default'}
            disabled={pending}
            aria-busy={pending}
            onClick={() => {
              setPending(true);
              later(() => {
                setPending(false);
                setOpen(false);
                onDone(`${label} confirmed for ${email}.`);
              });
            }}
          >
            {pending ? 'Saving change…' : `Confirm ${action === 'remove' ? 'removal' : 'role change'}`}
          </Button>
        </Actions>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTeamDialog({ onDone }: { onDone: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempts = useRef(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const later = useLater();
  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (pending) return;
        setOpen(value);
        setFailure(null);
      }}
    >
      <DialogTrigger ref={trigger} render={<Button variant="outline" size="sm" />}>
        Delete team
      </DialogTrigger>
      <DialogContent
        finalFocus={() =>
          trigger.current?.isConnected ? trigger.current : document.getElementById('governance-heading')
        }
      >
        <DialogHeader>
          <DialogTitle>Delete Field operations?</DialogTitle>
          <DialogDescription>
            Members keep their workspace access. Tables, agents, and integrations owned by this team must move to
            another team first.
          </DialogDescription>
        </DialogHeader>
        {failure && (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        )}
        <Actions>
          <Button variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            aria-busy={pending}
            onClick={() => {
              setPending(true);
              later(() => {
                setPending(false);
                if (attempts.current++ === 0) {
                  setFailure('This team owns tables and cannot be deleted.');
                  return;
                }
                setOpen(false);
                onDone('Field operations deleted.');
              });
            }}
          >
            {pending ? 'Saving change…' : 'Confirm delete team'}
          </Button>
        </Actions>
      </DialogContent>
    </Dialog>
  );
}

export function DialogConfirmations() {
  const [message, setMessage] = useState('');
  const [removed, setRemoved] = useState(false);
  return (
    <Example
      title="Confirmations"
      description="Default-size dialogs opened from row actions. Escape and outside clicks are ignored while a change is saving, and focus returns to the trigger or to the section heading if the row disappears."
    >
      <h4 id="governance-heading" tabIndex={-1} className="dialog-demo-subheading">
        Members and teams
      </h4>
      <ul className="dialog-demo-list" aria-label="Members">
        <li>
          <span>
            <strong>Ana Ruiz</strong>
            <span>ana@meadow.example · Owner</span>
          </span>
          <span className="dialog-demo-row-actions">
            <MemberActionDialog action="remove" email="ana@meadow.example" onDone={setMessage} disabled />
          </span>
        </li>
        <li hidden={removed}>
          <span>
            <strong>Kofi Mensah</strong>
            <span>kofi@meadow.example · Member</span>
          </span>
          <span className="dialog-demo-row-actions">
            <MemberActionDialog action="admin" email="kofi@meadow.example" onDone={setMessage} gone={removed} />
            <MemberActionDialog
              action="remove"
              email="kofi@meadow.example"
              gone={removed}
              onDone={text => {
                setRemoved(true);
                setMessage(text);
              }}
            />
          </span>
        </li>
        <li>
          <span>
            <strong>Priya Natarajan</strong>
            <span>priya.natarajan@meadow.example · Admin</span>
          </span>
          <span className="dialog-demo-row-actions">
            <MemberActionDialog action="member" email="priya.natarajan@meadow.example" onDone={setMessage} />
          </span>
        </li>
        <li>
          <span>
            <strong>Field operations</strong>
            <span>Team · 6 members</span>
          </span>
          <span className="dialog-demo-row-actions">
            <DeleteTeamDialog onDone={setMessage} />
          </span>
        </li>
      </ul>
      <p role="status" className="dialog-demo-status">
        {message}
      </p>
    </Example>
  );
}

const records = [
  {
    id: 'r1',
    name: 'Supplier onboarding checklist',
    type: 'document',
    detail: 'Files · Field operations',
    meta: 'Doc',
  },
  {
    id: 'r2',
    name: 'Spring launch',
    type: 'project',
    detail: 'Project · 12 members',
    meta: 'Project',
  },
  {
    id: 'r3',
    name: 'Q3 supplier contracts.pdf',
    type: 'document',
    detail: 'Files · Shared with you',
    meta: 'PDF',
  },
  {
    id: 'r4',
    name: 'Weekly supplier digest',
    type: 'agent',
    detail: 'Agent · Runs Mondays',
    meta: 'Agent',
  },
  {
    id: 'r5',
    name: 'Field operations weekly plan',
    type: 'document',
    detail: 'Google document',
    meta: 'Doc',
  },
] as const;

function useListNavigation(count: number, choose: (index: number) => void) {
  const [active, setActive] = useState(0);
  const onKeyDown = (event: KeyboardEvent) => {
    if (!count) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive(current => (current + step + count) % count);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActive(event.key === 'Home' ? 0 : count - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(Math.min(active, count - 1));
    }
  };
  return {
    active: Math.min(active, Math.max(count - 1, 0)),
    setActive,
    onKeyDown,
  };
}

function SearchDemo({ onChoose }: { onChoose: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [onlyDocs, setOnlyDocs] = useState(false);
  const list = useId();
  const matches = records.filter(
    record =>
      (!onlyDocs || record.type === 'document') && record.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const nav = useListNavigation(matches.length, index => {
    onChoose(matches[index]!.name);
    setOpen(false);
  });
  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (next) {
          setQuery('');
          nav.setActive(0);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <Search3 size={16} aria-hidden="true" />
        Search
      </DialogTrigger>
      <DialogContent data-slot="search-dialog" placement="top" showCloseButton={false} className="dialog-demo-search">
        <DialogTitle className="sr-only">Search Meadow</DialogTitle>
        <DialogDescription className="sr-only">Search files, projects, and agents in this workspace.</DialogDescription>
        <div className="dialog-demo-search-input">
          <Search3 size={16} aria-hidden="true" />
          <input
            role="combobox"
            aria-label="Search Meadow"
            aria-expanded="true"
            aria-controls={list}
            aria-activedescendant={matches.length ? `${list}-${nav.active}` : undefined}
            placeholder="Search files, projects, or agents…"
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              nav.setActive(0);
            }}
            onKeyDown={nav.onKeyDown}
          />
          <DialogClose render={<Button variant="ghost" size="icon-sm" aria-label="Close search" />}>
            <X size={16} aria-hidden="true" />
          </DialogClose>
        </div>
        <div className="dialog-demo-search-filters" role="group" aria-label="Record type">
          <Button
            variant="outline"
            size="xs"
            aria-pressed={onlyDocs}
            onClick={() => {
              setOnlyDocs(!onlyDocs);
              nav.setActive(0);
            }}
          >
            <FileText size={14} aria-hidden="true" />
            Documents only
          </Button>
        </div>
        <div className="dialog-demo-search-list">
          {matches.length ? (
            <ul id={list} role="listbox" aria-label="Results">
              {matches.map((record, index) => (
                <li
                  key={record.id}
                  id={`${list}-${index}`}
                  role="option"
                  aria-selected={index === nav.active}
                  onMouseMove={() => nav.setActive(index)}
                  onClick={() => {
                    onChoose(record.name);
                    setOpen(false);
                  }}
                >
                  <span className="dialog-demo-search-icon">
                    {record.type === 'project' ? (
                      <Folder size={16} aria-hidden="true" />
                    ) : record.type === 'agent' ? (
                      <Users size={16} aria-hidden="true" />
                    ) : (
                      <FileText size={16} aria-hidden="true" />
                    )}
                  </span>
                  <span className="dialog-demo-search-text">
                    <strong>{record.name}</strong>
                    <span>{record.detail}</span>
                  </span>
                  <span className="dialog-demo-search-meta">{record.meta}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="dialog-demo-search-empty" role="status">
              <strong>No matches</strong>
              <span>Try another term or clear the filters.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setOnlyDocs(false);
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
        <div className="dialog-demo-search-footer" aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> Navigate
          </span>
          <span>
            <kbd>↵</kbd> Choose
          </span>
          <span>
            <kbd>Esc</kbd> Close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const commands = [
  { id: 'c1', label: 'New chat', icon: MessageCircle, hint: 'C' },
  { id: 'c2', label: 'New project', icon: Folder, hint: 'P' },
  { id: 'c3', label: 'Invite members', icon: Users, hint: 'I' },
  { id: 'c4', label: 'Workspace settings', icon: Settings, hint: ',' },
] as const;

function CommandDemo({ onChoose }: { onChoose: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const list = useId();
  const nav = useListNavigation(commands.length, index => {
    onChoose(commands[index]!.label);
    setOpen(false);
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Command size={16} aria-hidden="true" />
        Command palette
      </DialogTrigger>
      <DialogContent
        placement="top"
        showCloseButton={false}
        className="dialog-demo-command"
        style={{ '--sprout-dialog-top': '33.333%' } as CSSProperties}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>Search for a command to run...</DialogDescription>
        </DialogHeader>
        <input
          role="combobox"
          aria-label="Command"
          aria-expanded="true"
          aria-controls={list}
          aria-activedescendant={`${list}-${nav.active}`}
          className="dialog-demo-command-input"
          placeholder="Type a command…"
          onKeyDown={nav.onKeyDown}
        />
        <ul id={list} role="listbox" aria-label="Commands" className="dialog-demo-command-list">
          {commands.map((command, index) => (
            <li
              key={command.id}
              id={`${list}-${index}`}
              role="option"
              aria-selected={index === nav.active}
              onMouseMove={() => nav.setActive(index)}
              onClick={() => {
                onChoose(command.label);
                setOpen(false);
              }}
            >
              <command.icon size={16} aria-hidden="true" />
              {command.label}
              <kbd>{command.hint}</kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export function DialogSearch() {
  const [chosen, setChosen] = useState('');
  return (
    <Example
      title="Search and command palettes"
      description={`placement="top" pins the dialog near the top so results grow downward. The corner button is off; search closes from its input row and both titles are screen-reader only.`}
    >
      <Row label="search" note="Filters, results, empty state, key hints">
        <SearchDemo onChoose={name => setChosen(`Opened ${name}.`)} />
      </Row>
      <Row label="command" note="Top third, no padding, sr-only header">
        <CommandDemo onChoose={name => setChosen(`Ran ${name}.`)} />
      </Row>
      <p role="status" className="dialog-demo-status">
        {chosen}
      </p>
    </Example>
  );
}
