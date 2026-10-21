import { useId, useRef, useState, type ReactNode } from 'react';
import { Folder } from 'reicon-react/icons/Folder';
import { Trash2 } from 'reicon-react/icons/Trash2';
import { Alert, AlertDescription } from '@tulipfarm/sprout/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
  alertDialogSizeNames,
  type AlertDialogSize,
} from '@tulipfarm/sprout/alert-dialog';
import { Button, type ButtonVariant } from '@tulipfarm/sprout/button';
import DocsSelect from './DocsSelect';
import { Example, Row, TextField, useLater } from './dialog-demo-parts';
import '../styles/alert-dialog-demo.css';

function Status({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="dialog-demo-status">
      {children}
    </p>
  );
}

export function AlertDialogPlayground() {
  const [size, setSize] = useState<AlertDialogSize>('md');
  const [media, setMedia] = useState(true);
  const [variant, setVariant] = useState<'destructive' | 'default'>('destructive');
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState('No change made.');
  return (
    <section className="dialog-demo-playground" aria-label="Alert dialog playground">
      <div className="dialog-demo-controls">
        <DocsSelect
          label="Size"
          value={size}
          items={alertDialogSizeNames.map(value => ({ value, label: value }))}
          onValueChange={setSize}
        />
        <DocsSelect
          label="Action variant"
          value={variant}
          items={[
            { value: 'destructive', label: 'destructive' },
            { value: 'default', label: 'default' },
          ]}
          onValueChange={setVariant}
        />
        <Button variant="outline" size="sm" aria-pressed={media} onClick={() => setMedia(!media)}>
          Media
        </Button>
      </div>
      <div className="dialog-demo-stage">
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger render={<Button variant="destructive" />}>Delete sample · {size}</AlertDialogTrigger>
          <AlertDialogContent size={size}>
            <AlertDialogHeader>
              {media && (
                <AlertDialogMedia>
                  <Folder aria-hidden="true" />
                </AlertDialogMedia>
              )}
              <AlertDialogTitle>Delete the sample folder?</AlertDialogTitle>
              <AlertDialogDescription>No real folder will be deleted.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant={variant}
                onClick={() => {
                  setOpen(false);
                  setResult(`Sample deletion confirmed locally (${size}).`);
                }}
              >
                Confirm deletion
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Status>{result}</Status>
      </div>
    </section>
  );
}

const sizeExamples = {
  md: {
    trigger: 'Delete Q3 supplier contracts.pdf',
    title: 'Delete Q3 supplier contracts.pdf?',
    description:
      'The file leaves Files for everyone in Field operations. It stays recoverable from Deleted files for 30 days.',
    cancel: 'Keep file',
    action: 'Delete file',
  },
  sm: {
    trigger: 'Delete Spring launch folder',
    title: 'Delete Spring launch?',
    description: 'Its 14 files move to Deleted files.',
    cancel: 'Cancel',
    action: 'Delete folder',
  },
} as const;

