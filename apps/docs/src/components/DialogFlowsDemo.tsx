import { useEffect, useRef, useState } from 'react';
import { Book } from 'reicon-react/icons/Book';
import { Check } from 'reicon-react/icons/Check';
import { FileText } from 'reicon-react/icons/FileText';
import { Folder } from 'reicon-react/icons/Folder';
import { Alert, AlertDescription } from '@tulipfarm/sprout/alert';
import { Button } from '@tulipfarm/sprout/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tulipfarm/sprout/dialog';
import { StatePanel } from '@tulipfarm/sprout/state-panel';
import DocsSelect from './DocsSelect';
import {
  Actions,
  CheckField,
  Example,
  Row,
  Skeleton,
  Spinner,
  TextAreaField,
  TextField,
  plural,
  useLater,
} from './dialog-demo-parts';

type Finish = (message: string) => void;

/** A button that opens a controlled dialog and gets focus back when it closes. */
function useOpener() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return { open, setOpen, ref, finalFocus: () => ref.current };
}

type DeleteState = 'loading' | 'file' | 'folder' | 'blocked' | 'error' | 'failed';

const deleteStates: { value: DeleteState; label: string }[] = [
  { value: 'loading', label: 'Checking' },
  { value: 'file', label: 'Ready · file' },
  { value: 'folder', label: 'Ready · folder' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'error', label: 'Couldn’t check' },
  { value: 'failed', label: 'Delete failed' },
];

const blockers = [
  {
    id: 'b1',
    name: 'Carrier rate sheet 2026 – northern routes.xlsx',
    owner: 'Kofi Mensah',
  },
  { id: 'b2', name: 'Insurance certificates', owner: 'Priya Natarajan' },
];

