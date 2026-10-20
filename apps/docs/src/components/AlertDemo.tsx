import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'reicon-react/icons/AlertTriangle';
import { InfoCircle } from 'reicon-react/icons/InfoCircle';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  alertVariantNames,
  type AlertVariant,
} from '@tulipfarm/sprout/alert';
import { Button } from '@tulipfarm/sprout/button';
import '../styles/alert-demo.css';
import DocsSelect from './DocsSelect';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="alert-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="alert-demo-card-body">{children}</div>
    </section>
  );
}

function Pair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="alert-demo-pair" role="group" aria-label={label}>
      <span className="alert-demo-label">{label}</span>
      <div className="alert-demo-pair-grid">{children}</div>
    </div>
  );
}

function useBusy(ms = 900) {
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [
    busy,
    () => {
      setBusy(true);
      timer.current = setTimeout(() => setBusy(false), ms);
    },
  ] as const;
}

const variantContent: Record<
  AlertVariant,
  {
    note: string;
    title: [string, string];
    icon: [string, string];
    iconOnly: string;
    action: [string, string, string];
  }
> = {
  default: {
    note: 'Queue details are hidden because you cannot read every source table. Ask a workspace admin for table read access.',
    title: [
      'This project changed while you were editing',
      'Someone saved 2 minutes ago. Your edits are still here. Keep them to save over the newer version, or discard your changes to load it.',
    ],
    icon: ['Draft saved on this device', 'Nothing was sent. Your reply stays here until you send or discard it.'],
    iconOnly: 'Some content is not searchable: 3 failed, 12 skipped by import limits. Coverage is partial.',
    action: ['Chat archived', 'It moved to Archived chats.', 'Undo'],
  },
  destructive: {
    note: 'Slack status could not refresh.',
    title: [
      'This table is unavailable',
      'It was deleted, or your access to it changed. A workspace admin can review your access.',
    ],
    icon: ['Workspace creation needs attention', 'That workspace URL is already taken. Choose another and try again.'],
    iconOnly: 'Sync failed. Google Drive access expired. Choose Reconnect, then Retry now.',
    action: ['Couldn’t archive chat', 'The chat is still in your list.', 'Retry'],
  },
};

export function AlertVariants() {
  return (
    <Example
      title="Variants"
      description="Default and destructive, side by side, in every part combination Cloud uses."
    >
      <Pair label="Description">
        {alertVariantNames.map(variant => (
          <Alert key={variant} variant={variant} role={variant === 'default' ? 'note' : undefined}>
            <AlertDescription>{variantContent[variant].note}</AlertDescription>
          </Alert>
        ))}
      </Pair>
      <Pair label="Title">
        {alertVariantNames.map(variant => (
          <Alert key={variant} variant={variant}>
            <AlertTitle>{variantContent[variant].title[0]}</AlertTitle>
            <AlertDescription>{variantContent[variant].title[1]}</AlertDescription>
          </Alert>
        ))}
      </Pair>
      <Pair label="Icon">
        {alertVariantNames.map(variant => {
          const Icon = variant === 'default' ? InfoCircle : AlertTriangle;
          return (
            <Alert key={variant} variant={variant}>
              <Icon aria-hidden="true" />
              <AlertTitle>{variantContent[variant].icon[0]}</AlertTitle>
              <AlertDescription>{variantContent[variant].icon[1]}</AlertDescription>
            </Alert>
          );
        })}
      </Pair>
      <Pair label="Icon only">
        {alertVariantNames.map(variant => (
          <Alert key={variant} variant={variant} role={variant === 'default' ? 'note' : 'status'}>
            <AlertTriangle aria-hidden="true" />
            <AlertDescription>{variantContent[variant].iconOnly}</AlertDescription>
          </Alert>
        ))}
      </Pair>
      <Pair label="Action">
        {alertVariantNames.map(variant => {
          const Icon = variant === 'default' ? InfoCircle : AlertTriangle;
          const [title, body, label] = variantContent[variant].action;
          return (
            <Alert key={variant} variant={variant}>
              <Icon aria-hidden="true" />
              <AlertTitle>{title}</AlertTitle>
              <AlertDescription>{body}</AlertDescription>
              <AlertAction>
                <Button variant="ghost" size="sm">
                  {label}
                </Button>
              </AlertAction>
            </Alert>
          );
        })}
      </Pair>
    </Example>
  );
}