function SizeExample({ size, onDone }: { size: AlertDialogSize; onDone: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const copy = sizeExamples[size];
  return (
    <Row
      label={`${size} size`}
      note={size === 'md' ? 'Media beside the text from 640px' : 'Centered, two equal buttons'}
    >
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={<Button variant="destructive" size={size === 'sm' ? 'sm' : 'md'} />}>
          {copy.trigger}
        </AlertDialogTrigger>
        <AlertDialogContent size={size}>
          <AlertDialogHeader>
            <AlertDialogMedia>
              {size === 'sm' ? <Folder aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
            </AlertDialogMedia>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setOpen(false);
                onDone(`${copy.title.replace('?', '')} confirmed (sample only).`);
              }}
            >
              {copy.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Row>
  );
}

export function AlertDialogSizes() {
  const [message, setMessage] = useState('');
  return (
    <Example
      title="Sizes"
      description="Both sizes with AlertDialogHeader and AlertDialogMedia. Below 640px both center their header."
    >
      {alertDialogSizeNames.map(size => (
        <SizeExample key={size} size={size} onDone={setMessage} />
      ))}
      <Status>{message}</Status>
    </Example>
  );
}

interface Confirmation {
  label: string;
  note: string;
  trigger: string;
  triggerVariant: ButtonVariant;
  title: string;
  description: string;
  cancel: string;
  action: string;
  done: string;
}

const confirmations: Confirmation[] = [
  {
    label: 'Weekly supplier digest',
    note: 'Saved agent',
    trigger: 'Delete agent',
    triggerVariant: 'destructive',
    title: 'Delete this saved agent?',
    description: 'This removes it from accessible lists and revokes its activations.',
    cancel: 'Keep agent',
    action: 'Delete saved agent',
    done: 'Saved agent deleted.',
  },
  {
    label: 'ana@meadow.example',
    note: 'Google integration',
    trigger: 'Disconnect',
    triggerVariant: 'outline',
    title: 'Disconnect Google?',
    description: 'Agents lose access to ana@meadow.example. Gmail heartbeat stops.',
    cancel: 'Keep connected',
    action: 'Disconnect Google',
    done: 'Google disconnected.',
  },
  {
    label: 'Previous webhook key',
    note: 'Rotated 2 days ago',
    trigger: 'Revoke previous key',
    triggerVariant: 'outline',
    title: 'Revoke the previous webhook key?',
    description:
      'Requests that still use the previous key are rejected at once. Update every sender to the current key first. This cannot be undone.',
    cancel: 'Keep accepting it',
    action: 'Revoke previous key',
    done: 'Previous webhook key revoked.',
  },
  {
    label: 'Spring launch',
    note: 'Project · 12 members',
    trigger: 'Leave',
    triggerVariant: 'outline',
    title: 'Leave Spring launch?',
    description:
      "You lose access to this project's chats, files, and instructions right away. A project manager must add you again before you can return.",
    cancel: 'Stay in project',
    action: 'Leave project',
    done: 'You left Spring launch.',
  },
  {
    label: 'Invoice intake',
    note: 'Workflow · Runs hourly',
    trigger: 'Archive',
    triggerVariant: 'outline',
    title: 'Archive Invoice intake?',
    description:
      'Its schedule, webhook and connected-app triggers stop. Unfinished runs stop. History is kept. This cannot be undone.',
    cancel: 'Keep workflow',
    action: 'Archive workflow',
    done: 'Invoice intake archived.',
  },
  {
    label: 'Supplier pricing questions',
    note: 'Chat · Yesterday',
    trigger: 'Delete chat',
    triggerVariant: 'ghost',
    title: 'Delete this chat?',
    description:
      'This cannot be undone. The chat disappears now and is retained for 30 days before it is permanently removed.',
    cancel: 'Keep chat',
    action: 'Delete chat',
    done: 'Chat deleted.',
  },
];

function ConfirmationRow({ item, onDone }: { item: Confirmation; onDone: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Row label={item.label} note={item.note}>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={<Button variant={item.triggerVariant} size="sm" />}>
          {item.trigger}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>{item.title}</AlertDialogTitle>
          <AlertDialogDescription>{item.description}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{item.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setOpen(false);
                onDone(`${item.done} (sample only)`);
              }}
            >
              {item.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Row>
  );
}

const destinations = [
  { value: 'field', label: 'Field operations' },
  { value: 'supplier', label: 'Supplier relations' },
  { value: 'finance', label: 'Finance' },
] as const;
type Destination = (typeof destinations)[number]['value'];

/** A pending choice opens the dialog; Cancel clears it in `onClick`. */
function PermissionDestination({ onDone }: { onDone: (text: string) => void }) {
  const [team, setTeam] = useState<Destination>('field');
  const [nextTeam, setNextTeam] = useState<Destination | null>(null);
  return (
    <Row label="Owning team" note="Permission edits are not saved">
      <DocsSelect
        label="Owning team"
        value={team}
        items={destinations}
        onValueChange={value => value !== team && setNextTeam(value)}
      />
      <AlertDialog open={nextTeam !== null} onOpenChange={open => !open && setNextTeam(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Discard permission edits?</AlertDialogTitle>
          <AlertDialogDescription>
            Keep editing to save your selection before choosing another destination.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNextTeam(null)}>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (nextTeam !== null) setTeam(nextTeam);
                onDone(`Owning team changed to ${destinations.find(d => d.value === nextTeam)?.label}.`);
                setNextTeam(null);
              }}
            >
              Discard edits
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Row>
  );
}