function DeleteForever({ finish }: { finish: Finish }) {
  const [initial, setInitial] = useState<DeleteState>('file');
  const [state, setState] = useState<DeleteState>('file');
  const [busy, setBusy] = useState(false);
  const opener = useOpener();
  const later = useLater();
  const folder = state === 'folder' || state === 'blocked';
  const name = folder ? 'Supplier contracts' : 'Q3 supplier contracts.pdf';
  const blocked = state === 'blocked';
  const ready = state === 'file' || state === 'folder' || state === 'failed';
  const close = () => !busy && opener.setOpen(false);
  return (
    <>
      <DocsSelect label="Delete forever state" value={initial} items={deleteStates} onValueChange={setInitial} />
      <Button
        ref={opener.ref}
        variant="destructive"
        onClick={() => {
          setState(initial);
          opener.setOpen(true);
        }}
      >
        Delete forever
      </Button>
      <Dialog open={opener.open} onOpenChange={open => !open && close()}>
        <DialogContent size="form" finalFocus={opener.finalFocus}>
          <DialogHeader>
            <DialogTitle>
              {blocked ? `“${name}” can’t be deleted forever yet` : `Delete “${name}” forever?`}
            </DialogTitle>
            <DialogDescription>
              {blocked
                ? 'Other people own items inside this folder. Deleting forever never removes someone else’s files.'
                : folder
                  ? 'This can’t be undone. The folder and everything in it are removed for everyone it was shared with.'
                  : 'This can’t be undone. The file is removed for everyone it was shared with.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {state === 'loading' && (
              <div role="status" aria-label="Checking what will be deleted" className="dialog-demo-stack">
                <Skeleton />
                <Skeleton />
                <span className="sr-only">Checking what will be deleted…</span>
              </div>
            )}
            {state === 'error' && (
              <Alert variant="destructive">
                <AlertDescription>
                  Couldn’t check what would be deleted. Check your connection and try again.
                </AlertDescription>
              </Alert>
            )}
            {blocked && (
              <>
                <p>
                  Ask the owners to move these items out, or move them yourself if you can manage them. Then delete the
                  folder forever.
                </p>
                <ul aria-label="Items owned by other people" className="dialog-demo-bordered">
                  {blockers.map(blocker => (
                    <li key={blocker.id} className="dialog-demo-split-row">
                      <span className="dialog-demo-truncate dialog-demo-strong" title={blocker.name}>
                        {blocker.name}
                      </span>
                      <span className="dialog-demo-muted dialog-demo-xs">{blocker.owner}</span>
                    </li>
                  ))}
                </ul>
                <p className="dialog-demo-muted">And 3 more items owned by other people.</p>
              </>
            )}
            {ready && <p>{folder ? 'The folder and 14 items inside it, 38 MB in total.' : '1 file, 2.4 MB.'}</p>}
            {state === 'failed' && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>Couldn’t delete forever. Nothing was removed. Try again.</AlertDescription>
              </Alert>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={close}>
              {blocked ? 'Close' : 'Cancel'}
            </Button>
            {state === 'error' && (
              <Button
                variant="outline"
                onClick={() => {
                  setState('loading');
                  later(() => setState('file'), 700);
                }}
              >
                Check again
              </Button>
            )}
            {ready && (
              <Button
                variant="destructive"
                disabled={busy}
                aria-busy={busy}
                onClick={() => {
                  setBusy(true);
                  later(() => {
                    setBusy(false);
                    opener.setOpen(false);
                    finish(`${name} deleted forever.`);
                  });
                }}
              >
                {busy ? 'Deleting forever…' : 'Delete forever'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type SkillState = 'loading' | 'ready' | 'blocked' | 'error' | 'unavailable';

const skillStates: { value: SkillState; label: string }[] = [
  { value: 'loading', label: 'Checking' },
  { value: 'ready', label: 'Ready' },
  { value: 'blocked', label: 'Used by agents' },
  { value: 'error', label: 'Couldn’t check' },
  { value: 'unavailable', label: 'Unavailable' },
];

function DeleteSkill({ finish }: { finish: Finish }) {
  const [initial, setInitial] = useState<SkillState>('loading');
  const [state, setState] = useState<SkillState>('loading');
  const [pending, setPending] = useState<'deleted' | 'archived' | null>(null);
  const opener = useOpener();
  const later = useLater();
  const blocked = state === 'blocked';
  const title = 'Supplier follow-up';
  const close = () => pending === null && opener.setOpen(false);
  const request = (kind: 'deleted' | 'archived') => {
    setPending(kind);
    later(() => {
      setPending(null);
      opener.setOpen(false);
      finish(`${title} ${kind}.`);
    });
  };
  return (
    <>
      <DocsSelect label="Delete skill state" value={initial} items={skillStates} onValueChange={setInitial} />
      <Button
        ref={opener.ref}
        variant="outline"
        onClick={() => {
          setState(initial);
          opener.setOpen(true);
          if (initial === 'loading')
            later(() => setState(current => (current === 'loading' ? 'ready' : current)), 1400);
        }}
      >
        Delete skill
      </Button>
      <Dialog open={opener.open} onOpenChange={open => !open && close()}>
        <DialogContent size="form" finalFocus={opener.finalFocus}>
          <DialogHeader>
            <DialogTitle>{blocked ? `“${title}” can't be deleted` : `Delete “${title}”?`}</DialogTitle>
            {(state === 'ready' || blocked) && (
              <DialogDescription>
                {blocked
                  ? 'Agents use this skill. Deleting it would stop them. Archive it to hide it from lists and pickers while those agents keep working.'
                  : "This can't be undone. The skill leaves lists, pickers, and new chats. Sent messages keep its name."}
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogBody>
            {state === 'loading' && (
              <div role="status" className="dialog-demo-stack">
                <p className="dialog-demo-muted">Checking where this skill is used…</p>
                <Skeleton />
                <Skeleton />
              </div>
            )}
            {state === 'error' && (
              <Alert variant="destructive">
                <AlertDescription>Couldn't check where this skill is used.</AlertDescription>
              </Alert>
            )}
            {state === 'unavailable' && (
              <Alert>
                <AlertDescription>This skill was deleted or you can no longer manage it.</AlertDescription>
              </Alert>
            )}
            {blocked && (
              <ul aria-label="Agents using this skill" className="dialog-demo-bordered">
                <li className="dialog-demo-split-row">
                  <span className="dialog-demo-strong">Invoice triage</span>
                  <span className="dialog-demo-muted dialog-demo-xs">Active</span>
                </li>
                <li className="dialog-demo-split-row">
                  <span className="dialog-demo-strong">Weekly supplier digest</span>
                  <span className="dialog-demo-muted dialog-demo-xs">Paused</span>
                </li>
              </ul>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" disabled={pending !== null} onClick={close}>
              {state === 'unavailable' || blocked ? 'Close' : 'Cancel'}
            </Button>
            {state === 'error' && (
              <Button
                variant="outline"
                onClick={() => {
                  setState('loading');
                  later(() => setState('ready'), 700);
                }}
              >
                Check again
              </Button>
            )}
            {blocked && (
              <Button
                disabled={pending !== null}
                aria-busy={pending === 'archived'}
                onClick={() => request('archived')}
              >
                {pending === 'archived' ? 'Archiving…' : 'Archive instead'}
              </Button>
            )}
            {state === 'ready' && (
              <Button
                variant="destructive"
                disabled={pending !== null}
                aria-busy={pending === 'deleted'}
                onClick={() => request('deleted')}
              >
                {pending === 'deleted' ? 'Deleting…' : 'Delete skill'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type CompactionState = 'loading' | 'error' | 'details' | 'handoff' | 'pending' | 'failed';

const compactionStates: { value: CompactionState; label: string }[] = [
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: 'Couldn’t load' },
  { value: 'details', label: 'Compaction details' },
  { value: 'handoff', label: 'Handoff ready' },
  { value: 'pending', label: 'Writing handoff' },
  { value: 'failed', label: 'Handoff failed' },
];

const compactionRows: [string, string][] = [
  ['When', 'Today at 14:32'],
  ['Trigger', 'Context reached 92% of the model limit'],
  ['Messages summarized', '48 messages, 61,240 tokens'],
  ['Kept verbatim', 'Last 6 messages and 3 attached files: supplier-terms-v7.docx, rates.csv, onboarding.md'],
];

/** Mounted only while open, like Cloud's chat compaction details. */
function CompactionDialog({
  initial,
  finalFocus,
  onClose,
}: {
  initial: CompactionState;
  finalFocus: () => HTMLElement | null;
  onClose: () => void;
}) {
  const [state, setState] = useState(initial);
  const later = useLater();
  const handoff = state === 'handoff' || state === 'pending' || state === 'failed';
  const ready = state !== 'loading' && state !== 'error';
  return (
    <Dialog open onOpenChange={next => !next && onClose()}>
      <DialogContent size="form" finalFocus={finalFocus}>
        <DialogHeader>
          <DialogTitle>{handoff ? 'Conversation handoff' : 'Compaction details'}</DialogTitle>
          <DialogDescription>
            {handoff
              ? 'A summary to continue this work elsewhere. The model keeps its own working summary.'
              : 'What changed in the model context. Your full conversation stays in this chat.'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {state === 'loading' && (
            <p role="status" className="dialog-demo-muted">
              Loading compaction details…
            </p>
          )}
          {state === 'error' && (
            <Alert variant="destructive">
              <AlertDescription>Couldn’t load this compaction. Check your connection, then retry.</AlertDescription>
            </Alert>
          )}
          {handoff && (
            <section aria-label="Handoff" className="dialog-demo-stack">
              {state === 'pending' && (
                <p role="status" className="dialog-demo-muted">
                  Writing handoff…
                </p>
              )}
              {state === 'failed' && (
                <Alert variant="destructive">
                  <AlertDescription>
                    The handoff could not be written. The model timed out. Retrying writes only the handoff; the working
                    summary is kept.
                  </AlertDescription>
                </Alert>
              )}
              {state === 'handoff' && (
                <div className="dialog-demo-quote">
                  We are onboarding three new suppliers for the spring launch. Contracts for Northfield and Avery are
                  signed; Coastline is waiting on insurance certificates. Next: confirm delivery windows and schedule
                  site visits for the week of 12 May.
                </div>
              )}
              <p className="dialog-demo-muted dialog-demo-xs">Instructions: Focus on open supplier tasks.</p>
            </section>
          )}
          {ready && (
            <dl className="dialog-demo-dl">
              {compactionRows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </DialogBody>
        <DialogFooter>
          {state === 'error' && (
            <Button
              variant="outline"
              onClick={() => {
                setState('loading');
                later(() => setState('details'), 700);
              }}
            >
              Retry
            </Button>
          )}
          {state === 'failed' && (
            <Button
              variant="outline"
              onClick={() => {
                setState('pending');
                later(() => setState('handoff'), 900);
              }}
            >
              Retry handoff
            </Button>
          )}
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Compaction() {
  const [initial, setInitial] = useState<CompactionState>('details');
  const opener = useOpener();
  return (
    <>
      <DocsSelect label="Compaction state" value={initial} items={compactionStates} onValueChange={setInitial} />
      <Button ref={opener.ref} variant="outline" onClick={() => opener.setOpen(true)}>
        View compaction
      </Button>
      {opener.open && (
        <CompactionDialog initial={initial} finalFocus={opener.finalFocus} onClose={() => opener.setOpen(false)} />
      )}
    </>
  );
}

type ProjectsState = 'loading' | 'error' | 'empty' | 'ready';

const projectsStates: { value: ProjectsState; label: string }[] = [
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: 'Couldn’t load' },
  { value: 'empty', label: 'No projects' },
  { value: 'ready', label: 'Ready' },
];

const projects = [
  { value: '', label: 'Choose a project' },
  { value: 'p1', label: 'Spring launch' },
  { value: 'p2', label: 'Supplier onboarding' },
  { value: 'p3', label: 'Northern routes expansion and carrier renegotiation' },
];

function MoveChat({ finish }: { finish: Finish }) {
  const [initial, setInitial] = useState<ProjectsState>('ready');
  const [state, setState] = useState<ProjectsState>('ready');
  const [project, setProject] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const opener = useOpener();
  const later = useLater();
  const change = (open: boolean) => {
    opener.setOpen(open);
    if (!open) {
      setProject('');
      setConfirmed(false);
    }
  };
  return (
    <>
      <DocsSelect label="Projects state" value={initial} items={projectsStates} onValueChange={setInitial} />
      <Button
        ref={opener.ref}
        variant="outline"
        onClick={() => {
          setState(initial);
          change(true);
        }}
      >
        Move to project
      </Button>
      <Dialog open={opener.open} onOpenChange={change}>
        <DialogContent size="form" finalFocus={opener.finalFocus}>
          <DialogHeader>
            <DialogTitle>Move chat to a project</DialogTitle>
            <DialogDescription>The chat becomes shared. You cannot move it back to personal chats.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {state === 'loading' ? (
              <div role="status" aria-label="Loading projects" className="dialog-demo-stack">
                <Skeleton />
                <Skeleton />
              </div>
            ) : state === 'error' ? (
              <StatePanel
                kind="error"
                heading="h3"
                title="Could not load projects"
                description="Check your connection, then try again."
              >
                <Button
                  variant="outline"
                  onClick={() => {
                    setState('loading');
                    later(() => setState('ready'), 700);
                  }}
                >
                  Retry
                </Button>
              </StatePanel>
            ) : state === 'empty' ? (
              <StatePanel
                kind="empty"
                heading="h3"
                title="No projects to move into"
                description="Create a project or ask a project manager to add you, then try again."
              />
            ) : (
              <form
                className="dialog-demo-form"
                onSubmit={event => {
                  event.preventDefault();
                  if (!project || !confirmed) return;
                  finish(`Chat moved to ${projects.find(item => item.value === project)?.label}.`);
                  change(false);
                }}
              >
                <div className="dialog-demo-field">
                  <span aria-hidden="true">Project</span>
                  <DocsSelect
                    label="Project"
                    value={project}
                    items={projects}
                    onValueChange={setProject}
                    className="dialog-demo-select"
                  />
                </div>
                <CheckField id="move-confirm" checked={confirmed} onChange={setConfirmed}>
                  I understand that every project member can read the full history of this chat, including earlier
                  messages.
                </CheckField>
                <p className="dialog-demo-muted">
                  Earlier replies that used information some members cannot see stay hidden from them.
                </p>
                <Actions>
                  <Button type="button" variant="ghost" onClick={() => change(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!project || !confirmed}>
                    Move chat
                  </Button>
                </Actions>
              </form>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DialogStates() {
  const [message, setMessage] = useState('');
  return (
    <Example
      title="Loading, empty, error, and blocked states"
      description="Pick a starting state, then open the dialog. The body scrolls between a fixed header and footer, and the footer offers the recovery that fits the state."
    >
      <Row label="Delete forever" note="Skeleton, blocker list, retry, failure">
        <DeleteForever finish={setMessage} />
      </Row>
      <Row label="Delete skill" note="Description appears once loaded">
        <DeleteSkill finish={setMessage} />
      </Row>
      <Row label="Compaction" note="Mounted only while open">
        <Compaction />
      </Row>
      <Row label="Move chat" note="Empty and error state panels, select, checkbox">
        <MoveChat finish={setMessage} />
      </Row>
      <p role="status" className="dialog-demo-status">
        {message}
      </p>
    </Example>
  );
}

const folders = [
  { id: 'f1', label: 'My files' },
  { id: 'f2', label: 'Field operations' },
  {
    id: 'f3',
    label: 'Spring launch – supplier onboarding and contract archive',
  },
];

function FolderPicker({
  name,
  value,
  onChange,
  disabled,
}: {
  name: string;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Folders" className="dialog-demo-bordered">
      {folders.map(folder => (
        <label key={folder.id} className="dialog-demo-radio">
          <input
            type="radio"
            name={name}
            value={folder.id}
            checked={value === folder.id}
            disabled={disabled}
            onChange={() => onChange(folder.id)}
          />
          <Folder size={16} aria-hidden="true" />
          <span className="dialog-demo-truncate">{folder.label}</span>
        </label>
      ))}
    </div>
  );
}

const formats = [
  { value: 'docx', label: 'Word document (.docx)' },
  { value: 'pdf', label: 'PDF document (.pdf)' },
  { value: 'txt', label: 'Plain text (.txt)' },
];

function SaveCopy({ finish }: { finish: Finish }) {
  const opener = useOpener();
  const [destination, setDestination] = useState('');
  const [name, setName] = useState('Field operations weekly plan (copy)');
  const [format, setFormat] = useState('docx');
  const [status, setStatus] = useState<'idle' | 'copying' | 'failed' | 'copied'>('idle');
  const attempts = useRef(0);
  const openCopy = useRef<HTMLAnchorElement>(null);
  const later = useLater();
  const copying = status === 'copying';
  useEffect(() => {
    if (status !== 'copied') return;
    // The submit button that had focus is gone; wait for the dialog to settle focus, then hand it to the result.
    const frame = requestAnimationFrame(() => openCopy.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [status]);
  const folder = folders.find(item => item.id === destination);
  const close = () => !copying && opener.setOpen(false);
  return (
    <>
      <Button
        ref={opener.ref}
        variant="outline"
        onClick={() => {
          setStatus('idle');
          opener.setOpen(true);
        }}
      >
        Save a copy
      </Button>
      <Dialog open={opener.open} onOpenChange={open => !open && close()}>
        <DialogContent size="form" finalFocus={opener.finalFocus}>
          <DialogHeader>
            <DialogTitle>Save a copy of “Field operations weekly plan”</DialogTitle>
            <DialogDescription>
              The copy is a separate TulipFarm file. It won’t change when the Google file changes, and the original
              stays in Google unchanged.
            </DialogDescription>
          </DialogHeader>
          {status === 'copied' ? (
            <>
              <DialogBody>
                <StatePanel
                  kind="success"
                  heading="h3"
                  title="Copy saved to TulipFarm"
                  description={`“${name}” is in ${folder?.label ?? 'My files'} · 48 KB.`}
                />
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={() => opener.setOpen(false)}>
                  Done
                </Button>
                <Button
                  nativeButton={false}
                  render={<a ref={openCopy} href="#dialog-flows" onClick={() => opener.setOpen(false)} />}
                >
                  Open copy
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogBody>
                <section aria-labelledby="copy-destination" className="dialog-demo-stack">
                  <h3 id="copy-destination" className="dialog-demo-strong">
                    Save to
                  </h3>
                  <FolderPicker name="copy-folder" value={destination} onChange={setDestination} disabled={copying} />
                  {folder ? (
                    <p className="dialog-demo-inline-text">
                      <Check size={14} aria-hidden="true" />
                      <span className="dialog-demo-truncate">Saving to {folder.label}</span>
                    </p>
                  ) : (
                    <p className="dialog-demo-muted">Choose a folder to save into.</p>
                  )}
                </section>
                <form
                  id="copy-form"
                  className="dialog-demo-form"
                  onSubmit={event => {
                    event.preventDefault();
                    setStatus('copying');
                    later(() => {
                      if (attempts.current++ === 0) return setStatus('failed');
                      setStatus('copied');
                      finish(`Copy saved to ${folder?.label}.`);
                    }, 1000);
                  }}
                >
                  <TextField
                    id="copy-name"
                    label="Name"
                    value={name}
                    maxLength={255}
                    required
                    disabled={copying}
                    onChange={event => setName(event.target.value)}
                  />
                  <div className="dialog-demo-field">
                    <span aria-hidden="true">Format</span>
                    <DocsSelect
                      label="Format"
                      value={format}
                      items={formats}
                      onValueChange={setFormat}
                      className="dialog-demo-select"
                    />
                  </div>
                </form>
                <div aria-live="polite">
                  {copying && (
                    <p className="dialog-demo-inline-text">
                      <Spinner />
                      Copying from Google Drive to {folder?.label ?? 'TulipFarm'}…
                    </p>
                  )}
                </div>
                {status === 'failed' && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Google Drive didn’t answer in time. The copy may exist; retrying won’t make a second one.
                    </AlertDescription>
                  </Alert>
                )}
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={copying} onClick={close}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="copy-form"
                  disabled={copying || !folder || !name.trim()}
                  aria-busy={copying}
                >
                  {copying ? (
                    <>
                      <Spinner />
                      Saving copy…
                    </>
                  ) : status === 'failed' ? (
                    'Retry copy'
                  ) : (
                    'Save copy'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const moving = ['Carrier rate sheet 2026.xlsx', 'Insurance certificates'];

function MoveItems({ finish }: { finish: Finish }) {
  const opener = useOpener();
  const [destination, setDestination] = useState('f1');
  const [step, setStep] = useState<'browse' | 'review'>('browse');
  const [busy, setBusy] = useState(false);
  const later = useLater();
  const folder = folders.find(item => item.id === destination);
  const unchanged = destination === 'f1';
  const close = () => !busy && opener.setOpen(false);
  return (
    <>
      <Button
        ref={opener.ref}
        variant="outline"
        onClick={() => {
          setStep('browse');
          setDestination('f1');
          opener.setOpen(true);
        }}
      >
        Move 2 items
      </Button>
      <Dialog open={opener.open} onOpenChange={open => !open && close()}>
        <DialogContent size="form" finalFocus={opener.finalFocus}>
          <DialogHeader>
            <DialogTitle>Move 2 items</DialogTitle>
            <DialogDescription>
              {step === 'browse'
                ? 'Choose a folder. Links stay the same after a move.'
                : `Review who gains or loses access in ${folder?.label}. Direct sharing stays with each item; folder access follows the new location.`}
            </DialogDescription>
          </DialogHeader>
          {step === 'browse' ? (
            <>
              <DialogBody>
                <FolderPicker name="move-folder" value={destination} onChange={setDestination} />
              </DialogBody>
              <DialogFooter>
                {unchanged && <p>These items are already here.</p>}
                <Button variant="outline" onClick={close}>
                  Cancel
                </Button>
                <Button disabled={unchanged} onClick={() => setStep('review')}>
                  {unchanged ? 'Review move' : `Review move to ${folder?.label}`}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogBody>
                <ul aria-label="Items to move" className="dialog-demo-bordered">
                  {moving.map(item => (
                    <li key={item} className="dialog-demo-stack-row">
                      <span className="dialog-demo-truncate dialog-demo-strong">{item}</span>
                      <span className="dialog-demo-muted dialog-demo-xs">
                        Field operations gains view access. Kofi Mensah keeps edit access.
                      </span>
                    </li>
                  ))}
                </ul>
              </DialogBody>
              <DialogFooter>
                <Button variant="ghost" disabled={busy} onClick={() => setStep('browse')}>
                  Choose another folder
                </Button>
                <Button variant="outline" disabled={busy} onClick={close}>
                  Cancel
                </Button>
                <Button
                  disabled={busy}
                  aria-busy={busy}
                  onClick={() => {
                    setBusy(true);
                    later(() => {
                      setBusy(false);
                      opener.setOpen(false);
                      finish(`2 items moved to ${folder?.label}.`);
                    });
                  }}
                >
                  {busy ? 'Working…' : `Move ${plural(2, 'item')}`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Opens on top of another dialog; Cloud renders it as a sibling. */
function SharingDialog({
  file,
  onClose,
  finalFocus,
}: {
  file: string;
  onClose: (granted: boolean) => void;
  finalFocus?: () => HTMLElement | null;
}) {
  const [granted, setGranted] = useState(false);
  const [feedback, setFeedback] = useState('');
  return (
    <Dialog open onOpenChange={open => !open && onClose(granted)}>
      <DialogContent size="form" finalFocus={finalFocus}>
        <DialogHeader>
          <DialogTitle>Share “{file}”</DialogTitle>
          <DialogDescription>
            People and teams you add can open this file. Sharing never changes the owner.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ul aria-label="People with access" className="dialog-demo-bordered">
            <li className="dialog-demo-split-row">
              <span className="dialog-demo-strong">Ana Ruiz</span>
              <span className="dialog-demo-muted dialog-demo-xs">Owner</span>
            </li>
            <li className="dialog-demo-split-row">
              <span className="dialog-demo-strong">Priya Natarajan</span>
              {granted ? (
                <span className="dialog-demo-muted dialog-demo-xs">Can view</span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setGranted(true)}>
                  Give view access
                </Button>
              )}
            </li>
          </ul>
          {feedback && (
            <p role="status" className="dialog-demo-strong">
              {feedback}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setFeedback('Link copied.')}>
            Copy link
          </Button>
          <Button onClick={() => onClose(granted)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UseInChat({ finish }: { finish: Finish }) {
  const opener = useOpener();
  const [granting, setGranting] = useState(false);
  const [access, setAccess] = useState(false);
  const review = useRef<HTMLButtonElement>(null);
  const file = 'Q3 forecast.xlsx';
  return (
    <>
      <Button
        ref={opener.ref}
        variant="outline"
        onClick={() => {
          setAccess(false);
          opener.setOpen(true);
        }}
      >
        Use in chat
      </Button>
      <Dialog open={opener.open} onOpenChange={open => !open && !granting && opener.setOpen(false)}>
        <DialogContent size="form" finalFocus={opener.finalFocus}>
          <DialogHeader>
            <DialogTitle>Use “{file}” in chat</DialogTitle>
            <DialogDescription>
              Adds a reference to a chat’s or agent task’s draft. Nothing is sent until you send the message.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="dialog-demo-muted">Destination: Spring launch planning (project chat)</p>
            {access ? (
              <Alert role="status">
                <AlertDescription>Everyone in this chat can open the file.</AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertDescription>
                  Priya Natarajan can’t open this file. Share it before adding it here.
                </AlertDescription>
              </Alert>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => opener.setOpen(false)}>
              Cancel
            </Button>
            {!access && (
              <Button ref={review} variant="outline" onClick={() => setGranting(true)}>
                Share file
              </Button>
            )}
            <Button
              ref={access ? review : undefined}
              disabled={!access}
              onClick={() => {
                opener.setOpen(false);
                finish(`${file} added to the draft.`);
              }}
            >
              Add to draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {granting && (
        <SharingDialog
          file={file}
          onClose={granted => {
            setGranting(false);
            setAccess(granted);
            // The review dialog reclaims focus when the stacked dialog closes; move it to the review after that.
            setTimeout(() => review.current?.focus());
          }}
        />
      )}
    </>
  );
}

const knowledgeFiles = [
  { id: 'k1', name: 'Supplier onboarding checklist.docx' },
  {
    id: 'k2',
    name: 'Carrier rate sheet 2026 – northern routes and seasonal surcharges.xlsx',
  },
];

function AddToKnowledge({ finish }: { finish: Finish }) {
  const opener = useOpener();
  const [phase, setPhase] = useState<'review' | 'adding' | 'slow' | 'done'>('review');
  const later = useLater();
  const sending = phase === 'adding';
  return (
    <>
      <Button
        ref={opener.ref}
        variant="outline"
        onClick={() => {
          setPhase('review');
          opener.setOpen(true);
        }}
      >
        Add to Knowledge
      </Button>
      <Dialog open={opener.open} onOpenChange={open => !open && !sending && opener.setOpen(false)}>
        <DialogContent size="form" finalFocus={opener.finalFocus}>
          <DialogHeader>
            <DialogTitle>Add 2 files to Knowledge</DialogTitle>
            <DialogDescription>
              Adds the file’s text to your personal Knowledge so chats can use it later. 1 folder isn’t included.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="dialog-demo-muted">
              TulipFarm saves the text of each file as it is now. It won’t follow later edits.
            </p>
            <ul aria-label="Files to add" className="dialog-demo-bordered">
              {knowledgeFiles.map(file => (
                <li key={file.id} className="dialog-demo-stack-row">
                  <span className="dialog-demo-inline-text dialog-demo-strong">
                    <FileText size={16} aria-hidden="true" />
                    <span className="dialog-demo-truncate" title={file.name}>
                      {file.name}
                    </span>
                  </span>
                  <span className="dialog-demo-muted dialog-demo-xs">
                    {phase === 'review' ? 'Ready to add' : phase === 'done' ? 'Added' : 'Extracting text…'}
                  </span>
                </li>
              ))}
            </ul>
            {phase === 'slow' && (
              <div className="dialog-demo-stack">
                <Alert>
                  <AlertDescription>
                    Extraction is taking longer than usual. It continues after you close this dialog.
                  </AlertDescription>
                </Alert>
                <div>
                  <Button variant="outline" size="sm" onClick={() => setPhase('done')}>
                    Check status
                  </Button>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            {phase === 'review' ? (
              <>
                <Button variant="outline" onClick={() => opener.setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setPhase('adding');
                    later(() => setPhase('slow'), 900);
                  }}
                >
                  <Book size={16} aria-hidden="true" />
                  Add to Knowledge
                </Button>
              </>
            ) : (
              <Button
                variant={sending ? 'outline' : 'default'}
                disabled={sending}
                onClick={() => {
                  opener.setOpen(false);
                  if (phase === 'done') finish('2 files added to Knowledge.');
                }}
              >
                {sending ? 'Adding…' : 'Done'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PasteText({ finish }: { finish: Finish }) {
  const opener = useOpener();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const later = useLater();
  return (
    <>
      <Button ref={opener.ref} variant="outline" onClick={() => opener.setOpen(true)}>
        Paste text
      </Button>
      <Dialog open={opener.open} onOpenChange={open => !busy && opener.setOpen(open)}>
        <DialogContent size="form" finalFocus={opener.finalFocus}>
          <DialogHeader>
            <DialogTitle>Paste text</DialogTitle>
            <DialogDescription>Save notes as a project file. Chats in this project can use it.</DialogDescription>
          </DialogHeader>
          <DialogBody
            render={
              <form
                onSubmit={event => {
                  event.preventDefault();
                  setBusy(true);
                  later(() => {
                    setBusy(false);
                    finish(`${title.trim()} added.`);
                    setTitle('');
                    setContent('');
                    opener.setOpen(false);
                  });
                }}
              />
            }
          >
            <TextField
              id="knowledge-title"
              label="Title"
              value={title}
              maxLength={255}
              required
              disabled={busy}
              placeholder="For example, Launch brief"
              onChange={event => setTitle(event.target.value)}
            />
            <TextAreaField
              id="knowledge-content"
              label="Text"
              rows={10}
              value={content}
              required
              disabled={busy}
              onChange={event => setContent(event.target.value)}
            />
            <Actions>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => opener.setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !title.trim() || !content.trim()} aria-busy={busy}>
                Save text
              </Button>
            </Actions>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

const sourceText = Array.from(
  { length: 14 },
  (_, index) =>
    `${index + 1}. Supplier ${['Northfield', 'Avery', 'Coastline', 'Harbor & Pine'][index % 4]} — confirm delivery window, insurance certificate, and payment terms before the first order. Owner: field operations.`,
).join('\n\n');

function FileSource() {
  const opener = useOpener();
  return (
    <>
      <Button ref={opener.ref} variant="ghost" onClick={() => opener.setOpen(true)}>
        <FileText size={16} aria-hidden="true" />
        Launch brief
      </Button>
      <Dialog open={opener.open} onOpenChange={opener.setOpen}>
        <DialogContent size="form" finalFocus={opener.finalFocus}>
          <DialogHeader>
            <DialogTitle>Launch brief</DialogTitle>
            <DialogDescription>The text chats read from launch-brief.md.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <pre className="dialog-demo-pre">{sourceText}</pre>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CloseWorkspace({ finish }: { finish: Finish }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const workspace = 'Meadow Logistics';
  const valid = confirmation === workspace && acknowledged;
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Close workspace
      </Button>
      <Dialog
        open={open}
        onOpenChange={next => {
          setOpen(next);
          if (!next) {
            setConfirmation('');
            setAcknowledged(false);
          }
        }}
      >
        <DialogContent size="form" finalFocus={() => document.getElementById('delete-heading')}>
          <DialogHeader>
            <DialogTitle>Close this workspace for everyone?</DialogTitle>
            <DialogDescription>
              Everyone loses access to this workspace. Closing does not erase stored data.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ul className="dialog-demo-bullets">
              <li>Rows, files, and backups are retained.</li>
              <li>Your account and other workspaces remain available.</li>
              <li>Restoration and an erasure deadline are not promised.</li>
            </ul>
            <form
              className="dialog-demo-form"
              onSubmit={event => {
                event.preventDefault();
                if (!valid) return;
                setOpen(false);
                finish(`${workspace} is closing.`);
              }}
            >
              <TextField
                id="delete-confirmation"
                label="Type the exact workspace name"
                hint={workspace}
                value={confirmation}
                onChange={event => setConfirmation(event.target.value)}
              />
              <CheckField id="retained-data" checked={acknowledged} onChange={setAcknowledged}>
                I understand that workspace data is retained, not erased.
              </CheckField>
              <Actions>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={!valid}>
                  Close workspace for everyone
                </Button>
              </Actions>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Manage access swaps the details dialog for the sharing dialog, like Cloud's files page. */
function Details() {
  const opener = useOpener();
  const [sharing, setSharing] = useState(false);
  const name = 'Spring launch – supplier onboarding checklist and contract review notes (final, v7).docx';
  return (
    <>
      <Button ref={opener.ref} variant="outline" onClick={() => opener.setOpen(true)}>
        Details
      </Button>
      <Dialog open={opener.open} onOpenChange={opener.setOpen}>
        <DialogContent size="form" finalFocus={opener.finalFocus}>
          <DialogHeader>
            <DialogTitle>Details</DialogTitle>
            <DialogDescription>{name}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <dl className="dialog-demo-dl">
              <div>
                <dt>Owner</dt>
                <dd>Ana Ruiz</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>Field operations / Contracts</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>2.4 MB</dd>
              </div>
              <div>
                <dt>Modified</dt>
                <dd>Today at 09:12 by Kofi Mensah</dd>
              </div>
            </dl>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                opener.setOpen(false);
                setSharing(true);
              }}
            >
              Manage access
            </Button>
            <Button onClick={() => opener.setOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {sharing && <SharingDialog file={name} finalFocus={opener.finalFocus} onClose={() => setSharing(false)} />}
    </>
  );
}

export function DialogFlows() {
  const [message, setMessage] = useState('');
  return (
    <Example
      id="dialog-flows"
      title="Form dialogs"
      description="Form-size dialogs with a scrolling body and a footer bar. Multi-step flows swap the body and footer in place; a second dialog can open on top and hand focus back."
    >
      <Row label="Save a copy" note="Submit from the footer with form=, retry, success">
        <SaveCopy finish={setMessage} />
      </Row>
      <Row label="Move" note="Footer hint, two steps">
        <MoveItems finish={setMessage} />
      </Row>
      <Row label="Use in chat" note="Stacked sharing dialog, focus hand-back">
        <UseInChat finish={setMessage} />
      </Row>
      <Row label="Details" note="Long file name, swaps to sharing">
        <Details />
      </Row>
      <Row label="Add to Knowledge" note="Icon action, slow-progress alert">
        <AddToKnowledge finish={setMessage} />
      </Row>
      <Row label="Paste text" note="Body rendered as the form">
        <PasteText finish={setMessage} />
      </Row>
      <Row label="File text" note="Long read-only text, no footer">
        <FileSource />
      </Row>
      <h4 id="delete-heading" tabIndex={-1} className="dialog-demo-subheading">
        Danger zone
      </h4>
      <Row label="Close workspace" note="Typed confirmation; focus goes to this heading">
        <CloseWorkspace finish={setMessage} />
      </Row>
      <p role="status" className="dialog-demo-status">
        {message}
      </p>
    </Example>
  );
}