export function AlertActions() {
  const [checking, check] = useBusy();
  const [plansLoading, loadPlans] = useBusy();
  return (
    <Example
      title="Actions"
      description="Recovery buttons below the copy, inside the description, or as the only follow-up."
    >
      <div className="alert-demo-stack">
        <Alert>
          <AlertTitle>Reply is taking too long</AlertTitle>
          <AlertDescription>
            The reply has not started after 1 minute. Cancel it, then send your message again.
          </AlertDescription>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline">
              Cancel reply
            </Button>
          </div>
        </Alert>
        <Alert>
          <AlertTitle>Google Drive files work only in personal chats</AlertTitle>
          <AlertDescription>
            Google controls who can open them, and other people in this project might not have access. Your draft is
            kept.
          </AlertDescription>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm">Start a personal chat instead</Button>
            <Button size="sm" variant="outline">
              Remove Google Drive files
            </Button>
          </div>
        </Alert>
        <Alert>
          <AlertTitle>Showing the last loaded plan</AlertTitle>
          <AlertDescription>Newer progress couldn’t be loaded.</AlertDescription>
          <div className="mt-2">
            <Button variant="outline" size="sm" disabled={checking} onClick={check}>
              {checking ? 'Checking…' : 'Check again'}
            </Button>
          </div>
        </Alert>
        <Alert>
          <AlertTitle>Couldn’t load plans</AlertTitle>
          <AlertDescription>Your chat is still available.</AlertDescription>
          <Button variant="outline" size="sm" disabled={plansLoading} onClick={loadPlans}>
            {plansLoading ? 'Loading plans…' : 'Load plans again'}
          </Button>
        </Alert>
        <Alert variant="destructive">
          <AlertDescription>Slack status could not refresh.</AlertDescription>
          <Button variant="outline">Check Slack status</Button>
        </Alert>
        <Alert>
          <AlertDescription>
            Table fields changed. Your input is kept below. Review the current fields before saving.
            <div className="mt-2">
              <Button variant="outline">Review field changes</Button>
            </div>
          </AlertDescription>
        </Alert>
        <Alert>
          <AlertDescription>
            Your selection changed elsewhere. Your edits remain here. Review current selections before replacing them.
            <Button variant="outline">Use current selection</Button>
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertDescription>
            Your workspace has no available credits. New chats, replies, and agent model steps are blocked. Existing
            messages remain available. Ask your workspace admin to contact support about credits.
            <Button
              variant="link"
              nativeButton={false}
              render={<a href="mailto:support@example.com?subject=Workspace%20credits" />}
            >
              Email support
            </Button>
          </AlertDescription>
        </Alert>
        <Alert>
          <AlertDescription>
            Switching accounts clears your 3 selected repositories. Import settings will be kept.
          </AlertDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline">Switch account and clear selection</Button>
            <Button variant="ghost">Keep this account</Button>
          </div>
        </Alert>
        <Alert>
          <AlertDescription>
            <div className="space-y-3">
              <p>
                Delete this integration? Usable credentials are removed. Already dispatched work cannot be undone.
                Unknown outcomes remain paused.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="destructive">Confirm delete</Button>
                <Button variant="ghost">Keep integration</Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <AlertDescription>The file opened, but it couldn’t be added to your recent files.</AlertDescription>
            <Button size="sm" variant="outline">
              Retry recent file
            </Button>
          </div>
        </Alert>
        <Alert>
          <AlertTitle>This project is archived</AlertTitle>
          <AlertDescription>
            Members can read its chats and files, but no one can send messages or make changes.
          </AlertDescription>
          <div className="pt-2">
            <Button size="sm" variant="outline">
              Restore project
            </Button>
          </div>
        </Alert>
      </div>
    </Example>
  );
}

const queryIssues = [
  'Status is not a valid value. Choices: Open, In progress, Done.',
  'Owner must be a person in this workspace.',
];

const failures = [
  {
    name: 'Q3-board-review-final-final-v12-approved-by-legal-and-finance.pdf',
    message: 'You no longer have edit access.',
  },
  { name: 'Onboarding checklist', message: 'It was already moved.' },
];