export function AlertDialogConfirmations() {
  const [message, setMessage] = useState('');
  return (
    <Example
      title="Confirmations"
      description="Title and description sit straight in the content. Cancel closes; the action closes the dialog itself before starting the change."
    >
      {confirmations.map(item => (
        <ConfirmationRow key={item.title} item={item} onDone={setMessage} />
      ))}
      <PermissionDestination onDone={setMessage} />
      <Status>{message}</Status>
    </Example>
  );
}

type Busy = 'idle' | 'busy';

function StopPlan({ fail, onDone }: { fail: boolean; onDone: (text: string) => void }) {
  const later = useLater();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Busy>('idle');
  const [error, setError] = useState('');
  const pending = busy === 'busy';
  const stop = () => {
    setBusy('busy');
    setError('');
    later(() => {
      setBusy('idle');
      if (fail) return setError('The plan did not stop. Check your connection and try again.');
      setOpen(false);
      onDone('Plan stopped. Finished work is kept.');
    });
  };
  return (
    <Row label="Supplier onboarding plan" note="Plan · 4 of 9 tasks done">
      <AlertDialog
        open={open}
        onOpenChange={value => {
          if (!pending) setOpen(value);
          if (value) setError('');
        }}
      >
        <AlertDialogTrigger render={<Button size="sm" variant="ghost" />}>Stop plan</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Stop this plan?</AlertDialogTitle>
          <AlertDialogDescription>
            Unfinished tasks are cancelled and saved agents pause. Finished work is kept. A stopped plan can’t be
            resumed; ask in chat to start a new plan.
          </AlertDialogDescription>
          {error && (
            <p role="alert" className="text-sprout-danger">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep running</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} aria-busy={pending} onClick={stop}>
              {pending ? 'Stopping…' : 'Stop plan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Row>
  );
}

function CancelEvents({ fail, onDone }: { fail: boolean; onDone: (text: string) => void }) {
  const later = useLater();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Row label="Row event queue" note="7 pending · 2 blocked">
      <AlertDialog
        open={open}
        onOpenChange={value => {
          if (busy) return;
          setOpen(value);
          if (value) setError('');
        }}
      >
        <AlertDialogTrigger render={<Button size="sm" variant="destructive" />}>
          Cancel waiting events
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Cancel all waiting row events?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently cancels pending and blocked row events, including events from earlier revisions, and
            releases their snapshots. It does not cancel runs that have already started. New events can still arrive if
            the workflow is enabled.
          </AlertDialogDescription>
          {error && <p role="alert">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep events</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={event => {
                event.preventDefault();
                setBusy(true);
                setError('');
                later(() => {
                  setBusy(false);
                  if (fail) return setError('The queue changed while cancelling. Check queue status, then try again.');
                  setOpen(false);
                  onDone('9 waiting row events cancelled.');
                });
              }}
            >
              {busy ? 'Cancelling…' : 'Cancel waiting events'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Row>
  );
}

type RowOutcome = 'accepted' | 'rejected' | 'uncertain';
type RowWrite = 'idle' | 'sending' | 'rejected' | 'uncertain';

/** Mounted only while open, like Cloud's row delete. */
function RowDelete({
  outcome,
  close,
  onDone,
}: {
  outcome: RowOutcome;
  close: () => void;
  onDone: (text: string) => void;
}) {
  const later = useLater();
  const [write, setWrite] = useState<RowWrite>('idle');
  const sending = write === 'sending';
  const dismiss = () => {
    if (!sending) close();
  };
  const submit = () => {
    setWrite('sending');
    later(() => {
      if (outcome === 'accepted') {
        close();
        onDone('Row 4f2a9c1e deleted. Restore it from Deleted rows within 30 days.');
      } else setWrite(outcome);
    });
  };
  return (
    <AlertDialog open onOpenChange={open => !open && dismiss()}>
      <AlertDialogContent>
        <AlertDialogTitle>Delete row 4f2a9c1e?</AlertDialogTitle>
        <AlertDialogDescription>
          The row leaves active rows. Its values stay recoverable for 30 days from Deleted rows in the ⋯ menu. A row
          that other rows still link to cannot be deleted.
        </AlertDialogDescription>
        {sending && (
          <p role="status" className="text-sprout-muted">
            Submitting your operation…
          </p>
        )}
        {write === 'rejected' && (
          <Alert variant="destructive">
            <AlertDescription>Linked deletion is blocked. 2 rows in Purchase orders link to this row.</AlertDescription>
          </Alert>
        )}
        {write === 'rejected' && (
          <p className="underline">
            <a href="#alert-dialog-rows" onClick={dismiss}>
              View incoming linked rows
            </a>
          </p>
        )}
        {write === 'uncertain' && (
          <Alert variant="destructive">
            <AlertDescription>The delete was sent but not confirmed. It may still finish.</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={sending}>
            {write === 'uncertain' ? 'Close and inspect current rows' : write === 'rejected' ? 'Close' : 'Keep row'}
          </AlertDialogCancel>
          {(write === 'idle' || sending) && (
            <AlertDialogAction variant="destructive" disabled={sending} aria-busy={sending} onClick={submit}>
              {sending ? 'Deleting row…' : 'Delete row'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const rowOutcomes = [
  { value: 'accepted', label: 'Server accepts' },
  { value: 'rejected', label: 'Server rejects' },
  { value: 'uncertain', label: 'No response' },
] as const;

export function AlertDialogPending() {
  const [message, setMessage] = useState('');
  const [fail, setFail] = useState(false);
  const [outcome, setOutcome] = useState<RowOutcome>('rejected');
  const [deleting, setDeleting] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Example
      id="alert-dialog-rows"
      title="Pending and errors"
      description="While work runs, both buttons disable, the action says what is happening, and Escape is ignored. Errors stay inside the dialog."
    >
      <div className="dialog-demo-controls alert-dialog-demo-inline-controls">
        <Button variant="outline" size="sm" aria-pressed={fail} onClick={() => setFail(!fail)}>
          Fail next request
        </Button>
        <DocsSelect label="Row delete result" value={outcome} items={rowOutcomes} onValueChange={setOutcome} />
      </div>
      <StopPlan fail={fail} onDone={setMessage} />
      <CancelEvents fail={fail} onDone={setMessage} />
      <Row label="Row 4f2a9c1e" note="Purchase supplier · 3 linked rows">
        <Button ref={trigger} size="sm" variant="destructive" onClick={() => setDeleting(true)}>
          Delete row
        </Button>
        {deleting && (
          <RowDelete
            outcome={outcome}
            close={() => {
              setDeleting(false);
              trigger.current?.focus();
            }}
            onDone={setMessage}
          />
        )}
      </Row>
      <Status>{message}</Status>
    </Example>
  );
}

const selectedRows = ['4f2a9c1e', '8b31d07a', 'c90e5f22'];

function BulkDelete({ pause, close }: { pause: boolean; close: (deleted: number) => void }) {
  const later = useLater();
  const [started, setStarted] = useState(false);
  const [deleted, setDeleted] = useState(0);
  const [sending, setSending] = useState(false);
  const total = selectedRows.length;
  const complete = deleted === total;
  const paused = pause && deleted === 1;
  const step = (count: number) => {
    if (count >= total || (pause && count === 1)) return setSending(false);
    setSending(true);
    later(() => {
      setDeleted(count + 1);
      step(count + 1);
    }, 700);
  };
  const dismiss = () => {
    if (!sending) close(deleted);
  };
  return (
    <AlertDialog open onOpenChange={open => !open && dismiss()}>
      <AlertDialogContent>
        <AlertDialogTitle>{complete ? 'Rows deleted' : `Delete ${total} selected rows?`}</AlertDialogTitle>
        <AlertDialogDescription>
          Only the selected rows on this page will be deleted. Restore them from Deleted rows within 30 days. Deletion
          stops if a row changed, is linked, or access was removed.
        </AlertDialogDescription>
        {started && (
          <p role="status" className="tabular-nums">
            {deleted} of {total} rows deleted.
          </p>
        )}
        {started && !complete && (
          <div className="alert-dialog-demo-step">
            <p className="text-sprout-muted">Row {selectedRows[deleted]}</p>
            {paused && (
              <Alert>
                <AlertDescription>
                  Deletion is paused while table access or fields are checked. Close and review the current rows if it
                  does not resume.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={sending}>
            {complete ? 'Done' : started ? 'Close and review rows' : 'Keep rows'}
          </AlertDialogCancel>
          {!started && (
            <Button
              variant="destructive"
              onClick={() => {
                setStarted(true);
                step(0);
              }}
            >
              Delete {total} rows
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AlertDialogProgress() {
  const [open, setOpen] = useState(false);
  const [pause, setPause] = useState(false);
  const [message, setMessage] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Example
      title="Progress"
      description="A plain Button starts the work without closing. The dialog then reports progress, and Cancel's label follows the state."
    >
      <div className="dialog-demo-controls alert-dialog-demo-inline-controls">
        <Button variant="outline" size="sm" aria-pressed={pause} onClick={() => setPause(!pause)}>
          Pause after first row
        </Button>
      </div>
      <Row label="3 rows selected" note="Purchase orders · page 1">
        <Button ref={trigger} variant="destructive" size="sm" onClick={() => setOpen(true)}>
          Delete selected
        </Button>
        {open && (
          <BulkDelete
            pause={pause}
            close={deleted => {
              setOpen(false);
              setMessage(deleted ? `${deleted} of 3 rows deleted.` : '');
              trigger.current?.focus();
            }}
          />
        )}
      </Row>
      <Status>{message}</Status>
    </Example>
  );
}

const reviewScenarios = [
  { value: 'compatible', label: 'Input still fits' },
  { value: 'clears', label: 'Input gets cleared' },
  { value: 'stale', label: 'Fields changed again' },
] as const;
type ReviewScenario = (typeof reviewScenarios)[number]['value'];

export function AlertDialogReview() {
  const [scenario, setScenario] = useState<ReviewScenario>('clears');
  const [reviewing, setReviewing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState('');
  const clears = scenario === 'clears';
  const stale = scenario === 'stale';
  return (
    <Example
      title="Review changes"
      description="The action variant follows what confirming does: default when nothing is lost, destructive when input is cleared. A stale review disables it."
    >
      <div className="dialog-demo-controls alert-dialog-demo-inline-controls">
        <DocsSelect label="Field change" value={scenario} items={reviewScenarios} onValueChange={setScenario} />
        <Button variant="outline" size="sm" aria-pressed={uncertain} onClick={() => setUncertain(!uncertain)}>
          Save not confirmed
        </Button>
      </div>
      <Row label="Purchase orders · new row" note="Fields changed while you were editing">
        <AlertDialog open={reviewing} onOpenChange={setReviewing}>
          <AlertDialogTrigger render={<Button size="sm" variant="outline" />}>Review field changes</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Use the current fields?</AlertDialogTitle>
            <AlertDialogDescription>
              Compatible input stays in your draft. New limits and required fields will be checked before saving.
              Current fields: Supplier, Amount, Due date, Approver.
            </AlertDialogDescription>
            {clears && (
              <p>
                These inputs no longer fit the current fields and will be cleared only if you continue: Notes, Priority.
                Cancel to review or copy your old input.
              </p>
            )}
            {stale && <p role="alert">The fields changed again. Cancel and review the latest change.</p>}
            <AlertDialogFooter>
              <AlertDialogCancel>Keep old input</AlertDialogCancel>
              <AlertDialogAction
                variant={clears ? 'destructive' : 'default'}
                disabled={stale}
                onClick={() => {
                  setReviewing(false);
                  setMessage(clears ? 'Notes and Priority cleared.' : 'Draft uses the current fields.');
                }}
              >
                {clears ? 'Clear listed input' : 'Use current fields'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={leaving} onOpenChange={setLeaving}>
          <AlertDialogTrigger render={<Button size="sm" variant="ghost" />}>Close editor</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Leave these edits?</AlertDialogTitle>
            <AlertDialogDescription>
              {uncertain
                ? 'The save result is not confirmed. The request can still finish after you close this editor.'
                : 'Your unsaved row changes will be lost.'}
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep editing</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  setLeaving(false);
                  setMessage('Editor closed.');
                }}
              >
                Leave editor
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Row>
      <Status>{message}</Status>
    </Example>
  );
}

const teams = [
  { id: 'field', name: 'Field operations' },
  { id: 'supplier', name: 'Supplier relations' },
  { id: 'finance', name: 'Finance' },
];

export function AlertDialogUnsaved() {
  const nameId = useId();
  const [selectedId, setSelectedId] = useState('field');
  const [names, setNames] = useState<Record<string, string>>({});
  const [transition, setTransition] = useState<{ nextId: string } | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState('');
  const returnTo = useRef<string | null>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const selected = teams.find(team => team.id === selectedId)!;
  const draft = names[selectedId] ?? selected.name;
  const dirty = draft !== selected.name;
  const discard = () => setNames(current => ({ ...current, [selectedId]: selected.name }));
  return (
    <Example
      title="Unsaved changes"
      description="Switching teams or leaving with a dirty draft asks first. finalFocus sends focus to the team that ends up selected."
    >
      <div className="alert-dialog-demo-editor">
        <nav aria-label="Teams" className="alert-dialog-demo-teams">
          {teams.map(team => (
            <Button
              key={team.id}
              ref={node => {
                if (node) triggers.current.set(team.id, node);
                else triggers.current.delete(team.id);
              }}
              variant={team.id === selectedId ? 'secondary' : 'ghost'}
              size="md"
              aria-current={team.id === selectedId ? 'true' : undefined}
              onClick={() => {
                if (team.id === selectedId) return;
                if (dirty) {
                  returnTo.current = selectedId;
                  return setTransition({ nextId: team.id });
                }
                setSelectedId(team.id);
              }}
            >
              {team.name}
            </Button>
          ))}
        </nav>
        <div className="alert-dialog-demo-form">
          <TextField
            id={nameId}
            label="Team name"
            value={draft}
            onChange={event =>
              setNames(current => ({
                ...current,
                [selectedId]: event.target.value,
              }))
            }
          />
          <div className="alert-dialog-demo-form-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (dirty ? setBlocked(true) : setMessage('Opened Tables.'))}
            >
              Go to Tables
            </Button>
          </div>
        </div>
      </div>
      <AlertDialog open={transition !== null} onOpenChange={open => !open && setTransition(null)}>
        <AlertDialogContent
          finalFocus={() => (returnTo.current ? (triggers.current.get(returnTo.current) ?? false) : false)}
        >
          <AlertDialogTitle>Discard team edits?</AlertDialogTitle>
          <AlertDialogDescription>
            Your unsaved name, description, and member selection will be cleared. Saved team changes remain.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => (returnTo.current = selectedId)}>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!transition) return;
                returnTo.current = transition.nextId;
                discard();
                setTransition(null);
                setSelectedId(transition.nextId);
              }}
            >
              Discard edits
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={blocked} onOpenChange={open => !open && setBlocked(false)}>
        <AlertDialogContent>
          <AlertDialogTitle>Leave these edits?</AlertDialogTitle>
          <AlertDialogDescription>
            Your input will be lost if you leave. Any submitted operation continues on the server, even if its result
            has not been confirmed here.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBlocked(false)}>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setBlocked(false);
                discard();
                setMessage('Opened Tables. Your edits were discarded.');
              }}
            >
              Leave editor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Status>{message}</Status>
    </Example>
  );
}