export function AlertContent() {
  return (
    <Example title="Rich content" description="Lists, paragraphs, preformatted text, links, and long unbroken values.">
      <div className="alert-demo-stack">
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {queryIssues.map(issue => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertDescription>
            <p>2 of 5 items couldn’t be moved.</p>
            <ul className="mt-1 list-disc pl-5">
              {failures.map(failure => (
                <li key={failure.name} className="wrap-anywhere">
                  “{failure.name}”: {failure.message}
                </li>
              ))}
            </ul>
            <p className="mt-1">Items that need attention stay selected.</p>
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="space-y-2">
              <li>Could not check Google Drive, Google Calendar. The service did not respond.</li>
              <li>Could not check Slack. Sign in again to refresh access.</li>
            </ul>
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertDescription>
            <span className="wrap-anywhere">
              Couldn’t copy “customer-export-2026-10-17T18:42:09Z-workspace-7f3c9a1e-records.csv”. Try again from the
              file page.
            </span>
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">Your session expired. Sign in again to continue.</Alert>
        <Alert>
          Availability is not confirmed. Connect Google Calendar or refresh until every calendar loads.{' '}
          <Button variant="outline" size="sm">
            Refresh availability
          </Button>
        </Alert>
        <Alert>
          <p>
            We could not confirm your save, or memory changed while you were editing. Your draft is kept. Check the
            saved version before trying again.
          </p>
          <div className="mt-3">
            <Button variant="outline">Check saved memory</Button>
          </div>
        </Alert>
        <Alert>
          <p>Review the latest saved memory before replacing it with your draft.</p>
          <pre className="my-3 max-h-48 overflow-auto text-sm break-words whitespace-pre-wrap">
            {`Prefer short answers.
Use metric units.
Summaries should lead with the decision, then the reasons.`}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline">Use saved version</Button>
            <Button variant="outline">Keep my draft</Button>
          </div>
        </Alert>
        <Alert>
          <AlertTitle>
            Workspace storage is updating. <a href="#alert-api">See what changes</a>
          </AlertTitle>
          <AlertDescription>
            Durable row capture resumes when the update finishes. Read the <a href="#alert-api">status details</a> for
            progress.
          </AlertDescription>
        </Alert>
      </div>
    </Example>
  );
}

type Outcome = 'saved' | 'uncertain' | 'refused';
const outcomes: { value: Outcome; label: string }[] = [
  { value: 'saved', label: 'Saved' },
  { value: 'uncertain', label: 'Uncertain' },
  { value: 'refused', label: 'Refused' },
];
const outcomeCopy: Record<Outcome, string> = {
  saved: 'Record saved.',
  uncertain: 'We couldn’t confirm the save. Your changes are kept. Check the record before trying again.',
  refused: 'This record changed elsewhere. Review the latest values first.',
};

type Upload = { id: string; name: string; message: string };
const uploadFailures: Upload[] = [
  {
    id: 'u1',
    name: 'supplier-prices.xlsx',
    message: 'is larger than the 25 MB limit.',
  },
  {
    id: 'u2',
    name: 'Team photo.heic',
    message: 'uses a file type that can’t be added.',
  },
];

export function AlertStates() {
  const [outcome, setOutcome] = useState<Outcome>('uncertain');
  const [phase, setPhase] = useState<'idle' | 'saving' | 'done'>('idle');
  const [archived, setArchived] = useState<'none' | 'archived' | 'error'>('none');
  const [uploads, setUploads] = useState<Upload[]>(uploadFailures);
  const uploadList = useRef<HTMLDivElement>(null);
  const focusUploads = () =>
    requestAnimationFrame(() => uploadList.current?.querySelector<HTMLElement>('button')?.focus());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const save = () => {
    setPhase('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase('done'), 700);
  };

  return (
    <Example
      title="Live states"
      description="Alerts appear after work finishes, switch variant with the outcome, and stack per item."
    >
      <div className="alert-demo-toolbar">
        <label>
          Outcome
          <DocsSelect<Outcome>
            label="Save outcome"
            value={outcome}
            onValueChange={next => {
              setOutcome(next);
              setPhase('idle');
            }}
            items={outcomes}
          />
        </label>
        <Button size="sm" disabled={phase === 'saving'} onClick={save}>
          {phase === 'saving' ? 'Saving…' : 'Save record'}
        </Button>
      </div>
      <div className="alert-demo-stack" aria-busy={phase === 'saving'}>
        {phase === 'idle' && <p className="alert-demo-empty">No messages. Save to see the result.</p>}
        {phase === 'saving' && (
          <p className="alert-demo-empty" role="status">
            Saving record…
          </p>
        )}
        {phase === 'done' && (
          <Alert key={outcome} role="status" variant={outcome === 'saved' ? 'default' : 'destructive'}>
            <AlertDescription>{outcomeCopy[outcome]}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="alert-demo-toolbar">
        <Button size="sm" variant="outline" disabled={archived !== 'none'} onClick={() => setArchived('archived')}>
          Archive “Weekly pipeline review”
        </Button>
        <Button size="sm" variant="ghost" disabled={archived !== 'none'} onClick={() => setArchived('error')}>
          Simulate failure
        </Button>
      </div>
      {archived !== 'none' && (
        <Alert variant={archived === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>
            <div className="flex flex-wrap items-center gap-2">
              <span>
                {archived === 'error'
                  ? 'Couldn’t archive “Weekly pipeline review”. Try again.'
                  : 'Archived “Weekly pipeline review”.'}
              </span>
              <Button size="sm" variant="outline" onClick={() => setArchived('none')}>
                {archived === 'error' ? 'Dismiss' : 'Undo'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div ref={uploadList} className="alert-demo-stack" aria-label="Upload problems" role="group">
        {uploads.length === 0 ? (
          <p className="alert-demo-empty">
            All uploads finished.{' '}
            <button
              type="button"
              className="alert-demo-text-button"
              onClick={() => {
                setUploads(uploadFailures);
                focusUploads();
              }}
            >
              Reset
            </button>
          </p>
        ) : (
          uploads.map(upload => (
            <Alert key={upload.id} variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle className="wrap-anywhere">{upload.name}</AlertTitle>
              <AlertDescription>{upload.message}</AlertDescription>
              <AlertAction>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Dismiss ${upload.name}`}
                  onClick={() => {
                    setUploads(list => list.filter(item => item.id !== upload.id));
                    focusUploads();
                  }}
                >
                  Dismiss
                </Button>
              </AlertAction>
            </Alert>
          ))
        )}
      </div>
    </Example>
  );
}
